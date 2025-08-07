from fastapi import APIRouter, UploadFile, File, HTTPException, status
from services.pdf_extraction_service import pdf_service
import os
import aiofiles
import traceback

router = APIRouter()

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/extract-document/")
async def process_document_upload(file: UploadFile = File(...)):
    """
    Accepts a PDF file upload, processes it, and returns a JSON object
    containing both a raw pipe-delimited extraction and a fully structured JSON.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF files are accepted."
        )

    temp_file_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        # Asynchronously save the uploaded file
        async with aiofiles.open(temp_file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        # Call the service to get the combined output
        result = pdf_service.process_pdf(temp_file_path)

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result)

        return result

    except Exception as e:
        print("--- AN UNEXPECTED ERROR OCCURRED ---")
        # This will print the full error stack trace
        print(traceback.format_exc())
        print("------------------------------------")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
