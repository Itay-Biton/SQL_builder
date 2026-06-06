# Visual SQL Query Builder - UI Logic Specification

## 1. Purpose

This document defines the UI logic for a local web-view based visual SQL query builder.
The goal is to let users build `SELECT` queries visually before any real backend is connected.
The frontend must own the full interactive query-design experience and keep a canonical client-side query model that can later be sent to a backend server.

The UI should follow the interaction style suggested by your examples:
- tables shown as draggable cards on a canvas
- per-column checkboxes for selecting output columns
- visual join lines between tables
- per-column menus for alias, filter, aggregate, and sort
- live SQL preview
- results panel at the bottom with export options

This spec is frontend-first. It describes how the UI behaves, what state it owns, what events it emits, and what data structures it should maintain so backend integration is easy later.

---

## 2. Product Goals

### 2.1 Main goals

1. Users can drag tables from a schema sidebar onto a central canvas.
2. Users can visually join tables by connecting columns.
3. Users can choose output columns, aliases, filters, aggregations, grouping, and sort order.
4. The UI continuously generates a live SQL preview from the current query model.
5. A bottom panel shows results returned by a future backend and supports export.
6. Queries can be saved locally for now, then replaced later with server-side persistence.
7. Authentication controls can exist in the UI now as placeholders and be wired later.

### 2.2 Non-goals for phase 1

These features should not be implemented now unless explicitly needed later:
- INSERT, UPDATE, DELETE, MERGE, DDL, or schema editing
- stored procedures
- database administration
- collaboration or multi-user editing
- role/permission management
- natural language to SQL
- direct SQL text editing as the main source of truth

The source of truth should be the visual query model, not the raw SQL text.

---

## 3. High-Level Layout

Desktop-first layout is recommended.
Minimum target width: `1280px`.
Minimum target height: `720px`.

Suggested shell:

```text
+--------------------------------------------------------------------------------------+
| Top bar: logo | query name | new | save | saved queries | run | clear | login/out   |
+---------------------------+-------------------------------------+------------------+
| Schema Explorer           | Main Canvas / Drag-and-Drop Area    | SQL Preview      |
|                           |                                     |                  |
|                           |                                     |                  |
|                           |                                     |                  |
+--------------------------------------------------------------------------------------+
| Results Panel: tabs + row count + export + result grid                               |
+--------------------------------------------------------------------------------------+
```

### 3.1 Regions

#### Top bar
Contains global actions and session-level controls.

#### Left sidebar
Contains searchable database schema metadata and drag source items.

#### Center canvas
Main visual design surface. Tables are dropped here and joined here.

#### Right panel
Collapsible live SQL preview and validation panel.

#### Bottom panel
Collapsible/resizable results area that later shows backend results and export actions.

---

## 4. Core UX Principles

1. **Visual state is always authoritative.**
   Every UI action updates the query model first.

2. **Preview is immediate.**
   Any change to tables, joins, columns, filters, or sorting updates the SQL preview.

3. **Backend integration is adapter-based.**
   The UI should not be tightly coupled to one API design.

4. **Desktop workflow first.**
   This app is primarily a workbench, not a mobile-first interface.

5. **Fast repeated actions.**
   Column selection, join editing, filtering, and sorting must require minimal clicks.

6. **Safe validation.**
   The UI should warn on invalid query structures before a run is attempted.

7. **State must be serializable.**
   Everything needed to restore a query should be stored in JSON.

---

## 5. Main UI Components

## 5.1 Top Bar

### Required controls

- App title or logo
- Editable query title
- `New Query`
- `Save`
- `Save As`
- `Saved Queries`
- `Run`
- `Cancel Run` (hidden unless running)
- `Clear`
- `Undo`
- `Redo`
- `Login` / `Logout` placeholder
- Optional future `Connection` selector
- Optional `Settings`

### Button behavior

#### New Query
- Creates a blank query model.
- If current query is dirty, ask for confirmation first.
- Resets canvas, joins, selections, preview state, and results.

#### Save
- Saves current query to local storage for phase 1.
- If the query has no name, open a save modal.
- Save should be allowed even if the query is currently invalid, because the user may want to keep unfinished work.

#### Save As
- Always opens a save modal and creates a new saved entry.

#### Saved Queries
- Opens a modal or right drawer listing saved queries.
- User can search, load, rename, duplicate, or delete saved queries.

#### Run
- Executes the current query through a future adapter.
- Disabled if validation fails.
- Enabled when the query model is valid.

