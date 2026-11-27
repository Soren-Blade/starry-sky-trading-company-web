<template>
  <!--
    共享 Apple ID 的使用教程（4.31.0 重排版）。

    同一份内容有两个容器：
      · 桌面：占据右侧目录的位置（列表 ↔ 教程切换），有完整的行长；
      · 手机：装进右侧抽屉，入口按钮在目录最上方。

    版式从「三列并排卡片 + 居中大图」改成**手册式两栏**：
    左栏是带竖线的时间轴（01 → 02 → 03，动作有先后），右栏是随滚动停住的示意图；
    常见问题改成「左问右答」的定义表 —— 五问并排时，答句才是被读的部分。
  -->
  <section class="guide" :aria-label="t('appleId.guideCta')">
    <header class="guide-head">
      <p class="guide-eyebrow">{{ t('appleId.guideEyebrow') }}</p>
      <h2 class="guide-title">{{ t('appleId.guideTitle') }}</h2>
      <p class="guide-intro">{{ t('appleId.guideIntro') }}</p>
    </header>

    <div class="guide-body">
      <ol class="guide-steps">
        <li v-for="(step, index) in STEPS" :key="step.title" class="guide-step">
          <span class="step-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="step-body">
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-text">{{ step.text }}</p>
            <p v-if="step.caution" class="step-caution">
              <AppIcon name="alert-triangle" aria-hidden="true" />
              <span class="caution-text">{{ step.caution }}</span>
            </p>
          </div>
        </li>
      </ol>

      <figure class="guide-figure">
        <p class="figure-label">{{ t('appleId.guideFigureLabel') }}</p>
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
    </div>

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
  padding-bottom: calc(var(--space-unit) * 2);
  border-bottom: var(--stroke-width) solid var(--divider);
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
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.guide-intro {
  max-width: 40em;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 两栏：时间轴 + 示意图 ─────────────────────────────────────
 * 窄屏先单列（步骤在上、图在下）；够宽时图落到右栏并随滚动停住，
 * 读第 2、3 步时示意图一直看得见。 */
.guide-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: calc(var(--grid-gap) * 1.5);
  align-items: start;
}

.guide-steps {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 贯穿三步的竖线：动作有先后，这条线就是「顺序」本身 */
.guide-steps::before {
  content: '';
  position: absolute;
  inset-block: calc(var(--space-unit) * 1.5);
  inset-inline-start: calc(var(--space-unit) * 1.5);
  width: var(--stroke-width);
  background: var(--divider);
}

.guide-step {
  position: relative;
  padding-inline-start: calc(var(--space-unit) * 5);
}

.step-index {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 3);
  height: calc(var(--space-unit) * 3);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--accent);
  background: var(--bg-page);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-pill);
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  min-width: 0;
}

.step-title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.step-text {
  max-width: 38em;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 第 1 步的红线提醒：语义色只出现在这一条竖线上，
   文字仍用正文色，避免整段红字降低可读性。 */
.step-caution {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 0.75);
  max-width: 38em;
  margin-top: calc(var(--space-unit) * 0.25);
  padding: calc(var(--space-unit) * 0.75) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-primary);
  background: var(--danger-bg);
  border-inline-start: calc(var(--stroke-width) * 3) solid var(--danger);
  border-radius: var(--radius-input);
}

.step-caution :deep(svg) {
  flex: none;
  margin-top: 0.15em;
  color: var(--danger);
  font-size: 1.05em;
}

.caution-text {
  min-width: 0;
}

/* ── 示意图 ───────────────────────────────────────────────────── */
.guide-figure {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
}

.figure-label {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--text-muted);
}

.figure-link {
  display: block;
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
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

/* ── 常见问题：左问右答 ─────────────────────────────────────── */
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
  display: grid;
  margin: 0;
}

.faq-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: calc(var(--space-unit) * 0.5);
  padding-block: calc(var(--space-unit) * 1.75);
  border-top: var(--stroke-width) solid var(--divider);
}

.faq-question {
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.faq-answer {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 断点 ─────────────────────────────────────────────────────
 * 992 起两栏：左栏步骤约 55%（约 470px），右栏示意图 45%。
 * 768 起问答定义表成立（问题列 17em，约 8 个汉字宽）。 */
@media (min-width: 992px) {
  .guide-body {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: calc(var(--grid-gap) * 2);
  }

  .guide-figure {
    position: sticky;
    top: calc(var(--navbar-height) + var(--space-unit) * 2);
  }
}

@media (min-width: 768px) {
  .faq-item {
    grid-template-columns: minmax(0, 17em) minmax(0, 1fr);
    gap: calc(var(--space-unit) * 2);
    align-items: start;
  }
}

@media (max-width: 767px) {
  .guide {
    gap: calc(var(--grid-gap) * 1.25);
  }

  .guide-head {
    padding-bottom: calc(var(--space-unit) * 1.5);
  }

  .guide-title {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }

  .guide-steps {
    gap: calc(var(--space-unit) * 2);
  }

  .guide-step {
    padding-inline-start: calc(var(--space-unit) * 4.5);
  }

  .step-index {
    width: calc(var(--space-unit) * 2.75);
    height: calc(var(--space-unit) * 2.75);
  }

  .guide-steps::before {
    inset-inline-start: calc(var(--space-unit) * 1.375);
  }

  /* 手机上提醒块贴满可用宽度，图标与文字同基线，避免折行后图标悬空 */
  .step-caution {
    max-width: none;
    padding: calc(var(--space-unit) * 0.75) var(--space-unit);
  }

  .guide-faq {
    gap: calc(var(--space-unit) * 0.5);
  }
}
</style>
