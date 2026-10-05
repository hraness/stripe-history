import { describe, expect, test } from "bun:test";
import { copyFileSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { loadHistory } from "@/lib/content";
import { markdownForPath } from "@/lib/page-markdown";

import { dataIntro, dataReadExample } from "../site-copy";
import DataPage, { metadata } from "./page";

const root = join(import.meta.dir, "..", "..");

describe("Stripe History dataset", () => {
  test("prints the documented sample lines when the documented command reads the acquisitions file", () => {
    const script = /^bun -e '(.*)'$/u.exec(dataReadExample.commands.at(-1) ?? "")?.[1];
    if (script === undefined) throw new Error("The last documented command must be a bun -e script.");
    const directory = mkdtempSync(join(tmpdir(), "stripe-history-read-example-"));
    try {
      copyFileSync(join(root, "public/history/acquisitions.yml"), join(directory, "acquisitions.yml"));
      symlinkSync(join(root, "node_modules"), join(directory, "node_modules"), "dir");
      const result = Bun.spawnSync([process.execPath, "-e", script], { cwd: directory });
      const lines = result.stdout.toString().trim().split("\n");

      expect(result.exitCode).toBe(0);
      expect(lines[0]).toBe("acquisitions");
      for (const line of dataReadExample.sampleLines) expect(lines).toContain(line);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
    expect(dataReadExample.commands.slice(0, 2)).toEqual([
      "curl --fail --location --output acquisitions.yml https://hraness.com/stripe/history/acquisitions.yml",
      "bun add yaml",
    ]);
  });

  test("renders the reading example on the page and in its Markdown twin", async () => {
    const html = renderToStaticMarkup(await DataPage());
    const markdown = (await markdownForPath("/data")).body;

    expect(html).toContain('<h2 id="read-history-file-heading">Read a history file</h2>');
    expect(markdown).toContain("## Read a history file");
    for (const command of dataReadExample.commands) {
      expect(markdown).toContain(command);
    }
    for (const line of dataReadExample.sampleLines) {
      expect(html).toContain(line);
      expect(markdown).toContain(line);
    }
    expect(html).toContain("bun add yaml");
    expect(html).toContain("<code>date_precision</code>");
    expect(markdown).toContain("`date_precision`");
    expect(html).toContain('href="https://github.com/hraness/stripe-history/blob/main/lib/history-schema.ts"');
  });

  test("publishes a canonical dataset search result", () => {
    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/data" },
      title: { absolute: "Stripe History dataset: sourced events and financials" },
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://hraness.com/stripe/data",
    });
  });

  test("renders every category as a crawlable page and YAML download", async () => {
    const html = renderToStaticMarkup(await DataPage());
    const history = await loadHistory();

    expect(html).toContain('<h1 id="data-heading">Stripe History dataset</h1>');
    expect(html).toContain(`${history.events.length} sourced events`);
    expect(html).toContain(dataIntro);
    expect(html).toContain("Questions this history answers");
    expect(html).toContain("How did Stripe start, and who has led the company?");
    expect(html).toContain("What companies has Stripe acquired?");
    expect(html).toContain("How have Stripe&#x27;s funding and valuation changed?");
    expect(html).toContain("How much payment volume has Stripe processed?");
    expect(html).toContain("What sourced net-revenue figures exist?");
    expect(html).toContain("When did Stripe launch products and expand globally?");
    expect(html).toContain('href="/history/origins-and-early-company"');
    expect(html).toContain('href="/history/executives-and-team"');
    expect(html.match(/download YAML/gu)).toHaveLength(12);
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('href="/stripe/history/acquisitions.yml"');
    expect(html).toContain('href="/history/valuation"');
    expect(html).toContain('href="/history/net-revenue"');
    expect(html).toContain('href="/stripe/research/sources.yml"');
    expect(html).toContain('href="/stripe/research/valuations.yml"');
    expect(html).toContain('href="/stripe/history/company-milestones.yml"');
    expect(html).toContain('href="/stripe/research/appearances.yml"');
    expect(html).toContain('href="/history/appearances"');
    expect(html).not.toContain('href="/appearances/backfill"');
    expect(html).not.toContain('href="/stripe/research/appearance-backfill.yml"');
    expect(html).toContain('href="/stripe/research/collections.yml"');
    expect(html).toContain('href="/stripe/research/runs.yml"');
    expect(html).toContain('href="https://www.stripeeconomics.com/"');
    expect(html).toContain('href="https://worksinprogress.co/"');
    expect(html).toContain('href="https://press.stripe.com/"');
    expect(html).toContain('href="https://stripe.com/blog"');
    expect(html).toContain('href="https://stripe.dev/blog"');
    expect(html).toContain('href="https://podcasts.apple.com/us/podcast/cheeky-pint/id1821055332"');
    expect(html).toContain('href="/history/publishing"');
    expect(html).toContain("does not ingest every newsletter essay");
    expect(html).toContain(`${history.sources.length} sources`);
    expect(html).toContain("Sources and research files");
    expect(html).toContain("research log (YAML)");
    expect(html).toContain(`${history.valuations.length} observations`);
    expect(html).toContain("charts sourced company full-year figures");
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).toContain('id="stripe-history-dataset-structured-data"');
  });
});
