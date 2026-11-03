import JSZip from "jszip";

/**
 * Representative test projects from different "teams" with inconsistent naming,
 * semantic vs non-semantic markup, conflicting CSS and ambiguous custom elements.
 */

export const TEAM_A_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Team A</title>
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <nav class="topnav">
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <main>
    <h1 class="title">Welcome</h1>
    <form class="login">
      <input type="text" class="field" placeholder="Username">
      <input type="password" class="field" placeholder="Password">
      <button class="submit-btn">Submit</button>
    </form>
    <div class="action-button" onclick="go()" tabindex="0">Go</div>
    <div class="notice alert-error">Something went wrong</div>
  </main>
</body>
</html>`;

export const TEAM_A_CSS = `:root { --legacy: #ff0000; }
.submit-btn {
  background-color: #73493a;
  border-radius: 4px;
  padding: 8px;
  font-family: "Helvetica Neue", Arial, sans-serif;
  color: #ffffff;
}
.submit-btn:hover { background-color: #5a3a2e; }
.field {
  border: 1px solid #d9d9d9;
  padding: 7px;
  border-radius: 3px;
}
.alert-error {
  background-color: #cc0000; /* off-palette: must NOT become primary */
  color: #ffffff;
}
.title { font-family: Georgia, serif; font-size: 32px; }
.topnav { padding: 16px; }
`;

/** Team B uses a non-semantic button and nearly-but-not-exactly token values. */
export const TEAM_B_HTML = `<!DOCTYPE html>
<html>
<head><title>Team B</title><link rel="stylesheet" href="app.css"></head>
<body>
  <div class="card">
    <h2>Card Title</h2>
    <p>Body text inside a card.</p>
    <span class="btn cta" onclick="buy()">Buy now</span>
  </div>
</body>
</html>`;

export const TEAM_B_CSS = `.card {
  border-radius: 9px;      /* near radius.medium (8px) */
  padding: 15px;           /* near spacing.medium (16px) but not exact */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.btn {
  background: #744a3b;      /* near color.primary #73493A */
  color: #fff;
}
`;

export async function makeZip(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function maliciousZip(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("../../../etc/passwd", "root:x:0:0");
  zip.file("index.html", "<html></html>");
  zip.file("payload.sh", "#!/bin/sh\nrm -rf /");
  return zip.generateAsync({ type: "nodebuffer" });
}
