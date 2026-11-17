/* Формирование описания и отчёта без чтения значений полей. */
(function () {
  'use strict';

  function compact(value, limit) {
    return (value || '').trim().replace(/\s+/g, ' ').slice(0, limit);
  }

  const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

  function visibleText(node, limit) {
    if (!node || node.isContentEditable || node.matches(editable) || node.querySelector(editable)) return '';
    return compact(node.innerText, limit);
  }

  function selector(element) {
    const root = element.getRootNode();
    const matchesOnly = path => {
      const matches = root.querySelectorAll(path);
      return matches.length === 1 && matches[0] === element;
    };
    const parts = [];
    const stable = ['id', 'data-testid', 'data-test', 'data-qa', 'name'];
    for (let node = element; node; node = node.parentElement) {
      const tag = CSS.escape(node.localName);
      for (const attribute of stable) {
        const value = node.getAttribute(attribute);
        if (!value) continue;
        const anchor = attribute === 'id'
          ? '#' + CSS.escape(value)
          : tag + '[' + attribute + '="' + CSS.escape(value) + '"]';
        const candidate = [anchor, ...parts].join(' > ');
        if (matchesOnly(candidate)) return candidate;
      }
      const same = Array.from(node.parentNode.children).filter(sibling =>
        sibling.localName === node.localName && sibling.namespaceURI === node.namespaceURI);
      const segment = same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(node) + 1) + ')' : tag;
      parts.unshift(segment);
      const path = parts.join(' > ');
      if (matchesOnly(path)) return path;
    }
    return '';
  }

  function pagePath() {
    const url = new URL(location.href);
    const query = new URLSearchParams();
    for (const key of ['id', 'itemtype', 'forcetab', '_itemtype']) {
      const value = url.searchParams.get(key);
      if (value && /^[\w-]{1,80}$/.test(value)) query.set(key, value);
    }
    return url.pathname + (query.size ? '?' + query : '');
  }

  function describe(element) {
    const text = visibleText(element, 120);
    const block = element.closest('.card, .modal, .tab-pane, form, section, fieldset, .accordion-item') || document.body;
    const heading = block?.querySelector('.card-title, .card-header, h1, h2, h3, h4, legend, .modal-title');
    const tag = element.localName;
    const attributes = ['type', 'role'].flatMap(name => {
      const value = compact(element.getAttribute(name), 48);
      return value ? [name + '="' + value + '"'] : [];
    });
    return {
      title: text || compact(element.getAttribute('aria-label'), 80) || tag,
      tag,
      selector: selector(element),
      block: visibleText(heading, 80),
      attributes: attributes.join(' '),
      page: pagePath()
    };
  }

  function describeArea({ x, y, width, height }) {
    return { title: 'Область страницы', area: x + ', ' + y + ' · ' + width + ' × ' + height + ' px', page: pagePath() };
  }

  function report(items) {
    const page = items[0]?.description.page;
    if (!page) return '';
    const blocks = items.map(({ description: d, comment }, index) => [
      (index + 1) + '. ' + d.title,
      d.page !== page && '   Страница: ' + d.page,
      comment.trim() && '   Что исправить: ' + comment.trim().replace(/\r?\n/g, '\n   '),
      d.block && '   Блок: ' + d.block,
      d.selector && '   Селектор: ' + d.selector,
      d.tag && '   Тег: ' + d.tag,
      d.area && '   Область: ' + d.area,
      d.attributes && '   Атрибуты: ' + d.attributes
    ].filter(Boolean).join('\n'));
    return ['Страница: ' + page, ...blocks].join('\n\n');
  }

  globalThis.PickerCapture = { describe, describeArea, report };
})();
