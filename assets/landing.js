/* SOUK-SCAN landing-page preview. All prices here are illustrative.
 * Live regional prices and community reporting stay inside the existing app.
 */
"use strict";
const vendors = {
  fruit: {
    kicker: "THE FRUIT SELLER",
    title: "A little colour in your basket.",
    products: [
      ["Oranges", "برتقال", "orange", "5–8", "kg"],
      ["Apples", "تفاح", "apple", "10–16", "kg"],
      ["Bananas", "موز", "banana", "12–18", "kg"],
      ["Pomegranates", "رمان", "pomegranate", "8–14", "kg"],
    ],
  },
  vegetable: {
    kicker: "THE GREENGROCER",
    title: "The good things, from the ground.",
    products: [
      ["Tomatoes", "طماطم", "tomato", "4–7", "kg"],
      ["Potatoes", "بطاطس", "potato", "5–8", "kg"],
      ["Carrots", "جزر", "carrot", "4–7", "kg"],
      ["Onions", "بصل", "onion", "4–6", "kg"],
    ],
  },
  meat: {
    kicker: "THE BUTCHER",
    title: "A clearer picture at the counter.",
    products: [
      ["Beef", "لحم بقري", "cut_of_meat", "85–110", "kg"],
      ["Mutton", "لحم غنمي", "meat_on_bone", "95–130", "kg"],
    ],
  },
  poultry: {
    kicker: "POULTRY & EGGS",
    title: "Everyday staples. Shared knowledge.",
    products: [
      ["Live chicken", "دجاج حي", "chicken", "17–23", "kg"],
      ["Dressed chicken", "دجاج مذبوح", "poultry_leg", "25–32", "kg"],
      ["Beldi eggs", "بيض بلدي", "egg", "2–3", "egg"],
      ["Roumi eggs", "بيض رومي", "egg", "1–1.5", "egg"],
    ],
  },
};

