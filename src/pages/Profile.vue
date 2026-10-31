<template>
  <div class="page-shell profile-page">
    <header class="page-shell-head page-shell-head--row">
      <div>
        <p class="page-shell-eyebrow">{{ PAGES.profile.eyebrow }}</p>
        <h1 class="page-shell-title">{{ PAGES.profile.title }}</h1>
        <p class="page-shell-desc">{{ PAGES.profile.description }}</p>
      </div>
      <span class="u-tag u-tag--accent">
        {{ userStore.isLoggedIn ? '已登录' : '游客' }}
      </span>
    </header>

    <!--
      会员权益摘要：等级 / 成长值 / 积分 / 优惠券四个数放在两栏面板之上。
      未登录整块不渲染（这几个数都属于账号）；数据没回来时给骨架 —— 加载中
      就写「还不是会员」是错的。数据由 App.vue 在登录态变化时统一拉取，
      本页只负责展示与重试。
    -->
    <section
      v-if="userStore.isLoggedIn && memberSummaryVisible"
      class="ui-card profile-member"
      aria-label="会员权益摘要"
    >
      <div v-if="memberStore.loadingOverview && !memberStore.overview" class="profile-member-skeleton">
        <span class="u-skeleton profile-member-skeleton-line"></span>
        <span class="u-skeleton profile-member-skeleton-line profile-member-skeleton-line--short"></span>
      </div>

      <p v-else-if="memberStore.error" class="profile-member-error" role="alert">
        {{ memberStore.error }}
        <button type="button" class="u-btn-secondary" @click="memberStore.fetchOverview()">重试</button>
      </p>

      <template v-else-if="memberStore.overview">
        <div class="profile-member-head">
          <p class="profile-member-title">
            <AppIcon name="star" aria-hidden="true" />
            {{ memberStore.isMember ? memberStore.levelName : '还不是会员' }}
          </p>
          <p class="profile-member-note">
            {{
              memberStore.isMember && memberStore.overview.days_left
                ? `有效期剩余 ${memberStore.overview.days_left} 天`
                : '开通会员可享消费折扣与积分倍率'
            }}
          </p>
        </div>

        <dl class="profile-member-stats">
          <div class="profile-member-stat">
            <dt class="profile-member-term">成长值</dt>
            <dd class="profile-member-value">
              {{ memberStore.overview.growth ?? 0 }}
              <span v-if="memberStore.overview.growth_threshold" class="profile-member-sub">
                / {{ memberStore.overview.growth_threshold }}
              </span>
            </dd>
          </div>
          <div class="profile-member-stat">
            <dt class="profile-member-term">积分</dt>
            <dd class="profile-member-value">
              {{ memberStore.points }}
              <span v-if="memberStore.overview.points_value" class="profile-member-sub">
                ≈ ¥{{ formatPointsValue(memberStore.points) }}
              </span>
            </dd>
          </div>
          <div class="profile-member-stat">
            <dt class="profile-member-term">优惠券</dt>
            <dd class="profile-member-value">{{ memberStore.overview.coupons ?? 0 }}</dd>
          </div>
        </dl>

        <div class="profile-member-actions">
          <router-link class="u-btn-secondary" to="/member">会员中心</router-link>
          <router-link class="u-btn-secondary" to="/member/plans">套餐对比</router-link>
        </div>

        <p v-if="memberStore.overview.points_expiring" class="profile-member-remind">
          <AppIcon name="clock" aria-hidden="true" />
          {{ memberStore.overview.points_expiring.points }} 积分将于
          {{ toDate(memberStore.overview.points_expiring.expire_at) }} 过期
        </p>
      </template>
    </section>

    <!--
      每日签到：非会员同样每天签到赚积分，所以它是**个人中心功能**，
      入口挂在 `/user/checkin`（旧 `/checkin` 在路由里重定向过去）。
      今日状态读会员摘要里已有的 `checkin_available`，不额外发请求。
    -->
    <section v-if="userStore.isLoggedIn" class="ui-card profile-checkin" aria-label="每日签到">
      <div class="profile-checkin-text">
        <p class="profile-checkin-title">每日签到</p>
        <p class="profile-checkin-desc">
          {{ checkinAvailable ? '今天还没签到，连签 7 天以上每天得 20 积分' : '今天已签到，明天再来' }}
        </p>
      </div>
      <!--
        今天还没签到就直接在这里签到（少一跳），已签到才退回「看日历」。
        两个动作互斥渲染：同一位置不该同时出现「立即签到」和「查看日历」，
        否则用户会以为两者都能补今天。
      -->
      <button
        v-if="checkinAvailable"
        type="button"
        class="u-btn-primary profile-checkin-btn"
        :disabled="checkinPending"
        @click="handleProfileCheckin"
      >
        {{ checkinPending ? '签到中…' : '立即签到' }}
      </button>
      <router-link v-else class="u-btn-secondary" to="/user/checkin">查看签到日历</router-link>
    </section>

    <!--
      邀请有礼（1.6.0）：奖励同样是积分来源，且**发奖在好友完成首单时**，
      不是注册时 —— 文案必须与派奖时机一致，否则用户会以为奖励丢了。
    -->
    <section v-if="userStore.isLoggedIn" class="ui-card profile-invite" aria-label="邀请有礼">
      <div class="profile-invite-text">
        <p class="profile-invite-title">邀请有礼</p>
        <p class="profile-invite-desc">好友通过你的链接注册并完成首单，双方各得积分奖励</p>
      </div>
      <router-link class="u-btn-secondary" to="/invite">去邀请</router-link>
    </section>

    <div class="profile-layout">
      <!-- 左：账号信息（只读） -->
      <section class="page-panel" aria-label="账号信息">
        <h2 class="page-panel-head">{{ TRADE.profileBasic }}</h2>

        <div class="profile-identity">
          <span class="u-avatar profile-avatar">
            <SmartImage
              v-if="userStore.avatarUrl"
              :src="userStore.avatarUrl"
              :alt="nickname || '用户头像'"
              fallback-icon="user"
              loading="eager"
            />
            <AppIcon v-else name="user" />
          </span>
          <div class="profile-identity-text">
            <p class="profile-name">{{ nickname || '未设置昵称' }}</p>
            <p class="profile-since">注册于 {{ toDate(userInfo.created_at) || '—' }}</p>
          </div>
        </div>

        <dl class="profile-fields">
          <div v-for="row in readonlyRows" :key="row.key" class="profile-row">
            <dt>{{ row.label }}</dt>

            <!--
              用户 UID：dd 元素本身就是设计系统的 CardCodeBox —— label / value / act
              三段都是它的直接子元素，外面不再套只读字段底板，也不再多包一层 div；
              行高、左基线、上下留白由 .profile-field-value 统一提供给所有字段行
              （只读字段值的样式见文件末尾那一节样式表）。
              默认只显示前三段，点眼睛后显示明文，30 秒自动回到掩码；复制按钮在 __act 里。
              这里不是卡密详情页，因此不加水印。
            -->
            <dd
              v-if="row.key === 'uuid'"
              class="profile-field-value profile-field-value--code ec-code ec-code--sm"
            >
              <span class="ec-code__label">{{ uuidRevealed ? '明文' : '已脱敏' }}</span>
              <span class="ec-code__value" :class="{ 'is-masked': !uuidRevealed }">
                {{ uuidDisplay }}
              </span>
              <div class="ec-code__act">
                <button
                  type="button"
                  class="ec-icon-btn"
                  :aria-pressed="uuidRevealed ? 'true' : 'false'"
                  :aria-label="uuidRevealed ? '隐藏用户 UID' : '显示用户 UID'"
                  :disabled="!uuidRaw"
                  @click="toggleUuid"
                >
                  <AppIcon :name="uuidRevealed ? 'eye-off' : 'eye'" />
                </button>
                <button
                  type="button"
                  class="ec-icon-btn"
                  :class="{ 'is-ok': uuidCopied }"
                  :aria-label="uuidCopied ? '已复制用户 UID' : '复制用户 UID'"
                  :disabled="!uuidRaw"
                  @click="copyUuid"
                >
                  <AppIcon :name="uuidCopied ? 'check-circle' : 'clipboard'" />
                  <span class="ec-sr">{{ uuidCopied ? '已复制' : '复制' }}</span>
                </button>
              </div>
            </dd>
            <dd v-else class="profile-field-value u-field-value">{{ row.value }}</dd>
          </div>
        </dl>

        <p class="page-note profile-note">{{ TRADE.profileReadonlyNote }}</p>
      </section>

      <!-- 右：可编辑资料 -->
      <section class="page-panel" aria-label="修改资料">
        <h2 class="page-panel-head">{{ TRADE.profileEdit }}</h2>

        <p v-if="!userStore.isLoggedIn" class="page-note page-note--warning">
          {{ TRADE.profileGuestNote }}
        </p>

        <form class="profile-form" @submit.prevent="handleSubmit">
          <div class="u-field">
            <label class="u-field-label" for="profile-nickname">{{ TRADE.profileNickname }}</label>
            <input
              id="profile-nickname"
              v-model="form.nickname"
              class="u-input"
              type="text"
              maxlength="32"
              :placeholder="TRADE.profileNicknamePlaceholder"
              :disabled="!userStore.isLoggedIn"
              required
            />
            <span class="u-field-hint">{{ form.nickname.length }} / 32</span>
          </div>

          <div class="u-field">
            <span class="u-field-label">{{ TRADE.profileAvatar }}</span>

            <!--
              头像上传：选图 → 前端 canvas 缩到 256px → 编码成 data URL → POST /userApi/avatar
              选完即上传（不额外要求点一次「保存」）：头像与其它资料不同，
              它本身就是一次独立的写操作，多一步确认只会让人以为没生效。

              版式是左右两栏：**左**「头像 + 说明文字」/ **右**「上传按钮」。
              说明跟头像放在一起（而不是堆在按钮下方），按钮因此可以收成一个纯图标 ——
              一行只有两个视觉落点，说明也贴着它描述的那个东西。
            -->
            <div class="avatar-editor">
              <div class="avatar-profile">
                <span class="u-avatar avatar-preview">
                  <SmartImage
                    v-if="avatarShown"
                    :src="avatarShown"
                    :alt="nickname || '用户头像'"
                    fallback-icon="user"
                    loading="eager"
                  />
                  <AppIcon v-else name="user" />
                </span>

                <div class="avatar-desc">
                  <p class="u-field-hint avatar-hint">{{ TRADE.profileAvatarHint }}</p>
                  <p v-if="pickedInfo" class="u-field-hint avatar-hint">{{ pickedInfo }}</p>
                </div>
              </div>

              <!-- 原生 file input 藏起来、用 label 触发：原生控件在明暗两套下无法主题化。
                   label 里刻意放一段 .visually-hidden 文本 —— 图标本身 aria-hidden，
                   不给文字的话这个 input 就没有可访问名（label 的文本才算 input 的名字，
                   label 上的 aria-label 不算）。 -->
              <input
                id="profile-avatar-file"
                ref="fileInputRef"
                class="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                :disabled="!userStore.isLoggedIn || uploading || preparing"
                @change="handleFileChange"
              />
              <label
                for="profile-avatar-file"
                class="u-icon-btn avatar-upload"
                :class="{ 'avatar-upload--disabled': !userStore.isLoggedIn || uploading || preparing }"
                :title="uploadLabel"
              >
                <span v-if="preparing || uploading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
                <!-- 线性图标：颜色走 currentColor，因此悬停变色与明暗两套主题都生效
                     （这正是原先用 ↑ 文本字形的原因，现在由 AppIcon 正式承担） -->
                <AppIcon v-else class="avatar-upload-icon" name="arrow-up" />
                <span class="visually-hidden">{{ uploadLabel }}</span>
              </label>
            </div>
          </div>

          <div class="u-field">
            <label class="u-field-label" for="profile-avatar-url">{{ TRADE.profileAvatarUrl }}</label>
            <input
              id="profile-avatar-url"
              v-model="form.avatar_url"
              class="u-input"
              type="text"
              maxlength="500"
              :placeholder="TRADE.profileAvatarPlaceholder"
              :disabled="!userStore.isLoggedIn"
            />
            <span class="u-field-hint">{{ TRADE.profileAvatarUrlHint }}</span>
          </div>

          <div class="profile-grid">
            <div class="u-field">
              <label class="u-field-label" for="profile-gender">{{ TRADE.profileGender }}</label>
              <!--
                原生 <select> 的弹出层由操作系统绘制，明暗两套主题一套都管不到；
                这里换成消费 ui-kit-form.css §1 的 SelectField，与上面几处
                （卡密的工具/状态筛选、资料表单的性别选择）保持同一套外观。
                id 交给组件后会落在触发器的 <button> 上，而 <button> 是 labelable
                元素，所以 <label for> 的关联照旧成立。
              -->
              <SelectField
                id="profile-gender"
                v-model="form.gender"
                :options="genderOptions"
                :disabled="!userStore.isLoggedIn"
                :aria-label="TRADE.profileGender"
              />
            </div>

            <div class="u-field">
              <label class="u-field-label" for="profile-birthday">{{ TRADE.profileBirthday }}</label>
              <!--
                原生 `<input type="date">` 的弹出日历由操作系统绘制，明暗两套主题都管不到；
                这里换成消费 ui-kit-data.css §11 的 DatePickerField。
                值仍是 `YYYY-MM-DD` 或空串，与原生控件的 value 同构，
                因此 toDateInput()、isDirty 与 `patch.birthday = … || null` 都不必改。
                `:max="today"` 禁掉未来日期（生日不该在未来）。
                `view-date` 只在**没有选中值**时决定首次落点：生日往往是几十年前，
                否则打开会落在今天所在月，而 max 又把之后的日子全禁掉 ——
                42 格里只剩个位数可点，要退回 1990 年得点几百次。
                id 落在组件的触发器 <button> 上，而 <button> 是 labelable 元素，
                所以上面 <label for> 的关联成立（点标签也能打开面板）。
              -->
              <DatePickerField
                id="profile-birthday"
                v-model="form.birthday"
                :aria-label="TRADE.profileBirthday"
                :max="today"
                view-date="1990-01-01"
                :disabled="!userStore.isLoggedIn"
              />
            </div>
          </div>

          <p v-if="errorMessage" class="u-field-error" role="alert">{{ errorMessage }}</p>

          <div class="page-actions profile-actions">
            <button
              type="submit"
              class="u-btn-primary"
              :disabled="!userStore.isLoggedIn || saving || !isDirty"
              :aria-busy="saving"
            >
              <span v-if="saving" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
              <span>{{ saving ? '保存中…' : TRADE.profileSave }}</span>
            </button>
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="saving || !isDirty"
              @click="resetForm"
            >
              {{ TRADE.profileReset }}
            </button>
          </div>
        </form>
      </section>
    </div>
    <!--
      操作日志（可导出）：数据来源是服务端合并后的「本人全部重要操作」——`sstc.user_events`
      （登录/注册等没有主表可查的动作）与各业务主表（工具使用、下单、兑换卡密、收藏、加购、
      积分与成长值变动、签到、领券、开通会员），由 `GET /userLogsApi/` 读取。
      刻意**只放导出、不放页面内列表**：日志是「需要留证时才翻」的东西，常驻一张几百行的表
      只会把资料表单推下去。
      时间窗三档（一个月 / 半年 / 一年）与导出的 CSV 列由服务端决定，
      前端只负责把 blob 接成下载 —— 口径放在服务端，换接口时不会两边各写一套。
    -->
    <section v-if="userStore.isLoggedIn" class="ui-card profile-logs" aria-label="操作日志">
      <div class="profile-logs-head">
        <div class="profile-logs-text">
          <p class="profile-logs-title">操作日志</p>
          <p class="profile-logs-desc">
            你的账号与商城操作记录（登录、下单、兑换卡密、收藏、加购、签到、积分与成长值变动等）。
            可导出为 CSV，最多近一年、5000 条。
          </p>
        </div>
        <button
          type="button"
          class="u-btn-primary"
          :disabled="downloadingLogs"
          :aria-busy="downloadingLogs"
          @click="handleDownloadLogs"
        >
          <span v-if="downloadingLogs" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
          <span>{{ downloadingLogs ? '导出中…' : '下载日志' }}</span>
        </button>
      </div>

      <!-- 时间范围只影响「导出多少」，不影响页面上的任何数据，因此按 tablist 表达 -->
      <div class="u-tabs u-tabs--pill profile-logs-tabs" role="tablist" aria-label="导出时间范围">
        <button
          v-for="item in LOG_RANGES"
          :key="item.value"
          type="button"
          role="tab"
          class="u-tab"
          :class="{ 'u-tab--active': logRange === item.value }"
          :aria-selected="logRange === item.value"
          @click="logRange = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <p class="page-note profile-logs-note">
        日志记录「你做了什么、对象是什么、成功与否」，不包含你在输入框里填写的内容，卡密卡号在服务端就已脱敏；游客身份没有账号历史。
      </p>
    </section>
  </div>
