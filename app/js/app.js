(function () {
  'use strict';

  const Core = window.FreewaveCore;
  const STORE_KEY = 'freewave.live.v1';
  const APP_VERSION = '1.2.0';
  const $ = function (id) { return document.getElementById(id); };
  const el = {
    clock: $('clockLabel'), allCount: $('allCount'), favoriteCount: $('favoriteCount'), recentCount: $('recentCount'),
    networkStatus: $('networkStatus'), networkLabel: $('networkLabel'),
    categoryNav: $('categoryNav'), sectionTitle: $('sectionTitle'), channelCount: $('channelCount'),
    search: $('channelSearch'), channelList: $('channelList'), emptyState: $('emptyState'),
    video: $('video'), playerPlaceholder: $('playerPlaceholder'), playbackMessage: $('playbackMessage'),
    channelNumber: $('channelNumber'), currentChannelName: $('currentChannelName'),
    currentChannelMeta: $('currentChannelMeta'), channelLogo: $('channelLogo'), localNow: $('localNow'),
    programTitle: $('programTitle'), programProgress: $('programProgress'), programTime: $('programTime'),
    programRemaining: $('programRemaining'), nextProgram: $('nextProgram'), toast: $('toast'),
    modal: $('settingsModal'), playlistUrl: $('playlistUrl'), playlistText: $('playlistText'),
    playlistFile: $('playlistFile'), playlistFeedback: $('playlistFeedback'), sourceList: $('sourceList'),
    epgUrl: $('epgUrl'), epgText: $('epgText'), epgFile: $('epgFile'), epgFeedback: $('epgFeedback'),
    playToggle: $('playToggle'), muteToggle: $('muteToggle'), favoriteToggle: $('favoriteToggle'),
    guideModal: $('guideModal'), guideList: $('guideList'), guideStatus: $('guideStatus'), guideDetail: $('guideDetail'),
    prefResume: $('prefResume'), prefMuted: $('prefMuted'), prefRetries: $('prefRetries'),
    prefsFeedback: $('prefsFeedback'), diagList: $('diagList'), diagFeedback: $('diagFeedback'),
    appVersion: $('appVersion'),
    diagOverlay: $('diagOverlay'), diagKey: $('diagKey'), diagAction: $('diagAction'),
    diagHandled: $('diagHandled'), diagFocus: $('diagFocus'), diagScreen: $('diagScreen'),
    diagPrevious: $('diagPrevious'), diagChannel: $('diagChannel'), prefDiagnostics: $('prefDiagnostics')
  };

  const state = {
    sources: [],
    channels: [],
    favorites: [],
    recent: [],
    guide: { channels: {}, programs: {} },
    guideUrl: '',
    guideUpdatedAt: 0,
    currentKey: '',
    lastKey: '',
    view: 'all',
    category: '',
    prefs: { resume: true, startMuted: false, retries: 1, diagnostics: false },
    playback: { attempts: 0, usingBackup: false, timer: 0 },
    lastError: '',
    lastErrorAt: 0,
    toastTimer: 0,
    statsTimer: 0,
    digitBuffer: '',
    digitTimer: 0,
    screen: 'home',
    previousScreen: 'home',
    lastFocused: null,
    keyLog: { key: '', code: 0, action: '', handled: false }
  };

  function normalizeChannel(channel) {
    if (!channel || typeof channel.name !== 'string') return null;
    const url = Core.safeHttpUrl(channel.url);
    if (!url) return null;
    const id = String(channel.id || '');
    return {
      key: channel.key || ((id || channel.name) + '|' + url),
      id: id,
      name: channel.name,
      url: url,
      backupUrl: Core.safeHttpUrl(channel.backupUrl) || '',
      group: channel.group || 'Other',
      logo: channel.logo || '',
      number: String(channel.number || ''),
      language: channel.language || '',
      country: channel.country || '',
      sourcePage: channel.sourcePage || '',
      rights: channel.rights || '',
      verifiedAt: channel.verifiedAt || '',
      hlsNotes: channel.hlsNotes || '',
      source: channel.source || 'Saved playlist'
    };
  }

  function readSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!saved || !Array.isArray(saved.sources)) return false;
      state.sources = saved.sources.map(function (source, index) {
        const channels = (Array.isArray(source.channels) ? source.channels : []).map(normalizeChannel).filter(Boolean);
        return { id: String(source.id || 'saved-' + index), name: String(source.name || 'Playlist ' + (index + 1)), url: String(source.url || ''), channels: channels };
      }).filter(function (source) { return source.channels.length > 0; });
      if (Array.isArray(saved.favorites)) state.favorites = saved.favorites.filter(function (item) { return typeof item === 'string'; });
      if (Array.isArray(saved.recent)) state.recent = saved.recent.filter(function (item) { return typeof item === 'string'; }).slice(0, 12);
      if (saved.prefs && typeof saved.prefs === 'object') {
        state.prefs.resume = saved.prefs.resume !== false;
        state.prefs.startMuted = saved.prefs.startMuted === true;
        state.prefs.retries = Number.isFinite(saved.prefs.retries) ? Math.max(0, Math.min(3, saved.prefs.retries)) : 1;
        state.prefs.diagnostics = saved.prefs.diagnostics === true;
      }
      if (saved.guide && saved.guide.programs && typeof saved.guide.programs === 'object') {
        state.guide = saved.guide;
        state.guideUpdatedAt = Number.isFinite(saved.guideUpdatedAt) ? saved.guideUpdatedAt : 0;
      }
      state.guideUrl = String(saved.guideUrl || '');
      state.lastKey = String(saved.lastKey || '');
      return true;
    } catch (error) {
      state.sources = [];
      return false;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        sources: state.sources,
        favorites: state.favorites,
        recent: state.recent,
        prefs: state.prefs,
        guide: state.guide,
        guideUrl: state.guideUrl,
        guideUpdatedAt: state.guideUpdatedAt,
        lastKey: state.lastKey
      }));
      return true;
    } catch (error) {
      showToast('TV storage is full. Remove a playlist or a large guide and try again.');
      return false;
    }
  }

  function starterChannels() {
    if (window.FREEWAVE_STARTER && Array.isArray(window.FREEWAVE_STARTER.channels)) {
      return window.FREEWAVE_STARTER.channels.map(function (entry) {
        return normalizeChannel({
          key: (entry.tvgId || entry.name) + '|' + entry.url,
          id: entry.tvgId,
          name: entry.name,
          url: entry.url,
          backupUrl: entry.backupUrl,
          group: entry.category,
          number: entry.number,
          language: entry.language,
          country: entry.country,
          logo: entry.logo,
          sourcePage: entry.sourcePage,
          rights: entry.rights,
          verifiedAt: entry.verifiedAt,
          hlsNotes: entry.hlsNotes,
          source: 'FreeWave verified lineup'
        });
      }).filter(Boolean);
    }
    if (window.FREEWAVE_STARTER_PLAYLIST) return Core.parsePlaylist(window.FREEWAVE_STARTER_PLAYLIST, '', 'Free public starter list');
    return [];
  }

  function ensureStarterSource() {
    if (state.sources.length) return;
    const channels = starterChannels();
    if (channels.length) state.sources = [{ id: 'starter-public', name: 'FreeWave verified lineup', url: '', channels: channels }];
  }

  function getAllChannels() {
    const all = [];
    state.sources.forEach(function (source) {
      source.channels.forEach(function (channel) { all.push(channel); });
    });
    return Core.dedupeChannels(all);
  }

  function getVisibleChannels() {
    let list = Core.filterChannels(state.channels, {
      view: state.view,
      category: state.category,
      favorites: state.favorites,
      recent: state.recent,
      query: el.search.value
    });
    if (state.view === 'recent') list = Core.orderByKeys(list, state.recent);
    return list;
  }

  function currentChannel() {
    return state.channels.find(function (channel) { return channel.key === state.currentKey; }) || null;
  }

  function channelByKey(key) {
    return state.channels.find(function (channel) { return channel.key === key; }) || null;
  }

  function initials(name) {
    return String(name || 'TV').split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 3).toUpperCase();
  }

  function setLogo(container, channel, small) {
    container.textContent = '';
    if (channel && channel.logo) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = channel.logo;
      image.onerror = function () { container.textContent = initials(channel.name); };
      container.appendChild(image);
    } else {
      container.textContent = initials(channel ? channel.name : 'TV');
    }
    if (small) container.classList.add('station-logo');
  }

  function groupDescription(channel) {
    const language = channel.language ? channel.language + ' · ' : '';
    return language + (channel.group || 'Public') + ' · free live stream';
  }

  function makeChannelRow(channel, position) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'channel-row focusable' + (state.currentKey === channel.key ? ' selected' : '');
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', state.currentKey === channel.key ? 'true' : 'false');
    row.dataset.channelKey = channel.key;
    row.title = channel.name;

    const logo = document.createElement('span');
    setLogo(logo, channel, true);
    const info = document.createElement('span');
    info.className = 'channel-info';
    const name = document.createElement('span');
    name.className = 'channel-name';
    name.textContent = channel.name;
    const description = document.createElement('span');
    description.className = 'channel-description';
    description.textContent = groupDescription(channel);
    const tags = document.createElement('span');
    tags.className = 'channel-tags';
    const tag = document.createElement('span');
    tag.className = 'channel-tag';
    tag.textContent = channel.group || 'Public';
    tags.appendChild(tag);
    info.appendChild(name);
    info.appendChild(description);
    info.appendChild(tags);
    const number = document.createElement('span');
    number.className = 'channel-number-badge';
    number.textContent = channel.number || String(position + 1).padStart(2, '0');
    const favorite = state.favorites.indexOf(channel.key) !== -1;
    const star = document.createElement('span');
    star.className = 'row-star' + (favorite ? ' is-favorite' : '');
    star.textContent = favorite ? '★' : '☆';
    row.appendChild(logo);
    row.appendChild(info);
    row.appendChild(number);
    row.appendChild(star);
    row.addEventListener('click', function () { selectChannel(channel, true); });
    return row;
  }

  function renderCategoryNav() {
    const categories = [];
    state.channels.forEach(function (channel) {
      const group = channel.group || 'Other';
      if (categories.indexOf(group) === -1) categories.push(group);
    });
    categories.sort(function (left, right) { return left.localeCompare(right); });
    el.categoryNav.textContent = '';
    categories.forEach(function (group) {
      const count = state.channels.filter(function (channel) { return (channel.group || 'Other') === group; }).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-item category-item focusable' + (state.view === 'category' && state.category === group ? ' active' : '');
      button.dataset.view = 'category';
      button.dataset.category = group;
      button.innerHTML = '<span class="nav-symbol">◉</span><span class="category-name"></span><span class="nav-count"></span>';
      button.querySelector('.category-name').textContent = group;
      button.querySelector('.nav-count').textContent = String(count);
      button.addEventListener('click', function () { setView('category', group); });
      el.categoryNav.appendChild(button);
    });
  }

  function updateCounts() {
    el.allCount.textContent = String(state.channels.length);
    el.favoriteCount.textContent = String(state.favorites.filter(function (key) { return !!channelByKey(key); }).length);
    el.recentCount.textContent = String(state.recent.filter(function (key) { return !!channelByKey(key); }).length);
  }

  function renderChannels() {
    const active = document.activeElement;
    const hadRowFocus = !!(active && active.classList && active.classList.contains('channel-row'));
    const focusedKey = hadRowFocus ? active.dataset.channelKey : '';
    const visible = getVisibleChannels();
    el.channelList.textContent = '';
    el.channelList.hidden = visible.length === 0;
    el.emptyState.hidden = visible.length !== 0;
    el.channelCount.textContent = visible.length + (visible.length === 1 ? ' channel' : ' channels') + (state.view === 'favorites' ? ' in favorites' : state.view === 'recent' ? ' watched recently' : ' · free public streams');
    visible.forEach(function (channel, index) { el.channelList.appendChild(makeChannelRow(channel, index)); });

    const title = state.view === 'favorites' ? 'Favorites' : state.view === 'recent' ? 'Recently watched' : state.view === 'category' ? state.category : 'Live TV';
    el.sectionTitle.textContent = title;
    document.querySelectorAll('.sidebar [data-view]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.view === state.view && (button.dataset.view !== 'category' || button.dataset.category === state.category));
    });
    updateFavoriteButton();

    if (focusedKey) {
      const row = Array.prototype.find.call(el.channelList.querySelectorAll('.channel-row'), function (item) { return item.dataset.channelKey === focusedKey; });
      if (row) focusElement(row);
    }
  }

  function renderAll() {
    state.channels = getAllChannels();
    renderCategoryNav();
    updateCounts();
    renderChannels();
  }

  function setView(view, category) {
    state.view = view;
    state.category = category || '';
    renderAll();
    const first = el.channelList.querySelector('.channel-row');
    if (first) focusElement(first);
    else {
      const activeNav = document.querySelector('.sidebar .nav-item.active');
      if (activeNav) focusElement(activeNav);
    }
  }

  function updateNowCard(channel) {
    el.channelNumber.textContent = channel.number ? 'CH ' + channel.number : 'PUBLIC TV';
    el.currentChannelName.textContent = channel.name;
    el.currentChannelMeta.textContent = (channel.group || 'Public') + (channel.language ? ' · ' + channel.language : '') + ' · ' + (channel.source || 'Free public stream');
    setLogo(el.channelLogo, channel, false);
  }

  function setPlaybackMessage(message, isError) {
    el.playbackMessage.textContent = message || '';
    el.playbackMessage.hidden = !message;
    el.playbackMessage.classList.toggle('error', !!isError);
  }

  function applyMute(muted) {
    el.video.muted = !!muted;
    el.muteToggle.innerHTML = el.video.muted ? '◖ <span>MUTED</span>' : '◖ <span>SOUND</span>';
  }

  function syncPlayButton() {
    const playing = !!currentChannel() && !el.video.paused;
    el.playToggle.innerHTML = playing ? '❚❚ <span>PAUSE</span>' : '▶ <span>PLAY</span>';
    el.playToggle.setAttribute('aria-label', playing ? 'Pause live TV' : 'Play or resume live TV');
  }

  function startPlayback(channel, url, isRetry) {
    if (!channel) return;
    if (!isRetry) {
      state.playback.attempts = 0;
      state.playback.usingBackup = false;
    }
    const target = url || channel.url;
    if (isRetry || el.video.src !== target) {
      el.video.pause();
      el.video.src = target;
      el.video.load();
    }
    el.playerPlaceholder.hidden = false;
    setPlaybackMessage('Connecting to ' + channel.name + (target !== channel.url ? ' backup feed' : '') + '…', false);
    const attempt = el.video.play();
    syncPlayButton();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(function () {
        setPlaybackMessage('Press PLAY to start this stream. If it still will not play, check its format, region, or availability.', true);
      });
    }
  }

  function selectChannel(channel, shouldPlay) {
    if (!channel) return;
    state.currentKey = channel.key;
    state.lastKey = channel.key;
    updateNowCard(channel);
    setPlaybackMessage('', false);
    renderAll();
    updateGuideDisplay();
    if (!shouldPlay) { persist(); return; }
    state.recent = Core.pushRecent(state.recent, channel.key, 12);
    persist();
    startPlayback(channel, channel.url, false);
  }

  function updateFavoriteButton() {
    const channel = currentChannel();
    const favorite = !!channel && state.favorites.indexOf(channel.key) !== -1;
    el.favoriteToggle.classList.toggle('is-favorite', favorite);
    el.favoriteToggle.innerHTML = favorite ? '★ <span>FAVORITED</span>' : '☆ <span>FAVORITE</span>';
    el.favoriteToggle.setAttribute('aria-label', favorite ? 'Remove from favorites' : 'Add to favorites');
  }

  function toggleFavorite(channel) {
    const target = channel || currentChannel();
    if (!target) { showToast('Select a channel first.'); return; }
    const result = Core.toggleFavorite(state.favorites, target.key);
    state.favorites = result.list;
    persist();
    renderAll();
    showToast(result.added ? target.name + ' added to favorites.' : target.name + ' removed from favorites.');
  }

  function updateClock() {
    const date = new Date();
    el.clock.textContent = Core.formatClock(date.getTime()) + ' · LOCAL';
    el.localNow.textContent = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + Core.formatClock(date.getTime());
  }

  function updateGuideDisplay() {
    const channel = currentChannel();
    if (!channel || !channel.id) {
      el.programTitle.textContent = 'Add a guide to see what’s on';
      el.programTime.textContent = 'XMLTV guide not connected';
      el.programRemaining.textContent = '';
      el.programProgress.style.width = '0%';
      el.nextProgram.textContent = 'Connect an XMLTV guide in Setup';
      return;
    }
    const programs = (state.guide.programs && state.guide.programs[channel.id]) || [];
    const now = Date.now();
    const selection = Core.findNowAndNext(programs, now);
    if (selection.current) {
      const current = selection.current;
      const remainingMinutes = Math.max(0, Math.ceil((current.end - now) / 60000));
      el.programTitle.textContent = current.title;
      el.programTime.textContent = Core.formatClock(current.start) + ' – ' + Core.formatClock(current.end);
      el.programRemaining.textContent = remainingMinutes ? remainingMinutes + ' MIN LEFT' : '';
      el.programProgress.style.width = Core.progressPercent(current, now).toFixed(1) + '%';
    } else {
      el.programTitle.textContent = programs.length ? 'No current program listed' : 'No guide entries for this channel';
      el.programTime.textContent = state.guideUrl ? 'Guide loaded · no matching entry now' : 'XMLTV guide not connected';
      el.programRemaining.textContent = '';
      el.programProgress.style.width = '0%';
    }
    el.nextProgram.textContent = selection.next ? Core.formatClock(selection.next.start) + ' · ' + selection.next.title : (state.guideUrl ? 'No upcoming entry in guide' : 'Connect an XMLTV guide in Setup');
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { el.toast.hidden = true; }, 3200);
  }

  function setFeedback(target, message, isError) {
    if (!target) return;
    target.textContent = message || '';
    target.classList.toggle('error', !!isError);
  }

  function openSettings() {
    if (!el.modal.hidden) return;
    if (!el.guideModal.hidden) closeGuide();
    rememberFocus();
    el.modal.hidden = false;
    setScreen('settings');
    syncPrefsUi();
    syncDiagnosticsUi();
    renderSourceList();
    updateDiagnostics();
    if (state.guideUrl) el.epgUrl.value = state.guideUrl;
    setTimeout(function () { focusElement(el.playlistUrl); }, 50);
  }

  function closeSettings() {
    if (el.modal.hidden) return;
    el.modal.hidden = true;
    setScreen('home');
    if (!restoreFocus(state.lastFocused)) ensureFocus();
  }

  function renderSourceList() {
    el.sourceList.textContent = '';
    if (!state.sources.length) return;
    state.sources.forEach(function (source) {
      const row = document.createElement('div');
      row.className = 'source-row';
      const name = document.createElement('span');
      name.className = 'source-name';
      name.textContent = source.name + ' · ' + source.channels.length + (source.channels.length === 1 ? ' channel' : ' channels');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'source-remove focusable';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Remove ' + source.name);
      remove.addEventListener('click', function () { removeSource(source.id); });
      row.appendChild(name);
      row.appendChild(remove);
      el.sourceList.appendChild(row);
    });
  }

  function removeSource(id) {
    const source = state.sources.find(function (item) { return item.id === id; });
    state.sources = state.sources.filter(function (item) { return item.id !== id; });
    state.channels = getAllChannels();
    if (source && source.channels.some(function (channel) { return channel.key === state.currentKey; })) {
      state.currentKey = '';
      el.video.pause();
      el.video.removeAttribute('src');
      el.video.load();
      el.playerPlaceholder.hidden = false;
      setPlaybackMessage('', false);
      el.currentChannelName.textContent = 'Welcome to FreeWave';
      el.currentChannelMeta.textContent = 'Free public TV, ready when you are';
      el.programTitle.textContent = 'Add a guide to see what’s on';
      el.programTime.textContent = 'XMLTV guide not connected';
      el.nextProgram.textContent = 'Connect an XMLTV guide in Setup';
    }
    state.favorites = state.favorites.filter(function (key) { return !!channelByKey(key); });
    state.recent = state.recent.filter(function (key) { return !!channelByKey(key); });
    persist();
    renderSourceList();
    renderAll();
    showToast('Playlist removed.');
  }

  function createSource(name, url, text) {
    const channels = Core.parsePlaylist(text, url || '', name);
    if (!channels.length) throw new Error('No playable HTTP/HTTPS channels found. Check that the list has #EXTINF entries and stream URLs.');
    const source = { id: 'list-' + Date.now() + '-' + Math.floor(Math.random() * 1000), name: name || 'Imported playlist', url: url || '', channels: channels };
    state.sources.push(source);
    persist();
    renderSourceList();
    renderAll();
    setFeedback(el.playlistFeedback, 'Added ' + channels.length + ' channels from ' + source.name + '.', false);
    showToast(channels.length + ' channels added.');
  }

  function urlListName(url) {
    try { return new URL(url).hostname + ' playlist'; } catch (error) { return 'Imported playlist'; }
  }

  async function fetchText(url, timeoutMs) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : 0;
    try {
      const options = { mode: 'cors', credentials: 'omit', cache: 'no-cache' };
      if (controller) options.signal = controller.signal;
      const response = await fetch(url, options);
      if (!response.ok) throw new Error('Server returned ' + response.status + '.');
      return await response.text();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function loadPlaylistUrl() {
    const url = Core.safeHttpUrl(el.playlistUrl.value);
    if (!url) { setFeedback(el.playlistFeedback, 'Enter an HTTP or HTTPS playlist URL.', true); return; }
    setFeedback(el.playlistFeedback, 'Loading playlist…', false);
    try {
      const text = await fetchText(url, 20000);
      createSource(urlListName(url), url, text);
      el.playlistUrl.value = '';
    } catch (error) {
      setFeedback(el.playlistFeedback, 'Could not load this URL. The host may block TV apps with CORS; try a local file or paste the M3U text. ' + error.message, true);
    }
  }

  function loadPlaylistText(name, url, text) {
    try { createSource(name, url, text); el.playlistText.value = ''; }
    catch (error) { setFeedback(el.playlistFeedback, error.message, true); }
  }

  function readFile(file, callback, feedback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () { callback(String(reader.result || ''), file.name); };
    reader.onerror = function () { setFeedback(feedback, 'Could not read that file.', true); };
    reader.readAsText(file);
  }

  function guideChannelIds() {
    return state.channels.map(function (channel) { return channel.id; }).filter(Boolean);
  }

  function programCount() {
    return Object.keys(state.guide.programs || {}).reduce(function (sum, key) { return sum + state.guide.programs[key].length; }, 0);
  }

  function applyGuide(text, sourceLabel, url) {
    try {
      const guide = Core.parseXmltv(text, { channelIds: guideChannelIds() });
      const count = Object.keys(guide.programs).reduce(function (sum, key) { return sum + guide.programs[key].length; }, 0);
      state.guide = guide;
      state.guideUrl = url || '';
      state.guideUpdatedAt = Date.now();
      persist();
      updateGuideDisplay();
      if (!el.guideModal.hidden) renderGuide();
      setFeedback(el.epgFeedback, 'Loaded ' + Object.keys(guide.channels).length + ' guide channels and ' + count + ' schedule entries' + (sourceLabel ? ' from ' + sourceLabel : '') + '.', false);
      showToast(count ? 'Program guide loaded.' : 'Guide loaded, but no entries matched your channel IDs.');
    } catch (error) {
      setFeedback(el.epgFeedback, error.message || 'Could not read XMLTV guide.', true);
    }
  }

  async function loadEpgUrl() {
    const url = Core.safeHttpUrl(el.epgUrl.value);
    if (!url) { setFeedback(el.epgFeedback, 'Enter an HTTP or HTTPS XMLTV URL.', true); return; }
    setFeedback(el.epgFeedback, 'Loading XMLTV guide…', false);
    try {
      const text = await fetchText(url, 25000);
      if (text.length > 40000000) throw new Error('This XMLTV file is larger than 40 MB. Use a smaller or pre-filtered guide.');
      applyGuide(text, urlListName(url), url);
    } catch (error) {
      setFeedback(el.epgFeedback, 'Could not load this guide URL. The host may block TV apps with CORS; try an uncompressed local file or paste XMLTV. ' + error.message, true);
    }
  }

  async function refreshGuide(silent) {
    const url = Core.safeHttpUrl(state.guideUrl);
    if (!url) {
      if (!silent) setFeedback(el.prefsFeedback, 'No guide URL is saved. Add one under Program guide.', true);
      return;
    }
    if (!silent) setFeedback(el.prefsFeedback, 'Refreshing guide…', false);
    try {
      const text = await fetchText(url, 25000);
      applyGuide(text, urlListName(url), url);
      if (!silent) setFeedback(el.prefsFeedback, 'Guide refreshed.', false);
    } catch (error) {
      if (!silent) setFeedback(el.prefsFeedback, 'Guide refresh failed: ' + error.message, true);
    }
  }

  function syncPrefsUi() {
    el.prefResume.checked = !!state.prefs.resume;
    el.prefMuted.checked = !!state.prefs.startMuted;
    el.prefRetries.value = String(state.prefs.retries);
    if (el.prefDiagnostics) el.prefDiagnostics.checked = !!state.prefs.diagnostics;
  }

  function readPrefs() {
    state.prefs.resume = el.prefResume.checked;
    state.prefs.startMuted = el.prefMuted.checked;
    state.prefs.retries = Number(el.prefRetries.value) || 0;
    if (el.prefDiagnostics) state.prefs.diagnostics = el.prefDiagnostics.checked;
    persist();
    syncDiagnosticsUi();
    setFeedback(el.prefsFeedback, 'Playback preferences saved.', false);
  }

  function storageKb() {
    try { return Math.round((localStorage.getItem(STORE_KEY) || '').length / 1024); } catch (error) { return 0; }
  }

  function updateDiagnostics() {
    const channel = currentChannel();
    const video = el.video;
    const quality = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
    const rows = [
      ['Screen', state.screen + (state.previousScreen !== state.screen ? ' (from ' + state.previousScreen + ')' : '')],
      ['App version', APP_VERSION],
      ['Network', navigator.onLine ? 'Online' : 'Offline'],
      ['Current channel', channel ? channel.name : 'None selected'],
      ['Stream', channel ? Core.redactUrl(state.playback.usingBackup && channel.backupUrl ? channel.backupUrl : channel.url) : '—'],
      ['Player state', video.paused ? 'Paused' : video.readyState >= 2 ? 'Ready' : 'Loading'],
      ['Video size', video.videoWidth ? video.videoWidth + '×' + video.videoHeight : '—'],
      ['Audio decoded', video.webkitAudioDecodedByteCount ? Math.round(video.webkitAudioDecodedByteCount / 1024) + ' KB' : '—'],
      ['Dropped frames', quality ? String(quality.droppedVideoFrames) : '—'],
      ['Guide entries', String(programCount())],
      ['Guide updated', state.guideUpdatedAt ? new Date(state.guideUpdatedAt).toLocaleString() : 'Never'],
      ['Storage used', storageKb() + ' KB'],
      ['Last error', state.lastError || 'None']
    ];
    el.diagList.textContent = '';
    rows.forEach(function (pair) {
      const row = document.createElement('div');
      row.className = 'diag-row';
      const label = document.createElement('span');
      label.className = 'diag-label';
      label.textContent = pair[0];
      const value = document.createElement('span');
      value.className = 'diag-value';
      value.textContent = pair[1];
      row.appendChild(label);
      row.appendChild(value);
      el.diagList.appendChild(row);
    });
    el.appVersion.textContent = 'v' + APP_VERSION;
    updateDiagOverlay();
  }

  function runStreamCheck() {
    const channel = currentChannel();
    if (!channel) { setFeedback(el.diagFeedback, 'Select a channel first.', true); return; }
    setFeedback(el.diagFeedback, 'Checking ' + Core.redactUrl(channel.url) + '…', false);
    updateDiagnostics();
    fetch(channel.url, { mode: 'cors', credentials: 'omit', cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function (text) {
        const manifest = Core.analyzeManifest(text);
        if (!manifest.valid) throw new Error('response is not an HLS manifest');
        const parts = [
          manifest.isMaster ? 'Master playlist with ' + manifest.variants + ' renditions' : 'Media playlist',
          manifest.hasSegments ? 'segments present' : 'no segments in this manifest',
          manifest.encrypted ? 'encrypted (not playable)' : 'clear',
          manifest.hasProgramDateTime ? 'EXT-X-PROGRAM-DATE-TIME present' : 'no EXT-X-PROGRAM-DATE-TIME',
          manifest.targetDuration ? 'target duration ' + manifest.targetDuration + 's' : ''
        ].filter(Boolean);
        setFeedback(el.diagFeedback, parts.join(' · '), false);
      })
      .catch(function (error) {
        setFeedback(el.diagFeedback, 'Stream check failed: ' + error.message + '. A CORS block can stop this check even when playback works.', true);
      });
  }

  function handleVideoError() {
    const channel = currentChannel();
    if (!channel) return;
    const mediaError = el.video.error;
    const code = mediaError ? mediaError.code : 0;
    const info = Core.describeMediaError(code);
    state.lastError = info.message + (code ? ' (code ' + code + ')' : '');
    state.lastErrorAt = Date.now();
    const plan = info.retryable ? Core.planRetry(channel, state.playback.attempts, state.playback.usingBackup, state.prefs.retries) : null;
    if (plan) {
      state.playback.attempts = plan.attempts;
      state.playback.usingBackup = plan.usingBackup;
      setPlaybackMessage(plan.usingBackup ? 'Primary feed failed. Trying the backup feed…' : 'Reconnecting (attempt ' + plan.attempts + ')…', false);
      clearTimeout(state.playback.timer);
      state.playback.timer = setTimeout(function () { startPlayback(channel, plan.url, true); }, plan.delayMs);
      updateDiagnostics();
      return;
    }
    setPlaybackMessage(info.message, true);
    el.playerPlaceholder.hidden = false;
    updateDiagnostics();
  }

  function playCurrent() {
    const channel = currentChannel();
    if (!channel) { showToast('Select a channel first.'); return; }
    if (!el.video.src || el.video.error) startPlayback(channel, channel.url, false);
    else {
      const attempt = el.video.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(handleVideoError);
    }
  }

  function togglePlay() {
    if (!currentChannel()) { showToast('Select a channel first.'); return; }
    if (el.video.paused) playCurrent();
    else el.video.pause();
    syncPlayButton();
  }

  function toggleMute() {
    applyMute(!el.video.muted);
  }

  function reconnect() {
    const channel = currentChannel();
    if (!channel) { showToast('Select a channel first.'); return; }
    state.lastError = '';
    startPlayback(channel, channel.url, false);
  }

  function nextChannel(direction) {
    const visible = getVisibleChannels();
    const key = Core.nextChannelKey(visible, state.currentKey, direction);
    const channel = channelByKey(key);
    if (channel) selectChannel(channel, true);
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    el.networkLabel.textContent = online ? 'ONLINE' : 'OFFLINE';
    el.networkStatus.classList.toggle('offline', !online);
    el.networkStatus.setAttribute('aria-label', online ? 'Network online' : 'Network offline');
    updateDiagnostics();
  }

  function setScreen(screen) {
    if (screen === state.screen) return;
    state.previousScreen = state.screen;
    state.screen = screen;
    updateDiagOverlay();
  }

  function rememberFocus() {
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) state.lastFocused = active;
  }

  function focusElement(node) {
    if (!node || typeof node.focus !== 'function') return false;
    try { node.focus({ preventScroll: true }); } catch (error) { node.focus(); }
    if (node.scrollIntoView) {
      try { node.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (error) { }
    }
    updateDiagOverlay();
    return document.activeElement === node;
  }

  function restoreFocus(node) {
    if (node && node.isConnected && focusElement(node)) return true;
    return false;
  }

  function channelRowByKey(key) {
    return Array.prototype.find.call(el.channelList.querySelectorAll('.channel-row'), function (item) {
      return item.dataset.channelKey === key;
    }) || null;
  }

  function ensureFocus() {
    const scope = focusScope();
    const candidates = visibleFocusables(scope);
    if (!candidates.length) return false;
    const active = document.activeElement;
    if (active && candidates.indexOf(active) !== -1) return true;
    const preferred = scope === document ? channelRowByKey(state.currentKey) : null;
    return focusElement(preferred && candidates.indexOf(preferred) !== -1 ? preferred : candidates[0]);
  }

  function focusDescription(node) {
    if (!node || node === document.body || node === document.documentElement) return 'body (no control)';
    const label = node.getAttribute('aria-label') || node.getAttribute('title') || (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34) || node.id || node.tagName;
    const classes = node.classList && node.classList.length ? '.' + Array.prototype.slice.call(node.classList).slice(0, 2).join('.') : '';
    return node.tagName.toLowerCase() + (node.id ? '#' + node.id : classes) + ' · ' + label;
  }

  function updateDiagOverlay() {
    if (!el.diagOverlay) return;
    const channel = currentChannel();
    const log = state.keyLog;
    el.diagKey.textContent = log.key ? log.key + ' (' + log.code + ')' : '—';
    el.diagAction.textContent = log.action || '—';
    el.diagHandled.textContent = log.key ? (log.handled ? 'YES' : 'NO') : '—';
    el.diagFocus.textContent = focusDescription(document.activeElement);
    el.diagScreen.textContent = state.screen;
    el.diagPrevious.textContent = state.previousScreen;
    el.diagChannel.textContent = channel ? channel.name : 'None selected';
  }

  function syncDiagnosticsUi() {
    if (el.prefDiagnostics) el.prefDiagnostics.checked = !!state.prefs.diagnostics;
    if (el.diagOverlay) el.diagOverlay.hidden = !state.prefs.diagnostics;
    updateDiagOverlay();
  }

  function visibleFocusables(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'))
      .filter(function (item) {
        return !item.closest('[hidden]') && !item.closest('[inert]') && item.tabIndex >= 0 && item.getClientRects().length > 0;
      });
  }

  function focusScope() {
    if (!el.guideModal.hidden) return el.guideModal;
    if (!el.modal.hidden) return el.modal;
    return document;
  }

  function moveFocus(direction) {
    const active = document.activeElement;
    const candidates = visibleFocusables(focusScope());
    if (!candidates.length) return;
    if (!active || candidates.indexOf(active) === -1) { focusElement(candidates[0]); return; }
    const currentRect = active.getBoundingClientRect();
    const currentX = currentRect.left + currentRect.width / 2;
    const currentY = currentRect.top + currentRect.height / 2;
    let best = null;
    let bestScore = Infinity;
    candidates.forEach(function (candidate) {
      if (candidate === active) return;
      const rect = candidate.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const dx = x - currentX;
      const dy = y - currentY;
      const primary = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
      if (primary <= 1) return;
      const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
      const score = primary + secondary * 2.3;
      if (score < bestScore) { best = candidate; bestScore = score; }
    });
    if (best) { focusElement(best); return; }
    const index = candidates.indexOf(active);
    const step = direction === 'down' || direction === 'right' ? 1 : -1;
    focusElement(candidates[(index + step + candidates.length) % candidates.length]);
  }

  function activateFocused() {
    const active = document.activeElement;
    if (!active || active === document.body) {
      const row = channelRowByKey(state.currentKey);
      if (row) row.click();
      else playCurrent();
      return;
    }
    if (active.id === 'nowCard') { playCurrent(); return; }
    if (active.tagName === 'INPUT' && active.type === 'checkbox') { active.click(); return; }
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') { active.focus(); return; }
    if (typeof active.click === 'function') { active.click(); return; }
    const row = channelRowByKey(state.currentKey);
    if (row) row.click();
    else playCurrent();
  }

  function seekBy(seconds) {
    if (!currentChannel()) { showToast('Select a channel first.'); return; }
    try {
      const target = Math.max(0, Number(el.video.currentTime || 0) + seconds);
      el.video.currentTime = target;
      showToast(seconds < 0 ? 'Rewound 10 seconds.' : 'Forwarded 10 seconds.');
    } catch (error) {
      showToast('This live stream cannot seek right now.');
    }
  }

  function focusedChannel() {
    const row = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.channel-row, .guide-row') : null;
    if (!row) return null;
    return channelByKey(row.dataset.channelKey);
  }

  function focusChannelByNumber(number) {
    const channel = state.channels.find(function (candidate, index) {
      return String(candidate.number || index + 1) === String(number);
    });
    if (channel) selectChannel(channel, true);
  }

  function exitApp() {
    try {
      if (window.webOS && typeof window.webOS.platformBack === 'function') window.webOS.platformBack();
      else window.close();
    } catch (error) { }
  }

  function handleRemoteKey(event) {
    const key = String(event.key || event.code || '');
    const code = Number(event.keyCode || event.which || 0);
    const action = Core.remoteAction(key, code, false);
    state.keyLog = { key: key, code: code, action: action || 'none', handled: false };
    let handled = false;
    try {
      if (!action) return;
      const target = event.target;
      const isEditable = !!(target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

      if (action === 'back') {
        event.preventDefault();
        if (!el.guideModal.hidden) closeGuide();
        else if (!el.modal.hidden) closeSettings();
        else exitApp();
        handled = true;
        return;
      }

      if (isEditable) {
        if (action === 'up' || action === 'down') {
          event.preventDefault();
          moveFocus(action);
          handled = true;
          return;
        }
        if (action === 'select' && target.tagName === 'INPUT' && target.type === 'checkbox') {
          event.preventDefault();
          target.click();
          handled = true;
          return;
        }
        if (action === 'select' && target.tagName === 'SELECT') {
          event.preventDefault();
          target.focus();
          target.click();
          handled = true;
          return;
        }
        return;
      }

      if (action === 'left' || action === 'right' || action === 'up' || action === 'down') {
        event.preventDefault();
        moveFocus(action);
        handled = true;
        return;
      }
      if (action === 'select') {
        event.preventDefault();
        activateFocused();
        handled = true;
        return;
      }
      if (action === 'favorite') {
        event.preventDefault();
        toggleFavorite(focusedChannel() || currentChannel());
        handled = true;
        return;
      }
      if (action === 'settings') {
        event.preventDefault();
        openSettings();
        handled = true;
        return;
      }
      if (action === 'all' || action === 'favorites') {
        if (!el.modal.hidden || !el.guideModal.hidden) return;
        event.preventDefault();
        setView(action === 'all' ? 'all' : 'favorites');
        handled = true;
        return;
      }
      if (action === 'channel-up' || action === 'channel-down') {
        if (!el.modal.hidden || !el.guideModal.hidden) return;
        event.preventDefault();
        nextChannel(action === 'channel-up' ? 1 : -1);
        handled = true;
        return;
      }
      if (action === 'play') {
        event.preventDefault();
        playCurrent();
        handled = true;
        return;
      }
      if (action === 'pause' || action === 'stop') {
        event.preventDefault();
        el.video.pause();
        handled = true;
        return;
      }
      if (action === 'seek-back' || action === 'seek-forward') {
        event.preventDefault();
        seekBy(action === 'seek-back' ? -10 : 10);
        handled = true;
        return;
      }
      if (action === 'info' || action === 'guide') {
        if (!el.modal.hidden) return;
        event.preventDefault();
        openGuide();
        handled = true;
        return;
      }
      if (action === 'digit') {
        state.digitBuffer += key;
        clearTimeout(state.digitTimer);
        state.digitTimer = setTimeout(function () { focusChannelByNumber(state.digitBuffer); state.digitBuffer = ''; }, 900);
        handled = true;
      }
    } finally {
      state.keyLog.handled = handled;
      if (state.prefs.diagnostics) console.log('[freewave] remote ' + JSON.stringify(state.keyLog));
      updateDiagOverlay();
    }
  }

  function logPlaybackStats() {
    const channel = currentChannel();
    if (!channel || el.video.paused) return;
    const quality = el.video.getVideoPlaybackQuality ? el.video.getVideoPlaybackQuality() : null;
    console.log('[freewave] stats ' + JSON.stringify({
      version: APP_VERSION,
      channel: channel.name,
      url: Core.redactUrl(el.video.currentSrc || channel.url),
      readyState: el.video.readyState,
      paused: el.video.paused,
      currentTime: Number((el.video.currentTime || 0).toFixed(1)),
      videoWidth: el.video.videoWidth,
      videoHeight: el.video.videoHeight,
      audioDecodedBytes: el.video.webkitAudioDecodedByteCount || 0,
      videoDecodedBytes: el.video.webkitVideoDecodedByteCount || 0,
      droppedFrames: quality ? quality.droppedVideoFrames : 0,
      muted: el.video.muted
    }));
  }

  function openGuide() {
    if (!el.guideModal.hidden) return;
    if (!el.modal.hidden) closeSettings();
    rememberFocus();
    el.guideModal.hidden = false;
    setScreen('guide');
    renderGuide();
    const row = Array.prototype.find.call(el.guideList.querySelectorAll('.guide-row'), function (item) { return item.dataset.channelKey === state.currentKey; });
    setTimeout(function () { focusElement(row || el.guideList.querySelector('.guide-row') || $('closeGuide')); }, 40);
  }

  function closeGuide() {
    if (el.guideModal.hidden) return;
    el.guideModal.hidden = true;
    setScreen('home');
    if (!restoreFocus(channelRowByKey(state.currentKey))) ensureFocus();
  }

  function guideProgramLabel(program) {
    if (!program) return 'Unavailable';
    return Core.formatClock(program.start) + ' · ' + program.title;
  }

  function renderGuide() {
    const active = document.activeElement;
    const focusedGuideKey = active && active.classList && active.classList.contains('guide-row') ? active.dataset.channelKey : '';
    const channels = state.channels.slice(0, 60);
    const rows = Core.guideRows(channels, state.guide.programs, Date.now());
    const loadedChannels = Object.keys(state.guide.programs || {}).length;
    el.guideStatus.textContent = loadedChannels
      ? 'Guide entries: ' + programCount() + ' · ' + loadedChannels + ' channels · times in ' + Core.timeZoneLabel() + (state.guideUpdatedAt ? ' · updated ' + new Date(state.guideUpdatedAt).toLocaleTimeString() : '')
      : 'No guide data loaded. Programs are shown as unavailable until you import an XMLTV guide in Setup. Times use ' + Core.timeZoneLabel() + '.';
    el.guideList.textContent = '';
    rows.forEach(function (entry) {
      const channel = channelByKey(entry.key);
      if (!channel) return;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'guide-row focusable' + (entry.key === state.currentKey ? ' selected' : '');
      row.dataset.channelKey = entry.key;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', entry.key === state.currentKey ? 'true' : 'false');

      const channelCell = document.createElement('span');
      channelCell.className = 'guide-channel';
      const logo = document.createElement('span');
      setLogo(logo, channel, true);
      const titles = document.createElement('span');
      titles.className = 'guide-channel-titles';
      const name = document.createElement('span');
      name.className = 'guide-channel-name';
      name.textContent = channel.name;
      const meta = document.createElement('span');
      meta.className = 'guide-channel-meta';
      meta.textContent = (channel.number ? 'CH ' + channel.number + ' · ' : '') + (channel.group || 'Public');
      titles.appendChild(name);
      titles.appendChild(meta);
      channelCell.appendChild(logo);
      channelCell.appendChild(titles);

      const nowCell = document.createElement('span');
      nowCell.className = 'guide-program';
      const nowLabel = document.createElement('small');
      nowLabel.textContent = 'NOW';
      const nowTitle = document.createElement('span');
      nowTitle.textContent = entry.hasData ? (entry.current ? guideProgramLabel(entry.current) : 'No program listed now') : 'Guide data unavailable';
      nowCell.appendChild(nowLabel);
      nowCell.appendChild(nowTitle);

      const nextCell = document.createElement('span');
      nextCell.className = 'guide-program guide-next';
      const nextLabel = document.createElement('small');
      nextLabel.textContent = 'NEXT';
      const nextTitle = document.createElement('span');
      nextTitle.textContent = entry.next ? guideProgramLabel(entry.next) : (entry.hasData ? 'No next entry' : '—');
      nextCell.appendChild(nextLabel);
      nextCell.appendChild(nextTitle);

      row.appendChild(channelCell);
      row.appendChild(nowCell);
      row.appendChild(nextCell);
      row.addEventListener('focus', function () {
        const description = (entry.current && entry.current.description) || (entry.next && entry.next.description) || '';
        el.guideDetail.textContent = entry.hasData
          ? (entry.current ? entry.current.title : entry.next.title) + ' — ' + (description || 'No description provided by this guide source.')
          : channel.name + ' — no guide entries were supplied for this channel.';
      });
      row.addEventListener('click', function () {
        selectChannel(channel, true);
        closeGuide();
      });
      el.guideList.appendChild(row);
    });
    if (focusedGuideKey) {
      const nextRow = Array.prototype.find.call(el.guideList.querySelectorAll('.guide-row'), function (item) { return item.dataset.channelKey === focusedGuideKey; });
      if (nextRow) focusElement(nextRow);
    }
  }

  function wireUi() {
    document.querySelectorAll('.sidebar > [data-view]').forEach(function (button) {
      button.addEventListener('click', function () { setView(button.dataset.view); });
    });
    el.search.addEventListener('input', renderChannels);
    el.search.addEventListener('search', renderChannels);
    $('settingsButton').addEventListener('click', openSettings);
    $('settingsSidebarButton').addEventListener('click', openSettings);
    $('closeSettings').addEventListener('click', closeSettings);
    $('doneSettings').addEventListener('click', closeSettings);
    $('addPlaylistButton').addEventListener('click', openSettings);
    $('guideButton').addEventListener('click', openGuide);
    $('closeGuide').addEventListener('click', closeGuide);
    $('doneGuide').addEventListener('click', closeGuide);
    $('guideSetupButton').addEventListener('click', function () { closeGuide(); openSettings(); });
    $('importPlaylistUrl').addEventListener('click', loadPlaylistUrl);
    $('importPlaylistText').addEventListener('click', function () { loadPlaylistText('Pasted playlist', '', el.playlistText.value); });
    el.playlistFile.addEventListener('change', function () {
      const file = el.playlistFile.files && el.playlistFile.files[0];
      readFile(file, function (text, name) { loadPlaylistText(name, '', text); el.playlistFile.value = ''; }, el.playlistFeedback);
    });
    $('loadEpgUrl').addEventListener('click', loadEpgUrl);
    $('importEpgText').addEventListener('click', function () { applyGuide(el.epgText.value, 'pasted XMLTV', ''); });
    el.epgFile.addEventListener('change', function () {
      const file = el.epgFile.files && el.epgFile.files[0];
      readFile(file, function (text, name) { applyGuide(text, name, ''); el.epgFile.value = ''; }, el.epgFeedback);
    });
    $('refreshGuideButton').addEventListener('click', function () { refreshGuide(false); });
    $('clearFavoritesButton').addEventListener('click', function () {
      state.favorites = [];
      persist();
      renderAll();
      setFeedback(el.prefsFeedback, 'Favorites cleared.', false);
      showToast('Favorites cleared.');
    });
    $('runStreamCheck').addEventListener('click', runStreamCheck);
    el.prefResume.addEventListener('change', readPrefs);
    el.prefMuted.addEventListener('change', readPrefs);
    el.prefRetries.addEventListener('change', readPrefs);
    if (el.prefDiagnostics) el.prefDiagnostics.addEventListener('change', readPrefs);
    el.playToggle.addEventListener('click', togglePlay);
    el.muteToggle.addEventListener('click', toggleMute);
    el.favoriteToggle.addEventListener('click', function () { toggleFavorite(); });
    $('reloadButton').addEventListener('click', reconnect);
    $('prevButton').addEventListener('click', function () { nextChannel(-1); });
    $('nextButton').addEventListener('click', function () { nextChannel(1); });
    window.addEventListener('keydown', handleRemoteKey, true);
    window.addEventListener('online', function () { updateNetworkStatus(); showToast('Network restored.'); });
    window.addEventListener('offline', function () { updateNetworkStatus(); showToast('Network lost. Playback may stop.'); });
    document.addEventListener('focusin', function () { updateDiagOverlay(); });
    document.addEventListener('pointerdown', function (event) {
      const control = event.target && event.target.closest ? event.target.closest('button, input, select, textarea, [tabindex="0"]') : null;
      if (control) focusElement(control);
    }, true);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) setTimeout(ensureFocus, 80);
    });

    el.video.addEventListener('loadstart', function () { setPlaybackMessage('Connecting to the channel…', false); });
    el.video.addEventListener('waiting', function () { setPlaybackMessage('Buffering live video…', false); });
    el.video.addEventListener('playing', function () {
      setPlaybackMessage('', false);
      el.playerPlaceholder.hidden = true;
      syncPlayButton();
      updateDiagnostics();
      logPlaybackStats();
    });
    el.video.addEventListener('canplay', function () { if (!el.video.paused) el.playerPlaceholder.hidden = true; });
    el.video.addEventListener('pause', function () {
      const channel = currentChannel();
      syncPlayButton();
      if (channel && !el.video.error) setPlaybackMessage('Paused · press PLAY to resume.', false);
    });
    el.video.addEventListener('error', handleVideoError);
    el.video.addEventListener('volumechange', function () {
      el.muteToggle.innerHTML = el.video.muted ? '◖ <span>MUTED</span>' : '◖ <span>SOUND</span>';
    });
  }

  function initialize() {
    const hasSavedState = readSavedState();
    if (!hasSavedState || !state.sources.length) ensureStarterSource();
    state.channels = getAllChannels();
    syncPrefsUi();
    syncDiagnosticsUi();
    applyMute(state.prefs.startMuted);
    wireUi();
    renderAll();
    updateClock();
    updateGuideDisplay();
    updateNetworkStatus();
    syncPlayButton();
    updateDiagnostics();

    const target = (state.lastKey && channelByKey(state.lastKey)) || state.channels[0] || null;
    if (target) {
      state.currentKey = target.key;
      updateNowCard(target);
      renderAll();
      if (hasSavedState && state.prefs.resume) {
        setTimeout(function () { selectChannel(target, true); }, 700);
      }
    }
    setTimeout(function () { ensureFocus(); }, 120);

    setInterval(function () { updateClock(); updateGuideDisplay(); if (!el.guideModal.hidden) renderGuide(); }, 15000);
    setInterval(logPlaybackStats, 10000);
    setInterval(updateDiagnostics, 5000);
    if (state.guideUrl && navigator.onLine) setTimeout(function () { refreshGuide(true); }, 5000);
    setInterval(function () { if (state.guideUrl && navigator.onLine) refreshGuide(true); }, 6 * 3600 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
