(() => {
  'use strict';
  const boot = document.getElementById('gameBoot');
  const error = document.getElementById('gameError');
  const announce = document.getElementById('gameAnnounce');
  const mute = document.querySelector('[data-game-mute]');
  const restart = document.querySelector('[data-game-restart]');
  const fullscreen = document.querySelector('[data-game-fullscreen]');

  const stop = (event) => event.stopPropagation();
  document.querySelectorAll('.game-chrome a,.game-chrome button').forEach((control) => {
    ['pointerdown', 'pointerup', 'click'].forEach((type) => control.addEventListener(type, stop));
  });

  const setMutedUI = () => {
    const muted = window.__DJ_HOST?.muted ?? false;
    if (!mute) return;
    mute.setAttribute('aria-pressed', String(muted));
    mute.querySelector('span').textContent = muted ? 'UNMUTE' : 'MUTE';
  };

  mute?.addEventListener('click', () => {
    const enabled = window.__DJ_HOST?.toggleMute?.();
    setMutedUI();
    if (announce) announce.textContent = enabled ? 'Sound on' : 'Sound muted';
  });
  restart?.addEventListener('click', () => {
    window.__DJ_HOST?.restart?.();
    if (announce) announce.textContent = 'Level restarted';
  });
  fullscreen?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (reason) {
      console.warn('Fullscreen is unavailable:', reason);
    }
  });

  const ready = () => {
    if (!window.__CREATE_QA || !window.__DJ_HOST) return false;
    boot?.classList.add('is-gone');
    setMutedUI();
    return true;
  };

  let attempts = 0;
  const watch = setInterval(() => {
    attempts += 1;
    if (ready()) clearInterval(watch);
    else if (attempts > 50) {
      clearInterval(watch);
      boot?.classList.add('is-gone');
      error?.classList.add('show');
      console.error('DON’T JUMP failed to expose its runtime after 5 seconds.');
    }
  }, 100);

  document.querySelector('[data-game-retry]')?.addEventListener('click', () => location.reload());
  addEventListener('error', (event) => console.error('DON’T JUMP runtime error:', event.error || event.message));
})();
