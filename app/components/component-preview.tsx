"use client";

import type { DetectedComponent, ComponentStyle } from "../lib/mock-types";

/**
 * แสดงตัวอย่าง component ตาม style ที่กำหนด
 * ข้อความ (label/text) จะถูกคงไว้เสมอ — เปลี่ยนเฉพาะ "หน้าตา" (style)
 */
export function ComponentPreview({
  component,
  style,
}: {
  component: DetectedComponent;
  style: ComponentStyle;
}) {
  const base: React.CSSProperties = {
    background: style.background,
    color: style.color,
    borderRadius: style.borderRadius,
    padding: style.padding,
    fontWeight: Number(style.fontWeight),
    fontSize: style.fontSize,
    border: style.borderColor ? `1px solid ${style.borderColor}` : undefined,
    boxShadow: style.shadow,
  };

  switch (component.type) {
    case "button":
      return (
        <button type="button" style={base} className="inline-flex cursor-default items-center">
          {component.label}
        </button>
      );

    case "navbar":
      return (
        <div style={base} className="flex w-full items-center gap-4">
          <span className="font-bold">{component.label}</span>
          <span className="opacity-80">Home</span>
          <span className="opacity-80">About</span>
          <span className="opacity-80">Contact</span>
        </div>
      );

    case "input":
      return (
        <div className="w-full">
          <label className="mb-1 block text-xs text-[var(--color-muted)]">{component.label}</label>
          <div style={base} className="w-full text-[var(--color-muted)]">
            {component.label}…
          </div>
        </div>
      );

    case "card":
      return (
        <div style={base} className="w-full max-w-xs">
          <div>{component.label}</div>
          {component.text && (
            <div className="mt-2 text-sm font-normal opacity-80">{component.text}</div>
          )}
        </div>
      );

    default:
      return (
        <div style={base} className="w-full">
          {component.label}
        </div>
      );
  }
}
