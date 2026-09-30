import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const REPOSITORY = "hraness/stripe-history";
const BRANCH_PREFIX = "automation/weekly-history/";
const ACTIONS_APP = 15368;
const VERCEL_BOT = 35613825;
const POLL_MS = 15_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const ALLOWED = /^(public\/history\/(origins-and-early-company|executives-and-team|acquisitions|product-launches|country-expansion|payment-and-payout-expansion|fundraising|headquarters-and-offices|publishing|company-milestones)\.yml|public\/research\/(sources|automated-decisions|automated-publications)\.yml)$/;

type ObjectValue = Record<string, unknown>;
export interface DeliveryIO {
  command(argv: string[], input?: string): string;
  now(): number;
  sleep(milliseconds: number): Promise<void>;
  save(report: ObjectValue): void;
}

function object(value: unknown): ObjectValue {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), "Expected an API object");
  return value as ObjectValue;
}
function string(value: unknown): string {
  assert.equal(typeof value, "string", "Expected an API string");
  return value as string;
}
function integer(value: unknown): number {
  assert.ok(typeof value === "number" && Number.isSafeInteger(value) && value > 0, "Expected a positive API integer");
  return value as number;
}
function sha(value: unknown): string {
  assert.match(string(value), /^[0-9a-f]{40}$/, "Expected a full commit or tree SHA");
  return string(value);
}
function timestamp(value: unknown): number {
  assert.match(string(value), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/, "Expected a UTC timestamp");
  const result = Date.parse(string(value));
  assert.ok(Number.isFinite(result), "Invalid timestamp");
  return result;
}
function array(value: unknown): ObjectValue[] {
  assert.ok(Array.isArray(value) && value.length < 100, "API page is missing or truncated; refusing partial evidence");
  return value.map(object);
}
function page(value: unknown, key: string): ObjectValue[] {
  const result = object(value);
  const values = array(result[key]);
  assert.equal(result.total_count, values.length, "API pagination is incomplete");
  return values;
}

export function generatedPaths(diff: string, published: number): string[] {
  const fields = diff.split("\0");
  assert.equal(fields.pop(), "", "Expected a NUL-terminated Git diff");
  assert.equal(fields.length % 2, 0, "Malformed Git diff");
  const paths: string[] = [];
  for (let i = 0; i < fields.length; i += 2) {
    assert.ok(fields[i] === "M" || fields[i] === "A", "Generated files cannot be deleted, renamed, or change type");
    const path = fields[i + 1]!;
    assert.match(path, ALLOWED, "Generated file is outside the publication allowlist");
    paths.push(path);
  }
  assert.ok(paths.length > 0 && paths.length <= 5 && new Set(paths).size === paths.length, "Expected one to five unique generated files");
  assert.ok(paths.includes("public/research/automated-decisions.yml"), "The decision ledger must change");
  if (published > 0) {
    assert.ok(paths.includes("public/research/sources.yml") && paths.includes("public/research/automated-publications.yml"), "Published events require source and publication records");
  }
  return paths;
}

class Delivery {
  readonly branch: string;
  readonly source: string;
  readonly ownerRun: number;
  readonly report: ObjectValue;
  deadline: number;
  ci = 0;
  production = 0;

  constructor(readonly env: NodeJS.ProcessEnv, readonly io: DeliveryIO) {
    assert.equal(env.GITHUB_REPOSITORY, REPOSITORY, "Unexpected repository");
    assert.equal(env.GITHUB_REF, "refs/heads/main", "Weekly delivery must run from main");
    assert.ok(env.GITHUB_EVENT_NAME === "schedule" || env.GITHUB_EVENT_NAME === "workflow_dispatch", "Unexpected weekly event");
    assert.equal(env.GITHUB_RUN_ATTEMPT, "1", "Reruns require reviewed recovery; mutations are never retried");
    assert.match(env.GITHUB_RUN_ID ?? "", /^[1-9]\d{0,15}$/);
    this.ownerRun = integer(Number(env.GITHUB_RUN_ID));
    this.source = sha(env.GITHUB_SHA);
    this.branch = `${BRANCH_PREFIX}${this.ownerRun}`;
    this.deadline = io.now() + 25 * 60_000;
    this.report = { schema: "stripe-history/weekly-delivery/v1", repository: REPOSITORY, run: this.ownerRun,
      source: this.source, branch: this.branch, state: "preflight", operations: [] };
  }

