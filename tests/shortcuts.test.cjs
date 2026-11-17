const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const { makeI18n } = require('./i18n-mock.cjs');

function load(platform, locale) {
  const context = vm.createContext({ navigator: { platform }, chrome: { i18n: makeI18n(locale) } });
  for (const file of ['i18n.js', 'shortcuts.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  return context.PickerShortcuts;
}
function event(overrides = {}) {
  return { code: 'KeyI', altKey: true, shiftKey: true, ctrlKey: false,
    metaKey: false, repeat: false, isComposing: false, ...overrides };
}

test('user-selected Windows and Mac shortcuts replace the default with exact modifiers', () => {
  const api = load();
  assert.ok(api, 'shared configurable shortcut handler must exist');
  let settings = api.defaults();
  let toggles = 0;
  const handler = api.createHandler(() => settings, () => toggles++);
  assert.equal(handler.keydown(event()), true);
  settings = { shortcut: { code: 'KeyP', ctrlKey: true, altKey: false,
    shiftKey: true, metaKey: false }, dualCommand: false };
  assert.equal(handler.keydown(event()), false);
  assert.equal(handler.keydown(event({ code: 'KeyP', ctrlKey: true, altKey: false })), true);
  assert.equal(handler.keydown(event({ code: 'KeyP', ctrlKey: true, altKey: false, metaKey: true })), false);
  assert.equal(handler.keydown(event({ code: 'KeyP', ctrlKey: true, altKey: false, repeat: true })), false);
  settings = { shortcut: { code: 'KeyP', ctrlKey: false, altKey: false,
    shiftKey: true, metaKey: true }, dualCommand: false };
  assert.equal(handler.keydown(event({ code: 'KeyP', altKey: false, metaKey: true })), true);
  assert.equal(toggles, 3);
});

const command = (code, timeStamp, overrides = {}) =>
  event({ code, timeStamp, metaKey: true, altKey: false, shiftKey: false, ...overrides });

test('restores simultaneous left and right Command keys in legacy settings', () => {
  const api = load('MacIntel');
  const settings = api.normalize({ dualCommand: true, shortcut: null });
  let toggles = 0;
  const handler = api.createHandler(() => settings, () => toggles++);
  assert.equal(handler.keydown(command('MetaLeft', 0)), false);
  assert.equal(handler.keydown(command('MetaRight', 50)), true);
  handler.keyup(command('MetaRight', 80));
  handler.keyup(command('MetaLeft', 95));
  assert.equal(handler.keydown(command('MetaLeft', 150)), false);
  assert.equal(toggles, 1);
});

test('detects a quick double tap but ignores held keys, interrupted taps and focus changes', () => {
  const api = load('MacIntel');
  const settings = api.defaults();
  let toggles = 0;
  const handler = api.createHandler(() => settings, () => toggles++);
  assert.equal(handler.keydown(command('MetaLeft', 0)), false);
  assert.equal(handler.keydown(command('MetaLeft', 30, { repeat: true })), false);
  handler.keyup(command('MetaLeft', 70));
  assert.equal(handler.keydown(command('MetaLeft', 150)), true);
  handler.keyup(command('MetaLeft', 190));
  handler.keydown(command('MetaLeft', 230));
  handler.keydown(command('KeyC', 250));
  handler.keyup(command('MetaLeft', 300));
  assert.equal(handler.keydown(command('MetaLeft', 350)), false);
  handler.keyup(command('MetaLeft', 370));
  handler.reset();
  assert.equal(handler.keydown(command('MetaLeft', 400)), false);
  handler.keyup(command('MetaLeft', 950));
  assert.equal(handler.keydown(command('MetaLeft', 1000)), false);
  assert.equal(toggles, 1);
});

test('Command gestures default on for Macs and respect an explicit opt-out', () => {
  assert.equal(load('MacIntel').normalize({ shortcut: null }).dualCommand, true);
  assert.equal(load('Win32').defaults().dualCommand, undefined);
  const api = load('MacIntel');
  const disabled = api.normalize({ dualCommand: false });
  const handler = api.createHandler(() => disabled, () => assert.fail('Gesture is disabled'));
  assert.equal(handler.keydown(command('MetaLeft', 0)), false);
  assert.equal(handler.keydown(command('MetaRight', 50)), false);
});

test('unsafe plain keys and malformed settings fall back safely; layout uses physical codes', () => {
  const api = load();
  assert.equal(api.fromEvent(event({ altKey: false, shiftKey: false })), null);
  assert.equal(api.fromEvent(event({ code: 'ShiftLeft' })), null);
  assert.equal(api.fromEvent(event({ isComposing: true })), null);
  assert.equal(api.fromEvent(event({ code: 'KeyP', key: 'З', ctrlKey: true })).code, 'KeyP');
  assert.equal(api.normalize({ shortcut: { code: 'KeyP' } }).shortcut.code, 'KeyI');
  assert.equal(api.normalize({ shortcut: null }).shortcut, null);
});

test('keyboard labels use the browser locale', () => {
  const english = load('Win32');
  const russian = load('Win32', 'ru');
  const shortcut = english.fromEvent(event({ code: 'Space', altKey: false, shiftKey: false, ctrlKey: true }));
  assert.equal(english.label(null), 'Not assigned');
  assert.equal(english.label(shortcut), 'Ctrl + Space');
  assert.equal(russian.label(null), 'Не назначено');
  assert.equal(russian.label(shortcut), 'Ctrl + Пробел');
});
