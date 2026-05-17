/**
 * Editable — minimal contentEditable wrapper used by cover templates.
 * Stable caret: only bubbles changes on blur, doesn't re-set content on every keystroke.
 *
 * Props:
 *   placeholder  — grayed text shown (via CSS ::before) when the field is empty.
 *                  Also sets a min-width so the field is always clickable.
 *   richText     — when true, persists innerHTML instead of textContent and
 *                  fires onSelectionChange so a toolbar can appear.
 */
import React, { useRef, useEffect, useCallback } from "react";

interface Props {
  tag?: keyof JSX.IntrinsicElements;
  value: string;
  onChange?: (next: string) => void;
  style?: React.CSSProperties;
  /** Grayed hint shown when field is empty (CSS ::before). Also ensures min-width. */
  placeholder?: string;
  className?: string;
  /** If true, allows multi-line via <br>; otherwise Enter blurs. */
  multiline?: boolean;
  /**
   * Rich-text mode: persists innerHTML and fires selection callbacks.
   * value/onChange transport HTML strings instead of plain text.
   */
  richText?: boolean;
  /** Called when a text selection is created/cleared inside this element. */
  onSelectionChange?: (active: boolean, rect: DOMRect | null) => void;
}

export function Editable({
  tag = "span",
  value,
  onChange,
  style,
  placeholder,
  className,
  multiline = false,
  richText = false,
  onSelectionChange,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  // Track last-known value to avoid overwriting user edits
  const lastValueRef = useRef(value);

  // Sync DOM when value changes from outside
  useEffect(() => {
    if (!ref.current) return;
    const current = richText
      ? ref.current.innerHTML
      : ref.current.textContent ?? "";
    if (current !== value && value !== lastValueRef.current) {
      if (richText) {
        ref.current.innerHTML = value;
      } else {
        ref.current.textContent = value;
      }
    }
    lastValueRef.current = value;
  }, [value, richText]);

  const handleBlur = useCallback(() => {
    if (!ref.current || !onChange) return;
    const next = richText
      ? ref.current.innerHTML
      : ref.current.textContent ?? "";
    lastValueRef.current = next;
    if (next !== value) onChange(next);
  }, [onChange, value, richText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  }, [multiline]);

  const handleMouseUp = useCallback(() => {
    if (!onSelectionChange) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      // Only fire if selection is inside this element
      if (ref.current?.contains(range.commonAncestorContainer)) {
        onSelectionChange(true, range.getBoundingClientRect());
        return;
      }
    }
    onSelectionChange(false, null);
  }, [onSelectionChange]);

  // Min-width ensures the element is always clickable even when empty
  const minWidth = placeholder ? `${Math.max(1.5, placeholder.length * 0.55)}em` : undefined;

  return React.createElement(tag, {
    ref,
    contentEditable: !!onChange,
    suppressContentEditableWarning: true,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onMouseUp: handleMouseUp,
    spellCheck: false,
    "data-placeholder": placeholder,
    className,
    style: {
      outline: "none",
      cursor: onChange ? "text" : "default",
      display: "inline-block",
      minWidth,
      ...style,
    },
    dangerouslySetInnerHTML: { __html: value },
  });
}

export default Editable;
