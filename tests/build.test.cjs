const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const root = resolve(__dirname, "..");
let temporary, output;
const run = (script, ...args) => spawnSync("python3", [join(root, "scripts", script), ...args], { cwd: root, encoding: "utf8" });
before(() => {
  temporary = mkdtempSync(join(tmpdir(), "souk-build-"));
  output = join(temporary, "production");
  const result = run("build-site.py", "--out-dir", output, "--asset-version", "test-release");
  assert.equal(result.status, 0, result.stderr);
});
after(() => rmSync(temporary, { recursive: true, force: true }));
test("production artifact excludes the web app, direct downloads and source files", () => {
  const result = run("verify-build.py", output, "test-release");
  assert.equal(result.status, 0, result.stderr);
  assert(existsSync(join(output, "assets/market-prices-test-release.js")));
  assert.equal(existsSync(join(output, "app")), false);
  assert.equal(existsSync(join(output, "downloads")), false);
});
test("Google Play is the primary Android destination and iOS remains upcoming in all languages", () => {
  for (const prefix of ["", "fr", "ar"]) {
    const home = join(output, prefix, "index.html"), original = readFileSync(home, "utf8");
    assert(original.includes('class="button button-cream play-store-link"'));
    assert(original.includes('class="platform-coming-soon"'));
    assert(original.includes('class="catalog-note"'));
    assert(!original.includes('apps.apple.com'));
    try {
      writeFileSync(home, original.replaceAll('details?id=com.soukscan.app', 'details?id=wrong.app'));
      const result = run("verify-build.py", output);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Google Play|availability metadata/);
    } finally { writeFileSync(home, original); }
  }
});
test("artifact verification blocks review routes and HTML pages hidden among assets", () => {
  for (const relative of ["preview/souk-app/index.html", "assets/internal.html"]) {
    const file = join(output, relative);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, '<h1>Private review</h1>');
    try {
      const result = run("verify-build.py", output);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Unpublished test\/review route|Unapproved HTML page/);
    } finally {
      if (relative.startsWith("preview/")) rmSync(join(output, "preview"), { recursive: true });
      else rmSync(file);
    }
  }
});
test("rebuild removes stale review output and preserves unpublished source pages", () => {
  const rebuilt = join(temporary, "reused"), archived = join(root, "public/preview");
  assert.equal(existsSync(archived), false, 'Do not overwrite an existing local archive');
  for(const route of ["app","downloads","preview/souk"]){mkdirSync(join(rebuilt,route),{recursive:true});writeFileSync(join(rebuilt,route,"index.html"),"Stale public artifact");}
  mkdirSync(join(rebuilt, "preview/souk"), { recursive: true });
  writeFileSync(join(rebuilt, "preview/souk/index.html"), 'Stale generated preview');
  mkdirSync(archived, { recursive: true });
  const source = join(archived, "index.html");
  writeFileSync(source, 'Preserved review source');
  try {
    const result = run("build-site.py", "--out-dir", rebuilt, "--asset-version", "test-release");
    assert.equal(result.status, 0, result.stderr);
    for(const route of ["app","downloads","preview"])assert.equal(existsSync(join(rebuilt,route)),false);
    assert.equal(readFileSync(source, 'utf8'), 'Preserved review source');
    const verified = run("verify-build.py", rebuilt, "test-release");
    assert.equal(verified.status, 0, verified.stderr);
  } finally { rmSync(archived, { recursive: true }); }
});
test("artifact verification rejects leaked configuration files and incorrect production metadata", () => {
  const leak = join(output, ".env");
  writeFileSync(leak, "test sentinel");
  assert.notEqual(run("verify-build.py", output).status, 0);
  rmSync(leak);
  const home = join(output, "index.html"), original = readFileSync(home, "utf8");
  writeFileSync(home, original.replace('content="index, follow"', 'content="noindex, nofollow"'));
  assert.notEqual(run("verify-build.py", output).status, 0);
  writeFileSync(home, original);
  const module = join(output, "assets/market-prices-test-release.js");
  const content = readFileSync(module);
  rmSync(module);
  assert.notEqual(run("verify-build.py", output).status, 0);
  writeFileSync(module, content);
});
test("build refuses source/release directories and invalid asset filenames without modifying them", () => {
  const app = join(root, "index.html"), original = readFileSync(app);
  for (const directory of [root, join(root, "app"), join(root, "public"), join(root, "assets")])
    assert.notEqual(run("build-site.py", "--out-dir", directory).status, 0);
  assert.deepEqual(readFileSync(app), original);
  assert.notEqual(run("build-site.py", "--out-dir", join(temporary, "invalid"), "--asset-version", "../invalid").status, 0);
});
test("artifact verification rejects hosted app binaries and the web app", () => {
  for (const relative of ['downloads/SOUK-SCAN-v1.1.1.apk','assets/hidden.apk','app/index.html']) {
    const file=join(output,relative);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,'Forbidden app artifact');
    try {const result=run('verify-build.py',output);assert.notEqual(result.status,0);assert.match(result.stderr,/Packaged app binary|Unpublished test\/review route|Unapproved HTML/);}
    finally {if(relative.startsWith('downloads/'))rmSync(join(output,'downloads'),{recursive:true});else if(relative.startsWith('app/'))rmSync(join(output,'app'),{recursive:true});else rmSync(file);}
  }
});
test("preview builds stay noindex with prefixed imports and exclude nested app/review snapshots", () => {
  const preview = join(temporary, "preview");
  const result = run("build-site.py", "--out-dir", preview, "--base", "/preview/souk/", "--preview", "--asset-version", "test-review");
  assert.equal(result.status, 0, result.stderr);
  const home = readFileSync(join(preview, "index.html"), "utf8");
  assert(home.includes('content="noindex, nofollow"'));
  assert(home.includes('href="https://soukscan.online/preview/souk/"'));
  assert(readFileSync(join(preview, "assets/landing-test-review.js"), "utf8").includes('./market-prices-test-review.js'));
  for (const name of ["app", "preview", "CNAME"])
    assert.equal(existsSync(join(preview, name)), false);
});
