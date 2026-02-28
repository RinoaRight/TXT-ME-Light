/**
 * image.js — client-side ресайз аватара перед загрузкой.
 * Canvas API, 50×50, JPEG с адаптивным качеством ≤ 10KB.
 */

const TARGET_SIZE = 50;
const MAX_BYTES   = 10 * 1024; // 10 KB

/**
 * Ресайз файла изображения до аватара 50×50 JPEG.
 * @param {File} file
 * @returns {Promise<string>}  base64 dataUrl
 */
export async function resizeToAvatar(file) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width  = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d');

  // contain с центрированием (белый фон)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

  const { sx, sy, sw, sh } = calcContain(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_SIZE, TARGET_SIZE);

  // Пробуем качество 0.8 → 0.6 → 0.4
  for (const quality of [0.8, 0.6, 0.4]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const bytes   = base64Bytes(dataUrl);
    if (bytes <= MAX_BYTES) return dataUrl;
  }

  throw new Error(
    'Не удалось сжать изображение до допустимого размера (макс. 10 КБ). ' +
    'Попробуйте другое изображение.'
  );
}

// ── helpers ──────────────────────────────────────────────────────────

/**
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось загрузить изображение')); };
    img.src = url;
  });
}

/**
 * Вычисляет область источника для «contain» вписывания в квадрат TARGET_SIZE.
 * Возвращает параметры для drawImage: sx, sy, sw, sh (область источника),
 * которая уже центрирована и квадратна (crop по меньшей стороне = cover).
 *
 * На самом деле делаем cover (обрезаем по большей стороне),
 * чтобы аватар заполнял квадрат без полей.
 */
function calcContain(w, h) {
  const side = Math.min(w, h);
  const sx   = Math.floor((w - side) / 2);
  const sy   = Math.floor((h - side) / 2);
  return { sx, sy, sw: side, sh: side };
}

/**
 * Размер base64-строки dataUrl в байтах (приближённо).
 * @param {string} dataUrl
 * @returns {number}
 */
function base64Bytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] ?? '';
  // каждый base64-символ = 6 бит; 4 символа = 3 байта
  return Math.floor(base64.length * 0.75);
}
