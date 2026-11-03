"use client";

/*
 * ADD-04 Phase E — ACME People (HR Self-Service · Team People & Culture) — §4.4 row 3
 * header + side nav (My Leave) + breadcrumb + Leave details form (mock submit) + balance cards + My recent requests
 * ฟอร์มเป็น local state เท่านั้น — ไม่มี network call
 */

import { useState, type FormEvent } from "react";
import {
  IconBell,
  IconBook,
  IconCalendar,
  IconHeart,
  IconHelp,
  IconHome,
  IconSend,
  IconUsers,
  IconWallet,
} from "../icons";
import {
  StdAlert,
  StdAvatar,
  StdBadge,
  StdBrand,
  StdBreadcrumb,
  StdButton,
  StdCard,
  StdFooter,
  StdInput,
  StdNav,
  StdNavAction,
  StdProgress,
  StdSideNav,
  StdTable,
  type StdTableColumn,
} from "../std";
import { Muted, SiteHeading, SiteRoot } from "./site-shell";
import { MONTHS_SHORT } from "../../lib/standard-labels";

interface LeaveRequest {
  id: string;
  type: string;
  dates: string;
  days: number;
  approver: string;
  status: "Pending" | "Approved" | "Declined";
}

const SEED_REQUESTS: LeaveRequest[] = [
  { id: "lr-3", type: "Annual leave", dates: "Dec 22 – Dec 31, 2026", days: 6, approver: "Somchai Prasert", status: "Pending" },
  { id: "lr-2", type: "Sick leave", dates: "Sep 8, 2026", days: 1, approver: "Somchai Prasert", status: "Approved" },
  { id: "lr-1", type: "Personal leave", dates: "Aug 14, 2026", days: 1, approver: "Somchai Prasert", status: "Declined" },
];

const LEAVE_TYPES = [
  { value: "annual", label: "Annual leave" },
  { value: "sick", label: "Sick leave" },
  { value: "personal", label: "Personal leave" },
];

const APPROVERS = [
  { value: "somchai", label: "Somchai Prasert (Design Manager)" },
  { value: "hr-partner", label: "People & Culture partner" },
];

const BALANCES = [
  { title: "Annual leave", left: 12, total: 18, status: "Available" as const },
  { title: "Sick leave", left: 6, total: 8, status: "Available" as const },
  { title: "Personal leave", left: 1, total: 3, status: "Low" as const },
];

const INITIAL = {
  type: "annual",
  approver: "somchai",
  start: "2026-11-18",
  end: "2026-11-20",
  halfDay: false,
  reason: "",
};
type LeaveForm = typeof INITIAL;

function parseDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** จำนวนวันทำงาน (จ.–ศ.) แบบรวมวันแรกและวันสุดท้าย */
function workingDays(start: Date, end: Date, halfDay: boolean): number {
  let n = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) n += 1;
  }
  return halfDay && n > 0 ? n - 0.5 : n;
}

