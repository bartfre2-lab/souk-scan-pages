const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createServer } = require("node:http");
const {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  mkdirSync,
  statSync,
  cpSync,
} = require("node:fs");
const { readFile, stat } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve, extname, sep } = require("node:path");
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const root = resolve(__dirname, "..");
const fixtures = join(root, "tests/fixtures/articles");
const python = (script, ...args) =>
  spawnSync("python3", [join(root, "scripts", script), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONUTF8: "1" },
  });
const LANGS = ["en", "fr", "ar"];
const prefix = (lang) => (lang === "en" ? "" : "/" + lang);
let temporary, production, drafts, server, browser, base;

// A throwaway copy of the fixtures that a test can break on purpose.
function scratch(name, mutate) {
  const directory = join(temporary, name);
  cpSync(fixtures, directory, { recursive: true });
  mutate(directory);
  const result = python(
    "build-site.py",
    "--out-dir",
    join(temporary, name + "-out"),
    "--articles-dir",
    directory,
  );
  return result;
}
const edit = (file, change) =>
  writeFileSync(file, change(readFileSync(file, "utf8")));

before(async () => {
  temporary = mkdtempSync(join(tmpdir(), "souk-articles-"));
  production = join(temporary, "production");
  drafts = join(temporary, "drafts");
  let result = python(
    "build-site.py",
    "--out-dir",
    production,
    "--articles-dir",
    fixtures,
    "--articles-page-size",
    "1",
    "--asset-version",
    "test-release",
  );
  assert.equal(result.status, 0, result.stderr);
  result = python(
    "build-site.py",
    "--out-dir",
    drafts,
    "--articles-dir",
    fixtures,
    "--drafts",
  );
  assert.equal(result.status, 0, result.stderr);
  server = createServer(async (req, res) => {
    try {
      const host = production;
      let path = resolve(
        host,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!path.startsWith(host + sep) && path !== host) throw Error("path");
      if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "text/javascript",
            ".webp": "image/webp",
            ".png": "image/png",
            ".woff2": "font/woff2",
            ".xml": "application/xml",
          }[extname(path)] || "application/octet-stream",
      });
      res.end(await readFile(path));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  base = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
  rmSync(temporary, { recursive: true, force: true });
});

test("the repository's own articles build cleanly; the draft sample stays out of production", () => {
  const out = join(temporary, "repo-production");
  let result = python("build-site.py", "--out-dir", out, "--asset-version", "x");
  assert.equal(result.status, 0, result.stderr);
  const slugs = ["price-transparency", "what-decides-a-price", "what-other-countries-learned", "tomato-prices-in-morocco"];
  for (const lang of LANGS)
    for (const slug of slugs) assert(existsSync(join(out, prefix(lang), "articles", slug, "index.html")), lang + slug);
  assert.equal(existsSync(join(out, "articles/sample-draft")), false);
  // Every language has its own header image: full size on the article, small in the list.
  for (const lang of LANGS)
    for (const slug of slugs) {
      const article = readFileSync(join(out, prefix(lang), "articles", slug, "index.html"), "utf8");
      assert(article.includes(`/assets/articles/${slug}.${lang}.webp"`), `${lang} ${slug} header image`);
      assert(existsSync(join(out, `assets/articles/${slug}.${lang}.webp`)));
      assert(existsSync(join(out, `assets/articles/${slug}.${lang}-small.webp`)));
      assert(readFileSync(join(out, prefix(lang), "articles/index.html"), "utf8").includes(`/assets/articles/${slug}.${lang}-small.webp"`));
      assert(statSync(join(out, `assets/articles/${slug}.${lang}.webp`)).size < 150 * 1024);
      assert(statSync(join(out, `assets/articles/${slug}.${lang}-small.webp`)).size < 60 * 1024);
    }
  assert.doesNotMatch(readFileSync(join(out, "sitemap.xml"), "utf8"), /sample-draft/);
  result = python("verify-build.py", out, "x");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified 30 production pages/);
});

