"use client";

/*
 * ADD-04 Phase E — ACME Customer Portal (Team Customer Success) — §4.4 row 2
 * nav + hero + Your account + Our Solutions + Recent invoices + Contact Sales (form mock) + footer 3 คอลัมน์
 * ฟอร์มเป็น local state เท่านั้น — ไม่มี network call, ไม่เก็บข้อมูลที่กรอก
 */

import { useState, type FormEvent } from "react";
import { IconAnalysis, IconArrowRight, IconDownload, IconHelp, IconSend, IconShield } from "../icons";
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
  StdNavAction,
  StdTable,
  useSiteTheme,
  type StdTableColumn,
} from "../std";
import { Muted, SiteRoot, SiteSectionTitle } from "./site-shell";

interface PortalInvoice {
  id: string;
  date: string;
  amount: string;
  status: "Upcoming" | "Paid" | "Partially paid";
}

const INVOICES: PortalInvoice[] = [
  { id: "INV-2026-1042", date: "Oct 15, 2026", amount: "$4,280.00", status: "Upcoming" },
  { id: "INV-2026-0981", date: "Sep 15, 2026", amount: "$4,280.00", status: "Paid" },
  { id: "INV-2026-0917", date: "Aug 15, 2026", amount: "$3,960.00", status: "Paid" },
  { id: "INV-2026-0856", date: "Jul 15, 2026", amount: "$3,960.00", status: "Partially paid" },
];

const SOLUTIONS = [
  { title: "Security", text: "Single sign-on, audit trails and role-based access for every workspace.", Icon: IconShield },
  { title: "Analytics", text: "Usage dashboards and scheduled reports for your account team.", Icon: IconAnalysis },
  { title: "Support", text: "Round-the-clock help desk with a named account manager.", Icon: IconHelp },
];

const DEPARTMENTS = [
  { value: "", label: "Select a department" },
  { value: "sales", label: "Sales" },
  { value: "finance", label: "Finance" },
  { value: "it", label: "IT" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = { name: "", email: "", department: "", message: "" };
type FormState = typeof EMPTY_FORM;
type FormErrors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): FormErrors {
  const e: FormErrors = {};
  if (!f.name.trim()) e.name = "Enter your name.";
  if (!f.email.trim()) e.email = "Enter your work email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email, for example name@company.com.";
  if (!f.department) e.department = "Select a department.";
  if (!f.message.trim()) e.message = "Tell us how we can help.";
  else if (f.message.length > 1000) e.message = "Keep the message under 1,000 characters.";
  return e;
}

function ContactSalesForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sent, setSent] = useState(false);
  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSent(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setSent(false);
      return;
    }
    // mock submit: ไม่มี network call และไม่เก็บข้อมูลที่กรอก (PDPA: data minimization)
    setForm(EMPTY_FORM);
    setSent(true);
  };

  return (
    <StdCard id="contact-sales" title="Contact Sales" headingLevel={2}>
      <form noValidate onSubmit={onSubmit} className="grid gap-4 @3xl:grid-cols-2">
        <StdInput label="Name" required autoComplete="name" value={form.name} onValueChange={set("name")} error={errors.name} />
        <StdInput
          label="Work email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onValueChange={set("email")}
          error={errors.email}
        />
        <StdInput
          className="@3xl:col-span-2"
          label="Department"
          type="select"
          required
          options={DEPARTMENTS}
          value={form.department}
          onValueChange={set("department")}
          error={errors.department}
        />
        <StdInput
          className="@3xl:col-span-2"
          label="Message"
          type="textarea"
          required
          rows={4}
          value={form.message}
          onValueChange={set("message")}
          error={errors.message}
          hint="Do not include passwords or payment card details."
        />
        <div className="flex flex-wrap gap-3 @3xl:col-span-2">
          <StdButton type="submit" iconStart={<IconSend size={16} />}>
            Send Message
          </StdButton>
          <StdButton
            variant="secondary"
            onClick={() => {
              setForm(EMPTY_FORM);
              setErrors({});
              setSent(false);
            }}
          >
            Cancel
          </StdButton>
        </div>
        <div aria-live="polite" className="@3xl:col-span-2">
          {sent && (
            <StdAlert tone="success" title="Message received">
              Thanks for reaching out. A sales specialist will reply within one business day. This is a mock form, so
              nothing was sent.
            </StdAlert>
          )}
        </div>
      </form>
    </StdCard>
  );
}

