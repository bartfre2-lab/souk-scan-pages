/* Website preferences are separate from the app's settings. No tracking. */
const copy = JSON.parse(document.querySelector("#site-copy").textContent);
const button = document.querySelector(".theme-toggle");
let explicitTheme;
try {
  const stored = localStorage.getItem("soukscan.website.theme");
  if (stored === "light" || stored === "dark") explicitTheme = stored;
} catch {}
function updateThemeControl() {
  const dark = document.documentElement.dataset.theme === "dark";
  button
    .querySelector("path")
    .setAttribute(
      "d",
      dark
        ? "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"
        : "M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z",
    );
  button.querySelector("span").textContent = dark
    ? copy.common.lightMode
    : copy.common.darkMode;
  button.setAttribute(
    "aria-label",
    dark ? copy.common.lightMode : copy.common.darkMode,
  );
  button.title = dark ? copy.common.lightMode : copy.common.darkMode;
  document.querySelector('meta[name="theme-color"]').content = dark
    ? "#171e1a"
    : "#f7f4ee";
}
button.addEventListener("click", () => {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  explicitTheme = next;
  try {
    localStorage.setItem("soukscan.website.theme", next);
  } catch {
    /* Preferences remain usable without storage. */
  }
  updateThemeControl();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener(
  "change",
  (event) => {
    if (!explicitTheme) {
      document.documentElement.dataset.theme = event.matches ? "dark" : "light";
      updateThemeControl();
    }
  },
);
document.querySelectorAll(".site-controls a").forEach((link) =>
  link.addEventListener("click", () => {
    try {
      localStorage.setItem("soukscan.website.language", link.lang);
    } catch {}
  }),
);
updateThemeControl();
button.hidden = false;

// Compact navigation is progressively enhanced; links stay visible without JS.
const header = document.querySelector(".site-header");
const menu = document.querySelector(".menu-toggle");
const language = document.querySelector(".language-menu");
const compactHeader = matchMedia("(max-width: 760px)");
function closeMenu(restoreFocus = false) {
  if (!menu) return;
  const wasOpen = menu.getAttribute("aria-expanded") === "true";
  header.classList.remove("navigation-open");
  menu.setAttribute("aria-expanded", "false");
  if (restoreFocus && wasOpen) menu.focus();
}
if (menu) {
  header.classList.add("navigation-ready");
  menu.hidden = false;
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    header.classList.toggle("navigation-open", open);
    if (open) language.open = false;
  });
  document
    .querySelectorAll(".primary-nav a")
    .forEach((link) => link.addEventListener("click", () => closeMenu()));
  compactHeader.addEventListener("change", () => closeMenu());
}
language.addEventListener("toggle", () => {
  if (language.open) closeMenu();
});
document.addEventListener("click", (event) => {
  if (!language.contains(event.target)) language.open = false;
  if (!header.contains(event.target)) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeMenu(true);
  if (language.open) {
    language.open = false;
    language.querySelector("summary").focus();
  }
});
