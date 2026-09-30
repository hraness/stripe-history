import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { generatedPaths, weeklyDelivery, type DeliveryIO } from "./deliver-weekly-history";

const SOURCE = "1".repeat(40);
const CANDIDATE = "2".repeat(40);
const INTEGRATED = "3".repeat(40);
const TREE = "4".repeat(40);
const BASE_TREE = "5".repeat(40);
const REPO = "hraness/stripe-history";
const BRANCH = "automation/weekly-history/123";
const LEDGER = "public/research/automated-decisions.yml";
const BASE_TIME = Date.parse("2026-09-30T12:00:00Z");
const iso = (time = BASE_TIME) => new Date(time).toISOString();
type Data = Record<string, unknown>;
type Call = { argv: string[]; input: string | undefined };
type Override = (method: string, path: string, result: unknown, state: Fixture) => unknown;

class Fixture {
  time = BASE_TIME;
  main = SOURCE;
  branch: string | undefined;
  merged = false;
  calls: Call[] = [];
  reports: Data[] = [];
  runs: Data[] = [];
  diff = `M\0${LEDGER}\0`;
  untracked = "weekly-news/delivery.json\0weekly-news/publication.md\0";
  staged = "";
  environment: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    GITHUB_REPOSITORY: REPO, GITHUB_REF: "refs/heads/main", GITHUB_EVENT_NAME: "schedule",
    GITHUB_RUN_ATTEMPT: "1", GITHUB_RUN_ID: "123", GITHUB_SHA: SOURCE, WEEKLY_AS_OF: "2026-09-30", WEEKLY_PUBLISHED: "0",
  };
  override: Override = (_method, _path, result) => result;
  commandOverride: (argv: string[], state: Fixture) => string | undefined = () => undefined;
  io: DeliveryIO = {
    command: (argv, input) => {
      this.calls.push({ argv, input });
      const overridden = this.commandOverride(argv, this);
      if (overridden !== undefined) return overridden;
      if (argv[0] === "git") return this.git(argv.slice(1));
      if (argv[1] === "pr") {
        expect(argv).toEqual(["gh", "pr", "merge", "7", "--repo", REPO, "--squash", "--match-head-commit", CANDIDATE]);
        this.merged = true;
        this.main = INTEGRATED;
        this.runs.push(this.run(902, 300, "main", INTEGRATED, "deployment_status"));
        return "";
      }
      expect(argv.slice(0, 6)).toEqual(["gh", "api", "--method", argv[3]!, "--header", "X-GitHub-Api-Version: 2022-11-28"]);
      const method = argv[3]!;
      const path = argv[6]!.replace(`repos/${REPO}`, "").replace(/^\//, "");
      const data = input ? JSON.parse(input) as Data : undefined;
      const response = this.api(method, path, data);
      return JSON.stringify(this.override(method, path, response, this));
    },
    now: () => this.time,
    sleep: async duration => { this.time += duration; },
    save: report => { this.reports.push(structuredClone(report)); },
  };
  get report(): Data { return this.reports.at(-1)!; }
  get writes(): Call[] { return this.calls.filter(call => call.argv[3] === "POST" || call.argv[1] === "pr"); }
  git(argv: string[]): string {
    if (argv.join(" ") === "rev-parse HEAD") return `${SOURCE}\n`;
    if (argv.join(" ") === "rev-parse HEAD^{tree}") return `${BASE_TREE}\n`;
    if (argv.join(" ") === "diff --cached --name-only") return this.staged;
    if (argv.join(" ") === "diff --no-renames --name-status -z HEAD --") return this.diff;
    if (argv.join(" ") === "ls-files --others --exclude-standard -z") return this.untracked;
    if (argv[0] === "add" || argv.join(" ") === "diff --cached --check" || argv.join(" ") === "diff --exit-code") return "";
    if (argv[0] === "ls-files" && argv[1] === "--stage") return `100644 ${BASE_TREE} 0\t${argv.at(-1)}\n`;
    if (argv[0] === "show") return "decisions: []\n";
    if (argv[0] === "write-tree") return `${TREE}\n`;
    throw new Error(`Unexpected Git command ${argv.join(" ")}`);
  }
  run(id: number, workflow: number, branch: string, commit: string, event: string): Data {
    return { id, workflow_id: workflow, path: `.github/workflows/${workflow === 200 ? "ci.yml" : "site-production.yml"}`,
      head_branch: branch, head_sha: commit, event, repository: { full_name: REPO }, head_repository: { full_name: REPO },
      run_attempt: 1, created_at: iso(this.time), status: "completed", conclusion: "success", check_suite_id: id + 1000 };
  }
  jobs(id: number): Data[] {
    const names = id === 902 ? ["browser", "Production browser"] : ["Static checks", "Build and browser layouts", "Required"];
    return names.map((name, index) => ({ name, head_sha: id === 900 ? CANDIDATE : INTEGRATED, status: "completed", conclusion: "success",
      check_run_url: `https://api.github.com/repos/${REPO}/check-runs/${id * 10 + index}` }));
  }
  pull(): Data {
    return { number: 7, head: { ref: BRANCH, sha: CANDIDATE, repo: { full_name: REPO } },
      base: { ref: "main", sha: SOURCE, repo: { full_name: REPO } }, draft: false, state: this.merged ? "closed" : "open", merged: this.merged,
      merge_commit_sha: this.merged ? INTEGRATED : null, merged_at: this.merged ? iso(this.time) : null };
  }
  api(method: string, path: string, body?: Data): unknown {
    if (method === "POST") {
      if (path === "git/trees") {
        expect(body).toEqual({ base_tree: BASE_TREE, tree: [{ path: LEDGER, mode: "100644", type: "blob", content: "decisions: []\n" }] });
        return { sha: TREE };
      }
      if (path === "git/commits") {
        expect(body?.tree).toBe(TREE);
        expect(body?.parents).toEqual([SOURCE]);
        return { sha: CANDIDATE, tree: { sha: TREE }, parents: [{ sha: SOURCE }] };
      }
      if (path === "git/refs") {
        expect(body).toEqual({ ref: `refs/heads/${BRANCH}`, sha: CANDIDATE });
        if (this.branch !== undefined) throw new Error("Reference already exists");
        this.branch = CANDIDATE;
        return { ref: `refs/heads/${BRANCH}`, object: { sha: CANDIDATE } };
      }
      if (path === "pulls") {
        expect(body?.head).toBe(BRANCH);
        expect(body?.base).toBe("main");
        expect(body?.draft).toBe(false);
        expect(body?.maintainer_can_modify).toBe(false);
        return this.pull();
      }
      if (path === "actions/workflows/200/dispatches") {
        expect([BRANCH, "main"]).toContain(String(body?.ref));
        this.runs.push(this.run(body?.ref === BRANCH ? 900 : 901, 200, String(body?.ref), body?.ref === BRANCH ? CANDIDATE : INTEGRATED, "workflow_dispatch"));
        return null;
      }
      throw new Error(`Unexpected mutation ${path}`);
    }
    expect(method).toBe("GET");
    if (path === "") return { full_name: REPO, default_branch: "main", archived: false, allow_squash_merge: true, permissions: { push: true } };
    if (path === "actions/runs/123") return { head_sha: SOURCE, head_branch: "main", path: ".github/workflows/weekly-news.yml", event: "schedule", run_attempt: 1, run_started_at: iso() };
    if (path === "rules/branches/main") return [{ type: "pull_request" }, { type: "required_status_checks", parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: "Required", integration_id: 15368 }] } }];
    if (path.startsWith("contents/")) return { encoding: "base64", content: Buffer.from("on:\n  workflow_dispatch:\n  deployment_status:\n").toString("base64") };
    if (path === "actions/workflows/ci.yml") return { id: 200, path: ".github/workflows/ci.yml", state: "active" };
    if (path === "actions/workflows/site-production.yml") return { id: 300, path: ".github/workflows/site-production.yml", state: "active" };
    if (path === "git/ref/heads/main") return { ref: "refs/heads/main", object: { type: "commit", sha: this.main } };
    if (path === `git/ref/heads/${BRANCH}`) return { ref: `refs/heads/${BRANCH}`, object: { type: "commit", sha: this.branch } };
    if (path.startsWith("git/matching-refs/")) return this.branch ? [{ ref: `refs/heads/${BRANCH}`, object: { sha: this.branch } }] : [];
    if (path === "pulls?state=open&per_page=100") return [];
    if (path === "pulls/7") return this.pull();
    if (path === `git/commits/${INTEGRATED}`) return { sha: INTEGRATED, tree: { sha: TREE }, parents: [{ sha: SOURCE }] };
    if (/^actions\/workflows\/(200|300)\/runs\?/.test(path)) {
      const workflow = Number(path.split("/")[2]);
      const query = new URLSearchParams(path.split("?")[1]);
      const runs = this.runs.filter(run => run.workflow_id === workflow && run.head_branch === query.get("branch") && run.event === query.get("event")
        && Date.parse(String(run.created_at)) >= Date.parse(query.get("created")!.slice(2)));
      return { total_count: runs.length, workflow_runs: runs };
    }
    if (/^actions\/runs\/90[012]$/.test(path)) return this.runs.find(run => run.id === Number(path.split("/")[2]));
    if (/^actions\/runs\/90[012]\/attempts\/1\/jobs\?/.test(path)) {
      const jobs = this.jobs(Number(path.split("/")[2]));
      return { total_count: jobs.length, jobs };
    }
    if (path.startsWith("check-runs/")) {
      const checkId = Number(path.split("/")[1]);
      const id = Math.floor(checkId / 10);
      return { ...this.jobs(id)[checkId % 10], app: { id: 15368, slug: "github-actions" }, check_suite: { id: id + 1000 } };
    }
    if (path.startsWith("deployments?")) return [{ id: 80, sha: INTEGRATED, environment: "Production", creator: { id: 35613825, login: "vercel[bot]" }, created_at: iso() }];
    if (path === "deployments/80/statuses?per_page=100") return [{ id: 81, state: "success", creator: { id: 35613825 }, created_at: iso(), environment_url: "https://stripe-history-fixture-hraness.vercel.app" }];
    throw new Error(`Unexpected API request ${path}`);
  }
  deliver(): Promise<Data> { return weeklyDelivery("deliver", this.environment, this.io); }
}

