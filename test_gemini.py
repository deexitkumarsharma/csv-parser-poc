#!/usr/bin/env python3
"""
Quick test script to verify Gemini API connection
"""
import asyncio
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

async def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env file")
        return
    
    print(f"✅ API Key found: {api_key[:10]}...")
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        response = await model.generate_content_async(
            "Say 'Hello, CSV Parser!' if you're working correctly."
        )
        
        print(f"✅ Gemini Response: {response.text}")
        print("✅ Gemini API is working correctly!")
        
    except Exception as e:
        print(f"❌ Error connecting to Gemini: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())