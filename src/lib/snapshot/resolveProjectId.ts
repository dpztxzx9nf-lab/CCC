import { getProfileByLocalSlug, getProjectProfile } from "@/lib/operations/projectProfiles";

/** Map ARCHIVIST snapshot project id → canonical profile id when possible. */
export function resolveSnapshotProjectId(
  snapshotProjectId: string,
  displayName: string,
): string {
  const suffix = snapshotProjectId.includes("--")
    ? snapshotProjectId.split("--").slice(1).join("--")
    : snapshotProjectId.replace(/^[^-]+-/, "");

  const candidates = [
    suffix,
    suffix.replace(/-io$/i, ""),
    suffix.replace(/-ai$/i, ""),
    displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  ];

  for (const c of candidates) {
    const profile = getProfileByLocalSlug(c);
    if (profile) return profile.id;
  }

  const byName = displayName.toLowerCase();
  if (byName.includes("thinkcore")) return "thinkcore";
  if (byName.includes("liahona")) return "liahona";
  if (byName === "ccc") return "ccc";
  if (byName.includes("second")) return "second-brain";

  return getProjectProfile(snapshotProjectId) ? snapshotProjectId : snapshotProjectId;
}

export function resolveSnapshotProjectName(
  snapshotProjectId: string,
  displayName: string,
): string {
  const canonical = resolveSnapshotProjectId(snapshotProjectId, displayName);
  return getProjectProfile(canonical)?.canonicalName ?? displayName;
}