test("without any published article the Articles section and its links are not built", () => {
  const empty = join(temporary, "no-articles");
  mkdirSync(empty);
  const out = join(temporary, "no-articles-out");
  let result = python("build-site.py", "--out-dir", out, "--articles-dir", empty);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(join(out, "articles")), false);
  assert.doesNotMatch(readFileSync(join(out, "index.html"), "utf8"), /\/articles\//);
  assert.doesNotMatch(readFileSync(join(out, "sitemap.xml"), "utf8"), /articles/);
  result = python("verify-build.py", out, "", "--articles-dir", empty);
  assert.equal(result.status, 0, result.stderr);
});

test("the header image is optional and is used automatically when images/<slug>.webp is added", () => {
  const dir = join(temporary, "optional-image");
  cpSync(fixtures, dir, { recursive: true });
  for (const lang of LANGS)
    edit(join(dir, `01-first-fixture.${lang}.md`), (t) => t.replace(/^image: .*\r?\n/m, ""));
  const out = join(temporary, "optional-image-out");
  const build = () => python("build-site.py", "--out-dir", out, "--articles-dir", dir);
  let result = build();
  assert.equal(result.status, 0, result.stderr);
  let article = readFileSync(join(out, "articles/first-fixture/index.html"), "utf8");
  assert(!article.includes("<img src=\"/assets/articles"), "no image on the article page");
  assert(!article.includes("article-figure"));
  assert(article.includes('content="https://soukscan.online/assets/brand/logo.png"'));
  assert(!article.includes('"image"'));
  const list = readFileSync(join(out, "articles/index.html"), "utf8");
  assert(list.includes("article-item--text"));
  assert.equal(existsSync(join(out, "assets/articles/first-fixture.webp")), false);
  cpSync(join(dir, "images/fixture-image.webp"), join(dir, "images/first-fixture.webp"));
  result = build();
  assert.equal(result.status, 0, result.stderr);
  article = readFileSync(join(out, "articles/first-fixture/index.html"), "utf8");
  assert(article.includes("assets/articles/first-fixture.webp"));
  assert(existsSync(join(out, "assets/articles/first-fixture.webp")));
  assert.equal(python("verify-build.py", out, "", "--articles-dir", dir).status, 0);
});

test("published articles build into list and article pages in every language, drafts excluded", () => {
  const result = python("verify-build.py", production, "test-release", "--articles-dir", fixtures, "--articles-page-size", "1");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified 27 production pages/);
  for (const lang of LANGS) {
    for (const path of ["/articles/", "/articles/first-fixture/", "/articles/second-fixture/"])
      assert(existsSync(join(production, prefix(lang), path, "index.html")), lang + path);
    assert.equal(existsSync(join(production, prefix(lang), "articles/draft-fixture")), false);
  }
  assert(existsSync(join(production, "assets/articles/fixture-image.webp")));
  const sitemap = readFileSync(join(production, "sitemap.xml"), "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 27);
  assert(sitemap.includes("https://soukscan.online/fr/articles/page/2/"));
  assert(sitemap.includes("https://soukscan.online/ar/articles/first-fixture/"));
  assert(!sitemap.includes("draft-fixture"));
  assert(!readFileSync(join(production, "articles/index.html"), "utf8").includes("Draft fixture"));
});

test("a draft article is only built with --drafts, marked and not indexable", () => {
  const page = readFileSync(join(drafts, "articles/draft-fixture/index.html"), "utf8");
  assert.match(page, /data-article-draft/);
  assert.match(page, /content="noindex, nofollow"/);
  assert.doesNotMatch(readFileSync(join(drafts, "sitemap.xml"), "utf8"), /draft-fixture/);
  const refused = python("build-site.py", "--out-dir", "dist-production", "--drafts", "--articles-dir", fixtures);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /never be built into dist-production/);
});