function formatRange(start: Date, end: Date): string {
  // ไม่ใช้ Intl (ผลต่างกันระหว่าง Node/browser → hydration mismatch)
  const md = (d: Date) => `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const year = end.getUTCFullYear();
  if (start.getTime() === end.getTime()) return `${md(start)}, ${year}`;
  return `${md(start)} – ${md(end)}, ${year}`;
}

export function HrSelfServiceSite() {
  const [form, setForm] = useState<LeaveForm>(INITIAL);
  const [requests, setRequests] = useState<LeaveRequest[]>(SEED_REQUESTS);
  const [errors, setErrors] = useState<Partial<Record<"start" | "end" | "reason", string>>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "info"; title: string; text: string } | null>(null);
  const set = <K extends keyof LeaveForm>(key: K) => (value: LeaveForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  };

  const start = parseDay(form.start);
  const end = parseDay(form.end);
  const validRange = !!start && !!end && end.getTime() >= start.getTime();
  const days = validRange ? workingDays(start, end, form.halfDay) : 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<"start" | "end" | "reason", string>> = {};
    if (!start) next.start = "Choose a start date.";
    if (!end) next.end = "Choose an end date.";
    else if (start && !validRange) next.end = "End date must be on or after the start date.";
    else if (validRange && days <= 0) next.end = "These dates fall on a weekend. Choose at least one working day.";
    if (form.reason.length > 500) next.reason = "Keep the reason under 500 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !start || !end) {
      setNotice(null);
      return;
    }
    const typeLabel = LEAVE_TYPES.find((t) => t.value === form.type)?.label ?? "Leave";
    const approver = APPROVERS.find((a) => a.value === form.approver)?.label.replace(/ \(.*\)$/, "") ?? "";
    setRequests((prev) => [
      {
        id: `lr-new-${prev.length + 1}`,
        type: typeLabel,
        dates: formatRange(start, end),
        days,
        approver,
        status: "Pending",
      },
      ...prev,
    ]);
    setForm(INITIAL);
    setNotice({
      tone: "success",
      title: "Request submitted",
      text: `Your ${typeLabel.toLowerCase()} request was sent to ${approver} for approval. Mock only, nothing left this page.`,
    });
  };

  const columns: StdTableColumn<LeaveRequest>[] = [
    { key: "type", header: "Type", render: (r) => <span className="font-semibold">{r.type}</span>, nowrap: true },
    { key: "dates", header: "Dates", render: (r) => r.dates, nowrap: true },
    { key: "days", header: "Days", render: (r) => r.days, align: "end" },
    { key: "approver", header: "Approver", render: (r) => r.approver, nowrap: true },
    { key: "status", header: "Status", render: (r) => <StdBadge>{r.status}</StdBadge> },
  ];

  return (
    <SiteRoot>
      <StdNav
        ariaLabel="ACME People"
        brand={<StdBrand code="AP" name="ACME People" />}
        mobileExtra={<StdInput type="search" label="Search" labelInherit placeholder="People, policies, forms" />}
        actions={
          <>
            <div className="hidden w-80 @3xl:block">
              <StdInput type="search" layout="inline" labelInherit label="Search" placeholder="People, policies, forms" />
            </div>
            <StdNavAction label="Help" showLabel={false} icon={<IconHelp size={20} />} href="#" />
            <StdNavAction label="Notifications" showLabel={false} count={3} icon={<IconBell size={20} />} />
            <span className="inline-flex items-center gap-2 pl-1">
              <StdAvatar initials="MC" />
              <span className="hidden leading-tight @xl:block">
                <span className="block text-sm font-semibold">Mei Chen</span>
                <span className="block text-xs">Product Designer</span>
              </span>
            </span>
          </>
        }
      />

      <div className="flex flex-1 flex-col @3xl:flex-row">
        <StdSideNav
          ariaLabel="People services"
          className="p-3 @3xl:w-64 @3xl:shrink-0"
          items={[
            { label: "Home", icon: <IconHome size={18} /> },
            { label: "My Leave", icon: <IconCalendar size={18} />, active: true },
            { label: "Payslips", icon: <IconWallet size={18} /> },
            { label: "Benefits", icon: <IconHeart size={18} /> },
            { label: "Directory", icon: <IconUsers size={18} /> },
            { label: "Policies", icon: <IconBook size={18} /> },
          ]}
          footer={
            <div className="hidden @3xl:block">
              <StdCard title="Need help with leave?" headingLevel={2}>
                <p className="text-sm">
                  <Muted>Our People team answers questions about balances and approvals.</Muted>
                </p>
                <div className="mt-3">
                  <StdButton variant="secondary" size="sm" href="#">
                    Contact HR
                  </StdButton>
                </div>
              </StdCard>
            </div>
          }
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 @3xl:px-8">
          <div>
            <StdBreadcrumb items={[{ label: "My Leave" }, { label: "New request" }]} />
            <SiteHeading
              title="Request leave"
              description="Submit time off for approval. Balances update once your approver responds."
              actions={
                <StdButton variant="text" href="#" iconStart={<IconBook size={16} />}>
                  View leave policy
                </StdButton>
              }
            />
          </div>

          <div aria-live="polite">
            {notice && (
              <StdAlert tone={notice.tone} title={notice.title}>
                {notice.text}
              </StdAlert>
            )}
          </div>

          <div className="grid gap-6 @5xl:grid-cols-[minmax(0,1fr)_300px]">
            <StdCard title="Leave details">
              <form noValidate onSubmit={onSubmit} className="grid gap-4 @3xl:grid-cols-2">
                <StdInput type="select" label="Leave type" options={LEAVE_TYPES} value={form.type} onValueChange={set("type")} />
                <StdInput type="select" label="Approver" options={APPROVERS} value={form.approver} onValueChange={set("approver")} />
                <StdInput
                  type="date"
                  label="Start date"
                  required
                  value={form.start}
                  onValueChange={set("start")}
                  error={errors.start}
                />
                <StdInput
                  type="date"
                  label="End date"
                  required
                  min={form.start}
                  value={form.end}
                  onValueChange={set("end")}
                  error={errors.end}
                  hint={validRange ? `${days} working ${days === 1 ? "day" : "days"}` : undefined}
                />
                <StdInput
                  className="@3xl:col-span-2"
                  type="checkbox"
                  label="Take the last day as a half day"
                  checked={form.halfDay}
                  onCheckedChange={set("halfDay")}
                />
                <StdInput
                  className="@3xl:col-span-2"
                  type="textarea"
                  label="Reason"
                  rows={3}
                  value={form.reason}
                  onValueChange={set("reason")}
                  error={errors.reason}
                  hint="Optional. Visible to your approver only."
                />
                <div className="@3xl:col-span-2">
                  <StdAlert tone="warning" title="Team calendar">
                    Two teammates are already on leave Nov 18 – Nov 19, 2026. Your approver may ask you to adjust your dates.
                  </StdAlert>
                </div>
                <div className="flex flex-wrap gap-3 @3xl:col-span-2">
                  <StdButton type="submit" iconStart={<IconSend size={16} />}>
                    Submit Request
                  </StdButton>
                  <StdButton
                    variant="secondary"
                    onClick={() =>
                      setNotice({
                        tone: "info",
                        title: "Draft saved",
                        text: "Your draft is kept for this session only. Mock only, nothing was stored.",
                      })
                    }
                  >
                    Save Draft
                  </StdButton>
                  <StdButton
                    variant="text"
                    onClick={() => {
                      setForm(INITIAL);
                      setErrors({});
                      setNotice(null);
                    }}
                  >
                    Cancel
                  </StdButton>
                </div>
              </form>
            </StdCard>

            <div className="grid gap-4 @3xl:grid-cols-3 @5xl:grid-cols-1 @5xl:content-start">
              {BALANCES.map((b) => (
                <StdCard key={b.title} title={b.title} headingLevel={3} badge={<StdBadge>{b.status}</StdBadge>}>
                  <p className="text-2xl font-bold">
                    {b.left}
                    <span className="ml-1 text-sm font-normal">
                      <Muted>of {b.total} days left</Muted>
                    </span>
                  </p>
                  <div className="mt-3">
                    <StdProgress
                      label="Remaining"
                      value={b.left}
                      max={b.total}
                      valueText={`${b.left} of ${b.total} days`}
                      tone={b.status === "Low" ? "warning" : undefined}
                    />
                  </div>
                </StdCard>
              ))}
            </div>
          </div>

          <StdCard title="My recent requests">
            <StdTable caption="My recent requests" columns={columns} rows={requests} rowKey={(r) => r.id} minWidth={640} />
          </StdCard>
        </div>
      </div>

      <StdFooter
        variant="simple"
        brand={<span className="font-semibold">ACME People</span>}
        links={[{ label: "Help" }, { label: "Privacy" }, { label: "Accessibility" }]}
        copyright="© 2026 ACME Corp. People & Culture."
      />
    </SiteRoot>
  );
}
