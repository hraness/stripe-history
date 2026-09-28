import { notFoundDescription, notFoundTitle, recoveryLinks } from "@/app/site-copy";

/**
 * The Markdown not-found document. It reads no corpus files, so the proxy can
 * answer unknown Markdown paths without the YAML records.
 */
export function notFoundMarkdown(): string {
  return [
    `# ${notFoundTitle}`,
    "",
    `> ${notFoundDescription}`,
    "",
    "Continue from:",
    "",
    recoveryLinks.map(({ href, label }) => `- [${label}](${href})`).join("\n"),
    "",
  ].join("\n");
}
