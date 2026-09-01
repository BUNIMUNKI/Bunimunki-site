const state = {
  data: null,
  characters: [],
  activeIndex: 0,
  galleryIndex: 0,
  characterImageCache: {},
  imageStatusCache: {},
  gifDurationCache: {},
  soundEnabled: true,
  audioCtx: null,
  warpSound: null,
  lightboxItems: [],
  lightboxIndex: 0,
  ggPlaybackTimer: null
};

const GG_GIF_PATH = "assets/gg/warpzonegg.gif";
const GG_HOLD_PATH = "assets/gg/warpzonegg-last.png";
const LYDIA_GIF_PATH = "assets/lydia/lydiawarp.gif";
const FEK_GIF_PATH = "assets/Fek/warpfek.gif";
const SEDNA_GIF_PATH = "assets/sedna/sednawarp.gif";
const GG_PLAY_LOOPS = 1;
const DEFAULT_GIF_PLAY_ONCE_MS = 1200;
const GG_SWAP_EARLY_MS = 45;
const GG_USE_HOLD_STILL = false;
const WARP_SOUND_PATH = "assets/webcomic-site-futuristic-portfoliotheme-reference/warpsound.mp3";

const elements = {
  brandName: document.getElementById("brandName"),
  themeToggle: document.getElementById("themeToggle"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  mobileNav: document.getElementById("mobileNav"),
  soundToggle: document.getElementById("soundToggle"),
  warpPod: document.getElementById("warpPod"),
  warpMainImageBtn: document.getElementById("warpMainImageBtn"),
  warpMainImage: document.getElementById("warpMainImage"),
  warpRole: document.getElementById("warpRole"),
  warpName: document.getElementById("warpName"),
  warpBio: document.getElementById("warpBio"),
  warpGalleryPrev: document.getElementById("warpGalleryPrev"),
  warpGallery: document.getElementById("warpGallery"),
  warpGalleryNext: document.getElementById("warpGalleryNext"),
  profileChooser: document.getElementById("profileChooser"),
  lightbox: document.getElementById("lightbox"),
  lightboxImage: document.getElementById("lightboxImage"),
  lightboxCaption: document.getElementById("lightboxCaption"),
  lightboxPrev: document.getElementById("lightboxPrev"),
  lightboxNext: document.getElementById("lightboxNext")
};

init();

async function init() {
  installTheme();
  installSoundToggle();
  installGalleryControls();
  installNavHandlers();
  bindLightbox();
  bindGlobalKeys();

  state.warpSound = new Audio(WARP_SOUND_PATH);
  state.warpSound.preload = "auto";
  state.warpSound.volume = 0.55;
  state.warpSound.load();

  void ensureImageReady(GG_HOLD_PATH);

  const data = await loadData();
  if (!data) {
    return;
  }

  state.data = data;
  state.characters = data.characters || [];
  renderPageMeta();
  setInitialCharacterFromQuery();
  renderProfileChooser();
  await paintActiveCharacter(false);
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
  document.title = `${siteTitle} | Characters`;

  if (elements.brandName) {
    elements.brandName.textContent = siteTitle;
  }
}

function setInitialCharacterFromQuery() {
  if (!state.characters.length) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const selected = params.get("character");
  if (!selected) {
    return;
  }

  const index = state.characters.findIndex((entry) => toSlug(entry.name) === selected);
  if (index < 0) {
    return;
  }

  state.activeIndex = index;
}

function renderProfileChooser() {
  elements.profileChooser.innerHTML = "";

  state.characters.forEach((character, index) => {
    const profileImage = character.profileImage || character.image;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-chip";
    button.dataset.index = String(index);
    button.innerHTML = `
      <img src="${profileImage}" alt="${escapeHtml(character.name)} mini profile" loading="lazy">
      <span>${escapeHtml(character.name)}</span>
    `;

    button.addEventListener("click", () => {
      if (index === state.activeIndex) {
        return;
      }

      playWarpSound();
      state.activeIndex = index;
      void paintActiveCharacter(true);
    });

    const chipImage = button.querySelector("img");
    addFallback(chipImage, character.name);
    elements.profileChooser.appendChild(button);
  });
}

async function paintActiveCharacter(withAnimation) {
  const character = state.characters[state.activeIndex];
  if (!character) {
    return;
  }

  window.clearTimeout(state.ggPlaybackTimer);
  state.ggPlaybackTimer = null;

  const usesGgGif = character.image === GG_GIF_PATH;
  const usesLydiaGif = character.image === LYDIA_GIF_PATH;
  const usesFekGif = character.image === FEK_GIF_PATH;
  const usesSednaGif = character.image === SEDNA_GIF_PATH;
  elements.warpPod.classList.remove("warp-art--multiply");
  elements.warpPod.classList.toggle("gg-active", usesGgGif);
  elements.warpPod.classList.toggle("lydia-active", usesLydiaGif);
  elements.warpPod.classList.toggle("fek-active", usesFekGif);
  elements.warpPod.classList.toggle("sedna-active", usesSednaGif);

  const galleryImages = await getCharacterImages(character);
  const lightboxItems = [character.image, ...galleryImages].map((image, index) => ({
    image,
    title: `${character.name} image ${index + 1}`,
    caption: `${character.name}${character.role ? ` | ${character.role}` : ""}`
  }));

  const displayImage = usesGgGif ? `${GG_GIF_PATH}?play=${Date.now()}` : character.image;
  elements.warpMainImage.onload = null;
  elements.warpMainImage.src = displayImage;
  elements.warpMainImage.alt = `${character.name} splash image`;
  addFallback(elements.warpMainImage, character.name);

  if (usesGgGif && GG_USE_HOLD_STILL) {
    await ensureImageReady(GG_HOLD_PATH);
    const gifPlaybackMeta = await getGifPlaybackMeta(GG_GIF_PATH);
    const startSwapTimer = () => {
      window.clearTimeout(state.ggPlaybackTimer);
      const holdDelay = Math.max(0, getGifHoldDelayMs(gifPlaybackMeta) - GG_SWAP_EARLY_MS);
      state.ggPlaybackTimer = window.setTimeout(() => {
        if (state.characters[state.activeIndex]?.name !== character.name) {
          return;
        }

        elements.warpMainImage.onload = null;
        elements.warpMainImage.src = GG_HOLD_PATH;
      }, holdDelay);
    };

    elements.warpMainImage.onload = startSwapTimer;

    if (elements.warpMainImage.complete) {
      startSwapTimer();
    }
  }

  elements.warpRole.textContent = character.role || "Character";
  elements.warpName.textContent = character.name;
  elements.warpBio.textContent = character.bio || "";

  elements.warpMainImageBtn.onclick = () => openLightbox(0, lightboxItems);
  paintWarpGallery(galleryImages, lightboxItems, character);
  paintProfileChooserActiveState();

  if (withAnimation) {
    playWarpAnimation();
  }

  const slug = toSlug(character.name);
  const params = new URLSearchParams(window.location.search);
  params.set("character", slug);
  history.replaceState(null, "", `characters.html?${params.toString()}`);
}

async function getCharacterImages(character) {
  const cacheKey = toSlug(character.name);
  if (state.characterImageCache[cacheKey]) {
    return state.characterImageCache[cacheKey];
  }

  const manualGallery = Array.isArray(character.gallery) ? character.gallery.filter(Boolean) : [];
  const artworkGallery = getArtworkImagesForCharacter(character);
  let images = [...manualGallery, ...artworkGallery].filter(Boolean);

  const shouldAutoDiscover = (manualGallery.length === 0 && artworkGallery.length === 0) || character.autoDiscoverGallery === true;
  if (shouldAutoDiscover) {
    const discovered = await discoverGalleryImages(character.image);
    images = [...manualGallery, ...artworkGallery, ...discovered].filter(Boolean);
  }

  const excludedImages = new Set([character.image, character.profileImage].filter(Boolean));
  const unique = Array.from(new Set(images)).filter((image) => !excludedImages.has(image));
  const loadable = await filterLoadableImages(unique);
  state.characterImageCache[cacheKey] = loadable;
  return loadable;
}

function getArtworkImagesForCharacter(character) {
  const artworks = state.data?.artworks || [];
  return artworks
    .filter((artwork) => artwork.category === character.name)
    .map((artwork) => artwork.image)
    .filter(Boolean);
}

async function filterLoadableImages(images) {
  const checks = await Promise.all(images.map((image) => isLoadableImage(image)));
  return images.filter((image, index) => {
    if (checks[index]) {
      return true;
    }

    console.warn(`Skipping missing gallery image: ${image}`);
    return false;
  });
}

function isLoadableImage(path) {
  const normalizedPath = path.split("?")[0];
  if (normalizedPath in state.imageStatusCache) {
    return Promise.resolve(state.imageStatusCache[normalizedPath]);
  }

  return new Promise((resolve) => {
    const probe = new Image();

    probe.onload = () => {
      state.imageStatusCache[normalizedPath] = true;
      resolve(true);
    };

    probe.onerror = () => {
      state.imageStatusCache[normalizedPath] = false;
      resolve(false);
    };

    probe.src = `${normalizedPath}${normalizedPath.includes("?") ? "&" : "?"}galleryProbe=${Date.now()}`;
  });
}

function ensureImageReady(path) {
  return new Promise((resolve) => {
    const probe = new Image();

    probe.onload = async () => {
      try {
        if (typeof probe.decode === "function") {
          await probe.decode();
        }
      } catch {
        // If decode fails, we still consider the image loadable after onload.
      }
      resolve();
    };

    probe.onerror = () => resolve();
    probe.src = path;
  });
}

async function getGifPlaybackMeta(path) {
  const normalizedPath = path.split("?")[0];
  if (state.gifDurationCache[normalizedPath]) {
    return state.gifDurationCache[normalizedPath];
  }

  try {
    const response = await fetch(normalizedPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load GIF: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const playbackMeta = parseGifDurationMs(buffer);
    if (playbackMeta.totalDelayMs <= 0) {
      playbackMeta.totalDelayMs = DEFAULT_GIF_PLAY_ONCE_MS;
      playbackMeta.lastFrameDelayMs = DEFAULT_GIF_PLAY_ONCE_MS;
    }

    state.gifDurationCache[normalizedPath] = playbackMeta;
    return playbackMeta;
  } catch (error) {
    console.warn("Could not read GIF duration, using fallback.", error);
    const fallbackMeta = {
      totalDelayMs: DEFAULT_GIF_PLAY_ONCE_MS,
      lastFrameDelayMs: DEFAULT_GIF_PLAY_ONCE_MS
    };
    state.gifDurationCache[normalizedPath] = fallbackMeta;
    return fallbackMeta;
  }
}

function getGifHoldDelayMs(playbackMeta) {
  const totalDelayMs = playbackMeta.totalDelayMs || DEFAULT_GIF_PLAY_ONCE_MS;
  const lastFrameDelayMs = playbackMeta.lastFrameDelayMs || totalDelayMs;
  return Math.max(0, (totalDelayMs * GG_PLAY_LOOPS) - lastFrameDelayMs);
}

function parseGifDurationMs(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13 || bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) {
    return 0;
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

    break;
  }

  return {
    totalDelayMs,
    lastFrameDelayMs
  };
}

async function discoverGalleryImages(mainImagePath) {
  const directory = mainImagePath.split("/").slice(0, -1).join("/");
  if (!directory) {
    return [];
  }

  const discovered = [];
  let misses = 0;

  // Stops after a few misses so we avoid probing too many file names.
  for (let index = 1; index <= 60 && misses < 4; index += 1) {
    const twoDigits = String(index).padStart(2, "0");
    const threeDigits = String(index).padStart(3, "0");
    const candidateBases = [`gallery-${twoDigits}`, `gallery-${threeDigits}`];
    const exts = ["jpg", "jpeg", "png", "webp", "avif"];

    let found = null;
    for (const base of candidateBases) {
      for (const ext of exts) {
        const candidate = `${directory}/${base}.${ext}`;
        // eslint-disable-next-line no-await-in-loop
        if (await imageExists(candidate)) {
          found = candidate;
          break;
        }
      }
      if (found) {
        break;
      }
    }

    if (found) {
      discovered.push(found);
      misses = 0;
    } else {
      misses += 1;
    }
  }

  return discovered;
}

function imageExists(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = path;
  });
}

