import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('game/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
const source = scripts.sort((a, b) => b.length - a.length)[0];
const listeners = new Map();
const store = new Map();

const noop = () => {};
const classList = { add: noop, remove: noop, toggle: noop, contains: () => false };
const context2d = new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'measureText') return () => ({ width: 42 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop: noop });
    return noop;
  },
  set(target, key, value) { target[key] = value; return true; }
});

const element = (id = '') => ({
  id,
  style: {},
  classList,
  dataset: {},
  value: '',
  textContent: '',
  width: 390,
  height: 844,
  addEventListener: (type, fn) => listeners.set(`${id}:${type}`, fn),
  removeEventListener: noop,
  setAttribute: noop,
  focus: noop,
  select: noop,
  click: noop,
  append: noop,
  appendChild: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
  getContext: () => context2d,
  toDataURL: () => 'data:image/png;base64,',
  toBlob: (fn) => fn(new Blob())
});

const elements = new Map(['game','hint','shell','djOverlay','djModalTitle','djModalHelp','djModalInput','djModalArea','djModalCancel','djModalPrimary'].map((id) => [id, element(id)]));
const audioElement = () => ({ ...element('audio'), currentTime: 0, volume: 1, muted: false, loop: false, preload: '', play: () => Promise.resolve(), pause: noop });

const documentStub = {
  documentElement: { style: { setProperty: noop }, dataset: {}, requestFullscreen: () => Promise.resolve() },
  body: elements.get('shell'),
  fonts: { ready: Promise.resolve() },
  getElementById: (id) => elements.get(id) || element(id),
  querySelector: (selector) => selector.includes('shell') ? elements.get('shell') : element(selector),
  querySelectorAll: () => [],
  createElement: (tag) => tag === 'audio' ? audioElement() : element(tag),
  addEventListener: noop,
  fullscreenElement: null,
  exitFullscreen: () => Promise.resolve()
};

const sandbox = {
  console,
  document: documentStub,
  navigator: { userAgent: 'DON’T JUMP QA', vibrate: noop, clipboard: { writeText: async () => {} } },
  localStorage: { getItem: (key) => store.has(key) ? store.get(key) : null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) },
  performance: { now: () => 0 },
  requestAnimationFrame: noop,
  cancelAnimationFrame: noop,
  addEventListener: (type, fn) => listeners.set(`window:${type}`, fn),
  removeEventListener: noop,
  visualViewport: { width: 390, height: 844, addEventListener: noop },
  screen: { orientation: { addEventListener: noop } },
  innerWidth: 390,
  innerHeight: 844,
  devicePixelRatio: 2,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  URL,
  Blob,
  TextEncoder,
  TextDecoder,
  crypto,
  atob,
  btoa,
  confirm: () => true,
  fetch: async () => ({ ok: true, json: async () => ({}) })
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
new vm.Script(source, { filename: 'game/index.html' }).runInContext(sandbox, { timeout: 5000 });

const qa = sandbox.__CREATE_QA;
if (!qa) throw new Error('Game did not expose __CREATE_QA');
if (qa.campaign.length !== 100) throw new Error(`Expected 100 levels, found ${qa.campaign.length}`);
if (!sandbox.__DJ_HOST) throw new Error('Game did not expose host controls');
if (qa.spikeVersion !== '2.0-premium') throw new Error(`Unexpected spike reaction version: ${qa.spikeVersion}`);

qa.start(1);
if (qa.app.mode !== 'game' || qa.game.L.n !== 1) throw new Error('Level 1 did not start');
const beforeY = qa.game.y;
qa.updateGame(1 / 120);
if (!Number.isFinite(qa.game.y) || !Number.isFinite(beforeY)) throw new Error('Game physics produced an invalid position');
sandbox.__DJ_HOST.restart();
sandbox.__DJ_HOST.toggleMute();
if (!sandbox.__DJ_HOST.muted) throw new Error('Host mute control did not update the audio state');

console.log(`Runtime smoke passed: ${qa.campaign.length} levels, ${qa.spikeVersion} spikes, Level 1 physics, restart, and mute.`);