  save(state?: string): void {
    if (state) this.report.state = state;
    this.report.updatedAt = new Date(this.io.now()).toISOString();
    this.io.save(this.report);
  }
  budget(): void {
    assert.ok(this.io.now() < this.deadline, "Delivery deadline reached; retain this run's branch, PR, and failure issue for recovery");
  }
  git(...args: string[]): string { return this.io.command(["git", ...args]); }
  api(method: string, path: string, body?: ObjectValue): unknown {
    this.budget();
    const output = this.io.command(["gh", "api", "--method", method, "--header", "X-GitHub-Api-Version: 2022-11-28",
      `repos/${REPOSITORY}${path ? `/${path}` : ""}`, ...(body ? ["--input", "-"] : [])], body ? JSON.stringify(body) : undefined);
    return output.trim() === "" ? null : JSON.parse(output) as unknown;
  }
  mutation(label: string, operation: () => unknown): unknown {
    const record: ObjectValue = { operation: label, state: "intent", at: new Date(this.io.now()).toISOString() };
    (this.report.operations as ObjectValue[]).push(record);
    this.save(label);
    // No write is retried: a transport failure may follow a successful remote mutation.
    try {
      const result = operation();
      record.state = "confirmed";
      this.save();
      return result;
    } catch (error) {
      record.state = "uncertain";
      this.save();
      throw error;
    }
  }
  ref(branch: string): string {
    const result = object(this.api("GET", `git/ref/heads/${branch}`));
    assert.equal(result.ref, `refs/heads/${branch}`, "Branch identity changed");
    const target = object(result.object);
    assert.equal(target.type, "commit");
    return sha(target.sha);
  }
  main(expected: string): void { assert.equal(this.ref("main"), expected, "main advanced; exact delivery cannot continue"); }
  openPublisherPulls(): ObjectValue[] {
    return array(this.api("GET", "pulls?state=open&per_page=100")).filter(pr => {
      const head = object(pr.head);
      if (head.repo === null || object(head.repo).full_name !== REPOSITORY) return false;
      const ref = string(head.ref);
      const run = ref.slice(BRANCH_PREFIX.length);
      return ref.startsWith(BRANCH_PREFIX) && /^[1-9]\d{0,15}$/.test(run) && Number.isSafeInteger(Number(run));
    });
  }
  absentBranch(): void {
    assert.equal(array(this.api("GET", `git/matching-refs/heads/${this.branch}`)).length, 0, "Run branch already exists; inspect it before recovery");
  }
  async poll<T>(label: string, probe: () => T | undefined): Promise<T> {
    this.save(label);
    for (let attempt = 0; attempt < 100; attempt++) {
      this.budget();
      const value = probe();
      if (value !== undefined) return value;
      await this.io.sleep(POLL_MS);
    }
    throw new Error(`${label} did not finish within the bounded wait`);
  }
  workflow(file: string, trigger: string): number {
    const workflow = object(this.api("GET", `actions/workflows/${file}`));
    assert.equal(workflow.state, "active", `${file} is not active`);
    assert.equal(workflow.path, `.github/workflows/${file}`);
    const content = object(this.api("GET", `contents/.github/workflows/${file}?ref=${this.source}`));
    assert.equal(content.encoding, "base64");
    const source = Buffer.from(string(content.content), "base64").toString("utf8");
    assert.ok(source.length <= 100_000 && new RegExp(`^  ${trigger}:`, "m").test(source), `${file} does not support ${trigger}`);
    return integer(workflow.id);
  }
  preflight(): void {
    this.save();
    assert.equal(this.git("rev-parse", "HEAD").trim(), this.source, "Checkout differs from the workflow source");
    const own = object(this.api("GET", `actions/runs/${this.ownerRun}`));
    assert.equal(own.head_sha, this.source);
    assert.equal(own.head_branch, "main");
    assert.equal(own.path, ".github/workflows/weekly-news.yml");
    assert.equal(own.event, this.env.GITHUB_EVENT_NAME);
    assert.equal(own.run_attempt, 1);
    const started = timestamp(own.run_started_at);
    assert.ok(started <= this.io.now(), "Weekly run starts in the future");
    // Leave time for a bounded in-flight request, artifacts, and the failure issue.
    this.deadline = Math.min(this.deadline, started + 42 * 60_000);
    this.budget();
    const repository = object(this.api("GET", ""));
    assert.equal(repository.full_name, REPOSITORY);
    assert.equal(repository.default_branch, "main");
    assert.equal(repository.archived, false);
    assert.equal(repository.allow_squash_merge, true, "Squash merging is unavailable");
    assert.equal(object(repository.permissions).push, true, "The job requires repository contents write permission");
    const rules = array(this.api("GET", "rules/branches/main"));
    assert.ok(rules.some(rule => rule.type === "pull_request"), "main must require pull requests");
    assert.ok(!rules.some(rule => rule.type === "merge_queue"), "This coordinator does not own a merge queue");
    const required = rules.filter(rule => rule.type === "required_status_checks")
      .flatMap(rule => {
        const parameters = object(rule.parameters);
        return array(parameters.required_status_checks).filter(check => check.context === "Required")
          .map(check => ({ check, strict: parameters.strict_required_status_checks_policy }));
      });
    assert.ok(required.length > 0, "main must require Required");
    assert.ok(required.every(({ strict }) => strict === true), "Required must require an up-to-date branch before publication");
    assert.ok(required.every(({ check }) => check.integration_id === undefined || check.integration_id === ACTIONS_APP), "Required is pinned to an unexpected provider");
    this.report.requiredProviderPinned = required.every(({ check }) => check.integration_id === ACTIONS_APP);
    this.report.requiredStrict = true;
    this.ci = this.workflow("ci.yml", "workflow_dispatch");
    this.production = this.workflow("site-production.yml", "deployment_status");
    this.main(this.source);
    this.absentBranch();
    assert.equal(this.openPublisherPulls().length, 0,
      "An earlier weekly publication PR is unresolved; inspect it before another publication");
    this.save("preflight-passed");
  }

