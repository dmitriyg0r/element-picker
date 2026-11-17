(function () {
  'use strict';

  const t = PickerI18n.message;
  document.documentElement.lang = t('ui_language');
  document.querySelectorAll('[data-message]').forEach(element => {
    element.textContent = t(element.dataset.message);
  });
  document.querySelectorAll('[data-aria-message]').forEach(element => {
    element.setAttribute('aria-label', t(element.dataset.ariaMessage));
  });
  document.querySelectorAll('[data-value-message]').forEach(element => {
    element.value = t(element.dataset.valueMessage);
  });

  var api = PickerShortcuts, settings = api.defaults(), recording = false;
  var field = document.getElementById('shortcut');
  var record = document.getElementById('record');
  var clear = document.getElementById('clear');
  var command = document.getElementById('dual-command');
  var commandOption = document.getElementById('command-option');

  var save = document.getElementById('save');
  var reset = document.getElementById('reset');
  var status = document.getElementById('status');
  var toggle = document.getElementById('toggle');
  toggle.addEventListener('click', async function () {
    toggle.disabled = true;
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs.length || tabs[0].id == null) throw new Error('No active tab');
      await chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-picker' });
      window.close();
    } catch (error) {
      status.textContent = t('tab_unavailable');
      toggle.disabled = false;
    }
  });
  function render() {
    field.value = api.label(settings.shortcut);
    commandOption.hidden = !api.isMac() && !settings.dualCommand;
    command.checked = !!settings.dualCommand;
  }
  function endRecording() {
    recording = false;
    record.textContent = t('edit');
    render();
  }
  function enable(enabled) {
    [record, clear, save, reset, command].forEach(function (element) { element.disabled = !enabled; });
  }
  record.addEventListener('click', function () {
    if (recording) { endRecording(); status.textContent = t('recording_cancelled'); return; }
    recording = true;
    record.textContent = t('cancel');
    field.value = t('recording_prompt');
    field.focus();
    status.textContent = t('recording_help');
  });
  document.addEventListener('keydown', function (e) {
    if (!recording) return;
    e.preventDefault(); e.stopPropagation();
    if (e.code === 'Escape') { endRecording(); status.textContent = t('recording_cancelled'); return; }
    var shortcut = api.fromEvent(e);
    if (!shortcut) { status.textContent = t('invalid_shortcut'); return; }
    settings.shortcut = shortcut;

    endRecording();
    status.textContent = t('save_prompt');
  }, true);
  clear.addEventListener('click', function () {
    settings.shortcut = null;
    endRecording();
    status.textContent = t('save_prompt');
  });

  command.addEventListener('change', function () {
    settings.dualCommand = command.checked;
    if (recording) endRecording();
    status.textContent = t('save_prompt');
  });

  reset.addEventListener('click', function () {
    settings = api.defaults(); endRecording();
    status.textContent = t('save_prompt');
  });
  save.addEventListener('click', async function () {
    endRecording();
    enable(false);
    try {
      await chrome.storage.local.set({ pickerSettings: settings });
      status.textContent = t('saved');
    } catch (error) {
      status.textContent = t('save_failed', error.message);
    } finally { enable(true); }
  });
  chrome.storage.local.get('pickerSettings').then(function (stored) {
    settings = api.normalize(stored.pickerSettings);
    render(); enable(true);
  }).catch(function (error) {
    status.textContent = t('settings_load_failed', error.message);
  });
})();
