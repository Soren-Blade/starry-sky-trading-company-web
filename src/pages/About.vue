<template>
  <div class="about-page">
    <!-- 页头改用共享组件：结构与样式在 global.css 的 .page-header，页面不再手写一份 -->
    <PageHeader v-bind="PAGES.about" />

    <div class="about-container">
      <section class="about-section">
        <h2>我们的愿景</h2>
        <p>
          星辰商行致力于为用户带来精选商品和优质服务。我们相信，每一件商品都承载着独特的故事和品质，
          我们的使命是让消费者在享受便利购物的同时，感受到生活的美好。
        </p>
      </section>

      <section class="about-section">
        <h2>我们的核心价值</h2>
        <div class="values-grid">
          <div class="value-card">
            <div class="value-icon" aria-hidden="true">✨</div>
            <h3>品质优先</h3>
            <p>每一件商品都经过严格筛选，确保品质与美学的完美结合</p>
          </div>
          <div class="value-card">
            <div class="value-icon" aria-hidden="true">⚡</div>
            <h3>高效服务</h3>
            <p>快速配送、贴心售后，让您的购物体验更加轻松</p>
          </div>
          <div class="value-card">
            <div class="value-icon" aria-hidden="true">💫</div>
            <h3>创新体验</h3>
            <p>不断创新购物方式，为用户提供更好的体验</p>
          </div>
          <div class="value-card">
            <div class="value-icon" aria-hidden="true">❤️</div>
            <h3>用户至上</h3>
            <p>以用户需求为中心，打造温暖的购物社区</p>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2>联系我们</h2>
        <div class="contact-info">
          <p><span aria-hidden="true">📍</span> 地址：中国 北京市 朝阳区</p>
          <p><span aria-hidden="true">📞</span> 电话：400-800-8888</p>
          <p><span aria-hidden="true">✉️</span> 邮箱：service@starrysky.com</p>
          <p><span aria-hidden="true">🕐</span> 服务时间：9:00 - 22:00</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import { PAGES } from '@/constants/index.js'
</script>

<style scoped>
/* 顶栏占位由 App.vue 的 .main-content 统一负责，页面不再声明顶部内边距 */
.about-page {
  width: 100%;
}

.about-container {
  max-width: var(--container-narrow);
  margin: 0 auto;
  padding: var(--section-gap) var(--container-padding);
}

.about-section {
  margin-bottom: calc(var(--section-gap) * 0.75);
}

.about-section:last-child {
  margin-bottom: 0;
}

.about-section h2 {
  display: inline-block;
  font-size: var(--fs-h2);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
  /* 结构性分隔线跟随主题描边宽度：粗野主义的 2px 在直角主题下才不突兀 */
  border-bottom: var(--stroke-width) solid var(--accent);
  padding-bottom: calc(var(--space-unit) * 1.5);
  margin-bottom: calc(var(--space-unit) * 3);
}

.about-section p {
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  margin: 0;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--grid-gap);
  margin-top: calc(var(--grid-gap) * 1.5);
}

/* 原先的紫粉渐变底改为令牌表面色 + 边框，五套主题下都能成立 */
.value-card {
  padding: var(--card-padding-lg);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  backdrop-filter: var(--effect-backdrop);
  -webkit-backdrop-filter: var(--effect-backdrop);
  text-align: center;
  transition:
    transform var(--transition-surface),
    border-color var(--transition-surface),
    box-shadow var(--transition-surface);
}

.value-card:hover {
  transform: var(--card-hover-transform);
  border-color: var(--card-hover-border);
  box-shadow: var(--shadow-card-hover);
}

.value-icon {
  display: block;
  font-size: var(--fs-h1);
  /* 卡片内部节奏：1.5 个基础单位（原 --card-gap 的替代） */
  margin-bottom: calc(var(--space-unit) * 1.5);
}

.value-card h3 {
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  margin: 0 0 calc(var(--space-unit) * 1.5);
}

.value-card p {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  margin: 0;
}

.contact-info {
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.contact-info p {
  margin: var(--space-unit) 0;
}

/* 移动端缩放（规范第十四节）：区块间距 ×0.6、内边距 ×0.8、标题 ×0.7、正文 ×0.95 */
@media (max-width: 767px) {
  .about-container {
    padding: calc(var(--section-gap) * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .about-section {
    margin-bottom: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .about-section h2 {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }

  .about-section p,
  .contact-info {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .values-grid {
    grid-template-columns: 1fr;
  }

  .value-card {
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .value-icon {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }
}
</style>
