/**
 * FreeformBlockWrapper — Omsluter ett block i freeform-canvas.
 *
 * Visar:
 *  • Drag-handle (kryss-pil) i övre vänster kant
 *  • Resize-handtag i alla 8 kanter (men vi exponerar bara SE + S + E för enkelhet)
 *  • Röd marginal-varning om blocket tangerar 15 mm-zonen
 *  • Hover-border i accent-färgen
 */
import { useRef } from "react";
import { GripVertical, AlertTriangle } from "lucide-react";
import { useFreeformDrag, type DragEdge } from "@/hooks/useFreeformDrag";
import type { BlockLayout } from "@/lib/test-types";

const MARGIN_MM  = 15; // varnings-zon
const A4_W       = 210;
const A4_H       = 297;

function isOutsideMargin(l: BlockLayout): boolean {
  return (
    l.x < MARGIN_MM ||
    l.y < MARGIN_MM ||
    l.x + l.w > A4_W - MARGIN_MM ||
    l.y + l.h > A4_H - MARGIN_MM
  );
}

interface FreeformBlockWrapperProps {
  layout: BlockLayout;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLayoutChange: (next: BlockLayout) => void;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export function FreeformBlockWrapper({
  layout, isSelected, containerRef, onLayoutChange, onClick, children,
}: FreeformBlockWrapperProps) {
  const { startDrag, startResize } = useFreeformDrag(layout, onLayoutChange);
  const warn = isOutsideMargin(layout);

  const resizeHandle = (edge: DragEdge, style: React.CSSProperties) => (
    <div
      key={edge}
      onPointerDown={e => {
        if (containerRef.current) startResize(e, containerRef.current, edge);
      }}
      style={{
        position: "absolute", zIndex: 20,
        background: isSelected ? "var(--ps-accent)" : "var(--ps-rule-2)",
        borderRadius: 2,
        ...style,
      }}
    />
  );

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left:   `${layout.x}mm`,
        top:    `${layout.y}mm`,
        width:  `${layout.w}mm`,
        height: `${layout.h}mm`,
        boxSizing: "border-box",
        border: "1.5px solid",
        borderColor: warn
          ? "#B2402A"
          : isSelected
            ? "var(--ps-accent)"
            : "var(--ps-rule)",
        borderRadius: 4,
        background: "var(--ps-paper)",
        overflow: "hidden",
        cursor: "default",
        userSelect: "none",
        transition: "border-color 0.1s",
      }}
    >
      {/* Drag handle */}
      <div
        onPointerDown={e => {
          if (containerRef.current) startDrag(e, containerRef.current);
        }}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 15,
          height: 18, background: isSelected ? "var(--ps-accent)18" : "var(--ps-bg-soft)",
          cursor: "grab", display: "flex", alignItems: "center", gap: 4,
          padding: "0 6px", borderBottom: "1px solid var(--ps-rule)",
          fontSize: 9, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)",
          touchAction: "none",
        }}
      >
        <GripVertical size={11} style={{ color: "var(--ps-ink-4)", flexShrink: 0 }} />
        {warn && <span title="Blocket är utanför 15 mm-marginalen"><AlertTriangle size={9} color="#B2402A" /></span>}
      </div>

      {/* Content (scrollable below drag handle) */}
      <div style={{ position: "absolute", top: 18, left: 0, right: 0, bottom: 0, overflow: "auto", padding: "6px 8px" }}>
        {children}
      </div>

      {/* Resize handles — only visible when selected */}
      {isSelected && <>
        {/* SE corner */}
        {resizeHandle("se", { right: -4, bottom: -4, width: 8, height: 8, cursor: "nwse-resize" })}
        {/* S edge */}
        {resizeHandle("s", { bottom: -3, left: "30%", right: "30%", height: 6, cursor: "ns-resize" })}
        {/* E edge */}
        {resizeHandle("e", { right: -3, top: "30%", bottom: "30%", width: 6, cursor: "ew-resize" })}
        {/* SW corner */}
        {resizeHandle("sw", { left: -4, bottom: -4, width: 8, height: 8, cursor: "nesw-resize" })}
        {/* W edge */}
        {resizeHandle("w", { left: -3, top: "30%", bottom: "30%", width: 6, cursor: "ew-resize" })}
        {/* NE corner */}
        {resizeHandle("ne", { right: -4, top: -4, width: 8, height: 8, cursor: "nesw-resize" })}
        {/* NW corner */}
        {resizeHandle("nw", { left: -4, top: -4, width: 8, height: 8, cursor: "nwse-resize" })}
        {/* N edge */}
        {resizeHandle("n", { top: -3, left: "30%", right: "30%", height: 6, cursor: "ns-resize" })}
      </>}
    </div>
  );
}
