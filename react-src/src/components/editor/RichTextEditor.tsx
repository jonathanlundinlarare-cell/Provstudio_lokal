import { useEffect, useRef, useState } from "react";

/* ─── Toolbar button ─────────────────────────────────────────────────────── */

function ToolBtn({
  title, active, onClick, children,
}: { title: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        width: 28, height: 28, borderRadius: 5, border: "none",
        background: active ? "var(--ps-accent)20" : "transparent",
        color: active ? "var(--ps-accent)" : "var(--ps-ink-2)",
        cursor: "pointer", display: "inline-flex", alignItems: "center",
        justifyContent: "center", fontSize: 12.5, fontWeight: 600,
        fontFamily: "var(--ps-ui)",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Color picker button ────────────────────────────────────────────────── */

function ColorBtn({ title, label, onColor }: { title: string; label: string; onColor: (color: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); ref.current?.click(); }}
      style={{
        width: 28, height: 28, borderRadius: 5, border: "none",
        background: "transparent", color: "var(--ps-ink-2)",
        cursor: "pointer", display: "inline-flex", alignItems: "center",
        justifyContent: "center", fontSize: 12, fontWeight: 700,
        fontFamily: "var(--ps-ui)", position: "relative",
      }}
    >
      {label}
      <input
        ref={ref}
        type="color"
        defaultValue="#e53e3e"
        onChange={e => onColor(e.target.value)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
    </button>
  );
}

/* ─── Divider ────────────────────────────────────────────────────────────── */

function Sep() {
  return <span style={{ width: 1, height: 18, background: "var(--ps-rule)", display: "inline-block", margin: "0 2px" }} />;
}

/* ─── Main component ─────────────────────────────────────────────────────── */

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder = "Skriv din frågetext här …", minHeight = 90 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, strikeThrough: false });
  const skipNextSync = useRef(false);

  /* Sync external value into editor (only on initial mount or external change) */
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (skipNextSync.current) { skipNextSync.current = false; return; }
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    updateActive();
    emitChange();
  };

  const emitChange = () => {
    skipNextSync.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const updateActive = () => {
    setActiveFormats({
      bold:          document.queryCommandState("bold"),
      italic:        document.queryCommandState("italic"),
      underline:     document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
    });
  };

  return (
    <div style={{
      border: "1px solid var(--ps-rule-2)",
      borderRadius: 8,
      background: "var(--ps-paper)",
      overflow: "hidden",
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1,
        padding: "4px 6px",
        borderBottom: "1px solid var(--ps-rule-2)",
        background: "var(--ps-bg-soft)",
      }}>
        <ToolBtn title="Fet (Ctrl+B)"        active={activeFormats.bold}          onClick={() => exec("bold")}>          <b>B</b>    </ToolBtn>
        <ToolBtn title="Kursiv (Ctrl+I)"     active={activeFormats.italic}        onClick={() => exec("italic")}>        <i>I</i>    </ToolBtn>
        <ToolBtn title="Understruken (Ctrl+U)" active={activeFormats.underline}   onClick={() => exec("underline")}>     <u>U</u>    </ToolBtn>
        <ToolBtn title="Genomstruken"        active={activeFormats.strikeThrough} onClick={() => exec("strikeThrough")}> <s>S</s>    </ToolBtn>

        <Sep />

        <ToolBtn title="Upphöjt" onClick={() => exec("superscript")}>
          <span style={{ fontSize: 10, position: "relative", top: -2 }}>x²</span>
        </ToolBtn>
        <ToolBtn title="Nedsänkt" onClick={() => exec("subscript")}>
          <span style={{ fontSize: 10, position: "relative", top: 2 }}>x₂</span>
        </ToolBtn>

        <Sep />

        <ColorBtn title="Textfärg" label="A" onColor={c => exec("foreColor", c)} />
        <ColorBtn title="Markeringsfärg" label="🖍" onColor={c => exec("hiliteColor", c)} />

        <Sep />

        <ToolBtn title="Vänsterjustera"  onClick={() => exec("justifyLeft")}>  ≡ </ToolBtn>
        <ToolBtn title="Centrera"        onClick={() => exec("justifyCenter")}> ≡ </ToolBtn>
        <ToolBtn title="Högerjustera"    onClick={() => exec("justifyRight")}>  ≡ </ToolBtn>

        <Sep />

        <ToolBtn title="Punktlista"    onClick={() => exec("insertUnorderedList")}> • </ToolBtn>
        <ToolBtn title="Nummerlista"   onClick={() => exec("insertOrderedList")}>   1. </ToolBtn>

        <Sep />

        <ToolBtn title="Ångra (Ctrl+Z)"  onClick={() => exec("undo")}>  ↩ </ToolBtn>
        <ToolBtn title="Gör om (Ctrl+Y)" onClick={() => exec("redo")}>  ↪ </ToolBtn>
      </div>

      {/* ── Editor area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onKeyUp={updateActive}
        onMouseUp={updateActive}
        onSelect={updateActive}
        style={{
          minHeight,
          padding: "10px 12px",
          outline: "none",
          fontSize: 13.5,
          lineHeight: 1.65,
          color: "var(--ps-ink)",
          fontFamily: "var(--ps-ui)",
        }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--ps-ink-4);
          pointer-events: none;
        }
        [contenteditable] b, [contenteditable] strong { font-weight: 700; }
        [contenteditable] i, [contenteditable] em     { font-style: italic; }
        [contenteditable] u                           { text-decoration: underline; }
        [contenteditable] s                           { text-decoration: line-through; }
        [contenteditable] ul { list-style: disc;    padding-left: 20px; margin: 4px 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 20px; margin: 4px 0; }
      `}</style>
    </div>
  );
}
