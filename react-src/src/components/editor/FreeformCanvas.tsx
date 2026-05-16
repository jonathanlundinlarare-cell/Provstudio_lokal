/**
 * FreeformCanvas — A4-canvas med absolut-positionerade block.
 *
 * • 210 × 297 mm A4-sida med 5 mm prickgrid
 * • 15 mm marginal-guides (röd varning om block tangerar dem)
 * • Klicka på tomt utrymme för att avmarkera
 * • Varje block kan dragas och ändras i storlek via FreeformBlockWrapper
 */
import { useRef } from "react";
import { Grid } from "lucide-react";
import { FreeformBlockWrapper } from "@/components/editor/FreeformBlockWrapper";
import {
  CONTENT_BLOCK_TYPE_LABELS,
  QUESTION_TYPE_LABELS,
  isContentBlockRef,
  isQuestionRef,
  type BlockLayout,
  type ContentBlockRef,
  type Question,
  type QuestionOrderItem,
  type TestQuestionRef,
} from "@/lib/test-types";

const A4_W       = 210; // mm
const A4_H       = 297; // mm
const MARGIN_MM  = 15;  // guide-marginal

/** Default layout för ett nytt block som ännu inte har en position. */
function autoLayout(idx: number, item: QuestionOrderItem): BlockLayout {
  const y = MARGIN_MM + idx * 44;
  const defaultH = isContentBlockRef(item)
    ? (item.block_type === "pageBreak" || item.block_type === "divider" ? 8 : 40)
    : 40;
  return {
    x: MARGIN_MM,
    y: Math.min(y, A4_H - MARGIN_MM - defaultH),
    w: A4_W - 2 * MARGIN_MM,
    h: defaultH,
  };
}

interface FreeformCanvasProps {
  order: QuestionOrderItem[];
  bankMap: Map<string, Question>;
  selectedId: string | null;
  showGrid: boolean;
  onSelect: (id: string | null) => void;
  onLayoutChange: (itemId: string, next: BlockLayout) => void;
  /** Render content for a single item (borrowed from parent canvas) */
  renderItemContent: (item: QuestionOrderItem, q: Question | null) => React.ReactNode;
}

export function FreeformCanvas({
  order, bankMap, selectedId, showGrid, onSelect, onLayoutChange, renderItemContent,
}: FreeformCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" }}>
      {/* A4 sheet */}
      <div
        ref={containerRef}
        onClick={() => onSelect(null)}
        style={{
          position: "relative",
          width: `${A4_W}mm`,
          height: `${A4_H}mm`,
          background: "white",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
          overflow: "visible",
          // 5mm dot grid
          backgroundImage: showGrid
            ? "radial-gradient(circle, #d0ccc0 1px, transparent 1px)"
            : "none",
          backgroundSize: showGrid ? "5mm 5mm" : "auto",
        }}
      >
        {/* Margin guides */}
        <MarginGuides margin={MARGIN_MM} />

        {/* Blocks */}
        {order.map((item, idx) => {
          // Skip section separators
          if (isQuestionRef(item) && item.question_id === "__section__") return null;

          let itemId: string;
          let layout: BlockLayout;
          let q: Question | null = null;

          if (isQuestionRef(item)) {
            itemId = item.question_id;
            layout = item.layout ?? autoLayout(idx, item);
            q = bankMap.get(item.question_id) ?? null;
          } else if (isContentBlockRef(item)) {
            itemId = item.block_id;
            layout = item.layout ?? autoLayout(idx, item);
          } else {
            return null;
          }

          return (
            <FreeformBlockWrapper
              key={itemId}
              layout={layout}
              isSelected={selectedId === itemId}
              containerRef={containerRef}
              onLayoutChange={next => onLayoutChange(itemId, next)}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSelect(itemId); }}
            >
              {renderItemContent(item, q)}
            </FreeformBlockWrapper>
          );
        })}
      </div>

      {/* Hjälptext */}
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--ps-ink-4)", display: "flex", gap: 16 }}>
        <span>Dra block med handtaget ↑ · Ändra storlek via kanterna</span>
        {showGrid && <span><Grid size={10} style={{ display: "inline", marginRight: 3 }} />5 mm rutnät</span>}
      </div>
    </div>
  );
}

/* ─── Margin guides ──────────────────────────────────────────────────────── */

function MarginGuides({ margin }: { margin: number }) {
  const lineStyle: React.CSSProperties = {
    position: "absolute",
    background: "rgba(180, 64, 42, 0.15)",
    pointerEvents: "none",
    zIndex: 1,
  };
  return (
    <>
      {/* Top */}
      <div style={{ ...lineStyle, top: 0, left: 0, right: 0, height: `${margin}mm` }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "rgba(180,64,42,0.35)" }} />
      </div>
      {/* Bottom */}
      <div style={{ ...lineStyle, bottom: 0, left: 0, right: 0, height: `${margin}mm` }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(180,64,42,0.35)" }} />
      </div>
      {/* Left */}
      <div style={{ ...lineStyle, top: 0, bottom: 0, left: 0, width: `${margin}mm` }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 1, background: "rgba(180,64,42,0.35)" }} />
      </div>
      {/* Right */}
      <div style={{ ...lineStyle, top: 0, bottom: 0, right: 0, width: `${margin}mm` }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1, background: "rgba(180,64,42,0.35)" }} />
      </div>
    </>
  );
}

/* ─── Block content label (compact, for freeform) ────────────────────────── */

export function FreeformItemLabel({ item, q }: { item: QuestionOrderItem; q: Question | null }) {
  if (isQuestionRef(item) && q) {
    const text = (q.content as { text?: string })?.text ?? "";
    return (
      <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--ps-ink)" }}>
        <span style={{ fontSize: 9.5, background: "var(--ps-accent)14", color: "var(--ps-accent)", borderRadius: 3, padding: "1px 4px", fontWeight: 500, marginRight: 5 }}>
          {QUESTION_TYPE_LABELS[q.type]}
        </span>
        {text || "(Tom fråga)"}
      </div>
    );
  }
  if (isContentBlockRef(item)) {
    const preview = (item.content as { text?: string; title?: string })?.text
      ?? (item.content as { title?: string })?.title
      ?? "";
    return (
      <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--ps-ink-2)" }}>
        <span style={{ fontSize: 9.5, background: "#A87F1A14", color: "#A87F1A", borderRadius: 3, padding: "1px 4px", fontWeight: 500, marginRight: 5 }}>
          {CONTENT_BLOCK_TYPE_LABELS[item.block_type]}
        </span>
        {preview || "(Tomt block)"}
      </div>
    );
  }
  return null;
}
