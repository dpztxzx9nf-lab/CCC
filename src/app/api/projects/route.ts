import { NextResponse } from "next/server";
import type { OperationalDomainId } from "@/data/ecology";
import type { OperationalCategory } from "@/lib/operations/taxonomy";
import type { OperatorId } from "@/lib/operations/taxonomy";
import { invalidateProjectProfilesCache } from "@/lib/operations/projectProfiles";
import { listEnrichedRegistryProjects } from "@/lib/projects/registry/api-enrich";
import {
  createRegistryProject,
  type CreateProjectInput,
} from "@/lib/projects/registry/store";
import {
  PROJECT_REGISTRY_STATUSES,
  type ProjectRegistryStatus,
} from "@/lib/projects/registry/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseStatus(v: unknown): ProjectRegistryStatus | null {
  if (typeof v !== "string") return null;
  return PROJECT_REGISTRY_STATUSES.includes(v as ProjectRegistryStatus)
    ? (v as ProjectRegistryStatus)
    : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const payload = await listEnrichedRegistryProjects({ includeArchived });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateProjectInput>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const status = parseStatus(body.status) ?? "active";
    const domainIds = Array.isArray(body.domainIds)
      ? (body.domainIds as OperationalDomainId[])
      : (["core"] as OperationalDomainId[]);

    const input: CreateProjectInput = {
      name,
      tagline: typeof body.tagline === "string" ? body.tagline : "",
      description: typeof body.description === "string" ? body.description : "",
      status,
      domainIds,
      linkedPaths: Array.isArray(body.linkedPaths) ? body.linkedPaths : [],
      urls: Array.isArray(body.urls) ? body.urls : [],
      localSlug: typeof body.localSlug === "string" ? body.localSlug : null,
      category: (body.category as OperationalCategory) ?? "platform",
      continuityPriority:
        typeof body.continuityPriority === "number" ? body.continuityPriority : 3,
      operatorIds: Array.isArray(body.operatorIds)
        ? (body.operatorIds as OperatorId[])
        : [],
      stack: Array.isArray(body.stack) ? body.stack : [],
      deploymentCapable: Boolean(body.deploymentCapable),
      repoExpected: Boolean(body.repoExpected),
      systemsAffected: Array.isArray(body.systemsAffected)
        ? body.systemsAffected
        : [],
      highlights: Array.isArray(body.highlights) ? body.highlights : [],
      id: typeof body.id === "string" ? body.id : undefined,
    };

    const created = await createRegistryProject(input);
    invalidateProjectProfilesCache();

    const payload = await listEnrichedRegistryProjects({ includeArchived: true });
    return NextResponse.json(
      { entry: created, ...payload },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
