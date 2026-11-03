"use client";

/*
 * ADD-04 Phase E — Legacy Intranet (IT) — ADD-05: มีทั้ง Original source และ Standardized build (แทน D-6)
 * ไม่มี mockup → intranet home แบบเรียบง่าย: announcements table + quick links + IT issue form + footer
 * ฟอร์มเป็น local state เท่านั้น — ไม่มี network call
 */

import { useState, type FormEvent } from "react";
import { IconArrowRight, IconMegaphone, IconSend } from "../icons";
import {
  SITE_CONTAINER,
  StdAlert,
  StdBadge,
  StdBrand,
  StdButton,
  StdCard,
  StdFooter,
  StdInput,
  StdNav,
  StdTable,
  useSiteTheme,
  type StdTableColumn,
} from "../std";
import { SiteHeading, SiteRoot } from "./site-shell";

interface Announcement {
  id: string;
  date: string;
  title: string;
  department: string;
  status: "Active" | "Upcoming" | "Archived";
}

const ANNOUNCEMENTS: Announcement[] = [
  { id: "a-5", date: "Nov 03, 2026", title: "Office network maintenance on Saturday", department: "IT", status: "Upcoming" },
  { id: "a-4", date: "Nov 01, 2026", title: "Open enrollment for 2027 benefits", department: "People & Culture", status: "Active" },
  { id: "a-3", date: "Oct 27, 2026", title: "New expense claim form is live", department: "Finance", status: "Active" },
  { id: "a-2", date: "Oct 15, 2026", title: "Quarterly town hall recording", department: "Communications", status: "Archived" },
];

const QUICK_LINKS = ["Expense claim form", "Meeting room booking", "Phone directory", "IT asset request", "Holiday calendar"];

const CATEGORIES = [
  { value: "access", label: "Account and access" },
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "network", label: "Network" },
];

export function LegacyIntranetSite() {
  const theme = useSiteTheme();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("access");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError("Enter a short subject.");
      setNotice(null);
      return;
    }
    setError(undefined);
    setSubject("");
    setDescription("");
    setNotice("Ticket logged with the IT helpdesk. Mock only, nothing was sent.");
  };

  const columns: StdTableColumn<Announcement>[] = [
    { key: "date", header: "Date", render: (r) => r.date, nowrap: true },
    { key: "title", header: "Title", render: (r) => <span className="font-semibold">{r.title}</span> },
    { key: "department", header: "Department", render: (r) => r.department, nowrap: true },
    { key: "status", header: "Status", render: (r) => <StdBadge>{r.status}</StdBadge> },
  ];

  return (
    <SiteRoot>
      <StdNav
        ariaLabel="ACME Intranet"
        brand={<StdBrand code="LI" name="ACME Intranet" />}
        links={[{ label: "Home", active: true }, { label: "News" }, { label: "Departments" }, { label: "Forms" }, { label: "IT Helpdesk" }]}
      />

      <div className={`${SITE_CONTAINER} flex flex-1 flex-col gap-6 py-6`}>
        <SiteHeading title="Intranet home" description="Company news, forms and quick links for all staff." />

        <div className="grid gap-6 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <StdCard
            title="Announcements"
            actions={
              <span className="inline-flex items-center gap-1 text-sm" style={{ color: theme.muted }}>
                <IconMegaphone size={16} />4 posts
              </span>
            }
          >
            <StdTable caption="Announcements" columns={columns} rows={ANNOUNCEMENTS} rowKey={(r) => r.id} minWidth={600} />
          </StdCard>

          <div className="flex flex-col gap-6">
            <StdCard title="Quick links">
              <ul className="grid">
                {QUICK_LINKS.map((l) => (
                  <li key={l}>
                    <StdButton variant="text" href="#" iconEnd={<IconArrowRight size={14} />} className="min-h-11">
                      {l}
                    </StdButton>
                  </li>
                ))}
              </ul>
            </StdCard>

            <StdCard title="Report an IT issue">
              <form noValidate onSubmit={onSubmit} className="grid gap-3">
                <StdInput label="Subject" required value={subject} onValueChange={setSubject} error={error} />
                <StdInput label="Category" type="select" options={CATEGORIES} value={category} onValueChange={setCategory} />
                <StdInput label="Description" type="textarea" rows={3} value={description} onValueChange={setDescription} />
                <div>
                  <StdButton type="submit" iconStart={<IconSend size={16} />}>
                    Submit ticket
                  </StdButton>
                </div>
                <div aria-live="polite">{notice && <StdAlert tone="success">{notice}</StdAlert>}</div>
              </form>
            </StdCard>
          </div>
        </div>
      </div>

      <StdFooter
        variant="simple"
        brand={<span className="font-semibold">ACME Intranet</span>}
        links={[{ label: "IT Helpdesk" }, { label: "Policies" }, { label: "Contact" }]}
        copyright="© 2026 ACME Corp. Internal use only."
      />
    </SiteRoot>
  );
}
