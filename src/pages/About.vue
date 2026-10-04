<template>
  <!--
    版式一：编辑式双栏。
    左栏是粘性目录（眉标 + 大标题 + 说明 + 锚点列表），右栏是可滚动的正文；
    页面头不再是居中色块，而是与目录共用同一条基线。≤991px 收成单栏。
  -->
  <div class="about-page">
    <div class="about-shell">
      <!-- 左栏：锚点用原生 <a href="#id">，滚动定位交给浏览器，不写 JS -->
      <aside class="about-aside">
        <p class="about-eyebrow">{{ PAGES.about.eyebrow }}</p>
        <h1 class="about-title">{{ PAGES.about.title }}</h1>
        <p class="about-lead">{{ PAGES.about.description }}</p>

        <nav class="about-nav" aria-label="本页目录">
          <ul class="about-nav-list">
            <li><a href="#about-vision">我们的愿景</a></li>
            <li><a href="#about-values">我们的核心价值</a></li>
            <li><a href="#about-contact">联系我们</a></li>
          </ul>
        </nav>
      </aside>

      <!-- 右栏：三段正文，段间用 --divider 分隔 -->
      <div class="about-body">
        <section id="about-vision" class="about-section">
          <h2>我们的愿景</h2>
          <p>
            星辰商行致力于为用户带来精选商品和优质服务。我们相信，每一件商品都承载着独特的故事和品质，
            我们的使命是让消费者在享受便利购物的同时，感受到生活的美好。
          </p>
        </section>

        <section id="about-values" class="about-section">
          <h2>我们的核心价值</h2>
          <!-- 编号列表：等宽的 01/02/03/04 替代主页那种卡片网格，与首页拉开观感 -->
          <ol class="value-list">
            <li class="value-item">
              <span class="value-index" aria-hidden="true">01</span>
              <h3 class="value-title">品质优先</h3>
              <p class="value-text">每一件商品都经过严格筛选，确保品质与美学的完美结合</p>
            </li>
            <li class="value-item">
              <span class="value-index" aria-hidden="true">02</span>
              <h3 class="value-title">高效服务</h3>
              <p class="value-text">快速配送、贴心售后，让您的购物体验更加轻松</p>
            </li>
            <li class="value-item">
              <span class="value-index" aria-hidden="true">03</span>
              <h3 class="value-title">创新体验</h3>
              <p class="value-text">不断创新购物方式，为用户提供更好的体验</p>
            </li>
            <li class="value-item">
              <span class="value-index" aria-hidden="true">04</span>
              <h3 class="value-title">用户至上</h3>
              <p class="value-text">以用户需求为中心，打造温暖的购物社区</p>
            </li>
          </ol>
        </section>

        <section id="about-contact" class="about-section">
          <h2>联系我们</h2>
          <!-- 联系方式做成「标签 + 值」对照表，值用等宽字体，取代原来一串 emoji 段落 -->
          <dl class="contact-table">
            <div class="contact-row">
              <dt class="contact-label"><span aria-hidden="true">📍</span> 地址</dt>
              <dd class="contact-value">中国 北京市 朝阳区</dd>
            </div>
            <div class="contact-row">
              <dt class="contact-label"><span aria-hidden="true">📞</span> 电话</dt>
              <dd class="contact-value">400-800-8888</dd>
            </div>
            <div class="contact-row">
              <dt class="contact-label"><span aria-hidden="true">✉️</span> 邮箱</dt>
              <dd class="contact-value">service@starrysky.com</dd>
            </div>
            <div class="contact-row">
              <dt class="contact-label"><span aria-hidden="true">🕐</span> 服务时间</dt>
              <dd class="contact-value">9:00 - 22:00</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PAGES } from '@/constants/index.js'
</script>

<style scoped>
/*
 * 关于我们 —— 编辑式双栏
 *
 * 页面头组件（PageHeader / .page-header）已删除，本页的开场是**左栏的眉标 +
 * 大标题**，标题字号取 --fs-h1；顶栏是 position: sticky 且参与文档流，
 * 因此主内容不需要顶部占位，只有左栏的 sticky 偏移要留出它的高度。
 * 全部尺寸来自令牌，颜色来自语义令牌，五套风格下都成立。
 */
