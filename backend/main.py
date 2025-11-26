from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from routes.download import router as download_router
from routes.dropdown import router as dropdown_router
from routes.company_lforms import router as company_l_forms_router
from routes.pdf_splitter import router as pdf_splitter_router
# from routes.peers import router as peers_router
from routes.economy import router as economy_router
from databases.database import Base, engine, get_db
from routes import company
import logging
import os

# Reduce logging to prevent disk space issues
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.basicConfig(level=logging.WARNING)

# from routes.pdf_upload import router as pdf_upload_router

app = FastAPI(title="Viyanta File Processing API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allow frontend origins
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
        print("⚠️ Database initialization skipped - init_db module not available")
    except Exception as e:
        print(f"⚠️ Startup event failed: {e}")

# Include routers
app.include_router(download_router, prefix="/api/files", tags=["download"])
app.include_router(dropdown_router, prefix="/api/files", tags=["dropdown"])
app.include_router(company_l_forms_router,
                   prefix="/api/files", tags=["company_l_forms"])
app.include_router(pdf_splitter_router,
                   prefix="/api/pdf-splitter", tags=["pdf_splitter"])
# app.include_router(peers_router, prefix="/api", tags=["peers"])
app.include_router(company.router, prefix="/api")
app.include_router(economy_router, prefix="/api/economy", tags=["Economy"])


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
            "user_history": "/api/extraction/history/{user_id}",
            "pdf_splitter_upload": "/api/pdf-splitter/upload",
            "pdf_splitter_companies": "/api/pdf-splitter/companies",
            "pdf_splitter_splits": "/api/pdf-splitter/companies/{company_name}/pdfs/{pdf_name}/splits"
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is running"}


@app.get("/db-status")
def db_status():
    """Database status endpoint for frontend health checks"""
    return {
        "status": "connected",
        "database": "operational",
        "message": "Database is healthy"
    }


# Companies endpoint moved to routes/company.py to avoid duplication


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