#### Cancel Run
- Visible only while a query is running.
- Calls the run adapter cancel method if supported.
- If cancel is not supported yet, show disabled placeholder state.

#### Clear
- Removes all tables and resets the query design area.
- Asks for confirmation if the canvas is not empty.

#### Undo / Redo
- Works on visual model changes.
- Does not need to version returned results.
- Should store a bounded history stack, for example 50 states.

#### Login / Logout placeholder
- Present in the UI now, but can be disabled with a tooltip:
  `Authentication will be connected later.`
- The control should already support 3 visual states:
  - logged out
  - logged in
  - pending

### Top bar validation indicators

Show a compact status region:
- `Valid` when run is allowed
- `Warnings` if there are non-blocking issues
- `Invalid` if blocking issues exist

Examples of blocking issues:
- duplicate table alias
- disconnected table graph without explicit cross join
- invalid aggregate usage
- no selected output columns
- invalid filter value

---

## 5.2 Left Sidebar: Schema Explorer

### Purpose
Display available database objects and serve as the drag source for the canvas.

### Required features

- Search input for tables and columns
- Expand/collapse database, schema, and table groups
- Show tables and views
- Show column metadata
- Drag table/view onto canvas
- Double-click table/view to add it to canvas
- Optional badges for PK, FK, nullable, row estimate, or data type

### Recommended sidebar width
`280px` to `340px`

### Data required from schema source

For each table:
- database name
- schema name
- table name
- display label
- object type (`table`, `view`, `materialized_view`)
- columns
- primary key info
- foreign key info if available

For each column:
- name
- display label
- data type
- nullable
- isPrimaryKey
- isForeignKey
- referenced table/column if foreign key exists

### Interaction rules

#### Dragging a table
- Dragging begins from the table item, not individual columns in the sidebar.
- On drop into canvas, create a new table node.
- If dropped outside the canvas, do nothing.

#### Double-click add
- Adds the table to the canvas at an auto-generated position.
- If the same physical table is already on the canvas, allow adding again as a second alias for self-join scenarios.

#### Search behavior
- Search should match table names, schema names, and column names.
- Matching text should be highlighted.
- Search is debounced by about `150ms`.

#### Empty states
- If no schema is loaded: `No schema loaded yet.`
- If search returns nothing: `No tables or columns match your search.`

---

## 5.3 Center Canvas: Query Design Surface

### Purpose
This is the main work area for placing tables and visually building a query.

### Required behaviors

- Supports drag-and-drop table placement
- Supports panning
- Supports optional zoom
- Supports table node repositioning
- Supports join line creation and editing
- Supports node selection and focus
- Supports context menus on table nodes, columns, and joins
- Supports empty-state hints when no tables are present

### Empty state copy

When the canvas is empty, show:

```text
Drag tables here to start building a query.
You can also double-click a table in the schema explorer.
```

### Canvas interactions

#### Panning
- Mouse drag on empty canvas pans the viewport.
- Trackpad scrolling should pan naturally.
- Optional spacebar + drag for pan mode.

#### Zoom
- Optional but useful.
- Mouse wheel with modifier key can zoom.
- Keep zoom between `0.5` and `1.5` initially.
- Include `Reset View` in a small canvas toolbar if zoom is enabled.

#### Auto placement
When a table is added without explicit drop coordinates:
- place it near the center if it is the first table
- otherwise place it offset from the most recently added table
- avoid exact overlap with existing nodes

#### Selection states
Only one of the following can be the active inspector target at a time:
- table node
- column row
- join line

---

## 5.4 Table Node Component

Each dropped table becomes a node on the canvas.

### Node header contents

- table display name
- short alias badge or alias text input
- optional schema badge
- actions menu
- collapse/expand control
- remove control

### Header actions

- Edit alias
- Set as base table
- Select all columns
- Clear selected columns
- Collapse all columns
- Duplicate table node
- Remove table

### Alias rules

- Every node must have a unique alias.
- Default alias generation should be deterministic and collision-safe.
- Suggested default strategy:
  - use initials from the table name if possible
  - if alias exists, append a number
  - examples: `partner_stores -> ps`, next duplicate `ps2`
- Alias changes must update all joins, selected columns, filters, sort items, and preview SQL immediately.

### Column row contents

Each column row should show:
- output checkbox
- data type icon or short type marker
- column name
- badges or markers for PK/FK
- small status markers for selected/filter/sort/group/aggregate
- optional join handles on left and right edges

### Node body behavior

- Scroll inside the table if there are many columns.
- Preserve internal scroll position if the user returns to the node.
- Allow collapse to header-only mode.

