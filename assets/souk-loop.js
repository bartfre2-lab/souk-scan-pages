/** An unbounded, draggable street. Only offscreen copies are recycled. */
export function createSoukLoop({ stage, stalls, onSelect, reducedMotion }) {
  const row = stage.querySelector(".stall-row");
  const count = stalls.length;
  const records = [];
  let position = 0;
  let target = 0;
  let frame = 0;
  let lastTime = 0;
  let step = 1;
  let cardWidth = 1;
  let gesture = null;
  let selectedIndex = -1;
  let suppressClick = false;
  let keyboardFocus = false;
  let wheelTimer;
  const modulo = (value, size) => ((value % size) + size) % size;

  stalls.forEach((stall, index) => {
    records.push({ node: stall, index, copy: 0 });
    for (const copy of [-1, 1]) {
      const node = document.createElement("div");
      node.className = "stall-copy";
      node.setAttribute("aria-hidden", "true");
      node.dataset.category = stall.dataset.category;
      node.innerHTML = stall.innerHTML;
      row.append(node);
      records.push({ node, index, copy });
    }
  });

  function draw(announce = true) {
    const nextIndex = modulo(Math.round(position), count);
    if (nextIndex !== selectedIndex) {
      selectedIndex = nextIndex;
      onSelect(stalls[nextIndex].dataset.category, announce);
    }
    const center = stage.clientWidth / 2;
    for (const { node, index, copy } of records) {
      const distance =
        modulo(index - position + count / 2, count) - count / 2 + copy * count;
      const emphasis = Math.max(0, 1 - Math.abs(distance));
      const scale = 1 + 0.1 * emphasis;
      node.style.transform = `translate3d(${center + distance * step - cardWidth / 2}px,0,0) scale(${scale})`;
      node.style.zIndex = String(Math.round(10 + emphasis * 10));
      node.style.setProperty("--focus", emphasis);
      node.dataset.distance = String(distance);
    }
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function settle(time) {
    const elapsed = lastTime ? Math.min(40, time - lastTime) : 16;
    lastTime = time;
    position += (target - position) * (1 - Math.exp(-elapsed / 62));
    if (Math.abs(target - position) < 0.001) {
      position = target;
      draw();
      frame = 0;
      lastTime = 0;
      stage.classList.remove("is-moving");
      return;
    }
    draw();
    frame = requestAnimationFrame(settle);
  }

  function moveTo(next) {
    stop();
    target = Math.round(next);
    if (reducedMotion()) {
      position = target;
      draw();
      stage.classList.remove("is-moving");
    } else {
      stage.classList.add("is-moving");
      frame = requestAnimationFrame(settle);
    }
  }

  function chooseCategory(index) {
    const distance = modulo(index - position + count / 2, count) - count / 2;
    moveTo(position + distance);
  }

  function measure() {
    if (!stage.clientWidth) return;
    stop();
    position = Math.round(position);
    target = position;
    step = Math.min(204, stage.clientWidth / 5.3);
    cardWidth = step * 0.9;
    const cardHeight = (cardWidth * 294) / 260 + 34;
    row.style.setProperty("--stall-width", `${cardWidth}px`);
    row.style.setProperty("--stall-height", `${cardHeight}px`);
    stage.style.setProperty(
      "--scene-height",
      `${Math.ceil(cardHeight * 1.1 + 52)}px`,
    );
    draw(false);
    row.classList.add("is-ready");
  }

  for (const { node } of records) {
    node.addEventListener("click", () => {
      if (!suppressClick) moveTo(position + Number(node.dataset.distance));
    });
  }
  stalls.forEach((stall, index) =>
    stall.addEventListener("focus", () => {
      if (!keyboardFocus && stall.matches(":focus-visible"))
        chooseCategory(index);
    }),
  );

  row.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const focusedIndex = stalls.indexOf(event.target.closest(".stall"));
    const base = Math.round(target);
    const anchor =
      focusedIndex < 0
        ? base
        : base + modulo(focusedIndex - base + count / 2, count) - count / 2;
    const destination =
      event.key === "Home"
        ? position + modulo(-position + count / 2, count) - count / 2
        : event.key === "End"
          ? position +
            modulo(count - 1 - position + count / 2, count) -
            count / 2
          : anchor + (event.key === "ArrowRight" ? 1 : -1);
    keyboardFocus = true;
    stalls[modulo(Math.round(destination), count)].focus({
      preventScroll: true,
    });
    keyboardFocus = false;
    moveTo(destination);
  });

  stage.addEventListener("pointerdown", (event) => {
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    stop();
    clearTimeout(wheelTimer);
    target = position;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: position,
      last: position,
      time: event.timeStamp,
      velocity: 0,
      dragging: false,
    };
  });
  stage.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x,
      dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        gesture = null;
        moveTo(position);
        return;
      }
      if (Math.abs(dx) < 6) return;
      gesture.dragging = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
    }
    event.preventDefault();
    position = gesture.start - dx / step;
    const dt = Math.max(1, event.timeStamp - gesture.time);
    const velocity = (position - gesture.last) / dt;
    gesture.velocity = gesture.velocity * 0.45 + velocity * 0.55;
    gesture.last = position;
    gesture.time = event.timeStamp;
    draw();
  });

  function release(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dragging = gesture.dragging;
    const velocity =
      event.timeStamp - gesture.time < 100 ? gesture.velocity : 0;
    gesture = null;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId))
      stage.releasePointerCapture(event.pointerId);
    if (dragging) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
      moveTo(
        position +
          (cancelled ? 0 : Math.max(-1.2, Math.min(1.2, velocity * 100))),
      );
    } else if (cancelled) moveTo(position);
  }
  stage.addEventListener("pointerup", (event) => release(event));
  window.addEventListener("pointerup", (event) => release(event));
  stage.addEventListener("pointercancel", (event) => release(event, true));
  stage.addEventListener("lostpointercapture", (event) => {
    // Touch starts with implicit capture on the tapped image/button. Its
    // handoff to the street is not a cancelled drag.
    if (event.target === stage) release(event, true);
  });
  stage.addEventListener("dragstart", (event) => event.preventDefault());

  stage.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || event.ctrlKey)
        return;
      event.preventDefault();
      stop();
      position += event.deltaX / step;
      target = position;
      draw();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => moveTo(position), 110);
    },
    { passive: false },
  );

  let measuredWidth = 0;
  new ResizeObserver(() => {
    if (Math.abs(stage.clientWidth - measuredWidth) < 1) return;
    measuredWidth = stage.clientWidth;
    gesture = null;
    stage.classList.remove("is-dragging");
    measure();
  }).observe(stage);
  measure();
  return { chooseCategory };
}
