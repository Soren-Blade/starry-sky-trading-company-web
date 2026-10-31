/**
 * 4.0.1 回归守卫：翻月不再自动选中 1 号。
 *
 * 缺陷：`selectedDay` 原本是 `list.find(is_today) || list[0]`，
 * `list[0]` 就是每个月 1 号 —— 翻到任何非本月，1 号都会被高亮成「选中」，
 * 右栏也一直在讲 1 号的事，用户会误以为「1 号已经被选中/已经签到」。
 *
 * 现在的口径：只有两种情况下才有选中日 ——
 * ① 用户点过某一天（`selectedDate` 非空）；② 正在看的就是本月（落在今天）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE = readFileSync(join(ROOT, 'src', 'pages', 'UserCheckin.vue'), 'utf8');

function computedBody(name) {
  const index = SOURCE.indexOf(`const ${name} = computed(`);
  assert.ok(index > -1, `找不到 ${name}`);
  const open = SOURCE.indexOf('{', SOURCE.indexOf('(', index));
  // computed(() => { ... }) 的花括号体
  const start = SOURCE.indexOf('{', open);
  let depth = 0;
  for (let i = start; i < SOURCE.length; i += 1) {
    if (SOURCE[i] === '{') depth += 1;
    if (SOURCE[i] === '}') {
      depth -= 1;
      if (depth === 0) return SOURCE.slice(start + 1, i);
    }
  }
  throw new Error(`${name} 的 computed 体不完整`);
}

test('selectedDay 不得再回落到 list[0]', () => {
  const body = computedBody('selectedDay');
  assert.doesNotMatch(body, /list\[0\]/, '翻月自动选 1 号的写法必须删除');
});

test('selectedDay 只有在「点过某天」或「本月今天」时才返回某一天', () => {
  const body = computedBody('selectedDay');
  assert.match(body, /if \(selectedDate\.value\)/, '必须先按用户点过的日期查');
  assert.match(body, /is_today/, '没有点过时只允许回落到今天');
  assert.match(body, /return null|\|\| null/, '找不到时返回 null，而不是数组第一项');
});

test('右栏必须有「未选日期」的空态分支，且与详情共用同一个区块容器', () => {
  assert.match(SOURCE, /<template v-if="selectedDay">/, '详情块要以 selectedDay 为条件');
  assert.match(SOURCE, /点日历上的任意一天查看当天情况/, '空态要给出引导文案');

  // 右栏是老守卫的四段结构：空态不能另起一个 .checkin-side-block，
  // 否则右栏会变成五段（test/checkinSideRail.test.js 断言 blocks.length === 4）。
  const blocks = SOURCE.match(/class="checkin-side-block checkin-side-detail"/g) || [];
  assert.equal(blocks.length, 1, '选中日详情只允许一个区块容器（内部用 v-if / v-else 切换）');

  const start = SOURCE.indexOf('class="checkin-side-block checkin-side-detail"');
  const detail = SOURCE.slice(start, SOURCE.indexOf('②-1', start));
  assert.match(detail, /<template v-else>/, '同一容器内要有未选日期的分支');
});

test('空态不能复用「已签到/漏签」的语义配色', () => {
  assert.match(SOURCE, /\.checkin-side-status\.is-idle\s*\{[^}]*var\(--text-muted\)/);
});
