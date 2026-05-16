import React from "react";
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
  /** Accent color override (separate from design.primaryColor for new design panel) */
  accent?: string;
  /** When true, renders correct answers inline (facit/answer key mode) */
  showAnswers?: boolean;
};

const SUB_LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

/* ─── Font catalog ────────────────────────────────────────────────────── */

const FONT_CATALOG: Record<string, string> = {
  newsreader:   '"Newsreader", Georgia, serif',
  instrument:   '"Instrument Serif", Georgia, serif',
  fraunces:     '"Fraunces", Georgia, serif',
  "eb-garamond": '"EB Garamond", Georgia, serif',
  lora:         '"Lora", Georgia, serif',
  crimson:      '"Crimson Pro", Georgia, serif',
  "source-serif": '"Source Serif 4", Georgia, serif',
  "plex-serif": '"IBM Plex Serif", Georgia, serif',
  cormorant:    '"Cormorant Garamond", Georgia, serif',
  geist:        '"Geist", system-ui, sans-serif',
  "dm-sans":    '"DM Sans", system-ui, sans-serif',
  "plex-sans":  '"IBM Plex Sans", system-ui, sans-serif',
  system:       'system-ui, -apple-system, sans-serif',
  // Legacy fallbacks
  humanist:     '"Geist", "Inter", "Helvetica Neue", Arial, sans-serif',
  serif:        '"Lora", "Instrument Serif", Georgia, "Times New Roman", serif',
  geometrisk:   '"DM Sans", "Nunito", "Helvetica Neue", Arial, sans-serif',
  sans:         '"Geist", "Inter", "Helvetica Neue", Arial, sans-serif',
  rounded:      '"DM Sans", "Nunito", "Helvetica Neue", Arial, sans-serif',
  mono:         'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

function resolveFont(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  if (FONT_CATALOG[id]) return FONT_CATALOG[id];
  return id; // treat as raw CSS font-family string
}

/* ─── Paper styles ────────────────────────────────────────────────────── */

const PAPER_STYLES: Record<string, { bg: string; overlay?: string }> = {
  white: { bg: "#FFFFFF" },
  cream: { bg: "#FBF7EE" },
  warm:  { bg: "#F8F1E1" },
  linen: { bg: "#F4EFE3" },
  dot:   { bg: "#FDFBF5", overlay: "radial-gradient(circle, #DCD3BD 0.8px, transparent 0.9px) 0 0 / 10mm 10mm" },
  grid:  { bg: "#FDFBF5", overlay: "linear-gradient(#E7DFC9 1px, transparent 1px) 0 0 / 100% 5mm, linear-gradient(90deg, #E7DFC9 1px, transparent 1px) 0 0 / 5mm 100%" },
  ruled: { bg: "#FFFEF8", overlay: "linear-gradient(#E0D8C0 1px, transparent 1px) 0 0 / 100% 7mm" },
  graph: { bg: "#FFFEF8", overlay: "linear-gradient(#F1E9D2 1px, transparent 1px) 0 0 / 100% 1mm, linear-gradient(90deg, #F1E9D2 1px, transparent 1px) 0 0 / 1mm 100%, linear-gradient(#D6CBA6 1px, transparent 1px) 0 0 / 100% 5mm, linear-gradient(90deg, #D6CBA6 1px, transparent 1px) 0 0 / 5mm 100%" },
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result.toLowerCase();
}

function formatNumber(n: number, style: DesignSettings["numbering"]): string {
  switch (style) {
    case "letter": return String.fromCharCode(64 + n);
    case "roman":  return toRoman(n);
    case "paren":  return `(${n})`;
    default:       return `${n}`;
  }
}

function gapPx(density: DesignSettings["density"]): number {
  switch (density) {
    case "compact":   return 8;
    case "spacious":  return 22;
    default:          return 14;
  }
}

/* ─── Watermark ──────────────────────────────────────────────────────── */

function Watermark({ text }: { text: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", pointerEvents: "none", zIndex: 0,
    }}>
      <span style={{
        transform: "rotate(-22deg)",
        fontFamily: '"Newsreader", Georgia, serif',
        fontSize: 180, fontWeight: 700,
        color: "#000", opacity: 0.04,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}>
        {text}
      </span>
    </div>
  );
}

/* ─── PageFrame ──────────────────────────────────────────────────────── */

