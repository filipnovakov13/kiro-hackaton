/**
 * MessageListSkeleton Component
 *
 * Skeleton placeholder for message list while loading.
 * Matches MessageList item design.
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

export function MessageListSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        className="message-list-skeleton"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${spacing.lg}px`,
        }}
      >
        {[1, 2].map((i) => (
          <div
            key={i}
            className="skeleton-message"
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
                height: "14px",
                width: "90%",
                marginBottom: `${spacing.sm}px`,
              }}
            />
            <div
              className="skeleton-line"
              style={{
                ...skeletonStyle,
                height: "14px",
                width: "75%",
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
