from services.master_template import get_company_pdf_path
import asyncio
import sys
import fitz  # PyMuPDF
sys.path.append('.')


async def debug_pdf_text():
    """Debug what text is actually being extracted from the PDF"""
    try:
        # Test with SBI Life PDF
        pdf_path = get_company_pdf_path("sbi", "SBI Life  S FY2023 9M.pdf")
        print(f"Opening PDF: {pdf_path}")

        doc = fitz.open(pdf_path)

        # Extract text from first 5 pages to see the forms index
        for page_num in range(min(5, doc.page_count)):
            print(f"\n{'='*60}")
            print(f"PAGE {page_num + 1} TEXT:")
            print(f"{'='*60}")
            page = doc.load_page(page_num)
            text = page.get_text()

            # Show all lines with numbers that might be forms
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if any(char.isdigit() for char in line) and ('L-' in line.upper() or len(line.strip()) < 20):
                    print(f"Line {i:>3}: {line.strip()}")

        doc.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_pdf_text())
