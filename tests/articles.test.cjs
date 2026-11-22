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

test("the repository's own articles build cleanly and its draft sample stays out of production", () => {
  const out = join(temporary, "repo-production");
  let result = python("build-site.py", "--out-dir", out, "--asset-version", "x");
  assert.equal(result.status, 0, result.stderr);
  // Only a draft exists in articles/, so no Articles section is published.
  assert.equal(existsSync(join(out, "articles")), false);
  assert.doesNotMatch(readFileSync(join(out, "sitemap.xml"), "utf8"), /articles/);
  assert.doesNotMatch(readFileSync(join(out, "index.html"), "utf8"), /\/articles\//);
  result = python("verify-build.py", out, "x");
  assert.equal(result.status, 0, result.stderr);
});

test("published articles build into list and article pages in every language, drafts excluded", () => {
  const result = python("verify-build.py", production, "test-release", "--articles-dir", fixtures);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified 24 production pages/);
  for (const lang of LANGS) {
    for (const path of ["/articles/", "/articles/first-fixture/", "/articles/second-fixture/"])
      assert(existsSync(join(production, prefix(lang), path, "index.html")), lang + path);
    assert.equal(existsSync(join(production, prefix(lang), "articles/draft-fixture")), false);
  }
  assert(existsSync(join(production, "assets/articles/fixture-image.webp")));
  const sitemap = readFileSync(join(production, "sitemap.xml"), "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 24);
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
    const result = python("verify-build.py", production, "test-release", "--articles-dir", fixtures);
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
  const list = readFileSync(join(production, "articles/index.html"), "utf8");
  assert(list.indexOf("Second fixture article") < list.indexOf("First fixture article"), "newest first");
  assert(list.includes("1 min read") && list.includes("4 min read"));
  assert(readFileSync(join(production, "ar/articles/index.html"), "utf8").includes("دقيقة واحدة للقراءة"));
  assert(readFileSync(join(production, "fr/articles/index.html"), "utf8").includes("10 novembre 2026"));
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
        for (const path of ["/articles/", "/articles/first-fixture/"]) {
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
