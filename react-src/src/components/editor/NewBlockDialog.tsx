/**
 * NewBlockDialog — dialog opened by the "+ Nytt block" button in the
 * workbook editor. Shows all block types as cards grouped by category,
 * mirroring the "Ny uppgift" dialog in the test editor.
 */
import React from "react";
import {
  X, Type, PenLine, Info, BookOpen, Flag, CheckCircle,
  Image as ImageIcon, Minus, Files, Bell, MessageCircle, Sparkles,
  AlignJustify, ToggleLeft, ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import type { ContentBlockType } from "@/lib/test-types";

type BlockEntry = { type: ContentBlockType; label: string; icon: LucideIcon; desc?: string };

const CATEGORIES: { label: string; blocks: BlockEntry[] }[] = [
  {
    label: "Innehåll",
    blocks: [
      { type: "heading",     label: "Rubrik",        icon: Type,     desc: "Kapitelrubrik" },
      { type: "intro",       label: "Inledning",     icon: PenLine,  desc: "Brödtext med dropplock" },
      { type: "instruction", label: "Instruktion",   icon: Info,     desc: "Instruktionsruta" },
      { type: "source",      label: "Källtext",      icon: BookOpen, desc: "Källa med attribution" },
      { type: "quote",       label: "Citat",         icon: Flag,     desc: "Citat med kant" },
    ],
  },
  {
    label: "Övningar",
    blocks: [
      { type: "exercise",  label: "Övning",        icon: PenLine,     desc: "Numrerad uppgift" },
      { type: "vocab",     label: "Begreppsruta",  icon: Type,        desc: "Ord + definition" },
      { type: "checklist", label: "Checklista",    icon: CheckCircle, desc: "Punkter att bocka av" },
    ],
  },
  {
    label: "Visuellt",
    blocks: [
      { type: "image",      label: "Bild",         icon: ImageIcon,    desc: "Bild med bildtext" },
      { type: "divider",    label: "Avdelare",     icon: Minus,        desc: "Horisontell linje" },
      { type: "callout",    label: "Pratbubbla",   icon: MessageCircle,desc: "Fristående callout" },
      { type: "marginNote", label: "Marginalnot",  icon: Bell,         desc: "Lärar-only not" },
    ],
  },
  {
    label: "Frågor",
    blocks: [
      { type: "wb_open",      label: "Öppen fråga",   icon: AlignJustify,   desc: "Svar med skrivlinjer" },
      { type: "wb_choice",    label: "Flerval",        icon: CheckCircle,    desc: "A/B/C/D-alternativ" },
      { type: "wb_truefalse", label: "Sant/Falskt",    icon: ToggleLeft,     desc: "Ringa in rätt svar" },
      { type: "wb_matching",  label: "Para ihop",      icon: ArrowLeftRight, desc: "Koppla ihop kolumner" },
    ],
  },
  {
    label: "Layout",
    blocks: [
      { type: "pageBreak", label: "Sidbrytning", icon: Files, desc: "Tvinga ny sida" },
    ],
  },
];

interface Props {
  onClose: () => void;
  onSelect: (type: ContentBlockType) => void;
}

export function NewBlockDialog({ onClose, onSelect }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(20,17,13,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)", maxHeight: "90vh", overflow: "auto",
          background: "white", borderRadius: 12,
          boxShadow: "0 24px 60px -12px rgba(0,0,0,0.3)",
          border: "1px solid var(--ps-rule)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderBottom: "1px solid var(--ps-rule)",
        }}>
          <Sparkles size={16} style={{ color: "var(--ps-accent, #1E5F5C)" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ps-ink)", flex: 1 }}>
            Nytt block
          </span>
          <button
            onClick={onClose}
            title="Stäng"
            style={{
              width: 32, height: 32, display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", borderRadius: 6,
              cursor: "pointer", color: "var(--ps-ink-3)",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div style={{
                fontSize: 11, color: "var(--ps-ink-3)",
                textTransform: "uppercase", letterSpacing: "0.07em",
                marginBottom: 8,
              }}>
                {cat.label}
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 8,
              }}>
                {cat.blocks.map(b => {
                  const Icon = b.icon;
                  return (
                    <button
                      key={b.type}
                      onClick={() => { onSelect(b.type); onClose(); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px",
                        background: "var(--ps-bg-soft)",
                        border: "1px solid var(--ps-rule-2)",
                        borderRadius: 8,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--ps-ui)",
                        transition: "all .12s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.borderColor = "var(--ps-accent, #1E5F5C)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "var(--ps-bg-soft)";
                        e.currentTarget.style.borderColor = "var(--ps-rule-2)";
                      }}
                    >
                      <Icon size={18} style={{ color: "var(--ps-accent, #1E5F5C)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ps-ink)" }}>
                          {b.label}
                        </div>
                        {b.desc && (
                          <div style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>
                            {b.desc}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NewBlockDialog;
