'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const project = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(project, 'app', 'index.html'), 'utf8');
const coreSource = fs.readFileSync(path.join(project, 'app', 'js', 'core.js'), 'utf8');
const starterSource = fs.readFileSync(path.join(project, 'app', 'default-playlist.js'), 'utf8');
const appSource = fs.readFileSync(path.join(project, 'app', 'js', 'app.js'), 'utf8');

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function layoutRect(element) {
  const doc = element.ownerDocument;
  const zero = { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
  if (!doc || !doc.documentElement) return zero;
  const modal = element.closest('#settingsModal') ? '#settingsModal' : element.closest('#guideModal') ? '#guideModal' : '';
  if (modal) {
    const list = Array.prototype.slice.call(doc.querySelectorAll(modal + ' button, ' + modal + ' input, ' + modal + ' textarea, ' + modal + ' select'));
    const index = Math.max(0, list.indexOf(element));
    const left = 190 + (index % 2) * 330;
    const top = 80 + Math.floor(index / 2) * 42;
    return { left: left, top: top, width: 290, height: 30, right: left + 290, bottom: top + 30 };
  }
  if (element.closest('.topbar')) {
    const list = Array.prototype.slice.call(doc.querySelectorAll('.topbar button'));
    const index = Math.max(0, list.indexOf(element));
    const left = 960 + index * 140;
    return { left: left, top: 20, width: 120, height: 30, right: left + 120, bottom: 50 };
  }
  if (element.closest('.sidebar')) {
    const list = Array.prototype.slice.call(doc.querySelectorAll('.sidebar button'));
    const index = Math.max(0, list.indexOf(element));
    const top = 90 + index * 42;
    return { left: 28, top: top, width: 220, height: 32, right: 248, bottom: top + 32 };
  }
  if (element.classList.contains('channel-row')) {
    const list = Array.prototype.slice.call(doc.querySelectorAll('.channel-row'));
    const index = Math.max(0, list.indexOf(element));
    const top = 96 + index * 68;
    return { left: 390, top: top, width: 420, height: 60, right: 810, bottom: top + 60 };
  }
  if (element.classList.contains('player-control')) {
    const list = Array.prototype.slice.call(doc.querySelectorAll('.player-control'));
    const index = Math.max(0, list.indexOf(element));
    const left = 430 + index * 105;
    return { left: left, top: 500, width: 96, height: 30, right: left + 96, bottom: 530 };
  }
  if (element.id === 'nowCard') return { left: 720, top: 610, width: 520, height: 130, right: 1240, bottom: 740 };
  if (element.id === 'channelSearch') return { left: 850, top: 56, width: 220, height: 30, right: 1070, bottom: 86 };
  if (element.classList.contains('guide-row')) {
    const list = Array.prototype.slice.call(doc.querySelectorAll('.guide-row'));
    const index = Math.max(0, list.indexOf(element));
    const top = 92 + index * 58;
    return { left: 250, top: top, width: 760, height: 50, right: 1010, bottom: top + 50 };
  }
  return { left: 100, top: 800, width: 100, height: 30, right: 200, bottom: 830 };
}

function installBrowserStubs(window) {
  window.__nativeClose = window.close.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  window.__timers = new Set();
  window.setInterval = function (callback, delay) {
    const id = nativeSetInterval(callback, delay);
    window.__timers.add(id);
    return id;
  };
  window.setTimeout = function (callback, delay) {
    const id = nativeSetTimeout(function () {
      window.__timers.delete(id);
      if (typeof callback === 'function') callback();
    }, delay);
    window.__timers.add(id);
    return id;
  };
  window.clearInterval = function (id) { window.__timers.delete(id); return nativeClearInterval(id); };
  window.clearTimeout = function (id) { window.__timers.delete(id); return nativeClearTimeout(id); };

  const media = window.HTMLMediaElement.prototype;
  media.load = function () { };
  media.play = function () {
    this.__paused = false;
    window.__playCalls = (window.__playCalls || 0) + 1;
    return window.Promise.resolve();
  };
  media.pause = function () {
    this.__paused = true;
    window.__pauseCalls = (window.__pauseCalls || 0) + 1;
  };
  media.canPlayType = function () { return 'maybe'; };
  media.getVideoPlaybackQuality = function () { return { droppedVideoFrames: 0 }; };
  Object.defineProperty(media, 'paused', { configurable: true, get: function () { return this.__paused !== false; } });
  Object.defineProperty(media, 'currentSrc', { configurable: true, get: function () { return this.src || ''; } });
  Object.defineProperty(media, 'readyState', { configurable: true, get: function () { return 4; } });

  window.HTMLElement.prototype.scrollIntoView = function () { };
  window.Element.prototype.getBoundingClientRect = function () { return layoutRect(this); };
  window.Element.prototype.getClientRects = function () {
    const rect = this.getBoundingClientRect();
    return rect.width > 0 ? [rect] : [];
  };
  window.fetch = function () { return window.Promise.reject(new Error('network disabled in tests')); };
  window.webOS = { platformBack: function () { window.__platformBacks = (window.__platformBacks || 0) + 1; } };
  window.close = function () { window.__windowCloses = (window.__windowCloses || 0) + 1; };
}

function closeApp(window) {
  Array.from(window.__timers || []).forEach(function (id) {
    window.clearInterval(id);
    window.clearTimeout(id);
  });
  window.__nativeClose();
}

async function createApp(seed) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  await new Promise(function (resolve) {
    if (dom.window.document.readyState === 'complete') resolve();
    else dom.window.addEventListener('load', resolve, { once: true });
  });
  installBrowserStubs(dom.window);
  if (seed) seed(dom.window);
  dom.window.eval(coreSource);
  dom.window.eval(starterSource);
  dom.window.eval(appSource);
  await sleep(240);
  return dom;
}

