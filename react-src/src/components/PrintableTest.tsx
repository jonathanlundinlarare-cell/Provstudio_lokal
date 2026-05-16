import type {
  Question,
  DesignSettings,
  OpenContent,
  MultipleChoiceContent,
  ClozeContent,
  MatchingContent,
  ImageContent,
  TableContent,
  RankingContent,
  DrawingContent,
  SourceCritiqueContent,
  ShortAnswerContent,
  NumericContent,
  EssayContent,
  DefinitionContent,
  DiagramLabelContent,
  TwoColumnContent,
  FormulaContent,
  ContentBlockType,
} from "@/lib/test-types";

/** A question item in the printable list */
export type PrintableQuestionItem = {
  kind?: "question"; // optional for backward-compat (defaults to question)
  question: Question;
  /** When true, render as a sub-question (a, b, c) of the previous block. */
  group?: boolean;
  /** When set on a non-group item, renders a section heading before this block. */
  sectionStart?: string;
};

/** A content block item (intro, source, heading, etc.) in the printable list */
export type PrintableBlockItem = {
  kind: "block";
  block_id: string;
  block_type: ContentBlockType;
  content: Record<string, unknown>;
};

/** Backward-compatible: callers that don't set `kind` are treated as question items */
export type PrintableItem = PrintableQuestionItem | PrintableBlockItem;

type Props = {
  title: string;
  subtitle?: string | null;
  design: DesignSettings;
  items: PrintableItem[];
  /** Page breaks: simple chunking by N blocks per page after the cover. */
  blocksPerPage?: number;
};

const SUB_LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

const FONT_STACKS: Record<string, string> = {
  // Current values
  humanist:   '"Geist", "Inter", "Helvetica Neue", Arial, sans-serif',
  serif:      '"Lora", "Instrument Serif", Georgia, "Times New Roman", serif',
  geometrisk: '"DM Sans", "Nunito", "Helvetica Neue", Arial, sans-serif',
  system:     'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  // Legacy fallbacks (for tests saved with old values)
  sans:       '"Geist", "Inter", "Helvetica Neue", Arial, sans-serif',
  rounded:    '"DM Sans", "Nunito", "Helvetica Neue", Arial, sans-serif',
  mono:       'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/* ─── Design helpers ──────────────────────────────────────────────────── */

function getPaperBg(paperStyle: DesignSettings["paperStyle"]): React.CSSProperties {
  switch (paperStyle) {
    case "cream":  return { backgroundColor: "#fffef2" };
    case "warm":   return { backgroundColor: "#faf8f3" };
    case "linen":  return { backgroundColor: "#f5efe2" };
    case "dot":    return { backgroundColor: "#fff", backgroundImage: "radial-gradient(circle, #bbb 0.4px, transparent 0.4px)", backgroundSize: "5mm 5mm" };
    case "grid":   return { backgroundColor: "#fff", backgroundImage: "linear-gradient(#e0e0e0 0.3px, transparent 0.3px), linear-gradient(90deg, #e0e0e0 0.3px, transparent 0.3px)", backgroundSize: "5mm 5mm" };
    case "ruled":  return { backgroundColor: "#fff", backgroundImage: "linear-gradient(#d8d8d8 0.3px, transparent 0.3px)", backgroundSize: "100% 8mm", backgroundPositionY: "16mm" };
    case "graph":  return { backgroundColor: "#fff", backgroundImage: "linear-gradient(#e4e4e4 0.3px, transparent 0.3px), linear-gradient(90deg, #e4e4e4 0.3px, transparent 0.3px)", backgroundSize: "3mm 3mm" };
    default:       return { backgroundColor: "#ffffff" };
  }
}

function getPageFrame(pageFrame: DesignSettings["pageFrame"], accent: string): React.CSSProperties {
  switch (pageFrame) {
    case "thin":   return { outline: `0.4mm solid ${accent}50` };
    case "thick":  return { outline: `1.5mm solid ${accent}` };
    case "double": return { outline: `0.4mm solid ${accent}`, outlineOffset: "-3mm", boxShadow: `inset 0 0 0 0.8mm ${accent}` };
    case "shadow": return { boxShadow: `1mm 1mm 6mm rgba(0,0,0,0.18), 0 0 0 0.4mm ${accent}30` };
    default:       return {};
  }
}

/** Resolve a font from heading/bodyFont field: either a CSS font-family string or a legacy fontFamily key. */
function resolveFont(font: string | undefined, fallback: string): string {
  if (!font) return fallback;
  if (FONT_STACKS[font]) return FONT_STACKS[font];
  return font; // treat as raw CSS font-family string
}

/** Render the question number with the configured numStyle. */
function NumLabel({ label, numStyle, accent }: { label: string; numStyle: DesignSettings["numStyle"]; accent: string }): React.ReactElement {
  switch (numStyle) {
    case "fraga":
      return (
        <span>
          <span style={{ fontSize: "0.52em", fontWeight: 500, letterSpacing: "0.06em", opacity: 0.75, marginRight: "0.25em" }}>Fråga</span>
          {label}
        </span>
      );
    case "display":
      return <span style={{ fontSize: "1.3em", fontWeight: 900, letterSpacing: "-0.03em" }}>{label}</span>;
    case "chip":
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "1.6em", height: "1.6em", borderRadius: "999px",
          border: "2px solid currentColor", fontSize: "0.7em", fontWeight: 700,
        }}>{label}</span>
      );
    default: // plain
      return <>{label}</>;
  }
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/** Convert block number to the configured numbering style. */
function formatNumber(n: number, style: DesignSettings["numbering"]): string {
  switch (style) {
    case "letter": return String.fromCharCode(64 + n);         // A, B, C…
    case "roman":  return toRoman(n);                           // i, ii, iii…
    case "paren":  return `(${n})`;                             // (1), (2)…
    default:       return `${n}`;                               // 1, 2, 3…
  }
}

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result.toLowerCase();
}

