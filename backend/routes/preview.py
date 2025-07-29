from fastapi import APIRouter, HTTPException
from .database import get_file_by_id
import os
import pandas as pd
from .shared import extract_text_from_pdf

router = APIRouter()
UPLOAD_DIR = "uploads"
CONVERTED_DIR = "converted"


@router.get("/preview/{file_id}")
async def preview_parquet_data(file_id: str, full: bool = False):
    """Preview parquet file data (first few rows or full data)"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        if file_record['status'] != 'completed':
            raise HTTPException(
                status_code=400, detail="File not processed yet")

        parquet_path = os.path.join(
            CONVERTED_DIR, file_record['parquet_filename'])
        if not os.path.exists(parquet_path):
            raise HTTPException(
                status_code=404, detail="Processed file not found")

        # Read parquet file and return preview or full data
        df = pd.read_parquet(parquet_path)

        if full:
            preview_data = df.to_dict('records')  # All rows
        else:
            preview_data = df.head(20).to_dict('records')  # First 20 rows

        return {
            "success": True,
            "preview": preview_data,
            "total_rows": len(df),
            "columns": list(df.columns),
            "file_type": "parquet",
            "is_full_data": full
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Preview failed: {str(e)}")

    pass


@router.get("/preview/original/{file_id}")
async def preview_original_data(file_id: str, full: bool = False):
    """Preview original file data (first few rows or full data)"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        original_path = os.path.join(
            UPLOAD_DIR, file_record['stored_filename'])
        if not os.path.exists(original_path):
            raise HTTPException(
                status_code=404, detail="Original file not found")

        file_type = file_record['file_type']

        # Read original file based on type
        if file_type == "csv":
            df = pd.read_csv(original_path)
        elif file_type == "json":
            with open(original_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)

            if isinstance(json_data, list):
                df = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                df = pd.DataFrame([json_data])
            else:
                raise ValueError("Unsupported JSON structure")
        elif file_type == "pdf":
            with open(original_path, 'rb') as f:
                text_data = extract_text_from_pdf(f)
            df = pd.DataFrame(text_data)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        if full:
            preview_data = df.to_dict('records')  # All rows
        else:
            preview_data = df.head(20).to_dict('records')  # First 20 rows

        return {
            "success": True,
            "preview": preview_data,
            "total_rows": len(df),
            "columns": list(df.columns),
            "file_type": file_type,
            "is_full_data": full
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Preview failed: {str(e)}")

    pass
