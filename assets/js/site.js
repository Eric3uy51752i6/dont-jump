(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const boot = document.querySelector('.boot');
  const header = document.querySelector('[data-header]');

  const finishBoot = () => {
    if (!boot) return;
    boot.classList.add('is-gone');
    setTimeout(() => boot.remove(), 700);
  };
  if (document.readyState === 'complete') finishBoot();
  else addEventListener('load', finishBoot, { once: true });
  setTimeout(finishBoot, 1400);

  const updateHeader = () => header?.classList.toggle('is-scrolled', scrollY > 24);
  updateHeader();
  addEventListener('scroll', updateHeader, { passive: true });

  const reveal = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveal.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    reveal.forEach((item) => observer.observe(item));
  }

  const microgame = document.querySelector('[data-microgame]');
  if (microgame) {
    let jumping = false;
    const jump = () => {
      if (jumping) return;
      jumping = true;
      microgame.classList.remove('did-jump');
      void microgame.offsetWidth;
      microgame.classList.add('did-jump');
      const result = microgame.querySelector('.micro-result');
      if (result) result.textContent = Math.random() > .18 ? 'NICE.' : 'TOO CLOSE.';
      if ('vibrate' in navigator && matchMedia('(pointer: coarse)').matches) {
        try { navigator.vibrate(8); } catch (_) {}
      }
      setTimeout(() => {
        microgame.classList.remove('did-jump');
        jumping = false;
      }, 820);
    };
    microgame.addEventListener('click', jump);
  }

  const blobs = document.querySelectorAll('.blob-card');
  const blobCaption = document.querySelector('[data-blob-caption]');
  blobs.forEach((card) => {
    card.addEventListener('click', () => {
      blobs.forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      if (blobCaption) blobCaption.textContent = card.dataset.blobName || 'BLOB';
      if ('vibrate' in navigator && matchMedia('(pointer: coarse)').matches) {
        try { navigator.vibrate(6); } catch (_) {}
      }
    });
  });

  const countdown = document.querySelector('[data-countdown]');
  const updateCountdown = () => {
    if (!countdown) return;
    const now = new Date();
    const end = new Date(now);
    end.setUTCHours(24, 0, 0, 0);
    let seconds = Math.max(0, Math.floor((end - now) / 1000));
    const hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    const minutes = Math.floor(seconds / 60);
    const remain = seconds - minutes * 60;
    countdown.textContent = [hours, minutes, remain].map((value) => String(value).padStart(2, '0')).join(':');
  };
  updateCountdown();
  setInterval(updateCountdown, 1000);

  if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
    const eyeBlobs = document.querySelectorAll('.hero .blob, .tutorial .blob, .final-cta .blob');
    addEventListener('pointermove', (event) => {
      eyeBlobs.forEach((blob) => {
        const rect = blob.getBoundingClientRect();
        const dx = Math.max(-2, Math.min(2, (event.clientX - (rect.left + rect.width / 2)) / 180));
        const dy = Math.max(-2, Math.min(2, (event.clientY - (rect.top + rect.height / 2)) / 180));
        blob.style.setProperty('--eye-x', `${dx}px`);
        blob.style.setProperty('--eye-y', `${dy}px`);
        blob.querySelectorAll('i').forEach((eye) => { eye.style.transform = `translate(${dx}px,${dy}px)`; });
      });
    }, { passive: true });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => document.body.classList.remove('menu-open'));
  });

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((error) => {
      console.warn('DON’T JUMP service worker registration failed:', error);
    }), { once: true });
  }
})();
