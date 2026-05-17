const COLORS_URL = "/data/colors.json";
const COMBINATIONS_URL = "/data/combinations.json";
const THEME_KEY = "sanzo-wada-theme";

const state = {
  colors: [],
  combinations: [],
  combinationsById: new Map(),
  loaded: false,
  ui: {
    search: "",
    sort: "index",
    view: "grid",
    theme: "light",
  },
};

const root = document.querySelector("#app");
const breadcrumbs = document.querySelector("#breadcrumbs");
const globalSearch = document.querySelector("#global-search");
const themeToggle = document.querySelector("#theme-toggle");

const toast = Object.assign(document.createElement("div"), { className: "copy-toast" });
document.body.appendChild(toast);
let _toastTimer = null;

let _longPressTimer = null;
let _longPressActive = false;
let _longPressStartX = 0;
let _longPressStartY = 0;
const LONG_PRESS_MS = 500;

initializeTheme();
wireGlobalControls();
loadColors();

async function loadColors() {
  try {
    const [colorsResponse, combinationsResponse] = await Promise.all([
      fetch(COLORS_URL),
      fetch(COMBINATIONS_URL),
    ]);

    if (!colorsResponse.ok || !combinationsResponse.ok) {
      throw new Error("Local dataset request failed");
    }

    const [colorsPayload, combinationsPayload] = await Promise.all([
      colorsResponse.json(),
      combinationsResponse.json(),
    ]);

    state.colors = Array.isArray(colorsPayload.colors) ? colorsPayload.colors : [];
    state.combinations = Array.isArray(combinationsPayload.combinations)
      ? combinationsPayload.combinations
      : [];
    state.combinationsById = new Map(
      state.combinations.map((combination) => [combination.id, combination]),
    );
    state.loaded = true;
    renderRoute();
  } catch (error) {
    root.innerHTML = `
      <section class="panel state-panel">
        <p class="section-kicker">Load Error</p>
        <h1>Unable to load the local dataset.</h1>
        <p class="lede compact">Check the container build and reload the page.</p>
      </section>
    `;
    console.error(error);
  }
}

function initializeTheme() {
  const stored = window.localStorage.getItem(THEME_KEY);
  state.ui.theme = stored === "dark" ? "dark" : "light";
  applyTheme();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.ui.theme;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("is-visible");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function triggerCopy(hex) {
  navigator.clipboard.writeText(hex).catch(() => {});
  showToast(`Copied ${hex}`);
  if (navigator.vibrate) navigator.vibrate(40);
}

function wireGlobalControls() {
  globalSearch.addEventListener("input", () => {
    state.ui.search = globalSearch.value.trim();
    if (parseRoute(window.location.pathname).name !== "home") {
      navigate("/");
      return;
    }
    renderRoute();
  });

  themeToggle.addEventListener("click", () => {
    state.ui.theme = state.ui.theme === "light" ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, state.ui.theme);
    applyTheme();
  });

  // Long press — for color swatches and chips
  document.addEventListener("pointerdown", (event) => {
    const target = event.target.closest("[data-long-copy]");
    if (!target) return;
    _longPressActive = false;
    _longPressStartX = event.clientX;
    _longPressStartY = event.clientY;
    _longPressTimer = setTimeout(() => {
      _longPressActive = true;
      triggerCopy(target.dataset.longCopy);
    }, LONG_PRESS_MS);
  });

  document.addEventListener("pointermove", (event) => {
    if (!_longPressTimer) return;
    const dx = event.clientX - _longPressStartX;
    const dy = event.clientY - _longPressStartY;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(_longPressTimer);
      _longPressTimer = null;
    }
  });

  document.addEventListener("pointerup", () => {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
  });

  document.addEventListener("pointercancel", () => {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
  });

  // Prevent context menu on long-press targets (mobile)
  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest("[data-long-copy]")) {
      event.preventDefault();
    }
  });

  // Click — for hex badge pills, and navigation links
  document.addEventListener("click", (event) => {
    // If a long press just fired, swallow the synthetic click
    if (_longPressActive) {
      _longPressActive = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const copyTarget = event.target.closest("[data-copy]");
    if (copyTarget) {
      event.preventDefault();
      event.stopPropagation();
      triggerCopy(copyTarget.dataset.copy);
      return;
    }

    const link = event.target.closest("[data-link]");
    if (!link) {
      return;
    }

    event.preventDefault();
    navigate(link.getAttribute("href"));
  });

  window.addEventListener("popstate", renderRoute);
}

function navigate(pathname) {
  window.history.pushState({}, "", pathname);
  renderRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function parseRoute(pathname) {
  if (pathname === "/") {
    return { name: "home" };
  }

  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "about") {
    return { name: "about" };
  }

  if (parts[0] === "swatch" && parts[1]) {
    return { name: "swatch", slug: decodeURIComponent(parts[1]) };
  }

  if (parts[0] === "combination" && parts[1]) {
    return { name: "combination", id: Number(parts[1]) };
  }

  return { name: "not-found" };
}

