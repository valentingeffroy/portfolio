function setButtonCopiedState(button, isCopied) {
  if (!button) return;

  if (isCopied) {
    button.classList.add('is-copied');
    button.setAttribute('aria-live', 'polite');
    button.setAttribute('aria-label', 'Copied to clipboard');
  } else {
    button.classList.remove('is-copied');
    button.removeAttribute('aria-live');
    button.removeAttribute('aria-label');
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers / non-secure contexts
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

document.addEventListener('click', async (e) => {
  const button = e.target instanceof Element ? e.target.closest('[data-copy]') : null;
  if (!button) return;

  e.preventDefault();

  const text = button.getAttribute('data-copy') || '';
  if (!text) return;

  try {
    await copyText(text);
    setButtonCopiedState(button, true);
    window.setTimeout(() => setButtonCopiedState(button, false), 1500);
  } catch {
    // no-op (clipboard blocked)
  }
});
