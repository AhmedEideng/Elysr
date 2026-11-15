import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const assetDir = resolve(process.cwd(), "dist/assets");
const cssFile = readdirSync(assetDir).find((file) => /^index-.*\.css$/.test(file));
if (!cssFile) throw new Error("Build the site before running the stylesheet test");
const css = readFileSync(resolve(assetDir, cssFile), "utf8");
const paths = [
  "/",
  "/products/men",
  "/products/hammer-of-thor-capsules",
  "/education",
  "/about",
  "/cart",
];

for (const width of [390, 1440]) {
  test(`initial CSS matches the complete stylesheet at ${width}px`, async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      viewport: { width, height: 800 },
      javaScriptEnabled: true,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    let cssRequests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith(`/assets/${cssFile}`)) cssRequests++;
    });
    let external = false;
    await page.route("**/*", async (route) => {
      // Avoid font-display: optional cache timing differences between navigations.
      if (route.request().url().includes("/fonts/")) {
        await route.abort();
      } else if (external && route.request().isNavigationRequest()) {
        const response = await route.fetch();
        const html = await response.text();
        const replaced = html.replace(
          /<style id="entry-stylesheet">[\s\S]*?<\/style>/,
          `<link rel="stylesheet" href="/assets/${cssFile}">`,
        );
        expect(replaced).not.toBe(html);
        await route.fulfill({ response, body: replaced });
      } else await route.continue();
    });
    for (const path of paths) {
      external = false;
      cssRequests = 0;
      await page.goto(`http://127.0.0.1:8080${path}`, { waitUntil: "networkidle" });
      expect(cssRequests, `entry CSS request on ${path}`).toBe(0);
      expect(await page.locator("#entry-stylesheet").textContent()).toBe(css);
      expect(await page.locator(`link[rel="stylesheet"][href="/assets/${cssFile}"]`).count()).toBe(
        0,
      );
      await page.evaluate(() => document.fonts.ready);
      const inline = await page.screenshot({ animations: "disabled" });
      external = true;
      await page.goto(`http://127.0.0.1:8080${path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const reference = await page.screenshot({ animations: "disabled" });
      const a = await sharp(inline).removeAlpha().raw().toBuffer();
      const b = await sharp(reference).removeAlpha().raw().toBuffer();
      let different = 0;
      for (let i = 0; i < a.length; i += 3) {
        if (
          Math.max(
            Math.abs(a[i] - b[i]),
            Math.abs(a[i + 1] - b[i + 1]),
            Math.abs(a[i + 2] - b[i + 2]),
          ) > 20
        )
          different++;
      }
      expect(
        different / (a.length / 3),
        `stylesheet differs on ${path} at ${width}px`,
      ).toBeLessThan(0.01);
    }
    await context.close();
  });
}

test("inline stylesheet works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of paths) {
    await page.goto(`http://127.0.0.1:8080${path}`, { waitUntil: "domcontentloaded" });
    expect(await page.locator("#entry-stylesheet").textContent()).toBe(css);
    expect(
      await page
        .locator("#entry-stylesheet")
        .evaluate((style) => Boolean((style as HTMLStyleElement).sheet)),
    ).toBe(true);
  }
  await context.close();
});
