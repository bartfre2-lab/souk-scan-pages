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

const categories = {
  fruit: ["Oranges", "Apples", "Bananas", "Pomegranates"],
  vegetable: ["Tomatoes", "Potatoes", "Carrots", "Onions"],
  meat: ["Beef", "Mutton"],
  poultry: ["Live chicken", "Dressed chicken", "Beldi eggs", "Roumi eggs"],
};
async function geometry(page) {
  return page.locator(".courtyard-scene").evaluate((scene) => {
    const r = (element) => {
      const b = element.getBoundingClientRect();
      return {
        left: b.left,
        right: b.right,
        top: b.top,
        bottom: b.bottom,
        width: b.width,
        height: b.height,
      };
    };
    return {
      scene: r(scene),
      stalls: [...scene.querySelectorAll(".courtyard-stall")].map(r),
      stock: r(scene.querySelector(".courtyard-stock")),
    };
  });
}
const overlap = (a, b) =>
  a.left < b.right - 0.5 &&
  a.right > b.left + 0.5 &&
  a.top < b.bottom - 0.5 &&
  a.bottom > b.top + 0.5;
for (const width of [320, 390, 768, 1440]) {
  test(`courtyard idle, all categories, fixed layout and accessibility at ${width}px`, async () => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(response.url());
    });
    await page.goto(base, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".courtyard-stall").count(), 4);
    assert.ok(await page.locator("#courtyard-welcome").isVisible());
    assert.ok(await page.locator("#stall-products").isHidden());
    assert.equal(await page.locator('[aria-pressed="true"]').count(), 0);
    assert.equal(
      await page.locator(".courtyard-logo img").getAttribute("src"),
      "./assets/brand/logo.png",
    );
    const idle = await geometry(page);
    // Two fixed stalls on each side, separated from each other.
    assert.ok(idle.stalls[0].right < idle.scene.left + idle.scene.width / 2);
    assert.ok(idle.stalls[2].left > idle.scene.left + idle.scene.width / 2);
    assert.ok(idle.stalls[0].bottom < idle.stalls[1].top);
    assert.ok(idle.stalls[2].bottom < idle.stalls[3].top);
    for (const [category, names] of Object.entries(categories)) {
      const stall = page.locator(`button[data-category="${category}"]`);
      await stall.click();
      assert.deepEqual(
        await page.locator(".courtyard-product h4").allTextContents(),
        names,
      );
      assert.equal(await page.locator('[aria-pressed="true"]').count(), 1);
      assert.equal(await stall.getAttribute("aria-pressed"), "true");
      assert.ok(await page.locator("#courtyard-welcome").isHidden());
      assert.ok(await page.locator("#stall-products").isVisible());
      const g = await geometry(page);
      for (let i = 0; i < 4; i++) {
        assert.ok(Math.abs(g.stalls[i].left - idle.stalls[i].left) < 1);
        assert.ok(
          g.stalls[i].left >= g.scene.left &&
            g.stalls[i].right <= g.scene.right,
          "Stalls remain inside courtyard",
        );
        for (let j = i + 1; j < 4; j++)
          assert.ok(
            !overlap(g.stalls[i], g.stalls[j]),
            "Stall hit areas never overlap",
          );
        assert.ok(
          !overlap(g.stalls[i], g.stock),
          "Central products never cover a stall",
        );
      }
      assert.ok(
        g.stock.top >= g.scene.top && g.stock.bottom < g.scene.bottom - 20,
        "All products and reset fit inside courtyard",
      );
      // Packed produce is clipped behind each opaque wooden front.
      assert.ok(
        await page
          .locator(".stock-crate__produce")
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).overflow === "hidden"),
          ),
      );
      await stall.click();
      assert.deepEqual(
        await page.locator(".courtyard-product h4").allTextContents(),
        names,
        "Repeat selection stays stable",
      );
    }
    assert.equal(
      await page.locator("#market-progress").textContent(),
      "4 of 4 categories explored",
    );
    await page.locator(".courtyard-reset").click();
    assert.ok(await page.locator("#courtyard-welcome").isVisible());
    assert.equal(await page.locator(".courtyard-product").count(), 0);
    assert.equal(
      await page.locator(":focus").getAttribute("data-category"),
      "poultry",
    );
    await page.locator('[data-category="fruit"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator(":focus").getAttribute("data-category"),
      "meat",
    );
    await page.keyboard.press("ArrowDown");
    assert.equal(
      await page.locator(":focus").getAttribute("data-category"),
      "poultry",
    );
    await page.keyboard.press("ArrowLeft");
    assert.equal(
      await page.locator(":focus").getAttribute("data-category"),
      "vegetable",
    );
    await page.keyboard.press("Home");
    assert.equal(
      await page
        .locator(".courtyard-stall.is-active")
        .getAttribute("data-category"),
      "fruit",
    );
    await page.keyboard.press("End");
    assert.equal(
      await page
        .locator(".courtyard-stall.is-active")
        .getAttribute("data-category"),
      "poultry",
    );
    await page.keyboard.press("Escape");
    assert.ok(await page.locator("#courtyard-welcome").isVisible());
    await page.keyboard.press("Enter");
    assert.ok(await page.locator("#stall-products").isVisible());
    await page.locator("summary").first().click();
    assert.equal(
      await page.locator("details").first().getAttribute("open"),
      "",
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    assert.deepEqual(
      await page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((i) => !i.complete || !i.naturalWidth)
            .map((i) => i.src),
        ),
      [],
    );
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    assert.deepEqual(errors, []);
    await context.close();
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

