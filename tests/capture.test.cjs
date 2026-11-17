const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runInNewContext } = require('node:vm');

const context = {
  URL, URLSearchParams,
  location: { href: 'https://example.test/ticket?id=42&token=private-url-token' },
  document: { body: { querySelector: () => null } },
  CSS: { escape: value => value }
};
runInNewContext(fs.readFileSync(new URL('../capture.js', require('node:url').pathToFileURL(__filename)), 'utf8'), context);
const { describe, report } = context.PickerCapture;

test('reports context but excludes password values, unrelated attributes and query parameters', () => {
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

  assert.match(text, /Страница: \/ticket\?id=42/);
  assert.match(text, /1\. Пароль/);
  assert.match(text, /Селектор: input/);
  assert.match(text, /Что исправить: Сменить подпись/);
  assert.doesNotMatch(text, /private-.*-token/);
});

test('area notes export the selected dimensions and comment', () => {
  const description = context.PickerCapture.describeArea({ x: 30, y: 120, width: 150, height: 70 });
  const text = report([{ description, comment: 'Проверить отступы' }]);
  assert.match(text, /1\. Область страницы/);
  assert.match(text, /Область: 30, 120 · 150 × 70 px/);
  assert.match(text, /Что исправить: Проверить отступы/);
  assert.doesNotMatch(text, /undefined/);
});