### Visual states

- default
- hovered
- selected
- invalid
- has warnings
- collapsed

### Remove behavior

Removing a table node must also remove:
- all joins attached to it
- all selected columns from that table
- all filters targeting that table
- all sorts targeting that table
- all group-by items targeting that table

Before removal, show a confirmation only if the node is part of an existing query design. For quick workflows, a lightweight undo may be enough instead of always prompting.

---

## 5.5 Column Interaction Logic

This is one of the most important parts of the UI.

### Primary action: output selection

- The checkbox toggles whether the column appears in the `SELECT` list.
- When selected, the column becomes an item in the query model `select` array.
- When deselected, all output-only settings for that selected expression are removed.
- If that column also has filter or sort logic, those may remain unless explicitly removed.

### Column context menu

Use a context menu similar to your reference image.
Recommended actions:

- `Set Column Alias`
- `Add / Join`
- `Tick All` (table-level if right-click header)
- `Untick All` (table-level if right-click header)
- `Filter`
- `Aggregate >`
  - `Min`
  - `Max`
  - `Count(*)`
  - `Count(distinct column)`
  - `Avg`
  - `Sum`
- `Order Ascending`
- `Order Descending`
- `Group By`
- `Remove Expression`

### Data type rules for aggregate options

#### Numeric columns
Allow:
- Min
- Max
- Count(*)
- Count(distinct)
- Avg
- Sum

#### Text columns
Allow:
- Min
- Max
- Count(*)
- Count(distinct)

#### Date and datetime columns
Allow:
- Min
- Max
- Count(*)
- Count(distinct)

#### Boolean columns
Allow:
- Count(*)
- Count(distinct)

### Alias behavior

`Set Column Alias` changes the output label only, not the underlying physical column.
Example:

```sql
ps.url AS store_url
```

### Selection order

The order of selected columns matters.
The UI should preserve a stable `SELECT` order.
Recommended rule:
- selection order follows the order in which expressions are added
- allow drag-and-drop reordering later if needed

### Sort indicators

If a column is sorted:
- show direction indicator (`ASC` or `DESC`)
- show sort priority number (`1`, `2`, `3`, ...)

### Grouping behavior

When the first aggregate is introduced:
- the query enters aggregate mode
- all selected non-aggregated columns are automatically marked as `GROUP BY`
- show a toast: `Grouping applied to non-aggregated selected columns.`

This avoids invalid SQL while keeping the UI simple.

### Aggregate mode behavior

While aggregate mode is active:
- non-aggregated selected columns must belong to `GROUP BY`
- filters on aggregated expressions go to `HAVING`
- filters on non-aggregated expressions stay in `WHERE`

---

## 5.6 Join Creation and Editing

### Join creation methods

Support both methods:

1. Drag from one column handle to another column handle.
2. Use `Add / Join` from the column context menu and then click a target column.

### Join compatibility rules

The UI should allow any join the user intentionally creates, but should visually help with likely matches.

#### If foreign key metadata exists
- highlight suggested target columns
- if exactly one obvious FK relationship exists when a table is dropped near another, auto-suggest or auto-create the join

#### If no metadata exists
- still allow manual joins
- do not block joins only because type metadata is missing

### Join types

Required join types in the UI:
- INNER JOIN
- LEFT JOIN
- RIGHT JOIN
- FULL OUTER JOIN
- CROSS JOIN

Even if some backends do not support every join type later, the UI should be ready for them.

### Join editor behavior

Clicking a join line opens a small editor popover or right-side inspector.
It must allow:
- join type selection
- one or more join predicates
- predicate operator selection (`=`, `!=`, `>`, `<`, `>=`, `<=`)
- delete join

### Multi-condition joins

Support joins like:

```sql
ON a.id = b.id AND a.tenant_id = b.tenant_id
```

### Join graph validation

- The query should have a connected graph unless the user explicitly uses `CROSS JOIN`.
- Disconnected tables should show a warning or validation error.
- Joining a table to itself is allowed only when it is represented by separate node instances with different aliases.

### Cartesian product warning

If a table exists on the canvas without a join path to the base table:
- block run
- show message: `This query contains unjoined tables and would create a cartesian product.`

If the user explicitly creates `CROSS JOIN`, allow run but show a warning badge.

---

## 5.7 Filters

### Filter locations

Support two ways to add filters:
- column context menu > `Filter`
- optional global filters panel section in the right panel

### Filter UI behavior

When a filter is added:
- a filter chip or marker appears on the column row
- a full filter editor opens
- the filter is inserted into the query model

