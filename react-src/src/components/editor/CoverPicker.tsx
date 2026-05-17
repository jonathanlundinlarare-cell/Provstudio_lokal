/**
 * CoverPicker — gallery selector for cover templates in editor sidebar.
 * Displays each template as a scaled mini-thumbnail; clicking selects it.
 */
import React from "react";
import { COVER_TEMPLATES, type CoverDoc, type CoverTemplateId } from "./CoverTemplates";

interface Props {
  selected: CoverTemplateId;
  onSelect: (id: CoverTemplateId) => void;
  doc: CoverDoc;
  accent: string;
  /** Optional free-form instruction text shown under the gallery. */
  instructions?: string;
  onInstructionsChange?: (text: string) => void;
}

export function CoverPicker({ selected, onSelect, doc, accent, instructions, onInstructionsChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}>
        {COVER_TEMPLATES.map(t => {
          const isSelected = selected === t.id;
          const isNone = t.id === "none";

          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              aria-pressed={isSelected}
              style={{
                padding: 0,
                background: "transparent",
                cursor: "pointer",
                border: isSelected
                  ? "2px solid var(--ps-accent, #1E5F5C)"
                  : "1px solid var(--ps-rule-2, #d6d0c8)",
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
                transition: "border-color .15s",
              }}
            >
              {/* Thumbnail */}
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "794/1123",
                background: isNone ? "var(--ps-bg-soft, #f5f3ef)" : "#fff",
                overflow: "hidden",
              }}>
                {isNone ? (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--ps-ui)", fontSize: 11, color: "var(--ps-ink-4, #9A9286)",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>
                    Ingen sida
                  </div>
                ) : t.Component && (
                  <div style={{
                    width: 794, height: 1123,
                    transform: "scale(0.166)",          // ~132/794
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}>
                    <t.Component doc={doc} accent={accent} />
                  </div>
                )}
              </div>

              {/* Label */}
              <div style={{
                padding: "6px 8px",
                background: isSelected ? "var(--ps-bg-soft, #f5f3ef)" : "#fff",
                borderTop: "1px solid var(--ps-rule, #ECE6D8)",
              }}>
                <div style={{
                  fontFamily: "var(--ps-ui)",
                  fontSize: 11.5,
                  fontWeight: isSelected ? 600 : 500,
                  color: "var(--ps-ink, #14110D)",
                }}>
                  {t.name}
                </div>
                <div style={{
                  fontFamily: "var(--ps-ui)",
                  fontSize: 10,
                  color: "var(--ps-ink-3, #6B6459)",
                  marginTop: 1,
                }}>
                  {t.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Instructions textarea — fri text som vissa mallar visar */}
      {onInstructionsChange && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>
            Instruktion på försättsbladet (valfritt)
          </span>
          <textarea
            value={instructions ?? ""}
            onChange={e => onInstructionsChange(e.target.value)}
            placeholder="Skriv tydligt med blå eller svart penna…"
            rows={2}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--ps-rule-2, #d6d0c8)",
              fontFamily: "var(--ps-ui)",
              fontSize: 12,
              color: "var(--ps-ink)",
              outline: "none",
              resize: "vertical",
              minHeight: 50,
            }}
          />
        </label>
      )}
    </div>
  );
}

export default CoverPicker;
