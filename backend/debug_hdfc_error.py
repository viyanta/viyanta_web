#!/usr/bin/env python3

import traceback
from services.master_template import list_forms
import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def debug_hdfc_extraction():
    """Debug the HDFC extraction error"""

    company = "hdfc"
    filename = "HDFC Life  S FY2023 9M.pdf"

    print(f"🔍 Debugging HDFC extraction for: {company}/{filename}")
    print("=" * 80)

    try:
        result = await list_forms(company, filename)
        print("✅ Extraction successful!")
        print(f"📊 Forms found: {len(result)}")

        # Show first few forms
        for i, form in enumerate(result[:5]):
            pages_str = form['pages'] if form['pages'] else 'None'
            print(
                f"   {i+1}: {form['form_no']:20} - {pages_str:15} ({form.get('pages_source', 'unknown')})")

    except Exception as e:
        print("❌ ERROR occurred during extraction:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\n📋 Full traceback:")
        traceback.print_exc()

        # Try to get more specific location
        import linecache
        exc_type, exc_obj, exc_tb = sys.exc_info()
        frame = exc_tb.tb_frame
        lineno = exc_tb.tb_lineno
        filename = frame.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, frame.f_globals)
        print(f"\n🎯 Error location: {filename}:{lineno}")
        print(f"📝 Problem line: {line.strip()}")


def main():
    asyncio.run(debug_hdfc_extraction())


if __name__ == "__main__":
    main()
