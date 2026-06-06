import React from "react";

export default function HelpModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "820px",
          maxWidth: "94%",
          maxHeight: "86%",
          background: "#fff",
          borderRadius: 8,
          padding: 18,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>Help — How to use Visual SQL Builder</h2>
          <button onClick={onClose} style={{ marginLeft: 12 }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 12, lineHeight: 1.45 }}>
          <p>
            This UI helps you build SELECT queries visually. Below are the main
            actions and tips to get started.
          </p>

          <h3>1. Add tables</h3>
          <p>
            Use the left <strong>Schema Explorer</strong> to browse available
            tables. Click a table to add it to the canvas. The app attempts to
            auto-detect joins based on column names (e.g. <em>user_id</em> →
            <em>users.id</em>).
          </p>

          <h3>2. Position and inspect tables</h3>
          <p>
            Drag table nodes on the canvas to arrange them. Click a table to
            expand its columns and choose which columns to include in the SELECT
            list.
          </p>

          <h3>3. Select columns and aggregates</h3>
          <p>
            Click column checkboxes to add columns to the query. You can toggle
            aggregates, output aliases, and reorder columns from the right-hand
            preview panels.
          </p>

          <h3>4. Joins</h3>
          <p>
            Joins are created automatically when a matching foreign-key-like
            column is detected. You can also edit or remove joins from the
            canvas or the joins list.
          </p>

          <h3>5. Filters and WHERE clauses</h3>
          <p>
            Add filters using the filters panel to restrict results. Multiple
            filters are combined using AND by default; use grouping or
            expressions where supported.
          </p>

          <h3>6. Preview and generated SQL</h3>
          <p>
            The right column shows the generated SQL and a JSON representation
            of the current query. Use this to inspect the final query text and
            copy it to run against your database.
          </p>

          <h3>7. Save and load</h3>
          <p>
            Use the <strong>New</strong> button to clear the canvas. Use the
            Save action in the UI (if present) to store queries to localStorage.
            Saved queries use keys like <code>vsql_[id]</code>.
          </p>

          <h3>8. Layout and resizing</h3>
          <p>
            Drag the vertical and horizontal resizers to resize the sidebar,
            preview, and results panels. The app remembers sizes while the page
            is open.
          </p>

          <h3>Troubleshooting</h3>
          <ul>
            <li>
              If a table can't be added, a join path may not exist in the
              schema.
            </li>
            <li>
              Use unique aliases if you add the same base table multiple times;
              the UI will auto-create non-conflicting aliases.
            </li>
            <li>
              This application does not execute queries against a live DB; it
              only generates SQL text.
            </li>
          </ul>

          <p style={{ marginTop: 12 }}>
            For more details see the project notes and usage docs in the
            repository (visual_sql_query_builder_ui_logic.md).
          </p>
        </div>
      </div>
    </div>
  );
}
