"""
Professional PDF Table Extraction Module
Based on the advanced table extraction logic from the API call file
"""

import numpy as np
import pandas as pd
import os
import tabula
import re
from tabula import read_pdf
from io import StringIO
import tempfile
import logging
from typing import List, Tuple, Optional, Dict, Any
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFTableExtractor:
    """Professional PDF Table Extractor for Financial Documents"""

    def __init__(self):
        self.financial_keywords = {
            "revenue", "income", "assets", "liabilities", "equity", "expenses",
            "profit", "loss", "cash", "cost", "tax", "earnings", "dividend",
            "capital", "premium", "investment", "fund", "balance", "total",
            "amount", "value", "shares", "securities", "insurance", "policy"
        }

    def is_financial_row(self, row: List[str], min_financial_values: int = 2) -> bool:
        """Check if a row contains financial data based on numerical patterns"""
        financial_pattern = re.compile(
            r"\(?-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\)?")
        count = sum(1 for cell in row if financial_pattern.search(str(cell)))
        return count >= min_financial_values

    def is_enhanced_financial_row(self, row: List[str], min_numeric: int = 1) -> bool:
        """Enhanced financial row detection with keyword matching"""
        numeric_pattern = re.compile(r"""
            ^[^\w-]*                # prefix like $, (, -, etc.
            (\d{1,3}(,\d{3})*|\d+)  # number with or without commas
            (\.\d+)?                # decimal
            [^\w]*$                 # suffix like ), %, etc.
        """, re.VERBOSE)

        num_count = 0
        text_score = 0

        for cell in row:
            cell_lower = str(cell).lower().strip()

            # Check numbers
            if numeric_pattern.match(cell_lower.replace('(', '').replace(')', '')):
                num_count += 1

            # Check financial keywords
            for keyword in self.financial_keywords:
                if keyword in cell_lower:
                    text_score += 1
                    break

        return num_count >= min_numeric or text_score > 0

    def clean_table(self, df: pd.DataFrame) -> List[List[str]]:
        """Clean and process table data by merging related rows"""
        clean_rows = []
        buffer_row = None

        for _, row in df.iterrows():
            row_list = row.fillna('').astype(str).tolist()

            if self.is_financial_row(row_list):
                if buffer_row:
                    clean_rows.append(buffer_row)
                    buffer_row = None
                clean_rows.append(row_list)
            else:
                if buffer_row:
                    if len(row_list) == len(buffer_row):
                        buffer_row = [a + " " + b for a,
                                      b in zip(buffer_row, row_list)]
                    else:
                        clean_rows.append(buffer_row)
                        buffer_row = row_list
                else:
                    buffer_row = row_list

        if buffer_row:
            clean_rows.append(buffer_row)

        try:
            max_len = max(len(row) for row in clean_rows) if clean_rows else 0
            clean_rows = [row + [""] * (max_len - len(row))
                          for row in clean_rows]
            return clean_rows
        except:
            return []

    def score_table(self, df: pd.DataFrame) -> float:
        """Score table based on financial content relevance"""
        if len(df) == 0:
            return 0

        financial_rows = sum(
            self.is_enhanced_financial_row(row.fillna('').tolist())
            for _, row in df.iterrows()
        )
        return financial_rows / len(df)

    def rank_tables(self, dfs: List[pd.DataFrame]) -> List[pd.DataFrame]:
        """Rank tables by financial relevance score"""
        return sorted(dfs, key=self.score_table, reverse=True)

    def extract_tables_tabula(self, file_path: str, pages: str = "all", mode: str = "both") -> List[pd.DataFrame]:
        """Extract tables using tabula with both stream and lattice methods"""
        dfs = []

        try:
            if mode in ("stream", "both"):
                logger.info(
                    f"Extracting tables using stream method from {file_path}")
                try:
                    stream_tables = read_pdf(
                        file_path,
                        pages=pages,
                        stream=True,
                        guess=False,
                        multiple_tables=True,
                        encoding='utf-8'
                    )
                    dfs.extend(stream_tables)
                except UnicodeDecodeError:
                    # Try with latin-1 encoding
                    logger.warning(
                        f"UTF-8 encoding failed, trying latin-1 for {file_path}")
                    stream_tables = read_pdf(
                        file_path,
                        pages=pages,
                        stream=True,
                        guess=False,
                        multiple_tables=True,
                        encoding='latin-1'
                    )
                    dfs.extend(stream_tables)

            if mode in ("lattice", "both"):
                logger.info(
                    f"Extracting tables using lattice method from {file_path}")
                try:
                    lattice_tables = read_pdf(
                        file_path,
                        pages=pages,
                        lattice=True,
                        guess=False,
                        multiple_tables=True,
                        encoding='utf-8'
                    )
                    dfs.extend(lattice_tables)
                except UnicodeDecodeError:
                    # Try with latin-1 encoding
                    logger.warning(
                        f"UTF-8 encoding failed, trying latin-1 for {file_path}")
                    lattice_tables = read_pdf(
                        file_path,
                        pages=pages,
                        lattice=True,
                        guess=False,
                        multiple_tables=True,
                        encoding='latin-1'
                    )
                    dfs.extend(lattice_tables)

        except Exception as e:
            logger.error(f"Error extracting tables from {file_path}: {str(e)}")

        return dfs

    def extract_all_cleaned_tables(self, file_path: str, pages: str = "all", mode: str = "both") -> List[pd.DataFrame]:
        """Extract and clean all valid tables from PDF"""
        raw_dfs = self.extract_tables_tabula(file_path, pages, mode)
        scored_dfs = self.rank_tables(raw_dfs)

        valid_tables = []
        for df in scored_dfs:
            cleaned = self.clean_table(df)
            if cleaned:
                cleaned_df = pd.DataFrame(cleaned)
                if len(cleaned_df) > 0:  # Only add non-empty tables
                    valid_tables.append(cleaned_df)

        logger.info(
            f"Extracted {len(valid_tables)} valid tables from {file_path}")
        return valid_tables

    def extract_best_table(self, file_path: str, pages: str = "all", mode: str = "both") -> Optional[pd.DataFrame]:
        """Extract the best (highest scored) table from PDF"""
        valid_tables = self.extract_all_cleaned_tables(file_path, pages, mode)
        return valid_tables[0] if valid_tables else None

    def process_multiple_pdfs(self, pdf_paths: List[str]) -> Dict[str, List[pd.DataFrame]]:
        """Process multiple PDF files and extract tables"""
        results = {}

        for pdf_path in pdf_paths:
            try:
                filename = os.path.basename(pdf_path)
                logger.info(f"Processing {filename}")

                tables = self.extract_all_cleaned_tables(pdf_path)
                results[filename] = tables

                logger.info(
                    f"Successfully processed {filename}: {len(tables)} tables extracted")

            except Exception as e:
                logger.error(f"Error processing {pdf_path}: {str(e)}")
                results[os.path.basename(pdf_path)] = []

        return results

    def save_tables_to_csv(self, tables: List[pd.DataFrame], output_dir: str, base_filename: str) -> List[str]:
        """Save extracted tables to CSV files (original extraction)"""
        os.makedirs(output_dir, exist_ok=True)
        saved_files = []

        for i, table in enumerate(tables):
            filename = f"{base_filename}_table_{i+1}.csv"
            filepath = os.path.join(output_dir, filename)

            try:
                table.to_csv(filepath, index=False)
                saved_files.append(filepath)
                logger.info(f"Saved table to {filepath}")
            except Exception as e:
                logger.error(f"Error saving table to {filepath}: {str(e)}")

        return saved_files

    def save_corrected_tables_to_csv(self, corrected_data: Dict[str, Any], output_dir: str, base_filename: str) -> List[str]:
        """Save corrected/verified tables to CSV files (matching API_call.ipynb format)"""
        os.makedirs(output_dir, exist_ok=True)
        saved_files = []

        if 'tables' in corrected_data:
            for table_info in corrected_data['tables']:
                table_id = table_info.get('table_id', 1)
                headers = table_info.get('headers', [])
                data = table_info.get('data', [])

                if headers and data:
                    # Create DataFrame from corrected data
                    try:
                        df = pd.DataFrame(data, columns=headers)
                        filename = f"{base_filename}_verified_table_{table_id}.csv"
                        filepath = os.path.join(output_dir, filename)

                        df.to_csv(filepath, index=False)
                        saved_files.append(filepath)
                        logger.info(f"Saved verified table to {filepath}")
                    except Exception as e:
                        logger.error(
                            f"Error saving verified table {table_id}: {str(e)}")

        return saved_files

    def table_string_to_dataframe(self, table_string: str, output_path: str = None) -> pd.DataFrame:
        """Convert table string (from Gemini response) back to DataFrame (matching notebook method)"""
        try:
            lines = [line.strip()
                     for line in table_string.splitlines() if '|' in line]

            # Convert rows to lists and remove markdown formatting
            rows = []
            for line in lines:
                if re.match(r'^\|?\s*\*\*.*\*\*\s*\|?$', line):  # Skip bolded section headers
                    continue
                cells = [cell.strip() for cell in line.strip('|').split('|')]
                rows.append(cells)

            if not rows:
                return pd.DataFrame()

            # Extract header and normalize rows
            header = rows[0]
            normalized_rows = []
            for row in rows[1:]:
                if len(row) < len(header):
                    row += [''] * (len(header) - len(row))
                elif len(row) > len(header):
                    row = row[:len(header)]
                normalized_rows.append(row)

            # Create DataFrame
            df = pd.DataFrame(normalized_rows, columns=header)

            if output_path:
                df.to_csv(output_path, index=False)
                logger.info(f"Saved converted table to {output_path}")

            return df

        except Exception as e:
            logger.error(
                f"Error converting table string to DataFrame: {str(e)}")
            return pd.DataFrame()

    def tables_to_json(self, tables: List[pd.DataFrame], metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Convert tables to JSON format compatible with Gemini verifier (matching API_call.ipynb format)"""
        result = {
            "metadata": metadata or {},
            "tables": [],
            "total_tables": len(tables),
            "timestamp": pd.Timestamp.now().isoformat()
        }

        for i, table in enumerate(tables):
            # Clean column names and prepare headers
            headers = [str(col).strip() for col in table.columns.tolist()]

            # Convert table data to list of lists (matching notebook format)
            data_rows = []
            for _, row in table.iterrows():
                row_data = [str(cell).strip() if pd.notna(
                    cell) else "" for cell in row.tolist()]
                data_rows.append(row_data)

            # Detect table type based on content
            table_type = "financial_data"
            headers_text = " ".join(headers).lower()
            if any(keyword in headers_text for keyword in ["balance", "sheet"]):
                table_type = "balance_sheet"
            elif any(keyword in headers_text for keyword in ["income", "revenue", "profit"]):
                table_type = "income_statement"
            elif any(keyword in headers_text for keyword in ["cash", "flow"]):
                table_type = "cash_flow"
            elif any(keyword in headers_text for keyword in ["investment", "portfolio"]):
                table_type = "investment_schedule"

            table_data = {
                "table_id": i + 1,
                # Can be enhanced with actual title detection
                "title": f"Table {i + 1}",
                "headers": headers,
                "data": data_rows,
                "rows": len(table),
                "columns": len(table.columns),
                "metadata": {
                    "page_number": 1,  # Default, can be enhanced
                    "table_type": table_type,
                    "financial_score": self.score_table(table),
                    "extraction_method": "tabula"
                }
            }
            result["tables"].append(table_data)

        return result


def create_extraction_summary(results: Dict[str, List[pd.DataFrame]]) -> Dict[str, Any]:
    """Create a summary of extraction results"""
    summary = {
        "total_files_processed": len(results),
        "successful_extractions": 0,
        "total_tables_extracted": 0,
        "file_details": []
    }

    for filename, tables in results.items():
        file_info = {
            "filename": filename,
            "tables_extracted": len(tables),
            "status": "success" if tables else "no_tables_found"
        }

        if tables:
            summary["successful_extractions"] += 1
            summary["total_tables_extracted"] += len(tables)

            # Add table details
            file_info["table_details"] = [
                {
                    "table_id": i + 1,
                    "rows": len(table),
                    "columns": len(table.columns)
                }
                for i, table in enumerate(tables)
            ]

        summary["file_details"].append(file_info)

    summary["success_rate"] = (
        summary["successful_extractions"] / summary["total_files_processed"]) * 100

    return summary
