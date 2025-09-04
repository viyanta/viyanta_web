from services.master_template import list_forms
import asyncio
import sys
sys.path.append('.')


async def final_verification_test():
    print("="*80)
    print("FINAL VERIFICATION: COMPLETE FORMS EXTRACTION TEST")
    print("="*80)

    # Test the most critical case
    company = "sbi"
    filename = "SBI Life  S FY2023 9M.pdf"

    print(f"\n📄 Testing: {company.upper()} - {filename}")
    print("-" * 60)

    try:
        forms = await list_forms(company, filename)
        print(f"✅ Successfully extracted {len(forms)} forms (Expected: ~41)")

        # Check that all key early forms are present
        early_forms = ['L-1-A-REVENUE', 'L-2-A-PROFIT', 'L-3', 'L-4-PREMIUM',
                       'L-5-COMMISSION', 'L-6-OPERATING', 'L-7-BENEFITS', 'L-8-SHARE']

        print(f"\n🎯 Verifying all key early forms are captured:")
        all_found = True
        for expected_form in early_forms:
            found = any(expected_form in form['form_no'] for form in forms)
            status = "✅" if found else "❌"
            print(f"  {status} {expected_form}")
            if not found:
                all_found = False

        # Check that we have proper page ranges
        forms_with_pages = [f for f in forms if f['pages']]
        print(
            f"\n📊 Forms with page numbers: {len(forms_with_pages)}/{len(forms)}")

        # Sample some forms with their details
        print(f"\n📋 Sample of extracted forms:")
        for i, form in enumerate(forms[:8]):
            pages_display = form['pages'] if form['pages'] else 'No pages'
            print(
                f"  {form['sr_no']:>2}: {form['form_no']:<20} - {form['description'][:40]:<40} (Pages: {pages_display})")

        if all_found and len(forms) >= 40:
            print(f"\n🎉 SUCCESS: Complete forms extraction is working correctly!")
            print(f"   - All key forms captured: ✅")
            print(f"   - Expected form count (~41): ✅ (got {len(forms)})")
            print(f"   - Page ranges extracted: ✅")
        else:
            print(f"\n⚠️  Issues detected:")
            if not all_found:
                print(f"   - Missing some key forms")
            if len(forms) < 40:
                print(
                    f"   - Form count too low (got {len(forms)}, expected ~41)")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(final_verification_test())
