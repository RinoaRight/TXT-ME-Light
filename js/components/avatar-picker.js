/**
 * avatar-picker.js — компонент выбора аватара.
 * Десктоп (>768px): позиционированный попап.
 * Мобильные (≤768px): bottom-sheet с анимацией slide-up.
 *
 * createAvatarPicker({ currentAvatarId, onSelect }) → { trigger: Element, destroy() }
 */

import { profileAPI } from '../api.js';
import storage from '../utils/storage.js';

const RECENTS_KEY   = 'avatar-recents';
const RECENTS_MAX   = 6;
const SEARCH_AFTER  = 20; // показывать поиск при ≥N аватаров

/**
 * @param {{
 *   currentAvatarId?: string|null,
 *   onSelect: (avatarId: string) => void
 * }} opts
 * @returns {{ trigger: HTMLElement, setAvatarId: (id:string|null)=>void }}
 */
export function createAvatarPicker({ currentAvatarId = null, onSelect }) {
  let _avatars       = [];     // все аватары профиля
  let _selectedId    = currentAvatarId;
  let _overlayEl     = null;   // текущий открытый оверлей
  let _triggerEl     = null;   // кнопка-триггер

  // ── Триггер ──────────────────────────────────────────────────────────

  _triggerEl = document.createElement('button');
  _triggerEl.type      = 'button';
  _triggerEl.className = 'avatar-picker-trigger';
  _triggerEl.setAttribute('aria-label', 'Выбрать аватар');
  _updateTrigger();

  _triggerEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (_overlayEl) {
      _close();
    } else {
      _open();
    }
  });

  // ── Открытие ─────────────────────────────────────────────────────────

  async function _open() {
    const isMobile = window.innerWidth <= 768;

    // Оверлей
    const overlay = document.createElement('div');
    overlay.className = `avatar-picker-overlay ${isMobile ? 'is-mobile' : 'is-desktop'}`;

    // Поверхность
    const surface = document.createElement('div');
    surface.className = `avatar-picker-surface ${isMobile ? 'sheet' : 'popover'}`;

    // Шапка
    const header = document.createElement('div');
    header.className = 'avatar-picker-header';
    header.innerHTML = `<span>Выбрать аватар</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.type      = 'button';
    closeBtn.className = 'avatar-picker-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.addEventListener('click', _close);
    header.appendChild(closeBtn);

    // Тело
    const body = document.createElement('div');
    body.className = 'avatar-picker-body';
    body.textContent = 'Загрузка…';

    surface.appendChild(header);
    surface.appendChild(body);
    overlay.appendChild(surface);
    document.body.appendChild(overlay);
    _overlayEl = overlay;

    // Позиция попапа на десктопе
    if (!isMobile) {
      _positionPopover(surface);
    }

    // Закрыть по оверлею (только мобильный, т.к. на десктопе нет затемнения)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _close();
    });

    // Escape
    const onKey = (e) => { if (e.key === 'Escape') _close(); };
    document.addEventListener('keydown', onKey);
    overlay._removeKey = () => document.removeEventListener('keydown', onKey);

    // Загрузить аватары
    try {
      const profile = await profileAPI.get();
      _avatars = profile?.avatars ?? [];
    } catch {
      _avatars = [];
    }

    _renderBody(body);
  }

  function _close() {
    if (!_overlayEl) return;
    _overlayEl._removeKey?.();
    _overlayEl.remove();
    _overlayEl = null;
    _triggerEl.focus();
  }

  // ── Рендеринг тела ────────────────────────────────────────────────────

  function _renderBody(body) {
    body.innerHTML = '';

    if (!_avatars.length) {
      const empty = document.createElement('p');
      empty.className   = 'avatar-empty';
      empty.textContent = 'Нет загруженных аватаров. Добавьте их в профиле.';
      body.appendChild(empty);
      return;
    }

    // Поиск (при ≥ SEARCH_AFTER аватаров)
    let filterFn = () => true;
    if (_avatars.length >= SEARCH_AFTER) {
      const searchRow = document.createElement('div');
      searchRow.className = 'avatar-search';
      const input = document.createElement('input');
      input.type        = 'text';
      input.placeholder = 'Поиск по ID…';
      input.setAttribute('aria-label', 'Поиск аватара');
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        filterFn = (a) => !q || a.avatarId.toLowerCase().includes(q);
        renderGrid();
      });
      searchRow.appendChild(input);
      body.appendChild(searchRow);
    }

    // Секция «Недавние»
    const recents = getRecents();
    if (recents.length) {
      const recentAvatars = recents
        .map(id => _avatars.find(a => a.avatarId === id))
        .filter(Boolean);

      if (recentAvatars.length) {
        const section = document.createElement('div');
        section.className = 'avatar-recents';
        const label = document.createElement('div');
        label.className   = 'avatar-recents-label';
        label.textContent = 'Недавние';
        const row = document.createElement('div');
        row.className = 'avatar-selector avatar-recents-row';

        for (const av of recentAvatars) {
          row.appendChild(_makeOption(av));
        }

        section.appendChild(label);
        section.appendChild(row);
        body.appendChild(section);
      }
    }

    // Основная сетка
    const gridContainer = document.createElement('div');
    body.appendChild(gridContainer);

    function renderGrid() {
      gridContainer.innerHTML = '';
      const visible = _avatars.filter(filterFn);
      if (!visible.length) {
        gridContainer.textContent = 'Ничего не найдено';
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'avatar-selector';
      grid.style.flexWrap = 'wrap';
      for (const av of visible) {
        grid.appendChild(_makeOption(av));
      }
      gridContainer.appendChild(grid);
    }

    renderGrid();
  }

  function _makeOption(av) {
    const tpl  = document.getElementById('tpl-avatar-item');
    const frag = tpl.content.cloneNode(true);
    const opt  = frag.querySelector('.avatar-option');

    opt.dataset.avatarId = av.avatarId;
    if (av.avatarId === _selectedId) opt.classList.add('selected');

    const img = opt.querySelector('[data-slot="img"]');
    img.src = av.dataUrl ?? '';
    img.alt = av.avatarId;

    const previewImg = opt.querySelector('[data-slot="preview-img"]');
    if (previewImg) {
      previewImg.src = av.dataUrl ?? '';
      previewImg.alt = av.avatarId;
    }

    const previewLabel = opt.querySelector('[data-slot="label"]');
    if (previewLabel) previewLabel.textContent = av.avatarId.slice(-6);

    opt.addEventListener('click', () => {
      _selectedId = av.avatarId;
      saveRecent(av.avatarId);
      _updateTrigger();
      onSelect(av.avatarId);
      _close();
    });

    opt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        opt.click();
      }
    });

    return opt;
  }

  // ── Позиционирование попапа (десктоп) ─────────────────────────────────

  function _positionPopover(surface) {
    const rect   = _triggerEl.getBoundingClientRect();
    const spaceB = window.innerHeight - rect.bottom;
    const spaceT = rect.top;

    let top;
    if (spaceB >= 320 || spaceB > spaceT) {
      top = rect.bottom + 8;
    } else {
      top = rect.top - 8; // открывается вверх — скорректируем после рендера
      requestAnimationFrame(() => {
        top = rect.top - surface.offsetHeight - 8;
        surface.style.top = `${Math.max(8, top)}px`;
      });
    }

    let left = rect.left;
    // Не выходить за правый край
    requestAnimationFrame(() => {
      if (left + surface.offsetWidth > window.innerWidth - 8) {
        left = window.innerWidth - surface.offsetWidth - 8;
      }
      surface.style.left = `${Math.max(8, left)}px`;
    });

    surface.style.top  = `${Math.max(8, top)}px`;
    surface.style.left = `${Math.max(8, left)}px`;
  }

  // ── Обновление кнопки-триггера ────────────────────────────────────────

  function _updateTrigger() {
    _triggerEl.innerHTML = '';

    // Найти dataUrl выбранного аватара
    const av = _selectedId ? _avatars.find(a => a.avatarId === _selectedId) : null;

    if (av?.dataUrl) {
      const img = document.createElement('img');
      img.src    = av.dataUrl;
      img.alt    = 'Аватар';
      img.width  = 36;
      img.height = 36;
      img.style.cssText = 'width:36px;height:36px;border-radius:50%;object-fit:cover';
      _triggerEl.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.className   = 'avatar-picker-trigger-fallback';
      fallback.textContent = '👤';
      _triggerEl.appendChild(fallback);
    }

    const text = document.createElement('span');
    text.className   = 'avatar-picker-trigger-text';
    text.textContent = _selectedId ? 'Аватар выбран' : 'Выбрать аватар';
    _triggerEl.appendChild(text);
  }

  // ── Недавние (localStorage) ───────────────────────────────────────────

  function getRecents() {
    return storage.get(RECENTS_KEY, []);
  }

  function saveRecent(id) {
    let list = getRecents().filter(x => x !== id);
    list.unshift(id);
    storage.set(RECENTS_KEY, list.slice(0, RECENTS_MAX));
  }

  // ── Публичный API ─────────────────────────────────────────────────────

  return {
    /** Кнопка-триггер для вставки в DOM */
    trigger: _triggerEl,

    /** Программно обновить выбранный аватар */
    setAvatarId(id) {
      _selectedId = id;
      _updateTrigger();
    },
  };
}
