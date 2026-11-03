import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Project,
  ProjectVersion,
  AnalysisResult,
  TransformationReport,
  Approval,
  User,
  Session,
  AuditEntry,
  DesignSystemVersion,
} from "@shared/index";

/**
 * Persistence abstraction for project metadata and job results.
 *
 * The default implementation stores a JSON document per project on the local
 * filesystem. The interface is shaped to map 1:1 onto a Prisma/PostgreSQL
 * implementation later (see prisma/schema.prisma): each method corresponds to a
 * table operation. Swapping to Prisma means re-implementing this interface, not
 * changing any caller.
 */

export interface StoredTransformation {
  version: number;
  report: TransformationReport;
  storageReference: string; // storage key for the output ZIP
  createdAt: string;
}

export interface ProjectRecord {
  project: Project;
  versions: ProjectVersion[];
  analysis: AnalysisResult | null;
  transformations: StoredTransformation[];
  /** Review/approval records keyed by transformation version. Added Phase 3. */
  approvals: Approval[];
}

export interface Repository {
  createProject(p: Project): Promise<Project>;
  getProject(id: string): Promise<ProjectRecord | null>;
  listProjects(): Promise<Project[]>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  saveAnalysis(id: string, analysis: AnalysisResult): Promise<void>;
  addVersion(id: string, version: ProjectVersion): Promise<void>;
  addTransformation(id: string, t: StoredTransformation): Promise<void>;
  addApproval(id: string, approval: Approval): Promise<void>;
  updateApproval(
    id: string,
    approvalId: string,
    patch: Partial<Approval>,
  ): Promise<Approval>;
}

const DATA_ROOT = path.join(process.cwd(), "storage", "db");

/** Backfill fields that may be absent in JSON written by earlier versions. */
function normalizeRecord(raw: Partial<ProjectRecord> & { project: Project }): ProjectRecord {
  return {
    project: raw.project,
    versions: raw.versions ?? [],
    analysis: raw.analysis ?? null,
    transformations: raw.transformations ?? [],
    approvals: raw.approvals ?? [],
  };
}

export class FileRepository implements Repository {
  constructor(private readonly root: string = DATA_ROOT) {}

  private file(id: string): string {
    return path.join(this.root, `${id}.json`);
  }

  private async readAll(): Promise<ProjectRecord[]> {
    try {
      const names = await fs.readdir(this.root);
      const records: ProjectRecord[] = [];
      for (const n of names) {
        if (!n.endsWith(".json")) continue;
        const raw = await fs.readFile(path.join(this.root, n), "utf8");
        records.push(normalizeRecord(JSON.parse(raw)));
      }
      return records;
    } catch {
      return [];
    }
  }

