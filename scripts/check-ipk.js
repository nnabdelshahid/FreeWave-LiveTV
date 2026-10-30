'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const ipkPath = process.argv[2] || path.join(root, 'com.nader.freewavelive_' + pkg.version + '_all.ipk');

function readAr(buffer) {
  if (buffer.toString('ascii', 0, 8) !== '!<arch>\n') throw new Error('not an ar archive');
  const members = [];
  let offset = 8;
  while (offset + 60 <= buffer.length) {
    const header = buffer.toString('ascii', offset, offset + 60);
    const name = header.slice(0, 16).trim().replace(/\/$/, '');
    const size = parseInt(header.slice(48, 58).trim(), 10);
    if (!Number.isFinite(size) || size < 0) throw new Error('invalid ar member size');
    members.push({ name: name, data: buffer.subarray(offset + 60, offset + 60 + size) });
    offset += 60 + size + (size % 2);
  }
  return members;
}

function parseTar(buffer) {
  const entries = [];
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const name = buffer.toString('utf8', offset, offset + 100).replace(/\0[\s\S]*$/, '').trim();
    if (!name) break;
    const size = parseInt(buffer.toString('ascii', offset + 124, offset + 136).replace(/\0[\s\S]*$/, '').trim() || '0', 8);
    const type = buffer.toString('ascii', offset + 156, offset + 157);
    const prefix = buffer.toString('utf8', offset + 345, offset + 500).replace(/\0[\s\S]*$/, '').trim();
    const fullName = (prefix ? prefix + '/' : '') + name;
    entries.push({ name: fullName.replace(/^\.\//, ''), size: size, type: type, data: buffer.subarray(offset + 512, offset + 512 + size) });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function main() {
  if (!fs.existsSync(ipkPath)) throw new Error('IPK not found: ' + ipkPath);
  const buffer = fs.readFileSync(ipkPath);
  const members = readAr(buffer);
  const controlMember = members.find(function (member) { return member.name === 'control.tar.gz'; });
  const dataMember = members.find(function (member) { return member.name === 'data.tar.gz'; });
  if (!controlMember || !dataMember) throw new Error('IPK is missing control.tar.gz or data.tar.gz');
  if (!members.some(function (member) { return member.name === 'debian-binary'; })) throw new Error('IPK is missing debian-binary');

  const controlText = zlib.gunzipSync(controlMember.data).toString('utf8');
  const controlEntries = parseTar(zlib.gunzipSync(controlMember.data));
  const controlFile = controlEntries.find(function (entry) { return entry.name === 'control'; });
  const fields = {};
  (controlFile ? controlFile.data.toString('utf8') : controlText).split(/\r?\n/).forEach(function (line) {
    const match = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2];
  });

  const dataEntries = parseTar(zlib.gunzipSync(dataMember.data));
  const names = dataEntries.map(function (entry) { return entry.name; });
  const appInfoEntry = dataEntries.find(function (entry) { return /\/appinfo\.json$/.test(entry.name); });
  if (!appInfoEntry) throw new Error('packaged data has no appinfo.json');
  const appInfo = JSON.parse(appInfoEntry.data.toString('utf8'));

  const required = ['index.html', 'styles.css', 'js/core.js', 'js/app.js', 'default-playlist.js', 'data/public-channels.m3u'];
  const appRoot = appInfoEntry.name.replace(/appinfo\.json$/, '');
  const missing = required.filter(function (file) { return names.indexOf(appRoot + file) === -1; });
  if (missing.length) throw new Error('IPK is missing app files: ' + missing.join(', '));
  if (names.some(function (name) { return /(^|\/)(\.git|node_modules|\.env)(\/|$)/.test(name); })) throw new Error('IPK contains development or secret files');

  const secretPatterns = [/ghp_[A-Za-z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i];
  dataEntries.forEach(function (entry) {
    if (!/\.(js|json|html|css|m3u|md|txt)$/i.test(entry.name) || entry.size > 2000000) return;
    const text = entry.data.toString('utf8');
    secretPatterns.forEach(function (pattern) {
      if (pattern.test(text)) throw new Error('possible secret in packaged file ' + entry.name);
    });
  });

  const problems = [];
  if (fields.Package !== 'com.nader.freewavelive') problems.push('control Package is ' + fields.Package);
  if (fields.Version !== pkg.version) problems.push('control Version is ' + fields.Version + ', expected ' + pkg.version);
  if (appInfo.id !== 'com.nader.freewavelive') problems.push('appinfo id is ' + appInfo.id);
  if (appInfo.version !== pkg.version) problems.push('appinfo version is ' + appInfo.version + ', expected ' + pkg.version);
  if (appInfo.resolution !== '1280x720') problems.push('appinfo resolution is ' + appInfo.resolution);

  console.log('IPK: ' + path.basename(ipkPath));
  console.log('Size: ' + buffer.length + ' bytes');
  console.log('Control: Package ' + fields.Package + ' · Version ' + fields.Version + ' · Architecture ' + fields.Architecture);
  console.log('App: ' + appInfo.title + ' · id ' + appInfo.id + ' · version ' + appInfo.version + ' · ' + appInfo.resolution);
  console.log('Files: ' + names.length + ' entries');
  console.log('SHA-256: ' + require('node:crypto').createHash('sha256').update(buffer).digest('hex'));

  if (problems.length) {
    console.error('Package verification failed:\n- ' + problems.join('\n- '));
    process.exitCode = 1;
  } else {
    console.log('Package verification passed.');
  }
}

try {
  main();
} catch (error) {
  console.error('Package verification failed: ' + error.message);
  process.exitCode = 1;
}
