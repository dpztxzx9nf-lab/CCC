import { readFileSync } from "fs";
import {
  isProjectRegistryFile,
  PROJECT_REGISTRY_SCHEMA_VERSION,
} from "@/lib/projects/registry/schema";
import { projectRegistryPath } from "@/lib/projects/registry/paths";
import type { SnapshotManifestRef } from "./snapshot-schema";

const FALLBACK_UPDATED_AT = "1970-01-01T00:00:00.000Z";

/**
 * Build manifestRef for snapshot writes from on-disk project registry.
 * Safe fallback when registry is missing or invalid (no throw).
 */
export function buildManifestRefFromRegistry(
  cwd: string = process.cwd(),
): SnapshotManifestRef {
  try {
    const raw = readFileSync(projectRegistryPath(cwd), { encoding: "utf8" });
    const parsed: unknown = JSON.parse(raw);
    if (isProjectRegistryFile(parsed)) {
      return {
        manifestSchemaVersion: parsed.schemaVersion,
        manifestUpdatedAt: parsed.updatedAt,
      };
    }
  } catch {
    /* use fallback */
  }

  return {
    manifestSchemaVersion: PROJECT_REGISTRY_SCHEMA_VERSION,
    manifestUpdatedAt: FALLBACK_UPDATED_AT,
  };
}
