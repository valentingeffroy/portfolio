function getCopyButtonLabel(button) {
  return button?.querySelector(":scope > div:not(.icon-embed-small)") ?? null;
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
  } catch {
    // clipboard blocked
  }
});

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
  const p = window.location.pathname;
  return p === "/" || p.toLowerCase() === "/index.html";
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
      const targetsHome =
        norm === "/" || norm.toLowerCase() === "/index.html";
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
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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

function boot() {
  initBrandHomeBehavior();
  applyTestimonialBlurWrapping();
  window.addEventListener("resize", applyTestimonialBlurWrapping);
  initNavHeaderBackground();
  initMobileNav();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
