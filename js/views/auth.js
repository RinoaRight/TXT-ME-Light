console.log('[auth.js] v: 2026-02-27-v9');
/**
 * views/auth.js — формы Login и Register.
 *
 * export function mount(container, { mode: 'login'|'register' }) → unmount
 */

import auth from '../auth.js';
import { authAPI, profileAPI } from '../api.js';
import router from '../router.js';
import { showToast } from '../components/toast.js';
import { clearElement } from '../utils/dom.js';

export function mount(container, { mode = 'login' }) {
  clearElement(container);

  const page = document.createElement('div');
  page.className = 'auth-page';

  const card = document.createElement('div');
  card.className = 'form-card';
  card.style.maxWidth = '400px';
  card.style.margin   = '2rem auto';

  const h1 = document.createElement('h1');
  h1.style.marginBottom = '1.5rem';
  h1.style.fontSize     = '1.5rem';
  h1.textContent = mode === 'login' ? 'Вход' : 'Регистрация';
  card.appendChild(h1);

  if (mode === 'login') _buildLogin(card);
  else                  _buildRegister(card);

  const switchLink = document.createElement('p');
  switchLink.style.marginTop = '1rem';
  switchLink.style.fontSize  = '0.875rem';
  switchLink.innerHTML = mode === 'login'
    ? 'Нет аккаунта? <a href="#/register">Зарегистрироваться</a>'
    : 'Уже есть аккаунт? <a href="#/login">Войти</a>';
  card.appendChild(switchLink);

  page.appendChild(card);
  container.appendChild(page);
}

function _buildLogin(card) {
  const form = document.createElement('div');

  const usernameInput = _field(form, 'username', 'Логин', 'text', 'username');
  const passwordInput = _field(form, 'password', 'Пароль', 'password', 'current-password');
  const errEl         = _errorEl(form);

  const submitBtn = document.createElement('button');
  submitBtn.className   = 'btn btn-primary';
  submitBtn.style.width = '100%';
  submitBtn.textContent = 'Войти';

  submitBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    errEl.classList.add('hidden');

    if (!username || !password) {
      errEl.textContent = 'Заполните все поля';
      errEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    try {
      const data = await authAPI.login(username, password);
      auth.save(data);

      // Если бэкенд не вернул userId/role — подтягиваем из профиля
      if (!auth.getUserId() || !auth.getRole()) {
        try {
          const profile = await profileAPI.get();
          console.log('[auth login] profile fallback:', profile);
          auth.save({
            token:    auth.getToken(),
            userId:   profile.userId   ?? profile.id ?? '',
            username: profile.username ?? '',
            role:     profile.role     ?? '',
          });
        } catch (e) {
          console.warn('[auth login] profile fetch failed:', e.message);
        }
      }

      document.dispatchEvent(new CustomEvent('auth:changed'));
      showToast(`Добро пожаловать, ${auth.getUsername() || username}!`, 'success');
      router.push('/');
    } catch (err) {
      errEl.textContent = err.message ?? 'Неверный логин или пароль';
      errEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  });

  form.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
  form.appendChild(submitBtn);
  card.appendChild(form);
}

function _buildRegister(card) {
  const form = document.createElement('div');

  const usernameInput = _field(form, 'username', 'Логин', 'text', 'username');
  const passwordInput = _field(form, 'password', 'Пароль', 'password', 'new-password');
  const confirmInput  = _field(form, 'confirm',  'Подтверждение пароля', 'password', 'new-password');

  const hints = document.createElement('div');
  hints.style.cssText = 'font-size:0.8rem;color:var(--muted-foreground);margin-bottom:0.75rem';
  hints.textContent   = 'Логин: 3–50 символов, только буквы, цифры, _ и -. Пароль: минимум 8 символов.';
  form.appendChild(hints);

  const errEl = _errorEl(form);

  const submitBtn = document.createElement('button');
  submitBtn.className   = 'btn btn-primary';
  submitBtn.style.width = '100%';
  submitBtn.textContent = 'Зарегистрироваться';

  submitBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm  = confirmInput.value;
    errEl.classList.add('hidden');

    if (!username || !password || !confirm) {
      errEl.textContent = 'Заполните все поля';
      errEl.classList.remove('hidden');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
      errEl.textContent = 'Логин: 3–50 символов, только буквы, цифры, _ и -';
      errEl.classList.remove('hidden');
      return;
    }
    if (password.length < 8) {
      errEl.textContent = 'Пароль должен содержать минимум 8 символов';
      errEl.classList.remove('hidden');
      return;
    }
    if (password !== confirm) {
      errEl.textContent = 'Пароли не совпадают';
      errEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    try {
      const data = await authAPI.register(username, password);
      auth.save(data);

      if (!auth.getUserId() || !auth.getRole()) {
        try {
          const profile = await profileAPI.get();
          auth.save({
            token:    auth.getToken(),
            userId:   profile.userId   ?? profile.id ?? '',
            username: profile.username ?? '',
            role:     profile.role     ?? '',
          });
        } catch (e) {
          console.warn('[auth register] profile fetch failed:', e.message);
        }
      }

      document.dispatchEvent(new CustomEvent('auth:changed'));
      showToast(`Добро пожаловать, ${auth.getUsername() || username}!`, 'success');
      router.push('/');
    } catch (err) {
      errEl.textContent = err.message ?? 'Ошибка регистрации';
      errEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  });

  form.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
  form.appendChild(submitBtn);
  card.appendChild(form);
}

function _field(container, name, label, type = 'text', autocomplete = '') {
  const group = document.createElement('div');
  group.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.setAttribute('for', `auth-${name}`);
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.id   = `auth-${name}`;
  input.name = name;
  if (autocomplete) input.autocomplete = autocomplete;
  group.appendChild(lbl);
  group.appendChild(input);
  container.appendChild(group);
  return input;
}

function _errorEl(container) {
  const el = document.createElement('div');
  el.className = 'error hidden';
  container.appendChild(el);
  return el;
}
