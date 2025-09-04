from services.master_template import list_forms
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def test_enhanced_extraction():
    """Test the enhanced extraction logic, especially for Aditya Birla"""
    print("=" * 80)
    print("TESTING ENHANCED EXTRACTION WITH PAGE FORMATTING")
    print("=" * 80)

    # Test companies with focus on Aditya Birla and Shriram Life
    test_companies = [
        ("ADITYA BIRLA SUN LIFE", "Aditya Birla Life S FY2023 9M.pdf"),
        ("SHRIRAM LIFE", "Shriram Life S FY2023 9M.pdf"),
        ("SBI", "SBI Life  S FY2023 9M.pdf"),
    ]

    for company, pdf_file in test_companies:
        print(f"\n{'='*60}")
        print(f"📁 COMPANY: {company}")
        print(f"📄 Testing: {pdf_file}")
        print("="*60)

        try:
            forms = await list_forms(company, pdf_file)

            print(f"✅ SUCCESS: {len(forms)} forms extracted")

            # Count forms with and without pages
            with_pages = [f for f in forms if f.get('pages')]
            without_pages = [f for f in forms if not f.get('pages')]

            print(f"   📊 With pages: {len(with_pages)}")
            print(f"   📊 Without pages: {len(without_pages)}")

            # Show first 10 forms for analysis
            print(f"   📋 Sample forms:")
            for i, form in enumerate(forms[:10]):
                pages_info = form.get('pages') or 'No pages'
                source = form.get('pages_source', 'index')
                print(
                    f"      {i+1:2}: {form['form_no']:<15} - {pages_info:<15} ({source})")

            if len(forms) > 10:
                print(f"      ... and {len(forms) - 10} more forms")

            # Special check for key forms
            key_forms = ['L-1-A-RA', 'L-2-A-PL', 'L-3-A-BS', 'L-4', 'L-5']
            found_forms = [f['form_no'] for f in forms]
            key_found = [form for form in key_forms if any(
                form in f for f in found_forms)]
            print(f"   🎯 Key forms found: {key_found}")

            # Show page formatting examples
            print(f"   📄 Page formatting examples:")
            page_examples = [f for f in forms if f.get('pages')][:5]
            for form in page_examples:
                pages = form.get('pages') or 'None'
                source = form.get('pages_source', 'index')
                print(f"      - {form['form_no']}: {pages} ({source})")

        except Exception as e:
            print(f"❌ FAILED: {e}")

    print(f"\n{'='*80}")
    print("ENHANCED EXTRACTION TEST COMPLETE")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(test_enhanced_extraction())
