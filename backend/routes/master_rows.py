"""
API Routes for Master Rows Management
Allows manual editing and consolidation of master row mappings
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from databases.database import get_db
from pydantic import BaseModel
from typing import List, Optional
import logging

router = APIRouter(prefix="/api/master-rows", tags=["Master Rows"])
logger = logging.getLogger(__name__)


class MasterRowDetail(BaseModel):
    """Master row with mapping details"""
    master_row_id: int
    cluster_label: int
    master_name: str
    normalized_text: str
    variant_count: int
    company_count: int
    form_no: str


# REMOVED: MasterRowUpdate - Only used by removed /merge endpoint
# REMOVED: MasterRowSearchResult - Only used by removed /search-by-normalized-text endpoint


class ExtractedRowDetail(BaseModel):
    """Details of an extracted row"""
    id: int
    report_id: int
    company_id: int
    company_name: Optional[str]
    row_index: Optional[int]
    particulars: str
    normalized_text: Optional[str]
    master_row_id: Optional[int]
    schedule: Optional[str]
    for_current_period: Optional[str]
    upto_current_period: Optional[str]
    for_previous_period: Optional[str]
    upto_previous_period: Optional[str]
    form_no: Optional[str]
    pdf_name: Optional[str]
    period: Optional[str]


class MasterRowMergePreview(BaseModel):
    """Preview data before merging master rows"""
    source: dict
    target: dict
    affected_rows: dict
    final_normalized_text: str
    final_master_row_id: int


class UpdateExtractedRowRequest(BaseModel):
    """Request to update an extracted row's mapping"""
    extracted_row_id: int
    new_master_row_id: Optional[int] = None
    new_normalized_text: Optional[str] = None


class UpdateMasterRowTextRequest(BaseModel):
    """Request to update master row's normalized text"""
    master_row_id: int
    normalized_text: str


