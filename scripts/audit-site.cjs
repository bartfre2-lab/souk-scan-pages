/* Read-only browser audit. No account creation, submissions or auth requests. */
const engines = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const { mkdir, writeFile } = require("node:fs/promises");
const { resolve } = require("node:path");
const assert = require("node:assert/strict");
const start = process.env.AUDIT_URL || "http://localhost:4175/";
const output = resolve(process.env.AUDIT_OUTPUT || "test-results/final-audit");
const remote = !/localhost|127\.0\.0\.1/.test(new URL(start).hostname);
const origin = new URL(start).origin;
const args = new Set(process.argv.slice(2));
const engine = process.env.AUDIT_BROWSER || "chromium";
const report = {
  base: start,
  browser: engine,
  pages: [],
  links: [],
  assets: [],
  layouts: [],
  accessibility: [],
  motion: [],
  errors: [],
};
const fail = (type, data) => report.errors.push({ type, ...data });
let browser;
async function crawl() {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const queue = [start];
  if (remote)
    for (const route of [
      "/",
      "/app/",
      "/privacy/",
      "/terms/",
      "/account-deletion/",
      "/preview/souk-app/",
      "/google7e57ca047c540b15.html",
    ])
      queue.push(origin + route);
  const visited = new Set(),
    checked = new Set(),
    assets = new Map(),
    emails = new Set();
  async function checkAsset(url) {
    if (assets.has(url)) return;
    assets.set(url, true);
    try {
      const response = await context.request.get(url, { timeout: 30000 });
      const status = response.status(),
        type = response.headers()["content-type"] || "";
      report.assets.push({ url, status });
      if (status >= 400) fail("asset", { url, status });
      if (type.includes("text/css")) {
        const css = await response.text();
        for (const match of css.matchAll(
          /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g,
        )) {
          const resource = match[1] ?? match[2] ?? match[3];
          if (!/^(data:|#)/.test(resource))
            await checkAsset(new URL(resource, url).href);
        }
      }
    } catch (error) {
      fail("asset-request", { url, message: error.message });
    }
  }
  while (queue.length) {
    const url = new URL(queue.shift());
    url.hash = "";
    url.search = "";
    if (visited.has(url.href)) continue;
    visited.add(url.href);
    const page = await context.newPage();
    page.on("pageerror", (e) =>
      fail("console", { url: url.href, message: e.message }),
    );
    page.on("response", (r) => {
      if (r.status() >= 400)
        fail("network", { page: url.href, url: r.url(), status: r.status() });
    });
    try {
      const response = await page.goto(url.href, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      report.pages.push({
        url: url.href,
        status: response.status(),
        title: await page.title(),
      });
      if (response.status() >= 400)
        fail("page", { url: url.href, status: response.status() });
      await page
        .locator('img[loading="lazy"]')
        .evaluateAll((images) => images.forEach((i) => (i.loading = "eager")));
      await page.evaluate(() =>
        Promise.all(
          [...document.images].map((i) =>
            i.complete
              ? Promise.resolve()
              : new Promise((r) => {
                  i.addEventListener("load", r, { once: true });
                  i.addEventListener("error", r, { once: true });
                }),
          ),
        ),
      );
      const broken = await page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((i) => !i.complete || !i.naturalWidth)
            .map((i) => i.src),
        );
      for (const image of broken) fail("image", { page: url.href, url: image });
      const resources = await page
        .locator(
          'script[src],link[rel="stylesheet"],link[rel="icon"],link[rel="preload"],img[src]',
        )
        .evaluateAll((es) => es.map((e) => e.src || e.href));
      for (const resource of new Set(resources))
        if (resource.startsWith("http")) await checkAsset(resource);
      const links = await page.locator("a").evaluateAll((es) =>
        es.map((e) => ({
          href: e.getAttribute("href"),
          text: e.textContent.trim(),
        })),
      );
      for (const link of links) {
        if (!link.href || link.href.trim() === "#") {
          fail("empty-link", { page: url.href, ...link });
          continue;
        }
        if (link.href.startsWith("mailto:")) {
          if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@?]+(?:\?|$)/.test(link.href))
            fail("email-link", { page: url.href, ...link });
          emails.add(link.href);
          continue;
        }
        const target = new URL(link.href, url);
        if (!/^https?:$/.test(target.protocol)) {
          fail("link-protocol", { page: url.href, ...link });
          continue;
        }
        const hash = target.hash;
        target.hash = "";
        if (hash && target.href === url.href) {
          const exists = await page.evaluate(
            (id) => !!document.getElementById(decodeURIComponent(id)),
            hash.slice(1),
          );
          if (!exists) fail("fragment", { page: url.href, href: link.href });
        }
        if (checked.has(target.href)) continue;
        checked.add(target.href);
        const result = await context.request.get(target.href, {
          timeout: 30000,
        });
        const status = result.status(),
          type = result.headers()["content-type"] || "";
        report.links.push({ url: target.href, status });
        if (status >= 400)
          fail("link", { page: url.href, url: target.href, status });
        if (target.origin === origin && type.includes("text/html"))
          queue.push(target.href);
      }
      if (url.href.startsWith(start) && !/\.html$/.test(url.pathname)) {
        for (const category of ["fruit", "vegetable", "meat", "poultry"]) {
          const stall = page.locator(`button[data-category="${category}"]`);
          if (await stall.count()) await stall.click();
        }
        for (const href of await page
          .locator("svg image")
          .evaluateAll((es) => es.map((e) => e.getAttribute("href"))))
          if (href) await checkAsset(new URL(href, url).href);
      }
    } catch (error) {
      fail("crawl-exception", { url: url.href, message: error.message });
    }
    await page.close();
  }
  report.emails = [...emails];
  for (const file of ["robots.txt", "sitemap.xml"]) {
    const url = new URL(file, start).href;
    const response = await context.request.get(url);
    report.links.push({ url, status: response.status() });
    if (response.status() >= 400)
      fail("utility", { url, status: response.status() });
    if (file === "sitemap.xml" && response.ok())
      for (const [, location] of (await response.text()).matchAll(
        /<loc>([^<]+)<\/loc>/g,
      )) {
        // Canonical sitemap URLs use the production origin even in local builds.
        const target = new URL(location);
        const checkedURL =
          !remote && target.origin === "https://soukscan.online"
            ? origin + target.pathname + target.search
            : location;
        const linked = await context.request.get(checkedURL);
        if (!linked.ok())
          fail("sitemap-url", { url: location, status: linked.status() });
      }
  }
  await context.close();
}
async function motionChecks() {
  for (const width of [390, 1366]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) =>
      fail("motion-console", { width, message: e.message }),
    );
    try {
      await page.goto(start, { waitUntil: "networkidle" });
      await page.locator('button[data-category="fruit"]').click();
      assert.ok(
        await page
          .locator(".courtyard-product")
          .evaluateAll((es) =>
            es.some((e) => e.getAnimations({ subtree: true }).length > 0),
          ),
        "Crates animate on selection",
      );
      for (const category of [
        "poultry",
        "meat",
        "vegetable",
        "fruit",
        "poultry",
      ]) {
        await page.locator(`button[data-category="${category}"]`).click();
        await page.waitForTimeout(40);
      }
      assert.equal(await page.locator(".courtyard-product").count(), 4);
      const settled = () =>
        document.querySelectorAll(".courtyard-ghost").length === 0 &&
        [...document.querySelectorAll(".courtyard-product")].every(
          (e) => e.getAnimations({ subtree: true }).length === 0,
        );
      await page.waitForFunction(settled, {}, { timeout: 5000 });
      await page.locator('button[data-category="meat"]').click();
      await page.setViewportSize({
        width: width === 390 ? 360 : 1280,
        height: 800,
      });
      await page.waitForFunction(settled, {}, { timeout: 5000 });
      await page.locator('button[data-category="vegetable"]').click();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(settled, {}, { timeout: 5000 });
      await page.keyboard.press("Escape");
      assert.ok(await page.locator("#courtyard-welcome").isVisible());
      assert.equal(
        await page.locator(":focus").getAttribute("data-category"),
        "vegetable",
      );
      report.motion.push({ width, passed: true });
    } catch (error) {
      fail("motion", { width, message: error.message });
      report.motion.push({ width, passed: false });
    }
    await context.close();
  }
}
async function layouts() {
  for (const language of ["en", "fr", "ar"])
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        colorScheme: theme,
      });
      const page = await context.newPage();
      page.on("pageerror", (error) =>
        fail("console", { language, theme, message: error.message }),
      );
      const route = new URL(language === "en" ? "./" : language + "/", start)
        .href;
      await page.goto(route, { waitUntil: "networkidle" });
      for (const [width, height] of [
        [320, 844],
        [360, 800],
        [390, 844],
        [768, 1024],
        [1024, 768],
        [1366, 650],
        [1920, 1080],
        [844, 390],
      ]) {
        await page.setViewportSize({ width, height });
        const issues = await page.evaluate(() => {
          const issues = [],
            visible = (e) => {
              const r = e.getBoundingClientRect();
              return (
                r.width > 0 &&
                r.height > 0 &&
                getComputedStyle(e).visibility !== "hidden"
              );
            },
            rect = (e) => e.getBoundingClientRect();
          if (document.documentElement.scrollWidth > innerWidth)
            issues.push("Horizontal page overflow");
          for (const e of document.querySelectorAll(
            "h1,h2,h3,.hero-copy,.steps p,.download-copy p,.faq-list p,.courtyard-stall__label",
          )) {
            if (visible(e) && e.scrollWidth > e.clientWidth + 2)
              issues.push(
                "Text overflow: " + e.textContent.trim().slice(0, 100),
              );
          }
          for (const selector of [
            ".site-header",
            ".site-controls",
            ".hero-actions",
            ".footer-bottom>div",
          ]) {
            const parent = document.querySelector(selector);
            if (!parent) continue;
            const children = [...parent.children].filter(visible);
            for (let i = 0; i < children.length; i++)
              for (let j = i + 1; j < children.length; j++) {
                const a = rect(children[i]),
                  b = rect(children[j]);
                if (
                  a.left < b.right - 1 &&
                  a.right > b.left + 1 &&
                  a.top < b.bottom - 1 &&
                  a.bottom > b.top + 1
                )
                  issues.push("Overlapping controls: " + selector);
              }
          }
          for (const e of document.querySelectorAll(
            ".site-controls a,.theme-toggle,.courtyard-reset",
          ))
            if (visible(e) && rect(e).height < 24)
              issues.push("Small control target: " + e.textContent.trim());
          return issues;
        });
        for (const category of ["fruit", "vegetable", "meat", "poultry"]) {
          await page.locator(`button[data-category="${category}"]`).click();
          const stockIssues = await page
            .locator(".courtyard-scene")
            .evaluate((scene) => {
              const issues = [],
                s = scene.getBoundingClientRect(),
                stalls = [...scene.querySelectorAll(".courtyard-stall")].map(
                  (e) => e.getBoundingClientRect(),
                ),
                stock = scene
                  .querySelector(".courtyard-stock")
                  .getBoundingClientRect();
              if (stock.bottom > s.bottom - 10 || stock.top < s.top)
                issues.push("Stock leaves scene");
              for (const b of stalls)
                if (
                  stock.left < b.right - 0.5 &&
                  stock.right > b.left + 0.5 &&
                  stock.top < b.bottom - 0.5 &&
                  stock.bottom > b.top + 0.5
                )
                  issues.push("Stock overlaps stall");
              for (const e of scene.querySelectorAll(
                ".courtyard-product__name",
              ))
                if (e.scrollWidth > e.clientWidth + 1)
                  issues.push("Product text overflow: " + e.textContent);
              for (const e of scene.querySelectorAll(".stock-crate__food")) {
                const r = e.getBoundingClientRect(),
                  p = e.parentElement.getBoundingClientRect();
                if (
                  r.left < p.left - 0.5 ||
                  r.right > p.right + 0.5 ||
                  r.top < p.top - 0.5 ||
                  r.bottom > p.bottom + 0.5
                )
                  issues.push("Food leaves chamber");
              }
              return issues;
            });
          for (const issue of stockIssues) issues.push(category + ": " + issue);
        }
        for (const summary of await page.locator("summary").all()) {
          await summary.click();
          if (!(await summary.evaluate((e) => e.parentElement.open)))
            issues.push("FAQ failed to open");
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        if (overflow) issues.push("Overflow with all FAQ answers open");
        await page
          .locator("details")
          .evaluateAll((es) => es.forEach((e) => (e.open = false)));
        report.layouts.push({ language, theme, width, height, issues });
        for (const issue of issues)
          fail("layout", { language, theme, width, height, message: issue });
        if (width === 390 || width === 1366) {
          const scan = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          report.accessibility.push({
            language,
            theme,
            width,
            violations: scan.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.map((n) => n.target),
            })),
          });
          for (const violation of scan.violations)
            fail("accessibility", {
              language,
              theme,
              width,
              id: violation.id,
              nodes: violation.nodes.map((n) => n.target),
            });
          await page.locator(".courtyard-reset").click();
          await page.locator(".app-screen-preview").scrollIntoViewIfNeeded();
          await page.locator(".app-screen-preview").evaluate((i) => i.decode());
          if (process.env.AUDIT_SCREENSHOTS !== "0")
            await page.screenshot({
              path: resolve(output, `${language}-${theme}-${width}.png`),
              fullPage: true,
            });
        }
      }
      for (const section of [
        "privacy",
        "terms",
        "account-deletion",
        "support",
      ]) {
        await page.goto(new URL(section + "/", route).href);
        for (const width of [320, 768, 1366]) {
          await page.setViewportSize({ width, height: 844 });
          const issues = await page.evaluate(() => {
            const issues = [];
            if (document.documentElement.scrollWidth > innerWidth)
              issues.push("Horizontal page overflow");
            for (const e of document.querySelectorAll(
              "h1,h2,.legal-content p,.legal-footer",
            ))
              if (e.scrollWidth > e.clientWidth + 2)
                issues.push("Text overflow: " + e.textContent.slice(0, 80));
            return issues;
          });
          report.layouts.push({ language, theme, section, width, issues });
          for (const issue of issues)
            fail("legal-layout", {
              language,
              theme,
              section,
              width,
              message: issue,
            });
          if (width === 320) {
            const scan = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze();
            report.accessibility.push({
              language,
              theme,
              section,
              width,
              violations: scan.violations.map((v) => ({
                id: v.id,
                nodes: v.nodes.map((n) => n.target),
              })),
            });
            for (const v of scan.violations)
              fail("legal-accessibility", {
                language,
                theme,
                section,
                width,
                id: v.id,
                nodes: v.nodes.map((n) => n.target),
              });
          }
        }
      }
      await context.close();
    }
}
(async () => {
  await mkdir(output, { recursive: true });
  if (!["chromium", "firefox", "webkit"].includes(engine))
    throw new Error("Invalid audit browser");
  browser = await engines[engine].launch({
    ...(engine === "chromium"
      ? { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }
      : {}),
    headless: true,
    ...(remote && process.env.HTTPS_PROXY
      ? {
          proxy: {
            server: process.env.HTTPS_PROXY,
            bypass: "localhost,127.0.0.1",
          },
        }
      : {}),
  });
  try {
    if (args.has("--crawl")) await crawl();
    if (args.has("--layout")) await layouts();
    if (args.has("--motion")) await motionChecks();
  } catch (error) {
    fail("audit-exception", { message: error.message });
  } finally {
    await browser.close();
    await writeFile(
      resolve(output, "audit.json"),
      JSON.stringify(report, null, 2),
    );
  }
  console.log(
    JSON.stringify(
      {
        pages: report.pages.length,
        links: report.links.length,
        assets: report.assets.length,
        layouts: report.layouts.length,
        accessibility: report.accessibility.length,
        motion: report.motion.length,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
  if (report.errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