### Filter data model fields

Each filter needs:
- target table node id
- target column name or expression id
- operator
- value or values
- logical connector (`AND` / `OR`)
- scope (`WHERE` or `HAVING`)

### Operators by data type

#### String
- equals
- not equals
- contains
- starts with
- ends with
- in
- not in
- is null
- is not null

#### Number
- equals
- not equals
- greater than
- greater than or equal
- less than
- less than or equal
- between
- in
- not in
- is null
- is not null

#### Date / datetime
- equals
- before
- after
- between
- is null
- is not null

#### Boolean
- is true
- is false
- is null
- is not null

### Validation rules

- null operators must not require a value
- `between` must require two values
- `in` and `not in` accept arrays or comma-separated input
- invalid filter values block `Run`

### HAVING rules

If a filter targets an aggregated expression, place it in `HAVING`.
Otherwise place it in `WHERE`.

---

## 5.8 Ordering

Ordering can be applied from the column context menu or from a future order panel.

### Required behavior

- multiple order rules are allowed
- each order rule has a priority number
- priorities are stable and editable by sequence
- removing an order rule renumbers remaining priorities

Example:

```sql
ORDER BY nl.order_date DESC, nl.company ASC
```

---

## 5.9 SQL Preview Panel

The reference image strongly suggests a live SQL panel. This should be part of the design.

### Panel purpose

- show generated SQL in real time
- expose query validation messages
- help users trust what the visual builder is doing

### Recommended width
`320px` to `420px`

### Panel sections

Use tabs or stacked sections:
- `SQL`
- `Query JSON`
- `Validation`

### SQL section behavior

- read-only in phase 1
- syntax highlighted if convenient
- includes `Copy SQL` button
- updates immediately when the query model changes

### Query JSON section

Show the exact serializable query model used by the UI.
This is useful for later backend integration and debugging.

### Validation section

Show:
- blocking errors
- warnings
- suggestions

Examples:
- `No output columns selected.`
- `Table alias ps is duplicated.`
- `AVG cannot be applied to text column company.`
- `Cross join may return a very large result set.`

### Preview generation rules

The frontend should generate SQL from the visual model using a dialect adapter.
The UI should remain dialect-neutral internally.

Default preview behavior for phase 1:
- generate ANSI-like SQL
- use aliases
- do not force quoted identifiers unless a dialect adapter requests it

---

## 5.10 Bottom Results Panel

### Purpose
Show the result of running the built query and allow export.

### Required features

- resizable height
- collapse/expand
- result table/grid
- row count
- export actions
- empty/loading/error states
- optional messages tab

### Recommended default height
`240px` to `320px`

### Tabs

Required:
- `Results`
- `Messages`

Optional later:
- `Execution`
- `Raw response`

### Results grid requirements

- sticky header
- horizontal scroll for wide result sets
- virtualized rows for performance
- column resize
- copy cell value
- show null values clearly

### Results states

#### Not run yet
`Run a query to see results.`

#### Running
Show loading spinner and text:
`Running query...`

#### Success with rows
Show grid, row count, duration if available.

#### Success with no rows
`Query ran successfully but returned no rows.`

#### Error
Show backend error message area.

### Export behavior

Export dropdown should support at least:
- CSV
- JSON
- XLSX (optional now, but prepare UI entry)

Rules:
- export is disabled if there are no rows
- export uses current result set in memory
- filename should include query name and timestamp

Examples:
- `sales_by_country_2025-04-18_141530.csv`
- `untitled_query_2025-04-18_141530.json`

### SQL export

Also include `Download SQL` or `Copy SQL` near results or preview.
This is separate from result export.

---

## 5.11 Saved Queries

### Storage phase 1
Use `localStorage` or `IndexedDB`.
`localStorage` is acceptable for the first version if query sizes stay small.

### Saved query fields

Each saved query entry should include:
- `id`
- `name`
- `description` optional
- `createdAt`
- `updatedAt`
- `queryModel`
- `generatedSql` optional snapshot
- `tags` optional

### Saved Queries UI actions

- search by name
- sort by updated date
- load
- rename
- duplicate
- delete

### Dirty state rules

If the current query differs from its last saved version:
- show unsaved indicator near query title
- prompt before replacing it with another query

### Restore behavior

Loading a saved query must restore:
- table nodes
- node positions
- node aliases
- selected columns
- filters
- group-by state
- ordering
- joins
- panel open/close state if stored
- preview state if stored

Returned results do not need to be restored.

---

## 5.12 Login / Logout Placeholder

