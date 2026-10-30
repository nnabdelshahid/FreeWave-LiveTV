'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../app/js/core.js');
const lineup = require('../scripts/build-lineup.js');

const project = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(project, 'data', 'channels.json'), 'utf8'));
const verified = manifest.channels.filter(function (channel) { return channel.status === 'verified'; });

test('channel manifest carries rights, availability, codec and verification evidence per channel', function () {
  assert.ok(verified.length >= 5, 'expected a validated starter lineup');
  const ids = new Set();
  const numbers = new Set();
  const urls = new Set();
  verified.forEach(function (channel) {
    assert.match(channel.url, /^https:\/\//, channel.name + ' must use HTTPS');
    assert.match(channel.sourcePage, /^https:\/\//, channel.name + ' needs an official source page');
    assert.ok(channel.rights && channel.rights.length > 20, channel.name + ' needs rights evidence');
    assert.ok(channel.codecs, channel.name + ' needs codec evidence');
    assert.ok(channel.hlsNotes, channel.name + ' needs HLS notes');
    assert.equal(channel.verifiedAt, '2026-10-29', channel.name + ' needs a validation date');
    assert.ok(channel.language && channel.country, channel.name + ' needs language and country');
    assert.ok(!ids.has(channel.tvgId), 'duplicate tvg-id ' + channel.tvgId);
    assert.ok(!numbers.has(channel.number), 'duplicate channel number ' + channel.number);
    assert.ok(!urls.has(channel.url), 'duplicate stream URL ' + channel.url);
    ids.add(channel.tvgId);
    numbers.add(channel.number);
    urls.add(channel.url);
  });
});

test('channel manifest does not ship sources that failed validation', function () {
  const blockedHosts = ['trt.com.tr', 'getaj.net', 'france24.com', 'nasa.gov', 'akamaized.net/hls/live/2014075'];
  const all = JSON.stringify(manifest.channels.map(function (channel) { return channel.url; }));
  blockedHosts.forEach(function (host) {
    assert.equal(all.indexOf(host), -1, 'unverified source must not be shipped: ' + host);
  });
});

test('generated M3U matches the canonical manifest exactly', function () {
  const generated = fs.readFileSync(path.join(project, 'app', 'data', 'public-channels.m3u'), 'utf8');
  assert.equal(generated, lineup.toM3u(verified));
  const parsed = Core.parsePlaylist(generated, '', 'test');
  assert.equal(parsed.length, verified.length);
  assert.equal(parsed[0].id, verified[0].tvgId);
  assert.equal(parsed[0].rights, verified[0].rights);
});

test('bundled starter script exposes the same channels without network access', function () {
  const starter = fs.readFileSync(path.join(project, 'app', 'default-playlist.js'), 'utf8');
  verified.forEach(function (channel) {
    assert.ok(starter.indexOf(channel.url) !== -1, channel.name + ' missing from default-playlist.js; run npm run build:lineup');
  });
});

test('every category in the starter lineup is populated by at least one channel', function () {
  const categories = new Set(verified.map(function (channel) { return channel.category; }));
  assert.ok(categories.has('News'));
  categories.forEach(function (category) {
    assert.ok(verified.filter(function (channel) { return channel.category === category; }).length >= 1, category + ' is empty');
  });
});
