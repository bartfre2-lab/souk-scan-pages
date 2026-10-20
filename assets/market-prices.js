/* Same public RPCs and 60-second in-memory freshness policy as the app.
 * No authentication session, raw observations or write endpoints are used.
 */
export const STALE_AFTER_MS = 60_000;

export function describeReference(row) {
  const omitted =
    row.absence_verified === true && row.bulletin_date < row.group_latest_date;
  const ageDays = Number(row.age_days);
  return {
    omitted,
    old: ageDays >= 30,
    showAge: omitted || ageDays > 14,
    note: omitted ? "omitted" : ageDays >= 30 ? "old" : null,
  };
}

function numeric(value) {
  if (value === null || value === "" || !Number.isFinite(Number(value)))
    throw new Error("Invalid price response");
  return Number(value);
}
function range(row, lowerKey, upperKey) {
  const lowerRange = numeric(row[lowerKey]),
    upperRange = numeric(row[upperKey]);
  if (lowerRange < 0 || upperRange < lowerRange)
    throw new Error("Invalid price range");
  return { lowerRange, upperRange };
}
export function parseAggregate(rows) {
  if (!Array.isArray(rows)) throw new Error("Invalid aggregate response");
  if (!rows.length) return { status: "insufficient" };
  const row = rows[0],
    sampleSize = numeric(row.sample_size),
    freshnessDays = numeric(row.freshness_days);
  // The server owns the aggregation window and minimum sample policy.
  if (!Number.isInteger(sampleSize) || sampleSize < 0 || freshnessDays < 0)
    throw new Error("Invalid aggregate metadata");
  return {
    status: "ok",
    ...range(row, "lower_range", "upper_range"),
    medianPrice: numeric(row.median_price),
    sampleSize,
    freshnessDays,
  };
}
export function parseReference(rows) {
  if (!Array.isArray(rows)) throw new Error("Invalid reference response");
  if (!rows.length) return { status: "none" };
  const row = rows[0];
  for (const date of [row.bulletin_date, row.group_latest_date]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date
    )
      throw new Error("Invalid bulletin date");
  }
  return {
    status: "ok",
    ...range(row, "min_price", "max_price"),
    bulletinDate: row.bulletin_date,
    ageDays: numeric(row.age_days),
    ...describeReference(row),
  };
}

export function createPriceStore(
  config,
  { fetcher = fetch, now = Date.now } = {},
) {
  const cache = new Map(),
    inflight = new Map();
  function key(kind, productId, regionId) {
    return kind === "community"
      ? `aggregate:${productId}:${regionId}`
      : `reference:${productId}`;
  }
  function read(kind, productId, regionId) {
    return cache.get(key(kind, productId, regionId))?.value;
  }
  function load(kind, productId, regionId, { force = false } = {}) {
    const id = key(kind, productId, regionId),
      old = cache.get(id);
    if (inflight.has(id)) return inflight.get(id);
    if (!force && old && now() - old.fetchedAt < STALE_AFTER_MS)
      return Promise.resolve(old.value);
    const request = Promise.resolve().then(async () => {
      const controller = new AbortController(),
        timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const fn =
          kind === "community"
            ? "get_product_aggregate"
            : "get_latest_wholesale_reference";
        const params =
          kind === "community"
            ? { p_product_id: productId, p_region_id: regionId }
            : { p_product_id: productId };
        const response = await fetcher(`${config.url}/rest/v1/rpc/${fn}`, {
          method: "POST",
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
          signal: controller.signal,
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!response.ok) throw new Error("Could not load prices");
        const rows = await response.json();
        const value =
          kind === "community" ? parseAggregate(rows) : parseReference(rows);
        cache.set(id, { value, fetchedAt: now() });
        return value;
      } catch {
        return old
          ? { ...old.value, refreshFailed: true }
          : { status: "error" };
      } finally {
        clearTimeout(timeout);
        inflight.delete(id);
      }
    });
    inflight.set(id, request);
    return request;
  }
  return { read, load };
}
