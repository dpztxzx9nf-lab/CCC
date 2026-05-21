"use client";

import {
  CCC_SURFACES,
  SURFACE_LABELS,
  type CccSurface,
} from "@/lib/navigation/surfaces";
import { useSurfaceNavigation } from "@/context/SurfaceNavigationContext";

export function SurfaceIndicator() {
  const { surface, setSurface } = useSurfaceNavigation();

  return (
    <nav
      className="ccc-surface-indicator"
      aria-label="CCC surfaces"
    >
      <ol className="ccc-surface-indicator__list">
        {CCC_SURFACES.map((id, index) => (
          <li key={id} className="ccc-surface-indicator__item">
            {index > 0 ? (
              <span className="ccc-surface-indicator__sep" aria-hidden>
                ·
              </span>
            ) : null}
            <button
              type="button"
              className="ccc-surface-indicator__btn"
              data-active={surface === id ? "true" : undefined}
              aria-current={surface === id ? "page" : undefined}
              onClick={() => setSurface(id as CccSurface)}
            >
              {SURFACE_LABELS[id]}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
