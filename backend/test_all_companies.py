from services.master_template import list_forms, get_company_pdf_path
import os
import asyncio
import sys
sys.path.append('.')


async def check_all_companies_pdfs():
    """Check forms extraction for all PDFs across all companies"""

    companies_dir = r"c:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\backend\pdfs_selected_company"

    # Get all companies
    companies = [d for d in os.listdir(companies_dir) if os.path.isdir(
        os.path.join(companies_dir, d))]

    print("="*100)
    print("COMPREHENSIVE FORMS EXTRACTION TEST - ALL COMPANIES & PDFs")
    print("="*100)

    total_tests = 0
    successful_tests = 0
    failed_tests = []

    for company in sorted(companies):
        company_path = os.path.join(companies_dir, company)

        # Get all PDF files for this company
        try:
            pdf_files = [f for f in os.listdir(
                company_path) if f.endswith('.pdf')]
        except Exception as e:
            print(f"❌ Error accessing {company}: {e}")
            continue

        if not pdf_files:
            print(f"⚠️  {company.upper()}: No PDF files found")
            continue

        print(f"\n{'='*60}")
        print(f"📁 COMPANY: {company.upper()}")
        print(f"📄 Found {len(pdf_files)} PDF files")
        print(f"{'='*60}")

        for pdf_file in sorted(pdf_files):
            total_tests += 1
            print(f"\n📄 Testing: {pdf_file}")
            print("-" * 50)

            try:
                forms = await list_forms(company, pdf_file)

                if forms and len(forms) > 0:
                    successful_tests += 1

                    # Check for page numbers
                    forms_with_pages = [f for f in forms if f.get('pages')]
                    forms_without_pages = [
                        f for f in forms if not f.get('pages')]

                    print(f"✅ SUCCESS: {len(forms)} forms extracted")
                    print(f"   📊 With pages: {len(forms_with_pages)}")
                    print(f"   📊 Without pages: {len(forms_without_pages)}")

                    # Show first 5 forms as sample
                    print(f"   📋 Sample forms:")
                    for i, form in enumerate(forms[:5]):
                        pages_raw = form.get('pages')
                        pages_display = str(
                            pages_raw) if pages_raw is not None else 'No pages'
                        source = form.get('pages_source', 'index')
                        sr_no = form.get('sr_no', i+1)
                        sr_no_display = str(
                            sr_no) if sr_no is not None else str(i+1)
                        form_no = form.get('form_no', 'Unknown')
                        print(
                            f"      {sr_no_display:>2}: {form_no:<20} - {pages_display:<15} ({source})")

                    if len(forms) > 5:
                        print(f"      ... and {len(forms) - 5} more forms")

                    # Check for key forms that should exist
                    key_forms = ['L-1', 'L-2', 'L-3', 'L-4', 'L-9']
                    found_key_forms = []
                    for form in forms:
                        form_no = form.get('form_no', '')
                        for key in key_forms:
                            if form_no.startswith(key):
                                found_key_forms.append(key)
                                break

                    print(
                        f"   🎯 Key forms found: {list(set(found_key_forms))}")

                    # Warn if very few forms found
                    if len(forms) < 10:
                        print(
                            f"   ⚠️  WARNING: Only {len(forms)} forms found (expected 20+)")

                else:
                    failed_tests.append(f"{company}/{pdf_file}")
                    print(f"❌ FAILED: No forms extracted")

            except Exception as e:
                failed_tests.append(f"{company}/{pdf_file}")
                print(f"❌ ERROR: {str(e)}")

    # Summary
    print(f"\n{'='*100}")
    print(f"📊 SUMMARY")
    print(f"{'='*100}")
    print(f"Total tests: {total_tests}")
    print(f"Successful: {successful_tests}")
    print(f"Failed: {len(failed_tests)}")
    print(
        f"Success rate: {(successful_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")

    if failed_tests:
        print(f"\n❌ Failed extractions:")
        for failure in failed_tests:
            print(f"   - {failure}")
    else:
        print(f"\n🎉 All extractions successful!")

if __name__ == "__main__":
    asyncio.run(check_all_companies_pdfs())
