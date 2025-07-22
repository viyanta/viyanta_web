import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../services/api.js';

const StatsContext = createContext();

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};

export const StatsProvider = ({ children }) => {
  const [stats, setStats] = useState({
    total_files: 0,
    processed_files: 0,
    processing_files: 0,
    failed_files: 0,
    total_size_mb: 0,
    total_parquet_size_mb: 0,
    last_activity: null,
    recent_files: []
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshStats = async () => {
    try {
      const [statsResponse, filesResponse] = await Promise.all([
        ApiService.getStats(),
        ApiService.getFiles()
      ]);
      
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
      
      if (filesResponse.success) {
        setFiles(filesResponse.files);
      }
      
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to refresh stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const addFile = (fileData) => {
    // Add new file to the local state immediately for better UX
    setFiles(prev => [fileData, ...prev]);
    setStats(prev => ({
      ...prev,
      total_files: prev.total_files + 1,
      processing_files: prev.processing_files + 1
    }));
  };

  const updateFileStatus = (fileId, status, additionalData = {}) => {
    setFiles(prev => prev.map(file => 
      file.file_id === fileId 
        ? { ...file, status, ...additionalData }
        : file
    ));
    
    // Update stats based on status change
    setStats(prev => {
      const updates = { ...prev };
      
      if (status === 'completed') {
        updates.processed_files = prev.processed_files + 1;
        updates.processing_files = Math.max(0, prev.processing_files - 1);
      } else if (status === 'failed') {
        updates.failed_files = prev.failed_files + 1;
        updates.processing_files = Math.max(0, prev.processing_files - 1);
      }
      
      return updates;
    });
  };

  useEffect(() => {
    refreshStats();
    
    // Set up interval to refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const value = {
    stats,
    files,
    loading,
    error,
    refreshStats,
    addFile,
    updateFileStatus
  };

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
};

export default StatsContext;
