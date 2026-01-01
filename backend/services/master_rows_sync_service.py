"""Master rows synchronization service.

This project keeps *variants* in `master_mapping` and a canonical lookup in
`master_rows` (keyed by `master_row_id`, with `cluster_label` unique).

`MasterRowsSyncService` ensures that for every (form_no, cluster_label) that
exists in `master_mapping`, a corresponding row exists in `master_rows`.

This class is imported by `master_row_mapping_pipeline.py`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from sqlalchemy import text

from databases.database import engine


@dataclass
class SyncResult:
    success: bool
    rows_synced: int = 0
    rows_inserted: int = 0
    rows_updated: int = 0
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "rows_synced": self.rows_synced,
            "rows_inserted": self.rows_inserted,
            "rows_updated": self.rows_updated,
            "error": self.error,
        }


class MasterRowsSyncService:
    """Sync canonical master rows from the per-form master_mapping table."""

    def __init__(self):
        self.engine = engine

    def _resolve_tables(self, form_no: str) -> tuple[str, str]:
        """Return (master_mapping_table, master_rows_table) for a form."""
        # Current DB design: L-3 has its own master tables.
        if str(form_no).strip().upper() == "L-3":
            return "master_mapping_l3", "master_rows_l3"
        return "master_mapping", "master_rows"

    def sync_master_rows(
        self,
        form_no: str,
        company_id: Optional[int] = None,
        verbose: bool = False,
    ) -> Dict[str, Any]:
        """Ensure `master_rows` contains rows for all clusters in master_mapping.

        Notes:
        - `master_rows` is global/canonical in schema (no form/company columns), so
          we only sync by `cluster_label`.
        - We still accept `form_no`/`company_id` to support callers and to scope
          source clusters from `master_mapping`.
        """

        try:
            master_mapping_table, master_rows_table = self._resolve_tables(
                form_no)

            params: Dict[str, Any] = {"form_no": form_no}
            company_filter_sql = ""
            if company_id is not None:
                company_filter_sql = "AND company_id = :company_id"
                params["company_id"] = int(company_id)

            source_sql = text(
                f"""
                SELECT cluster_label, MAX(master_name) AS master_name
                FROM {master_mapping_table}
                WHERE form_no = :form_no
                  AND cluster_label IS NOT NULL
                  {company_filter_sql}
                GROUP BY cluster_label
                """
            )

            with self.engine.begin() as conn:
                clusters = conn.execute(source_sql, params).fetchall()

                if not clusters:
                    if verbose:
                        print("   ⚠️ No master_mapping clusters found to sync")
                    return SyncResult(success=True, rows_synced=0).to_dict()

                inserted = 0
                updated = 0

                upsert_sql = text(
                    f"""
                    INSERT INTO {master_rows_table} (cluster_label, master_name)
                    VALUES (:cluster_label, :master_name)
                    ON DUPLICATE KEY UPDATE
                        master_name = VALUES(master_name)
                    """
                )

                exists_sql = text(
                    f"SELECT master_row_id FROM {master_rows_table} WHERE cluster_label = :cl LIMIT 1"
                )

                for row in clusters:
                    cluster_label = int(row[0])
                    master_name = row[1]

                    exists = conn.execute(
                        exists_sql, {"cl": cluster_label}).fetchone()

                    conn.execute(
                        upsert_sql,
                        {"cluster_label": cluster_label,
                            "master_name": master_name},
                    )

                    if exists:
                        updated += 1
                    else:
                        inserted += 1

                if verbose:
                    print(
                        f"   ✅ {master_rows_table} sync done. clusters={len(clusters)} inserted={inserted} updated={updated}"
                    )

                return SyncResult(
                    success=True,
                    rows_synced=len(clusters),
                    rows_inserted=inserted,
                    rows_updated=updated,
                ).to_dict()

        except Exception as e:
            if verbose:
                print(f"   ❌ master_rows sync failed: {e}")
            return SyncResult(success=False, error=str(e)).to_dict()
