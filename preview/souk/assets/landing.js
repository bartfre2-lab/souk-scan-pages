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

function renderCategory(category, announce = true) {
  const vendor = vendors[category];
  if (!vendor || activeCategory === category) return;
  activeCategory = category;
  document.querySelector("#vendor-kicker").textContent = vendor.kicker;
  document.querySelector("#products-title").textContent = vendor.title;
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
    card.innerHTML = `<div class="product-crate" aria-hidden="true">
      <div class="crate-back"></div>
      <div class="crate-produce">${Array.from({ length: 6 }, () => `<img src="./assets/products/${image}.png" alt="" width="78" height="78">`).join("")}</div>
      <div class="crate-front"><span class="crate-stamp">SOUK · SCAN</span></div>
      <div class="crate-tag"><strong>${price}</strong><span>MAD / ${unit}</span></div>
      </div><div class="product-info"><h3>${name}</h3><span lang="ar" dir="rtl">${arabic}</span></div>
      <p class="product-sub">Sample range · ${price} MAD per ${unit}</p>`;
    fragment.append(card);
  });
  productGrid.replaceChildren(fragment);
  if (announce)
    document.querySelector("#selection-status").textContent =
      `${vendor.kicker.toLowerCase()}: ${vendor.products.length} products shown. Illustrative prices in Moroccan dirhams.`;
}

categoryButtons.forEach((button) =>
  button.addEventListener("click", () => {
    renderCategory(button.dataset.category);
    if (button.classList.contains("stall")) {
      const productsTop =
        document.querySelector("#stall-products").getBoundingClientRect().top +
        window.scrollY;
      window.scrollTo({
        top: productsTop - (window.innerWidth > 760 ? 110 : 45),
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
    // Keep the matching illustrated stall in view when a small-screen visitor uses the category controls.
    if (button.closest(".category-switcher")) {
      const stall = document.querySelector(
        `.stall[data-category="${button.dataset.category}"]`,
      );
      const scroller = document.querySelector(".market-scroll");
      const targetLeft =
        stall.offsetLeft + stall.offsetWidth / 2 - scroller.clientWidth / 2;
      scroller.scrollTo({
        left: targetLeft,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
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
    if (container.classList.contains("stall-row")) {
      const scroller = document.querySelector(".market-scroll");
      scroller.scrollTo({
        left:
          buttons[nextIndex].offsetLeft +
          buttons[nextIndex].offsetWidth / 2 -
          scroller.clientWidth / 2,
        behavior: "instant",
      });
    }
  });
}

if (
  "IntersectionObserver" in window &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08 },
  );
  for (const element of document.querySelectorAll(
    ".steps article, .download-card, .faq-section",
  )) {
    element.classList.add("reveal-ready");
    observer.observe(element);
  }
}
document.querySelector("#year").textContent = String(new Date().getFullYear());

// A small amount of depth follows a mouse or pen; touch and reduced-motion users get a still scene.
const marketWorld = document.querySelector(".market-world");
if (
  matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)")
    .matches
) {
  marketWorld.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      const bounds = marketWorld.getBoundingClientRect();
      marketWorld.style.setProperty(
        "--market-x",
        ((event.clientX - bounds.left) / bounds.width - 0.5).toFixed(3),
      );
    },
    { passive: true },
  );
  marketWorld.addEventListener("pointerleave", () =>
    marketWorld.style.setProperty("--market-x", "0"),
  );
}