test("artifact verification rejects a draft that leaked into production", () => {
  const leaked = join(production, "articles/draft-fixture/index.html");
  mkdirSync(join(leaked, ".."), { recursive: true });
  writeFileSync(leaked, "<h1>Leak</h1>");
  try {
    const result = python("verify-build.py", production, "test-release", "--articles-dir", fixtures, "--articles-page-size", "1");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unapproved HTML page|Draft article in artifact/);
  } finally {
    rmSync(join(production, "articles/draft-fixture"), { recursive: true });
  }
});

test("article pages have correct metadata, language alternates, structured data and navigation", () => {
  for (const lang of LANGS) {
    const route = prefix(lang) + "/articles/second-fixture/";
    const html = readFileSync(join(production, route, "index.html"), "utf8");
    assert(html.includes(`<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">`));
    assert(html.includes(`<link rel="canonical" href="https://soukscan.online${route}">`));
    for (const code of LANGS)
      assert(html.includes(`hreflang="${code}" href="https://soukscan.online${prefix(code)}/articles/second-fixture/"`));
    assert(html.includes('content="index, follow"'));
    assert(html.includes('<meta property="og:type" content="article">'));
    assert(html.includes('content="https://soukscan.online/assets/articles/fixture-wide.webp"'));
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert(html.includes('width="1280" height="720"'));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(schema["@type"], "Article");
    assert.equal(schema.inLanguage, lang);
    assert.equal(schema.datePublished, "2026-11-10");
    // Header, footer and sibling pages link to the section.
    assert(html.includes(`<a href="${prefix(lang)}/articles/" aria-current="page">`));
    const home = readFileSync(join(production, prefix(lang), "index.html"), "utf8");
    assert.equal((home.match(new RegExp(`href="${prefix(lang)}/articles/"`, "g")) || []).length, 2);
    const privacy = readFileSync(join(production, prefix(lang), "privacy/index.html"), "utf8");
    assert(privacy.includes(`href="${prefix(lang)}/articles/"`));
  }
  const first = readFileSync(join(production, "articles/index.html"), "utf8");
  const second = readFileSync(join(production, "articles/page/2/index.html"), "utf8");
  assert(first.includes("Second fixture article") && !first.includes("First fixture article"), "newest article first");
  assert(second.includes("First fixture article") && !second.includes("Second fixture article"));
  assert(first.includes("1 min read") && second.includes("4 min read"));
  assert(first.includes('rel="next" href="/articles/page/2/"') && !first.includes('rel="prev"'));
  assert(second.includes('rel="prev" href="/articles/"') && second.includes('aria-current="page">2<'));
  assert(second.includes('<link rel="canonical" href="https://soukscan.online/articles/page/2/">'));
  assert(second.includes("Articles, page 2 of 2"));
  assert(readFileSync(join(production, "fr/articles/page/2/index.html"), "utf8").includes("Page 2 sur 2"));
  assert(readFileSync(join(production, "ar/articles/index.html"), "utf8").includes("دقيقة واحدة للقراءة"));
  assert(readFileSync(join(production, "fr/articles/index.html"), "utf8").includes("10 novembre 2026"));
  const index = JSON.parse(readFileSync(join(production, "articles/search-index.json"), "utf8"));
  assert.deepEqual(index.map((entry) => entry.url), ["/articles/second-fixture/", "/articles/first-fixture/"]);
  assert.deepEqual(index[0].topics, ["Beta", "Shared"]);
});

test("Markdown is escaped, links are restricted and bad articles fail the build clearly", () => {
  const html = readFileSync(join(production, "articles/first-fixture/index.html"), "utf8");
  assert(html.includes("&lt;b&gt;raw HTML&lt;/b&gt;"));
  assert(!html.includes("<b>raw HTML"));
  assert(html.includes('rel="noopener noreferrer"'));
  let result = scratch("unsafe-link", (dir) =>
    edit(join(dir, "01-first-fixture.en.md"), (t) => t + "\n[x](javascript:alert(1))\n"),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /link not allowed/);
  result = scratch("missing-language", (dir) => rmSync(join(dir, "01-first-fixture.ar.md")));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing language version\(s\): ar/);
  result = scratch("bad-date", (dir) =>
    edit(join(dir, "01-first-fixture.fr.md"), (t) => t.replace("2026-11-01", "1 November")),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /date must look like/);
  result = scratch("no-minutes", (dir) =>
    edit(join(dir, "01-first-fixture.en.md"), (t) => t.replace("reading time: 4 min read", "reading time: quick")),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /reading time/);
  result = scratch("missing-image", (dir) => rmSync(join(dir, "images/fixture-image.webp")));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /image file not found/);
  result = scratch("big-image", (dir) =>
    writeFileSync(join(dir, "images/fixture-image.webp"), Buffer.concat([readFileSync(join(dir, "images/fixture-image.webp")), Buffer.alloc(160 * 1024)])),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /compress it below 150 KB/);
  result = scratch("bad-name", (dir) => writeFileSync(join(dir, "Notes.md"), "---\ntitle: x\n---\n"));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be named/);
});

