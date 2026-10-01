import { test, expect } from 'bun:test';
import { mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ownedBrowserOptions, pinnedBrowserExecutable } from './pinned-browser.ts';

test('browser overrides may alias the pinned binary but cannot substitute a system browser', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'stripe-browser-')));
  try {
    const pinned = join(root, 'chromium');
    const alias = join(root, 'alias');
    const system = join(root, 'google-chrome');
    writeFileSync(pinned, 'pinned');
    writeFileSync(system, 'system');
    symlinkSync(pinned, alias);
    expect(pinnedBrowserExecutable(pinned, alias)).toBe(pinned);
    expect(() => pinnedBrowserExecutable(pinned, system)).toThrow('pinned Playwright executable');
    expect(() => pinnedBrowserExecutable(system)).toThrow('System Chrome');
    rmSync(pinned);
    symlinkSync(system, pinned);
    expect(() => pinnedBrowserExecutable(pinned)).toThrow('symlink');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test('browser launch preserves Playwright features with one merged switch and audio setting', () => {
  const defaults = ['--disable-features=DefaultA,DefaultB', '--mute-audio'];
  const options = ownedBrowserOptions('/pinned', defaults);
  const effective = [...defaults.filter(argument => !(options.ignoreDefaultArgs as string[]).includes(argument)), ...options.args!];
  expect(effective.filter(argument => argument.startsWith('--disable-features='))).toEqual(['--disable-features=DefaultA,DefaultB,PaintHolding,MacAppCodeSignClone']);
  expect(effective.filter(argument => argument === '--mute-audio')).toHaveLength(1);
  expect(ownedBrowserOptions('/pinned', defaults.slice(0, 1)).args).toContain('--mute-audio');
  expect(() => ownedBrowserOptions('/pinned', [])).toThrow('defaults');
  expect(() => ownedBrowserOptions('/pinned', ['--disable-features=A', '--disable-features=B'])).toThrow('defaults');
});