test("delivers one generated tree through protected PR CI, a matched squash, fresh integrated CI and the normal deployment", async () => {
  const fixture = new Fixture();
  const result = await fixture.deliver();
  expect(result.state).toBe("complete");
  expect(result.source).toBe(SOURCE);
  expect(result.requiredStrict).toBe(true);
  expect(result.candidate).toBe(CANDIDATE);
  expect(result.integrated).toBe(INTEGRATED);
  expect(result.candidateCI).toEqual({ id: 900, sha: CANDIDATE });
  expect(result.mainCI).toEqual({ id: 901, sha: INTEGRATED });
  expect(result.productionBrowser).toEqual({ id: 902, sha: INTEGRATED });
  expect(result.deployment).toEqual({ id: 80, status: 81, sha: INTEGRATED, url: "https://stripe-history-fixture-hraness.vercel.app/" });
  expect(fixture.writes).toHaveLength(7);
  expect(fixture.calls.some(call => call.argv[0] === "git" && call.argv[1] === "push")).toBe(false);
  expect(fixture.calls.some(call => call.argv.some(arg => arg === "--admin" || arg.startsWith("--force")))).toBe(false);
  expect(fixture.reports.filter(report => (report.operations as Data[]).at(-1)?.state === "intent")).toHaveLength(7);
});

