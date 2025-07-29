from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from .database import get_file_by_id
import os

router = APIRouter()
UPLOAD_DIR = "uploads"
CONVERTED_DIR = "converted"


@router.get("/download/original/{file_id}")
async def download_original_file(file_id: str):
    """Download original uploaded file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = os.path.join(UPLOAD_DIR, file_record['stored_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail="File not found on disk")

        return FileResponse(
            path=file_path,
            filename=file_record['original_filename'],
            media_type='application/octet-stream'
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Download failed: {str(e)}")

    pass


@router.get("/download/parquet/{file_id}")
async def download_parquet_file(file_id: str):
    """Download converted Parquet file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record or not file_record.get('parquet_filename'):
            raise HTTPException(
                status_code=404, detail="Parquet file not found")

        file_path = os.path.join(
            CONVERTED_DIR, file_record['parquet_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail="Parquet file not found on disk")

        return FileResponse(
            path=file_path,
            filename=file_record['parquet_filename'],
            media_type='application/octet-stream'
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Download failed: {str(e)}")

    pass
