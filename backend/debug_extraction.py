#!/usr/bin/env python3
"""
Debug real extraction result structure
"""
from services.master_template import extract_form
import os
import sys
import json
import logging
import asyncio
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def debug_extraction():
    """Debug the extraction result structure"""
    print("🔍 Debugging Real PDF Extraction Result Structure...")
    print("=" * 80)

    # Check for real PDF file
    pdf_path = Path("pdfs_selected_company/sbi/SBI Life  S FY2023 Q1.pdf")
    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        return False

    print(f"Extracting from: {pdf_path.name}")
    try:
        # Use asyncio to run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Extract using master template
        extraction_result = loop.run_until_complete(extract_form(
            company="sbi",
            form_no="L-1-A-REVENUE",
            filename=pdf_path.name
        ))

        loop.close()

        if not extraction_result:
            print("❌ Extraction failed or returned empty result")
            return False

        print(f"✅ Extraction completed!")
        print(f"Result type: {type(extraction_result)}")
        print(f"Result keys: {list(extraction_result.keys())}")

        # Print detailed structure
        for key, value in extraction_result.items():
            print(f"\n📋 {key}:")
            if isinstance(value, list):
                print(f"   Type: List with {len(value)} items")
                if value and len(value) > 0:
                    print(f"   First item type: {type(value[0])}")
                    if isinstance(value[0], dict):
                        print(f"   First item keys: {list(value[0].keys())}")
                    else:
                        print(f"   First item: {str(value[0])[:100]}...")
            elif isinstance(value, dict):
                print(f"   Type: Dictionary with keys: {list(value.keys())}")
            else:
                print(f"   Type: {type(value)}")
                print(f"   Value: {str(value)[:100]}...")

        # Check specifically for the data structure we need
        print("\n🔍 Analyzing data structure for database storage:")

        # Try to understand what data we have
        rows = extraction_result.get("Rows", [])
        headers = extraction_result.get("Headers", [])

        print(f"   Headers: {len(headers)} items")
        if headers:
            print(f"   Headers sample: {headers[:5]}")

        print(f"   Rows: {len(rows)} items")
        if rows:
            print(f"   First row type: {type(rows[0])}")
            if isinstance(rows[0], dict):
                print(f"   First row keys: {list(rows[0].keys())}")
                print(
                    f"   First row sample: {dict(list(rows[0].items())[:3])}")

        # Create the proper instances structure for storage
        metadata = {
            "Form": extraction_result.get("Form No", "L-1-A-REVENUE"),
            "Title": extraction_result.get("Title", "Unknown"),
            "Period": extraction_result.get("Period", "Unknown"),
            "PagesUsed": extraction_result.get("PagesUsed", 0),
            "Headers": headers,
            "Currency": extraction_result.get("Currency", "Rs in Lakhs"),
            "extraction_info": {
                "total_rows": len(rows),
                "total_tables": extraction_result.get("TablesInfo", {}).get("total", 0)
            }
        }

        # Create instances structure
        instances_structure = {
            "instances": [{
                "Form": extraction_result.get("Form No", "L-1-A-REVENUE"),
                "Title": extraction_result.get("Title", "Unknown"),
                "Period": extraction_result.get("Period", "Unknown"),
                "PagesUsed": extraction_result.get("PagesUsed", 0),
                "Headers": headers,
                "Rows": rows
            }]
        }

        print(f"\n✅ Created instances structure with {len(rows)} rows")
        print(f"   Metadata keys: {list(metadata.keys())}")

        return instances_structure, metadata, rows

    except Exception as e:
        print(f"❌ Error during extraction: {e}")
        logger.exception("Extraction failed")
        return False


def main():
    """Main debug runner"""
    print("🚀 Debugging Real PDF Extraction Structure...")
    print("=" * 80)

    try:
        result = debug_extraction()

        if result:
            instances_structure, metadata, rows = result
            print(f"\n✅ Debug completed successfully!")
            print(f"   Ready for database storage")
            print(f"   Instances structure: {type(instances_structure)}")
            print(f"   Metadata: {type(metadata)}")
            print(f"   Rows: {len(rows)} extracted")
        else:
            print("❌ Debug failed")

    except Exception as e:
        print(f"❌ Debug runner failed: {e}")
        logger.exception("Debug runner failed")


if __name__ == "__main__":
    main()
