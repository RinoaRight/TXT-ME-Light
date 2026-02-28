/**
 * models/meta.js — модель метаданных (теги и авторы для сайдбара).
 * Загружается один раз за сессию, результат кешируется в store.
 */

import { metaAPI } from '../api.js';
import store from '../store.js';

let _loaded = false;

const metaModel = {
  /**
   * Загрузить теги и авторов из /meta/filters.
   * Повторные вызовы не делают запрос — берут из store.
   * @param {boolean} [force=false] принудительная перезагрузка
   */
  async load(force = false) {
    if (_loaded && !force) return;
    try {
      const data = await metaAPI.getFilters();
      store.set('allTags',    data?.tags    ?? []);
      store.set('allAuthors', data?.authors ?? []);
      _loaded = true;
    } catch {
      // Сбой загрузки мета — не критично, сайдбар просто пуст
    }
  },

  /**
   * Сбросить кеш (вызывать если нужно принудительно обновить).
   */
  reset() {
    _loaded = false;
  },
};

export default metaModel;
