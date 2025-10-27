# -*- coding: utf-8 -*-
"""
FastAPI backend for the Game Event Planner application.

Provides an API endpoint to interact with Google's Gemini AI models
for generating game event plans based on user chat history.
Includes features like context management, streaming responses,
context caching (for supported models), rate limiting, and error handling.
"""

import datetime # Required for cache TTL
import hashlib
import logging
import os
from typing import List, Dict, Optional, Annotated, Union

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
# Importing specific API core exceptions
from google.api_core.exceptions import NotFound, GoogleAPICallError, ClientError, GoogleAPIError
# Import response types from .types submodule
from google.generativeai.types import (
    GenerationConfig, ContentDict, HarmCategory, HarmBlockThreshold,
    GenerateContentResponse, AsyncGenerateContentResponse # Corrected import location
)
from pydantic import BaseModel, Field, ValidationError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from tenacity import retry, stop_after_attempt, wait_exponential, RetryError
import uvicorn # For running programmatically

# --- Global Configuration & Setup ---

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Get allowed origins from environment variable (comma-separated string)
ALLOWED_ORIGINS_STRING = os.getenv("ALLOWED_ORIGINS", "") # Default to empty string if not set
ALLOWED_ORIGINS_LIST = [origin.strip() for origin in ALLOWED_ORIGINS_STRING.split(",") if origin]

# Get rate limit from environment
RATE_LIMIT = os.getenv("RATE_LIMIT", "15/minute") # Default rate limit

CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "3600")) # Get cache TTL from env
MIN_CACHEABLE_TOKENS = int(os.getenv("MIN_CACHEABLE_TOKENS", "32768")) # Get min cache tokens from env

# --- Logging Setup ---
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(), # Allow setting log level via env
    format="%(asctime)s - %(levelname)s - %(module)s - %(message)s"
)
logger = logging.getLogger(__name__)

# --- Gemini SDK Configuration ---
def _configure_genai():
    """Configures the Google Generative AI SDK with the API key."""
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not set in environment variables.")
        raise ValueError("GEMINI_API_KEY not set in environment variables")
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Google Generative AI SDK configured successfully.")
    # Keep generic Exception here as config errors can be varied
    except Exception as e:
        logger.exception("Failed to configure Google Generative AI SDK.")
        raise

_configure_genai() # Configure on import

# --- Pydantic Models ---

class Message(BaseModel):
    """Represents a single message in the chat history."""
    role: str = Field(..., pattern="^(user|model)$", description="Role of the message sender ('user' or 'model').")
    content: str = Field(..., min_length=1, description="Text content of the message.")

class ChatRequest(BaseModel):
    """Defines the expected request body for the chat endpoint."""
    # Use Annotated for Pydantic V2 style list validation
    messages: Annotated[List[Message], Field(min_length=1, description="List of messages representing the chat history (min 1 message).")]
    model: str = Field(default="gemini-1.5-flash", description="The Gemini model to use for generation.")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Controls randomness (0.0-2.0). Higher values are more creative.")
    max_tokens: Optional[int] = Field(default=None, ge=1, description="Maximum number of tokens to generate in the response.")
    stream: Optional[bool] = Field(default=False, description="Whether to stream the response back chunk by chunk.")

class UsageInfo(BaseModel):
    """Holds token usage information for an API call."""
    prompt_tokens: int
    candidates_tokens: Optional[int] = None # From streaming response (sum of chunks)
    completion_tokens: Optional[int] = None # From non-streaming response (single value)
    total_tokens: int
    cached_content_token_count: Optional[int] = None # Tokens contributed by the used cache, if any

class ChatResponse(BaseModel):
    """Defines the response body for non-streaming chat requests."""
    message: Message
    model: str
    usage: UsageInfo

class StreamChunk(BaseModel):
    """
    Represents a single chunk of data in a streaming response.
    (Currently unused as plain text is yielded, but useful for future expansion).
    """
    text: str


