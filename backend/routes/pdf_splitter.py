from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from typing import List, Dict
import os
import json
from pathlib import Path
from services.pdf_splitter import PDFSplitterService

router = APIRouter(tags=["PDF Splitter"])

# Initialize the PDF splitter service
pdf_splitter = PDFSplitterService()


@router.post("/upload-and-split")
async def upload_and_split_pdf(
    company_name: str = Form(...),
    user_id: str = Form(...),
    pdf_file: UploadFile = File(...)
):
    """
    Upload a PDF and split it according to index extraction
    """
    try:
        # Validate file type
        if not pdf_file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, detail="Only PDF files are allowed")

        result = pdf_splitter.upload_and_split_pdf(
            company_name, pdf_file, user_id)

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])

        return {
            "success": True,
            "message": f"PDF uploaded and split into {result['total_splits']} files",
            "data": {
                "upload_id": result["upload_id"],
                "company_name": result["company_name"],
                "pdf_name": result["pdf_name"],
                "total_splits": result["total_splits"]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/companies/{company_name}/pdfs")
async def get_company_pdfs(company_name: str):
    """
    Get all PDFs for a specific company
    """
    try:
        pdfs = pdf_splitter.get_company_pdfs(company_name)
        return {
            "success": True,
            "company_name": company_name,
            "pdfs": pdfs
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get PDFs: {str(e)}")


@router.get("/companies/{company_name}/pdfs/{pdf_name}/splits")
async def get_pdf_splits(company_name: str, pdf_name: str):
    """
    Get all split files for a specific PDF
    """
    try:
        splits = pdf_splitter.get_pdf_splits(company_name, pdf_name)
        return {
            "success": True,
            "company_name": company_name,
            "pdf_name": pdf_name,
            "splits": splits,
            "total_splits": len(splits)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get splits: {str(e)}")


@router.get("/companies/{company_name}/pdfs/{pdf_name}/splits/{split_filename}/download")
async def download_split_file(company_name: str, pdf_name: str, split_filename: str):
    """
    Download a specific split file
    """
    try:
        file_path = pdf_splitter.get_split_file_path(
            company_name, pdf_name, split_filename)

        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Split file not found")

        return FileResponse(
            path=file_path,
            filename=split_filename,
            media_type='application/pdf'
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/companies")
async def get_available_companies():
    """
    Get list of all companies that have PDFs
    """
    try:
        companies = []
        splits_dir = Path("pdf_splits")

        if splits_dir.exists():
            for company_folder in splits_dir.iterdir():
                if company_folder.is_dir():
                    # Convert folder name back to display name
                    company_name = company_folder.name.replace(
                        "_", " ").title()

                    # Count PDFs in this company folder
                    pdf_count = len(
                        [f for f in company_folder.iterdir() if f.is_dir()])

                    if pdf_count > 0:
                        companies.append({
                            "name": company_name,
                            "folder_name": company_folder.name,
                            "pdf_count": pdf_count
                        })

        return {
            "success": True,
            "companies": companies
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get companies: {str(e)}")


@router.delete("/companies/{company_name}/pdfs/{pdf_name}")
async def delete_pdf_and_splits(company_name: str, pdf_name: str):
    """
    Delete a PDF and all its splits
    """
    try:
        import shutil

        # Delete splits folder
        splits_folder = Path("pdf_splits") / \
            company_name.lower().replace(" ", "_") / pdf_name
        if splits_folder.exists():
            shutil.rmtree(splits_folder)

        # Delete original PDF
        uploads_folder = Path("uploads") / \
            company_name.lower().replace(" ", "_")
        for pdf_file in uploads_folder.glob(f"{pdf_name}.*"):
            if pdf_file.is_file():
                pdf_file.unlink()

        return {
            "success": True,
            "message": f"PDF '{pdf_name}' and all splits deleted successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
