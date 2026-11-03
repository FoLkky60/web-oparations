// Live end-to-end check against the running dev server (node, no test runner).
import JSZip from "jszip";

const BASE = "http://localhost:3000";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Team A</title>
<link rel="stylesheet" href="styles/main.css"></head>
<body>
  <nav class="topnav"><a href="/">Home</a><a href="/a">A</a><a href="/b">B</a></nav>
  <form class="login">
    <input type="text" class="field" placeholder="User">
    <button class="submit-btn">Submit</button>
  </form>
  <div class="action-button" onclick="go()" tabindex="0">Go</div>
  <div class="alert-error">Oops</div>
</body></html>`;

// #D71920 = color.primary of the active standard v3.2.1 (ADD-04 D-2; was #73493a of v1.0.0)
const CSS = `.submit-btn{background-color:#D71920;border-radius:4px;padding:8px;color:#fff;font-family:Georgia,serif;}
.field{border:1px solid #d9d9d9;border-radius:3px;padding:7px;}
.alert-error{background-color:#cc0000;color:#fff;}
.topnav{padding:16px;}`;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("PASS:", msg);
  }
}

const zip = new JSZip();
zip.file("index.html", HTML);
zip.file("styles/main.css", CSS);
const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

// 1. create
let r = await fetch(`${BASE}/api/projects`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Team A" }),
});
const { project } = await r.json();
assert(r.status === 201 && project.id, "create project");
const id = project.id;

// 2. upload
const form = new FormData();
form.append("file", new Blob([zipBuf], { type: "application/zip" }), "team-a.zip");
r = await fetch(`${BASE}/api/projects/${id}/upload`, { method: "POST", body: form });
let body = await r.json();
assert(r.status === 200 && body.validation.valid, "upload + validate ZIP");
assert(body.validation.entryPoint === "index.html", "entry point detected");

// 3. analyze
r = await fetch(`${BASE}/api/projects/${id}/analyze`, { method: "POST" });
body = await r.json();
const a = body.analysis;
assert(r.status === 200 && a.status === "completed", "analyze completes");
assert(a.summary.componentsDetected > 0, "components detected");

const submit = a.components.find((c) => c.source.classes.includes("submit-btn"));
assert(submit && submit.type === "button" && submit.classification.confidence === 1, "semantic button at full confidence");
const candidate = a.components.find((c) => c.source.classes.includes("action-button"));
assert(candidate && candidate.classification.method === "heuristic" && candidate.classification.confidence < 0.8, "div is only a candidate");
assert(a.components.some((c) => c.type === "navigation"), "navigation detected from structure");

const errColor = a.findings.find((f) => f.sourceValue === "#cc0000");
assert(errColor && errColor.severity === "info" && errColor.suggestedToken === null, "off-palette error color NOT forced to a token");

// 4. transform
r = await fetch(`${BASE}/api/projects/${id}/transform`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ categories: ["colors", "radius", "spacing", "typography", "components"] }),
});
body = await r.json();
const rep = body.report;
assert(r.status === 200 && ["success", "partial"].includes(rep.status), "transform completes");
assert(rep.changes.length > 0, "structured changes recorded");
assert(rep.validation.htmlReparsed && rep.validation.cssReparsed, "output re-parses");
assert(rep.validation.originalUnchanged, "original unchanged flag");
assert(rep.changes.some((c) => c.selector.includes("action-button") && c.status === "needs-review"), "candidate flagged needs-review");
assert(rep.changes.some((c) => c.rule === "map-color-token" && c.after.includes("--color-primary")), "primary color mapped to token");

// 5. export
r = await fetch(`${BASE}/api/projects/${id}/export?version=${body.version}`);
assert(r.status === 200 && r.headers.get("content-type") === "application/zip", "export returns a zip");
const outBuf = Buffer.from(await r.arrayBuffer());
const outZip = await JSZip.loadAsync(outBuf);
const outCss = await outZip.file("styles/main.css").async("string");
const outHtml = await outZip.file("index.html").async("string");
const tokens = outZip.file("styles/ds-tokens.css");
assert(outCss.includes("var(--color-primary)"), "exported CSS uses token var");
assert(outCss.includes("#cc0000"), "exported CSS preserves error color");
assert(outHtml.includes("ds-button"), "exported HTML has standardized class");
assert(tokens, "exported project includes ds-tokens.css");

// 6. original unchanged: re-export original path indirectly via analysis staying same
r = await fetch(`${BASE}/api/projects/${id}`);
body = await r.json();
assert(body.transformations.length >= 1 && body.versions.length >= 2, "history: original + standardized versions");

// 7. malicious upload rejected
const bad = new JSZip();
bad.file("../../../etc/passwd", "root");
bad.file("index.html", "<html></html>");
const badBuf = await bad.generateAsync({ type: "nodebuffer" });
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "evil" }) });
const evil = (await r.json()).project;
const badForm = new FormData();
badForm.append("file", new Blob([badBuf], { type: "application/zip" }), "evil.zip");
r = await fetch(`${BASE}/api/projects/${evil.id}/upload`, { method: "POST", body: badForm });
body = await r.json();
assert(r.status === 422 && !body.validation.valid, "malicious archive rejected");

console.log(process.exitCode ? "\nE2E FAILED" : "\nE2E PASSED");
