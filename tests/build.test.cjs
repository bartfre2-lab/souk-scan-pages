const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } = require("node:fs");
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
test("production artifact includes exact app/review/cache snapshots and no source files", () => {
  const result = run("verify-build.py", output, "test-release");
  assert.equal(result.status, 0, result.stderr);
  assert(existsSync(join(output, "assets/market-prices-test-release.js")));
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
  const app = join(root, "app/index.html"), original = readFileSync(app);
  for (const directory of [root, join(root, "app"), join(root, "public"), join(root, "assets")])
    assert.notEqual(run("build-site.py", "--out-dir", directory).status, 0);
  assert.deepEqual(readFileSync(app), original);
  assert.notEqual(run("build-site.py", "--out-dir", join(temporary, "invalid"), "--asset-version", "../invalid").status, 0);
});
test("artifact verification rejects an old retained APK advertised in any language", () => {
  for (const prefix of ["", "fr", "ar"]) {
    const home = join(output, prefix, "index.html");
    const original = readFileSync(home, "utf8");
    const current = "/downloads/SOUK-SCAN-v1.1.1.apk";
    assert(original.includes(current));
    try {
      writeFileSync(home, original.replace(current, "/downloads/SOUK-SCAN-v1.0.2.apk"));
      const result = run("verify-build.py", output);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Download link does not use newest hosted APK/);
    } finally {
      writeFileSync(home, original);
    }
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
