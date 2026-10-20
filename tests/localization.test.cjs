const {
  marketContext,
  marketPage,
  installPriceFixtures,
  fixtureRows,
} = require("./market-fixtures.cjs");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { readFile, stat } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { resolve, extname, sep } = require("node:path");
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const root = resolve(__dirname, "..", "dist");
let server, browser, base;
const catalogs = Object.fromEntries(
  ["en", "fr", "ar"].map((lang) => [
    lang,
    require("../locales/" + lang + ".json"),
  ]),
);
before(async () => {
  server = createServer(async (req, res) => {
    try {
      let path = resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!path.startsWith(root + sep) && path !== root) throw Error("path");
      if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "text/javascript",
            ".png": "image/png",
            ".woff2": "font/woff2",
            ".svg": "image/svg+xml",
            ".xml": "application/xml",
          }[extname(path)] || "application/octet-stream",
      });
      res.end(await readFile(path));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
  });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server?.close(r));
});
const pathFor = (lang, section = "") =>
  "/" + (lang === "en" ? "" : lang + "/") + (section ? section + "/" : "");
test("regional requests cannot repaint a newer selection, and wholesale keeps its own date", async () => {
  const context = await marketContext(browser, {
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  let release;
  const gate = new Promise((r) => (release = r)),
    calls = [];
  await context.route("**/rest/v1/rpc/*", async (route) => {
    const body = route.request().postDataJSON(),
      fn = new URL(route.request().url()).pathname.split("/").pop();
    calls.push({ fn, body });
    if (
      fn === "get_product_aggregate" &&
      body.p_region_id === "casablanca-settat"
    )
      await gate;
    await route.fulfill({
      json: fixtureRows(fn, body),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  const p = await context.newPage();
  await p.goto(base);
  await p.locator('button[data-category="vegetable"]').click();
  await p.locator("#market-region").selectOption("oriental");
  await p.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-source="community"] .price-value')]
        .length === 4,
  );
  assert.deepEqual(
    await p.locator('[data-source="community"] .price-value').allTextContents(),
    Array(4).fill("20 – 22"),
  );
  release();
  await p.waitForFunction(
    () => !document.querySelector(".market-refresh").disabled,
  );
  await p.waitForTimeout(50);
  assert.deepEqual(
    await p.locator('[data-source="community"] .price-value').allTextContents(),
    Array(4).fill("20 – 22"),
  );
  assert.ok(
    (
      await p
        .locator('[data-source="reference"] time')
        .evaluateAll((es) => es.map((e) => e.dateTime))
    ).every((d) => d === "2026-10-14"),
  );
  assert.equal(
    calls.filter((c) => c.fn === "get_latest_wholesale_reference").length,
    4,
  );
  assert.ok(
    calls
      .filter((c) => c.fn === "get_latest_wholesale_reference")
      .every((c) => !("p_region_id" in c.body)),
  );
  await context.close();
});
test("failed refresh keeps valid same-region prices; first-load failures never become insufficient data", async () => {
  const context = await marketContext(browser, { reducedMotion: "reduce" });
  let failing = false;
  await context.route("**/rest/v1/rpc/*", async (route) => {
    const fn = new URL(route.request().url()).pathname.split("/").pop();
    await route.fulfill(
      failing
        ? { status: 503, json: { message: "unavailable" } }
        : { json: fixtureRows(fn, route.request().postDataJSON()) },
    );
  });
  const p = await context.newPage();
  await p.goto(base);
  await p.locator('button[data-category="fruit"]').click();
  await p.waitForFunction(
    () => !document.querySelector(".market-refresh").disabled,
  );
  const initial = await p
    .locator('[data-source="community"] .price-value')
    .allTextContents();
  failing = true;
  await p.locator(".market-refresh").click();
  await p.waitForFunction(
    () => !document.querySelector(".market-refresh").disabled,
  );
  assert.deepEqual(
    await p.locator('[data-source="community"] .price-value').allTextContents(),
    initial,
  );
  assert.equal(
    await p.locator("#market-fetch-state").innerText(),
    catalogs.en.prices.refreshFailed,
  );
  await p.locator("#market-region").selectOption("oriental");
  await p.waitForFunction(
    () => !document.querySelector(".market-refresh").disabled,
  );
  assert.equal(
    await p.locator('[data-source="community"][data-status="error"]').count(),
    4,
  );
  assert.equal(
    await p.locator('[data-source="community"] .price-value').count(),
    0,
  );
  failing = false;
  await p.locator(".market-refresh").click();
  await p.waitForFunction(
    () => !document.querySelector(".market-refresh").disabled,
  );
  assert.deepEqual(
    await p.locator('[data-source="community"] .price-value').allTextContents(),
    Array(4).fill("20 – 22"),
  );
  await context.close();
});
test("first visit requires an explicit region for community estimates and never signs in or sends coordinates", async () => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await installPriceFixtures(context, { region: null });
  const p = await context.newPage(),
    requests = [];
  p.on("request", (r) => {
    if (r.url().includes("/rest/v1/"))
      requests.push({ url: r.url(), body: r.postDataJSON() });
  });
  await p.goto(base);
  await p.locator('button[data-category="poultry"]').click();
  await p.waitForFunction(
    () => !document.querySelector(".market-refresh").disabled,
  );
  assert.equal(await p.locator("#market-region option").count(), 13);
  assert.equal(
    await p.locator('[data-source="community"][data-status="region"]').count(),
    4,
  );
  assert.ok(
    requests.every((r) => r.url.endsWith("/get_latest_wholesale_reference")),
  );
  await p.locator("#market-region").selectOption("casablanca-settat");
  await p.waitForFunction(
    () => !document.querySelector(".market-refresh").disabled,
  );
  assert.equal(
    await p
      .locator('[data-source="community"][data-status="insufficient"]')
      .count(),
    4,
  );
  assert.equal(await p.locator(".price-value").count(), 0);
  assert.ok(
    requests.every((r) =>
      Object.keys(r.body).every((k) =>
        ["p_product_id", "p_region_id"].includes(k),
      ),
    ),
  );
  await context.close();
});
for (const lang of ["en", "fr", "ar"])
  for (const theme of ["light", "dark"])
    for (const width of [390, 1366]) {
      test(`${lang} ${theme} ${width}px: complete locale, unclipped food, four fixed stalls and accessible theme`, async () => {
        const context = await marketContext(browser, {
          viewport: { width, height: width === 1366 ? 650 : 844 },
          reducedMotion: "reduce",
        });
        await context.addInitScript(
          (theme) => localStorage.setItem("soukscan.website.theme", theme),
          theme,
        );
        const p = await context.newPage(),
          errors = [];
        p.on("pageerror", (e) => errors.push(e.message));
        p.on("response", (r) => {
          if (r.status() >= 400) errors.push(r.url());
        });
        await p.goto(base + pathFor(lang), { waitUntil: "networkidle" });
        assert.equal(await p.locator("html").getAttribute("lang"), lang);
        assert.equal(
          await p.locator("html").getAttribute("dir"),
          lang === "ar" ? "rtl" : "ltr",
        );
        assert.equal(await p.locator("html").getAttribute("data-theme"), theme);
        assert.equal(await p.locator(".courtyard-stall").count(), 4);
        assert.equal(await p.locator(".site-header .site-controls").count(), 1);
        assert.ok(await p.locator(".site-header .theme-toggle").isVisible());
        for (const category of ["fruit", "poultry", "meat", "vegetable"]) {
          await p.locator(`button[data-category="${category}"]`).click();
          assert.equal(
            await p.locator("#products-title").textContent(),
            catalogs[lang].market.titles[category],
          );
          const names = await p
            .locator(".courtyard-product__name")
            .allTextContents();
          assert.ok(
            names.every((name) =>
              Object.values(catalogs[lang].market.products).includes(name),
            ),
          );
          const geometry = await p
            .locator(".courtyard-scene")
            .evaluate((scene) => {
              const s = scene.getBoundingClientRect(),
                stock = scene
                  .querySelector(".courtyard-stock")
                  .getBoundingClientRect();
              return {
                stockBottom: stock.bottom,
                sceneBottom: s.bottom,
                sceneHeight: s.height,
                food: [...scene.querySelectorAll(".stock-crate__food")].map(
                  (food) => {
                    const r = food.getBoundingClientRect(),
                      c = food.parentElement.getBoundingClientRect();
                    return (
                      r.left >= c.left - 0.5 &&
                      r.right <= c.right + 0.5 &&
                      r.top >= c.top - 0.5 &&
                      r.bottom <= c.bottom + 0.5
                    );
                  },
                ),
                labels: [
                  ...scene.querySelectorAll(".courtyard-product__name"),
                ].map((n) => n.scrollWidth <= n.clientWidth + 1),
              };
            });
          assert.ok(
            geometry.food.every(Boolean),
            "Every food sprite fits its visible stock chamber without cropping",
          );
          assert.ok(
            geometry.labels.every(Boolean),
            "Product names fit without horizontal clipping",
          );
          assert.ok(
            geometry.stockBottom < geometry.sceneBottom - 12,
            "Products and reset remain fully inside scene",
          );
          if (width === 1366)
            assert.ok(
              geometry.sceneHeight <= 500,
              "Laptop courtyard is at least 35% shorter than the old 780px scene",
            );
        }
        assert.equal(
          await p.evaluate(() => document.documentElement.scrollWidth),
          width,
        );
        const a11y = await new AxeBuilder({ page: p })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          a11y.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
        await p.locator(".courtyard-reset").click();
        assert.ok(await p.locator("#courtyard-welcome").isVisible());
        assert.deepEqual(errors, []);
        await context.close();
      });
    }
test("15 static localized pages have canonical/hreflang metadata and matching legal/language links without JavaScript", async () => {
  const context = await marketContext(browser, { javaScriptEnabled: false });
  for (const lang of ["en", "fr", "ar"])
    for (const section of [
      "",
      "privacy",
      "terms",
      "account-deletion",
      "support",
    ]) {
      const p = await context.newPage();
      const path = pathFor(lang, section);
      const response = await p.goto(base + path);
      assert.equal(response.status(), 200);
      assert.equal(await p.locator("html").getAttribute("lang"), lang);
      assert.ok((await p.locator("title").textContent()).includes("SOUK-SCAN"));
      assert.ok(
        (await p.locator('meta[name="description"]').getAttribute("content"))
          .length > 40,
      );
      assert.equal(
        await p.locator('link[rel="canonical"]').getAttribute("href"),
        "https://soukscan.online" + path,
      );
      for (const code of ["en", "fr", "ar"])
        assert.equal(
          await p
            .locator(`link[rel="alternate"][hreflang="${code}"]`)
            .getAttribute("href"),
          "https://soukscan.online" + pathFor(code, section),
        );
      for (const code of ["en", "fr", "ar"])
        assert.equal(
          await p
            .locator(`.site-controls a[lang="${code}"]`)
            .getAttribute("href"),
          pathFor(code, section),
        );
      if (section) {
        const allLinks = await p
          .locator(".legal-content a")
          .evaluateAll((ns) =>
            ns
              .map((n) => n.getAttribute("href"))
              .filter((h) => h.startsWith("/")),
          );
        assert.ok(
          allLinks.every((h) =>
            lang === "en"
              ? !/^\/(fr|ar)\//.test(h)
              : h.startsWith("/" + lang + "/"),
          ),
        );
        for (const link of new Set(allLinks))
          assert.equal((await p.request.get(base + link)).status(), 200);
      }
      if (section === "account-deletion") {
        assert.ok(
          await p
            .locator('a[href^="mailto:sanamdev@soukscan.online"]')
            .first()
            .isVisible(),
        );
        assert.match(
          await p.locator("main").textContent(),
          /com\.soukscan\.app/,
        );
        assert.match(await p.locator("main").textContent(), /30/);
      }
      if (section === "terms")
        assert.match(await p.locator(".legal-updated").textContent(), /12/);
      if (!section) {
        const schema = JSON.parse(
          await p.locator('script[type="application/ld+json"]').textContent(),
        );
        assert.equal(schema.inLanguage, lang);
        assert.equal(schema.name, "SOUK-SCAN");
      }
      await p.close();
    }
  const sitemap = await (
    await context.request.get(base + "/sitemap.xml")
  ).text();
  assert.equal((sitemap.match(/<loc>/g) || []).length, 15);
  await context.close();
});
test("theme follows the system until explicitly changed, persists across pages, and works without storage", async () => {
  const context = await marketContext(browser, {
      colorScheme: "dark",
      viewport: { width: 390, height: 844 },
    }),
    p = await context.newPage();
  await p.goto(base + "/fr/");
  assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
  await p.locator(".theme-toggle").click();
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  await p.goto(base + "/fr/privacy/");
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  assert.equal(
    await p.locator(".theme-toggle span").textContent(),
    catalogs.fr.common.darkMode,
  );
  await p.emulateMedia({ colorScheme: "dark" });
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  await context.close();
  const blocked = await marketContext(browser);
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  const page = await blocked.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/ar/");
  await page.locator(".theme-toggle").click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    "dark",
    "Explicit choice survives OS changes even when storage is blocked",
  );
  await page.locator('button[data-category="meat"]').click();
  assert.equal(await page.locator(".courtyard-product").count(), 2);
  assert.deepEqual(errors, []);
  await blocked.close();
});
for (const lang of ["en", "fr", "ar"])
  for (const theme of ["light", "dark"])
    test(`${lang} ${theme} legal pages: accessibility and readable layout`, async () => {
      const context = await marketContext(browser, {
        viewport: { width: 390, height: 844 },
      });
      await context.addInitScript(
        (theme) => localStorage.setItem("soukscan.website.theme", theme),
        theme,
      );
      const p = await context.newPage();
      for (const section of ["privacy", "account-deletion"]) {
        await p.goto(base + pathFor(lang, section));
        assert.equal(
          await p.evaluate(() => document.documentElement.scrollWidth),
          390,
        );
        const scan = await new AxeBuilder({ page: p })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
      }
      await context.close();
    });