test("preflight performs no writes and no provider or model calls", async () => {
  const fixture = new Fixture();
  expect((await weeklyDelivery("preflight", fixture.environment, fixture.io)).state).toBe("preflight-passed");
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.calls.every(call => ["git", "gh"].includes(call.argv[0]!))).toBe(true);
});

test.each([
  ["wrong repository", "GITHUB_REPOSITORY", "other/repository"],
  ["non-main dispatch", "GITHUB_REF", "refs/heads/draft"],
  ["malformed SHA", "GITHUB_SHA", "abc123"],
  ["retry", "GITHUB_RUN_ATTEMPT", "2"],
  ["invalid event", "GITHUB_EVENT_NAME", "pull_request"],
] as const)("rejects %s before API or Git work", async (_label, key, value) => {
  const fixture = new Fixture();
  fixture.environment[key] = value;
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.calls).toHaveLength(0);
  expect(fixture.report.state).toBe("failed");
});

test.each([
  ["pre-existing run branch", `git/matching-refs/heads/${BRANCH}`, [{ ref: `refs/heads/${BRANCH}` }]],
  ["unresolved publication PR", "pulls?state=open&per_page=100", [{ head: { ref: "automation/weekly-history/122", repo: { full_name: REPO } } }]],
  ["missing PR protection", "rules/branches/main", [{ type: "required_status_checks", parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: "Required" }] } }]],
  ["missing Required", "rules/branches/main", [{ type: "pull_request" }]],
  ["wrong Required provider", "rules/branches/main", [{ type: "pull_request" }, { type: "required_status_checks", parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: "Required", integration_id: 42 }] } }]],
  ["truncated open PRs", "pulls?state=open&per_page=100", Array.from({ length: 100 }, () => ({ head: { ref: "other" } }))],
  ["disabled CI", "actions/workflows/ci.yml", { id: 200, path: ".github/workflows/ci.yml", state: "disabled_manually" }],
  ["unsupported dispatch", `contents/.github/workflows/ci.yml?ref=${SOURCE}`, { encoding: "base64", content: Buffer.from("on:\n  push:\n").toString("base64") }],
] as const)("preflight refuses %s before mutation", async (_label, endpoint, value) => {
  const fixture = new Fixture();
  fixture.override = (_method, path, original) => path === endpoint ? value : original;
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.writes).toHaveLength(0);
});

