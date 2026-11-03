"use client";

/*
 * ADD-04 Phase E — ACME Billing (Billing Dashboard · Team Finance) — §4.4 row 1
 * หน้าเว็บจริงของทีม: top nav + filters + stat 4 ใบ + Revenue chart + Payment status + Recent invoices
 * ข้อมูลทั้งหมดเป็น mock (ไม่มี network call)
 */

import { useMemo, useState } from "react";
import { IconArrowRight, IconDownload, IconMail, IconPlus } from "../icons";
import {
  SITE_CONTAINER,
  StdAlert,
  StdBadge,
  StdBarChart,
  StdBrand,
  StdButton,
  StdCard,
  StdFooter,
  StdInput,
  StdNav,
  StdSegmented,
  StdStackedBar,
  StdStatCard,
  StdTable,
  type StdTableColumn,
} from "../std";
import { Muted, SiteHeading, SiteRoot } from "./site-shell";

interface Invoice {
  id: string;
  customer: string;
  due: string;
  amount: string;
  status: "Paid" | "Pending" | "Overdue";
}

const INVOICES: Invoice[] = [
  { id: "INV-4821", customer: "Northwind Logistics", due: "Nov 02, 2026", amount: "$24,600.00", status: "Paid" },
  { id: "INV-4820", customer: "Contoso Retail", due: "Oct 30, 2026", amount: "$12,150.00", status: "Pending" },
  { id: "INV-4817", customer: "Globex Manufacturing", due: "Oct 12, 2026", amount: "$38,120.00", status: "Overdue" },
  { id: "INV-4812", customer: "Initech Services", due: "Oct 09, 2026", amount: "$8,940.00", status: "Paid" },
];

/** Revenue by month ($k) — Dec 2025 → Nov 2026 (เดือนล่าสุด = Paid this month) */
const REVENUE = [
  { label: "Dec", value: 362 },
  { label: "Jan", value: 371 },
  { label: "Feb", value: 388 },
  { label: "Mar", value: 402 },
  { label: "Apr", value: 395 },
  { label: "May", value: 418 },
  { label: "Jun", value: 431 },
  { label: "Jul", value: 425 },
  { label: "Aug", value: 447 },
  { label: "Sep", value: 452 },
  { label: "Oct", value: 468 },
  { label: "Nov", value: 477 },
];

const PERIODS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-quarter", label: "This quarter" },
  { value: "this-year", label: "This year" },
];

const NAV = [
  { label: "Overview", active: true },
  { label: "Invoices" },
  { label: "Subscriptions" },
  { label: "Payment methods" },
  { label: "Reports" },
];

