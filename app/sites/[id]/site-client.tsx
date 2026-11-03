"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSite, standardOf, removeSite } from "../../lib/mock-store";
import { useMock } from "../../lib/use-mock";
import { STRUCTURE_LABELS, STRUCTURE_CENTRAL_NAME } from "../../lib/mock-data";
import { Card, Badge, Button, LinkButton, ComplianceBar } from "../../components/ui";
import { IconMapping, IconCheck } from "../../components/icons";

/**
 * ภาพรวมเว็บที่ถูก import (ADD-02)
 * - ลิสต์ 3 หน้า (Home / Login / Admin Monitor) พร้อมลิงก์ไปดูหน้าที่เรนเดอร์จริง
 * - ย้ำว่า "ทุกหน้าใช้ชุด component มาตรฐานเดียวกัน"
 * - มีปุ่ม Remove
 * - สรุป standardization (before→after) แบบย่อเป็นข้อมูลรอง
 */
export function SiteClient({ id }: { id: string }) {
  const router = useRouter();
  const site = useMock(() => getSite(id));

  if (!site) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-muted)]">ไม่พบเว็บนี้ (อาจถูกลบไปแล้ว)</p>
        <LinkButton href="/">← Dashboard</LinkButton>
      </div>
    );
  }

  // structureKey ที่ไม่ซ้ำ (ทุกหน้าใช้ชุดเดียวกัน) — ใช้สรุป standardization
  const structureKeys = [...new Set(site.components.map((c) => c.structureKey))];
  const standardizedCount = structureKeys.filter((k) => standardOf(k)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/" className="text-sm text-[var(--color-muted)] hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {site.domain} · {site.fileCount} files · {site.sizeKb} KB · {site.pages.length} pages
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ComplianceBar score={site.complianceScore} />
          <Badge kind={site.status}>{site.status}</Badge>
          <Button
            variant="outline"
            onClick={() => {
              removeSite(site.id);
              router.push("/");
            }}
          >
            Remove
          </Button>
        </div>
      </div>

      {/* Pages — ลิงก์ไปดูหน้าที่เรนเดอร์จริง */}
      <Card>
        <div className="mb-3 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Pages</h2>
          <p className="text-sm text-[var(--color-muted)]">
            เว็บนี้มี {site.pages.length} หน้า และ<strong>ทุกหน้าใช้ชุด component มาตรฐานเดียวกัน</strong>
            (SiteNav · SiteButton · SiteCard · SiteInput · SiteTable · SiteStat · SiteHero) —
            เปิดดูแต่ละหน้าเพื่อเห็นความสม่ำเสมอ
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {site.pages.map((pg) => (
            <li
              key={pg.id}
              className="flex flex-col justify-between gap-3 rounded-[var(--radius-medium)] border border-[var(--color-border)] p-4"
            >
              <div>
                <div className="font-medium">{pg.name}</div>
                <div className="font-mono text-xs text-[var(--color-muted)]">{pg.path}</div>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{PAGE_NOTE[pg.kind]}</p>
              </div>
              <LinkButton href={`/sites/${site.id}/${pg.id}`} variant="primary">
                View page →
              </LinkButton>
            </li>
          ))}
        </ul>
      </Card>

      {/* สรุป standardization (ข้อมูลรอง) */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Standardized component set</h2>
            <p className="text-xs text-[var(--color-muted)]">
              {structureKeys.length} ชนิด component ที่ทุกหน้าใช้ร่วมกัน · เลือก standard แล้ว{" "}
              {standardizedCount}/{structureKeys.length}
            </p>
          </div>
          <Link
            href="/mapping"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <IconMapping size={16} /> จัดการ standard →
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {structureKeys.map((k) => {
            const done = !!standardOf(k);
            const label = STRUCTURE_LABELS[k] ?? k;
            const central = STRUCTURE_CENTRAL_NAME[k] ?? k;
            return (
              <li
                key={k}
                className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs"
              >
                <span className="font-medium">{label}</span>
                <span aria-hidden="true" className="text-[var(--color-muted)]">→</span>
                <span className="font-mono text-[var(--color-primary)]">{central}</span>
                {done ? (
                  <Badge kind="applied">
                    <span className="inline-flex items-center gap-1">
                      <IconCheck size={12} /> standardized
                    </span>
                  </Badge>
                ) : (
                  <Badge kind="needs-review">central</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

const PAGE_NOTE: Record<string, string> = {
  home: "Hero + feature cards + shared top navigation.",
  login: "Interactive sign-in form (mock — nothing is submitted).",
  "admin-monitor": "Dashboard stats + a recent-activity data table.",
};
