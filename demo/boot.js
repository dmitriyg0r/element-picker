const start = document.getElementById('start-demo');
const error = document.getElementById('demo-error');
let handlePickerMessage;

try {
  const response = await fetch('../_locales/en/messages.json');
  if (!response.ok) throw new Error('Demo translation unavailable');
  const dictionary = await response.json();

  const demoChrome = globalThis.chrome || (globalThis.chrome = {});
  demoChrome.i18n = {
    getUILanguage: () => 'en',
    getMessage(key, substitutions = []) {
      const translation = dictionary[key];
      if (!translation) return '';
      const values = Array.isArray(substitutions) ? substitutions : [substitutions];
      const substitute = (_, position) => String(values[Number(position) - 1] ?? '');
      return translation.message.replace(/\$\$|\$([A-Z][A-Z0-9_]*)\$|\$(\d+)/gi,
        (token, name, position) => {
          if (token === '$$') return '$';
          if (position) return substitute(token, position);
          return (translation.placeholders?.[name.toLowerCase()]?.content || '').replace(/\$(\d+)/g, substitute);
        });
    }
  };
  demoChrome.runtime = {
    onMessage: { addListener(listener) { handlePickerMessage = listener; } }
  };
  demoChrome.storage = {
    onChanged: { addListener() {} },
    local: { get: async () => ({}) }
  };

  document.addEventListener('click', event => {
    if (event.target !== start) return;
    event.stopImmediatePropagation();
    handlePickerMessage({ type: 'toggle-picker' });
  }, true);

  for (const path of ['i18n.js', 'shortcuts.js', 'capture.js', 'picker-styles.js', 'content.js']) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('../' + path, import.meta.url);
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  if (!handlePickerMessage) throw new Error('Demo picker did not start');
  start.disabled = false;
} catch (cause) {
  error.hidden = false;
  console.error('Element Picker demo could not start', cause);
}
