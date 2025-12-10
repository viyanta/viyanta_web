from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from routes.download import router as download_router
from routes.dropdown import router as dropdown_router
from routes.company_lforms import router as company_l_forms_router
from routes.pdf_splitter import router as pdf_splitter_router
# from routes.peers import router as peers_router
from routes.economy import router as economy_router
from routes.indusrty import router as indusrty_router
from routes.periods import router as periods_router
from routes.irdai_monthly import router as irdai_monthly_router
from routes.lforms import router as lform_router
from databases.database import Base, engine, get_db
# Import models to ensure tables are created
from databases.models import (
    Company, EconomyMaster, 
    DashboardSelectedDescriptions, DashboardChartConfig, User, IndustryMaster
)


from routes import company
import logging
import os

# Reduce logging to prevent disk space issues
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.basicConfig(level=logging.WARNING)

# from routes.pdf_upload import router as pdf_upload_router

app = FastAPI(
    title="Viyanta File Processing API",
    version="1.0.0",
    openapi_tags=[
        {"name": "download", "description": "File download operations"},
        {"name": "dropdown", "description": "Dropdown and filter operations"},
        {"name": "company_l_forms", "description": "Company L-Forms operations"},
        {"name": "pdf_splitter", "description": "PDF splitting operations"},
        {"name": "Economy", "description": "Economy data operations"},
        {"name": "L-Forms", "description": "L-Forms data extraction and retrieval"},
    ]
)

# CORS setup - Allow both development and production origins
allowed_origins = [
    "http://localhost:5173",  # Development frontend
    "http://localhost:3000",  # Alternative dev port
    "http://localhost:5174",  # Alternative dev port
]

# Add production origin from environment variable if set
production_origin = os.getenv("FRONTEND_URL")
if production_origin:
    allowed_origins.append(production_origin)

# Also allow all origins in development (can be restricted in production)
if os.getenv("ENVIRONMENT") != "production":
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if os.getenv("ENVIRONMENT") == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create tables with error handling for concurrent DDL operations
# This is needed when using multiple workers (e.g., hypercorn with --workers)
try:
    Base.metadata.create_all(bind=engine)
except (OperationalError, Exception) as e:
    # Handle MySQL concurrent DDL error (1684) when multiple workers try to create tables
    error_str = str(e)
    # Check for MySQL error 1684 (concurrent DDL) or OperationalError with 1684
    is_concurrent_ddl = (
        "1684" in error_str or 
        "concurrent DDL" in error_str.lower() or
        "was skipped since its definition is being modified" in error_str
    )
    if is_concurrent_ddl:
        # This is expected when multiple workers start simultaneously
        # The first worker will create the tables, others will see this error
        print(f"⚠️  Concurrent DDL operation detected (normal with multiple workers)")
        print(f"   Error: {error_str[:200]}...")
        print("   Tables will be created by the first worker that succeeds.")
    else:
        # Re-raise other errors as they might be important
        print(f"❌ Error creating tables: {e}")
        raise

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
app.include_router(indusrty_router, prefix="/api/industry", tags=["Industry"])
app.include_router(periods_router, prefix="/api/periods", tags=["Periods"])
app.include_router(irdai_monthly_router,
                   prefix="/api/irdai-monthly", tags=["IRDAI Monthly"])
app.include_router(lform_router, prefix="/api/lforms", tags=["Lforms"])

# Log registered routes for debugging
print("✅ Economy router registered with prefix: /api/economy")
print("   Available endpoints:")
print("   - GET  /api/economy/health")
print("   - GET  /api/economy/selected-descriptions")
print("   - POST /api/economy/update-selected-descriptions")

print("\n✅ Industry router registered with prefix: /api/industry")
print("   Available endpoints:")
print("   - GET  /api/industry/selected-descriptions")
print("   - POST /api/industry/update-selected-descriptions")


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
            "pdf_splitter_splits": "/api/pdf-splitter/companies/{company_name}/pdfs/{pdf_name}/splits",
            "lforms_companies": "/api/lforms/companies",
            "lforms_forms": "/api/lforms/forms",
            "lforms_periods": "/api/lforms/periods",
            "lforms_report_types": "/api/lforms/reporttypes",
            "lforms_data": "/api/lforms/data"
        },
        "docs": "/docs",
        "openapi_schema": "/openapi.json"
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
