<template>
  <!-- 没有等级数据就整块不渲染：宁可不显示，也不显示一张空表 -->
  <section v-if="levels.length" class="ui-card u-mm-section">
    <div class="u-mm-section-head">
      <div class="u-mm-section-head-main">
        <h2 class="u-mm-section-title">{{ title }}</h2>
        <p v-if="description" class="u-mm-section-desc">{{ description }}</p>
      </div>
    </div>

    <div class="u-mm-section-body">
      <div class="u-table-wrap">
        <table class="u-table u-mm-ladder">
          <thead>
            <tr>
              <th scope="col">等级</th>
              <th scope="col">成长值门槛</th>
              <th v-if="showRewards" scope="col">消费折扣</th>
              <th v-if="showRewards" scope="col">积分倍率</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="level in levels"
              :key="level.level"
              :class="{ 'is-current': level.level === currentLevel }"
              :aria-current="level.level === currentLevel ? 'true' : undefined"
            >
              <td>
                {{ level.name }}
                <span v-if="level.level === currentLevel" class="u-tag u-tag--accent">当前</span>
              </td>
              <td class="u-mm-ladder-num">{{ level.growth_threshold }}</td>
              <td v-if="showRewards" class="u-mm-ladder-num">{{ discountLabel(level.discount_rate) }}</td>
              <td v-if="showRewards" class="u-mm-ladder-num">×{{ level.points_multiplier }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 会员等级阶梯表（V1–V8）—— 会员套餐页与成长值页共用
 *
 * ## 为什么做成组件
 *
 * 这张表原先内联在 `/member/plans`（`MemberPlans.vue` 的 `section.plans-levels`），
 * 而「成长值怎么涨、涨到哪一级」的展示页（`/growth`）需要**同一张表**。
 * 抄一份的下场是可预见的：两处门槛数字迟早不一致，且没人会收到报错
 * （页面各自渲染成功，只是一个说 3000、一个说 1500）。
 *
 * ## 数字一律来自服务端
 *
 * `levels` 就是 `sstc.get_member_plans` 下发的 `levels[]`（`member_levels` 全表按
 * `sort_order` 排序），门槛/折扣/倍率**原样展示**：
 *   1. 前端**不抄第二份门槛数字**（`constants/member.js` 的 `MEMBER_LEVELS` 只登记 id 与展示名），
 *      也就不会出现「页面说 V3 门槛 1500、库里其实是 1600」这类静默漂移；
 *   2. 折扣只做**翻译**（`0.95` → `95 折`，见 `discountLabel`），不做算术。
 *
 * ## 「当前」标记的两个口径
 *
 *   - `currentLevel` 由调用页给出：套餐页从 `plans[].is_current` 反推（`is_current` 比较的是
 *     **等级**，所以同级的月/季/年三档会同时为 true，`find()` 取到的是等级而不是某一档套餐）；
 *   - 它标的是 `get_member_snapshot` 返回的**生效等级**（付费等级与成长值等级取高者），
 *     即用户此刻真正享有的权益档位 —— 所以只标记、不参与任何计算。
 *     成长值页则标**成长值挣到的档**（那页讲的是「攒到哪一级」），两者可能不同，
 *     所以由调用页决定传哪个，组件不自己猜。
 *
 * ## `showRewards`
 *
 * 成长值页只从 `getGrowthHistory` 拿到 `thresholds`（`{level, name, growth_threshold}`），
 * 没有折扣与倍率 —— 那种情况下把两列藏掉（`showRewards=false`），
 * 而不是渲染出两列 `undefined`。折扣/倍率仍由套餐页展示，信息来源只有服务端一份。
 *
 * ## 样式
 *
 * 区块壳（标题 / 说明 / 内容）走 `ui-kit-member.css` §1 的 `.u-mm-section-*`，
 * 表格与门槛数值走 §10 的 `.u-mm-ladder` / `.u-mm-ladder-num`（当前档的强调条也由
 * 分片的 `tr.is-current` 给）。本组件不再自带任何 scoped 样式 —— 「当前等级整行染强调色」
 * 这种做法两页各写一遍，正是这次收敛要消掉的东西。
 */
import { discountLabel } from '@/constants/member.js'

defineProps({
  /** 服务端 `get_member_plans` 的 `levels[]`，空数组则整块不渲染 */
  levels: { type: Array, default: () => [] },
  /** 当前生效等级（`v1`–`v8`），非会员传空串 */
  currentLevel: { type: String, default: '' },
  /** 卡片内的小节标题 */
  title: { type: String, default: '等级阶梯' },
  /** 标题下的说明（成长值规则由调用页给，这里不预设口径） */
  description: { type: String, default: '' },
  /** 是否展示「消费折扣 / 积分倍率」两列（只有门槛数据时传 false） */
  showRewards: { type: Boolean, default: true },
})
</script>
