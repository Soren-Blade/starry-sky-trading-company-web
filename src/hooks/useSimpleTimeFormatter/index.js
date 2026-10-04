// simpleTimeFormatter.js
// 注意：插件的导入路径显式带 .js 后缀。Vite 能解析无后缀形式，但原生 ESM（例如
// node --test 直接跑源码）要求完整路径，补齐后该模块在两种环境下都能加载。
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/zh-cn.js';

// 启用必要的插件
// relativeTime 必须在这里静态注册：原先在 getRelativeTime 里用动态 import() 注册，
// 但紧接着就同步调用 .fromNow()，插件尚未生效 → 每次都抛错并返回空串。
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 格式化ISO时间字符串
 * @param {string} isoString - ISO时间字符串，如：2025-12-01T02:10:10.602Z
 * @param {string} format - 格式化模板，默认：YYYY-MM-DD HH:mm:ss
 * @param {string} timezone - 时区，默认：Asia/Shanghai
 * @returns {string} 格式化后的时间；输入非法时返回空串
 */
export function formatISOTime(isoString, format = 'YYYY-MM-DD HH:mm:ss', timezone = 'Asia/Shanghai') {
  if (!isoString) return '';

  const date = dayjs(isoString);
  // dayjs 遇到非法输入不会抛异常，而是产出 Invalid Date，format() 会返回字符串
  // 'Invalid Date'。原先只靠 try/catch 兜底，非法值会原样渲染到界面上。
  if (!date.isValid()) return '';

  try {
    return date.tz(timezone).format(format);
  } catch (error) {
    console.error('时间格式化失败:', error.message);
    return '';
  }
}

/**
 * 获取各种常用格式的时间
 * @param {string} isoString - ISO时间字符串
 * @returns {Object} 各种格式的时间
 */
export function parseISOTime(isoString) {
  if (!isoString) return null;

  try {
    const date = dayjs(isoString);
    if (!date.isValid()) return null;
    const beijingTime = date.tz('Asia/Shanghai');
    
    return {
      // 原始ISO
      original: isoString,
      
      // 本地ISO
      localISO: beijingTime.format(),
      
      // 日期时间
      dateTime: beijingTime.format('YYYY-MM-DD HH:mm:ss'),
      dateTimeShort: beijingTime.format('MM-DD HH:mm'),
      
      // 日期
      date: beijingTime.format('YYYY-MM-DD'),
      dateCN: beijingTime.format('YYYY年MM月DD日'),
      
      // 时间
      time: beijingTime.format('HH:mm:ss'),
      timeShort: beijingTime.format('HH:mm'),
      
      // 时间戳
      timestamp: date.valueOf(),
      timestampSeconds: Math.floor(date.valueOf() / 1000),
      
      // 星期
      weekday: beijingTime.format('dddd'),
      weekdayCN: getChineseWeekday(beijingTime.day()),
      
      // 季度：month() 返回 0-11，3/6/9/12 月应分别为 1/2/3/4 季度。
      // 原式 Math.ceil(month()/3)+1 会整体偏大 1（3 月算成第 2 季度）。
      quarter: Math.floor(beijingTime.month() / 3) + 1,
      
      // dayjs对象
      dayjs: date,
      dayjsLocal: beijingTime
    };
  } catch (error) {
    console.error('时间解析失败:', error.message);
    return null;
  }
}

/**
 * 获取中文星期几
 * @param {number} dayIndex - 0-6，0代表星期日
 * @returns {string} 中文星期
 */
export function getChineseWeekday(dayIndex) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[dayIndex];
}

/**
 * 获取相对时间（如：3分钟前）
 * relativeTime 插件已在文件顶部静态注册，这里可直接调用。
 * @param {string} isoString - ISO时间字符串
 * @returns {string} 相对时间，无法解析时返回空串
 */
export function getRelativeTime(isoString) {
  if (!isoString) return '';

  try {
    const date = dayjs(isoString);
    if (!date.isValid()) return '';
    return date.fromNow();
  } catch (error) {
    console.error('相对时间格式化失败:', error.message);
    return '';
  }
}

/**
 * 转换时区
 * @param {string} isoString - ISO时间字符串
 * @param {string} fromTimezone - 原始时区，默认：UTC
 * @param {string} toTimezone - 目标时区，默认：Asia/Shanghai
 * @returns {string} 转换后的时间字符串
 */
export function convertTimezone(isoString, fromTimezone = 'UTC', toTimezone = 'Asia/Shanghai') {
  if (!isoString) return '';
  
  try {
    return dayjs(isoString).tz(fromTimezone).tz(toTimezone).format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.error('时区转换失败:', error.message);
    return '';
  }
}

/**
 * 验证是否为有效的ISO时间字符串
 * @param {string} timeString - 时间字符串
 * @returns {boolean} 是否有效
 */
export function isValidISOTime(timeString) {
  return dayjs(timeString).isValid() && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeString);
}

/**
 * 快捷函数：转换为日期时间格式
 */
export const toDateTime = (isoString) => formatISOTime(isoString, 'YYYY-MM-DD HH:mm:ss');

/**
 * 快捷函数：转换为日期格式
 */
export const toDate = (isoString) => formatISOTime(isoString, 'YYYY-MM-DD');

/**
 * 快捷函数：转换为时间格式
 */
export const toTime = (isoString) => formatISOTime(isoString, 'HH:mm:ss');

/**
 * 快捷函数：转换为中文日期格式
 */
export const toChineseDate = (isoString) => formatISOTime(isoString, 'YYYY年MM月DD日');

/**
 * 快捷函数：转换为中文日期时间格式
 */
export const toChineseDateTime = (isoString) => formatISOTime(isoString, 'YYYY年MM月DD日 HH时mm分ss秒');

/**
 * 获取友好显示时间（今天、昨天、日期）
 */
export function getFriendlyTime(isoString) {
  if (!isoString) return '';
  
  try {
    const date = dayjs(isoString);
    const now = dayjs();
    const today = now.startOf('day');
    const yesterday = today.subtract(1, 'day');
    
    if (date.isAfter(today)) {
      // 今天
      return date.format('HH:mm');
    } else if (date.isAfter(yesterday)) {
      // 昨天
      return '昨天 ' + date.format('HH:mm');
    } else if (date.isAfter(now.subtract(7, 'day'))) {
      // 一周内
      const weekday = getChineseWeekday(date.day());
      return weekday + ' ' + date.format('HH:mm');
    } else {
      // 更早
      return date.format('YYYY-MM-DD');
    }
  } catch (error) {
    return '';
  }
}

// 默认导出所有函数
export default {
  formatISOTime,
  parseISOTime,
  getRelativeTime,
  convertTimezone,
  isValidISOTime,
  getChineseWeekday,
  getFriendlyTime,
  toDateTime,
  toDate,
  toTime,
  toChineseDate,
  toChineseDateTime
};