import { NextResponse } from "next/server";
import type { OperationalDomainId } from "@/data/ecology";
import { invalidateProjectProfilesCache } from "@/lib/operations/projectProfiles";
import { listEnrichedRegistryProjects } from "@/lib/projects/registry/api-enrich";
import {
  archiveRegistryProject,
  deleteRegistryProject,
  restoreRegistryProject,
  updateRegistryProject,
  type UpdateProjectInput,
} from "@/lib/projects/registry/store";
import {
  PROJECT_REGISTRY_STATUSES,
  type ProjectRegistryStatus,
} from "@/lib/projects/registry/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseStatus(v: unknown): ProjectRegistryStatus | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return undefined;
  return PROJECT_REGISTRY_STATUSES.includes(v as ProjectRegistryStatus)
    ? (v as ProjectRegistryStatus)
    : undefined;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const patch: UpdateProjectInput = {};

    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.tagline === "string") patch.tagline = body.tagline;
    if (typeof body.description === "string") patch.description = body.description;
    const status = parseStatus(body.status);
    if (status) patch.status = status;
    if (Array.isArray(body.domainIds)) {
      patch.domainIds = body.domainIds as OperationalDomainId[];
    }
    if (Array.isArray(body.linkedPaths)) patch.linkedPaths = body.linkedPaths as string[];
    if (Array.isArray(body.urls)) patch.urls = body.urls as string[];
    if (body.localSlug === null || typeof body.localSlug === "string") {
      patch.localSlug = body.localSlug as string | null;
    }
    if (Array.isArray(body.highlights)) patch.highlights = body.highlights as string[];
    if (Array.isArray(body.operatorIds)) patch.operatorIds = body.operatorIds as never;
    if (body.action === "archive") {
      const entry = await archiveRegistryProject(id);
      invalidateProjectProfilesCache();
      const payload = await listEnrichedRegistryProjects({ includeArchived: true });
      return NextResponse.json({ entry, ...payload });
    }
    if (body.action === "restore") {
      const entry = await restoreRegistryProject(id);
      invalidateProjectProfilesCache();
      const payload = await listEnrichedRegistryProjects({ includeArchived: true });
      return NextResponse.json({ entry, ...payload });
    }

    const entry = await updateRegistryProject(id, patch);
    invalidateProjectProfilesCache();
    const payload = await listEnrichedRegistryProjects({ includeArchived: true });
    return NextResponse.json({ entry, ...payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await deleteRegistryProject(id);
    invalidateProjectProfilesCache();
    const payload = await listEnrichedRegistryProjects({ includeArchived: true });
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
