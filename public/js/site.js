function getCopyButtonLabel(button) {
  return button?.querySelector(':scope > div:not(.icon-embed-small)') ?? null;
}

function setButtonCopiedState(button, isCopied) {
  if (!button) return;

  const label = getCopyButtonLabel(button);
  const email = button.getAttribute('data-copy') || '';
  const message =
    button.getAttribute('data-copy-message')?.trim() || 'Copied!';

  if (isCopied) {
    button.classList.add('is-copied');
    button.setAttribute('aria-live', 'polite');
    button.setAttribute('aria-label', message);
    if (label) {
      label.textContent = message;
    }
  } else {
    button.classList.remove('is-copied');
    button.removeAttribute('aria-live');
    button.removeAttribute('aria-label');
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
  const button =
    e.target instanceof Element ? e.target.closest('[data-copy]') : null;
  if (!button) return;

  e.preventDefault();

  const text = button.getAttribute('data-copy') || '';
  if (!text) return;

  try {
    await copyText(text);
    setButtonCopiedState(button, true);
    window.setTimeout(() => setButtonCopiedState(button, false), 1500);
  } catch {
    // clipboard blocked
  }
});
