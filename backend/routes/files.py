from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import json
import os
import uuid
from datetime import datetime
from typing import List
import PyPDF2
import io
from .database import (
    add_file_record, 
    get_all_files, 
    update_file_status, 
    get_file_stats,
    get_file_by_id
)

router = APIRouter()

UPLOAD_DIR = "uploads"
CONVERTED_DIR = "converted"

# Create directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CONVERTED_DIR, exist_ok=True)

def extract_text_from_pdf(pdf_file):
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text_data = []
        
        for page_num, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            if text.strip():
                text_data.append({
                    "page": page_num + 1,
                    "content": text.strip()
                })
        
        return text_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing PDF: {str(e)}")

def convert_to_parquet(file_path: str, file_type: str, original_filename: str):
    """Convert different file types to Parquet format"""
    try:
        if file_type == "csv":
            # Read CSV file
            df = pd.read_csv(file_path)
        
        elif file_type == "json":
            # Read JSON file
            with open(file_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            
            # Handle different JSON structures
            if isinstance(json_data, list):
                df = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                # If it's a single object, wrap in list
                df = pd.DataFrame([json_data])
            else:
                raise ValueError("Unsupported JSON structure")
        
        elif file_type == "pdf":
            # Extract text from PDF and create DataFrame
            with open(file_path, 'rb') as f:
                text_data = extract_text_from_pdf(f)
            
            df = pd.DataFrame(text_data)
        
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        # Generate output filename
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}_{uuid.uuid4().hex[:8]}.parquet"
        output_path = os.path.join(CONVERTED_DIR, output_filename)
        
        # Save as Parquet
        df.to_parquet(output_path, index=False)
        
        return output_path, output_filename, len(df)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting file: {str(e)}")

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
            update_file_status(file_id=file_id, status="failed", error_message=str(e))
            raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Error retrieving files: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")

@router.get("/download/original/{file_id}")
async def download_original_file(file_id: str):
    """Download original uploaded file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = os.path.join(UPLOAD_DIR, file_record['stored_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        return FileResponse(
            path=file_path,
            filename=file_record['original_filename'],
            media_type='application/octet-stream'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.get("/download/parquet/{file_id}")
async def download_parquet_file(file_id: str):
    """Download converted Parquet file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record or not file_record.get('parquet_filename'):
            raise HTTPException(status_code=404, detail="Parquet file not found")
        
        file_path = os.path.join(CONVERTED_DIR, file_record['parquet_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Parquet file not found on disk")
        
        return FileResponse(
            path=file_path,
            filename=file_record['parquet_filename'],
            media_type='application/octet-stream'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.get("/preview/{file_id}")
async def preview_file_data(file_id: str):
    """Preview file data (first few rows)"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        if file_record['status'] != 'completed':
            raise HTTPException(status_code=400, detail="File not processed yet")
        
        parquet_path = os.path.join(CONVERTED_DIR, file_record['parquet_filename'])
        if not os.path.exists(parquet_path):
            raise HTTPException(status_code=404, detail="Processed file not found")
        
        # Read parquet file and return preview
        df = pd.read_parquet(parquet_path)
        preview_data = df.head(10).to_dict('records')  # First 10 rows
        
        return {
            "success": True,
            "preview": preview_data,
            "total_rows": len(df),
            "columns": list(df.columns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")
