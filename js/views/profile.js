/**
 * views/profile.js — страница редактирования профиля.
 * Email, пароль, управление аватарами.
 *
 * export function mount(container, {}) → unmount
 */

import auth from '../auth.js';
import profileModel from '../models/profile.js';
import store from '../store.js';
import router from '../router.js';
import { resizeToAvatar } from '../utils/image.js';
import { showToast } from '../components/toast.js';
import { showConfirm } from '../components/modal.js';
import { getRoleDisplay } from '../utils/format.js';
import { invalidateAvatarCache } from '../components/avatar.js';
import { clearElement } from '../utils/dom.js';

export function mount(container, _params) {
  clearElement(container);

  const page = document.createElement('div');
  page.className = 'profile-edit';

  const h1 = document.createElement('h1');
  h1.textContent = 'Редактирование профиля';
  page.appendChild(h1);

  const loadingEl = document.createElement('div');
  loadingEl.className   = 'loading-state';
  loadingEl.textContent = 'Загрузка…';
  page.appendChild(loadingEl);

  container.appendChild(page);

  // Загружаем профиль
  profileModel.load().then(profile => {
    loadingEl.remove();
    _render(page, profile);
  }).catch(err => {
    loadingEl.textContent = err.message;
  });

  // Подписка: если профиль обновился в store — перерисовать аватары
  const unsub = store.on('change:profile', (profile) => {
    if (!profile) return;
    const avatarsSection = page.querySelector('.avatars-grid-section');
    if (avatarsSection) _rerenderAvatarsGrid(avatarsSection, profile);
  });

  return () => unsub();
}

// ── Полный рендер ─────────────────────────────────────────────────────

function _render(page, profile) {
  // Секция информации
  page.appendChild(_buildInfoSection(profile));

  // Email
  page.appendChild(_buildEmailSection(profile));

  // Пароль
  page.appendChild(_buildPasswordSection());

  // Аватары
  page.appendChild(_buildAvatarsSection(profile));
}

// ── Секция информации ─────────────────────────────────────────────────

function _buildInfoSection(profile) {
  const section = document.createElement('div');
  section.className = 'profile-section';

  const h2 = document.createElement('h2');
  h2.textContent = 'Информация';
  section.appendChild(h2);

  const info = document.createElement('div');
  info.className = 'profile-info';

  const pUser = document.createElement('p');
  pUser.innerHTML = `<strong>Логин:</strong> ${_esc(profile.username)}`;

  const pRole = document.createElement('p');
  pRole.innerHTML = `<strong>Роль:</strong> ${_esc(getRoleDisplay(profile.role))}`;

  info.appendChild(pUser);
  info.appendChild(pRole);
  section.appendChild(info);

  return section;
}

// ── Email ─────────────────────────────────────────────────────────────

