import React from "react";

export default function SchemaExplorer({ schema, onAddTable }) {
  if (!schema || !schema.tables) return <div>No schema loaded yet.</div>;

  return (
    <div className="schema-explorer">
      <h3>Schema</h3>
      <div className="schema-list">
        {schema.tables.map((tbl) => (
          <div
            key={tbl.name}
            className="table-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/json", JSON.stringify(tbl));
              e.dataTransfer.effectAllowed = "copy";
            }}
            onDoubleClick={() => onAddTable(tbl)}
            style={{ marginBottom: 8 }}
          >
            <div style={{ fontWeight: 600, color: "#0f1724" }}>
              {tbl.label || tbl.name}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {tbl.schema ? `${tbl.schema}.${tbl.name}` : tbl.name}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
        Tip: double-click a table to add to canvas
      </div>
    </div>
  );
}
