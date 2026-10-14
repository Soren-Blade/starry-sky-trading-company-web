<script setup>
/**
 * 旧成长值页的兼容壳。
 *
 * M2 起成长值页归入会员中心详情子页：`/member/growth`（组件 `MemberGrowth.vue`），
 * 路由表里 `/growth` 直接 302 到新地址，所以本文件不再被路由引用。
 * 保留一个极薄的转发件而不是删除，是为了让仍然按旧路径引用它的地方
 * （例如 `test/growthPage.test.js` 的 SSR 渲染用例）拿到同一份页面内容。
 */
import MemberGrowth from './MemberGrowth.vue'
</script>

<template>
  <MemberGrowth />
</template>
