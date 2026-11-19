const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { makeI18n } = require('./i18n-mock.cjs');

function load(locale) {
  const context = vm.createContext({
    URL, URLSearchParams,
    chrome: { i18n: makeI18n(locale) },
    location: { href: 'https://example.test/ticket?id=42&token=private-url-token' },
    document: { body: { querySelector: () => null } },
    CSS: { escape: value => value }
  });
  for (const file of ['i18n.js', 'capture.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  return context.PickerCapture;
}

test('element reports use English labels in Russian Chrome and exclude sensitive fields', () => {
  const { describe, report } = load('ru');
  const attributes = { type: 'password', 'aria-label': 'Пароль', 'data-token': 'private-data-token' };
  const input = {
    localName: 'input',
    get value() { assert.fail('Field value must never be read'); },
    get innerText() { assert.fail('Field text must never be read'); },
    getAttribute: name => attributes[name] || null,
    getRootNode: () => ({ querySelectorAll: () => [input] }),
    matches: () => true,
    closest: () => null,
    parentNode: { get children() { return [input]; } }
  };

  const text = report([{ description: describe(input), comment: 'Сменить подпись' }]);

  assert.match(text, /Page: \/ticket\?id=42/);
  assert.match(text, /1\. Пароль/);
  assert.match(text, /Selector: input/);
  assert.match(text, /What to change: Сменить подпись/);
  assert.match(text, /Tag: input/);
  assert.match(text, /Attributes: type="password"/);
  assert.doesNotMatch(text, /private-.*-token/);
});

test('Russian Chrome keeps the area label localized in the UI and exports it in English', () => {
  const { describeArea, report } = load('ru');
  const description = describeArea({ x: 30, y: 120, width: 150, height: 70 });
  const text = report([{ description, comment: 'Проверить отступы' }]);
  assert.equal(description.title, 'Область страницы');
  assert.match(text, /1\. Page area/);
  assert.match(text, /Area: 30, 120 · 150 × 70 px/);
  assert.match(text, /What to change: Проверить отступы/);
  assert.doesNotMatch(text, /undefined/);
});

test('English area reports preserve multiline comments and literal placeholder text', () => {
  const { describeArea, report } = load();
  const description = describeArea({ x: 12, y: 8, width: 34, height: 56 });
  const text = report([{ description, comment: 'Recheck $VALUE$\nKeep the caption' }]);
  assert.match(text, /1\. Page area/);
  assert.match(text, /Area: 12, 8 · 34 × 56 px/);
  assert.ok(text.includes('What to change: Recheck $VALUE$\n   Keep the caption'));
});
