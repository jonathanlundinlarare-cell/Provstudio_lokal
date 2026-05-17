/**
 * Editable — minimal contentEditable wrapper used by cover templates.
 * Stable caret: only bubbles changes on blur, doesn't re-set innerHTML on every keystroke.
 */
import React, { useRef, useEffect } from "react";

interface Props {
  tag?: keyof JSX.IntrinsicElements;
  value: string;
  onChange?: (next: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  className?: string;
  /** If true, allows multi-line via <br>; otherwise Enter blurs. */
  multiline?: boolean;
}

export function Editable({
  tag = "span",
  value,
  onChange,
  style,
  placeholder,
  className,
  multiline = false,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  // Keep DOM in sync when `value` changes from outside (e.g. external doc update)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  const handleBlur = () => {
    const next = ref.current?.textContent ?? "";
    if (next !== value) onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  return React.createElement(tag, {
    ref,
    contentEditable: !!onChange,
    suppressContentEditableWarning: true,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    spellCheck: false,
    "data-placeholder": placeholder,
    className,
    style: {
      outline: "none",
      cursor: onChange ? "text" : "default",
      ...style,
    },
    children: value || (placeholder ? "" : " "),
  });
}

export default Editable;
