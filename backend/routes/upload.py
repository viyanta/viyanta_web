from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from .shared import extract_text_from_pdf, convert_to_parquet
from .database import add_file_record, update_file_status, get_file_by_id
import os
import uuid

router = APIRouter()
UPLOAD_DIR = "uploads"
CONVERTED_DIR = "converted"


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and convert file to Parquet format"""

    # Validate file type
    allowed_types = {
        "application/pdf": "pdf",
        "text/csv": "csv",
        "application/json": "json",
        "application/vnd.ms-excel": "csv",
        "text/plain": "csv"  # Sometimes CSV files are detected as text/plain
    }

    file_type = None
    if file.content_type in allowed_types:
        file_type = allowed_types[file.content_type]
    elif file.filename.lower().endswith('.csv'):
        file_type = "csv"
    elif file.filename.lower().endswith('.json'):
        file_type = "json"
    elif file.filename.lower().endswith('.pdf'):
        file_type = "pdf"

    if not file_type:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload PDF, JSON, or CSV files."
        )

    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        original_filename = file.filename
        file_extension = os.path.splitext(original_filename)[1]
        stored_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)

        # Save uploaded file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_size = len(content)

        # Add file record to database
        file_record = add_file_record(
            file_id=file_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_type=file_type,
            file_size=file_size,
            status="processing"
        )

        # Convert to Parquet
        try:
            parquet_path, parquet_filename, row_count = convert_to_parquet(
                file_path, file_type, original_filename
            )

            parquet_size = os.path.getsize(parquet_path)

            # Update file record with conversion results
            update_file_status(
                file_id=file_id,
                status="completed",
                parquet_filename=parquet_filename,
                parquet_size=parquet_size,
                row_count=row_count
            )

            return {
                "success": True,
                "message": "File uploaded and converted successfully",
                "file_id": file_id,
                "original_file": {
                    "filename": original_filename,
                    "size": file_size,
                    "type": file_type.upper()
                },
                "parquet_file": {
                    "filename": parquet_filename,
                    "size": parquet_size,
                    "row_count": row_count
                }
            }

        except Exception as e:
            # Update status to failed
            update_file_status(
                file_id=file_id, status="failed", error_message=str(e))
            raise HTTPException(
                status_code=500, detail=f"Conversion failed: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    pass


@router.get("/original/{file_id}")
async def serve_original_file(file_id: str):
    """Serve the original file exactly as it was uploaded"""
    try:
        # Get file record from database
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Construct the original file path
        original_filename = file_record['stored_filename']
        original_path = os.path.join(UPLOAD_DIR, original_filename)

        if not os.path.exists(original_path):
            raise HTTPException(
                status_code=404, detail="Original file not found on disk")

        # Get file extension to set proper media type
        file_extension = os.path.splitext(
            file_record['original_filename'])[1].lower()

        media_type_map = {
            '.pdf': 'application/pdf',
            '.json': 'application/json',
            '.csv': 'text/csv',
            '.txt': 'text/plain'
        }

        media_type = media_type_map.get(
            file_extension, 'application/octet-stream')

        # Return the file with appropriate headers for inline viewing
        headers = {
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }

        return FileResponse(
            path=original_path,
            media_type=media_type,
            headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to serve original file: {str(e)}")
