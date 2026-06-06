import React, { useState, useRef } from "react";

export default function ContextMenu({ x, y, items, onClose }) {
  if (!items || items.length === 0) return null;

  const style = {
    position: "fixed",
    left: x,
    top: y,
    background: "#ffffff",
    border: "1px solid #e6edf3",
    boxShadow: "0 6px 20px rgba(15,23,42,0.12)",
    borderRadius: 6,
    padding: 6,
    zIndex: 9999,
    minWidth: 180,
    fontSize: 13,
    color: "#0f1724",
  };

  const [activeSub, setActiveSub] = useState(null);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const closeTimer = useRef(null);

  function handleClick(e, cb) {
    e.stopPropagation();
    if (cb) cb();
    if (onClose) onClose();
  }

  return (
    <div
      ref={containerRef}
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, idx) => {
        if (it.type === "divider")
          return (
            <div
              key={idx}
              style={{ height: 1, background: "#eef3f8", margin: "6px 0" }}
            />
          );

        if (it.items && Array.isArray(it.items)) {
          // handlers must be defined in JS (not inside returned JSX)
          const onEnter = () => {
            if (closeTimer.current) {
              clearTimeout(closeTimer.current);
              closeTimer.current = null;
            }
            setActiveSub(idx);
          };
          const onLeave = () => {
            // small delay so user can move into submenu
            closeTimer.current = setTimeout(() => setActiveSub(null), 260);
          };

          // compute submenu position when active
          // Use fixed viewport coordinates to avoid transform/ancestor issues
          let submenuStyle = {};
          if (activeSub === idx && itemRefs.current[idx]) {
            const item = itemRefs.current[idx].getBoundingClientRect();
            // place submenu overlapping a few pixels to the right so there's no gap
            submenuStyle = {
              position: "fixed",
              left: `${Math.max(8, item.right - 8)}px`,
              top: `${Math.max(8, item.top)}px`,
            };
          }

          return (
            <div
              key={idx}
              ref={(el) => (itemRefs.current[idx] = el)}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px",
                cursor: "default",
                position: "relative",
              }}
            >
              <div>{it.label}</div>
              <div style={{ marginLeft: 8, color: "#6b7280" }}>▸</div>
              {activeSub === idx && (
                <div
                  style={{
                    ...submenuStyle,
                    background: "#fff",
                    border: "1px solid #e6edf3",
                    boxShadow: "0 6px 20px rgba(15,23,42,0.12)",
                    borderRadius: 6,
                    padding: 6,
                    zIndex: 10000,
                    minWidth: 160,
                  }}
                  onMouseEnter={() => {
                    if (closeTimer.current) {
                      clearTimeout(closeTimer.current);
                      closeTimer.current = null;
                    }
                    setActiveSub(idx);
                  }}
                  onMouseLeave={() => {
                    closeTimer.current = setTimeout(
                      () => setActiveSub(null),
                      260,
                    );
                  }}
                >
                  {it.items.map((sit, sidx) => (
                    <div
                      key={sidx}
                      onClick={(e) => handleClick(e, sit.onClick)}
                      style={{
                        padding: "6px 8px",
                        cursor: sit.onClick ? "pointer" : "default",
                      }}
                    >
                      {sit.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={idx}
            onClick={(e) => handleClick(e, it.onClick)}
            style={{
              padding: "6px 8px",
              cursor: it.onClick ? "pointer" : "default",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>{it.label}</div>
            {it.hint ? (
              <div style={{ color: "#6b7280", marginLeft: 8 }}>{it.hint}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