</template>

<script>
/**
 * 用户 UID（即 users.uuid）的展示规则。
 *
 * 放在普通 `<script>` 而不是 `<script setup>` 里，是为了让脱敏与倒计时逻辑
 * 成为**可单独 import 的具名导出**：测试不必挂载组件、更不必真等 30 秒。
 *
 * 设计系统 CardCodeBox 的规则是「前三段可见、末段恒掩码」。个人中心的 UUID
 * 不是卡密，因此这里保留原始大小写；只对第 13 位之后的字母数字打码。
 * 短标识（如测试账号 `uuid-42`）会原样显示，不会因长度不足被整段涂掉。
 */
export const UUID_REVEAL_MS = 30000
export const UUID_COPY_FEEDBACK_MS = 1500
export const UUID_MASK_CHAR = '•'

/** 取出用于分组/打码的字母数字，保留大小写 */
function uuidAlnum(value) {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '')
}

/** 默认展示值：前三组（12 位）可见，其余每 4 位一组用 • 遮住 */
export function maskUuid(value) {
  const text = uuidAlnum(value)
  if (!text) return '—'

  const groups = []
  for (let index = 0; index < text.length; index += 4) {
    const segment = text.slice(index, index + 4)
    groups.push(index < 12 ? segment : UUID_MASK_CHAR.repeat(segment.length))
  }
  return groups.join('-')
}

