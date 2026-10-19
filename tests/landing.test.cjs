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
    assert.ok(
      await page
        .locator(".stall-label")
        .evaluateAll((nodes) =>
          nodes.every((n) => n.scrollWidth <= n.clientWidth + 1),
        ),
      "Stall labels fit at this screen width",
    );
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
    // The endless row keeps all four unique categories visible around the center.
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

test("endless street retargets rapidly and updates stock as the center changes", async () => {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  await page.goto(base);
  await page.locator('.stall[data-category="vegetable"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector(".stall.is-active")?.dataset.category ===
      "vegetable",
  );
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
  await page.waitForTimeout(450);
  assert.equal(
    await page.locator(".stall.is-active").getAttribute("data-category"),
    "vegetable",
  );
  assert.deepEqual(await page.locator(".product-card h3").allTextContents(), [
    "Tomatoes",
    "Potatoes",
    "Carrots",
    "Onions",
  ]);
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

test("mobile touch capture supports repeated loops and preserves vertical page scrolling", async () => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await page.goto(base);
  await page.locator(".market-scroll").scrollIntoViewIfNeeded();
  const session = await page.context().newCDPSession(page);
  const frame = await page.locator(".market-scroll").boundingBox();
  const centers = await page.locator(".stall").evaluateAll((nodes) =>
    nodes
      .map((n) => {
        const r = n.getBoundingClientRect();
        return r.x + r.width / 2;
      })
      .sort((a, b) => a - b),
  );
  const spacing = centers[1] - centers[0],
    x = frame.x + frame.width * 0.4,
    y = frame.y + frame.height * 0.55;
  const names = ["fruit", "vegetable", "meat", "poultry"];
  let logical = 0;
  for (const direction of [1, -1])
    for (let turn = 0; turn < 8; turn++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let part = 1; part <= 8; part++)
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + (direction * spacing * part) / 8, y }],
        });
      await page.waitForTimeout(120);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      logical -= direction;
      assert.equal(
        await page.locator(".stall.is-active").getAttribute("data-category"),
        names[((logical % 4) + 4) % 4],
      );
    }
  const scrollBefore = await page.evaluate(() => scrollY);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let part = 1; part <= 8; part++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - part * 10 }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.ok(
    (await page.evaluate(() => scrollY)) > scrollBefore,
    "Vertical swipes still scroll the page",
  );
  assert.equal(
    await page.locator(".stall.is-active").getAttribute("data-category"),
    "fruit",
  );
  await page.close();
});

test("dragging follows the hand through three full loops in each direction without endpoints", async () => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto(base);
  await page.locator(".market-scroll").scrollIntoViewIfNeeded();
  const names = ["fruit", "vegetable", "meat", "poultry"];
  let logicalIndex = 0;
  for (const direction of [1, -1]) {
    for (let turn = 0; turn < 12; turn++) {
      const frame = await page.locator(".market-scroll").boundingBox();
      const centers = await page.locator(".stall").evaluateAll((nodes) =>
        nodes
          .map((n) => {
            const r = n.getBoundingClientRect();
            return r.x + r.width / 2;
          })
          .sort((a, b) => a - b),
      );
      const spacing = centers[1] - centers[0];
      const active = page.locator(".stall.is-active");
      const before = await active.boundingBox();
      const beforeName = await active.getAttribute("data-category");
      const x = frame.x + frame.width * 0.45,
        y = frame.y + frame.height * 0.55;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + direction * spacing * 0.3, y, { steps: 4 });
      const during = await page
        .locator(`.stall[data-category="${beforeName}"]`)
        .boundingBox();
      assert.ok(
        Math.abs(
          during.x +
            during.width / 2 -
            (before.x + before.width / 2) -
            direction * spacing * 0.3,
        ) < 2,
        "Street follows the drag before release",
      );
      await page.mouse.move(x + direction * spacing, y, { steps: 7 });
      await page.waitForTimeout(120);
      await page.mouse.up();
      logicalIndex -= direction;
      assert.equal(
        await page.locator(".stall.is-active").getAttribute("data-category"),
        names[((logicalIndex % 4) + 4) % 4],
      );
      const geometry = await page.locator(".stall.is-active").boundingBox();
      assert.ok(
        Math.abs(geometry.x + geometry.width / 2 - frame.x - frame.width / 2) <
          2,
        "Nearest stall settles in the center",
      );
      const visible = await page
        .locator(".stall,.stall-copy")
        .evaluateAll((nodes) => {
          const f = document
            .querySelector(".market-scroll")
            .getBoundingClientRect();
          return nodes.filter((n) => {
            const r = n.getBoundingClientRect();
            return r.left >= f.left && r.right <= f.right;
          }).length;
        });
      assert.ok(visible >= 5, "More than three stalls remain fully visible");
    }
  }
  const beforeIdle = await page.locator(".stall.is-active").boundingBox();
  await page.waitForTimeout(350);
  const afterIdle = await page.locator(".stall.is-active").boundingBox();
  assert.ok(
    Math.abs(beforeIdle.x - afterIdle.x) < 0.5,
    "No automatic rotation after choosing a stall",
  );
  await page.close();
});