test("draft-folder style files are accepted: no fences, 'reading time' key, default image name", () => {
  const result = scratch("draft-format", (dir) => {
    for (const lang of LANGS) {
      const file = join(dir, `03-mapped-draft.${lang}.md`);
      writeFileSync(
        file,
        "title: Mapped article\nsummary: Uses the drafts folder layout.\ndate: 2026-11-12\nreading time: 5 min\n\nBody text only.\n",
      );
    }
    cpSync(join(dir, "images/fixture-image.webp"), join(dir, "images/mapped-draft.webp"));
  });
  assert.equal(result.status, 0, result.stderr);
  const page = readFileSync(join(temporary, "draft-format-out/articles/mapped-draft/index.html"), "utf8");
  assert(page.includes("<p>Body text only.</p>"));
  assert(page.includes("assets/articles/mapped-draft.webp"));
});

test("article and list pages: no sideways scrolling and no accessibility violations in any language, theme and width", async () => {
  for (const lang of LANGS) {
    for (const theme of ["light", "dark"]) {
      for (const width of [375, 1280]) {
        const context = await browser.newContext({
          viewport: { width, height: 800 },
          colorScheme: theme,
          locale: lang,
        });
        const page = await context.newPage();
        for (const path of ["/articles/", "/articles/page/2/", "/articles/first-fixture/"]) {
          await page.goto(base + prefix(lang) + path);
          const label = `${lang} ${theme} ${width} ${path}`;
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          assert(overflow <= 0, `sideways scroll ${overflow}px: ${label}`);
          assert.equal(await page.locator("html").getAttribute("dir"), lang === "ar" ? "rtl" : "ltr");
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          assert.deepEqual(
            results.violations.map((v) => v.id + ": " + v.nodes[0].html.slice(0, 80)),
            [],
            label,
          );
          if (lang === "ar") {
            const heading = await page.locator("h1").boundingBox();
            // RTL: the title block starts at the right-hand side of the reading column.
            assert(heading.x + heading.width > width / 2, "RTL heading placement " + label);
          }
        }
        await context.close();
      }
    }
  }
});

test("articles with the same date are listed with the higher NN prefix first", () => {
  const dir = join(temporary, "same-date");
  cpSync(fixtures, dir, { recursive: true });
  for (const lang of LANGS) edit(join(dir, `01-first-fixture.${lang}.md`), (t) => t.replace("2026-11-01", "2026-11-10"));
  const out = join(temporary, "same-date-out");
  const result = python("build-site.py", "--out-dir", out, "--articles-dir", dir);
  assert.equal(result.status, 0, result.stderr);
  const list = readFileSync(join(out, "articles/index.html"), "utf8");
  assert(list.indexOf("Second fixture article") < list.indexOf("First fixture article"));
});

