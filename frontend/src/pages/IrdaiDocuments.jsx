import React, { useState } from 'react';
import './IrdaiDocuments.css';

const IrdaiDocuments = () => {
    const [selectedYear, setSelectedYear] = useState('FY2025');

    const years = ['FY2025', 'FY2024', 'FY2023', 'FY2022', 'FY2021'];

    // Dummy data structure matches the screenshot
    const allDocuments = {
        'FY2025': [
            { date: '31-03-2024', name: 'Dec-24', fileName: 'IRDAI Monthly Data December 2024.xlxs' },
            { date: '31-12-2023', name: 'Nov-24', fileName: 'IRDAI Monthly Data November 2024.xlxs' },
            { date: '31-03-2024', name: 'Oct-24', fileName: 'IRDAI Monthly Data October 2024.xlxs' },
            { date: '30-09-2023', name: 'Sep-24', fileName: 'IRDAI Monthly Data September 2024.xlxs' },
            { date: '30-09-2023', name: 'Aug-24', fileName: 'IRDAI Monthly Data August 2024.xlxs' },
        ],
        'FY2024': [
            { date: '31-03-2023', name: 'Mar-24', fileName: 'IRDAI Monthly Data March 2024.xlxs' },
            { date: '28-02-2023', name: 'Feb-24', fileName: 'IRDAI Monthly Data February 2024.xlxs' },
        ],
        // Add minimal dummy data for others to avoid empty tables
        'FY2023': [],
        'FY2022': [],
        'FY2021': []
    };

    const documents = allDocuments[selectedYear] || [];

    return (
        <div className="irdai-documents-container">

            <div className="filters-container">
                <div className="filter-item">
                    <label className="filter-label">Select FY Year</label>
                    <select
                        className="filter-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="documents-table-section">
                <table className="documents-table">
                    <thead>
                        <tr>
                            <th>Report Date</th>
                            <th>Name</th>
                            <th>File Name</th>
                            <th>Open File</th>
                            <th>Download File</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.length > 0 ? (
                            documents.map((doc, index) => (
                                <tr key={index}>
                                    <td>{doc.date}</td>
                                    <td>{doc.name}</td>
                                    <td>{doc.fileName}</td>
                                    <td className="action-cell">
                                        <span className="icon-placeholder open-icon" title="Open">📂</span>
                                    </td>
                                    <td className="action-cell">
                                        <span className="icon-placeholder download-icon" title="Download">⬇️</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="no-data-cell">No documents found for {selectedYear}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

    );
};

export default IrdaiDocuments;
