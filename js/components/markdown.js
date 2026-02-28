/**
 * markdown.js — рендеринг Markdown через marked.js + DOMPurify.
 * Обе библиотеки подключены через CDN в index.html как глобальные переменные.
 *
 * renderMarkdown(text)        → HTML-строка (санитизирована)
 * renderInto(el, text)        → вставляет HTML в элемент
 * truncateMarkdown(text, n)   → plain-текст, обрезанный до n символов
 * linkMentions(html)          → заменяет @username на <span class="mention">
 */

// Инициализируем marked один раз
let _markedReady = false;

function ensureMarked() {
  if (_markedReady) return;
  if (!window.marked) {
    console.warn('marked.js not loaded yet');
    return;
  }
  window.marked.setOptions({
    gfm:    true,
    breaks: true,
  });
  _markedReady = true;
}

/**
 * Преобразует Markdown-строку в санитизированный HTML.
 * @param {string} text
 * @returns {string}
 */
export function renderMarkdown(text) {
  if (!text) return '';
  ensureMarked();

  if (!window.marked) return escapeHtml(text);

  let raw;
  try {
    raw = window.marked.parse(text);
  } catch (err) {
    console.warn('[markdown] parse error:', err.message);
    return escapeHtml(text);
  }
  const safe = window.DOMPurify
    ? window.DOMPurify.sanitize(raw, {
        ADD_TAGS: ['u'],
        FORBID_ATTR: ['style'],
      })
    : raw;

  return linkMentions(safe);
}

/**
 * Рендерит Markdown в DOM-элемент.
 * @param {Element} el
 * @param {string} text
 */
export function renderInto(el, text) {
  el.innerHTML = renderMarkdown(text);

  // Безопасность: все ссылки открываем в новой вкладке
  el.querySelectorAll('a').forEach(a => {
    a.target   = '_blank';
    a.rel      = 'noopener noreferrer';
    // Блокируем javascript: и data: URL
    if (!/^https?:\/\//i.test(a.href)) {
      a.removeAttribute('href');
    }
  });
}

/**
 * Обрезает Markdown до n символов текстового контента (для превью в ленте).
 * @param {string} text  Markdown
 * @param {number} n     макс. кол-во символов plain-text
 * @returns {string}     обрезанный Markdown (не HTML)
 */
export function truncateMarkdown(text, n = 400) {
  if (!text) return '';
  // Получаем plain-текст через временный div
  const tmp = document.createElement('div');
  tmp.innerHTML = renderMarkdown(text);
  const plain = tmp.textContent ?? '';
  if (plain.length <= n) return text;

  // Возвращаем обрезанный plain-текст (не пытаемся резать Markdown — безопаснее)
  return plain.slice(0, n) + '…';
}

/**
 * Заменяет @username в HTML на <span class="mention">@username</span>.
 * Безопасно — не создаёт href, только span.
 * @param {string} html
 * @returns {string}
 */
export function linkMentions(html) {
  // Ищем @username вне HTML-тегов
  return html.replace(/(?<![="])@([a-zA-Z0-9_-]{1,50})/g, (_, name) =>
    `<span class="mention">@${escapeHtml(name)}</span>`
  );
}

/**
 * Экранирует HTML-спецсимволы (fallback).
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
