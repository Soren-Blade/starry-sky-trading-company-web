/**
 * TOTP（RFC 6238）实现
 *
 * 从 pages/2FA.vue 中抽出。抽出的原因有两条：
 *   1. 这是一段有**明确标准**可对照的算法，必须能用官方向量验证；
 *      留在 .vue 里则只能靠正则提取函数来测（我最初就是这么做的，很脆弱）。
 *   2. 页面组件不应同时承载密码学实现与交互逻辑。
 *
 * 算法要点（对照 RFC 6238 / RFC 4226）：
 *   - 计数器 = floor(unixSeconds / step)，编码为 **8 字节大端**
 *   - HMAC-SHA1(counter)，取动态截断：
 *       offset  = 最后一字节的低 4 位
 *       binary  = (hmac[offset] & 0x7f) << 24 | hmac[offset+1] << 16
 *                 | hmac[offset+2] << 8 | hmac[offset+3]
 *     高位掩码 0x7f 是为了避免被当作有符号数。
 *   - 码 = binary % 10^digits，左侧补零
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * 是否具备可用的 WebCrypto。
 * crypto.subtle 只在安全上下文（HTTPS 或 localhost）存在。
 */
export function isCryptoAvailable() {
  return typeof crypto !== 'undefined' && Boolean(crypto.subtle);
}

/**
 * Base32 解码（RFC 4648，不含填充依赖）
 * @param {string} input
 * @returns {Uint8Array}
 */
export function base32ToBytes(input) {
  if (typeof input !== 'string') throw new Error('密钥必须是字符串');
  const clean = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  const bytes = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) throw new Error('无效的 Base32 字符');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/**
 * 把计数器编码为 8 字节大端。
 *
 * 注意：这里用除法而不是位运算。`num >> 8` 这类操作在 JS 中会先转成 **32 位有符号整数**，
 * 因此计数器超过 2^31 时会溢出（时间戳 2^31 秒约为 2038 年，
 * 计数器到 2^31 约为公元 4147 年 —— 现实影响很小，但用除法可以彻底避免）。
 *
 * @param {number} counter
 * @returns {Uint8Array} 长度 8
 */
export function intToBytes(counter) {
  const bytes = new Uint8Array(8);
  let n = Math.floor(counter);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = n % 256;
    n = Math.floor(n / 256);
  }
  return bytes;
}

/** 导入 HMAC-SHA1 密钥 */
export async function importKey(raw) {
  if (!isCryptoAvailable()) {
    const err = new Error('当前页面不是安全上下文，浏览器禁用了 WebCrypto。请通过 HTTPS 或 localhost 访问。');
    err.name = 'MissingSecureContext';
    throw err;
  }
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: { name: 'SHA-1' } }, false, ['sign']);
}

/** HMAC-SHA1 */
export async function hmacSha1(key, data) {
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return new Uint8Array(sig);
}

/**
 * 动态截断（RFC 4226 5.3）
 * @param {Uint8Array} hmac
 * @returns {number} 31 位无符号整数
 */
export function truncate(hmac) {
  const offset = hmac[hmac.length - 1] & 0x0f;
  return (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  );
}

/**
 * 计算指定时间点的 TOTP
 *
 * @param {string} secretBase32
 * @param {{ digits?: number, step?: number, now?: number, key?: CryptoKey }} [options]
 *   now 为毫秒时间戳（默认 Date.now()）；key 可传入已导入的密钥以复用
 * @returns {Promise<{ otp: string, counter: number }>}
 */
export async function computeTOTP(secretBase32, options = {}) {
  const { digits = 6, step = 30, now = Date.now(), key = null } = options;

  const cryptoKey = key || (await importKey(base32ToBytes(secretBase32)));
  const counter = Math.floor(now / 1000 / step);
  const hmac = await hmacSha1(cryptoKey, intToBytes(counter));
  const binary = truncate(hmac);
  const otp = (binary % 10 ** digits).toString().padStart(digits, '0');

  return { otp, counter };
}

/**
 * 密钥缓存：避免每次刷新都重新 importKey。
 *
 * 按**规范化后**的密钥字符串做键 —— 直接按原始输入做键时，
 * 大小写或空格的差异会造成缓存未命中（只是多一次导入，无正确性问题）。
 */
export function createKeyCache() {
  let cache = null;

  return {
    /**
     * @param {string} secretBase32
     * @returns {Promise<{ otp: string, counter: number }>}
     */
    async compute(secretBase32, options = {}) {
      const normalized = String(secretBase32).replace(/\s+/g, '').toUpperCase();
      if (!cache || cache.secret !== normalized) {
        cache = { secret: normalized, key: await importKey(base32ToBytes(normalized)) };
      }
      return computeTOTP(normalized, { ...options, key: cache.key });
    },
    clear() {
      cache = null;
    },
  };
}
