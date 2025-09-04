import os
import json
import re
import logging
from typing import Dict, List, Any, Optional
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


def find_form_header_pages(pdf_path: str, form_no: str) -> Optional[str]:
    """
    Enhanced method to find page ranges for forms by searching for headers/titles in PDF content.
    Specifically designed for Aditya Birla and similar PDFs where page numbers are missing from index.

    Args:
        pdf_path: Path to the PDF file
        form_no: Form number to search for (e.g., "L-1-A-RA")

    Returns:
        Page range as string (e.g., "3-6" or "5") or None if not found
    """
    try:
        doc = fitz.open(pdf_path)
        found_pages = []

        # Create flexible search patterns for the form number (case insensitive)
        # Remove hyphens and create various combinations
        form_clean = form_no.upper().replace('-', '')
        form_parts = form_no.upper().split('-')

        search_patterns = [
            form_no.upper(),                           # L-1-A-RA
            form_no.upper().replace('-', ' '),         # L 1 A RA
            form_no.upper().replace('-', ''),          # L1ARA
            form_clean,                                # L1ARA
        ]

        # Add variations with different separators
        if len(form_parts) >= 3:
            search_patterns.extend([
                # L1 A RA
                f"{form_parts[0]}{form_parts[1]} {form_parts[2]}",
                # L 1 A RA
                f"{form_parts[0]} {form_parts[1]} {form_parts[2]}",
                # L1-A-RA
                f"{form_parts[0]}{form_parts[1]}-{form_parts[2]}",
                # L-1 A RA
                f"{form_parts[0]}-{form_parts[1]} {form_parts[2]}",
            ])

            if len(form_parts) >= 4:
                search_patterns.extend([
                    # L1ARA
                    f"{form_parts[0]}{form_parts[1]}{form_parts[2]}{form_parts[3]}",
                    # L 1 A R A
                    f"{form_parts[0]} {form_parts[1]} {form_parts[2]} {form_parts[3]}",
                ])

        logger.info(
            f"Searching for form {form_no} with patterns: {search_patterns}")

        # Search through all pages for headers/titles
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            page_text = page.get_text()

            # Skip the forms index page
            if any(keyword in page_text.lower() for keyword in ["list of website disclosures", "website disclosures", "contents"]):
                continue

            # Get the first few lines of the page (where headers/titles typically appear)
            lines = [line.strip()
                     for line in page_text.split('\n') if line.strip()]
            # First 5 lines as header
            header_text = ' '.join(lines[:5]).upper()

            # Check if any pattern matches in the header
            for pattern in search_patterns:
                if pattern in header_text:
                    # Additional validation: ensure this looks like a form page
                    # Check for indicators that this is actually a form page
                    form_indicators = [
                        "FORM" in header_text,
                        "SCHEDULE" in page_text.upper()[:500],
                        "(RS" in page_text.upper()[:500],  # Financial data
                        "FOR THE PERIOD ENDED" in page_text.upper()[:500],
                        "REVENUE" in page_text.upper()[:500],
                        "PROFIT" in page_text.upper()[:500],
                        "BALANCE" in page_text.upper()[:500],
                        "PREMIUM" in page_text.upper()[:500],
                    ]

                    # If we have at least one form indicator, consider it a valid match
                    if any(form_indicators):
                        found_pages.append(page_num + 1)
                        logger.info(
                            f"Found {form_no} header on page {page_num + 1} with pattern '{pattern}'")
                        break  # Only count each page once

        doc.close()

        if found_pages:
            # Remove duplicates and sort
            found_pages = sorted(list(set(found_pages)))

            # Convert to proper page range format
            return format_page_range(found_pages)

        return None

    except Exception as e:
        logger.error(f"Error searching for form {form_no} headers in PDF: {e}")
        return None