def _get_system_prompt() -> ContentDict:
    """
    Returns the strict system prompt defining the AI's role, constraints,
    and exact output format for game event plans, encouraging visualization.

    Returns:
        ContentDict: The system prompt formatted for the Gemini API.
    """
    return ContentDict(
        role="user",
        parts=[
            """You are a specialized AI assistant designed exclusively for planning and generating ideas for game events. Your sole focus is on creating detailed plans for various types of game events (board games, sports, e-sports, LAN parties, RPGs, virtual game nights, etc.).

**CRITICAL Output Instruction:**
When you generate a game event plan based on a user request, your *entire* response MUST start *exactly* with the following line format, followed immediately by the plan details:
`## Event: [Generated Event Name]`
Replace `[Generated Event Name]` with a concise name for the event.

**ABSOLUTELY NO other text should precede or follow the generated plan.** Do not include greetings, introductions, explanations, apologies, or concluding remarks in responses that contain an event plan. The response must consist *only* of the `## Event:` line and the subsequent Markdown-formatted plan.

**Your specific tasks are:**
1. **Generate Game Event Plans:** Based on user requests, create structured game event plans. The plan itself (following the required header) should include details like potential games, schedules, materials, coordination ideas, and themes.

2. **Adhere to Scope:** Only respond to requests directly related to planning game events.

3. **Clarify Ambiguity:** If a request is unclear but related to game events, ask clarifying questions before generating a plan. Accept reasonable clarifications.

4. **Reject Off-Topic Requests:** If a request is clearly *not* about planning a game event, politely state that you can only assist with game event planning and cannot fulfill the request. 
   **Do NOT generate the `## Event:` header line when rejecting a request.** 
   Your rejection message should be a simple, polite refusal *without* the event plan structure.

5. **Enhance Readability with Markdown:** Format the plan details *after* the initial `## Event:` line using Markdown (headings, bullet points, bold text). Follow proper indentation and structure.
   - Use **Markdown Tables ONLY IF**:
     - All cell content is **brief** (around **5–6 words or fewer** per cell).
     - The table presents *simple, scannable information* (like a schedule or checklist).
     - The table format **clearly improves** the structure over other formatting.
   - ⚠️ **Do NOT overuse tables**. Use them **only when they truly enhance clarity**. Prefer bullet lists, subheadings, or structured sections otherwise.
   - ✅ **Right indentation and layout are mandatory**. The content should be clean, well-organized, and readable — avoid flat or inconsistent structure.

6. **Use Emojis Appropriately:** Relevant emojis (🎲, 🎮, 🏆, 🎉) are welcome *within* the plan details (not before the header) to enhance tone, add flavor, and support categories (e.g., games, rewards, fun).

**Example of a valid event plan response (entire output):**

## Event: LAN Party Lockdown 🚀

### 🔥 Overview:
An action-packed, overnight session of **PC gaming**, **snacks**, and minimal sleep. Expect fierce competition and a ton of fun! 🎮

### 🎮 Game Roster:
- **Counter-Strike 2** – *for the competitive players*
- **Valorant** – *for strategic shooters*
- **Age of Empires IV** – *for the master tacticians*
- **Jackbox Party Packs** – *to relax and have fun during breaks* 🎉

### 🕹️ Proposed Schedule:
| Time         | Activity                | Notes                  |
|--------------|-------------------------|-------------------------|
| 7:00 PM Fri  | Setup & Network Config  | Pizza at 7:30 PM       |
| 8:30 PM Fri  | Tournament 1 (CS2)      | Bracket on Discord     |
| 11:30 PM Fri | Free Play / Jackbox     | Chill & relax          |
| 2:00 AM Sat  | Tournament 2 (Valorant) | Optional sign-up       |
| 5:00 AM Sat  | Chill Games / AoE IV    | Night owl session 🦉   |
| 8:00 AM Sat  | Pack-up & Depart        | Time to sleep 😴       |

### 🎒 Required Gear:
- **PC/Laptop & Peripherals**
- **Network Cable (15ft+)**
- **Headphones**
- **Sleeping Bag** (Optional) 💤

---

**Example of rejecting an off-topic request (entire output):**

"I specialize in planning game events 🎲. Unfortunately, I can't help with writing code examples. Could you tell me about a game event you'd like to plan?"
"""
        ]
    )



def _format_chat_history(messages: List[Message]) -> List[ContentDict]:
    """
    Converts a list of Pydantic Message objects into the Gemini API's ContentDict format.

    Args:
        messages: List of messages from the request body.

    Returns:
        List of ContentDict objects ready for the API.
    """
    # This function formats chat history
    return [ContentDict(role=msg.role, parts=[msg.content]) for msg in messages]

