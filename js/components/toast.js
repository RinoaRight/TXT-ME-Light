/**
 * toast.js — всплывающие уведомления.
 * Позиция: bottom-right (десктоп), bottom-center (мобильные).
 * Auto-dismiss 4 сек, закрытие по клику, очередь стопкой.
 */

const DURATION = 4000;

let _root = null;

function getRoot() {
  if (!_root) _root = document.getElementById('toast-root');
  return _root;
}

/**
 * Показать toast-уведомление.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 */
export function showToast(message, type = 'info') {
  const root = getRoot();
  if (!root) return;

  const tpl  = document.getElementById('tpl-toast');
  const frag = tpl.content.cloneNode(true);
  const el   = frag.querySelector('.toast');

  el.classList.add(type);
  el.querySelector('[data-slot="message"]').textContent = message;

  // Закрытие по клику
  el.addEventListener('click', () => dismiss(el));

  root.appendChild(el);

  // Auto-dismiss
  const timer = setTimeout(() => dismiss(el), DURATION);
  el._toastTimer = timer;
}

function dismiss(el) {
  if (!el.parentNode) return;
  clearTimeout(el._toastTimer);
  el.style.transition = 'opacity 0.3s';
  el.style.opacity    = '0';
  setTimeout(() => el.remove(), 300);
}
