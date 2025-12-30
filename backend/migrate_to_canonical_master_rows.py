"""
Migration Script: Update reports_l2_extracted to use canonical master_rows.master_row_id
==========================================================================================

PURPOSE:
This script migrates all existing reports_l2_extracted records to use canonical
master_rows.master_row_id instead of legacy master_mapping.id.

WHAT IT DOES:
1. Ensures master_rows table is fully synced from master_mapping
2. For each row in reports_l2_extracted:
   - Gets the cluster_label from master_mapping (via normalized_text matching)
   - Looks up the canonical master_row_id from master_rows
   - Updates reports_l2_extracted.master_row_id to use canonical value
3. Verifies that all rows are correctly mapped

WHEN TO RUN:
- Run this ONCE after deploying the canonical master_rows architecture
- Run again if you suspect data inconsistencies

Author: Senior Data Engineer
Date: December 2025
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm
from typing import Dict, List
import pandas as pd

# Import database config
from databases.database import engine, SessionLocal
from databases.models import ReportsL2Extracted, MasterMapping, MasterRow


class CanonicalMasterRowMigration:
    """Migrates reports_l2_extracted to use canonical master_rows.master_row_id"""

    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal

    def run_migration(self, form_no: str = None, company_id: int = None):
        """
        Execute the full migration

        Args:
            form_no: Optional form number to migrate (e.g., 'L-2-A'). If None, migrates all forms.
            company_id: Optional company ID to migrate. If None, migrates all companies.
        """
        print("\n" + "=" * 80)
        print("🔄 CANONICAL MASTER_ROWS MIGRATION")
        print("=" * 80)
        print("\nPurpose: Update reports_l2_extracted to use canonical master_rows.master_row_id")
        print("         (NOT legacy master_mapping.id)")
        print("\n" + "=" * 80 + "\n")

        # Step 1: Sync master_rows
        print("📋 Step 1: Syncing master_rows table...")
        self._sync_master_rows(form_no, company_id)

        # Step 2: Build cluster -> master_row_id mapping
        print("\n📋 Step 2: Building cluster -> master_row_id mapping...")
        cluster_to_master = self._build_cluster_mapping()

        print(f"   ✅ Found {len(cluster_to_master)} clusters in master_rows")

        # Step 3: Build normalized_text -> cluster_label mapping from master_mapping
        print("\n📋 Step 3: Building normalized_text -> cluster_label mapping...")
        text_to_cluster = self._build_text_to_cluster_mapping(
            form_no, company_id)

        print(f"   ✅ Found {len(text_to_cluster)} unique normalized texts")

        # Step 4: Update reports_l2_extracted
        print("\n📋 Step 4: Updating reports_l2_extracted with canonical master_row_ids...")
        self._update_extracted_records(
            cluster_to_master,
            text_to_cluster,
            form_no,
            company_id
        )

        # Step 5: Verify migration
        print("\n📋 Step 5: Verifying migration...")
        self._verify_migration(form_no, company_id)

        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETE")
        print("=" * 80 + "\n")

    def _sync_master_rows(self, form_no: str = None, company_id: int = None):
        """Sync master_rows table from master_mapping"""
        from services.master_rows_sync_service import MasterRowsSyncService

        sync_service = MasterRowsSyncService()
        result = sync_service.sync_master_rows(
            form_no=form_no,
            company_id=company_id,
            verbose=True
        )

        if not result['success']:
            raise Exception(f"Master rows sync failed: {result.get('error')}")

    def _build_cluster_mapping(self) -> Dict[int, int]:
        """
        Build mapping from cluster_label -> master_rows.master_row_id

        Returns:
            Dict mapping cluster_label -> master_row_id
        """
        query = text("""
            SELECT cluster_label, master_row_id
            FROM master_rows
            WHERE cluster_label IS NOT NULL
        """)

        with self.engine.connect() as conn:
            result = conn.execute(query)
            return {row[0]: row[1] for row in result}

    def _build_text_to_cluster_mapping(
        self,
        form_no: str = None,
        company_id: int = None
    ) -> Dict[str, int]:
        """
        Build mapping from normalized_text -> cluster_label using master_mapping

        Returns:
            Dict mapping normalized_text -> cluster_label
        """
        query = """
            SELECT DISTINCT normalized_text, cluster_label
            FROM master_mapping
            WHERE cluster_label IS NOT NULL
        """

        params = {}

        if form_no:
            query += " AND form_no = :form_no"
            params['form_no'] = form_no

        if company_id:
            query += " AND company_id = :company_id"
            params['company_id'] = company_id

        with self.engine.connect() as conn:
            result = conn.execute(text(query), params)
            return {row[0]: row[1] for row in result}

    def _update_extracted_records(
        self,
        cluster_to_master: Dict[int, int],
        text_to_cluster: Dict[str, int],
        form_no: str = None,
        company_id: int = None
    ):
        """
        Update reports_l2_extracted with canonical master_row_ids

        Args:
            cluster_to_master: Dict mapping cluster_label -> master_row_id
            text_to_cluster: Dict mapping normalized_text -> cluster_label
            form_no: Optional form filter
            company_id: Optional company filter
        """
        # Get all rows from reports_l2_extracted that need updating
        query = """
            SELECT 
                e.id,
                e.normalized_text,
                e.master_row_id as current_master_row_id,
                r.form_no
            FROM reports_l2_extracted e
            JOIN reports_l2 r ON e.report_id = r.id
            WHERE e.normalized_text IS NOT NULL
              AND e.normalized_text != ''
        """

        params = {}

        if form_no:
            query += " AND r.form_no = :form_no"
            params['form_no'] = form_no

        if company_id:
            query += " AND e.company_id = :company_id"
            params['company_id'] = company_id

        with self.engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)

        print(f"   📊 Found {len(df)} rows to check")

        # Build updates
        updates = []
        skipped = 0
        unchanged = 0

        for _, row in df.iterrows():
            normalized_text = row['normalized_text']
            current_master_row_id = row['current_master_row_id']

            # Get cluster_label from normalized_text
            cluster_label = text_to_cluster.get(normalized_text)

            if cluster_label is None:
                skipped += 1
                continue

            # Get canonical master_row_id from cluster_label
            canonical_master_row_id = cluster_to_master.get(cluster_label)

            if canonical_master_row_id is None:
                skipped += 1
                continue

            # Check if update is needed
            if current_master_row_id == canonical_master_row_id:
                unchanged += 1
                continue

            updates.append((row['id'], canonical_master_row_id))

        print(f"   📝 Updates needed: {len(updates)}")
        print(f"   ✅ Already correct: {unchanged}")
        print(f"   ⚠️  Skipped (no mapping): {skipped}")

        if updates:
            print(f"   💾 Applying {len(updates)} updates...")

            update_query = text("""
                UPDATE reports_l2_extracted
                SET master_row_id = :master_row_id
                WHERE id = :id
            """)

            with self.engine.begin() as conn:
                for row_id, master_row_id in tqdm(updates, desc="   Updating"):
                    conn.execute(
                        update_query,
                        {"id": row_id, "master_row_id": master_row_id}
                    )

            print(f"   ✅ Updated {len(updates)} rows")
        else:
            print(
                f"   ✅ No updates needed - all rows already use canonical master_row_ids")

    def _verify_migration(self, form_no: str = None, company_id: int = None):
        """
        Verify that all rows in reports_l2_extracted use canonical master_row_ids

        Checks:
        1. All master_row_ids in reports_l2_extracted exist in master_rows
        2. No rows point to master_mapping.id (legacy IDs)
        """
        # Check 1: Verify all master_row_ids exist in master_rows
        query = """
            SELECT COUNT(*) as count
            FROM reports_l2_extracted e
            LEFT JOIN master_rows mr ON e.master_row_id = mr.master_row_id
            WHERE e.master_row_id IS NOT NULL
              AND mr.master_row_id IS NULL
        """

        params = {}

        if form_no:
            query += """
                AND e.report_id IN (
                    SELECT id FROM reports_l2 WHERE form_no = :form_no
                )
            """
            params['form_no'] = form_no

        if company_id:
            query += " AND e.company_id = :company_id"
            params['company_id'] = company_id

        with self.engine.connect() as conn:
            result = conn.execute(text(query), params)
            invalid_count = result.scalar()

        if invalid_count > 0:
            print(
                f"   ❌ Found {invalid_count} rows with invalid master_row_ids!")
            print(f"      These master_row_ids do not exist in master_rows table")
        else:
            print(f"   ✅ All master_row_ids are valid (exist in master_rows)")

        # Check 2: Count rows with canonical master_row_ids
        query = """
            SELECT COUNT(*) as count
            FROM reports_l2_extracted e
            JOIN master_rows mr ON e.master_row_id = mr.master_row_id
            WHERE e.master_row_id IS NOT NULL
        """

        params = {}

        if form_no:
            query += """
                AND e.report_id IN (
                    SELECT id FROM reports_l2 WHERE form_no = :form_no
                )
            """
            params['form_no'] = form_no

        if company_id:
            query += " AND e.company_id = :company_id"
            params['company_id'] = company_id

        with self.engine.connect() as conn:
            result = conn.execute(text(query), params)
            valid_count = result.scalar()

        print(
            f"   ✅ {valid_count} rows now use canonical master_rows.master_row_id")


def main():
    """Main entry point"""
    migration = CanonicalMasterRowMigration()

    # Option 1: Migrate ALL forms and companies
    migration.run_migration()

    # Option 2: Migrate specific form only
    # migration.run_migration(form_no="L-2-A")

    # Option 3: Migrate specific company only
    # migration.run_migration(company_id=43)  # ACKO Life

    # Option 4: Migrate specific form + company
    # migration.run_migration(form_no="L-2-A", company_id=43)


if __name__ == "__main__":
    main()