  candidate(published: number, asOf: string): { commit: string; tree: string } {
    assert.equal(this.git("diff", "--cached", "--name-only").trim(), "", "Unexpected pre-staged changes");
    const paths = generatedPaths(this.git("diff", "--no-renames", "--name-status", "-z", "HEAD", "--"), published);
    const untracked = this.git("ls-files", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean);
    assert.ok(untracked.every(path => /^weekly-news\/[a-z0-9-]+\.(json|md)$/.test(path)), "Unexpected untracked source files");
    this.git("add", "--", ...paths);
    this.git("diff", "--cached", "--check");
    this.git("diff", "--exit-code");
    let totalBytes = 0;
    const entries = paths.map(path => {
      assert.match(this.git("ls-files", "--stage", "--", path), /^100644 [0-9a-f]{40} 0\t/, "Generated files must be ordinary tracked files");
      const content = this.git("show", `:${path}`);
      totalBytes += Buffer.byteLength(content);
      assert.ok(Buffer.byteLength(content) <= 2 * 1024 * 1024 && totalBytes <= 4 * 1024 * 1024, "Generated content exceeds the delivery byte limit");
      return { path, mode: "100644", type: "blob", content };
    });
    const tree = sha(this.git("write-tree").trim());
    const baseTree = sha(this.git("rev-parse", "HEAD^{tree}").trim());
    this.main(this.source);
    this.absentBranch();
    const createdTree = object(this.mutation("create-tree", () => this.api("POST", "git/trees", { base_tree: baseTree, tree: entries })));
    assert.equal(createdTree.sha, tree, "Remote tree differs from the locally validated generated files");
    const identity = { name: "github-actions[bot]", email: "41898282+github-actions[bot]@users.noreply.github.com", date: new Date(this.io.now()).toISOString() };
    const created = object(this.mutation("create-commit", () => this.api("POST", "git/commits", {
      message: `chore(history): publish weekly research ${asOf}`, tree, parents: [this.source], author: identity, committer: identity,
    })));
    const commit = sha(created.sha);
    assert.equal(object(created.tree).sha, tree);
    assert.deepEqual(array(created.parents).map(parent => parent.sha), [this.source]);
    this.report.candidate = commit;
    this.report.tree = tree;
    this.save();
    this.main(this.source);
    const ref = object(this.mutation("create-branch", () => this.api("POST", "git/refs", { ref: `refs/heads/${this.branch}`, sha: commit })));
    assert.equal(ref.ref, `refs/heads/${this.branch}`);
    assert.equal(object(ref.object).sha, commit);
    assert.equal(this.ref(this.branch), commit, "Candidate branch drifted");
    return { commit, tree };
  }
  pull(number: number, commit: string, merged = false): ObjectValue {
    const pr = object(this.api("GET", `pulls/${number}`));
    assert.equal(pr.number, number);
    assert.equal(object(pr.head).ref, this.branch);
    assert.equal(object(pr.head).sha, commit, "PR head drifted");
    assert.equal(object(object(pr.head).repo).full_name, REPOSITORY);
    assert.equal(object(pr.base).ref, "main");
    assert.equal(object(object(pr.base).repo).full_name, REPOSITORY);
    assert.equal(pr.draft, false);
    assert.equal(pr.state, merged ? "closed" : "open");
    assert.equal(pr.merged, merged);
    if (!merged) {
      assert.equal(object(pr.base).sha, this.source, "PR base drifted");
      assert.equal(this.ref(this.branch), commit, "Candidate branch drifted");
      this.main(this.source);
    }
    return pr;
  }
  runs(workflow: number, branch: string, event: string, since: number): ObjectValue[] {
    const query = new URLSearchParams({ branch, event, created: `>=${new Date(since).toISOString()}`, per_page: "100" });
    return page(this.api("GET", `actions/workflows/${workflow}/runs?${query}`), "workflow_runs");
  }
  runIdentity(run: ObjectValue, workflow: number, branch: string, commit: string, event: string, since: number): void {
    assert.equal(run.workflow_id, workflow);
    assert.equal(run.path, `.github/workflows/${workflow === this.ci ? "ci.yml" : "site-production.yml"}`);
    assert.equal(run.head_branch, branch);
    assert.equal(run.head_sha, commit, "Workflow ran against another SHA");
    assert.equal(run.event, event);
    assert.equal(object(run.repository).full_name, REPOSITORY);
    assert.equal(object(run.head_repository).full_name, REPOSITORY);
    assert.ok(timestamp(run.created_at) >= since && timestamp(run.created_at) <= this.io.now(), "Workflow evidence is not fresh");
    assert.equal(run.run_attempt, 1, "Unexpected workflow retry; inspect its evidence before recovery");
  }
  async verifyRun(id: number, workflow: number, branch: string, commit: string, event: string, since: number,
    guard: () => void, expectedJobs: string[]): Promise<void> {
    const run = await this.poll(`wait-run-${id}`, () => {
      guard();
      const value = object(this.api("GET", `actions/runs/${id}`));
      assert.equal(value.id, id);
      this.runIdentity(value, workflow, branch, commit, event, since);
      if (value.status !== "completed") {
        assert.ok(["queued", "in_progress", "waiting", "requested", "pending"].includes(string(value.status)), "Unknown workflow status");
        return undefined;
      }
      assert.equal(value.conclusion, "success", `Workflow ${id} did not succeed`);
      return value;
    });
    const jobs = page(this.api("GET", `actions/runs/${id}/attempts/1/jobs?per_page=100`), "jobs");
    assert.deepEqual(jobs.map(job => string(job.name)).sort(), [...expectedJobs].sort(), "Missing or unexpected blocking jobs");
    for (const job of jobs) {
      assert.equal(job.head_sha, commit);
      assert.equal(job.status, "completed");
      assert.equal(job.conclusion, "success", `Blocking job ${string(job.name)} did not succeed`);
      const url = string(job.check_run_url);
      assert.match(url, /^https:\/\/api\.github\.com\/repos\/hraness\/stripe-history\/check-runs\/[1-9]\d*$/);
      const check = object(this.api("GET", `check-runs/${url.split("/").at(-1)!}`));
      assert.equal(check.name, job.name);
      assert.equal(check.head_sha, commit);
      assert.equal(check.status, "completed");
      assert.equal(check.conclusion, "success");
      assert.equal(object(check.app).id, ACTIONS_APP, "Check came from an unexpected provider");
      assert.equal(object(check.app).slug, "github-actions");
      assert.equal(object(check.check_suite).id, integer(run.check_suite_id), "Check belongs to another workflow run");
    }
    guard();
  }
  async dispatch(branch: string, commit: string, guard: () => void): Promise<number> {
    guard();
    const since = Math.floor(this.io.now() / 1000) * 1000;
    const previous = new Set(this.runs(this.ci, branch, "workflow_dispatch", since).map(run => integer(run.id)));
    guard();
    this.mutation(`dispatch-ci-${branch}`, () => this.api("POST", `actions/workflows/${this.ci}/dispatches`, { ref: branch }));
    guard(); // GitHub accepts a current ref, not a guaranteed arbitrary historical SHA.
    const run = await this.poll(`locate-ci-${branch}`, () => {
      guard();
      const candidates = this.runs(this.ci, branch, "workflow_dispatch", since).filter(value => !previous.has(integer(value.id)));
      assert.ok(candidates.length <= 1, "Ambiguous workflow dispatch; refusing to select another run");
      if (candidates.length === 0) return undefined;
      this.runIdentity(candidates[0]!, this.ci, branch, commit, "workflow_dispatch", since);
      return candidates[0]!;
    });
    const id = integer(run.id);
    this.report[branch === "main" ? "mainCI" : "candidateCI"] = { id, sha: commit };
    this.save();
    await this.verifyRun(id, this.ci, branch, commit, "workflow_dispatch", since, guard, ["Static checks", "Build and browser layouts", "Required"]);
    return id;
  }
  async deployment(commit: string, mergedAt: number): Promise<void> {
    const deployment = await this.poll("wait-production-deployment", () => {
      this.main(commit);
      const deployments = array(this.api("GET", `deployments?sha=${commit}&environment=Production&per_page=100`));
      assert.ok(deployments.length <= 1, "Ambiguous Production deployment; inspect before recovery");
      if (!deployments[0]) return undefined;
      const value = deployments[0];
      assert.equal(value.sha, commit);
      assert.equal(value.environment, "Production");
      assert.equal(object(value.creator).id, VERCEL_BOT);
      assert.equal(object(value.creator).login, "vercel[bot]");
      assert.ok(timestamp(value.created_at) >= mergedAt, "Production deployment predates the merge");
      const statuses = array(this.api("GET", `deployments/${integer(value.id)}/statuses?per_page=100`));
      if (!statuses[0]) return undefined;
      const status = statuses[0];
      assert.equal(object(status.creator).id, VERCEL_BOT);
      assert.ok(timestamp(status.created_at) >= mergedAt);
      assert.ok(["queued", "pending", "in_progress", "success"].includes(string(status.state)), "Production deployment failed or became inactive");
      if (status.state !== "success") return undefined;
      const url = new URL(string(status.environment_url));
      assert.ok(url.protocol === "https:" && /^[a-z0-9-]+-hraness\.vercel\.app$/.test(url.hostname), "Unexpected Production deployment URL");
      return { id: integer(value.id), sha: commit, url: url.href, status: integer(status.id) };
    });
    this.report.deployment = deployment;
    this.save();
    const run = await this.poll("locate-production-browser", () => {
      this.main(commit);
      const candidates = this.runs(this.production, "main", "deployment_status", mergedAt).filter(value => value.head_sha === commit);
      assert.ok(candidates.length <= 1, "Ambiguous Production browser runs; inspect before recovery");
      return candidates[0];
    });
    const id = integer(run.id);
    this.runIdentity(run, this.production, "main", commit, "deployment_status", mergedAt);
    await this.verifyRun(id, this.production, "main", commit, "deployment_status", mergedAt, () => this.main(commit), ["browser", "Production browser"]);
    this.report.productionBrowser = { id, sha: commit };
    this.save();
  }
  async deliver(): Promise<void> {
    const asOf = this.env.WEEKLY_AS_OF ?? "";
    assert.match(asOf, /^\d{4}-\d\d-\d\d$/);
    assert.equal(new Date(`${asOf}T00:00:00Z`).toISOString().slice(0, 10), asOf, "Invalid research date");
    assert.match(this.env.WEEKLY_PUBLISHED ?? "", /^[0-2]$/, "Expected zero to two published records");
    const { commit, tree } = this.candidate(Number(this.env.WEEKLY_PUBLISHED), asOf);
    this.main(this.source);
    assert.equal(this.openPublisherPulls().length, 0, "Publication PR appeared during generation");
    assert.equal(this.ref(this.branch), commit);
    const created = object(this.mutation("create-pr", () => this.api("POST", "pulls", {
      title: `chore(history): publish weekly research ${asOf}`, head: this.branch, base: "main", draft: false, maintainer_can_modify: false,
      body: `Generated history and decision records passed the research audit, repository checks, build, and file scope checks.\n\nRun: https://github.com/${REPOSITORY}/actions/runs/${this.ownerRun}\nSource: ${this.source}\nCandidate: ${commit}\n\nThis run dispatches CI explicitly, verifies Required, then uses protected squash merging and checks the integrated main commit and normal Production deployment.`,
    })));
    const number = integer(created.number);
    this.report.pullRequest = number;
    this.save();
    const guard = () => { this.pull(number, commit); };
    await this.dispatch(this.branch, commit, guard);
    guard();
    this.mutation("merge-pr", () => this.io.command(["gh", "pr", "merge", String(number), "--repo", REPOSITORY, "--squash", "--match-head-commit", commit]));
    const merged = this.pull(number, commit, true);
    const integrated = sha(merged.merge_commit_sha);
    const mergedAt = timestamp(merged.merged_at);
    this.report.integrated = integrated;
    this.report.mergedAt = merged.merged_at;
    this.save();
    const mergeCommit = object(this.api("GET", `git/commits/${integrated}`));
    assert.equal(mergeCommit.sha, integrated);
    assert.equal(object(mergeCommit.tree).sha, tree, "Integrated tree differs from the checked candidate");
    assert.deepEqual(array(mergeCommit.parents).map(parent => parent.sha), [this.source], "main advanced before the squash merge");
    this.main(integrated);
    await this.dispatch("main", integrated, () => this.main(integrated));
    await this.deployment(integrated, mergedAt);
    this.main(integrated);
    this.save("complete");
  }
}

