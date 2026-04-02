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

/** Logo: sur la home, clic sans effet ; ailleurs, `href="/"` mène à l’accueil. */
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

/**
 * Fallback mobile nav toggle (no Webflow runtime dependency).
 * Keeps Webflow's HTML/CSS structure but toggles state with vanilla JS.
 */
function initNavBurgerFallback() {
  const nav = document.querySelector(".w-nav");
  if (!nav) return;

  const button = nav.querySelector(".w-nav-button");
  const menu = nav.querySelector(".w-nav-menu");
  const overlay = nav.querySelector(".w-nav-overlay");
  if (!button || !menu) return;

  const originalParent = menu.parentElement;
  const originalNextSibling = menu.nextSibling;

  function restoreMenuPlacement() {
    if (!originalParent) return;
    if (menu.parentElement === originalParent) return;
    if (originalNextSibling) originalParent.insertBefore(menu, originalNextSibling);
    else originalParent.appendChild(menu);
  }

  function placeMenuInOverlay() {
    if (!overlay) return;
    if (menu.parentElement === overlay) return;
    overlay.appendChild(menu);
  }

  function setOpen(isOpen) {
    button.classList.toggle("w--open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      placeMenuInOverlay();
      menu.setAttribute("data-nav-menu-open", "");
      if (overlay) overlay.style.display = "block";
    } else {
      menu.removeAttribute("data-nav-menu-open");
      restoreMenuPlacement();
      if (overlay) overlay.style.display = "none";
    }
  }

  function toggle() {
    setOpen(!button.classList.contains("w--open"));
  }

  // Capture to reliably catch clicks on inner icon.
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const clicked = target.closest(".w-nav-button");
      if (!clicked) return;
      if (!nav.contains(clicked)) return;
      e.preventDefault();
      toggle();
    },
    true,
  );

  // Close on link click
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });

  // Close on escape
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!button.classList.contains("w--open")) return;
    setOpen(false);
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!button.classList.contains("w--open")) return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (nav.contains(target)) return;
    setOpen(false);
  });

  setOpen(false);
}

function boot() {
  initBrandHomeBehavior();
  applyTestimonialBlurWrapping();
  window.addEventListener("resize", applyTestimonialBlurWrapping);
  initNavHeaderBackground();
  initNavBurgerFallback();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
