
"""
Database Storage Service
Handles storing extraction results into the database
"""
import re
import json
import traceback
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from services.period_column_detector import PeriodColumnDetector


class DatabaseStorageService:
    """Service for storing extraction results in database"""

    def __init__(self):
        from databases.database import SessionLocal
        from databases.models import Company, ReportModels

        self.SessionLocal = SessionLocal
        self.Company = Company
        self.ReportModels = ReportModels

    def _normalize_text(self, text: str) -> str:
        """
        Normalize text for master mapping (lowercase, remove special chars, etc.)

        This is a simple normalization for database storage. The master mapping 
        pipeline will do more sophisticated normalization.
        """
        if not text:
            return ""

        # Convert to lowercase
        normalized = text.lower()

        # Remove extra whitespace
        normalized = ' '.join(normalized.split())

        # Remove common punctuation (but keep some structure)
        normalized = re.sub(r'[^\w\s\-\(\)]', '', normalized)

        # Remove extra whitespace again after removing punctuation
        normalized = ' '.join(normalized.split())

        return normalized.strip()

    def store_extraction_results(
        self,
        company_name: str,
        pdf_name: str,
        form_code: str,
        normalized_data: any
    ) -> Dict[str, any]:
        """
        Store extraction results in the database

        Returns:
            {
                'success': bool,
                'company_id': int,
                'report_ids': List[int],
                'rows_inserted': int,
                'error': str (if failed)
            }
        """
        try:
            print(f"\n🗄️ === DATABASE STORAGE ===")
            print(f"📊 Company: {company_name}")
            print(f"📄 PDF: {pdf_name}")
            print(f"🎯 Form Code: {form_code}")
            print(f"📊 Data type: {type(normalized_data)}")

            db = self.SessionLocal()

            try:
                # 1. Find or create company
                company_obj = self._get_or_create_company(db, company_name)

                # 2. Extract report type from PDF name
                report_type = self._extract_report_type(pdf_name)

                # 3. Group data by period
                period_groups = self._group_by_period(normalized_data)

                if not period_groups:
                    period_groups[str(datetime.now().date())] = []
                    print(f"[DB] No data found, using current date as period")

                # 4. Get report model (L-form table or company table)
                table_key = self._resolve_table_key(company_name, form_code)
                report_model = self.ReportModels.get(table_key)

                if not report_model:
                    raise Exception(f"No table found for: {table_key}")

                # 5. Insert reports (one per period)
                report_ids = self._insert_reports(
                    db,
                    report_model,
                    company_obj,
                    period_groups,
                    report_type,
                    form_code,
                    company_name,
                    pdf_name
                )

                # 6. Populate reports_l*_extracted table (for L-forms)
                if table_key and table_key.startswith('l'):  # Only for L-forms
                    self._populate_extracted_table(
                        db,
                        table_key,
                        company_obj.id,
                        report_ids,
                        period_groups
                    )

                db.commit()

                print(f"✅ Successfully stored {len(report_ids)} report(s)")
                print(f"=== END DATABASE STORAGE ===\n")

                return {
                    'success': True,
                    'company_id': company_obj.id,
                    'report_ids': report_ids,
                    'rows_inserted': len(report_ids)
                }

            except Exception as e:
                db.rollback()
                raise e
            finally:
                db.close()

        except Exception as e:
            error_msg = f"Database storage failed: {str(e)}"
            print(f"❌ {error_msg}")
            print(f"❌ Traceback: {traceback.format_exc()}")

            return {
                'success': False,
                'error': error_msg
            }

    def _get_or_create_company(self, db, company_name: str):
        """Find or create company in database"""
        company_obj = db.query(self.Company).filter_by(
            name=company_name).first()

        if not company_obj:
            print(f"[DB] Creating new company: {company_name}")
            company_obj = self.Company(name=company_name)
            db.add(company_obj)
            db.commit()
            db.refresh(company_obj)
        else:
            print(
                f"[DB] Found existing company: {company_name} (ID: {company_obj.id})")

        return company_obj

    def _extract_report_type(self, pdf_name: str) -> str:
        """Extract report type (Standalone/Consolidated) from PDF name"""
        match = re.search(r'\s([SC])\s*FY', pdf_name, re.IGNORECASE)

        if match:
            type_code = match.group(1).upper()
            return "Standalone" if type_code == "S" else "Consolidated"

        return "Standalone"  # Default fallback

    def _group_by_period(self, normalized_data: any) -> Dict[str, List]:
        """Group data tables by period"""
        period_groups = {}

        # Handle both list and dict formats
        tables_list = []
        if isinstance(normalized_data, dict) and "data" in normalized_data:
            # Format: {"data": [table1, table2, ...]}
            tables_list = normalized_data.get("data", [])
        elif isinstance(normalized_data, list):
            # Format: [table1, table2, ...]
            tables_list = normalized_data
        else:
            print(f"[DB] WARNING: Unexpected data format: {type(normalized_data)}")
            return period_groups

        for table in tables_list:
            if not isinstance(table, dict):
                continue

            period = table.get("Period") or table.get(
                "period") or str(datetime.now().date())

            if period not in period_groups:
                period_groups[period] = []

            period_groups[period].append(table)

        print(
            f"[DB] Found {len(period_groups)} unique periods: {list(period_groups.keys())}")

        return period_groups

    def _resolve_table_key(self, company_name: str, form_code: str) -> str:
        """
        Resolve which table to use (L-form vs company-specific)
        Priority:
        1. L-form table (e.g., l2, l6a, l14a)
        2. Company table (e.g., axis_max_life)

        Note: _normalize_lform_key already handles suffix fallback internally
        """
        # Normalize form code for L-form detection (returns key like 'l2', 'l6a', etc.)
        lform_key = self._normalize_lform_key(form_code)

        print(f"[DB] Normalized L-Form Key: {lform_key}")

        # Check if L-form table exists in ReportModels
        if lform_key and lform_key in self.ReportModels:
            table_name = self.ReportModels[lform_key].__tablename__
            print(
                f"[DB] Using L-form table: {lform_key} (table: {table_name})")
            return lform_key

        # Fallback to company table
        company_key = company_name.lower().replace(" ", "_")
        if company_key in self.ReportModels:
            table_name = self.ReportModels[company_key].__tablename__
            print(
                f"[DB] L-form table not found, using company table: {company_key} (table: {table_name})")
        else:
            print(
                f"[DB] WARNING: Company table '{company_key}' not found in ReportModels!")

        return company_key

    def _normalize_lform_key(self, form_code: str) -> str:
        """
        Normalize form code to L-form table key with smart fallback

        Priority:
        1. Try with suffix if it exists (e.g., L-6A -> l6a if table exists)
        2. Try base form without suffix (e.g., L-2-A -> l2 if l2a doesn't exist)
        3. Return empty if no match

        Allowed suffix tables: l6a, l9a, l14a, l25_i, l25_ii (defined in models.py extra_forms)
        Note: Keys are like 'l6a', not 'reports_l6a'
        """
        if not form_code:
            return ""

        # Extract base form code (L-1, L-6A, etc.)
        form_code_upper = form_code.upper().replace('_', '-')

        # Define which suffix forms have dedicated tables (from models.py extra_forms)
        ALLOWED_SUFFIX_TABLES = {'l6a', 'l9a', 'l14a', 'l25_i', 'l25_ii'}

        # Match patterns: L-1-A, L-6A, L-10
        patterns = [
            # L-6A or L-2-A (captures number and suffix separately)
            r'(L-\d+)([A-Z]+)',
            r'(L-\d+)-([A-Z]+)',  # L-1-A (with dash)
            r'(L-\d+)',  # L-10 (just number)
        ]

        for pattern in patterns:
            match = re.search(pattern, form_code_upper)
            if match:
                if len(match.groups()) == 2:
                    # Has suffix (e.g., L-6A or L-2-A)
                    base_num = match.group(1).replace('-', '')  # L6 or L2
                    suffix = match.group(2).lower()  # 'a'

                    # Try with suffix first (e.g., l6a)
                    full_key = f"{base_num.lower()}{suffix}"  # e.g., 'l6a'

                    # Check if this suffix form is allowed AND exists in ReportModels
                    if full_key in ALLOWED_SUFFIX_TABLES and full_key in self.ReportModels:
                        print(f"[DB] Using specific suffix table: {full_key}")
                        return full_key

                    # Fall back to base form (e.g., l2)
                    base_key = base_num.lower()  # Just "l2"
                    print(
                        f"[DB] Suffix table '{full_key}' not available, using base: {base_key}")
                    return base_key
                else:
                    # No suffix (e.g., L-10 → l10)
                    base = match.group(1).replace('-', '').lower()
                    table_key = base  # Just "l10"
                    return table_key

        return ""

    def _insert_reports(
        self,
        db,
        report_model,
        company_obj,
        period_groups: Dict[str, List],
        report_type: str,
        form_code: str,
        company_name: str,
        pdf_name: str
    ) -> List[int]:
        """Insert report entries for each period"""
        report_ids = []

        for report_period, tables_for_period in period_groups.items():
            print(f"[DB] Creating report entry for period: {report_period}")

            # Combine all rows from tables with same period
            combined_rows = []
            flat_headers = None
            currency = None
            registration_number = None
            title = None
            pages_used = None
            source_pdf = None

            for table in tables_for_period:
                if not isinstance(table, dict):
                    continue

                # Extract metadata
                if not currency:
                    currency = table.get("Currency") or table.get("currency")

                if not registration_number:
                    registration_number = table.get(
                        "RegistrationNumber") or table.get("registration_number")

                if not title:
                    title = table.get("Title") or table.get(
                        "title") or form_code

                # Extract flat_headers (column names)
                if not flat_headers:
                    flat_headers = table.get(
                        "FlatHeaders") or table.get("flat_headers") or []

                # Extract pages_used
                if not pages_used:
                    pages_used = table.get(
                        "PagesUsed") or table.get("pages_used")

                # Extract source_pdf (if available)
                if not source_pdf:
                    source_pdf = table.get("SourcePDF") or table.get(
                        "source_pdf") or pdf_name

                # Extract rows
                rows = table.get("Rows") or table.get("rows") or []
                if isinstance(rows, list):
                    combined_rows.extend(rows)

            try:
                # Create report entry
                # Note: Column names must match the SQLAlchemy model exactly
                report_obj = report_model(
                    company=company_name,  # String column
                    company_id=company_obj.id,
                    ReportType=report_type,  # Capital R and T to match model
                    pdf_name=pdf_name,
                    period=report_period,
                    form_no=form_code,  # Changed from form_code to form_no
                    title=title,
                    currency=currency,
                    registration_number=registration_number,
                    flat_headers=flat_headers if flat_headers else [],  # Store column names
                    pages_used=pages_used,  # Store pages used from extraction
                    source_pdf=source_pdf or pdf_name,  # Store source PDF
                    # Changed from data to data_rows, use list not JSON string
                    data_rows=combined_rows if combined_rows else [],
                    created_at=datetime.now()
                )

                db.add(report_obj)
                db.flush()

                report_ids.append(report_obj.id)
                print(
                    f"[DB] ✅ Created report ID: {report_obj.id} for period: {report_period}")

            except IntegrityError as ie:
                print(f"⚠️ Duplicate report for period {report_period}: {ie}")
                db.rollback()

                # Try to find existing report
                existing = db.query(report_model).filter_by(
                    company_id=company_obj.id,
                    period=report_period,
                    form_code=form_code
                ).first()

                if existing:
                    report_ids.append(existing.id)
                    print(f"[DB] Using existing report ID: {existing.id}")

        return report_ids

    def _populate_extracted_table(
        self,
        db,
        table_key: str,
        company_id: int,
        report_ids: List[int],
        period_groups: Dict[str, List]
    ):
        """
        Populate reports_l*_extracted table with individual rows

        This method extracts the data_rows from each report and inserts them
        into the corresponding _extracted table with proper structure for
        master mapping pipeline.

        Args:
            db: Database session
            table_key: Normalized table key (e.g., 'l2', 'l6a')
            company_id: Company ID
            report_ids: List of created report IDs
            period_groups: Grouped data by period
        """
        if not report_ids or table_key not in self.ReportModels:
            return

        print(f"\n[DB] Populating {table_key}_extracted table...")

        # Check if extracted model exists
        extracted_key = f"reports_{table_key}_extracted"
        if extracted_key not in self.ReportModels:
            print(f"  ⚠️ No extracted table model found for {extracted_key}")
            return

        ExtractedModel = self.ReportModels[extracted_key]

        # Map report IDs to periods (for tracking)
        report_id_iter = iter(report_ids)

        inserted_count = 0
        for report_period, tables_for_period in period_groups.items():
            try:
                report_id = next(report_id_iter)
            except StopIteration:
                break

            # Extract all rows for this period
            for table in tables_for_period:
                if not isinstance(table, dict):
                    continue

                rows = table.get("Rows") or table.get("rows") or []
                # FIX: Use FlatHeadersNormalized (with underscores) to match the keys in Rows
                flat_headers = table.get(
                    "FlatHeadersNormalized") or table.get("FlatHeaders") or table.get("flat_headers") or []

                # If flat_headers is empty but we have rows, extract headers from first row
                if (not flat_headers or len(flat_headers) == 0) and rows and len(rows) > 0:
                    if isinstance(rows[0], dict):
                        flat_headers = list(rows[0].keys())
                        print(
                            f"[DB] Extracted flat_headers from data_rows: {flat_headers}")

                if not isinstance(rows, list) or len(rows) == 0:
                    continue

                # Insert each row into extracted table
                for row_index, row_data in enumerate(rows):
                    if not isinstance(row_data, dict):
                        continue

                    try:
                        # Extract particulars (row name) - try common column names
                        particulars = (
                            row_data.get("Particulars") or
                            row_data.get("particulars") or
                            row_data.get("Description") or
                            row_data.get("description") or
                            row_data.get("Row Name") or
                            row_data.get("row_name") or
                            ""
                        )

                        if not particulars:
                            # Try first column if no obvious particulars column
                            if flat_headers and len(flat_headers) > 0:
                                first_col = flat_headers[0]
                                particulars = row_data.get(first_col, "")

                        # Skip empty rows
                        if not particulars or particulars.strip() == "":
                            continue

                        # Extract schedule
                        schedule = (
                            row_data.get("Schedule") or
                            row_data.get("schedule") or
                            row_data.get("Schedule_Ref") or
                            row_data.get("Schedule Ref") or
                            row_data.get("Form_No") or
                            ""
                        )

                        # Smart period column detection using the new detector
                        period_col_mapping = PeriodColumnDetector.detect_period_columns(
                            flat_headers,
                            verbose=False
                        )

                        # Extract values using detected column names
                        for_current = row_data.get(
                            period_col_mapping['for_current_period'], "") if period_col_mapping['for_current_period'] else ""
                        for_previous = row_data.get(
                            period_col_mapping['for_previous_period'], "") if period_col_mapping['for_previous_period'] else ""
                        upto_current = row_data.get(
                            period_col_mapping['upto_current_period'], "") if period_col_mapping['upto_current_period'] else ""
                        upto_previous = row_data.get(
                            period_col_mapping['upto_previous_period'], "") if period_col_mapping['upto_previous_period'] else ""

                        # Normalize the particulars text for master mapping
                        normalized_text = self._normalize_text(
                            str(particulars).strip())

                        # Create extracted row entry - handle L-1, L-2, and L-3 columns
                        # L-1 (Revenue Account) uses: business type breakdown columns (linked/non-linked, life/pension/health, etc.)
                        # L-2 (Revenue) uses: for_current_period, upto_current_period, for_previous_period, upto_previous_period
                        # L-3 (Balance Sheet) uses: as_at_current_period, as_at_previous_period

                        if table_key == "l1":
                            # L-1 Revenue Account: business type breakdown columns
                            extracted_row = ExtractedModel(
                                report_id=report_id,
                                company_id=company_id,  # Added for master mapping pipeline
                                master_row_id=None,  # Will be populated by master mapping pipeline
                                row_index=row_index,  # Added for ordering
                                particulars=str(particulars).strip(),
                                normalized_text=normalized_text,  # Added for master mapping
                                schedule=str(schedule).strip() if schedule else None,
                                # Linked Business columns
                                linked_business_life=row_data.get("Linked_Business_Life") or row_data.get("linked_business_life"),
                                linked_business_pension=row_data.get("Linked_Business_Pension") or row_data.get("linked_business_pension"),
                                linked_business_health=row_data.get("Linked_Business_Health") or row_data.get("linked_business_health"),
                                linked_business_variable_insurance=row_data.get("Linked_Business_Variable_Insurance") or row_data.get("linked_business_variable_insurance"),
                                linked_business_total=row_data.get("Linked_Business_Total") or row_data.get("linked_business_total"),
                                # Non-Linked Business - Participating columns
                                non_linked_business_participating_life=row_data.get("Non_Linked_Business_Participating_Life") or row_data.get("non_linked_business_participating_life"),
                                non_linked_business_participating_annuity=row_data.get("Non_Linked_Business_Participating_Annuity") or row_data.get("non_linked_business_participating_annuity"),
                                non_linked_business_participating_pension=row_data.get("Non_Linked_Business_Participating_Pension") or row_data.get("non_linked_business_participating_pension"),
                                non_linked_business_participating_health=row_data.get("Non_Linked_Business_Participating_Health") or row_data.get("non_linked_business_participating_health"),
                                non_linked_business_participating_variable_insurance=row_data.get("Non_Linked_Business_Participating_Variable_Insurance") or row_data.get("non_linked_business_participating_variable_insurance"),
                                non_linked_business_participating_total=row_data.get("Non_Linked_Business_Participating_Total") or row_data.get("non_linked_business_participating_total"),
                                # Non-Linked Business - Non-Participating columns
                                non_linked_business_non_participating_life=row_data.get("Non_Linked_Business_Non_Participating_Life") or row_data.get("non_linked_business_non_participating_life"),
                                non_linked_business_non_participating_annuity=row_data.get("Non_Linked_Business_Non_Participating_Annuity") or row_data.get("non_linked_business_non_participating_annuity"),
                                non_linked_business_non_participating_pension=row_data.get("Non_Linked_Business_Non_Participating_Pension") or row_data.get("non_linked_business_non_participating_pension"),
                                non_linked_business_non_participating_health=row_data.get("Non_Linked_Business_Non_Participating_Health") or row_data.get("non_linked_business_non_participating_health"),
                                non_linked_business_non_participating_variable_insurance=row_data.get("Non_Linked_Business_Non_Participating_Variable_Insurance") or row_data.get("non_linked_business_non_participating_variable_insurance"),
                                non_linked_business_non_participating_total=row_data.get("Non_Linked_Business_Non_Participating_Total") or row_data.get("non_linked_business_non_participating_total"),
                                # Total column
                                total=row_data.get("Total") or row_data.get("total") or row_data.get("Grand_Total") or row_data.get("grand_total"),
                                created_at=datetime.now()
                            )
                        elif table_key == "l3":
                            # L-3 Balance Sheet: only 2 "as at" columns
                            extracted_row = ExtractedModel(
                                report_id=report_id,
                                company_id=company_id,
                                row_index=row_index,
                                particulars=str(particulars).strip(),
                                normalized_text=normalized_text,
                                schedule=str(schedule).strip(
                                ) if schedule else None,
                                as_at_current_period=str(
                                    for_current).strip() if for_current else None,
                                as_at_previous_period=str(
                                    for_previous).strip() if for_previous else None,
                                created_at=datetime.now()
                            )
                        else:
                            # L-2 and others: 4 period columns
                            extracted_row = ExtractedModel(
                                report_id=report_id,
                                company_id=company_id,
                                row_index=row_index,
                                particulars=str(particulars).strip(),
                                normalized_text=normalized_text,
                                schedule=str(schedule).strip(
                                ) if schedule else None,
                                for_current_period=str(
                                    for_current).strip() if for_current else None,
                                upto_current_period=str(
                                    upto_current).strip() if upto_current else None,
                                for_previous_period=str(
                                    for_previous).strip() if for_previous else None,
                                upto_previous_period=str(
                                    upto_previous).strip() if upto_previous else None,
                                created_at=datetime.now()
                            )

                        db.add(extracted_row)
                        inserted_count += 1

                    except Exception as e:
                        print(f"  ⚠️ Failed to insert row {row_index}: {e}")
                        continue

        # Commit all inserted rows
        try:
            db.commit()
            print(f"  ✅ Inserted {inserted_count} rows into {extracted_key}")
        except Exception as e:
            db.rollback()
            print(f"  ❌ Failed to commit extracted rows: {e}")
            raise
