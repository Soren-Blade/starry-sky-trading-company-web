/**
 * 脱敏展示的公共工具。
 *
 * 背景：服务端（`server/src/utils/kamiIdentity.js` 的 `maskCardNo`）已经会下发脱敏后的
 * 卡号，例如 `abcd****wxyz`。但那个字符串一旦作为普通文本渲染，`****` 就是四个
 * 和正文同色的星号——既不像遮罩，也不会随主题变色。
 *
 * 这里把「按掩码切段」这件事收敛成一个函数，交给 `MaskedValue.vue` 渲染成
 * 不同颜色的片段（掩码段用 `--ec-code-mask`，明文段用正文色），于是脱敏的观感
 * 与主题联动，且不依赖各页面自己拼字符串。
 */

/** 掩码字符：服务端用的是四个半角星号 */
export const MASK_CHAR = '*';

/** 连续两个以上的星号才算掩码段（单个星号可能是正文内容） */
const MASK_RUN = /\*{2,}/g;

/**
 * 把完整编码脱敏：保留首尾各若干位，中间用掩码替换。
 * 与服务端 `maskCardNo` 保持一致的规则（太短就整段掩码），避免同一张卡
 * 在两个页面看到两种脱敏形状。
 *
 * @param {string} value 完整编码
 * @param {{ head?: number, tail?: number }} [options]
 * @returns {string}
 */
export function maskCode(value, options = {}) {
    const { head = 4, tail = 4 } = options;
    const text = String(value ?? '');
    if (text.length <= head + tail) return MASK_CHAR.repeat(4);
    return `${text.slice(0, head)}${MASK_CHAR.repeat(4)}${text.slice(-tail)}`;
}

/**
 * 把一段可能含掩码的文本切成片段，供模板分段着色。
 *
 * @param {string} value
 * @returns {Array<{ text: string, masked: boolean }>}
 */
export function splitMasked(value) {
    const text = String(value ?? '');
    if (!text) return [];

    const parts = [];
    let cursor = 0;
    MASK_RUN.lastIndex = 0;
    let match = MASK_RUN.exec(text);
    while (match) {
        if (match.index > cursor) {
            parts.push({ text: text.slice(cursor, match.index), masked: false });
        }
        parts.push({ text: match[0], masked: true });
        cursor = match.index + match[0].length;
        match = MASK_RUN.exec(text);
    }
    if (cursor < text.length) {
        parts.push({ text: text.slice(cursor), masked: false });
    }
    return parts;
}

/** 文本里是否已经包含掩码段（用于判断「服务端已脱敏」） */
export function hasMask(value) {
    return /\*{2,}/.test(String(value ?? ''));
}
