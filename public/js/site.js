function getCopyButtonLabel(button) {
  return button?.querySelector(":scope > div:not(.icon-embed-small)") ?? null;
}

function getSiteLang() {
  const docLang = document.documentElement.getAttribute("lang") || "en";
  return docLang.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function captureConversion(eventName, properties) {
  try {
    if (typeof window.posthog?.capture !== "function") return;
    window.posthog.capture(eventName, {
      lang: getSiteLang(),
      path: window.location.pathname,
      ...(properties || {}),
    });
  } catch {
    // no-op
  }
}

function setButtonCopiedState(button, isCopied) {
  if (!button) return;

  const label = getCopyButtonLabel(button);
  const email = button.getAttribute("data-copy") || "";
  const message =
    button.getAttribute("data-copy-message")?.trim() || "Copied!";

  if (isCopied) {
    button.classList.add("is-copied");
    button.setAttribute("aria-live", "polite");
    button.setAttribute("aria-label", message);
    if (label) {
      label.textContent = message;
    }
  } else {
    button.classList.remove("is-copied");
    button.removeAttribute("aria-live");
    button.removeAttribute("aria-label");
    if (label && email) {
      label.textContent = email;
    }
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-9999px";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

document.addEventListener("click", async (e) => {
  const button =
    e.target instanceof Element ? e.target.closest("[data-copy]") : null;
  if (!button) return;

  e.preventDefault();

  const text = button.getAttribute("data-copy") || "";
  if (!text) return;

  try {
    await copyText(text);
    setButtonCopiedState(button, true);
    window.setTimeout(() => setButtonCopiedState(button, false), 1500);
    captureConversion("conversion_email_copy", { method: "clipboard" });
  } catch {
    // clipboard blocked
  }
});

document.addEventListener(
  "click",
  (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;

    const a = el.closest('a[href^="mailto:"]');
    if (a) {
      captureConversion("conversion_email_click", {
        href: a.getAttribute("href") || "",
        placement: a.closest("nav")
          ? "nav"
          : a.closest("footer")
            ? "footer"
            : "page",
      });
      return;
    }

    const cta = el.closest('a.button[href^="mailto:"], a.button.w-button[href^="mailto:"]');
    if (cta) {
      captureConversion("conversion_work_with_me_click", {
        href: cta.getAttribute("href") || "",
        text: (cta.textContent || "").trim().slice(0, 80),
      });
    }
  },
  { capture: true },
);

/** Wrap loose text nodes in .text_blurred with .text_blur (desktop only; matches Webflow IX intent). */
function applyTestimonialBlurWrapping() {
  if (window.innerWidth <= 991) return;

  document.querySelectorAll(".text_blurred").forEach((testimonial) => {
    testimonial.childNodes.forEach((element) => {
      if (element.nodeType === Node.TEXT_NODE) {
        const text = element.textContent.trim();
        if (text !== "") {
          const span = document.createElement("span");
          span.classList.add("text_blur");
          span.textContent = text;
          element.replaceWith(span);
        }
      }
    });
  });
}

function isHomePage() {
  const p = (window.location.pathname.replace(/\/$/, "") || "/").toLowerCase();
  return (
    p === "/" ||
    p === "/index.html" ||
    p === "/fr" ||
    p === "/fr/index.html"
  );
}

/** Logo: sur la home, clic sans effet ; ailleurs, `href="/"` mène à l'accueil. */
function initBrandHomeBehavior() {
  document.addEventListener(
    "click",
    (e) => {
      if (
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const link = e.target.closest("a._w-brand");
      if (!link) return;

      const raw = link.getAttribute("href");
      if (!raw) return;

      let url;
      try {
        url = new URL(raw, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const norm = url.pathname.replace(/\/$/, "") || "/";
      const n = norm.toLowerCase();
      const targetsHome =
        n === "/" ||
        n === "/index.html" ||
        n === "/fr" ||
        n === "/fr/index.html";
      if (!targetsHome) return;

      if (isHomePage()) {
        e.preventDefault();
      }
    },
    true,
  );
}

function initNavHeaderBackground() {
  const header = document.querySelector(".wrapper-nav-content");
  if (!header) return;

  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    header.style.backgroundColor = y > 50 ? "#fefefe" : "transparent";
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

const NAV_COLLAPSE_MQ = window.matchMedia("(max-width: 991px)");

/**
 * Undo legacy nav scripts that moved <nav> into .w-nav-overlay and set
 * data-nav-menu-open / inline display on the overlay.
 */
function repairMobileNavDom(root, menu, overlay) {
  const leftNav = root.querySelector("._w-left_nav");
  const brand = leftNav?.querySelector("a._w-brand");
  if (leftNav && brand && menu && overlay?.contains(menu)) {
    brand.insertAdjacentElement("afterend", menu);
  }
  menu.removeAttribute("data-nav-menu-open");
  if (overlay) {
    overlay.style.removeProperty("display");
  }
}

function initMobileNav() {
  const root = document.getElementById("navbar");
  const button = root?.querySelector(".w-nav-button");
  const menu = document.getElementById("site-nav-menu");
  const overlay = root?.querySelector(".w-nav-overlay");
  if (!root || !button || !menu) return;

  repairMobileNavDom(root, menu, overlay);

  function isCollapsedLayout() {
    return NAV_COLLAPSE_MQ.matches || window.innerWidth <= 991;
  }

  function setOpen(wantOpen) {
    const open = Boolean(wantOpen) && isCollapsedLayout();
    root.classList.toggle("is-mobile-nav-open", open);
    button.classList.toggle("w--open", open);
    button.setAttribute("aria-expanded", String(open));
    const docLang = document.documentElement.getAttribute("lang") || "en";
    const isFr = docLang.toLowerCase().startsWith("fr");
    button.setAttribute(
      "aria-label",
      open
        ? isFr
          ? "Fermer le menu"
          : "Close menu"
        : isFr
          ? "Ouvrir le menu"
          : "Open menu",
    );
    document.body.classList.toggle("is-nav-open", open);
    if (overlay) {
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
      if (!open) overlay.style.removeProperty("display");
    }
  }

  function toggle() {
    setOpen(!root.classList.contains("is-mobile-nav-open"));
  }

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const hit = target.closest(".w-nav-button");
      if (!hit || !root.contains(hit)) return;
      if (!isCollapsedLayout()) return;
      e.preventDefault();
      e.stopPropagation();
      toggle();
    },
    true,
  );

  button.addEventListener("keydown", (e) => {
    if (!isCollapsedLayout()) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    toggle();
  });

  overlay?.addEventListener("click", () => setOpen(false));

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!root.classList.contains("is-mobile-nav-open")) return;
    setOpen(false);
  });

  const onMqChange = () => {
    if (!isCollapsedLayout()) setOpen(false);
  };
  if (typeof NAV_COLLAPSE_MQ.addEventListener === "function") {
    NAV_COLLAPSE_MQ.addEventListener("change", onMqChange);
  } else {
    NAV_COLLAPSE_MQ.addListener(onMqChange);
  }

  setOpen(false);
}

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractProjectCategory(slide) {
  const h3 = slide.querySelector("h3");
  const title = (h3?.textContent || "").trim();
  if (!title) return null;

  const parts = title.split(" - ");
  if (parts.length < 2) return null;

  const label = parts[parts.length - 1].trim();
  if (!label) return null;

  const slug = slugify(label);
  if (!slug) return null;

  return { slug, label };
}

function initProjectFilters() {
  const filtersRoot = document.querySelector("[data-project-filters]");
  if (!filtersRoot) return;

  const swiperRoot = document.getElementById("basic-swiper");
  const swiperWrapper = swiperRoot?.querySelector(".swiper-wrapper");
  if (!swiperRoot || !swiperWrapper) return;

  const slides = Array.from(swiperWrapper.querySelectorAll(".swiper-slide"));
  if (slides.length === 0) return;

  const allLabel =
    filtersRoot.getAttribute("data-all-label") ||
    (getSiteLang() === "fr" ? "Tous" : "All");

  const allButton = filtersRoot.querySelector('[data-project-filter="__all"]');
  if (allButton) {
    allButton.textContent = allLabel;
  }

  const categoryMap = new Map();
  const categoryCounts = new Map();
  for (const slide of slides) {
    const category = extractProjectCategory(slide);
    if (!category) continue;
    if (!categoryMap.has(category.slug)) {
      categoryMap.set(category.slug, category.label);
    }
    categoryCounts.set(category.slug, (categoryCounts.get(category.slug) || 0) + 1);
  }

  const existingFilterButtons = new Set(
    Array.from(filtersRoot.querySelectorAll("[data-project-filter]")).map((el) =>
      el.getAttribute("data-project-filter"),
    ),
  );

  const maxFilters = Math.max(
    0,
    Math.min(5, Number.parseInt(filtersRoot.getAttribute("data-max-filters") || "5", 10) || 5),
  );

  const categories = Array.from(categoryMap.entries())
    .map(([slug, label]) => ({
      slug,
      label,
      count: categoryCounts.get(slug) || 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    })
    .slice(0, maxFilters);

  for (const { slug, label } of categories) {
    if (existingFilterButtons.has(slug)) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "projects-filters__button";
    btn.setAttribute("data-project-filter", slug);
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = label;
    filtersRoot.appendChild(btn);
  }

  function setActiveFilter(slug) {
    const isAll = slug === "__all";

    filtersRoot.querySelectorAll("[data-project-filter]").forEach((btn) => {
      const b = btn;
      const active = (b.getAttribute("data-project-filter") || "") === slug;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });

    for (const slide of slides) {
      const category = extractProjectCategory(slide);
      const match = isAll ? true : category?.slug === slug;
      slide.classList.toggle("is-filtered-out", !match);
    }

    const swiper = window.projectsSwiper;
    if (swiper && typeof swiper.update === "function") {
      swiper.update();
      if (typeof swiper.slideTo === "function") swiper.slideTo(0);
    }
  }

  filtersRoot.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const button = target?.closest("[data-project-filter]");
    if (!button || !filtersRoot.contains(button)) return;

    e.preventDefault();

    const slug = button.getAttribute("data-project-filter") || "__all";
    setActiveFilter(slug);
  });
}

function boot() {
  initBrandHomeBehavior();
  applyTestimonialBlurWrapping();
  window.addEventListener("resize", applyTestimonialBlurWrapping);
  initNavHeaderBackground();
  initMobileNav();
  initProjectFilters();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
