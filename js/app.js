/*
  Content is loaded from data/site-data.json.
  To add new art or comics, update that JSON and drop image files into:
  - assets/art/
  - assets/comics/<series-slug>/<chapter-slug>/001.jpg, 002.jpg, ...
*/

const state = {
  data: null,
  filteredArtworks: [],
  lightboxIndex: 0,
  lightboxItems: [],
  heroBoobGifTimer: null,
  heroBoobGifToken: 0,
  heroBoobGifDurationCache: {},
  reader: {
    seriesSlug: "",
    chapterSlug: "",
    pages: [],
    chapterTitle: "",
    seriesTitle: "",
    currentPage: 0,
    mode: "vertical"
  }
};

const LYDIA_HERO_IMAGE_PATH = "assets/webcomic-site-futuristic-portfoliotheme-reference/frontpagelydia.png";
const LYDIA_BOOB_GIF_PATH = "assets/webcomic-site-futuristic-portfoliotheme-reference/boobjiggle.gif";
const LYDIA_BUTT_GIF_PATH = "assets/webcomic-site-futuristic-portfoliotheme-reference/buttjiggle.gif";
const LYDIA_HITBOX_GIF_FALLBACK_MS = 1200;

const lydiaSpankSoundPaths = [
  "assets/webcomic-site-futuristic-portfoliotheme-reference/spank1.mp3",
  "assets/webcomic-site-futuristic-portfoliotheme-reference/spank2.mp3",
  "assets/webcomic-site-futuristic-portfoliotheme-reference/spank3.mp3",
  "assets/webcomic-site-futuristic-portfoliotheme-reference/spank4.mp3",
  "assets/webcomic-site-futuristic-portfoliotheme-reference/spank5.mp3",
  "assets/webcomic-site-futuristic-portfoliotheme-reference/spank6.mp3"
];

const lydiaBoingSoundPath = "assets/webcomic-site-futuristic-portfoliotheme-reference/boing.mp3";

