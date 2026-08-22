(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 18);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const stage = document.querySelector('[data-stage]');
  const jumpButton = document.querySelector('[data-jump]');
  let jumpLocked = false;

  const jump = () => {
    if (!stage || jumpLocked) return;
    jumpLocked = true;
    stage.classList.remove('did-jump');
    void stage.offsetWidth;
    stage.classList.add('did-jump');
    if (jumpButton) jumpButton.textContent = 'NICE.';
    if ('vibrate' in navigator && matchMedia('(pointer: coarse)').matches) {
      try { navigator.vibrate(8); } catch (_) {}
    }
    window.setTimeout(() => {
      stage.classList.remove('did-jump');
      if (jumpButton) jumpButton.textContent = 'MAKE HIM JUMP';
      jumpLocked = false;
    }, 650);
  };

  jumpButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    jump();
  });
  stage?.addEventListener('click', jump);

  const choices = document.querySelectorAll('.blob-choice');
  const caption = document.querySelector('[data-blob-name]');
  choices.forEach((choice) => {
    choice.addEventListener('click', () => {
      choices.forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      choice.classList.add('selected');
      choice.setAttribute('aria-pressed', 'true');
      if (caption) caption.textContent = choice.dataset.name || 'BLOB';
      if ('vibrate' in navigator && matchMedia('(pointer: coarse)').matches) {
        try { navigator.vibrate(6); } catch (_) {}
      }
    });
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }, { once: true });
  }
})();
