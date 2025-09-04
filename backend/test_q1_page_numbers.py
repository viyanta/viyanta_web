from services.master_template import list_forms
import asyncio
import sys
sys.path.append('.')


async def test_q1_page_numbers():
    print("="*80)
    print("Q1 PAGE NUMBER ANALYSIS")
    print("="*80)

    company = "sbi"
    filename = "SBI Life  S FY2023 Q1.pdf"

    print(f"\n📄 Testing: {company.upper()} - {filename}")
    print("-" * 60)

    try:
        forms = await list_forms(company, filename)

        # Check first few forms to understand the page numbering
        print("First 5 forms with their pages:")
        for i, form in enumerate(forms[:5]):
            pages_display = form['pages'] if form['pages'] else 'No pages'
            pages_source = form.get('pages_source', 'index')
            print(
                f"  {form['sr_no']:>2}: {form['form_no']:<20} - Pages: {pages_display:<10} (Source: {pages_source})")

        # Compare with 9M PDF to understand the expected pattern
        print("\n" + "="*40)
        print("COMPARING WITH 9M PDF")
        print("="*40)

        forms_9m = await list_forms(company, "SBI Life  S FY2023 9M.pdf")
        print("9M PDF - First 5 forms:")
        for i, form in enumerate(forms_9m[:5]):
            pages_display = form['pages'] if form['pages'] else 'No pages'
            pages_source = form.get('pages_source', 'index')
            print(
                f"  {form['sr_no']:>2}: {form['form_no']:<20} - Pages: {pages_display:<10} (Source: {pages_source})")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_q1_page_numbers())
