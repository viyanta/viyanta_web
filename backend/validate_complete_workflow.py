"""
Complete Workflow Validation Script
====================================
Tests and validates the entire PDF extraction → Database → Master Mapping workflow.

This script:
1. Checks database schema and table structure
2. Validates data integrity across all tables
3. Tests period column mapping for all companies
4. Validates master_mapping and master_rows sync
5. Runs cross-company comparison queries
6. Generates a comprehensive validation report

Usage:
    python validate_complete_workflow.py
    python validate_complete_workflow.py --form L-2-A
    python validate_complete_workflow.py --company-id 47
    python validate_complete_workflow.py --detailed

Author: Senior Data Engineer
Date: December 2025
"""

import argparse
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import pandas as pd


class WorkflowValidator:
    """Complete workflow validation"""

    def __init__(self, db_config: Dict[str, str]):
        """Initialize validator with database connection"""
        connection_string = (
            f"mysql+pymysql://{db_config['user']}:{db_config['password']}"
            f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
        )

        self.engine = create_engine(connection_string)
        self.Session = sessionmaker(bind=self.engine)

    def run_full_validation(
        self,
        form_no: Optional[str] = None,
        company_id: Optional[int] = None,
        detailed: bool = False
    ) -> Dict[str, any]:
        """
        Run complete validation suite

        Returns:
            {
                'success': bool,
                'checks': {
                    'schema': {...},
                    'data_integrity': {...},
                    'period_columns': {...},
                    'master_mapping': {...},
                    'master_rows': {...},
                    'cross_company': {...}
                },
                'errors': List[str],
                'warnings': List[str]
            }
        """
        print(f"\n{'='*100}")
        print(f"🔍 COMPLETE WORKFLOW VALIDATION")
        print(f"{'='*100}")
        print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        if form_no:
            print(f"📋 Form Filter: {form_no}")
        if company_id:
            print(f"🏢 Company Filter: {company_id}")
        print(f"{'='*100}\n")

        errors = []
        warnings = []
        checks = {}

        # 1. Schema validation
        print(f"\n{'─'*100}")
        print(f"📊 CHECK 1: Database Schema")
        print(f"{'─'*100}")
        schema_result = self.validate_schema()
        checks['schema'] = schema_result
        if not schema_result['success']:
            errors.extend(schema_result.get('errors', []))
        if schema_result.get('warnings'):
            warnings.extend(schema_result['warnings'])

        # 2. Data integrity
        print(f"\n{'─'*100}")
        print(f"📊 CHECK 2: Data Integrity")
        print(f"{'─'*100}")
        integrity_result = self.validate_data_integrity(form_no, company_id)
        checks['data_integrity'] = integrity_result
        if not integrity_result['success']:
            errors.extend(integrity_result.get('errors', []))
        if integrity_result.get('warnings'):
            warnings.extend(integrity_result['warnings'])

        # 3. Period columns
        print(f"\n{'─'*100}")
        print(f"📊 CHECK 3: Period Column Population")
        print(f"{'─'*100}")
        period_result = self.validate_period_columns(
            form_no, company_id, detailed)
        checks['period_columns'] = period_result
        if not period_result['success']:
            errors.extend(period_result.get('errors', []))
        if period_result.get('warnings'):
            warnings.extend(period_result['warnings'])

        # 4. Master mapping
        print(f"\n{'─'*100}")
        print(f"📊 CHECK 4: Master Mapping Integrity")
        print(f"{'─'*100}")
        mapping_result = self.validate_master_mapping(form_no, company_id)
        checks['master_mapping'] = mapping_result
        if not mapping_result['success']:
            errors.extend(mapping_result.get('errors', []))
        if mapping_result.get('warnings'):
            warnings.extend(mapping_result['warnings'])

        # 5. Master rows sync
        print(f"\n{'─'*100}")
        print(f"📊 CHECK 5: Master Rows Sync")
        print(f"{'─'*100}")
        rows_result = self.validate_master_rows_sync()
        checks['master_rows'] = rows_result
        if not rows_result['success']:
            errors.extend(rows_result.get('errors', []))
        if rows_result.get('warnings'):
            warnings.extend(rows_result['warnings'])

        # 6. Cross-company comparison (if no filters)
        if not form_no and not company_id:
            print(f"\n{'─'*100}")
            print(f"📊 CHECK 6: Cross-Company Comparison")
            print(f"{'─'*100}")
            cross_result = self.validate_cross_company_comparison()
            checks['cross_company'] = cross_result
            if not cross_result['success']:
                errors.extend(cross_result.get('errors', []))
            if cross_result.get('warnings'):
                warnings.extend(cross_result['warnings'])

        # Summary
        all_passed = len(errors) == 0

        print(f"\n{'='*100}")
        print(f"📋 VALIDATION SUMMARY")
        print(f"{'='*100}")
        print(
            f"Status: {'✅ ALL CHECKS PASSED' if all_passed else '❌ ISSUES FOUND'}")
        print(f"Errors: {len(errors)}")
        print(f"Warnings: {len(warnings)}")

        if errors:
            print(f"\n❌ Errors:")
            for i, error in enumerate(errors, 1):
                print(f"   {i}. {error}")

        if warnings:
            print(f"\n⚠️  Warnings:")
            for i, warning in enumerate(warnings, 1):
                print(f"   {i}. {warning}")

        print(f"\n⏰ Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*100}\n")

        return {
            'success': all_passed,
            'checks': checks,
            'errors': errors,
            'warnings': warnings
        }

    def validate_schema(self) -> Dict[str, any]:
        """Validate database schema"""
        db = self.Session()

        try:
            # Check required tables exist
            required_tables = [
                'company',
                'reports_l2',
                'reports_l2_extracted',
                'master_mapping',
                'master_rows'
            ]

            existing_tables = []
            missing_tables = []

            for table in required_tables:
                result = db.execute(
                    text(f"SHOW TABLES LIKE '{table}'")).fetchone()
                if result:
                    existing_tables.append(table)
                    print(f"✅ Table '{table}' exists")
                else:
                    missing_tables.append(table)
                    print(f"❌ Table '{table}' NOT FOUND")

            if missing_tables:
                return {
                    'success': False,
                    'existing_tables': existing_tables,
                    'missing_tables': missing_tables,
                    'errors': [f"Missing tables: {', '.join(missing_tables)}"]
                }

            # Check column structure for key tables
            column_checks = self._validate_table_columns(db)

            return {
                'success': True,
                'existing_tables': existing_tables,
                'column_checks': column_checks
            }

        finally:
            db.close()

    def _validate_table_columns(self, db) -> Dict[str, Dict]:
        """Validate column structure for key tables"""
        checks = {}

        # reports_l2_extracted required columns
        required_cols_extracted = [
            'id', 'report_id', 'company_id', 'row_index',
            'particulars', 'normalized_text', 'master_row_id',
            'for_current_period', 'for_previous_period',
            'upto_current_period', 'upto_previous_period'
        ]

        result = db.execute(text("DESCRIBE reports_l2_extracted")).fetchall()
        actual_cols = [row[0] for row in result]

        missing = [
            col for col in required_cols_extracted if col not in actual_cols]

        checks['reports_l2_extracted'] = {
            'required': required_cols_extracted,
            'actual': actual_cols,
            'missing': missing,
            'valid': len(missing) == 0
        }

        if missing:
            print(f"⚠️  reports_l2_extracted missing columns: {missing}")
        else:
            print(f"✅ reports_l2_extracted has all required columns")

        return checks

    def validate_data_integrity(
        self,
        form_no: Optional[str] = None,
        company_id: Optional[int] = None
    ) -> Dict[str, any]:
        """Validate data integrity across tables"""
        db = self.Session()

        try:
            errors = []
            warnings = []

            # Build WHERE clause
            where_clauses = []
            if form_no:
                where_clauses.append(f"r.form_no = '{form_no}'")
            if company_id:
                where_clauses.append(f"r.company_id = {company_id}")

            where_sql = " AND " + \
                " AND ".join(where_clauses) if where_clauses else ""

            # Check 1: All reports have extracted rows
            query = f"""
                SELECT r.id, r.form_no, r.company_id, r.period,
                       COUNT(e.id) as extracted_count
                FROM reports_l2 r
                LEFT JOIN reports_l2_extracted e ON e.report_id = r.id
                WHERE 1=1 {where_sql}
                GROUP BY r.id
                HAVING extracted_count = 0
            """

            orphaned_reports = db.execute(text(query)).fetchall()

            if orphaned_reports:
                count = len(orphaned_reports)
                errors.append(f"{count} reports have no extracted rows")
                print(f"❌ {count} reports have no extracted rows")
                if count <= 5:
                    for rep in orphaned_reports:
                        print(
                            f"   - Report ID {rep[0]}: {rep[1]} - {rep[2]} - {rep[3]}")
            else:
                print(f"✅ All reports have extracted rows")

            # Check 2: All extracted rows have valid company_id
            query = f"""
                SELECT COUNT(*) 
                FROM reports_l2_extracted e
                LEFT JOIN company c ON c.id = e.company_id
                WHERE c.id IS NULL {where_sql.replace('r.', 'e.')}
            """

            invalid_company = db.execute(text(query)).scalar()

            if invalid_company > 0:
                errors.append(
                    f"{invalid_company} extracted rows have invalid company_id")
                print(
                    f"❌ {invalid_company} extracted rows have invalid company_id")
            else:
                print(f"✅ All extracted rows have valid company_id")

            # Check 3: All extracted rows have particulars
            query = f"""
                SELECT COUNT(*) 
                FROM reports_l2_extracted e
                JOIN reports_l2 r ON r.id = e.report_id
                WHERE (e.particulars IS NULL OR e.particulars = '')
                {where_sql}
            """

            missing_particulars = db.execute(text(query)).scalar()

            if missing_particulars > 0:
                errors.append(
                    f"{missing_particulars} extracted rows have missing particulars")
                print(
                    f"❌ {missing_particulars} extracted rows have missing particulars")
            else:
                print(f"✅ All extracted rows have particulars")

            return {
                'success': len(errors) == 0,
                'errors': errors,
                'warnings': warnings
            }

        finally:
            db.close()

    def validate_period_columns(
        self,
        form_no: Optional[str] = None,
        company_id: Optional[int] = None,
        detailed: bool = False
    ) -> Dict[str, any]:
        """Validate period column population"""
        db = self.Session()

        try:
            errors = []
            warnings = []

            # Build WHERE clause
            where_clauses = []
            if form_no:
                where_clauses.append(f"r.form_no = '{form_no}'")
            if company_id:
                where_clauses.append(f"r.company_id = {company_id}")

            where_sql = " AND " + \
                " AND ".join(where_clauses) if where_clauses else ""

            # Check each period column
            period_columns = [
                'for_current_period',
                'for_previous_period',
                'upto_current_period',
                'upto_previous_period'
            ]

            stats = {}

            for col in period_columns:
                query = f"""
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN {col} IS NOT NULL AND {col} != '' THEN 1 ELSE 0 END) as populated,
                        SUM(CASE WHEN {col} IS NULL OR {col} = '' THEN 1 ELSE 0 END) as null_count
                    FROM reports_l2_extracted e
                    JOIN reports_l2 r ON r.id = e.report_id
                    WHERE 1=1 {where_sql}
                """

                result = db.execute(text(query)).fetchone()
                total, populated, null_count = result

                pct_populated = (populated / total * 100) if total > 0 else 0

                stats[col] = {
                    'total': total,
                    'populated': populated,
                    'null_count': null_count,
                    'pct_populated': pct_populated
                }

                status = "✅" if pct_populated >= 50 else "⚠️" if pct_populated >= 25 else "❌"
                print(
                    f"{status} {col}: {populated}/{total} ({pct_populated:.1f}%) populated")

                if pct_populated < 50:
                    msg = f"{col} only {pct_populated:.1f}% populated"
                    if pct_populated < 25:
                        errors.append(msg)
                    else:
                        warnings.append(msg)

            # Detailed analysis per company
            if detailed:
                print(f"\n📊 Per-Company Analysis:")
                query = f"""
                    SELECT 
                        c.name,
                        COUNT(*) as total,
                        SUM(CASE WHEN e.for_current_period IS NOT NULL AND e.for_current_period != '' THEN 1 ELSE 0 END) as with_current
                    FROM reports_l2_extracted e
                    JOIN reports_l2 r ON r.id = e.report_id
                    JOIN company c ON c.id = r.company_id
                    WHERE 1=1 {where_sql}
                    GROUP BY c.name
                    ORDER BY with_current DESC
                """

                results = db.execute(text(query)).fetchall()

                for company_name, total, with_current in results:
                    pct = (with_current / total * 100) if total > 0 else 0
                    status = "✅" if pct >= 50 else "⚠️" if pct >= 25 else "❌"
                    print(
                        f"  {status} {company_name}: {with_current}/{total} ({pct:.1f}%)")

            return {
                'success': len(errors) == 0,
                'stats': stats,
                'errors': errors,
                'warnings': warnings
            }

        finally:
            db.close()

    def validate_master_mapping(
        self,
        form_no: Optional[str] = None,
        company_id: Optional[int] = None
    ) -> Dict[str, any]:
        """Validate master mapping integrity"""
        db = self.Session()

        try:
            errors = []
            warnings = []

            # Build WHERE clause
            where_clauses = []
            if form_no:
                where_clauses.append(f"form_no = '{form_no}'")
            if company_id:
                where_clauses.append(f"company_id = {company_id}")

            where_sql = " AND " + \
                " AND ".join(where_clauses) if where_clauses else ""

            # Check 1: Duplicate mappings
            query = f"""
                SELECT company_id, form_no, variant_text, COUNT(*) as dup_count
                FROM master_mapping
                WHERE 1=1 {where_sql}
                GROUP BY company_id, form_no, variant_text
                HAVING dup_count > 1
            """

            duplicates = db.execute(text(query)).fetchall()

            if duplicates:
                count = len(duplicates)
                errors.append(f"{count} duplicate mappings found")
                print(f"❌ {count} duplicate mappings found")
            else:
                print(f"✅ No duplicate mappings")

            # Check 2: Orphaned master_row_id in extracted table
            query = f"""
                SELECT COUNT(*)
                FROM reports_l2_extracted e
                JOIN reports_l2 r ON r.id = e.report_id
                WHERE e.master_row_id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM master_mapping m 
                      WHERE m.id = e.master_row_id
                  )
                {where_sql}
            """

            orphaned = db.execute(text(query)).scalar()

            if orphaned > 0:
                errors.append(
                    f"{orphaned} extracted rows reference non-existent master_mapping")
                print(
                    f"❌ {orphaned} extracted rows reference non-existent master_mapping")
            else:
                print(f"✅ All master_row_id references are valid")

            # Check 3: Mapping coverage
            query = f"""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN e.master_row_id IS NOT NULL THEN 1 ELSE 0 END) as mapped
                FROM reports_l2_extracted e
                JOIN reports_l2 r ON r.id = e.report_id
                WHERE 1=1 {where_sql}
            """

            result = db.execute(text(query)).fetchone()
            total, mapped = result

            pct_mapped = (mapped / total * 100) if total > 0 else 0

            print(f"📊 Mapping coverage: {mapped}/{total} ({pct_mapped:.1f}%)")

            if pct_mapped < 50:
                warnings.append(f"Only {pct_mapped:.1f}% of rows are mapped")

            return {
                'success': len(errors) == 0,
                'total_rows': total,
                'mapped_rows': mapped,
                'pct_mapped': pct_mapped,
                'errors': errors,
                'warnings': warnings
            }

        finally:
            db.close()

    def validate_master_rows_sync(self) -> Dict[str, any]:
        """Validate master_rows is synced with master_mapping"""
        db = self.Session()

        try:
            errors = []
            warnings = []

            # Check 1: All clusters in master_mapping have entries in master_rows
            query = """
                SELECT COUNT(DISTINCT m.cluster_label)
                FROM master_mapping m
                WHERE m.cluster_label IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM master_rows r 
                      WHERE r.cluster_label = m.cluster_label
                  )
            """

            missing = db.execute(text(query)).scalar()

            if missing > 0:
                errors.append(
                    f"{missing} clusters in master_mapping not in master_rows")
                print(
                    f"❌ {missing} clusters in master_mapping not in master_rows")
            else:
                print(f"✅ All clusters are synced to master_rows")

            # Check 2: Count totals
            mapping_clusters = db.execute(text(
                "SELECT COUNT(DISTINCT cluster_label) FROM master_mapping WHERE cluster_label IS NOT NULL"
            )).scalar()

            rows_clusters = db.execute(text(
                "SELECT COUNT(*) FROM master_rows"
            )).scalar()

            print(f"📊 master_mapping clusters: {mapping_clusters}")
            print(f"📊 master_rows entries: {rows_clusters}")

            if mapping_clusters != rows_clusters:
                warnings.append(
                    f"Cluster count mismatch: {mapping_clusters} vs {rows_clusters}")

            return {
                'success': len(errors) == 0,
                'mapping_clusters': mapping_clusters,
                'rows_clusters': rows_clusters,
                'errors': errors,
                'warnings': warnings
            }

        finally:
            db.close()

    def validate_cross_company_comparison(self) -> Dict[str, any]:
        """Validate cross-company comparison query works"""
        db = self.Session()

        try:
            errors = []
            warnings = []

            # Try running a simple cross-company query
            query = """
                SELECT 
                    mm.master_name,
                    COUNT(DISTINCT r.company_id) as company_count,
                    COUNT(*) as row_count
                FROM reports_l2_extracted e
                JOIN reports_l2 r ON r.id = e.report_id
                JOIN master_mapping mm ON mm.id = e.master_row_id
                WHERE e.for_current_period IS NOT NULL 
                  AND e.for_current_period != ''
                GROUP BY mm.master_name
                HAVING company_count >= 2
                ORDER BY company_count DESC
                LIMIT 10
            """

            results = db.execute(text(query)).fetchall()

            if results:
                print(f"✅ Cross-company comparison query works")
                print(f"📊 Top mapped rows across companies:")
                for master_name, company_count, row_count in results[:5]:
                    print(
                        f"   - '{master_name[:50]}...' in {company_count} companies ({row_count} rows)")
            else:
                warnings.append("No rows found for cross-company comparison")
                print(f"⚠️  No rows found for cross-company comparison")

            return {
                'success': len(errors) == 0,
                'sample_results': len(results),
                'errors': errors,
                'warnings': warnings
            }

        finally:
            db.close()


# =================================================================
# MAIN
# =================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='Validate complete PDF extraction workflow')
    parser.add_argument('--form', type=str,
                        help='Filter by form number (e.g., L-2-A)')
    parser.add_argument('--company-id', type=int, help='Filter by company ID')
    parser.add_argument('--detailed', action='store_true',
                        help='Show detailed per-company analysis')
    parser.add_argument('--host', type=str,
                        default='localhost', help='Database host')
    parser.add_argument('--port', type=int, default=3306, help='Database port')
    parser.add_argument('--user', type=str, default='root',
                        help='Database user')
    parser.add_argument('--password', type=str, default='',
                        help='Database password')
    parser.add_argument('--database', type=str,
                        default='viyanta_web', help='Database name')

    args = parser.parse_args()

    db_config = {
        'host': args.host,
        'port': args.port,
        'user': args.user,
        'password': args.password,
        'database': args.database
    }

    validator = WorkflowValidator(db_config)

    result = validator.run_full_validation(
        form_no=args.form,
        company_id=args.company_id,
        detailed=args.detailed
    )

    # Exit with appropriate code
    exit(0 if result['success'] else 1)