const elements = {
  heroEyebrow: document.getElementById("heroEyebrow"),
  heroName: document.getElementById("heroName"),
  heroTagline: document.getElementById("heroTagline"),
  heroPinupImage: document.getElementById("heroPinupImage"),
  featuredArtImage: document.getElementById("featuredArtImage"),
  featuredArtTitle: document.getElementById("featuredArtTitle"),
  featuredArtMeta: document.getElementById("featuredArtMeta"),
  brandName: document.getElementById("brandName"),
  latestComicTitle: document.getElementById("latestComicTitle"),
  latestComicMeta: document.getElementById("latestComicMeta"),
  latestComicFrameTitle: document.getElementById("latestComicFrameTitle"),
  latestComicCover: document.getElementById("latestComicCover"),
  openLatestChapterBtn: document.getElementById("openLatestChapterBtn"),
  footerText: document.getElementById("footerText"),
  aboutPortrait: document.getElementById("aboutPortrait"),
  aboutName: document.getElementById("aboutName"),
  aboutBio: document.getElementById("aboutBio"),
  aboutHighlights: document.getElementById("aboutHighlights"),
  galleryGrid: document.getElementById("galleryGrid"),
  filterCategory: document.getElementById("filterCategory"),
  filterYear: document.getElementById("filterYear"),
  filterMedium: document.getElementById("filterMedium"),
  comicSeriesList: document.getElementById("comicSeriesList"),
  charactersGrid: document.getElementById("charactersGrid"),
  themeToggle: document.getElementById("themeToggle"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  mobileNav: document.getElementById("mobileNav"),
  lightbox: document.getElementById("lightbox"),
  lightboxImage: document.getElementById("lightboxImage"),
  lightboxCaption: document.getElementById("lightboxCaption"),
  lightboxPrev: document.getElementById("lightboxPrev"),
  lightboxNext: document.getElementById("lightboxNext"),
  readerModal: document.getElementById("readerModal"),
  readerSeriesName: document.getElementById("readerSeriesName"),
  readerChapterTitle: document.getElementById("readerChapterTitle"),
  readerModeVertical: document.getElementById("readerModeVertical"),
  readerModeSlide: document.getElementById("readerModeSlide"),
  readerProgressBar: document.getElementById("readerProgressBar"),
  readerProgressText: document.getElementById("readerProgressText"),
  readerVertical: document.getElementById("readerVertical"),
  readerSlide: document.getElementById("readerSlide"),
  readerSlideImage: document.getElementById("readerSlideImage"),
  readerPrev: document.getElementById("readerPrev"),
  readerNext: document.getElementById("readerNext"),
  copperheadFlashlight: document.getElementById("copperheadFlashlight")
};

init();

async function init() {
  installTheme();
  installNavHandlers();

  const data = await loadData();
  if (!data) {
    return;
  }

  state.data = data;
  state.filteredArtworks = [...data.artworks];

  renderSiteMeta();
  installLydiaSpankSound();
  renderAbout();
  if (elements.galleryGrid && elements.filterCategory && elements.filterYear && elements.filterMedium) {
    setupFilters();
    renderGallery();
  }
  if (elements.comicSeriesList) {
    renderComics();
  }
  if (elements.charactersGrid) {
    renderCharacters();
  }
  bindLightbox();
  if (elements.readerModeVertical && elements.readerModeSlide && elements.readerVertical) {
    bindReader();
  }
  bindGlobalKeys();
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

function renderSiteMeta() {
  const { site, artworks, comics } = state.data;

  document.title = `${site.title} | BuniMunki`;
  if (elements.brandName) {
    elements.brandName.textContent = site.title;
  }
  if (elements.heroEyebrow) {
    elements.heroEyebrow.textContent = site.heroEyebrow || "Artist Portfolio";
  }
  if (elements.heroName) {
    elements.heroName.textContent = site.title;
  }
  if (elements.heroTagline) {
    elements.heroTagline.textContent = site.tagline;
  }

  const lydia = state.data.characters?.find((entry) => toSlug(entry.name) === "lydia");
  if (elements.heroPinupImage) {
    elements.heroPinupImage.src = LYDIA_HERO_IMAGE_PATH;
    elements.heroPinupImage.alt = lydia ? `${lydia.name} front page artwork` : "Lydia front page artwork";
    addFallback(elements.heroPinupImage, lydia?.name || "Lydia");
  }
  elements.footerText.textContent = site.footer;

  const featured = artworks.find((item) => item.id === site.featuredArtId) || artworks[0];
  if (featured && elements.featuredArtImage && elements.featuredArtTitle && elements.featuredArtMeta) {
    elements.featuredArtImage.src = featured.image;
    elements.featuredArtImage.alt = `${featured.title} artwork`;
    addFallback(elements.featuredArtImage, featured.title);
    elements.featuredArtTitle.textContent = featured.title;
    elements.featuredArtMeta.textContent = `${featured.category} | ${featured.medium} | ${featured.year}`;
  }

  const latest = getLatestChapter(site.latestComic?.seriesSlug, site.latestComic?.chapterSlug);
  if (latest) {
    elements.latestComicTitle.textContent = latest.chapter.title;
    elements.latestComicMeta.textContent = `${latest.series.title} | ${latest.chapter.year}`;
    if (elements.latestComicFrameTitle) {
      elements.latestComicFrameTitle.textContent = String(latest.chapter.title || "").toUpperCase();
    }
    if (elements.latestComicCover) {
      elements.latestComicCover.src = latest.chapter.cover;
      elements.latestComicCover.alt = `${latest.chapter.title} cover preview`;
      addFallback(elements.latestComicCover, latest.chapter.title);
    }
    if (elements.openLatestChapterBtn) {
      elements.openLatestChapterBtn.onclick = () => {
        window.location.href = `webcomic.html?series=${encodeURIComponent(latest.series.slug)}&chapter=${encodeURIComponent(latest.chapter.slug)}`;
      };
    }
  }

  const desc = document.querySelector('meta[name="description"]');
  if (desc) {
    desc.setAttribute("content", `${site.title}: ${site.tagline}`);
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute("content", `${site.title} | BuniMunki`);
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    ogDesc.setAttribute("content", `${site.title}: ${site.tagline}`);
  }

  const author = document.querySelector('meta[name="author"]');
  if (author) {
    author.setAttribute("content", "BuniMunki");
  }
}

function renderAbout() {
  const { about } = state.data;
  elements.aboutPortrait.src = about.portrait;
  elements.aboutPortrait.alt = `${about.name} portrait`;
  addFallback(elements.aboutPortrait, about.name);

  elements.aboutName.textContent = about.name;
  elements.aboutBio.textContent = about.bio;

  elements.aboutHighlights.innerHTML = "";
  about.highlights.forEach((item) => {
    const li = document.createElement("li");
    li.className = "rounded-lg border border-white/10 px-3 py-2 text-sm";
    li.textContent = item;
    elements.aboutHighlights.appendChild(li);
  });
}

function setupFilters() {
  const allArt = state.data.artworks;

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

  state.filteredArtworks = state.data.artworks.filter((art) => {
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

function renderCharacters() {
  if (!elements.charactersGrid) {
    return;
  }

  const characters = state.data.characters || [];
  elements.charactersGrid.innerHTML = "";

  characters.forEach((character) => {
    const slug = toSlug(character.name);
    const images = [character.image, ...(character.gallery || [])].filter(Boolean);
    const targetHref = `characters.html?character=${encodeURIComponent(slug)}`;

    const card = document.createElement("article");
    card.className = "character-card";

    const thumbMarkup = images
      .map(
        (image, index) => `
          <a class="character-thumb" href="${targetHref}" aria-label="Open ${escapeHtml(character.name)} profile page">
            <img src="${image}" alt="${escapeHtml(character.name)} gallery image ${index + 1}" loading="lazy">
          </a>
        `
      )
      .join("");

    card.innerHTML = `
      <a class="character-hero" href="${targetHref}" aria-label="Open ${escapeHtml(character.name)} profile page">
        <img src="${character.image}" alt="${escapeHtml(character.name)} portrait" loading="lazy">
      </a>
      <div class="mt-4">
        <p class="meta-label">${escapeHtml(character.role || "Character")}</p>
        <h3 class="font-display text-xl"><a class="character-name-link" href="${targetHref}">${escapeHtml(character.name)}</a></h3>
        <p class="mt-2 text-sm leading-6 opacity-90">${escapeHtml(character.bio)}</p>
      </div>
      <div class="character-thumb-row mt-4">${thumbMarkup}</div>
      <a class="btn-secondary mt-4 inline-block" href="${targetHref}">Open Character Page</a>
    `;

    card.querySelectorAll("img").forEach((imageNode) => {
      addFallback(imageNode, character.name);
    });

    elements.charactersGrid.appendChild(card);
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

function renderComics() {
  if (!elements.comicSeriesList) {
    return;
  }

  elements.comicSeriesList.innerHTML = "";

  state.data.comics.forEach((series) => {
    const card = document.createElement("article");
    card.className = "series-card";
    const thumbnailHtml = series.thumbnail
      ? `<img src="${series.thumbnail}" alt="${escapeHtml(series.title)} cover" loading="lazy" class="h-24 w-20 rounded-lg border border-white/10 object-cover">`
      : "";

    const chapterHtml = series.chapters
      .map(
        (chapter) => `
          <li class="chapter-item">
            <div>
              <p class="font-medium">${escapeHtml(chapter.title)}</p>
              <p class="text-xs opacity-75">${chapter.year}</p>
            </div>
            <button class="btn-secondary js-read-chapter" data-series="${series.slug}" data-chapter="${chapter.slug}" type="button">Read</button>
          </li>
        `
      )
      .join("");

    card.innerHTML = `
      <div class="mb-3 flex items-start gap-3">
        ${thumbnailHtml}
        <div>
          <h3 class="font-display text-lg">${escapeHtml(series.title)}</h3>
          <p class="mt-1 text-sm opacity-85">${escapeHtml(series.description)}</p>
        </div>
      </div>
      <ul>${chapterHtml}</ul>
    `;

    const thumbnail = card.querySelector("img");
    if (thumbnail) {
      addFallback(thumbnail, series.title);
    }

    card.querySelectorAll(".js-read-chapter").forEach((btn) => {
      btn.addEventListener("click", () => openReader(btn.dataset.series, btn.dataset.chapter));
    });

    elements.comicSeriesList.appendChild(card);
  });
}

function bindReader() {
  if (!elements.readerModeVertical || !elements.readerModeSlide || !elements.readerVertical) {
    return;
  }

  elements.readerModeVertical.addEventListener("click", () => setReaderMode("vertical"));
  elements.readerModeSlide.addEventListener("click", () => setReaderMode("slide"));
  elements.readerPrev.addEventListener("click", () => navigateReader(-1));
  elements.readerNext.addEventListener("click", () => navigateReader(1));

  elements.readerVertical.addEventListener("scroll", handleVerticalScroll);

  document.querySelectorAll('[data-close="reader"]').forEach((node) => {
    node.addEventListener("click", closeReader);
  });
}

function openReader(seriesSlug, chapterSlug) {
  const chapterRef = getChapter(seriesSlug, chapterSlug);
  if (!chapterRef) {
    return;
  }

  const { series, chapter } = chapterRef;

  state.reader.seriesSlug = series.slug;
  state.reader.chapterSlug = chapter.slug;
  state.reader.seriesTitle = series.title;
  state.reader.chapterTitle = chapter.title;
  state.reader.pages = chapter.pages.map((page) => resolveComicPage(series.slug, chapter.slug, page));

  const saved = loadReaderPosition(series.slug, chapter.slug);
  state.reader.currentPage = clamp(saved?.page ?? 0, 0, state.reader.pages.length - 1);
  state.reader.mode = saved?.mode || "vertical";

  elements.readerSeriesName.textContent = series.title;
  elements.readerChapterTitle.textContent = chapter.title;

  renderReaderVertical();
  renderReaderSlide();
  setReaderMode(state.reader.mode, false);
  restoreVerticalPosition(saved?.scrollTop);
  updateReaderProgress();

  elements.readerModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReader() {
  elements.readerModal.classList.add("hidden");
  document.body.style.overflow = "";
  saveReaderPosition();
}

function renderReaderVertical() {
  elements.readerVertical.innerHTML = "";

  state.reader.pages.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${state.reader.chapterTitle} page ${index + 1}`;
    img.loading = "lazy";
    img.dataset.index = String(index);
    addFallback(img, `Page ${index + 1}`);
    elements.readerVertical.appendChild(img);
  });
}

function renderReaderSlide() {
  const src = state.reader.pages[state.reader.currentPage];
  elements.readerSlideImage.src = src || "";
  elements.readerSlideImage.alt = `${state.reader.chapterTitle} page ${state.reader.currentPage + 1}`;
  addFallback(elements.readerSlideImage, `Page ${state.reader.currentPage + 1}`);
}

function setReaderMode(mode, persist = true) {
  state.reader.mode = mode;

  const isVertical = mode === "vertical";
  elements.readerModeVertical.classList.toggle("active", isVertical);
  elements.readerModeSlide.classList.toggle("active", !isVertical);

  elements.readerVertical.classList.toggle("hidden", !isVertical);
  elements.readerSlide.classList.toggle("hidden", isVertical);

  if (!isVertical) {
    renderReaderSlide();
  }

  updateReaderProgress();

  if (persist) {
    saveReaderPosition();
  }
}

function navigateReader(direction) {
  state.reader.currentPage = clamp(
    state.reader.currentPage + direction,
    0,
    state.reader.pages.length - 1
  );

  if (state.reader.mode === "slide") {
    renderReaderSlide();
  } else {
    scrollToVerticalPage(state.reader.currentPage);
  }

  updateReaderProgress();
  saveReaderPosition();
}

function handleVerticalScroll() {
  if (state.reader.mode !== "vertical") {
    return;
  }

  const images = Array.from(elements.readerVertical.querySelectorAll("img"));
  if (!images.length) {
    return;
  }

  const containerTop = elements.readerVertical.getBoundingClientRect().top;
  let bestIndex = 0;
  let bestDistance = Infinity;

  images.forEach((img, index) => {
    const distance = Math.abs(img.getBoundingClientRect().top - containerTop - 80);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  state.reader.currentPage = bestIndex;
  updateReaderProgress();
  saveReaderPosition();
}

function scrollToVerticalPage(pageIndex) {
  const target = elements.readerVertical.querySelector(`img[data-index="${pageIndex}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function restoreVerticalPosition(savedScrollTop) {
  requestAnimationFrame(() => {
    if (typeof savedScrollTop === "number") {
      elements.readerVertical.scrollTop = savedScrollTop;
    } else {
      scrollToVerticalPage(state.reader.currentPage);
    }
  });
}

function updateReaderProgress() {
  const total = state.reader.pages.length || 1;
  const current = state.reader.currentPage + 1;
  const percent = (current / total) * 100;

  elements.readerProgressBar.style.width = `${percent}%`;
  elements.readerProgressText.textContent = `Page ${current} of ${total} (${Math.round(percent)}%)`;
}

function saveReaderPosition() {
  if (!state.reader.seriesSlug || !state.reader.chapterSlug) {
    return;
  }

  const key = readerKey(state.reader.seriesSlug, state.reader.chapterSlug);
  const payload = {
    page: state.reader.currentPage,
    mode: state.reader.mode,
    scrollTop: elements.readerVertical.scrollTop,
    updatedAt: Date.now()
  };

  localStorage.setItem(key, JSON.stringify(payload));
}

function loadReaderPosition(seriesSlug, chapterSlug) {
  try {
    const raw = localStorage.getItem(readerKey(seriesSlug, chapterSlug));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readerKey(seriesSlug, chapterSlug) {
  return `comic-reader:${seriesSlug}:${chapterSlug}`;
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
      return;
    }

    if (elements.readerModal && !elements.readerModal.classList.contains("hidden")) {
      if (event.key === "Escape") {
        closeReader();
      }
      if (event.key === "ArrowLeft") {
        navigateReader(-1);
      }
      if (event.key === "ArrowRight") {
        navigateReader(1);
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

  document.querySelectorAll("a[href^='#']").forEach((anchor) => {
    anchor.addEventListener("click", () => {
      elements.mobileNav.classList.add("hidden");
    });
  });
}

function installLydiaSpankSound() {
  if (!elements.heroPinupImage) {
    return;
  }

  const imageNode = elements.heroPinupImage;
  imageNode.classList.add("lydia-spank-target");

  imageNode.addEventListener("click", (event) => {
    const click = getRelativeLydiaClick(event, imageNode);
    if (!click) {
      return;
    }

    if (isBoobClick(click)) {
      playLydiaHitboxGif(imageNode, LYDIA_BOOB_GIF_PATH);
      playSound(lydiaBoingSoundPath, 0.8);
      return;
    }

    if (!isAssClick(click)) {
      return;
    }

    playLydiaHitboxGif(imageNode, LYDIA_BUTT_GIF_PATH);

    const randomIndex = Math.floor(Math.random() * lydiaSpankSoundPaths.length);
    playSound(lydiaSpankSoundPaths[randomIndex], 0.8);
  });
}


async function playLydiaHitboxGif(imageNode, gifPath) {
  window.clearTimeout(state.heroBoobGifTimer);
  state.heroBoobGifTimer = null;

  state.heroBoobGifToken += 1;
  const playbackToken = state.heroBoobGifToken;
  imageNode.src = `${gifPath}?play=${Date.now()}`;

  const playbackMeta = await getLydiaHitboxGifPlaybackMeta(gifPath);
  if (playbackToken !== state.heroBoobGifToken) {
    return;
  }

  const restoreDelay = Math.max(0, playbackMeta.totalDelayMs || LYDIA_HITBOX_GIF_FALLBACK_MS);
  state.heroBoobGifTimer = window.setTimeout(() => {
    if (playbackToken !== state.heroBoobGifToken) {
      return;
    }

    imageNode.src = LYDIA_HERO_IMAGE_PATH;
  }, restoreDelay);
}

async function getLydiaHitboxGifPlaybackMeta(path) {
  const normalizedPath = path.split("?")[0];
  if (state.heroBoobGifDurationCache[normalizedPath]) {
    return state.heroBoobGifDurationCache[normalizedPath];
  }

  try {
    const response = await fetch(normalizedPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load GIF: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const playbackMeta = parseGifDurationMs(buffer);
    if (playbackMeta.totalDelayMs <= 0) {
      playbackMeta.totalDelayMs = LYDIA_HITBOX_GIF_FALLBACK_MS;
      playbackMeta.lastFrameDelayMs = LYDIA_HITBOX_GIF_FALLBACK_MS;
    }

    state.heroBoobGifDurationCache[normalizedPath] = playbackMeta;
    return playbackMeta;
  } catch (error) {
    console.warn("Could not read Lydia hitbox GIF duration, using fallback.", error);
    const fallbackMeta = {
      totalDelayMs: LYDIA_HITBOX_GIF_FALLBACK_MS,
      lastFrameDelayMs: LYDIA_HITBOX_GIF_FALLBACK_MS
    };
    state.heroBoobGifDurationCache[normalizedPath] = fallbackMeta;
    return fallbackMeta;
  }
}

function getRelativeLydiaClick(event, imageNode) {
  const rect = imageNode.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  return { x, y };
}

function isAssClick(click) {
  return click.x >= 0.43 && click.x <= 0.62 && click.y >= 0.46 && click.y <= 0.68;
}

function isBoobClick(click) {
  return click.x >= 0.6 && click.x <= 0.8 && click.y >= 0.27 && click.y <= 0.5;
}

function playSound(soundPath, volume = 1) {
  const audio = new Audio(soundPath);
  audio.volume = volume;
  audio.play().catch(() => {
    // Ignore blocked autoplay and transient decode/network errors.
  });
}

function parseGifDurationMs(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13 || bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) {
    return { totalDelayMs: 0, lastFrameDelayMs: 0 };
  }

  let offset = 13;
  const hasGlobalColorTable = (bytes[10] & 0x80) !== 0;
  if (hasGlobalColorTable) {
    const globalColorTableSize = 3 * (2 ** ((bytes[10] & 0x07) + 1));
    offset += globalColorTableSize;
  }

  let totalDelayMs = 0;
  let lastFrameDelayMs = 0;

  while (offset < bytes.length) {
    const blockId = bytes[offset];

    if (blockId === 0x3b) {
      break;
    }

    if (blockId === 0x21) {
      const extensionLabel = bytes[offset + 1];

      if (extensionLabel === 0xf9 && bytes[offset + 2] === 0x04) {
        const delayCs = bytes[offset + 4] | (bytes[offset + 5] << 8);
        const delayMs = delayCs * 10;
        totalDelayMs += delayMs;
        lastFrameDelayMs = delayMs;
        offset += 8;
        continue;
      }

      offset += 2;
      while (offset < bytes.length) {
        const blockSize = bytes[offset];
        offset += 1;
        if (blockSize === 0) {
          break;
        }
        offset += blockSize;
      }
      continue;
    }

    if (blockId === 0x2c) {
      if (offset + 9 >= bytes.length) {
        break;
      }

      const packedField = bytes[offset + 9];
      offset += 10;

      if ((packedField & 0x80) !== 0) {
        const localColorTableSize = 3 * (2 ** ((packedField & 0x07) + 1));
        offset += localColorTableSize;
      }

      offset += 1;
      while (offset < bytes.length) {
        const blockSize = bytes[offset];
        offset += 1;
        if (blockSize === 0) {
          break;
        }
        offset += blockSize;
      }
      continue;
    }

    offset += 1;
  }

  return { totalDelayMs, lastFrameDelayMs };
}

function getLatestChapter(seriesSlug, chapterSlug) {
  const preferred = getChapter(seriesSlug, chapterSlug);
  if (preferred) {
    return preferred;
  }

  const series = state.data.comics[0];
  const chapter = series?.chapters?.at(-1);
  if (!series || !chapter) {
    return null;
  }

  return { series, chapter };
}

function getChapter(seriesSlug, chapterSlug) {
  const series = state.data.comics.find((entry) => entry.slug === seriesSlug);
  if (!series) {
    return null;
  }

  const chapter = series.chapters.find((entry) => entry.slug === chapterSlug);
  if (!chapter) {
    return null;
  }

  return { series, chapter };
}

function resolveComicPage(seriesSlug, chapterSlug, page) {
  if (page.includes("/")) {
    return page;
  }

  return `assets/comics/${seriesSlug}/${chapterSlug}/${page}`;
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
          <stop offset='0%' stop-color='#20263d'/>
          <stop offset='100%' stop-color='#35324e'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='50%' y='50%' fill='#dfe6ff' font-family='Manrope, sans-serif' font-size='34' dominant-baseline='middle' text-anchor='middle'>${safeLabel}</text>
      <text x='50%' y='56%' fill='#8e9ecc' font-family='Manrope, sans-serif' font-size='20' dominant-baseline='middle' text-anchor='middle'>Add image file to assets folder</text>
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