/** 明文展示值：每 4 位分组，但不遮任何字符 */
export function plainUuid(value) {
  const text = uuidAlnum(value)
  if (!text) return '—'
  return text.match(/.{1,4}/g).join('-')
}

/** 当前应展示的值：未点眼睛时掩码，点眼睛后明文 */
export function formatUuid(value, revealed) {
  return revealed ? plainUuid(value) : maskUuid(value)
}

/**
 * 「显示 30 秒 → 自动回掩码」的控制器。
 *
 * 计时器可注入（timers.setTimeout / timers.clearTimeout），测试用假时钟
 * 直接推进；组件卸载时调用 dispose()，未触发的回掩码计时器会被清掉。
 */
export function createUuidRevealController({ onChange, timers } = {}) {
  const schedule = timers?.setTimeout || setTimeout
  const cancel = timers?.clearTimeout || clearTimeout
  let timer = null
  let revealed = false

  const notify = () => {
    if (typeof onChange === 'function') onChange(revealed)
  }

  const clearTimer = () => {
    if (timer === null) return
    cancel(timer)
    timer = null
  }

  const hide = () => {
    clearTimer()
    if (!revealed) return
    revealed = false
    notify()
  }

  const show = () => {
    clearTimer()
    if (!revealed) {
      revealed = true
      notify()
    }
    timer = schedule(hide, UUID_REVEAL_MS)
  }

  const toggle = () => {
    if (revealed) hide()
    else show()
  }

  return {
    show,
    hide,
    toggle,
    dispose: clearTimer,
    isRevealed: () => revealed,
  }
}
</script>