function PageFrame({ frameStyle, accent, margin }: { frameStyle: DesignSettings["pageFrame"]; accent: string; margin: string }) {
  if (!frameStyle || frameStyle === "none") return null;
  const inset = `calc(${margin} - 6mm)`;

  if (frameStyle === "thin") {
    return (
      <div style={{
        position: "absolute", inset,
        border: "1px solid #C8C2B5",
        pointerEvents: "none", zIndex: 0,
      }} />
    );
  }
  if (frameStyle === "double") {
    return (
      <>
        <div style={{ position: "absolute", inset, border: "1px solid #999", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", inset: `calc(${inset} + 3px)`, border: "0.5px solid #999", pointerEvents: "none", zIndex: 0 }} />
      </>
    );
  }
  if (frameStyle === "thick-accent") {
    return (
      <div style={{
        position: "absolute", inset,
        border: `2px solid ${accent}`,
        pointerEvents: "none", zIndex: 0,
      }} />
    );
  }
  if (frameStyle === "corners") {
    const cornerStyle = (top: boolean, left: boolean): React.CSSProperties => ({
      position: "absolute",
      width: 26, height: 26,
      borderTop: top ? `2px solid #999` : "none",
      borderBottom: !top ? `2px solid #999` : "none",
      borderLeft: left ? `2px solid #999` : "none",
      borderRight: !left ? `2px solid #999` : "none",
      top: top ? inset : "auto",
      bottom: !top ? inset : "auto",
      left: left ? inset : "auto",
      right: !left ? inset : "auto",
      pointerEvents: "none", zIndex: 0,
    });
    return (
      <>
        <div style={cornerStyle(true, true)} />
        <div style={cornerStyle(true, false)} />
        <div style={cornerStyle(false, true)} />
        <div style={cornerStyle(false, false)} />
      </>
    );
  }
  return null;
}

/* ─── PaperFooter ────────────────────────────────────────────────────── */

function PaperFooter({ footerStyle, accent, course, school, pageNumber, totalPages }: {
  footerStyle: DesignSettings["footerStyle"];
  accent: string;
  course: string;
  school: string;
  pageNumber: number;
  totalPages: number;
}) {
  if (!footerStyle || footerStyle === "none") return null;

  const base: React.CSSProperties = {
    position: "absolute", bottom: 14, left: "var(--paper-margin)", right: "var(--paper-margin)",
    fontSize: 9, color: "#888", letterSpacing: "0.06em",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  };

  if (footerStyle === "minimal") {
    return (
      <div style={base}>
        <span />
        <span>{pageNumber}</span>
      </div>
    );
  }
  if (footerStyle === "info") {
    return (
      <div style={base}>
        <span>{course}</span>
        <span>Sida {pageNumber} / {totalPages}</span>
      </div>
    );
  }
  if (footerStyle === "hairline") {
    return (
      <div style={{ ...base, borderTop: "1px solid #D8D1BF", paddingTop: 10, paddingBottom: 14, bottom: 0 }}>
        <span>{school ? `${school}${course ? " · " + course : ""}` : course}</span>
        <span>{pageNumber} / {totalPages}</span>
      </div>
    );
  }
  if (footerStyle === "branded") {
    return (
      <div style={{ ...base, borderTop: `2px solid ${accent}` }}>
        <span style={{ color: accent, fontWeight: 700 }}>{school}</span>
        <span style={{ fontFamily: "monospace", textTransform: "uppercase" }}>{course}</span>
        <span style={{ fontFamily: "monospace" }}>Sida {pageNumber} / {totalPages}</span>
      </div>
    );
  }
  return null;
}

/* ─── HeaderOrnament ──────────────────────────────────────────────────── */

function HeaderOrnament({ variant, accent }: { variant: DesignSettings["headerOrnament"]; accent: string }) {
  if (!variant || variant === "none") return null;

  if (variant === "rule") {
    return <div style={{ height: 1, background: "#222", margin: "0 auto 22px", width: 40 }} />;
  }
  if (variant === "double-rule") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 60, margin: "0 auto 20px" }}>
        <div style={{ height: 1, background: "#222" }} />
        <div style={{ height: 1, background: "#222" }} />
      </div>
    );
  }
  if (variant === "ornament") {
    return (
      <div style={{ margin: "12px auto 20px", width: 46, height: 14, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="46" height="14" viewBox="0 0 46 14" fill="none">
          <circle cx="4" cy="7" r="3" fill="currentColor" opacity="0.5" />
          <circle cx="42" cy="7" r="3" fill="currentColor" opacity="0.5" />
          <line x1="9" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1" />
          <line x1="30" y1="7" x2="37" y2="7" stroke="currentColor" strokeWidth="1" />
          {/* diamond star */}
          <polygon points="23,1 25,7 23,13 21,7" fill="currentColor" />
          <polygon points="17,7 23,9 29,7 23,5" fill="currentColor" />
        </svg>
      </div>
    );
  }
  if (variant === "diamond") {
    return (
      <div style={{ margin: "8px 0 22px", color: accent }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <polygon points="7,0 14,7 7,14 0,7" fill="currentColor" />
        </svg>
      </div>
    );
  }
  return null;
}

/* ─── SectionDivider ─────────────────────────────────────────────────── */

function SectionDivider({ variant, accent }: { variant: DesignSettings["sectionDivider"]; accent: string }) {
  if (!variant || variant === "none") return null;

  if (variant === "rule") {
    return <div style={{ height: 1, background: "#E0D8C0", margin: "14px 0" }} />;
  }
  if (variant === "hairline") {
    return <div style={{ height: 1, background: "#999", margin: "10px 0 4px", width: 40 }} />;
  }
  if (variant === "ornament") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", color: accent }}>
        <div style={{ flex: 1, height: 1, background: "#E0D8C0" }} />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <polygon points="5,0 10,5 5,10 0,5" fill="currentColor" />
        </svg>
        <div style={{ flex: 1, height: 1, background: "#E0D8C0" }} />
      </div>
    );
  }
  if (variant === "dotted") {
    return <div style={{ borderTop: "1px dotted #C8C2B5", margin: "12px 0" }} />;
  }
  return null;
}

/* ─── PageHeader variants ────────────────────────────────────────────── */

