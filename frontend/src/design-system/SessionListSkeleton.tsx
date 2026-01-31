/**
 * SessionListSkeleton Component
 *
 * Skeleton placeholder for session list while loading.
 * Matches session list item design.
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

export function SessionListSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        className="session-list-skeleton"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${spacing.md}px`,
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-card"
            style={{
              padding: `${spacing.md}px`,
              backgroundColor: backgrounds.panel,
              borderRadius: "4px",
            }}
          >
            <div
              className="skeleton-line"
              style={{
                ...skeletonStyle,
                height: "16px",
                width: "70%",
                marginBottom: `${spacing.sm}px`,
              }}
            />
            <div
              className="skeleton-line"
              style={{
                ...skeletonStyle,
                height: "12px",
                width: "40%",
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
