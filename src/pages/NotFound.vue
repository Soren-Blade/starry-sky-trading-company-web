<template>
  <!--
    版式二：大号数字。
    404 本身是视觉主体（由 --fs-display 派生的超大字号），说明与操作在右栏；
    ≤991px 收成单栏居中。装饰 emoji 全部 aria-hidden。
  -->
  <div class="nf-page">
    <div class="nf-shell">
      <div class="nf-editorial">
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

        <!-- 建议链接改成行式列表：--divider 分隔 + 行尾箭头，取代原先的卡片 -->
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
                <span>热门推荐</span>
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

      <!-- 装饰性插画：仅 emoji，对屏幕阅读器隐藏；浮动动效来自 --decor-animation -->
      <div class="nf-decor" aria-hidden="true">
        <div class="nf-star">⭐</div>
        <div class="nf-diamond">💎</div>
        <div class="nf-sparkle">✨</div>
      </div>
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
 * 页面头组件已删除，本页的开场就是那个巨大的 404：字号从 --fs-display
 * 用 calc() 派生（×2.5），不写死 px。竖排的 --divider 把它与右侧说明分开。
 * 顶栏是 sticky 且参与文档流，因此只减去它的高度即可（同 HeroSection）。
 */
.nf-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: calc(100vh - var(--navbar-height));
}

.nf-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-items: center;
  width: 100%;
  max-width: var(--container-narrow);
  margin: 0 auto;
  padding: var(--section-gap) var(--container-padding);
}

/* 左栏：大号数字 + 竖排分隔线 + 说明与操作 */
.nf-editorial {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
  padding-right: calc(var(--section-gap) * 0.4);
  border-right: var(--stroke-width) solid var(--divider);
  min-width: 0;
}

.nf-eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
}

/*
 * 404 用强调色描边：-webkit-text-stroke 在 Chromium / WebKit / Firefox 上均可用；
 * 填色取当前文字色，描边取 --accent，两者都不写死颜色。
 * 描边宽度复用 --stroke-width，粗野主义主题下会自然变粗一档。
 */
.nf-figure {
  margin: 0;
  font-family: var(--font-display);
  font-size: calc(var(--fs-display) * 2.5);
  font-weight: var(--fw-display);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  color: var(--text-primary);
  -webkit-text-stroke: var(--stroke-width) var(--accent);
}

/* 数字与说明之间的一道强调线 */
.nf-rule {
  width: calc(var(--space-unit) * 8);
  height: var(--stroke-width);
  background: var(--accent);
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
  max-width: 42ch;
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
  margin-top: calc(var(--space-unit) * 2);
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

/* 右栏：装饰 emoji 漂在留白里，动效取决于主题的 --decor-animation */
.nf-decor {
  position: relative;
  height: calc(var(--section-gap) * 3.5);
}

.nf-star,
.nf-diamond,
.nf-sparkle {
  position: absolute;
  font-size: var(--fs-display);
  line-height: 1;
  animation: var(--decor-animation);
}

.nf-star {
  top: calc(var(--space-unit) * 2.5);
  left: calc(var(--space-unit) * 3.75);
}

.nf-diamond {
  top: calc(var(--space-unit) * 18.75);
  right: calc(var(--space-unit) * 5);
  font-size: var(--fs-h1);
  /* 用统一错峰步长表达原来的延迟，避免魔法数字 */
  animation-delay: calc(var(--stagger-step) * 16);
}

.nf-sparkle {
  bottom: calc(var(--space-unit) * 5);
  left: 50%;
  font-size: var(--fs-h2);
  animation-delay: calc(var(--stagger-step) * 8);
}

/* ≤991px：单栏居中，竖排分隔线改成横排 */
@media (max-width: 991px) {
  .nf-shell {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    gap: calc(var(--section-gap) * 0.3);
    padding-top: calc(var(--section-gap) * 0.6);
    padding-bottom: calc(var(--section-gap) * 0.6);
  }

  .nf-editorial {
    align-items: center;
    padding-right: 0;
    border-right: 0;
    text-align: center;
  }

  .nf-desc {
    max-width: 46ch;
  }

  .nf-figure {
    font-size: calc(var(--fs-display) * 2);
  }

  .nf-decor {
    height: calc(var(--section-gap) * 2);
  }

  .nf-star,
  .nf-diamond,
  .nf-sparkle {
    font-size: var(--fs-h1);
  }

  .nf-diamond {
    font-size: var(--fs-h2);
  }

  .nf-sparkle {
    font-size: var(--fs-h3);
  }
}

/* 移动端缩放：区块间距 ×0.6、内边距 ×0.8、标题 ×0.7、正文 ×0.95 */
@media (max-width: 767px) {
  .nf-shell {
    gap: calc(var(--section-gap) * var(--mobile-section-scale));
    padding: calc(var(--section-gap) * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .nf-editorial {
    gap: var(--space-unit);
  }

  .nf-figure {
    font-size: calc(var(--fs-display) * 1.6 * var(--mobile-title-scale));
  }

  .nf-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .nf-desc {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .nf-decor {
    height: calc(var(--section-gap) * 1.5);
  }

  .nf-star,
  .nf-diamond,
  .nf-sparkle {
    font-size: var(--fs-h2);
  }

  .nf-diamond {
    font-size: var(--fs-h3);
  }

  .nf-sparkle {
    font-size: var(--fs-body);
  }
}
</style>
