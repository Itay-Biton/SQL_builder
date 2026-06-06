import React from "react";

export default function QueryPreview({ sql, json }) {
  // Query execution moved to the canvas-level Execute button.
  return (
    <div>
      <h3>SQL Preview</h3>
      <textarea
        readOnly
        value={sql}
        style={{
          width: "100%",
          boxSizing: "border-box",
          maxWidth: "100%",
          height: 220,
          background: "#ffffff",
          color: "#0f1724",
          border: "1px solid #eef3f8",
          padding: 8,
          resize: "none",
        }}
      />
      <div style={{ marginTop: 8, color: "#6b7280" }}>
        Execute queries using the floating "Execute Query" button on the canvas.
      </div>
    </div>
  );
}
