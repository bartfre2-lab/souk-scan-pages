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
function animateStock() {
  if (reducedMotion()) return;
  [...productGrid.children].forEach((card, index) =>
    card.animate(
      [
        { opacity: 0, transform: "translateY(-18px) scale(.94)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      {
        duration: 520,
        delay: 100 + index * 65,
        easing: "cubic-bezier(.16,1,.3,1)",
        fill: "backwards",
      },
    ),
  );
}
function positionStalls(category) {
  document.querySelector(".stall-row").classList.add("is-ready");
  const active = categories.indexOf(category);
  stalls.forEach((stall, index) => {
    let distance = (index - active + categories.length) % categories.length;
    if (distance > 1) distance -= categories.length;
    stall.style.setProperty("--slot", distance);
    stall.style.zIndex =
      distance === 0 ? "3" : Math.abs(distance) === 1 ? "2" : "0";
    stall.classList.toggle("is-distant", Math.abs(distance) > 1);
  });
}
function step(direction) {
  const index = categories.indexOf(activeCategory);
  renderCategory(
    categories[(index + direction + categories.length) % categories.length],
  );
}
document
  .querySelector(".carousel-prev")
  .addEventListener("click", () => step(-1));
document
  .querySelector(".carousel-next")
  .addEventListener("click", () => step(1));
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
  document.querySelector("#vendor-kicker").textContent = vendor.kicker;
  document.querySelector("#products-title").textContent = {
    fruit: "Fruit prices",
    vegetable: "Vegetable prices",
    meat: "Meat prices",
    poultry: "Poultry & egg prices",
  }[category];
  document.querySelector(".carousel-caption").textContent =
    document.querySelector("#products-title").textContent;
  positionStalls(category);
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
for (const container of document.querySelectorAll(
  ".stall-row, .category-switcher",
)) {
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
