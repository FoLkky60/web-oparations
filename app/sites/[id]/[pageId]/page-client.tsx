"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSite } from "../../../lib/mock-store";
import { useMock } from "../../../lib/use-mock";
import { LinkButton } from "../../../components/ui";
import {
  SiteSurface,
  SiteNav,
  SiteButton,
  SiteCard,
  SiteInput,
  SiteTable,
  SiteStat,
  SiteHero,
} from "../../../components/site/site-ui";
import type {
  ImportedSite,
  SitePage,
  NavLink,
  HomePageContent,
  LoginPageContent,
  AdminMonitorPageContent,
} from "../../../lib/mock-types";

/**
 * มุมมอง "หน้าเว็บจริง" ของเว็บที่ถูก import (ADD-02)
 * - เรนเดอร์หน้า Home / Login / Admin Monitor เป็นหน้าเว็บจริง (ไม่ใช่ตารางสวอตช์)
 * - ทุกหน้าใช้ชุด component มาตรฐานเดียวกัน (SiteNav/SiteButton/SiteCard/…)
 * - ครอบด้วย chrome frame จำลอง "เบราว์เซอร์" เพื่อสื่อว่าเป็นเว็บที่เรนเดอร์อยู่
 */
export function PageClient({ siteId, pageId }: { siteId: string; pageId: string }) {
  const site = useMock(() => getSite(siteId));
  const page = site?.pages.find((p) => p.id === pageId);

  if (!site || !page) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-muted)]">ไม่พบหน้านี้</p>
        <LinkButton href={`/sites/${siteId}`}>← Back to site</LinkButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/sites/${siteId}`} className="text-sm text-[var(--color-muted)] hover:underline">
          ← {site.name}
        </Link>
        <h1 className="text-2xl font-bold">{page.name}</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {site.domain}
          {page.path} · rendered with the shared standardized component set
        </p>
      </div>

      <BrowserFrame url={`https://${site.domain}${page.path}`}>
        <RenderedPage site={site} page={page} />
      </BrowserFrame>

      <p className="text-xs text-[var(--color-muted)]">
        หน้านี้คือเว็บที่ถูก import เรนเดอร์จริง · ทุกหน้าในเว็บนี้ใช้ component มาตรฐานชุดเดียวกัน ·
        จัดการ standard ได้ที่{" "}
        <Link href="/mapping" className="text-[var(--color-primary)] underline">
          Component Mapping
        </Link>
      </p>
    </div>
  );
}

/** chrome frame จำลองเบราว์เซอร์ (address bar + traffic lights) */
function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-large)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
        <span aria-hidden="true" className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <span className="h-3 w-3 rounded-full bg-[#eab308]" />
          <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
        </span>
        <span className="flex-1 truncate rounded-[var(--radius-full)] bg-[var(--color-background)] px-3 py-1 text-center text-xs text-[var(--color-muted)]">
          {url}
        </span>
      </div>
      {/* viewport ของเว็บที่เรนเดอร์ — scroll ภายในกรอบเองบนจอเล็ก */}
      <div className="max-h-[70vh] overflow-auto">
        <SiteSurface>{children}</SiteSurface>
      </div>
    </div>
  );
}

/** เลือกหน้าตาม kind แล้วเรนเดอร์ด้วย shared components */
function RenderedPage({ site, page }: { site: ImportedSite; page: SitePage }) {
  const router = useRouter();

  // นำทางภายในเว็บ: map NavLink.target (page kind) → pageId ของเว็บเดียวกัน
  function navigate(target: NavLink["target"]) {
    if (target === "#") return;
    const dest = site.pages.find((p) => p.kind === target);
    if (dest) router.push(`/sites/${site.id}/${dest.id}`);
  }

  const nav = (
    <SiteNav brand={page.brand} links={page.nav} activeTarget={page.kind} onNavigate={navigate} />
  );

  switch (page.content.kind) {
    case "home":
      return <HomeView nav={nav} data={page.content.data} onCta={() => navigate("login")} />;
    case "login":
      return <LoginView nav={nav} data={page.content.data} />;
    case "admin-monitor":
      return <AdminView nav={nav} data={page.content.data} />;
  }
}

function HomeView({
  nav,
  data,
  onCta,
}: {
  nav: React.ReactNode;
  data: HomePageContent;
  onCta: () => void;
}) {
  return (
    <div className="flex flex-col">
      {nav}
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <SiteHero
          headline={data.hero.headline}
          subtext={data.hero.subtext}
          ctaLabel={data.hero.ctaLabel}
          onCta={onCta}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.features.map((f) => (
            <SiteCard key={f.title} title={f.title}>
              {f.body}
            </SiteCard>
          ))}
        </div>
      </main>
    </div>
  );
}

function LoginView({ nav, data }: { nav: React.ReactNode; data: LoginPageContent }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.fields.map((f) => [f.name, ""])),
  );
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex flex-col">
      {nav}
      <main className="mx-auto flex w-full max-w-md flex-col px-4 py-8 sm:px-6">
        <SiteCard title={data.title}>
          <p className="mb-4">{data.subtitle}</p>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            {data.fields.map((f) => (
              <SiteInput
                key={f.name}
                id={`login-${f.name}`}
                label={f.label}
                type={f.type}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                autoComplete={f.type === "password" ? "current-password" : f.type}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
              />
            ))}
            <SiteButton type="submit" className="w-full">
              {data.submitLabel}
            </SiteButton>
          </form>
          {submitted && (
            <p
              role="status"
              className="mt-4 rounded-[var(--site-radius-sm)] border border-[var(--site-border)] bg-[var(--site-surface)] px-3 py-2 text-sm text-[var(--site-text)]"
            >
              Signed in as{" "}
              <span className="font-medium">{values.email?.trim() || "guest"}</span> (mock — nothing was sent).
            </p>
          )}
          <p className="mt-4 text-xs text-[var(--site-muted)]">{data.helperText}</p>
        </SiteCard>
      </main>
    </div>
  );
}

function AdminView({ nav, data }: { nav: React.ReactNode; data: AdminMonitorPageContent }) {
  return (
    <div className="flex flex-col">
      {nav}
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--site-text)]">{data.title}</h1>
            <p className="text-sm text-[var(--site-muted)]">{data.subtitle}</p>
          </div>
          <SiteButton variant="secondary">Refresh</SiteButton>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.stats.map((s) => (
            <SiteStat key={s.label} label={s.label} value={s.value} delta={s.delta} trend={s.trend} />
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-[var(--site-text)]">{data.table.caption}</h2>
          <SiteTable
            caption={data.table.caption}
            columns={data.table.columns}
            rows={data.table.rows}
            statusColumn={data.table.columns.indexOf("Status")}
          />
        </div>
      </main>
    </div>
  );
}
