import React, { useEffect, useState, useRef } from "react";
import SchemaExplorer from "./components/SchemaExplorer";
import CanvasWorkspace from "./components/CanvasWorkspace";
import QueryPreview from "./components/QueryPreview";
import HelpModal from "./components/HelpModal";
import UsersAdmin from "./components/UsersAdmin";
import { generateSQL } from "./utils/sqlGenerator";
import api from "./utils/api";
import * as XLSX from "xlsx";
import Login from "./components/Login";

function normalizeSchema(sd) {
  if (!sd) return { tables: [] };
  const out = { ...sd };
  const rawTables = sd.tables || [];

  if (Array.isArray(rawTables)) {
    out.tables = rawTables.map((t) => ({
      ...t,
      columns: (t.columns || []).map((c) =>
        typeof c === "string" ? { name: c, type: "string" } : c,
      ),
    }));
    return out;
  }

  // rawTables is an object map: { tableName: { columns: [...], ... } }
  out.tables = Object.entries(rawTables).map(([tblName, def]) => {
    const cols = def.columns || [];
    const columns = Array.isArray(cols)
      ? cols.map((c) =>
          typeof c === "string" ? { name: c, type: "string" } : c,
        )
      : [];
    // spread the raw definition first, then override with normalized fields
    return {
      ...def,
      name: tblName,
      label: def.label || tblName,
      schema: def.schema || null,
      database: def.database || null,
      objectType: def.objectType || "table",
      columns,
    };
  });
  return out;
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [schema, setSchema] = useState({ tables: [] });
  const [helpOpen, setHelpOpen] = useState(false);

  const [query, setQuery] = useState(() => ({
    id: makeId("query"),
    name: "untitled",
    dialect: "ansi",
    // simple global COUNT(*) flag
    countStarActive: false,
    baseTableNodeId: null,
    tables: [],
    joins: [],
    select: [],
    filters: [],
    groupBy: [],
    orderBy: [],
    limit: 1000,
    ui: {
      zoom: 1,
      pan: { x: 0, y: 0 },
      rightPanelOpen: true,
      resultsPanelOpen: false,
      resultsPanelHeight: 280,
      selectedNodeId: null,
      selectedJoinId: null,
    },
  }));

  const [results, setResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);

  // computed values for results table sizing
  const resultsColCount =
    results && results[0] ? Object.keys(results[0]).length : 1;
  const resultsTableWidth = resultsColCount * 160; // px per column

  function handleRunStart() {
    setResults(null);
    setResultsError(null);
    setResultsLoading(true);
  }

  function handleRunComplete(rows) {
    setResults(rows || []);
    setResultsLoading(false);
  }

  function handleRunError(err) {
    setResultsError(err);
    setResultsLoading(false);
  }

  // layout state for resizable panes
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [activeTab, setActiveTab] = useState("query"); // "query" or "results"
  const [runCooldown, setRunCooldown] = useState(false);
  const resizingRef = useRef(null);

  useEffect(() => {
    // set first table as base by default when added
    if (query.tables.length && !query.baseTableNodeId) {
      setQuery((q) => ({ ...q, baseTableNodeId: q.tables[0].nodeId }));
    }
  }, [query.tables]);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  // check current auth on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api.me();
        if (mounted && me && me.user) setUser(me.user);
      } catch (e) {
        // not logged in
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // fetch server schema when logged in (or attempt once if public)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await api.getSchema();
        if (resp && mounted) {
          const sd = { tables: resp.tables };
          setSchema(normalizeSchema(sd));
        }
      } catch (e) {
        // ignore, fall back to bundled schema
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  function addTableNode(tableDef, position) {
    // prevent adding the same physical table twice
    if (query.tables.some((t) => t.table === tableDef.name)) {
      alert("Table already added to canvas");
      return;
    }

    const nodeId = makeId("node");
    const aliasBase =
      tableDef.name
        .split("_")
        .map((s) => s[0])
        .join("") || tableDef.name.slice(0, 2);
    let alias = aliasBase;
    const existing = new Set(query.tables.map((t) => t.alias));
    let i = 2;
    while (existing.has(alias)) {
      alias = `${aliasBase}${i}`;
      i++;
    }
    const posOffset = position || {
      x: 60 + query.tables.length * 40,
      y: 80 + query.tables.length * 10,
    };
    const node = {
      nodeId,
      database: tableDef.database || null,
      schema: tableDef.schema || null,
      table: tableDef.name,
      alias,
      position: posOffset,
      collapsed: false,
    };
    // detect simple FK-based joins against existing canvas tables before mutating state
    const existingTables = query.tables || [];
    const schemaTables = (schema && schema.tables) || [];

    function getSchemaDef(tblName) {
      return schemaTables.find((s) => s.name === tblName);
    }

    const detectedJoins = [];

    // helper to check duplicate or symmetric existing join (avoid reverse duplicates)
    function joinExists(leftNodeId, rightNodeId, leftColumn, rightColumn) {
      const checkJoinList = (list) =>
        (list || []).some((j) => {
          if (j.leftNodeId === leftNodeId && j.rightNodeId === rightNodeId) {
            return (j.conditions || []).some(
              (c) =>
                c.leftColumn === leftColumn && c.rightColumn === rightColumn,
            );
          }
          if (j.leftNodeId === rightNodeId && j.rightNodeId === leftNodeId) {
            return (j.conditions || []).some(
              (c) =>
                c.leftColumn === rightColumn && c.rightColumn === leftColumn,
            );
          }
          return false;
        });

      return checkJoinList(query.joins) || checkJoinList(detectedJoins);
    }

    existingTables.forEach((et) => {
      const etSchema = getSchemaDef(et.table);
      const newSchema = getSchemaDef(node.table);
      const etPk =
        (etSchema && (etSchema.columns || []).find((c) => c.isPrimaryKey)) ||
        null;
      const newPk =
        (newSchema && (newSchema.columns || []).find((c) => c.isPrimaryKey)) ||
        null;

      ((newSchema && newSchema.columns) || []).forEach((col) => {
        if (!col || !col.name) return;
        if (/_id$/.test(col.name)) {
          const base = col.name.replace(/_id$/, "");
          if (
            base &&
            (et.table.includes(base) ||
              et.table.split("_").some((p) => p === base) ||
              et.table.replace(/s$/, "") === base)
          ) {
            const pkName = (etPk && etPk.name) || "id";
            if (!joinExists(et.nodeId, node.nodeId, pkName, col.name)) {
              detectedJoins.push({
                leftNodeId: et.nodeId,
                rightNodeId: node.nodeId,
                type: "INNER",
                conditions: [
                  { leftColumn: pkName, operator: "=", rightColumn: col.name },
                ],
              });
            }
          }
        }
      });

      ((etSchema && etSchema.columns) || []).forEach((col) => {
        if (!col || !col.name) return;
        if (/_id$/.test(col.name)) {
          const base = col.name.replace(/_id$/, "");
          if (
            base &&
            (node.table.includes(base) ||
              node.table.split("_").some((p) => p === base) ||
              node.table.replace(/s$/, "") === base)
          ) {
            const pkName = (newPk && newPk.name) || "id";
            if (!joinExists(node.nodeId, et.nodeId, pkName, col.name)) {
              detectedJoins.push({
                leftNodeId: node.nodeId,
                rightNodeId: et.nodeId,
                type: "INNER",
                conditions: [
                  { leftColumn: pkName, operator: "=", rightColumn: col.name },
                ],
              });
            }
          }
        }
      });
    });

    // If no immediate joins detected, try to find a join path in the schema
    if (
      existingTables.length > 0 &&
      detectedJoins.length === 0 &&
      (query.joins || []).length === 0
    ) {
      const schemaMap = (schema && schema.tables) || [];
      const tableNames = schemaMap.map((s) => s.name);

      function hasFkLike(fromName, toName) {
        const from = schemaMap.find((s) => s.name === fromName);
        const to = schemaMap.find((s) => s.name === toName);
        if (!from || !to) return false;
        const toVariants = [toName, toName.replace(/s$/, "")];
        return (from.columns || []).some((c) => {
          if (!c || !c.name) return false;
          if (!/_id$/.test(c.name)) return false;
          const base = c.name.replace(/_id$/, "");
          return toVariants.some(
            (v) => base === v || v.includes(base) || base.includes(v),
          );
        });
      }

      function findPath(start, target) {
        const q = [start];
        const prev = Object.create(null);
        prev[start] = null;
        while (q.length) {
          const cur = q.shift();
          if (cur === target) break;
          for (const nbr of tableNames) {
            if (prev[nbr] !== undefined) continue;
            if (hasFkLike(cur, nbr) || hasFkLike(nbr, cur)) {
              prev[nbr] = cur;
              q.push(nbr);
            }
          }
        }
        if (prev[target] === undefined) return null;
        const path = [];
        let cur = target;
        while (cur !== null) {
          path.unshift(cur);
          cur = prev[cur];
        }
        return path;
      }

      // try to find a path from any existing canvas table to the new table
      let chosenPath = null;
      let chosenFrom = null;
      for (const et of existingTables) {
        const p = findPath(et.table, node.table);
        if (p && p.length > 1) {
          chosenPath = p;
          chosenFrom = et.table;
          break;
        }
      }

      if (!chosenPath) {
        alert(
          "Cannot add table: no join detected and no schema path found. Cross joins are not allowed.",
        );
        return;
      }

      const toAddTables = [];
      const existingTableNames = new Set(existingTables.map((t) => t.table));
      for (const tblName of chosenPath) {
        if (existingTableNames.has(tblName)) continue;
        if (tblName === node.table) continue;
        const def = schemaMap.find((s) => s.name === tblName) || {
          name: tblName,
        };
        const aliasBase =
          def.name
            .split("_")
            .map((s) => s[0])
            .join("") || def.name.slice(0, 2);
        let alias = aliasBase;
        const existingAliases = new Set(
          (query.tables || []).map((t) => t.alias),
        );
        let i = 2;
        while (
          existingAliases.has(alias) ||
          toAddTables.some((t) => t.alias === alias)
        ) {
          alias = `${aliasBase}${i}`;
          i++;
        }
        const pos = {
          x: 60 + (query.tables.length + toAddTables.length) * 40,
          y: 80,
        };
        toAddTables.push({
          nodeId: makeId("node"),
          database: def.database || null,
          schema: def.schema || null,
          table: def.name,
          alias,
          position: pos,
          collapsed: false,
        });
      }

      // build joins for the full path
      const startIdx = chosenPath.indexOf(chosenFrom);
      const endIdx = chosenPath.indexOf(node.table);
      if (startIdx === -1 || endIdx === -1) {
        alert("Internal error while building join path");
        return;
      }
      const pathTableSequence = [];
      for (let i = startIdx; i <= endIdx; i++)
        pathTableSequence.push(chosenPath[i]);

      const newNodesByName = Object.create(null);
      (toAddTables || []).forEach((t) => (newNodesByName[t.table] = t));
      (existingTables || []).forEach((t) => (newNodesByName[t.table] = t));
      newNodesByName[node.table] = node;

      const joinsToAdd = [];

      function makeJoinBetween(aName, bName) {
        const aDef = schemaMap.find((s) => s.name === aName) || {};
        const bDef = schemaMap.find((s) => s.name === bName) || {};
        const aFk = (aDef.columns || []).find(
          (c) =>
            c &&
            c.name &&
            /_id$/.test(c.name) &&
            (function () {
              const base = c.name.replace(/_id$/, "");
              return (
                base === bName ||
                bName.replace(/s$/, "") === base ||
                bName.includes(base) ||
                base.includes(bName)
              );
            })(),
        );
        let leftName = aName;
        let rightName = bName;
        let leftCol = null;
        let rightCol = null;
        if (aFk) {
          leftName = aName;
          rightName = bName;
          leftCol = aFk.name;
          rightCol = (bDef.columns || []).find((c) => c && c.isPrimaryKey)
            ? (bDef.columns || []).find((c) => c && c.isPrimaryKey).name
            : "id";
        } else {
          const bFk = (bDef.columns || []).find(
            (c) =>
              c &&
              c.name &&
              /_id$/.test(c.name) &&
              (function () {
                const base = c.name.replace(/_id$/, "");
                return (
                  base === aName ||
                  aName.replace(/s$/, "") === base ||
                  aName.includes(base) ||
                  base.includes(aName)
                );
              })(),
          );
          if (bFk) {
            leftName = bName;
            rightName = aName;
            leftCol = bFk.name;
            rightCol = (aDef.columns || []).find((c) => c && c.isPrimaryKey)
              ? (aDef.columns || []).find((c) => c && c.isPrimaryKey).name
              : "id";
          } else {
            const anyAId = (aDef.columns || []).find(
              (c) => c && c.name && /_id$/.test(c.name),
            );
            const anyBId = (bDef.columns || []).find(
              (c) => c && c.name && /_id$/.test(c.name),
            );
            if (anyAId) {
              // 'a' has a column ending with _id -> assume it's the foreign key
              leftName = aName;
              rightName = bName;
              leftCol = anyAId.name;
              rightCol = (bDef.columns || []).find((c) => c && c.isPrimaryKey)
                ? (bDef.columns || []).find((c) => c && c.isPrimaryKey).name
                : "id";
            } else if (anyBId) {
              // 'b' has a column ending with _id -> assume it's the foreign key
              leftName = bName;
              rightName = aName;
              leftCol = anyBId.name;
              rightCol = (aDef.columns || []).find((c) => c && c.isPrimaryKey)
                ? (aDef.columns || []).find((c) => c && c.isPrimaryKey).name
                : "id";
            } else {
              return null;
            }
          }
        }
        const leftNode = newNodesByName[leftName];
        const rightNode = newNodesByName[rightName];
        if (!leftNode || !rightNode) return null;
        return {
          leftNodeId: leftNode.nodeId,
          rightNodeId: rightNode.nodeId,
          type: "INNER",
          conditions: [
            { leftColumn: leftCol, operator: "=", rightColumn: rightCol },
          ],
        };
      }

      for (let i = 0; i < pathTableSequence.length - 1; i++) {
        const a = pathTableSequence[i];
        const b = pathTableSequence[i + 1];
        const j = makeJoinBetween(a, b);
        if (j) joinsToAdd.push(j);
      }

      const nodesToAppend = [...toAddTables, node];
      setQuery((q) => {
        const newTables = [...(q.tables || [])];
        nodesToAppend.forEach((n) => {
          if (!newTables.some((t) => t.table === n.table)) newTables.push(n);
        });
        const newJoins = [...(q.joins || [])];
        joinsToAdd.forEach((jj) => {
          const exists = newJoins.some((ex) => {
            if (
              ex.leftNodeId === jj.leftNodeId &&
              ex.rightNodeId === jj.rightNodeId
            ) {
              return (ex.conditions || []).some((c) =>
                (jj.conditions || []).some(
                  (nc) =>
                    nc.leftColumn === c.leftColumn &&
                    nc.rightColumn === c.rightColumn,
                ),
              );
            }
            return false;
          });
          if (!exists) newJoins.push({ joinId: makeId("join"), ...jj });
        });
        return { ...q, tables: newTables, joins: newJoins };
      });

      return;
    }

    // Safe to add: append node and any auto-detected joins
    setQuery((q) => {
      const newTables = [...(q.tables || []), node];
      const newJoins = [
        ...(q.joins || []),
        ...detectedJoins.map((j) => ({ joinId: makeId("join"), ...j })),
      ];
      return { ...q, tables: newTables, joins: newJoins };
    });
  }

  function toggleSelectColumn(nodeId, columnName) {
    setQuery((q) => {
      const exists = q.select.find(
        (s) => s.nodeId === nodeId && s.column === columnName,
      );
      if (exists) {
        return {
          ...q,
          select: q.select.filter(
            (s) => !(s.nodeId === nodeId && s.column === columnName),
          ),
        };
      } else {
        const sel = {
          selectId: makeId("sel"),
          nodeId,
          column: columnName,
          outputAlias: null,
          aggregate: null,
          groupBy: false,
          visible: true,
          order: q.select.length + 1,
        };
        return { ...q, select: [...q.select, sel] };
      }
    });
  }

  function saveQueryToLocal() {
    const key = `vsql_${query.id}`;
    localStorage.setItem(key, JSON.stringify(query));
    alert("Saved to localStorage: " + key);
  }

  const sql = generateSQL(query);

  // treat SQL that is only comments (e.g. "-- No columns selected.") as empty
  function stripComments(s) {
    if (!s) return "";
    // remove block comments
    s = s.replace(/\/\*[\s\S]*?\*\//g, "");
    // remove line comments
    s = s.replace(/--.*$/gm, "");
    return s;
  }

  const hasSql = (() => {
    if (typeof sql !== "string") return false;
    const stripped = stripComments(sql);
    return stripped.trim().length > 0;
  })();

  // Run query with cooldown
  async function handleRunQuery() {
    if (runCooldown) return;
    if (!hasSql) return;

    setRunCooldown(true);
    setTimeout(() => setRunCooldown(false), 1000);

    setResults(null);
    setResultsError(null);
    setResultsLoading(true);
    setActiveTab("results");

    try {
      const resp = await api.runQuery(sql);
      setResults(resp.rows || []);
      handleRunComplete(resp.rows || []);
    } catch (e) {
      const err = e.body || e.message || "Error";
      setResultsError(err);
      handleRunError(err);
    } finally {
      setResultsLoading(false);
    }
  }

  // --- Resize handlers ---
  function startVerticalResize(which, e) {
    e.preventDefault();
    const startX = e.clientX;
    const startSidebar = sidebarWidth;
    resizingRef.current = { which, startX, startSidebar };

    function onMouseMove(ev) {
      if (!resizingRef.current) return;
      const dx = ev.clientX - resizingRef.current.startX;
      if (resizingRef.current.which === "sidebar") {
        const newW = Math.max(160, resizingRef.current.startSidebar + dx);
        setSidebarWidth(newW);
      }
    }

    function onMouseUp() {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function startHorizontalResize(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomPanelHeight;
    resizingRef.current = { which: "bottom", startY, startH };

    function onMouseMove(ev) {
      if (!resizingRef.current) return;
      const dy = ev.clientY - resizingRef.current.startY;
      const newH = Math.max(120, resizingRef.current.startH - dy);
      setBottomPanelHeight(newH);
    }

    function onMouseUp() {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function addJoin(join) {
    const joinWithId = { joinId: makeId("join"), ...join };
    setQuery((q) => ({ ...q, joins: [...(q.joins || []), joinWithId] }));
  }

  function removeJoin(joinId) {
    setQuery((q) => ({
      ...q,
      joins: (q.joins || []).filter((j) => j.joinId !== joinId),
    }));
  }

  async function handleRefreshSchema() {
    if (
      !window.confirm(
        "Refresh schema from server? This will overwrite the current schema. Continue?",
      )
    ) {
      return;
    }

    try {
      await api.refreshSchema();
      // re-fetch schema
      const resp = await api.getSchema();
      if (resp) setSchema(normalizeSchema({ tables: resp.tables }));
      alert("Schema refreshed");
    } catch (e) {
      alert(
        "Error refreshing schema: " +
          (e?.body?.error || e?.message || JSON.stringify(e)),
      );
    }
  }

  if (!authChecked) {
    return <div style={{ padding: 24 }}>Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f3f4f6",
        }}
      >
        <Login
          onLogin={(u) => {
            setUser(u);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      style={{
        gridTemplateRows: "56px 1fr",
        display: "grid",
      }}
    >
      <div className="topbar">
        <strong>Visual SQL Builder</strong>
        <div style={{ marginLeft: 12 }}>
          {user && (
            <span style={{ marginRight: 8 }}>
              Signed in as <strong>{user.username}</strong>
            </span>
          )}
          {user && (
            <button
              onClick={() => {
                api.clearAuthToken();
                setUser(null);
              }}
            >
              Logout
            </button>
          )}
        </div>
        <button
          onClick={() => {
            // Reset the whole query (acts as New / Clear)
            setQuery({
              id: makeId("query"),
              name: "untitled",
              dialect: "ansi",
              baseTableNodeId: null,
              tables: [],
              joins: [],
              select: [],
              filters: [],
              groupBy: [],
              orderBy: [],
              limit: 1000,
              countStarActive: false,
              ui: {
                zoom: 1,
                pan: { x: 0, y: 0 },
                rightPanelOpen: true,
                resultsPanelOpen: false,
                resultsPanelHeight: 200,
                selectedNodeId: null,
                selectedJoinId: null,
              },
            });
          }}
        >
          New
        </button>
        <button
          onClick={() => {
            setHelpOpen(true);
          }}
          style={{ marginLeft: 8 }}
        >
          Help
        </button>
        {user && user.role === "admin" && (
          <>
            <button
              onClick={() => {
                handleRefreshSchema();
              }}
              style={{ marginLeft: 8 }}
            >
              Refresh Schema
            </button>
            <button
              onClick={() => setUsersModalOpen(true)}
              style={{ marginLeft: 8 }}
            >
              Manage Users
            </button>
            {/* Switch DB removed (deprecated) */}
          </>
        )}
      </div>
      <div
        className="main"
        style={{
          gridTemplateColumns: `${sidebarWidth}px 8px 1fr`,
          gridTemplateRows: "1fr",
          display: "grid",
        }}
      >
        <div className="sidebar">
          <SchemaExplorer
            schema={schema}
            onAddTable={addTableNode}
            query={query}
            onAddJoin={addJoin}
            onRemoveJoin={removeJoin}
          />
        </div>
        <div
          className="resizer-vertical"
          onMouseDown={(e) => startVerticalResize("sidebar", e)}
          title="Resize sidebar"
        />

        <div
          className="right-side"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            position: "relative",
          }}
        >
          <div
            className="canvas"
            style={{ flex: 1, minHeight: 0, position: "relative" }}
          >
            <CanvasWorkspace
              query={query}
              setQuery={setQuery}
              onToggleColumn={toggleSelectColumn}
              onAddTable={addTableNode}
              schema={schema}
              onAddJoin={addJoin}
              onRemoveJoin={removeJoin}
            />

            {/* Run Query Button Overlay */}
            <button
              onClick={handleRunQuery}
              disabled={runCooldown || !sql}
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                padding: "14px 28px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#fff",
                background: runCooldown ? "#6B7280" : "#3B82F6",
                border: "none",
                borderRadius: "8px",
                cursor: runCooldown || !hasSql ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                transition: "all 0.2s ease",
                zIndex: 10,
                opacity: runCooldown || !hasSql ? 0.7 : 1,
                transform: "scale(1)",
                pointerEvents: runCooldown || !hasSql ? "none" : "auto",
              }}
              onMouseEnter={(e) => {
                if (!runCooldown && hasSql) {
                  e.target.style.background = "#2563EB";
                  e.target.style.boxShadow =
                    "0 6px 16px rgba(59, 130, 246, 0.4)";
                  e.target.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!runCooldown && hasSql) {
                  e.target.style.background = "#3B82F6";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(59, 130, 246, 0.3)";
                  e.target.style.transform = "scale(1)";
                }
              }}
            >
              {runCooldown ? "Running..." : "Execute Query"}
            </button>
          </div>

          <div
            className="horizontal-resizer"
            onMouseDown={startHorizontalResize}
            title="Resize panels"
          />

          <div
            className="bottom-panel"
            style={{
              display: "flex",
              flexDirection: "column",
              height: `${bottomPanelHeight}px`,
              overflow: "hidden",
            }}
          >
            {/* Tab buttons */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #ddd",
                background: "#f9fafb",
              }}
            >
              <button
                onClick={() => setActiveTab("query")}
                style={{
                  padding: "8px 16px",
                  background: activeTab === "query" ? "#fff" : "transparent",
                  border: activeTab === "query" ? "1px solid #ddd" : "none",
                  borderBottom:
                    activeTab === "query" ? "none" : "1px solid #ddd",
                  cursor: "pointer",
                  fontWeight: activeTab === "query" ? "600" : "400",
                  borderRadius: "4px 4px 0 0",
                }}
              >
                SQL Query
              </button>
              <button
                onClick={() => setActiveTab("results")}
                style={{
                  padding: "8px 16px",
                  background: activeTab === "results" ? "#fff" : "transparent",
                  border: activeTab === "results" ? "1px solid #ddd" : "none",
                  borderBottom:
                    activeTab === "results" ? "none" : "1px solid #ddd",
                  cursor: "pointer",
                  fontWeight: activeTab === "results" ? "600" : "400",
                  borderRadius: "4px 4px 0 0",
                  marginLeft: 4,
                }}
              >
                Results
              </button>
            </div>

            {/* Tab content */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {activeTab === "query" && (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <QueryPreview
                    sql={sql}
                    json={query}
                    onRunStart={handleRunStart}
                    onRunComplete={handleRunComplete}
                    onRunError={handleRunError}
                  />
                </div>
              )}

              {activeTab === "results" && (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <strong>Results</strong>
                    <div>
                      <button
                        onClick={() => {
                          if (!results || !results.length) return;
                          (async () => {
                            try {
                              await api.exportLog(
                                "xlsx",
                                results.length,
                                query.name,
                              );
                            } catch (e) {
                              // don't block export on logging failure
                            }
                            const ws = XLSX.utils.json_to_sheet(results);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Results");
                            XLSX.writeFile(wb, "query_results.xlsx");
                          })();
                        }}
                        disabled={
                          !results || results.length === 0 || resultsLoading
                        }
                      >
                        Save as XLSX
                      </button>
                    </div>
                  </div>

                  <div>
                    {resultsLoading && <div>Running...</div>}
                    {resultsError && (
                      <div style={{ color: "red" }}>
                        {typeof resultsError === "string"
                          ? resultsError
                          : JSON.stringify(resultsError)}
                      </div>
                    )}
                    {!resultsLoading &&
                      !resultsError &&
                      (!results || results.length === 0) && (
                        <div>
                          No results yet. Run a query from the SQL Query tab.
                        </div>
                      )}

                    {results && results.length > 0 && (
                      <div
                        style={{
                          overflowX: "auto",
                          WebkitOverflowScrolling: "touch",
                          width: "100%",
                        }}
                      >
                        <table
                          style={{
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                            minWidth: resultsTableWidth,
                            width: "auto",
                          }}
                        >
                          <thead>
                            <tr>
                              {Object.keys(results[0]).map((k) => (
                                <th
                                  key={k}
                                  style={{
                                    border: "1px solid #ddd",
                                    padding: 8,
                                    background: "#f7fafc",
                                    textAlign: "left",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    width: 160,
                                    maxWidth: 240,
                                  }}
                                >
                                  {k}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results.map((r, i) => (
                              <tr
                                key={i}
                                style={{
                                  background: i % 2 === 0 ? "#fff" : "#fbfdff",
                                }}
                              >
                                {Object.keys(results[0]).map((k) => (
                                  <td
                                    key={k}
                                    style={{
                                      border: "1px solid #eee",
                                      padding: 8,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      width: 160,
                                    }}
                                  >
                                    {String(r[k])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <UsersAdmin
        open={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
      />
    </div>
  );
}
