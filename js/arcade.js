const elements = {
  brandName: document.getElementById("brandName"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  mobileNav: document.getElementById("mobileNav"),
  footerText: document.getElementById("footerText")
};

init();

async function init() {
  installTheme();
  installNavHandlers();

  const data = await loadData();
  if (!data) {
    return;
  }

  renderPageMeta(data);
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
    return null;
  }
}

function renderPageMeta(data) {
  const site = data.site || {};
  const siteTitle = site.title || "Apprehension and Collection Bureau";

  document.title = `${siteTitle} | Arcade`;

  if (elements.brandName) {
    elements.brandName.textContent = siteTitle;
  }

  if (elements.footerText) {
    elements.footerText.textContent = site.footer || `${siteTitle} by BuniMunki.`;
  }
}

function installTheme() {
  const root = document.documentElement;
  root.setAttribute("data-theme", "dark");
  localStorage.setItem("site-theme", "dark");
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
