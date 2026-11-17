const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { makeI18n } = require('./i18n-mock.cjs');

function setup(failSave = false, failToggle = false, platform, locale) {
  const elements = {};
  for (const id of ['shortcut', 'record', 'clear', 'save', 'reset', 'status', 'toggle', 'dual-command', 'command-option']) {
    elements[id] = { textContent: '', value: '', checked: false, disabled: false,
      listeners: {}, addEventListener(name, cb) { this.listeners[name] = cb; },
      focus() {}, setAttribute() {} };
  }
  const toggleLabel = elements.toggle;
  toggleLabel.dataset = { message: 'start_picking' };
  elements.shortcut.dataset = { valueMessage: 'loading' };
  const document = { listeners: {}, documentElement: {}, getElementById: id => elements[id],
    querySelectorAll(selector) {
      if (selector === '[data-message]') return [toggleLabel];
      if (selector === '[data-value-message]') return [elements.shortcut];
      return [];
    },
    addEventListener(name, cb) { this.listeners[name] = cb; } };
  let stored, sent, closed = false;
  const context = { document, navigator: { platform }, globalThis: null, window: { close() { closed = true; } }, chrome: {
    i18n: makeI18n(locale),
    tabs: { query: async () => [{ id: 42 }], sendMessage: async (id, message) => {
      if (failToggle) throw new Error('No receiver');
      sent = { id, message };
    } }, storage: { local: {
    get: async () => ({}), set: async value => { if (failSave) throw new Error('disk'); stored = value; }
  } } } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../i18n.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../shortcuts.js'), 'utf8'), context);
  const options = path.join(__dirname, '../options.js');
  if (fs.existsSync(options)) vm.runInContext(fs.readFileSync(options, 'utf8'), context);
  return { elements, document, stored: () => stored, sent: () => sent, closed: () => closed };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('record and save a user shortcut, then disable it without disabling the toolbar button', async () => {
  const ui = setup();
  await tick();
  assert.equal(typeof ui.elements.record.listeners.click, 'function', 'settings page must support recording');
  ui.elements.record.listeners.click();
  ui.document.listeners.keydown({ code: 'KeyP', ctrlKey: true, shiftKey: true,
    preventDefault() {}, stopPropagation() {} });

  await ui.elements.save.listeners.click();
  assert.equal(ui.stored().pickerSettings.shortcut.code, 'KeyP');
  assert.equal(ui.stored().pickerSettings.shortcut.ctrlKey, true);
  assert.equal(ui.stored().pickerSettings.dualCommand, undefined);
  assert.equal(ui.document.documentElement.lang, 'en');
  assert.equal(ui.elements.toggle.textContent, 'Start picking');
  assert.equal(ui.elements.status.textContent, 'Saved');
  ui.elements.clear.listeners.click();
  await ui.elements.save.listeners.click();
  assert.equal(ui.stored().pickerSettings.shortcut, null);
});
test('failed storage write is shown as an error, never as saved', async () => {
  const ui = setup(true);
  await tick();
  assert.equal(typeof ui.elements.save.listeners.click, 'function', 'save handler must exist');
  await ui.elements.save.listeners.click();
  assert.equal(ui.elements.status.textContent, 'Could not save settings: disk');
});

test('popup keeps picker activation available and closes after sending to the active tab', async () => {
  const ui = setup();
  await tick();
  assert.equal(typeof ui.elements.toggle.listeners.click, 'function', 'popup must expose picker activation');
  await ui.elements.toggle.listeners.click();
  assert.equal(ui.sent().id, 42);
  assert.equal(ui.sent().message.type, 'toggle-picker');
  assert.equal(ui.closed(), true);
});

test('unsupported tab leaves popup open with actionable feedback', async () => {
  const ui = setup(false, true);
  await tick();
  assert.equal(typeof ui.elements.toggle.listeners.click, 'function', 'popup must expose picker activation');
  await ui.elements.toggle.listeners.click();
  assert.equal(ui.closed(), false);
  assert.match(ui.elements.status.textContent, /reload/);
  assert.equal(ui.elements.toggle.disabled, false);
});

test('Mac Command gesture can be disabled without changing the standard shortcut', async () => {
  const ui = setup(false, false, 'MacIntel');
  await tick();
  assert.equal(ui.elements['command-option'].hidden, false);
  assert.equal(ui.elements['dual-command'].checked, true);
  ui.elements['dual-command'].checked = false;
  ui.elements['dual-command'].listeners.change();
  await ui.elements.save.listeners.click();
  assert.equal(ui.stored().pickerSettings.dualCommand, false);
  assert.equal(ui.stored().pickerSettings.shortcut.code, 'KeyI');
});

test('Russian Chrome shows Russian popup text and errors', async () => {
  const ui = setup(true, false, undefined, 'ru');
  await tick();
  assert.equal(ui.document.documentElement.lang, 'ru');
  assert.equal(ui.elements.toggle.textContent, 'Выбрать на странице');
  await ui.elements.save.listeners.click();
  assert.equal(ui.elements.status.textContent, 'Не удалось сохранить настройки: disk');
});
