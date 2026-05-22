/**
 * TestPrintMode — ren utskriftsvyn för test/workbook/homework.
 * Renderas när App.tsx ser ?print=docId och docType !== 'wordsearch'.
 * Ingen app-chrome, ingen overflow-constraint — full sida levereras till printToPDF.
 */
import { useEffect, useMemo, useState } from "react";
import { documents, questionBank } from "@/lib/local-db";
import { PrintableTest, type PrintableItem } from "@/components/PrintableTest";
import {
  DEFAULT_DESIGN,
  applyOverrides,
  isContentBlockRef,
  isQuestionRef,
  type DesignSettings,
  type Question,
  type QuestionOrderItem,
} from "@/lib/test-types";

// ─── Print-timing fix ─────────────────────────────────────────────────────────
// main.js calls window.print() via executeJavaScript on 'did-finish-load', which
// fires before React's useEffect has run (loading=true → renders null).
// We capture the original print function and replace it with a deferred version
// that waits until we signal ready. Only active in print-window context.
const _isPrintWindow = new URLSearchParams(window.location.search).has('print');
const _origPrint = window.print.bind(window);
let _printPending = false;
let _printReady   = false;

if (_isPrintWindow) {
  (window as Window & typeof globalThis).print = function () {
    if (_printReady) {
      _origPrint();
    } else {
      _printPending = true;
    }
  };
}

function signalPrintReady() {
  if (!_isPrintWindow) return;
  _printReady = true;
  if (_printPending) {
    _printPending = false;
    _origPrint();
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export default function TestPrintMode({ documentId, showAnswers = false }: { documentId: string; showAnswers?: boolean }) {
  const [title,   setTitle]   = useState("");
  const [design,  setDesign]  = useState<DesignSettings>(DEFAULT_DESIGN);
  const [order,   setOrder]   = useState<QuestionOrderItem[]>([]);
  const [bank,    setBank]    = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Force html+body to exactly 794px = A4 at 96 dpi.
  // Without this, Chromium maps viewport-width → A4 width (794px) and applies
  // a 0.88× scale transform that rasterises the entire page as a bitmap in the PDF.
  // Matching widths exactly = pure vector output, sharp text and borders.
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.id = 'ps-print-reset';
    styleTag.textContent = `
      /* Force all colors/backgrounds to print exactly */
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 794px !important;
        max-width: 794px !important;
        overflow: visible !important;
        background: #fff !important;
      }
      @page { size: A4 portrait; margin: 0; }
      /* Tvätta ytterwrappern — det är den som genererar beige bakgrund + gap mellan sidor */
      .printable-test {
        background: #fff !important;
        padding: 0 !important;
        gap: 0 !important;
      }
      /* En paper-page == en PDF-sida, exakt */
      .paper-page {
        margin: 0 !important;
        box-shadow: none !important;
        height: 1122px !important;
        min-height: 1122px !important;
        max-height: 1122px !important;
        overflow: hidden !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .paper-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    `;
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, []);

  useEffect(() => {
    const doc = documents.get(documentId);
    if (!doc) { setLoading(false); signalPrintReady(); return; }
    setTitle(doc.title ?? "");
    setDesign({ ...DEFAULT_DESIGN, ...(doc.design_settings ?? {}) });
    setOrder(doc.question_order ?? []);
    setBank(questionBank.list());
    setLoading(false);
    // Signal that React has rendered — flush any pending window.print() call
    // that main.js fired too early (before did-finish-load).
    signalPrintReady();
  }, [documentId]);

  const bankMap = useMemo(() => new Map(bank.map(q => [q.id, q])), [bank]);

  const printItems = useMemo<PrintableItem[]>(() => {
    let lastSection: string | undefined;
    let lastSectionId: string | undefined;
    const result: PrintableItem[] = [];
    for (const ref of order) {
      if (isContentBlockRef(ref)) {
        result.push({
          kind:       "block",
          block_id:   ref.block_id,
          block_type: ref.block_type,
          content:    ref.content as Record<string, unknown>,
        });
        continue;
      }
      if (isQuestionRef(ref)) {
        if (ref.question_id === "__section__") continue;
        const q = bankMap.get(ref.question_id);
        if (!q) continue;
        let sectionStart: string | undefined;
        if (!ref.group) {
          if (ref.sectionId && ref.sectionId !== lastSectionId) {
            const sec = (design.sections ?? []).find(s => s.id === ref.sectionId);
            sectionStart = sec?.name;
            lastSectionId = ref.sectionId;
          } else if (!ref.sectionId && ref.section_label && ref.section_label !== lastSection) {
            sectionStart = ref.section_label;
            lastSection  = ref.section_label;
          }
        }
        result.push({
          kind:         "question",
          question:     applyOverrides(q, ref),
          group:        ref.group,
          sectionStart,
        });
      }
    }
    return result;
  }, [order, bankMap, design.sections]);

  if (loading) return null;

  return (
    <PrintableTest
      title={title}
      subtitle={design.subtitle ?? ""}
      design={design}
      items={printItems}
      showAnswers={showAnswers}
      onTitleChange={() => { /* read-only in print mode */ }}
      onDesignChange={() => { /* read-only in print mode */ }}
      printMode
    />
  );
}
