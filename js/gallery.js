const state = {
  data: null,
  filteredArtworks: [],
  lightboxItems: [],
  lightboxIndex: 0
};

const elements = {
  brandName: document.getElementById("brandName"),
  themeToggle: document.getElementById("themeToggle"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  mobileNav: document.getElementById("mobileNav"),
  galleryGrid: document.getElementById("galleryGrid"),
  filterCategory: document.getElementById("filterCategory"),
  filterYear: document.getElementById("filterYear"),
  filterMedium: document.getElementById("filterMedium"),
  footerText: document.getElementById("footerText"),
  lightbox: document.getElementById("lightbox"),
  lightboxImage: document.getElementById("lightboxImage"),
  lightboxCaption: document.getElementById("lightboxCaption"),
  lightboxPrev: document.getElementById("lightboxPrev"),
  lightboxNext: document.getElementById("lightboxNext")
};

init();

async function init() {
  installTheme();
  installNavHandlers();
  bindLightbox();
  bindGlobalKeys();

  const data = await loadData();
  if (!data) {
    return;
  }

  state.data = data;
  state.filteredArtworks = [...(data.artworks || [])];

  renderPageMeta();
  setupFilters();
  renderGallery();
}

async function loadData() {
  try {
    const response = await fetch("data/site-data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    const isFileProtocol = window.location.protocol === "file:";
    const hint = isFileProtocol
      ? " Firefox blocks local JSON fetch on file:// URLs. Open this site through Live Server or http://localhost instead."
      : "";
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p style="position:fixed;inset:auto 1rem 1rem 1rem;padding:0.75rem;border:1px solid #ef4444;background:#220808;color:#fecaca;z-index:99;border-radius:0.5rem;">Could not load data/site-data.json. Check file path and JSON syntax.${hint}</p>`
    );
    return null;
  }
}

function renderPageMeta() {
  const site = state.data.site || {};
  const siteTitle = site.title || "Apprehension and Collection Bureau";

  document.title = `${siteTitle} | Art Gallery`;

  if (elements.brandName) {
    elements.brandName.textContent = siteTitle;
  }

  if (elements.footerText) {
    elements.footerText.textContent = site.footer || `${siteTitle} by BuniMunki.`;
  }
}

function setupFilters() {
  const allArt = state.data.artworks || [];

  populateSelect(elements.filterCategory, allArt.map((a) => a.category));
  populateSelect(elements.filterYear, allArt.map((a) => String(a.year)).sort((a, b) => b.localeCompare(a)));
  populateSelect(elements.filterMedium, allArt.map((a) => a.medium));

  [elements.filterCategory, elements.filterYear, elements.filterMedium].forEach((select) => {
    select.addEventListener("change", applyFilters);
  });
}

function populateSelect(select, values) {
  const unique = ["All", ...new Set(values)];
  select.innerHTML = "";

  unique.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function applyFilters() {
  const category = elements.filterCategory.value;
  const year = elements.filterYear.value;
  const medium = elements.filterMedium.value;

  state.filteredArtworks = (state.data.artworks || []).filter((art) => {
    const matchesCategory = category === "All" || art.category === category;
    const matchesYear = year === "All" || String(art.year) === year;
    const matchesMedium = medium === "All" || art.medium === medium;
    return matchesCategory && matchesYear && matchesMedium;
  });

  renderGallery();
}

function renderGallery() {
  elements.galleryGrid.innerHTML = "";

  const galleryItems = state.filteredArtworks.map((art) => ({
    image: art.image,
    title: art.title,
    caption: `${art.title} | ${art.category} | ${art.medium} | ${art.year}`
  }));

  if (state.filteredArtworks.length === 0) {
    elements.galleryGrid.innerHTML = '<p class="rounded-xl border border-white/10 p-4 text-sm opacity-80">No art matches this filter selection.</p>';
    return;
  }

  state.filteredArtworks.forEach((art, index) => {
    const card = document.createElement("article");
    card.className = "gallery-card";

    card.innerHTML = `
      <button class="w-full text-left" type="button" data-index="${index}">
        <img src="${art.image}" alt="${escapeHtml(art.title)}" loading="lazy">
        <div class="copy">
          <h3 class="font-display text-base">${escapeHtml(art.title)}</h3>
          <p class="mt-1 text-xs opacity-80">${escapeHtml(art.category)} | ${escapeHtml(art.medium)} | ${art.year}</p>
        </div>
      </button>
    `;

    const image = card.querySelector("img");
    addFallback(image, art.title);

    card.querySelector("button").addEventListener("click", () => openLightbox(index, galleryItems));
    elements.galleryGrid.appendChild(card);
  });
}

function bindLightbox() {
  elements.lightboxPrev.addEventListener("click", () => shiftLightbox(-1));
  elements.lightboxNext.addEventListener("click", () => shiftLightbox(1));

  document.querySelectorAll('[data-close="lightbox"]').forEach((node) => {
    node.addEventListener("click", closeLightbox);
  });
}

function openLightbox(index, items = []) {
  state.lightboxItems = items;
  state.lightboxIndex = index;
  paintLightbox();
  elements.lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  elements.lightbox.classList.add("hidden");
  document.body.style.overflow = "";
}

function shiftLightbox(direction) {
  if (!state.lightboxItems.length) {
    return;
  }

  const next = (state.lightboxIndex + direction + state.lightboxItems.length) % state.lightboxItems.length;
  state.lightboxIndex = next;
  paintLightbox();
}

function paintLightbox() {
  const current = state.lightboxItems[state.lightboxIndex];
  if (!current) {
    return;
  }

  elements.lightboxImage.src = current.image;
  elements.lightboxImage.alt = `${current.title} full view`;
  addFallback(elements.lightboxImage, current.title);
  elements.lightboxCaption.textContent = current.caption || current.title;
}

function bindGlobalKeys() {
  window.addEventListener("keydown", (event) => {
    if (!elements.lightbox.classList.contains("hidden")) {
      if (event.key === "Escape") {
        closeLightbox();
      }
      if (event.key === "ArrowLeft") {
        shiftLightbox(-1);
      }
      if (event.key === "ArrowRight") {
        shiftLightbox(1);
      }
    }
  });
}

function installTheme() {
  const root = document.documentElement;
  root.setAttribute("data-theme", "dark");
  localStorage.setItem("site-theme", "dark");

  if (elements.themeToggle) {
    elements.themeToggle.remove();
  }
}

function installNavHandlers() {
  elements.mobileNavBtn.addEventListener("click", () => {
    elements.mobileNav.classList.toggle("hidden");
  });

  document.querySelectorAll("a[href]").forEach((anchor) => {
    anchor.addEventListener("click", () => {
      elements.mobileNav.classList.add("hidden");
    });
  });
}

function addFallback(imageNode, label) {
  imageNode.addEventListener(
    "error",
    () => {
      imageNode.src = createPlaceholder(label);
    },
    { once: true }
  );
}

function createPlaceholder(label) {
  const safeLabel = escapeHtml(label);
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'>
      <defs>
        <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#232323'/>
          <stop offset='100%' stop-color='#3a2c22'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='50%' y='50%' fill='#ffe5c8' font-family='Baloo 2, sans-serif' font-size='34' dominant-baseline='middle' text-anchor='middle'>${safeLabel}</text>
      <text x='50%' y='56%' fill='#d8b28b' font-family='Baloo 2, sans-serif' font-size='20' dominant-baseline='middle' text-anchor='middle'>Add image file to assets folder</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
