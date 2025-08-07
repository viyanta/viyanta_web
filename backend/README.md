# Viyanta Backend - FastAPI Server

RESTful API server for file processing and data extraction built with FastAPI.

## 🚀 Features

- **FastAPI Framework**: Modern, fast Python web framework
- **File Processing**: Upload, convert, and manage files
- **Advanced PDF Extraction**: Smart table and text detection
- **Parquet Conversion**: Efficient data storage format
- **SQLite Database**: Lightweight file tracking
- **RESTful API**: Clean API design with automatic documentation

## 📁 Directory Structure

```
backend/
├── routes/                    # API route modules
│   ├── __init__.py           # Route package initialization
│   ├── upload.py             # File upload and processing
│   ├── preview.py            # Data preview endpoints
│   ├── download.py           # File download endpoints
│   ├── stats.py              # Statistics and analytics
│   ├── extraction.py         # Advanced extraction features
│   ├── shared.py             # Shared utility functions
│   ├── database.py           # Database operations
│   └── company_lforms.py     # Specialized form processing
├── uploads/                  # Original uploaded files
├── converted/               # Processed Parquet files
├── file_storage.db         # SQLite database
├── main.py                 # FastAPI application
└── requirements.txt        # Python dependencies
```

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- pip (Python package manager)

### Setup Steps

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment (recommended)**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the server**
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## 📚 Dependencies

```
fastapi>=0.104.1
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
pandas>=2.1.0
pyarrow>=13.0.0
PyPDF2>=3.0.1
pdfplumber>=0.9.0
python-magic>=0.4.27
aiofiles>=23.2.1
```

## 🔌 API Endpoints

### Core Endpoints

#### File Upload & Processing
```http
POST /api/files/upload
Content-Type: multipart/form-data

# Upload file and automatically process it
```

#### File Management
```http
GET /api/files/files           # List all files
GET /api/files/stats           # Get processing statistics
```

#### Data Preview
```http
GET /api/files/preview/{file_id}                    # Preview Parquet data
GET /api/files/preview/original/{file_id}           # Preview original file
```

#### File Download
```http
GET /api/files/download/original/{file_id}          # Download original file
GET /api/files/download/parquet/{file_id}           # Download Parquet file
```

#### Advanced Features
```http
GET /api/files/extraction/metadata/{file_id}        # Get extraction metadata
GET /api/files/reports/summary                      # Generate reports
```

### Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error description",
  "detail": "Detailed error information"
}
```

## 🗄️ Database Operations

### File Tracking
The system tracks all files in SQLite database:

```python
# Add new file record
add_file_record(file_id, original_filename, stored_filename, file_type, file_size)

# Update processing status
update_file_status(file_id, "completed", parquet_filename, parquet_size, row_count)

# Retrieve file information
file_info = get_file_by_id(file_id)

# Get all files
all_files = get_all_files()

# Get statistics
stats = get_file_stats()
```

## 📄 File Processing Pipeline

### 1. File Upload
- Validate file type (PDF, CSV, JSON)
- Generate unique file ID
- Store in `uploads/` directory
- Create database record

### 2. Content Extraction

#### PDF Processing
```python
# Enhanced PDF extraction with structure detection
structured_data = extract_text_from_pdf(pdf_file)

# Analyze text structure: headers, tables, normal text
for item in structured_data:
    if item["type"] == "table":
        # Process table data
        table_df = create_table_dataframe(item["content"])
    elif item["type"] == "header":
        # Process header information
        process_header(item["content"])
```

#### CSV/JSON Processing
```python
# Direct DataFrame creation for structured data
if file_type == "csv":
    df = pd.read_csv(file_path)
elif file_type == "json":
    df = pd.DataFrame(json_data)
```

### 3. Parquet Conversion
```python
# Convert to efficient Parquet format
output_path = os.path.join("converted", f"{filename}_{hash}.parquet")
df.to_parquet(output_path, index=False)

# Save extraction metadata
save_extraction_details(structured_data, filename)
```

## 🔍 Advanced Features

### Smart PDF Extraction

#### Table Detection
- Identifies tabular data patterns
- Recognizes column separators
- Handles multi-line headers
- Preserves data relationships

#### Text Classification
- **Headers**: All caps, short lines, followed by colons
- **Subheaders**: Numbered or lettered sections
- **Lists**: Bullet points and dashes
- **Tables**: Multiple columns with numeric data
- **Text**: Regular paragraph content

#### Metadata Generation
```json
{
  "original_filename": "document.pdf",
  "total_items": 45,
  "content_types": {
    "table": 3,
    "header": 8,
    "text": 30,
    "list_item": 4
  },
  "tables_found": 3,
  "headers_found": 8,
  "pages_processed": 12
}
```

## 🚦 Error Handling

### Exception Types
- **File Validation Errors**: Invalid file types, corrupted files
- **Processing Errors**: Extraction failures, conversion issues
- **Database Errors**: Connection issues, constraint violations
- **Storage Errors**: Disk space, permission issues

### Error Response Example
```json
{
  "detail": "File processing failed: Unable to extract tables from PDF",
  "error_type": "ProcessingError",
  "file_id": "abc123",
  "timestamp": "2025-07-30T14:30:00Z"
}
```

## 🛡️ Security Features

- **File Type Validation**: Strict file type checking
- **File Size Limits**: Configurable upload limits
- **Path Sanitization**: Prevent directory traversal
- **Input Validation**: Validate all API inputs
- **Error Sanitization**: Don't expose sensitive information

## 📊 Performance Optimizations

### File Processing
- **Streaming**: Large files processed in chunks
- **Background Processing**: Non-blocking operations
- **Caching**: Cache processed results
- **Compression**: Parquet format with compression

### Database
- **Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Batch Operations**: Bulk database operations

## 🧪 Testing

### Running Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/

# Run with coverage
pytest --cov=routes tests/
```

### Test Structure
```
tests/
├── test_upload.py          # File upload tests
├── test_extraction.py      # Extraction logic tests
├── test_database.py        # Database operation tests
└── test_api.py            # API endpoint tests
```

## 🔧 Configuration

### Environment Variables
```bash
# Database configuration
DATABASE_PATH=file_storage.db

# File storage paths
UPLOAD_DIR=uploads
CONVERTED_DIR=converted

# Server configuration
HOST=0.0.0.0
PORT=8000
RELOAD=true

# File processing limits
MAX_FILE_SIZE=50MB
ALLOWED_EXTENSIONS=pdf,csv,json
```

### Customization
- Modify `routes/shared.py` for custom extraction logic
- Adjust database schema in `routes/database.py`
- Update file type handlers for new formats

## 📈 Monitoring

### Health Check
```http
GET /
# Returns API status and available endpoints
```

### Statistics Endpoint
```http
GET /api/files/stats
# Returns processing statistics and system health
```

## 🚀 Deployment

### Production Setup
1. **Use production ASGI server**
   ```bash
   pip install gunicorn
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

2. **Environment configuration**
   ```bash
   export DATABASE_PATH=/app/data/file_storage.db
   export UPLOAD_DIR=/app/storage/uploads
   export CONVERTED_DIR=/app/storage/converted
   ```

3. **Docker deployment**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

## 🤝 Development

### Adding New Endpoints
1. Create new route file in `routes/`
2. Import and include in `main.py`
3. Update database schema if needed
4. Add tests for new functionality

### Code Style
- Follow PEP 8 guidelines
- Use type hints
- Document functions with docstrings
- Handle errors gracefully

---

**Backend API Documentation available at `http://localhost:8000/docs` when server is running**