def _get_cache_name(content_to_cache: List[ContentDict], model_name: str) -> str:
    """
    Creates a unique, deterministic name for caching based on content and model.

    Args:
        content_to_cache: The list of ContentDicts to be cached.
        model_name: The name of the model being used (part of the hash).

    Returns:
        A string representing the cache name (prefixed with 'cache-').
    """
    # This function generates a cache name
    hasher = hashlib.sha256()
    hasher.update(model_name.encode('utf-8')) # Include model in hash
    for item in content_to_cache:
        for part in item.get('parts', []):
            if isinstance(part, str):
                hasher.update(part.encode('utf-8'))
    # Prefix cache names for easier identification if browsing storage
    return f"cache-{hasher.hexdigest()}"


async def _handle_stream_response(response_iterator, prompt_tokens: int, cached_tokens: Optional[int]):
    """
    Asynchronously iterates through the response stream, yields text chunks,
    and logs final token usage estimates.

    Args:
        response_iterator: The async iterator from generate_content_async(stream=True).
        prompt_tokens: Tokens sent in the prompt (excluding cached content).
        cached_tokens: Tokens contributed by the cache (if used).

    Yields:
        str: Chunks of text content from the AI response.
    """
    # This function handles streaming responses
    completion_text = ""
    total_stream_tokens = 0
    candidates_tokens = 0
    async for chunk in response_iterator:
        # Yield text as it arrives, handling potential missing text attribute
        try:
            if chunk.text:
                completion_text += chunk.text
                yield chunk.text
        except (AttributeError, ValueError) as e:
            logger.debug(f"Could not get text from stream chunk: {e}")
            pass # Ignore chunks without text

        # Attempt to extract usage metadata from chunk
        try:
            if chunk.usage_metadata:
                logger.debug(f"Stream usage metadata chunk: {chunk.usage_metadata}")
                # Safely access attributes, defaulting to 0 if missing
                candidates_tokens += getattr(chunk.usage_metadata, 'candidates_token_count', 0)
                total_stream_tokens = getattr(chunk.usage_metadata, 'total_token_count', total_stream_tokens) # Keep last known total
        except (AttributeError, ValueError) as e:
            logger.debug(f"Could not parse usage metadata from stream chunk: {e}")
            pass

    # Log final estimated usage after stream finishes
    final_total = total_stream_tokens if total_stream_tokens > 0 else prompt_tokens + candidates_tokens + (cached_tokens or 0)
    logger.info(
        f"Stream finished. Est. Prompt Tokens: {prompt_tokens}, "
        f"Candidates Tokens: {candidates_tokens}, Cached Tokens: {cached_tokens}, "
        f"Est. Total: {final_total}"
    )


# --- FastAPI Application Class ---