def format_page_range(pages: List[int]) -> str:
    """
    Convert a list of page numbers to a properly formatted range string.

    Examples:
        [1, 2, 3, 4] -> "1-4"
        [5] -> "5"
        [1, 2, 5, 6] -> "1-2, 5-6"
        [1, 3, 5] -> "1, 3, 5"

    Args:
        pages: List of page numbers

    Returns:
        Formatted page range string
    """
    if not pages:
        return ""

    if len(pages) == 1:
        return str(pages[0])

    # Sort pages
    pages = sorted(list(set(pages)))

    # Group consecutive pages into ranges
    ranges = []
    start = pages[0]
    end = pages[0]

    for i in range(1, len(pages)):
        if pages[i] == end + 1:
            # Consecutive page, extend current range
            end = pages[i]
        else:
            # Gap found, finalize current range
            if start == end:
                ranges.append(str(start))
            else:
                ranges.append(f"{start}-{end}")

            # Start new range
            start = pages[i]
            end = pages[i]

    # Add the final range
    if start == end:
        ranges.append(str(start))
    else:
        ranges.append(f"{start}-{end}")

    return ", ".join(ranges)


def enhanced_page_inference(forms: List[Dict[str, Any]], company: str, pdf_path: str) -> List[Dict[str, Any]]:
    """
    Enhanced page inference that combines index-based extraction with header search.
    Specifically designed to handle Aditya Birla and similar cases.

    Args:
        forms: List of extracted forms
        company: Company name
        pdf_path: Path to the PDF file

    Returns:
        Updated forms list with improved page numbers
    """
    try:
        # For Aditya Birla specifically, use header search for all forms without pages
        if "aditya" in company.lower() or "birla" in company.lower():
            logger.info(
                "Applying Aditya Birla specific header search for missing page numbers")

            for form in forms:
                if not form.get('pages'):
                    # Use header search to find pages
                    header_pages = find_form_header_pages(
                        pdf_path, form['form_no'])
                    if header_pages:
                        form['pages'] = header_pages
                        form['pages_source'] = 'header_search'
                        logger.info(
                            f"Found pages for {form['form_no']} via header search: {header_pages}")

        # For all companies, improve page formatting
        for form in forms:
            if form.get('pages'):
                # Clean and reformat existing page numbers
                pages_str = form['pages']

                # Extract individual page numbers
                page_numbers = []

                # Handle different formats: "1-4", "5, 30", "1, 2, 16", etc.
                parts = pages_str.replace(',', ' ').split()
                for part in parts:
                    if '-' in part and not part.startswith('-'):
                        # Range like "1-4"
                        try:
                            start, end = map(int, part.split('-'))
                            page_numbers.extend(range(start, end + 1))
                        except ValueError:
                            # Single number with dash, treat as single page
                            try:
                                page_numbers.append(int(part.replace('-', '')))
                            except ValueError:
                                pass
                    else:
                        # Single page number
                        try:
                            page_numbers.append(int(part))
                        except ValueError:
                            pass

                if page_numbers:
                    # Reformat to proper ranges
                    formatted = format_page_range(page_numbers)
                    if formatted != pages_str:
                        logger.info(
                            f"Reformatted pages for {form['form_no']}: '{pages_str}' -> '{formatted}'")
                        form['pages'] = formatted

        return forms

    except Exception as e:
        logger.error(f"Error in enhanced page inference: {e}")
        return forms


# Test function for debugging
def test_page_formatting():
    """Test the page formatting function"""
    test_cases = [
        ([1, 2, 3, 4], "1-4"),
        ([5], "5"),
        ([1, 2, 5, 6], "1-2, 5-6"),
        ([1, 3, 5], "1, 3, 5"),
        ([1, 2, 3, 5, 6, 7, 10], "1-3, 5-7, 10"),
    ]

    for pages, expected in test_cases:
        result = format_page_range(pages)
        print(
            f"format_page_range({pages}) = '{result}' (expected: '{expected}')")
        assert result == expected, f"Expected '{expected}', got '{result}'"

    print("All page formatting tests passed!")


if __name__ == "__main__":
    test_page_formatting()
