/**
 * WorkbookBlockEditModal — modal editor for workbook content blocks.
 * Opened by clicking a block in the workbook preview.
 * Uses RichTextEditor for main text fields and includes a "Pratbubbla"
 * (attached callout) section for every block type.
 */
import React, { useState } from "react";
import { Trash2, X, Minus } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import type {
  ContentBlockRef,
  ContentBlockType,
  AttachedCallout,
  CalloutColor,
  CalloutSide,
} from "@/lib/test-types";

const TYPE_LABELS: Record<ContentBlockType, string> = {
  intro:        "Inledning",
  instruction:  "Instruktion",
  source:       "Källtext",
  vocab:        "Begreppsruta",
  quote:        "Citat",
  callout:      "Pratbubbla",
  image:        "Bild",
  checklist:    "Checklista",
  marginNote:   "Marginalnot",
  pageBreak:    "Sidbrytning",
  divider:      "Avdelare",
  heading:      "Rubrik",
  exercise:     "Övning",
  wb_open:      "Öppen fråga",
  wb_choice:    "Flervalsfråga",
  wb_truefalse: "Sant/Falskt",
  wb_matching:  "Para ihop",
};

const CALLOUT_COLORS: { key: CalloutColor; bg: string; label: string }[] = [
  { key: "yellow", bg: "#FEF3C7", label: "Gul" },
  { key: "blue",   bg: "#DBEAFE", label: "Blå" },
  { key: "green",  bg: "#D1FAE5", label: "Grön" },
  { key: "pink",   bg: "#FCE7F3", label: "Rosa" },
  { key: "purple", bg: "#EDE9FE", label: "Lila" },
];

const CALLOUT_SIDES: { key: CalloutSide; label: string }[] = [
  { key: "left",   label: "Vänster" },
  { key: "right",  label: "Höger" },
  { key: "top",    label: "Topp" },
  { key: "bottom", label: "Botten" },
];

