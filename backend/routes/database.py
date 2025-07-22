import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
import os

DATABASE_PATH = "file_storage.db"

def init_database():
    """Initialize the database and create tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create files table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
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
        )
    ''')
    
    conn.commit()
    conn.close()

def add_file_record(file_id: str, original_filename: str, stored_filename: str, 
                   file_type: str, file_size: int, status: str = "processing") -> Dict:
    """Add a new file record to the database"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO files (file_id, original_filename, stored_filename, file_type, file_size, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (file_id, original_filename, stored_filename, file_type, file_size, status))
    
    conn.commit()
    conn.close()
    
    return {
        "file_id": file_id,
        "original_filename": original_filename,
        "status": status
    }

def update_file_status(file_id: str, status: str, parquet_filename: str = None, 
                      parquet_size: int = None, row_count: int = None, error_message: str = None):
    """Update file processing status"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    update_fields = ["status = ?", "processing_time = CURRENT_TIMESTAMP"]
    update_values = [status]
    
    if parquet_filename:
        update_fields.append("parquet_filename = ?")
        update_values.append(parquet_filename)
    
    if parquet_size is not None:
        update_fields.append("parquet_size = ?")
        update_values.append(parquet_size)
    
    if row_count is not None:
        update_fields.append("row_count = ?")
        update_values.append(row_count)
    
    if error_message:
        update_fields.append("error_message = ?")
        update_values.append(error_message)
    
    update_values.append(file_id)
    
    query = f"UPDATE files SET {', '.join(update_fields)} WHERE file_id = ?"
    cursor.execute(query, update_values)
    
    conn.commit()
    conn.close()

def get_file_by_id(file_id: str) -> Optional[Dict]:
    """Get file record by ID"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM files WHERE file_id = ?', (file_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if row:
        return dict(row)
    return None

def get_all_files() -> List[Dict]:
    """Get all file records"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM files 
        ORDER BY upload_time DESC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def get_file_stats() -> Dict:
    """Get file upload and processing statistics"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Total files
    cursor.execute('SELECT COUNT(*) FROM files')
    total_files = cursor.fetchone()[0]
    
    # Processed files
    cursor.execute('SELECT COUNT(*) FROM files WHERE status = "completed"')
    processed_files = cursor.fetchone()[0]
    
    # Files in progress
    cursor.execute('SELECT COUNT(*) FROM files WHERE status = "processing"')
    processing_files = cursor.fetchone()[0]
    
    # Failed files
    cursor.execute('SELECT COUNT(*) FROM files WHERE status = "failed"')
    failed_files = cursor.fetchone()[0]
    
    # Total file size
    cursor.execute('SELECT COALESCE(SUM(file_size), 0) FROM files')
    total_size = cursor.fetchone()[0]
    
    # Total parquet size
    cursor.execute('SELECT COALESCE(SUM(parquet_size), 0) FROM files WHERE status = "completed"')
    total_parquet_size = cursor.fetchone()[0]
    
    # Last activity
    cursor.execute('SELECT MAX(upload_time) FROM files')
    last_activity = cursor.fetchone()[0]
    
    # Recent files (last 5)
    cursor.execute('''
        SELECT original_filename, status, upload_time 
        FROM files 
        ORDER BY upload_time DESC 
        LIMIT 5
    ''')
    recent_files = cursor.fetchall()
    
    conn.close()
    
    return {
        "total_files": total_files,
        "processed_files": processed_files,
        "processing_files": processing_files,
        "failed_files": failed_files,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "total_parquet_size_mb": round(total_parquet_size / (1024 * 1024), 2),
        "last_activity": last_activity,
        "recent_files": [
            {
                "filename": row[0],
                "status": row[1],
                "upload_time": row[2]
            } for row in recent_files
        ]
    }

# Initialize database when module is imported
init_database()
