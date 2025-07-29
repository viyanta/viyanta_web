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

# Include routers
app.include_router(upload_router, prefix="/api/files", tags=["upload"])
app.include_router(download_router, prefix="/api/files", tags=["download"])
app.include_router(preview_router, prefix="/api/files", tags=["preview"])
app.include_router(stats_router, prefix="/api/files", tags=["stats"])
app.include_router(dropdown_router, prefix="/api/files", tags=["dropdown"])
app.include_router(report_router, prefix="/api/files", tags=["report"])
app.include_router(company_lforms_router,
                   prefix="/api/files", tags=["company_lforms"])
app.include_router(extract_router, prefix="/api/extract", tags=["extract"])

# Serve static files (uploads and converted files)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/converted", StaticFiles(directory="converted"), name="converted")


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
            "preview": "/api/files/preview/{file_id}"
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
