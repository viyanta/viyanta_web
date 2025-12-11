import axios from 'axios';

// Use environment variable or relative URL for production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

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

  async getS3Companies() {
    const response = await fetch(`${API_BASE_URL}/files/s3-companies`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch S3 companies');
    }
    return response.json();
  }

  async getCompanyData(companyName) {
    const response = await fetch(`${API_BASE_URL}/files/company-data/${encodeURIComponent(companyName)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch company data');
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

  async getCompaniesByLform(lform) {
    const response = await fetch(`${API_BASE_URL}/peers/companies-by-lform?lform=${encodeURIComponent(lform)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch companies by L-Form');
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
      // Get grouped files from pdf_folder_extracted directory
      const response = await fetch(`${API_BASE_URL}/uploaded-files`);
      if (response.ok) {
        const data = await response.json();
        // Return the full response with groups structure
        return data;
      } else {
        // Fallback: return empty groups structure
        return { status: "success", groups: [], total_groups: 0, total_files: 0 };
      }
    } catch (error) {
      console.error('Failed to get uploaded files:', error);
      return { status: "error", groups: [], total_groups: 0, total_files: 0 };
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

  // === NEW 4 UPLOAD MODES ===

  // Mode 1: Single instant upload
  async uploadSingleInstant(file, mode = 'text', folderName = null, userId = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    
    // Get user from localStorage if not provided
    if (!userId) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || 'default_user';
      } else {
        userId = 'default_user';
      }
    }
    
    formData.append('user_id', userId);
    
    // Use a default folder name if not provided
    if (!folderName) {
      folderName = `upload_${new Date().toISOString().split('T')[0]}`;
    }
    formData.append('folder_name', folderName);

    const response = await fetch(`${API_BASE_URL}/upload_single_instant`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Single instant upload failed');
    }

    return response.json();
  }

  // Mode 2: Multiple files upload
  async uploadMultiFiles(files, mode = 'text', folderName = null, userId = null) {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('mode', mode);
    
    // Get user from localStorage if not provided
    if (!userId) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || 'default_user';
      } else {
        userId = 'default_user';
      }
    }
    
    formData.append('user_id', userId);
    
    // Use a default folder name if not provided
    if (!folderName) {
      folderName = `upload_${new Date().toISOString().split('T')[0]}`;
    }
    formData.append('folder_name', folderName);

    const response = await fetch(`${API_BASE_URL}/upload_multi_files`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Multi files upload failed');
    }

    return response.json();
  }

  // Mode 3: Folder upload for tables only (fast)
  async uploadFolderTables(files, folderName, userId = null) {
    if (!folderName) throw new Error('Folder name is required for folder table upload');
    
    // Get user from localStorage if not provided
    if (!userId) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || 'default_user';
      } else {
        userId = 'default_user';
      }
    }
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('user_id', userId);
    formData.append('folder_name', folderName);

    const response = await fetch(`${API_BASE_URL}/upload_folder_tables`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Folder tables upload failed');
    }

    return response.json();
  }

  // Mode 4: Folder upload for text only (ultra-fast)
  async uploadFolderText(files, folderName, userId = null) {
    if (!folderName) throw new Error('Folder name is required for folder text upload');
    
    // Get user from localStorage if not provided
    if (!userId) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || 'default_user';
      } else {
        userId = 'default_user';
      }
    }
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('user_id', userId);
    formData.append('folder_name', folderName);

    const response = await fetch(`${API_BASE_URL}/upload_folder_text`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Folder text upload failed');
    }

    return response.json();
  }

  // === NEW USER-BASED FOLDER MANAGEMENT ===
  
  async getUserFolders(userId = null) {
    // Get user from localStorage if not provided
    if (!userId) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || 'default_user';
      } else {
        userId = 'default_user';
      }
    }
    
    const response = await fetch(`${API_BASE_URL}/user_folders/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get user folders');
    }

    return response.json();
  }
  
  async getUserFolderFiles(userId, folderName) {
    const response = await fetch(`${API_BASE_URL}/user_folder_files/${userId}/${encodeURIComponent(folderName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get folder files');
    }

    return response.json();
  }
  
  async getUserJsonData(userId, folderName, filename) {
    const response = await fetch(`${API_BASE_URL}/user_json_data/${userId}/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get JSON data');
    }

    return response.json();
  }
  
  async deleteUserFolder(userId, folderName) {
    const response = await fetch(`${API_BASE_URL}/user_folder/${userId}/${encodeURIComponent(folderName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete folder');
    }

    return response.json();
  }

  // === ALL USERS DATA METHODS (for maker-checker view) ===
  async getAllUsersData() {
    const response = await fetch(`${API_BASE_URL}/all_users_data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get all users data');
    }

    return response.json();
  }
  
  async getAllUsersFolderFiles(userId, folderName) {
    const response = await fetch(`${API_BASE_URL}/all_users_files/${userId}/${encodeURIComponent(folderName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get folder files');
    }

    return response.json();
  }
  
  async getAllUsersJsonData(userId, folderName, filename) {
    const response = await fetch(`${API_BASE_URL}/all_users_json_data/${userId}/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get JSON data');
    }

    return response.json();
  }

  // === NEW S3 STRUCTURE METHODS (with Gemini verification) ===
  
  // Upload folder with new S3 structure and Gemini verification
  async uploadFolderFilesNew(files, folderName, userId = null) {
    if (!folderName) throw new Error('Folder name is required');
    
    // Get user from localStorage if not provided
    if (!userId) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || 'default_user';
      } else {
        userId = 'default_user';
      }
    }
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('user_id', userId);

    const response = await fetch(`${API_BASE_URL}/folder_uploader/upload-folder-files-new/${encodeURIComponent(folderName)}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'New folder upload failed');
    }

    return response.json();
  }

  // List all folders in new S3 structure
  async listFoldersNew() {
    const response = await fetch(`${API_BASE_URL}/folder_uploader/list-folders-new`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list folders');
    }

    return response.json();
  }

  // List files in a specific folder (new S3 structure)
  async listFolderFilesNew(folderName) {
    const response = await fetch(`${API_BASE_URL}/folder_uploader/list-folder-files-new/${encodeURIComponent(folderName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list folder files');
    }

    return response.json();
  }

  // Get original file content from S3
  async getOriginalFileContentS3(folderName, fileName) {
    const response = await fetch(`${API_BASE_URL}/folder_uploader/get-original-file/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get original file content');
    }

    return response.json();
  }

  // Get JSON file content from S3
  async getJsonFileContentS3(folderName, fileName) {
    const response = await fetch(`${API_BASE_URL}/folder_uploader/get-json-file/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get JSON file content');
    }

    return response.json();
  }

  // Get verified JSON file content from S3
  async getVerifiedJsonFileContentS3(folderName, fileName) {
    const response = await fetch(`${API_BASE_URL}/folder_uploader/get-verified-json-file/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get verified JSON file content');
    }

    return response.json();
  }

  // === UPLOAD HISTORY METHODS ===
  
 

  // Save upload to history
  async saveToUploadHistory(uploadData, userId = null) {
    // Get user from localStorage if not provided
    if (!userId) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || 'default_user';
      } else {
        userId = 'default_user';
      }
    }
    
    const response = await fetch(`${API_BASE_URL}/upload-history/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save upload history');
    }

    return response.json();
  }

  // === COMPANY MANAGEMENT METHODS ===

  // Get all companies from database
  async getCompanies() {
    const response = await fetch(`${API_BASE_URL}/companies/`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get companies from L-Forms API
  async getLformCompanies() {
    const response = await fetch(`${API_BASE_URL}/lforms/companies`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get forms for a specific company from L-Forms API
  async getLformForms(company) {
    const response = await fetch(`${API_BASE_URL}/lforms/forms?company=${encodeURIComponent(company)}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get periods for a specific company and form from L-Forms API
  async getLformPeriods(company, formNo) {
    const response = await fetch(`${API_BASE_URL}/lforms/periods?company=${encodeURIComponent(company)}&form_no=${encodeURIComponent(formNo)}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get report types for a specific company, form, and period from L-Forms API
  async getLformReportTypes(company, formNo, period) {
    const response = await fetch(`${API_BASE_URL}/lforms/reporttypes?company=${encodeURIComponent(company)}&form_no=${encodeURIComponent(formNo)}&period=${encodeURIComponent(period)}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get report data for a specific company, form, period, and optional report type from L-Forms API
  async getLformData(company, formNo, period, reportType = null) {
    let url = `${API_BASE_URL}/lforms/data?company=${encodeURIComponent(company)}&form_no=${encodeURIComponent(formNo)}&period=${encodeURIComponent(period)}`;
    if (reportType) {
      url += `&report_type=${encodeURIComponent(reportType)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      // Handle specific error cases
      if (response.status === 404) {
        // Return empty array for 404 instead of throwing error
        // This is not really an error - just no data available
        return [];
      } else if (response.status === 500) {
        throw new Error('Server error. Please check the data format.');
      } else {
        throw new Error(errorMessage);
      }
    }

    return response.json();
  }

  // Create a new company
  async createCompany(companyName) {
    const response = await fetch(`${API_BASE_URL}/companies/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: companyName.toLowerCase().trim() }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Delete a company
  async deleteCompany(companyId) {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }


// Update/Edit a company
async updateCompany(companyId, updatedName) {
  const response = await fetch(`${API_BASE_URL}/companies/${companyId}`, {
    method: 'PUT', // or 'PATCH' depending on your backend
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: updatedName.toLowerCase().trim() }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}


  // === LEGACY METHODS (kept for compatibility) ===

  // Upload PDF for a specific company (template-based extraction)
  async uploadTemplateCompanyPDF(file, company) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.getTemplateApiBase()}/upload?company=${encodeURIComponent(company)}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get template API base URL
  getTemplateApiBase() {
    // Use API_BASE_URL but replace /api with /templates
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/templates`;
  }

  // PDF Splitter API methods
  async uploadAndSplitPDF(file, companyName, userId) {
    const formData = new FormData();
    formData.append('pdf_file', file);
    formData.append('company_name', companyName);
    formData.append('user_id', userId);

    const response = await fetch(`${API_BASE_URL}/pdf-splitter/upload-and-split`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload and split failed');
    }

    return response.json();
  }

  async getCompanyPDFs(companyName) {
    const response = await fetch(`${API_BASE_URL}/pdf-splitter/companies/${encodeURIComponent(companyName)}/pdfs`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to load company PDFs');
    }

    return response.json();
  }

  async getPDFSplits(companyName, pdfName) {
    const response = await fetch(`${API_BASE_URL}/pdf-splitter/companies/${encodeURIComponent(companyName)}/pdfs/${encodeURIComponent(pdfName)}/splits`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to load PDF splits');
    }

    return response.json();
  }

  async downloadSplitFile(companyName, pdfName, splitFileName) {
    const response = await fetch(`${API_BASE_URL}/pdf-splitter/companies/${encodeURIComponent(companyName)}/pdfs/${encodeURIComponent(pdfName)}/splits/${encodeURIComponent(splitFileName)}/download`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to download split file');
    }

    return response.blob();
  }

  async deletePDF(companyName, pdfName) {
    const response = await fetch(`${API_BASE_URL}/pdf-splitter/companies/${encodeURIComponent(companyName)}/pdfs/${encodeURIComponent(pdfName)}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete PDF');
    }

    return response.json();
  }

  // PDF Form Extraction
  async extractFormData(companyName, pdfName, splitFilename, userId) {
    const formData = new FormData();
    formData.append('company_name', companyName);
    formData.append('pdf_name', pdfName);
    formData.append('split_filename', splitFilename);
    formData.append('user_id', userId);
    
    const response = await fetch(`${API_BASE_URL}/pdf-splitter/extract-form`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Form extraction failed');
    }

    return response.json();
  }

  async getExtractedData(companyName, pdfName, splitFilename) {
    const response = await fetch(
      `${API_BASE_URL}/pdf-splitter/companies/${encodeURIComponent(companyName)}/pdfs/${encodeURIComponent(pdfName)}/splits/${encodeURIComponent(splitFilename)}/extraction`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get extracted data');
    }

    return response.json();
  }

  // =====================
  // ECONOMY APIs
  // =====================
  // 1️⃣ Get Premium Types
 getPremiumTypes = async (dataType) => {
  const response = await axios.get(`${API_BASE_URL}/economy/premium-types?data_type=${dataType}`);
  return response.data;
};

// 2️⃣ Get Categories
 getCategories = async (dataType, premiumType) => {
  const response = await axios.get(
    `${API_BASE_URL}/economy/categories?data_type=${dataType}&premium=${premiumType}`
  );
  return response.data;
};

// 3️⃣ Get Descriptions
 getDescriptions = async (dataType, premiumType, category) => {
  const response = await axios.get(
    `${API_BASE_URL}/economy/descriptions?data_type=${dataType}&premium=${premiumType}&category=${category}`
  );
  return response.data;
};

// 3.5️⃣ Get Unique Values for Form Fields
 getUniqueValues = async (dataType, field) => {
  const response = await axios.get(
    `${API_BASE_URL}/economy/unique-values?data_type=${dataType}&field=${field}`
  );
  return response.data;
};

// 4️⃣ Get Economy Data
 getEconomyData = async (dataType, premiumType, category) => {
  const response = await axios.get(
    `${API_BASE_URL}/economy/data?data_type=${dataType}&premium=${premiumType}&category=${category}`
  );
  return response.data;
};


// 5️⃣ Create New Economy Data
createEconomyData = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/economy/add`, payload);
  return response.data;
};

// 6️⃣ Update Existing Record by ID
updateEconomyData = async (id, payload) => {
  const response = await axios.patch(`${API_BASE_URL}/economy/update/${id}`, payload);
  return response.data;
};

// 7️⃣ Delete Record by ID
deleteEconomyData = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/economy/delete/${id}`);
  return response.data;
};

// 8️⃣ Get Dashboard Data for Selected Descriptions (Optimized)
getDashboardData = async (descriptions) => {
  const response = await axios.post(`${API_BASE_URL}/economy/dashboard-data`, 
    { descriptions: descriptions }, 
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// 9️⃣ Get Selected Descriptions (Global for all users)
getSelectedDescriptions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/economy/selected-descriptions`);
    return response.data.descriptions || [];
  } catch (error) {
    console.error('Error fetching selected descriptions:', error);
    return [];
  }
};

// 🔟 Update Selected Descriptions (Save globally - admin only)
updateSelectedDescriptions = async (descriptions, removedDescription = null) => {
  const response = await axios.post(`${API_BASE_URL}/economy/update-selected-descriptions`, 
    { 
      descriptions: descriptions,
      removed_description: removedDescription
    }, 
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// 1️⃣1️⃣ Get Selected Row IDs for Dashboard
getSelectedRowIds = async (dataType, description) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/economy/selected-row-ids?data_type=${dataType}&description=${encodeURIComponent(description)}`
    );
    return response.data.row_ids || [];
  } catch (error) {
    console.error('Error fetching selected row IDs:', error);
    return [];
  }
};

// 1️⃣2️⃣ Update Selected Row IDs for Dashboard
updateSelectedRowIds = async (dataType, description, rowIds) => {
  const response = await axios.post(
    `${API_BASE_URL}/economy/update-selected-row-ids`,
    {
      data_type: dataType,
      description: description,
      row_ids: rowIds
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// 1️⃣3️⃣ Get Chart Configurations
getChartConfigs = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/economy/chart-configs`);
    return response.data || {};
  } catch (error) {
    console.error('Error fetching chart configs:', error);
    return {};
  }
};

// 1️⃣4️⃣ Save Chart Configurations
saveChartConfigs = async (configs) => {
  const response = await axios.post(
    `${API_BASE_URL}/economy/save-chart-configs`,
    { configs },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};



  // =====================
  // INDUSTRY APIs
  // =====================
  // 1️⃣ Get Premium Types
  getPremiumTypesIndustry = async (dataType) => {
    const response = await axios.get(`${API_BASE_URL}/industry/premium-types?data_type=${dataType}`);
    return response.data;
  };
  
  // 2️⃣ Get Categories
   getCategoriesIndustry = async (dataType, premiumType) => {
    const response = await axios.get(
      `${API_BASE_URL}/industry/categories?data_type=${dataType}&premium=${premiumType}`
    );
    return response.data;
  };
  
  // 3️⃣ Get Industry Data
   getIndustryDataIndustry = async (dataType, premiumType, category) => {
    const response = await axios.get(
      `${API_BASE_URL}/industry/data?data_type=${dataType}&premium=${premiumType}&category=${category}`
    );
    return response.data;
  };
  
  
  // 4️⃣ Create New Industry Data
  createIndustryDataIndustry = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/industry/add`, payload);
    return response.data;
  };
  
  // 5️⃣ Update Existing Record by ID
  updateIndustryDataIndustry = async (id, payload) => {
    const response = await axios.patch(`${API_BASE_URL}/industry/update/${id}`, payload);
    return response.data;
  };
  
  // 6️⃣ Delete Record by ID
  deleteIndustryDataIndustry = async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/industry/delete/${id}`);
    return response.data;
  };

  // Get Unique Values for Industry Form Fields
  getUniqueValuesIndustry = async (dataType, field) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/industry/unique-values?data_type=${dataType}&field=${field}`
      );
      return response.data;
    } catch (err) {
      // Return empty array if endpoint doesn't exist - DO NOT use economy data
      console.warn(`Industry unique-values endpoint not available for ${field}, returning empty array`);
      return [];
    }
  };

  // Get Descriptions for Industry
  getDescriptionsIndustry = async (dataType, premiumType, category) => {
    const response = await axios.get(
      `${API_BASE_URL}/industry/descriptions?data_type=${dataType}&premium=${premiumType}&category=${category}`
    );
    return response.data;
  };

  // Get Selected Row IDs for Industry Dashboard
  getSelectedRowIdsIndustry = async (dataType, description) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/industry/selected-row-ids?data_type=${dataType}&description=${encodeURIComponent(description)}`
      );
      return response.data.row_ids || [];
    } catch (error) {
      console.error('Error fetching selected row IDs:', error);
      return [];
    }
  };

  // Update Selected Row IDs for Industry Dashboard
  updateSelectedRowIdsIndustry = async (dataType, description, rowIds) => {
    const response = await axios.post(
      `${API_BASE_URL}/industry/update-selected-row-ids`,
      {
        data_type: dataType,
        description: description,
        row_ids: rowIds
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };

  // Get Selected Descriptions for Industry Dashboard (separate from Economy)
  getSelectedDescriptionsIndustry = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/industry/selected-descriptions`);
      return response.data.descriptions || [];
    } catch (error) {
      console.error('Error fetching selected descriptions:', error);
      return [];
    }
  };

  // Update Selected Descriptions for Industry Dashboard (separate from Economy)
  updateSelectedDescriptionsIndustry = async (descriptions, removedDescription = null) => {
    const response = await axios.post(
      `${API_BASE_URL}/industry/update-selected-descriptions`, 
      { 
        descriptions: descriptions,
        removed_description: removedDescription
      }, 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };

  // 7️⃣ Get Industry Dashboard Data
  getIndustryDashboardData = async (descriptions) => {
    const response = await axios.post(`${API_BASE_URL}/industry/dashboard-data`, 
      { descriptions: descriptions }, 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };
  



  // =====================
  // L-FORMS APIs
  // =====================

  // 1️⃣ Company Dropdown
  getCompaniesForLForms = async () => {
    const res = await axios.get(`${API_BASE_URL}/lforms/companies`);
    return res.data;
  };

  

  // 2️⃣ Period Dropdown
  getPeriodsForLForms = async (company, form_no) => {
    const res = await axios.get(`${API_BASE_URL}/lforms/periods`, {
      params: { company, form_no }
    });
    return res.data;
  };


  // 3️⃣ Form Dropdown
  getFormsForLForms = async (company) => {
    const res = await axios.get(`${API_BASE_URL}/lforms/forms`, {
      params: { company }
    });
    return res.data;
  };

  // 4️⃣ Report Type Dropdown
  getReportTypesForLForms = async (company, form_no, period) => {
    const res = await axios.get(`${API_BASE_URL}/lforms/reporttypes`, {
      params: { company, form_no, period }
    });
    return res.data;
  };

  // 5️⃣ Final Table Data
  getReportDataForLForms = async (company, form_no, period, report_type = null) => {
    const res = await axios.get(`${API_BASE_URL}/lforms/data`, {
      params: { company, form_no, period, report_type }
    });
    return res.data;
  };


  
  // =====================
  // PERIOD SELECTION APIs
  // =====================
   // 1️⃣ Get all Financial Years
   getFinancialYears = async () => {
    const response = await axios.get(`${API_BASE_URL}/periods/years`);
    return response.data;
  };

  // 2️⃣ Get Period Types (Q1, HY, etc.) for a selected FY
  getPeriodTypes = async (year) => {
    const response = await axios.get(`${API_BASE_URL}/periods/types?year=${encodeURIComponent(year)}`);
    return response.data;
  };

  // 3️⃣ Get Period Ranges (Apr 2021-Jun 2021...)
  getPeriodRanges = async (year, periodType) => {
    const response = await axios.get(
      `${API_BASE_URL}/periods/ranges?year=${encodeURIComponent(year)}&period_type=${encodeURIComponent(periodType)}`
    );
    return response.data;
  };

  // 4️⃣ Get Monthly Period Breakdown (dd-mm-yyyy format)
  getMonthlyPeriods = async (rangeValue) => {
    const response = await axios.get(
      `${API_BASE_URL}/periods/months?range_value=${encodeURIComponent(rangeValue)}`
    );
    return response.data;
  };


  // ==========================
  // IRDAI MONTHLY DATA APIs 
  // ==========================

  // 1️⃣ Get Available Report Months
  getIrdaiReportMonths = async () => {
    const response = await axios.get(`${API_BASE_URL}/irdai-monthly/months`);
    return response.data;
  };

  // 2️⃣ Get Insurers for a Selected Month
  getIrdaiInsurers = async (reportMonth) => {
    const response = await axios.get(`${API_BASE_URL}/irdai-monthly/insurers`, {
      params: { report_month: reportMonth },
    });
    return response.data.insurers;
  };

  // 3️⃣ Get Detailed Data For Selected Insurer
  getIrdaiInsurerDetails = async (reportMonth, insurerName) => {
    const response = await axios.get(`${API_BASE_URL}/irdai-monthly/details`, {
      params: {
        report_month: reportMonth,
        insurer_name: insurerName,
      },
    });
    return response.data; // includes both total + category rows
  };

  // ================================
  // COMPANY METRICS APIs 
  // ================================

  // 1️⃣ Get All Companies
  getCompaniesforMetrics = async () => {
    const response = await axios.get(`${API_BASE_URL}/company-metrics/companies`);
    return response.data.companies;
  };

  // 2️⃣ Get Premium Types for a Company
  getCompanyPremiumTypesforMetrics = async (company) => {
    const response = await axios.get(`${API_BASE_URL}/company-metrics/premium-types`, {
      params: { company },
    });
    return response.data.premium_types;
  };

  // 3️⃣ Get Categories for Company + Premium Type
  getCompanyCategoriesforMetrics = async (company, premiumType) => {
    const response = await axios.get(`${API_BASE_URL}/company-metrics/categories`, {
      params: {
        company,
        premium_type: premiumType,
      },
    });
    return response.data.categories;
  };

  // 4️⃣ Get Descriptions for Company + Premium Type + Category
  getCompanyDescriptionsforMetrics = async (company, premiumType, category) => {
    const response = await axios.get(`${API_BASE_URL}/company-metrics/descriptions`, {
      params: {
        company,
        premium_type: premiumType,
        category,
      },
    });
    return response.data.descriptions;
  };

  // 5️⃣ Get Full Details for the Selected Filters
  getMetricDetails = async (company, premiumType, category, description) => {
    const response = await axios.get(`${API_BASE_URL}/company-metrics/details`, {
      params: {
        company,
        premium_type: premiumType,
        category,
        description,
      },
    });
    return response.data; // full record list
  };

  // ================================
  // CRUD APIs 
  // ================================

  // 🟢 Create new record
  createMetric = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/company-metrics/create`, payload);
    return response.data;
  };

  // 🔵 Get a single record by ID
  getMetricById = async (id) => {
    const response = await axios.get(`${API_BASE_URL}/company-metrics/get/${id}`);
    return response.data;
  };

  // 🟡 Full Update
  updateMetric = async (id, payload) => {
    const response = await axios.put(`${API_BASE_URL}/company-metrics/update/${id}`, payload);
    return response.data;
  };

  // 🟣 Patch (partial update)
  patchMetric = async (id, payload) => {
    const response = await axios.patch(`${API_BASE_URL}/company-metrics/patch/${id}`, payload);
    return response.data;
  };

  // 🔴 Delete record
  deleteMetric = async (id) => {
    try {
      if (!id) {
        throw new Error('Record ID is required');
      }
      const response = await axios.delete(`${API_BASE_URL}/company-metrics/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error in deleteMetric:', error);
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 404) {
          throw new Error('Record not found. It may have already been deleted.');
        } else if (error.response.status === 500) {
          throw new Error('Server error. Please try again later.');
        }
        throw new Error(error.response.data?.detail || `Failed to delete record: ${error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('No response from server. Please check if the backend server is running.');
      } else {
        // Error setting up the request
        throw new Error(`Error setting up delete request: ${error.message}`);
      }
    }
  };

  // 🔵 Get Unique Values for Form Fields
  getCompanyMetricUniqueValues = async (company, field) => {
    const response = await axios.get(`${API_BASE_URL}/company-metrics/unique-values`, {
      params: { company, field },
    });
    return response.data;
  };

  // ================================
  // METRICS DASHBOARD APIs
  // ================================

  // 1️⃣ Get Dashboard Data for Selected Descriptions (Metrics)
  getMetricsDashboardData = async (descriptions) => {
    try {
      if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
        return [];
      }
      
      const response = await axios.post(`${API_BASE_URL}/company-metrics/dashboard-data`, 
        { descriptions: descriptions }, 
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data || [];
    } catch (error) {
      console.error('Error in getMetricsDashboardData:', error);
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 404) {
          console.error('Endpoint /api/company-metrics/dashboard-data not found. Please check backend route registration.');
        }
        throw error;
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response from server for dashboard-data endpoint.');
        throw error;
      } else {
        // Error setting up the request
        console.error('Error setting up dashboard-data request:', error.message);
        throw error;
      }
    }
  };

  // 2️⃣ Get Selected Descriptions for Metrics Dashboard (uses same table as Economy)
  getSelectedDescriptionsMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/economy/selected-descriptions`);
      return response.data.descriptions || [];
    } catch (error) {
      console.error('Error fetching selected descriptions:', error);
      return [];
    }
  };

  // 3️⃣ Update Selected Descriptions for Metrics Dashboard (uses same table as Economy)
  updateSelectedDescriptionsMetrics = async (descriptions, removedDescription = null) => {
    const response = await axios.post(`${API_BASE_URL}/economy/update-selected-descriptions`, 
      { 
        descriptions: descriptions,
        removed_description: removedDescription
      }, 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };

  // 4️⃣ Get Selected Row IDs for Metrics Dashboard
  getSelectedRowIdsMetrics = async (dataType, description) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/economy/selected-row-ids?data_type=${dataType}&description=${encodeURIComponent(description)}`
      );
      return response.data.row_ids || [];
    } catch (error) {
      console.error('Error fetching selected row IDs:', error);
      return [];
    }
  };

  // 5️⃣ Update Selected Row IDs for Metrics Dashboard
  updateSelectedRowIdsMetrics = async (dataType, description, rowIds) => {
    const response = await axios.post(
      `${API_BASE_URL}/economy/update-selected-row-ids`,
      {
        data_type: dataType,
        description: description,
        row_ids: rowIds
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };
  
}

export default new ApiService();
export { API_BASE_URL };
