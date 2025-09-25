#!/usr/bin/env python3
"""
Simple Gemini API test to debug the issue
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai


def test_gemini_api():
    """Test basic Gemini API functionality"""
    print("🧪 Testing Gemini API...")

    # Load environment
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env file")
        return False

    print(f"✅ API Key found: {api_key[:10]}...")

    try:
        # Configure API
        genai.configure(api_key=api_key)
        print("✅ API configured successfully")
    except Exception as e:
        print(f"❌ Failed to configure API: {e}")
        return False

    try:
        # Create model
        model = genai.GenerativeModel("gemini-1.5-pro")
        print("✅ Model created successfully")
    except Exception as e:
        print(f"❌ Failed to create model: {e}")
        return False

    try:
        # Test simple generation
        response = model.generate_content(
            "Hello, this is a test. Please respond with 'Test successful'.")
        text = response.text if response.text else ""
        print(f"✅ Test response: {text[:100]}...")
        return True
    except Exception as e:
        print(f"❌ Failed to generate content: {e}")
        return False


def test_data_format():
    """Test the extracted data format issue"""
    print("\n🔍 Testing data format handling...")

    # Test data formats
    list_format = [{"col1": "value1", "col2": "value2"}]
    dict_format = {"data": [{"col1": "value1", "col2": "value2"}]}

    # Test both formats
    for test_name, test_data in [("List Format", list_format), ("Dict Format", dict_format)]:
        print(f"\nTesting {test_name}:")

        if isinstance(test_data, list):
            data_to_correct = test_data
            print(f"  ✅ Handled as list: {len(data_to_correct)} items")
        elif isinstance(test_data, dict):
            data_to_correct = test_data.get("data", [])
            print(f"  ✅ Handled as dict: {len(data_to_correct)} items")
        else:
            print(f"  ❌ Unknown format: {type(test_data)}")


if __name__ == "__main__":
    test_gemini_api()
    test_data_format()
