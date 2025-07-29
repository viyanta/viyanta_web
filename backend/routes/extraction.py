from fastapi import APIRouter, File, UploadFile, HTTPException
from .shared import extract_text_from_pdf, convert_to_parquet
import os

router = APIRouter()


@router.post("/extract-text-from-pdf")
async def api_extract_text_from_pdf(file: UploadFile = File(...)):
    """Extract text from an uploaded PDF file and return as JSON."""
    try:
        content = await file.read()
        import io
        pdf_file = io.BytesIO(content)
        text_data = extract_text_from_pdf(pdf_file)
        return {"success": True, "text_data": text_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/convert-to-parquet")
async def api_convert_to_parquet(file: UploadFile = File(...)):
    """Convert an uploaded file (csv, json, pdf) to Parquet and return info."""
    allowed_types = {
        "application/pdf": "pdf",
        "text/csv": "csv",
        "application/json": "json",
        "application/vnd.ms-excel": "csv",
        "text/plain": "csv"
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
            status_code=400, detail="Unsupported file type. Please upload PDF, JSON, or CSV files.")
    try:
        original_filename = file.filename
        file_extension = os.path.splitext(original_filename)[1]
        import uuid
        stored_filename = f"{uuid.uuid4()}{file_extension}"
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, stored_filename)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        parquet_path, parquet_filename, row_count = convert_to_parquet(
            file_path, file_type, original_filename)
        parquet_size = os.path.getsize(parquet_path)
        return {
            "success": True,
            "parquet_file": {
                "filename": parquet_filename,
                "size": parquet_size,
                "row_count": row_count
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Conversion failed: {str(e)}")
