const state = {
  data: null,
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

const elements = {
  brandName: document.getElementById("brandName"),
  themeToggle: document.getElementById("themeToggle"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  mobileNav: document.getElementById("mobileNav"),
  comicSeriesList: document.getElementById("comicSeriesList"),
  readerSeriesName: document.getElementById("readerSeriesName"),
  readerChapterTitle: document.getElementById("readerChapterTitle"),
  readerModeVertical: document.getElementById("readerModeVertical"),
  readerModeSlide: document.getElementById("readerModeSlide"),
  readerFullscreenBtn: document.getElementById("readerFullscreenBtn"),
  readerProgressBar: document.getElementById("readerProgressBar"),
  readerProgressText: document.getElementById("readerProgressText"),
  readerVertical: document.getElementById("readerVertical"),
  readerSlide: document.getElementById("readerSlide"),
  readerSlideImage: document.getElementById("readerSlideImage"),
  readerPrev: document.getElementById("readerPrev"),
  readerNext: document.getElementById("readerNext"),
  readerPanel: document.getElementById("readerPanel")
};

init();

async function init() {
  installTheme();
  installNavHandlers();
  bindReader();
  bindGlobalKeys();

  const data = await loadData();
  if (!data) {
    return;
  }

  state.data = data;
  renderPageMeta();
  renderComics();
  openInitialChapter();
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
  const siteTitle = state.data.site?.title || "Apprehension and Collection Bureau";
  document.title = `${siteTitle} | Webcomic Reader`;
  elements.brandName.textContent = siteTitle;
}

function renderComics() {
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
          <li class="chapter-item" data-series="${series.slug}" data-chapter="${chapter.slug}">
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
      btn.addEventListener("click", () => {
        openReader(btn.dataset.series, btn.dataset.chapter);
      });
    });

    elements.comicSeriesList.appendChild(card);
  });
}

function openInitialChapter() {
  const params = new URLSearchParams(window.location.search);
  const requestedSeries = params.get("series");
  const requestedChapter = params.get("chapter");

  const preferred = getChapter(requestedSeries, requestedChapter);
  if (preferred) {
    openReader(preferred.series.slug, preferred.chapter.slug);
    return;
  }

  const latest = getLatestChapter(state.data.site?.latestComic?.seriesSlug, state.data.site?.latestComic?.chapterSlug);
  if (latest) {
    openReader(latest.series.slug, latest.chapter.slug);
  }
}

function bindReader() {
  elements.readerModeVertical.addEventListener("click", () => setReaderMode("vertical"));
  elements.readerModeSlide.addEventListener("click", () => setReaderMode("slide"));
  elements.readerFullscreenBtn?.addEventListener("click", toggleReaderFullscreen);
  elements.readerPrev.addEventListener("click", () => navigateReader(-1));
  elements.readerNext.addEventListener("click", () => navigateReader(1));

  elements.readerVertical.addEventListener("scroll", handleVerticalScroll);
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
  markActiveChapter(series.slug, chapter.slug);
  elements.readerPanel?.classList.add("is-open");

  renderReaderVertical();
  renderReaderSlide();
  setReaderMode(state.reader.mode, false);
  restoreVerticalPosition(saved?.scrollTop);
  updateReaderProgress();
  paintFullscreenButtonLabel();
  elements.readerPanel?.scrollIntoView({ behavior: "smooth", block: "start" });

  const params = new URLSearchParams(window.location.search);
  params.set("series", series.slug);
  params.set("chapter", chapter.slug);
  history.replaceState(null, "", `webcomic.html?${params.toString()}`);
}

function markActiveChapter(seriesSlug, chapterSlug) {
  document.querySelectorAll(".chapter-item").forEach((item) => {
    const isActive = item.dataset.series === seriesSlug && item.dataset.chapter === chapterSlug;
    item.classList.toggle("active", isActive);
  });
}

async function toggleReaderFullscreen() {
  const panel = elements.readerPanel;
  if (!panel) {
    return;
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {});
  } else if (panel.requestFullscreen) {
    await panel.requestFullscreen().catch(() => {});
  }

  paintFullscreenButtonLabel();
}

function paintFullscreenButtonLabel() {
  if (!elements.readerFullscreenBtn) {
    return;
  }

  elements.readerFullscreenBtn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
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
  elements.readerPanel?.classList.toggle("slide-mode", !isVertical);

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
    if (event.key === "ArrowLeft") {
      navigateReader(-1);
    }
    if (event.key === "ArrowRight") {
      navigateReader(1);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    paintFullscreenButtonLabel();
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
      <text x='50%' y='50%' fill='#dfe6ff' font-family='Baloo 2, sans-serif' font-size='34' dominant-baseline='middle' text-anchor='middle'>${safeLabel}</text>
      <text x='50%' y='56%' fill='#8e9ecc' font-family='Baloo 2, sans-serif' font-size='20' dominant-baseline='middle' text-anchor='middle'>Add image file to assets folder</text>
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
