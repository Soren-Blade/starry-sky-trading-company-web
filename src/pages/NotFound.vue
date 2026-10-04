<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="not-found-content">
        <!-- 大号 404 只是视觉符号，标题由下面的 h1 承担，避免重复播报 -->
        <div class="not-found-icon" aria-hidden="true">404</div>
        <h1>{{ PAGES.notFound.title }}</h1>
        <p>{{ PAGES.notFound.subtitle }}</p>

        <!-- 主 CTA 复用 .u-cta：底色 / 圆角 / hover 位移与阴影全部走令牌 -->
        <router-link to="/" class="u-cta u-cta--lg back-home-btn">
          <span>{{ PAGES.notFound.backHome }}</span>
          <span class="arrow" aria-hidden="true">→</span>
        </router-link>

        <div class="suggestions">
          <h3>{{ PAGES.notFound.suggestionsTitle }}</h3>
          <ul>
            <li><router-link to="/categories">商品分类</router-link></li>
            <li><router-link to="/hot">热门推荐</router-link></li>
            <li><router-link to="/about">关于我们</router-link></li>
          </ul>
        </div>
      </div>

      <!-- 装饰性插画：仅 emoji，对屏幕阅读器隐藏 -->
      <div class="not-found-illustration" aria-hidden="true">
        <div class="floating-star">⭐</div>
        <div class="floating-diamond">💎</div>
        <div class="floating-sparkle">✨</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PAGES } from '@/constants/index.js'
</script>

<style scoped>
.not-found-page {
  width: 100%;
  /* 垂直居中要扣掉固定顶栏的高度（顶栏占位本身由 App.vue 的 .main-content 负责） */
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  /* 页面底色由 body 的 --bg-page / 主题背景层承担，此处保持透明 */
  background: transparent;
}

.not-found-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(var(--section-gap) * 0.6);
  align-items: center;
  max-width: var(--container-narrow);
  width: 100%;
  padding: var(--section-gap) var(--container-padding);
}

.not-found-content {
  text-align: left;
}

/* 原先用 background-clip 做渐变文字，主题化后直接用强调色，无渐变也不会失义 */
.not-found-icon {
  font-size: var(--fs-display);
  font-weight: var(--fw-display);
  color: var(--accent);
  line-height: 1;
  margin-bottom: calc(var(--space-unit) * 2.5);
}

.not-found-content h1 {
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
  margin: 0 0 calc(var(--space-unit) * 2);
}

.not-found-content p {
  font-size: var(--fs-body);
  color: var(--text-secondary);
  line-height: var(--leading-body);
  margin: 0 0 calc(var(--section-gap) * 0.4);
}

/* .u-cta 已负责主按钮的视觉、hover 与文字色（含链接型 CTA 的 hover 锁定），
   这里只补页内间距与箭头微动效 */
.back-home-btn {
  margin-bottom: calc(var(--section-gap) * 0.4);
}

.back-home-btn .arrow {
  transition: transform var(--transition-interactive);
}

.back-home-btn:hover .arrow {
  transform: translateX(calc(var(--space-unit) * 0.5));
}

.suggestions {
  padding: var(--panel-padding);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.suggestions h3 {
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-primary);
  margin: 0 0 calc(var(--space-unit) * 1.5);
}

.suggestions ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
}

.suggestions a {
  display: inline-block;
  font-size: var(--fs-sm);
  color: var(--accent);
  padding: var(--space-unit) 0;
  border-bottom: 1px solid transparent;
  transition:
    border-color var(--transition-interactive),
    padding-left var(--transition-interactive);
}

.suggestions a:hover {
  border-bottom-color: var(--accent);
  padding-left: calc(var(--space-unit) * 0.5);
}

.not-found-illustration {
  position: relative;
  height: calc(var(--space-unit) * 37.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 浮动动效来自 --decor-animation：不需要装饰动效的主题该令牌为 none */
.floating-star,
.floating-diamond,
.floating-sparkle {
  position: absolute;
  font-size: var(--fs-display);
  animation: var(--decor-animation);
}

.floating-star {
  top: calc(var(--space-unit) * 2.5);
  left: calc(var(--space-unit) * 3.75);
}

.floating-diamond {
  top: calc(var(--space-unit) * 18.75);
  right: calc(var(--space-unit) * 5);
  font-size: var(--fs-h1);
  /* 用统一错峰步长表达原来的 1s 延迟，避免魔法数字 */
  animation-delay: calc(var(--stagger-step) * 16);
}

.floating-sparkle {
  bottom: calc(var(--space-unit) * 5);
  left: 50%;
  font-size: var(--fs-h2);
  animation-delay: calc(var(--stagger-step) * 8);
}

@media (max-width: 991px) {
  .not-found-container {
    grid-template-columns: 1fr;
    gap: calc(var(--section-gap) * 0.4);
  }

  .not-found-icon {
    font-size: var(--fs-h1);
  }

  .not-found-content h1 {
    font-size: var(--fs-h2);
  }

  .not-found-illustration {
    height: calc(var(--space-unit) * 25);
  }

  .floating-star,
  .floating-diamond,
  .floating-sparkle {
    font-size: var(--fs-h1);
  }

  .floating-diamond {
    font-size: var(--fs-h2);
  }

  .floating-sparkle {
    font-size: var(--fs-h3);
  }
}

@media (max-width: 767px) {
  .not-found-container {
    padding: calc(var(--section-gap) * 0.4) var(--container-padding);
    gap: calc(var(--space-unit) * 3.75);
  }

  .not-found-icon {
    font-size: var(--fs-h2);
  }

  .not-found-content h1 {
    font-size: var(--fs-h3);
  }

  .not-found-content p {
    font-size: var(--fs-sm);
    margin-bottom: calc(var(--space-unit) * 3.75);
  }

  .back-home-btn {
    margin-bottom: calc(var(--space-unit) * 3.75);
  }

  .suggestions {
    padding: var(--card-padding);
  }

  .not-found-illustration {
    height: calc(var(--space-unit) * 18.75);
  }

  .floating-star,
  .floating-diamond,
  .floating-sparkle {
    font-size: var(--fs-h2);
  }

  .floating-diamond {
    font-size: var(--fs-h3);
  }

  .floating-sparkle {
    font-size: var(--fs-body);
  }
}
</style>
