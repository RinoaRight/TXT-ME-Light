/**
 * storage.js — обёртка над localStorage с JSON-сериализацией.
 * Все ключи приложения хранятся с префиксом для изоляции.
 */

const PREFIX = 'txtme_';

const storage = {
  /**
   * @param {string} key
   * @param {*} [defaultVal]
   * @returns {*}
   */
  get(key, defaultVal = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultVal;
      return JSON.parse(raw);
    } catch {
      return defaultVal;
    }
  },

  /**
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Safari private mode / quota exceeded — молча игнорируем
    }
  },

  /**
   * @param {string} key
   */
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  /**
   * Удаляет только ключи приложения (с PREFIX), не трогает сторонние.
   */
  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },
};

export default storage;
