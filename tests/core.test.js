'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../app/js/core.js');

test('parses M3U channel names, metadata, categories and safe relative HLS URLs', function () {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="public.one" tvg-name="Public One" tvg-logo="logos/one.png" tvg-chno="7" group-title="News",Public News, Local',
    '../stream/one.m3u8',
    '#EXTINF:-1 group-title="Education",Science TV',
    'https://streams.example/live/science.m3u8'
  ].join('\n');
  const channels = core.parsePlaylist(playlist, 'https://lists.example/region/channels.m3u', 'Test list');
  assert.equal(channels.length, 2);
  assert.equal(channels[0].name, 'Public News, Local');
  assert.equal(channels[0].id, 'public.one');
  assert.equal(channels[0].group, 'News');
  assert.equal(channels[0].number, '7');
  assert.equal(channels[0].url, 'https://lists.example/stream/one.m3u8');
  assert.equal(channels[0].logo, 'https://lists.example/region/logos/one.png');
  assert.equal(channels[1].source, 'Test list');
});

test('ignores playlist directives and rejects unsafe stream schemes', function () {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="safe" group-title="Public",Safe Channel',
    '#EXTVLCOPT:http-user-agent=example',
    'javascript:alert(1)',
    '#EXTINF:-1,Secure Channel',
    'https://public.example/live.m3u8'
  ].join('\n');
  const channels = core.parsePlaylist(playlist);
  assert.equal(channels.length, 1);
  assert.equal(channels[0].name, 'Secure Channel');
  assert.equal(core.safeHttpUrl('file:///etc/passwd'), null);
  assert.equal(core.safeHttpUrl('data:text/html,hi'), null);
});

test('decodes XML entities in M3U metadata', function () {
  const parsed = core.parsePlaylist('#EXTM3U\n#EXTINF:-1 group-title="Kids &amp; Family",Tom &amp; Jerry\nhttps://example.com/kids.m3u8');
  assert.equal(parsed[0].group, 'Kids & Family');
  assert.equal(parsed[0].name, 'Tom & Jerry');
});

test('parses XMLTV channel names and programmes with timezone offsets', function () {
  const now = Date.UTC(2026, 9, 29, 10, 30, 0);
  const xml = [
    '<?xml version="1.0"?>',
    '<tv>',
    '<channel id="news"><display-name>Public News</display-name></channel>',
    '<programme channel="news" start="20261029100000 +0000" stop="20261029110000 +0000">',
    '<title lang="en">Morning &amp; Noon</title><desc>Daily headlines</desc></programme>',
    '<programme channel="news" start="20261029130000 +0200" stop="20261029140000 +0200">',
    '<title>World Report</title></programme>',
    '</tv>'
  ].join('');
  const guide = core.parseXmltv(xml, { now: now });
  assert.equal(guide.channels.news, 'Public News');
  assert.equal(guide.programs.news.length, 2);
  assert.equal(guide.programs.news[0].title, 'Morning & Noon');
  assert.equal(guide.programs.news[0].description, 'Daily headlines');
  assert.equal(guide.programs.news[1].start, Date.UTC(2026, 9, 29, 11, 0, 0));
});

test('rejects non-XMLTV input and ignores malformed programme times', function () {
  assert.throws(function () { core.parseXmltv('<html>not a guide</html>'); }, /does not look like XMLTV/);
  const guide = core.parseXmltv('<tv><programme channel="x" start="bad" stop="also bad"><title>Skip</title></programme></tv>');
  assert.equal(Object.keys(guide.programs).length, 0);
});

test('finds current and next guide entries and bounds progress', function () {
  const now = 1000;
  const programs = [
    { start: 0, end: 2000, title: 'On now' },
    { start: 2500, end: 3500, title: 'Coming next' }
  ];
  const found = core.findNowAndNext(programs, now);
  assert.equal(found.current.title, 'On now');
  assert.equal(found.next.title, 'Coming next');
  assert.equal(core.progressPercent(programs[0], now), 50);
  assert.equal(core.progressPercent(programs[0], -100), 0);
  assert.equal(core.progressPercent(programs[0], 5000), 100);
});

