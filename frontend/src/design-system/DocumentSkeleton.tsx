/**
 * DocumentSkeleton Component
 *
 * Skeleton placeholder for document viewer while loading.
 * Matches DocumentViewer layout with headings and paragraphs.
 */

import { backgrounds } from "./colors";
import { spacing } from "./layout";

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const skeletonStyle: React.CSSProperties = {
  background: `linear-gradient(
    90deg,
    ${backgrounds.panel} 0%,
    ${backgrounds.hover} 50%,
    ${backgrounds.panel} 100%
  )`,
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s ease-in-out infinite",
  borderRadius: "4px",
};

export function DocumentSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        className="document-skeleton"
        style={{
          padding: `${spacing["3xl"]}px`,
        }}
      >
        {/* Heading */}
        <div
          className="skeleton-heading"
          style={{
            ...skeletonStyle,
            height: "32px",
            width: "60%",
            marginBottom: `${spacing.lg}px`,
          }}
        />

        {/* Paragraph */}
        <div
          className="skeleton-paragraph"
          style={{
            marginBottom: `${spacing.lg}px`,
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "100%",
              marginBottom: `${spacing.sm}px`,
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "95%",
              marginBottom: `${spacing.sm}px`,
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "98%",
            }}
          />
        </div>

        {/* Paragraph */}
        <div
          className="skeleton-paragraph"
          style={{
            marginBottom: `${spacing.lg}px`,
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "97%",
              marginBottom: `${spacing.sm}px`,
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "100%",
              marginBottom: `${spacing.sm}px`,
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "92%",
            }}
          />
        </div>

        {/* Heading */}
        <div
          className="skeleton-heading"
          style={{
            ...skeletonStyle,
            height: "28px",
            width: "50%",
            marginBottom: `${spacing.lg}px`,
          }}
        />

        {/* Paragraph */}
        <div
          className="skeleton-paragraph"
          style={{
            marginBottom: `${spacing.lg}px`,
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "100%",
              marginBottom: `${spacing.sm}px`,
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "14px",
              width: "96%",
            }}
          />
        </div>
      </div>
    </>
  );
}
