/**
 * 4.0.0 回归守卫：`.u-tag` 默认变体必须有可见描边。
 *
 * 真实缺陷：默认标签是 `border: 1px solid transparent` + `background: var(--ec-bg-muted)`，
 * 而表格行底色 `--bg-surface-2` 在深色主题下与 `--ec-bg-muted` 几乎同色 ——
 * 标签的盒子整体消失，用户看到的只是一串「没有内边距的文字」，
 * 表现为「u-tag 的 padding 被挤压」（资产页「已激活工具 · 来源」列就是这样被报上来的）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE = readFileSync(join(ROOT, 'src', 'assets', 'styles', 'global.css'), 'utf8');

function baseTagBody() {
  const index = SOURCE.indexOf('.u-tag {');
  assert.ok(index > -1, '找不到 .u-tag 基础样式');
  const open = SOURCE.indexOf('{', index);
  const close = SOURCE.indexOf('}', open);
  return SOURCE.slice(open + 1, close);
}

test('基础 .u-tag 的描边不能是 transparent', () => {
  const body = baseTagBody();
  assert.doesNotMatch(
    body,
    /border:\s*1px solid transparent/,
    '默认标签用透明描边会让它在深色表格里彻底隐身，必须用可见的边框令牌',
  );
});

test('基础 .u-tag 的描边必须使用已有的边框令牌（不许写死色值）', () => {
  const body = baseTagBody();
  const border = body.match(/border:[^;]+;/);
  assert.ok(border, '找不到 border 声明');
  assert.match(border[0], /var\(--ec-border-[a-z]+\)/, '描边颜色必须取自 ec-border-* 令牌');
  assert.doesNotMatch(border[0], /#[0-9a-fA-F]{3,8}|rgba?\(/, '禁止写死色值');
});

test('基础 .u-tag 仍然保持单行（长文案交给列宽/省略号）', () => {
  assert.match(baseTagBody(), /white-space:\s*nowrap/);
});