const productGrid = document.querySelector("#product-grid");
const categoryButtons = [...document.querySelectorAll("button[data-category]")];
let activeCategory = null;
const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const stalls = [...document.querySelectorAll(".stall")];
const categories = Object.keys(vendors);
const stage = document.querySelector(".market-scroll");
const explored = new Set();
function animateStock() {
  if (reducedMotion()) return;
  [...productGrid.children].forEach((card, index) =>
    card.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      {
        duration: 260,
        delay: index * 35,
        easing: "cubic-bezier(.2,.7,.2,1)",
        fill: "backwards",
      },
    ),
  );
}
function positionStalls(category, animate = false) {
  const width = stage.clientWidth;
  const compact = width < 700;
  const backWidth = Math.min(compact ? 100 : 156, (width - 34) / 3);
  const frontWidth = Math.min(compact ? 172 : 224, width * 0.52);
  const backY = 8;
  const backHeight = backWidth * (248 / 240) + 32;
  const frontY = backY + backHeight + 12;
  const frontHeight = frontWidth * (248 / 240) + 32;
  const sideInset = compact ? 10 : width * 0.17;
  const backCenters = [
    sideInset + backWidth / 2,
    width / 2,
    width - sideInset - backWidth / 2,
  ];
  let backIndex = 0;
  stage.style.setProperty("--scene-height", `${frontY + frontHeight + 6}px`);
  stalls.forEach((stall) => {
    const current = getComputedStyle(stall);
    const matrix = new DOMMatrixReadOnly(
      current.transform === "none" ? undefined : current.transform,
    );
    const before = {
      x: matrix.m41,
      y: matrix.m42,
      width: parseFloat(current.width),
    };
    const wasSelected = stall.classList.contains("is-active");
    stall.getAnimations().forEach((animation) => animation.cancel());
    const selected = stall.dataset.category === category;
    const stallWidth = selected ? frontWidth : backWidth;
    const center = selected ? width / 2 : backCenters[backIndex++];
    stall.style.setProperty("--stall-width", `${stallWidth}px`);
    stall.style.setProperty("--stall-x", `${center - stallWidth / 2}px`);
    stall.style.setProperty("--stall-y", `${selected ? frontY : backY}px`);
    stall.style.zIndex = selected ? "4" : wasSelected ? "3" : "2";
    stall.classList.toggle("is-explored", explored.has(stall.dataset.category));
    const mark = selected
      ? '<path d="m5 12 4 4L19 6"/>'
      : explored.has(stall.dataset.category)
        ? '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>'
        : '<path d="M6 18 18 6M6 6h12v12"/>';
    stall.querySelector(".stall-arrow").innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true">${mark}</svg>`;
    if (animate && !reducedMotion()) {
      const x = center - stallWidth / 2,
        y = selected ? frontY : backY;
      const frames = [
        {
          transform: `translate3d(${before.x}px,${before.y}px,0)`,
          width: `${before.width}px`,
        },
      ];
      if (selected || wasSelected) {
        const middleWidth = (before.width + stallWidth) / 2;
        const lane = Math.min(120, width * 0.21) * (selected ? 1 : -1);
        const middleX = Math.max(
          4,
          Math.min(width - middleWidth - 4, (before.x + x) / 2 + lane),
        );
        frames.push({
          transform: `translate3d(${middleX}px,${(before.y + y) / 2}px,0)`,
          width: `${middleWidth}px`,
          offset: 0.5,
        });
      }
      frames.push({
        transform: `translate3d(${x}px,${y}px,0)`,
        width: `${stallWidth}px`,
      });
      stall.animate(frames, {
        duration: 380,
        easing: "cubic-bezier(.25,.65,.3,1)",
      });
    }
  });
  document.querySelector(".stall-row").classList.add("is-ready");
}
new ResizeObserver(() => {
  if (activeCategory) positionStalls(activeCategory);
}).observe(stage);
function step(direction) {
  const index = categories.indexOf(activeCategory);
  renderCategory(
    categories[(index + direction + categories.length) % categories.length],
  );
}
let gesture = null;
stage.addEventListener("pointerdown", (event) => {
  if (event.isPrimary)
    gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
stage.addEventListener("pointerup", (event) => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x,
    dy = event.clientY - gesture.y;
  gesture = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    step(dx < 0 ? 1 : -1);
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
});
stage.addEventListener("pointercancel", () => {
  gesture = null;
});
let suppressClick = false;
stalls.forEach((stall) =>
  stall.addEventListener("focus", () => {
    if (stall.matches(":focus-visible")) renderCategory(stall.dataset.category);
  }),
);
stage.addEventListener("dragstart", (event) => event.preventDefault());

function renderCategory(category, announce = true) {
  const vendor = vendors[category];
  if (!vendor || activeCategory === category) return;
  activeCategory = category;
  explored.add(category);
  document.querySelector("#market-progress").textContent =
    `${explored.size} of 4 stalls explored`;
  document.querySelector("#vendor-kicker").textContent = vendor.kicker;
  document.querySelector("#products-title").textContent = {
    fruit: "Fruit prices",
    vegetable: "Vegetable prices",
    meat: "Meat prices",
    poultry: "Poultry & egg prices",
  }[category];
  positionStalls(category, announce);
  categoryButtons.forEach((button) => {
    const selected = button.dataset.category === category;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const fragment = document.createDocumentFragment();
  vendor.products.forEach(([name, arabic, image, price, unit], index) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.style.setProperty("--i", index);
    // All values below are authored constants, never remote or user-provided HTML.
    card.innerHTML = `<div class="product-crate" aria-hidden="true"><div class="crate-back"></div><div class="crate-produce">${Array.from({ length: 5 }, () => `<img src="./assets/products/${image}.png" alt="" width="78" height="78">`).join("")}</div><div class="crate-front"><span class="crate-stamp">SOUK-SCAN</span></div></div><div class="product-info"><h3>${name}</h3><span lang="ar" dir="rtl">${arabic}</span></div><p class="product-sub">Example range</p><p class="product-price"><strong>${price}</strong><span>MAD / ${unit}</span></p>`;
    fragment.append(card);
  });
  productGrid.style.setProperty(
    "--stock-count",
    Math.min(vendor.products.length, 4),
  );
  productGrid.replaceChildren(fragment);
  if (announce) animateStock();
  if (announce)
    document.querySelector("#selection-status").textContent =
      `${vendor.kicker.toLowerCase()}: ${vendor.products.length} products shown. Illustrative prices in Moroccan dirhams.`;
}

categoryButtons.forEach((button) =>
  button.addEventListener("click", () => {
    if (!suppressClick) renderCategory(button.dataset.category);
  }),
);
renderCategory("fruit", false);

// Native buttons retain normal Tab / Shift+Tab behavior. Arrow keys are an additional convenience.
for (const container of document.querySelectorAll(".stall-row")) {
  container.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...container.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[nextIndex].focus({ preventScroll: true });
    buttons[nextIndex].click();
  });
}

document.querySelector("#year").textContent = String(new Date().getFullYear());
