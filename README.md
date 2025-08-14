# Viyanta Web - File Processing System

A modern web application for processing and analyzing tabular data from various file formats (PDF, CSV, JSON) with advanced table extraction and visualization capabilities.

## 🚀 Features

- **Multi-format File Support**: Upload and process PDF, CSV, and JSON files
- **Advanced Table Extraction**: Intelligent detection of headers, tables, and text content from PDFs
- **Ultra-Fast Folder Processing**: Bulk upload and process entire folders of PDFs with multithreading (10-14 PDFs, 130-150 pages each, in 2-4 minutes)
- **Cloud Storage Integration**: Automatic upload to AWS S3 bucket under `maker_checker/` folder structure
- **Dual Extraction Modes**: Ultra-fast text-only extraction or complete text+tables processing
- **Parquet Conversion**: Convert files to efficient Parquet format for better performance
- **Interactive Data Tables**: View extracted data in beautiful, sortable tables
- **Real-time Comparison**: Side-by-side comparison of original files vs. processed data
- **File Management**: Track upload history, processing status, and file statistics
- **Download Management**: Bulk download of processed JSONs as ZIP files
- **Dashboard Analytics**: Recent activity tracking and folder upload history
- **Responsive UI**: Modern React-based interface with clean design

## 📁 Project Structure

```
viyanta_web/
├── backend/                 # FastAPI backend server
│   ├── routes/             # API route handlers
│   ├── converted/          # Processed Parquet files
│   ├── uploads/           # Original uploaded files
│   └── main.py            # FastAPI application entry point
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── services/      # API service layer
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
└── data/                  # Sample data files
```

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLite** - Lightweight database for file tracking
- **Pandas** - Data manipulation and analysis
- **PyPDF2** - PDF text extraction
- **Parquet** - Columnar storage format

### Frontend
- **React** - JavaScript UI library
- **React Router** - Client-side routing
- **Vite** - Fast build tool and development server
- **Modern CSS** - Custom styling with CSS variables

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ 
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server**
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173` (or next available port)

### Using the Application

1. **Upload Files**: Go to the Explorer page and upload PDF, CSV, or JSON files
2. **Upload Folders**: Use the folder upload feature to process multiple PDFs at once
3. **View Results**: Files are automatically processed and converted to Parquet format
4. **Compare Data**: Click on any file in Recent Activity to compare original vs. processed data
5. **Download**: Download both original and processed files, or bulk download JSON extractions as ZIP

## ☁️ AWS S3 Configuration

The application automatically uploads extracted JSON files to AWS S3 for cloud storage and backup.

### Environment Setup

Create a `.env` file in the `backend/` directory with your AWS credentials:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=your_bucket_name
S3_REGION=your_aws_region

# Gemini AI API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

### S3 Storage Structure

Extracted JSON files are stored in S3 with the following structure:
```
s3://your-bucket/
└── maker_checker/
    ├── PDF_Name_1/
    │   └── PDF_Name_1.json
    ├── PDF_Name_2/
    │   └── PDF_Name_2.json
    └── ...
```

### S3 Features

- **Automatic Upload**: All folder extractions are automatically uploaded to S3
- **Metadata Tagging**: Files include extraction metadata (timestamp, PDF name, extraction type)
- **Graceful Fallback**: If S3 is unavailable, local processing continues uninterrupted
- **Upload Statistics**: Real-time S3 upload success/failure tracking in the UI
- **Parallel Processing**: S3 uploads run in parallel with extraction for maximum speed

## 📊 Data Processing Features

### PDF Processing
- **Smart Table Detection**: Automatically identifies tabular data in PDFs
- **Header Recognition**: Detects and preserves column headers
- **Multi-page Support**: Processes entire documents page-by-page
- **Text Classification**: Distinguishes between headers, tables, and regular text
- **Metadata Extraction**: Saves detailed extraction information
- **Ultra-Fast Folder Upload**: Process entire folders of PDFs with multithreading (16-32 workers)
- **Dual Extraction Modes**: 
  - **Ultra Fast**: Text-only extraction for maximum speed (130-150 pages in 2-4 minutes)
  - **Complete**: Text + table extraction for comprehensive data capture
- **Real-time Progress**: Live timer and progress tracking during folder processing
- **Performance Metrics**: Pages/second processing rates and detailed timing per PDF

### Folder Upload Features
- **Bulk Processing**: Upload entire folders containing multiple PDFs
- **Parallel Extraction**: Multi-threaded processing for maximum speed
- **Live Statistics**: Real-time updates on processing status and timing
- **Error Resilience**: Continue processing even if individual PDFs fail
- **S3 Integration**: Automatic cloud backup of all extracted JSON files
- **Performance Optimization**: Adaptive thread count based on system capabilities
- **Browser Compatibility**: Two-column browser for PDFs and extracted JSONs
- **Download Management**: Bulk download of all extracted JSONs as a single ZIP file

### Data Conversion
- **Parquet Format**: Efficient columnar storage with compression
- **Schema Preservation**: Maintains data types and structure
- **Batch Processing**: Handle multiple files simultaneously
- **Error Handling**: Robust error handling with detailed feedback

### Table Display
- **Interactive Tables**: Sortable, searchable data tables
- **Responsive Design**: Works on desktop and mobile devices
- **Data Type Recognition**: Automatic detection of numbers, dates, text
- **Export Options**: Download processed data in various formats

## 🔧 API Endpoints

### File Operations
- `POST /api/files/upload` - Upload and process files
- `GET /api/files/files` - List all files
- `GET /api/files/stats` - Get processing statistics
- `GET /api/files/preview/{file_id}` - Preview Parquet data
- `GET /api/files/preview/original/{file_id}` - Preview original file
- `GET /api/files/download/original/{file_id}` - Download original file
- `GET /api/files/download/parquet/{file_id}` - Download Parquet file

### Folder Upload Operations
- `POST /api/folder_uploader` - Ultra-fast folder upload (text-only extraction)
- `POST /api/folder_uploader/with_tables` - Complete folder upload (text + tables)
- `POST /api/folder_uploader/zip` - Create and download ZIP of extracted JSONs

### Analytics
- `GET /api/files/extraction/metadata/{file_id}` - Get extraction metadata
- `GET /api/files/reports/summary` - Generate processing reports

## 🗄️ Database Schema

The application uses SQLite with the following main table:

```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT UNIQUE NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    parquet_filename TEXT,
    parquet_size INTEGER,
    row_count INTEGER,
    error_message TEXT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_time TIMESTAMP
);
```

## 🎨 UI Components

- **Dashboard**: Overview of file processing statistics
- **Explorer**: File upload and processing interface  
- **DataTable**: Interactive table component for data display
- **SourceFileViewer**: Original file content viewer
- **Modal**: File comparison and detailed views
- **Stats Context**: Global state management for statistics

## 🧪 Development

### Code Structure
- **Modular Design**: Separate concerns with clear API boundaries
- **Component Reusability**: Shared UI components across pages
- **Error Handling**: Comprehensive error handling at all levels
- **Type Safety**: JSX prop validation and Python type hints

### Adding New File Types
1. Update `shared.py` conversion function
2. Add processing logic to handle new format
3. Update frontend file type validation
4. Test with sample files

## 📈 Performance

- **Parquet Format**: Up to 80% smaller file sizes compared to CSV
- **Lazy Loading**: Large datasets loaded in chunks
- **Caching**: Intelligent caching of processed results
- **Background Processing**: Non-blocking file processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ for efficient data processing**