export function BillingSite() {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("this-month");
  const [applied, setApplied] = useState({ query: "", period: "this-month" });
  const [range, setRange] = useState("12");
  const [reminded, setReminded] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const periodLabel = PERIODS.find((p) => p.value === applied.period)?.label ?? "This month";
  const rows = useMemo(() => {
    const q = applied.query.trim().toLowerCase();
    if (!q) return INVOICES;
    return INVOICES.filter((r) => r.id.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q));
  }, [applied.query]);
  const chartData = range === "6" ? REVENUE.slice(-6) : REVENUE;

  const columns: StdTableColumn<Invoice>[] = [
    { key: "id", header: "Invoice", render: (r) => <span className="font-semibold">{r.id}</span>, nowrap: true },
    { key: "customer", header: "Customer", render: (r) => r.customer },
    { key: "due", header: "Due date", render: (r) => r.due, nowrap: true },
    { key: "amount", header: "Amount", render: (r) => r.amount, align: "end", nowrap: true },
    { key: "status", header: "Status", render: (r) => <StdBadge>{r.status}</StdBadge> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      nowrap: true,
      render: (r) => {
        const sent = reminded.includes(r.id);
        return (
          <span className="inline-flex items-center justify-end gap-3">
            <StdButton variant="text" size="sm" href="#" ariaLabel={`View ${r.id}`}>
              View
            </StdButton>
            {r.status === "Overdue" && (
              <StdButton
                variant="secondary"
                size="sm"
                disabled={sent}
                ariaLabel={sent ? `Reminder sent for ${r.id}` : `Send reminder for ${r.id}`}
                onClick={() => {
                  setReminded((prev) => [...prev, r.id]);
                  setNotice(`Reminder queued for ${r.id} (${r.customer}). Mock only, no email was sent.`);
                }}
              >
                {sent ? "Reminder sent" : "Send reminder"}
              </StdButton>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <SiteRoot>
      <StdNav
        ariaLabel="ACME Billing"
        brand={<StdBrand code="AB" name="ACME Billing" />}
        links={NAV}
        actions={
          <StdButton size="sm" iconStart={<IconPlus size={16} />} onClick={() => setNotice("New invoice draft opened. Mock only, nothing was saved.")}>
            New Invoice
          </StdButton>
        }
      />

      <div className={`${SITE_CONTAINER} flex flex-1 flex-col gap-6 py-6`}>
        <SiteHeading title="Billing overview" description={`Invoices, payments and cash flow · ${periodLabel}`} />

        <StdCard>
          <form
            className="grid gap-3 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] @3xl:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied({ query, period });
            }}
          >
            <StdInput
              type="search"
              label="Search invoices"
              placeholder="Invoice number or customer"
              value={query}
              onValueChange={setQuery}
            />
            <StdInput type="select" label="Period" value={period} onValueChange={setPeriod} options={PERIODS} />
            <div className="flex flex-wrap gap-2 @3xl:pb-0.5">
              <StdButton
                variant="secondary"
                iconStart={<IconDownload size={16} />}
                onClick={() => setNotice(`Export prepared for ${periodLabel}. Mock only, no file was generated.`)}
              >
                Export
              </StdButton>
              <StdButton type="submit">Apply</StdButton>
            </div>
          </form>
        </StdCard>

        <div aria-live="polite">
          {notice && (
            <StdAlert tone="success" title="Done">
              {notice}
            </StdAlert>
          )}
        </div>

        <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
          <StdStatCard label="Outstanding" value="$182,400" hint="12 invoices" badge={<StdBadge tone="warning">Pending</StdBadge>} />
          <StdStatCard label="Paid this month" value="$476,950" hint="+8.2% vs last month" badge={<StdBadge tone="success">Paid</StdBadge>} />
          <StdStatCard label="Overdue" value="$38,120" hint="5 invoices" badge={<StdBadge tone="danger">Overdue</StdBadge>} />
          <StdStatCard label="Avg. days to pay" value="27.4" hint="Target 30 days" badge={<StdBadge tone="neutral">Target</StdBadge>} />
        </div>

        <div className="grid gap-4 @5xl:grid-cols-3">
          <StdCard
            className="@5xl:col-span-2"
            title="Revenue by month"
            actions={
              <StdSegmented
                label="Revenue range"
                value={range}
                onChange={setRange}
                options={[
                  { value: "12", label: "12 months" },
                  { value: "6", label: "6 months" },
                ]}
              />
            }
          >
            <StdBarChart
              title={`Revenue by month, last ${range} months`}
              data={chartData}
              formatValue={(v) => `$${Math.round(v)}k`}
            />
          </StdCard>

          <StdCard title="Payment status">
            <p className="mb-3 text-sm">
              <Muted>Share of invoice value issued this month</Muted>
            </p>
            <StdStackedBar
              label="Payment status"
              segments={[
                { label: "Paid", value: 68, tone: "success" },
                { label: "Pending", value: 20, tone: "warning" },
                { label: "Overdue", value: 12, tone: "danger" },
              ]}
            />
            <div className="mt-4">
              <StdButton
                variant="secondary"
                fullWidth
                iconStart={<IconMail size={16} />}
                onClick={() => setNotice("Reminders queued for 5 overdue invoices. Mock only, no email was sent.")}
              >
                Send reminders
              </StdButton>
            </div>
          </StdCard>
        </div>

        <StdCard
          title="Recent invoices"
          actions={
            <StdButton variant="text" href="#" iconEnd={<IconArrowRight size={16} />}>
              View all
            </StdButton>
          }
        >
          <StdTable
            caption="Recent invoices"
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            minWidth={720}
            emptyMessage="No invoices match your search."
          />
        </StdCard>
      </div>

      <StdFooter
        variant="simple"
        brand={<span className="font-semibold">ACME Billing</span>}
        links={[{ label: "Overview" }, { label: "Invoices" }, { label: "Privacy" }, { label: "Terms" }]}
        copyright="© 2026 ACME Corp. All rights reserved."
      />
    </SiteRoot>
  );
}
