const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { readFile, stat } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { resolve, extname, sep } = require("node:path");
const { createHash } = require("node:crypto");
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const root = resolve(__dirname, "..");
let server, browser, base;
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".apk": "application/vnd.android.package-archive",
};

before(async () => {
  server = createServer(async (request, response) => {
    try {
      let path = resolve(
        root,
        "." +
          decodeURIComponent(new URL(request.url, "http://localhost").pathname),
      );
      if (!path.startsWith(root + sep) && path !== root)
        throw new Error("Invalid path");
      if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
      const data = await readFile(path);
      response.writeHead(200, {
        "Content-Type": mime[extname(path)] || "application/octet-stream",
      });
      response.end(data);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
});
after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

for (const width of [320, 390, 768, 1440]) {
  test(`all vendors, crates, keyboard navigation and page layout at ${width}px`, async () => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator('.stall[data-category="fruit"]').click();
    assert.equal(await page.locator("dialog").count(), 0);
    assert.equal(await page.locator(".product-card").count(), 4);
    for (const [category, names] of [
      ["vegetable", ["Tomatoes", "Potatoes", "Carrots", "Onions"]],
      ["meat", ["Beef", "Mutton"]],
      [
        "poultry",
        ["Live chicken", "Dressed chicken", "Beldi eggs", "Roumi eggs"],
      ],
      ["fruit", ["Oranges", "Apples", "Bananas", "Pomegranates"]],
    ]) {
      // The actual stalls are the category controls; no detached selector is needed.
      await page.locator(`.stall[data-category="${category}"]`).click();
      assert.deepEqual(
        await page.locator(".product-card h3").allTextContents(),
        names,
      );
      assert.equal(
        await page
          .locator(`button[data-category="${category}"][aria-pressed="true"]`)
          .count(),
        1,
      );
      await page.locator(`.stall[data-category="${category}"]`).click();
      assert.match(
        await page.locator("#vendor-kicker").textContent(),
        /FRUIT|GREENGROCER|BUTCHER|POULTRY/,
      );
      assert.ok(await page.locator(".product-card").first().isVisible());
    }
    await page.locator(".stall-row button").first().focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      (
        await page.locator(".stall-row .is-active .stall-label").textContent()
      ).trim(),
      "Vegetables",
    );
    await page.keyboard.press("End");
    assert.equal(
      (
        await page.locator(".stall-row .is-active .stall-label").textContent()
      ).trim(),
      "Poultry & eggs",
    );
    await page.keyboard.press("Home");
    assert.equal(
      (
        await page.locator(".stall-row .is-active .stall-label").textContent()
      ).trim(),
      "Fruit",
    );
    const counterA11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      counterA11y.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      "Inline souk display accessibility",
    );
    // Every selection keeps all four stalls fully visible with no overlap.
    for (const category of ["poultry", "fruit", "meat", "vegetable"]) {
      await page.locator(`.stall[data-category="${category}"]`).click();
      const geometry = await page
        .locator(`.stall[data-category="${category}"]`)
        .evaluate((el) => {
          const r = el.getBoundingClientRect(),
            f = document
              .querySelector(".market-scroll")
              .getBoundingClientRect();
          const other = [...document.querySelectorAll(".stall:not(.is-active)")]
            .find((n) => !n.classList.contains("is-distant"))
            .getBoundingClientRect();
          return {
            offset: Math.abs(r.left + r.width / 2 - f.left - f.width / 2),
            width: r.width,
            otherWidth: other.width,
          };
        });
      assert.ok(geometry.offset < 2, "Selected stall is centered");
      assert.ok(
        geometry.width > geometry.otherWidth,
        "Selected stall is enlarged",
      );
      const visible = await page.locator(".stall").evaluateAll((nodes) => {
        const frame = document
          .querySelector(".market-scroll")
          .getBoundingClientRect();
        const rects = nodes.map((n) => n.getBoundingClientRect());
        return (
          rects.every(
            (r) =>
              r.left >= frame.left - 1 &&
              r.right <= frame.right + 1 &&
              r.top >= frame.top - 1 &&
              r.bottom <= frame.bottom + 1,
          ) &&
          rects.every((a, i) =>
            rects
              .slice(i + 1)
              .every(
                (b) =>
                  a.right <= b.left ||
                  b.right <= a.left ||
                  a.bottom <= b.top ||
                  b.bottom <= a.top,
              ),
          )
        );
      });
      assert.ok(visible, "All four stalls fit and stay separate");
      assert.ok(
        await page.locator(".market-frame #product-grid").isVisible(),
        "Stock shares the souk scene",
      );
      assert.equal(await page.locator(".category-switcher").count(), 0);
    }
    assert.equal(
      await page.locator("#market-progress").textContent(),
      "4 of 4 stalls explored",
    );
    await page.locator('.stall[data-category="poultry"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator(".stall.is-active").getAttribute("data-category"),
      "fruit",
    );
    await page.keyboard.press("ArrowLeft");
    assert.equal(
      await page.locator(".stall.is-active").getAttribute("data-category"),
      "poultry",
    );
    for (const section of ["#how-it-works", "#download", ".faq-section"]) {
      await page.locator(section).scrollIntoViewIfNeeded();
    }
    await page.locator("summary").first().click();
    assert.equal(
      await page.locator("details").first().getAttribute("open"),
      "",
    );
    await page.locator("summary").first().click();
    assert.equal(
      await page.locator("details").first().getAttribute("open"),
      null,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
      "Page must not overflow horizontally",
    );
    await page.waitForLoadState("networkidle");
    assert.deepEqual(
      await page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((image) => !image.complete || !image.naturalWidth)
            .map((image) => image.src),
        ),
      [],
      "Every image must load",
    );
    assert.deepEqual(errors, [], "No console errors or failed resources");
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      scan.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      "WCAG A/AA accessibility checks",
    );
    await page.close();
  });
}

