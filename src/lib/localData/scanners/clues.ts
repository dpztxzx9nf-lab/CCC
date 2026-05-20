import { stat } from "fs/promises";
import path from "path";

export interface ProjectClues {
  deploymentClues: boolean;
  indexingClues: boolean;
  metaControlClues: boolean;
}

const DEPLOY_FILES = [
  "vercel.json",
  "netlify.toml",
  "Dockerfile",
  "docker-compose.yml",
  "fly.toml",
];

const INDEX_FILES = ["prisma", "schema.sql", "docker-compose.db.yml"];

const META_NAME = /ccc|continuity|command|control|nexus|archivist|thinkcore/i;

export async function scanProjectClues(
  projectPath: string,
  projectName: string,
): Promise<ProjectClues> {
  let deploymentClues = false;
  let indexingClues = false;

  for (const file of DEPLOY_FILES) {
    if (await exists(path.join(projectPath, file))) {
      deploymentClues = true;
      break;
    }
  }

  if (!deploymentClues) {
    if (
      (await exists(path.join(projectPath, "public"))) ||
      (await exists(path.join(projectPath, ".github", "workflows")))
    ) {
      deploymentClues = true;
    }
  }

  const lower = projectName.toLowerCase();
  if (/index|kindex|scout|metrics|database|sql|prisma|observatory/.test(lower)) {
    indexingClues = true;
  }

  for (const hint of INDEX_FILES) {
    if (await exists(path.join(projectPath, hint))) {
      indexingClues = true;
      break;
    }
  }

  return {
    deploymentClues,
    indexingClues,
    metaControlClues: META_NAME.test(projectName),
  };
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
