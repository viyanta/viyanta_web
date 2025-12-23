"""
Master Rows Sync Service
=========================
Maintains sync between master_mapping and master_rows tables.

Purpose:
- Ensures master_rows table is always up-to-date with master_mapping
- Provides a clean, deduplicated view of all master row definitions
- Supports incremental updates (only sync new/changed clusters)

Tables:
- master_mapping: Contains all variant texts and their cluster assignments
- master_rows: Contains one canonical entry per cluster

Workflow:
1. After master mapping pipeline runs, call sync_master_rows()
2. Service checks for new/updated clusters in master_mapping
3. Inserts or updates corresponding entries in master_rows
4. Ensures cluster_label uniqueness and proper master_name assignment

Author: Senior Data Engineer
Date: December 2025
"""

from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Dict, List, Optional
from datetime import datetime


class MasterRowsSyncService:
    """Service for syncing master_rows table from master_mapping"""

    def __init__(self):
        from databases.database import SessionLocal
        from databases.models import MasterMapping, MasterRow

        self.SessionLocal = SessionLocal
        self.MasterMapping = MasterMapping
        self.MasterRow = MasterRow

    def sync_master_rows(
        self,
        form_no: Optional[str] = None,
        company_id: Optional[int] = None,
        verbose: bool = True
    ) -> Dict[str, any]:
        """
        Sync master_rows table from master_mapping

        Args:
            form_no: Optional form number to sync (e.g., 'L-2-A'). If None, syncs all forms.
            company_id: Optional company ID to sync. If None, syncs all companies.
            verbose: If True, print progress messages

        Returns:
            {
                'success': bool,
                'rows_synced': int,
                'new_clusters': int,
                'updated_clusters': int,
                'error': str (if failed)
            }
        """
        try:
            if verbose:
                print(f"\n{'='*80}")
                print(f"🔄 MASTER ROWS SYNC STARTED")
                print(f"{'='*80}")
                if form_no:
                    print(f"📋 Form: {form_no}")
                if company_id:
                    print(f"🏢 Company ID: {company_id}")
                print(f"{'='*80}\n")

            db = self.SessionLocal()

            try:
                # Get unique clusters from master_mapping
                clusters = self._get_clusters_to_sync(
                    db, form_no, company_id, verbose)

                if not clusters:
                    if verbose:
                        print("ℹ️  No clusters found to sync")
                    return {
                        'success': True,
                        'rows_synced': 0,
                        'new_clusters': 0,
                        'updated_clusters': 0
                    }

                # Sync each cluster
                new_count = 0
                updated_count = 0

                for cluster_label, master_name in clusters:
                    is_new = self._upsert_master_row(
                        db,
                        cluster_label,
                        master_name,
                        verbose=False
                    )

                    if is_new:
                        new_count += 1
                    else:
                        updated_count += 1

                db.commit()

                total_synced = new_count + updated_count

                if verbose:
                    print(f"\n{'='*80}")
                    print(f"✅ MASTER ROWS SYNC COMPLETED")
                    print(f"{'='*80}")
                    print(f"📊 Total clusters synced: {total_synced}")
                    print(f"🆕 New clusters: {new_count}")
                    print(f"🔄 Updated clusters: {updated_count}")
                    print(f"{'='*80}\n")

                return {
                    'success': True,
                    'rows_synced': total_synced,
                    'new_clusters': new_count,
                    'updated_clusters': updated_count
                }

            except Exception as e:
                db.rollback()
                raise e
            finally:
                db.close()

        except Exception as e:
            error_msg = f"Master rows sync failed: {str(e)}"
            if verbose:
                print(f"\n{'='*80}")
                print(f"❌ MASTER ROWS SYNC FAILED")
                print(f"❌ Error: {error_msg}")
                print(f"{'='*80}\n")

            return {
                'success': False,
                'error': error_msg
            }

    def _get_clusters_to_sync(
        self,
        db: Session,
        form_no: Optional[str],
        company_id: Optional[int],
        verbose: bool
    ) -> List[tuple]:
        """
        Get list of clusters to sync from master_mapping

        Returns:
            List of (cluster_label, master_name) tuples
        """
        query = db.query(
            self.MasterMapping.cluster_label,
            self.MasterMapping.master_name
        ).filter(
            self.MasterMapping.cluster_label.isnot(None)
        )

        # Apply filters if provided
        if form_no:
            query = query.filter(self.MasterMapping.form_no == form_no)

        if company_id:
            query = query.filter(self.MasterMapping.company_id == company_id)

        # Get distinct clusters
        clusters = query.distinct().all()

        if verbose:
            print(f"[Sync] Found {len(clusters)} unique clusters to sync")

        return clusters

    def _upsert_master_row(
        self,
        db: Session,
        cluster_label: int,
        master_name: str,
        verbose: bool = False
    ) -> bool:
        """
        Insert or update a master row entry

        Args:
            db: Database session
            cluster_label: Cluster label (unique identifier)
            master_name: Canonical master name for the cluster
            verbose: If True, print details

        Returns:
            True if new row was created, False if existing row was updated
        """
        # Check if row exists
        existing = db.query(self.MasterRow).filter_by(
            cluster_label=cluster_label
        ).first()

        if existing:
            # Update if master_name changed
            if existing.master_name != master_name:
                if verbose:
                    print(
                        f"[Sync] Updating cluster {cluster_label}: {existing.master_name} → {master_name}")
                existing.master_name = master_name
            return False
        else:
            # Create new entry
            if verbose:
                print(
                    f"[Sync] Creating new master row: cluster={cluster_label}, name={master_name}")

            new_row = self.MasterRow(
                cluster_label=cluster_label,
                master_name=master_name
            )
            db.add(new_row)
            return True

    def validate_sync(self, verbose: bool = True) -> Dict[str, any]:
        """
        Validate that master_rows is properly synced with master_mapping

        Checks:
        1. All clusters in master_mapping have entries in master_rows
        2. No orphaned entries in master_rows
        3. Master names match between tables

        Returns:
            {
                'success': bool,
                'total_clusters': int,
                'synced_clusters': int,
                'missing_clusters': List[int],
                'orphaned_clusters': List[int],
                'name_mismatches': List[Dict],
                'error': str (if failed)
            }
        """
        try:
            if verbose:
                print(f"\n{'='*80}")
                print(f"🔍 VALIDATING MASTER ROWS SYNC")
                print(f"{'='*80}\n")

            db = self.SessionLocal()

            try:
                # Get all clusters from master_mapping
                mapping_clusters = db.query(
                    self.MasterMapping.cluster_label,
                    self.MasterMapping.master_name
                ).filter(
                    self.MasterMapping.cluster_label.isnot(None)
                ).distinct().all()

                mapping_dict = {cl: mn for cl, mn in mapping_clusters}

                # Get all clusters from master_rows
                rows_clusters = db.query(
                    self.MasterRow.cluster_label,
                    self.MasterRow.master_name
                ).all()

                rows_dict = {cl: mn for cl, mn in rows_clusters}

                # Find discrepancies
                missing_clusters = [
                    cl for cl in mapping_dict.keys()
                    if cl not in rows_dict
                ]

                orphaned_clusters = [
                    cl for cl in rows_dict.keys()
                    if cl not in mapping_dict
                ]

                name_mismatches = [
                    {
                        'cluster_label': cl,
                        'mapping_name': mapping_dict[cl],
                        'rows_name': rows_dict[cl]
                    }
                    for cl in mapping_dict.keys()
                    if cl in rows_dict and mapping_dict[cl] != rows_dict[cl]
                ]

                is_valid = (
                    len(missing_clusters) == 0 and
                    len(orphaned_clusters) == 0 and
                    len(name_mismatches) == 0
                )

                if verbose:
                    print(
                        f"📊 Total clusters in master_mapping: {len(mapping_dict)}")
                    print(f"📊 Total clusters in master_rows: {len(rows_dict)}")

                    if is_valid:
                        print(
                            f"\n✅ VALIDATION PASSED - All clusters are properly synced!")
                    else:
                        print(f"\n⚠️  VALIDATION ISSUES FOUND:")

                        if missing_clusters:
                            print(
                                f"\n❌ Missing clusters in master_rows: {len(missing_clusters)}")
                            print(
                                f"   Clusters: {missing_clusters[:10]}{'...' if len(missing_clusters) > 10 else ''}")

                        if orphaned_clusters:
                            print(
                                f"\n⚠️  Orphaned clusters in master_rows: {len(orphaned_clusters)}")
                            print(
                                f"   Clusters: {orphaned_clusters[:10]}{'...' if len(orphaned_clusters) > 10 else ''}")

                        if name_mismatches:
                            print(
                                f"\n⚠️  Name mismatches: {len(name_mismatches)}")
                            for mm in name_mismatches[:5]:
                                print(f"   Cluster {mm['cluster_label']}:")
                                print(f"     Mapping: {mm['mapping_name']}")
                                print(f"     Rows: {mm['rows_name']}")

                    print(f"\n{'='*80}\n")

                return {
                    'success': is_valid,
                    'total_clusters': len(mapping_dict),
                    'synced_clusters': len(rows_dict),
                    'missing_clusters': missing_clusters,
                    'orphaned_clusters': orphaned_clusters,
                    'name_mismatches': name_mismatches
                }

            finally:
                db.close()

        except Exception as e:
            error_msg = f"Validation failed: {str(e)}"
            if verbose:
                print(f"❌ {error_msg}\n")

            return {
                'success': False,
                'error': error_msg
            }

    def get_master_row_by_cluster(
        self,
        cluster_label: int
    ) -> Optional[Dict[str, any]]:
        """
        Get master row by cluster label

        Args:
            cluster_label: Cluster label to look up

        Returns:
            {
                'master_row_id': int,
                'cluster_label': int,
                'master_name': str
            } or None if not found
        """
        db = self.SessionLocal()

        try:
            row = db.query(self.MasterRow).filter_by(
                cluster_label=cluster_label
            ).first()

            if row:
                return {
                    'master_row_id': row.master_row_id,
                    'cluster_label': row.cluster_label,
                    'master_name': row.master_name
                }

            return None

        finally:
            db.close()


