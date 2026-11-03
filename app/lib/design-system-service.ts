import { nanoid } from "nanoid";
import {
  DESIGN_SYSTEM_VERSION_SEED,
  designSystemFromVersion,
} from "@core/index";
import type {
  DesignSystem,
  DesignSystemComponent,
  DesignSystemVersion,
  DesignToken,
  MappingRule,
} from "@shared/index";
import { designSystemRepository } from "./repository";
import { ServiceError } from "./project-service";

/**
 * CRUD + versioning over the design system repository. A fresh install is
 * seeded (once) with the engine's DESIGN_SYSTEM_VERSION_SEED (v1), which becomes
 * the first active version. New versions are immutable: editing means creating a
 * new version, which is then made active (single-active invariant enforced by
 * the repository).
 */

/** Seed v1 from the engine if the repository has no versions yet. */
async function ensureSeeded(): Promise<void> {
  if (await designSystemRepository.isEmpty()) {
    await designSystemRepository.create({ ...DESIGN_SYSTEM_VERSION_SEED });
  }
}

export async function getActiveVersion(): Promise<DesignSystemVersion> {
  await ensureSeeded();
  const active = await designSystemRepository.getActive();
  if (!active) {
    // Repository was seeded above, so this is unexpected.
    throw new ServiceError(
      "NO_ACTIVE_DESIGN_SYSTEM",
      "No active design system version is configured.",
      500,
    );
  }
  return active;
}

export async function getVersion(version: string): Promise<DesignSystemVersion> {
  await ensureSeeded();
  const found = await designSystemRepository.get(version);
  if (!found) {
    throw new ServiceError(
      "NOT_FOUND",
      `Design system version "${version}" not found`,
      404,
    );
  }
  return found;
}

export async function listVersions(): Promise<DesignSystemVersion[]> {
  await ensureSeeded();
  return designSystemRepository.list();
}

/**
 * Create a new immutable design system version and make it active.
 * `createdBy` identifies the actor (Phase 5 will supply the authenticated user;
 * until then the caller passes a placeholder).
 */
export async function createVersion(input: {
  tokens: DesignToken[];
  components: DesignSystemComponent[];
  mappingRules: MappingRule[];
  createdBy: string;
}): Promise<DesignSystemVersion> {
  await ensureSeeded();

  const existing = await designSystemRepository.list();
  const version = nextVersionId(existing);

  const record: DesignSystemVersion = {
    version,
    tokens: input.tokens,
    components: input.components,
    mappingRules: input.mappingRules,
    active: true,
    immutable: true,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };

  return designSystemRepository.create(record);
}

/** The active version expressed as the plain DesignSystem view the engine uses. */
export async function getActiveDesignSystem(): Promise<DesignSystem> {
  const active = await getActiveVersion();
  return designSystemFromVersion(active);
}

/**
 * Next version id. Seed is "1.0.0"; subsequent admin-created versions use a
 * simple incrementing "vN" scheme that is guaranteed not to collide with the
 * existing set.
 */
function nextVersionId(existing: DesignSystemVersion[]): string {
  const taken = new Set(existing.map((v) => v.version));
  let n = existing.length + 1;
  let candidate = `v${n}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `v${n}`;
  }
  return candidate;
}
