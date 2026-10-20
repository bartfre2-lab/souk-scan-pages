const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
let api;
const load = async () => (api ??= await import("../assets/market-prices.js"));
const aggregate = (lower = 7) => [
  {
    median_price: lower + 1,
    lower_range: lower,
    upper_range: lower + 2,
    sample_size: 8,
    freshness_days: 1,
  },
];
const reference = [
  {
    min_price: "3.5",
    max_price: "6",
    bulletin_date: "2026-10-14",
    group_latest_date: "2026-10-14",
    age_days: 6,
    absence_verified: false,
  },
];
const config = { url: "https://example.supabase.co", key: "public-test-key" };
test("uses the app RPCs and parameters, keeps region caches separate and deduplicates requests", async () => {
  const { createPriceStore } = await load();
  let time = 0,
    calls = [];
  const store = createPriceStore(config, {
    now: () => time,
    fetcher: async (url, request) => {
      const body = JSON.parse(request.body);
      calls.push({ url, body, request });
      return {
        ok: true,
        json: async () =>
          url.endsWith("get_product_aggregate")
            ? aggregate(body.p_region_id === "oriental" ? 20 : 7)
            : reference,
      };
    },
  });
  const [a, b] = await Promise.all([
    store.load("community", "potato", "casablanca-settat"),
    store.load("community", "potato", "casablanca-settat"),
  ]);
  assert.equal(calls.length, 1);
  assert.equal(a.lowerRange, 7);
  assert.equal(a, b);
  await store.load("community", "potato", "casablanca-settat");
  assert.equal(calls.length, 1);
  const other = await store.load("community", "potato", "oriental");
  assert.equal(other.lowerRange, 20);
  assert.equal(
    store.read("community", "potato", "casablanca-settat").lowerRange,
    7,
  );
  assert.deepEqual(calls[0].body, {
    p_product_id: "potato",
    p_region_id: "casablanca-settat",
  });
  assert.equal(calls[0].request.credentials, "omit");
  await store.load("reference", "potato", "oriental");
  await store.load("reference", "potato", "casablanca-settat");
  assert.equal(
    calls.filter((c) => c.url.endsWith("get_latest_wholesale_reference"))
      .length,
    1,
  );
  assert.deepEqual(calls.at(-1).body, { p_product_id: "potato" });
  time = 60001;
  await store.load("community", "potato", "casablanca-settat");
  assert.equal(calls.length, 4);
  await store.load("community", "potato", "casablanca-settat", { force: true });
  assert.equal(calls.length, 5);
});
test("empty results, network failures and stale-refresh failures stay distinct, with retries", async () => {
  const { createPriceStore } = await load();
  let mode = "empty",
    calls = 0;
  const store = createPriceStore(config, {
    fetcher: () => {
      calls++;
      if (mode === "fail") throw new Error("offline");
      return Promise.resolve({
        ok: true,
        json: async () => (mode === "empty" ? [] : aggregate()),
      });
    },
  });
  assert.equal(
    (await store.load("community", "potato", "a")).status,
    "insufficient",
  );
  assert.equal((await store.load("reference", "potato")).status, "none");
  mode = "fail";
  assert.equal((await store.load("community", "potato", "b")).status, "error");
  mode = "ok";
  assert.equal((await store.load("community", "potato", "b")).lowerRange, 7);
  mode = "fail";
  const stale = await store.load("community", "potato", "b", { force: true });
  assert.equal(stale.lowerRange, 7);
  assert.equal(stale.refreshFailed, true);
  assert.equal(store.read("community", "potato", "a").status, "insufficient");
  assert.equal(calls, 5);
});
test("reference age/verified omission follows the app and malformed prices never become valid estimates", async () => {
  const { parseAggregate, parseReference, describeReference } = await load();
  assert.equal(parseReference(reference).lowerRange, 3.5);
  const older = {
    bulletin_date: "2026-08-01",
    group_latest_date: "2026-10-14",
    age_days: 80,
  };
  assert.equal(describeReference(older).note, "old");
  assert.equal(
    describeReference({ ...older, absence_verified: true }).note,
    "omitted",
  );
  assert.equal(describeReference({ ...older, age_days: 29 }).old, false);
  assert.throws(() => parseAggregate([{ ...aggregate()[0], sample_size: -1 }]));
  assert.throws(() =>
    parseAggregate([{ ...aggregate()[0], lower_range: null }]),
  );
  assert.throws(() => parseReference([{ ...reference[0], max_price: 1 }]));
  assert.throws(() =>
    parseReference([{ ...reference[0], bulletin_date: "2026-02-30" }]),
  );
});
test("configuration contains only a publishable/anon key and the app’s 12 canonical regions", async () => {
  const data = JSON.parse(
    await readFile(
      new URL("../data/market.json", "file://" + __filename),
      "utf8",
    ),
  );
  if (!data.config.key.startsWith("sb_publishable_")) {
    const claims = JSON.parse(
      Buffer.from(data.config.key.split(".")[1], "base64url").toString(),
    );
    assert.equal(claims.role, "anon");
  }
  assert.equal(data.regions.length, 12);
  assert.equal(new Set(data.regions.map((r) => r.id)).size, 12);
  assert.ok(data.regions.some((r) => r.id === "casablanca-settat"));
});
