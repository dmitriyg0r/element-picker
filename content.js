(function () {
  'use strict';

  const items = [];
  const selectionEvents = ['mousedown', 'mouseup', 'dblclick', 'contextmenu'];
  let ui, panelMode, editorItem, drag, suppressClick, hovered, frame, observer, resizeObserver, noticeTimer;
  let shortcutSettings = PickerShortcuts.defaults();
  let settingsChanged = false;

  function element(tag, className = '', text = '') {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function button(text, action, className = '', label = text) {
    const node = element('button', className, text);
    node.type = 'button';
    node.setAttribute('aria-label', label);
    node.addEventListener('click', action);
    return node;
  }

  function buildUI() {
    const host = element('div');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    const root = host.attachShadow({ mode: 'open' });
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(PickerStyles);
      root.adoptedStyleSheets = [sheet];
    } catch {
      root.append(element('style', '', PickerStyles));
    }

    const layer = element('div', 'layer');
    const marks = element('div');
    const outline = element('div', 'outline hover');
    const tooltip = element('div', 'hover-label');
    marks.append(outline, tooltip);
    outline.hidden = tooltip.hidden = true;

    const tray = element('div', 'tray');
    const dock = element('div', 'dock');
    const status = element('span', 'mode', 'Активно');
    status.setAttribute('role', 'status');
    status.title = 'Нажмите Esc, чтобы завершить выбор';
    const notes = element('a', 'notes-link');
    notes.addEventListener('click', event => {
      event.preventDefault();
      if (!items.length) return;
      if (panelMode === 'notes') closePanel();
      else showNotes();
    });
    const copy = button('Копировать', copyNotes, 'primary');
    dock.append(status, notes, copy);

    const panel = element('section', 'panel');
    panel.id = 'picker-panel';
    panel.hidden = true;
    notes.setAttribute('aria-controls', panel.id);
    tray.append(panel, dock);
    layer.append(marks, tray);
    root.append(layer);
    document.documentElement.append(host);
    return { host, marks, outline, tooltip, panel, dock, status, notes, copy, copying: false };
  }

  function notify(message, temporary = true) {
    clearTimeout(noticeTimer);
    ui.status.textContent = message || 'Активно';
    if (temporary && message) noticeTimer = setTimeout(() => notify(''), 2600);
  }

  function syncButtons() {
    const count = items.length;
    ui.copy.disabled = !count || ui.copying;
    ui.notes.textContent = 'Заметки · ' + count;
    if (count) {
      ui.notes.setAttribute('href', '#picker-panel');
      ui.notes.setAttribute('aria-expanded', String(panelMode === 'notes'));
    } else {
      ui.notes.removeAttribute('href');
      ui.notes.removeAttribute('aria-expanded');
    }
    items.forEach((item, index) => {
      const number = String(index + 1);
      item.pin.textContent = number;
      item.pin.setAttribute('aria-label', 'Открыть заметку ' + number + ': ' + item.description.title);
    });
  }

  function preparePanel(mode) {
    hideHover();
    notify('');
    panelMode = mode;
    editorItem = null;
    resetEditorPosition();
    ui.panel.replaceChildren();
    ui.panel.classList.toggle('quick-note', mode === 'editor');
    ui.panel.removeAttribute('aria-label');
    ui.panel.removeAttribute('aria-labelledby');
    ui.panel.hidden = false;
    ui.panel.scrollTop = 0;
    syncButtons();
    requestLayout();
  }

  function openPanel(mode, title, returnFocus) {
    preparePanel(mode);
    const header = element('header', 'panel-header');
    const heading = element('h2', '', title);
    heading.id = 'picker-panel-title';
    heading.tabIndex = -1;
    const close = button('×', () => closePanel(returnFocus), 'icon', 'Закрыть панель');
    header.append(heading, close);
    ui.panel.setAttribute('aria-labelledby', heading.id);
    ui.panel.append(header);
    return heading;
  }

  function closePanel(focus = ui.notes) {
    ui.panel.hidden = true;
    ui.panel.replaceChildren();
    panelMode = editorItem = null;
    requestLayout();
    resetEditorPosition();
    syncButtons();
    if (focus && !focus.disabled && !focus.hidden && (focus !== ui.notes || items.length)) {
      focus.focus({ preventScroll: true });
    }
  }

  function showNotes() {
    const heading = openPanel('notes', 'Заметки', ui.notes);
    const list = element('ol', 'notes');
    items.forEach((item, index) => {
      const row = element('li');
      const entry = button('', () => {
        if (item.target?.isConnected) item.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        else if (item.area) window.scrollTo(item.area.x - 16, item.area.y - 100);
        showEditor(item);
      }, 'note-row', 'Заметка ' + (index + 1) + ': ' + item.description.title);
      entry.append(element('span', 'note-number', String(index + 1)), element('span', '', item.description.title));
      if (item.comment.trim()) entry.append(element('span', 'note-preview', item.comment.trim().slice(0, 100)));
      const remove = button('Удалить', () => {
        detachMark(item);
        items.splice(items.indexOf(item), 1);
        if (items.length) showNotes();
        else closePanel();
        notify('Заметка удалена');
      }, 'danger remove-note', 'Удалить заметку ' + (index + 1));
      row.append(entry, remove);
      list.append(row);
    });
    const actions = element('div', 'actions');
    actions.append(button('Очистить всё', confirmClear, 'danger'));
    ui.panel.append(list, actions);
    heading.focus();
  }

  function confirmClear() {
    const heading = openPanel('clear', 'Удалить все заметки?', ui.notes);
    const actions = element('div', 'actions');
    actions.append(button('Отмена', showNotes), button('Удалить все', () => {
      for (const item of items.splice(0)) detachMark(item);
      closePanel(null);
      notify('Заметки удалены');
    }, 'danger'));
    ui.panel.append(actions);
    heading.focus();
  }

  function showEditor(item) {
    preparePanel('editor');
    const index = items.indexOf(item);
    const number = index < 0 ? items.length + 1 : index + 1;
    ui.panel.setAttribute('aria-label', 'Заметка ' + number + ': ' + item.description.title);

    const comment = element('textarea');
    comment.setAttribute('aria-label', 'Что исправить');
    comment.rows = 1;
    comment.value = item.comment;
    comment.placeholder = 'Заметка…';
    function save() {
      item.comment = comment.value.trim();
      if (!items.includes(item)) {
        items.push(item);
        attachMark(item);
        placeMark(item, itemRect(item));
      }
      closePanel(item.pin);
    }
    comment.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        save();
      }
    });

    ui.panel.append(comment);
    editorItem = item;
    placeEditor(itemRect(item));
    requestLayout();
    comment.focus({ preventScroll: true });
  }

  async function copyNotes() {
    if (!items.length || ui.copying) return;
    const currentUI = ui;
    const text = PickerCapture.report(items);
    currentUI.copying = true;
    syncButtons();
    try {
      await copyText(text, currentUI);
      if (ui === currentUI) notify('Скопировано');
    } catch {
      if (ui !== currentUI) return;
      openPanel('manual-copy', 'Скопируйте текст вручную', ui.copy);
      const output = element('textarea', 'clipboard-text');
      output.readOnly = true;
      output.rows = 7;
      output.setAttribute('aria-label', 'Текст заметок');
      output.value = text;
      ui.panel.append(output);
      output.focus();
      output.select();
      notify('Не скопировано', false);
    } finally {
      if (ui === currentUI) {
        currentUI.copying = false;
        syncButtons();
      }
    }
  }

  async function copyText(text, currentUI) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Для страниц, где Clipboard API недоступен, используем выделение текста.
      }
    }
    if (ui !== currentUI) return;

    const field = element('textarea', 'clipboard-fallback');
    field.readOnly = true;
    field.tabIndex = -1;
    field.value = text;
    const previousFocus = currentUI.dock.getRootNode().activeElement;
    currentUI.dock.append(field);
    try {
      field.focus({ preventScroll: true });
      field.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      field.remove();
      previousFocus?.focus({ preventScroll: true });
    }
  }

  function attachMark(item) {
    item.mark = element('div', 'outline');
    item.pin = button('', () => showEditor(item), 'pin');
    item.mark.hidden = item.pin.hidden = true;
    ui.marks.append(item.mark, item.pin);
    if (item.target?.isConnected) resizeObserver.observe(item.target);
  }

  function detachMark(item) {
    if (item.target) resizeObserver.unobserve(item.target);
    item.mark.remove();
    item.pin.remove();
  }

  function select(event) {
    if (event.target === ui.host || !(event.target instanceof Element)) return;
    blockPageEvent(event);
    if (suppressClick && event.detail > 0) {
      suppressClick = false;
      return;
    }
    const target = event.target;
    const item = items.find(entry => entry.target === target);
    showEditor(item || { target, description: PickerCapture.describe(target), comment: '' });
  }

  function startDrag(event) {
    suppressClick = false;
    if (event.target === ui.host) return;
    blockPageEvent(event);
    if (event.button !== 0 || !event.isPrimary) return;
    drag = { id: event.pointerId, x: event.pageX, y: event.pageY, area: null };
  }

  function moveDrag(event) {
    if (!drag || drag.id !== event.pointerId) return false;
    const width = Math.abs(event.pageX - drag.x);
    const height = Math.abs(event.pageY - drag.y);
    if (width >= 6 && height >= 6) {
      drag.area = {
        x: Math.round(Math.min(drag.x, event.pageX)),
        y: Math.round(Math.min(drag.y, event.pageY)),
        width: Math.round(width),
        height: Math.round(height)
      };
    } else {
      drag.area = null;
    }
    return !!drag.area;
  }

  function finishDrag(event) {
    blockPageEvent(event);
    if (!drag || drag.id !== event.pointerId) return;
    const area = moveDrag(event) && drag.area;
    drag = null;
    requestLayout();
    if (!area) return;
    suppressClick = true;
    showEditor({ area, description: PickerCapture.describeArea(area), comment: '' });
  }

  function cancelDrag() {
    drag = null;
    requestLayout();
  }

  function blockPageEvent(event) {
    if (event.target === ui.host) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function hideHover() {
    hovered = null;
    ui.outline.hidden = ui.tooltip.hidden = true;
  }

  function move(event) {
    const drawing = moveDrag(event);
    if (drawing || event.target === ui.host || !(event.target instanceof Element) || panelMode) {
      hideHover();
      if (drag) requestLayout();
      return;
    }
    hovered = event.target;
    requestLayout();
  }

  function intersectViewport(rect) {
    return rect.width && rect.height && rect.right > 0 && rect.bottom > 0 &&
      rect.top < innerHeight && rect.left < innerWidth ? rect : null;
  }

  function areaRect(area) {
    return intersectViewport(new DOMRect(area.x - scrollX, area.y - scrollY, area.width, area.height));
  }

  function visibleRect(target) {
    if (!target?.isConnected || !target.getClientRects().length) return null;
    return intersectViewport(target.getBoundingClientRect());
  }

  function itemRect(item) {
    return item.area ? areaRect(item.area) : visibleRect(item.target);
  }

  function placeOutline(node, rect) {
    node.hidden = !rect;
    if (!rect) return;
    node.style.transform = 'translate(' + rect.left + 'px,' + rect.top + 'px)';
    node.style.left = node.style.top = '0';
    node.style.width = rect.width + 'px';
    node.style.height = rect.height + 'px';
  }

  function placeMark(item, rect) {
    placeOutline(item.mark, rect);
    item.pin.hidden = !rect;
    if (!rect) return;
    item.pin.style.left = Math.max(3, Math.min(rect.left - 9, innerWidth - 30)) + 'px';
    item.pin.style.top = Math.max(3, Math.min(rect.top - 9, innerHeight - 30)) + 'px';
  }

  function resetEditorPosition() {
    ui.panel.classList.remove('anchored');
    ui.panel.style.removeProperty('left');
    ui.panel.style.removeProperty('top');
    ui.panel.style.removeProperty('max-height');
  }

  function placeEditor(anchor) {
    if (!anchor) {
      resetEditorPosition();
      return;
    }

    const margin = 12;
    const gap = 8;
    const right = innerWidth - margin;
    const bottom = Math.min(innerHeight - margin, ui.dock.getBoundingClientRect().top - gap);
    const { panel } = ui;
    panel.classList.add('anchored');

    const width = panel.offsetWidth;
    const availableHeight = Math.max(1, bottom - margin);
    const height = Math.min(panel.scrollHeight + panel.offsetHeight - panel.clientHeight, availableHeight);
    const below = Math.max(0, bottom - anchor.bottom - gap);
    const aboveEdge = Math.min(anchor.top - gap, bottom);
    const above = Math.max(0, aboveEdge - margin);
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

    let left = clamp(anchor.left, margin, right - width);
    let top;
    let maxHeight = availableHeight;
    if (below >= height) {
      top = anchor.bottom + gap;
    } else if (above >= height) {
      top = aboveEdge - height;
    } else if (anchor.right + gap + width <= right || anchor.left - gap - width >= margin) {
      left = anchor.right + gap + width <= right ? anchor.right + gap : anchor.left - gap - width;
      top = clamp(anchor.top, margin, bottom - height);
    } else {
      const preferBelow = below >= above;
      maxHeight = Math.min(availableHeight, Math.max(120, preferBelow ? below : above));
      const placedHeight = Math.min(height, maxHeight);
      const preferredTop = preferBelow ? anchor.bottom + gap : aboveEdge - placedHeight;
      top = clamp(preferredTop, margin, bottom - placedHeight);
    }
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.maxHeight = maxHeight + 'px';
  }

  function requestLayout() {
    if (frame != null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!ui) return;
      const selected = items.map(item => [item, itemRect(item)]);
      const hoverRect = visibleRect(hovered);
      const editorRect = editorItem ? itemRect(editorItem) : null;
      if (editorItem) placeEditor(editorRect);
      for (const [item, rect] of selected) placeMark(item, rect);
      const previewRect = drag?.area ? areaRect(drag.area) : editorItem?.pin ? null : editorRect || hoverRect;
      placeOutline(ui.outline, previewRect);
      ui.tooltip.hidden = !hoverRect;
      if (hoverRect) {
        ui.tooltip.textContent = hovered.localName;
        ui.tooltip.style.left = Math.max(4, Math.min(hoverRect.left, innerWidth - 64)) + 'px';
        ui.tooltip.style.top = Math.max(3, hoverRect.top - 22) + 'px';
      }
    });
  }

  function clearHoverOnLeave(event) {
    if (!event.relatedTarget) hideHover();
  }

  function start() {
    if (ui) return;
    ui = buildUI();
    resizeObserver = new ResizeObserver(requestLayout);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(ui.panel);
    resizeObserver.observe(ui.dock);
    items.forEach(attachMark);
    observer = new MutationObserver(requestLayout);
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerout', clearHoverOnLeave, true);
    document.addEventListener('pointerdown', startDrag, true);
    document.addEventListener('pointerup', finishDrag, true);
    document.addEventListener('pointercancel', cancelDrag, true);
    window.addEventListener('blur', cancelDrag);
    document.addEventListener('click', select, true);
    selectionEvents.forEach(name => document.addEventListener(name, blockPageEvent, true));
    window.addEventListener('scroll', requestLayout, true);
    window.addEventListener('resize', requestLayout);
    syncButtons();
    requestLayout();
  }

  function stop() {
    if (!ui) return;
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('pointerout', clearHoverOnLeave, true);
    document.removeEventListener('pointerdown', startDrag, true);
    document.removeEventListener('pointerup', finishDrag, true);
    document.removeEventListener('pointercancel', cancelDrag, true);
    window.removeEventListener('blur', cancelDrag);
    document.removeEventListener('click', select, true);
    selectionEvents.forEach(name => document.removeEventListener(name, blockPageEvent, true));
    window.removeEventListener('scroll', requestLayout, true);
    window.removeEventListener('resize', requestLayout);
    observer.disconnect();
    resizeObserver.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(noticeTimer);
    ui.host.remove();
    ui = panelMode = editorItem = drag = hovered = frame = null;
    suppressClick = false;
    for (const item of items) item.mark = item.pin = null;
  }

  function toggle() { ui ? stop() : start(); }

  const shortcutHandler = PickerShortcuts.createHandler(() => shortcutSettings, toggle);
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'toggle-picker') toggle();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.pickerSettings) return;
    settingsChanged = true;
    shortcutHandler.reset();
    shortcutSettings = PickerShortcuts.normalize(changes.pickerSettings.newValue);
  });
  chrome.storage.local.get('pickerSettings').then(stored => {
    if (!settingsChanged) shortcutSettings = PickerShortcuts.normalize(stored.pickerSettings);
  }).catch(error => console.warn('Не удалось загрузить сочетание клавиш:', error));

  window.addEventListener('blur', shortcutHandler.reset);
  document.addEventListener('visibilitychange', shortcutHandler.reset);
  document.addEventListener('pointerdown', shortcutHandler.reset, true);
  document.addEventListener('keyup', shortcutHandler.keyup, true);
  document.addEventListener('keydown', event => {
    if (!event.isComposing && ui && event.key === 'Escape') {
      shortcutHandler.reset();
      if (drag) cancelDrag();
      else if (panelMode) closePanel(editorItem?.pin);
      else stop();
    } else if (!shortcutHandler.keydown(event)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
