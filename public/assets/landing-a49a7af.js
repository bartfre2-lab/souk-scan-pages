/* Public price reads use the same server-side rules as the original app. */
import { createPriceStore } from "./market-prices-a49a7af.js";
const siteCopy = JSON.parse(document.querySelector("#site-copy").textContent);
const marketCopy = siteCopy.market,
  priceCopy = siteCopy.prices;
const message = (text, values) =>
  text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
const vendors = {
  fruit: {
    products: [
      ["Oranges", "orange", "orange", "kg"],
      ["Apples", "apple", "apple", "kg"],
      ["Bananas", "banana", "banana", "kg"],
      ["Pomegranates", "pomegranate", "pomegranate", "kg"],
    ],
  },
  vegetable: {
    products: [
      ["Tomatoes", "tomato", "tomato", "kg"],
      ["Potatoes", "potato", "potato", "kg"],
      ["Carrots", "carrot", "carrot", "kg"],
      ["Onions", "onion", "onion", "kg"],
    ],
  },
  meat: {
    products: [
      ["Beef", "beef", "cut_of_meat", "kg"],
      ["Mutton", "mutton", "meat_on_bone", "kg"],
    ],
  },
  poultry: {
    products: [
      ["Live chicken", "live_chicken", "chicken", "kg"],
      ["Dressed chicken", "slaughtered_chicken", "poultry_leg", "kg"],
      ["Beldi eggs", "beldi_eggs", "egg", "egg"],
      ["Roumi eggs", "roumi_eggs", "egg", "egg"],
    ],
  },
};
const scene = document.querySelector(".courtyard-scene");
const courtyard = document.querySelector(".souk-courtyard");
const welcome = document.querySelector("#courtyard-welcome");
const stock = document.querySelector("#stall-products");
const grid = document.querySelector("#product-grid");
const stalls = [...document.querySelectorAll(".courtyard-stall")];
const route = document.querySelector(".courtyard-route path");
const reset = document.querySelector(".courtyard-reset");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const explored = new Set();
const animations = new Set();
const ghosts = new Set();
const titles = marketCopy.titles;
// The drawn sheet is not an exact grid. Individual viewports include the whole
// silhouette and exclude neighbouring rows, without modifying the source art.
const foodFrames = {
  orange: [33, 45, 293, 291],
  apple: [345, 65, 290, 275],
  banana: [640, 60, 295, 280],
  pomegranate: [975, 60, 250, 280],
  tomato: [30, 360, 300, 270],
  potato: [345, 380, 290, 250],
  carrot: [645, 355, 295, 280],
  onion: [955, 380, 280, 255],
  cut_of_meat: [20, 650, 310, 275],
  meat_on_bone: [355, 640, 280, 290],
  chicken: [660, 640, 270, 297],
  poultry_leg: [935, 675, 310, 255],
  egg: [30, 955, 285, 260],
  white_egg: [350, 960, 280, 255],
};
const foodSheet = new URL("./souk-food-rubber-hose.png", import.meta.url).href;
let selected = null;

