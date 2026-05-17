/**
 * RichTextToolbar — flytande formateringsverktygsfält som visas
 * när text markeras i en richText-Editable.
 * Renderas via React Portal i document.body.
 */
import React from "react";
import { createPortal } from "react-dom";

interface Props {
  /** Markerade textens bounding rect (från Range.getBoundingClientRect) */
  rect: DOMRect;
  /** Anropas när verktygsfältet ska stängas */
  onClose: () => void;
}

const COLORS = [
  { label: "Svart",    value: "#14110D" },
  { label: "Vit",      value: "#FFFFFF" },
  { label: "Röd",      value: "#C0392B" },
  { label: "Blå",      value: "#1E3A5F" },
  { label: "Grön",     value: "#1E5F5C" },
];

function cmd(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextToolbar({ rect, onClose }: Props) {
  const toolbarWidth = 260;
  const toolbarHeight = 38;
  const scrollY = window.scrollY ?? 0;
  const scrollX = window.scrollX ?? 0;

  // Position above selection, centered
  let left = rect.left + scrollX + rect.width / 2 - toolbarWidth / 2;
  let top  = rect.top  + scrollY - toolbarHeight - 8;

  // Clamp to viewport
  left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));
  if (top < 8) top = rect.bottom + scrollY + 8;

  const btnStyle: React.CSSProperties = {
    width: 28, height: 28,
    borderRadius: 5,
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  return createPortal(
    <div
      onMouseDown={e => e.preventDefault()} // prevent blur before execCommand
      style={{
        position: "fixed",
        left, top,
        width: toolbarWidth,
        height: toolbarHeight,
        background: "#1a1917",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "0 6px",
        zIndex: 9999,
        userSelect: "none",
      }}
    >
      {/* Bold */}
      <button style={{ ...btnStyle, fontFamily: "Georgia, serif" }} title="Fetstil (Ctrl+B)"
        onClick={() => cmd("bold")}>B</button>

      {/* Italic */}
      <button style={{ ...btnStyle, fontStyle: "italic", fontFamily: "Georgia, serif" }} title="Kursiv (Ctrl+I)"
        onClick={() => cmd("italic")}>I</button>

      {/* Underline */}
      <button style={{ ...btnStyle, textDecoration: "underline" }} title="Understrykning (Ctrl+U)"
        onClick={() => cmd("underline")}>U</button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />

      {/* Font size: smaller / larger */}
      <button style={{ ...btnStyle, fontSize: 10 }} title="Mindre text"
        onClick={() => cmd("fontSize", "2")}>A−</button>
      <button style={{ ...btnStyle, fontSize: 15 }} title="Större text"
        onClick={() => cmd("fontSize", "5")}>A+</button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />

      {/* Color swatches */}
      {COLORS.map(c => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => cmd("foreColor", c.value)}
          style={{
            width: 18, height: 18, borderRadius: 99,
            border: c.value === "#FFFFFF" ? "1px solid rgba(255,255,255,0.4)" : "none",
            background: c.value,
            cursor: "pointer", flexShrink: 0,
          }}
        />
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />

      {/* Remove formatting */}
      <button style={{ ...btnStyle, fontSize: 11, opacity: 0.7 }} title="Ta bort formatering"
        onClick={() => { cmd("removeFormat"); onClose(); }}>✕</button>
    </div>,
    document.body,
  );
}

export default RichTextToolbar;
