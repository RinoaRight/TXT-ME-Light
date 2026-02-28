/**
 * router.js — Hash-роутер с History API.
 *
 * Маршруты:
 *   #/             → FeedView
 *   #/posts        → FeedView
 *   #/posts/new    → EditorView (создание)
 *   #/posts/:id    → PostView
 *   #/posts/:id/edit → EditorView (редактирование)
 *   #/login        → AuthView (логин)
 *   #/register     → AuthView (регистрация)
 *   #/profile/edit → ProfileView
 *   *              → redirect #/
 */

import auth from './auth.js';

// Views подключаются через lazy-import чтобы не создавать циклических зависимостей.
// Каждая view экспортирует функцию mount(container, params).

let _currentUnmount = null;

// ── Маршрутная таблица ────────────────────────────────────────────────

const routes = [
  { pattern: /^\/posts\/new$/,             view: () => import('./views/editor.js'),  auth: true,  params: () => ({ mode: 'create' }) },
  { pattern: /^\/posts\/([^/]+)\/edit$/,   view: () => import('./views/editor.js'),  auth: true,  params: (m) => ({ mode: 'edit', postId: m[1] }) },
  { pattern: /^\/posts\/([^/]+)$/,         view: () => import('./views/post.js'),    auth: false, params: (m) => ({ postId: m[1] }) },
  { pattern: /^\/posts\/?$/,               view: () => import('./views/feed.js'),    auth: false, params: () => ({}) },
  { pattern: /^\/login$/,                  view: () => import('./views/auth.js'),    auth: false, params: () => ({ mode: 'login' }) },
  { pattern: /^\/register$/,               view: () => import('./views/auth.js'),    auth: false, params: () => ({ mode: 'register' }) },
  { pattern: /^\/profile\/edit$/,          view: () => import('./views/profile.js'), auth: true,  params: () => ({}) },
  { pattern: /^\/$/,                        view: () => import('./views/feed.js'),    auth: false, params: () => ({}) },
];

// ── Парсинг пути из hash ──────────────────────────────────────────────

function getPath() {
  // hash вида #/posts/123  →  /posts/123
  const hash = location.hash;
  if (!hash || hash === '#') return '/';
  const path = hash.slice(1).split('?')[0].split('#')[0]; return path || '/';
}

function getHashParams() {
  const hash = location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return {};
  return Object.fromEntries(new URLSearchParams(hash.slice(qIndex + 1)));
}

// ── Навигация ─────────────────────────────────────────────────────────

const router = {
  /**
   * Навигация с добавлением записи в историю.
   * @param {string} path  например '/posts/123'
   */
  push(path) {
    location.hash = path;
  },

  /**
   * Навигация без новой записи в историю (replaceState).
   * @param {string} path
   */
  replace(path) {
    history.replaceState(null, '', '#' + path);
    this._resolve();
  },

  /**
   * Главный диспетчер маршрутов.
   */
  async _resolve() {
    const path       = getPath();
    const hashParams = getHashParams();

    // Найти подходящий маршрут
    let matched = null;
    let matchResult = null;

    for (const route of routes) {
      const m = path.match(route.pattern);
      if (m) {
        matched = route;
        matchResult = m;
        break;
      }
    }

    // Нет маршрута → редирект на /
    if (!matched) {
      this.push('/');
      return;
    }

    // Требует авторизации?
    if (matched.auth && !auth.isLoggedIn()) {
      this.push('/login');
      return;
    }

    // Размонтировать предыдущий view
    if (_currentUnmount) {
      try { _currentUnmount(); } catch {}
      _currentUnmount = null;
    }

    // Рендерить новый view
    try {
      const mod    = await matched.view();
      const params = { ...matched.params(matchResult), ...hashParams };
      const app    = document.getElementById('app');

      if (mod.mount) {
        _currentUnmount = mod.mount(app, params) ?? null;
      }
    } catch (err) {
      console.error('Router: view load error', err);
    }
  },

  /**
   * Инициализация: слушаем hashchange и сразу резолвим текущий маршрут.
   */
  init() {
    window.addEventListener('hashchange', () => this._resolve());
    this._resolve();
  },
};

export default router;
