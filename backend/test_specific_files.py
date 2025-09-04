from services.master_template import list_forms
import asyncio
import sys
sys.path.append('.')


async def test_specific_files():
    print("="*80)
    print("TESTING FORMS EXTRACTION FOR SPECIFIC PDF FILES")
    print("="*80)

    # Test cases for different companies and specific files
    test_cases = [
        ("sbi", "SBI Life  S FY2023 9M.pdf"),
        ("sbi", "SBI Life  S FY2023 FY.pdf"),
        ("sbi", "SBI Life  S FY2023 HY.pdf"),
        ("sbi", "SBI Life  S FY2023 Q1.pdf"),
        ("hdfc", "HDFC Life  S FY2023 9M.pdf"),
    ]

    for company, filename in test_cases:
        print(f"\n📄 Testing: {company.upper()} - {filename}")
        print("-" * 60)

        try:
            forms = await list_forms(company, filename)
            print(f"✅ Found {len(forms)} forms:")

            # Show first 10 forms with details
            for i, form in enumerate(forms[:10]):
                pages_display = form['pages'] if form['pages'] else 'No pages'
                print(
                    f"  {form['sr_no']:>2}: {form['form_no']:<20} - {form['description'][:50]:<50} (Pages: {pages_display})")

            if len(forms) > 10:
                print(f"  ... and {len(forms) - 10} more forms")

            # Check for specific important forms
            important_forms = ['L-1-A-REVENUE', 'L-4-PREMIUM',
                               'L-5-COMMISSION', 'L-6-OPERATING']
            found_important = []
            for form in forms:
                for important in important_forms:
                    if important in form['form_no']:
                        found_important.append(form['form_no'])
                        break

            print(f"  🎯 Important forms found: {found_important}")

        except Exception as e:
            print(f"❌ Error: {e}")

    print("\n" + "="*80)
    print("SUMMARY: Forms extraction test completed")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(test_specific_files())
