# Shared utility functions for file routes
import PyPDF2
import pandas as pd
import json
import os
from fastapi import HTTPException


def extract_text_from_pdf(pdf_file):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text_data = []
        for page_num, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            if text.strip():
                text_data.append(
                    {"page": page_num + 1, "content": text.strip()})
        return text_data
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error processing PDF: {str(e)}")


def convert_to_parquet(file_path: str, file_type: str, original_filename: str):
    try:
        if file_type == "csv":
            df = pd.read_csv(file_path)
        elif file_type == "json":
            with open(file_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            if isinstance(json_data, list):
                df = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                df = pd.DataFrame([json_data])
            else:
                raise ValueError("Unsupported JSON structure")
        elif file_type == "pdf":
            with open(file_path, 'rb') as f:
                text_data = extract_text_from_pdf(f)
            df = pd.DataFrame(text_data)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}_{{os.urandom(4).hex()}}.parquet"
        output_path = os.path.join("converted", output_filename)
        df.to_parquet(output_path, index=False)
        return output_path, output_filename, len(df)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error converting file: {str(e)}")
