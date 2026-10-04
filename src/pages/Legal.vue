<template>
  <div class="page-shell legal-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">{{ eyebrow }}</p>
      <h1 class="page-shell-title">{{ doc.title }}</h1>
      <p class="page-shell-desc">最后更新：{{ doc.updatedAt }}</p>
    </header>

    <!-- 页内目录：长文档给一条跳转路径，窄屏隐藏（内容仍可滚动阅读） -->
    <div class="legal-layout">
      <nav class="legal-toc" aria-label="页内目录">
        <p class="legal-toc-title">目录</p>
        <ul class="legal-toc-list">
          <li v-for="(section, index) in doc.sections" :key="section.heading">
            <a :href="`#legal-${index}`" class="legal-toc-link">{{ section.heading }}</a>
          </li>
        </ul>

        <!-- 三份文档互相跳转，用户不必回到页脚再点一次 -->
        <div class="legal-switch">
          <router-link
            v-for="other in otherDocs"
            :key="other.to"
            :to="other.to"
            class="legal-switch-link"
          >
            {{ other.label }}
          </router-link>
        </div>
      </nav>

      <article class="legal-body">
        <section
          v-for="(section, index) in doc.sections"
          :id="`legal-${index}`"
          :key="section.heading"
          class="legal-section"
        >
          <h2 class="legal-heading">{{ section.heading }}</h2>
          <p v-for="(text, i) in section.paragraphs" :key="i" class="legal-text">
            {{ text }}
          </p>
          <ul v-if="section.list && section.list.length" class="legal-list">
            <li v-for="(item, i) in section.list" :key="i" class="legal-list-item">
              {{ item }}
            </li>
          </ul>
        </section>

        <p class="page-note legal-footnote">
          本文档描述的是本站当前的实际行为。若你发现文档与实现不符，
          请通过页脚的联系方式告知我们 —— 那属于缺陷，我们会修正。
        </p>
      </article>
    </div>
  </div>
</template>

<script setup>
/**
 * 法务页（用户协议 / 隐私政策 / 平台规则）
 *
 * 三个路由共用这一个组件，内容由路由的 `meta.legalKey` 从 `LEGAL` 里选。
 * 用 `meta` 而不是三个组件：三页的结构完全相同（编号章节 + 段落 + 列表），
 * 差别只在文案 —— 拆成三份等于把同一段模板抄三遍。
 *
 * 内容刻意对齐**代码实际做的事**（写了哪些字段、用了哪些 localStorage key、
 * 有没有支付通道）。与实现对不上的隐私政策比没有更糟：用户会据此做出错误判断。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { LEGAL } from '@/constants/index.js'

const route = useRoute()

/** 路由 meta.legalKey 缺省回落到用户协议，避免直接访问时渲染空页 */
const key = computed(() => route.meta?.legalKey || 'terms')

const doc = computed(() => LEGAL[key.value] || LEGAL.terms)

/** 眉标取 key 的大写（TERMS / PRIVACY / RULES），与其它页的等宽眉标同构 */
const eyebrow = computed(() => String(key.value).toUpperCase())

const ALL_DOCS = [
  { key: 'terms', label: '用户协议', to: '/terms' },
  { key: 'privacy', label: '隐私政策', to: '/privacy' },
  { key: 'rules', label: '平台规则', to: '/rules' },
]

const otherDocs = computed(() => ALL_DOCS.filter((item) => item.key !== key.value))
</script>

<style scoped>
/*
 * 法务页：左目录（吸顶）/ 右正文。
 * 与 About 页的「编辑式双栏」是同一族版式，但这里正文是条款而不是叙述，
 * 因此行宽更窄（--container-narrow 的一半）、段落间距更大。
 */

.legal-layout {
  display: grid;
  grid-template-columns: calc(var(--dropdown-width) * 0.9) minmax(0, 1fr);
  align-items: start;
  gap: var(--section-gap);
}

.legal-toc {
  position: sticky;
  /* 让开粘性顶栏 */
  top: calc(var(--navbar-height) + var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2.5);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
}

.legal-toc-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-muted);
}

.legal-toc-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legal-toc-link {
  display: block;
  padding: calc(var(--space-unit) * 0.75) 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  transition: color var(--transition-interactive);
}

.legal-toc-link:hover {
  color: var(--accent);
}

.legal-switch {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  margin-top: calc(var(--space-unit) * 2.5);
  padding-top: calc(var(--space-unit) * 2);
  border-top: var(--stroke-width) solid var(--divider);
}

.legal-switch-link {
  font-size: var(--fs-sm);
  color: var(--accent);
  transition: color var(--transition-interactive);
}

.legal-switch-link:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

.legal-body {
  min-width: 0;
}

.legal-section + .legal-section {
  margin-top: var(--section-gap);
}

.legal-heading {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
}

.legal-text {
  max-width: 68ch;
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.legal-text + .legal-text {
  margin-top: calc(var(--space-unit) * 1.5);
}

.legal-list {
  max-width: 68ch;
  margin: calc(var(--space-unit) * 1.5) 0 0;
  padding-left: calc(var(--space-unit) * 3);
  list-style: disc;
}

.legal-list-item {
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.legal-list-item + .legal-list-item {
  margin-top: calc(var(--space-unit) * 0.75);
}

.legal-footnote {
  margin-top: var(--section-gap);
  padding-top: calc(var(--space-unit) * 2);
  border-top: var(--stroke-width) solid var(--divider);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 991px) {
  .legal-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--section-gap) * 0.5);
  }

  .legal-toc {
    position: static;
  }

  /* 单栏时目录变成一条横向可滚的条，避免它占据首屏 */
  .legal-toc-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: calc(var(--space-unit) * 1.5);
  }

  .legal-switch {
    flex-direction: row;
    flex-wrap: wrap;
    gap: calc(var(--space-unit) * 2);
    margin-top: calc(var(--space-unit) * 1.5);
    padding-top: calc(var(--space-unit) * 1.5);
  }
}

@media (max-width: 767px) {
  .legal-section + .legal-section,
  .legal-footnote {
    margin-top: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .legal-text {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }
}
</style>
