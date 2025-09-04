#!/usr/bin/env python3

import traceback
from services.master_template import list_forms
import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def debug_hdfc_forms():
    """Debug the specific HDFC forms that are causing the error"""

    company = "hdfc"
    filename = "HDFC Life  S FY2023 9M.pdf"

    print(f"🔍 Debugging HDFC forms structure for: {company}/{filename}")
    print("=" * 80)

    try:
        forms = await list_forms(company, filename)
        print(f"✅ Extraction successful!")
        print(f"📊 Forms found: {len(forms)}")

        # Check each form carefully
        for i, form in enumerate(forms[:10]):
            print(f"\n📋 Form {i+1}:")
            for key, value in form.items():
                value_type = type(value).__name__
                print(f"   {key}: {value} ({value_type})")

            # Try to format this form like the test script does
            try:
                pages_display = form.get('pages', 'No pages')
                source = form.get('pages_source', 'index')
                sr_no = form.get('sr_no', i+1)
                sr_no_display = str(sr_no) if sr_no is not None else str(i+1)
                form_no = form.get('form_no', 'Unknown')

                test_line = f"      {sr_no_display:>2}: {form_no:<20} - {pages_display:<15} ({source})"
                print(f"   ✅ Format test: {test_line}")

            except Exception as format_error:
                print(f"   ❌ Format error: {format_error}")
                print(
                    f"      sr_no: {form.get('sr_no')} (type: {type(form.get('sr_no'))})")
                print(
                    f"      form_no: {form.get('form_no')} (type: {type(form.get('form_no'))})")
                print(
                    f"      pages: {form.get('pages')} (type: {type(form.get('pages'))})")
                print(
                    f"      pages_source: {form.get('pages_source')} (type: {type(form.get('pages_source'))})")

    except Exception as e:
        print("❌ ERROR occurred during extraction:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\n📋 Full traceback:")
        traceback.print_exc()


def main():
    asyncio.run(debug_hdfc_forms())


if __name__ == "__main__":
    main()
