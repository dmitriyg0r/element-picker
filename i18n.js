(function () {
  'use strict';

  function message(name, ...values) {
    return chrome.i18n.getMessage(name, values.map(String));
  }

  globalThis.PickerI18n = { message };
})();