export async function weeklyDelivery(mode: "preflight" | "deliver", env: NodeJS.ProcessEnv, io: DeliveryIO): Promise<ObjectValue> {
  let delivery: Delivery | undefined;
  try {
    delivery = new Delivery(env, io);
    delivery.preflight();
    if (mode === "deliver") await delivery.deliver();
    return delivery.report;
  } catch (error) {
    const report = delivery?.report ?? { schema: "stripe-history/weekly-delivery/v1", run: env.GITHUB_RUN_ID };
    report.state = "failed";
    report.error = error instanceof Error ? error.message : "Unknown delivery failure";
    io.save(report);
    throw error;
  }
}

if (import.meta.main) {
  const mode = process.argv[2];
  assert.ok(process.argv.length === 3 && (mode === "preflight" || mode === "deliver"), "Usage: deliver-weekly-history.ts preflight|deliver");
  const io: DeliveryIO = {
    command: (argv, input) => {
      try {
        return execFileSync(argv[0]!, argv.slice(1), { encoding: "utf8", input, timeout: 30_000, maxBuffer: MAX_RESPONSE_BYTES, stdio: ["pipe", "pipe", "pipe"] });
      } catch {
        const operation = argv[0] === "gh" && argv[1] === "api" ? `${argv[3]} ${argv[6]}` : `${argv[0]} ${argv[1]}`;
        throw new Error(`${operation} failed or timed out; no mutation will be retried`);
      }
    },
    now: Date.now,
    sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
    save: report => {
      mkdirSync("weekly-news", { recursive: true });
      writeFileSync("weekly-news/delivery.json", `${JSON.stringify(report, null, 2)}\n`);
    },
  };
  await weeklyDelivery(mode, process.env, io);
  if (mode === "deliver" && process.env.GITHUB_OUTPUT) {
    const report = object(JSON.parse(readFileSync("weekly-news/delivery.json", "utf8")) as unknown);
    appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha(report.integrated)}\n`);
  }
}