function paintWarpGallery(images, lightboxItems, character) {
  elements.warpGallery.innerHTML = "";

  images.forEach((image, index) => {
    const button = document.createElement("button");
    button.className = "character-thumb";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${character.name} gallery image ${index + 1}`);

    button.innerHTML = `<img src="${image}" alt="${escapeHtml(character.name)} gallery image ${index + 1}" loading="lazy">`;
  button.addEventListener("click", () => openLightbox(index + 1, lightboxItems));

    const imageNode = button.querySelector("img");
    addFallback(imageNode, character.name);
    elements.warpGallery.appendChild(button);
  });

  state.galleryIndex = 0;
  elements.warpGallery.scrollTo({ left: 0, behavior: "auto" });
  updateGalleryArrowState();
}

function installGalleryControls() {
  const scrollGalleryByStep = (direction) => {
    const thumbs = Array.from(elements.warpGallery.querySelectorAll(".character-thumb"));
    if (!thumbs.length) {
      return;
    }

    const targetIndex = Math.max(0, Math.min(thumbs.length - 1, state.galleryIndex + direction));
    scrollGalleryToIndex(targetIndex, thumbs);
  };

  elements.warpGalleryPrev.addEventListener("click", () => scrollGalleryByStep(-1));
  elements.warpGalleryNext.addEventListener("click", () => scrollGalleryByStep(1));
  elements.warpGallery.addEventListener("scroll", () => {
    syncGalleryIndexFromScroll();
    updateGalleryArrowState();
  }, { passive: true });
  window.addEventListener("resize", updateGalleryArrowState);
}

function scrollGalleryToIndex(targetIndex, thumbs = null) {
  const galleryThumbs = thumbs || Array.from(elements.warpGallery.querySelectorAll(".character-thumb"));
  if (!galleryThumbs.length) {
    state.galleryIndex = 0;
    return;
  }

  const galleryStyle = window.getComputedStyle(elements.warpGallery);
  const paddingLeft = Number.parseFloat(galleryStyle.paddingLeft) || 0;
  const clampedIndex = Math.max(0, Math.min(galleryThumbs.length - 1, targetIndex));
  const targetLeft = galleryThumbs[clampedIndex].offsetLeft - paddingLeft;

  state.galleryIndex = clampedIndex;
  elements.warpGallery.scrollTo({
    left: targetLeft,
    behavior: "auto"
  });
}

function syncGalleryIndexFromScroll() {
  const thumbs = Array.from(elements.warpGallery.querySelectorAll(".character-thumb"));
  if (!thumbs.length) {
    state.galleryIndex = 0;
    return;
  }

  const galleryStyle = window.getComputedStyle(elements.warpGallery);
  const paddingLeft = Number.parseFloat(galleryStyle.paddingLeft) || 0;
  const currentScrollLeft = elements.warpGallery.scrollLeft;

  state.galleryIndex = thumbs.reduce((closestIndex, thumb, index) => {
    const closestThumb = thumbs[closestIndex];
    const closestDistance = Math.abs((closestThumb.offsetLeft - paddingLeft) - currentScrollLeft);
    const thumbDistance = Math.abs((thumb.offsetLeft - paddingLeft) - currentScrollLeft);
    return thumbDistance < closestDistance ? index : closestIndex;
  }, 0);
}

function updateGalleryArrowState() {
  const { scrollLeft, clientWidth, scrollWidth } = elements.warpGallery;
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
  const canScrollLeft = scrollLeft > 4;
  const canScrollRight = scrollLeft < (maxScrollLeft - 4);

  elements.warpGalleryPrev.disabled = !canScrollLeft;
  elements.warpGalleryNext.disabled = !canScrollRight;
}

function paintProfileChooserActiveState() {
  elements.profileChooser.querySelectorAll(".profile-chip").forEach((chip) => {
    const isActive = Number(chip.dataset.index) === state.activeIndex;
    chip.classList.toggle("active", isActive);
  });
}

function playWarpAnimation() {
  elements.warpPod.classList.remove("warp-pop");
  void elements.warpPod.offsetWidth;
  elements.warpPod.classList.add("warp-pop");

  window.setTimeout(() => {
    elements.warpPod.classList.remove("warp-pop");
  }, 700);
}

function installSoundToggle() {
  const saved = localStorage.getItem("warp-sfx-enabled");
  state.soundEnabled = saved !== "false";
  paintSoundToggleLabel();

  elements.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem("warp-sfx-enabled", String(state.soundEnabled));
    paintSoundToggleLabel();
  });
}

function paintSoundToggleLabel() {
  elements.soundToggle.textContent = `Warp SFX: ${state.soundEnabled ? "On" : "Off"}`;
  elements.soundToggle.classList.toggle("active", state.soundEnabled);
}

function playWarpSound() {
  if (!state.soundEnabled) {
    return;
  }

  if (!state.warpSound) {
    state.warpSound = new Audio(WARP_SOUND_PATH);
    state.warpSound.preload = "auto";
    state.warpSound.volume = 0.55;
  }

  state.warpSound.currentTime = 0;
  state.warpSound.play().catch(() => {});
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

function toSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