This is not functionally required yet, but the UI should leave room for it.

### Placeholder states

- logged out: button label `Login`
- logged in: show user label or avatar with `Logout`
- disabled future state: `Auth pending`

### Current phase behavior

Choose one of these approaches:

1. Render disabled button with tooltip.
2. Render mock modal saying backend auth will be added later.

Do not make auth a dependency for the rest of the UI in phase 1.

---

## 6. Canonical Client-Side Query Model

The frontend must maintain a serializable query model.
This is the single most important design requirement because it decouples the UI from the backend.

The UI should not infer query state from DOM structure.

A recommended shape:

```json
{
  "id": "query_001",
  "name": "Partner store leads",
  "dialect": "ansi",
  "baseTableNodeId": "node_ps",
  "tables": [
    {
      "nodeId": "node_ps",
      "database": "Nick",
      "schema": "public",
      "table": "partner_stores",
      "alias": "ps",
      "position": { "x": 80, "y": 120 },
      "collapsed": false
    },
    {
      "nodeId": "node_nl",
      "database": "Nick",
      "schema": "public",
      "table": "new_leads",
      "alias": "nl",
      "position": { "x": 520, "y": 120 },
      "collapsed": false
    }
  ],
  "joins": [
    {
      "joinId": "join_001",
      "leftNodeId": "node_ps",
      "rightNodeId": "node_nl",
      "type": "LEFT",
      "conditions": [
        {
          "leftColumn": "id",
          "operator": "=",
          "rightColumn": "partner_id"
        }
      ]
    }
  ],
  "select": [
    {
      "selectId": "sel_001",
      "nodeId": "node_ps",
      "column": "url",
      "outputAlias": null,
      "aggregate": null,
      "groupBy": false,
      "visible": true,
      "order": 1
    },
    {
      "selectId": "sel_002",
      "nodeId": "node_ps",
      "column": "orders",
      "outputAlias": null,
      "aggregate": null,
      "groupBy": false,
      "visible": true,
      "order": 2
    },
    {
      "selectId": "sel_003",
      "nodeId": "node_nl",
      "column": "company",
      "outputAlias": null,
      "aggregate": null,
      "groupBy": false,
      "visible": true,
      "order": 3
    },
    {
      "selectId": "sel_004",
      "nodeId": "node_nl",
      "column": "country",
      "outputAlias": null,
      "aggregate": null,
      "groupBy": false,
      "visible": true,
      "order": 4
    },
    {
      "selectId": "sel_005",
      "nodeId": "node_nl",
      "column": "total",
      "outputAlias": null,
      "aggregate": null,
      "groupBy": false,
      "visible": true,
      "order": 5
    },
    {
      "selectId": "sel_006",
      "nodeId": "node_nl",
      "column": "order_date",
      "outputAlias": null,
      "aggregate": null,
      "groupBy": false,
      "visible": true,
      "order": 6
    }
  ],
  "filters": [],
  "groupBy": [],
  "orderBy": [],
  "limit": null,
  "ui": {
    "zoom": 1,
    "pan": { "x": 0, "y": 0 },
    "rightPanelOpen": true,
    "resultsPanelOpen": true,
    "resultsPanelHeight": 280,
    "selectedNodeId": null,
    "selectedJoinId": null
  }
}
```

### Notes on the model

- `tables` represents instances on canvas, not unique physical tables.
- `nodeId` must be unique even for duplicate physical tables.
- `select` order controls `SELECT` order.
- `groupBy` is explicit.
- `ui` holds purely visual state.

---

## 7. SQL Generation Rules for the Preview

The frontend should be able to generate a preview SQL string from the query model.
This is not the backend executor. It is only a deterministic renderer of the current visual state.

### SQL assembly order

1. `SELECT`
2. `FROM`
3. joins
4. `WHERE`
5. `GROUP BY`
6. `HAVING`
7. `ORDER BY`
8. `LIMIT` / backend-specific row cap

### Base table rules

- The first table added becomes the base table by default.
- The user can change the base table from the table header menu.

### Table qualification

Use the most complete qualification available:
- `database.schema.table AS alias` if database is relevant
- otherwise `schema.table AS alias`
- otherwise `table AS alias`

### Select rendering rules

For each selected expression:
- render `alias.column`
- if aggregate exists, render `AGG(alias.column)`
- if output alias exists, append `AS output_alias`

Example:

```sql
SELECT
  ps.url,
  ps.orders,
  nl.company,
  nl.country,
  nl.total,
  nl.order_date
FROM public.partner_stores AS ps
LEFT JOIN public.new_leads AS nl ON ps.id = nl.partner_id
```

