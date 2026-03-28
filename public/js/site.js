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

function boot() {
  initBrandHomeBehavior();
  initNavHeaderBackground();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
