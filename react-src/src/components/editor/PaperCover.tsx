/**
 * PaperCover — generic cover page component
 * Matches the visual design of PrintableTest's cover page (title, subtitle,
 * name row, bottom image with fade overlays). Used by WorkbookPage and can
 * be adopted by PrintableTest later.
 */
import React from "react";

export interface PaperCoverProps {
  title: string;
  subtitle?: string;
  imageSrc?: string | null;
  /** Image height in mm (default 130) */
  imageHeightMm?: number;
  /** Top fade percentage (default 22) */
  fadeY?: number;
  /** Side fade percentage (default 0) */
  fadeX?: number;
  /** Image opacity (default 0.95) */
  opacity?: number;
  paperBg?: string;
  accent?: string;
  headingFont?: string;
  bodyFont?: string;
  showNameRow?: boolean;
  showDate?: boolean;
  showTeacher?: boolean;
  showClass?: boolean;
  /** A4 page dimensions in CSS pixels (793×1122 at 96 dpi). */
  pageWidth?: number;
  pageHeight?: number;
  /** Margins in CSS pixels around the content area. */
  margin?: number;
}

export function PaperCover({
  title,
  subtitle,
  imageSrc,
  imageHeightMm = 130,
  fadeY = 22,
  fadeX = 0,
  opacity = 0.95,
  paperBg = "#FFFFFF",
  accent = "#1E5F5C",
  headingFont = "'Newsreader', Georgia, serif",
  bodyFont = "var(--ps-ui, system-ui)",
  showNameRow = true,
  showDate = true,
  showTeacher = false,
  showClass = true,
  pageWidth = 794,
  pageHeight = 1100,
  margin = 64,
}: PaperCoverProps) {
  return (
    <div
      className="paper-page paper-cover"
      style={{
        width: pageWidth,
        minHeight: pageHeight,
        position: "relative",
        background: paperBg,
        overflow: "hidden",
        padding: margin,
        boxSizing: "border-box",
        fontFamily: bodyFont,
        color: "#1A1814",
      }}
    >
      {/* Content layer */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Title block */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <h1
            style={{
              fontFamily: headingFont,
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              margin: 0,
              color: "#1A1814",
              lineHeight: 1.1,
            }}
          >
            {title || "Namnlös titel"}
          </h1>
          {subtitle && (
            <div
              style={{
                marginTop: 12,
                fontSize: 16,
                color: "#6B6459",
                fontFamily: bodyFont,
                fontStyle: "italic",
              }}
            >
              {subtitle}
            </div>
          )}
          <div style={{ marginTop: 18, height: 2, width: 60, background: accent, margin: "18px auto 0" }} />
        </div>

        {/* Name row */}
        {showNameRow && (
          <div
            className="name-row"
            style={{
              marginTop: 40,
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              justifyContent: "center",
              fontSize: 13,
              color: "#3A342B",
            }}
          >
            <span style={nameCellStyle}>
              <span style={nameLabelStyle}>Namn:</span>
              <span style={nameLineStyle} />
            </span>
            {showClass && (
              <span style={nameCellStyle}>
                <span style={nameLabelStyle}>Klass:</span>
                <span style={nameLineStyle} />
              </span>
            )}
            {showDate && (
              <span style={nameCellStyle}>
                <span style={nameLabelStyle}>Datum:</span>
                <span style={nameLineStyle} />
              </span>
            )}
            {showTeacher && (
              <span style={nameCellStyle}>
                <span style={nameLabelStyle}>Lärare:</span>
                <span style={nameLineStyle} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom-anchored image overlay (matches PrintableTest cover image) */}
      {imageSrc && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${imageHeightMm}mm`,
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <img
            src={imageSrc}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              opacity,
              display: "block",
            }}
          />
          {/* Top fade */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(to bottom, ${paperBg} 0%, transparent ${fadeY}%)`,
              pointerEvents: "none",
            }}
          />
          {/* Side fades */}
          {fadeX > 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to right, ${paperBg} 0%, transparent ${fadeX}%, transparent ${100 - fadeX}%, ${paperBg} 100%)`,
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

const nameCellStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 8,
  minWidth: 140,
};

const nameLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#6B6459",
};

const nameLineStyle: React.CSSProperties = {
  display: "inline-block",
  flex: 1,
  height: 1,
  borderBottom: "1px solid #1A1814",
  minWidth: 80,
};

export default PaperCover;