<script setup>
/**
 * 个人中心
 *
 * 左侧账号信息**只读**（含 uuid 与账号类型），右侧是四个可改字段。
 *
 * 为什么只有四个字段可改：用户名 / 邮箱 / 手机号既是登录凭据又带唯一约束，
 * 改它们需要验证码或旧密码确认；`status` / `user_type` 属于权限字段，
 * 一旦能从请求体写入就等于提权。服务端也只认这四个键（其余被白名单丢弃），
 * 前端在这里就把可选范围限死，用户不会以为「改邮箱」按钮坏了。
 *
 * 性别取值必须与数据库约束一致（male / female / unknown）——
 * 服务端会再校验一次，但界面上给出合法选项才不会让用户白填一遍。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useMemberStore } from '@/stores/member'
import { usePointsStore } from '@/stores/points'
import AppIcon from '@/components/AppIcon.vue'
import SmartImage from '@/components/SmartImage.vue'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { resolveAssetUrl } from '@/utils/assetUrl.js'
import { PAGES, TRADE } from '@/constants/index.js'
import { formatPointsValue } from '@/constants/member.js'
// 生日用自绘日期选择器：原生 type="date" 的日历由系统绘制，主题化不了
import DatePickerField from '@/components/DatePickerField.vue'
// 性别用自绘下拉：原生 <select> 的弹出层同理，明暗两套主题都管不到
import SelectField from '@/components/SelectField.vue'
// 操作日志导出：时间窗与 CSV 列都由服务端决定，这里只挑范围、接 blob
import { LOG_RANGES, downloadMyLogs } from '@/api/ask/userLogs'
import { copyText } from '@/utils/clipboard.js'
import { createClickGuard } from '@/utils/rateLimit.js'

const userStore = useUserStore()
const memberStore = useMemberStore()
const pointsStore = usePointsStore()
const { userInfo, nickname } = storeToRefs(userStore)

/**
 * 会员摘要条什么时候出现。
 *
 * 三个条件缺一不可：已登录，且「数据在手上 / 正在拿 / 拿失败要报错」三者之一。
 * 少最后一条会在「登录了但接口还没回」的那一瞬间渲染出一条空卡片。
 */
const memberSummaryVisible = computed(
  () => Boolean(memberStore.overview) || memberStore.loadingOverview || Boolean(memberStore.error)
)

/**
 * 今日是否还能签到。
 *
 * 判据直接用会员摘要里的 `checkin_available`（后端内置 `=== true` 的布尔），
 * 为的是**不再多发一次日历请求** —— 这一栏只是个入口，点进去才有完整日历。
 */
const checkinAvailable = computed(() => memberStore.overview?.checkin_available === true)

/**
 * 签到按钮的进行中状态。
 *
 * store 里也有 `checkingIn` 互斥，但那个要等 action 真正跑起来才置位，
 * 本地 ref 让按钮在「按下→请求发出」这一帧就已经是「签到中…」，
 * 顺带把 `disabled` 交给它，双击不会打进第二次。
 */
const checkinPending = ref(false)

/** 连点闸门：重复请求只会拿到服务端的「已签到」分支，白跑一趟 */
const checkinGuard = createClickGuard(1000)