test("an older unpinned Required rule is recorded, but every check must still come from Actions", async () => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => path === "rules/branches/main"
    ? [{ type: "pull_request" }, { type: "required_status_checks", parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: "Required" }] } }] : value;
  expect((await fixture.deliver()).requiredProviderPinned).toBe(false);
});

test.each([["loose", false], ["missing", undefined], ["non-boolean", "true"]] as const)("preflight rejects %s strict Required policy before writes", async (_label, strict) => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => path === "rules/branches/main"
    ? [{ type: "pull_request" }, { type: "required_status_checks", parameters: {
      ...(strict === undefined ? {} : { strict_required_status_checks_policy: strict }),
      required_status_checks: [{ context: "Required", integration_id: 15368 }],
    } }] : value;
  await expect(weeklyDelivery("preflight", fixture.environment, fixture.io)).rejects.toThrow("up-to-date branch");
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.calls.some(call => call.argv[0] === "git" && call.argv[1] === "add")).toBe(false);
});

test("every effective Required rule must be strict, while unrelated checks keep their own policy", async () => {
  const fixture = new Fixture();
  let additionalContext = "Unrelated";
  fixture.override = (_method, path, value) => path === "rules/branches/main"
    ? [...value as Data[], { type: "required_status_checks", parameters: {
      strict_required_status_checks_policy: false, required_status_checks: [{ context: additionalContext }],
    } }] : value;
  expect((await weeklyDelivery("preflight", fixture.environment, fixture.io)).requiredStrict).toBe(true);
  additionalContext = "Required";
  await expect(weeklyDelivery("preflight", fixture.environment, fixture.io)).rejects.toThrow("up-to-date branch");
  expect(fixture.writes).toHaveLength(0);
});

test.each([
  ["fork with publisher branch", { ref: "automation/weekly-history/122", repo: { full_name: "contributor/stripe-history" } }],
  ["deleted fork", { ref: "automation/weekly-history/122", repo: null }],
  ["unrelated same-repository branch", { ref: "automation/weekly-history/docs", repo: { full_name: REPO } }],
  ["noncanonical run number", { ref: "automation/weekly-history/0122", repo: { full_name: REPO } }],
  ["impossible run number", { ref: "automation/weekly-history/9999999999999999", repo: { full_name: REPO } }],
] as const)("both publication guards ignore %s", async (_label, head) => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => path === "pulls?state=open&per_page=100" ? [{ head }] : value;
  expect((await fixture.deliver()).state).toBe("complete");
  expect(fixture.calls.filter(call => call.argv[6] === `repos/${REPO}/pulls?state=open&per_page=100`)).toHaveLength(2);
});

test("a same-repository publisher PR appearing during generation blocks PR creation", async () => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value, state) => path === "pulls?state=open&per_page=100" && state.branch !== undefined
    ? [{ head: { ref: "automation/weekly-history/122", repo: { full_name: REPO } } }] : value;
  await expect(fixture.deliver()).rejects.toThrow("Publication PR appeared");
  expect(fixture.calls.some(call => call.argv[3] === "POST" && call.argv[6] === `repos/${REPO}/pulls`)).toBe(false);
  expect(fixture.branch).toBe(CANDIDATE);
});

