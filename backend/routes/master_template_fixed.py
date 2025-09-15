from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy", "message": "Template router is running"}


@router.get("/test-extraction/{form_no}")
async def test_extraction_endpoint(
    form_no: str,
    company: str = Query(...,
                         description="Company name (e.g., 'sbi', 'hdfc')"),
    filename: Optional[str] = Query(
        None, description="Specific PDF filename to use")
):
    """
    Test endpoint that returns properly formatted extraction data for frontend testing
    """
    return {
        "status": "success",
        "company": company.lower().strip(),
        "form_no": form_no.upper().strip(),
        "extraction_result": {
            "instances": [
                {
                    "Form": form_no.upper().strip(),
                    "Title": "REVENUE ACCOUNT FOR THE QUARTER ENDED Q1 FY2023",
                    "Period": "Q1 FY2023",
                    "PagesUsed": 2,
                    "Headers": [
                        "Particulars",
                        "Schedule",
                        "Unit_Linked_Life",
                        "Unit_Linked_Pension",
                        "Unit_Linked_Total",
                        "Participating_Life",
                        "Grand_Total"
                    ],
                    "Rows": [
                        {
                            "Particulars": "Premium Income",
                            "Schedule": "1",
                            "Unit_Linked_Life": "12,345",
                            "Unit_Linked_Pension": "6,789",
                            "Unit_Linked_Total": "19,134",
                            "Participating_Life": "8,567",
                            "Grand_Total": "27,701"
                        },
                        {
                            "Particulars": "Investment Income",
                            "Schedule": "2",
                            "Unit_Linked_Life": "5,432",
                            "Unit_Linked_Pension": "2,876",
                            "Unit_Linked_Total": "8,308",
                            "Participating_Life": "4,123",
                            "Grand_Total": "12,431"
                        },
                        {
                            "Particulars": "Total Income (A)",
                            "Schedule": "",
                            "Unit_Linked_Life": "18,764",
                            "Unit_Linked_Pension": "10,319",
                            "Unit_Linked_Total": "29,083",
                            "Participating_Life": "13,122",
                            "Grand_Total": "42,205"
                        }
                    ]
                }
            ]
        },
        "message": "Test extraction completed successfully",
        "output_path": f"/test/path/extraction_{form_no}_{company}.json"
    }


@router.get("/database-status")
async def get_database_status():
    """Get database status"""
    try:
        from databases.database import get_db
        from databases.models import ExtractedRawData, ExtractedRefinedData

        db = next(get_db())

        raw_count = db.query(ExtractedRawData).count()
        refined_count = db.query(ExtractedRefinedData).count()

        # Get latest records
        latest_raw = db.query(ExtractedRawData).order_by(
            ExtractedRawData.id.desc()).first()
        latest_refined = db.query(ExtractedRefinedData).order_by(
            ExtractedRefinedData.id.desc()).first()

        db.close()

        return {
            "status": "success",
            "database": {
                "connection": "active",
                "raw_data_count": raw_count,
                "refined_data_count": refined_count,
                "latest_raw": {
                    "id": latest_raw.id,
                    "company": latest_raw.company,
                    "form_no": latest_raw.form_no,
                    "uploaded_at": latest_raw.uploaded_at.isoformat()
                } if latest_raw else None,
                "latest_refined": {
                    "id": latest_refined.id,
                    "company": latest_refined.company,
                    "form_no": latest_refined.form_no,
                    "uploaded_at": latest_refined.uploaded_at.isoformat()
                } if latest_refined else None
            },
            "message": "Database status retrieved successfully"
        }

    except Exception as e:
        logger.error(f"Error checking database status: {e}")
        raise HTTPException(
            status_code=500, detail=f"Database status check failed: {str(e)}")