function stopMotion() {
  animations.forEach((animation) => animation.cancel());
  animations.clear();
  ghosts.forEach((ghost) => ghost.remove());
  ghosts.clear();
  route.setAttribute("d", "");
}
function animate(element, frames, options) {
  if (motion.matches) return;
  const animation = element.animate(frames, options);
  animations.add(animation);
  animation.finished.then(
    () => {
      animations.delete(animation);
      animation.cancel();
    },
    () => animations.delete(animation),
  );
  return animation;
}
function stallPoint(category) {
  const button = stalls.find((button) => button.dataset.category === category);
  const bounds = button
    .querySelector(".courtyard-stall__art")
    .getBoundingClientRect();
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * 0.75 };
}
function captureStock() {
  return [...grid.children].map((card) => {
    const crate = card.querySelector(".stock-crate");
    const ghost = crate.cloneNode(true);
    return {
      ghost,
      bounds: crate.getBoundingClientRect(),
      width: crate.offsetWidth,
      height: crate.offsetHeight,
    };
  });
}
function packAway(category, items) {
  if (!category || motion.matches) return;
  const source = stallPoint(category);
  const origin = scene.getBoundingClientRect();
  for (const { ghost, bounds, width, height } of items) {
    const zoom = bounds.width / width;
    ghost.setAttribute("aria-hidden", "true");
    ghost.classList.add("courtyard-ghost");
    Object.assign(ghost.style, {
      position: "absolute",
      width: width + "px",
      height: height + "px",
      left: bounds.x + bounds.width / 2 - width / 2 - origin.x + "px",
      top: bounds.y + bounds.height / 2 - height / 2 - origin.y + "px",
      margin: "0",
      zIndex: "5",
      pointerEvents: "none",
    });
    scene.append(ghost);
    ghosts.add(ghost);
    const dx = source.x - bounds.x - bounds.width / 2;
    const dy = source.y - bounds.y - bounds.height / 2;
    const flight = Array.from({ length: 21 }, (_, step) => {
      const t = step / 20,
        remaining = 1 - t;
      const x = 2 * remaining * t * dx * 0.55 + t * t * dx;
      const y = 2 * remaining * t * (dy * 0.5 - 35) + t * t * dy;
      return {
        offset: t,
        transform: `translate(${x}px,${y}px) scale(${zoom * remaining}) rotate(${(dx > 0 ? 8 : -8) * t}deg)`,
      };
    });
    const animation = animate(ghost, flight, {
      duration: 300,
      easing: "cubic-bezier(.4,0,.7,.4)",
      fill: "forwards",
    });
    animation?.finished.then(
      () => {
        ghost.remove();
        ghosts.delete(ghost);
      },
      () => {},
    );
  }
}
function deliver(category) {
  if (motion.matches) return;
  const source = stallPoint(category);
  const origin = scene.getBoundingClientRect();
  const centre = stock.getBoundingClientRect();
  const endX = centre.x + centre.width / 2 - origin.x;
  const endY = centre.y + centre.height * 0.48 - origin.y;
  const startX = source.x - origin.x;
  const startY = source.y - origin.y;
  route.setAttribute(
    "d",
    `M ${startX} ${startY} Q ${(startX + endX) / 2} ${Math.min(startY, endY) - 42} ${endX} ${endY}`,
  );
  const length = route.getTotalLength();
  const routeAnimation = animate(
    route,
    [
      { strokeDasharray: `0 ${length}`, strokeDashoffset: "0", opacity: 0.45 },
      {
        strokeDasharray: `${length} ${length}`,
        strokeDashoffset: "0",
        opacity: 0.45,
        offset: 0.65,
      },
      {
        strokeDasharray: `${length} ${length}`,
        strokeDashoffset: String(-length),
        opacity: 0,
      },
    ],
    { duration: 780, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
  );
  routeAnimation?.finished.then(
    () => route.setAttribute("d", ""),
    () => {},
  );
  [...grid.children].forEach((card, index) => {
    const crate = card.querySelector(".stock-crate");
    const crateBounds = crate.getBoundingClientRect();
    const dx = source.x - crateBounds.x - crateBounds.width / 2;
    const dy = source.y - crateBounds.y - crateBounds.height / 2;
    const tilt = dx > 0 ? -9 : 9;
    // Sample a quadratic arc: continuous curved travel, not two linear slides.
    const flight = Array.from({ length: 31 }, (_, step) => {
      const t = step / 30,
        remaining = 1 - t;
      const x = remaining * remaining * dx + 2 * remaining * t * dx * 0.35;
      const y =
        remaining * remaining * dy + 2 * remaining * t * (dy * 0.3 - 65);
      const scale = 0.12 + 0.88 * (1 - remaining ** 1.5);
      return {
        offset: t,
        transform: `translate(${x}px,${y}px) scale(${scale}) rotate(${tilt * remaining ** 2}deg)`,
      };
    });
    animate(crate, flight, {
      duration: 650,
      delay: 55 + index * 65,
      easing: "cubic-bezier(.2,.65,.25,1)",
      fill: "backwards",
    });
    for (const label of [...card.children].slice(1)) {
      animate(
        label,
        [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0)" }],
        {
          duration: 150,
          delay: 600 + index * 65,
          fill: "backwards",
          easing: "ease-out",
        },
      );
    }
    animate(
      card.querySelector(".stock-crate__shadow"),
      [
        { transform: "scale(.25)", opacity: 0.1 },
        { transform: "scale(.65)", opacity: 0.3, offset: 0.6 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 650, delay: 55 + index * 65, fill: "backwards" },
    );
  });
  const art = stalls
    .find((button) => button.dataset.category === category)
    .querySelector(".courtyard-stall__art");
  animate(
    art,
    [
      { transform: "translateY(-4px) scale(1.035)" },
      { transform: "translateY(-7px) scale(1.045,.985)", offset: 0.35 },
      { transform: "translateY(-4px) scale(1.035)" },
    ],
    { duration: 600, easing: "cubic-bezier(.2,.7,.2,1)" },
  );
}
const priceStore = createPriceStore(siteCopy.priceConfig);
const regionSelect = document.querySelector("#market-region");
const refreshButton = document.querySelector(".market-refresh");
const fetchState = document.querySelector("#market-fetch-state");
let regionId = "",
  priceGeneration = 0;
try {
  const stored =
    localStorage.getItem("soukscan.website.region") ||
    localStorage.getItem("soukscan.region");
  if (siteCopy.regions.some((r) => r.id === stored)) regionId = stored;
} catch {}
for (const region of siteCopy.regions) {
  const option = document.createElement("option");
  option.value = region.id;
  option.textContent = region["name_" + siteCopy.language] || region.name_en;
  regionSelect.append(option);
}
regionSelect.value = regionId;
regionSelect.disabled = false;
function regionName() {
  const region = siteCopy.regions.find((r) => r.id === regionId);
  return region
    ? region["name_" + siteCopy.language] || region.name_en
    : priceCopy.chooseRegion;
}
function plural(key, count) {
  return message(priceCopy[key + (count === 1 ? "One" : "Other")], { count });
}
function appendText(parent, tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}
function paintSource(card, kind, value) {
  const host = card.querySelector(".product-prices");
  let row = host.querySelector('[data-source="' + kind + '"]');
  if (!row) {
    row = document.createElement("div");
    row.dataset.source = kind;
    host.append(row);
  }
  row.className = "product-price-source product-price-source--" + kind;
  row.dataset.status = value.status;
  row.replaceChildren();
  appendText(
    row,
    "span",
    "price-source-label",
    kind === "reference" ? priceCopy.wholesale : priceCopy.community,
  );
  if (value.status === "ok") {
    const line = document.createElement("div");
    line.className = "courtyard-product__price";
    appendText(
      line,
      "strong",
      "price-value",
      `${value.lowerRange} – ${value.upperRange}`,
    ).dir = "ltr";
    row.append(line);
    if (kind === "reference") {
      const date = new Intl.DateTimeFormat(siteCopy.language, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Casablanca",
      }).format(new Date(value.bulletinDate + "T12:00:00Z"));
      const meta = appendText(row, "time", "price-meta", date);
      meta.dateTime = value.bulletinDate;
      meta.dir = "auto";
      row.title =
        priceCopy.source +
        (value.note ? " · " + priceCopy[value.note + "Note"] : "");
      row.dataset.note = value.note || "";
      if (value.note)
        appendText(
          meta,
          "span",
          "sr-only",
          " · " + priceCopy[value.note + "Note"],
        );
    } else {
      appendText(
        row,
        "span",
        "price-meta",
        value.freshnessDays === 0
          ? priceCopy.today
          : plural("updated", value.freshnessDays),
      );
      row.title = plural("observations", value.sampleSize);
    }
  } else {
    const text =
      value.status === "loading"
        ? priceCopy.loading
        : value.status === "region"
          ? priceCopy.chooseRegion
          : value.status === "insufficient"
            ? priceCopy.insufficient
            : value.status === "none"
              ? priceCopy.none
              : priceCopy.rowError;
    appendText(row, "span", "price-state", text);
  }
  if (value.refreshFailed) row.dataset.refreshFailed = "true";
  else delete row.dataset.refreshFailed;
}
function updatePrices(force = false) {
  const generation = ++priceGeneration,
    category = selected,
    region = regionId;
  if (!category) {
    refreshButton.disabled = true;
    fetchState.textContent = "";
    return;
  }
  document.querySelector("#stock-region").textContent = regionName();
  document.querySelector("#stock-region").title = regionName();
  refreshButton.disabled = true;
  fetchState.textContent = priceCopy.loading;
  const requests = [];
  for (const card of grid.children) {
    for (const kind of ["reference", "community"]) {
      if (kind === "community" && !region) {
        paintSource(card, kind, { status: "region" });
        continue;
      }
      paintSource(
        card,
        kind,
        priceStore.read(kind, card.dataset.productId, region) || {
          status: "loading",
        },
      );
      requests.push(
        priceStore
          .load(kind, card.dataset.productId, region, { force })
          .then((value) => {
            if (
              generation !== priceGeneration ||
              category !== selected ||
              region !== regionId ||
              !card.isConnected
            )
              return value;
            paintSource(card, kind, value);
            return value;
          }),
      );
    }
  }
  Promise.all(requests).then((values) => {
    if (
      generation !== priceGeneration ||
      category !== selected ||
      region !== regionId
    )
      return;
    refreshButton.disabled = false;
    fetchState.textContent = values.some((v) => v.refreshFailed)
      ? priceCopy.refreshFailed
      : values.some((v) => v.status === "error")
        ? priceCopy.error
        : region
          ? ""
          : priceCopy.regionHint;
  });
}
regionSelect.addEventListener("change", () => {
  regionId = siteCopy.regions.some((r) => r.id === regionSelect.value)
    ? regionSelect.value
    : "";
  try {
    localStorage.setItem("soukscan.website.region", regionId);
  } catch {}
  updatePrices();
});
refreshButton.addEventListener("click", () => updatePrices(true));
function select(category) {
  if (!vendors[category] || category === selected) return;
  const outgoing = captureStock();
  stopMotion();
  const previous = selected;
  packAway(previous, outgoing);
  selected = category;
  explored.add(category);
  courtyard.dataset.state = "selected";
  courtyard.dataset.category = category;
  welcome.hidden = true;
  stock.hidden = false;
  stalls.forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector("#vendor-kicker").textContent =
    marketCopy.kickers[category];
  document.querySelector("#products-title").textContent = titles[category];
  const fragment = document.createDocumentFragment();
  for (const [name, productId, image, unit] of vendors[category].products) {
    const card = document.createElement("article");
    card.className = "courtyard-product";
    card.dataset.productId = productId;
    card.dataset.unit = unit;
    const frame = foodFrames[name === "Roumi eggs" ? "white_egg" : image];
    // The inner viewport also clips letterboxed edges to the selected frame.
    const foodArt = `<svg class="stock-crate__food" viewBox="0 0 ${frame[2]} ${frame[3]}" preserveAspectRatio="xMidYMid meet" focusable="false"><svg width="${frame[2]}" height="${frame[3]}" viewBox="${frame.join(" ")}" overflow="hidden"><image href="${foodSheet}" width="1254" height="1254" /></svg></svg>`;
    // These are authored constants, never user input or remote HTML.
    card.innerHTML = `<div class="stock-crate" aria-hidden="true"><span class="stock-crate__shadow"></span><div class="stock-crate__back"></div><div class="stock-crate__produce">${foodArt}</div><div class="stock-crate__front"></div></div><h4 class="courtyard-product__name">${marketCopy.products[name]}</h4><span class="product-unit">${marketCopy.units[unit]}</span><div class="product-prices"></div>`;
    fragment.append(card);
  }
  grid.replaceChildren(fragment);
  grid.style.setProperty(
    "--stock-count",
    String(vendors[category].products.length),
  );
  document.querySelector("#market-progress").textContent = message(
    marketCopy.explored,
    { count: explored.size },
  );
  document.querySelector("#selection-status").textContent = message(
    marketCopy.announcement,
    { title: titles[category], count: vendors[category].products.length },
  );
  updatePrices();
  deliver(category);
}
function returnToSquare() {
  if (!selected) return;
  const previous = selected;
  const outgoing = captureStock();
  stopMotion();
  packAway(previous, outgoing);
  selected = null;
  priceGeneration++;
  refreshButton.disabled = true;
  fetchState.textContent = "";
  courtyard.dataset.state = "idle";
  delete courtyard.dataset.category;
  stock.hidden = true;
  grid.replaceChildren();
  welcome.hidden = false;
  stalls.forEach((button) => {
    button.classList.remove("is-active");
    button.setAttribute("aria-pressed", "false");
  });
  document.querySelector("#selection-status").textContent =
    marketCopy.backAnnouncement;
  stalls
    .find((button) => button.dataset.category === previous)
    .focus({ preventScroll: true });
  animate(
    welcome.querySelector(".courtyard-logo"),
    [
      { transform: "scale(.8) rotate(-6deg)" },
      { transform: "scale(1.035) rotate(1deg)", offset: 0.75 },
      { transform: "scale(1) rotate(0)" },
    ],
    { duration: 450, easing: "cubic-bezier(.2,.7,.2,1)" },
  );
}
stalls.forEach((button, index) => {
  button.addEventListener("click", () => select(button.dataset.category));
  button.addEventListener("keydown", (event) => {
    // Spatial keyboard navigation matches the two left / two right positions.
    const destinations = {
      ArrowRight: [2, 3, 0, 1],
      ArrowLeft: [2, 3, 0, 1],
      ArrowDown: [1, 0, 3, 2],
      ArrowUp: [1, 0, 3, 2],
    };
    let next;
    if (destinations[event.key]) next = destinations[event.key][index];
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 3;
    else return;
    event.preventDefault();
    stalls[next].focus({ preventScroll: true });
    select(stalls[next].dataset.category);
  });
});
reset.addEventListener("click", returnToSquare);
courtyard.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selected) {
    event.preventDefault();
    returnToSquare();
  }
});
motion.addEventListener("change", stopMotion);
new ResizeObserver(stopMotion).observe(scene);
stalls.forEach((button) => {
  button.disabled = false;
});
document.querySelector("#year").textContent = String(new Date().getFullYear());
