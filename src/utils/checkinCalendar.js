/**
 * 签到日历的纯计算层（`src/pages/UserCheckin.vue` 只负责画）。
 *
 * 日期副数据（农历 / 节气 / 节日 / 法定节假日）由服务端 `getCheckinCalendar` 下发，
 * 这里只做三件事：排格子、决定格子第二行显示哪条、算出选中日的状态文案。
 * 全部是纯函数，便于 `test/checkinCalendar.test.js` 直接断言，不用挂 DOM。
 */

/** 星期表头：服务端按自然月给日期，但周几要自己算（按 Asia/Shanghai 口径的纯日期字符串） */
export const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * 把 ISO 日期串拆成数字，避免 `new Date('2026-10-01')` 走 UTC 造成差一天。
 * @param {string} iso `YYYY-MM-DD`
 */
export function splitIsoDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * 该日期是周几（0=周一 … 6=周日）。
 * 用 `Date.UTC` 取值只为了拿星期，年月日都是整数，不受时区影响。
 * @param {string} iso
 * @returns {number} 0–6，非法日期返回 0
 */
export function weekdayIndex(iso) {
    const parts = splitIsoDate(iso);
    if (!parts) return 0;
    const jsDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    return (jsDay + 6) % 7;
}

/**
 * 排成一个月的格子：前面补空格子，让 1 号落在正确的星期列。
 *
 * @param {Array<{date: string}>} days 服务端返回的整月日期（顺序即日期顺序）
 * @returns {Array<
 *   { type: 'blank', key: string } |
 *   { type: 'day', key: string, day: object }
 * >}
 */
export function buildCalendarCells(days) {
    const list = Array.isArray(days) ? days.filter((d) => d && splitIsoDate(d.date)) : [];
    if (!list.length) return [];

    const lead = weekdayIndex(list[0].date);
    const cells = [];
    for (let i = 0; i < lead; i += 1) cells.push({ type: 'blank', key: `blank-${i}` });
    for (const day of list) cells.push({ type: 'day', key: day.date, day });
    return cells;
}

/**
 * 格子的第二行显示哪条副数据 —— 优先级：法定节假日/调休 → 传统节日 → 节气 → 农历日。
 *
 * 采用 AtomUI 日历的口径（节假日 > 传统节日 > 节气 > 普通农历），
 * 好处是一个格子里永远只出现一条最该被看到的词，不会有「寒露 / 孔子诞辰」并排的情况。
 *
 * @param {object} day 服务端下发的某一天
 * @returns {string} 空字符串表示没有副数据可显示
 */
export function resolveDaySubLabel(day) {
    if (!day) return '';
    if (day.holidayName) return String(day.holidayName);
    if (day.festival) return String(day.festival);
    if (day.solarTerm) return String(day.solarTerm);
    return day.lunar ? String(day.lunar) : '';
}

/**
 * 法定节假日 / 调休的角标：休 or 班。
 * @param {object} day
 * @returns {'休' | '班' | null}
 */
export function resolveDayBadge(day) {
    if (!day) return null;
    if (day.dayType === 'holiday') return '休';
    if (day.dayType === 'workday') return '班';
    return null;
}

/**
 * 选中日期的状态，决定右栏详情说什么、按钮给什么。
 *
 * `today` 参数目前只用来兜底判断（服务端已下发 `is_today`），
 * 保留它是为了让这个函数在「只有日期串、没有 is_today」的场景也能用。
 *
 * `options.canReplenish` 由页面传进来（要看剩余补签次数与账户积分）；
 * 不传则退回服务端给的 `replenishable`（只判断「非未来且未签到」）。
 * 分开的原因是两条口径不同：格子的虚线看前者，右栏文案也要跟着前者走，
 * 否则会出现「格子是实线但右栏让你补签」的自相矛盾。
 *
 * @param {object} day 服务端下发的某一天
 * @param {string} today `YYYY-MM-DD`
 * @param {{ canReplenish?: boolean }} [options]
 * @returns {{ key: 'checked'|'today-pending'|'missed'|'future'|'none', label: string, action: 'checkin'|'replenish'|null }}
 */
export function resolveDayStatus(day, today = '', options = {}) {
    if (!day) return { key: 'none', label: '还没有选中日期', action: null };
    if (day.checked) return { key: 'checked', label: '已签到', action: null };

    const isToday = day.is_today === undefined ? day.date === today : Boolean(day.is_today);
    if (isToday) return { key: 'today-pending', label: '今天还没签到', action: 'checkin' };
    if (day.future) return { key: 'future', label: '还没到这一天', action: null };

    const canReplenish = options.canReplenish === undefined
        ? Boolean(day.replenishable)
        : Boolean(options.canReplenish);
    if (canReplenish) return { key: 'missed', label: '漏签，可补签', action: 'replenish' };
    if (day.replenishable) {
        return { key: 'missed', label: '漏签，但补签次数或积分不足', action: null };
    }
    return { key: 'none', label: '不可签到', action: null };
}

/**
 * 月份加减，返回 `YYYY-MM`。
 * @param {string} month `YYYY-MM`
 * @param {number} delta 负数往前、正数往后
 */
export function shiftMonth(month, delta) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
    if (!match) return '';
    const base = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + delta, 1));
    return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * 「10 月 28 日 周三」这种标题，用于右栏详情。
 * @param {string} iso
 */
export function formatDayTitle(iso) {
    const parts = splitIsoDate(iso);
    if (!parts) return '';
    return `${parts.month} 月 ${parts.day} 日 周${WEEKDAYS[weekdayIndex(iso)]}`;
}
