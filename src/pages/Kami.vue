<template>
  <!--
    卡密控制台的开场。
    主页以外的页面不再有统一页头（PageHeader 已删除），因此开场由页面自己写：
    眉标（等宽字体）+ 大字标题 + 一句说明 + 右侧的卡密总数。
    右侧计数只有登录后才有意义 —— 游客没有卡密，显示「共 0 张」会误导，
    判据与 KamiSection 的 canUseKami 保持一致（已用账号登录 + 拿到 userId）。
  -->
  <div class="kami-page">
    <header class="kami-open">
      <div class="open-text u-enter" :style="{ '--i': 0 }">
        <p class="open-eyebrow">{{ PAGES.kami.eyebrow }}</p>
        <h1 class="open-title">{{ PAGES.kami.title }}</h1>
        <p class="open-desc">{{ PAGES.kami.description }}</p>
      </div>
      <p v-if="showKamiCount" class="open-count u-tag u-tag--accent">
        共 {{ pagination.total }} 张卡密
      </p>
    </header>

    <KamiSection />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import KamiSection from '@/components/KamiSection.vue'
import { PAGES } from '@/constants/content.js'
import { useUserStore } from '@/stores/user'
import { useKamiStore } from '@/stores/kami'

const userStore = useUserStore()
const kamiStore = useKamiStore()

// 计数直接读 store（KamiSection 里渲染的是同一份 pagination），不在父子之间传 prop
const { pagination } = storeToRefs(kamiStore)

const showKamiCount = computed(() => userStore.isLoggedIn && Boolean(userStore.userId))
</script>

<style scoped>
/* 装订线与各区块共用同一条：宽度取 --container-max、左右内边距取 --container-padding */
.kami-page {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  /* 上方留白从 --section-gap 派生：随主题密度（density）一起缩放 */
  padding: calc(var(--section-gap) * 0.25) var(--container-padding) 0;
}

.kami-open {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 3);
  /* 开场与下方控制台之间只留一段呼吸：区块自身的内边距承担其余节奏 */
  margin-bottom: calc(var(--section-gap) * 0.25);
}

.open-text {
  min-width: 0;
}

/* 眉标：等宽字体 + 标签档字号，与标题拉开层级 */
.open-eyebrow {
  margin: 0 0 calc(var(--space-unit) * 0.75);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
}

.open-title {
  margin: 0 0 var(--space-unit);
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
}

.open-desc {
  max-width: var(--container-narrow);
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 计数用共享标签类（.u-tag.u-tag--accent），这里只禁止它在窄屏被压扁换行 */
.open-count {
  flex-shrink: 0;
}

/* ≤767：开场改竖排（计数落到标题下方），字号按规范缩放 */
@media (max-width: 767px) {
  .kami-page {
    padding: calc(var(--section-gap) * 0.25 * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale)) 0;
  }

  .kami-open {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 2);
    margin-bottom: calc(var(--section-gap) * 0.25 * var(--mobile-section-scale));
  }

  .open-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .open-desc {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }
}
</style>