/**
 * 在个人中心就地签到。
 *
 * 与 `/user/checkin` 页共用同一个 store action，文案保持一致。
 * 签完必须刷新会员摘要：`checkin_available` 由它带来，
 * 只有它变 false，按钮才会换成「查看签到日历」——
 * 这是用户能看到的「已经生效」的唯一证据。
 */
async function handleProfileCheckin() {
  if (checkinPending.value || !checkinGuard()) return
  checkinPending.value = true
  try {
    const result = await pointsStore.doCheckin()
    if (!result) return
    if (result.already) {
      notify.info('今天已经签过到了')
    } else {
      notify.success(`签到成功，获得 ${result.awarded} 积分（连签 ${result.streak} 天）`)
    }
    // force: 签到是写操作，8 秒短缓存里还是签到前的快照（checkin_available 仍为 true），
    // 不穿透的话按钮会一直停在「立即签到」—— 这正是用户实测到的「签完没换成查看签到日历」。
    await memberStore.fetchOverview({ silent: true, force: true })
  } catch (error) {
    notify.error(error?.response?.data?.message || '签到失败，请稍后重试')
  } finally {
    checkinPending.value = false
  }
}

const saving = ref(false)
const errorMessage = ref('')

/** 头像上传：选图 → 缩放 → 提交 */
const fileInputRef = ref(null)
const uploading = ref(false)
const { preview: avatarPreview, previewSize, sourceName, preparing, prepare, reset: resetAvatar } =
  useAvatarUpload()

const form = ref({
  nickname: '',
  avatar_url: '',
  gender: '',
  birthday: '',
})

/** 提交前的基线，用来判断「有没有改过」 */
const baseline = ref({ ...form.value })

/**
 * 本地「今天」。
 *
 * 不能用 `new Date().toISOString().slice(0, 10)`：那取的是 **UTC** 日期，
 * 在 UTC+8 的 00:00–08:00 之间会比本地日期**早一天**，于是 `max` 卡在昨天，
 * 用户在凌晨选不了今天的日期。
 */
const today = (() => {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})()

/**
 * 性别选项。
 *
 * 空串是「未设置」，与 `form.gender` 的初值、`fillForm()` 里的 `data.gender || ''`
 * 以及提交时的 `patch.gender = form.value.gender || null` 同构 —— 后端把
 * 「不提交」与「提交为空」区别对待，这里不要改成 null。
 */
const genderOptions = [
  { value: '', label: TRADE.profileGenderUnset },
  { value: 'male', label: TRADE.profileGenderMale },
  { value: 'female', label: TRADE.profileGenderFemale },
  { value: 'unknown', label: TRADE.profileGenderUnknown },
]

/** 后端返回的 birthday 可能是 Date 序列化后的 ISO 串，统一截成 YYYY-MM-DD */
const toDateInput = (value) => {
  if (!value) return ''
  const text = String(value)
  return text.length >= 10 ? text.slice(0, 10) : text
}

const fillForm = () => {
  const data = userInfo.value || {}
  form.value = {
    nickname: data.nickname || '',
    avatar_url: data.avatar_url || '',
    gender: data.gender || '',
    birthday: toDateInput(data.birthday),
  }
  baseline.value = { ...form.value }
  // 已保存的资料成为新基线，本地预览（未提交的选图）随之作废
  resetAvatar()
  errorMessage.value = ''
}

const isDirty = computed(
  () =>
    form.value.nickname !== baseline.value.nickname ||
    form.value.avatar_url !== baseline.value.avatar_url ||
    form.value.gender !== baseline.value.gender ||
    form.value.birthday !== baseline.value.birthday
)

/**
 * 头像显示什么。
 *
 * 优先级：刚选中的预览 > 表单里的地址 > 已保存的头像。
 * 三个来源都要经 `resolveAssetUrl` —— 表单里可能是 `/uploads/...` 相对路径
 * （上传成功后服务端回写的就是它），直接塞进 `<img src>` 在生产环境会 404。
 */
const avatarShown = computed(() => {
  if (avatarPreview.value) return avatarPreview.value

  const raw = form.value.avatar_url.trim()
  if (!raw) return ''
  // 外部地址与站内相对路径都放行；唯独不放行 javascript: / data:text 这类
  if (!/^(https?:\/\/|\/uploads\/)/i.test(raw)) return ''
  return resolveAssetUrl(raw)
})

/** 选中文件的提示：文件名 + 缩放后的体积，让用户知道「传上去的是多大」 */
const pickedInfo = computed(() => {
  if (!avatarPreview.value) return ''
  const size = previewSize.value ? `，压缩后 ${previewSize.value}` : ''
  return `${sourceName.value || '已选择图片'}${size}`
})

/**
 * 上传按钮的可访问名。
 *
 * 按钮已经收成纯图标，可见文字没有了 —— 因此这个名字**必须**保留：
 * 它既是 input 的可访问名（读屏会念），也是鼠标悬停时的 `title`。
 * 顺便把进行中的状态也带进去，读屏用户能知道当前在做什么。
 */
const uploadLabel = computed(() => {
  if (preparing.value) return TRADE.profileAvatarProcessing
  if (uploading.value) return TRADE.profileAvatarUploading
  return TRADE.profileAvatarUpload
})

const readonlyRows = computed(() => {
  const data = userInfo.value || {}
  const fields = TRADE.profileFields
  return [
    // 字段名「用户 UID」由 TRADE.profileFields.uuid 统一提供（值仍是 users.uuid，
    // 展示 / 复制逻辑都不变），这里不再就地覆盖，避免同一文案有两个来源。
    { key: 'uuid', label: fields.uuid, value: data.uuid || '—' },
    { key: 'username', label: fields.username, value: data.username || '未设置' },
    { key: 'email', label: fields.email, value: data.email || '未绑定' },
    { key: 'phone', label: fields.phone, value: data.phone || '未绑定' },
    {
      key: 'userType',
      label: fields.userType,
      value: data.user_type === 'registered' ? '注册用户' : '游客',
    },
    { key: 'status', label: fields.status, value: data.status || '—' },
    { key: 'createdAt', label: fields.createdAt, value: toDate(data.created_at) || '—' },
    { key: 'lastLoginAt', label: fields.lastLoginAt, value: toDate(data.last_login_at) || '—' },
  ]
})

