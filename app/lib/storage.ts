import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Storage abstraction for binary/large artifacts (original uploads, extracted
 * project snapshots, generated output). Default implementation is the local
 * filesystem under ./storage. The interface is intentionally small so it can be
 * reimplemented over S3-compatible object storage without touching callers.
 */
export interface ObjectStorage {
  put(key: string, data: Buffer): Promise<string>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function safeKey(key: string): string {
  // Prevent any key from escaping the storage root.
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly root: string = STORAGE_ROOT) {}

  private full(key: string): string {
    return path.join(this.root, safeKey(key));
  }

  async put(key: string, data: Buffer): Promise<string> {
    const file = this.full(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.full(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.full(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.full(key), { force: true });
  }
}

export const storage: ObjectStorage = new LocalObjectStorage();
