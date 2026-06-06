import React, { useRef, useState, useEffect } from "react";
import ContextMenu from "./ContextMenu";
import FilterPanel from "./FilterPanel";

function TableNode({
  node,
  tableDef,
  onToggleColumn,
  selectedColumns,
  onStartDrag,
  onRemove,
  onContextMenuHeader,
  onContextMenuColumn,
  onTitleChange,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(
    node.title || tableDef.label || node.table,
  );

  useEffect(() => {
    setTitleValue(node.title || tableDef.label || node.table);
  }, [node.title, tableDef.label, node.table]);

  function commitTitle() {
    setEditingTitle(false);
    const newTitle = (titleValue || "").trim();
    if (onTitleChange) onTitleChange(node.nodeId, newTitle);
  }

  return (
    <div
      className="node"
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 260,
      }}
      onMouseDown={(e) => {
        if (e.target.tagName.toLowerCase() === "input" || e.button !== 0)
          return;
        onStartDrag(node.nodeId, e);
        e.stopPropagation();
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "grab",
        }}
        onContextMenu={(e) => {
          if (onContextMenuHeader) {
            e.preventDefault();
            onContextMenuHeader(e, node, tableDef);
          }
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: "#0f1724" }}>
            {editingTitle ? (
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={() => commitTitle()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") {
                    setEditingTitle(false);
                    setTitleValue(node.title || tableDef.label || node.table);
                  }
                }}
                style={{ fontSize: 14, fontWeight: 700, width: 180 }}
              />
            ) : (
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingTitle(true);
                }}
              >
                {node.title || tableDef.label || node.table}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#475569" }}>{node.alias}</div>
        </div>
        {/* removed header "more" button per UI request */}
      </div>

      <div className="columns">
        {tableDef.columns.map((col) => {
          const checked = selectedColumns.some(
            (s) => s.nodeId === node.nodeId && s.column === col.name,
          );
          return (
            <div
              key={col.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
              }}
              onContextMenu={(e) => {
                if (onContextMenuColumn) {
                  e.preventDefault();
                  onContextMenuColumn(e, node, col);
                }
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleColumn(node.nodeId, col.name)}
              />
              <div style={{ flex: 1, color: "#0f1724" }}>{col.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{col.type}</div>
            </div>
          );
        })}
      </div>

      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(node.nodeId);
          }}
          style={{ fontSize: 12 }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function CanvasWorkspace({
  query,
  setQuery,
  onToggleColumn,
  onAddTable,
  schema,
  onAddJoin,
  onRemoveJoin,
}) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const tableMap = new Map(
    ((schema && schema.tables) || []).map((t) => [t.name, t]),
  );

  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    nodeId: null,
    column: null,
  });
  const [filterPanel, setFilterPanel] = useState({ visible: false });

  function parseLimitFromTitle(title) {
    if (!title) return null;
    // match examples: (limit=1000), [limit:100], limit=200, limit: 300
    const m = title.match(/limit\s*(?:=|:)?\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
    return null;
  }

  useEffect(() => {
    function onDocClick() {
      if (menu.visible) setMenu((m) => ({ ...m, visible: false }));
    }
    function onKey(e) {
      if (e.key === "Escape") setMenu((m) => ({ ...m, visible: false }));
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu.visible]);

  function startNodeDrag(nodeId, e) {
    const node = query.tables.find((t) => t.nodeId === nodeId);
    if (!node || !canvasRef.current) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: node.position.x, y: node.position.y };
    const origZoom = (query.ui && query.ui.zoom) || 1;
    dragRef.current = { nodeId, startX, startY, orig, origZoom };

    function onMouseMove(ev) {
      if (!dragRef.current) return;
      const { nodeId, startX, startY, orig, origZoom } = dragRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newX = Math.max(0, Math.round(orig.x + dx / origZoom));
      const newY = Math.max(0, Math.round(orig.y + dy / origZoom));
      setQuery((q) => ({
        ...q,
        tables: q.tables.map((t) =>
          t.nodeId === nodeId ? { ...t, position: { x: newX, y: newY } } : t,
        ),
      }));
    }

    function onMouseUp() {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  }

  function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleCanvasDrop(e) {
    e.preventDefault();
    const data =
      e.dataTransfer.getData("application/json") ||
      e.dataTransfer.getData("text/plain");
    if (!data) return;
    try {
      const tbl = JSON.parse(data);
      const rect = canvasRef.current.getBoundingClientRect();
      const pan = (query.ui && query.ui.pan) || { x: 0, y: 0 };
      const zoom = (query.ui && query.ui.zoom) || 1;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      onAddTable(tbl, {
        x: Math.max(8, Math.round(x)),
        y: Math.max(8, Math.round(y)),
      });
    } catch (err) {
      console.warn("Invalid drop data", err);
    }
  }

  function startPan(e) {
    if (!canvasRef.current) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = (query.ui && query.ui.pan) || { x: 0, y: 0 };
    panRef.current = { startX, startY, orig };

    function onMouseMove(ev) {
      if (!panRef.current) return;
      const dx = ev.clientX - panRef.current.startX;
      const dy = ev.clientY - panRef.current.startY;
      setQuery((q) => ({
        ...q,
        ui: {
          ...q.ui,
          pan: { x: panRef.current.orig.x + dx, y: panRef.current.orig.y + dy },
        },
      }));
    }

    function onMouseUp() {
      panRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function handleCanvasMouseDown(e) {
    const tg = e.target;
    const tag = tg && tg.tagName && tg.tagName.toLowerCase();
    // start pan when clicking the canvas background or the SVG connector area
    if (
      tg === canvasRef.current ||
      tag === "svg" ||
      tag === "g" ||
      tag === "line"
    ) {
      startPan(e);
    }
  }

  function handleWheel(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const oldZoom = (query.ui && query.ui.zoom) || 1;
    const delta = -e.deltaY;
    const factor = Math.pow(1.0015, delta);
    const newZoom = Math.max(0.2, Math.min(3, oldZoom * factor));
    const pan = (query.ui && query.ui.pan) || { x: 0, y: 0 };
    const worldX = (mouseX - pan.x) / oldZoom;
    const worldY = (mouseY - pan.y) / oldZoom;
    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;
    setQuery((q) => ({
      ...q,
      ui: { ...q.ui, zoom: newZoom, pan: { x: newPanX, y: newPanY } },
    }));
  }

  function removeNode(nodeId) {
    // detect downstream tables that would become unreachable if this node is removed
    const tables = query.tables || [];
    const joins = query.joins || [];
    const nodeIds = new Set(tables.map((t) => t.nodeId));

    // build undirected adjacency
    const adj = Object.create(null);
    nodeIds.forEach((id) => (adj[id] = new Set()));
    (joins || []).forEach((j) => {
      if (adj[j.leftNodeId]) adj[j.leftNodeId].add(j.rightNodeId);
      if (adj[j.rightNodeId]) adj[j.rightNodeId].add(j.leftNodeId);
    });

    // pick BFS start: prefer baseTableNodeId if it exists and is not the node being removed
    const baseId =
      query.baseTableNodeId && query.baseTableNodeId !== nodeId
        ? query.baseTableNodeId
        : null;
    let start = null;
    if (baseId && nodeIds.has(baseId)) start = baseId;
    else {
      // pick any remaining table that's not the one being removed
      for (const t of tables) {
        if (t.nodeId !== nodeId) {
          start = t.nodeId;
          break;
        }
      }
    }

    if (!start) {
      // nothing else to keep, just remove
      setQuery((q) => ({
        ...q,
        tables: q.tables.filter((t) => t.nodeId !== nodeId),
        joins: q.joins.filter(
          (j) => j.leftNodeId !== nodeId && j.rightNodeId !== nodeId,
        ),
        select: (q.select || []).filter((s) => s.nodeId !== nodeId),
        filters: (q.filters || []).filter((f) => f.nodeId !== nodeId),
        groupBy: (q.groupBy || []).filter((g) => g.nodeId !== nodeId),
        orderBy: (q.orderBy || []).filter((o) => o.nodeId !== nodeId),
      }));
      return;
    }

    // BFS excluding the removed node
    const visited = new Set();
    const qArr = [start];
    visited.add(start);
    while (qArr.length) {
      const cur = qArr.shift();
      for (const nbr of adj[cur] || []) {
        if (nbr === nodeId) continue;
        if (!visited.has(nbr)) {
          visited.add(nbr);
          qArr.push(nbr);
        }
      }
    }

    // any table (except the node being removed) not in visited will be orphaned
    const orphaned = tables
      .filter((t) => t.nodeId !== nodeId && !visited.has(t.nodeId))
      .map((t) => t);

    if (orphaned.length > 0) {
      const names = orphaned.map((t) => t.table).join(", ");
      const ok = window.confirm(
        `Removing this table will also remove the following dependent tables: ${names}.\n\nProceed?`,
      );
      if (!ok) return;
    }

    const toRemoveIds = new Set([nodeId, ...orphaned.map((t) => t.nodeId)]);
    setQuery((q) => ({
      ...q,
      tables: q.tables.filter((t) => !toRemoveIds.has(t.nodeId)),
      joins: q.joins.filter(
        (j) =>
          !toRemoveIds.has(j.leftNodeId) && !toRemoveIds.has(j.rightNodeId),
      ),
      select: (q.select || []).filter((s) => !toRemoveIds.has(s.nodeId)),
      filters: (q.filters || []).filter((f) => !toRemoveIds.has(f.nodeId)),
      groupBy: (q.groupBy || []).filter((g) => !toRemoveIds.has(g.nodeId)),
      orderBy: (q.orderBy || []).filter((o) => !toRemoveIds.has(o.nodeId)),
      baseTableNodeId:
        q.baseTableNodeId && !toRemoveIds.has(q.baseTableNodeId)
          ? q.baseTableNodeId
          : (q.tables.find((t) => !toRemoveIds.has(t.nodeId)) || {}).nodeId ||
            null,
    }));
  }

  function ensureSelectEntry(nodeId, column) {
    setQuery((q) => {
      const exists = q.select.find(
        (s) => s.nodeId === nodeId && s.column === column,
      );
      if (exists) return q;
      const sel = {
        selectId: `sel_${Math.random().toString(36).slice(2, 9)}`,
        nodeId,
        column,
        outputAlias: null,
        aggregate: null,
        groupBy: false,
        visible: true,
        order: q.select.length + 1,
      };
      return { ...q, select: [...q.select, sel] };
    });
  }

  function doSetAlias(nodeId, column) {
    const alias = window.prompt("Set column alias:", "");
    if (alias === null) return;
    ensureSelectEntry(nodeId, column);
    setQuery((q) => ({
      ...q,
      select: q.select.map((s) =>
        s.nodeId === nodeId && s.column === column
          ? { ...s, outputAlias: alias }
          : s,
      ),
    }));
  }

  function doToggleAll(nodeId, on) {
    const table = query.tables.find((t) => t.nodeId === nodeId);
    if (!table) return;
    const def = tableMap.get(table.table) || { columns: [] };
    setQuery((q) => {
      const other = q.select.filter((s) => s.nodeId !== nodeId);
      const newSelect = on
        ? [
            ...other,
            ...def.columns.map((c, i) => ({
              selectId: `sel_${Math.random().toString(36).slice(2, 9)}`,
              nodeId,
              column: c.name,
              outputAlias: null,
              aggregate: null,
              groupBy: false,
              visible: true,
              order: other.length + i + 1,
            })),
          ]
        : other;
      return { ...q, select: newSelect };
    });
  }

  function doFilter(nodeId, column) {
    const table = query.tables.find((t) => t.nodeId === nodeId);
    const def = tableMap.get(table ? table.table : "") || { columns: [] };
    const colDef = def.columns.find((c) => c.name === column) || null;
    setFilterPanel({
      visible: true,
      x: menu.x,
      y: menu.y,
      nodeId,
      column,
      colDef,
    });
  }

  function doAggregate(nodeId, column, agg) {
    setQuery((q) => {
      const sel = Array.isArray(q.select) ? q.select.slice() : [];

      // ensure an entry exists for this nodeId/column within the same updater
      let exists = sel.find((s) => s.nodeId === nodeId && s.column === column);
      if (!exists) {
        const newEntry = {
          selectId: `sel_${Math.random().toString(36).slice(2, 9)}`,
          nodeId,
          column,
          outputAlias: null,
          aggregate: null,
          groupBy: false,
          visible: true,
          order: sel.length + 1,
        };
        sel.push(newEntry);
        exists = newEntry;
      }

      // Special handling for COUNT(*) (column === "*") -- make COUNT(*) exclusive across tables
      if (column === "*") {
        // If global COUNT(*) is active, clicking any table's Count(*) disables it
        if (q.countStarActive) {
          return {
            ...q,
            select: sel.filter((s) => !(s.column === "*")),
            countStarActive: false,
          };
        }

        // otherwise enable COUNT(*) for this table: clear other star selects and set this one
        const updated = sel
          // remove other tables' star entries that have the same aggregate
          .filter(
            (s) =>
              !(s.column === "*" && s.aggregate === agg && s.nodeId !== nodeId),
          )
          // update current table's star entry (if present)
          .map((s) =>
            s.nodeId === nodeId && s.column === "*"
              ? { ...s, aggregate: agg }
              : s,
          );

        // ensure current table's star entry exists with aggregate
        if (!updated.some((s) => s.nodeId === nodeId && s.column === "*")) {
          updated.push({ ...exists, aggregate: agg });
        }

        return { ...q, select: updated, countStarActive: true };
      }

      // Non-star column: toggle aggregate on that select entry
      const updatedSelect = sel.map((s) => {
        if (s.nodeId === nodeId && s.column === column) {
          if (s.aggregate === agg) return { ...s, aggregate: null };
          return { ...s, aggregate: agg };
        }
        return s;
      });
      return { ...q, select: updatedSelect };
    });
  }

  function doOrder(nodeId, column, dir) {
    setQuery((q) => {
      const existing = (q.orderBy || []).find(
        (o) => o.nodeId === nodeId && o.column === column,
      );
      if (existing) {
        // if same direction -> remove, if different -> update
        if ((existing.direction || "ASC") === dir) {
          return {
            ...q,
            orderBy: (q.orderBy || []).filter(
              (o) => !(o.nodeId === nodeId && o.column === column),
            ),
          };
        } else {
          return {
            ...q,
            orderBy: (q.orderBy || []).map((o) =>
              o.nodeId === nodeId && o.column === column
                ? { ...o, direction: dir }
                : o,
            ),
          };
        }
      }
      return {
        ...q,
        orderBy: [...(q.orderBy || []), { nodeId, column, direction: dir }],
      };
    });
  }

  function removeOrder(nodeId, column) {
    setQuery((q) => ({
      ...q,
      orderBy: (q.orderBy || []).filter(
        (o) => !(o.nodeId === nodeId && o.column === column),
      ),
    }));
  }

  function doGroup(nodeId, column) {
    ensureSelectEntry(nodeId, column);
    setQuery((q) => {
      const exists = (q.groupBy || []).some(
        (g) => g.nodeId === nodeId && g.column === column,
      );
      if (exists) {
        return {
          ...q,
          groupBy: (q.groupBy || []).filter(
            (g) => !(g.nodeId === nodeId && g.column === column),
          ),
        };
      }
      return { ...q, groupBy: [...(q.groupBy || []), { nodeId, column }] };
    });
  }

  function removeGroup(nodeId, column) {
    setQuery((q) => ({
      ...q,
      groupBy: (q.groupBy || []).filter(
        (g) => !(g.nodeId === nodeId && g.column === column),
      ),
    }));
  }

  function clearAggregate(nodeId, column) {
    setQuery((q) => ({
      ...q,
      select: q.select.map((s) =>
        s.nodeId === nodeId && s.column === column
          ? { ...s, aggregate: null }
          : s,
      ),
    }));
  }

  function doRemoveExpression(nodeId, column) {
    setQuery((q) => ({
      ...q,
      select: q.select.filter(
        (s) => !(s.nodeId === nodeId && s.column === column),
      ),
    }));
  }

  function doAddJoin(nodeId, column) {
    const otherAliases = (query.tables || [])
      .filter((t) => t.nodeId !== nodeId)
      .map((t) => `${t.alias}::${t.nodeId}`);
    if (otherAliases.length === 0) {
      alert("No other tables to join to");
      return;
    }
    const pick = window.prompt(
      "Join to (enter alias::nodeId), options:\n" + otherAliases.join("\n"),
      otherAliases[0],
    );
    if (!pick) return;
    const parts = pick.split("::");
    const rightNodeId = parts[1] || parts[0];
    const leftNode = query.tables.find((t) => t.nodeId === nodeId);
    const rightNode = query.tables.find((t) => t.nodeId === rightNodeId);
    if (!leftNode || !rightNode) {
      alert("Could not find nodes");
      return;
    }
    const leftDef = tableMap.get(leftNode.table) || { columns: [] };
    const rightDef = tableMap.get(rightNode.table) || { columns: [] };
    let leftCol = column;
    let rightCol = null;
    if (!leftCol || leftCol === "*") {
      const pk = (leftDef.columns || []).find((c) => c.isPrimaryKey);
      if (pk) leftCol = pk.name;
    }
    const rFk = (rightDef.columns || []).find(
      (c) =>
        /_id$/.test(c.name) && c.name.includes(leftNode.table.split("_")[0]),
    );
    if (rFk) rightCol = rFk.name;
    if (!rightCol) {
      const lFk = (leftDef.columns || []).find(
        (c) =>
          /_id$/.test(c.name) && c.name.includes(rightNode.table.split("_")[0]),
      );
      if (lFk) {
        rightCol = leftCol;
        leftCol = lFk.name;
      }
    }
    if (!rightCol) {
      rightCol =
        (rightDef.columns || []).find((c) => /_id$/.test(c.name))?.name ||
        (rightDef.columns || [])[0]?.name ||
        "id";
      leftCol =
        leftCol ||
        (leftDef.columns || []).find((c) => /_id$/.test(c.name))?.name ||
        "id";
    }
    const join = {
      leftNodeId: nodeId,
      rightNodeId,
      type: "INNER",
      conditions: [
        { leftColumn: leftCol, operator: "=", rightColumn: rightCol },
      ],
    };
    if (onAddJoin) onAddJoin(join);
  }

  function handleContextClose() {
    setMenu((m) => ({ ...m, visible: false }));
  }

  function applyFilter({ nodeId, column, expression, conjunction, negate }) {
    setQuery((q) => ({
      ...q,
      filters: [
        ...(q.filters || []),
        {
          filterId: `f_${Math.random().toString(36).slice(2, 9)}`,
          nodeId,
          column,
          expression,
          conjunction: conjunction || "AND",
          negate: !!negate,
        },
      ],
    }));
    setFilterPanel({ visible: false });
    setMenu((m) => ({ ...m, visible: false }));
  }

  function removeFilter(filterId) {
    setQuery((q) => ({
      ...q,
      filters: (q.filters || []).filter((f) => f.filterId !== filterId),
    }));
    setMenu((m) => ({ ...m, visible: false }));
  }

  function removeFiltersForColumn(nodeId, column) {
    setQuery((q) => ({
      ...q,
      filters: (q.filters || []).filter(
        (f) => !(f.nodeId === nodeId && f.column === column),
      ),
    }));
    setMenu((m) => ({ ...m, visible: false }));
  }

  function removeAllFilters() {
    setQuery((q) => ({ ...q, filters: [] }));
    setMenu((m) => ({ ...m, visible: false }));
  }

  // Join toggle UI: circular, overlapping indicators with click-to-cycle behavior
  function JoinToggle({ join, leftAlias, rightAlias }) {
    const types = ["LEFT", "RIGHT", "INNER", "FULL"];
    const idx = Math.max(0, types.indexOf(join.type || "INNER"));
    function nextType() {
      const next = types[(idx + 1) % types.length];
      setQuery((q) => ({
        ...q,
        joins: (q.joins || []).map((jj) =>
          jj.joinId === join.joinId ? { ...jj, type: next } : jj,
        ),
        ui: {
          ...q.ui,
          selectedJoinId:
            q.ui && q.ui.selectedJoinId === join.joinId ? null : join.joinId,
        },
      }));
    }

    const colorLeft = "#60a5fa"; // blue
    const colorRight = "#34d399"; // green

    const type = join.type || "INNER";
    const isLeft = type === "LEFT";
    const isRight = type === "RIGHT";
    const isInner = type === "INNER";
    const isFull = type === "FULL";

    const leftStyle = {
      width: 44,
      height: 44,
      borderRadius: "50%",
      position: "absolute",
      left: 0,
      top: 0,
      boxSizing: "border-box",
      border: `2px solid ${colorLeft}`,
      background:
        isLeft || isFull
          ? colorLeft
          : isInner
            ? `${colorLeft}66`
            : "transparent",
      opacity: isLeft || isFull || isInner ? 1 : 0.6,
      zIndex: isLeft ? 3 : 2,
    };

    const rightStyle = {
      width: 44,
      height: 44,
      borderRadius: "50%",
      position: "absolute",
      left: 28,
      top: 0,
      boxSizing: "border-box",
      border: `2px solid ${colorRight}`,
      background:
        isRight || isFull
          ? colorRight
          : isInner
            ? `${colorRight}66`
            : "transparent",
      opacity: isRight || isFull || isInner ? 1 : 0.6,
      zIndex: isRight ? 3 : 1,
    };

    const wrapperStyle = {
      width: 76,
      height: 58,
      position: "relative",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      fontSize: 11,
      color: "#0f1724",
      userSelect: "none",
    };

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          nextType();
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        style={wrapperStyle}
        title={`${type} join: click to toggle`}
      >
        <div style={{ position: "relative", width: 76, height: 44 }}>
          <div style={leftStyle} />
          <div style={rightStyle} />
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ textAlign: "left", fontSize: 11, color: "#334155" }}>
            {leftAlias} ←
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#334155" }}>
            → {rightAlias}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
    >
      {query.tables.length === 0 && (
        <div style={{ color: "#475569", padding: 12 }}>
          Drag tables here to start building a query. Or double-click in the
          schema.
        </div>
      )}

      <div
        style={{
          transformOrigin: "0 0",
          transform: `translate(${(query.ui && query.ui.pan && query.ui.pan.x) || 0}px, ${(query.ui && query.ui.pan && query.ui.pan.y) || 0}px) scale(${(query.ui && query.ui.zoom) || 1})`,
          position: "relative",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {/* Render join connector lines and a small inline join-type picker */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              pointerEvents: "auto",
            }}
          >
            {(query.joins || []).map((j) => {
              const left = query.tables.find((t) => t.nodeId === j.leftNodeId);
              const right = query.tables.find(
                (t) => t.nodeId === j.rightNodeId,
              );
              if (!left || !right) return null;
              const leftDef = tableMap.get(left.table) || { columns: [] };
              const rightDef = tableMap.get(right.table) || { columns: [] };
              const nodeWidth = 260;
              const headerHeight = 40;
              const rowHeight = 22;
              const lx = Math.round(left.position.x + nodeWidth / 2);
              // anchor to header (title) center so joins attach to the table title
              const ly = Math.round(left.position.y + headerHeight / 2);
              const rx = Math.round(right.position.x + nodeWidth / 2);
              const ry = Math.round(right.position.y + headerHeight / 2);
              const midX = Math.round((lx + rx) / 2);
              const midY = Math.round((ly + ry) / 2);
              const selected = query.ui && query.ui.selectedJoinId === j.joinId;
              return (
                <g key={j.joinId}>
                  <line
                    x1={lx}
                    y1={ly}
                    x2={rx}
                    y2={ry}
                    stroke={selected ? "#0f1724" : "#60a5fa"}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>

          {/* Inline HTML pickers positioned at midpoint so they scale/translate with canvas */}
          {(query.joins || []).map((j) => {
            const left = query.tables.find((t) => t.nodeId === j.leftNodeId);
            const right = query.tables.find((t) => t.nodeId === j.rightNodeId);
            if (!left || !right) return null;
            const leftDef = tableMap.get(left.table) || { columns: [] };
            const rightDef = tableMap.get(right.table) || { columns: [] };
            const nodeWidth = 260;
            const headerHeight = 40;
            const rowHeight = 22;
            const lx = Math.round(left.position.x + nodeWidth / 2);
            // position picker near the table header center for consistency
            const ly = Math.round(left.position.y + headerHeight / 2);
            const rx = Math.round(right.position.x + nodeWidth / 2);
            const ry = Math.round(right.position.y + headerHeight / 2);
            const midX = Math.round((lx + rx) / 2);
            const midY = Math.round((ly + ry) / 2);
            const selected = query.ui && query.ui.selectedJoinId === j.joinId;
            return (
              <div
                key={j.joinId + "_picker"}
                style={{
                  position: "absolute",
                  left: midX,
                  top: midY,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "auto",
                }}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <JoinToggle
                    join={j}
                    leftAlias={left.alias}
                    rightAlias={right.alias}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {query.tables.map((node) => {
          const tableDef = tableMap.get(node.table) || {
            name: node.table,
            columns: [],
          };
          return (
            <div key={node.nodeId} style={{ pointerEvents: "auto" }}>
              <TableNode
                node={node}
                tableDef={tableDef}
                onToggleColumn={onToggleColumn}
                selectedColumns={query.select}
                onStartDrag={startNodeDrag}
                onRemove={removeNode}
                onContextMenuHeader={(e, node, tableDef) => {
                  setMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    type: "table",
                    nodeId: node.nodeId,
                    column: null,
                    tableDef,
                  });
                }}
                onContextMenuColumn={(e, node, col) => {
                  setMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    type: "column",
                    nodeId: node.nodeId,
                    column: col.name,
                    colDef: col,
                  });
                }}
                onTitleChange={(nodeId, newTitle) => {
                  setQuery((q) => {
                    const newTables = (q.tables || []).map((t) =>
                      t.nodeId === nodeId ? { ...t, title: newTitle } : t,
                    );
                    // parse limit from title; if found, update global limit
                    const parsed = parseLimitFromTitle(newTitle);
                    if (parsed !== null && !Number.isNaN(parsed)) {
                      return { ...q, tables: newTables, limit: parsed };
                    }
                    return { ...q, tables: newTables };
                  });
                }}
              />
            </div>
          );
        })}
      </div>
      {menu.visible && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={handleContextClose}
          items={(() => {
            const nodeId = menu.nodeId;
            const col = menu.column;
            // Build dynamic menu with awareness of current state
            if (menu.type === "table") {
              // show whether global COUNT(*) is active
              const countHint = query.countStarActive ? "✓" : undefined;
              return [
                { label: "Tick All", onClick: () => doToggleAll(nodeId, true) },
                {
                  label: "Untick All",
                  onClick: () => doToggleAll(nodeId, false),
                },
                { type: "divider" },
                {
                  label: "Count(*)",
                  onClick: () => doAggregate(nodeId, "*", "COUNT"),
                  hint: countHint,
                },
                { type: "divider" },
                {
                  label: "Limit",
                  items: [
                    {
                      label: `Set LIMIT value (current ${query && query.limit ? query.limit : 1000})`,
                      onClick: () => {
                        const val = window.prompt(
                          "Set LIMIT value (rows):",
                          query && query.limit ? String(query.limit) : "1000",
                        );
                        if (!val) return;
                        const n = parseInt(val, 10);
                        if (Number.isNaN(n) || n < 0) {
                          alert("Invalid limit value");
                          return;
                        }
                        setQuery((q) => ({ ...q, limit: n }));
                        setMenu((m) => ({ ...m, visible: false }));
                      },
                    },
                    ...(query && query.limit
                      ? [
                          {
                            label: "Disable LIMIT",
                            onClick: () => {
                              setQuery((q) => ({ ...q, limit: null }));
                              setMenu((m) => ({ ...m, visible: false }));
                            },
                          },
                        ]
                      : []),
                  ],
                },
              ];
            }

            if (menu.type === "column") {
              const sel = (query.select || []).find(
                (s) => s.nodeId === nodeId && s.column === col,
              );
              const curAgg = sel ? sel.aggregate : null;
              const ord = (query.orderBy || []).find(
                (o) => o.nodeId === nodeId && o.column === col,
              );
              const grp = (query.groupBy || []).find(
                (g) => g.nodeId === nodeId && g.column === col,
              );

              const items = [
                {
                  label: "Set Column Alias",
                  onClick: () => doSetAlias(nodeId, col),
                },
                { type: "divider" },
                { label: "Filter", onClick: () => doFilter(nodeId, col) },
                { type: "divider" },
                // Manage Filters submenu: list existing filters for this column and removal options
                (() => {
                  const colFilters = (query.filters || []).filter(
                    (f) => f.nodeId === nodeId && f.column === col,
                  );
                  const manageItems = [
                    {
                      label: "Add Filter",
                      onClick: () => doFilter(nodeId, col),
                    },
                  ];
                  if (colFilters.length) {
                    manageItems.push({ type: "divider" });
                    colFilters.forEach((f) => {
                      const prefix = `${f.conjunction ? f.conjunction + " " : ""}${f.negate ? "NOT " : ""}`;
                      manageItems.push({
                        label: `${prefix}${f.expression}`,
                        onClick: () => removeFilter(f.filterId),
                      });
                    });
                    manageItems.push({ type: "divider" });
                    manageItems.push({
                      label: "Remove all filters on this column",
                      onClick: () => removeFiltersForColumn(nodeId, col),
                    });
                  }
                  manageItems.push({
                    label: "Remove all filters",
                    onClick: () => removeAllFilters(),
                  });
                  return { label: "Manage Filters", items: manageItems };
                })(),
                { type: "divider" },
                {
                  label: "Aggregate",
                  items: [
                    {
                      label: "Min",
                      onClick: () => doAggregate(nodeId, col, "MIN"),
                      hint: curAgg === "MIN" ? "✓" : undefined,
                    },
                    {
                      label: "Max",
                      onClick: () => doAggregate(nodeId, col, "MAX"),
                      hint: curAgg === "MAX" ? "✓" : undefined,
                    },
                    // Count(*) moved to table-level menu
                    {
                      label: "Count(distinct)",
                      onClick: () => doAggregate(nodeId, col, "COUNT_DISTINCT"),
                      hint: curAgg === "COUNT_DISTINCT" ? "✓" : undefined,
                    },
                    {
                      label: "Avg",
                      onClick: () => doAggregate(nodeId, col, "AVG"),
                      hint: curAgg === "AVG" ? "✓" : undefined,
                    },
                    {
                      label: "Sum",
                      onClick: () => doAggregate(nodeId, col, "SUM"),
                      hint: curAgg === "SUM" ? "✓" : undefined,
                    },
                  ],
                },
                { type: "divider" },
                {
                  label: "Order Ascending",
                  onClick: () => doOrder(nodeId, col, "ASC"),
                  hint:
                    ord && (ord.direction || "ASC") === "ASC" ? "✓" : undefined,
                },
                {
                  label: "Order Descending",
                  onClick: () => doOrder(nodeId, col, "DESC"),
                  hint: ord && ord.direction === "DESC" ? "✓" : undefined,
                },
                { type: "divider" },
                {
                  label: "Group By",
                  onClick: () => doGroup(nodeId, col),
                  hint: grp ? "✓" : undefined,
                },
              ];

              return items;
            }

            return [];
          })()}
        />
      )}
      {filterPanel.visible && (
        <FilterPanel
          x={filterPanel.x}
          y={filterPanel.y}
          nodeId={filterPanel.nodeId}
          column={filterPanel.column}
          colDef={filterPanel.colDef}
          onApply={applyFilter}
          onClose={() => setFilterPanel({ visible: false })}
        />
      )}
    </div>
  );
}
