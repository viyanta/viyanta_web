from services.master_template import list_forms
import asyncio
import sys
sys.path.append('.')


async def test_q1_with_inference():
    print("="*80)
    print("TESTING Q1 PDF WITH PAGE NUMBER INFERENCE")
    print("="*80)

    company = "sbi"
    filename = "SBI Life  S FY2023 Q1.pdf"

    print(f"\n📄 Testing: {company.upper()} - {filename}")
    print("-" * 60)

    try:
        forms = await list_forms(company, filename)
        print(f"✅ Found {len(forms)} forms:")

        # Show first 12 forms with details (including the problematic ones)
        for i, form in enumerate(forms[:12]):
            pages_display = form['pages'] if form['pages'] else 'No pages'
            print(
                f"  {form['sr_no']:>2}: {form['form_no']:<25} - {form['description']:<40} (Pages: {pages_display})")

        # Check how many forms now have page numbers
        forms_with_pages = [f for f in forms if f['pages']]
        forms_without_pages = [f for f in forms if not f['pages']]

        print(f"\n📊 Page number statistics:")
        print(f"  Forms with pages: {len(forms_with_pages)}/{len(forms)}")
        print(f"  Forms without pages: {len(forms_without_pages)}")

        if forms_without_pages:
            print(f"  Forms still missing pages:")
            for form in forms_without_pages[:5]:  # Show first 5
                print(f"    - {form['form_no']}: {form['description']}")

        # Check the specific early forms that were problematic
        early_forms = ['L-1-A-REVENUE', 'L-2-A-PROFIT',
                       'L-3', 'L-4-PREMIUM', 'L-5-COMMISSION']
        print(f"\n🎯 Early forms status:")
        for target in early_forms:
            form = next((f for f in forms if target in f['form_no']), None)
            if form:
                pages = form['pages'] if form['pages'] else 'No pages'
                status = "✅" if form['pages'] else "❌"
                print(f"  {status} {target}: {pages}")
            else:
                print(f"  ❓ {target}: Not found")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_q1_with_inference())