test.each([
  ["deleted ledger", `D\0${LEDGER}\0`],
  ["renamed ledger", `R100\0${LEDGER}\0public/research/other.yml\0`],
  ["changed workflow", `M\0.github/workflows/ci.yml\0`],
  ["missing ledger", "M\0public/research/sources.yml\0"],
  ["too many files", [LEDGER, "public/research/sources.yml", "public/research/automated-publications.yml", "public/history/acquisitions.yml", "public/history/product-launches.yml", "public/history/executives-and-team.yml"].map(path => `M\0${path}\0`).join("")],
  ["duplicate ledger", `M\0${LEDGER}\0M\0${LEDGER}\0`],
  ["symlink", `T\0${LEDGER}\0`],
] as const)("rejects %s without remote writes", async (_label, diff) => {
  const fixture = new Fixture();
  fixture.diff = diff;
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.writes).toHaveLength(0);
});

test("a published event requires both source and publication ledgers", () => {
  expect(() => generatedPaths(`M\0${LEDGER}\0`, 1)).toThrow();
  expect(generatedPaths(`M\0${LEDGER}\0M\0public/research/sources.yml\0M\0public/research/automated-publications.yml\0`, 2)).toHaveLength(3);
});

test("every allowed history category obeys the same count, ledger, and no-deletion laws", () => {
  const categories = ["origins-and-early-company", "executives-and-team", "acquisitions", "product-launches", "country-expansion",
    "payment-and-payout-expansion", "fundraising", "headquarters-and-offices", "publishing", "company-milestones"];
  for (const category of categories) {
    const path = `public/history/${category}.yml`;
    for (const status of ["A", "M"]) {
      for (const fields of [[`${status}\0${path}`, `M\0${LEDGER}`], [`M\0${LEDGER}`, `${status}\0${path}`]]) {
        expect(new Set(generatedPaths(`${fields.join("\0")}\0`, 0))).toEqual(new Set([path, LEDGER]));
      }
    }
    for (const status of ["D", "T", "R100", "U"]) {
      expect(() => generatedPaths(`M\0${LEDGER}\0${status}\0${path}\0`, 0)).toThrow();
    }
    expect(() => generatedPaths(`M\0${path}\0`, 0)).toThrow();
    expect(() => generatedPaths(`M\0${LEDGER}\0M\0../${path}\0`, 0)).toThrow();
  }
});

test.each(["staged", "untracked"] as const)("unexpected %s source changes prevent any remote writes", async kind => {
  const fixture = new Fixture();
  if (kind === "staged") fixture.staged = ".github/workflows/ci.yml\n";
  else fixture.untracked = "scripts/unexpected.ts\0";
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.writes).toHaveLength(0);
});

test.each(["git/trees", "git/commits", "git/refs", "pulls", "actions/workflows/200/dispatches"])("a failed %s response is uncertain and is never retried", async endpoint => {
  const fixture = new Fixture();
  fixture.override = (method, path, original) => {
    if (method === "POST" && path === endpoint) throw new Error("Transport failed after remote acceptance");
    return original;
  };
  await expect(fixture.deliver()).rejects.toThrow("Transport failed");
  expect(fixture.calls.filter(call => call.argv[3] === "POST" && call.argv[6] === `repos/${REPO}/${endpoint}`)).toHaveLength(1);
  expect((fixture.report.operations as Data[]).at(-1)?.state).toBe("uncertain");
  expect(fixture.calls.some(call => call.argv[1] === "pr")).toBe(false);
});

test("failed merge command is never retried or followed by a main dispatch", async () => {
  const fixture = new Fixture();
  fixture.commandOverride = argv => { if (argv[1] === "pr") throw new Error("Uncertain merge"); return undefined; };
  await expect(fixture.deliver()).rejects.toThrow("Uncertain merge");
  expect(fixture.calls.filter(call => call.argv[1] === "pr")).toHaveLength(1);
  expect(fixture.writes.filter(call => call.input && (JSON.parse(call.input) as Data).ref === "main")).toHaveLength(0);
});

