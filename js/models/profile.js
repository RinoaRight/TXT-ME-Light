/**
 * models/profile.js — модель профиля и аватаров.
 */

import { profileAPI } from '../api.js';
import store from '../store.js';

const profileModel = {
  /**
   * Загрузить профиль текущего пользователя.
   * @returns {Promise<object>}
   */
  async load() {
    store.set('error', null);
    try {
      const profile = await profileAPI.get();
      store.set('profile', profile);
      return profile;
    } catch (err) {
      store.set('error', err.message);
      throw err;
    }
  },

  /**
   * Обновить email.
   * @param {string} email
   */
  async updateEmail(email) {
    await profileAPI.updateEmail(email);
    const profile = store.get('profile');
    if (profile) store.set('profile', { ...profile, email });
  },

  /**
   * Удалить email (отключить уведомления).
   */
  async deleteEmail() {
    await profileAPI.deleteEmail();
    const profile = store.get('profile');
    if (profile) store.set('profile', { ...profile, email: null });
  },

  /**
   * Сменить пароль.
   * @param {string} oldPassword
   * @param {string} newPassword
   */
  async updatePassword(oldPassword, newPassword) {
    await profileAPI.updatePassword(oldPassword, newPassword);
  },

  /**
   * Загрузить аватар (base64 dataUrl).
   * @param {string} dataUrl
   * @returns {Promise<object>} обновлённый профиль
   */
  async addAvatar(dataUrl) {
    const updated = await profileAPI.addAvatar(dataUrl);
    store.set('profile', updated);
    return updated;
  },

  /**
   * Удалить аватар.
   * @param {string} avatarId
   * @returns {Promise<object>}
   */
  async deleteAvatar(avatarId) {
    const updated = await profileAPI.deleteAvatar(avatarId);
    store.set('profile', updated);
    return updated;
  },

  /**
   * Установить активный аватар.
   * @param {string} avatarId
   * @returns {Promise<object>}
   */
  async setActiveAvatar(avatarId) {
    const updated = await profileAPI.setActiveAvatar(avatarId);
    store.set('profile', updated);
    return updated;
  },
};

export default profileModel;
