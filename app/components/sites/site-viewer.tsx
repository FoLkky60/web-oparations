"use client";

/*
 * ADD-04 Phase E + ADD-05 — viewer ของหน้าเว็บทีม (/imported/[siteId])
 *
 * ADD-05: เว็บ 5 เว็บ = ชุดเดียว — SiteView เดียว มี 2 มุมมอง (renderer เดียวกัน SitePage ต่างกันแค่ resolver):
 *  - "standardized" (ค่าเริ่มต้น) → standardizedStyle(c) = variant ใน state.workspaces.decisions (D-7)
 *    ผูกกับ snapshot ของ store ผ่าน useStandard → Apply/Rebuild ใน Builder แล้ว re-render ทันที
 *  - "original" (?view=original) → sourceStyle(siteId, c) หน้าตาเดิมของทีม ไม่ขึ้นกับ decision ใด ๆ (RULE-01)
 * layout / ข้อความ / label / ข้อมูล เหมือนกันทั้งสองมุมมอง (D-4) — ต่างกันเฉพาะสไตล์
 */

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { IconArrowLeft, IconBox, IconGlobe } from "../icons";
import { StyleResolverProvider, type StyleResolver } from "../std";
import type { SiteId } from "../../lib/standard-types";
import {
  getBuilderState,
  getSite,
  getSiteBuild,
  rebuildWorkspaces,
  sourceStyle,
  standardizedStyle,
} from "../../lib/standard-store";
import { useStandard } from "../../lib/use-standard";
import { BillingSite } from "./billing-site";
import { CustomerPortalSite } from "./customer-portal-site";
import { HrSelfServiceSite } from "./hr-self-service-site";
import { LegacyIntranetSite } from "./legacy-intranet-site";
import { PartnerOnboardingSite } from "./partner-onboarding-site";

/** หน้าหลักของแต่ละเว็บ (1 หน้า/เว็บ ตาม D-5) */
export function SitePage({ siteId }: { siteId: SiteId }) {
  switch (siteId) {
    case "bd":
      return <BillingSite />;
    case "cp":
      return <CustomerPortalSite />;
    case "hr":
      return <HrSelfServiceSite />;
    case "po":
      return <PartnerOnboardingSite />;
    case "li":
      return <LegacyIntranetSite />;
  }
}

const LINK_BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-medium)] px-4 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)]";
const LINK_PRIMARY = `${LINK_BTN} bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]`;
const LINK_SECONDARY = `${LINK_BTN} border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] hover:bg-[var(--color-surface)]`;

/** แถบบนของแพลตฟอร์มที่คร่อมเว็บของทีม (ใช้ app tokens — ไม่ใช่สไตล์ของเว็บทีม) */
function PlatformBar({
  name,
  chip,
  chipIcon,
  team,
  modeSwitch,
  actions,
  notice,
}: {
  name: string;
  chip: string;
  chipIcon: ReactNode;
  team: string;
  modeSwitch: ReactNode;
  actions: ReactNode;
  notice?: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 sm:px-6">
      <nav aria-label="Platform breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-muted)]">
          <li>
            <Link href="/" className="inline-flex min-h-11 items-center hover:text-[var(--color-text)] hover:underline">
              UI Standardization Platform
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>Imported websites</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[var(--color-text)]">
            {name}
          </li>
        </ol>
      </nav>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-lg font-bold text-[var(--color-text)]">{name}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-active)]">
            {chipIcon}
            {chip}
          </span>
          <span className="text-xs text-[var(--color-muted)]">Team: {team}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {modeSwitch}
          {actions}
        </div>
      </div>
      {notice}
    </div>
  );
}

/** ส่วนเว็บของทีม — เต็มความกว้าง main (หักล้าง padding ของ main) */
function Frame({ bar, children }: { bar: ReactNode; children: ReactNode }) {
  return (
    <div className="-m-4 flex min-w-0 flex-col sm:-m-6">
      {bar}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export type SiteViewMode = "standardized" | "original";

const SEG_ITEM =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-small)] px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--dur-fast)]";

/**
 * segmented control สลับมุมมอง — เป็นลิงก์ (สะท้อนใน URL: ค่าเริ่มต้น = standardized, ?view=original)
 * ใช้ nav + aria-current แทน ARIA tabs เพราะแต่ละมุมมองมี URL ของตัวเอง (ลิงก์/แชร์ได้, back/forward ได้)
 */
function ModeSwitch({ siteId, mode }: { siteId: SiteId; mode: SiteViewMode }) {
  const items: { mode: SiteViewMode; label: string; href: string; icon: ReactNode }[] = [
    { mode: "standardized", label: "Standardized", href: `/imported/${siteId}`, icon: <IconBox size={16} /> },
    { mode: "original", label: "Original source", href: `/imported/${siteId}?view=original`, icon: <IconGlobe size={16} /> },
  ];
  return (
    <nav aria-label="Website view">
      <ul className="inline-flex gap-1 rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {items.map((it) => {
          const active = it.mode === mode;
          return (
            <li key={it.mode}>
              <Link
                href={it.href}
                replace
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`${SEG_ITEM} ${
                  active
                    ? "bg-[var(--color-background)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {it.icon}
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SiteView({ siteId, mode }: { siteId: SiteId; mode: SiteViewMode }) {
  const site = getSite(siteId);
  // subscribe store → reference ใหม่ทุกครั้งที่ Apply/Rebuild → resolver ใหม่ → re-render ทั้งเว็บ
  const state = useStandard(getBuilderState);
  const build = getSiteBuild(siteId);
  const decisions = state.workspaces.decisions;
  const resolver = useMemo<StyleResolver>(
    () => (mode === "original" ? (c) => sourceStyle(siteId, c) : (c) => standardizedStyle(c, decisions)),
    [mode, siteId, decisions],
  );
  if (!site) return null;
  const standardized = mode === "standardized";
  return (
    <Frame
      bar={
        <PlatformBar
          name={site.name}
          chip={standardized ? `Standardized build · Standard v${build.version}` : "Original source · not modified"}
          chipIcon={standardized ? <IconBox size={14} /> : <IconGlobe size={14} />}
          team={site.team}
          modeSwitch={<ModeSwitch siteId={siteId} mode={mode} />}
          notice={
            standardized && build.needsRebuild ? (
              <div
                role="status"
                className="mt-3 flex flex-col gap-2 rounded-[var(--radius-medium)] border border-[var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_10%,white)] px-3 py-2 text-sm text-[var(--color-text)] sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  Standard v{state.published.version} is published, but this website is still built with v
                  {build.version} (Auto-rebuild was off).
                </span>
                <button type="button" onClick={() => rebuildWorkspaces()} className={LINK_PRIMARY}>
                  Rebuild workspaces
                </button>
              </div>
            ) : null
          }
          actions={
            <Link href="/builder" className={LINK_SECONDARY}>
              <IconArrowLeft size={16} />
              Template &amp; Builder
            </Link>
          }
        />
      }
    >
      <StyleResolverProvider resolver={resolver}>
        <SitePage siteId={siteId} />
      </StyleResolverProvider>
    </Frame>
  );
}