function press(window, target, key, code) {
  const element = target || window.document.activeElement || window.document.body;
  const event = new window.KeyboardEvent('keydown', { key: key, code: key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { get: function () { return code; } });
  Object.defineProperty(event, 'which', { get: function () { return code; } });
  element.dispatchEvent(event);
  return event;
}

function focusedRow(window) {
  return window.document.activeElement && window.document.activeElement.classList.contains('channel-row')
    ? window.document.activeElement : null;
}

test('launch focus lands on the current channel, not on the page body', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    const active = window.document.activeElement;
    assert.equal(active.tagName, 'BUTTON');
    assert.ok(active.classList.contains('channel-row'), 'expected a channel row, got ' + active.className);
    const first = window.FREEWAVE_STARTER.channels[0];
    assert.equal(active.dataset.channelKey, (first.tvgId || first.name) + '|' + first.url);
    assert.equal(window.document.getElementById('diagOverlay').hidden, true);
  } finally {
    closeApp(window);
  }
});

test('D-pad moves between channel cards and OK starts the focused channel', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    const first = focusedRow(window);
    assert.ok(first);
    press(window, first, 'ArrowDown', 40);
    const second = focusedRow(window);
    assert.ok(second, 'ArrowDown should keep focus on a channel row');
    assert.notEqual(second.dataset.channelKey, first.dataset.channelKey);

    press(window, second, 'Enter', 13);
    await sleep(30);
    const starter = window.FREEWAVE_STARTER.channels;
    assert.equal(window.document.getElementById('currentChannelName').textContent, starter[1].name);
    assert.ok((window.__playCalls || 0) >= 1, 'the native player should be asked to play');
    assert.ok(window.document.getElementById('video').src.indexOf(starter[1].url) !== -1);
    assert.match(window.document.getElementById('playToggle').textContent, /PAUSE/);
    assert.ok(focusedRow(window), 'focus must survive the channel-list rebuild');
    assert.equal(focusedRow(window).dataset.channelKey, (starter[1].tvgId || starter[1].name) + '|' + starter[1].url);
  } finally {
    closeApp(window);
  }
});

test('the now-playing card leads by D-pad into player controls and OK activates the focused control', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    const nowCard = window.document.getElementById('nowCard');
    nowCard.focus();
    press(window, nowCard, 'ArrowUp', 38);
    const active = window.document.activeElement;
    assert.ok(active.closest('.player-controls'), 'Up from the now card should enter the player controls, got ' + active.id);

    const video = window.document.getElementById('video');
    const play = window.document.getElementById('playToggle');
    video.__paused = false;
    play.focus();
    press(window, play, 'Enter', 13);
    assert.ok((window.__pauseCalls || 0) >= 1, 'OK on Play/Pause should pause a playing channel');
    assert.equal(video.paused, true);
    assert.match(play.textContent, /PLAY/);
    assert.equal(play.getAttribute('aria-label'), 'Play or resume live TV');
  } finally {
    closeApp(window);
  }
});

test('Back closes Setup, restores the opener, and uses no browser history entries', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    let pushes = 0;
    window.history.pushState = function () { pushes += 1; };
    const settings = window.document.getElementById('settingsButton');
    settings.focus();
    settings.click();
    await sleep(90);
    assert.equal(window.document.getElementById('settingsModal').hidden, false);
    assert.ok(window.document.getElementById('settingsModal').contains(window.document.activeElement));

    press(window, window.document.activeElement, 'GoBack', 461);
    assert.equal(window.document.getElementById('settingsModal').hidden, true);
    assert.equal(window.document.activeElement, settings, 'focus should return to the Settings button');
    assert.equal(pushes, 0, 'Back must not depend on history.pushState');
  } finally {
    closeApp(window);
  }
});