@router.get("/list", response_model=List[MasterRowDetail])
async def list_master_rows(
    form_no: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all master rows with their mapping details

    Args:
        form_no: Filter by form number (e.g., 'L-2-A')
        search: Search in master_name or normalized_text
    """
    try:
        query = text("""
            SELECT 
                mr.master_row_id,
                mr.cluster_label,
                mr.master_name,
                COALESCE(mm.normalized_text, 'N/A') as normalized_text,
                COUNT(DISTINCT mm.id) as variant_count,
                COUNT(DISTINCT mm.company_id) as company_count,
                COALESCE(mm.form_no, 'N/A') as form_no
            FROM master_rows mr
            LEFT JOIN master_mapping mm ON mr.cluster_label = mm.cluster_label
            WHERE 1=1
                AND (:form_no IS NULL OR mm.form_no = :form_no)
                AND (
                    :search IS NULL 
                    OR mr.master_name LIKE :search_pattern
                    OR mm.normalized_text LIKE :search_pattern
                )
            GROUP BY mr.master_row_id, mr.cluster_label, mr.master_name, mm.normalized_text, mm.form_no
            ORDER BY mr.cluster_label
        """)

        search_pattern = f"%{search}%" if search else None
        result = db.execute(query, {
            "form_no": form_no,
            "search": search,
            "search_pattern": search_pattern
        })

        rows = []
        for row in result:
            rows.append(MasterRowDetail(
                master_row_id=row[0],
                cluster_label=row[1],
                master_name=row[2],
                normalized_text=row[3],
                variant_count=row[4],
                company_count=row[5],
                form_no=row[6]
            ))

        return rows

    except Exception as e:
        logger.error(f"Error listing master rows: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# REMOVED: @router.get("/search-by-normalized-text") - Unused endpoint
# REMOVED: @router.post("/merge") - Replaced by /merge-preview + /merge-confirmed workflow


@router.get("/details/{master_row_id}")
async def get_master_row_details(
    master_row_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a master row including all its mappings and variants
    """
    try:
        # Get master row info
        master_query = text("""
            SELECT master_row_id, cluster_label, master_name
            FROM master_rows
            WHERE master_row_id = :master_row_id
        """)
        master_result = db.execute(
            master_query, {"master_row_id": master_row_id}).fetchone()

        if not master_result:
            raise HTTPException(status_code=404, detail="Master row not found")

        # Get all mapping variants
        mapping_query = text("""
            SELECT 
                id,
                master_name,
                variant_text,
                normalized_text,
                company_id,
                form_no,
                similarity_score
            FROM master_mapping
            WHERE cluster_label = :cluster_label
            ORDER BY company_id, id
        """)
        mapping_result = db.execute(
            mapping_query, {"cluster_label": master_result[1]}).fetchall()

        # Get count of extracted rows using this master
        count_query = text("""
            SELECT COUNT(*) as count
            FROM reports_l2_extracted
            WHERE master_row_id = :master_row_id
        """)
        count_result = db.execute(
            count_query, {"master_row_id": master_row_id}).fetchone()

        return {
            "master_row": {
                "master_row_id": master_result[0],
                "cluster_label": master_result[1],
                "master_name": master_result[2]
            },
            "mappings": [
                {
                    "id": row[0],
                    "master_name": row[1],
                    "variant_text": row[2],
                    "normalized_text": row[3],
                    "company_id": row[4],
                    "form_no": row[5],
                    "similarity_score": row[6]
                }
                for row in mapping_result
            ],
            "extracted_rows_count": count_result[0],
            "total_variants": len(mapping_result)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting master row details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/extracted-rows/{master_row_id}")
async def get_extracted_rows_for_master(
    master_row_id: int,
    include_unmapped: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all extracted rows mapped to a master row, with report details

    Args:
        master_row_id: The master row ID to get extracted rows for
        include_unmapped: If True, also return rows with no master_row_id mapping
    """
    try:
        # First check if master row exists
        master_check = text("""
            SELECT master_row_id, cluster_label, master_name
            FROM master_rows
            WHERE master_row_id = :master_row_id
        """)
        master_result = db.execute(
            master_check, {"master_row_id": master_row_id}).fetchone()

        if not master_result:
            raise HTTPException(status_code=404, detail="Master row not found")

        # Get all extracted rows for this master
        if include_unmapped:
            query = text("""
                SELECT 
                    e.id,
                    e.report_id,
                    e.company_id,
                    c.name as company_name,
                    e.row_index,
                    e.particulars,
                    e.normalized_text,
                    e.master_row_id,
                    e.schedule,
                    e.for_current_period,
                    e.upto_current_period,
                    e.for_previous_period,
                    e.upto_previous_period,
                    mm.form_no,
                    'N/A' as pdf_name,
                    'N/A' as period
                FROM reports_l2_extracted e
                LEFT JOIN company c ON e.company_id = c.id
                LEFT JOIN master_mapping mm ON e.master_row_id = mm.cluster_label
                WHERE e.master_row_id = :master_row_id OR e.master_row_id IS NULL
                ORDER BY e.company_id, e.row_index
            """)
        else:
            query = text("""
                SELECT 
                    e.id,
                    e.report_id,
                    e.company_id,
                    c.name as company_name,
                    e.row_index,
                    e.particulars,
                    e.normalized_text,
                    e.master_row_id,
                    e.schedule,
                    e.for_current_period,
                    e.upto_current_period,
                    e.for_previous_period,
                    e.upto_previous_period,
                    mm.form_no,
                    'N/A' as pdf_name,
                    'N/A' as period
                FROM reports_l2_extracted e
                LEFT JOIN company c ON e.company_id = c.id
                LEFT JOIN master_mapping mm ON e.master_row_id = mm.cluster_label
                WHERE e.master_row_id = :master_row_id
                ORDER BY e.company_id, e.row_index
            """)

        result = db.execute(query, {"master_row_id": master_row_id})

        rows = []
        for row in result:
            rows.append(ExtractedRowDetail(
                id=row[0],
                report_id=row[1],
                company_id=row[2],
                company_name=row[3],
                row_index=row[4],
                particulars=row[5],
                normalized_text=row[6],
                master_row_id=row[7],
                schedule=row[8],
                for_current_period=row[9],
                upto_current_period=row[10],
                for_previous_period=row[11],
                upto_previous_period=row[12],
                form_no=row[13],
                pdf_name=row[14],
                period=row[15]
            ))

        return {
            "master_row": {
                "master_row_id": master_result[0],
                "cluster_label": master_result[1],
                "master_name": master_result[2]
            },
            "extracted_rows": rows,
            "total_count": len(rows)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting extracted rows: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report-pdf-info/{report_id}")
async def get_report_pdf_info(
    report_id: int,
    db: Session = Depends(get_db)
):
    """
    Get PDF information for a report (for preview/verification)
    Searches across all company report tables to find the report
    """
    try:
        # List of all possible report tables (from models.py)
        company_tables = [
            "acko_life", "aditya_birla_sun_life", "ageas_federal_life",
            "aviva_life", "axis_max_life", "bajaj_allianz_life",
            "bandhan_life", "bharti_axa_life", "canara_hsbc_life",
            "creditaccess_life", "edelweiss_tokio_life", "future_generali_india_life",
            "go_digit_life", "hdfc_life", "icici_prudential_life",
            "indiafirst_life", "kotak_life", "lic_of_india_life",
            "pnb_metlife_life", "pramerica_life", "reliance_nippon_life",
            "sbi_life", "shriram_life", "starunion_daichi_life", "tata_aig_life"
        ]

        # Search across all tables
        for table in company_tables:
            try:
                query = text(f"""
                    SELECT 
                        id,
                        company,
                        company_id,
                        form_no,
                        pdf_name,
                        source_pdf,
                        period,
                        title
                    FROM reports_{table}
                    WHERE id = :report_id
                """)
                result = db.execute(query, {"report_id": report_id}).fetchone()

                if result:
                    return {
                        "report_id": result[0],
                        "company": result[1],
                        "company_id": result[2],
                        "form_no": result[3],
                        "pdf_name": result[4],
                        "source_pdf": result[5],
                        "period": result[6],
                        "title": result[7],
                        "table_name": f"reports_{table}"
                    }
            except Exception as e:
                # Skip tables that don't exist or have errors
                continue

        raise HTTPException(
            status_code=404, detail="Report not found in any company table")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting report PDF info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merge-preview")
async def preview_merge_master_rows(
    source_master_row_id: int = Query(...,
                                      description="The master row to be merged/removed"),
    target_master_row_id: int = Query(...,
                                      description="The master row to keep"),
    keep_source_text: bool = Query(
        False, description="Whether to keep source normalized text"),
    db: Session = Depends(get_db)
):
    """
    Preview what will happen when merging two master rows
    Shows all affected data before committing the merge

    Args:
        source_master_row_id: The master row to be merged/removed
        target_master_row_id: The master row to merge into
        keep_source_text: If True, use source's normalized_text; else use target's
    """
    try:
        # Get source and target details with normalized_text
        query = text("""
            SELECT 
                mr.master_row_id,
                mr.cluster_label,
                mr.master_name,
                mm.normalized_text
            FROM master_rows mr
            LEFT JOIN master_mapping mm ON mr.cluster_label = mm.cluster_label
            WHERE mr.master_row_id IN (:source_id, :target_id)
            GROUP BY mr.master_row_id, mr.cluster_label, mr.master_name
        """)

        result = db.execute(query, {
            "source_id": source_master_row_id,
            "target_id": target_master_row_id
        }).fetchall()

        if len(result) < 2:
            raise HTTPException(
                status_code=404,
                detail="Source or target master_row_id not found"
            )

        source_row = next(r for r in result if r[0] == source_master_row_id)
        target_row = next(r for r in result if r[0] == target_master_row_id)

        # Count affected rows
        mapping_count = db.execute(text("""
            SELECT COUNT(*) FROM master_mapping
            WHERE cluster_label = :cluster_label
        """), {"cluster_label": source_row[1]}).fetchone()[0]

        extracted_count = db.execute(text("""
            SELECT COUNT(*) FROM reports_l2_extracted
            WHERE master_row_id = :master_row_id
        """), {"master_row_id": source_master_row_id}).fetchone()[0]

        # Determine final normalized text
        final_text = source_row[3] if keep_source_text else target_row[3]

        return {
            "source": {
                "master_row_id": source_row[0],
                "cluster_label": source_row[1],
                "master_name": source_row[2],
                "normalized_text": source_row[3]
            },
            "target": {
                "master_row_id": target_row[0],
                "cluster_label": target_row[1],
                "master_name": target_row[2],
                "normalized_text": target_row[3]
            },
            "affected_rows": {
                "master_mapping": mapping_count,
                "reports_l2_extracted": extracted_count
            },
            "final_master_row_id": target_master_row_id,
            "final_normalized_text": final_text,
            "action_summary": f"Will merge {mapping_count} mapping(s) and {extracted_count} extracted row(s) from master_row_id {source_master_row_id} into {target_master_row_id}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing merge: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merge-confirmed")
async def merge_master_rows_confirmed(
    source_master_row_id: int = Query(...,
                                      description="The master row to be merged/removed"),
    target_master_row_id: int = Query(...,
                                      description="The master row to keep"),
    final_normalized_text: str = Query(...,
                                       description="The final normalized text to use"),
    db: Session = Depends(get_db)
):
    """
    Execute merge after user confirmation
    User has explicitly chosen which ID to keep and what the final normalized_text should be

    Args:
        source_master_row_id: The master row to be merged/removed
        target_master_row_id: The master row to keep (user's explicit choice)
        final_normalized_text: The final normalized text to use (user's explicit choice)
    """
    try:
        # Get source and target details
        query = text("""
            SELECT master_row_id, cluster_label, master_name
            FROM master_rows
            WHERE master_row_id IN (:source_id, :target_id)
        """)

        result = db.execute(query, {
            "source_id": source_master_row_id,
            "target_id": target_master_row_id
        }).fetchall()

        if len(result) != 2:
            raise HTTPException(
                status_code=404,
                detail="Source or target master_row_id not found"
            )

        source_row = next(r for r in result if r[0] == source_master_row_id)
        target_row = next(r for r in result if r[0] == target_master_row_id)

        source_cluster = source_row[1]
        target_cluster = target_row[1]

        logger.info(f"MERGE CONFIRMED: master_row_id={source_master_row_id} (cluster={source_cluster}) "
                    f"→ master_row_id={target_master_row_id} (cluster={target_cluster}), "
                    f"final_text='{final_normalized_text}'")

        # Step 1: Update normalized_text for BOTH clusters to ensure consistency
        update_norm_query = text("""
            UPDATE master_mapping
            SET normalized_text = :final_text
            WHERE cluster_label IN (:source_cluster, :target_cluster)
        """)
        result = db.execute(update_norm_query, {
            "final_text": final_normalized_text,
            "source_cluster": source_cluster,
            "target_cluster": target_cluster
        })
        logger.info(
            f"Updated {result.rowcount} master_mapping normalized_texts")

        # Step 2: Move all source cluster mappings to target cluster
        update_mapping_query = text("""
            UPDATE master_mapping
            SET cluster_label = :target_cluster
            WHERE cluster_label = :source_cluster
        """)
        result = db.execute(update_mapping_query, {
            "target_cluster": target_cluster,
            "source_cluster": source_cluster
        })
        mapping_updated = result.rowcount
        logger.info(f"Moved {mapping_updated} master_mapping rows")

        # Step 3: Update all extracted rows to point to target master_row_id
        update_extracted_query = text("""
            UPDATE reports_l2_extracted
            SET master_row_id = :target_master_row_id
            WHERE master_row_id = :source_master_row_id
        """)
        result = db.execute(update_extracted_query, {
            "target_master_row_id": target_master_row_id,
            "source_master_row_id": source_master_row_id
        })
        extracted_updated = result.rowcount
        logger.info(f"Updated {extracted_updated} reports_l2_extracted rows")

        # Step 4: Delete the source master_row (now unused)
        delete_master_query = text("""
            DELETE FROM master_rows
            WHERE master_row_id = :source_master_row_id
        """)
        db.execute(delete_master_query, {
            "source_master_row_id": source_master_row_id
        })
        logger.info(f"Deleted master_row_id={source_master_row_id}")

        # Commit all changes
        db.commit()

        return {
            "success": True,
            "message": f"Successfully merged master_row_id {source_master_row_id} into {target_master_row_id}",
            "details": {
                "kept_master_row_id": target_master_row_id,
                "removed_master_row_id": source_master_row_id,
                "final_normalized_text": final_normalized_text,
                "updated": {
                    "master_mapping_rows": mapping_updated,
                    "extracted_rows": extracted_updated
                }
            }
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error executing confirmed merge: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update-extracted-row")
async def update_extracted_row_mapping(
    request: UpdateExtractedRowRequest,
    db: Session = Depends(get_db)
):
    """
    Update an extracted row's master mapping or normalized text
    Allows user to manually remap individual rows
    """
    try:
        # Check if extracted row exists
        check_query = text("""
            SELECT id, master_row_id, normalized_text
            FROM reports_l2_extracted
            WHERE id = :id
        """)
        existing = db.execute(
            check_query, {"id": request.extracted_row_id}).fetchone()

        if not existing:
            raise HTTPException(
                status_code=404, detail="Extracted row not found")

        updates = []
        params = {"id": request.extracted_row_id}

        if request.new_master_row_id is not None:
            # Verify new master exists
            master_check = db.execute(text("""
                SELECT master_row_id FROM master_rows WHERE master_row_id = :id
            """), {"id": request.new_master_row_id}).fetchone()

            if not master_check:
                raise HTTPException(
                    status_code=404, detail="New master_row_id not found")

            updates.append("master_row_id = :new_master_row_id")
            params["new_master_row_id"] = request.new_master_row_id

        if request.new_normalized_text is not None:
            updates.append("normalized_text = :new_normalized_text")
            params["new_normalized_text"] = request.new_normalized_text

        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")

        update_query = text(f"""
            UPDATE reports_l2_extracted
            SET {", ".join(updates)}
            WHERE id = :id
        """)

        db.execute(update_query, params)
        db.commit()

        logger.info(
            f"Updated extracted row {request.extracted_row_id}: {updates}")

        return {
            "success": True,
            "message": "Extracted row updated successfully",
            "updated_fields": updates
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating extracted row: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update-master-normalized-text")
async def update_master_normalized_text(
    request: UpdateMasterRowTextRequest,
    db: Session = Depends(get_db)
):
    """
    Update the normalized text for all mappings of a master row
    This updates ALL master_mapping entries with the given cluster_label
    """
    try:
        # Get master row and cluster
        master_query = text("""
            SELECT master_row_id, cluster_label, master_name
            FROM master_rows
            WHERE master_row_id = :master_row_id
        """)
        master = db.execute(
            master_query, {"master_row_id": request.master_row_id}).fetchone()

        if not master:
            raise HTTPException(status_code=404, detail="Master row not found")

        # Update all mappings for this cluster
        update_query = text("""
            UPDATE master_mapping
            SET normalized_text = :normalized_text
            WHERE cluster_label = :cluster_label
        """)

        result = db.execute(update_query, {
            "normalized_text": request.normalized_text,
            "cluster_label": master[1]
        })

        db.commit()

        logger.info(f"Updated normalized_text for master_row_id={request.master_row_id} "
                    f"(cluster={master[1]}), affected {result.rowcount} mappings")

        return {
            "success": True,
            "message": f"Updated normalized text for master_row_id {request.master_row_id}",
            "updated_mappings": result.rowcount,
            "new_normalized_text": request.normalized_text
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating master normalized text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unmapped-rows")
async def get_unmapped_extracted_rows(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all extracted rows that are not mapped to any master row
    Useful for finding rows that need manual mapping
    """
    try:
        query = text("""
            SELECT 
                e.id,
                e.report_id,
                e.company_id,
                c.name as company_name,
                e.row_index,
                e.particulars,
                e.normalized_text,
                e.schedule
            FROM reports_l2_extracted e
            LEFT JOIN company c ON e.company_id = c.id
            WHERE e.master_row_id IS NULL
            ORDER BY e.company_id, e.report_id, e.row_index
            LIMIT :limit OFFSET :offset
        """)

        result = db.execute(query, {"limit": limit, "offset": offset})

        # Count total unmapped
        count_query = text("""
            SELECT COUNT(*) FROM reports_l2_extracted WHERE master_row_id IS NULL
        """)
        total = db.execute(count_query).fetchone()[0]

        rows = []
        for row in result:
            rows.append({
                "id": row[0],
                "report_id": row[1],
                "company_id": row[2],
                "company_name": row[3],
                "row_index": row[4],
                "particulars": row[5],
                "normalized_text": row[6],
                "schedule": row[7]
            })

        return {
            "unmapped_rows": rows,
            "total_unmapped": total,
            "showing": len(rows),
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error getting unmapped rows: {e}")
        raise HTTPException(status_code=500, detail=str(e))