/* ─── Page shell ──────────────────────────────────────────────────────── */

function PageShell({
  design, pageNumber, totalPages, children,
}: {
  design: DesignSettings;
  pageNumber: number;
  totalPages: number;
  children: React.ReactNode;
}) {
  const padding = `${design.marginTop}mm ${design.marginRight}mm ${design.marginBottom}mm ${design.marginLeft}mm`;
  const style: React.CSSProperties = {
    padding,
    ["--page-pad-x" as never]:         `${design.marginLeft}mm`,
    ["--line-thickness" as never]:     `${design.lineThickness ?? 1}px`,
    ["--line-spacing" as never]:       `${design.lineSpacing ?? 12}mm`,
    ["--body-size" as never]:          `${design.fontSizeBody ?? 11}pt`,
    ["--block-number-size" as never]:  `${design.fontSizeBlockNumber ?? 24}pt`,
    ["--block-number-pad-y" as never]: `${design.blockNumberPaddingY ?? 4}mm`,
    ["--title-size" as never]:         `${design.fontSizeTitle ?? 56}pt`,
    ["--subtitle-size" as never]:      `${design.fontSizeSubtitle ?? 12}pt`,
    ["--points-size" as never]:        `${design.fontSizePoints ?? 10}pt`,
    ["--sub-letter-size" as never]:    `${design.fontSizeSubLetter ?? 11}pt`,
  };
  const showPageNumbers = design.showPageNumbers !== false;
  const accent          = design.primaryColor;
  Object.assign(style, getPaperBg(design.paperStyle));
  Object.assign(style, getPageFrame(design.pageFrame, accent));
  style.position = "relative";
  return (
    <div className="test-page" style={style}>
      {design.watermark && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none", overflow: "hidden", zIndex: 0,
        }}>
          <span style={{
            fontSize: "52pt", fontWeight: 900, opacity: 0.055,
            transform: "rotate(-35deg)", whiteSpace: "nowrap",
            userSelect: "none", color: accent,
            letterSpacing: "0.08em",
          }}>
            {design.watermark}
          </span>
        </div>
      )}
      <div className="page-content" style={{ position: "relative", zIndex: 1 }}>{children}</div>
      {design.footerText
        ? <div className="page-footer">{design.footerText}</div>
        : null}
      {showPageNumbers && (
        <div className="page-number">{pageNumber} / {totalPages}</div>
      )}
    </div>
  );
}

/* ─── Cloze text ─────────────────────────────────────────────────────── */

function ClozeText({ text }: { text: string }) {
  const parts = text.split(/(_{3,})/g);
  return (
    <span>
      {parts.map((p, i) =>
        /^_{3,}$/.test(p) ? <span className="cloze-blank" key={i} /> : <span key={i}>{p}</span>
      )}
    </span>
  );
}

/* ─── Question body ──────────────────────────────────────────────────── */

