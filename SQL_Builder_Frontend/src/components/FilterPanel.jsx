import React, { useState, useEffect } from "react";

export default function FilterPanel({
  x,
  y,
  nodeId,
  column,
  colDef,
  onApply,
  onClose,
}) {
  const type = ((colDef && colDef.type) || "").toLowerCase();
  const isDate = type.includes("date") || type.includes("time");
  const isNumber = /int|number|decimal|float|double/.test(type);

  const [op, setOp] = useState(isNumber ? ">" : "contains");
  const [val, setVal] = useState("");
  const [val2, setVal2] = useState("");
  const [conjunction, setConjunction] = useState("AND");
  const [negate, setNegate] = useState(false);

  useEffect(() => {
    setOp(isNumber ? ">" : isDate ? "between" : "contains");
    setVal("");
    setVal2("");
    setConjunction("AND");
    setNegate(false);
  }, [nodeId, column, colDef]);

  function apply() {
    let expression = "";
    function hasSuspiciousChars(s) {
      if (!s) return false;
      // semicolons, line comments, block comment starts, NUL
      return /;|--|\/\*|\x00/.test(s);
    }
    if (isDate) {
      if (op === "between") {
        if (!val || !val2) return alert("Please select both dates");
        expression = `BETWEEN '${val}' AND '${val2}'`;
      } else if (op === "=") {
        if (!val) return alert("Please select a date");
        expression = `= '${val}'`;
      }
    } else if (isNumber) {
      if (op === "between") {
        if (val === "" || val2 === "") return alert("Enter both numbers");
        expression = `BETWEEN ${val} AND ${val2}`;
      } else {
        if (val === "") return alert("Enter a number");
        expression = `${op} ${val}`;
      }
    } else {
      // text
      if (hasSuspiciousChars(val) || hasSuspiciousChars(val2)) {
        return alert(
          "Filter contains disallowed characters (semicolon or SQL comment markers).",
        );
      }
      if (op === "contains") {
        if (!val) return alert("Enter text");
        expression = `LIKE '%${val.replace(/'/g, "''")}%'`;
      } else if (op === "=") {
        if (!val) return alert("Enter text");
        expression = `= '${val.replace(/'/g, "''")}'`;
      } else if (op === "starts") {
        if (!val) return alert("Enter text");
        expression = `LIKE '${val.replace(/'/g, "''")}%'`;
      } else if (op === "ends") {
        if (!val) return alert("Enter text");
        expression = `LIKE '%${val.replace(/'/g, "''")}'`;
      }
    }

    onApply({ nodeId, column, expression, conjunction, negate });
  }

  const panelStyle = {
    position: "fixed",
    left: x,
    top: y,
    transform: "translate(6px,6px)",
    background: "#fff",
    border: "1px solid #e6edf3",
    boxShadow: "0 6px 20px rgba(15,23,42,0.12)",
    borderRadius: 6,
    padding: 8,
    zIndex: 11000,
    minWidth: 220,
    fontSize: 13,
    color: "#0f1724",
  };

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{column} — Filter</div>
      {isDate && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <select value={op} onChange={(e) => setOp(e.target.value)}>
            <option value="=">On</option>
            <option value="between">Between</option>
          </select>
          {op === "between" ? (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="date"
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
              <input
                type="date"
                value={val2}
                onChange={(e) => setVal2(e.target.value)}
              />
            </div>
          ) : (
            <input
              type="date"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          )}
        </div>
      )}

      {isNumber && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <select value={op} onChange={(e) => setOp(e.target.value)}>
            <option value=">">&gt;</option>
            <option value=">=">&gt;=</option>
            <option value="<">&lt;</option>
            <option value="<=">&lt;=</option>
            <option value="=">=</option>
            <option value="!=">!=</option>
            <option value="between">Between</option>
          </select>
          {op === "between" ? (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
              <input
                type="number"
                value={val2}
                onChange={(e) => setVal2(e.target.value)}
              />
            </div>
          ) : (
            <input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          )}
        </div>
      )}

      {!isDate && !isNumber && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <select value={op} onChange={(e) => setOp(e.target.value)}>
            <option value="contains">Contains</option>
            <option value="=">Equals</option>
            <option value="starts">Starts with</option>
            <option value="ends">Ends with</option>
          </select>
          <input value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button onClick={onClose}>Cancel</button>
        <button onClick={apply} style={{ fontWeight: 700 }}>
          Apply
        </button>
      </div>
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}
      >
        <label style={{ fontSize: 12 }}>Combine with:</label>
        <select
          value={conjunction}
          onChange={(e) => setConjunction(e.target.value)}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <label
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginLeft: 12,
          }}
        >
          <input
            type="checkbox"
            checked={negate}
            onChange={(e) => setNegate(e.target.checked)}
          />
          <span style={{ fontSize: 12 }}>NOT</span>
        </label>
      </div>
    </div>
  );
}
