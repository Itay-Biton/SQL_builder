export function generateSQL(query) {
  if (!query) return "";
  if (!query.select || query.select.length === 0)
    return "-- No columns selected.";
  // Build a stable, unique alias map from nodeId -> alias to avoid duplicate
  // alias collisions (which break SQL when two tables share the same alias).
  const aliasCounts = Object.create(null);
  const aliasMap = Object.create(null); // nodeId -> finalAlias
  const tableByNode = Object.create(null);
  (query.tables || []).forEach((t) => {
    const base =
      (t.alias && String(t.alias)) ||
      (t.table && String(t.table).slice(0, 2)) ||
      "t";
    let a = base;
    if (!aliasCounts[a]) aliasCounts[a] = 0;
    // if alias already used, append incremental suffix
    while (Object.values(aliasMap).includes(a)) {
      aliasCounts[base] = (aliasCounts[base] || 1) + 1;
      a = `${base}${aliasCounts[base]}`;
    }
    aliasMap[t.nodeId] = a;
    tableByNode[t.nodeId] = t;
  });

  const selectClauses = query.select.map((s) => {
    const table = tableByNode[s.nodeId];
    const alias = table ? aliasMap[s.nodeId] : null;
    const qual =
      s.column === "*" ? "*" : alias ? `${alias}.${s.column}` : s.column;
    if (s.aggregate) {
      let ag;
      if (s.aggregate === "COUNT_DISTINCT") {
        ag = `COUNT(DISTINCT ${qual})`;
      } else if (s.aggregate === "COUNT" && qual === "*") {
        ag = `COUNT(${qual})`;
      } else {
        ag = `${s.aggregate}(${qual})`;
      }
      return s.outputAlias ? `${ag} AS ${s.outputAlias}` : ag;
    }
    return s.outputAlias ? `${qual} AS ${s.outputAlias}` : qual;
  });

  if (!query.tables || query.tables.length === 0)
    return "-- No tables on canvas.";
  const base =
    query.tables.find((t) => t.nodeId === query.baseTableNodeId) ||
    query.tables[0];
  const baseAlias = aliasMap[base.nodeId] || base.alias;
  const from = `${base.schema ? base.schema + "." : ""}${base.table} AS ${baseAlias}`;

  let sql = `SELECT\n  ${selectClauses.join(",\n  ")}\nFROM ${from}`;

  // Disallow implicit CROSS JOINs: if multiple tables exist but no joins were declared,
  // return a clear warning comment rather than emitting CROSS JOINs.
  if ((!query.joins || query.joins.length === 0) && query.tables.length > 1) {
    const aliases = query.tables.map((t) => t.alias).join(", ");
    return `-- ERROR: multiple tables present with no joins; cross joins are disallowed. Tables: ${aliases}`;
  }

  if (query.joins && query.joins.length) {
    // Build joins in an order that connects tables starting from the FROM/base table.
    const added = new Set([base.nodeId]);
    const pending = query.joins.slice();
    let progress = true;
    while (pending.length && progress) {
      progress = false;
      for (let i = 0; i < pending.length; ) {
        const j = pending[i];
        const left =
          tableByNode[j.leftNodeId] ||
          query.tables.find((t) => t.nodeId === j.leftNodeId);
        const right =
          tableByNode[j.rightNodeId] ||
          query.tables.find((t) => t.nodeId === j.rightNodeId);
        const leftAlias =
          aliasMap[j.leftNodeId] || (left ? left.alias : j.leftNodeId);
        const rightAlias =
          aliasMap[j.rightNodeId] || (right ? right.alias : j.rightNodeId);
        const joinType = j.type ? j.type.toUpperCase() : "INNER";

        // If left already present and right not, join right
        if (added.has(j.leftNodeId) && !added.has(j.rightNodeId)) {
          const cond = (j.conditions || [])
            .map(
              (c) =>
                `${leftAlias}.${c.leftColumn} ${c.operator} ${rightAlias}.${c.rightColumn}`,
            )
            .join(" AND ");
          sql += `\n${joinType} JOIN ${right && right.schema ? right.schema + "." : ""}${right ? right.table : j.rightNodeId} AS ${rightAlias} ON ${cond}`;
          added.add(j.rightNodeId);
          pending.splice(i, 1);
          progress = true;
          continue;
        }

        // If right already present and left not, join left
        if (added.has(j.rightNodeId) && !added.has(j.leftNodeId)) {
          const cond = (j.conditions || [])
            .map(
              (c) =>
                `${leftAlias}.${c.leftColumn} ${c.operator} ${rightAlias}.${c.rightColumn}`,
            )
            .join(" AND ");
          sql += `\n${joinType} JOIN ${left && left.schema ? left.schema + "." : ""}${left ? left.table : j.leftNodeId} AS ${leftAlias} ON ${cond}`;
          added.add(j.leftNodeId);
          pending.splice(i, 1);
          progress = true;
          continue;
        }

        // If both already added, skip
        if (added.has(j.leftNodeId) && added.has(j.rightNodeId)) {
          pending.splice(i, 1);
          progress = true;
          continue;
        }

        // Otherwise leave for next pass
        i++;
      }
    }

    if (pending.length) {
      // Could not connect some joins to the base table; append them anyway in declared order
      pending.forEach((j) => {
        const left =
          tableByNode[j.leftNodeId] ||
          query.tables.find((t) => t.nodeId === j.leftNodeId);
        const right =
          tableByNode[j.rightNodeId] ||
          query.tables.find((t) => t.nodeId === j.rightNodeId);
        const leftAlias =
          aliasMap[j.leftNodeId] || (left ? left.alias : j.leftNodeId);
        const rightAlias =
          aliasMap[j.rightNodeId] || (right ? right.alias : j.rightNodeId);
        const joinType = j.type ? j.type.toUpperCase() : "INNER";
        const cond = (j.conditions || [])
          .map(
            (c) =>
              `${leftAlias}.${c.leftColumn} ${c.operator} ${rightAlias}.${c.rightColumn}`,
          )
          .join(" AND ");
        sql += `\n${joinType} JOIN ${right && right.schema ? right.schema + "." : ""}${right ? right.table : j.rightNodeId} AS ${rightAlias} ON ${cond}`;
      });
    }
  }

  // WHERE / filters
  if (query.filters && query.filters.length) {
    // Build a fully-parenthesized left-associative expression honoring conjunctions and NOT
    let whereExpr = null;
    for (const f of query.filters) {
      if (!f) continue;
      let part = null;
      // sanitize expression fragments conservatively: do not strip characters
      // that may be part of quoted literals (semicolons, percent, comment markers).
      // We only normalize null bytes and whitespace to avoid accidental control chars.
      function sanitizeExpression(expr) {
        if (!expr) return expr;
        // remove NUL bytes
        expr = expr.replace(/\x00/g, "");
        // collapse repeated whitespace to a single space, preserve punctuation
        expr = expr.replace(/\s+/g, " ").trim();
        return expr;
      }
      if (f.column) {
        const t =
          tableByNode[f.nodeId] ||
          query.tables.find((t) => t.nodeId === f.nodeId);
        const qual = t
          ? `${aliasMap[f.nodeId] || t.alias}.${f.column}`
          : f.column;
        part = `${qual} ${sanitizeExpression(f.expression)}`;
      } else {
        part = sanitizeExpression(f.expression) || null;
      }
      if (!part) continue;
      if (f.negate) {
        part = `NOT (${part})`;
      }
      if (whereExpr === null) {
        whereExpr = `(${part})`;
      } else {
        const conj = (f.conjunction || "AND").toUpperCase();
        whereExpr = `(${whereExpr}) ${conj} (${part})`;
      }
    }
    if (whereExpr) sql += `\nWHERE ${whereExpr}`;
  }

  // GROUP BY
  if (query.groupBy && query.groupBy.length) {
    // Start with explicit groupBy entries
    const groupSet = new Set();
    query.groupBy.forEach((g) => {
      const t =
        tableByNode[g.nodeId] ||
        query.tables.find((t) => t.nodeId === g.nodeId);
      const qual = t
        ? `${aliasMap[g.nodeId] || t.alias}.${g.column}`
        : g.column;
      if (qual) groupSet.add(qual);
    });

    // Ensure any non-aggregated selected columns are also grouped
    (query.select || []).forEach((s) => {
      if (!s) return;
      if (s.aggregate) return; // aggregated expressions don't go in GROUP BY
      if (s.column === "*") return; // skip wildcard
      const t =
        tableByNode[s.nodeId] ||
        query.tables.find((t) => t.nodeId === s.nodeId);
      const qual = t
        ? `${aliasMap[s.nodeId] || t.alias}.${s.column}`
        : s.column;
      if (qual) groupSet.add(qual);
    });

    const group = Array.from(groupSet).join(", ");
    if (group) sql += `\nGROUP BY ${group}`;
  }

  if (query.orderBy && query.orderBy.length) {
    const order = query.orderBy
      .map((o) => {
        const t =
          tableByNode[o.nodeId] ||
          query.tables.find((t) => t.nodeId === o.nodeId);
        const qual = t
          ? `${aliasMap[o.nodeId] || t.alias}.${o.column}`
          : o.column;
        return `${qual} ${o.direction || "ASC"}`;
      })
      .join(", ");
    sql += `\nORDER BY ${order}`;
  }

  if (query.limit) sql += `\nLIMIT ${query.limit}`;
  return sql;
}