class EventPlannerAPI:
    """
    Encapsulates the FastAPI application, routes, and logic for the Event Planner API.
    """
    def __init__(self):
        """Initializes the FastAPI app, rate limiter, and model configurations."""
        self.app = FastAPI(
            title="Game Event Planner API",
            version="1.4.1", # Version reflects last fix
            description="API to generate game event plans using Google Gemini models."
        )
        # Use RATE_LIMIT from environment when initializing Limiter
        self.limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT])
        # Attach limiter to app state; ignore type checker warning as state is dynamic
        self.app.state.limiter = self.limiter # type: ignore

        # Configuration for available Gemini models
        self.model_details = {
            "gemini-1.5-pro": {
                "path": "models/gemini-1.5-pro-latest",
                "input_limit": 1_000_000, # Approx token limit
                "supports_caching": False # Caching not supported/enabled for Pro
            },
            "gemini-1.5-flash": {
                "path": "gemini-1.5-flash",
                "input_limit": 1_000_000, # Approx token limit
                "supports_caching": True # Caching supported
            },
            "gemini-2.0-flash": {
                "path": "gemini-2.0-flash",
                "input_limit": 1_000_000, # Assuming same limit
                "supports_caching": True # Caching supported
            }
            # Add other models here if needed
        }
        self.default_input_limit = 30_000 # Fallback if model limit not found

        self._configure_middleware()
        self._configure_routes()
        logger.info("Event Planner API initialized.")

    def _configure_middleware(self):
        """Configures middleware for the FastAPI application (CORS, Rate Limiting)."""
        # Use ALLOWED_ORIGINS_LIST from environment
        if not ALLOWED_ORIGINS_LIST:
            logger.warning("ALLOWED_ORIGINS environment variable not set or empty. CORS requests might be blocked.")

        self.app.add_middleware(
            CORSMiddleware,  # type: ignore[arg-type] # Ignore type mismatch for Middleware class
            allow_origins=ALLOWED_ORIGINS_LIST, # USE THE VARIABLE HERE
            allow_credentials=True,
            allow_methods=["*"], # Allow all standard methods
            allow_headers=["*"], # Allow all headers
        )

        # Exception handler for rate limit exceeded errors
        @self.app.exception_handler(RateLimitExceeded)
        async def rate_limit_handler(_request: Request, exc: RateLimitExceeded):
            # Prefix request with _ if not used directly in handler body
            logger.warning(f"Rate limit exceeded: {exc.detail}")
            return HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {exc.detail}"
            )

    def _get_model_instance(self, model_name: str) -> genai.GenerativeModel:
        """
        Retrieves model configuration and instantiates the Gemini GenerativeModel.

        Args:
            model_name: The user-requested model name (e.g., "gemini-1.5-flash").

        Raises:
            HTTPException: If the model_name is invalid or model instantiation fails.

        Returns:
            An initialized genai.GenerativeModel instance.
        """
        # This function gets the model instance
        details = self.model_details.get(model_name)
        if not details:
            valid_models = list(self.model_details.keys())
            logger.warning(f"Requested model '{model_name}' not found in config.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid model specified: '{model_name}'. Available models: {valid_models}")
        try:
            safety_settings = {HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE}
            model_instance = genai.GenerativeModel(model_name=details["path"], safety_settings=safety_settings)
            logger.info(f"Instantiated model: {details['path']}")
            return model_instance
        except Exception as e:
            logger.exception(f"Failed to instantiate model '{details['path']}'.")
            raise HTTPException(status_code=500, detail="Could not initialize AI model.")


    @retry(
        stop=stop_after_attempt(3), # Retry up to 3 times
        wait=wait_exponential(multiplier=1, min=2, max=10), # Exponential backoff
        retry_error_callback=lambda retry_state: logger.error(f"API call failed after {retry_state.attempt_number} attempts: {retry_state.outcome.exception()}")
    )
    async def _make_api_call(
            self, model: genai.GenerativeModel, messages: List[ContentDict],
            generation_config_dict: Dict, stream: bool = False,
            cached_content_name: Optional[str] = None
            # Corrected return type hint using imported classes
    ) -> Union[GenerateContentResponse, AsyncGenerateContentResponse]:
        """
        Makes the asynchronous call to the Gemini API's generate_content method
        with retry logic and optional caching.

        Args:
            model: The initialized GenerativeModel instance.
            messages: The list of ContentDict messages to send (excluding cached content).
            generation_config_dict: Dictionary with generation parameters (temp, max_tokens).
            stream: Whether to request a streaming response.
            cached_content_name: The name of the cache to use, if applicable.

        Returns:
            The response object from the Gemini API (sync or async depending on stream).

        Raises:
            HTTPException: If generation config is invalid.
            RetryError: If the API call fails after all retry attempts.
        """
        # This function makes the API call
        logger.debug(f"Making API call. Stream: {stream}. Cache Used: {cached_content_name or 'None'}")
        if cached_content_name:
            generation_config_dict["cached_content"] = cached_content_name
        try:
            generation_config_obj = GenerationConfig(**generation_config_dict)
        except (ValidationError, TypeError) as e:
            logger.error(f"Invalid generation config: {generation_config_dict}. Error: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid generation config provided: {e}")
        return await model.generate_content_async(contents=messages, generation_config=generation_config_obj, stream=stream)


    def _configure_routes(self):
        """Configures the API routes, including the main /plan-event endpoint."""

        @self.app.post(
            "/plan-event",
            summary="Generate Game Event Plan",
            description="Receives chat history and generates a game event plan using a selected Gemini model, optionally streaming."
            # Add other valid FastAPI decorator parameters here if needed, e.g., tags=['Events']
        )
        # Use RATE_LIMIT from environment for the decorator
        @self.limiter.limit(RATE_LIMIT)
        async def plan_event(request: Request, chat_request: ChatRequest): # type: ignore[misc] # Ignore unused 'request' if linter complains and decorator needs it
            """
            Main endpoint to generate game event plans.

            Handles request validation, model selection, context management (trimming),
            context caching (if applicable), API calls (streaming or non-streaming),
            and error handling.
            """
            # --- Request Processing & Model Setup ---
            model_name = chat_request.model
            model_details = self.model_details.get(model_name)
            if not model_details:
                valid_models = list(self.model_details.keys())
                logger.warning(f"Requested model '{model_name}' not found.")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Invalid model specified: '{model_name}'. Available models: {valid_models}")
            model_instance = self._get_model_instance(model_name)
            max_input_tokens = model_details.get("input_limit", self.default_input_limit)
            supports_caching = model_details.get("supports_caching", False)

            # --- Context Preparation & Trimming ---
            system_prompt = _get_system_prompt()
            chat_history = _format_chat_history(chat_request.messages)
            try:
                system_prompt_tokens = (await model_instance.count_tokens_async(system_prompt)).total_tokens
                current_history_tokens = (await model_instance.count_tokens_async(chat_history)).total_tokens
                logger.info(f"Initial token counts - System: {system_prompt_tokens}, History: {current_history_tokens}")
            except (GoogleAPICallError, ClientError, ValueError) as e: # Specific exceptions first
                logger.exception("Error counting initial tokens.")
                raise HTTPException(status_code=500, detail=f"Error calculating token count: {e}")
            except Exception as e: # Final catch-all
                logger.exception("Unexpected error counting initial tokens.")
                raise HTTPException(status_code=500, detail=f"Unexpected error calculating token count: {e}")

            tokens_to_send_dynamic = current_history_tokens
            while system_prompt_tokens + tokens_to_send_dynamic > max_input_tokens and len(chat_history) > 1:
                _ = chat_history.pop(0) # Remove oldest message, ignore return value
                try:
                    tokens_to_send_dynamic = (await model_instance.count_tokens_async(chat_history)).total_tokens
                    logger.info(f"Context trimming: Removed oldest message. New history tokens: {tokens_to_send_dynamic}")
                except (GoogleAPICallError, ClientError, ValueError) as e: # Specific exceptions first
                    logger.exception("Error recounting tokens during trimming.")
                    raise HTTPException(status_code=500, detail=f"Error managing context window size during recount: {e}")
                except Exception as e: # Final catch-all
                    logger.exception("Unexpected error recounting tokens during trimming.")
                    raise HTTPException(status_code=500, detail=f"Unexpected error managing context window size: {e}")

            if system_prompt_tokens + tokens_to_send_dynamic > max_input_tokens:
                detail=f"Request content exceeds model's input token limit ({max_input_tokens} tokens) even after history trimming."
                logger.error(detail + f" Actual: {system_prompt_tokens + tokens_to_send_dynamic}")
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=detail)

            # --- Context Caching Logic ---
            cache_name = None
            cached_content_token_count = None
            content_to_send_to_api: List[ContentDict] # Define type hint for clarity

            if supports_caching:
                content_to_cache = [system_prompt]
                try:
                    cacheable_token_count = (await model_instance.count_tokens_async(content_to_cache)).total_tokens

                    if cacheable_token_count >= MIN_CACHEABLE_TOKENS:
                        potential_cache_name = _get_cache_name(content_to_cache, model_name)
                        logger.info(f"Checking for cache '{potential_cache_name}' (min tokens: {MIN_CACHEABLE_TOKENS})...")
                        try:
                            cache = await genai.caching.CachedContent.get_async(potential_cache_name) # type: ignore[attr-defined]
                            cache_name = cache.name
                            cached_content_token_count = getattr(cache.usage_metadata, 'total_token_count', cacheable_token_count)
                            logger.info(f"Using existing cache '{cache_name}' (~{cached_content_token_count} tokens).")
                            content_to_send_to_api = chat_history

                        except NotFound:
                            logger.info(f"Cache '{potential_cache_name}' not found. Attempting to create...")
                            try:
                                cache = await genai.caching.CachedContent.create_async( # type: ignore[attr-defined]
                                    name=potential_cache_name, model=model_details["path"],
                                    contents=content_to_cache, ttl=datetime.timedelta(seconds=CACHE_TTL_SECONDS),
                                )
                                cache_name = cache.name
                                cached_content_token_count = getattr(cache.usage_metadata, 'total_token_count', cacheable_token_count)
                                logger.info(f"Created cache '{cache_name}' (~{cached_content_token_count} tokens).")
                                content_to_send_to_api = chat_history
                            except (GoogleAPICallError, ClientError, GoogleAPIError) as create_err:
                                logger.exception(f"API error creating cache '{potential_cache_name}'. Proceeding without cache.")
                                content_to_send_to_api = [system_prompt] + chat_history
                            except Exception as create_err:
                                logger.exception(f"Unexpected error creating cache '{potential_cache_name}'. Proceeding without cache.")
                                content_to_send_to_api = [system_prompt] + chat_history
                        except (GoogleAPICallError, ClientError, GoogleAPIError) as get_err:
                            logger.exception(f"API error checking cache '{potential_cache_name}'. Proceeding without cache.")
                            content_to_send_to_api = [system_prompt] + chat_history
                        except Exception as get_err:
                            logger.exception(f"Unexpected error checking cache '{potential_cache_name}'. Proceeding without cache.")
                            content_to_send_to_api = [system_prompt] + chat_history
                    else:
                        logger.info(f"System prompt ({cacheable_token_count} tokens) is below minimum cache size ({MIN_CACHEABLE_TOKENS}). Not caching.")
                        content_to_send_to_api = [system_prompt] + chat_history
                except (GoogleAPICallError, ClientError, ValueError) as e:
                    logger.exception("API/Value error during cache eligibility check. Proceeding without cache.")
                    content_to_send_to_api = [system_prompt] + chat_history
                except Exception as e:
                    logger.exception("Unexpected error during cache eligibility check. Proceeding without cache.")
                    content_to_send_to_api = [system_prompt] + chat_history
            else:
                logger.info(f"Model '{model_name}' does not support caching or caching is disabled.")
                content_to_send_to_api = [system_prompt] + chat_history

            # --- Prepare API Call ---
            generation_config_dict = {
                "temperature": chat_request.temperature,
                "max_output_tokens": chat_request.max_tokens
            }
            try:
                prompt_tokens_sent = (await model_instance.count_tokens_async(content_to_send_to_api)).total_tokens
                logger.info(f"Tokens being sent to API (excluding cache): {prompt_tokens_sent}")
            except (GoogleAPICallError, ClientError, ValueError) as e: # Specific exceptions first
                logger.exception("Error counting final prompt tokens.")
                prompt_tokens_sent = tokens_to_send_dynamic # Fallback estimate
                logger.warning(f"Using estimated dynamic tokens as prompt_tokens_sent: {prompt_tokens_sent}")
            except Exception as e: # Final catch-all
                logger.exception("Unexpected error counting final prompt tokens.")
                prompt_tokens_sent = tokens_to_send_dynamic # Fallback estimate
                logger.warning(f"Using estimated dynamic tokens as prompt_tokens_sent: {prompt_tokens_sent}")


            # --- Execute API Call and Handle Response ---
            try:
                if chat_request.stream:
                    # --- Handle Streaming Response ---
                    logger.info("Streaming response requested.")
                    response_iterator = await self._make_api_call(
                        model=model_instance, messages=content_to_send_to_api,
                        generation_config_dict=generation_config_dict, stream=True,
                        cached_content_name=cache_name
                    )
                    return StreamingResponse(
                        _handle_stream_response(
                            response_iterator, prompt_tokens=prompt_tokens_sent,
                            cached_tokens=cached_content_token_count
                        ), media_type="text/event-stream"
                    )
                else:
                    # --- Handle Non-Streaming Response ---
                    logger.info("Non-streaming response requested.")
                    response = await self._make_api_call(
                        model=model_instance, messages=content_to_send_to_api,
                        generation_config_dict=generation_config_dict, stream=False,
                        cached_content_name=cache_name
                    )

                    completion_text = response.text
                    completion_tokens = 0
                    total_tokens = 0

                    # Safely extract usage metadata if available
                    if hasattr(response, 'usage_metadata') and response.usage_metadata:
                        logger.info(f"Received usage metadata: {response.usage_metadata}")
                        prompt_tokens_sent = getattr(response.usage_metadata, 'prompt_token_count', prompt_tokens_sent)
                        completion_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)
                        total_tokens = getattr(response.usage_metadata, 'total_token_count', 0)
                        cached_content_token_count = getattr(response.usage_metadata, 'cached_content_token_count', None)
                        if total_tokens == 0 and (prompt_tokens_sent > 0 or completion_tokens > 0):
                            total_tokens = prompt_tokens_sent + completion_tokens + (cached_content_token_count or 0)
                    else:
                        logger.warning("No usage metadata in non-streaming response. Counting completion tokens manually.")
                        try:
                            count_response = await model_instance.count_tokens_async(completion_text)
                            completion_tokens = count_response.total_tokens
                        except (GoogleAPICallError, ClientError, ValueError) as count_e: # Specific exceptions first
                            logger.exception("Could not count completion tokens manually.")
                            completion_tokens = len(completion_text.split()) # Fallback
                        except Exception as count_e: # Final catch-all
                            logger.exception("Unexpected error counting completion tokens manually.")
                            completion_tokens = len(completion_text.split()) # Fallback
                        total_tokens = prompt_tokens_sent + completion_tokens + (cached_content_token_count or 0) # Estimate

                    usage = UsageInfo(
                        prompt_tokens=prompt_tokens_sent, completion_tokens=completion_tokens,
                        total_tokens=total_tokens, cached_content_token_count=cached_content_token_count
                    )
                    logger.info(f"API call successful. Usage: {usage.model_dump()}")

                    return ChatResponse(
                        message=Message(role="model", content=completion_text),
                        model=model_name, usage=usage
                    )

            # --- Specific Error Handling for API Call ---
            except RetryError as e:
                logger.error(f"API call failed after multiple retries: {e}")
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service unavailable after retries.")
            except GoogleAPICallError as e:
                error_details = f"Message: {e.message}, Code: {getattr(e, 'code', 'N/A')}"
                logger.error(f"Google API call error: {error_details}")
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR; detail = "An error occurred with the AI service."
                if hasattr(e, 'code'):
                    error_code = e.code
                    # Using status codes directly if available from google.rpc.Code or similar
                    if error_code == status.HTTP_429_TOO_MANY_REQUESTS or error_code == 8: # 8 is RESOURCE_EXHAUSTED
                        status_code = status.HTTP_429_TOO_MANY_REQUESTS; detail = "Rate limit hit or resource exhausted."
                    elif error_code == status.HTTP_400_BAD_REQUEST or error_code == 3: # 3 is INVALID_ARGUMENT
                        status_code = status.HTTP_400_BAD_REQUEST; detail = f"Invalid request to AI service: {e.message}"
                raise HTTPException(status_code=status_code, detail=detail)

            # --- Final Catch-All for Unexpected Errors during API call/response handling ---
            except Exception as e: # Use specific 'e'
                logger.exception("An unexpected error occurred during event planning execution.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error processing request.")


# --- FastAPI App Instance ---
event_planner_api = EventPlannerAPI()
# Expose the app instance directly for ASGI servers like Gunicorn/Uvicorn
app = event_planner_api.app

# --- Development Server Execution Block ---
# This block is for running directly with `python main.py` during development.
# It should NOT be relied upon for production deployment.
if __name__ == "__main__":
    logger.info("Attempting to start FastAPI server with uvicorn FOR DEVELOPMENT...")

    if not GEMINI_API_KEY:
        fatal_error_msg = "FATAL ERROR: GEMINI_API_KEY environment variable not set."
        logger.critical(fatal_error_msg)
        print(f"\n{fatal_error_msg}\nPlease create a .env file or set the environment variable.\n")
        exit(1)

    # Development server configuration - use reload=True here
    uvicorn.run(
        "main:app",             # Reference the app instance within the main module
        host="0.0.0.0",         # Listen on all available network interfaces
        port=8000,              # Standard port for the API
        log_level="info",       # Uvicorn's logging level
        reload=True             # Enable auto-reload for development convenience
    )