test('reads backup, language, rights and source-page playlist attributes', function () {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="a.b" tvg-language="Arabic" tvg-country="DE" source-page="https://broadcaster.example/live" backup-url="https://cdn.example/backup.m3u8" rights-note="Official free stream" verified-at="2026-10-29" access-note="FREE LIVE" hls-note="No PDT tag",Example TV',
    'https://cdn.example/main.m3u8'
  ].join('\n');
  const channel = core.parsePlaylist(playlist, 'https://lists.example/channels.m3u')[0];
  assert.equal(channel.backupUrl, 'https://cdn.example/backup.m3u8');
  assert.equal(channel.language, 'Arabic');
  assert.equal(channel.country, 'DE');
  assert.equal(channel.sourcePage, 'https://broadcaster.example/live');
  assert.equal(channel.rights, 'Official free stream');
  assert.equal(channel.verifiedAt, '2026-10-29');
  assert.equal(channel.access, 'FREE LIVE');
  assert.equal(channel.hlsNotes, 'No PDT tag');
});

test('deduplicates repeated channels while preserving the first occurrence order', function () {
  const list = [
    { key: 'one|https://a', name: 'One', url: 'https://a' },
    { key: 'two|https://b', name: 'Two', url: 'https://b' },
    { key: 'one|https://a', name: 'One duplicate', url: 'https://a' }
  ];
  const result = core.dedupeChannels(list);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'One');
  assert.equal(result[1].name, 'Two');
});

test('filters channels by favorites, recent, category and free-text query', function () {
  const channels = [
    { key: 'a', name: 'Alpha News', group: 'News', id: 'a', language: 'English', country: 'US' },
    { key: 'b', name: 'Beta Sport', group: 'Sports', id: 'b', language: 'English', country: 'DE' },
    { key: 'c', name: 'Gamma', group: 'News', id: 'c', language: 'Arabic', country: 'DE' }
  ];
  assert.equal(core.filterChannels(channels, { view: 'favorites', favorites: ['b'] }).length, 1);
  assert.equal(core.filterChannels(channels, { view: 'recent', recent: ['c', 'a'] }).length, 2);
  assert.equal(core.filterChannels(channels, { view: 'category', category: 'News' }).length, 2);
  assert.equal(core.filterChannels(channels, { query: 'arabic' })[0].key, 'c');
  assert.equal(core.filterChannels(channels, { query: 'beta' })[0].key, 'b');
});

test('orders a recent-channel list by recency and toggles favorites immutably', function () {
  const channels = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
  assert.deepEqual(core.orderByKeys(channels, ['c', 'a']).map(function (item) { return item.key; }), ['c', 'a', 'b']);
  const added = core.toggleFavorite(['a'], 'b');
  assert.deepEqual(added.list, ['a', 'b']);
  assert.equal(added.added, true);
  const removed = core.toggleFavorite(['a', 'b'], 'a');
  assert.deepEqual(removed.list, ['b']);
  assert.equal(removed.added, false);
});

