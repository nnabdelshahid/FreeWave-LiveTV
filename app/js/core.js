(function (root) {
  'use strict';

  const MAX_CHANNELS = 1500;
  const MAX_PROGRAMS_PER_CHANNEL = 120;

  function decodeEntities(value) {
    return String(value || '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (entity, code) {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (code.charAt(0) !== '#') return named[code.toLowerCase()] || entity;
      const number = code.charAt(1).toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      if (!Number.isFinite(number) || number < 0 || number > 0x10ffff) return entity;
      try { return String.fromCodePoint(number); } catch (error) { return entity; }
    }).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  }

  function readAttributes(text) {
    const result = {};
    const expression = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match;
    while ((match = expression.exec(text))) result[match[1].toLowerCase()] = decodeEntities(match[2] === undefined ? match[3] : match[2]);
    return result;
  }

  function findUnquotedComma(text) {
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === '"') quoted = !quoted;
      if (text[index] === ',' && !quoted) return index;
    }
    return -1;
  }

  function safeHttpUrl(raw, baseUrl) {
    const value = String(raw || '').trim();
    if (!value || value.charAt(0) === '#') return null;
    try {
      const parsed = new URL(value, baseUrl || undefined);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      if (parsed.username || parsed.password) return null;
      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  function parsePlaylist(input, baseUrl, sourceLabel) {
    const text = String(input || '').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/);
    const channels = [];
    let pending = null;
    let nextGroup = '';
    const source = sourceLabel || 'Imported playlist';

    for (let index = 0; index < lines.length && channels.length < MAX_CHANNELS; index += 1) {
      const line = lines[index].trim();
      if (!line) continue;
      if (/^#EXTGRP:/i.test(line)) {
        nextGroup = decodeEntities(line.slice(line.indexOf(':') + 1).trim());
        continue;
      }
      if (/^#EXTINF:/i.test(line)) {
        const content = line.slice(line.indexOf(':') + 1);
        const comma = findUnquotedComma(content);
        const metadata = comma >= 0 ? content.slice(0, comma) : content;
        const title = comma >= 0 ? decodeEntities(content.slice(comma + 1).trim()) : '';
        const attributes = readAttributes(metadata);
        pending = { title: title || attributes['tvg-name'] || 'Unnamed channel', attributes: attributes, group: nextGroup };
        nextGroup = '';
        continue;
      }
      if (line.charAt(0) === '#') continue;
      const url = safeHttpUrl(line, baseUrl);
      if (!url) { pending = null; continue; }
      const metadata = pending || { title: 'Channel ' + (channels.length + 1), attributes: {}, group: nextGroup };
      const attributes = metadata.attributes;
      const name = metadata.title || attributes['tvg-name'] || 'Channel ' + (channels.length + 1);
      const group = attributes['group-title'] || metadata.group || 'Other';
      const tvgId = attributes['tvg-id'] || '';
      const backupUrl = safeHttpUrl(attributes['backup-url'], baseUrl) || '';
      channels.push({
        key: (tvgId || name) + '|' + url,
        id: tvgId,
        name: name,
        url: url,
        backupUrl: backupUrl,
        group: group,
        logo: safeHttpUrl(attributes['tvg-logo'], baseUrl) || '',
        number: attributes['tvg-chno'] || '',
        language: attributes['tvg-language'] || '',
        country: attributes['tvg-country'] || '',
        sourcePage: safeHttpUrl(attributes['source-page'], baseUrl) || '',
        rights: attributes['rights-note'] || '',
        verifiedAt: attributes['verified-at'] || '',
        hlsNotes: attributes['hls-note'] || '',
        source: source
      });
      pending = null;
    }
    return channels;
  }

  function dedupeChannels(channels) {
    const seen = Object.create(null);
    const result = [];
    (channels || []).forEach(function (channel) {
      if (!channel) return;
      const key = channel.key || ((channel.id || channel.name) + '|' + channel.url);
      if (seen[key]) return;
      seen[key] = true;
      channel.key = key;
      result.push(channel);
    });
    return result;
  }

  function filterChannels(channels, options) {
    const settings = options || {};
    const view = settings.view || 'all';
    const query = String(settings.query || '').trim().toLowerCase();
    const favorites = settings.favorites || [];
    const recent = settings.recent || [];
    return (channels || []).filter(function (channel) {
      if (view === 'favorites' && favorites.indexOf(channel.key) === -1) return false;
      if (view === 'recent' && recent.indexOf(channel.key) === -1) return false;
      if (view === 'category' && channel.group !== settings.category) return false;
      if (!query) return true;
      return (channel.name + ' ' + channel.group + ' ' + (channel.id || '') + ' ' + (channel.language || '') + ' ' + (channel.country || '')).toLowerCase().indexOf(query) !== -1;
    });
  }

  function orderByKeys(list, keys) {
    const position = Object.create(null);
    (keys || []).forEach(function (key, index) { position[key] = index; });
    return (list || []).slice().sort(function (left, right) {
      const leftIndex = position[left.key] === undefined ? Number.MAX_SAFE_INTEGER : position[left.key];
      const rightIndex = position[right.key] === undefined ? Number.MAX_SAFE_INTEGER : position[right.key];
      return leftIndex - rightIndex;
    });
  }

  function toggleFavorite(favorites, key) {
    const list = (favorites || []).slice();
    const index = list.indexOf(key);
    if (index === -1) list.push(key);
    else list.splice(index, 1);
    return { list: list, added: index === -1 };
  }

  function pushRecent(recent, key, limit) {
    const maximum = Number.isFinite(limit) ? limit : 12;
    const list = (recent || []).filter(function (item) { return item !== key; });
    list.unshift(key);
    return list.slice(0, maximum);
  }

  function nextChannelKey(channels, currentKey, direction) {
    const list = channels || [];
    if (!list.length) return null;
    const index = list.findIndex(function (channel) { return channel.key === currentKey; });
    const step = direction < 0 ? -1 : 1;
    const nextIndex = index < 0 ? 0 : (index + step + list.length) % list.length;
    return list[nextIndex].key;
  }

  function planRetry(channel, failedAttempts, usingBackup, maxRetries) {
    if (!channel) return null;
    const attempts = Number.isFinite(failedAttempts) ? failedAttempts : 0;
    const limit = Number.isFinite(maxRetries) ? maxRetries : 1;
    if (!usingBackup && channel.backupUrl && attempts === 0) {
      return { url: channel.backupUrl, usingBackup: true, attempts: attempts + 1, delayMs: 900 };
    }
    if (attempts <= limit) {
      return { url: channel.url, usingBackup: false, attempts: attempts + 1, delayMs: 1500 + attempts * 1500 };
    }
    return null;
  }

  function describeMediaError(code) {
    if (code === 1) return { message: 'Playback was interrupted. Press PLAY to continue.', retryable: true };
    if (code === 2) return { message: 'Network error. Check the TV internet connection or the channel’s availability.', retryable: true };
    if (code === 3) return { message: 'The TV could not decode this stream. It needs H.264 video and AAC audio.', retryable: false };
    if (code === 4) return { message: 'This stream format or address is not supported by the TV player.', retryable: false };
    return { message: 'Playback stopped. Try reconnecting or choose another channel.', retryable: true };
  }

  function analyzeManifest(input) {
    const text = String(input || '');
    const valid = /^\s*#EXTM3U/i.test(text);
    const variants = (text.match(/#EXT-X-STREAM-INF/gi) || []).length;
    const keyLines = text.match(/#EXT-X-KEY:([^\r\n]+)/gi) || [];
    const encrypted = keyLines.some(function (line) { return !/METHOD\s*=\s*NONE/i.test(line); });
    const target = text.match(/#EXT-X-TARGETDURATION:\s*([\d.]+)/i);
    return {
      valid: valid,
      isMaster: variants > 0,
      variants: variants,
      hasSegments: /#EXTINF:/i.test(text),
      hasProgramDateTime: /#EXT-X-PROGRAM-DATE-TIME/i.test(text),
      programDateTimeCount: (text.match(/#EXT-X-PROGRAM-DATE-TIME/gi) || []).length,
      encrypted: encrypted,
      hasDiscontinuity: /#EXT-X-DISCONTINUITY(?!-SEQUENCE)/i.test(text),
      independentSegments: /#EXT-X-INDEPENDENT-SEGMENTS/i.test(text),
      ended: /#EXT-X-ENDLIST/i.test(text),
      targetDuration: target ? Number(target[1]) : null
    };
  }

  function redactUrl(raw) {
    const value = String(raw || '');
    if (!value) return '';
    try {
      const parsed = new URL(value);
      const path = parsed.pathname.length > 46 ? parsed.pathname.slice(0, 46) + '…' : parsed.pathname;
      return parsed.protocol + '//' + parsed.host + path;
    } catch (error) {
      return value.split('?')[0].slice(0, 80);
    }
  }

  function parseXmltvDate(value) {
    const match = String(value || '').trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?/);
    if (!match) return null;
    const localAsUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]));
    if (!match[7]) return localAsUtc;
    const offset = (Number(match[8]) * 60 + Number(match[9])) * 60000;
    return localAsUtc - (match[7] === '+' ? offset : -offset);
  }

  function tagText(xml, tagName) {
    const expression = new RegExp('<' + tagName + '\\b[^>]*>([\\s\\S]*?)<\\/' + tagName + '\\s*>', 'i');
    const match = String(xml || '').match(expression);
    return match ? decodeEntities(match[1].replace(/<[^>]+>/g, '').trim()) : '';
  }

  function parseXmltv(input, options) {
    const text = String(input || '').replace(/^\uFEFF/, '');
    if (!/<tv(?:\s|>)/i.test(text)) throw new Error('This file does not look like XMLTV.');
    const settings = options || {};
    const now = Number.isFinite(settings.now) ? settings.now : Date.now();
    const from = now - (Number.isFinite(settings.pastHours) ? settings.pastHours : 6) * 3600000;
    const until = now + (Number.isFinite(settings.futureHours) ? settings.futureHours : 48) * 3600000;
    const allowedIds = Array.isArray(settings.channelIds) ? Object.create(null) : null;
    if (allowedIds) settings.channelIds.forEach(function (id) { allowedIds[String(id)] = true; });
    const channelNames = Object.create(null);
    const channelExpression = /<channel\b([^>]*)>([\s\S]*?)<\/channel\s*>/gi;
    let match;
    while ((match = channelExpression.exec(text))) {
      const attributes = readAttributes(match[1]);
      if (!attributes.id) continue;
      if (allowedIds && !allowedIds[attributes.id]) continue;
      const display = tagText(match[2], 'display-name');
      channelNames[attributes.id] = display || attributes.id;
    }

    const programsByChannel = Object.create(null);
    const programExpression = /<programme\b([^>]*)>([\s\S]*?)<\/programme\s*>/gi;
    while ((match = programExpression.exec(text))) {
      const attributes = readAttributes(match[1]);
      if (!attributes.channel) continue;
      if (allowedIds && !allowedIds[attributes.channel]) continue;
      const start = parseXmltvDate(attributes.start);
      const end = parseXmltvDate(attributes.stop);
      if (start === null || end === null || end <= start || end < from || start > until) continue;
      const title = tagText(match[2], 'title') || 'Program';
      const description = tagText(match[2], 'desc');
      if (!programsByChannel[attributes.channel]) programsByChannel[attributes.channel] = [];
      const list = programsByChannel[attributes.channel];
      if (list.length >= MAX_PROGRAMS_PER_CHANNEL) continue;
      list.push({ start: start, end: end, title: title, description: description });
    }
    Object.keys(programsByChannel).forEach(function (channelId) {
      programsByChannel[channelId].sort(function (left, right) { return left.start - right.start; });
    });
    return { channels: channelNames, programs: programsByChannel };
  }

  function findNowAndNext(programs, now) {
    const time = Number.isFinite(now) ? now : Date.now();
    const items = Array.isArray(programs) ? programs : [];
    let current = null;
    let next = null;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.start <= time && item.end > time) current = item;
      else if (item.start > time && (!next || item.start < next.start)) next = item;
    }
    return { current: current, next: next };
  }

  function scheduleForChannel(programs, now, count) {
    const time = Number.isFinite(now) ? now : Date.now();
    const limit = Number.isFinite(count) ? count : 8;
    const selection = findNowAndNext(programs, time);
    const upcoming = (Array.isArray(programs) ? programs : [])
      .filter(function (item) { return item.end > time; })
      .sort(function (left, right) { return left.start - right.start; })
      .slice(0, limit);
    return { current: selection.current, next: selection.next, upcoming: upcoming };
  }

  function guideRows(channels, programsByChannel, now) {
    const time = Number.isFinite(now) ? now : Date.now();
    const programs = programsByChannel || {};
    return (channels || []).map(function (channel) {
      const list = programs[channel.id] || [];
      const selection = findNowAndNext(list, time);
      return {
        key: channel.key,
        name: channel.name,
        number: channel.number,
        group: channel.group,
        current: selection.current,
        next: selection.next,
        hasData: !!selection.current || !!selection.next
      };
    });
  }

  function progressPercent(program, now) {
    if (!program || !Number.isFinite(program.start) || !Number.isFinite(program.end) || program.end <= program.start) return 0;
    const time = Number.isFinite(now) ? now : Date.now();
    return Math.max(0, Math.min(100, ((time - program.start) / (program.end - program.start)) * 100));
  }

  function formatClock(timestamp, locale) {
    try {
      return new Intl.DateTimeFormat(locale || undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
    } catch (error) {
      return new Date(timestamp).toLocaleTimeString();
    }
  }

  function timeZoneLabel() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
    } catch (error) {
      return 'local time';
    }
  }

  const KEY_ACTIONS = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down',
    13: 'select',
    461: 'back', 27: 'back', 8: 'back',
    403: 'all', 404: 'favorites', 405: 'favorite', 406: 'settings',
    427: 'channel-up', 428: 'channel-down',
    415: 'play', 19: 'pause', 413: 'stop', 412: 'seek-back', 417: 'seek-forward',
    457: 'info', 458: 'guide', 459: 'guide'
  };

  const KEY_NAMES = {
    ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down',
    Left: 'left', Up: 'up', Right: 'right', Down: 'down',
    Enter: 'select', OK: 'select', Select: 'select', Return: 'select',
    Escape: 'back', Backspace: 'back', GoBack: 'back', Back: 'back', Exit: 'back', XF86Back: 'back',
    ChannelUp: 'channel-up', ChannelDown: 'channel-down', PageUp: 'channel-up', PageDown: 'channel-down',
    MediaPlay: 'play', MediaPlayPause: 'play', MediaPause: 'pause', MediaStop: 'stop',
    MediaFastForward: 'seek-forward', MediaRewind: 'seek-back',
    ColorF1: 'all', ColorF2: 'favorites', ColorF3: 'favorite', ColorF4: 'settings',
    Info: 'info', Guide: 'guide'
  };

  function remoteAction(key, code, isEditable) {
    if (isEditable) return (key === 'Escape' || code === 461) ? 'back' : null;
    if (KEY_NAMES[key]) return KEY_NAMES[key];
    if (key === 'y' || key === 'Y') return 'favorite';
    if (/^\d$/.test(key || '')) return 'digit';
    return KEY_ACTIONS[code] || null;
  }

  const api = {
    MAX_CHANNELS: MAX_CHANNELS,
    MAX_PROGRAMS_PER_CHANNEL: MAX_PROGRAMS_PER_CHANNEL,
    decodeEntities: decodeEntities,
    parsePlaylist: parsePlaylist,
    dedupeChannels: dedupeChannels,
    filterChannels: filterChannels,
    orderByKeys: orderByKeys,
    toggleFavorite: toggleFavorite,
    pushRecent: pushRecent,
    nextChannelKey: nextChannelKey,
    planRetry: planRetry,
    describeMediaError: describeMediaError,
    analyzeManifest: analyzeManifest,
    redactUrl: redactUrl,
    parseXmltv: parseXmltv,
    parseXmltvDate: parseXmltvDate,
    findNowAndNext: findNowAndNext,
    scheduleForChannel: scheduleForChannel,
    guideRows: guideRows,
    progressPercent: progressPercent,
    formatClock: formatClock,
    timeZoneLabel: timeZoneLabel,
    remoteAction: remoteAction,
    safeHttpUrl: safeHttpUrl
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FreewaveCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
