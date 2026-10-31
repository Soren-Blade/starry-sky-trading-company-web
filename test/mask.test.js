import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { hasMask, maskCode, splitMasked } from '../src/utils/mask.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

test('maskCode：保留首尾各四位，中间用四个星号', () => {
    assert.equal(maskCode('TESTK-0001-1ACF87'), 'TEST****CF87');
});

test('maskCode：短串整段脱敏，避免「脱敏后等于没脱敏」', () => {
    assert.equal(maskCode('ABCD1234'), '****');
    assert.equal(maskCode('ABC'), '****');
    assert.equal(maskCode(''), '****');
});

test('splitMasked：把掩码段与明文段切开', () => {
    const parts = splitMasked('TEST****CF87');
    assert.deepEqual(parts, [
        { text: 'TEST', masked: false },
        { text: '****', masked: true },
        { text: 'CF87', masked: false },
    ]);
});

test('splitMasked：单个星号不算掩码（卡号里可能真有星号），空串返回空数组', () => {
    assert.deepEqual(splitMasked('A*B'), [{ text: 'A*B', masked: false }]);
    assert.deepEqual(splitMasked(''), []);
    assert.deepEqual(splitMasked(null), []);
});

test('hasMask：识别服务端已脱敏的串', () => {
    assert.equal(hasMask('abcd****wxyz'), true);
    assert.equal(hasMask('abcdwxyz'), false);
    assert.equal(hasMask('a*b'), false);
});

test('MaskedValue 用主题令牌着色，且不写死任何色值', () => {
    const source = readFileSync(join(ROOT, 'src/components/MaskedValue.vue'), 'utf8');
    assert.match(source, /var\(--ec-code-mask\)/);
    // 写死色值会让「脱敏随主题变化」失效，同时被 designTokens 守卫判红
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/);
    assert.doesNotMatch(source, /rgba?\(/);
});

test('订单详情的卡密默认脱敏：模板不得直接输出完整卡号', () => {
    const source = readFileSync(join(ROOT, 'src/pages/OrderDetail.vue'), 'utf8');
    // 完整卡号只能出现在「复制」与「已展开」两个分支里，不能被直接插值
    assert.doesNotMatch(source, /\{\{\s*card\.card_no\s*\}\}/);
    assert.match(source, /maskCode\(card\.card_no\)/);
    assert.match(source, /MaskedValue/);
    // 脱敏不能牺牲「拿走能激活的码」这个基本诉求：复制与展开都要在
    assert.match(source, /copyCard\(card\.card_no\)/);
    assert.match(source, /toggleReveal\(card\.card_no\)/);
});

test('「我的资产」与卡密中心的脱敏展示走同一个组件', () => {
    for (const file of ['src/pages/Assets.vue', 'src/components/KamiSection.vue']) {
        const source = readFileSync(join(ROOT, file), 'utf8');
        assert.match(source, /MaskedValue/, `${file} 应使用 MaskedValue 展示脱敏卡号`);
        assert.doesNotMatch(
            source,
            /\{\{\s*(record|card)\.card_no_display\s*\}\}/,
            `${file} 不应把脱敏串当普通文本直接插值（掩码不会随主题变色）`,
        );
    }
});