function renderRoute() {
  if (!state.loaded) {
    return;
  }

  syncGlobalChrome();

  const route = parseRoute(window.location.pathname);

  if (route.name === "home") {
    renderHome();
    return;
  }

  if (route.name === "about") {
    renderAbout();
    return;
  }

  if (route.name === "swatch") {
    renderSwatch(route.slug);
    return;
  }

  if (route.name === "combination") {
    renderCombination(route.id);
    return;
  }

  renderNotFound();
}

function syncGlobalChrome() {
  globalSearch.value = state.ui.search;
  const routeName = parseRoute(window.location.pathname).name;
  for (const link of document.querySelectorAll(".topbar-link")) {
    const href = link.getAttribute("href");
    const isHome = routeName === "home" && href === "/";
    const isAbout = routeName === "about" && href === "/about";
    link.classList.toggle("is-active", isHome || isAbout);
  }
}

function sortColors(colors, mode) {
  return [...colors].sort((left, right) => {
    if (mode === "name") {
      return left.name.localeCompare(right.name);
    }

    if (mode === "popular") {
      if (right.use_count !== left.use_count) {
        return right.use_count - left.use_count;
      }
      return left.index - right.index;
    }

    return left.index - right.index;
  });
}

function filterColors(colors) {
  const query = state.ui.search.toLowerCase();
  if (!query) {
    return colors;
  }

  return colors.filter((color) => {
    const haystack = [
      color.name,
      color.slug,
      color.hex,
      color.rgb,
      color.cmyk,
      String(color.index),
      ...color.combinations.map(String),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function findColorBySlug(slug) {
  return state.colors.find((color) => color.slug === slug) ?? null;
}

function findCombinationMembers(id) {
  return state.combinationsById.get(id)?.colors ?? [];
}

function getContrastColor(hex) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red) + (0.587 * green) + (0.114 * blue);
  return luminance > 170 ? "#12324d" : "#ffffff";
}

function setBreadcrumbs(items) {
  breadcrumbs.innerHTML = "";
  for (const item of items) {
    const node = document.createElement(item.href ? "a" : "span");
    node.className = `crumb${item.href ? "" : " is-current"}`;
    node.textContent = item.label;
    if (item.href) {
      node.href = item.href;
      node.setAttribute("data-link", "");
    }
    breadcrumbs.appendChild(node);
  }
}

function renderHome() {
  root.replaceChildren(document.querySelector("#home-template").content.cloneNode(true));
  setBreadcrumbs([{ label: "Colors" }]);

  const sortSelect = document.querySelector("#sort-select");
  const gridButton = document.querySelector("#grid-view-button");
  const listButton = document.querySelector("#list-view-button");
  const resultsTitle = document.querySelector("#results-title");
  const resultsMeta = document.querySelector("#results-meta");
  const grid = document.querySelector("#color-grid");

  sortSelect.value = state.ui.sort;
  grid.classList.toggle("is-list", state.ui.view === "list");
  gridButton.classList.toggle("is-active", state.ui.view === "grid");
  listButton.classList.toggle("is-active", state.ui.view === "list");

  function paintGrid() {
    state.ui.sort = sortSelect.value;
    const filtered = filterColors(sortColors(state.colors, state.ui.sort));
    resultsTitle.textContent = `${filtered.length} colors`;
    resultsMeta.textContent = state.ui.search
      ? `Filtered by "${state.ui.search}"`
      : "Local Sanzo Wada collection";
    grid.innerHTML = "";
    grid.classList.toggle("is-list", state.ui.view === "list");

    for (const color of filtered) {
      const link = document.createElement("a");
      link.href = `/swatch/${encodeURIComponent(color.slug)}`;
      link.className = "route-link";
      link.setAttribute("data-link", "");
      link.innerHTML = `
        <span class="swatch-tile" style="background:${color.hex}" data-long-copy="${color.hex}"></span>
        <span class="route-copy">
          <strong>${color.name}</strong>
          <span class="route-meta">
            <span class="hex-badge" data-copy="${color.hex}">${color.hex}</span>
            <span class="combo-count">${color.use_count} combos</span>
          </span>
        </span>
      `;
      grid.appendChild(link);
    }
  }

  sortSelect.addEventListener("change", paintGrid);
  gridButton.addEventListener("click", () => {
    state.ui.view = "grid";
    paintGrid();
    gridButton.classList.add("is-active");
    listButton.classList.remove("is-active");
  });
  listButton.addEventListener("click", () => {
    state.ui.view = "list";
    paintGrid();
    listButton.classList.add("is-active");
    gridButton.classList.remove("is-active");
  });

  paintGrid();
}

function renderSwatch(slug) {
  const color = findColorBySlug(slug);
  if (!color) {
    renderNotFound();
    return;
  }

  root.replaceChildren(document.querySelector("#swatch-template").content.cloneNode(true));
  setBreadcrumbs([
    { label: "Colors", href: "/" },
    { label: color.name },
  ]);

  const heroChip = document.querySelector("#swatch-hero-chip");
  heroChip.style.background = color.hex;
  heroChip.dataset.longCopy = color.hex;

  document.querySelector("#swatch-index").textContent = `Color #${color.index}`;
  document.querySelector("#swatch-name").textContent = color.name;

  const hexEl = document.querySelector("#swatch-hex");
  hexEl.textContent = color.hex;
  hexEl.dataset.copy = color.hex;
  hexEl.title = "Click to copy";

  document.querySelector("#swatch-summary").textContent =
    `${color.name} appears in ${color.use_count} combinations. Each preview below shows how it sits beside the other colors.`;
  document.querySelector("#swatch-rgb").textContent = color.rgb;
  document.querySelector("#swatch-cmyk").textContent = color.cmyk;
  document.querySelector("#swatch-slug").textContent = color.slug;
  document.querySelector("#swatch-uses").textContent = String(color.use_count);

  const combinations = document.querySelector("#swatch-combinations");
  for (const id of color.combinations) {
    const members = sortColors(findCombinationMembers(id), "index");
    const card = document.createElement("article");
    card.className = "combo-preview";
    card.innerHTML = `<a href="/combination/${id}" data-link class="combo-preview-link">Combination ${id}</a>`;

    const strip = document.createElement("div");
    strip.className = "combo-preview-strip";
    for (const member of members) {
      const chip = document.createElement("span");
      chip.className = "combo-preview-chip";
      chip.style.background = member.hex;
      chip.title = `${member.name} — hold to copy ${member.hex}`;
      chip.dataset.longCopy = member.hex;
      strip.appendChild(chip);
    }
    card.appendChild(strip);

    const list = document.createElement("div");
    list.className = "combo-preview-members";
    for (const member of members) {
      const row = document.createElement("a");
      row.href = `/swatch/${encodeURIComponent(member.slug)}`;
      row.className = "combo-member-row";
      row.setAttribute("data-link", "");
      row.innerHTML = `
        <span class="combo-member-chip" style="background:${member.hex}" data-long-copy="${member.hex}"></span>
        <span class="combo-member-copy">
          <strong>${member.name}</strong>
          <span class="hex-badge" data-copy="${member.hex}">${member.hex}</span>
        </span>
      `;
      list.appendChild(row);
    }

    card.appendChild(list);
    combinations.appendChild(card);
  }
}

function renderCombination(id) {
  if (!Number.isInteger(id)) {
    renderNotFound();
    return;
  }

  const members = sortColors(findCombinationMembers(id), "index");
  if (members.length === 0) {
    renderNotFound();
    return;
  }

  root.replaceChildren(document.querySelector("#combination-template").content.cloneNode(true));
  setBreadcrumbs([
    { label: "Colors", href: "/" },
    { label: `Combination ${id}` },
  ]);

  document.querySelector("#combination-title").textContent = `Combination ${id}`;
  const strip = document.querySelector("#combination-strip");
  const list = document.querySelector("#combination-list");

  for (const color of members) {
    const segment = document.createElement("a");
    segment.href = `/swatch/${encodeURIComponent(color.slug)}`;
    segment.className = "strip-color";
    segment.setAttribute("data-link", "");
    segment.style.background = color.hex;
    segment.style.color = getContrastColor(color.hex);
    segment.innerHTML = `
      <span class="strip-label">${color.name}</span>
      <span class="strip-hex-badge" data-copy="${color.hex}">${color.hex}</span>
    `;
    strip.appendChild(segment);

    const row = document.createElement("a");
    row.href = `/swatch/${encodeURIComponent(color.slug)}`;
    row.className = "color-row";
    row.setAttribute("data-link", "");
    row.innerHTML = `
      <span class="color-chip" style="background:${color.hex}" data-long-copy="${color.hex}"></span>
      <span class="route-copy">
        <strong>${color.name}</strong>
        <span class="hex-badge" data-copy="${color.hex}">${color.hex}</span>
      </span>
    `;
    list.appendChild(row);
  }
}

function renderAbout() {
  root.replaceChildren(document.querySelector("#about-template").content.cloneNode(true));
  setBreadcrumbs([
    { label: "About" },
  ]);
}

function renderNotFound() {
  root.replaceChildren(document.querySelector("#not-found-template").content.cloneNode(true));
  setBreadcrumbs([
    { label: "Not Found" },
  ]);
}