function QuestionBody({ q, design }: { q: Question; design: DesignSettings }) {
  const accent       = design.primaryColor;
  const lineStyle    = design.lineStyle   ?? "solid";
  const mcMarker     = design.mcMarker    ?? "square";

  if (q.type === "open") {
    const lines = Math.max(1, (q.content as OpenContent).lines || 1);
    const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
    return (
      <div className="write-lines" data-style={lineStyle}>
        {Array.from({ length: lines }).map((_, i) => (
          <div className="line" key={i} style={{ borderBottomStyle: borderStyle }} />
        ))}
      </div>
    );
  }

  if (q.type === "multiple_choice") {
    const c = q.content as MultipleChoiceContent;
    return (
      <ul className={`mc-options mc-marker-${mcMarker}`}>
        {c.options.map((opt, i) => (
          <li key={i}>
            {mcMarker === "letter"
              ? <span className="mc-box mc-letter">{String.fromCharCode(65 + i)}</span>
              : <span className="mc-box" style={{
                  borderColor: accent,
                  borderRadius: mcMarker === "circle" ? "50%" : undefined,
                }} />}
            <span>{opt || `Alternativ ${i + 1}`}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (q.type === "true_false") {
    return (
      <ul className="tf-options">
        <li>
          <span className="mc-box" style={{
            borderColor: accent,
            borderRadius: (design.mcMarker ?? "square") === "circle" ? "50%" : undefined,
          }} />
          <span>Sant</span>
        </li>
        <li>
          <span className="mc-box" style={{
            borderColor: accent,
            borderRadius: (design.mcMarker ?? "square") === "circle" ? "50%" : undefined,
          }} />
          <span>Falskt</span>
        </li>
      </ul>
    );
  }

  if (q.type === "matching") {
    const c = q.content as MatchingContent;
    return (
      <table className="match-table">
        <tbody>
          {c.pairs.map((p, i) => (
            <tr key={i}>
              <td className="match-left">{p.left}</td>
              <td className="match-blank"><span className="match-line" /></td>
              <td className="match-right">{p.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (q.type === "image") {
    const c = q.content as ImageContent;
    const lines = Math.max(0, c.lines || 0);
    const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
    return (
      <div>
        {c.imageUrl ? (
          <figure className="q-image">
            <img src={c.imageUrl} alt={c.caption || ""} />
            {c.caption ? <figcaption>{c.caption}</figcaption> : null}
          </figure>
        ) : null}
        {lines > 0 && (
          <div className="write-lines">
            {Array.from({ length: lines }).map((_, i) => (
              <div className="line" key={i} style={{ borderBottomStyle: borderStyle }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (q.type === "table") {
    const c = q.content as TableContent;
    return (
      <table className="q-table">
        {c.headers.length > 0 && (
          <thead>
            <tr>{c.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {c.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (q.type === "ranking") {
    const c = q.content as RankingContent;
    return (
      <ul className="rank-list">
        {c.items.map((item, i) => (
          <li key={i}>
            <span className="rank-box" style={{ borderColor: accent }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (q.type === "drawing") {
    const c = q.content as DrawingContent;
    const h = Math.max(20, c.heightMm || 60);
    return <div className="draw-area" style={{ height: `${h}mm` }} />;
  }

  if (q.type === "source_critique") {
    const c = q.content as SourceCritiqueContent;
    const lines = Math.max(1, c.lines || 4);
    const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
    return (
      <div style={{ marginTop: "3mm", display: "grid", gridTemplateColumns: "minmax(45mm, 0.85fr) 1fr", gap: "4mm", alignItems: "start" }}>
        {/* Left: source box */}
        <div style={{ background: "#FBF8F1", border: "0.4mm solid #E7DDC4", borderRadius: "1.5mm", padding: "3mm 4mm" }}>
          {c.sourceTitle && (
            <div style={{ fontSize: "7.5pt", color: "#A87F1A", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "1.5mm", textTransform: "uppercase" }}>
              {c.category ? `KÄLLA · ${c.category.toUpperCase()}` : c.sourceTitle}
            </div>
          )}
          {c.sourceImageUrl && (
            <img src={c.sourceImageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "25mm", objectFit: "contain", display: "block", marginBottom: "2mm" }} />
          )}
          <p style={{ margin: 0, fontSize: "9.5pt", lineHeight: 1.6, fontStyle: "italic", color: "#3a3530" }}>
            {c.sourceText}
          </p>
          {c.sourceAttribution && (
            <div style={{ fontSize: "8pt", color: "#8a7e64", marginTop: "2mm", textAlign: "right" }}>
              — {c.sourceAttribution}
            </div>
          )}
        </div>
        {/* Right: answer lines */}
        <div className="write-lines" data-style={lineStyle}>
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle }} />
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "short_answer") {
    const c = q.content as ShortAnswerContent;
    const lines = Math.max(1, c.lines || 2);
    const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
    return (
      <div className="write-lines" data-style={lineStyle}>
        {Array.from({ length: lines }).map((_, i) => (
          <div className="line" key={i} style={{ borderBottomStyle: borderStyle }} />
        ))}
      </div>
    );
  }

  if (q.type === "numeric") {
    const c = q.content as NumericContent;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4mm", marginTop: "2mm" }}>
        <div style={{ flex: 1, height: "0.4mm", background: "#C8C2B5" }} />
        {c.unit && (
          <span style={{ fontSize: "10pt", color: "#555", fontStyle: "italic" }}>{c.unit}</span>
        )}
      </div>
    );
  }

  if (q.type === "essay") {
    const c = q.content as EssayContent;
    const lines = Math.max(1, c.lines || 20);
    const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
    return (
      <div>
        {c.wordLimit ? (
          <div style={{ fontSize: "8.5pt", color: "#888", fontStyle: "italic", marginBottom: "1.5mm" }}>
            Max {c.wordLimit} ord
          </div>
        ) : null}
        <div className="write-lines" data-style={lineStyle}>
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle }} />
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "group") {
    // Group questions are just a heading — no body
    return null;
  }

  if (q.type === "definition") {
    const c = q.content as DefinitionContent;
    const lines = Math.max(1, c.lines || 3);
    const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
    return (
      <div>
        {c.term && (
          <div style={{ fontSize: "10pt", fontWeight: 600, color: accent, marginBottom: "1.5mm" }}>
            {c.term}
          </div>
        )}
        <div className="write-lines" data-style={lineStyle}>
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle }} />
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "diagram_label") {
    const c = q.content as DiagramLabelContent;
    const h = Math.max(20, c.heightMm || 60);
    return (
      <div>
        {c.imageUrl && (
          <figure className="q-image" style={{ marginBottom: "2mm" }}>
            <img src={c.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: `${h}mm`, objectFit: "contain" }} />
          </figure>
        )}
        {!c.imageUrl && (
          <div className="draw-area" style={{ height: `${h}mm` }} />
        )}
        {c.labels && c.labels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm", marginTop: "2mm" }}>
            {c.labels.map((label, i) => (
              <span key={i} style={{ fontSize: "9pt", padding: "0.5mm 2mm", border: `0.3mm solid ${accent}`, borderRadius: "1mm", color: accent }}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (q.type === "two_column") {
    const c = q.content as TwoColumnContent;
    const rows = Math.max(1, c.rows || 4);
    return (
      <table className="q-table" style={{ marginTop: "2mm" }}>
        <thead>
          <tr>
            <th style={{ background: `${accent}18`, color: accent }}>{c.colA || "A"}</th>
            <th style={{ background: `${accent}18`, color: accent }}>{c.colB || "B"}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (q.type === "formula") {
    const c = q.content as FormulaContent;
    const lines = Math.max(1, c.lines || 5);
    const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";
    return (
      <div>
        {c.formula && (
          <div style={{ margin: "2mm 0 3mm", padding: "2mm 4mm", background: `${accent}10`, border: `0.4mm solid ${accent}40`, borderRadius: "1.5mm", fontFamily: "monospace", fontSize: "11pt", textAlign: "center" }}>
            {c.formula}
          </div>
        )}
        {c.variables && c.variables.length > 0 && (
          <table style={{ borderCollapse: "collapse", fontSize: "9pt", marginBottom: "2mm" }}>
            <tbody>
              {c.variables.map((v, i) => (
                <tr key={i}>
                  <td style={{ padding: "0.5mm 2mm 0.5mm 0", fontFamily: "monospace", fontWeight: 600 }}>{v.name}</td>
                  <td style={{ padding: "0.5mm 0", color: "#555" }}>= {v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="write-lines" data-style={lineStyle}>
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle }} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Question text ──────────────────────────────────────────────────── */

function QuestionText({ q }: { q: Question }) {
  if (q.type === "cloze") {
    return <ClozeText text={(q.content as ClozeContent).text || ""} />;
  }
  if (q.type === "group") {
    return <>{(q.content as { title?: string }).title || "(Grupp)"}</>;
  }
  if (q.type === "definition") {
    return <>{(q.content as { term?: string; text?: string }).text || (q.content as { term?: string }).term || "(Definition)"}</>;
  }
  return <>{(q.content as { text?: string }).text || "(Tom fråga)"}</>;
}

/* ─── Points display ─────────────────────────────────────────────────── */

function PointsDisplay({ points, style: pStyle, accent }: {
  points: string;
  style: DesignSettings["pointsStyle"];
  accent: string;
}) {
  if (pStyle === "pill") {
    return (
      <span style={{
        display: "inline-block",
        fontSize: "var(--points-size, 10pt)",
        fontWeight: 600,
        color: accent,
        background: `${accent}18`,
        borderRadius: "999px",
        padding: "0.5mm 3mm",
        whiteSpace: "nowrap",
      }}>
        {points} p
      </span>
    );
  }
  if (pStyle === "box") {
    return (
      <span style={{
        display: "inline-block",
        fontSize: "var(--points-size, 10pt)",
        fontWeight: 600,
        border: `1px solid ${accent}`,
        borderRadius: "1mm",
        padding: "0.5mm 2.5mm",
        whiteSpace: "nowrap",
      }}>
        {points} p
      </span>
    );
  }
  if (pStyle === "blank") {
    return (
      <span style={{
        fontSize: "var(--points-size, 10pt)",
        fontWeight: 600,
        color: "#444",
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}>
        ___/{points} p
      </span>
    );
  }
  // italic (default)
  return (
    <span style={{
      fontSize: "var(--points-size, 10pt)",
      color: "#555",
      fontStyle: "italic",
      whiteSpace: "nowrap",
    }}>
      ({points} p)
    </span>
  );
}

/* ─── Page item types ────────────────────────────────────────────────── */

type QuestionBlock = { kind: "qblock"; lead: Question; subs: Question[]; sectionStart?: string };
type ContentBlockEntry = { kind: "cblock"; item: PrintableBlockItem };
type PageItem = QuestionBlock | ContentBlockEntry;

function buildPageItems(items: PrintableItem[]): PageItem[] {
  const result: PageItem[] = [];
  for (const it of items) {
    // Content block
    if ("kind" in it && it.kind === "block") {
      result.push({ kind: "cblock", item: it as PrintableBlockItem });
      continue;
    }
    // Question item (kind === "question" or kind undefined — backward compat)
    const qi = it as PrintableQuestionItem;
    const lastQBlock = result.length > 0 && result[result.length - 1].kind === "qblock"
      ? result[result.length - 1] as QuestionBlock : null;
    if (lastQBlock && qi.group) {
      lastQBlock.subs.push(qi.question);
    } else {
      result.push({ kind: "qblock", lead: qi.question, subs: [], sectionStart: qi.sectionStart });
    }
  }
  return result;
}

/* ─── Section header ─────────────────────────────────────────────────── */

function SectionHeader({ label, design }: { label: string; design: DesignSettings }) {
  const accent   = design.primaryColor;
  const divider  = design.sectionDivider ?? "thin";
  const baseWrap: React.CSSProperties = { margin: "6mm 0 4mm", breakAfter: "avoid", pageBreakAfter: "avoid" };

  if (divider === "space") {
    return (
      <div style={{ ...baseWrap, marginTop: "10mm" }}>
        <span style={{ fontSize: "13pt", fontWeight: 500, color: accent, letterSpacing: "-0.01em" }}>
          {label}
        </span>
      </div>
    );
  }
  if (divider === "none") {
    return (
      <div style={{ ...baseWrap, marginTop: "4mm", marginBottom: "2mm" }}>
        <span style={{ fontSize: "11pt", fontWeight: 600, color: `${accent}99`, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
          {label}
        </span>
      </div>
    );
  }
  if (divider === "thick") {
    return (
      <div style={{ ...baseWrap, borderBottom: `2px solid ${accent}`, paddingBottom: "2mm" }}>
        <span style={{ fontSize: "14pt", fontWeight: 700, color: accent, letterSpacing: "-0.01em" }}>
          {label}
        </span>
      </div>
    );
  }
  if (divider === "ornament") {
    return (
      <div style={{ ...baseWrap, display: "flex", alignItems: "center", gap: "4mm" }}>
        <div style={{ flex: 1, height: "0.4mm", background: `${accent}40` }} />
        <span style={{ fontSize: "12pt", fontWeight: 600, color: accent, whiteSpace: "nowrap" }}>
          ✦ {label} ✦
        </span>
        <div style={{ flex: 1, height: "0.4mm", background: `${accent}40` }} />
      </div>
    );
  }
  // "thin" (default)
  return (
    <div style={{ ...baseWrap, display: "flex", alignItems: "center", gap: "4mm" }}>
      <span style={{ fontSize: "13pt", fontWeight: 500, color: accent, whiteSpace: "nowrap", letterSpacing: "-0.01em", fontFamily: "var(--heading-font, inherit)" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "0.4mm", background: `${accent}50` }} />
    </div>
  );
}

/* ─── Content block renderer ─────────────────────────────────────────── */

function ContentBlockPrint({ item, design }: { item: PrintableBlockItem; design: DesignSettings }) {
  const accent = design.primaryColor;
  const c = item.content as Record<string, unknown>;

  switch (item.block_type) {

    case "heading":
      return (
        <div style={{ margin: "6mm 0 3mm", breakAfter: "avoid", pageBreakAfter: "avoid" }}>
          <h2 style={{ fontSize: "14pt", fontWeight: 700, color: accent, margin: 0, letterSpacing: "-0.01em" }}>
            {String(c.text ?? "")}
          </h2>
          <div style={{ height: "0.4mm", background: `${accent}40`, marginTop: "1.5mm" }} />
        </div>
      );

    case "intro":
      return (
        <div style={{ margin: "0 0 6mm", padding: "3mm 4mm", background: `${accent}08`, borderLeft: `2mm solid ${accent}`, borderRadius: "0 1.5mm 1.5mm 0", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {!!c.title && (
            <div style={{ fontSize: "9pt", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5mm" }}>
              {String(c.title)}
            </div>
          )}
          <p style={{ margin: 0, fontSize: "11pt", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {String(c.text ?? "")}
          </p>
        </div>
      );

    case "instruction":
      return (
        <div style={{ margin: "0 0 5mm", padding: "2.5mm 4mm", background: "#f5f5f5", border: "0.3mm solid #ddd", borderRadius: "1.5mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <p style={{ margin: 0, fontSize: "10pt", lineHeight: 1.6, color: "#444", whiteSpace: "pre-wrap" }}>
            {String(c.text ?? "")}
          </p>
        </div>
      );

    case "source":
      return (
        <div style={{ margin: "0 0 6mm", padding: "4mm 5mm", border: "0.4mm solid #ccc", borderRadius: "1.5mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {!!c.title && (
            <div style={{ fontSize: "9pt", fontWeight: 700, color: "#444", marginBottom: "2mm", display: "flex", justifyContent: "space-between" }}>
              <span>{String(c.title)}</span>
              {!!c.attribution && <span style={{ fontWeight: 400, fontStyle: "italic", color: "#777" }}>{String(c.attribution)}</span>}
            </div>
          )}
          {!!c.imageUrl && (
            <img src={String(c.imageUrl)} alt="" style={{ maxWidth: "100%", maxHeight: "50mm", objectFit: "contain", display: "block", marginBottom: "2mm" }} />
          )}
          <p style={{ margin: 0, fontSize: "10.5pt", lineHeight: 1.7, color: "#222", whiteSpace: "pre-wrap", fontStyle: "italic" }}>
            {String(c.text ?? "")}
          </p>
        </div>
      );

    case "vocab": {
      const entries = (c.entries as { term: string; definition: string }[] | undefined) ?? [];
      return (
        <div style={{ margin: "0 0 5mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {!!c.title && <div style={{ fontSize: "9pt", fontWeight: 700, color: accent, marginBottom: "2mm", textTransform: "uppercase", letterSpacing: "0.04em" }}>{String(c.title)}</div>}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: "0.3mm solid #eee" }}>
                  <td style={{ padding: "1mm 3mm 1mm 0", fontWeight: 600, width: "35%", verticalAlign: "top" }}>{e.term}</td>
                  <td style={{ padding: "1mm 0", color: "#444", verticalAlign: "top" }}>{e.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "quote":
      return (
        <blockquote style={{ margin: "0 0 6mm", padding: "3mm 5mm", borderLeft: `2mm solid ${accent}`, fontStyle: "italic", color: "#333", fontSize: "12pt", lineHeight: 1.7, breakInside: "avoid", pageBreakInside: "avoid" }}>
          <p style={{ margin: 0 }}>{String(c.text ?? "")}</p>
          {!!c.attribution && <footer style={{ marginTop: "1.5mm", fontSize: "9.5pt", fontStyle: "normal", color: "#666" }}>— {String(c.attribution)}</footer>}
        </blockquote>
      );

    case "callout":
      return (
        <div style={{ margin: "0 0 6mm", padding: "3.5mm 5mm", background: `${accent}14`, border: `0.4mm solid ${accent}50`, borderRadius: "2mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {!!c.title && <div style={{ fontSize: "9.5pt", fontWeight: 700, color: accent, marginBottom: "1.5mm" }}>{String(c.title)}</div>}
          <p style={{ margin: 0, fontSize: "10.5pt", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{String(c.text ?? "")}</p>
        </div>
      );

    case "image": {
      const caption = String(c.caption ?? "");
      return (
        <figure style={{ margin: "0 0 6mm", textAlign: "center", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {!!c.imageUrl && <img src={String(c.imageUrl)} alt={caption} style={{ maxWidth: "100%", maxHeight: "80mm", objectFit: "contain", display: "block", margin: "0 auto" }} />}
          {caption && <figcaption style={{ marginTop: "1.5mm", fontSize: "9pt", color: "#666", fontStyle: "italic" }}>{caption}</figcaption>}
        </figure>
      );
    }

    case "checklist": {
      const checkItems = (c.items as string[] | undefined) ?? [];
      return (
        <div style={{ margin: "0 0 5mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {!!c.title && <div style={{ fontSize: "9pt", fontWeight: 700, color: accent, marginBottom: "2mm", textTransform: "uppercase", letterSpacing: "0.04em" }}>{String(c.title)}</div>}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1.5mm" }}>
            {checkItems.map((it, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: "3mm", fontSize: "10.5pt" }}>
                <span style={{ width: "4mm", height: "4mm", border: `0.4mm solid ${accent}`, borderRadius: "0.5mm", flexShrink: 0, display: "inline-block" }} />
                {it}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "marginNote":
      // Margin notes are teacher-only — omit from student print
      return null;

    case "pageBreak":
      return <div style={{ breakAfter: "page", pageBreakAfter: "always" }} />;

    case "divider":
      return <hr style={{ margin: "5mm 0", border: "none", borderTop: `0.4mm solid ${accent}30` }} />;

    default:
      return null;
  }
}

/* ─── Block renders by layout ────────────────────────────────────────── */

/** Classic layout: coloured full-width banner with number. */
function BlockClassic({ block, number, design }: { block: QuestionBlock; number: number; design: DesignSettings }) {
  const accent     = design.primaryColor;
  const numColor   = design.numColor === "accent" ? accent : "#111";
  const showPoints = design.showPoints !== false;
  const pStyle     = design.pointsStyle ?? "italic";
  const numLabel   = formatNumber(number, design.numbering);
  const hasSubs    = block.subs.length > 0;
  const all        = hasSubs ? [block.lead, ...block.subs] : [block.lead];

  return (
    <div className="question-block" style={{ ["--qb-color" as never]: accent }}>
      <div className="question-block-header" style={{ color: numColor !== "#111" ? numColor : undefined }}>
        <NumLabel label={numLabel} numStyle={design.numStyle} accent={numColor} />
      </div>
      <div className="question-block-body">
        {all.map((q, i) => (
          <div className="question" key={q.id + i}>
            <div className="question-header">
              <div className="question-text">
                {hasSubs && <span className="sub-letter">{SUB_LETTERS[i]})</span>}
                <QuestionText q={q} />
              </div>
              {showPoints && q.points && (
                <PointsDisplay points={q.points} style={pStyle} accent={accent} />
              )}
            </div>
            <QuestionBody q={q} design={design} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Editorial layout: left accent bar + large number beside content. */
function BlockEditorial({ block, number, design }: { block: QuestionBlock; number: number; design: DesignSettings }) {
  const accent     = design.primaryColor;
  const showPoints = design.showPoints !== false;
  const pStyle     = design.pointsStyle ?? "italic";
  const numLabel   = formatNumber(number, design.numbering);
  const hasSubs    = block.subs.length > 0;
  const all        = hasSubs ? [block.lead, ...block.subs] : [block.lead];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "0 6mm",
      marginBottom: "8mm",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    }}>
      {/* Number column */}
      <div style={{
        borderLeft: `3px solid ${accent}`,
        paddingLeft: "3mm",
        display: "flex",
        alignItems: "flex-start",
        paddingTop: "0.5mm",
        minWidth: "8mm",
      }}>
        <span style={{
          fontSize: "var(--block-number-size, 24pt)",
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
          fontFeatureSettings: '"tnum"',
        }}>
          <NumLabel label={numLabel} numStyle={design.numStyle} accent={accent} />
        </span>
      </div>
      {/* Content column */}
      <div>
        {all.map((q, i) => (
          <div className="question" key={q.id + i} style={{ marginBottom: "4mm" }}>
            <div className="question-header">
              <div className="question-text">
                {hasSubs && <span className="sub-letter">{SUB_LETTERS[i]})</span>}
                <QuestionText q={q} />
              </div>
              {showPoints && q.points && (
                <PointsDisplay points={q.points} style={pStyle} accent={accent} />
              )}
            </div>
            <QuestionBody q={q} design={design} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Minimal layout: thin top border as separator, number inline with text. */
function BlockMinimal({ block, number, design }: { block: QuestionBlock; number: number; design: DesignSettings }) {
  const accent     = design.primaryColor;
  const showPoints = design.showPoints !== false;
  const pStyle     = design.pointsStyle ?? "italic";
  const numLabel   = formatNumber(number, design.numbering);
  const hasSubs    = block.subs.length > 0;
  const all        = hasSubs ? [block.lead, ...block.subs] : [block.lead];

  return (
    <div style={{
      marginBottom: "7mm",
      paddingTop: "5mm",
      borderTop: `0.4mm solid ${accent}30`,
      breakInside: "avoid",
      pageBreakInside: "avoid",
    }}>
      {all.map((q, i) => (
        <div className="question" key={q.id + i} style={{ marginBottom: "4mm" }}>
          <div className="question-header">
            <div className="question-text" style={{ display: "flex", gap: "2.5mm" }}>
              {i === 0 && (
                <span style={{ flexShrink: 0, fontWeight: 700, color: accent, minWidth: "5mm" }}>
                  <NumLabel label={`${numLabel}.`} numStyle={design.numStyle} accent={accent} />
                </span>
              )}
              {i > 0 && (
                <span style={{ flexShrink: 0, fontWeight: 600, color: "#777", minWidth: "5mm", marginLeft: "5mm" }}>
                  {SUB_LETTERS[i - 1]})
                </span>
              )}
              <span><QuestionText q={q} /></span>
            </div>
            {showPoints && q.points && (
              <PointsDisplay points={q.points} style={pStyle} accent={accent} />
            )}
          </div>
          <QuestionBody q={q} design={design} />
        </div>
      ))}
    </div>
  );
}

/** Exam layout: boxed block with header row, like an official exam. */
function BlockExam({ block, number, design }: { block: QuestionBlock; number: number; design: DesignSettings }) {
  const accent     = design.primaryColor;
  const showPoints = design.showPoints !== false;
  const pStyle     = design.pointsStyle ?? "italic";
  const numLabel   = formatNumber(number, design.numbering);
  const hasSubs    = block.subs.length > 0;
  const all        = hasSubs ? [block.lead, ...block.subs] : [block.lead];

  return (
    <div style={{
      border: `1px solid ${accent}`,
      borderRadius: "1.5mm",
      marginBottom: "8mm",
      breakInside: "avoid",
      pageBreakInside: "avoid",
      overflow: "hidden",
    }}>
      {/* Exam header */}
      <div style={{
        background: `${accent}14`,
        borderBottom: `1px solid ${accent}`,
        padding: "1.5mm 4mm",
        display: "flex",
        alignItems: "center",
        gap: "3mm",
      }}>
        <span style={{
          width: "7mm", height: "7mm",
          borderRadius: "1mm",
          border: `1.5px solid ${accent}`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: "10pt", color: accent,
          flexShrink: 0,
        }}>
          {numLabel}
        </span>
        <div style={{ flex: 1, height: "1px", background: `${accent}40` }} />
        {showPoints && block.lead.points && (
          <PointsDisplay points={block.lead.points} style={pStyle} accent={accent} />
        )}
      </div>
      <div style={{ padding: "4mm 4mm" }}>
        {all.map((q, i) => (
          <div className="question" key={q.id + i} style={{ marginBottom: i < all.length - 1 ? "4mm" : 0 }}>
            <div className="question-header">
              <div className="question-text">
                {hasSubs && <span className="sub-letter">{SUB_LETTERS[i]})</span>}
                <QuestionText q={q} />
              </div>
              {showPoints && hasSubs && q.points && (
                <PointsDisplay points={q.points} style={pStyle} accent={accent} />
              )}
            </div>
            <QuestionBody q={q} design={design} />
          </div>
        ))}
      </div>
    </div>
  );
}

function cardStyleWrap(cardStyle: DesignSettings["cardStyle"], accent: string, children: React.ReactNode): React.ReactElement {
  switch (cardStyle) {
    case "framed":
      return (
        <div style={{ border: `0.4mm solid ${accent}40`, borderRadius: "1.5mm", padding: "3mm 4mm", marginBottom: "2mm" }}>
          {children}
        </div>
      );
    case "banded":
      return (
        <div style={{ background: `${accent}07`, borderRadius: "1.5mm", padding: "2mm 4mm", marginBottom: "2mm" }}>
          {children}
        </div>
      );
    case "gutter":
      return (
        <div style={{ borderLeft: `2mm solid ${accent}30`, paddingLeft: "4mm", marginBottom: "2mm" }}>
          {children}
        </div>
      );
    case "indented":
      return (
        <div style={{ paddingLeft: "8mm", marginBottom: "2mm" }}>
          {children}
        </div>
      );
    case "stamped":
      return (
        <div style={{ border: `1.5px solid ${accent}`, borderRadius: "2mm", padding: "3mm 4mm", marginBottom: "2mm", boxShadow: `2px 2px 0 ${accent}30` }}>
          {children}
        </div>
      );
    default: // flat
      return <>{children}</>;
  }
}

function QBlockRender({ block, number, design }: { block: QuestionBlock; number: number; design: DesignSettings }) {
  const layout = design.layout ?? "classic";
  const accent = design.primaryColor;
  const inner = layout === "editorial" ? <BlockEditorial block={block} number={number} design={design} />
              : layout === "minimal"   ? <BlockMinimal   block={block} number={number} design={design} />
              : layout === "exam"      ? <BlockExam      block={block} number={number} design={design} />
              :                          <BlockClassic   block={block} number={number} design={design} />;
  return (
    <>
      {block.sectionStart && <SectionHeader label={block.sectionStart} design={design} />}
      {cardStyleWrap(design.cardStyle, accent, inner)}
    </>
  );
}

function PageItemRender({ item, qNumber, design }: { item: PageItem; qNumber: number; design: DesignSettings }) {
  if (item.kind === "cblock") {
    return <ContentBlockPrint item={item.item} design={design} />;
  }
  return <QBlockRender block={item} number={qNumber} design={design} />;
}

/* ─── Cover title ─────────────────────────────────────────────────────── */

function CoverTitle({ title, accents }: { title: string; accents?: { text: string; color: string }[] }) {
  if (accents && accents.length > 0) {
    return (
      <>
        {accents.map((seg, i) => (
          <span key={i} style={{ color: seg.color }}>{seg.text}</span>
        ))}
      </>
    );
  }
  return <>{title || "Provets titel"}</>;
}

/* ─── Cover meta row ─────────────────────────────────────────────────── */

function CoverMeta({ design, totalPoints }: { design: DesignSettings; totalPoints: number }) {
  const rows: { label: string; value: string }[] = [];
  if (design.duration) rows.push({ label: "Tid",        value: design.duration });
  if (design.aids)     rows.push({ label: "Hjälpmedel", value: design.aids });
  if (totalPoints > 0) rows.push({ label: "Maxpoäng",   value: `${totalPoints}` });

  if (rows.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "2mm 10mm",
      margin: "5mm 0 8mm",
      fontSize: "10pt",
      color: "#333",
    }}>
      {rows.map((r) => (
        <span key={r.label}>
          <span style={{ color: "#666" }}>{r.label}:</span>{" "}
          <strong style={{ fontWeight: 600 }}>{r.value}</strong>
        </span>
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

export function PrintableTest({
  title,
  subtitle,
  design,
  items,
  blocksPerPage = 3,
}: Props) {
  const showCover    = design.showCover !== false;
  const pageItems    = buildPageItems(items);
  const totalPoints  = items.reduce((s, it) => {
    if ("kind" in it && it.kind === "block") return s;
    return s + (parseFloat((it as PrintableQuestionItem).question.points || "0") || 0);
  }, 0);
  // Chunk by page — count only question blocks toward blocksPerPage; content blocks ride along
  const chunks: PageItem[][] = [];
  let currentChunk: PageItem[] = [];
  let qBlocksInChunk = 0;
  for (const pi of pageItems) {
    if (pi.kind === "cblock" && pi.item.block_type === "pageBreak") {
      // Explicit page break — flush current chunk
      if (currentChunk.length > 0) { chunks.push(currentChunk); currentChunk = []; qBlocksInChunk = 0; }
      continue;
    }
    currentChunk.push(pi);
    if (pi.kind === "qblock") {
      qBlocksInChunk++;
      if (qBlocksInChunk >= blocksPerPage) {
        chunks.push(currentChunk);
        currentChunk = [];
        qBlocksInChunk = 0;
      }
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  const totalPages      = (showCover ? 1 : 0) + Math.max(chunks.length, showCover ? 0 : 1);
  const startPageNumber = showCover ? 2 : 1;
  // Track question number across all chunks
  const qNumberOffset: number[] = [];
  let runningQ = 0;
  for (const chunk of chunks) {
    qNumberOffset.push(runningQ);
    runningQ += chunk.filter(pi => pi.kind === "qblock").length;
  }
  const fallbackStack   = FONT_STACKS[design.fontFamily || "humanist"] ?? FONT_STACKS.humanist;
  const bodyFont        = resolveFont(design.bodyFont, fallbackStack);
  const headingFont     = resolveFont(design.headingFont, bodyFont);
  const accent          = design.primaryColor;

  // Eyebrow: "Kurs · Skola"
  const eyebrow = [design.course, design.school].filter(Boolean).join(" · ");

  return (
    <div className="printable-test" style={{ fontFamily: bodyFont, ["--heading-font" as never]: headingFont }}>
      {/* ── Cover page ── */}
      {showCover && (
        <PageShell design={design} pageNumber={1} totalPages={totalPages}>
          {design.logoUrl ? (
            <div className="cover-logo">
              <img src={design.logoUrl} alt="Logotyp" />
            </div>
          ) : null}

          {/* Course + School eyebrow above title */}
          {eyebrow && (
            <div style={{ fontSize: "10pt", color: accent, fontWeight: 500, marginBottom: "4mm", letterSpacing: "0.02em" }}>
              {eyebrow}
            </div>
          )}

          <h1 className="test-title" style={{ fontFamily: "var(--heading-font, inherit)" }}>
            <CoverTitle title={title} accents={design.titleAccents} />
            {design.version ? <sup className="title-version">{design.version}</sup> : null}
          </h1>
          {subtitle ? <div className="test-subtitle">{subtitle}</div> : null}

          {/* Thin rule below title */}
          <div style={{ height: "0.4mm", background: `${accent}50`, margin: "5mm 0" }} />

          {/* Name / Class / Date row */}
          <div className="name-row">
            <span className="name-cell"><span className="name-label">Namn:</span><span className="name-line" /></span>
            <span className="name-cell"><span className="name-label">Klass:</span><span className="name-line" /></span>
            <span className="name-cell"><span className="name-label">Datum:</span><span className="name-line" /></span>
          </div>

          {/* Tid / Hjälpmedel / Maxpoäng */}
          <CoverMeta design={design} totalPoints={totalPoints} />

          {design.coverImageUrl ? (
            <div className="cover-image">
              <img src={design.coverImageUrl} alt="" />
            </div>
          ) : null}
        </PageShell>
      )}

      {/* ── Empty state page ── */}
      {chunks.length === 0 && !showCover && (
        <PageShell design={design} pageNumber={1} totalPages={1}>
          <p style={{ color: "#999", marginTop: "40mm", textAlign: "center" }}>
            Lägg till frågor för att fylla provet.
          </p>
        </PageShell>
      )}

      {/* ── Question pages ── */}
      {chunks.map((chunk, ci) => {
        let localQ = qNumberOffset[ci];
        return (
          <PageShell
            key={ci}
            design={design}
            pageNumber={ci + startPageNumber}
            totalPages={totalPages}
          >
            {chunk.map((pi, i) => {
              const qNum = pi.kind === "qblock" ? ++localQ : 0;
              return (
                <PageItemRender
                  key={i}
                  item={pi}
                  qNumber={qNum}
                  design={design}
                />
              );
            })}
          </PageShell>
        );
      })}
    </div>
  );
}