test('D-pad Down escapes a Setup text field instead of trapping focus', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    const settings = window.document.getElementById('settingsButton');
    settings.focus();
    settings.click();
    await sleep(90);
    const input = window.document.getElementById('playlistUrl');
    assert.equal(window.document.activeElement, input);
    press(window, input, 'ArrowDown', 40);
    assert.notEqual(window.document.activeElement, input, 'Down must move out of the text field');
    assert.ok(window.document.getElementById('settingsModal').contains(window.document.activeElement));
  } finally {
    closeApp(window);
  }
});

test('TV Guide is fully navigable and Back returns focus to the channel list', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    const guide = window.document.getElementById('guideButton');
    guide.focus();
    guide.click();
    await sleep(90);
    assert.equal(window.document.getElementById('guideModal').hidden, false);
    const firstGuide = window.document.activeElement;
    assert.ok(firstGuide.classList.contains('guide-row'));

    press(window, firstGuide, 'ArrowDown', 40);
    const secondGuide = window.document.activeElement;
    assert.ok(secondGuide.classList.contains('guide-row'));
    assert.notEqual(secondGuide.dataset.channelKey, firstGuide.dataset.channelKey);

    press(window, secondGuide, 'GoBack', 461);
    assert.equal(window.document.getElementById('guideModal').hidden, true);
    assert.ok(window.document.activeElement.classList.contains('channel-row'));
  } finally {
    closeApp(window);
  }
});

test('pointer selection focuses the clicked card and preserves it while playing', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    const rows = window.document.querySelectorAll('.channel-row');
    const target = rows[2];
    target.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(30);
    assert.ok(window.document.activeElement.classList.contains('channel-row'));
    assert.equal(window.document.activeElement.dataset.channelKey, target.dataset.channelKey);
    assert.equal(window.document.getElementById('currentChannelName').textContent, target.querySelector('.channel-name').textContent);
  } finally {
    closeApp(window);
  }
});

test('diagnostics are hidden by default and report key, focus, screen and handling when enabled', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    assert.equal(window.document.getElementById('diagOverlay').hidden, true);
    const settings = window.document.getElementById('settingsButton');
    settings.focus();
    settings.click();
    await sleep(90);
    const toggle = window.document.getElementById('prefDiagnostics');
    toggle.click();
    assert.equal(window.document.getElementById('diagOverlay').hidden, false);
    window.document.getElementById('doneSettings').click();
    await sleep(30);

    const row = window.document.querySelector('.channel-row');
    row.focus();
    press(window, row, 'ArrowDown', 40);
    assert.match(window.document.getElementById('diagKey').textContent, /ArrowDown \(40\)/);
    assert.match(window.document.getElementById('diagFocus').textContent, /channel-row/);
    assert.equal(window.document.getElementById('diagHandled').textContent, 'YES');
    assert.equal(window.document.getElementById('diagScreen').textContent, 'home');
  } finally {
    closeApp(window);
  }
});

test('a saved starter source is migrated to the current verified lineup without touching user state', async function () {
  const dom = await createApp(function (window) {
    window.localStorage.setItem('freewave.live.v1', JSON.stringify({
      sources: [{ id: 'starter-public', name: 'FreeWave verified lineup', url: '', channels: [{ key: 'old|https://old.example/live.m3u8', name: 'Old Starter', url: 'https://old.example/live.m3u8', group: 'News' }] }],
      favorites: [], recent: [], prefs: { resume: false }, guide: { channels: {}, programs: {} }, lastKey: ''
    }));
  });
  const window = dom.window;
  try {
    const rows = window.document.querySelectorAll('.channel-row');
    assert.equal(rows.length, window.FREEWAVE_STARTER.channels.length);
    assert.equal(window.document.querySelectorAll('.channel-access').length, window.FREEWAVE_STARTER.channels.length);
    assert.equal(rows[0].querySelector('.channel-name').textContent, window.FREEWAVE_STARTER.channels[0].name);
  } finally {
    closeApp(window);
  }
});

test('Back at the home screen exits through the webOS platform API', async function () {
  const dom = await createApp();
  const window = dom.window;
  try {
    press(window, focusedRow(window), 'GoBack', 461);
    assert.equal(window.__platformBacks || 0, 1);
    assert.equal(window.__windowCloses || 0, 0);
  } finally {
    closeApp(window);
  }
});
