// Search and topic filter for the Articles list. The list is static and
// paginated (it works without JavaScript); this only adds searching on top.
// Results come from a small per-language index (title, summary, topics).
const tools = document.querySelector(".articles-tools");
const pageList = document.querySelector(".article-list:not(.article-results)");
const results = document.querySelector(".article-results");
if (tools && pageList && results) {
  const copy = JSON.parse(document.querySelector("#articles-copy").textContent);
  const input = tools.querySelector("input");
  const clear = tools.querySelector(".articles-clear");
  const status = tools.querySelector(".articles-status");
  const chips = [...tools.querySelectorAll("[data-topic]")];
  const pager = document.querySelector(".pager");
  let topic = "";
  let indexRequest;

  // Case, accents, Arabic vowel marks and alef/yaa variants do not matter.
  const normalize = (text) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ًͯ-ٟـ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي");
  const plural = (count) => {
    if (count === 1) return "One";
    if (copy.lang !== "ar") return "Other";
    return count === 2 ? "Two" : count >= 3 && count <= 10 ? "Few" : "Many";
  };
  const loadIndex = () => (indexRequest ??= fetch(tools.dataset.index).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }));

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function render(entry) {
    const item = element("li", "article-item" + (entry.image ? "" : " article-item--text"));
    if (entry.image) {
      const thumb = element("a", "article-thumb");
      thumb.href = entry.url;
      thumb.tabIndex = -1;
      thumb.setAttribute("aria-hidden", "true");
      const image = element("img");
      image.src = entry.image;
      image.alt = "";
      image.width = entry.width;
      image.height = entry.height;
      image.loading = "lazy";
      image.decoding = "async";
      thumb.append(image);
      item.append(thumb);
    }
    const body = element("div", "article-item-body");
    const meta = element("p", "article-meta");
    const time = element("time", "", entry.date);
    time.dateTime = entry.iso;
    const dot = element("span", "", "·");
    dot.setAttribute("aria-hidden", "true");
    meta.append(time, dot, element("span", "", entry.reading));
    const heading = element("h2");
    const link = element("a", "", entry.title);
    link.href = entry.url;
    heading.append(link);
    body.append(meta, heading, element("p", "", entry.summary));
    item.append(body);
    return item;
  }

  async function update() {
    const query = input.value.trim();
    const active = query !== "" || topic !== "";
    clear.hidden = !active;
    chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.topic === topic)));
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (topic) params.set("topic", topic);
    history.replaceState(null, "", location.pathname + (params.size ? "?" + params : ""));
    if (!active) {
      results.hidden = true;
      pageList.hidden = false;
      if (pager) pager.hidden = false;
      status.textContent = "";
      return;
    }
    let index;
    try {
      index = await loadIndex();
    } catch {
      tools.hidden = true; // Paged lists keep working without search.
      return;
    }
    // The user may have typed again while the index loaded.
    const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    const found = index.filter(
      (entry) =>
        (!topic || entry.topics.includes(topic)) &&
        words.every((word) =>
          normalize([entry.title, entry.summary, ...entry.topics].join(" ")).includes(word),
        ),
    );
    results.replaceChildren(...found.map(render));
    results.hidden = found.length === 0;
    pageList.hidden = true;
    if (pager) pager.hidden = true;
    status.textContent = found.length
      ? copy["results" + plural(found.length)].replace("{count}", found.length)
      : copy.noResults;
  }

  input.addEventListener("input", update);
  tools.querySelector("form").addEventListener("submit", (event) => event.preventDefault());
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      topic = topic === chip.dataset.topic ? "" : chip.dataset.topic;
      update();
    }),
  );
  clear.addEventListener("click", () => {
    input.value = "";
    topic = "";
    update();
    input.focus();
  });

  const params = new URLSearchParams(location.search);
  input.value = params.get("q") ?? "";
  const wanted = params.get("topic") ?? "";
  topic = chips.some((chip) => chip.dataset.topic === wanted) ? wanted : "";
  tools.hidden = false;
  if (input.value || topic) update();
}
