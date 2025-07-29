from fastapi import APIRouter, HTTPException
from .database import get_all_files, get_file_stats

router = APIRouter()


@router.get("/files")
async def get_files():
    """Get list of all uploaded files"""
    try:
        files = get_all_files()
        return {
            "success": True,
            "files": files
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving files: {str(e)}")

    pass


@router.get("/stats")
async def get_statistics():
    """Get file upload and processing statistics"""
    try:
        stats = get_file_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving stats: {str(e)}")

    pass
