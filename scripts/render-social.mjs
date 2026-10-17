import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(
  process.env.SEEDCLOCK_PLAYWRIGHT || "playwright"
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(resolve("assets/social-card.svg")).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve("public/social-card.png"),
    type: "png",
  });
  console.log(
    "Rendered public/social-card.png (1200 × 630). Rebuild to update dist/.",
  );
} finally {
  await browser.close();
}