export function CustomerPortalSite() {
  const theme = useSiteTheme();
  const columns: StdTableColumn<PortalInvoice>[] = [
    { key: "id", header: "Invoice", render: (r) => <span className="font-semibold">{r.id}</span>, nowrap: true },
    { key: "date", header: "Date", render: (r) => r.date, nowrap: true },
    { key: "amount", header: "Amount", render: (r) => r.amount, align: "end", nowrap: true },
    { key: "status", header: "Status", render: (r) => <StdBadge>{r.status}</StdBadge> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (r) => (
        <StdButton variant="text" size="sm" href="#" ariaLabel={`View ${r.id}`}>
          View
        </StdButton>
      ),
    },
  ];

  return (
    <SiteRoot>
      <StdNav
        ariaLabel="ACME Customer Portal"
        brand={<StdBrand code="CP" name="ACME Customer Portal" />}
        links={[{ label: "Home", active: true }, { label: "Services" }, { label: "Billing" }, { label: "Support" }, { label: "Contact" }]}
        actions={
          <>
            <StdNavAction label="Help Center" icon={<IconHelp size={18} />} href="#" />
            <StdButton size="sm">Sign in</StdButton>
          </>
        }
      />

      <div className={`${SITE_CONTAINER} flex flex-1 flex-col gap-10 py-8`}>
        {/* Hero */}
        <section aria-labelledby="cp-hero" className="grid gap-6 @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @4xl:items-center">
          <div className="min-w-0">
            <h1
              id="cp-hero"
              className="text-3xl leading-tight @3xl:text-4xl"
              style={{ color: theme.textOnPage, fontWeight: Math.max(theme.headingWeight, 700) }}
            >
              Everything your account needs, in one place
            </h1>
            <p className="mt-3 max-w-xl text-base" style={{ color: theme.mutedOnPage }}>
              Manage services, invoices and support requests for your whole organization from a single portal.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <StdButton iconEnd={<IconArrowRight size={16} />}>Get Started</StdButton>
              <StdButton variant="secondary" href="#contact-sales">
                Talk to Sales
              </StdButton>
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-4">
              {[
                ["99.9%", "Uptime SLA"],
                ["24/7", "Support desk"],
                ["12k", "Active accounts"],
              ].map(([value, label]) => (
                <div key={label} className="flex min-w-0 flex-col">
                  <dt className="text-xs @3xl:text-sm" style={{ color: theme.mutedOnPage }}>
                    {label}
                  </dt>
                  <dd className="order-first text-xl font-bold @3xl:text-2xl" style={{ color: theme.textOnPage }}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <StdCard title="Your account" badge={<StdBadge>Active</StdBadge>}>
            <dl className="grid gap-3 text-sm">
              {[
                ["Plan", "Enterprise Plus"],
                ["Open tickets", "2 in progress"],
                ["Next invoice", "Nov 15, 2026 · $4,280.00"],
                ["Account manager", "Dana Whitfield"],
              ].map(([k, v]) => (
                <StdInset key={k} className="flex flex-wrap items-center justify-between gap-2">
                  <dt>{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </StdInset>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <StdButton>View Account</StdButton>
              <StdButton variant="secondary" iconStart={<IconDownload size={16} />}>
                Download Statement
              </StdButton>
            </div>
          </StdCard>
        </section>

        {/* Our Solutions */}
        <section aria-labelledby="cp-solutions" className="flex flex-col gap-4">
          <SiteSectionTitle id="cp-solutions">Our Solutions</SiteSectionTitle>
          <div className="grid gap-4 @3xl:grid-cols-3">
            {SOLUTIONS.map(({ title, text, Icon }) => (
              <StdCard key={title} title={title} headingLevel={3} interactive>
                <span className="mb-2 inline-flex" style={{ color: theme.accent }}>
                  <Icon size={24} />
                </span>
                <p className="text-sm">
                  <Muted>{text}</Muted>
                </p>
                <div className="mt-3">
                  <StdButton variant="text" href="#" iconEnd={<IconArrowRight size={16} />} ariaLabel={`Learn more about ${title}`}>
                    Learn more
                  </StdButton>
                </div>
              </StdCard>
            ))}
          </div>
        </section>

        <div className="grid gap-6 @5xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <StdCard
            title="Recent invoices"
            actions={
              <StdButton variant="text" href="#" iconEnd={<IconArrowRight size={16} />}>
                View all
              </StdButton>
            }
          >
            <StdTable caption="Recent invoices" columns={columns} rows={INVOICES} rowKey={(r) => r.id} minWidth={560} />
          </StdCard>
          <ContactSalesForm />
        </div>
      </div>

      <StdFooter
        variant="columns"
        brand={<span className="text-base font-bold">ACME Customer Portal</span>}
        description="Account, billing and support for ACME enterprise customers."
        columns={[
          { title: "Product", links: [{ label: "Overview" }, { label: "Security" }, { label: "Analytics" }, { label: "Pricing" }] },
          { title: "Support", links: [{ label: "Help Center" }, { label: "Contact" }, { label: "System status" }] },
          { title: "Legal", links: [{ label: "Privacy" }, { label: "Terms" }, { label: "Cookies" }] },
        ]}
        copyright="© 2026 ACME Corp. All rights reserved."
      />
    </SiteRoot>
  );
}
