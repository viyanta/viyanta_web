#!/usr/bin/env python3
"""
Test script to verify Gemini integration is working
"""

import os
import sys
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_gemini_import():
    """Test if Gemini verifier can be imported"""
    try:
        from services.gemini_pdf_verifier import GeminiPDFVerifier
        print("✅ Gemini verifier imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import Gemini verifier: {e}")
        return False

def test_gemini_initialization():
    """Test if Gemini verifier can be initialized"""
    try:
        from services.gemini_pdf_verifier import GeminiPDFVerifier
        verifier = GeminiPDFVerifier()
        print("✅ Gemini verifier initialized successfully")
        print(f"📋 API URL: {verifier.api_url}")
        print(f"🔑 API Key: {'✓ Set' if verifier.api_key else '✗ Missing'}")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize Gemini verifier: {e}")
        return False

def test_s3_service():
    """Test if S3 service can be imported"""
    try:
        from services.s3_service import s3_service
        print("✅ S3 service imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import S3 service: {e}")
        return False

def main():
    print("🧪 Testing Gemini and S3 Integration")
    print("=" * 50)
    
    # Test imports
    gemini_ok = test_gemini_import()
    s3_ok = test_s3_service()
    
    if gemini_ok:
        gemini_init_ok = test_gemini_initialization()
    else:
        gemini_init_ok = False
    
    print("\n📊 Test Results:")
    print(f"Gemini Import: {'✅' if gemini_ok else '❌'}")
    print(f"Gemini Init: {'✅' if gemini_init_ok else '❌'}")
    print(f"S3 Import: {'✅' if s3_ok else '❌'}")
    
    if gemini_ok and gemini_init_ok and s3_ok:
        print("\n🎉 All integrations are working!")
        return True
    else:
        print("\n⚠️ Some integrations have issues")
        return False

if __name__ == "__main__":
    main()
