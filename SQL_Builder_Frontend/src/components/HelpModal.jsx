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
            Build <strong>SELECT</strong> queries visually, preview the generated
            SQL, run queries against the connected database, and export results.
          </p>

          <h3>Layout</h3>
          <ul>
            <li>
              <strong>Top bar</strong> — your username, <strong>New</strong>,{" "}
              <strong>Help</strong>, and <strong>Logout</strong>
            </li>
            <li>
              <strong>Schema panel</strong> (left) — browse database tables
            </li>
            <li>
              <strong>Canvas</strong> (center) — place and connect tables
            </li>
            <li>
              <strong>Bottom panel</strong> — <strong>SQL Query</strong> tab
              (live SQL preview) and <strong>Results</strong> tab (query output)
            </li>
          </ul>
          <p>
            Drag the dividers between the sidebar and bottom panel to resize
            them.
          </p>

          <h3>1. Add tables</h3>
          <p>
            Use the <strong>Schema</strong> list on the left. Either{" "}
            <strong>double-click</strong> a table or <strong>drag and drop</strong>{" "}
            it onto the canvas. Each table appears as a card with its name,
            alias, and columns.
          </p>
          <ul>
            <li>The same physical table cannot be added twice.</li>
            <li>
              When you add another table, the app auto-detects joins from
              foreign-key-like columns (e.g. <em>user_id</em> →{" "}
              <em>users.id</em>).
            </li>
            <li>
              If no direct join exists, intermediate tables may be added along
              a schema path. If no path exists, the table is rejected —{" "}
              <strong>cross joins are not allowed</strong>.
            </li>
          </ul>

          <h3>2. Work on the canvas</h3>
          <ul>
            <li>
              <strong>Move tables</strong> — drag a table card by its header
            </li>
            <li>
              <strong>Pan</strong> — click and drag empty canvas space or join
              lines
            </li>
            <li>
              <strong>Zoom</strong> — hold Ctrl (Windows/Linux) or Cmd (Mac) and
              scroll the mouse wheel
            </li>
            <li>
              <strong>Remove</strong> — click Remove on a table card. If other
              tables depend on it through joins, you are asked to confirm
              removal of those tables too.
            </li>
            <li>
              <strong>Rename display title</strong> — double-click the table
              title (this does not change the SQL table name). You can embed a
              row limit in the title, e.g. <code>My Report (limit=500)</code>.
            </li>
          </ul>

          <h3>3. Select columns</h3>
          <p>
            Use column <strong>checkboxes</strong> to include or exclude columns
            in the SELECT list.
          </p>
          <p>
            <strong>Right-click a table header</strong> for quick actions:
          </p>
          <ul>
            <li>
              <strong>Tick All</strong> / <strong>Untick All</strong> — select
              or clear all columns on that table
            </li>
            <li>
              <strong>Count(*)</strong> — add a COUNT(*) aggregate (only one
              COUNT(*) can be active at a time)
            </li>
            <li>
              <strong>Limit</strong> — set or disable the global LIMIT row cap
              (default is 1000)
            </li>
          </ul>

          <h3>4. Column options</h3>
          <p>
            <strong>Right-click any column</strong> to open a context menu:
          </p>
          <ul>
            <li>
              <strong>Set Column Alias</strong> — rename the column in the
              output
            </li>
            <li>
              <strong>Filter</strong> — add a WHERE condition
            </li>
            <li>
              <strong>Manage Filters</strong> — view, remove, or add filters
              for this column
            </li>
            <li>
              <strong>Aggregate</strong> — Min, Max, Count(distinct), Avg, or
              Sum
            </li>
            <li>
              <strong>Order Ascending / Descending</strong> — add ORDER BY; click
              again to remove or switch direction
            </li>
            <li>
              <strong>Group By</strong> — add the column to GROUP BY
            </li>
          </ul>
          <p>A checkmark (✓) next to a menu item means it is already active.</p>

          <h3>5. Filters</h3>
          <p>
            Choose <strong>Filter</strong> from a column&apos;s context menu.
            Options depend on column type:
          </p>
          <ul>
            <li>
              <strong>Text</strong> — Contains, Equals, Starts with, Ends with
            </li>
            <li>
              <strong>Numbers</strong> — &gt;, &gt;=, &lt;, &lt;=, =, !=, or
              Between
            </li>
            <li>
              <strong>Dates</strong> — On (exact date), or Between two dates
            </li>
          </ul>
          <p>
            Use <strong>Combine with</strong> (AND / OR) and the <strong>NOT</strong>{" "}
            checkbox to combine conditions. Click <strong>Apply</strong> to add
            a filter. Use <strong>Manage Filters</strong> to remove individual
            filters or clear all filters.
          </p>

          <h3>6. Joins</h3>
          <p>
            Joins are created automatically when tables are added. A line
            connects joined tables with a <strong>join toggle</strong> at the
            midpoint. Click the toggle to cycle through:{" "}
            <strong>LEFT → RIGHT → INNER → FULL</strong>. Blue = left table,
            green = right table.
          </p>

          <h3>7. Preview and run</h3>
          <ul>
            <li>
              <strong>SQL Query tab</strong> — shows generated SQL as you
              build. It updates live and cannot be edited directly.
            </li>
            <li>
              <strong>Execute Query</strong> — blue button at the bottom-left
              of the canvas. Disabled until at least one column is selected and
              valid SQL can be generated. After running, the app switches to
              the Results tab. There is a short cooldown between runs.
            </li>
            <li>
              <strong>Results tab</strong> — view rows in a scrollable table.
              Use <strong>Save as XLSX</strong> to download results as an Excel
              file. Server errors are shown in red.
            </li>
          </ul>

          <h3>8. Top bar</h3>
          <ul>
            <li>
              <strong>New</strong> — clear the canvas and start a fresh query
            </li>
            <li>
              <strong>Help</strong> — open this dialog
            </li>
            <li>
              <strong>Logout</strong> — sign out of your account
            </li>
          </ul>

          <h3>Quick workflow</h3>
          <ol>
            <li>Add tables from the schema (double-click or drag).</li>
            <li>Check the columns you need.</li>
            <li>
              Right-click columns to add filters, aggregates, sorting, or
              grouping.
            </li>
            <li>Adjust join types if needed.</li>
            <li>Review SQL in the SQL Query tab.</li>
            <li>Click Execute Query.</li>
            <li>View or export results from the Results tab.</li>
          </ol>

          <h3>Troubleshooting</h3>
          <ul>
            <li>
              <strong>&quot;Table already added to canvas&quot;</strong> — each
              physical table can only appear once.
            </li>
            <li>
              <strong>&quot;Cannot add table: no join detected…&quot;</strong>{" "}
              — no foreign-key path exists between the new table and tables
              already on the canvas.
            </li>
            <li>
              <strong>Execute Query is disabled</strong> — select at least one
              column. The SQL must not be empty or an error (e.g. multiple
              tables with no joins).
            </li>
            <li>
              <strong>Aggregates and GROUP BY</strong> — non-aggregated selected
              columns are automatically included in GROUP BY. You can also add
              explicit Group By from the column menu.
            </li>
            <li>
              <strong>Default row limit</strong> — queries use LIMIT 1000 by
              default. Change it via the table header menu (Limit) or by typing{" "}
              <code>limit=NNN</code> in a table title.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
