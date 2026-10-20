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
  button.setAttribute("aria-pressed", String(dark));
  button.querySelector("span").textContent = dark
    ? copy.common.lightMode
    : copy.common.darkMode;
  document.querySelector('meta[name="theme-color"]').content = dark
    ? "#171c19"
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
