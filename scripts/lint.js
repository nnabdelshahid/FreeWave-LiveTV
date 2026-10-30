'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const jsFiles = [];
const jsonFiles = [];

function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.work') return;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (/\.js$/.test(entry.name)) jsFiles.push(full);
    if (/\.json$/.test(entry.name)) jsonFiles.push(full);
  });
}

['app', 'scripts', 'tests', 'data'].forEach(function (directory) {
  const full = path.join(root, directory);
  if (fs.existsSync(full)) walk(full);
});

const problems = [];
jsFiles.forEach(function (file) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) problems.push(path.relative(root, file) + ': ' + (check.stderr || 'syntax error').trim());
});

jsonFiles.forEach(function (file) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push(path.relative(root, file) + ': ' + error.message);
  }
});

const appInfo = JSON.parse(fs.readFileSync(path.join(root, 'app', 'appinfo.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (appInfo.id !== 'com.nader.freewavelive') problems.push('appinfo.json must keep the com.nader.freewavelive app id');
if (appInfo.version !== pkg.version) problems.push('appinfo.json version ' + appInfo.version + ' != package.json version ' + pkg.version);
if (appInfo.resolution !== '1280x720') problems.push('appinfo.json resolution must stay 1280x720');

if (problems.length) {
  console.error('Lint failed:\n' + problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Lint passed: ' + jsFiles.length + ' JavaScript files and ' + jsonFiles.length + ' JSON files checked.');
}