### WHERE and HAVING rules

- non-aggregate filters go to `WHERE`
- aggregate filters go to `HAVING`

### Group-by rules

- if any aggregate exists, all non-aggregated selected expressions must be grouped
- if the UI auto-added grouping, render them in the `GROUP BY` list

### Order-by rules

- use explicit order rules from the query model
- preserve user priority order

---

## 8. Validation Rules

The UI should classify validation findings into:
- blocking errors
- warnings
- informational suggestions

### Blocking errors

These disable `Run`:
- no tables on canvas
- no selected output columns
- duplicate table alias
- missing join condition for a non-cross join
- disconnected query graph without explicit cross join
- unsupported aggregate for data type
- invalid filter values
- broken references after table or column removal

### Warnings

These allow `Run` but show visible warning indicators:
- cross join present
- very large number of selected columns
- no filters on large joined query
- duplicate output alias
- table dropped but no columns selected from it

### Suggestions

These do not block or warn strongly:
- `You can drag a column handle to create a join.`
- `Consider renaming output aliases for clarity.`
- `This table appears joinable to employees via employee_id.`

---

## 9. Event Flows

## 9.1 Add a table from sidebar

1. User drags `partner_stores` from the schema explorer.
2. User drops it on the canvas.
3. Frontend creates a new table node with unique `nodeId` and alias.
4. Node is added to `query.tables`.
5. If this is the first node, it becomes `baseTableNodeId`.
6. SQL preview updates.

## 9.2 Create a join

1. User drags from `ps.id` handle.
2. UI highlights compatible targets.
3. User drops on `nl.partner_id`.
4. Frontend creates join record.
5. Default join type is `INNER` unless the user picked another path.
6. SQL preview updates.
7. Clicking the join line allows changing type to `LEFT`.

## 9.3 Select a column

1. User checks `nl.company`.
2. Frontend appends a select item to `query.select`.
3. Column row shows selected state.
4. SQL preview updates.

## 9.4 Add aggregate

1. User opens context menu on `salary`.
2. User chooses `Aggregate > Avg`.
3. Frontend ensures the expression exists in `select`.
4. The select item gets `aggregate: AVG`.
5. Non-aggregated selected columns are auto-added to `groupBy`.
6. SQL preview updates.

## 9.5 Run a query

1. User clicks `Run`.
2. Frontend validates the model.
3. If invalid, focus first error.
4. If valid, call `runAdapter.execute(queryModel)`.
5. Results panel enters loading state.
6. On success, result grid and export become available.
7. On error, results panel shows message.

## 9.6 Save a query

1. User clicks `Save`.
2. If unnamed, open save modal.
3. Serialize `queryModel`.
4. Persist via storage adapter.
5. Clear dirty state.

---

## 10. Frontend State Management Guidance

The frontend should separate state into these buckets:

### 10.1 Persistent query state
Serialized and saveable:
- tables
- joins
- selected expressions
- filters
- order rules
- grouping
- query title

### 10.2 UI-only transient state
Not required for backend execution:
- hovered node id
- open context menu
- drag source
- right panel open state
- bottom panel height
- current zoom/pan
- current selection focus
- unsaved changes flag

### 10.3 Execution state
- idle
- validating
- running
- success
- error

### 10.4 Recommended pattern

Keep the canonical query model normalized enough to avoid sync bugs.
A reducer or store pattern is strongly recommended.

---

## 11. Local Adapters for Phase 1

Even before the backend exists, structure the UI around adapters.

### 11.1 Schema adapter
Supplies schema metadata to the sidebar.
For phase 1 this can load from a local JSON file.

### 11.2 Run adapter
Executes the query.
For phase 1 this can be a mock adapter that:
- returns sample rows
- returns empty rows
- or simply marks execution as not connected yet

### 11.3 Storage adapter
Handles saved queries.
For phase 1 this uses local storage.

### 11.4 Auth adapter
Provides login/logout state.
For phase 1 this can be a stub.

### Suggested interface shape

```ts
interface VisualSqlBuilderAdapters {
  schema: {
    load(): Promise<SchemaCatalog>;
  };
  run: {
    execute(query: QueryModel): Promise<QueryResult>;
    cancel?(): Promise<void>;
  };
  storage: {
    list(): Promise<SavedQuery[]>;
    get(id: string): Promise<SavedQuery | null>;
    save(item: SavedQuery): Promise<void>;
    remove(id: string): Promise<void>;
  };
  auth?: {
    getSession(): Promise<AuthSession | null>;
    login?(): Promise<void>;
    logout?(): Promise<void>;
  };
}
```