function _buildEmailSection(profile) {
  const section = document.createElement('div');
  section.className = 'profile-section';

  const h2 = document.createElement('h2');
  h2.textContent = 'Email-уведомления';
  section.appendChild(h2);

  const currentEmail = document.createElement('p');
  currentEmail.className = 'profile-info';
  currentEmail.innerHTML = `<strong>Текущий email:</strong> ${profile.email ? _esc(profile.email) : '<em>не указан</em>'}`;
  section.appendChild(currentEmail);

  // Форма изменения email
  const form = document.createElement('form');
  form.onsubmit = (e) => e.preventDefault();

  const emailInput = _inputEl('email', 'email', 'Новый email');
  form.appendChild(emailInput.group);

  const errEl = _errorEl();
  form.appendChild(errEl);

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap';

  const saveBtn = document.createElement('button');
  saveBtn.type      = 'button';
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Сохранить email';
  saveBtn.addEventListener('click', async () => {
    const email = emailInput.input.value.trim();
    errEl.classList.add('hidden');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Введите корректный email';
      errEl.classList.remove('hidden');
      return;
    }
    saveBtn.disabled = true;
    try {
      await profileModel.updateEmail(email);
      currentEmail.innerHTML = `<strong>Текущий email:</strong> ${_esc(email)}`;
      emailInput.input.value = '';
      showToast('Email обновлён', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      saveBtn.disabled = false;
    }
  });

  actions.appendChild(saveBtn);

  // Кнопка отключения уведомлений
  if (profile.email) {
    const disableBtn = document.createElement('button');
    disableBtn.type      = 'button';
    disableBtn.className = 'btn btn-danger';
    disableBtn.textContent = 'Отключить уведомления';
    disableBtn.addEventListener('click', async () => {
      const ok = await showConfirm('Отключить email-уведомления?', 'Отключить');
      if (!ok) return;
      try {
        await profileModel.deleteEmail();
        currentEmail.innerHTML = `<strong>Текущий email:</strong> <em>не указан</em>`;
        disableBtn.remove();
        showToast('Email удалён', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
    actions.appendChild(disableBtn);
  }

  form.appendChild(actions);
  section.appendChild(form);
  return section;
}

// ── Пароль ────────────────────────────────────────────────────────────

function _buildPasswordSection() {
  const section = document.createElement('div');
  section.className = 'profile-section';

  const h2 = document.createElement('h2');
  h2.textContent = 'Смена пароля';
  section.appendChild(h2);

  const form = document.createElement('form');
  form.onsubmit = (e) => e.preventDefault();

  const oldInput     = _inputEl('current-password', 'password', 'Текущий пароль', 'current-password');
  const newInput     = _inputEl('new-password',     'password', 'Новый пароль', 'new-password');
  const confirmInput = _inputEl('confirm-password', 'password', 'Подтверждение нового пароля', 'new-password');

  form.appendChild(oldInput.group);
  form.appendChild(newInput.group);
  form.appendChild(confirmInput.group);

  const errEl = _errorEl();
  form.appendChild(errEl);

  const saveBtn = document.createElement('button');
  saveBtn.type      = 'button';
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Изменить пароль';
  saveBtn.addEventListener('click', async () => {
    const oldPw  = oldInput.input.value;
    const newPw  = newInput.input.value;
    const confirm = confirmInput.input.value;
    errEl.classList.add('hidden');

    if (!oldPw || !newPw || !confirm) {
      errEl.textContent = 'Заполните все поля';
      errEl.classList.remove('hidden');
      return;
    }
    if (newPw.length < 8) {
      errEl.textContent = 'Новый пароль должен содержать минимум 8 символов';
      errEl.classList.remove('hidden');
      return;
    }
    if (newPw !== confirm) {
      errEl.textContent = 'Пароли не совпадают';
      errEl.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    try {
      await profileModel.updatePassword(oldPw, newPw);
      oldInput.input.value = '';
      newInput.input.value = '';
      confirmInput.input.value = '';
      showToast('Пароль изменён', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      saveBtn.disabled = false;
    }
  });

  form.appendChild(saveBtn);
  section.appendChild(form);
  return section;
}

// ── Аватары ───────────────────────────────────────────────────────────

function _buildAvatarsSection(profile) {
  const section = document.createElement('div');
  section.className = 'profile-section';

  const h2 = document.createElement('h2');
  h2.textContent = 'Аватары';
  section.appendChild(h2);

  // Загрузка нового аватара
  const uploadWrap = document.createElement('div');
  uploadWrap.className = 'avatar-upload';

  const MAX_AVATARS = 50;
  const atLimit     = (profile.avatars?.length ?? 0) >= MAX_AVATARS;

  const fileLabel = document.createElement('label');
  fileLabel.className = atLimit ? 'disabled' : '';

  const fileInput = document.createElement('input');
  fileInput.type   = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.disabled      = atLimit;

  const uploadBtn = document.createElement('button');
  uploadBtn.type      = 'button';
  uploadBtn.className = `btn ${atLimit ? '' : 'btn-primary'}`;
  uploadBtn.disabled  = atLimit;
  uploadBtn.textContent = atLimit
    ? `Достигнут лимит ${MAX_AVATARS} аватаров`
    : '+ Загрузить аватар';

  uploadBtn.addEventListener('click', () => !atLimit && fileInput.click());

  const uploadErr = document.createElement('div');
  uploadErr.className = 'form-error hidden';

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    uploadErr.classList.add('hidden');
    uploadBtn.disabled    = true;
    uploadBtn.textContent = 'Обработка…';
    try {
      const dataUrl = await resizeToAvatar(file);
      await profileModel.addAvatar(dataUrl);
      invalidateAvatarCache(auth.getUserId());
      showToast('Аватар добавлен', 'success');
    } catch (err) {
      uploadErr.textContent = err.message;
      uploadErr.classList.remove('hidden');
    } finally {
      uploadBtn.disabled    = false;
      uploadBtn.textContent = '+ Загрузить аватар';
      fileInput.value       = '';
    }
  });

  fileLabel.appendChild(fileInput);
  uploadWrap.appendChild(uploadBtn);
  uploadWrap.appendChild(fileLabel);
  uploadWrap.appendChild(uploadErr);
  section.appendChild(uploadWrap);

  // Сетка аватаров
  const gridSection = document.createElement('div');
  gridSection.className = 'avatars-grid-section';
  _rerenderAvatarsGrid(gridSection, profile);
  section.appendChild(gridSection);

  return section;
}

function _rerenderAvatarsGrid(container, profile) {
  clearElement(container);

  const avatars = profile.avatars ?? [];
  if (!avatars.length) {
    const empty = document.createElement('p');
    empty.style.color = 'var(--muted-foreground)';
    empty.textContent = 'У вас пока нет аватаров.';
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'avatars-grid';

  for (const av of avatars) {
    const item = document.createElement('div');
    item.className = `avatar-item${av.avatarId === profile.activeAvatarId ? ' active' : ''}`;

    const img = document.createElement('img');
    img.src    = av.dataUrl ?? '';
    img.alt    = `Аватар ${av.avatarId}`;
    img.width  = 50;
    img.height = 50;
    item.appendChild(img);

    if (av.avatarId === profile.activeAvatarId) {
      const badge = document.createElement('span');
      badge.className   = 'avatar-badge';
      badge.textContent = '✓ Активный';
      item.appendChild(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'avatar-actions';

    // Кнопка «Сделать активным»
    if (av.avatarId !== profile.activeAvatarId) {
      const setBtn = document.createElement('button');
      setBtn.type      = 'button';
      setBtn.className = 'btn-small';
      setBtn.textContent = 'Активный';
      setBtn.addEventListener('click', async () => {
        try {
          await profileModel.setActiveAvatar(av.avatarId);
          invalidateAvatarCache(auth.getUserId());
          showToast('Активный аватар установлен', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
      actions.appendChild(setBtn);
    }

    // Кнопка «Удалить»
    const delBtn = document.createElement('button');
    delBtn.type      = 'button';
    delBtn.className = 'btn-small btn-danger';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', async () => {
      try {
        await profileModel.deleteAvatar(av.avatarId);
        invalidateAvatarCache(auth.getUserId());
        showToast('Аватар удалён', 'success');
      } catch (err) {
        // 409 — нельзя удалить активный
        showToast(
          err.status === 409
            ? 'Нельзя удалить активный аватар. Сначала сделайте другой активным.'
            : err.message,
          'error'
        );
      }
    });
    actions.appendChild(delBtn);

    item.appendChild(actions);
    grid.appendChild(item);
  }

  container.appendChild(grid);
}

// ── Хелперы ───────────────────────────────────────────────────────────

function _inputEl(id, type, label, autocomplete = '') {
  const group = document.createElement('div');
  group.className = 'form-group';

  const lbl = document.createElement('label');
  lbl.setAttribute('for', id);
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = type;
  input.id   = id;
  input.name = id;
  if (autocomplete) input.autocomplete = autocomplete;

  group.appendChild(lbl);
  group.appendChild(input);
  return { group, input };
}

function _errorEl() {
  const el = document.createElement('div');
  el.className = 'error hidden';
  return el;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
