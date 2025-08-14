const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  // Legacy file upload methods
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async uploadPdfFolder(files, includeTables = false) {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    // Use different endpoint based on table extraction preference
    const endpoint = includeTables ? '/folder_uploader/with_tables' : '/folder_uploader';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let msg = 'Folder upload failed';
      try { const err = await response.json(); msg = err.detail || msg; } catch {}
      throw new Error(msg);
    }

    return response.json();
  }

  async zipFolderJsons(outputPaths) {
    // outputPaths should be array of strings like 'pdf_folder_extracted/NAME/NAME.json'
    const response = await fetch(`${API_BASE_URL}/folder_uploader/zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputs: outputPaths }),
    });

    if (!response.ok) {
      let msg = 'Failed to create ZIP';
      try { const err = await response.json(); msg = err.detail || msg; } catch {}
      throw new Error(msg);
    }

    return response.blob();
  }

  // PDF Table Extraction Methods
  async extractBulkPDFs(files, extractMode = 'both') {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('extract_mode', extractMode);

    const response = await fetch(`${API_BASE_URL}/extraction/extract/bulk`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Bulk extraction failed');
    }

    return response.json();
  }

  async extractSinglePDF(file, extractMode = 'both', returnFormat = 'both') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extract_mode', extractMode);
    formData.append('return_format', returnFormat);

    console.log(`Extracting single PDF: ${file.name}, mode: ${extractMode}, format: ${returnFormat}`);

    const response = await fetch(`${API_BASE_URL}/extract/extract/single`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'PDF extraction failed');
    }

    return response.json();
  }

  async getJobStatus(jobId) {
    const response = await fetch(`${API_BASE_URL}/extraction/status/${jobId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch job status');
    }

    return response.json();
  }

  async getJobResults(jobId) {
    const response = await fetch(`${API_BASE_URL}/extraction/results/${jobId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch job results');
    }

    return response.json();
  }

  async downloadJobResults(jobId, format = 'json') {
    const response = await fetch(`${API_BASE_URL}/extraction/download/${jobId}?format=${format}`);
    
    if (!response.ok) {
      throw new Error('Failed to download results');
    }

    return response.blob();
  }

  async listJobFiles(jobId) {
    const response = await fetch(`${API_BASE_URL}/extraction/files/${jobId}`);
    
    if (!response.ok) {
      throw new Error('Failed to list job files');
    }

    return response.json();
  }

  async downloadSpecificFile(jobId, filename) {
    const response = await fetch(`${API_BASE_URL}/extraction/file/${jobId}/${filename}`);
    
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return response.blob();
  }

  async listAllJobs() {
    const response = await fetch(`${API_BASE_URL}/extraction/jobs`);
    
    if (!response.ok) {
      throw new Error('Failed to list jobs');
    }

    return response.json();
  }

  async cleanupJob(jobId) {
    const response = await fetch(`${API_BASE_URL}/extraction/cleanup/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to cleanup job');
    }

    return response.json();
  }

  async getFiles() {
    const response = await fetch(`${API_BASE_URL}/files/files`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }

    return response.json();
  }

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/files/stats`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    return response.json();
  }

  async downloadOriginalFile(fileId) {
    const response = await fetch(`${API_BASE_URL}/files/download/original/${fileId}`);
    
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return response.blob();
  }

  async downloadParquetFile(fileId) {
    const response = await fetch(`${API_BASE_URL}/files/download/parquet/${fileId}`);
    
    if (!response.ok) {
      throw new Error('Failed to download parquet file');
    }

    return response.blob();
  }

  async previewFile(fileId, full = false) {
    const url = `${API_BASE_URL}/files/preview/${fileId}${full ? '?full=true' : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to preview file');
    }

    return response.json();
  }

  async previewOriginalFile(fileId, full = false) {
    const url = `${API_BASE_URL}/files/preview/original/${fileId}${full ? '?full=true' : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to preview original file');
    }

    return response.json();
  }

  async getDropdownData() {
    const response = await fetch(`${API_BASE_URL}/files/dropdown-data`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch dropdown data');
    }

    return response.json();
  }

  async generateReport(filters) {
    const response = await fetch(`${API_BASE_URL}/files/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate report');
    }

    return response.json();
  }

  async getCompanyLforms(companyName) {
    const response = await fetch(`${API_BASE_URL}/files/company-lforms/${encodeURIComponent(companyName)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch company L-forms');
    }

    return response.json();
  }

  async generateLformReport(filters) {
    const response = await fetch(`${API_BASE_URL}/files/generate-lform-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate L-form report');
    }

    return response.json();
  }

  // User-specific history management methods
  async getUserExtractionHistory(userId) {
    const response = await fetch(`${API_BASE_URL}/extraction/user-history/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Don't throw error for missing history, just return empty array
      return [];
    }

    return response.json();
  }

  async saveUserExtractionHistory(userId, extractionData) {
    const response = await fetch(`${API_BASE_URL}/extraction/user-history/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(extractionData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save user history');
    }

    return response.json();
  }

  async clearUserExtractionHistory(userId) {
    const response = await fetch(`${API_BASE_URL}/extraction/user-history/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to clear user history');
    }

    return response.json();
  }

  // Updated extraction methods with user context
  async extractBulkPDFsWithUser(files, extractMode = 'both', userId = null) {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('extract_mode', extractMode);
    if (userId) {
      formData.append('user_id', userId);
    }

    const response = await fetch(`${API_BASE_URL}/extraction/extract/bulk`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Bulk extraction failed');
    }

    return response.json();
  }

  async extractSinglePDFWithUser(file, extractMode = 'both', returnFormat = 'both', userId = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extract_mode', extractMode);
    formData.append('return_format', returnFormat);
    if (userId) {
      formData.append('user_id', userId);
    }

    console.log(`Extracting single PDF: ${file.name}, mode: ${extractMode}, format: ${returnFormat}, user: ${userId}`);

    const response = await fetch(`${API_BASE_URL}/extraction/extract/single`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Single PDF extraction failed');
    }

    return response.json();
  }

  async getUploadedFiles() {
    try {
      // Get files from pdf_folder_extracted directory
      const response = await fetch(`${API_BASE_URL}/uploaded-files`);
      if (response.ok) {
        return response.json();
      } else {
        // Fallback: return empty array if endpoint doesn't exist
        return [];
      }
    } catch (error) {
      console.error('Failed to get uploaded files:', error);
      return [];
    }
  }

  getApiOrigin() {
    try {
      const url = new URL(API_BASE_URL);
      // if API_BASE_URL ends with /api, strip it
      if (url.pathname.endsWith('/api')) {
        url.pathname = url.pathname.replace(/\/api$/, '');
      }
      return url.toString().replace(/\/$/, '');
    } catch {
      return API_BASE_URL.replace(/\/api$/, '');
    }
  }

  // Helper method to download blob as file
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export default new ApiService();
