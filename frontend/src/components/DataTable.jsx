import React from "react";

const DataTable = ({ title, columns, data }) => {
  return (
    <div className="table-container" style={{ marginBottom: "2rem" }}>
      <h3>{title}</h3>
      <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ background: "#f2f2f2" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr key={rIdx}>
              {columns.map((col, cIdx) => (
                <td key={cIdx}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
