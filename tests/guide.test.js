'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../app/js/core.js');

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'guide.xml'), 'utf8');
const NOW = Date.UTC(2026, 9, 29, 12, 0, 0);

test('parses the XMLTV fixture with local-time conversion for every offset', function () {
  const guide = Core.parseXmltv(fixture, { now: NOW });
  assert.equal(guide.channels['CGTN.English'], 'CGTN English');
  assert.equal(guide.channels['DW.English'], 'DW English');
  assert.equal(guide.programs['CGTN.English'].length, 4);
  assert.equal(guide.programs['CGTN.English'][0].start, Date.UTC(2026, 9, 29, 11, 0, 0));
  assert.equal(guide.programs['CGTN.English'][1].start, Date.UTC(2026, 9, 29, 12, 0, 0));
  assert.equal(guide.programs['CGTN.English'][2].start, Date.UTC(2026, 9, 29, 13, 30, 0));
  assert.equal(guide.programs['CGTN.English'][3].start, Date.UTC(2026, 9, 29, 18, 0, 0));
  assert.equal(guide.programs['CGTN.English'][3].title, 'Evening Report');
  assert.equal(guide.programs['DW.English'][0].start, Date.UTC(2026, 9, 29, 13, 0, 0));
});

test('selects the correct current and next entries from the fixture', function () {
  const guide = Core.parseXmltv(fixture, { now: NOW });
  const selection = Core.findNowAndNext(guide.programs['CGTN.English'], NOW);
  assert.equal(selection.current.title, 'Midday Bulletin');
  assert.equal(selection.next.title, 'Afternoon Live');
  assert.equal(selection.current.description, 'Headlines from around the world.');
});

test('reports missing guide data without inventing programs', function () {
  const rows = Core.guideRows([
    { key: 'x', id: 'missing', name: 'Missing Guide', number: '99', group: 'News' }
  ], {}, NOW);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hasData, false);
  assert.equal(rows[0].current, null);
  assert.equal(rows[0].next, null);
});

test('guide windows exclude programs outside the requested horizon', function () {
  const xml = [
    '<tv>',
    '<programme channel="a" start="20261029000000 +0000" stop="20261029010000 +0000"><title>Too old</title></programme>',
    '<programme channel="a" start="20261029110000 +0000" stop="20261029120000 +0000"><title>Inside</title></programme>',
    '<programme channel="a" start="20261130000000 +0000" stop="20261130010000 +0000"><title>Too far</title></programme>',
    '</tv>'
  ].join('');
  const guide = Core.parseXmltv(xml, { now: NOW, pastHours: 6, futureHours: 48 });
  assert.equal(guide.programs.a.length, 1);
  assert.equal(guide.programs.a[0].title, 'Inside');
});

test('schedule output is ordered and limited for the guide screen', function () {
  const programs = [
    { start: 10, end: 20, title: 'A' },
    { start: 30, end: 40, title: 'B' },
    { start: 20, end: 30, title: 'C' },
    { start: 40, end: 50, title: 'D' }
  ];
  const schedule = Core.scheduleForChannel(programs, 15, 3);
  assert.equal(schedule.current.title, 'A');
  assert.equal(schedule.next.title, 'C');
  assert.deepEqual(schedule.upcoming.map(function (item) { return item.title; }), ['A', 'C', 'B']);
});
