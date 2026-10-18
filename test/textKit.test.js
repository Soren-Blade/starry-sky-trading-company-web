/**
 * `/text/kit` 纯函数层的测试。
 *
 * 这些逻辑原来内联在页面里，只能靠 SSR 渲染整棵组件树间接验证；抽到
 * `src/utils/textKit.js` 后可以逐条断言边界（空行、重复行、排序模式）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CASE_FNS,
  cleanText,
  countStats,
  dedupLines,
  encodeEntities,
  htmlToMarkdown,
  sortLines,
  zhConvert,
  zhPairCount,
} from '../src/utils/textKit.js'

test('zhConvert：逐字替换，未收录的字原样保留', () => {
  assert.equal(zhConvert('与业东丝'), '與業東絲')
  assert.equal(zhConvert('abc123'), 'abc123')
  assert.equal(zhConvert(''), '')
  // 对照表是按「简繁相邻」成对排列的字面量，含 800 对常用字；别退化成空表
  assert.ok(zhPairCount >= 700, `简繁对照表只有 ${zhPairCount} 对`)
  assert.equal(zhPairCount * 2 <= 1610, true)
})

test('CASE_FNS：五种大小写转换', () => {
  assert.equal(CASE_FNS.upper('aBc'), 'ABC')
  assert.equal(CASE_FNS.lower('aBc'), 'abc')
  assert.equal(CASE_FNS.capitalize('hello world'), 'Hello World')
  // sentence 只把句首和句号后的首字母大写，不碰其余字母
  assert.equal(CASE_FNS.sentence('hi there. ok then'), 'Hi there. Ok then')
  assert.equal(CASE_FNS.toggle('AbC'), 'aBc')
})

test('encodeEntities：五个敏感字符都被转义', () => {
  assert.equal(encodeEntities(`<a href="x">it's & ok</a>`), '&lt;a href=&quot;x&quot;&gt;it&#39;s &amp; ok&lt;/a&gt;')
  assert.equal(encodeEntities('普通文本'), '普通文本')
})

test('sortLines：四种排序 + 去重', () => {
  assert.equal(sortLines('b\nc\na', 'asc'), 'a\nb\nc')
  assert.equal(sortLines('b\nc\na', 'desc'), 'c\nb\na')
  assert.equal(sortLines('ccc\na\nbb', 'length-asc'), 'a\nbb\nccc')
  assert.equal(sortLines('ccc\na\nbb', 'length-desc'), 'ccc\nbb\na')
  assert.equal(sortLines('b\na\nb', 'asc', true), 'a\nb')
  // 未知模式退回字典序，不抛错
  assert.equal(sortLines('b\na', 'whatever'), 'a\nb')
})

test('dedupLines：first / last / count 三种口径', () => {
  const input = 'x\ny\nx\nz'
  assert.equal(dedupLines(input, 'first'), 'x\ny\nz')
  assert.equal(dedupLines(input, 'count'), 'x (2)\ny (1)\nz (1)')
  // last：x 的最后一次出现在 z 之前，但按最后出现位置排序仍是 x→z
  assert.equal(dedupLines('a\nb\na', 'last'), 'b\na')
})

test('cleanText：四个开关互不干扰', () => {
  const input = '  a   b  \n\n\n  c  '
  assert.equal(cleanText(input, { trim: true }), 'a   b\n\n\nc')
  assert.equal(cleanText(input, { collapse: true }), ' a b \n\n\n c ')
  assert.equal(cleanText('a\r\nb\n\n\nc', { newlines: true }), 'a\nb\nc')
  assert.equal(cleanText('a\n   \nb', { empty: true }), 'a\nb')
  // 全关时原样返回
  assert.equal(cleanText(input, {}), input)
})

test('countStats：五个统计项与提示语', () => {
  const stats = countStats('hello world\n第二行', 30)
  const byLabel = Object.fromEntries(stats.stats.map((item) => [item.label, item.value]))
  assert.equal(byLabel['行数'], 2)
  assert.equal(byLabel['词数'], 3)
  assert.equal(byLabel['字节数'], 30)
  assert.equal(byLabel['字符数'], 'hello world\n第二行'.length)
  assert.equal(stats.meta['原文本'], `${'hello world\n第二行'.length} 字符 · 2 行`)
  assert.equal(countStats('   ', 3).stats.find((item) => item.label === '词数').value, 0)
})

test('htmlToMarkdown：标题、强调、链接、列表、裸标签', () => {
  assert.equal(htmlToMarkdown('<h2>标题</h2>'), '## 标题\n')
  assert.equal(htmlToMarkdown('<strong>粗</strong>'), '**粗**')
  assert.equal(htmlToMarkdown('<a href="https://x.test">链接</a>'), '[链接](https://x.test)')
  assert.equal(htmlToMarkdown('<li>条目</li>'), '* 条目\n')
  assert.equal(htmlToMarkdown('<br>'), '\n')
  assert.equal(htmlToMarkdown('<div>裸标签</div>'), '裸标签')
  assert.equal(htmlToMarkdown('<blockquote>引用</blockquote>'), '> 引用\n')
})
