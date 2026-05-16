/**
 * useFreeformDrag — Drag + resize för freeform-block på ett A4-canvas.
 *
 * Koordinater är i mm. Snap-grid är 2 mm (≈ 8 px vid 96 dpi).
 * A4-mått: 210 × 297 mm.
 */
import { useCallback } from "react";
import type { BlockLayout } from "@/lib/test-types";

const SNAP_MM  = 2;   // mm per snap-steg
const A4_W     = 210; // mm
const A4_H     = 297; // mm
const MIN_W    = 20;  // mm
const MIN_H    = 8;   // mm

/** Snappa ett mm-värde till närmaste SNAP_MM. */
function snap(v: number): number {
  return Math.round(v / SNAP_MM) * SNAP_MM;
}

/** Hämta px-per-mm för ett A4-canvas-element. */
function pxPerMm(containerEl: HTMLElement): number {
  return containerEl.getBoundingClientRect().width / A4_W;
}

export type DragEdge = "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w";

interface UseFreeformDragResult {
  /** Starta drag (flytta blocket). */
  startDrag: (e: React.PointerEvent, containerEl: HTMLElement) => void;
  /** Starta resize från ett kanthandtag. */
  startResize: (e: React.PointerEvent, containerEl: HTMLElement, edge: DragEdge) => void;
}

export function useFreeformDrag(
  layout: BlockLayout,
  onUpdate: (next: BlockLayout) => void,
): UseFreeformDragResult {

  const startDrag = useCallback(
    (e: React.PointerEvent, containerEl: HTMLElement) => {
      e.preventDefault();
      e.stopPropagation();

      const scale  = pxPerMm(containerEl);
      const origin = { x: e.clientX, y: e.clientY };
      const orig   = { ...layout };

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - origin.x) / scale;
        const dy = (ev.clientY - origin.y) / scale;

        const x = Math.max(0, Math.min(A4_W - orig.w, snap(orig.x + dx)));
        const y = Math.max(0, Math.min(A4_H - orig.h, snap(orig.y + dy)));

        onUpdate({ ...orig, x, y });
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup",   onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup",   onUp);
    },
    [layout, onUpdate],
  );

  const startResize = useCallback(
    (e: React.PointerEvent, containerEl: HTMLElement, edge: DragEdge) => {
      e.preventDefault();
      e.stopPropagation();

      const scale  = pxPerMm(containerEl);
      const origin = { x: e.clientX, y: e.clientY };
      const orig   = { ...layout };

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - origin.x) / scale;
        const dy = (ev.clientY - origin.y) / scale;

        let { x, y, w, h } = orig;

        // Adjust x/w based on which edge(s)
        if (edge.includes("e")) {
          w = Math.max(MIN_W, Math.min(A4_W - x, snap(orig.w + dx)));
        }
        if (edge.includes("w")) {
          const newX = Math.max(0, Math.min(orig.x + orig.w - MIN_W, snap(orig.x + dx)));
          w = orig.x + orig.w - newX;
          x = newX;
        }
        // Adjust y/h based on which edge(s)
        if (edge.includes("s")) {
          h = Math.max(MIN_H, Math.min(A4_H - y, snap(orig.h + dy)));
        }
        if (edge.includes("n")) {
          const newY = Math.max(0, Math.min(orig.y + orig.h - MIN_H, snap(orig.y + dy)));
          h = orig.y + orig.h - newY;
          y = newY;
        }

        onUpdate({ x, y, w, h });
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup",   onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup",   onUp);
    },
    [layout, onUpdate],
  );

  return { startDrag, startResize };
}