This keeps backend wiring clean later.

---

## 12. Suggested Component Breakdown

This is framework-agnostic, but a component tree like this will keep the code organized.

```text
AppShell
  TopBar
  MainLayout
    SchemaExplorer
    CanvasWorkspace
      CanvasToolbar
      TableNode[]
      JoinLine[]
    QueryPreviewPanel
  ResultsPanel
  SavedQueriesModal
  FilterEditorModal
  JoinEditorPopover
  ConfirmDialog
  ToastHost
```

### Component responsibilities

#### AppShell
Owns adapter wiring, bootstrapping, and global state providers.

#### TopBar
Owns global controls and query-level actions.

#### SchemaExplorer
Shows searchable schema tree and drag sources.

#### CanvasWorkspace
Owns table placement, node movement, joins, pan/zoom, and selection.

#### TableNode
Owns per-table interactions and column list rendering.

#### QueryPreviewPanel
Shows SQL, JSON, and validation.

#### ResultsPanel
Shows execution output and export.

---

## 13. Accessibility and Keyboard Support

This UI is visual and drag-heavy, so keyboard alternatives matter.

### Minimum accessibility requirements

- all buttons must have accessible labels
- all context menu items must be keyboard reachable
- table and column focus states must be visible
- results grid must be screen-reader friendly as much as practical
- color should not be the only indicator of state

### Keyboard shortcuts

Recommended shortcuts:
- `Cmd/Ctrl + S` -> Save
- `Cmd/Ctrl + Enter` -> Run
- `Delete` or `Backspace` -> remove selected node/join if safe
- `Esc` -> close open menu/modal
- `Cmd/Ctrl + Z` -> Undo
- `Cmd/Ctrl + Shift + Z` -> Redo

### Keyboard alternatives to drag-and-drop

- allow double-click table to add to canvas
- allow `Add / Join` from context menu instead of only dragging handles

---

## 14. Performance Considerations

### Required optimizations

- virtualize long schema lists
- virtualize results rows
- debounce search
- debounce SQL preview generation slightly if needed (`50ms` to `100ms`)
- avoid full canvas rerender on every hover event

### Canvas performance guidance

- store node positions efficiently
- render join lines in a layer separate from nodes if useful
- use memoized node components

### Large schema guidance

If schema is large:
- lazy-expand schemas
- only render child items when expanded
- optionally request metadata on demand later

---

## 15. Error and Empty States

### No schema loaded
`No schema has been loaded into the builder yet.`

### Canvas empty
`Drag tables here to start building a query.`

### Query invalid
`Fix the highlighted issues before running the query.`

### Results empty
`Run a query to see results.`

### Saved queries empty
`You have no saved queries yet.`

### Auth unavailable
`Authentication integration is not connected yet.`

### Backend unavailable
`The builder UI is ready, but the query execution service is not connected yet.`

---

## 16. Acceptance Criteria

The UI logic is complete for phase 1 when all of the following are true:

1. A table can be dragged from the schema explorer to the canvas.
2. The same physical table can be added multiple times with unique aliases.
3. Table nodes can be moved on the canvas.
4. Columns can be selected with checkboxes and appear in the SQL preview.
5. A join can be created visually between two table columns.
6. Clicking a join allows changing the join type.
7. Column context menu supports alias, filter, aggregate, and ordering.
8. Adding an aggregate automatically groups non-aggregated selected columns.
9. SQL preview updates after every meaningful query change.
10. Results panel supports loading, success, empty, and error states.
11. Result export UI exists and enables only when rows are present.
12. Queries can be saved locally and loaded back with full visual restoration.
13. Login/logout placeholder exists without breaking the app.
14. Run is blocked on invalid query states.
15. The entire query state can be serialized to JSON.

---

## 17. Suggested Phase Plan

### Phase 1: Local-only visual builder

Implement:
- shell layout
- schema explorer using local JSON
- drag/drop canvas
- table nodes
- joins
- column selection
- filters
- aggregates
- order and group state
- SQL preview
- local save/load
- mock results panel

### Phase 2: Backend execution integration

Add:
- real `Run` action
- real result payloads
- server-side export or large-result pagination if needed
- query validation alignment with backend dialect

### Phase 3: Session and persistence integration

Add:
- login/logout
- saved queries on server
- connection selection
- per-user storage

---

## 18. Final Implementation Notes

