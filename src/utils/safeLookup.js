/**
 * 查表辅助：安全地从「字符串 → 值」的映射里取值。
 *
 * ## 为什么需要它
 *
 * JS 里 `obj[key]` 会**沿原型链查找**。当 key 来自外部数据（后端字段、用户输入）
 * 且恰好等于 `Object.prototype` 上的属性名时，会取到那个**函数**而不是 undefined：
 *
 *     const map = { a: 1 }
 *     map['toString']        // [Function: toString]  —— 不是 undefined！
 *     map['constructor']     // [Function: Object]
 *     map['__proto__']       // 原型对象
 *
 * 后果分两类，本仓库都实际出现过：
 *
 * 1. **崩溃**：把函数的某个属性当数据用。
 *    `useEmoji.getEmojiInfo('toString')` 会取到函数，随后访问 `config.colors`
 *    得到 undefined，再索引 `finalColors[0]` 抛
 *    `TypeError: Cannot read properties of undefined (reading '0')`。
 *    实测确认（`toString` / `constructor` / `valueOf` / `hasOwnProperty` / `__proto__`
 *    均触发）。
 *
 * 2. **数据被污染**：`typeof className === 'function'`，
 *    或 `if (!stats.x[key])` 对继承来的属性误判为「已存在」，导致真实数据不写入。
 *
 * 因此凡是用外部数据作键的映射查询，都应走 `lookup`。
 */

/**
 * 从映射中取 `key` 对应的值，**只在自有属性中查找**。
 *
 * 命中但值为 `null`/`undefined` 时同样返回 `fallback` ——
 * 对「映射里没有可用值」这件事，调用方通常只需要一个统一处理。
 *
 * @param {Record<string, *>} map 映射表
 * @param {*} key 查询键（任意类型，会按属性名规则使用）
 * @param {*} fallback 未命中（或映射本身不可用）时返回的值
 * @returns {*} 命中的值，或 fallback
 */
export function lookup(map, key, fallback = undefined) {
  if (!map || typeof map !== 'object') return fallback;
  if (key === null || key === undefined) return fallback;

  const name = typeof key === 'string' ? key : String(key);
  if (!Object.prototype.hasOwnProperty.call(map, name)) return fallback;

  const value = map[name];
  return value === undefined || value === null ? fallback : value;
}

/**
 * 判断映射中是否存在**自有**的 `key`。
 *
 * 与 `lookup` 一样是为了避开原型链 —— `if (map[key])` 会把
 * `map['toString']` 当作存在。
 *
 * @param {Record<string, *>} map
 * @param {*} key
 * @returns {boolean}
 */
export function hasOwn(map, key) {
  if (!map || typeof map !== 'object') return false;
  if (key === null || key === undefined) return false;
  const name = typeof key === 'string' ? key : String(key);
  return Object.prototype.hasOwnProperty.call(map, name);
}

/**
 * 创建无原型的映射对象。
 *
 * 适合「键来自外部数据」的累积型容器（如按 class 分组的结果）。
 * 无原型意味着 `obj['toString']` 天然是 undefined，无需每次都做 hasOwnProperty 判断。
 *
 * @returns {Record<string, *>}
 */
export function createBareMap() {
  return Object.create(null);
}

/**
 * 查表并回退：命中的值为 `undefined`/`null`/`''` 时也返回 fallback。
 * 用于「映射里允许有空值，但展示上需要兜底文案」的场景。
 *
 * @param {Record<string, *>} map
 * @param {*} key
 * @param {*} fallback
 * @returns {*}
 */
export function lookupOr(map, key, fallback) {
  const value = lookup(map, key, undefined);
  if (value === undefined || value === null || value === '') return fallback;
  return value;
}
