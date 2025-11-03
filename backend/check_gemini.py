import requests
import json
import os


def check_gemini(api_key: str, model: str, prompt: str):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": api_key}
    data = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    try:
        response = requests.post(url, headers=headers,
                                 params=params, data=json.dumps(data))
        if response.status_code == 200:
            print("✅ API key + model are valid and working!")
            reply = response.json()
            text = reply["candidates"][0]["content"]["parts"][0]["text"]
            print("Gemini says:", text)
        elif response.status_code == 401:
            print("❌ Invalid API key (401)")
        elif response.status_code == 403:
            print("🚫 Access forbidden (403). Check API enabled, billing, permissions.")
        elif response.status_code == 404:
            print(
                f"⚠️ Not found (404). Model '{model}' may not exist or is not supported for generateContent.")
        elif response.status_code == 429:
            print("⚠️ Quota exceeded (429). Rate limit hit. Check your usage quota.")
        else:
            print(
                f"⚠️ Unexpected error ({response.status_code}): {response.text}")
    except Exception as e:
        print("❗ Error connecting:", e)


if __name__ == "__main__":
    # api_key = os.getenv("GEMINI_API_KEY") or input(
    #     "Enter your API key: ").strip()
    api_key = "AIzaSyBP5Z0aFC7EvFtGP9bUB6Yq_UnkPcwTG7Y"
    model = input("Enter model name (e.g., gemini-2.5-pro): ").strip()
    prompt = input("Enter a test prompt: ").strip()
    check_gemini(api_key, model, prompt)
