<template>
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-content">
        <p class="hero-eyebrow u-enter" :style="{ '--i': 0 }">{{ HERO.eyebrow }}</p>

        <h1 class="hero-title u-enter" :style="{ '--i': 1 }">{{ HERO.title }}</h1>

        <p class="hero-subtitle u-enter" :style="{ '--i': 2 }">{{ HERO.subtitle }}</p>

        <div class="hero-actions u-enter" :style="{ '--i': 3 }">
          <button type="button" class="u-btn-primary" @click="handleShopNow">
            <span>{{ HERO.primaryCta }}</span>
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" class="u-btn-secondary" @click="handleLearnMore">
            <span>{{ HERO.secondaryCta }}</span>
            <span aria-hidden="true">↓</span>
          </button>
        </div>

        <ul class="hero-features u-enter" :style="{ '--i': 4 }">
          <li v-for="feature in HERO.features" :key="feature.text" class="hero-feature">
            <span class="hero-feature-icon" aria-hidden="true">{{ feature.icon }}</span>
            <span>{{ feature.text }}</span>
          </li>
        </ul>
      </div>

      <!-- 视觉面板：纯排版 + 一个品牌标记，不含装饰性渐变与光斑 -->
      <div class="hero-visual u-enter" :style="{ '--i': 2 }" aria-hidden="true">
        <div class="hero-panel">
          <span class="hero-panel-mark">{{ SITE.logo }}</span>
          <p class="hero-panel-text">{{ SITE.name }}</p>
          <p class="hero-panel-tagline">{{ SITE.tagline }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 首页首屏
 *
 * 相比旧实现删掉了三块内容：
 *   - 30 个随机星点（JS 随机生成 + 常驻闪烁动画）
 *   - 4 个浮动 emoji 与一个 blur(40px) 的光斑
 *   - 标题的彩色渐变文字
 * 这些都属于规范明确排除的「装饰性渐变 / 多余光效 / 夸张动画」，
 * 且每套风格都要重新适配一次。现在视觉重量由排版、间距与一个表面面板承担。
 */
import { domUtils } from '@/utils/index.js'
import { HERO, SITE } from '@/constants/index.js'

const emit = defineEmits(['shop-click', 'learn-more-click'])

const handleShopNow = () => {
  emit('shop-click')
}

const handleLearnMore = () => {
  emit('learn-more-click')
  domUtils.smoothScroll('#categories-section')
}
</script>

<style scoped>
/*
 * 首屏
 *
 * 组件只负责布局与排版节奏：两个 CTA 走 global.css 的 .u-btn-primary /
 * .u-btn-secondary（高度、内边距、悬停位移全部由令牌决定，各风格天然不同），
 * 视觉面板的底/描边/圆角/阴影/内边距同样只消费令牌。
 */
.hero {
  width: 100%;
  background: transparent;
}

.hero-inner {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: calc(var(--space-unit) * 6);
  max-width: var(--container-max);
  /* 顶栏是 sticky、已参与文档流，因此只减去它的高度即可。
   * 该值是按桌面顶栏算的：移动端顶栏更矮（Navbar 内部按 --mobile-nav-scale
   * 缩放），这里的富余只会多留一点空间，不会遮住内容 —— 因此不重复扣减。 */
  min-height: calc(100vh - var(--navbar-height));
  margin: 0 auto;
  padding: calc(var(--section-gap) * 0.8) var(--container-padding);
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
  min-width: 0;
}

.hero-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
  margin: 0;
}

.hero-title {
  font-family: var(--font-display);
  font-size: var(--fs-display);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  line-height: 1.05;
  color: var(--text-primary);
  margin: 0;
}

.hero-subtitle {
  max-width: 46ch;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  margin: 0;
}

/* 两个 CTA 的排布；间距与高度交给共享按钮类 */
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
}

.hero-features {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 3);
  padding-top: calc(var(--space-unit) * 3);
  border-top: var(--stroke-width) solid var(--divider);
}

.hero-feature {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-secondary);
}

.hero-feature-icon {
  font-size: var(--fs-h3);
  line-height: 1;
  animation: var(--decor-animation);
}

/* ── 视觉面板：一块表面 + 品牌标记，不含装饰性渐变 ────────────── */
.hero-visual {
  display: flex;
  justify-content: center;
}

.hero-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
  width: 100%;
  max-width: calc(var(--container-narrow) * 0.38);
  aspect-ratio: 4 / 3;
  padding: var(--card-padding-lg);
  text-align: center;
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.hero-panel-mark {
  font-size: calc(var(--fs-display) * 0.8);
  line-height: 1;
  animation: var(--decor-animation);
}

.hero-panel-text {
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
  margin: 0;
}

.hero-panel-tagline {
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin: 0;
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 991px) {
  .hero-inner {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: calc(var(--space-unit) * 5);
  }

  .hero-panel {
    max-width: none;
    aspect-ratio: 16 / 9;
  }
}

/* 移动端：区块留白 ×--mobile-section-scale，标题字号 ×--mobile-title-scale */
@media (max-width: 767px) {
  .hero-inner {
    padding: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .hero-title {
    font-size: calc(var(--fs-display) * var(--mobile-title-scale));
  }

  .hero-subtitle {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .hero-features {
    gap: calc(var(--space-unit) * 2);
  }
}

@media (max-width: 575px) {
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-visual {
    display: none;
  }

  .hero-features {
    flex-direction: column;
    gap: calc(var(--space-unit) * 1.5);
  }
}
</style>
