/* The landing page demonstrates categories with clearly marked example prices.
 * Live regional data remains in the existing SOUK-SCAN app.
 */
const vendors = {
  fruit: {
    kicker: "THE FRUIT SELLER",
    products: [
      ["Oranges", "برتقال", "orange", "5–8", "kg"],
      ["Apples", "تفاح", "apple", "10–16", "kg"],
      ["Bananas", "موز", "banana", "12–18", "kg"],
      ["Pomegranates", "رمان", "pomegranate", "8–14", "kg"],
    ],
  },
  vegetable: {
    kicker: "THE GREENGROCER",
    products: [
      ["Tomatoes", "طماطم", "tomato", "4–7", "kg"],
      ["Potatoes", "بطاطس", "potato", "5–8", "kg"],
      ["Carrots", "جزر", "carrot", "4–7", "kg"],
      ["Onions", "بصل", "onion", "4–6", "kg"],
    ],
  },
  meat: {
    kicker: "THE BUTCHER",
    products: [
      ["Beef", "لحم بقري", "cut_of_meat", "85–110", "kg"],
      ["Mutton", "لحم غنمي", "meat_on_bone", "95–130", "kg"],
    ],
  },
  poultry: {
    kicker: "POULTRY & EGGS",
    products: [
      ["Live chicken", "دجاج حي", "chicken", "17–23", "kg"],
      ["Dressed chicken", "دجاج مذبوح", "poultry_leg", "25–32", "kg"],
      ["Beldi eggs", "بيض بلدي", "egg", "2–3", "egg"],
      ["Roumi eggs", "بيض رومي", "egg", "1–1.5", "egg"],
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
const titles = {
  fruit: "Fruit prices",
  vegetable: "Vegetable prices",
  meat: "Meat prices",
  poultry: "Poultry & eggs",
};
const foodCells = {
  orange: [0, 0],
  apple: [1, 0],
  banana: [2, 0],
  pomegranate: [3, 0],
  tomato: [0, 1],
  potato: [1, 1],
  carrot: [2, 1],
  onion: [3, 1],
  cut_of_meat: [0, 2],
  meat_on_bone: [1, 2],
  chicken: [2, 2],
  poultry_leg: [3, 2],
  egg: [0, 3],
};
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
    ghost.style.setProperty(
      "--food-x",
      card.style.getPropertyValue("--food-x"),
    );
    ghost.style.setProperty(
      "--food-y",
      card.style.getPropertyValue("--food-y"),
    );
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
    vendors[category].kicker;
  document.querySelector("#products-title").textContent = titles[category];
  const fragment = document.createDocumentFragment();
  for (const [name, arabic, image, price, unit] of vendors[category].products) {
    const card = document.createElement("article");
    card.className = "courtyard-product";
    const [column, row] = name === "Roumi eggs" ? [1, 3] : foodCells[image];
    card.style.setProperty("--food-x", `${(column / 3) * 100}%`);
    card.style.setProperty("--food-y", `${(row / 3) * 100}%`);
    // These are authored constants, never user input or remote HTML.
    card.innerHTML = `<div class="stock-crate" aria-hidden="true"><span class="stock-crate__shadow"></span><div class="stock-crate__back"></div><div class="stock-crate__produce"><span class="stock-crate__food"></span></div><div class="stock-crate__front"></div></div><h4 class="courtyard-product__name">${name}</h4><span class="courtyard-product__arabic" lang="ar" dir="rtl">${arabic}</span><p class="courtyard-product__price"><strong>${price}</strong><span>MAD / ${unit}</span></p>`;
    fragment.append(card);
  }
  grid.replaceChildren(fragment);
  document.querySelector("#market-progress").textContent =
    `${explored.size} of 4 categories explored`;
  document.querySelector("#selection-status").textContent =
    `${titles[category]}. ${vendors[category].products.length} products in the centre of the square. Example prices in Moroccan dirhams.`;
  deliver(category);
}
function returnToSquare() {
  if (!selected) return;
  const previous = selected;
  const outgoing = captureStock();
  stopMotion();
  packAway(previous, outgoing);
  selected = null;
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
    "Back in the souk square. Choose any of the four stalls to explore example prices.";
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
document.querySelector("#year").textContent = String(new Date().getFullYear());
