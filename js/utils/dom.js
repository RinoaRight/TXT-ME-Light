/**
 * dom.js — DOM-утилиты: $, $$, on, delegate, cloneTemplate, createElement, etc.
 */

/**
 * querySelector с опциональным контекстом.
 * @param {string} selector
 * @param {Element|Document} [ctx=document]
 * @returns {Element|null}
 */
export function $(selector, ctx = document) {
  return ctx.querySelector(selector);
}

/**
 * querySelectorAll → Array.
 * @param {string} selector
 * @param {Element|Document} [ctx=document]
 * @returns {Element[]}
 */
export function $$(selector, ctx = document) {
  return Array.from(ctx.querySelectorAll(selector));
}

/**
 * addEventListener с возвратом функции отписки.
 * @param {EventTarget} el
 * @param {string} event
 * @param {EventListener} handler
 * @param {boolean|AddEventListenerOptions} [opts]
 * @returns {() => void}  unsubscribe
 */
export function on(el, event, handler, opts) {
  el.addEventListener(event, handler, opts);
  return () => el.removeEventListener(event, handler, opts);
}

/**
 * Event delegation: обработчик на родителе, фильтрация по selector.
 * @param {Element} parent
 * @param {string} selector
 * @param {string} event
 * @param {(e: Event, target: Element) => void} handler
 * @returns {() => void}  unsubscribe
 */
export function delegate(parent, selector, event, handler) {
  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler(e, target);
    }
  };
  parent.addEventListener(event, listener);
  return () => parent.removeEventListener(event, listener);
}

/**
 * Клонирует <template id="…"> и возвращает DocumentFragment.
 * @param {string} id  — без решётки
 * @returns {DocumentFragment}
 */
export function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  if (!tpl) throw new Error(`Template #${id} not found`);
  return tpl.content.cloneNode(true);
}

/**
 * Быстрое создание DOM-элемента.
 * @param {string} tag
 * @param {Record<string,string>} [attrs]
 * @param {(Node|string)[]} [children]
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  }
  return el;
}

/**
 * Удаляет всё содержимое элемента.
 * @param {Element} el
 */
export function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Скрыть элемент (добавляет класс .hidden).
 * @param {Element} el
 */
export function hide(el) {
  el.classList.add('hidden');
}

/**
 * Показать элемент (убирает класс .hidden).
 * @param {Element} el
 */
export function show(el) {
  el.classList.remove('hidden');
}

/**
 * Заполнить все [data-slot="…"] внутри фрагмента/элемента.
 * Принимает объект { slotName: value }.
 * value может быть: строка (→ textContent), Node (→ appendChild), null (→ пропуск).
 * @param {Element|DocumentFragment} root
 * @param {Record<string, string|Node|null>} slots
 */
export function fillSlots(root, slots) {
  for (const [name, value] of Object.entries(slots)) {
    const el = root.querySelector
      ? root.querySelector(`[data-slot="${name}"]`)
      : root.firstElementChild?.querySelector(`[data-slot="${name}"]`);

    if (!el || value === null || value === undefined) continue;

    if (value instanceof Node) {
      el.appendChild(value);
    } else {
      el.textContent = String(value);
    }
  }
}

/**
 * Безопасно устанавливает href (только http/https).
 * @param {HTMLAnchorElement} el
 * @param {string} url
 */
export function safeHref(el, url) {
  if (/^https?:\/\//i.test(url)) {
    el.href = url;
  } else {
    el.removeAttribute('href');
  }
}
