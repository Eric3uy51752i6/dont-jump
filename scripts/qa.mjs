import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.env.DJ_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-pro', width: 393, height: 852 },
  { name: 'ipad-portrait', width: 820, height: 1180 },
  { name: 'ipad-landscape', width: 1180, height: 820 },
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'widescreen', width: 1920, height: 1080 }
];

fs.mkdirSync('qa-output', { recursive: true });
const failures = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));
  const response = await page.goto(base, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`${viewport.name}: homepage HTTP ${response?.status()}`);
  await page.locator('.boot').waitFor({ state: 'detached', timeout: 2500 }).catch(() => {});
  await page.locator('[data-microgame]').click();
  if (!(await page.locator('[data-microgame]').getAttribute('class'))?.includes('did-jump')) failures.push(`${viewport.name}: microgame did not jump`);
  await page.locator('#daily').scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 3) failures.push(`${viewport.name}: horizontal overflow ${overflow}px`);
  if (errors.length) failures.push(`${viewport.name}: ${errors.join(' | ')}`);
  if (['iphone-pro', 'desktop'].includes(viewport.name)) await page.screenshot({ path: `qa-output/home-${viewport.name}.png`, fullPage: true });
  await page.close();
}

const game = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
const gameErrors = [];
game.on('console', (message) => { if (message.type() === 'error') gameErrors.push(`console: ${message.text()}`); });
game.on('pageerror', (error) => gameErrors.push(`pageerror: ${error.message}`));
game.on('requestfailed', (request) => gameErrors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));
const gameResponse = await game.goto(`${base}game/`, { waitUntil: 'domcontentloaded' });
if (!gameResponse?.ok()) failures.push(`game: HTTP ${gameResponse?.status()}`);
await game.waitForFunction(() => window.__CREATE_QA?.campaign?.length === 100 && window.__DJ_HOST, null, { timeout: 8000 }).catch((error) => failures.push(`game: runtime unavailable ${error.message}`));
const campaignLength = await game.evaluate(() => window.__CREATE_QA?.campaign?.length || 0);
if (campaignLength !== 100) failures.push(`game: expected 100 levels, found ${campaignLength}`);
await game.locator('#game').tap({ position: { x: 196, y: 520 } });
await game.waitForTimeout(300);
const modeAfterTap = await game.evaluate(() => window.__CREATE_QA?.app?.mode);
if (!modeAfterTap) failures.push('game: canvas input produced no mode');
await game.keyboard.press('Space');
await game.waitForTimeout(80);
await game.keyboard.press('Escape');
await game.waitForTimeout(80);
await game.locator('[data-game-mute]').click();
if ((await game.locator('[data-game-mute]').getAttribute('aria-pressed')) !== 'true') failures.push('game: mute control did not update');
await game.locator('[data-game-restart]').click();
await game.screenshot({ path: 'qa-output/game-iphone-pro.png', fullPage: true });
if (gameErrors.length) failures.push(`game: ${gameErrors.join(' | ')}`);
await game.close();

const routes = ['support.html', 'privacy.html', '404.html', 'manifest.webmanifest', 'sw.js', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/social/dont-jump-social.png'];
const routePage = await browser.newPage();
for (const route of routes) {
  const response = await routePage.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status()}`);
}
await routePage.close();
await browser.close();

if (failures.length) {
  console.error(`QA FAILED (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`QA passed: ${viewports.length} responsive layouts, 100-level game runtime, controls, PWA assets, and key routes.`);