.about-page {
  width: 100%;
  padding: calc(var(--section-gap) * 0.7) 0 calc(var(--section-gap) * 0.5);
}

.about-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: calc(var(--section-gap) * 0.5);
  align-items: start;
  max-width: var(--container-narrow);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

/* 左栏贴住顶栏下沿：偏移 = 顶栏高度 + 两个基础单位 */
.about-aside {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-unit) * 2);
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
}

/* 眉标：等宽 + 强调色，与右栏正文的衬线/无衬线形成层次 */
.about-eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
}

.about-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.about-lead {
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 锚点列表：每项下方一道 --divider，像目录条目 */
.about-nav {
  margin-top: var(--space-unit);
}

.about-nav-list {
  display: flex;
  flex-direction: column;
}

.about-nav-list a {
  display: block;
  padding: calc(var(--space-unit) * 1.25) 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  border-bottom: var(--stroke-width) solid var(--divider);
  transition:
    color var(--transition-interactive),
    border-color var(--transition-interactive),
    padding-left var(--transition-interactive);
}

.about-nav-list a:hover {
  padding-left: var(--space-unit);
  color: var(--accent);
  border-bottom-color: var(--accent);
}

/* 右栏：三段正文，段与段之间用 --divider 分隔 */
.about-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--section-gap) * 0.4);
  min-width: 0;
}

.about-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  /* 锚点跳转时给粘性顶栏留出高度，标题不会被顶栏盖住 */
  scroll-margin-top: calc(var(--navbar-height) + var(--space-unit) * 2);
}

/* 分隔线只加在相邻的后续段落上，最后一段不会多出一道线 */
.about-section:first-child {
  padding-top: 0;
}

.about-section + .about-section {
  padding-top: calc(var(--section-gap) * 0.4);
  border-top: var(--stroke-width) solid var(--divider);
}

.about-section h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h2);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
}

.about-section p {
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 核心价值：编号 + 标题 + 说明的三列行式列表，行间同样用 --divider */
.value-list {
  display: flex;
  flex-direction: column;
}

.value-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: calc(var(--space-unit) * 2);
  row-gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 2) 0;
}

.value-item + .value-item {
  border-top: var(--stroke-width) solid var(--divider);
}

/* 编号：等宽字体撑起左列，为 05 及以后留出两位宽度 */
.value-index {
  grid-row: 1 / 3;
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
  font-weight: var(--fw-label);
  line-height: var(--leading-title);
  letter-spacing: var(--tracking-label);
  color: var(--accent);
}

.value-title {
  grid-column: 2;
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--fs-body);
  font-weight: var(--fw-label);
  color: var(--text-primary);
}

.value-text {
  grid-column: 2;
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

/* 联系方式：标签 + 值的对照表，值用等宽字体 */
.contact-table {
  display: flex;
  flex-direction: column;
}

.contact-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: calc(var(--space-unit) * 2);
  align-items: baseline;
  padding: calc(var(--space-unit) * 1.25) 0;
}

.contact-row + .contact-row {
  border-top: var(--stroke-width) solid var(--divider);
}

.contact-label {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.contact-value {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-primary);
}

/* ≤991px：双栏收成单栏，左栏不再粘住 */
@media (max-width: 991px) {
  .about-shell {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--section-gap) * 0.4);
  }

  .about-aside {
    position: static;
    top: auto;
  }
}

/* 移动端缩放：区块间距 ×0.6、内边距 ×0.8、标题 ×0.7、正文 ×0.95 */
@media (max-width: 767px) {
  .about-page {
    padding: calc(var(--section-gap) * var(--mobile-section-scale)) 0
      calc(var(--section-gap) * var(--mobile-section-scale) * 0.5);
  }

  .about-shell {
    gap: calc(var(--section-gap) * var(--mobile-section-scale));
    padding: 0 calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  /* 本页开场标题是 --fs-h1，正文小标题是 --fs-h2，移动端各乘 0.7 后层级仍成立 */
  .about-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .about-section h2 {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }

  .about-body {
    gap: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .about-section + .about-section {
    padding-top: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .about-section p,
  .about-lead {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .about-nav-list a {
    padding: var(--space-unit) 0;
  }
}
</style>