  private async read(id: string): Promise<ProjectRecord | null> {
    try {
      const raw = await fs.readFile(this.file(id), "utf8");
      return normalizeRecord(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  private async write(record: ProjectRecord): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
    await fs.writeFile(this.file(record.project.id), JSON.stringify(record, null, 2));
  }

  async createProject(p: Project): Promise<Project> {
    const record: ProjectRecord = {
      project: p,
      versions: [],
      analysis: null,
      transformations: [],
      approvals: [],
    };
    await this.write(record);
    return p;
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    return this.read(id);
  }

  async listProjects(): Promise<Project[]> {
    const all = await this.readAll();
    return all
      .map((r) => r.project)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    const record = await this.read(id);
    if (!record) throw new Error(`Project ${id} not found`);
    record.project = { ...record.project, ...patch, updatedAt: new Date().toISOString() };
    await this.write(record);
    return record.project;
  }

  async deleteProject(id: string): Promise<void> {
    await fs.rm(this.file(id), { force: true });
  }

  async saveAnalysis(id: string, analysis: AnalysisResult): Promise<void> {
    const record = await this.read(id);
    if (!record) throw new Error(`Project ${id} not found`);
    record.analysis = analysis;
    await this.write(record);
  }

  async addVersion(id: string, version: ProjectVersion): Promise<void> {
    const record = await this.read(id);
    if (!record) throw new Error(`Project ${id} not found`);
    record.versions.push(version);
    await this.write(record);
  }

  async addTransformation(id: string, t: StoredTransformation): Promise<void> {
    const record = await this.read(id);
    if (!record) throw new Error(`Project ${id} not found`);
    record.transformations.push(t);
    await this.write(record);
  }

  async addApproval(id: string, approval: Approval): Promise<void> {
    const record = await this.read(id);
    if (!record) throw new Error(`Project ${id} not found`);
    record.approvals.push(approval);
    await this.write(record);
  }

  async updateApproval(
    id: string,
    approvalId: string,
    patch: Partial<Approval>,
  ): Promise<Approval> {
    const record = await this.read(id);
    if (!record) throw new Error(`Project ${id} not found`);
    const idx = record.approvals.findIndex((a) => a.id === approvalId);
    if (idx === -1) throw new Error(`Approval ${approvalId} not found`);
    record.approvals[idx] = { ...record.approvals[idx], ...patch };
    await this.write(record);
    return record.approvals[idx];
  }
}

export const repository: Repository = new FileRepository();

// ---------------------------------------------------------------------------
// User repository (storage/db/users.json)
// ---------------------------------------------------------------------------

export interface UserRepository {
  list(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User>;
}

const USERS_FILE = path.join(DATA_ROOT, "users.json");

export class FileUserRepository implements UserRepository {
  constructor(private readonly file: string = USERS_FILE) {}

  private async readAll(): Promise<User[]> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as User[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(users: User[]): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(users, null, 2));
  }

  async list(): Promise<User[]> {
    return this.readAll();
  }

  async getById(id: string): Promise<User | null> {
    return (await this.readAll()).find((u) => u.id === id) ?? null;
  }

  async getByUsername(username: string): Promise<User | null> {
    return (await this.readAll()).find((u) => u.username === username) ?? null;
  }

  async create(user: User): Promise<User> {
    const users = await this.readAll();
    if (users.some((u) => u.username === user.username)) {
      throw new Error(`User "${user.username}" already exists`);
    }
    users.push(user);
    await this.writeAll(users);
    return user;
  }

  async update(id: string, patch: Partial<User>): Promise<User> {
    const users = await this.readAll();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error(`User ${id} not found`);
    users[idx] = { ...users[idx], ...patch };
    await this.writeAll(users);
    return users[idx];
  }
}

export const userRepository: UserRepository = new FileUserRepository();

// ---------------------------------------------------------------------------
// Session repository (storage/sessions/<sid>.json)
// ---------------------------------------------------------------------------

export interface SessionRepository {
  get(id: string): Promise<Session | null>;
  create(session: Session): Promise<Session>;
  delete(id: string): Promise<void>;
}

const SESSIONS_ROOT = path.join(process.cwd(), "storage", "sessions");

/** Reject session ids that are not plain tokens (defense against path escape). */
function safeSessionId(id: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("Invalid session id");
  }
  return id;
}

export class FileSessionRepository implements SessionRepository {
  constructor(private readonly root: string = SESSIONS_ROOT) {}

  private file(id: string): string {
    return path.join(this.root, `${safeSessionId(id)}.json`);
  }

  async get(id: string): Promise<Session | null> {
    try {
      const raw = await fs.readFile(this.file(id), "utf8");
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  async create(session: Session): Promise<Session> {
    await fs.mkdir(this.root, { recursive: true });
    await fs.writeFile(this.file(session.id), JSON.stringify(session, null, 2));
    return session;
  }

  async delete(id: string): Promise<void> {
    await fs.rm(this.file(id), { force: true });
  }
}

export const sessionRepository: SessionRepository = new FileSessionRepository();

// ---------------------------------------------------------------------------
// Audit repository (append-only storage/audit/log.jsonl)
// ---------------------------------------------------------------------------

export interface AuditQuery {
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
}

export interface AuditRepository {
  append(entry: AuditEntry): Promise<void>;
  query(filter?: AuditQuery): Promise<AuditEntry[]>;
}

const AUDIT_FILE = path.join(process.cwd(), "storage", "audit", "log.jsonl");

export class FileAuditRepository implements AuditRepository {
  constructor(private readonly file: string = AUDIT_FILE) {}

  async append(entry: AuditEntry): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.appendFile(this.file, JSON.stringify(entry) + "\n");
  }

  async query(filter?: AuditQuery): Promise<AuditEntry[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.file, "utf8");
    } catch {
      return [];
    }
    const entries = raw
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as AuditEntry);

