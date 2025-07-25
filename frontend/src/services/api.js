const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
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
