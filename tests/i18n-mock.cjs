const english = require('../_locales/en/messages.json');
const russian = require('../_locales/ru/messages.json');

function makeI18n(locale) {
  const messages = locale === 'ru' ? russian : english;
  return {
    getMessage(key, substitutions = []) {
      const entry = messages[key] || english[key];
      if (!entry) return '';
      return entry.message.replace(/\$([A-Z0-9_]+)\$/gi, (_, placeholder) => {
        const parameter = entry.placeholders[placeholder.toLowerCase()].content;
        return substitutions[Number(parameter.slice(1)) - 1] ?? '';
      });
    }
  };
}

module.exports = { makeI18n };
