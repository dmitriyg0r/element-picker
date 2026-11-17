(function () {
  'use strict';
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
      if (!tabs.length || tabs[0].id == null) throw new Error('Нет активной вкладки');
      await chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-picker' });
      window.close();
    } catch (error) {
      status.textContent = 'Откройте сайт HTTP/HTTPS. Обновите страницу после обновления расширения.';
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
    record.textContent = 'Изменить';
    render();
  }
  function enable(enabled) {
    [record, clear, save, reset, command].forEach(function (element) { element.disabled = !enabled; });
  }
  record.addEventListener('click', function () {
    if (recording) { endRecording(); status.textContent = 'Запись отменена.'; return; }
    recording = true;
    record.textContent = 'Отмена';
    field.value = 'Нажмите сочетание…';
    field.focus();
    status.textContent = 'Нажмите клавиши. Esc — отмена.';
  });
  document.addEventListener('keydown', function (e) {
    if (!recording) return;
    e.preventDefault(); e.stopPropagation();
    if (e.code === 'Escape') { endRecording(); status.textContent = 'Запись отменена.'; return; }
    var shortcut = api.fromEvent(e);
    if (!shortcut) { status.textContent = 'Нужны Ctrl, Alt / Option или Cmd / Win и ещё одна клавиша.'; return; }
    settings.shortcut = shortcut;

    endRecording();
    status.textContent = 'Нажмите «Сохранить».';
  }, true);
  clear.addEventListener('click', function () {
    settings.shortcut = null;
    endRecording();
    status.textContent = 'Нажмите «Сохранить».';
  });

  command.addEventListener('change', function () {
    settings.dualCommand = command.checked;
    if (recording) endRecording();
    status.textContent = 'Нажмите «Сохранить».';
  });

  reset.addEventListener('click', function () {
    settings = api.defaults(); endRecording();
    status.textContent = 'Нажмите «Сохранить».';
  });
  save.addEventListener('click', async function () {
    endRecording();
    enable(false);
    try {
      await chrome.storage.local.set({ pickerSettings: settings });
      status.textContent = 'Сохранено';
    } catch (error) {
      status.textContent = 'Не удалось сохранить настройки: ' + error.message;
    } finally { enable(true); }
  });
  chrome.storage.local.get('pickerSettings').then(function (stored) {
    settings = api.normalize(stored.pickerSettings);
    render(); enable(true);
  }).catch(function (error) {
    status.textContent = 'Не удалось загрузить настройки: ' + error.message + '. Обновите страницу.';
  });
})();