1. Treat the visual query model as the contract between UI and backend.
2. Keep SQL preview generation deterministic and side-effect free.
3. Do not couple table nodes directly to DOM for state.
4. Save enough UI metadata to restore the exact builder layout later.
5. Build now so that `schema`, `run`, `storage`, and `auth` can all be swapped from local mocks to server-backed adapters.

If this spec is followed, you can build the full local UI first and then wire backend execution, auth, and persistence later without redesigning the frontend architecture.

---

## 19. Example Contracts for Later Backend Wiring

The UI will be easier to wire later if the backend accepts and returns stable JSON shapes.
Below is a practical contract suggestion.

### 19.1 SchemaCatalog

```ts
type ColumnType =
  | 'string'
  | 'text'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'json'
  | 'uuid'
  | 'unknown';

interface SchemaCatalog {
  databases: DatabaseSchema[];
}

interface DatabaseSchema {
  name: string;
  schemas: SchemaEntry[];
}

interface SchemaEntry {
  name: string;
  tables: TableDefinition[];
}

interface TableDefinition {
  database?: string;
  schema?: string;
  name: string;
  label?: string;
  objectType: 'table' | 'view' | 'materialized_view';
  columns: ColumnDefinition[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeyDefinition[];
}

interface ColumnDefinition {
  name: string;
  label?: string;
  type: ColumnType;
  rawType?: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

interface ForeignKeyDefinition {
  fromColumn: string;
  toDatabase?: string;
  toSchema?: string;
  toTable: string;
  toColumn: string;
}
```

### 19.2 QueryModel

```ts
interface QueryModel {
  id: string;
  name: string;
  dialect: string;
  baseTableNodeId: string | null;
  tables: QueryTableNode[];
  joins: QueryJoin[];
  select: QuerySelectItem[];
  filters: QueryFilter[];
  groupBy: QueryGroupByItem[];
  orderBy: QueryOrderItem[];
  limit: number | null;
  ui: QueryUiState;
}

interface QueryTableNode {
  nodeId: string;
  database?: string;
  schema?: string;
  table: string;
  alias: string;
  position: { x: number; y: number };
  collapsed: boolean;
}

interface QueryJoin {
  joinId: string;
  leftNodeId: string;
  rightNodeId: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  conditions: QueryJoinCondition[];
}

interface QueryJoinCondition {
  leftColumn: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
  rightColumn: string;
}

interface QuerySelectItem {
  selectId: string;
  nodeId: string;
  column: string;
  outputAlias: string | null;
  aggregate: null | 'MIN' | 'MAX' | 'COUNT' | 'COUNT_DISTINCT' | 'AVG' | 'SUM';
  groupBy: boolean;
  visible: boolean;
  order: number;
}

interface QueryFilter {
  filterId: string;
  nodeId: string;
  column: string;
  operator: string;
  value: unknown;
  logic: 'AND' | 'OR';
  scope: 'WHERE' | 'HAVING';
}

interface QueryGroupByItem {
  nodeId: string;
  column: string;
}

interface QueryOrderItem {
  nodeId: string;
  column: string;
  direction: 'ASC' | 'DESC';
  priority: number;
}

interface QueryUiState {
  zoom: number;
  pan: { x: number; y: number };
  rightPanelOpen: boolean;
  resultsPanelOpen: boolean;
  resultsPanelHeight: number;
  selectedNodeId: string | null;
  selectedJoinId: string | null;
}
```

### 19.3 QueryResult

```ts
interface QueryResult {
  columns: ResultColumn[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  executionTimeMs?: number;
  warnings?: string[];
  generatedSql?: string;
}

interface ResultColumn {
  key: string;
  label: string;
  type?: string;
}
```

### 19.4 SavedQuery

```ts
interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  queryModel: QueryModel;
  generatedSql?: string;
  tags?: string[];
}
```

### 19.5 Future event hooks

If you want the builder component to be reusable, expose hooks or callbacks like these:

```ts
interface VisualSqlBuilderProps {
  schema: SchemaCatalog;
  onRun?: (query: QueryModel) => Promise<QueryResult>;
  onSave?: (query: SavedQuery) => Promise<void>;
  onLoadSaved?: () => Promise<SavedQuery[]>;
  onDeleteSaved?: (id: string) => Promise<void>;
  onLogin?: () => Promise<void>;
  onLogout?: () => Promise<void>;
  onExport?: (format: 'csv' | 'json' | 'xlsx', result: QueryResult, query: QueryModel) => Promise<void>;
}
```

These callbacks keep the UI generic and let you switch from local mocks to a server later with minimal refactoring.