    const filtered = entries.filter((e) => {
      if (filter?.action && e.action !== filter.action) return false;
      if (filter?.actorId && e.actorId !== filter.actorId) return false;
      if (filter?.from && e.timestamp < filter.from) return false;
      if (filter?.to && e.timestamp > filter.to) return false;
      return true;
    });

    // Most recent first.
    return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

export const auditRepository: AuditRepository = new FileAuditRepository();

// ---------------------------------------------------------------------------
// Design system version repository
// (storage/design-system/<version>.json + active.json)
// ---------------------------------------------------------------------------

export interface DesignSystemRepository {
  list(): Promise<DesignSystemVersion[]>;
  get(version: string): Promise<DesignSystemVersion | null>;
  getActive(): Promise<DesignSystemVersion | null>;
  /** Persist a new immutable version and mark it active (deactivating others). */
  create(version: DesignSystemVersion): Promise<DesignSystemVersion>;
  isEmpty(): Promise<boolean>;
}

const DS_ROOT = path.join(process.cwd(), "storage", "design-system");

/** Only allow version ids that are safe as filenames. */
function safeVersionId(version: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(version)) {
    throw new Error("Invalid design system version id");
  }
  return version;
}

interface ActivePointer {
  version: string;
}

export class FileDesignSystemRepository implements DesignSystemRepository {
  constructor(private readonly root: string = DS_ROOT) {}

  private versionFile(version: string): string {
    return path.join(this.root, `${safeVersionId(version)}.json`);
  }

  private get activeFile(): string {
    return path.join(this.root, "active.json");
  }

  async list(): Promise<DesignSystemVersion[]> {
    try {
      const names = await fs.readdir(this.root);
      const out: DesignSystemVersion[] = [];
      for (const n of names) {
        if (!n.endsWith(".json") || n === "active.json") continue;
        const raw = await fs.readFile(path.join(this.root, n), "utf8");
        out.push(JSON.parse(raw) as DesignSystemVersion);
      }
      return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
      return [];
    }
  }

  async get(version: string): Promise<DesignSystemVersion | null> {
    try {
      const raw = await fs.readFile(this.versionFile(version), "utf8");
      return JSON.parse(raw) as DesignSystemVersion;
    } catch {
      return null;
    }
  }

  async getActive(): Promise<DesignSystemVersion | null> {
    try {
      const raw = await fs.readFile(this.activeFile, "utf8");
      const ptr = JSON.parse(raw) as ActivePointer;
      return this.get(ptr.version);
    } catch {
      return null;
    }
  }

  async create(version: DesignSystemVersion): Promise<DesignSystemVersion> {
    await fs.mkdir(this.root, { recursive: true });
    if (await this.get(version.version)) {
      throw new Error(`Design system version "${version.version}" already exists`);
    }

    // Deactivate all previously stored versions (single-active invariant).
    const existing = await this.list();
    for (const v of existing) {
      if (v.active) {
        await fs.writeFile(
          this.versionFile(v.version),
          JSON.stringify({ ...v, active: false }, null, 2),
        );
      }
    }

    const stored: DesignSystemVersion = { ...version, active: true };
    await fs.writeFile(this.versionFile(stored.version), JSON.stringify(stored, null, 2));
    const ptr: ActivePointer = { version: stored.version };
    await fs.writeFile(this.activeFile, JSON.stringify(ptr, null, 2));
    return stored;
  }

  async isEmpty(): Promise<boolean> {
    return (await this.list()).length === 0;
  }
}

export const designSystemRepository: DesignSystemRepository =
  new FileDesignSystemRepository();
