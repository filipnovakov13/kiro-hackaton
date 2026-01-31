/**
 * LoadingSkeleton Component
 *
 * Displays animated skeleton placeholders while content is loading.
 * Uses shimmer animation with design system colors.
 */

import { backgrounds } from "./colors";

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

export function LoadingSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        style={{
          display: "flex",
          height: "100vh",
          backgroundColor: backgrounds.canvas,
          color: "#E8E1D5",
        }}
      >
        {/* Left panel - Document skeleton */}
        <div
          style={{
            flex: 1,
            padding: "2rem",
            borderRight: `1px solid ${backgrounds.hover}`,
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              height: "32px",
              width: "60%",
              marginBottom: "16px",
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "16px",
              width: "40%",
              marginBottom: "24px",
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "12px",
              width: "100%",
              marginBottom: "8px",
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "12px",
              width: "95%",
              marginBottom: "8px",
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "12px",
              width: "98%",
              marginBottom: "8px",
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "12px",
              width: "90%",
              marginBottom: "16px",
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "12px",
              width: "100%",
              marginBottom: "8px",
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: "12px",
              width: "97%",
              marginBottom: "8px",
            }}
          />
        </div>

        {/* Right panel - Chat skeleton */}
        <div
          style={{
            flex: 1,
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              height: "24px",
              width: "50%",
              marginBottom: "24px",
            }}
          />

          {/* Message skeletons */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                ...skeletonStyle,
                height: "12px",
                width: "30%",
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                ...skeletonStyle,
                height: "60px",
                width: "80%",
                marginBottom: "8px",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                ...skeletonStyle,
                height: "12px",
                width: "30%",
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                ...skeletonStyle,
                height: "80px",
                width: "85%",
                marginBottom: "8px",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                ...skeletonStyle,
                height: "12px",
                width: "30%",
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                ...skeletonStyle,
                height: "50px",
                width: "75%",
                marginBottom: "8px",
              }}
            />
          </div>

          {/* Input skeleton */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ ...skeletonStyle, height: "48px", width: "100%" }} />
          </div>
        </div>
      </div>
    </>
  );
}