test("internal links, page anchors and verified Android download work", async () => {
  const page = await browser.newPage();
  await page.goto(base);
  const links = await page
    .locator("a")
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((n) => n.getAttribute("href"))),
    ]);
  for (const link of links) {
    if (link.startsWith("#"))
      assert.equal(await page.locator(link).count(), 1, `Anchor ${link}`);
    else if (link.startsWith("./")) {
      const response = await page.request.get(new URL(link, base + "/").href);
      assert.equal(response.status(), 200, link);
    }
  }
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("a[download]").click(),
  ]);
  assert.equal(download.suggestedFilename(), "SOUK-SCAN-v1.0.2.apk");
  assert.equal(await download.failure(), null);
  const checksumFile = await readFile(
    resolve(root, "downloads/SHA256SUMS.txt"),
    "utf8",
  );
  const expected = checksumFile
    .split("\n")
    .find((line) => line.includes(".apk"))
    .split(/\s+/)[0];
  const actual = createHash("sha256")
    .update(await readFile(resolve(root, "downloads/SOUK-SCAN-v1.0.2.apk")))
    .digest("hex");
  assert.equal(actual, expected, "APK must match signed release checksum");
  await page.close();
});

test("page works without JavaScript and respects reduced motion", async () => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  await page.goto(base);
  assert.ok(await page.locator("noscript").last().isVisible());
  assert.equal(
    await page
      .locator(".sun-halo")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  assert.equal(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).scrollBehavior),
    "auto",
  );
  assert.ok(await page.locator("a[download]").isVisible());
  const response = await page.request.get(base + "/app/");
  assert.equal(response.status(), 200);
  await page.close();
});

test("courtyard motion retargets rapidly, keeps the scene visible and supports swipes", async () => {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  await page.goto(base);
  await page.locator('.stall[data-category="vegetable"]').click();
  assert.ok(
    await page
      .locator(".product-card")
      .evaluateAll((nodes) => nodes.some((n) => n.getAnimations().length > 0)),
    "Selected stock animates into the counter",
  );
  await page.evaluate(() => {
    for (const category of ["poultry", "fruit", "meat", "vegetable"])
      document.querySelector(`.stall[data-category="${category}"]`).click();
  });
  assert.ok(
    await page
      .locator(".stall")
      .evaluateAll((nodes) =>
        nodes.every((n) => n.getAnimations().length <= 1),
      ),
    "One motion per stall after rapid retargeting",
  );
  await page.waitForTimeout(450);
  assert.equal(
    await page.locator(".stall.is-active").getAttribute("data-category"),
    "vegetable",
  );
  await page.locator(".market-scroll").scrollIntoViewIfNeeded();
  const stage = await page.locator(".market-scroll").boundingBox();
  await page.mouse.move(
    stage.x + stage.width * 0.55,
    stage.y + stage.height * 0.4,
  );
  await page.mouse.down();
  await page.mouse.move(
    stage.x + stage.width * 0.3,
    stage.y + stage.height * 0.4,
    { steps: 8 },
  );
  await page.mouse.up();
  assert.equal(
    await page.locator(".stall.is-active").getAttribute("data-category"),
    "meat",
  );
  for (const selector of [".steps article", ".download-card", ".faq-section"]) {
    for (const element of await page.locator(selector).all()) {
      await element.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (el) => getComputedStyle(el).opacity === "1",
        await element.elementHandle(),
      );
    }
  }
  await page.close();
});