test("strict server policy refuses a base race at merge instead of integrating an untested base", async () => {
  const fixture = new Fixture();
  fixture.commandOverride = (argv, state) => {
    if (argv[1] !== "pr") return undefined;
    expect(state.report.requiredStrict).toBe(true);
    // Another PR advances main after the client's guard. Strict Required is the
    // server-side gate here; --match-head-commit only protects the candidate head.
    state.main = BASE_TREE;
    throw new Error("Server refused merge: branch is not up to date with strict Required");
  };
  await expect(fixture.deliver()).rejects.toThrow("Server refused merge");
  expect(fixture.merged).toBe(false);
  expect(fixture.main).toBe(BASE_TREE);
  expect(fixture.report.integrated).toBeUndefined();
  expect(fixture.calls.filter(call => call.argv[1] === "pr")).toHaveLength(1);
  expect(fixture.writes.filter(call => call.input && (JSON.parse(call.input) as Data).ref === "main")).toHaveLength(0);
  expect((fixture.report.operations as Data[]).at(-1)?.state).toBe("uncertain");
});

test.each([
  ["missing Required", "jobs"], ["failed Required", "failed"], ["wrong check SHA", "sha"], ["wrong provider", "provider"],
  ["wrong check suite", "suite"], ["wrong check name", "name"], ["truncated jobs", "pagination"], ["failed run", "run"],
  ["unexpected retry", "attempt"], ["foreign repository", "repository"], ["wrong event", "event"],
] as const)("rejects %s before merging", async (_label, mutation) => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => {
    const result = structuredClone(value) as Data;
    if (path === "actions/runs/900/attempts/1/jobs?per_page=100") {
      if (mutation === "jobs") { result.jobs = (result.jobs as Data[]).filter(job => job.name !== "Required"); result.total_count = 2; }
      if (mutation === "failed") (result.jobs as Data[])[2]!.conclusion = "failure";
      if (mutation === "pagination") result.total_count = 101;
    }
    if (path === "check-runs/9002") {
      if (mutation === "sha") result.head_sha = SOURCE;
      if (mutation === "provider") result.app = { id: 42, slug: "github-actions" };
      if (mutation === "suite") result.check_suite = { id: 999 };
      if (mutation === "name") result.name = "Unrelated";
    }
    if (path === "actions/runs/900") {
      if (mutation === "run") result.conclusion = "failure";
      if (mutation === "attempt") result.run_attempt = 2;
      if (mutation === "repository") result.head_repository = { full_name: "fork/stripe-history" };
      if (mutation === "event") result.event = "pull_request";
    }
    return result;
  };
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.calls.some(call => call.argv[1] === "pr")).toBe(false);
});

test.each(["head", "base", "branch"] as const)("rejects PR %s drift before merging", async field => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => {
    if (path === "pulls/7" && field !== "branch") {
      const result = structuredClone(value) as Data;
      (result[field] as Data).sha = BASE_TREE;
      return result;
    }
    if (path === `git/ref/heads/${BRANCH}` && field === "branch") return { ref: `refs/heads/${BRANCH}`, object: { type: "commit", sha: BASE_TREE } };
    return value;
  };
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.calls.some(call => call.argv[1] === "pr")).toBe(false);
});

test.each(["candidate", "main"] as const)("rejects %s ref movement during dispatch instead of admitting another SHA", async phase => {
  const fixture = new Fixture();
  fixture.override = (method, path, value, state) => {
    if (method === "POST" && path === "actions/workflows/200/dispatches" && state.merged === (phase === "main")) {
      if (phase === "main") state.main = BASE_TREE; else state.branch = BASE_TREE;
    }
    return value;
  };
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.report.state).toBe("failed");
  expect(fixture.calls.some(call => call.argv[6]?.startsWith(`repos/${REPO}/deployments?`))).toBe(false);
});

test.each(["parent", "tree"] as const)("checks the actual integrated %s before dispatching main CI", async field => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => path === `git/commits/${INTEGRATED}`
    ? { sha: INTEGRATED, tree: { sha: field === "tree" ? BASE_TREE : TREE }, parents: [{ sha: field === "parent" ? BASE_TREE : SOURCE }] } : value;
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.report.integrated).toBe(INTEGRATED);
  expect(fixture.writes.filter(call => call.input && (JSON.parse(call.input) as Data).ref === "main")).toHaveLength(0);
});

