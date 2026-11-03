import JSZip from "jszip";
import { ProjectWorkspace, classifyFileKind } from "@core/index";

/** Serialize a workspace into a ZIP buffer for storage/export. */
export async function workspaceToZip(ws: ProjectWorkspace): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of ws.list()) {
    if (f.binary) zip.file(f.path, f.binary);
    else zip.file(f.path, f.text ?? "");
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

/** Rebuild a workspace from a stored ZIP buffer (trusted: we wrote it). */
export async function zipToWorkspace(buf: Buffer): Promise<ProjectWorkspace> {
  const zip = await JSZip.loadAsync(buf);
  const ws = new ProjectWorkspace();
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const kind = classifyFileKind(entry.name);
    const data = await entry.async("uint8array");
    if (kind === "html" || kind === "css" || kind === "js") {
      ws.add({ path: entry.name, kind, text: Buffer.from(data).toString("utf8"), size: data.byteLength });
    } else {
      ws.add({ path: entry.name, kind, binary: Buffer.from(data), size: data.byteLength });
    }
  }
  return ws;
}
