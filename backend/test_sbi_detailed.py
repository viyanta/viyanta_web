from services.master_template import list_forms
import asyncio
import sys
sys.path.append('.')


async def test_sbi_forms():
    print("="*80)
    print("DETAILED SBI FORMS EXTRACTION TEST")
    print("="*80)

    company = "sbi"
    filename = "SBI Life  S FY2023 9M.pdf"

    print(f"\n📄 Testing: {company.upper()} - {filename}")
    print("-" * 60)

    try:
        forms = await list_forms(company, filename)
        print(f"✅ Found {len(forms)} forms:")

        # Show ALL forms with details
        for i, form in enumerate(forms):
            pages_display = form['pages'] if form['pages'] else 'No pages'
            print(
                f"  {form['sr_no']:>2}: {form['form_no']:<25} - {form['description']:<50} (Pages: {pages_display})")

        # Check for specific important forms
        target_forms = ['L-1-A-REVENUE', 'L-2-A-PROFIT', 'L-3', 'L-4-PREMIUM',
                        'L-5-COMMISSION', 'L-6-OPERATING', 'L-7-BENEFITS', 'L-8-SHARE']

        print(f"\n🎯 Target forms check:")
        for target in target_forms:
            found = any(target in form['form_no'] for form in forms)
            status = "✅" if found else "❌"
            print(f"  {status} {target}")

        print(f"\n📊 Expected ~41 forms, found {len(forms)}")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_sbi_forms())
