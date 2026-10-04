<template>
  <!--
    版式：大号数字。
    404 本身是视觉主体（字号由 --fs-display 派生），说明与操作在其下方竖排；
    建议链接是行式列表。刻意不放装饰 emoji —— 规范要求「所有视觉重量由排版与间距承担」，
    且散落的 emoji 在两个断点之间无法保持构图。
  -->
  <div class="nf-page">
    <div class="nf-shell">
      <p class="nf-eyebrow">{{ PAGES.notFound.eyebrow }}</p>

      <!-- 大号 404 只是视觉符号，语义标题由下面的 h1 承担，避免重复播报 -->
      <div class="nf-figure" aria-hidden="true">404</div>
      <div class="nf-rule" aria-hidden="true"></div>

      <h1 class="nf-title">{{ PAGES.notFound.title }}</h1>
      <p class="nf-desc">{{ PAGES.notFound.description }}</p>

      <!-- 主 CTA 复用 .u-btn-primary：底色 / 圆角 / 悬停位移与阴影全部走令牌 -->
      <router-link to="/" class="u-btn-primary nf-cta">
        <span>{{ PAGES.notFound.backHome }}</span>
        <span class="nf-arrow" aria-hidden="true">→</span>
      </router-link>

      <!-- 建议链接：行式列表，行间 --divider -->
      <nav class="nf-links" aria-label="建议访问的页面">
        <h2 class="nf-links-title">{{ PAGES.notFound.suggestionsTitle }}</h2>
        <ul class="nf-links-list">
          <li>
            <router-link to="/categories" class="nf-link">
              <span>商品分类</span>
              <span class="nf-link-arrow" aria-hidden="true">→</span>
            </router-link>
          </li>
          <li>
            <router-link to="/hot" class="nf-link">
              <span>热卖榜</span>
              <span class="nf-link-arrow" aria-hidden="true">→</span>
            </router-link>
          </li>
          <li>
            <router-link to="/about" class="nf-link">
              <span>关于我们</span>
              <span class="nf-link-arrow" aria-hidden="true">→</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { PAGES } from '@/constants/index.js'
</script>

<style scoped>
/*
 * 404 —— 大号数字
 *
 * 单列居中：巨大的 404 当开场，下面是标题 / 说明 / 主 CTA / 行式建议链接。
 * 字号从 --fs-display 用 calc() 派生，不写死 px；顶栏是 sticky 且参与文档流，
 * 因此只减去它的高度即可（同 HeroSection）。
 *
 * 这里**不用** -webkit-text-stroke 做描边：实测（headless Chrome 截图）在该字号下
 * 会在字形上叠出多余的横竖线段。改为强调色实色填充，五套主题下都稳定。
 */
.nf-page {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: calc(100vh - var(--navbar-height));
  padding: calc(var(--section-gap) * 0.6) 0;
}

.nf-shell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
  width: 100%;
  max-width: var(--container-narrow);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.nf-eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-muted);
}

.nf-figure {
  margin: 0;
  font-family: var(--font-display);
  font-size: calc(var(--fs-display) * 2.5);
  font-weight: var(--fw-display);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  /* 强调色实色：描边在该字号下会渲染出伪影（见文件头注释） */
  color: var(--accent);
}

/* 数字与标题之间的一道强调线 */
.nf-rule {
  width: calc(var(--space-unit) * 8);
  height: var(--stroke-width);
  margin: calc(var(--space-unit) * 0.5) 0;
  background: var(--divider);
}

.nf-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.nf-desc {
  max-width: 46ch;
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* .u-btn-primary 已负责主按钮视觉，这里只补页内间距与箭头微动效 */
.nf-cta {
  margin-top: var(--space-unit);
}

.nf-arrow {
  transition: transform var(--transition-interactive);
}

.nf-cta:hover .nf-arrow {
  transform: translateX(calc(var(--space-unit) * 0.5));
}

/* 建议链接：行式列表，行间 --divider */
.nf-links {
  width: 100%;
  max-width: calc(var(--container-narrow) * 0.6);
  margin-top: calc(var(--section-gap) * 0.3);
}

.nf-links-title {
  margin: 0 0 calc(var(--space-unit) * 0.5);
  font-family: var(--font-display);
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-muted);
}

.nf-links-list {
  display: flex;
  flex-direction: column;
}

.nf-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 1.25) 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  border-bottom: var(--stroke-width) solid var(--divider);
  transition:
    color var(--transition-interactive),
    border-color var(--transition-interactive);
}

.nf-link:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.nf-link-arrow {
  transition: transform var(--transition-interactive);
}

.nf-link:hover .nf-link-arrow {
  transform: translateX(calc(var(--space-unit) * 0.5));
}

/* 移动端缩放：区块间距 ×0.6、内边距 ×0.8、标题 ×0.7、正文 ×0.95 */
@media (max-width: 767px) {
  .nf-page {
    padding: calc(var(--section-gap) * 0.4 * var(--mobile-section-scale)) 0;
  }

  .nf-shell {
    gap: var(--space-unit);
    padding: 0 calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .nf-figure {
    font-size: calc(var(--fs-display) * 1.8 * var(--mobile-title-scale));
  }

  .nf-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .nf-desc {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .nf-links {
    max-width: 100%;
    margin-top: calc(var(--section-gap) * 0.2);
  }
}
</style>
