import { createHash, randomBytes } from "node:crypto";
import { mkdir, open, opendir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

import { z } from "zod";
import { parse, stringify } from "yaml";

import {
  HistoryFileSchema,
  HistorySourceSchema,
  STRIPE_HISTORY_HISTORY_SCHEMA_VERSION,
  type HistorySource,
} from "../lib/history-schema";
import {
  AppearanceFileSchema,
  ResearchCollectionsFileSchema,
  ResearchSourceCatalogSchema,
  ResearchSourceSchema,
  STRIPE_HISTORY_SOURCE_CATALOG_SCHEMA_VERSION,
  ValuationFileSchema,
  type ResearchSource,
} from "../lib/research-schema";
import {
  canonicalResearchSourceIdentity,
  literalResearchSourceIdentity,
  stableResearchSourceId,
} from "../lib/research-source-identity";

const LegacyHistoryFileSchema = z.object({
  category: z.unknown(),
  events: z.array(z.object({
    source_ids: z.array(z.string()).optional(),
    sources: z.array(HistorySourceSchema).optional(),
  }).passthrough()),
  schema: z.string(),
}).passthrough();

const MIGRATION_TRANSACTION_DIRECTORY = ".stripe-history-source-migration-v1";
const MIGRATION_TRANSACTION_SCHEMA = "stripe-history/history-source-migration/v1";
const MIGRATION_LOCK_DIRECTORY = ".stripe-history-source-migration-lock-v1";
const MIGRATION_LOCK_SCHEMA = "stripe-history/history-source-migration-lock/v1";
const MIGRATION_RECLAIM_DIRECTORY_PREFIX =
  ".stripe-history-source-migration-reclaim-v1";
const MAX_CORPUS_FILE_BYTES = 16 * 1024 * 1024;
const MAX_HISTORY_FILES = 1_000;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_OWNER_BYTES = 4 * 1024;
const OWNER_TOKEN_PATTERN = /^[a-f0-9]{32}$/u;
const MigrationOwnerSchema = z.strictObject({
  pid: z.number().int().positive(),
  schema: z.literal(MIGRATION_LOCK_SCHEMA),
  token: z.string().regex(OWNER_TOKEN_PATTERN),
});
const MigrationTransactionSchema = z.strictObject({
  entries: z.array(z.strictObject({
    hadOriginal: z.boolean(),
    nextSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    originalSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
    relativePath: z.string().regex(
      /^(?:history\/[a-z0-9-]+\.yml|research\/sources\.yml)$/u,
    ),
  })).min(1).max(1_001),
  ownerToken: z.string().regex(OWNER_TOKEN_PATTERN),
  schema: z.literal(MIGRATION_TRANSACTION_SCHEMA),
}).superRefine((transaction, context) => {
  const paths = transaction.entries.map(({ relativePath }) => relativePath);
  if (new Set(paths).size !== paths.length) {
    context.addIssue({ code: "custom", message: "Transaction paths must be unique" });
  }
  for (const [index, entry] of transaction.entries.entries()) {
    if (entry.hadOriginal !== (entry.originalSha256 !== undefined)) {
      context.addIssue({
        code: "custom",
        message: "Original digest must agree with hadOriginal",
        path: ["entries", index, "originalSha256"],
      });
    }
  }
});

interface MigrationOutput {
  readonly contents: string;
  readonly expectedOriginalSha256: string | undefined;
  readonly relativePath: string;
}

interface MigrationOwnershipHooks {
  readonly afterStaleOwnerRead?: (ownerToken: string) => Promise<void>;
}

const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const publicPath = (projectDirectory: string, relativePath: string): string => {
  const publicDirectory = resolve(projectDirectory, "public");
  const target = resolve(publicDirectory, relativePath);
  const fromPublic = relative(publicDirectory, target);
  if (fromPublic.startsWith("..") || fromPublic === "") {
    throw new Error(`Unsafe migration path ${relativePath}`);
  }
  return target;
};

const mediaType = (
  source: HistorySource,
): ResearchSource["media_type"] => {
  const host = new URL(source.url).hostname.toLowerCase();
  if (/\.pdf(?:$|[?#])/u.test(source.url)) return "pdf";
  if (source.kind === "filing") return "filing";
  if (
    host === "youtube.com"
    || host.endsWith(".youtube.com")
    || host === "youtu.be"
    || source.url.includes("/video/")
  ) return "video";
  if (
    host.includes("podcast")
    || host === "podcasts.apple.com"
    || host === "open.spotify.com"
  ) return "podcast";
  return "article";
};

const preferredText = (values: readonly string[]): string => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].toSorted((left, right) =>
    (right[1] - left[1])
    || (right[0].length - left[0].length)
    || left[0].localeCompare(right[0])
  )[0]?.[0] ?? "";
};

const writeAtomic = async (
  path: string,
  contents: string | Uint8Array,
): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  await writeFile(temporaryPath, contents, { mode: 0o644 });
  await rename(temporaryPath, path);
};

const readBoundedFile = async (
  path: string,
  maximumBytes = MAX_CORPUS_FILE_BYTES,
): Promise<Buffer> => {
  const handle = await open(path, "r");
  try {
    const { size } = await handle.stat();
    if (!Number.isSafeInteger(size) || size < 0 || size > maximumBytes) {
      throw new Error(`${basename(path)} exceeds the ${maximumBytes}-byte migration limit`);
    }
    const buffer = Buffer.alloc(size + 1);
    let totalBytesRead = 0;
    while (totalBytesRead < buffer.byteLength) {
      const { bytesRead } = await handle.read(
        buffer,
        totalBytesRead,
        buffer.byteLength - totalBytesRead,
        totalBytesRead,
      );
      if (bytesRead === 0) break;
      totalBytesRead += bytesRead;
    }
    if (totalBytesRead !== size) {
      throw new Error(`${basename(path)} changed while the migration was reading it`);
    }
    return buffer.subarray(0, totalBytesRead);
  } finally {
    await handle.close();
  }
};

const readOptionalFile = async (
  path: string,
  maximumBytes = MAX_CORPUS_FILE_BYTES,
): Promise<Buffer | undefined> => {
  try {
    return await readBoundedFile(path, maximumBytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

const transactionDirectory = (projectDirectory: string): string =>
  join(projectDirectory, "public", MIGRATION_TRANSACTION_DIRECTORY);

const lockDirectory = (projectDirectory: string): string =>
  join(projectDirectory, "public", MIGRATION_LOCK_DIRECTORY);

function isDeadProcessTombstoneName(name: string): boolean {
  return /^(?:\.stripe-history-source-migration-v1|\.stripe-history-source-migration-lock-v1)\.[a-f0-9]{32}\.tombstone$/u
    .test(name)
    || /^\.stripe-history-source-migration-reclaim-v1\.[a-f0-9]{32}\.[a-f0-9]{32}\.tombstone$/u
      .test(name);
}

async function cleanOrphanedMigrationArtifacts(publicDirectory: string): Promise<void> {
  const directory = await opendir(publicDirectory);
  for await (const entry of directory) {
    if (entry.isDirectory() && isDeadProcessTombstoneName(entry.name)) {
      await rm(join(publicDirectory, entry.name), { force: true, recursive: true });
    }
  }
}

async function removeOwnedTombstones(
  publicDirectory: string,
  token: string,
): Promise<void> {
  const directory = await opendir(publicDirectory);
  for await (const entry of directory) {
    if (
      entry.isDirectory()
      && entry.name.endsWith(`.${token}.tombstone`)
      && (
        entry.name.startsWith(`${MIGRATION_TRANSACTION_DIRECTORY}.`)
        || entry.name.startsWith(`${MIGRATION_LOCK_DIRECTORY}.`)
      )
    ) {
      await rm(join(publicDirectory, entry.name), { force: true, recursive: true });
    }
  }
}

async function tombstoneAndRemoveDirectory(
  directory: string,
  token: string,
): Promise<void> {
  const tombstone = `${directory}.${token}.tombstone`;
  await rename(directory, tombstone);
  await rm(tombstone, { force: true, recursive: true });
}

const reclamationDirectory = (
  projectDirectory: string,
  staleOwnerToken: string,
): string => join(
  projectDirectory,
  "public",
  `${MIGRATION_RECLAIM_DIRECTORY_PREFIX}.${staleOwnerToken}`,
);

async function acquireStaleReclamationGuard(
  projectDirectory: string,
  staleOwnerToken: string,
  contenderToken: string,
): Promise<boolean> {
  const directory = reclamationDirectory(projectDirectory, staleOwnerToken);
  const preparation = `${directory}.${contenderToken}.prepare`;
  await mkdir(preparation, { recursive: false });
  await writeFile(join(preparation, "owner.json"), JSON.stringify({
    pid: process.pid,
    schema: MIGRATION_LOCK_SCHEMA,
    token: contenderToken,
  }), { mode: 0o644 });
  try {
    await rename(preparation, directory);
    return true;
  } catch (error) {
    await rm(preparation, { force: true, recursive: true });
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST" && code !== "ENOTEMPTY") throw error;
    return false;
  }
}

async function releaseStaleReclamationGuard(
  projectDirectory: string,
  staleOwnerToken: string,
  contenderToken: string,
): Promise<void> {
  const directory = reclamationDirectory(projectDirectory, staleOwnerToken);
  const owner = MigrationOwnerSchema.parse(JSON.parse(
    (await readBoundedFile(join(directory, "owner.json"), MAX_OWNER_BYTES))
      .toString("utf8"),
  ) as unknown);
  if (owner.token !== contenderToken || owner.pid !== process.pid) {
    throw new Error("History source migration reclamation ownership changed unexpectedly");
  }
  await tombstoneAndRemoveDirectory(directory, contenderToken);
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    throw error;
  }
}

async function acquireMigrationOwnership(
  projectDirectory: string,
  hooks: MigrationOwnershipHooks = {},
): Promise<Readonly<{ token: string }>> {
  const publicDirectory = join(projectDirectory, "public");
  const directory = lockDirectory(projectDirectory);
  await mkdir(publicDirectory, { recursive: true });
  await cleanOrphanedMigrationArtifacts(publicDirectory);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = randomBytes(16).toString("hex");
    const preparation = `${directory}.${token}.prepare`;
    await mkdir(preparation, { recursive: false });
    await writeFile(join(preparation, "owner.json"), JSON.stringify({
      pid: process.pid,
      schema: MIGRATION_LOCK_SCHEMA,
      token,
    }), { mode: 0o644 });
    try {
      await rename(preparation, directory);
      await removeOwnedTombstones(publicDirectory, token);
      return { token };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "ENOTEMPTY") {
        await rm(preparation, { force: true, recursive: true });
        throw error;
      }
    }

    const ownerBytes = await readOptionalFile(
      join(directory, "owner.json"),
      MAX_OWNER_BYTES,
    );
    if (ownerBytes === undefined) {
      await rm(preparation, { force: true, recursive: true });
      continue;
    }
    const owner = MigrationOwnerSchema.parse(
      JSON.parse(ownerBytes.toString("utf8")) as unknown,
    );
    if (processIsAlive(owner.pid)) {
      await rm(preparation, { force: true, recursive: true });
      throw new Error(
        `History source migration is already owned by live process ${owner.pid}`,
      );
    }
    await hooks.afterStaleOwnerRead?.(owner.token);

    const ownsReclamation = await acquireStaleReclamationGuard(
      projectDirectory,
      owner.token,
      token,
    );
    if (!ownsReclamation) {
      await rm(preparation, { force: true, recursive: true });
      const guardOwnerBytes = await readOptionalFile(
        join(reclamationDirectory(projectDirectory, owner.token), "owner.json"),
        MAX_OWNER_BYTES,
      );
      if (guardOwnerBytes === undefined) continue;
      const guardOwner = MigrationOwnerSchema.parse(
        JSON.parse(guardOwnerBytes.toString("utf8")) as unknown,
      );
      if (processIsAlive(guardOwner.pid)) {
        throw new Error(
          `History source migration stale lock is already being reclaimed by live process ${guardOwner.pid}`,
        );
      }
      throw new Error(
        `History source migration stale reclamation guard ${guardOwner.token} has no live owner; inspect it before retrying`,
      );
    }
    let acquired = false;
    try {
      const currentOwnerBytes = await readOptionalFile(
        join(directory, "owner.json"),
        MAX_OWNER_BYTES,
      );
      if (currentOwnerBytes === undefined) continue;
      const currentOwner = MigrationOwnerSchema.parse(
        JSON.parse(currentOwnerBytes.toString("utf8")) as unknown,
      );
      if (currentOwner.token !== owner.token) {
        if (processIsAlive(currentOwner.pid)) {
          throw new Error(
            `History source migration is already owned by live process ${currentOwner.pid}`,
          );
        }
        continue;
      }
      if (processIsAlive(currentOwner.pid)) {
        throw new Error(
          `History source migration is already owned by live process ${currentOwner.pid}`,
        );
      }

      await tombstoneAndRemoveDirectory(directory, token);
      try {
        await rename(preparation, directory);
        acquired = true;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EEXIST" && code !== "ENOTEMPTY") throw error;
      }
    } finally {
      await releaseStaleReclamationGuard(projectDirectory, owner.token, token);
      if (!acquired) {
        await rm(preparation, { force: true, recursive: true });
      }
    }
    if (acquired) {
      await removeOwnedTombstones(publicDirectory, token);
      return { token };
    }
  }
  throw new Error("Could not acquire history source migration ownership");
}

async function releaseMigrationOwnership(
  projectDirectory: string,
  token: string,
): Promise<void> {
  const directory = lockDirectory(projectDirectory);
  const owner = MigrationOwnerSchema.parse(JSON.parse(
    (await readBoundedFile(join(directory, "owner.json"), MAX_OWNER_BYTES))
      .toString("utf8"),
  ) as unknown);
  if (owner.token !== token || owner.pid !== process.pid) {
    throw new Error("History source migration ownership changed unexpectedly");
  }
  await tombstoneAndRemoveDirectory(directory, token);
}

async function withMigrationOwnership<T>(
  projectDirectory: string,
  operation: (token: string) => Promise<T>,
  hooks: MigrationOwnershipHooks = {},
): Promise<T> {
  const { token } = await acquireMigrationOwnership(projectDirectory, hooks);
  try {
    return await operation(token);
  } finally {
    await releaseMigrationOwnership(projectDirectory, token);
  }
}

export async function withMigrationOwnershipForTest<T>(
  projectDirectory: string,
  operation: (token: string) => Promise<T>,
  hooks: MigrationOwnershipHooks = {},
): Promise<T> {
  return withMigrationOwnership(projectDirectory, operation, hooks);
}

async function recoverPendingHistorySourceMigrationOwned(
  projectDirectory: string,
  ownerToken: string,
): Promise<boolean> {
  const directory = transactionDirectory(projectDirectory);
  const manifestBytes = await readOptionalFile(
    join(directory, "manifest.json"),
    MAX_MANIFEST_BYTES,
  );
  if (manifestBytes === undefined) return false;
  const transaction = MigrationTransactionSchema.parse(
    JSON.parse(manifestBytes.toString("utf8")) as unknown,
  );
  for (const entry of transaction.entries.toReversed()) {
    const target = publicPath(projectDirectory, entry.relativePath);
    const current = await readOptionalFile(target);
    const currentSha256 = current === undefined ? undefined : sha256(current);
    if (!entry.hadOriginal) {
      if (currentSha256 === undefined) continue;
      if (currentSha256 !== entry.nextSha256) {
        throw new Error(
          `Migration recovery digest precondition failed for ${entry.relativePath}`,
        );
      }
      await rm(target);
      if (await readOptionalFile(target) !== undefined) {
        throw new Error(`Migration recovery could not remove ${entry.relativePath}`);
      }
      continue;
    }
    const backup = await readBoundedFile(
      join(directory, "original", entry.relativePath),
    );
    if (sha256(backup) !== entry.originalSha256) {
      throw new Error(`Migration backup digest mismatch for ${entry.relativePath}`);
    }
    if (currentSha256 === entry.originalSha256) continue;
    if (currentSha256 !== entry.nextSha256) {
      throw new Error(
        `Migration recovery digest precondition failed for ${entry.relativePath}`,
      );
    }
    await writeAtomic(target, backup);
    const restored = await readBoundedFile(target);
    if (sha256(restored) !== entry.originalSha256) {
      throw new Error(`Migration recovery digest mismatch for ${entry.relativePath}`);
    }
  }
  await tombstoneAndRemoveDirectory(directory, ownerToken);
  return true;
}

export async function recoverPendingHistorySourceMigration(
  projectDirectory = process.cwd(),
): Promise<boolean> {
  return withMigrationOwnership(projectDirectory, (ownerToken) =>
    recoverPendingHistorySourceMigrationOwned(projectDirectory, ownerToken)
  );
}

async function installMigrationTransaction(
  projectDirectory: string,
  outputs: readonly MigrationOutput[],
  ownerToken: string,
): Promise<void> {
  const publicDirectory = join(projectDirectory, "public");
  const directory = transactionDirectory(projectDirectory);
  const preparationDirectory = join(
    publicDirectory,
    `${MIGRATION_TRANSACTION_DIRECTORY}.${ownerToken}.prepare`,
  );
  let ownsTransaction = false;
  await rm(preparationDirectory, { force: true, recursive: true });
  await mkdir(preparationDirectory, { recursive: false });
  try {
    const entries = [];
    for (const output of outputs) {
      const target = publicPath(projectDirectory, output.relativePath);
      const original = await readOptionalFile(target);
      const originalSha256 = original === undefined ? undefined : sha256(original);
      if (originalSha256 !== output.expectedOriginalSha256) {
        throw new Error(
          `Migration input digest changed before transaction for ${output.relativePath}`,
        );
      }
      if (original !== undefined) {
        await writeAtomic(
          join(preparationDirectory, "original", output.relativePath),
          original,
        );
      }
      await writeAtomic(
        join(preparationDirectory, "next", output.relativePath),
        output.contents,
      );
      entries.push({
        hadOriginal: original !== undefined,
        nextSha256: sha256(output.contents),
        ...(original === undefined ? {} : { originalSha256 }),
        relativePath: output.relativePath,
      });
    }
    const transaction = MigrationTransactionSchema.parse({
      entries,
      ownerToken,
      schema: MIGRATION_TRANSACTION_SCHEMA,
    });
    await writeAtomic(
      join(preparationDirectory, "manifest.json"),
      JSON.stringify(transaction),
    );
    await rename(preparationDirectory, directory);
    ownsTransaction = true;

    for (const entry of transaction.entries) {
      const next = await readBoundedFile(join(directory, "next", entry.relativePath));
      if (sha256(next) !== entry.nextSha256) {
        throw new Error(`Migration next digest mismatch for ${entry.relativePath}`);
      }
      const target = publicPath(projectDirectory, entry.relativePath);
      const current = await readOptionalFile(target);
      const currentSha256 = current === undefined ? undefined : sha256(current);
      if (
        (entry.hadOriginal && currentSha256 !== entry.originalSha256)
        || (!entry.hadOriginal && currentSha256 !== undefined)
      ) {
        throw new Error(
          `Migration install digest precondition failed for ${entry.relativePath}`,
        );
      }
      // The ownership lock serializes this tool. The digest check rejects any
      // outside edit observed before the atomic rename; portable fs APIs cannot
      // make an editor that ignores the lock participate in the transaction.
      await writeAtomic(target, next);
      if (sha256(await readBoundedFile(target)) !== entry.nextSha256) {
        throw new Error(`Migration install digest mismatch for ${entry.relativePath}`);
      }
    }
  } catch (error) {
    if (
      ownsTransaction
      && await readOptionalFile(
        join(directory, "manifest.json"),
        MAX_MANIFEST_BYTES,
      ) !== undefined
    ) {
      await recoverPendingHistorySourceMigrationOwned(projectDirectory, ownerToken);
    }
    throw error;
  } finally {
    await rm(preparationDirectory, { force: true, recursive: true });
  }
}

async function finalizeMigrationTransaction(
  projectDirectory: string,
  ownerToken: string,
): Promise<void> {
  const directory = transactionDirectory(projectDirectory);
  const transaction = MigrationTransactionSchema.parse(JSON.parse(
    (await readBoundedFile(join(directory, "manifest.json"), MAX_MANIFEST_BYTES))
      .toString("utf8"),
  ) as unknown);
  if (transaction.ownerToken !== ownerToken) {
    throw new Error("Migration transaction ownership changed unexpectedly");
  }
  for (const entry of transaction.entries) {
    const current = await readOptionalFile(
      publicPath(projectDirectory, entry.relativePath),
    );
    if (current === undefined || sha256(current) !== entry.nextSha256) {
      throw new Error(
        `Migration finalize digest precondition failed for ${entry.relativePath}`,
      );
    }
  }
  await tombstoneAndRemoveDirectory(directory, ownerToken);
}

function assertKnownSourceIds(
  sourceIds: readonly string[],
  knownSourceIds: ReadonlySet<string>,
  owner: string,
): void {
  const unknown = sourceIds.filter((sourceId) => !knownSourceIds.has(sourceId));
  if (unknown.length > 0) {
    throw new Error(`${owner} references missing sources: ${unknown.join(", ")}`);
  }
}

async function parseOptionalYaml(path: string): Promise<unknown | undefined> {
  const bytes = await readOptionalFile(path);
  return bytes === undefined ? undefined : parse(bytes.toString("utf8")) as unknown;
}

async function validateResearchDocuments(
  projectDirectory: string,
  catalog: ReturnType<typeof ResearchSourceCatalogSchema.parse>,
): Promise<void> {
  const researchDirectory = join(projectDirectory, "public", "research");
  const [valuationValue, appearanceValue, collectionValue] = await Promise.all([
    parseOptionalYaml(join(researchDirectory, "valuations.yml")),
    parseOptionalYaml(join(researchDirectory, "appearances.yml")),
    parseOptionalYaml(join(researchDirectory, "collections.yml")),
  ]);
  const knownSourceIds = new Set(catalog.sources.map(({ id }) => id));
  if (valuationValue !== undefined) {
    const valuations = ValuationFileSchema.parse(valuationValue);
    for (const valuation of valuations.observations) {
      assertKnownSourceIds(valuation.source_ids, knownSourceIds, valuation.id);
    }
  }
  if (appearanceValue !== undefined) {
    const appearances = AppearanceFileSchema.parse(appearanceValue);
    for (const appearance of appearances.appearances) {
      assertKnownSourceIds(appearance.source_ids, knownSourceIds, appearance.id);
    }
  }
  if (collectionValue !== undefined) {
    const collections = ResearchCollectionsFileSchema.parse(collectionValue);
    for (const collection of collections.collections) {
      assertKnownSourceIds(
        collection.input_source_ids,
        knownSourceIds,
        collection.id,
      );
    }
    for (const mutableSource of collections.mutable_sources) {
      assertKnownSourceIds(
        mutableSource.source_ids,
        knownSourceIds,
        mutableSource.canonical_url,
      );
    }
  }
}

async function historyFileNames(historyDirectory: string): Promise<readonly string[]> {
  const names: string[] = [];
  const directory = await opendir(historyDirectory);
  for await (const entry of directory) {
    if (!entry.isFile() || !entry.name.endsWith(".yml")) continue;
    names.push(entry.name);
    if (names.length > MAX_HISTORY_FILES) {
      throw new Error(`History migration supports at most ${MAX_HISTORY_FILES} YAML files`);
    }
  }
  if (names.length === 0) throw new Error("History migration requires at least one YAML file");
  return names.toSorted();
}

async function validateInstalledMigration(
  projectDirectory: string,
  fileNames: readonly string[],
): Promise<void> {
  const catalog = ResearchSourceCatalogSchema.parse(parse(
    (await readBoundedFile(
      join(projectDirectory, "public", "research", "sources.yml"),
    )).toString("utf8"),
  ) as unknown);
  const sourceIds = new Set(catalog.sources.map(({ id }) => id));
  for (const fileName of fileNames) {
    const file = HistoryFileSchema.parse(parse(
      (await readBoundedFile(
        join(projectDirectory, "public", "history", fileName),
      )).toString("utf8"),
    ) as unknown);
    for (const event of file.events) {
      assertKnownSourceIds(event.source_ids, sourceIds, fileName);
    }
  }
  await validateResearchDocuments(projectDirectory, catalog);
}

async function migrateHistorySourcesOwned(
  projectDirectory: string,
  write: boolean,
  ownerToken: string,
): Promise<Readonly<{ events: number; files: number; sources: number; wrote: boolean }>> {
  await recoverPendingHistorySourceMigrationOwned(projectDirectory, ownerToken);
  const historyDirectory = join(projectDirectory, "public", "history");
  const fileNames = await historyFileNames(historyDirectory);
  const files = await Promise.all(fileNames.map(async (fileName) => {
    const bytes = await readBoundedFile(join(historyDirectory, fileName));
    return {
      fileName,
      originalSha256: sha256(bytes),
      value: LegacyHistoryFileSchema.parse(
        parse(bytes.toString("utf8")) as unknown,
      ),
    };
  }));
  const legacySources = files.flatMap(({ value }) =>
    value.events.flatMap((event) => event.sources ?? [])
  );
  const existingCatalogPath = join(
    projectDirectory,
    "public",
    "research",
    "sources.yml",
  );
  const existingCatalogBytes = await readOptionalFile(existingCatalogPath);
  const existingCatalog = existingCatalogBytes === undefined
    ? undefined
    : ResearchSourceCatalogSchema.parse(
      parse(existingCatalogBytes.toString("utf8")) as unknown,
    );
  if (legacySources.length === 0) {
    const currentFiles = files.map(({ value }) => HistoryFileSchema.parse(value));
    if (existingCatalog === undefined) {
      throw new Error("Migrated history requires research/sources.yml");
    }
    await validateResearchDocuments(projectDirectory, existingCatalog);
    return {
      events: currentFiles.reduce((total, value) => total + value.events.length, 0),
      files: files.length,
      sources: existingCatalog.sources.length,
      wrote: false,
    };
  }

  const datesByUrl = new Map<string, Set<string>>();
  for (const source of legacySources) {
    if (source.published_at === undefined) continue;
    const dates = datesByUrl.get(source.url) ?? new Set<string>();
    dates.add(source.published_at);
    datesByUrl.set(source.url, dates);
  }
  const normalizedDate = (source: HistorySource): string | undefined => {
    if (source.published_at !== undefined) return source.published_at;
    const dates = datesByUrl.get(source.url);
    return dates?.size === 1 ? [...dates][0] : undefined;
  };

  const grouped = new Map<string, HistorySource[]>();
  const literalIdentityById = new Map<string, string>();
  const canonicalIdentityById = new Map<string, string>();
  for (const source of legacySources) {
    const publishedAt = normalizedDate(source);
    const id = stableResearchSourceId(source.url, publishedAt);
    const literalIdentity = literalResearchSourceIdentity(source.url, publishedAt);
    const existingLiteralIdentity = literalIdentityById.get(id);
    if (
      existingLiteralIdentity !== undefined
      && existingLiteralIdentity !== literalIdentity
    ) {
      throw new Error(`Stable source ID collision for ${id}`);
    }
    literalIdentityById.set(id, literalIdentity);
    const canonicalIdentity = canonicalResearchSourceIdentity(source.url, publishedAt);
    const canonicalOwner = canonicalIdentityById.get(canonicalIdentity);
    if (canonicalOwner !== undefined && canonicalOwner !== id) {
      throw new Error(
        `Legacy sources ${canonicalOwner} and ${id} are canonical-equivalent; normalize the URL before migration`,
      );
    }
    canonicalIdentityById.set(canonicalIdentity, id);
    const values = grouped.get(id) ?? [];
    values.push(source);
    grouped.set(id, values);
  }
  const migratedSources: ResearchSource[] = [...grouped].map(([id, sources]) => {
      const first = sources[0];
      if (first === undefined) throw new Error(`Missing source group ${id}`);
      const publishedAt = normalizedDate(first);
      return ResearchSourceSchema.parse({
        id,
        kind: preferredText(sources.map(({ kind }) => kind)),
        media_type: mediaType(first),
        publisher: preferredText(sources.map(({ publisher }) => publisher)),
        ...(publishedAt === undefined ? {} : { published_at: publishedAt }),
        title: preferredText(sources.map(({ title }) => title)),
        url: first.url,
      });
    });
  const mergedSources = new Map(
    (existingCatalog?.sources ?? []).map((source) => [source.id, source]),
  );
  for (const source of migratedSources) {
    const existing = mergedSources.get(source.id);
    if (
      existing !== undefined
      && literalResearchSourceIdentity(existing.url, existing.published_at)
        !== literalResearchSourceIdentity(source.url, source.published_at)
    ) {
      throw new Error(`Stable source ID collision for ${source.id}`);
    }
    if (existing === undefined) mergedSources.set(source.id, source);
  }
  const catalog = ResearchSourceCatalogSchema.parse({
    schema: STRIPE_HISTORY_SOURCE_CATALOG_SCHEMA_VERSION,
    sources: [...mergedSources.values()].toSorted((left, right) =>
      left.id.localeCompare(right.id)
    ),
  });

  const nextFiles = files.map(({ fileName, originalSha256, value }) => ({
    fileName,
    originalSha256,
    value: HistoryFileSchema.parse({
      category: value.category,
      events: value.events.map((event) => {
        const { sources, ...rest } = event;
        if (sources === undefined) return rest;
        return {
          ...rest,
          source_ids: sources.map((source) =>
            stableResearchSourceId(source.url, normalizedDate(source))
          ),
        };
      }),
      schema: STRIPE_HISTORY_HISTORY_SCHEMA_VERSION,
    }),
  }));

  const knownSourceIds = new Set(catalog.sources.map(({ id }) => id));
  for (const { fileName, value } of nextFiles) {
    for (const event of value.events) {
      assertKnownSourceIds(event.source_ids, knownSourceIds, fileName);
    }
  }
  await validateResearchDocuments(projectDirectory, catalog);

  if (write) {
    await installMigrationTransaction(projectDirectory, [
      {
        contents: stringify(catalog, { lineWidth: 0 }),
        expectedOriginalSha256: existingCatalogBytes === undefined
          ? undefined
          : sha256(existingCatalogBytes),
        relativePath: "research/sources.yml",
      },
      ...nextFiles.map(({ fileName, originalSha256, value }) => ({
        contents: stringify(value, { lineWidth: 0 }),
        expectedOriginalSha256: originalSha256,
        relativePath: `history/${fileName}`,
      })),
    ], ownerToken);
    try {
      await validateInstalledMigration(projectDirectory, fileNames);
      await finalizeMigrationTransaction(projectDirectory, ownerToken);
    } catch (error) {
      await recoverPendingHistorySourceMigrationOwned(projectDirectory, ownerToken);
      throw error;
    }
  }
  return {
    events: nextFiles.reduce((total, { value }) => total + value.events.length, 0),
    files: nextFiles.length,
    sources: catalog.sources.length,
    wrote: write,
  };
}

export async function migrateHistorySources(
  projectDirectory = process.cwd(),
  write = false,
): Promise<Readonly<{ events: number; files: number; sources: number; wrote: boolean }>> {
  return withMigrationOwnership(projectDirectory, (ownerToken) =>
    migrateHistorySourcesOwned(projectDirectory, write, ownerToken)
  );
}

if (import.meta.main) {
  const write = process.argv.includes("--write");
  console.log(JSON.stringify(await migrateHistorySources(process.cwd(), write)));
}