test('keeps recent channels unique and caps the list', function () {
  assert.deepEqual(core.pushRecent(['a', 'b'], 'a', 3), ['a', 'b']);
  assert.deepEqual(core.pushRecent(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
});

test('wraps channel switching in both directions', function () {
  const channels = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
  assert.equal(core.nextChannelKey(channels, 'a', 1), 'b');
  assert.equal(core.nextChannelKey(channels, 'c', 1), 'a');
  assert.equal(core.nextChannelKey(channels, 'a', -1), 'c');
  assert.equal(core.nextChannelKey(channels, 'missing', 1), 'a');
  assert.equal(core.nextChannelKey([], 'a', 1), null);
});

test('retries a backup first, then the primary, and stops at the limit', function () {
  const channel = { url: 'https://main.example/live.m3u8', backupUrl: 'https://backup.example/live.m3u8' };
  const first = core.planRetry(channel, 0, false, 1);
  assert.equal(first.url, channel.backupUrl);
  assert.equal(first.usingBackup, true);
  const second = core.planRetry(channel, 1, true, 1);
  assert.equal(second.url, channel.url);
  assert.equal(second.usingBackup, false);
  assert.equal(core.planRetry(channel, 2, false, 1), null);
  const noBackup = { url: channel.url, backupUrl: '' };
  assert.equal(core.planRetry(noBackup, 0, false, 0).url, channel.url);
  assert.equal(core.planRetry(noBackup, 1, false, 0), null);
});

test('maps media errors to useful messages and retryability', function () {
  assert.match(core.describeMediaError(2).message, /Network error/);
  assert.match(core.describeMediaError(3).message, /decode/);
  assert.equal(core.describeMediaError(3).retryable, false);
  assert.equal(core.describeMediaError(4).retryable, false);
  assert.equal(core.describeMediaError(2).retryable, true);
});

test('detects HLS manifest type, encryption, discontinuities and program-date-time', function () {
  const master = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nstream.m3u8\n';
  const parsedMaster = core.analyzeManifest(master);
  assert.equal(parsedMaster.valid, true);
  assert.equal(parsedMaster.isMaster, true);
  assert.equal(parsedMaster.variants, 1);
  assert.equal(parsedMaster.encrypted, false);

  const media = [
    '#EXTM3U',
    '#EXT-X-TARGETDURATION:6',
    '#EXT-X-DISCONTINUITY',
    '#EXT-X-PROGRAM-DATE-TIME:2026-10-29T10:00:00Z',
    '#EXTINF:6.0,',
    'segment1.ts',
    '#EXT-X-KEY:METHOD=AES-128,URI="https://keys.example/key"',
    '#EXTINF:6.0,',
    'segment2.ts'
  ].join('\n');
  const parsedMedia = core.analyzeManifest(media);
  assert.equal(parsedMedia.isMaster, false);
  assert.equal(parsedMedia.hasSegments, true);
  assert.equal(parsedMedia.hasProgramDateTime, true);
  assert.equal(parsedMedia.programDateTimeCount, 1);
  assert.equal(parsedMedia.encrypted, true);
  assert.equal(parsedMedia.hasDiscontinuity, true);
  assert.equal(parsedMedia.targetDuration, 6);

  assert.equal(core.analyzeManifest('<html>nope</html>').valid, false);
  assert.equal(core.analyzeManifest('#EXTM3U\n#EXT-X-KEY:METHOD=NONE\n#EXTINF:1,\na.ts').encrypted, false);
});

test('redacts credentials and query strings from stream URLs used in logs', function () {
  const redacted = core.redactUrl('https://user:pass@cdn.example/live/playlist.m3u8?token=secret');
  assert.equal(redacted, 'https://cdn.example/live/playlist.m3u8');
  assert.equal(redacted.indexOf('secret'), -1);
  assert.equal(core.redactUrl('not a url?token=abc'), 'not a url');
});

test('maps webOS remote codes and keys to predictable actions', function () {
  assert.equal(core.remoteAction('ArrowUp', 38, false), 'up');
  assert.equal(core.remoteAction('', 40, false), 'down');
  assert.equal(core.remoteAction('Enter', 13, false), 'select');
  assert.equal(core.remoteAction('', 461, false), 'back');
  assert.equal(core.remoteAction('', 405, false), 'favorite');
  assert.equal(core.remoteAction('', 406, false), 'settings');
  assert.equal(core.remoteAction('', 427, false), 'channel-up');
  assert.equal(core.remoteAction('', 428, false), 'channel-down');
  assert.equal(core.remoteAction('', 415, false), 'play');
  assert.equal(core.remoteAction('', 19, false), 'pause');
  assert.equal(core.remoteAction('', 457, false), 'info');
  assert.equal(core.remoteAction('7', 55, false), 'digit');
  assert.equal(core.remoteAction('ArrowDown', 40, true), null);
  assert.equal(core.remoteAction('Escape', 27, true), 'back');
  assert.equal(core.remoteAction('y', 89, true), null);
});

test('accepts webOS key names as well as Chromium key names and raw codes', function () {
  assert.equal(core.remoteAction('GoBack', 461, false), 'back');
  assert.equal(core.remoteAction('Back', 461, false), 'back');
  assert.equal(core.remoteAction('XF86Back', 461, false), 'back');
  assert.equal(core.remoteAction('OK', 13, false), 'select');
  assert.equal(core.remoteAction('Select', 13, false), 'select');
  assert.equal(core.remoteAction('Up', 38, false), 'up');
  assert.equal(core.remoteAction('MediaFastForward', 417, false), 'seek-forward');
  assert.equal(core.remoteAction('MediaRewind', 412, false), 'seek-back');
});

test('builds guide rows with explicit unavailable data instead of invented programs', function () {
  const now = 10000;
  const channels = [
    { key: 'a', id: 'a', name: 'Alpha', number: '1', group: 'News' },
    { key: 'b', id: 'b', name: 'Beta', number: '2', group: 'Sports' }
  ];
  const programs = {
    a: [{ start: 9000, end: 12000, title: 'Now on Alpha' }, { start: 12000, end: 14000, title: 'Later' }]
  };
  const rows = core.guideRows(channels, programs, now);
  assert.equal(rows[0].hasData, true);
  assert.equal(rows[0].current.title, 'Now on Alpha');
  assert.equal(rows[0].next.title, 'Later');
  assert.equal(rows[1].hasData, false);
  assert.equal(rows[1].current, null);
  assert.equal(rows[1].next, null);
});

test('schedules only upcoming programs for a channel in start order', function () {
  const now = 10000;
  const programs = [
    { start: 9000, end: 12000, title: 'Current' },
    { start: 15000, end: 16000, title: 'Second' },
    { start: 12000, end: 15000, title: 'First' },
    { start: 1000, end: 2000, title: 'Finished' }
  ];
  const schedule = core.scheduleForChannel(programs, now, 2);
  assert.equal(schedule.current.title, 'Current');
  assert.deepEqual(schedule.upcoming.map(function (item) { return item.title; }), ['Current', 'First']);
});

test('converts XMLTV negative offsets and filters to requested channel ids', function () {
  assert.equal(core.parseXmltvDate('20261029090000 -0500'), Date.UTC(2026, 9, 29, 14, 0, 0));
  const xml = [
    '<tv>',
    '<channel id="keep"><display-name>Keep</display-name></channel>',
    '<channel id="drop"><display-name>Drop</display-name></channel>',
    '<programme channel="keep" start="20261029100000 +0000" stop="20261029110000 +0000"><title>Kept</title></programme>',
    '<programme channel="drop" start="20261029100000 +0000" stop="20261029110000 +0000"><title>Dropped</title></programme>',
    '</tv>'
  ].join('');
  const guide = core.parseXmltv(xml, { now: Date.UTC(2026, 9, 29, 10, 30, 0), channelIds: ['keep'] });
  assert.deepEqual(Object.keys(guide.channels), ['keep']);
  assert.deepEqual(Object.keys(guide.programs), ['keep']);
});

test('formats clock values and exposes a timezone label', function () {
  assert.equal(typeof core.formatClock(Date.UTC(2026, 9, 29, 10, 0, 0)), 'string');
  assert.ok(core.formatClock(Date.UTC(2026, 9, 29, 10, 0, 0)).length > 0);
  assert.equal(typeof core.timeZoneLabel(), 'string');
});
