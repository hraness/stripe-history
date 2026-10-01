import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { LaunchOptions } from 'playwright-core';

export function pinnedBrowserExecutable(provisioned: string, override?: string): string {
  assert.ok(isAbsolute(provisioned), 'The pinned Playwright executable must be absolute');
  const pinned = realpathSync(provisioned);
  assert.equal(pinned, resolve(provisioned), 'The provisioned browser must not redirect through a symlink');
  assert.ok(!/Google Chrome\.app|[/\\]google-chrome(?:-stable)?(?:[/\\]|$)/u.test(pinned), 'System Chrome is not an owned verification browser');
  if (override) {
    assert.ok(isAbsolute(override), 'The browser alias must be absolute');
    assert.equal(realpathSync(override), pinned, 'The browser alias must resolve to the pinned Playwright executable');
  }
  return pinned;
}

/** Merge the authored Playwright defaults into one effective feature switch. */
export function ownedBrowserOptions(executablePath: string, defaultArgs = pinnedDefaultArgs()): LaunchOptions {
  const disabled = defaultArgs.filter(argument => argument.startsWith('--disable-features='));
  assert.equal(disabled.length, 1, 'Cannot reconcile pinned Playwright Chromium defaults');
  const features = [...new Set([...disabled[0]!.slice('--disable-features='.length).split(','), 'PaintHolding', 'MacAppCodeSignClone'])];
  return {
    executablePath, headless: true, ignoreDefaultArgs: disabled,
    args: [...(defaultArgs.includes('--mute-audio') ? [] : ['--mute-audio']), `--disable-features=${features.join(',')}`],
  };
}

function pinnedDefaultArgs(): string[] {
  const require = createRequire(import.meta.url);
  const core = dirname(require.resolve('playwright-core/package.json'));
  const installed = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8')) as { version: string };
  const consumer = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { devDependencies: Record<string, string> };
  assert.equal(installed.version, consumer.devDependencies['playwright-core'], 'Install the authored Playwright pin before browser verification');
  assert.ok(['1.61.1', '1.62.0'].includes(installed.version), 'Reconcile this Playwright version before browser verification');
  const runtime = require(join(core, 'lib/coreBundle.js')) as {
    server: { createPlaywright(options: { sdkLanguage: string }): { chromium: { _innerDefaultArgs(options: { headless: boolean }): unknown } } };
  };
  const defaults = runtime.server.createPlaywright({ sdkLanguage: 'javascript' }).chromium._innerDefaultArgs({ headless: true });
  assert.ok(Array.isArray(defaults) && defaults.every((argument: unknown) => typeof argument === 'string'), 'Invalid pinned Chromium defaults');
  return defaults as string[];
}
