'use strict';

/**
 * Host-side validation for the verified channel lineup.
 *
 * This checks HTTP reachability, HLS manifest structure, unencrypted delivery,
 * and (when ffprobe is installed) H.264 video / AAC audio. It is not a
 * substitute for playback on the LG TV.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Core = require('../app/js/core.js');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'channels.json'), 'utf8'));
const channels = manifest.channels.filter(function (channel) { return channel.status === 'verified'; });

function fetchWithTimeout(url, timeoutMs) {
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
  return fetch(url, { signal: signal, redirect: 'follow', headers: { 'User-Agent': 'FreeWave-LiveTV-verify/1.1' } });
}

function probeCodecs(url) {
  const result = spawnSync('ffprobe', [
    '-v', 'error', '-analyzeduration', '4000000', '-probesize', '2000000',
    '-show_entries', 'stream=codec_name,profile,width,height,channels', '-of', 'json', url
  ], { encoding: 'utf8', timeout: 40000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error && result.error.code === 'ENOENT') return { available: false };
  if (result.error || result.status !== 0) return { available: true, error: (result.stderr || (result.error && result.error.message) || 'ffprobe failed').trim() };
  try {
    const streams = JSON.parse(result.stdout || '{}').streams || [];
    const video = streams.find(function (stream) { return stream.codec_name === 'h264'; });
    const audio = streams.find(function (stream) { return stream.codec_name === 'aac'; });
    return {
      available: true,
      h264: !!video,
      aac: !!audio,
      video: video ? [video.codec_name, video.profile, video.width + 'x' + video.height].filter(Boolean).join(' ') : '',
      audio: audio ? [audio.codec_name, audio.profile, audio.channels ? audio.channels + 'ch' : ''].filter(Boolean).join(' ') : ''
    };
  } catch (error) {
    return { available: true, error: 'could not parse ffprobe output' };
  }
}

async function inspect(channel) {
  const response = await fetchWithTimeout(channel.url, 20000);
  const text = await response.text();
  const analysis = Core.analyzeManifest(text);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  if (!analysis.valid) throw new Error('response is not an HLS manifest');
  if (!analysis.isMaster && !analysis.hasSegments) throw new Error('manifest has no renditions or segments');
  if (analysis.encrypted) throw new Error('manifest is encrypted; the starter lineup must stay clear');

  let media = analysis;
  let mediaUrl = channel.url;
  if (analysis.isMaster) {
    const lines = text.split(/\r?\n/);
    const index = lines.findIndex(function (line) { return /^#EXT-X-STREAM-INF/i.test(line); });
    const variant = index >= 0 ? lines.slice(index + 1).find(function (line) { return line.trim() && line.trim().charAt(0) !== '#'; }) : '';
    if (variant) {
      mediaUrl = new URL(variant.trim(), channel.url).href;
      const mediaResponse = await fetchWithTimeout(mediaUrl, 20000);
      if (mediaResponse.ok) media = Core.analyzeManifest(await mediaResponse.text());
    }
  }

  const codecs = probeCodecs(channel.url);
  return {
    name: channel.name,
    url: channel.url,
    sourcePage: channel.sourcePage,
    category: channel.category,
    language: channel.language,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    master: analysis.isMaster,
    renditions: analysis.variants,
    segments: media.hasSegments,
    programDateTime: analysis.hasProgramDateTime || media.hasProgramDateTime,
    targetDuration: media.targetDuration,
    codecs: codecs
  };
}

async function main() {
  const results = [];
  let failures = 0;
  for (const channel of channels) {
    try {
      const result = await inspect(channel);
      if (result.codecs.available && result.codecs.error) throw new Error('ffprobe: ' + result.codecs.error);
      if (result.codecs.available && (!result.codecs.h264 || !result.codecs.aac)) throw new Error('expected H.264 video and AAC audio');
      results.push(Object.assign({ ok: true, checkedAt: new Date().toISOString() }, result));
      console.log('PASS ' + channel.name + ' · HTTP ' + result.status + ' · ' + (result.master ? 'master/' + result.renditions + ' renditions' : 'media playlist'));
      if (result.codecs.available) console.log('     ' + result.codecs.video + ' / ' + result.codecs.audio + (result.programDateTime ? ' · EXT-X-PROGRAM-DATE-TIME present' : ''));
      else console.log('     ffprobe not installed; codec check skipped');
    } catch (error) {
      failures += 1;
      results.push({ name: channel.name, url: channel.url, ok: false, error: error.message, checkedAt: new Date().toISOString() });
      console.error('FAIL ' + channel.name + ' · ' + error.message);
    }
  }

  const report = { generatedAt: new Date().toISOString(), note: 'Host-side checks only; not LG TV playback evidence.', results: results };
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'stream-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('\n' + (channels.length - failures) + '/' + channels.length + ' verified channels passed. Report: docs/stream-report.json');
  if (failures) process.exitCode = 1;
}

main().catch(function (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