test("search and topic filters work on the paged list in every language, and the list works without JavaScript", async () => {
  for (const lang of LANGS) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, locale: lang });
    const page = await context.newPage();
    await page.goto(base + prefix(lang) + "/articles/");
    await page.locator(".articles-tools").waitFor({ state: "visible" });
    assert.equal(await page.locator(".article-list:not(.article-results) li").count(), 1, "page 1 holds one article");
    assert.equal(await page.locator(".article-topics button").count(), 3);
    // Search reaches articles on other pages and replaces the paged list.
    const word = { en: "older", fr: "ancien", ar: "أقدم" }[lang];
    await page.fill("#article-search", word);
    await page.locator(".article-results li").first().waitFor();
    assert.equal(await page.locator(".article-results li").count(), 1);
    assert.match(page.url(), /\?q=/);
    assert(await page.locator(".pager").isHidden());
    assert(await page.locator(".article-list:not(.article-results)").isHidden());
    assert.match(await page.locator(".articles-status").textContent(), lang === "ar" ? /مقال واحد/ : /1 article/);
    assert((await page.locator(".article-results a").first().getAttribute("href")).includes("/articles/first-fixture/"));
    // A topic shared by both articles finds both.
    await page.fill("#article-search", "");
    await page.locator(".article-topics button", { hasText: { en: "Shared", fr: "Partagé", ar: "مشترك" }[lang] }).click();
    await page.waitForFunction(() => document.querySelectorAll(".article-results li").length === 2);
    // No result, then clear returns to the paged list.
    await page.fill("#article-search", "zzzzqq");
    await page.waitForFunction(() => document.querySelector(".article-results").hidden && document.querySelector(".articles-status").textContent.length > 0);
    await page.locator(".articles-clear").click();
    assert(await page.locator(".article-results").isHidden());
    assert(await page.locator(".pager").isVisible());
    assert(await page.locator(".article-list:not(.article-results)").isVisible());
    assert.equal(page.url().includes("?"), false);
    // A shared link restores the search.
    await page.goto(base + prefix(lang) + "/articles/?q=" + encodeURIComponent(word));
    await page.locator(".article-results li").first().waitFor();
    await context.close();
  }
  const bare = await browser.newContext({ javaScriptEnabled: false });
  const page = await bare.newPage();
  await page.goto(base + "/articles/");
  assert(await page.locator(".articles-tools").isHidden());
  await page.locator('a[rel="next"]').click();
  assert.match(page.url(), /\/articles\/page\/2\/$/);
  assert.equal(await page.locator(".article-list li").count(), 1);
  await bare.close();
});

test("each language can have its own header image, with an optional small thumbnail for the list", () => {
  const dir = join(temporary, "per-language");
  cpSync(fixtures, dir, { recursive: true });
  for (const lang of LANGS)
    edit(join(dir, `01-first-fixture.${lang}.md`), (t) => t.replace(/^image: .*\r?\n/m, ""));
  const images = join(dir, "images");
  cpSync(join(images, "fixture-image.webp"), join(images, "first-fixture.en.webp"));
  cpSync(join(images, "fixture-image.webp"), join(images, "first-fixture.en-small.webp"));
  cpSync(join(images, "fixture-wide.webp"), join(images, "first-fixture.fr.webp"));
  const out = join(temporary, "per-language-out");
  const result = python("build-site.py", "--out-dir", out, "--articles-dir", dir);
  assert.equal(result.status, 0, result.stderr);
  const page = (lang) => readFileSync(join(out, prefix(lang), "articles/first-fixture/index.html"), "utf8");
  assert(page("en").includes("assets/articles/first-fixture.en.webp"));
  assert(page("fr").includes("assets/articles/first-fixture.fr.webp"));
  assert(!page("ar").includes("article-figure"), "Arabic has no image of its own, so none is shown");
  assert(readFileSync(join(out, "articles/index.html"), "utf8").includes("first-fixture.en-small.webp"));
  assert(readFileSync(join(out, "fr/articles/index.html"), "utf8").includes("first-fixture.fr.webp"));
  assert(JSON.parse(readFileSync(join(out, "articles/search-index.json"), "utf8")).some((e) => e.image?.endsWith("first-fixture.en-small.webp")));
  assert.equal(python("verify-build.py", out, "", "--articles-dir", dir).status, 0);
  const bad = scratch("bad-thumb", (d) => writeFileSync(join(d, "images/fixture-image-small.webp"), "not an image"));
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /not a readable/);
});
