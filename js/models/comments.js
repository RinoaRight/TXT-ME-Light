console.log('[comments.js] v: 2026-02-27-v9');
/**
 * models/comments.js — модель комментариев.
 */

import { commentsAPI } from '../api.js';
import store from '../store.js';

const commentsModel = {
  /**
   * Загрузить все комментарии поста.
   * @param {string} postId
   */
  async loadForPost(postId) {
    store.set('error', null);
    try {
      const data = await commentsAPI.getByPost(postId);
      console.log('[comments] raw keys:', Object.keys(data ?? {}), 'count:', data?.comments?.length ?? data?.items?.length ?? '?');
      if (data?.post) console.log('[comments] data.post keys:', Object.keys(data.post));
      // API может вернуть { comments: [] } или { items: [] } или { post: { comments: [] } } или сразу массив
      const list = data?.comments ?? data?.items ?? data?.post?.comments ?? (Array.isArray(data) ? data : []);
      console.log('[comments] resolved list length:', list.length);
      if (list.length > 0) console.log('[comments] first comment keys:', Object.keys(list[0]), 'sample:', JSON.stringify(list[0]).slice(0, 300));
      store.set('comments', list);
    } catch (err) {
      console.error('[comments] loadForPost error:', err.message, err.status);
      store.set('error', err.message);
      store.set('comments', []);
    }
  },

  /**
   * Создать комментарий.
   * @param {string} postId
   * @param {{content, parentCommentId?, commentAvatarId?}} data
   * @returns {Promise<object>}
   */
  async create(postId, data) {
    await commentsAPI.create(postId, data);
    // Перезагружаем с сервера — гарантированно чистые данные без циклов
    await commentsModel.loadForPost(postId);

    // Инкремент commentCount у currentPost
    const post = store.get('currentPost');
    if (post && post.postId === postId) {
      store.set('currentPost', { ...post, commentCount: (post.commentCount ?? 0) + 1 });
    }
  },

  /**
   * Обновить комментарий.
   * @param {string} postId
   * @param {string} commentId
   * @param {{content}} data
   * @returns {Promise<object>}
   */
  async update(postId, commentId, data) {
    const updated = await commentsAPI.update(postId, commentId, data);
    const comments = store.get('comments').map(c =>
      c.commentId === commentId ? { ...c, ...updated } : c
    );
    store.set('comments', comments);
    return updated;
  },

  /**
   * Удалить комментарий (и его реплаи из store).
   * @param {string} postId
   * @param {string} commentId
   */
  async delete(postId, commentId) {
    await commentsAPI.delete(postId, commentId);

    // Удаляем сам комментарий и все его дочерние (каскад на клиенте)
    const toRemove = new Set();
    collectDescendants(store.get('comments'), commentId, toRemove);
    toRemove.add(commentId);

    const comments = store.get('comments').filter(c => !toRemove.has(c.commentId));
    store.set('comments', comments);

    // Декремент commentCount
    const post = store.get('currentPost');
    if (post && post.postId === postId) {
      store.set('currentPost', {
        ...post,
        commentCount: Math.max(0, (post.commentCount ?? 1) - toRemove.size),
      });
    }
  },
};

/**
 * Рекурсивно собрать id всех потомков комментария.
 * @param {object[]} all
 * @param {string} parentId
 * @param {Set<string>} acc
 */
function collectDescendants(all, parentId, acc) {
  for (const c of all) {
    if (c.parentCommentId === parentId) {
      acc.add(c.commentId);
      collectDescendants(all, c.commentId, acc);
    }
  }
}

export default commentsModel;