const psInput: React.CSSProperties = {
  border: "1px solid var(--ps-rule-2)",
  borderRadius: 6,
  padding: "6px 10px",
  fontFamily: "var(--ps-ui)",
  fontSize: 13,
  color: "var(--ps-ink)",
  background: "var(--ps-paper)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

interface Props {
  block: ContentBlockRef;
  onEdit: (patch: Partial<ContentBlockRef>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function WorkbookBlockEditModal({ block, onEdit, onDelete, onClose }: Props) {
  const c = block.content as Record<string, unknown>;
  const patchContent = (fields: Record<string, unknown>) => {
    onEdit({ content: { ...c, ...fields } as ContentBlockRef["content"] });
  };
  const patchCallout = (next: AttachedCallout | null) => {
    onEdit({ callout: next });
  };

  const [calloutOpen, setCalloutOpen] = useState(!!block.callout);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(20,17,13,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          background: "white",
          borderRadius: 12,
          boxShadow: "0 24px 60px -12px rgba(0,0,0,0.3)",
          border: "1px solid var(--ps-rule)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderBottom: "1px solid var(--ps-rule)",
        }}>
          <Minus size={14} style={{ color: "var(--ps-ink-3)" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ps-ink-2)", flex: 1 }}>
            {TYPE_LABELS[block.block_type] ?? block.block_type}
          </span>
          <button onClick={() => { onDelete(); onClose(); }} title="Ta bort block"
            style={iconBtn}>
            <Trash2 size={15} />
          </button>
          <button onClick={onClose} title="Stäng" style={iconBtn}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Type-specific fields */}
          <TypeFields block={block} patchContent={patchContent} />

          {/* Pratbubbla (callout) collapser */}
          <div style={{ border: "1px solid var(--ps-rule)", borderRadius: 10, overflow: "hidden", background: "white" }}>
            <button
              onClick={() => setCalloutOpen(o => !o)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "10px 14px",
                background: "transparent", border: "none", cursor: "pointer",
                fontFamily: "var(--ps-ui)", fontSize: 13, fontWeight: 500,
                color: "var(--ps-ink)",
              }}
            >
              <span>💬 Pratbubbla {block.callout ? "(aktiv)" : "(valfri)"}</span>
              <span style={{ fontSize: 12, transform: calloutOpen ? "none" : "rotate(-90deg)", transition: "transform .15s" }}>▾</span>
            </button>
            {calloutOpen && (
              <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ps-ink-2)" }}>
                  <input
                    type="checkbox"
                    checked={!!block.callout}
                    onChange={e => {
                      if (e.target.checked) {
                        patchCallout({ text: "Skriv din kommentar…", color: "yellow", side: "right" });
                      } else {
                        patchCallout(null);
                      }
                    }}
                  />
                  Visa pratbubbla vid blocket
                </label>

                {block.callout && (
                  <>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={labelStyle}>Text</span>
                      <textarea
                        value={block.callout.text}
                        onChange={e => patchCallout({ ...block.callout!, text: e.target.value })}
                        rows={2}
                        style={{ ...psInput, resize: "vertical" }}
                      />
                    </label>

                    <div>
                      <div style={labelStyle}>Färg</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {CALLOUT_COLORS.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => patchCallout({ ...block.callout!, color: opt.key })}
                            title={opt.label}
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: block.callout?.color === opt.key
                                ? "2px solid var(--ps-accent, #1E5F5C)"
                                : "1px solid var(--ps-rule-2)",
                              background: opt.bg,
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={labelStyle}>Sida</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {CALLOUT_SIDES.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => patchCallout({ ...block.callout!, side: opt.key })}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 6,
                              border: block.callout?.side === opt.key
                                ? "2px solid var(--ps-accent, #1E5F5C)"
                                : "1px solid var(--ps-rule-2)",
                              background: block.callout?.side === opt.key
                                ? "var(--ps-bg-soft)"
                                : "transparent",
                              cursor: "pointer",
                              fontSize: 12.5,
                              fontFamily: "var(--ps-ui)",
                              color: "var(--ps-ink-2)",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ps-ink-3)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 5,
  display: "block",
};

const iconBtn: React.CSSProperties = {
  width: 32, height: 32,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: "none", borderRadius: 6,
  cursor: "pointer", color: "var(--ps-ink-3)",
};

/* ── TypeFields — per-block-type content fields ───────────────────────────── */

function TypeFields({
  block,
  patchContent,
}: {
  block: ContentBlockRef;
  patchContent: (fields: Record<string, unknown>) => void;
}) {
  const c = block.content as Record<string, unknown>;

  const RichField = ({ label, valueKey, placeholder }: { label: string; valueKey: string; placeholder?: string }) => (
    <div>
      <div style={labelStyle}>{label}</div>
      <RichTextEditor
        value={String(c[valueKey] ?? "")}
        onChange={html => patchContent({ [valueKey]: html })}
        placeholder={placeholder}
        minHeight={110}
      />
    </div>
  );

  const TextField = ({ label, valueKey, type = "text" }: { label: string; valueKey: string; type?: "text" | "number" }) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        value={type === "number" ? Number(c[valueKey] ?? 0) : String(c[valueKey] ?? "")}
        onChange={e => patchContent({
          [valueKey]: type === "number" ? (parseInt(e.target.value) || 0) : e.target.value,
        })}
        style={psInput}
      />
    </label>
  );

  switch (block.block_type) {
    case "heading":
      return (
        <>
          <TextField label="Rubrik"    valueKey="text" />
          <TextField label="Undertitel" valueKey="subtitle" />
          <TextField label="Kapitel"   valueKey="chapter" />
        </>
      );
    case "intro":
    case "instruction":
    case "marginNote":
      return <RichField label="Text" valueKey="text" placeholder="Skriv text här…" />;
    case "source":
      return (
        <>
          <TextField label="Källtitel" valueKey="title" />
          <RichField label="Källtext"  valueKey="text" />
          <TextField label="Attribution" valueKey="attribution" />
          <RichField label="Lärarnot (valfri)" valueKey="note" />
        </>
      );
    case "vocab":
      return (
        <>
          <TextField label="Begrepp"   valueKey="word" />
          <RichField label="Definition" valueKey="definition" />
        </>
      );
    case "exercise":
      return (
        <>
          <RichField label="Övningstext" valueKey="text" />
          <TextField label="Skrivlinjer" valueKey="lines" type="number" />
          <RichField label="Marginalnot (lärare)" valueKey="marginNote" />
        </>
      );
    case "quote":
      return (
        <>
          <RichField label="Citat" valueKey="text" />
          <TextField label="Attribution" valueKey="attribution" />
        </>
      );
    case "callout":
      return (
        <>
          <RichField label="Text" valueKey="text" />
          <TextField label="Färg (CSS)" valueKey="color" />
        </>
      );
    case "image":
      return (
        <>
          <TextField label="Bild-URL" valueKey="imageUrl" />
          <TextField label="Bildtext" valueKey="caption" />
          <TextField label="Alt-text" valueKey="altText" />
        </>
      );
    case "checklist": {
      const items = (c.items as string[]) ?? [];
      return (
        <>
          <TextField label="Titel" valueKey="title" />
          <div>
            <div style={labelStyle}>Punkter</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    value={item}
                    onChange={e => {
                      const next = [...items];
                      next[i] = e.target.value;
                      patchContent({ items: next });
                    }}
                    style={psInput}
                  />
                  <button
                    onClick={() => patchContent({ items: items.filter((_, j) => j !== i) })}
                    style={{ padding: "0 8px", border: "1px solid var(--ps-rule-2)", borderRadius: 6, background: "none", cursor: "pointer", color: "#dc2626" }}
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => patchContent({ items: [...items, ""] })}
                style={{ marginTop: 4, padding: "5px 10px", borderRadius: 6, border: "1px dashed var(--ps-rule-2)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--ps-ink-3)" }}
              >+ Lägg till punkt</button>
            </div>
          </div>
        </>
      );
    }
    case "divider":
    case "pageBreak":
      return (
        <div style={{ fontSize: 12.5, color: "var(--ps-ink-3)" }}>
          Detta block har ingen konfiguration.
        </div>
      );

    case "wb_open":
      return (
        <>
          <RichField label="Frågetext" valueKey="text" placeholder="Skriv din fråga…" />
          <TextField label="Antal skrivlinjer" valueKey="lines" type="number" />
        </>
      );

    case "wb_choice": {
      const opts = (c.options as string[]) ?? [];
      return (
        <>
          <RichField label="Frågetext" valueKey="text" placeholder="Skriv din fråga…" />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ps-ink-2)" }}>
            <input
              type="checkbox"
              checked={!!c.multi}
              onChange={e => patchContent({ multi: e.target.checked })}
            />
            Flera rätta svar möjliga
          </label>
          <div>
            <div style={labelStyle}>Svarsalternativ</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {opts.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--ps-ink-3)", width: 16, textAlign: "center", fontWeight: 600 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt}
                    onChange={e => {
                      const next = [...opts]; next[i] = e.target.value;
                      patchContent({ options: next });
                    }}
                    style={psInput}
                  />
                  <button
                    onClick={() => patchContent({ options: opts.filter((_, j) => j !== i) })}
                    style={{ padding: "0 8px", border: "1px solid var(--ps-rule-2)", borderRadius: 6, background: "none", cursor: "pointer", color: "#dc2626" }}
                  >×</button>
                </div>
              ))}
              {opts.length < 6 && (
                <button
                  onClick={() => patchContent({ options: [...opts, `Alternativ ${String.fromCharCode(65 + opts.length)}`] })}
                  style={{ marginTop: 4, padding: "5px 10px", borderRadius: 6, border: "1px dashed var(--ps-rule-2)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--ps-ink-3)" }}
                >+ Lägg till alternativ</button>
              )}
            </div>
          </div>
        </>
      );
    }

    case "wb_truefalse":
      return (
        <RichField label="Påstående" valueKey="text" placeholder="Skriv ett påstående som eleven ska bedöma…" />
      );

    case "wb_matching": {
      const pairs = (c.pairs as { left: string; right: string }[]) ?? [];
      return (
        <>
          <RichField label="Instruktion (valfri)" valueKey="text" placeholder="Para ihop…" />
          <div>
            <div style={labelStyle}>Par att koppla ihop</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pairs.map((pair, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
                  <input
                    value={pair.left}
                    onChange={e => {
                      const next = [...pairs]; next[i] = { ...pair, left: e.target.value };
                      patchContent({ pairs: next });
                    }}
                    placeholder="Vänster"
                    style={psInput}
                  />
                  <input
                    value={pair.right}
                    onChange={e => {
                      const next = [...pairs]; next[i] = { ...pair, right: e.target.value };
                      patchContent({ pairs: next });
                    }}
                    placeholder="Höger"
                    style={psInput}
                  />
                  <button
                    onClick={() => patchContent({ pairs: pairs.filter((_, j) => j !== i) })}
                    style={{ padding: "0 8px", border: "1px solid var(--ps-rule-2)", borderRadius: 6, background: "none", cursor: "pointer", color: "#dc2626" }}
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => patchContent({ pairs: [...pairs, { left: "", right: "" }] })}
                style={{ marginTop: 4, padding: "5px 10px", borderRadius: 6, border: "1px dashed var(--ps-rule-2)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--ps-ink-3)" }}
              >+ Lägg till par</button>
            </div>
          </div>
        </>
      );
    }

    default:
      return null;
  }
}

export default WorkbookBlockEditModal;
