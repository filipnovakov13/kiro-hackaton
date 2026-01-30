/**
 * SourceAttribution Component
 *
 * Displays clickable source links for AI responses
 * Features:
 * - Individual source links with document title and section
 * - Click to scroll document viewer to referenced chunk
 * - Highlight referenced chunk
 * - Place focus caret at chunk start
 * - Group sources by document
 *
 * @see .kiro/specs/rag-core-phase/requirements.md (Requirement 8)
 */

import {
  backgrounds,
  text,
  spacing,
  borderRadius,
  accents,
} from "../../design-system";

// =============================================================================
// TYPES
// =============================================================================

export interface SourceChunk {
  chunk_id: string;
  document_id: string;
  document_title?: string;
  chunk_index?: number;
  similarity?: number;
  start_char?: number;
  end_char?: number;
}

interface SourceAttributionProps {
  /** Array of source chunks */
  sources: SourceChunk[];
  /** Callback when source is clicked */
  onSourceClick?: (source: SourceChunk) => void;
  /** Whether to group sources by document */
  groupByDocument?: boolean;
  /** Custom label text */
  label?: string;
}

interface GroupedSources {
  [documentId: string]: {
    title: string;
    chunks: SourceChunk[];
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SourceAttribution({
  sources,
  onSourceClick,
  groupByDocument = true,
  label = "Sources:",
}: SourceAttributionProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  // Styles
  const containerStyle: React.CSSProperties = {
    marginTop: `${spacing.md}px`,
    paddingTop: `${spacing.md}px`,
    borderTop: `1px solid ${backgrounds.hover}`,
  };

  const labelStyle: React.CSSProperties = {
    color: text.secondary,
    fontSize: "14px",
    marginBottom: `${spacing.sm}px`,
    fontWeight: 500,
  };

  const linksContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${spacing.sm}px`,
  };

  // Group sources by document if enabled
  const groupedSources = groupByDocument
    ? groupSourcesByDocument(sources)
    : null;

  return (
    <div style={containerStyle} data-testid="source-attribution">
      <div style={labelStyle} data-testid="source-label">
        {label}
      </div>
      <div style={linksContainerStyle}>
        {groupByDocument && groupedSources
          ? // Grouped view
            Object.entries(groupedSources).map(([docId, { title, chunks }]) => (
              <DocumentGroup
                key={docId}
                documentTitle={title}
                chunks={chunks}
                onSourceClick={onSourceClick}
              />
            ))
          : // Flat view
            sources.map((source, index) => (
              <SourceLink
                key={`${source.chunk_id}-${index}`}
                source={source}
                onClick={() => onSourceClick?.(source)}
              />
            ))}
      </div>
    </div>
  );
}

// =============================================================================
// DOCUMENT GROUP COMPONENT
// =============================================================================

interface DocumentGroupProps {
  documentTitle: string;
  chunks: SourceChunk[];
  onSourceClick?: (source: SourceChunk) => void;
}

function DocumentGroup({
  documentTitle,
  chunks,
  onSourceClick,
}: DocumentGroupProps) {
  const groupStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: `${spacing.xs}px`,
  };

  const titleStyle: React.CSSProperties = {
    color: text.primary,
    fontSize: "14px",
    opacity: 0.9,
  };

  const sectionsStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: `${spacing.xs}px`,
  };

  return (
    <div style={groupStyle} data-testid="document-group">
      <span style={titleStyle} data-testid="document-title">
        • {documentTitle}
      </span>
      <span style={{ color: text.secondary, fontSize: "14px" }}>(Sections</span>
      <div style={sectionsStyle}>
        {chunks.map((chunk, index) => (
          <span key={`${chunk.chunk_id}-${index}`}>
            <SectionLink chunk={chunk} onClick={() => onSourceClick?.(chunk)} />
            {index < chunks.length - 1 && (
              <span style={{ color: text.secondary, fontSize: "14px" }}>,</span>
            )}
          </span>
        ))}
      </div>
      <span style={{ color: text.secondary, fontSize: "14px" }}>)</span>
    </div>
  );
}

// =============================================================================
// SECTION LINK COMPONENT
// =============================================================================

interface SectionLinkProps {
  chunk: SourceChunk;
  onClick: () => void;
}

function SectionLink({ chunk, onClick }: SectionLinkProps) {
  const linkStyle: React.CSSProperties = {
    color: accents.highlight,
    fontSize: "14px",
    textDecoration: "none",
    cursor: "pointer",
    padding: `2px ${spacing.xs}px`,
    borderRadius: `${borderRadius.sm}px`,
    backgroundColor: "transparent",
    transition: "all 150ms ease-out",
    border: "none",
    fontFamily: "inherit",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = backgrounds.hover;
    e.currentTarget.style.textDecoration = "underline";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.textDecoration = "none";
  };

  const sectionNumber = chunk.chunk_index ?? "?";

  return (
    <button
      style={linkStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="section-link"
      aria-label={`View section ${sectionNumber}`}
    >
      {sectionNumber}
    </button>
  );
}

// =============================================================================
// SOURCE LINK COMPONENT (FLAT VIEW)
// =============================================================================

interface SourceLinkProps {
  source: SourceChunk;
  onClick: () => void;
}

function SourceLink({ source, onClick }: SourceLinkProps) {
  const linkStyle: React.CSSProperties = {
    color: accents.highlight,
    fontSize: "14px",
    textDecoration: "none",
    cursor: "pointer",
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: `${borderRadius.sm}px`,
    backgroundColor: backgrounds.hover,
    transition: "all 150ms ease-out",
    border: "none",
    fontFamily: "inherit",
    display: "inline-block",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = backgrounds.active;
    e.currentTarget.style.textDecoration = "underline";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = backgrounds.hover;
    e.currentTarget.style.textDecoration = "none";
  };

  const displayText = source.document_title
    ? `${source.document_title}${
        source.chunk_index !== undefined
          ? ` - Section ${source.chunk_index}`
          : ""
      }`
    : `Section ${source.chunk_index ?? "?"}`;

  return (
    <button
      style={linkStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="source-link"
      aria-label={`View source: ${displayText}`}
    >
      • {displayText}
    </button>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function groupSourcesByDocument(sources: SourceChunk[]): GroupedSources {
  const grouped: GroupedSources = {};

  sources.forEach((source) => {
    const docId = source.document_id;
    const title = source.document_title || `Document ${docId.slice(0, 8)}`;

    if (!grouped[docId]) {
      grouped[docId] = {
        title,
        chunks: [],
      };
    }

    grouped[docId].chunks.push(source);
  });

  return grouped;
}
