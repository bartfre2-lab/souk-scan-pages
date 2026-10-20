// Deterministic public RPC responses. Tests never write to the live backend.
const REFERENCE_DATE = "2026-10-14";
function fixtureRows(functionName, body) {
  const poultry = [
    "live_chicken",
    "slaughtered_chicken",
    "beldi_eggs",
    "roumi_eggs",
  ].includes(body.p_product_id);
  if (functionName === "get_latest_wholesale_reference") {
    if (poultry) return [];
    return [
      {
        min_price: body.p_product_id === "potato" ? 3.5 : 2,
        max_price: body.p_product_id === "potato" ? 6 : 8,
        bulletin_date: REFERENCE_DATE,
        group_latest_date: REFERENCE_DATE,
        age_days: 6,
        absence_verified: false,
      },
    ];
  }
  if (functionName === "get_product_aggregate") {
    if (poultry) return [];
    const lower = body.p_region_id === "oriental" ? 20 : 7;
    return [
      {
        median_price: lower + 1,
        lower_range: lower,
        upper_range: lower + 2,
        sample_size: 8,
        freshness_days: 1,
      },
    ];
  }
  throw new Error("Unexpected RPC " + functionName);
}
async function installPriceFixtures(
  context,
  { region = "casablanca-settat" } = {},
) {
  if (region)
    await context.addInitScript((region) => {
      try {
        localStorage.setItem("soukscan.website.region", region);
      } catch {}
    }, region);
  await context.route("**/rest/v1/rpc/*", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "apikey,authorization,content-type",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
      });
    if (request.method() !== "POST")
      throw new Error("Only public read RPCs are permitted in this fixture");
    const fn = new URL(request.url()).pathname.split("/").pop();
    await route.fulfill({
      json: fixtureRows(fn, request.postDataJSON()),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
}
async function marketContext(browser, options) {
  const context = await browser.newContext(options);
  await installPriceFixtures(context);
  return context;
}
async function marketPage(browser, options) {
  return (await marketContext(browser, options)).newPage();
}
module.exports = {
  installPriceFixtures,
  marketContext,
  marketPage,
  fixtureRows,
};
