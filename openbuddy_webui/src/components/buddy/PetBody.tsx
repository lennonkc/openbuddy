import type { ReactNode } from "react";

const BODY_BASE =
  "M 20 50 L 100 50 L 100 100 L 86 100 L 86 114 L 74 114 L 74 100 L 46 100 L 46 114 L 34 114 L 34 100 L 20 100 Z";
const BODY_ACT3 =
  "M 20 50 L 100 50 L 100 100 L 94 100 L 94 114 L 82 114 L 82 100 L 38 100 L 38 114 L 26 114 L 26 100 L 20 100 Z";
const BODY_ACT4 =
  "M 20 50 L 100 50 L 100 100 L 78 100 L 78 114 L 66 114 L 66 100 L 54 100 L 54 114 L 42 114 L 42 100 L 20 100 Z";

const bodies = { base: BODY_BASE, act3: BODY_ACT3, act4: BODY_ACT4 };

export function PetBody({
  bodyType = "base",
  children,
  className,
}: {
  bodyType?: "base" | "act3" | "act4";
  children?: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden="true"
    >
      {children}
      <path d={bodies[bodyType]} fill="#d77757" />
      <rect x="40" y="62" width="10" height="10" className="pet-eye-l" fill="#2a1f1a" />
      <rect x="70" y="62" width="10" height="10" className="pet-eye-r" fill="#2a1f1a" />
    </svg>
  );
}
