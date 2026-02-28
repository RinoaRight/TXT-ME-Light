console.log('[auth.js] v: 2026-02-27-v9');
/**
 * auth.js — модель авторизации.
 */

import storage from './utils/storage.js';
import { set401Handler } from './api.js';

const auth = {
  /**
   * Сохранить данные после логина/регистрации.
   * API может возвращать role или userRole — обрабатываем оба варианта.
   */
  save(data) {
    console.log('[auth.save] raw keys:', Object.keys(data ?? {}));
    console.log('[auth.save] raw data:', JSON.stringify(data));

    // Ищем токен — может быть token, accessToken, jwt
    const token    = data.token    ?? data.accessToken ?? data.jwt ?? '';
    // Ищем userId — может быть userId, id, user.userId
    const userId   = data.userId   ?? data.id          ?? data.user?.userId   ?? data.user?.id ?? '';
    // Ищем username
    const username = data.username ?? data.userName    ?? data.user?.username  ?? '';
    // Ищем role
    const role     = data.role     ?? data.userRole    ?? data.user?.role      ?? '';

    console.log('[auth.save] parsed:', { token: token ? '***' : 'MISSING', userId, username, role });

    storage.set('token',    token);
    storage.set('userId',   userId);
    storage.set('username', username);
    storage.set('role',     role);
  },

  clear() {
    storage.remove('token');
    storage.remove('userId');
    storage.remove('username');
    storage.remove('role');
  },

  getToken()    { return storage.get('token');    },
  getUserId()   { return storage.get('userId');   },
  getUsername() { return storage.get('username'); },
  getRole()     { return storage.get('role');     },
  isLoggedIn()  { return !!storage.get('token');  },

  /**
   * Если userId или role пустые но токен есть — пробуем восстановить из JWT payload.
   * JWT payload не верифицируется (нет секрета на клиенте), только декодируется.
   */
  restoreFromToken() {
    const token = storage.get('token');
    if (!token) return;

    // Уже есть всё нужное
    if (storage.get('userId') && storage.get('role')) return;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('[auth.restoreFromToken] JWT payload:', payload);

      if (!storage.get('userId'))   storage.set('userId',   payload.userId   ?? payload.sub ?? '');
      if (!storage.get('username')) storage.set('username', payload.username ?? '');
      if (!storage.get('role'))     storage.set('role',     payload.role     ?? payload.userRole ?? '');
    } catch (e) {
      console.warn('[auth.restoreFromToken] failed:', e.message);
    }
  },

  showReauthModal() {
    document.dispatchEvent(new CustomEvent('auth:reauth-required'));
  },
};

set401Handler(() => auth.showReauthModal());

export default auth;
