/**
 * avatar.js — компонент AvatarDisplay.
 * Загружает аватар пользователя, кеширует в памяти, рендерит SVG-заглушку с инициалами.
 *
 * createAvatar({ userId, avatarId?, username, size? }) → Element
 */

import { avatarAPI } from '../api.js';

// Кеш: userId → { avatarDataUrl, avatars[] }
const _cache = new Map();

/**
 * Создаёт DOM-элемент аватара (img или SVG-заглушка).
 * Загрузка асинхронная — сначала показывает заглушку, потом подставляет img.
 *
 * @param {{
 *   userId: string,
 *   avatarId?: string|null,
 *   username: string,
 *   size?: number
 * }} opts
 * @returns {HTMLElement}
 */
export function createAvatar({ userId, avatarId = null, username = '?', size = 48 }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'avatar-display';
  wrapper.style.cssText = `width:${size}px;height:${size}px;display:inline-block;flex-shrink:0`;

  // Сразу показываем заглушку
  renderFallback(wrapper, username, size);

  if (userId) {
    loadAvatar(userId, avatarId, username, size, wrapper);
  }

  return wrapper;
}

// ── Загрузка ──────────────────────────────────────────────────────────

async function loadAvatar(userId, avatarId, username, size, wrapper) {
  try {
    let data = _cache.get(userId);
    if (!data) {
      data = await avatarAPI.get(userId);
      console.log(`[avatar] userId=${userId} response:`, data);
      if (data) _cache.set(userId, data);
    }
    if (!data) return;

    let dataUrl = null;

    if (avatarId && data.avatars?.length) {
      const found = data.avatars.find(a => a.avatarId === avatarId);
      dataUrl = found?.dataUrl ?? null;
    }

    if (!dataUrl) {
      dataUrl = data.avatarDataUrl ?? null;
    }

    if (dataUrl) {
      renderImg(wrapper, dataUrl, username, size);
    }
  } catch {
    // Оставляем заглушку
  }
}

// ── Рендеринг ─────────────────────────────────────────────────────────

function renderImg(wrapper, dataUrl, username, size) {
  wrapper.innerHTML = '';
  const img = document.createElement('img');
  img.src    = dataUrl;
  img.alt    = `Аватар ${username}`;
  img.width  = size;
  img.height = size;
  img.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block`;
  img.onerror = () => renderFallback(wrapper, username, size);
  wrapper.appendChild(img);
}

function renderFallback(wrapper, username, size) {
  wrapper.innerHTML = '';
  const initials = (username ?? '?').slice(0, 2).toUpperCase();
  const color    = hashColor(username ?? '');
  const fontSize = Math.round(size * 0.36);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width',  size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-label', `Аватар ${username}`);
  svg.style.display = 'block';

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', size / 2);
  circle.setAttribute('cy', size / 2);
  circle.setAttribute('r',  size / 2);
  circle.setAttribute('fill', color);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x',             size / 2);
  text.setAttribute('y',             size / 2);
  text.setAttribute('text-anchor',   'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-size',     fontSize);
  text.setAttribute('font-family',   '-apple-system, BlinkMacSystemFont, sans-serif');
  text.setAttribute('font-weight',   '600');
  text.setAttribute('fill',          '#ffffff');
  text.textContent = initials;

  svg.appendChild(circle);
  svg.appendChild(text);
  wrapper.appendChild(svg);
}

// ── Утилиты ───────────────────────────────────────────────────────────

/**
 * Детерминированный цвет по строке (хеш → HSL).
 * @param {string} str
 * @returns {string} hex color
 */
function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

/**
 * Инвалидировать кеш аватара для userId (после смены активного аватара).
 * @param {string} userId
 */
export function invalidateAvatarCache(userId) {
  _cache.delete(userId);
}