/* ── 用户 UID（UUID）的显示 / 复制 ──────────────────────────────
 * 默认掩码；点眼睛显示明文并启动 30 秒倒计时；再次点眼睛立即回掩码。
 * 复制用的是原始值（不是掩码值），反馈只持续 1.5 秒。
 */
const uuidRaw = computed(() => String(userInfo.value?.uuid || ''))
const uuidRevealed = ref(false)
const uuidCopied = ref(false)

const uuidController = createUuidRevealController({
  onChange: (value) => {
    uuidRevealed.value = value
  },
  // 显式传入全局计时器，便于测试替换假时钟
  timers: { setTimeout, clearTimeout },
})

const uuidDisplay = computed(() => formatUuid(uuidRaw.value, uuidRevealed.value))

const toggleUuid = () => {
  if (!uuidRaw.value) return
  uuidController.toggle()
}

let uuidCopyTimer = null

const copyUuid = async () => {
  if (!uuidRaw.value) return

  const result = await copyText(uuidRaw.value)
  if (!result.ok) {
    notify.error(result.message || '复制失败，请手动选择文本复制')
    return
  }

  uuidCopied.value = true
  if (uuidCopyTimer) clearTimeout(uuidCopyTimer)
  uuidCopyTimer = setTimeout(() => {
    uuidCopied.value = false
    uuidCopyTimer = null
  }, UUID_COPY_FEEDBACK_MS)
}

onBeforeUnmount(() => {
  // 两个定时器都必须在卸载时清理：回掩码计时器与复制反馈计时器
  uuidController.dispose()
  if (uuidCopyTimer) clearTimeout(uuidCopyTimer)
  uuidCopyTimer = null
})

const resetForm = () => {
  form.value = { ...baseline.value }
  resetAvatar()
  errorMessage.value = ''
  // 让同一个文件能被再次选择（input 的值不变时不会触发 change）
  if (fileInputRef.value) fileInputRef.value.value = ''
}

/**
 * 选中图片后立刻上传。
 *
 * 不额外要求点一次「保存」：头像是独立的写操作，多一步确认只会让人以为没生效。
 * 上传成功时服务端会把新的 `avatar_url` 写进用户资料，这里同步进表单的基线，
 * 避免刚上传完就显示「有未保存的修改」。
 */
