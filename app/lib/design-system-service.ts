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
import { STANDARD_V321_VERSION, buildStandardV321 } from "./standard-v321";

/**
 * CRUD + versioning over the design system repository. A fresh install is
 * seeded (once) with the engine's DESIGN_SYSTEM_VERSION_SEED (1.0.0, inactive)
 * and Standard v3.2.1 (active, see ./standard-v321.ts). New versions are immutable: editing means creating a
 * new version, which is then made active (single-active invariant enforced by
 * the repository).
 */

/**
 * Seed + migrate (ADD-04 D-2), idempotent:
 * - fresh install: store the engine seed "1.0.0", then "3.2.1" (create() makes
 *   the newest version active, so 1.0.0 ends up inactive and 3.2.1 active).
 * - existing install without "3.2.1": add it once and activate it. 1.0.0 and
 *   any admin-created versions are kept. Once 3.2.1 exists this is a no-op,
 *   so an admin activating a later version is never overridden.
 * Memoized per process so concurrent first requests do not race.
 */
let seeding: Promise<void> | null = null;

async function seedAndMigrate(): Promise<void> {
  if (await designSystemRepository.isEmpty()) {
    await designSystemRepository.create({ ...DESIGN_SYSTEM_VERSION_SEED });
  }
  if (!(await designSystemRepository.get(STANDARD_V321_VERSION))) {
    await designSystemRepository.create(buildStandardV321());
  }
}

async function ensureSeeded(): Promise<void> {
  // Share one in-flight run between concurrent callers; re-check afterwards
  // (cheap file reads) so a wiped storage dir is re-seeded.
  if (!seeding) {
    seeding = seedAndMigrate().finally(() => {
      seeding = null;
    });
  }
  return seeding;
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
