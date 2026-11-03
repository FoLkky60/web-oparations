import { computeCompliance } from "@core/index";
import type { ComplianceReport } from "@shared/index";
import { repository } from "./repository";
import { ServiceError } from "./project-service";
import { getActiveDesignSystem } from "./design-system-service";

/**
 * Adapter that loads a project's stored analysis and the active design system,
 * then calls the pure engine scorer. The timestamp is injected here so the
 * engine stays clock-free.
 */
export async function getComplianceReport(
  projectId: string,
): Promise<ComplianceReport> {
  const record = await repository.getProject(projectId);
  if (!record) {
    throw new ServiceError("NOT_FOUND", `Project ${projectId} not found`, 404);
  }
  if (!record.analysis) {
    throw new ServiceError(
      "NO_ANALYSIS",
      "Project has not been analyzed yet.",
      409,
    );
  }

  const ds = await getActiveDesignSystem();
  return computeCompliance(record.analysis, ds, {
    projectId,
    computedAt: new Date().toISOString(),
  });
}