test("no-JavaScript access and reduced-motion behaviour", async () => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  await page.goto(base);
  assert.ok(await page.locator("noscript").isVisible());
  assert.ok(await page.locator(".courtyard-logo").isVisible());
  assert.ok(await page.locator("a[download]").isVisible());
  assert.equal(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).scrollBehavior),
    "auto",
  );
  await page.close();
});
test("spatial delivery, rapid retargeting, reset, resize and motion preference changes", async () => {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator('[data-category="fruit"]').click();
  assert.ok(
    await page
      .locator(".courtyard-product")
      .evaluateAll((nodes) =>
        nodes.some((n) => n.getAnimations({ subtree: true }).length > 0),
      ),
    "Crates animate from their originating stall",
  );
  assert.match(
    await page.locator(".courtyard-route path").getAttribute("d"),
    /^M .* Q /,
    "The route is curved through the square",
  );
  // Change category while crates are still in transit.
  await page.waitForTimeout(90);
  for (const category of ["poultry", "meat", "vegetable", "fruit", "poultry"]) {
    await page.locator(`[data-category="${category}"]`).click();
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(1100);
  assert.deepEqual(
    await page.locator(".courtyard-product h4").allTextContents(),
    categories.poultry,
  );
  assert.equal(await page.locator(".courtyard-ghost").count(), 0);
  assert.equal(
    await page.locator(".courtyard-route path").getAttribute("d"),
    "",
  );
  assert.equal(
    await page
      .locator(".courtyard-scene")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
    0,
    "No accumulated or runaway animation",
  );
  await page.locator('[data-category="fruit"]').click();
  await page.waitForTimeout(100);
  await page.locator(".courtyard-reset").click();
  await page.waitForTimeout(500);
  assert.ok(await page.locator("#courtyard-welcome").isVisible());
  assert.equal(await page.locator(".courtyard-ghost").count(), 0);
  await page.locator('[data-category="meat"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  assert.deepEqual(
    await page.locator(".courtyard-product h4").allTextContents(),
    categories.meat,
  );
  await page.locator('[data-category="fruit"]').click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  assert.equal(
    await page
      .locator(".courtyard-scene")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
    0,
  );
  assert.equal(await page.locator(".courtyard-ghost").count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
});
test("phone taps keep the square stationary and vertical scrolling works", async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator(".souk-courtyard").scrollIntoViewIfNeeded();
  for (const category of ["fruit", "poultry", "meat", "vegetable"]) {
    const before = await page.evaluate(() => scrollY);
    await page.locator(`[data-category="${category}"]`).tap();
    await page.waitForTimeout(1000);
    assert.ok(
      Math.abs((await page.evaluate(() => scrollY)) - before) < 2,
      "Selection does not force page scrolling",
    );
    assert.deepEqual(
      await page.locator(".courtyard-product h4").allTextContents(),
      categories[category],
    );
  }
  const before = await page.evaluate(() => scrollY);
  const session = await context.newCDPSession(page);
  const r = await page.locator(".courtyard-scene").boundingBox();
  const x = r.x + 10,
    y = Math.min(650, r.y + r.height * 0.6);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 8; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - i * 15 }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.ok(
    (await page.evaluate(() => scrollY)) > before,
    "Normal vertical touch scrolling is preserved",
  );
  await context.close();
});
