(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 18);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* Opt-in website sound */
  const soundButton = document.querySelector('[data-sound]');
  let soundEnabled = false;
  let audioContext = null;

  const playTone = (frequency = 440, duration = .05, type = 'sine', volume = .035) => {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {}
  };

  soundButton?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
    soundButton.setAttribute('aria-label', soundEnabled ? 'Turn website sounds off' : 'Turn website sounds on');
    const label = soundButton.querySelector('span');
    if (label) label.textContent = soundEnabled ? 'ON' : 'OFF';
    if (soundEnabled) playTone(620, .07, 'triangle', .04);
  });

  /* Hero mini-game */
  const stage = document.querySelector('[data-stage]');
  const jumpButton = document.querySelector('[data-jump]');
  let jumpLocked = false;

  const jump = () => {
    if (!stage || jumpLocked) return;
    jumpLocked = true;
    stage.classList.remove('did-jump');
    void stage.offsetWidth;
    stage.classList.add('did-jump');
    playTone(510, .09, 'square', .025);
    window.setTimeout(() => playTone(740, .06, 'triangle', .025), 210);
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

  /* Animated trailer replay */
  const trailer = document.querySelector('[data-trailer]');
  document.querySelector('[data-replay]')?.addEventListener('click', () => {
    if (!trailer) return;
    trailer.classList.add('replay');
    trailer.classList.remove('running');
    void trailer.offsetWidth;
    trailer.classList.add('running');
    playTone(350, .05, 'square', .02);
  });

  /* Level carousel */
  const carouselTrack = document.querySelector('[data-carousel-track]');
  const moveCarousel = (direction) => {
    if (!carouselTrack) return;
    carouselTrack.scrollBy({ left: carouselTrack.clientWidth * .72 * direction, behavior: 'smooth' });
    playTone(direction > 0 ? 540 : 420, .04, 'triangle', .02);
  };
  document.querySelector('[data-carousel-prev]')?.addEventListener('click', () => moveCarousel(-1));
  document.querySelector('[data-carousel-next]')?.addEventListener('click', () => moveCarousel(1));

  /* Blob picker */
  const choices = document.querySelectorAll('.blob-choice');
  const caption = document.querySelector('[data-blob-name]');
  choices.forEach((choice, index) => {
    choice.addEventListener('click', () => {
      choices.forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      choice.classList.add('selected');
      choice.setAttribute('aria-pressed', 'true');
      if (caption) caption.textContent = choice.dataset.name || 'BLOB';
      playTone(390 + index * 60, .06, 'triangle', .025);
      if ('vibrate' in navigator && matchMedia('(pointer: coarse)').matches) {
        try { navigator.vibrate(6); } catch (_) {}
      }
    });
  });

  /* Real online daily leaderboard */
  const configApi = window.DONT_JUMP_CONFIG?.leaderboardApi || document.querySelector('meta[name="leaderboard-api"]')?.content || '';
  const apiBase = configApi.replace(/\/$/, '');
  const boardBody = document.querySelector('[data-leaderboard]');
  const boardStatus = document.querySelector('[data-board-status]');
  const scoreForm = document.querySelector('[data-score-form]');
  const submitButton = document.querySelector('[data-submit-score]');
  const shareButton = document.querySelector('[data-share-result]');
  const callsignNode = document.querySelector('[data-callsign]');
  const dailyDateNode = document.querySelector('[data-daily-date]');
  const dailyLevelNode = document.querySelector('[data-daily-level]');
  const dailyNameNode = document.querySelector('[data-daily-name]');
  const adjectives = ['BRAVE','WOBBLY','SNEAKY','LUCKY','NERVOUS','BOLD','QUICK','JELLY','TINY','CHAOTIC','SPEEDY','STUBBORN'];
  const nouns = ['BLOB','JUMPER','PANIC','ROOKIE','RUNNER','LEGEND','BEAN','WIGGLE','SPARK','SQUISH','TRICKSTER','HERO'];
  const dailyNames = ['THE FLOOR IS FINE','TRUST ISSUES','SPIKE DELIVERY','GRAVITY TOOK OFF','LOOK BEFORE YOU TAP','DEFINITELY SAFE','ONE SMALL PROBLEM','NOTHING SUSPICIOUS','THE LONG WAY DOWN','A PERFECTLY NORMAL LEVEL'];
  let dailyChallenge = null;
  let lastResult = null;

  const getPlayerId = () => {
    let id = localStorage.getItem('dont-jump-player-id');
    if (!id) {
      if (crypto.randomUUID) id = crypto.randomUUID();
      else {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
        id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
      localStorage.setItem('dont-jump-player-id', id);
    }
    return id;
  };

  const makeCallsign = (offset = Number(localStorage.getItem('dont-jump-name-offset') || 0)) => {
    const id = getPlayerId().replaceAll('-', '');
    const seedA = parseInt(id.slice(0, 4), 16) + offset;
    const seedB = parseInt(id.slice(4, 8), 16) + offset * 3;
    const tag = String((parseInt(id.slice(-4), 16) + offset) % 100).padStart(2, '0');
    return `${adjectives[seedA % adjectives.length]} ${nouns[seedB % nouns.length]} ${tag}`;
  };

  const updateCallsign = () => {
    if (callsignNode) callsignNode.textContent = makeCallsign();
  };
  updateCallsign();

  document.querySelector('[data-shuffle-name]')?.addEventListener('click', () => {
    const next = (Number(localStorage.getItem('dont-jump-name-offset') || 0) + 1) % 144;
    localStorage.setItem('dont-jump-name-offset', String(next));
    updateCallsign();
    playTone(650, .05, 'triangle', .02);
  });

  const localDaily = () => {
    const date = new Date().toISOString().slice(0, 10);
    const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
    return { date, level: ((day * 37) % 100) + 1, name: dailyNames[day % dailyNames.length] };
  };

  const showDaily = (challenge) => {
    dailyChallenge = challenge;
    if (dailyDateNode) dailyDateNode.textContent = new Date(`${challenge.date}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
    if (dailyLevelNode) dailyLevelNode.textContent = String(challenge.level).padStart(2, '0');
    if (dailyNameNode) dailyNameNode.textContent = challenge.name;
  };
  showDaily(localDaily());

  const setBoardStatus = (message, state = '') => {
    if (!boardStatus) return;
    boardStatus.textContent = message;
    boardStatus.classList.toggle('is-error', state === 'error');
    boardStatus.classList.toggle('is-live', state === 'live');
  };

  const formatTime = (timeMs) => {
    const seconds = timeMs / 1000;
    return seconds >= 60 ? `${Math.floor(seconds / 60)}:${String((seconds % 60).toFixed(1)).padStart(4, '0')}` : `${seconds.toFixed(1)}s`;
  };

  const renderLeaderboard = (entries = []) => {
    if (!boardBody) return;
    boardBody.replaceChildren();
    if (!entries.length) {
      const row = document.createElement('tr');
      row.className = 'empty-row';
      ['—', 'BE THE FIRST BRAVE BLOB', '—', '—'].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      });
      boardBody.append(row);
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement('tr');
      [entry.rank, entry.playerName, entry.deaths, formatTime(entry.timeMs)].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      });
      boardBody.append(row);
    });
  };

  const fetchJson = async (path, options) => {
    const response = await fetch(`${apiBase}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The leaderboard did not respond');
    return data;
  };

  const loadLeaderboard = async () => {
    if (!apiBase) {
      setBoardStatus('ONLINE BOARD READY — CLOUDFLARE ACTIVATION NEEDED', 'error');
      renderLeaderboard([]);
      if (submitButton) submitButton.disabled = true;
      return;
    }
    try {
      setBoardStatus('CONNECTING TO THE START LINE…');
      await fetchJson('/api/health');
      const daily = await fetchJson('/api/daily');
      showDaily(daily.challenge);
      const board = await fetchJson(`/api/leaderboard?date=${encodeURIComponent(daily.challenge.date)}`);
      renderLeaderboard(board.leaderboard);
      setBoardStatus('LIVE · TODAY’S BEST RUNS', 'live');
      if (submitButton) submitButton.disabled = false;
    } catch (_) {
      setBoardStatus('LEADERBOARD IS WARMING UP — TRY AGAIN SHORTLY', 'error');
      if (submitButton) submitButton.disabled = true;
    }
  };

  document.querySelector('[data-refresh-board]')?.addEventListener('click', loadLeaderboard);

  scoreForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!apiBase || !dailyChallenge || !submitButton) return;
    const form = new FormData(scoreForm);
    const deaths = Number(form.get('deaths'));
    const timeMs = Math.round(Number(form.get('time')) * 1000);
    if (!Number.isInteger(deaths) || deaths < 0 || !Number.isInteger(timeMs) || timeMs < 500) {
      setBoardStatus('ENTER A VALID DEATH COUNT AND COMPLETION TIME', 'error');
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = 'SUBMITTING…';
    try {
      const result = await fetchJson('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dont-Jump-Client': 'web-v1' },
        body: JSON.stringify({
          challengeDate: dailyChallenge.date,
          playerId: getPlayerId(),
          playerName: makeCallsign(),
          level: dailyChallenge.level,
          deaths,
          timeMs,
        }),
      });
      renderLeaderboard(result.leaderboard);
      lastResult = { deaths, timeMs, level: dailyChallenge.level, callsign: makeCallsign() };
      if (shareButton) shareButton.disabled = false;
      setBoardStatus(result.accepted ? 'RUN ACCEPTED · YOUR BEST SCORE IS LIVE' : 'YOUR EXISTING BEST RUN IS STILL FASTER', 'live');
      playTone(760, .09, 'triangle', .035);
      window.setTimeout(() => playTone(980, .11, 'triangle', .03), 100);
    } catch (error) {
      setBoardStatus(error instanceof Error ? error.message.toUpperCase() : 'SCORE COULD NOT BE SUBMITTED', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'SUBMIT RUN';
    }
  });

  shareButton?.addEventListener('click', async () => {
    if (!lastResult) return;
    const text = `${lastResult.callsign} survived DON’T JUMP level ${lastResult.level} with ${lastResult.deaths} deaths in ${formatTime(lastResult.timeMs)}. Think you can do better?`;
    try {
      if (navigator.share) await navigator.share({ title: 'DON’T JUMP daily result', text, url: location.href.split('#')[0] });
      else await navigator.clipboard.writeText(`${text} ${location.href.split('#')[0]}`);
      shareButton.textContent = navigator.share ? 'SHARED ✓' : 'COPIED ✓';
      window.setTimeout(() => { shareButton.textContent = 'SHARE RESULT ↗'; }, 1800);
    } catch (_) {}
  });

  loadLeaderboard();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }, { once: true });
  }
})();
