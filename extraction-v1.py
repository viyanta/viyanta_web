import json
import re
import pandas as pd
import pdfplumber
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class InsurancePDFExtractor:
    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        self.extracted_data = {}

    def clean_number(self, text: str) -> Optional[float]:
        """Clean and convert text to number, handling Indian number format"""
        if not text or pd.isna(text):
            return None

        # Remove common non-numeric characters but keep decimal points and commas
        cleaned = re.sub(r'[^\d,.-]', '', str(text))

        # Handle Indian number format (lakhs, crores)
        if not cleaned or cleaned in ['-', '--', '']:
            return None

        try:
            # Remove commas and convert to float
            number = float(cleaned.replace(',', ''))
            return number
        except ValueError:
            return None

    def identify_currency_unit(self, text: str) -> str:
        """Identify currency unit from text"""
        text_lower = text.lower()
        if 'crore' in text_lower:
            return 'crores'
        elif 'lakh' in text_lower:
            return 'lakhs'
        elif 'thousand' in text_lower:
            return 'thousands'
        elif 'inr' in text_lower or '₹' in text:
            return 'INR'
        else:
            return 'units'

    def extract_tables_from_page(self, page) -> List[pd.DataFrame]:
        """Extract all tables from a single page"""
        tables = []

        try:
            # Extract tables using pdfplumber
            page_tables = page.extract_tables()

            for table in page_tables:
                if table and len(table) > 0:
                    # Convert to DataFrame
                    # First row as header
                    df = pd.DataFrame(table[1:], columns=table[0])

                    # Clean column names
                    df.columns = [
                        str(col).strip() if col else f'Col_{i}' for i, col in enumerate(df.columns)]

                    # Remove completely empty rows and columns
                    df = df.dropna(how='all').dropna(axis=1, how='all')

                    if not df.empty:
                        tables.append(df)

        except Exception as e:
            logger.warning(f"Error extracting tables from page: {e}")

        return tables

    def process_table_to_nested_json(self, df: pd.DataFrame, table_context: str = "") -> Dict[str, Any]:
        """Convert DataFrame to nested JSON structure"""
        result = {
            "table_context": table_context,
            "currency_unit": "lakhs INR",  # Default, can be detected from content
            "data": {}
        }

        # Detect currency unit from the table content
        all_text = ' '.join([str(cell)
                            for row in df.values for cell in row if cell])
        result["currency_unit"] = self.identify_currency_unit(all_text)

        # Process each row
        for idx, row in df.iterrows():
            row_data = {}
            row_key = str(row.iloc[0]).strip() if not pd.isna(
                row.iloc[0]) else f"Row_{idx}"

            # Skip if row key is empty or just whitespace
            if not row_key or row_key.isspace():
                continue

            # Process each column for this row
            for col_idx, (col_name, value) in enumerate(row.items()):
                if col_idx == 0:  # Skip the first column as it's the row key
                    continue

                # Clean column name
                clean_col_name = str(col_name).strip()
                if not clean_col_name or clean_col_name.isspace():
                    clean_col_name = f"Column_{col_idx}"

                # Extract and clean numeric value
                numeric_value = self.clean_number(value)

                row_data[clean_col_name] = {
                    "raw_value": str(value) if value else None,
                    "numeric_value": numeric_value,
                    "formatted_value": f"{numeric_value:,.0f}" if numeric_value else None
                }

            if row_data:  # Only add if there's actual data
                result["data"][row_key] = row_data

        return result

    def extract_text_data(self, page) -> Dict[str, Any]:
        """Extract key-value pairs from text content"""
        text_data = {}

        try:
            text = page.extract_text()
            if not text:
                return text_data

            # Look for patterns like "Item Name: Value" or "Item Name = Value"
            patterns = [
                r'([A-Za-z\s]+(?:Premium|Income|Amount|Total|Net|Gross)[A-Za-z\s]*)[:\-=]\s*([0-9,]+(?:\.[0-9]+)?)',
                r'([A-Za-z\s]+)[:\-=]\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:lakh|crore|thousand)?',
            ]

            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    key = match.group(1).strip()
                    value = match.group(2).strip()

                    numeric_value = self.clean_number(value)
                    if numeric_value is not None:
                        text_data[key] = {
                            "raw_value": value,
                            "numeric_value": numeric_value,
                            "formatted_value": f"{numeric_value:,.0f}"
                        }

        except Exception as e:
            logger.warning(f"Error extracting text data: {e}")

        return text_data

    def extract_all_data(self) -> Dict[str, Any]:
        """Extract all data from the PDF"""
        logger.info(f"Processing PDF: {self.pdf_path}")

        all_data = {
            "document_info": {
                "filename": self.pdf_path.name,
                "extraction_timestamp": pd.Timestamp.now().isoformat()
            },
            "tables": [],
            "text_extractions": [],
            "summary": {}
        }

        try:
            with pdfplumber.open(self.pdf_path) as pdf:
                logger.info(f"PDF has {len(pdf.pages)} pages")

                for page_num, page in enumerate(pdf.pages):
                    logger.info(f"Processing page {page_num + 1}")

                    # Extract tables
                    tables = self.extract_tables_from_page(page)
                    for table_idx, table in enumerate(tables):
                        table_context = f"Page {page_num + 1}, Table {table_idx + 1}"
                        table_json = self.process_table_to_nested_json(
                            table, table_context)
                        all_data["tables"].append(table_json)

                    # Extract text data
                    text_data = self.extract_text_data(page)
                    if text_data:
                        all_data["text_extractions"].append({
                            "page": page_num + 1,
                            "data": text_data
                        })

        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise

        # Create summary statistics
        all_data["summary"] = self.create_summary(all_data)

        return all_data

    def create_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create summary statistics from extracted data"""
        summary = {
            "total_tables": len(data["tables"]),
            "total_text_extractions": len(data["text_extractions"]),
            "key_metrics": {}
        }

        # Extract key financial metrics
        for table in data["tables"]:
            for row_key, row_data in table.get("data", {}).items():
                # Look for important financial terms
                key_terms = ["premium", "income", "total",
                             "net", "gross", "linked business"]
                if any(term in row_key.lower() for term in key_terms):
                    for col_name, col_data in row_data.items():
                        if col_data.get("numeric_value") is not None:
                            metric_key = f"{row_key} - {col_name}"
                            summary["key_metrics"][metric_key] = {
                                "value": col_data["numeric_value"],
                                "currency_unit": table.get("currency_unit", "units"),
                                "source": table.get("table_context", "Unknown")
                            }

        return summary

    def save_to_json(self, output_path: str, data: Dict[str, Any] = None) -> None:
        """Save extracted data to JSON file"""
        if data is None:
            data = self.extracted_data

        output_path = Path(output_path)

        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to: {output_path}")
        except Exception as e:
            logger.error(f"Error saving JSON: {e}")
            raise


def main():
    """Main function to demonstrate usage"""
    # Example usage
    pdf_path = "HDFC Life  S FY2025 Q1 - 1.pdf"  # Replace with your PDF path
    output_path = "extracted_insurance_data.json"

    try:
        # Create extractor instance
        extractor = InsurancePDFExtractor(pdf_path)

        # Extract all data
        extracted_data = extractor.extract_all_data()

        # Save to JSON
        extractor.save_to_json(output_path, extracted_data)

        # Print summary
        print("\n" + "="*50)
        print("EXTRACTION SUMMARY")
        print("="*50)
        print(
            f"Total tables extracted: {extracted_data['summary']['total_tables']}")
        print(
            f"Total text extractions: {extracted_data['summary']['total_text_extractions']}")

        print("\nKey Financial Metrics Found:")
        for metric, details in extracted_data['summary']['key_metrics'].items():
            print(
                f"• {metric}: {details['value']:,.0f} {details['currency_unit']}")

        print(f"\nFull data saved to: {output_path}")

        # Example: Access specific data
        print("\n" + "="*50)
        print("SAMPLE DATA ACCESS")
        print("="*50)

        # Show first table structure
        if extracted_data['tables']:
            first_table = extracted_data['tables'][0]
            print(f"First table context: {first_table['table_context']}")
            print(f"Currency unit: {first_table['currency_unit']}")
            print("Sample rows:")
            for i, (row_key, row_data) in enumerate(first_table['data'].items()):
                if i < 3:  # Show first 3 rows
                    print(f"  {row_key}:")
                    for col_name, col_data in row_data.items():
                        if col_data['numeric_value'] is not None:
                            print(
                                f"    {col_name}: {col_data['formatted_value']}")

    except FileNotFoundError:
        print(f"Error: PDF file '{pdf_path}' not found.")
        print("Please update the pdf_path variable with the correct file path.")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
