"use client";

/*
 * ADD-04 Phase E — Partner Onboarding (Partner team) — ADD-05: มีทั้ง Original source และ Standardized build (แทน D-6)
 * ไม่มี mockup → หน้าเว็บจริงแบบเรียบง่าย: registration form + onboarding checklist + recent applications
 * ฟอร์มเป็น local state เท่านั้น — ไม่มี network call
 */

import { useState, type FormEvent } from "react";
import { IconArrowRight, IconBuilding, IconCheck } from "../icons";
import {
  SITE_CONTAINER,
  StdAlert,
  StdBadge,
  StdBrand,
  StdButton,
  StdCard,
  StdFooter,
  StdInput,
  StdInset,
  StdNav,
  StdTable,
  useSiteTheme,
  type StdTableColumn,
} from "../std";
import { Muted, SiteHeading, SiteRoot } from "./site-shell";

interface Application {
  id: string;
  company: string;
  type: string;
  submitted: string;
  status: "Approved" | "Pending" | "Declined";
}

const APPLICATIONS: Application[] = [
  { id: "APP-1031", company: "Northwind Logistics", type: "Reseller", submitted: "Oct 28, 2026", status: "Approved" },
  { id: "APP-1029", company: "Contoso Retail", type: "Referral", submitted: "Oct 21, 2026", status: "Pending" },
  { id: "APP-1024", company: "Globex Manufacturing", type: "Technology", submitted: "Oct 14, 2026", status: "Declined" },
];

const CHECKLIST = [
  { step: "Company details", note: "Legal name and registered address", status: "Completed" },
  { step: "Tax documents", note: "Upload a tax registration certificate", status: "Pending" },
  { step: "Bank details", note: "Account for partner payouts", status: "Pending" },
  { step: "Partner agreement", note: "Review and sign electronically", status: "Not started" },
];

const PARTNER_TYPES = [
  { value: "", label: "Select a partner type" },
  { value: "reseller", label: "Reseller" },
  { value: "referral", label: "Referral" },
  { value: "technology", label: "Technology" },
];

const COUNTRIES = [
  { value: "", label: "Select a country" },
  { value: "th", label: "Thailand" },
  { value: "sg", label: "Singapore" },
  { value: "jp", label: "Japan" },
  { value: "other", label: "Other" },
];

const EMPTY = { company: "", email: "", type: "", country: "", notes: "", agree: false };
type Form = typeof EMPTY;
type Errors = Partial<Record<keyof Form, string>>;

export function PartnerOnboardingSite() {
  const theme = useSiteTheme();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!form.company.trim()) next.company = "Enter your company name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid contact email.";
    if (!form.type) next.type = "Select a partner type.";
    if (!form.agree) next.agree = "Accept the partner program terms to continue.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setForm(EMPTY);
    setNotice("Application received. Our partner team will review it within 3 business days. Mock only, nothing was sent.");
  };

  const columns: StdTableColumn<Application>[] = [
    { key: "id", header: "Application", render: (r) => <span className="font-semibold">{r.id}</span>, nowrap: true },
    { key: "company", header: "Company", render: (r) => r.company },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "submitted", header: "Submitted", render: (r) => r.submitted, nowrap: true },
    { key: "status", header: "Status", render: (r) => <StdBadge>{r.status}</StdBadge> },
  ];

  return (
    <SiteRoot>
      <StdNav
        ariaLabel="ACME Partner Onboarding"
        brand={<StdBrand code="PO" name="ACME Partners" tagline="Onboarding" />}
        links={[{ label: "Overview" }, { label: "Applications", active: true }, { label: "Resources" }, { label: "Support" }]}
        actions={<StdButton size="sm">Sign in</StdButton>}
      />

      <div className={`${SITE_CONTAINER} flex flex-1 flex-col gap-6 py-6`}>
        <SiteHeading
          title="Become an ACME partner"
          description="Register your company, complete the checklist and start selling with ACME."
        />

        <div aria-live="polite">
          {notice && (
            <StdAlert tone="success" title="Thank you">
              {notice}
            </StdAlert>
          )}
        </div>

        <div className="grid gap-6 @5xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <StdCard title="Partner registration">
            <form noValidate onSubmit={onSubmit} className="grid gap-4 @3xl:grid-cols-2">
              <StdInput label="Company name" required value={form.company} onValueChange={set("company")} error={errors.company} />
              <StdInput
                label="Contact email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onValueChange={set("email")}
                error={errors.email}
              />
              <StdInput
                label="Partner type"
                type="select"
                required
                options={PARTNER_TYPES}
                value={form.type}
                onValueChange={set("type")}
                error={errors.type}
              />
              <StdInput label="Country" type="select" options={COUNTRIES} value={form.country} onValueChange={set("country")} />
              <StdInput
                className="@3xl:col-span-2"
                label="Notes"
                type="textarea"
                rows={3}
                value={form.notes}
                onValueChange={set("notes")}
                hint="Optional. Tell us about your customers and regions."
              />
              <StdInput
                className="@3xl:col-span-2"
                type="checkbox"
                label="I agree to the partner program terms"
                checked={form.agree}
                onCheckedChange={set("agree")}
                error={errors.agree}
              />
              <div className="flex flex-wrap gap-3 @3xl:col-span-2">
                <StdButton type="submit" iconEnd={<IconArrowRight size={16} />}>
                  Submit application
                </StdButton>
                <StdButton
                  variant="secondary"
                  onClick={() => setNotice("Progress kept for this session only. Mock only, nothing was stored.")}
                >
                  Save for later
                </StdButton>
              </div>
            </form>
          </StdCard>

          <StdCard title="Onboarding checklist" badge={<StdBadge tone="info">1 of 4 done</StdBadge>}>
            <ol className="grid gap-3">
              {CHECKLIST.map((c, i) => (
                <li key={c.step}>
                  <StdInset className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ border: `1.5px solid ${theme.accent}`, color: theme.accentText }}
                    >
                      {c.status === "Completed" ? <IconCheck size={14} /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{c.step}</span>
                      <span className="block text-xs">
                        <Muted>{c.note}</Muted>
                      </span>
                    </span>
                    <StdBadge>{c.status}</StdBadge>
                  </StdInset>
                </li>
              ))}
            </ol>
          </StdCard>
        </div>

        <StdCard
          title="Recent applications"
          actions={
            <span className="inline-flex items-center gap-1 text-sm" style={{ color: theme.muted }}>
              <IconBuilding size={16} />3 companies
            </span>
          }
        >
          <StdTable caption="Recent applications" columns={columns} rows={APPLICATIONS} rowKey={(r) => r.id} minWidth={640} />
        </StdCard>
      </div>

      <StdFooter
        variant="columns"
        brand={<span className="text-base font-bold">ACME Partners</span>}
        description="Programs and resources for ACME resellers and technology partners."
        columns={[
          { title: "Program", links: [{ label: "Benefits" }, { label: "Tiers" }, { label: "Apply" }] },
          { title: "Resources", links: [{ label: "Guides" }, { label: "Marketing kit" }, { label: "Support" }] },
          { title: "Legal", links: [{ label: "Partner terms" }, { label: "Privacy" }] },
        ]}
        copyright="© 2026 ACME Corp. Partner team."
      />
    </SiteRoot>
  );
}
