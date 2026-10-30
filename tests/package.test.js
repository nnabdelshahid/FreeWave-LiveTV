'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../app/js/core.js');

const project = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));

test('webOS package metadata targets the supported HD app canvas and includes required app files', function () {
  const appInfo = JSON.parse(fs.readFileSync(path.join(project, 'app', 'appinfo.json'), 'utf8'));
  assert.equal(appInfo.id, 'com.nader.freewavelive');    assert.equal(appInfo.type, 'web');
    assert.equal(appInfo.resolution, '1280x720');
    assert.equal(appInfo.disableBackHistoryAPI, true, 'Back must be delivered to the app as key 461');
  for (const file of [appInfo.main, appInfo.icon, appInfo.largeIcon, 'styles.css', 'js/core.js', 'js/app.js', 'default-playlist.js']) {
    assert.ok(fs.existsSync(path.join(project, 'app', file)), 'missing package file ' + file);
  }
});

test('focus rings are visible for programmatic and remote focus, not only :focus-visible', function () {
  const css = fs.readFileSync(path.join(project, 'app', 'styles.css'), 'utf8');
  assert.match(css, /\.focusable:focus,/);
  assert.doesNotMatch(css, /\.focusable:focus-visible/);
  assert.match(css, /\.channel-row:focus/);
});

test('app and package versions stay in step', function () {
  const appInfo = JSON.parse(fs.readFileSync(path.join(project, 'app', 'appinfo.json'), 'utf8'));
  assert.equal(appInfo.version, pkg.version);
  const appScript = fs.readFileSync(path.join(project, 'app', 'js', 'app.js'), 'utf8');
  assert.ok(appScript.indexOf("APP_VERSION = '" + pkg.version + "'") !== -1, 'app.js APP_VERSION must match package.json');
});

test('bundled starter playlist contains only verified HTTPS streams', function () {
  const playlist = fs.readFileSync(path.join(project, 'app', 'data', 'public-channels.m3u'), 'utf8');
  const channels = Core.parsePlaylist(playlist, '', 'Free public starter list');
  assert.ok(channels.length >= 5);
  for (const channel of channels) {
    assert.match(channel.url, /^https:\/\//);
    assert.equal(Core.safeHttpUrl(channel.url), channel.url);
    assert.ok(channel.id);
    assert.ok(channel.group);
  }
});

test('every app JavaScript element ID reference exists in the packaged HTML', function () {
  const html = fs.readFileSync(path.join(project, 'app', 'index.html'), 'utf8');
  const appScript = fs.readFileSync(path.join(project, 'app', 'js', 'app.js'), 'utf8');
  const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), function (match) { return match[1]; }));
  const references = Array.from(appScript.matchAll(/\$\('([^']+)'\)/g), function (match) { return match[1]; });
  const missing = references.filter(function (id) { return !ids.has(id); });
  assert.deepEqual(missing, []);
});

test('a built installable IPK for the current version is present', function () {
  const packagePath = path.join(project, 'com.nader.freewavelive_' + pkg.version + '_all.ipk');
  assert.ok(fs.existsSync(packagePath), 'run npm run package to build ' + path.basename(packagePath));
  assert.ok(fs.statSync(packagePath).size > 10000, 'IPK should contain the app and assets');
});

test('app source contains no embedded credentials or private playlist tokens', function () {
  const files = ['app/js/app.js', 'app/js/core.js', 'app/default-playlist.js', 'app/data/public-channels.m3u'];
  const patterns = [/ghp_[A-Za-z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i];
  files.forEach(function (file) {
    const text = fs.readFileSync(path.join(project, file), 'utf8');
    patterns.forEach(function (pattern) {
      assert.equal(pattern.test(text), false, 'possible secret in ' + file + ': ' + pattern);
    });
  });
});
