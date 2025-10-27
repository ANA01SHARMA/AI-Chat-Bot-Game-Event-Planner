# Example script to check models
import google.generativeai as genai
import os
from dotenv import load_dotenv
import asyncio # Import asyncio

async def check_models():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found in environment variables.")
        return

    try:
        genai.configure(api_key=api_key)
        print("Checking available models...")
        # Note: list_models might not be async, adjust if needed based on library version
        models = genai.list_models()

        print("\nModels supporting 'generateContent':")
        found_2_flash = False
        flash_supports_count = False
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                print(f"- Name: {m.name}")
                print(f"  Display Name: {m.display_name}")
                print(f"  Supported Methods: {m.supported_generation_methods}")
                # Check specifically for the model you're interested in
                if "gemini-2.0-flash" in m.name:
                    found_2_flash = True
                    # Check if countTokens is explicitly listed (might not always be)
                    if 'countTokens' in m.supported_generation_methods:
                        flash_supports_count = True
                        print(f"  *** Found gemini-2.0-flash, supports countTokens! ***")
                    else:
                        print(f"  *** Found gemini-2.0-flash, countTokens support NOT explicitly listed. ***")

        if not found_2_flash:
            print("\nWARNING: 'gemini-2.0-flash' not found in the list of models.")
        elif not flash_supports_count:
            print("\nWARNING: 'gemini-2.0-flash' found, but 'countTokens' not listed as supported. This might be the issue.")

        # Explicitly test count_tokens on the likely names
        print("\nTesting count_tokens directly:")
        for model_name_to_test in ['gemini-2.0-flash', 'models/gemini-2.0-flash-latest']:
            try:
                print(f"Trying '{model_name_to_test}'...")
                model_instance = genai.GenerativeModel(model_name_to_test)
                # Use the async version if in an async context, otherwise sync
                count_response = await model_instance.count_tokens_async("Test content")
                # Or use sync: count_response = model_instance.count_tokens("Test content")
                print(f"  SUCCESS: Counted tokens ({count_response.total_tokens}) for '{model_name_to_test}'")
            except Exception as e:
                print(f"  FAILED to count tokens for '{model_name_to_test}': {e}")

    except Exception as e:
        print(f"An error occurred during model check: {e}")

if __name__ == "__main__":
    asyncio.run(check_models()) # Run the async function