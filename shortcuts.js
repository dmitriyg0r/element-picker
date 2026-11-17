/* Общая логика сочетаний для страницы настроек и content script. */
(function () {
  'use strict';
  var modifiers = ['ctrlKey', 'altKey', 'shiftKey', 'metaKey'];
  function isMac() {
    var nav = globalThis.navigator;
    return /^mac/i.test(nav?.userAgentData?.platform || nav?.platform || '');
  }
  function defaults() {
    var settings = { shortcut: { code: 'KeyI', ctrlKey: false, altKey: true, shiftKey: true, metaKey: false } };
    if (isMac()) settings.dualCommand = true;
    return settings;
  }
  function valid(shortcut) {
    return !!shortcut && /^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-9]|2[0-4])|Space|Arrow(Up|Down|Left|Right)|Home|End|PageUp|PageDown|Insert|Delete|Backspace|Enter|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash)$/.test(shortcut.code) &&
      modifiers.every(function (key) { return typeof shortcut[key] === 'boolean'; }) &&
      (shortcut.ctrlKey || shortcut.altKey || shortcut.metaKey);
  }
  function normalize(value) {
    var result = defaults();
    if (!value || typeof value !== 'object') return result;
    if (value.shortcut === null || valid(value.shortcut)) result.shortcut = value.shortcut;
    if (typeof value.dualCommand === 'boolean') result.dualCommand = value.dualCommand;
    return result;
  }
  function fromEvent(e) {
    var shortcut = { code: e.code };
    modifiers.forEach(function (key) { shortcut[key] = !!e[key]; });
    return valid(shortcut) && !e.isComposing && !e.repeat ? shortcut : null;
  }
  function label(shortcut) {
    const t = PickerI18n.message;
    if (!shortcut) return t('shortcut_unassigned');
    var parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt / Option');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.metaKey) parts.push('Cmd / Win');
    var names = { Space: t('space_key'), ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
      Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
      Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/' };
    parts.push(names[shortcut.code] || shortcut.code.replace(/^(Key|Digit)/, ''));
    return parts.join(' + ');
  }
  function createHandler(getSettings, toggle) {
    const tapInterval = 400;
    const commands = new Set();
    let pressedAt = null;
    let releasedAt = null;

    function reset() {
      commands.clear();
      pressedAt = releasedAt = null;
    }

    function commandDown(e) {
      const isCommand = e.code === 'MetaLeft' || e.code === 'MetaRight';
      if (!getSettings().dualCommand || !isCommand || e.isComposing || e.altKey || e.ctrlKey || e.shiftKey) {
        reset();
        return false;
      }
      if (e.repeat || commands.has(e.code)) return false;
      const now = e.timeStamp;
      const activate = commands.size > 0 || (releasedAt !== null && now - releasedAt <= tapInterval);
      commands.add(e.code);
      releasedAt = null;
      pressedAt = activate ? null : now;
      return activate;
    }

    function keyup(e) {
      if (!commands.delete(e.code) || commands.size !== 0 || pressedAt === null) return;
      if (e.timeStamp - pressedAt <= tapInterval) releasedAt = e.timeStamp;
      pressedAt = null;
    }

    function keydown(e) {
      const dualCommand = commandDown(e);
      if (e.repeat || e.isComposing) return false;
      const { shortcut } = getSettings();
      const standard = shortcut && e.code === shortcut.code &&
        modifiers.every(key => !!e[key] === shortcut[key]);
      if (!dualCommand && !standard) return false;
      toggle();
      return true;
    }
    return { keydown, keyup, reset };
  }
  globalThis.PickerShortcuts = { defaults: defaults, valid: valid, normalize: normalize, isMac: isMac,
    fromEvent: fromEvent, label: label, createHandler: createHandler };
})();
