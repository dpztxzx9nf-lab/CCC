import type { SystemStatus } from "@/data/types";

const styles: Record<SystemStatus, string> = {
  nominal: "text-ccc-accent border-ccc-accent/40 bg-ccc-accent/10",
  elevated: "text-ccc-warn border-ccc-warn/40 bg-ccc-warn/10",
  degraded: "text-ccc-warn border-ccc-warn/40 bg-ccc-warn/15",
  offline: "text-ccc-danger border-ccc-danger/40 bg-ccc-danger/10",
};

export function StatusBadge({ status }: { status: SystemStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}
