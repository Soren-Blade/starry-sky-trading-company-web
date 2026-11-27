<template>
  <!--
    共享 Apple ID（工具页骨架）。

    页面本身只剩三件事：
      1. 页头交给公共工具页外壳，并打开 `back-inline` —— 「返回工具页」只是离开，
         不该在标题与账号之间独占一行（那一行会吃掉首屏 40px + 两段外边距）。
      2. 风险确认门禁（AppleIdRiskGate）：两条提示改成进页面时的确认弹窗，
         确认之前**不渲染目录、也不发任何账号请求**（目录整块在门禁的 slot 里）。
      3. 正文交给 AppleIdSection：教程入口、线路切换、账号卡与未登录/加载/失败/空
         四态都在它内部，页面不单独读 store 做计数。

    为什么不再有页头统计行：同一个「31」此前出现在页头、左轨线路行、区块标题三处，
    三份计数各占一行高度却指向同一份数据。计数现在只在「线路切换」这一处出现，
    它同时也是唯一的跳转入口。
  -->
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
    back-inline
  >
    <AppleIdRiskGate>
      <AppleIdSection />
    </AppleIdRiskGate>
  </ToolPageShell>
</template>

<script setup>
/**
 * 共享 Apple ID（工具页）。
 *
 * 本文件只做接线：页头文案来自 `TOOL_PAGES`，门禁来自 AppleIdRiskGate，
 * 列表与四态来自 AppleIdSection。计数、拉取、复制、来源切换都在 AppleIdSection
 * 内部，页面不持有第二份状态。
 */
import AppleIdRiskGate from '@/components/AppleIdRiskGate.vue'
import AppleIdSection from '@/components/AppleIdSection.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGES } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/other/appleId']
</script>
