import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
import os

DATABASE_PATH = "file_storage.db"


def init_database():
    """Initialize the database and create tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        cursor = conn.cursor()
        
        # Enable WAL mode for better concurrency
        cursor.execute('PRAGMA journal_mode=WAL;')

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

        # Add index on upload_time for faster sorting/filtering
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_files_upload_time 
            ON files(upload_time DESC)
        ''')

        # Add index on stats for faster stats aggregation
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_files_status 
            ON files(status)
        ''')

        conn.commit()
    finally:
        conn.close()


def add_file_record(file_id: str, original_filename: str, stored_filename: str,
                    file_type: str, file_size: int, status: str = "processing") -> Dict:
    """Add a new file record to the database"""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO files (file_id, original_filename, stored_filename, file_type, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (file_id, original_filename, stored_filename, file_type, file_size, status))

        conn.commit()

        return {
            "file_id": file_id,
            "original_filename": original_filename,
            "status": status
        }
    finally:
        conn.close()


def update_file_status(file_id: str, status: str, parquet_filename: str = None,
                       parquet_size: int = None, row_count: int = None, error_message: str = None):
    """Update file processing status"""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
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
    finally:
        conn.close()


def get_file_by_id(file_id: str) -> Optional[Dict]:
    """Get file record by ID"""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM files WHERE file_id = ?', (file_id,))
        row = cursor.fetchone()

        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def get_all_files() -> List[Dict]:
    """Get all file records"""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM files
            ORDER BY upload_time DESC
            LIMIT 50
        ''')

        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_file_stats() -> Dict:
    """Get file upload and processing statistics"""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        cursor = conn.cursor()

        # Optimized single query for all counts and sums
        cursor.execute('''
            SELECT 
                COUNT(*) as total_files,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as processed_files,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_files,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_files,
                COALESCE(SUM(file_size), 0) as total_size,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN parquet_size ELSE 0 END), 0) as total_parquet_size,
                MAX(upload_time) as last_activity
            FROM files
        ''')
        
        row = cursor.fetchone()
        
        total_files = row[0]
        processed_files = row[1] or 0
        processing_files = row[2] or 0
        failed_files = row[3] or 0
        total_size = row[4] or 0
        total_parquet_size = row[5] or 0
        last_activity = row[6]

        # Recent files (last 5)
        cursor.execute('''
            SELECT original_filename, status, upload_time
            FROM files
            ORDER BY upload_time DESC
            LIMIT 5
        ''')
        recent_files = cursor.fetchall()

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
    finally:
        conn.close()


# Initialize database when module is imported
init_database()