function PageHeader({ layout, title, subtitle, course, school, accent, headingFont, titleWeight, titleItalic, titleTransform, titleTracking, titleColor, headerOrnament: ornamentVariant, metaStyle }: {
  layout: string;
  title: string;
  subtitle: string;
  course: string;
  school: string;
  accent: string;
  headingFont: string;
  titleWeight: number;
  titleItalic: boolean;
  titleTransform: string;
  titleTracking: number;
  titleColor: string;
  headerOrnament: DesignSettings["headerOrnament"];
  metaStyle: string;
}) {
  const titleStyle: React.CSSProperties = {
    fontFamily: headingFont,
    fontWeight: titleWeight,
    fontStyle: titleItalic ? "italic" : "normal",
    textTransform: (titleTransform === "smallcaps" ? "none" : titleTransform) as React.CSSProperties["textTransform"],
    fontVariant: titleTransform === "smallcaps" ? "small-caps" : undefined,
    letterSpacing: titleTracking ? `${titleTracking / 1000}em` : undefined,
    color: titleColor === "accent" ? accent : "#14110D",
    margin: 0,
  };

  if (layout === "serif-large" || layout === "classic") {
    return (
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        {(course || school) && (
          <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase" }}>
            {[course, school].filter(Boolean).join(" · ")}
          </div>
        )}
        <h1 style={{ ...titleStyle, fontSize: 56, lineHeight: 1.1, marginBottom: 8 }}>{title || "Provets titel"}</h1>
        {subtitle && <div style={{ fontSize: 13, fontStyle: "italic", color: "#555", marginBottom: 12 }}>{subtitle}</div>}
        <HeaderOrnament variant={ornamentVariant} accent={accent} />
        <div style={{ width: 60, height: 1, background: "#333", margin: "0 auto" }} />
      </div>
    );
  }

  if (layout === "tabloid" || layout === "editorial") {
    return (
      <div style={{ paddingBottom: 16, borderBottom: `2px solid ${accent}`, marginBottom: 20 }}>
        {(course || school) && (
          <div style={{ fontSize: 10, color: accent, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
            {course ? `${course} — Vt 26` : school}
          </div>
        )}
        <h1 style={{ ...titleStyle, fontSize: 48, lineHeight: 1.1, marginBottom: 6 }}>{title || "Provets titel"}</h1>
        {subtitle && <div style={{ fontSize: 14, fontStyle: "italic", color: "#555" }}>{subtitle}</div>}
        <HeaderOrnament variant={ornamentVariant} accent={accent} />
      </div>
    );
  }

  if (layout === "centered-rule" || layout === "minimal") {
    return (
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 1, background: "#DDD" }} />
          <span style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase" }}>{course}</span>
          <div style={{ flex: 1, height: 1, background: "#DDD" }} />
        </div>
        <h1 style={{ ...titleStyle, fontSize: 32, lineHeight: 1.2, marginBottom: 6 }}>{title || "Provets titel"}</h1>
        {subtitle && <div style={{ fontSize: 12, color: "#777" }}>{subtitle}</div>}
        <HeaderOrnament variant={ornamentVariant} accent={accent} />
      </div>
    );
  }

  if (layout === "stamped" || layout === "exam") {
    return (
      <div style={{ marginBottom: 20, borderBottom: "1.5px solid #111", paddingBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 76, height: 76, border: `2px solid ${accent}`, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: headingFont, fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>P</span>
            <span style={{ fontSize: 9, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{course?.split(" ")[0] ?? ""}</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: accent, textTransform: "uppercase", marginTop: 2 }}>VT 26</span>
          </div>
          <div style={{ flex: 1 }}>
            {(school || course) && (
              <div style={{ fontSize: 10.5, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                {[school, course].filter(Boolean).join(" · ")}
              </div>
            )}
            <h1 style={{ ...titleStyle, fontSize: 28, lineHeight: 1.2, marginBottom: 4 }}>{title || "Provets titel"}</h1>
            {subtitle && <div style={{ fontSize: 12.5, fontStyle: "italic", color: "#555" }}>{subtitle}</div>}
          </div>
        </div>
        <HeaderOrnament variant={ornamentVariant} accent={accent} />
      </div>
    );
  }

  // Fallback
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ ...titleStyle, fontSize: 40, lineHeight: 1.2 }}>{title || "Provets titel"}</h1>
      {subtitle && <div style={{ fontSize: 13, color: "#777", marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}

/* ─── MetaBlock variants ─────────────────────────────────────────────── */

function MetaBlock({ metaStyle, accent }: { metaStyle: string; accent: string }) {
  const fields = [
    { label: "Namn", flex: 2 },
    { label: "Klass", flex: 1 },
    { label: "Datum", flex: 1 },
  ];

  if (metaStyle === "underline" || metaStyle === "classic") {
    return (
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {fields.map(f => (
          <div key={f.label} style={{ flex: f.flex }}>
            <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{f.label}</div>
            <div style={{ borderBottom: "1px solid #333", height: 18 }} />
          </div>
        ))}
      </div>
    );
  }

  if (metaStyle === "boxed" || metaStyle === "editorial") {
    return (
      <div style={{ border: "1px solid #ccc", borderRadius: 4, padding: 12, display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0 12px", marginBottom: 20 }}>
        {fields.map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.label}</div>
            <div style={{ borderBottom: "1px dashed #aaa", height: 18, marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (metaStyle === "inline" || metaStyle === "minimal") {
    return (
      <div style={{ display: "flex", gap: 24, fontSize: 11, color: "#666", paddingBottom: 12, borderBottom: "1px solid #DDD", marginBottom: 16 }}>
        {fields.map(f => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "#999" }}>{f.label}</span>
            <div style={{ width: 60, borderBottom: "1px solid #CCC", height: 14 }} />
          </div>
        ))}
      </div>
    );
  }

  if (metaStyle === "table" || metaStyle === "exam") {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #C8C2B5", marginBottom: 20, fontSize: 10.5 }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 12px", borderRight: "1px solid #C8C2B5", borderBottom: "1px solid #C8C2B5", width: "50%" }}>
              <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Namn</div>
              <div style={{ borderBottom: "1px solid #AAA", height: 18 }} />
            </td>
            <td style={{ padding: "8px 12px", borderBottom: "1px solid #C8C2B5" }}>
              <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Klass</div>
              <div style={{ borderBottom: "1px solid #AAA", height: 18 }} />
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px", borderRight: "1px solid #C8C2B5" }}>
              <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Datum</div>
              <div style={{ borderBottom: "1px solid #AAA", height: 18 }} />
            </td>
            <td style={{ padding: "8px 12px" }}>
              <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Lärare</div>
              <div style={{ borderBottom: "1px solid #AAA", height: 18 }} />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return null;
}

/* ─── SectionHeader variants ─────────────────────────────────────────── */

function SectionHeader({ label, index, layout, accent, headingFont, sectionItalic }: {
  label: string;
  index: number;
  layout: string;
  accent: string;
  headingFont: string;
  sectionItalic: boolean;
}) {
  const fontStyle = sectionItalic ? "italic" : "normal";

  if (layout === "band" || layout === "classic") {
    return (
      <div style={{
        background: accent, color: "white",
        margin: "14px -8mm 18px",
        padding: "4mm 8mm",
        fontFamily: headingFont,
        fontWeight: 800, fontSize: 22,
        textTransform: "uppercase",
        fontStyle,
        display: "flex", alignItems: "center", gap: 12,
        breakAfter: "avoid", pageBreakAfter: "avoid",
      }}>
        <span style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace", fontWeight: 400, fontStyle: "normal" }}>
          {String(index).padStart(2, "0")}
        </span>
        {label}
      </div>
    );
  }

  if (layout === "rule-number" || layout === "editorial") {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, margin: "16px 0 14px", breakAfter: "avoid", pageBreakAfter: "avoid" }}>
        <span style={{ fontFamily: headingFont, fontSize: 38, fontStyle: "italic", fontWeight: 400, color: accent, lineHeight: 1, flexShrink: 0 }}>
          {toRoman(index)}
        </span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, paddingTop: 14 }}>
          <div style={{ flex: 1, height: 1, background: "#DDD" }} />
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", fontStyle }}>{label}</span>
        </div>
      </div>
    );
  }

  if (layout === "hairline" || layout === "minimal") {
    return (
      <div style={{ margin: "14px 0 10px", breakAfter: "avoid", pageBreakAfter: "avoid" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10.5, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase" }}>Del {index}</span>
          <div style={{ flex: 1, height: 1, background: "#DDD" }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: headingFont, fontStyle }}>{label}</div>
      </div>
    );
  }

  if (layout === "outline" || layout === "exam") {
    return (
      <div style={{
        border: `1.5px solid ${accent}`, borderRadius: 4,
        padding: "8px 14px", margin: "14px 0 10px",
        display: "flex", alignItems: "center", gap: 12,
        breakAfter: "avoid", pageBreakAfter: "avoid",
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: accent, color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "monospace", fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>
          {index}
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, fontStyle }}>{label}</span>
      </div>
    );
  }

  // Fallback — thin style
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 8px", breakAfter: "avoid", pageBreakAfter: "avoid" }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: accent, fontStyle }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `${accent}50` }} />
    </div>
  );
}

/* ─── CardWrap ───────────────────────────────────────────────────────── */

function CardWrap({ cardStyle, accent, density, children }: {
  cardStyle: DesignSettings["cardStyle"];
  accent: string;
  density: DesignSettings["density"];
  children: React.ReactNode;
}) {
  const gap = gapPx(density);
  const base: React.CSSProperties = { margin: `0 -12px ${gap}px`, borderRadius: 6 };

  switch (cardStyle) {
    case "framed":
      return <div style={{ ...base, padding: "10px 14px", border: "1px solid #E0D9C8" }}>{children}</div>;
    case "banded":
      return (
        <div style={{ ...base, border: "1px solid #E7E1D1", overflow: "hidden", background: "white" }}>
          <div style={{ height: 3, background: accent }} />
          <div style={{ padding: "10px 14px" }}>{children}</div>
        </div>
      );
    case "gutter":
      return <div style={{ ...base, padding: "8px 12px 8px 16px", borderLeft: `3px solid ${accent}` }}>{children}</div>;
    case "indented":
      return <div style={{ ...base, padding: "8px 12px 8px 32px" }}>{children}</div>;
    case "stamped":
      return <div style={{ ...base, padding: "10px 14px", background: "rgba(255,255,255,0.5)", border: "1px dashed #C8C2B5" }}>{children}</div>;
    default: // flat
      return <div style={{ ...base, padding: "10px 12px" }}>{children}</div>;
  }
}

/* ─── NumLabel ───────────────────────────────────────────────────────── */

function NumLabel({ label, numStyle, accent, numColor, bodySize }: {
  label: string;
  numStyle: DesignSettings["numStyle"];
  accent: string;
  numColor: DesignSettings["numColor"];
  bodySize: number;
}) {
  const color = numColor === "accent" ? accent : "#14110D";

  switch (numStyle) {
    case "fraga":
      return (
        <strong style={{ fontSize: bodySize - 0.5, textTransform: "uppercase", letterSpacing: "0.06em", color }}>
          Fråga {label}
        </strong>
      );
    case "display":
      return (
        <strong style={{
          float: "left", marginRight: 12,
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 32, fontWeight: 600, color,
          lineHeight: 1,
        }}>
          {label}
        </strong>
      );
    case "chip":
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: "50%",
          background: color, color: "white",
          fontFamily: "monospace", fontSize: 11, fontWeight: 600,
          marginRight: 8, flexShrink: 0,
        }}>
          {label}
        </span>
      );
    default: // plain
      return <strong style={{ marginRight: 8, color }}>{label}</strong>;
  }
}

/* ─── DropCap ────────────────────────────────────────────────────────── */

function DropCap({ char, dropCap, accent }: { char: string; dropCap: DesignSettings["dropCap"]; accent: string }) {
  if (!dropCap || dropCap === "off" || !char) return null;

  if (dropCap === "filled") {
    return (
      <span style={{
        float: "left", marginRight: 8, fontSize: 54, fontWeight: 700,
        fontFamily: '"Newsreader", Georgia, serif',
        color: accent, lineHeight: 0.85,
      }}>
        {char}
      </span>
    );
  }
  if (dropCap === "outline") {
    return (
      <span style={{
        float: "left", marginRight: 8, fontSize: 54, fontWeight: 700,
        fontFamily: '"Newsreader", Georgia, serif',
        color: "transparent",
        WebkitTextStroke: `1.5px ${accent}`,
        lineHeight: 0.85,
      } as React.CSSProperties}>
        {char}
      </span>
    );
  }
  if (dropCap === "box") {
    return (
      <span style={{
        float: "left", marginRight: 10, marginBottom: 4,
        width: 46, height: 46, background: accent, color: "white",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: '"Newsreader", Georgia, serif',
        fontSize: 32, fontWeight: 700,
      }}>
        {char}
      </span>
    );
  }
  return null;
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
        display: "inline-block", fontSize: "var(--points-size, 10pt)",
        fontWeight: 600, color: accent, background: `${accent}18`,
        borderRadius: 999, padding: "0.5mm 3mm", whiteSpace: "nowrap",
      }}>
        {points} p
      </span>
    );
  }
  if (pStyle === "box") {
    return (
      <span style={{
        display: "inline-block", fontSize: "var(--points-size, 10pt)",
        fontWeight: 600, border: `1px solid ${accent}`,
        borderRadius: "1mm", padding: "0.5mm 2.5mm", whiteSpace: "nowrap",
      }}>
        {points} p
      </span>
    );
  }
  if (pStyle === "stamp") {
    return (
      <span style={{
        display: "inline-block", fontSize: "var(--points-size, 10pt)",
        fontWeight: 700, color: accent, border: `2px solid ${accent}`,
        borderRadius: 2, padding: "0.5mm 2.5mm", whiteSpace: "nowrap",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {points}p
      </span>
    );
  }
  // italic (default)
  return (
    <span style={{ fontSize: "var(--points-size, 10pt)", color: "#555", fontStyle: "italic", whiteSpace: "nowrap" }}>
      ({points} p)
    </span>
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

/* ─── Question text ──────────────────────────────────────────────────── */

const HTML_RE = /<[a-z][\s\S]*?>/i;

function RichText({ raw }: { raw: string }) {
  if (HTML_RE.test(raw)) return <span dangerouslySetInnerHTML={{ __html: raw }} />;
  return <>{raw}</>;
}

function QuestionText({ q }: { q: Question }) {
  if (q.type === "cloze") {
    const raw = (q.content as ClozeContent).text || "";
    if (HTML_RE.test(raw)) {
      const plain = raw.replace(/<[^>]+>/g, "");
      return <ClozeText text={plain} />;
    }
    return <ClozeText text={raw} />;
  }
  if (q.type === "group") return <RichText raw={(q.content as { title?: string }).title || "(Grupp)"} />;
  if (q.type === "definition") {
    const raw = (q.content as { term?: string; text?: string }).text || (q.content as { term?: string }).term || "(Definition)";
    return <RichText raw={raw} />;
  }
  return <RichText raw={(q.content as { text?: string }).text || "(Tom fråga)"} />;
}

/* ─── Question body ──────────────────────────────────────────────────── */

function QuestionBody({ q, design, accent }: { q: Question; design: DesignSettings; accent: string }) {
  const lineStyle   = design.lineStyle   ?? "solid";
  const mcMarker    = design.mcMarker    ?? "square";
  const lineHeight  = design.lineHeight  ?? design.lineSpacing ?? 22;
  const borderStyle = lineStyle === "dashed" ? "dashed" : lineStyle === "dotted" ? "dotted" : "solid";

  if (q.type === "open") {
    const lines = Math.max(1, (q.content as OpenContent).lines || 1);
    return (
      <div className="write-lines" data-style={lineStyle}>
        {Array.from({ length: lines }).map((_, i) => (
          <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
        ))}
      </div>
    );
  }

  if (q.type === "multiple_choice") {
    const c = q.content as MultipleChoiceContent;
    return (
      <ul className={`mc-options mc-marker-${mcMarker}`}>
        {(c.options ?? []).map((opt, i) => (
          <li key={i}>
            {mcMarker === "letter"
              ? <span className="mc-box mc-letter">{String.fromCharCode(65 + i)}</span>
              : <span className="mc-box" style={{ borderColor: accent, borderRadius: mcMarker === "circle" ? "50%" : undefined }} />}
            <span>{opt || `Alternativ ${i + 1}`}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (q.type === "true_false") {
    return (
      <ul className="tf-options">
        {["Sant", "Falskt"].map(label => (
          <li key={label}>
            <span className="mc-box" style={{ borderColor: accent, borderRadius: mcMarker === "circle" ? "50%" : undefined }} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (q.type === "matching") {
    const c = q.content as MatchingContent;
    return (
      <table className="match-table">
        <tbody>
          {(c.pairs ?? []).map((p, i) => (
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
    return (
      <div>
        {c.imageUrl && (
          <figure className="q-image">
            <img src={c.imageUrl} alt={c.caption || ""} />
            {c.caption && <figcaption>{c.caption}</figcaption>}
          </figure>
        )}
        {lines > 0 && (
          <div className="write-lines">
            {Array.from({ length: lines }).map((_, i) => (
              <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
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
        {(c.headers ?? []).length > 0 && (
          <thead><tr>{(c.headers ?? []).map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        )}
        <tbody>
          {(c.rows ?? []).map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
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
    return <div className="draw-area" style={{ height: `${Math.max(20, c.heightMm || 60)}mm` }} />;
  }

  if (q.type === "source_critique") {
    const c = q.content as SourceCritiqueContent;
    const lines = Math.max(1, c.lines || 4);
    return (
      <div style={{ marginTop: "3mm", display: "grid", gridTemplateColumns: "minmax(45mm, 0.85fr) 1fr", gap: "4mm", alignItems: "start" }}>
        <div style={{ background: "#FBF8F1", border: "0.4mm solid #E7DDC4", borderRadius: "1.5mm", padding: "3mm 4mm" }}>
          {c.sourceTitle && (
            <div style={{ fontSize: "7.5pt", color: "#A87F1A", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "1.5mm", textTransform: "uppercase" }}>
              {c.category ? `KÄLLA · ${c.category.toUpperCase()}` : c.sourceTitle}
            </div>
          )}
          {c.sourceImageUrl && (
            <img src={c.sourceImageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "25mm", objectFit: "contain", display: "block", marginBottom: "2mm" }} />
          )}
          <p style={{ margin: 0, fontSize: "9.5pt", lineHeight: 1.6, fontStyle: "italic", color: "#3a3530" }}>{c.sourceText}</p>
          {c.sourceAttribution && (
            <div style={{ fontSize: "8pt", color: "#8a7e64", marginTop: "2mm", textAlign: "right" }}>— {c.sourceAttribution}</div>
          )}
        </div>
        <div className="write-lines" data-style={lineStyle}>
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "short_answer") {
    const c = q.content as ShortAnswerContent;
    const lines = Math.max(1, c.lines || 2);
    return (
      <div className="write-lines">
        {Array.from({ length: lines }).map((_, i) => (
          <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
        ))}
      </div>
    );
  }

  if (q.type === "numeric") {
    const c = q.content as NumericContent;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4mm", marginTop: "2mm" }}>
        <div style={{ flex: 1, height: "0.4mm", background: "#C8C2B5" }} />
        {c.unit && <span style={{ fontSize: "10pt", color: "#555", fontStyle: "italic" }}>{c.unit}</span>}
      </div>
    );
  }

  if (q.type === "essay") {
    const c = q.content as EssayContent;
    const lines = Math.max(1, c.lines || 20);
    return (
      <div>
        {c.wordLimit && <div style={{ fontSize: "8.5pt", color: "#888", fontStyle: "italic", marginBottom: "1.5mm" }}>Max {c.wordLimit} ord</div>}
        <div className="write-lines">
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "group") return null;

  if (q.type === "definition") {
    const c = q.content as DefinitionContent;
    // Multi-term format (from modal editor)
    if (c.terms && c.terms.length > 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4mm" }}>
          {c.terms.map((t, idx) => (
            <div key={idx}>
              <div style={{ fontSize: "10pt", fontWeight: 600, color: accent, marginBottom: "1.5mm" }}>
                {t.term || `Begrepp ${idx + 1}`}
              </div>
              <div className="write-lines">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    // Single-term fallback
    const lines = Math.max(1, c.lines || 3);
    return (
      <div>
        {c.term && <div style={{ fontSize: "10pt", fontWeight: 600, color: accent, marginBottom: "1.5mm" }}>{c.term}</div>}
        <div className="write-lines">
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
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
        {c.imageUrl
          ? <figure className="q-image" style={{ marginBottom: "2mm" }}>
              <img src={c.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: `${h}mm`, objectFit: "contain" }} />
            </figure>
          : <div className="draw-area" style={{ height: `${h}mm` }} />}
        {c.labels && c.labels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm", marginTop: "2mm" }}>
            {c.labels.map((label, i) => (
              <span key={i} style={{ fontSize: "9pt", padding: "0.5mm 2mm", border: `0.3mm solid ${accent}`, borderRadius: "1mm", color: accent }}>{label}</span>
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
            <tr key={i}><td>&nbsp;</td><td>&nbsp;</td></tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (q.type === "formula") {
    const c = q.content as FormulaContent;
    const lines = Math.max(1, c.lines || 5);
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
        <div className="write-lines">
          {Array.from({ length: lines }).map((_, i) => (
            <div className="line" key={i} style={{ borderBottomStyle: borderStyle, height: lineHeight }} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Page item types ────────────────────────────────────────────────── */

type QuestionBlock = { kind: "qblock"; lead: Question; subs: Question[]; sectionStart?: string };
type ContentBlockEntry = { kind: "cblock"; item: PrintableBlockItem };
type PageItem = QuestionBlock | ContentBlockEntry;

function buildPageItems(items: PrintableItem[]): PageItem[] {
  const result: PageItem[] = [];
  for (const it of items) {
    if ("kind" in it && it.kind === "block") {
      result.push({ kind: "cblock", item: it as PrintableBlockItem });
      continue;
    }
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

/* ─── Content block renderer ─────────────────────────────────────────── */

function ContentBlockPrint({ item, accent }: { item: PrintableBlockItem; accent: string }) {
  const c = item.content as Record<string, unknown>;

  switch (item.block_type) {
    case "heading":
      return (
        <div style={{ margin: "6mm 0 3mm", breakAfter: "avoid", pageBreakAfter: "avoid" }}>
          <h2 style={{ fontSize: "14pt", fontWeight: 700, color: accent, margin: 0, letterSpacing: "-0.01em" }}>
            {String(c.text ?? c.title ?? "")}
          </h2>
          <div style={{ height: "0.4mm", background: `${accent}40`, marginTop: "1.5mm" }} />
        </div>
      );
    case "intro":
      return (
        <div style={{ margin: "0 0 6mm", padding: "3mm 4mm", background: `${accent}08`, borderLeft: `2mm solid ${accent}`, borderRadius: "0 1.5mm 1.5mm 0", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {!!c.title && <div style={{ fontSize: "9pt", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5mm" }}>{String(c.title)}</div>}
          <p style={{ margin: 0, fontSize: "11pt", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{String(c.text ?? "")}</p>
        </div>
      );
    case "instruction":
      return (
        <div style={{ margin: "0 0 5mm", padding: "2.5mm 4mm", background: "#f5f5f5", border: "0.3mm solid #ddd", borderRadius: "1.5mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <p style={{ margin: 0, fontSize: "10pt", lineHeight: 1.6, color: "#444", whiteSpace: "pre-wrap" }}>{String(c.text ?? "")}</p>
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
          {!!c.imageUrl && <img src={String(c.imageUrl)} alt="" style={{ maxWidth: "100%", maxHeight: "50mm", objectFit: "contain", display: "block", marginBottom: "2mm" }} />}
          <p style={{ margin: 0, fontSize: "10.5pt", lineHeight: 1.7, color: "#222", whiteSpace: "pre-wrap", fontStyle: "italic" }}>{String(c.text ?? "")}</p>
        </div>
      );
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
      return null;
    case "pageBreak":
      return <div style={{ breakAfter: "page", pageBreakAfter: "always" }} />;
    case "divider":
      return <hr style={{ margin: "5mm 0", border: "none", borderTop: `0.4mm solid ${accent}30` }} />;
    default:
      return null;
  }
}

/* ─── Answer key box ─────────────────────────────────────────────────── */

function AnswerKeyBox({ q, accent }: { q: Question; accent: string }) {
  const c = q.content as Record<string, unknown>;

  let answerNode: React.ReactNode = null;

  if (q.type === "multiple_choice") {
    const mc = q.content as MultipleChoiceContent;
    const correct = mc.correctIndex;
    if (correct === null || correct === undefined) return null;
    const indices = Array.isArray(correct) ? correct : [correct];
    const opts = mc.options ?? [];
    answerNode = (
      <span>
        {indices.map(i => opts[i] ?? `alternativ ${i + 1}`).join(", ")}
      </span>
    );
  } else if (q.type === "true_false") {
    const val = c.correct as number | null | undefined;
    if (val === null || val === undefined) return null;
    answerNode = <span>{val === 0 ? "Sant" : "Falskt"}</span>;
  } else if (q.type === "matching") {
    const mc = q.content as MatchingContent;
    const pairs = mc.pairs ?? [];
    if (pairs.length === 0) return null;
    answerNode = (
      <span>
        {pairs.map((p, i) => `${p.left} → ${p.right}`).join(" · ")}
      </span>
    );
  } else if (q.type === "definition") {
    const dc = q.content as DefinitionContent;
    if (dc.terms && dc.terms.length > 0) {
      const hasDefs = dc.terms.some(t => t.def);
      if (!hasDefs) return null;
      answerNode = (
        <span>
          {dc.terms.filter(t => t.def).map(t => `${t.term}: ${t.def}`).join(" · ")}
        </span>
      );
    } else {
      return null;
    }
  } else if (q.type === "short_answer" || q.type === "numeric") {
    const answer = (c.answer as string | undefined) ?? (c.model as string | undefined);
    if (!answer) return null;
    answerNode = <span>{answer}</span>;
  } else if (q.type === "cloze") {
    // Extract blanks from the cloze text (___+)
    const text = (c.text as string) ?? "";
    const blanks = text.match(/_{3,}/g);
    const answers = (c.answers as string[] | undefined) ?? (c.model as string[] | undefined);
    if (!answers || answers.length === 0) {
      if (!blanks) return null;
      answerNode = <span>{blanks.length} luckor</span>;
    } else {
      answerNode = <span>{answers.join(", ")}</span>;
    }
  } else {
    return null;
  }

  if (!answerNode) return null;

  return (
    <div style={{
      marginTop: "3mm",
      padding: "2mm 4mm",
      background: accent + "12",
      borderLeft: `2px solid ${accent}`,
      borderRadius: "0 3px 3px 0",
      fontSize: 9.5,
      color: "#333",
      lineHeight: 1.4,
    }}>
      <span style={{ fontWeight: 700, color: accent, marginRight: "4px", letterSpacing: "0.05em" }}>
        SVAR:
      </span>
      {answerNode}
    </div>
  );
}

/* ─── QBlock render ──────────────────────────────────────────────────── */

function QBlockRender({ block, number, design, accent, sectionIndex, showAnswers }: {
  block: QuestionBlock;
  number: number;
  design: DesignSettings;
  accent: string;
  sectionIndex: number;
  showAnswers?: boolean;
}) {
  const layout       = design.layout ?? "classic";
  const numStyle     = design.numStyle ?? "plain";
  const numColor     = design.numColor ?? "ink";
  const bodySize     = design.bodySize ?? design.fontSizeBody ?? 11.5;
  const showPoints   = design.showPoints !== false;
  const pStyle       = design.pointsStyle ?? "italic";
  const numLabel     = formatNumber(number, design.numbering);
  const hasSubs      = block.subs.length > 0;
  const all          = hasSubs ? [block.lead, ...block.subs] : [block.lead];
  const dropCapStyle = design.dropCap ?? "off";
  const headingFont  = resolveFont(design.headingFont, '"Newsreader", Georgia, serif');
  const sectionItalic = design.sectionItalic ?? false;
  const density      = design.density ?? "comfortable";

  const inner = (
    <>
      {block.sectionStart && (
        <>
          <SectionHeader
            label={block.sectionStart}
            index={sectionIndex}
            layout={layout}
            accent={accent}
            headingFont={headingFont}
            sectionItalic={sectionItalic}
          />
          <SectionDivider variant={design.sectionDivider} accent={accent} />
        </>
      )}
      <div data-qid={block.lead.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div style={{ flexShrink: 0, fontSize: bodySize }}>
            <NumLabel
              label={numLabel}
              numStyle={numStyle}
              accent={accent}
              numColor={numColor}
              bodySize={bodySize}
            />
          </div>
          {showPoints && block.lead.points && !hasSubs && (
            <div style={{ marginLeft: "auto", flexShrink: 0 }}>
              <PointsDisplay points={block.lead.points} style={pStyle} accent={accent} />
            </div>
          )}
        </div>
        {all.map((q, i) => {
          const text = (q.content as { text?: string }).text || "";
          const firstChar = text.trim()[0] ?? "";
          return (
            <div key={q.id + i} style={{ marginBottom: i < all.length - 1 ? 8 : 0 }}>
              {hasSubs && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: "#777", minWidth: 16 }}>{SUB_LETTERS[i]})</span>
                  {showPoints && q.points && (
                    <span style={{ marginLeft: "auto" }}>
                      <PointsDisplay points={q.points} style={pStyle} accent={accent} />
                    </span>
                  )}
                </div>
              )}
              <div style={{ fontSize: bodySize, lineHeight: 1.55, color: "#14110D" }}>
                {!hasSubs && i === 0 && dropCapStyle !== "off" && firstChar && (
                  <DropCap char={firstChar} dropCap={dropCapStyle} accent={accent} />
                )}
                <QuestionText q={q} />
              </div>
              <QuestionBody q={q} design={design} accent={accent} />
              {showAnswers && <AnswerKeyBox q={q} accent={accent} />}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <CardWrap cardStyle={design.cardStyle} accent={accent} density={density}>
      {inner}
    </CardWrap>
  );
}

/* ─── Cover meta ─────────────────────────────────────────────────────── */

function CoverMeta({ design, totalPoints, accent }: { design: DesignSettings; totalPoints: number; accent: string }) {
  const rows: { label: string; value: string }[] = [];
  if (design.duration)    rows.push({ label: "Tid",        value: design.duration });
  if (design.aids)        rows.push({ label: "Hjälpmedel", value: design.aids });
  if (totalPoints > 0)    rows.push({ label: "Maxpoäng",   value: `${totalPoints}` });

  if (rows.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm 10mm", margin: "5mm 0 8mm", fontSize: "10pt", color: "#333" }}>
      {rows.map(r => (
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
  accent: accentProp,
  showAnswers = false,
}: Props) {
  const accent       = accentProp ?? design.primaryColor ?? "#1E5F5C";
  const showCover    = design.showCover !== false && design.includeCover !== false;
  const pageItems    = buildPageItems(items);
  const totalPoints  = items.reduce((s, it) => {
    if ("kind" in it && it.kind === "block") return s;
    return s + (parseFloat((it as PrintableQuestionItem).question.points || "0") || 0);
  }, 0);

  // Chunk by page
  const chunks: PageItem[][] = [];
  let currentChunk: PageItem[] = [];
  let qBlocksInChunk = 0;
  for (const pi of pageItems) {
    if (pi.kind === "cblock" && pi.item.block_type === "pageBreak") {
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

  const qNumberOffset: number[] = [];
  let runningQ = 0;
  for (const chunk of chunks) {
    qNumberOffset.push(runningQ);
    runningQ += chunk.filter(pi => pi.kind === "qblock").length;
  }

  // Resolve fonts
  const fallbackFont  = '"Newsreader", Georgia, serif';
  const headingFont   = resolveFont(design.headingFont, fallbackFont);
  const bodyFont      = resolveFont(design.bodyFont, headingFont);
  const bodySize      = design.bodySize ?? design.fontSizeBody ?? 11.5;
  const marginMm      = design.margin ?? design.marginLeft ?? 22;
  const marginStr     = `${marginMm}mm`;

  // Layout variant mapping
  const layoutVariants: Record<string, { headerStyle: string; metaStyle: string; sectionLayout: string }> = {
    classic:  { headerStyle: "serif-large", metaStyle: "underline",  sectionLayout: "band"        },
    editorial:{ headerStyle: "tabloid",     metaStyle: "boxed",      sectionLayout: "rule-number" },
    minimal:  { headerStyle: "centered-rule",metaStyle: "inline",    sectionLayout: "hairline"    },
    exam:     { headerStyle: "stamped",     metaStyle: "table",      sectionLayout: "outline"     },
  };
  const layoutKey    = design.layout ?? "classic";
  const variant      = layoutVariants[layoutKey] ?? layoutVariants.classic;
  const paperKey     = design.paperStyle ?? "white";
  const paperInfo    = PAPER_STYLES[paperKey] ?? PAPER_STYLES.white;

  // Title settings
  const titleWeight    = typeof design.titleWeight === "number" ? design.titleWeight
                        : parseInt(String(design.titleWeight ?? "700"), 10) || 700;
  const titleItalic    = design.titleItalic ?? false;
  const titleTransform = design.titleTransform ?? "uppercase";
  const titleTracking  = typeof design.titleTracking === "number" ? design.titleTracking
                        : parseFloat(String(design.titleTracking ?? "0")) || 0;
  const titleColor     = design.titleColor ?? "ink";
  const sectionItalic  = design.sectionItalic ?? false;
  const showMeta       = design.showMeta ?? false;
  const footerStyle    = design.footerStyle ?? "info";

  const course = design.course ?? "";
  const school = design.school ?? "";

  // Track section indices across all rendered items
  let globalSectionIndex = 0;

  const renderPage = (pageContent: React.ReactNode, pageNumber: number) => {
    return (
      <div
        className="paper-page"
        style={{
          width: 794,
          minHeight: 1100,
          position: "relative",
          background: paperInfo.bg,
          overflow: "hidden",
          padding: marginStr,
          boxSizing: "border-box",
          ["--paper-margin" as never]: marginStr,
        }}
      >
        {/* Paper overlay */}
        {paperInfo.overlay && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: paperInfo.overlay,
            mixBlendMode: "multiply",
            opacity: 0.6,
            pointerEvents: "none",
            zIndex: 0,
          }} />
        )}

        {/* Watermark */}
        {design.watermark && <Watermark text={design.watermark} />}

        {/* Page frame */}
        <PageFrame frameStyle={design.pageFrame} accent={accent} margin={marginStr} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {pageContent}
        </div>

        {/* Footer */}
        <PaperFooter
          footerStyle={footerStyle}
          accent={accent}
          course={course}
          school={school}
          pageNumber={pageNumber}
          totalPages={totalPages}
        />
      </div>
    );
  };

  const outerStyle: React.CSSProperties = {
    padding: "32px 24px 64px",
    gap: 24,
    background: "var(--ps-bg-soft, #EFEBE2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: bodyFont,
    fontSize: bodySize,
    ["--doc-heading-font" as never]: headingFont,
    ["--doc-body-font" as never]: bodyFont,
    ["--doc-title-weight" as never]: titleWeight,
    ["--doc-accent" as never]: accent,
  };

  return (
    <div className="printable-test" style={outerStyle}>

      {/* ── Cover page ── */}
      {showCover && renderPage(
        <>
          {design.logoUrl && (
            <div className="cover-logo" style={{ marginBottom: 12 }}>
              <img src={design.logoUrl} alt="Logotyp" style={{ maxHeight: 40 }} />
            </div>
          )}

          <PageHeader
            layout={variant.headerStyle}
            title={title}
            subtitle={subtitle ?? ""}
            course={course}
            school={school}
            accent={accent}
            headingFont={headingFont}
            titleWeight={titleWeight}
            titleItalic={titleItalic}
            titleTransform={titleTransform}
            titleTracking={titleTracking}
            titleColor={titleColor}
            headerOrnament={design.headerOrnament}
            metaStyle={variant.metaStyle}
          />

          {showMeta && (
            <MetaBlock metaStyle={variant.metaStyle} accent={accent} />
          )}

          {/* Default meta row for non-meta layouts */}
          {!showMeta && (
            <div className="name-row">
              <span className="name-cell"><span className="name-label">Namn:</span><span className="name-line" /></span>
              <span className="name-cell"><span className="name-label">Klass:</span><span className="name-line" /></span>
              <span className="name-cell"><span className="name-label">Datum:</span><span className="name-line" /></span>
            </div>
          )}

          <CoverMeta design={design} totalPoints={totalPoints} accent={accent} />

          {design.coverImageUrl && (
            <div className="cover-image">
              <img src={design.coverImageUrl} alt="" />
            </div>
          )}
        </>,
        1
      )}

      {/* ── Empty state ── */}
      {chunks.length === 0 && !showCover && renderPage(
        <p style={{ color: "#999", marginTop: "40mm", textAlign: "center" }}>
          Lägg till frågor för att fylla provet.
        </p>,
        1
      )}

      {/* ── Question pages ── */}
      {chunks.map((chunk, ci) => {
        let localQ = qNumberOffset[ci];
        const content = chunk.map((pi, i) => {
          if (pi.kind === "cblock") {
            return <ContentBlockPrint key={i} item={pi.item} accent={accent} />;
          }
          localQ++;
          if (pi.sectionStart) globalSectionIndex++;
          return (
            <QBlockRender
              key={i}
              block={pi}
              number={localQ}
              design={design}
              accent={accent}
              sectionIndex={globalSectionIndex}
              showAnswers={showAnswers}
            />
          );
        });
        return (
          <React.Fragment key={ci}>
            {renderPage(content, ci + startPageNumber)}
          </React.Fragment>
        );
      })}
    </div>
  );
}
