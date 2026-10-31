/**
 * 4.0.0 回归守卫：签到日历的「选中」状态必须压过「可补签」的虚线。
 *
 * 真实缺陷：`.checkin-cell.is-selected` 与 `.checkin-cell.is-replenishable` 同为单类选择器
 * （权重相同），后声明的 `is-replenishable` 覆盖掉选中的 `border-style/border-color/background`。
 * 于是 9 月及更早的漏签日（全部可补签）点下去，右栏日期换了、格子上却毫无反应。
 *
 * 这类 bug 单测抓不到（DOM 上 class 是对的），只能守住 CSS 的声明顺序与关键属性。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE = readFileSync(join(ROOT, 'src', 'pages', 'UserCheckin.vue'), 'utf8');

/** 取某个选择器（第一次出现）的规则体 */
function bodyOf(selector) {
  const index = SOURCE.indexOf(selector);
  if (index === -1) return null;
  const open = SOURCE.indexOf('{', index);
  const close = SOURCE.indexOf('}', open);
  return { index, text: SOURCE.slice(open + 1, close) };
}

const REPLENISHABLE = '.checkin-cell.is-replenishable {';
/** 「选中 × 可补签」组合兜底规则（写在可补签之后，专治覆盖问题） */
const COMBINED = '.checkin-cell.is-selected.is-replenishable {';

test('必须存在「选中 × 可补签」的组合兜底规则', () => {
  assert.ok(SOURCE.includes(COMBINED), `缺少 ${COMBINED} 兜底规则`);
});

test('组合兜底规则必须声明在可补签规则之后', () => {
  const replenishableAt = SOURCE.indexOf(REPLENISHABLE);
  const combinedAt = SOURCE.indexOf(COMBINED);
  assert.ok(replenishableAt > -1, '找不到可补签规则');
  assert.ok(
    combinedAt > replenishableAt,
    '组合兜底必须写在可补签之后，否则同权重下仍然被虚线覆盖',
  );
});

test('组合兜底规则必须显式覆盖 border-style 与配色', () => {
  const block = bodyOf(COMBINED);
  assert.ok(block, '找不到组合兜底规则体');
  assert.match(block.text, /border-style:\s*solid/, '必须写 border-style: solid 压掉虚线');
  assert.match(block.text, /border-color:\s*var\(--accent\)/, '必须用主色描边');
  assert.match(
    block.text,
    /background:\s*var\(--ec-action-primary-dim\)/,
    '必须有提亮底色',
  );
});

test('模板必须把 is-selected 加到格子上', () => {
  assert.match(SOURCE, /'is-selected':\s*cell\.type === 'day' && isSelected\(cell\.day\)/);
});

test('点击格子必须写入选中日期', () => {
  assert.match(
    SOURCE,
    /function selectDay\(day\)\s*\{[\s\S]{0,200}selectedDate\.value = day\.date/,
  );
});