test.each(["wrong SHA", "duplicate run", "incomplete page"] as const)("rejects dispatch discovery with %s", async kind => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => {
    const result = structuredClone(value) as Data;
    if (path.startsWith("actions/workflows/200/runs?") && result.total_count === 1) {
      const runs = result.workflow_runs as Data[];
      if (kind === "wrong SHA") runs[0]!.head_sha = SOURCE;
      if (kind === "duplicate run") { runs.push({ ...runs[0], id: 999 }); result.total_count = 2; }
      if (kind === "incomplete page") result.total_count = 2;
    }
    return result;
  };
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.calls.some(call => call.argv[1] === "pr")).toBe(false);
});

test.each(["wrong deployment SHA", "wrong deployment provider", "failed deployment", "foreign deployment URL", "failed browser"] as const)("retains failure after merge for %s", async kind => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => {
    const result = structuredClone(value);
    if (path.startsWith("deployments?")) {
      if (kind === "wrong deployment SHA") (result as Data[])[0]!.sha = CANDIDATE;
      if (kind === "wrong deployment provider") (result as Data[])[0]!.creator = { id: 42, login: "vercel[bot]" };
    }
    if (path === "deployments/80/statuses?per_page=100") {
      if (kind === "failed deployment") (result as Data[])[0]!.state = "failure";
      if (kind === "foreign deployment URL") (result as Data[])[0]!.environment_url = "https://example.com";
    }
    if (path === "actions/runs/902" && kind === "failed browser") (result as Data).conclusion = "failure";
    return result;
  };
  await expect(fixture.deliver()).rejects.toThrow();
  expect(fixture.report.integrated).toBe(INTEGRATED);
  expect(fixture.report.state).toBe("failed");
  expect(fixture.calls.filter(call => call.argv[1] === "pr")).toHaveLength(1);
});

test("an API read failure stops immediately without retrying or merging", async () => {
  const fixture = new Fixture();
  fixture.override = (_method, path, value) => { if (path === "check-runs/9002") throw new Error("API unavailable"); return value; };
  await expect(fixture.deliver()).rejects.toThrow("API unavailable");
  expect(fixture.calls.filter(call => call.argv[6] === `repos/${REPO}/check-runs/9002`)).toHaveLength(1);
  expect(fixture.calls.some(call => call.argv[1] === "pr")).toBe(false);
});

test("queued evidence has one bounded waiter and leaves time for failure reporting", async () => {
  const fixture = new Fixture();
  fixture.time += 40 * 60_000;
  fixture.override = (_method, path, value) => path === "actions/runs/900" ? { ...(value as Data), status: "queued", conclusion: null } : value;
  await expect(fixture.deliver()).rejects.toThrow("deadline");
  expect(fixture.time).toBe(BASE_TIME + 42 * 60_000);
  expect(fixture.calls.filter(call => call.argv[6] === `repos/${REPO}/actions/runs/900`).length).toBeLessThanOrEqual(8);
  expect(fixture.calls.some(call => call.argv[1] === "pr")).toBe(false);
});

test("the workflow keeps validation, issue recovery, artifacts and the existing job ceiling around the helper", () => {
  const workflow = readFileSync(new URL("../.github/workflows/weekly-news.yml", import.meta.url), "utf8");
  expect(workflow).toContain("permissions:\n  contents: read");
  expect(workflow).toContain("publish:\n    permissions:\n      actions: write\n      checks: read");
  expect(workflow).toContain("timeout-minutes: 45");
  expect(workflow).toContain("persist-credentials: false");
  expect(workflow.indexOf("deliver-weekly-history.ts preflight")).toBeLessThan(workflow.indexOf("bun run history:news:pull"));
  expect(workflow).toContain("steps.scope.outcome == 'success' && steps.validate.outcome == 'success'");
  expect(workflow).toContain("bun run history:research:audit\n          bun run check\n          bun run build");
  expect(workflow).toContain('test -z "$(git diff --name-only --diff-filter=D)"');
  expect(workflow).toContain('wc -l)" -le 5');
  expect(workflow).toContain("steps.preflight.outcome == 'failure'");
  expect(workflow).toContain("steps.delivery.outcome == 'failure'");
  expect(workflow).toContain("Retaining the delivery-failure issue until a later exact delivery succeeds.");
  expect(workflow).toContain("path: weekly-news/");
  expect(workflow).toContain("retention-days: 30");
  expect(workflow).not.toContain("HEAD:main");
});