# =================================================================
# STANDALONE USAGE
# =================================================================

if __name__ == "__main__":
    import sys

    service = MasterRowsSyncService()

    # Check command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()

        if command == "sync":
            # Sync all clusters
            result = service.sync_master_rows(verbose=True)
            sys.exit(0 if result['success'] else 1)

        elif command == "validate":
            # Validate sync
            result = service.validate_sync(verbose=True)
            sys.exit(0 if result['success'] else 1)

        elif command == "sync-form" and len(sys.argv) > 2:
            # Sync specific form
            form_no = sys.argv[2]
            result = service.sync_master_rows(form_no=form_no, verbose=True)
            sys.exit(0 if result['success'] else 1)

        else:
            print(f"Unknown command: {command}")
            print(f"\nUsage:")
            print(
                f"  python master_rows_sync_service.py sync          # Sync all clusters")
            print(f"  python master_rows_sync_service.py validate      # Validate sync")
            print(
                f"  python master_rows_sync_service.py sync-form L-2-A  # Sync specific form")
            sys.exit(1)

    else:
        # Default: sync and validate
        print("Running full sync and validation...\n")

        sync_result = service.sync_master_rows(verbose=True)

        if sync_result['success']:
            validate_result = service.validate_sync(verbose=True)
            sys.exit(0 if validate_result['success'] else 1)
        else:
            sys.exit(1)
