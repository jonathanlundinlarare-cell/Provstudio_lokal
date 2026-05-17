/**
 * RichTextToolbar — flytande formateringsverktygsfält som visas
 * när text markeras i en richText-Editable.
 * Renderas via React Portal i document.body.
 */
import React, { useCallback, useRef, useState } from "react";
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

/**
 * Apply a color to the current selection using Range API (span with inline style).
 * Avoids execCommand("foreColor") which creates <font color="..."> elements.
 */
function applyColor(color: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const contents = range.extractContents();
  const span = document.createElement("span");
  span.style.color = color;
  span.appendChild(contents);
  range.insertNode(span);

  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.addRange(newRange);

  span.closest("[contenteditable]")?.dispatchEvent(
    new Event("input", { bubbles: true })
  );
}

/**
 * Apply a font-size in px to the current selection using the Range API.
 * Extracts selected content and wraps it in <span style="font-size: Xpx">.
 */
function applyFontSize(px: number) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  // Extract the selected content and wrap in a span with the desired font-size
  const contents = range.extractContents();
  const span = document.createElement("span");
  span.style.fontSize = `${px}px`;
  span.appendChild(contents);
  range.insertNode(span);

  // Re-select the inserted span so the user can keep adjusting
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.addRange(newRange);

  // Notify the contenteditable so Editable.tsx saves the change on blur
  span.closest("[contenteditable]")?.dispatchEvent(
    new Event("input", { bubbles: true })
  );
}

export function RichTextToolbar({ rect, onClose }: Props) {
  const [fontSize, setFontSize] = useState(14);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleFontDecrease = useCallback(() => {
    const next = Math.max(6, fontSize - 2);
    setFontSize(next);
    applyFontSize(next);
  }, [fontSize]);

  const handleFontIncrease = useCallback(() => {
    const next = Math.min(96, fontSize + 2);
    setFontSize(next);
    applyFontSize(next);
  }, [fontSize]);

  const toolbarWidth = 310;
  const toolbarHeight = 38;

  // Position above selection, centered
  let left = rect.left + rect.width / 2 - toolbarWidth / 2;
  let top  = rect.top  - toolbarHeight - 8;

  // Clamp to viewport
  left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));
  if (top < 8) top = rect.bottom + 8;

  const btnStyle: React.CSSProperties = {
    width: 26, height: 26,
    borderRadius: 5,
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  const divider = (
    <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)", margin: "0 2px", flexShrink: 0 }} />
  );

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
        gap: 1,
        padding: "0 6px",
        zIndex: 9999,
        userSelect: "none",
        overflow: "hidden",
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

      {divider}

      {/* Font size: smaller */}
      <button style={{ ...btnStyle, fontSize: 9 }} title="Mindre text" onClick={handleFontDecrease}>A−</button>

      {/* Font size indicator */}
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", minWidth: 20, textAlign: "center", flexShrink: 0 }}>
        {fontSize}
      </span>

      {/* Font size: larger */}
      <button style={{ ...btnStyle, fontSize: 14 }} title="Större text" onClick={handleFontIncrease}>A+</button>

      {divider}

      {/* Color swatches */}
      {COLORS.map(c => (
        <button
          key={c.value}
          title={c.label}
          onMouseDown={e => { e.preventDefault(); applyColor(c.value); }}
          style={{
            width: 16, height: 16, borderRadius: 99,
            border: c.value === "#FFFFFF" ? "1px solid rgba(255,255,255,0.4)" : "none",
            background: c.value,
            cursor: "pointer", flexShrink: 0,
          }}
        />
      ))}

      {/* Custom color picker */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <input
          ref={colorInputRef}
          type="color"
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
          onChange={e => applyColor(e.target.value)}
        />
        <button
          title="Välj färg"
          onMouseDown={e => {
            e.preventDefault();
            colorInputRef.current?.click();
          }}
          style={{
            width: 16, height: 16, borderRadius: 99,
            border: "none",
            background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
            cursor: "pointer", flexShrink: 0,
          }}
        />
      </div>

      {divider}

      {/* Remove formatting + close */}
      <button style={{ ...btnStyle, fontSize: 10, opacity: 0.7 }} title="Ta bort formatering"
        onClick={() => { cmd("removeFormat"); onClose(); }}>✕</button>
    </div>,
    document.body,
  );
}

export default RichTextToolbar;
