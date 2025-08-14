import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'
import DataTable from '../components/DataTable.jsx'
import SourceFileViewer from '../components/SourceFileViewer.jsx'

function Explorer({ onMenuClick }) {
    const { refreshStats } = useStats();
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    
    // File browser state
    const [uploadedFiles, setUploadedFiles] = React.useState([]);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [selectedFileJson, setSelectedFileJson] = React.useState(null);
    const [jsonLoading, setJsonLoading] = React.useState(false);
    const [view, setView] = React.useState('grid'); // 'grid' | 'list'
    
    // Load uploaded files on component mount
    React.useEffect(() => {
        loadUploadedFiles();
    }, []);

    // Persist last successful folder result for Dashboard recent activity
    React.useEffect(() => {
        if (folderResult && folderResult.status === 'completed') {
            try {
                const payload = { ...folderResult, savedAt: Date.now(), folderName };
                localStorage.setItem('lastFolderResult', JSON.stringify(payload));
                // Maintain rolling list of folder activities (most recent first)
                const raw = localStorage.getItem('folderActivities');
                let list = [];
                try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) list = parsed; } catch {}
                // Prepend new activity and dedupe by savedAt
                list = [payload, ...list.filter(a => a && a.savedAt !== payload.savedAt)];
                // Cap to last 10
                if (list.length > 10) list = list.slice(0, 10);
                localStorage.setItem('folderActivities', JSON.stringify(list));
            } catch {}
        }
    }, [folderResult, folderName]);

    const handleFileUpload = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadSuccess(false);
            setUploadResult(null);
            setError(null);
            setPreviewData(null);
            setSourcePreview(null);
            console.log(`File selected: ${selectedFile.name}`);
        }
    };

    const handleFolderPick = (event) => {
        // Chrome/Edge support directory selection using webkitdirectory attribute
        const files = Array.from(event.target.files || []);
        const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        setFolderFiles(pdfs);
        // Capture root folder name from webkitRelativePath (if available)
        const root = files.length && files[0].webkitRelativePath ? (files[0].webkitRelativePath.split('/')[0] || '') : '';
        setFolderName(root);
        setError(null);
        setFolderResult(null);
        setSelectedPdf(null);
        setSelectedPdfJson(null);
        setSelectedPage(null);
    };

    const processFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        setUploadSuccess(false);
        setError(null);
        
        try {
            const result = await ApiService.uploadFile(file);
            setUploadResult(result);
            setUploadSuccess(true);
            
            // Refresh stats to update sidebar and dashboard
            await refreshStats();
            
            // Load preview data
            if (result.file_id) {
                try {
                    // Load both source and parquet previews
                    const [sourceData, parquetData] = await Promise.all([
                        ApiService.previewOriginalFile(result.file_id),
                        ApiService.previewFile(result.file_id)
                    ]);
                    setSourcePreview(sourceData);
                    setPreviewData(parquetData);
                } catch (previewError) {
                    console.warn('Preview failed:', previewError.message);
                }
            }
        } catch (error) {
            setError(error.message);
            console.error('Upload failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const fetchPdfJson = async (outputItem) => {
        if (!folderResult) return;
        setJsonLoading(true);
        setJsonError(null);
        setSelectedPdfJson(null);
        setSelectedPage(null);
        try {
            // output_json is relative to backend dir and already starts with pdf_folder_extracted/
            const pathRel = (outputItem.output_json || '').replace(/^[.\\/]+/, '');
            const url = `${ApiService.getApiOrigin()}/${pathRel}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Failed to fetch JSON for ${outputItem.pdf_name}`);
            const data = await resp.json();
            setSelectedPdfJson(data);
        } catch (e) {
            setJsonError(e.message);
        } finally {
            setJsonLoading(false);
        }
    };

    const processFolder = async () => {
        if (!folderFiles || folderFiles.length === 0) {
            setError('Please select a folder that contains PDFs.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        setFolderResult(null);
        setSelectedPdf(null);
        setSelectedPdfJson(null);
        setSelectedPage(null);
        
        console.log(`🚀 Starting ${extractMode} folder upload: ${folderFiles.length} PDFs, estimated ~${extractMode === 'fast' ? Math.ceil(folderFiles.length * 0.05) : Math.ceil(folderFiles.length * 0.3)} minutes for ${(folderFiles.reduce((sum, f) => sum + f.size, 0) / (1024*1024)).toFixed(1)} MB`);
        
        try {
            const res = await ApiService.uploadPdfFolder(folderFiles, extractMode === 'complete');
            setFolderResult(res);
            console.log(`✅ Folder processing completed in ${(res.total_time_ms/1000).toFixed(2)}s using ${res.workers} workers (${res.extraction_mode})`);
            
            // Preselect first output
            if (res.outputs && res.outputs.length > 0) {
                const first = [...res.outputs].sort((a,b)=> (b.processing_time_ms||0)-(a.processing_time_ms||0))[0];
                setSelectedPdf(first);
                fetchPdfJson(first);
            }
        } catch (e) {
            setError(e.message);
            console.error('❌ Folder processing failed:', e);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadAllJsons = async () => {
        if (!folderResult?.outputs?.length) return;
        try {
            const paths = folderResult.outputs.map(o => (o.output_json || '').replace(/^[.\\/]+/, ''));
            const zipBlob = await ApiService.zipFolderJsons(paths);
            const name = folderName ? `${folderName}_jsons.zip` : 'pdf_jsons.zip';
            ApiService.downloadBlob(zipBlob, name);
        } catch (e) {
            setError(e.message || 'Failed to download ZIP');
        }
    };

    const downloadOriginalFile = async () => {
        if (!uploadResult?.file_id) return;
        
        try {
            const blob = await ApiService.downloadOriginalFile(uploadResult.file_id);
            ApiService.downloadBlob(blob, uploadResult.original_file.filename);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed: ' + error.message);
        }
    };

    const downloadParquetFile = async () => {
        if (!uploadResult?.file_id) return;
        
        try {
            const blob = await ApiService.downloadParquetFile(uploadResult.file_id);
            ApiService.downloadBlob(blob, uploadResult.parquet_file.filename);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed: ' + error.message);
        }
    };

    const getFileType = (file) => {
        if (file.type === 'application/pdf') return 'PDF';
        if (file.type === 'application/json') return 'JSON';
        if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) return 'CSV';
        return 'Unknown';
    };

    const formatFileSize = (bytes) => {
        return (bytes / 1024 / 1024).toFixed(2);
    };

    const formatMMSS = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

  return (
    <div className="fade-in" style={{ padding: '1rem' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                {/* Hamburger Menu Icon */}
                <button
                    onClick={() => {
                        console.log('Explorer hamburger clicked!');
                        if (onMenuClick) {
                            onMenuClick();
                        } else {
                            console.log('onMenuClick is not defined');
                        }
                    }}
                    style={{
                        background: 'rgba(63, 114, 175, 0.1)',
                        border: '1px solid rgba(63, 114, 175, 0.3)',
                        color: 'var(--main-color)',
                        borderRadius: '6px',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minWidth: '36px',
                        minHeight: '36px'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(63, 114, 175, 0.2)';
                        e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(63, 114, 175, 0.1)';
                        e.target.style.transform = 'scale(1)';
                    }}
                >
                    ☰
                </button>
                <h1 style={{ 
                    margin: 0,
                    fontSize: 'clamp(18px, 5vw, 28px)',
                    lineHeight: '1.2'
                }}>Checker and Maker</h1>
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0' }}>
                Upload your files and convert them to Parquet format for efficient data processing.
            </p>
        </div>
        
        {/* Mode Switch */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header" style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={mode === 'file' ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => { setMode('file'); setError(null); }}
            >
              Single File Upload
            </button>
            <button 
              className={mode === 'folder' ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => { setMode('folder'); setError(null); }}
            >
              Folder Upload (PDFs)
            </button>
          </div>
        </div>
        
        {/* Upload Section */}
        {mode === 'file' && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📁 File Upload
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Supported formats: PDF, JSON, CSV
                </p>
            </div>
            
            <div className="form-group">
                <label className="form-label">Select File</label>
                <input 
                    type="file" 
                    accept=".pdf,.json,.csv"
                    onChange={handleFileUpload} 
                    className="form-input"
                    style={{ marginBottom: '1rem' }}
                />
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Button 
                        onClick={processFile} 
                        disabled={!file || isProcessing}
                        variant="primary"
                        loading={isProcessing}
                        icon={isProcessing ? null : '🚀'}
                    >
                        {isProcessing ? `Processing... ${formatMMSS(timerSec)}` : 'Upload & Convert'}
                    </Button>
                    
                    {file && (
                        <div style={{ 
                            fontSize: '0.875rem', 
                            color: 'var(--text-color-light)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>📄</span>
                            <span>{file.name}</span>
                            <span>({formatFileSize(file.size)} MB)</span>
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {mode === 'folder' && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📂 Folder Upload (PDFs only) ⚡
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                <strong>Ultra-fast extraction:</strong> Select a folder with PDFs. Each PDF (130-150 pages) processes in ~3-5 seconds. 
                Total time for 10-14 PDFs: <strong>30 seconds - 2 minutes</strong>. Output JSONs saved in /pdf_folder_extracted.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Extraction Mode</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    value="fast"
                    checked={extractMode === 'fast'}
                    onChange={(e) => setExtractMode(e.target.value)}
                  />
                  <span>⚡ <strong>Ultra Fast</strong> (Text only - 30sec to 2min)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    value="complete"
                    checked={extractMode === 'complete'}
                    onChange={(e) => setExtractMode(e.target.value)}
                  />
                  <span>� <strong>Complete</strong> (Text + Tables - OPTIMIZED ~2-4min)</span>
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pick Folder</label>
              <input
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderPick}
                className="form-input"
                style={{ marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Button 
                  onClick={processFolder}
                  disabled={folderFiles.length === 0 || isProcessing}
                  variant="primary"
                  loading={isProcessing}
                  icon={isProcessing ? null : extractMode === 'fast' ? '⚡' : '📊'}
                >
                  {isProcessing ? `Processing... ${formatMMSS(timerSec)} ${extractMode === 'fast' ? '⚡' : '📊'}` : `${extractMode === 'fast' ? 'Ultra Fast' : 'Complete'} Extract ${folderFiles.length} PDFs`}
                </Button>
                {folderResult?.outputs?.length > 0 && (
                  <Button variant="outline" onClick={downloadAllJsons} icon="⬇️">
                    Download All JSONs
                  </Button>
                )}
                {folderFiles.length > 0 && (
                  <div style={{ color: 'var(--text-color-light)', fontSize: '0.9rem' }}>
                    📊 {folderFiles.length} PDFs • {(folderFiles.reduce((sum, f) => sum + f.size, 0) / (1024*1024)).toFixed(1)} MB
                    {isProcessing && (
                      <span style={{ color: extractMode === 'fast' ? 'var(--success-color)' : 'var(--info-color)', marginLeft: '1rem' }}>
                        {extractMode === 'fast' ? '⚡ Ultra-fast text extraction' : '📊 Complete extraction with tables'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {folderResult && (
              <div className="card" style={{ marginTop: '1rem' }}>
                <div className="card-header">
                  <strong>Folder Processing Summary{folderName ? ` — ${folderName}` : ''}</strong>
                </div>
                <div style={{ padding: '1rem' }}>
                  <p style={{ margin: 0 }}>
                    Status: <strong>{folderResult.status}</strong>
                  </p>
                  <p style={{ margin: 0 }}>
                    Processed PDFs: <strong>{folderResult.processed_count}</strong>
                    {typeof folderResult.workers === 'number' && (
                      <span style={{ marginLeft: 8, color: 'var(--text-color-light)' }}>with {folderResult.workers} threads</span>
                    )}
                  </p>
                  {typeof folderResult.total_time_ms === 'number' && (
                    <div>
                      <p style={{ margin: 0 }}>
                        Total Time: <strong>{(folderResult.total_time_ms/1000).toFixed(2)}s</strong>
                        <span style={{ color: 'var(--success-color)', marginLeft: '1rem' }}>
                          ⚡ Avg: {((folderResult.total_time_ms/1000) / Math.max(1, folderResult.processed_count)).toFixed(2)}s/PDF
                        </span>
                      </p>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
                        Performance: {folderResult.outputs?.length ? 
                          `${(folderResult.outputs.reduce((sum, o) => sum + (o.pages || 0), 0) / (folderResult.total_time_ms/1000)).toFixed(1)} pages/sec` : 
                          'N/A'
                        } • Workers: {folderResult.workers}
                      </p>
                      {(typeof folderResult.s3_uploads_successful === 'number' || typeof folderResult.s3_uploads_failed === 'number') && (
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
                          ☁️ S3 Uploads: <span style={{ color: 'var(--success-color)' }}>
                            {folderResult.s3_uploads_successful || 0} successful
                          </span>
                          {(folderResult.s3_uploads_failed || 0) > 0 && (
                            <span style={{ color: 'var(--error-color)', marginLeft: '0.5rem' }}>
                              • {folderResult.s3_uploads_failed} failed
                            </span>
                          )}
                          <span style={{ marginLeft: '0.5rem' }}>
                            ({folderResult.s3_upload_rate || 0}%)
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                  {folderResult.errors?.length > 0 && (
                    <div style={{ marginTop: '0.5rem', color: 'var(--error-color)' }}>
                      <strong>Errors:</strong>
                      <ul>
                        {folderResult.errors.map((e, idx) => (
                          <li key={idx}>{e.file}: {e.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {folderResult.outputs?.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <strong>Outputs (slowest → fastest):</strong>
                      <ul>
                        {[...folderResult.outputs]
                          .sort((a,b) => (b.processing_time_ms||0) - (a.processing_time_ms||0))
                          .map((o, idx) => (
                          <li key={idx}>
                            <Button
                              variant={selectedPdf?.pdf_name === o.pdf_name ? 'primary' : 'outline'}
                              size="small"
                              onClick={() => { setSelectedPdf(o); fetchPdfJson(o); }}
                              style={{ marginRight: 8 }}
                            >
                              {o.pdf_name}
                            </Button>
                            <span style={{ marginLeft: 8 }}>
                              {o.pages} pages — {o.processing_time_ms ? `${(o.processing_time_ms/1000).toFixed(2)}s` : 'n/a'}
                              {typeof o.page_workers === 'number' && (
                                <span style={{ marginLeft: 8, color: 'var(--text-color-light)' }}>page threads: {o.page_workers}</span>
                              )}
                              {typeof o.s3_upload === 'boolean' && (
                                <span style={{ marginLeft: 8 }}>
                                  {o.s3_upload ? (
                                    <span style={{ color: 'var(--success-color)' }}>☁️ S3✓</span>
                                  ) : (
                                    <span style={{ color: 'var(--error-color)' }} title={o.s3_error || 'S3 upload failed'}>☁️ S3✗</span>
                                  )}
                                </span>
                              )}
                            </span>
                            {' '}•{' '}
                            <a href={`${ApiService.getApiOrigin()}/${(o.output_json||'').replace(/^[.\\/]+/,'')}`} target="_blank" rel="noreferrer">Open JSON</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Folder Browser: Source PDFs (left) and JSON viewer (right) */}
                {folderResult.outputs?.length > 0 && (
                  <div style={{ margin: '1rem', borderTop: '1px solid #e9ecef', paddingTop: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                      {/* Left: Source PDFs list */}
                      <div className="card" style={{ border: '1px solid #e9ecef' }}>
                        <div className="card-header"><strong>📁 {folderName || 'Folder PDFs'}</strong></div>
                        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflow: 'auto' }}>
                          {[...folderResult.outputs]
                            .sort((a,b) => a.pdf_name.localeCompare(b.pdf_name))
                            .map((o) => (
                              <Button
                                key={o.pdf_name}
                                variant={selectedPdf?.pdf_name === o.pdf_name ? 'primary' : 'outline'}
                                size="small"
                                onClick={() => { setSelectedPdf(o); fetchPdfJson(o); }}
                                style={{ justifyContent: 'space-between' }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.pdf_name}</span>
                                <span style={{ marginLeft: 8, opacity: 0.7 }}>({o.pages})</span>
                              </Button>
                            ))}
                        </div>
                      </div>

                      {/* Right: JSON/Page viewer */}
                      <div className="card" style={{ border: '1px solid #e9ecef' }}>
                        <div className="card-header"><strong>🧩 JSON Viewer</strong></div>
                        <div style={{ padding: '0.75rem' }}>
                          {!selectedPdf ? (
                            <div style={{ color: 'var(--text-color-light)' }}>Select a PDF to view its extracted JSON</div>
                          ) : jsonLoading ? (
                            <div style={{ color: 'var(--text-color-light)' }}>Loading JSON...</div>
                          ) : jsonError ? (
                            <div style={{ color: 'var(--error-color)' }}>Error: {jsonError}</div>
                          ) : selectedPdfJson ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.9rem' }}>
                                  <strong>{selectedPdfJson.pdf_name}</strong> • {selectedPdfJson.total_pages} pages
                                </div>
                                <a
                                  className="btn btn-outline"
                                  href={`${ApiService.getApiOrigin()}/${(selectedPdf.output_json||'').replace(/^[.\\/]+/,'')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open Full JSON
                                </a>
                              </div>
                              {/* Pages buttons */}
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem', maxHeight: 120, overflow: 'auto' }}>
                                {selectedPdfJson.pages?.map(p => (
                                  <Button
                                    key={p.page_number}
                                    size="tiny"
                                    variant={selectedPage === p.page_number ? 'primary' : 'outline'}
                                    onClick={() => setSelectedPage(p.page_number)}
                                  >
                                    Pg {p.page_number}
                                  </Button>
                                ))}
                              </div>
                              {/* JSON content (page level) */}
                              <div style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: '0.5rem', maxHeight: 360, overflow: 'auto', background: 'var(--background-color)' }}>
                                {selectedPage ? (
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{`$${''}`}{JSON.stringify(selectedPdfJson.pages.find(p => p.page_number === selectedPage) || {}, null, 2)}
                                  </pre>
                                ) : (
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{`$${''}`}{JSON.stringify({ pdf_name: selectedPdfJson.pdf_name, total_pages: selectedPdfJson.total_pages }, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
            <div style={{ 
                marginBottom: '2rem', 
                padding: '1rem', 
                backgroundColor: 'rgba(220, 53, 69, 0.1)', 
                border: '1px solid var(--error-color)', 
                borderRadius: 'var(--border-radius)', 
                color: 'var(--error-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>❌</span>
                <div>
                    <strong>Error!</strong> {error}
                </div>
            </div>
        )}

        {/* Success Message */}
        {uploadSuccess && (
            <div style={{ 
                marginBottom: '2rem', 
                padding: '1rem', 
                backgroundColor: 'rgba(40, 167, 69, 0.1)', 
                border: '1px solid var(--success-color)', 
                borderRadius: 'var(--border-radius)', 
                color: 'var(--success-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <div>
                    <strong>Success!</strong> File uploaded and converted successfully.
                </div>
            </div>
        )}

        {/* Processing Results */}
        <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Processing Results</h2>
            <div className="grid grid-2" style={{ gap: '2rem' }}>
                {/* Left Section - Source File */}
                <div className="card" style={{ 
                    backgroundColor: 'rgba(63, 114, 175, 0.1)',
                    border: '2px solid var(--sub-color)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                            fontSize: '3rem', 
                            marginBottom: '1rem',
                            opacity: file ? 1 : 0.3
                        }}>
                            📄
                        </div>
                        <h3 style={{ color: 'var(--sub-color)', marginBottom: '1rem' }}>
                            Source File
                        </h3>
                        
                        {file && uploadResult ? (
                            <div style={{ textAlign: 'left' }}>
                                <div className="form-group">
                                    <span className="form-label">File Name:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.original_file.filename}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Size:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {formatFileSize(uploadResult.original_file.size)} MB
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Type:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.original_file.type}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Status:</span>
                                    <p style={{ 
                                        margin: '0.25rem 0', 
                                        fontWeight: '500',
                                        color: uploadSuccess ? 'var(--success-color)' : isProcessing ? 'var(--warning-color)' : 'var(--text-color-light)'
                                    }}>
                                        {uploadSuccess ? '✅ Processed' : isProcessing ? '🔄 Processing...' : '⏳ Ready to process'}
                                    </p>
                                </div>

                                {uploadSuccess && (
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                        <Button 
                                            variant="outline" 
                                            size="small"
                                            icon="⬇️"
                                            onClick={downloadOriginalFile}
                                        >
                                            Download Original
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : file ? (
                            <div style={{ textAlign: 'left' }}>
                                <div className="form-group">
                                    <span className="form-label">File Name:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{file.name}</p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Size:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {formatFileSize(file.size)} MB
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Type:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {getFileType(file)}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Status:</span>
                                    <p style={{ 
                                        margin: '0.25rem 0', 
                                        fontWeight: '500',
                                        color: 'var(--text-color-light)'
                                    }}>
                                        ⏳ Ready to process
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-color-light)', fontStyle: 'italic' }}>
                                No file uploaded yet
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Section - Converted Parquet File */}
                <div className="card" style={{ 
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    border: '2px solid var(--success-color)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                            fontSize: '3rem', 
                            marginBottom: '1rem',
                            opacity: uploadResult?.parquet_file ? 1 : 0.3
                        }}>
                            📊
                        </div>
                        <h3 style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>
                            Parquet File
                        </h3>
                        
                        {uploadResult?.parquet_file ? (
                            <div style={{ textAlign: 'left' }}>
                                <div className="form-group">
                                    <span className="form-label">File Name:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.parquet_file.filename}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Size:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {formatFileSize(uploadResult.parquet_file.size)} MB
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            color: 'var(--success-color)',
                                            marginLeft: '0.5rem'
                                        }}>
                                            ({Math.round((1 - uploadResult.parquet_file.size / uploadResult.original_file.size) * 100)}% smaller!)
                                        </span>
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Rows:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.parquet_file.row_count.toLocaleString()}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Type:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>Parquet</p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Status:</span>
                                    <p style={{ 
                                        margin: '0.25rem 0', 
                                        fontWeight: '500',
                                        color: 'var(--success-color)'
                                    }}>
                                        ✅ Ready for download
                                    </p>
                                </div>
                                
                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                    <Button 
                                        variant="success" 
                                        icon="⬇️"
                                        onClick={downloadParquetFile}
                                    >
                                        Download Parquet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-color-light)', fontStyle: 'italic' }}>
                                No converted file available yet
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Data Comparison Section: Original File vs Parquet File */}
        {previewData && sourcePreview && (
            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '3px solid var(--main-color)', paddingBottom: '0.5rem', letterSpacing: '0.5px' }}>
                    Compare Source File vs Parquet File
                </h2>
                <div className="split-layout" style={{ position: 'relative' }} >
                    {/* Source File in Original Format */}
                    <div className="split-pane">
                        <SourceFileViewer
                            file={{
                                original_filename: uploadResult?.original_file?.filename || file?.name,
                                file_id: uploadResult?.file_id,
                                file_size: file?.size,
                                upload_timestamp: uploadResult?.upload_time
                            }}
                            title={uploadResult?.original_file?.filename ? `Source: ${uploadResult.original_file.filename}` : 'Source File (Original Format)'}
                        />
                    </div>
                    {/* Vertical Divider */}
                    <div className="split-divider" />
                                          {/* Parquet File */}
                      <div className="split-pane">
                        <h3 style={{ marginBottom: '1rem', color: 'var(--sub-color)' }}>
                        📊 Parquet Data Preview (Table Format)
                       </h3>
                        <DataTable
                        columns={previewData.columns}
                        data={previewData.preview}
                        title="Parquet Data Table"
                        fileType={previewData.file_type}
                        maxHeight="500px"
                        showFullData={false}
                    />
                    </div>
                </div>
            

                
                {/* Horizontal Bar for separation */}
                <div style={{ margin: '2rem 0 0 0', height: '6px', width: '100%', background: 'linear-gradient(to right, var(--main-color), var(--sub-color))', borderRadius: '3px' }} />
            </div>
        )}
    </div>
  )
}

export default Explorer