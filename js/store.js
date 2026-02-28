/**
 * store.js — реактивное in-memory хранилище состояния.
 * Паттерн EventEmitter: store.set(key, val) → emit('change:key', val).
 * Views подписываются на события, чтобы перерисоваться.
 */

// ── Начальное состояние ───────────────────────────────────────────────

const initialState = {
  /** @type {object[]} текущий список постов в ленте */
  posts: [],

  /** @type {{prevUntil: string|null, nextSince: string|null}} */
  pageMeta: { prevUntil: null, nextSince: null },

  /** @type {object|null} пост, открытый в PostView */
  currentPost: null,

  /** @type {object[]} комментарии текущего поста (плоский список) */
  comments: [],

  /** @type {string[]} все теги из /meta/filters */
  allTags: [],

  /** @type {string[]} все авторы из /meta/filters */
  allAuthors: [],

  /** @type {{tag: string|null, author: string|null, since: string|null, until: string|null}} */
  activeFilters: { tag: null, author: null, since: null, until: null },

  /** @type {object|null} профиль авторизованного пользователя */
  profile: null,

  /** @type {boolean} */
  loading: false,

  /** @type {string|null} */
  error: null,
};

// ── EventEmitter ──────────────────────────────────────────────────────

class Store {
  constructor(initial) {
    this._state    = { ...initial };
    this._handlers = {}; // { event: Set<handler> }
  }

  /**
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Установить значение и вызвать событие change:<key>.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    this._state[key] = value;
    this.emit(`change:${key}`, value);
  }

  /**
   * Подписаться на событие.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} unsubscribe
   */
  on(event, handler) {
    if (!this._handlers[event]) this._handlers[event] = new Set();
    this._handlers[event].add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Отписаться от события.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    this._handlers[event]?.delete(handler);
  }

  /**
   * Опубликовать произвольное событие.
   * @param {string} event
   * @param {*} [data]
   */
  emit(event, data) {
    this._handlers[event]?.forEach(h => {
      try { h(data); } catch (e) { console.error(`Store handler error [${event}]:`, e); }
    });
  }
}

const store = new Store(initialState);

export default store;
