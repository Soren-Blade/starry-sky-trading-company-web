<template>
  <!--
    共享 Apple ID 的使用教程（4.30.0）。

    同一份内容有两个容器：
      · 桌面：占据右侧目录的位置（列表 ↔ 教程切换），有完整的行长；
      · 手机：装进右侧抽屉，入口按钮在目录最上方。

    内容按「先做、后问」排：三步动作在前，示意图随后，常见问题垫底。
    教程是强顺序的长文，所以用有序列表 + 数字徽标，而不是三段并排的卡片。
  -->
  <section class="guide" :aria-label="t('appleId.guideCta')">
    <header class="guide-head">
      <p class="guide-eyebrow">{{ t('appleId.guideEyebrow') }}</p>
      <h2 class="guide-title">{{ t('appleId.guideTitle') }}</h2>
      <p class="guide-intro">{{ t('appleId.guideIntro') }}</p>
    </header>

    <ol class="guide-steps">
      <li v-for="(step, index) in STEPS" :key="step.title" class="guide-step">
        <span class="step-index" aria-hidden="true">{{ index + 1 }}</span>
        <div class="step-body">
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-text">{{ step.text }}</p>
          <p v-if="step.caution" class="step-caution">
            <AppIcon name="alert-triangle" aria-hidden="true" />
            <span>{{ step.caution }}</span>
          </p>
        </div>
      </li>
    </ol>

    <figure class="guide-figure">
      <!-- 图示是 6 张手机截图的拼图，正文里必然被缩小；点开原图看批注箭头，
           比在页面里放大更可靠（不引入灯箱，也不劫持浏览器缩放） -->
      <a
        class="figure-link"
        :href="`${BASE_URL}apple-id-guide.jpg`"
        target="_blank"
        rel="noopener"
        :aria-label="t('appleId.guideFigureOpen')"
      >
        <img
          class="figure-image"
          :src="`${BASE_URL}apple-id-guide.jpg`"
          :alt="t('appleId.guideFigureAlt')"
          width="800"
          height="950"
          loading="lazy"
          decoding="async"
        />
      </a>
      <figcaption class="figure-caption">{{ t('appleId.guideFigureCaption') }}</figcaption>
    </figure>

    <div class="guide-faq">
      <h3 class="faq-title">{{ t('appleId.guideFaqTitle') }}</h3>
      <dl class="faq-list">
        <div v-for="item in FAQ" :key="item.q" class="faq-item">
          <dt class="faq-question">{{ item.q }}</dt>
          <dd class="faq-answer">{{ item.a }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup>
/**
 * 教程内容的唯一出处：文案走 i18n（`appleId.guide*`），
 * 结构（步骤 / 配图 / FAQ）留在这里，桌面视图与手机抽屉共用同一个组件。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/AppIcon.vue'

/** public/ 下的静态图；用 BASE_URL 拼，部署到子路径时不会 404 */
const BASE_URL = import.meta.env.BASE_URL

const { t, tm } = useI18n()

const STEPS = computed(() => tm('appleId.guideSteps') || [])
const FAQ = computed(() => tm('appleId.guideFaq') || [])
</script>

<style scoped>
.guide {
  display: flex;
  flex-direction: column;
  gap: calc(var(--grid-gap) * 2);
}

/* ── 页头 ───────────────────────────────────────────────────── */
.guide-head {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
}

.guide-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--accent);
}

.guide-title {
  font-size: var(--fs-h2);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.guide-intro {
  max-width: 42em;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 三步 ─────────────────────────────────────────────────────
 * 三列只在够宽时成立：每列至少要放得下 12 个汉字一行，
 * 否则数字徽标会把正文挤成窄条。 */
.guide-steps {
  display: grid;
  grid-template-columns: 1fr;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

.guide-step {
  display: flex;
  gap: calc(var(--space-unit) * 1.5);
  padding: var(--card-padding);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
}

.step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 4);
  height: calc(var(--space-unit) * 4);
  flex: none;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: var(--radius-pill);
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  min-width: 0;
}

.step-title {
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.step-text {
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 第 1 步的红线提醒：只在步骤内部出现一次，不复述整段风险文案 */
.step-caution {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 0.75) var(--space-unit);
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--danger);
  background: var(--danger-bg);
  border-radius: var(--radius-input);
}

/* ── 示意图 ───────────────────────────────────────────────────── */
.guide-figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-unit);
  margin: 0;
}

/* 示意图：拼图里有 6 张手机截图和手写批注，缩到 368px 时批注基本不可读，
   所以放到 560px，并允许点开原图。 */
.figure-link {
  display: block;
  width: 100%;
  max-width: calc(var(--space-unit) * 70);
  border-radius: var(--radius-panel);
}

.figure-image {
  display: block;
  width: 100%;
  height: auto;
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  background: var(--bg-surface);
}

.figure-link:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.figure-caption {
  max-width: 46em;
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-muted);
  text-align: center;
}

/* ── 常见问题 ─────────────────────────────────────────────────
 * 问题用正文色 + 加粗，答案退一级明度；条目之间用发丝线分隔，
 * 不再给每问一张卡 —— 那样 5 个卡框会和上面的 3 个步骤抢同一层级。 */
.guide-faq {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
}

.faq-title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.faq-list {
  margin: 0;
}

.faq-item {
  padding-block: calc(var(--space-unit) * 1.5);
  border-top: var(--stroke-width) solid var(--divider);
}

.faq-item:first-child {
  border-top: 0;
}

.faq-question {
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.faq-answer {
  margin: calc(var(--space-unit) * 0.75) 0 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ≥768px：三步并排（每列约 220px 起，正文 3 行左右） */
@media (min-width: 768px) {
  .guide-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .guide-step {
    flex-direction: column;
    gap: var(--space-unit);
  }
}

@media (max-width: 767px) {
  .guide-title {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }

  .guide-step {
    padding: calc(var(--card-padding) * var(--mobile-padding-scale));
  }
}
</style>
