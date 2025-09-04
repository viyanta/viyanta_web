from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.upload import router as upload_router
from routes.download import router as download_router
from routes.preview import router as preview_router
from routes.stats import router as stats_router
from routes.dropdown import router as dropdown_router
from routes.report import router as report_router
from routes.company_lforms import router as company_lforms_router
from routes.extraction import router as extract_router
from routes.folder_uploader import router as folder_uploader_router
from routes.master_template import router as template_router
from databases.database import Base, engine
from routes import company

# from routes.pdf_upload import router as pdf_upload_router
import os

app = FastAPI(title="Viyanta File Processing API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create tables
Base.metadata.create_all(bind=engine)

# Initialize database with default companies


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        from init_db import init_database
        init_database()
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")

# Include routers
app.include_router(upload_router, prefix="/api/files", tags=["upload"])
app.include_router(download_router, prefix="/api/files", tags=["download"])
app.include_router(preview_router, prefix="/api/files", tags=["preview"])
app.include_router(stats_router, prefix="/api/files", tags=["stats"])
app.include_router(dropdown_router, prefix="/api/files", tags=["dropdown"])
app.include_router(report_router, prefix="/api/files", tags=["report"])
app.include_router(company_lforms_router,
                   prefix="/api/files", tags=["company_lforms"])
app.include_router(extract_router, prefix="/api/extraction",
                   tags=["extraction"])
app.include_router(folder_uploader_router, prefix="/api",
                   tags=["folder_uploader"])
app.include_router(template_router, prefix="/templates", tags=["templates"])
app.include_router(company.router, prefix="/api")


# app.include_router(pdf_upload_router, prefix="/api", tags=["PDF Processing"])

# Serve static files (uploads and extracted files) from absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Function to safely mount static directories


def mount_static_directory(app, path, name):
    directory = os.path.join(BASE_DIR, path)
    if os.path.exists(directory):
        app.mount(f"/{name}", StaticFiles(directory=directory), name=name)
        print(f"✅ Mounted /{name} -> {directory}")
    else:
        print(
            f"⚠️  Directory {directory} does not exist, skipping /{name} mount")


# Mount static directories safely
mount_static_directory(app, "uploads", "uploads")
mount_static_directory(app, "extracted", "extracted")
mount_static_directory(app, "pdf_folder_extracted", "pdf_folder_extracted")
mount_static_directory(app, "vifiles", "vifiles")


@app.get("/")
def read_root():
    return {
        "message": "Viyanta File Processing API",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/files/upload",
            "files": "/api/files/files",
            "stats": "/api/files/stats",
            "download_original": "/api/files/download/original/{file_id}",
            "download_parquet": "/api/files/download/parquet/{file_id}",
            "preview": "/api/files/preview/{file_id}",
            "pdf_extraction": "/api/extraction/extract/single",
            "bulk_extraction": "/api/extraction/extract/bulk",
            "user_history": "/api/extraction/user-history/{user_id}",
            "docs": "/docs"
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
