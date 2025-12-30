from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from .database import get_file_by_id, get_file_stats, get_all_files
import os

router = APIRouter()
UPLOAD_DIR = "uploads"
CONVERTED_DIR = "converted"


def get_parquet_file_path(parquet_filename: str) -> str:
    """Get the full path to a parquet file, checking both converted and extracted directories"""
    # Check converted directory first
    converted_path = os.path.join(CONVERTED_DIR, parquet_filename)
    if os.path.exists(converted_path):
        return converted_path

    # Check extracted directory as fallback
    extracted_path = os.path.join("extracted", parquet_filename)
    if os.path.exists(extracted_path):
        return extracted_path

    # Return the converted path as default (even if it doesn't exist)
    return converted_path


@router.get("/view/original/{file_id}")
def view_original_file(file_id: str):
    """View original uploaded file inline (for PDF viewer)"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = os.path.join(UPLOAD_DIR, file_record['stored_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail="File not found on disk")

        # Determine the correct media type based on file extension
        original_filename = file_record['original_filename']
        file_extension = original_filename.split(
            '.')[-1].lower() if '.' in original_filename else ''

        media_type_map = {
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'json': 'application/json',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword'
        }

        media_type = media_type_map.get(
            file_extension, 'application/octet-stream')

        # For PDFs, add headers to allow inline viewing
        headers = {}
        if file_extension == 'pdf':
            headers['Content-Disposition'] = 'inline'
            headers['X-Content-Type-Options'] = 'nosniff'

        return FileResponse(
            path=file_path,
            filename=original_filename,
            media_type=media_type,
            headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"View failed: {str(e)}")


@router.get("/download/original/{file_id}")
def download_original_file(file_id: str):
    """Download original uploaded file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = os.path.join(UPLOAD_DIR, file_record['stored_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail="File not found on disk")

        # Determine the correct media type based on file extension
        original_filename = file_record['original_filename']
        file_extension = original_filename.split(
            '.')[-1].lower() if '.' in original_filename else ''

        media_type_map = {
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'json': 'application/json',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword'
        }

        media_type = media_type_map.get(
            file_extension, 'application/octet-stream')

        return FileResponse(
            path=file_path,
            filename=original_filename,
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Download failed: {str(e)}")

    pass


@router.get("/download/parquet/{file_id}")
def download_parquet_file(file_id: str):
    """Download converted Parquet file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record or not file_record.get('parquet_filename'):
            raise HTTPException(
                status_code=404, detail="Parquet file not found")

        # Get parquet file path (checks both converted and extracted directories)
        file_path = get_parquet_file_path(file_record['parquet_filename'])
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


@router.get("/stats")
def get_stats():
    """Get file processing statistics"""
    try:
        stats = get_file_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/files")
def get_files():
    """Get all files list"""
    try:
        files = get_all_files()
        return {"success": True, "files": files}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch files: {str(e)}")