const handleFileChange = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) return

  const prepared = await prepare(file)
  if (!prepared.ok) {
    notify.error(prepared.message)
    if (fileInputRef.value) fileInputRef.value.value = ''
    return
  }

  uploading.value = true
  try {
    const result = await userStore.uploadAvatar(prepared.dataUrl)
    if (!result.success) {
      notify.error(result.message)
      return
    }

    notify.success(result.message)
    // 服务端回写的相对路径成为新的基线，表单不再处于「已修改」状态
    form.value = { ...form.value, avatar_url: result.avatarUrl || form.value.avatar_url }
    baseline.value = { ...form.value }
    resetAvatar()
  } finally {
    uploading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const handleSubmit = async () => {
  if (saving.value) return
  errorMessage.value = ''

  const nicknameValue = form.value.nickname.trim()
  if (!nicknameValue) {
    errorMessage.value = '昵称不能为空'
    return
  }

  saving.value = true
  try {
    // 只提交**真正改过**的字段：服务端把「未提交」与「提交为空」区分对待，
    // 全量提交会把没动过的头像/生日一并清空。
    const patch = {}
    if (form.value.nickname !== baseline.value.nickname) patch.nickname = nicknameValue
    if (form.value.avatar_url !== baseline.value.avatar_url) {
      patch.avatar_url = form.value.avatar_url.trim() || null
    }
    if (form.value.gender !== baseline.value.gender) patch.gender = form.value.gender || null
    if (form.value.birthday !== baseline.value.birthday) patch.birthday = form.value.birthday || null

    const result = await userStore.updateProfile(patch)
    if (result.success) {
      fillForm()
      notify.success(TRADE.profileSaved)
    } else {
      errorMessage.value = result.message
    }
  } finally {
    saving.value = false
  }
}

/**
 * 操作日志导出。
 *
 * 三件事决定了这里的写法：
 *   1. 响应是 blob 而不是 JSON —— axios 的响应拦截器对 blob 会原样返回，
 *      因此不能按 `result.success` 判断，失败情况由 reject 表达。
 *   2. 文件名带日期，与「导出这一刻」对应；范围写进文件名，
 *      用户同一天下两个范围也不会互相覆盖。
 *   3. `revokeObjectURL` 延后一拍：部分浏览器在 click 之后立刻 revoke，
 *      下载会拿到空文件。
 */
const logRange = ref('30d')
const downloadingLogs = ref(false)

const handleDownloadLogs = async () => {
  if (downloadingLogs.value) return
  downloadingLogs.value = true
  try {
    const blob = await downloadMyLogs({ range: logRange.value })
    if (!(blob instanceof Blob)) {
      throw new Error('导出失败，请稍后重试')
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tool-usage-${logRange.value}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    notify.success('日志已开始下载')
  } catch (error) {
    notify.error(error?.message || '导出失败，请稍后重试')
  } finally {
    downloadingLogs.value = false
  }
}

/**
 * 用 `watch(..., { immediate: true })` 而不是 `onMounted` 预填表单。
 *
 * `onMounted` 在首屏渲染**之后**才跑，用户会先看到一瞬空输入框再被填上；
 * 深链进入时（userInfo 还要等接口）这个空窗更长。immediate watch 让表单
 * 始终是「当前 userInfo 的投影」，账号切换与首次加载走的是同一条路径。
 */
watch(
  () => userInfo.value?.uuid,
  () => {
    fillForm()
    // 账号切换后不能继续显示上一个账号的明文
    uuidController.hide()
  },
  { immediate: true }
)

onMounted(() => {
  // 深链进入时用户信息可能还没拉回来，补一次
  if (!userInfo.value?.uuid) userStore.getUserInfo()
})
</script>

<style scoped>
/*
 * 个人中心：左只读信息 / 右可编辑表单。
 * 外壳来自 .page-shell 系列，字段来自 .u-field 系列，这里只写两栏比例与信息表。
 */

/* ── 会员权益摘要：两栏面板之上的一条横向概览 ───────────────── */
/* 两个类名合写提高优先级：global.css 的 .ui-card 是纵向 flex 卡片，
   这里要的是横向摘要条，靠 .ui-card.profile-member 明确覆盖它的方向 */
.ui-card.profile-member {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 2.5);
  /* .ui-card 自己没有外边距，.profile-page 也不是 flex 容器，
     因此这三块（摘要条 / 签到入口 / 两栏面板）之间的竖向间距必须显式给，
     否则它们会紧贴在一起。取与会员中心页面卡片相同的节奏（24px）。 */
  margin-bottom: calc(var(--space-unit) * 3);
}

.profile-member-head {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  flex: 1 1 auto;
  min-width: 0;
}

.profile-member-title {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.profile-member-note {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.profile-member-stats {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 3);
  margin: 0;
}

.profile-member-stat {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
}

.profile-member-term {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-member-value {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
  color: var(--text-primary);
}

.profile-member-sub {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-member-actions {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
}

/* 到期提醒横跨整行：它属于「需要你注意」的信息，不该挤在数字那一行 */
.profile-member-remind {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  flex-basis: 100%;
  margin: 0;
  padding-top: calc(var(--space-unit) * 1.5);
  border-top: var(--stroke-width) solid var(--divider);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.profile-member-error {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.profile-member-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit));
  width: 100%;
}

.profile-member-skeleton-line {
  display: block;
  height: calc(var(--space-unit) * 2);
  border-radius: var(--radius-media);
}

.profile-member-skeleton-line--short {
  width: 40%;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: var(--section-gap);
}

/*
 * 全局 `.page-panel + .page-panel` 给相邻面板加了 margin-top，那是为「同一条竖向流」
 * 准备的间距。这里两栏是 grid 的并列项，右栏（修改资料）会被这条规则整体压低
 * —— 表现为「修改资料标题比账号信息低一截、顶部像被顶下去了」。
 * 版式间距交给 grid 的 gap，兄弟选择器在这层失效。
 */
.profile-layout > .page-panel + .page-panel {
  margin-top: 0;
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 2.5);
}

.profile-avatar {
  font-size: var(--fs-h3);
}

.profile-identity-text {
  min-width: 0;
}

.profile-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  color: var(--text-primary);
}

.profile-since {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-fields {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.25);
  margin: 0;
}

.profile-row {
  display: grid;
  grid-template-columns: calc(var(--space-unit) * 11) minmax(0, 1fr);
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

.profile-row dt {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.profile-row dd {
  margin: 0;
}

/* ── 只读字段值：.profile-fields 下所有 <dd> 的唯一节奏来源 ────────────────
 * 字号 / 行高 / 颜色 / 内边距 / 断词规则只写在这里一次：普通字段的只读底板
 * （.u-field-value）与用户 UID 的 CardCodeBox（.ec-code）都从这套节奏取值，
 * 所以两条行的高度、左基线、上下留白天然对齐。新增字段行请勿另写 padding。 */
.profile-field-value {
  min-width: 0;
  padding-block: 0;
  padding-inline: var(--ec-input-px);
  min-height: var(--ec-control-h-md);
  font-size: var(--ec-body-size);
  line-height: var(--ec-body-lh);
  color: var(--ec-text-primary);
  overflow-wrap: anywhere;
}

/* 普通只读字段的底板：整份样式里 .u-field-value 只在这里出现一次。
 * 字号 / 行高 / 颜色 / padding / 断词由上面的 .profile-field-value 提供，
 * 这里只补「只读框」自身的外观，令牌与设计系统的 .u-field-value 完全一致。 */
.profile-fields .u-field-value {
  display: flex;
  align-items: center;
  font-family: var(--ec-font-mono);
  background: var(--ec-bg-muted);
  border: 1px solid var(--ec-border-subtle);
  border-radius: var(--ec-radius-lg);
}

.profile-field-value--code {
  /* 设计系统的 .ec-code 自带 --ec-code-glow 阴影，而这一列其它 .u-field-value 行
   * 都是平的；卡密卡片的「浮起」在这里会让整列多出一层纵深，所以抹平它。
   * scoped 样式会编译成 .profile-field-value--code[data-v-xxx]（0,2,0），
   * 单类 .ec-code 只有 0,1,0 —— 特异性天然更高，不需要 !important。 */
  box-shadow: none;
}

/* 用户 UID：<dd> 本体就是 CardCodeBox（三段是直接子元素）。
 * 1) 卡片自带的块级 padding 让位给上面统一的 min-height，与其它行等高；
 * 2) 值区可收缩 → 放不下时走省略号，__act 永远留在卡片可视区内；
 * 3) 图标按钮降到 sm 档，避免 36px 的按钮把 36px 高的卡片上下边撑满。 */
.profile-field-value--code .ec-code__value {
  min-width: 0;
}

.profile-field-value--code .ec-icon-btn {
  width: var(--ec-control-h-sm);
  height: var(--ec-control-h-sm);
}

.profile-note {
  margin-top: calc(var(--space-unit) * 2.5);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2.5);
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: calc(var(--space-unit) * 2);
}

/* ── 头像编辑器 ─────────────────────────────────────────────
 * 左右两栏：左「头像 + 说明文字」（自己占满剩余宽度），右「上传图标按钮」。
 * 头像用固定方块而不是 --avatar-size（那是顶栏 32px 档，做编辑器太小）。 */
.avatar-editor {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
}

/* 左栏整体：头像与说明并排，说明可换行、可被压缩 */
.avatar-profile {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  min-width: 0;
}

.avatar-preview {
  flex-shrink: 0;
  width: calc(var(--space-unit) * 9);
  height: calc(var(--space-unit) * 9);
  font-size: var(--fs-h2);
}

.avatar-desc {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}

.avatar-hint {
  max-width: 42ch;
}

/* 右栏：图标按钮。`label` 触发隐藏的 file input —— 外观复用 .u-icon-btn，
 * 但 label 不是 button，`:disabled` 那条全局规则选不中它，
 * 因此禁用态要自己按 class 补（指针 + 取消悬停位移）。 */
.avatar-upload {
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
}

.avatar-upload-icon {
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  line-height: 1;
}

.avatar-upload--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.avatar-upload--disabled:hover {
  transform: none;
  background: var(--bg-elevated);
  border-color: var(--stroke-color);
  color: var(--text-secondary);
}

.profile-actions {
  margin-top: calc(var(--space-unit));
}

/* ── 每日签到入口（个人中心功能，`/user/checkin`） ───────────── */
/* 同 .profile-member：合写类名压过 .ui-card 的纵向方向（否则「文案左、按钮右」
   会变成垂直居中堆叠），并补上与上一张卡之间的外边距。 */
.ui-card.profile-checkin {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 3);
}
.profile-checkin-text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  min-width: 0;
}
.profile-checkin-title {
  margin: 0;
  font-weight: var(--fw-heading);
}
.profile-checkin-desc {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 「立即签到」比「查看签到日历」更重，但要和右侧那块 36px 的按钮位对齐，
   所以只约束不换行与最小宽度，不写死高度（主按钮自带 --btn-height）。 */
.profile-checkin-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

/* ── 邀请有礼入口（1.6.0，`/invite`） ─────────────────────────
   与签到卡同一版式：合写类名压过 .ui-card 的纵向方向。 */
.ui-card.profile-invite {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 3);
}
.profile-invite-text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  min-width: 0;
}
.profile-invite-title {
  margin: 0;
  font-weight: var(--fw-heading);
}
.profile-invite-desc {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* ── 操作日志导出（1.7.0，`GET /userLogsApi/`） ─────────────────
   刻意不做成表格：日志是「需要留证时才翻」的东西，常驻列表会把资料表单推下去。
   版面 = 标题 + 一句话说明 + 右侧下载按钮，下面一行时间范围 tab。 */
.ui-card.profile-logs {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  /* 与上方「会员卡」的 margin-bottom 同一个 24px 节奏：两张卡片贴在一起会像同一块内容 */
  margin-top: calc(var(--space-unit) * 3);
}
.profile-logs-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
}
.profile-logs-text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}
.profile-logs-title {
  margin: 0;
  font-weight: var(--fw-heading);
}
.profile-logs-desc,
.profile-logs-note {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
/* 胶囊 tab 自带上下内边距，这里压到 40px 行高 —— 与工具页模式页签一致，
   默认高度放在这张卡里显得比「下载日志」按钮重。 */
.profile-logs-tabs {
  margin: 0;
}
.profile-logs-tabs .u-tab {
  height: 32px;
  padding: 0 calc(var(--space-unit) * 1.75);
  font-size: var(--fs-label);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 991px) {
  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* 移动端：字段行跟着设计系统的全局缩放收一档。
 * .profile-field-value 的选择器比 .u-field-value 更具体，必须在这里显式同步，
 * 否则普通字段行与小屏基线会出现两种 min-height / padding。 */
@media (max-width: 767px) {
  .profile-field-value {
    min-height: calc(var(--ec-control-h-md) * var(--mobile-control-scale));
    padding-inline: calc(var(--ec-input-px) * var(--mobile-padding-scale));
  }

  /* 窄屏兜底：标识行必须留在栏宽以内 —— 卡片宽度上限钉在 100%，
   * 值区沿用基线的 min-width: 0（可收缩 → 省略号），再叠一层任意断词，
   * 这样任何长度的标识都不会把 __act 或整张卡片挤出可视区。 */
  .profile-field-value--code {
    max-width: 100%;
  }

  .profile-field-value--code .ec-code__value {
    overflow-wrap: anywhere;
  }
}

@media (max-width: 575px) {
  .profile-row {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--space-unit) * 0.5);
  }

  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 窄屏**保持左右结构**（这正是这次改动要的版式）：只把头像与间距收一档，
   * 说明文字自己换行，按钮继续钉在右侧。 */
  .avatar-editor,
  .avatar-profile {
    gap: calc(var(--space-unit) * 1.25);
  }

  .avatar-preview {
    width: calc(var(--space-unit) * 7);
    height: calc(var(--space-unit) * 7);
    font-size: var(--fs-h3);
  }

  /* 说明文字在小屏让它自己换行即可，不必压到按钮底下 */
  .avatar-hint {
    max-width: none;
  }

  /* 签到入口窄屏改竖排：按钮占满一行，避免说明被压成单字一列。
     选择器必须与上面那条同优先级（.ui-card 也在里面），否则压不过它。 */
  .ui-card.profile-checkin {
    flex-direction: column;
    align-items: stretch;
  }

  /* 邀请入口同理（两条选择器必须同优先级） */
  .ui-card.profile-invite {
    flex-direction: column;
    align-items: stretch;
  }

  /* 操作日志：窄屏把「说明 + 按钮」压成竖排，避免按钮被文字挤成一小块 */
  .profile-logs-head {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-logs-head .u-btn-primary {
    align-self: flex-start;
  }
}
</style>
