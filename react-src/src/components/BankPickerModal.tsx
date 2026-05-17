import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Question } from "@/lib/test-types";
import { QUESTION_TYPE_LABELS } from "@/lib/test-types";

/* ── Type colour mapping ──────────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, string> = {
  multiple_choice: "#16a34a",
  short_answer:    "#16a34a",
  true_false:      "#16a34a",
  cloze:           "#16a34a",
  matching:        "#16a34a",
  ranking:         "#16a34a",
  numeric:         "#16a34a",
  definition:      "#16a34a",
  open:            "#2563eb",
  essay:           "#2563eb",
  drawing:         "#2563eb",
  source_critique: "#d97706",
  group:           "#d97706",
  formula:         "#d97706",
  image:           "#d97706",
  table:           "#d97706",
  diagram_label:   "#d97706",
  two_column:      "#d97706",
  info:            "#6b7280",
};

/* ── Props ────────────────────────────────────────────────────────────────── */
export interface BankPickerModalProps {
  bank: Question[];
  inDocument: Set<string>;
  onAdd: (questionId: string) => void;
  onRemove: (questionId: string) => void;
  onClose: () => void;
  /** If set, bank auto-filters to this subject and hides the subject dropdown */
  defaultSubject?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export function BankPickerModal({ bank, inDocument, onAdd, onRemove, onClose, defaultSubject }: BankPickerModalProps) {
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [subjectFilter, setSubjectFilter] = useState(defaultSubject ?? "");

  /* Collect unique subjects for the filter dropdown */
  const subjects = useMemo(() => {
    const s = new Set<string>();
    for (const q of bank) {
      if (q.subject) s.add(q.subject);
    }
    return [...s].sort();
  }, [bank]);

  /* Collect unique types */
  const types = useMemo(() => {
    const t = new Set<string>();
    for (const q of bank) t.add(q.type);
    return [...t].sort();
  }, [bank]);

  /* Filtered list */
  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return bank.filter(q => {
      if (typeFilter && q.type !== typeFilter) return false;
      if (subjectFilter && q.subject !== subjectFilter) return false;
      if (!needle) return true;
      const text  = stripHtml((q.content as { text?: string })?.text ?? "").toLowerCase();
      const label = (QUESTION_TYPE_LABELS[q.type] ?? "").toLowerCase();
      const subj  = (q.subject ?? "").toLowerCase();
      const tags  = (q.tags ?? []).join(" ").toLowerCase();
      return text.includes(needle) || label.includes(needle) || subj.includes(needle) || tags.includes(needle);
    });
  }, [bank, search, typeFilter, subjectFilter]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "85vh",
          borderRadius: 12,
          background: "var(--ps-paper, #fff)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--ps-rule, #e5e1db)",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--ps-ui, system-ui)", fontWeight: 600, fontSize: 15, color: "var(--ps-ink, #14110d)" }}>
            Frågebanken
          </span>
          <span style={{
            fontSize: 11, fontWeight: 500,
            background: "var(--ps-bg-soft, #f5f3ef)",
            color: "var(--ps-ink-3, #7a7468)",
            borderRadius: 999, padding: "2px 8px",
            fontFamily: "var(--ps-ui, system-ui)",
          }}>
            {bank.length} frågor
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-3, #7a7468)", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex", gap: 8, padding: "10px 16px",
          borderBottom: "1px solid var(--ps-rule, #e5e1db)",
          flexShrink: 0,
        }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök frågor…"
            style={{
              flex: 1, height: 32, padding: "0 10px",
              borderRadius: 7, border: "1px solid var(--ps-rule-2, #d6d0c8)",
              background: "var(--ps-bg-soft, #f5f3ef)",
              fontFamily: "var(--ps-ui, system-ui)", fontSize: 13,
              color: "var(--ps-ink, #14110d)", outline: "none",
            }}
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              width: 160, height: 32, padding: "0 8px",
              borderRadius: 7, border: "1px solid var(--ps-rule-2, #d6d0c8)",
              background: "var(--ps-bg-soft, #f5f3ef)",
              fontFamily: "var(--ps-ui, system-ui)", fontSize: 12.5,
              color: "var(--ps-ink, #14110d)", cursor: "pointer",
            }}
          >
            <option value="">Alla typer</option>
            {types.map(t => (
              <option key={t} value={t}>{QUESTION_TYPE_LABELS[t as keyof typeof QUESTION_TYPE_LABELS] ?? t}</option>
            ))}
          </select>
          {defaultSubject ? (
            <div style={{
              height: 32, padding: "0 12px",
              borderRadius: 7, border: "1px solid var(--ps-rule-2, #d6d0c8)",
              background: "var(--ps-bg-soft, #f5f3ef)",
              fontFamily: "var(--ps-ui, system-ui)", fontSize: 12.5,
              color: "var(--ps-ink-2, #3d3930)",
              display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 10, color: "var(--ps-ink-4)" }}>Ämne:</span>
              <strong>{defaultSubject}</strong>
            </div>
          ) : (
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              style={{
                width: 160, height: 32, padding: "0 8px",
                borderRadius: 7, border: "1px solid var(--ps-rule-2, #d6d0c8)",
                background: "var(--ps-bg-soft, #f5f3ef)",
                fontFamily: "var(--ps-ui, system-ui)", fontSize: 12.5,
                color: "var(--ps-ink, #14110d)", cursor: "pointer",
              }}
            >
              <option value="">Alla ämnen</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        {/* Question list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 12px" }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: "40px 0", textAlign: "center",
              fontFamily: "var(--ps-ui, system-ui)", fontSize: 13,
              color: "var(--ps-ink-4, #b0a99e)",
            }}>
              Inga frågor i banken
            </div>
          ) : (
            filtered.map(q => {
              const isIn  = inDocument.has(q.id);
              const color = TYPE_COLORS[q.type] ?? "#6b7280";
              const label = QUESTION_TYPE_LABELS[q.type] ?? q.type;
              const text  = stripHtml((q.content as { text?: string })?.text ?? "").slice(0, 120);

              return (
                <div
                  key={q.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 8,
                    border: "1px solid var(--ps-rule-2, #d6d0c8)",
                    background: isIn ? "#f0fdf4" : "var(--ps-paper, #fff)",
                    marginBottom: 6,
                  }}
                >
                  {/* Type chip */}
                  <span style={{
                    flexShrink: 0,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    background: color + "18",
                    color: color,
                    borderRadius: 5,
                    padding: "2px 6px",
                    fontFamily: "var(--ps-ui, system-ui)",
                  }}>
                    {label}
                  </span>

                  {/* Text + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--ps-ui, system-ui)", fontSize: 12.5,
                      color: "var(--ps-ink, #14110d)", lineHeight: 1.4,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    } as React.CSSProperties}>
                      {text || "(Tom fråga)"}
                    </div>
                    {(q.subject || (q.tags && q.tags.length > 0)) && (
                      <div style={{ marginTop: 3, display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {q.subject && (
                          <span style={{ fontSize: 10.5, color: "var(--ps-ink-3, #7a7468)", fontFamily: "var(--ps-ui, system-ui)" }}>
                            {q.subject}
                          </span>
                        )}
                        {(q.tags ?? []).map(tag => (
                          <span key={tag} style={{
                            fontSize: 10, color: "var(--ps-ink-4, #b0a99e)",
                            background: "var(--ps-bg-soft, #f5f3ef)",
                            borderRadius: 4, padding: "1px 5px",
                            fontFamily: "var(--ps-ui, system-ui)",
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  {isIn ? (
                    <button
                      onClick={() => onRemove(q.id)}
                      style={{
                        flexShrink: 0, height: 30, padding: "0 12px",
                        borderRadius: 7, border: "1.5px solid #16a34a",
                        background: "#f0fdf4", color: "#16a34a",
                        fontFamily: "var(--ps-ui, system-ui)", fontSize: 12, fontWeight: 500,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✓ I provet
                    </button>
                  ) : (
                    <button
                      onClick={() => onAdd(q.id)}
                      style={{
                        flexShrink: 0, height: 30, padding: "0 12px",
                        borderRadius: 7, border: "1px solid var(--ps-rule-2, #d6d0c8)",
                        background: "var(--ps-paper, #fff)", color: "var(--ps-ink-2, #3d3930)",
                        fontFamily: "var(--ps-ui, system-ui)", fontSize: 12, fontWeight: 500,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      + Lägg till
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
