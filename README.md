# Viyanta Web - File Processing System

A modern web application for processing and analyzing tabular data from various file formats (PDF, CSV, JSON) with advanced table extraction and visualization capabilities.

## 🚀 Features

- **Multi-format File Support**: Upload and process PDF, CSV, and JSON files
- **Advanced Table Extraction**: Intelligent detection of headers, tables, and text content from PDFs
- **Parquet Conversion**: Convert files to efficient Parquet format for better performance
- **Interactive Data Tables**: View extracted data in beautiful, sortable tables
- **Real-time Comparison**: Side-by-side comparison of original files vs. processed data
- **File Management**: Track upload history, processing status, and file statistics
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
2. **View Results**: Files are automatically processed and converted to Parquet format
3. **Compare Data**: Click on any file in Recent Activity to compare original vs. processed data
4. **Download**: Download both original and processed files

## 📊 Data Processing Features

### PDF Processing
- **Smart Table Detection**: Automatically identifies tabular data in PDFs
- **Header Recognition**: Detects and preserves column headers
- **Multi-page Support**: Processes entire documents
- **Text Classification**: Distinguishes between headers, tables, and regular text
- **Metadata Extraction**: Saves detailed extraction information

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
