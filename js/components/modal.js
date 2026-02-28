/**
 * modal.js — универсальное модальное окно.
 * Рендерится в #modal-root, поддерживает стек.
 * Закрытие по Escape и клику на оверлей.
 *
 * showModal({ title, description?, body?, actions[] })
 *
 * action: { label, className, onClick(closeFn) → void|false }
 * Если onClick возвращает false — не закрывает.
 */

let _stack = []; // стек открытых модалок

/**
 * @param {{
 *   title: string,
 *   description?: string,
 *   body?: Element,
 *   actions?: Array<{label:string, className?:string, onClick:(close:()=>void)=>void|false}>
 * }} options
 * @returns {() => void} close function
 */
export function showModal(options) {
  const root = document.getElementById('modal-root');
  const tpl  = document.getElementById('tpl-modal');
  const frag = tpl.content.cloneNode(true);
  const overlay = frag.querySelector('.modal-overlay');
  const content = frag.querySelector('.modal-content');

  // Заполняем слоты
  overlay.querySelector('[data-slot="title"]').textContent       = options.title ?? '';
  overlay.querySelector('[data-slot="description"]').textContent = options.description ?? '';

  if (options.body) {
    overlay.querySelector('[data-slot="body"]').appendChild(options.body);
  }

  // Кнопки действий
  const actionsEl = overlay.querySelector('[data-slot="actions"]');
  if (options.actions?.length) {
    for (const action of options.actions) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.className   = action.className ?? 'btn';
      btn.addEventListener('click', async () => {
        const result = await action.onClick?.(close);
        if (result !== false) close();
      });
      actionsEl.appendChild(btn);
    }
  }

  // Закрытие
  const closeBtn = overlay.querySelector('.modal-close');
  closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Escape
  const onKeyDown = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKeyDown);

  // Управление фокусом
  const prevFocus = document.activeElement;

  root.appendChild(overlay);
  _stack.push(overlay);

  // Фокус на первый интерактивный элемент
  requestAnimationFrame(() => {
    const focusable = content.querySelector('button, input, textarea, select, [tabindex]');
    focusable?.focus();
  });

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    _stack = _stack.filter(m => m !== overlay);
    prevFocus?.focus();
  }

  return close;
}

/**
 * Диалог подтверждения.
 * @param {string} message
 * @param {string} [confirmLabel='Удалить']
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, confirmLabel = 'Удалить') {
  return new Promise((resolve) => {
    showModal({
      title: 'Подтверждение',
      description: message,
      actions: [
        {
          label: confirmLabel,
          className: 'btn-danger',
          onClick(close) { close(); resolve(true); return false; },
        },
        {
          label: 'Отмена',
          className: 'btn',
          onClick(close) { close(); resolve(false); return false; },
        },
      ],
    });
  });
}
