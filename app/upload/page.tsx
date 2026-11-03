"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importSite, getSites } from "../lib/mock-store";
import { useMock } from "../lib/use-mock";
import { Card, Button, Badge, StepFlow } from "../components/ui";

/*
 * ============================================================================
 * NOTE: หน้านี้เดิมอัปโหลดไฟล์จริงไป backend:
 *   const { project } = await api.createProject(name);
 *   const result = await api.upload(project.id, file);
 * ตอนนี้เปลี่ยนเป็น MOCK — เรียก importSite() ใน mock-store แทน
 * (จำลองการวิเคราะห์เสร็จทันที) โค้ดเดิมคอมเมนต์อ้างอิงไว้ด้านล่าง:
 *
 *   import { api } from "../lib/client";
 *   async function handleFile(file: File) {
 *     const { project } = await api.createProject(name || file.name...);
 *     const result = await api.upload(project.id, file);
 *     setValidation(result.validation);
 *   }
 * ============================================================================
 */

export default function UploadPage() {
  const router = useRouter();
  const sites = useMock(() => getSites());
  const [name, setName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function doImport(fileName?: string) {
    setBusy(true);
    const siteName = name || (fileName ? fileName.replace(/\.[^.]+$/, "") : `Website ${sites.length + 1}`);
    // จำลองดีเลย์การวิเคราะห์
    setTimeout(() => {
      const site = importSite(siteName);
      setBusy(false);
      router.push(`/sites/${site.id}`);
    }, 600);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    doImport(file?.name);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Website</h1>
        <p className="text-sm text-[var(--color-muted)]">
          รองรับ .zip ของโปรเจกต์ HTML/CSS (โหมด mock — ระบบจะจำลองการวิเคราะห์ให้อัตโนมัติ)
        </p>
      </div>

      <Card>
        <StepFlow
          steps={["Upload", "Analyze", "Detect", "Compare", "Standardize"]}
          current={0}
        />
      </Card>

      <Card>
        <label htmlFor="site-name" className="mb-2 block text-sm font-medium">ชื่อเว็บไซต์ (ไม่บังคับ)</label>
        <input
          id="site-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น Corporate Portal"
          className="mb-4 min-h-11 w-full rounded-[var(--radius-medium)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-medium)] border-2 border-dashed p-12 text-center transition-colors ${
            dragging ? "border-[var(--color-primary)] bg-[var(--color-secondary)]" : "border-[var(--color-border)]"
          }`}
        >
          <div className="flex gap-2 text-xs font-semibold text-[var(--color-muted)]">
            <span className="rounded bg-[var(--color-surface)] px-2 py-1">ZIP</span>
            <span className="rounded bg-[var(--color-surface)] px-2 py-1">HTML</span>
            <span className="rounded bg-[var(--color-surface)] px-2 py-1">CSS</span>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            {busy ? "กำลังวิเคราะห์โครงสร้าง…" : "ลากไฟล์มาวางที่นี่ หรือ"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".html,.htm,.css,.zip"
            className="hidden"
            onChange={(e) => doImport(e.target.files?.[0]?.name)}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={busy} variant="primary">
            {busy ? "Importing…" : "Upload Website"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">เว็บที่ import แล้ว ({sites.length})</h2>
        {sites.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">ยังไม่มีเว็บที่ import — ลากไฟล์หรือกดปุ่มด้านบนเพื่อเริ่ม</p>
        )}
        <div className="flex flex-wrap gap-2">
          {sites.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs"
            >
              {s.name}
              <Badge kind={s.status}>{s.status}</Badge>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
