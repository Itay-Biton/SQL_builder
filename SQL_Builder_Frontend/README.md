# Visual SQL Query Builder (Prototype)

This is a minimal prototype implementing core Phase 1 UI logic from the spec:

- Schema explorer (local JSON)
- Add tables to canvas (double-click)
- Table node rendering with columns and checkboxes
- Canonical query model in React state
- Live SQL preview generated from the query model
- Save query to `localStorage` (Save button)

Quick start

1. Install dependencies

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

Next steps (ideas): implement drag-and-drop, joins, filters, aggregates, save/load UI, and result run adapter.
