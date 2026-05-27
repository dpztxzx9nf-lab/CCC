"use client";

import Link from "next/link";
import { useSurfaceNavigation } from "@/context/SurfaceNavigationContext";

interface OpsPortalBackControlProps {
  mode: "link" | "surface";
}

export function OpsPortalBackControl({ mode }: OpsPortalBackControlProps) {
  const nav = useSurfaceNavigation();

  if (mode === "surface") {
    return (
      <button
        type="button"
        className="ccc-ops-back"
        onClick={nav.goToOperations}
      >
        Back to operations
      </button>
    );
  }

  return (
    <Link href="/" className="ccc-ops-back">
      Back to operations
    </Link>
  );
}
