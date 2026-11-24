<template>
  <div class="page-shell profile-page">
    <header class="page-shell-head page-shell-head--row">
      <div>
        <p class="page-shell-eyebrow">{{ PAGES.profile.eyebrow }}</p>
        <h1 class="page-shell-title">{{ PAGES.profile.title }}</h1>
        <p class="page-shell-desc">{{ PAGES.profile.description }}</p>
      </div>
      <!--
        账号级徽标：登录后写「V7」或「注册 N 天」，游客写「游客」。
        不再输出「已登录」—— 这句话在只有登录后才能看到的页面上等于没说。
      -->
      <span class="u-tag" :class="userStore.isLoggedIn ? 'u-tag--accent' : 'u-tag--muted'">
        {{ accountBadge }}
      </span>
    </header>

    <!--
      账号被禁用 / 注销时，后台状态不能只以英文枚举藏在只读表格里。
      置顶一条警示条，并给出「能做什么」：联系客服。
    -->
    <AppAlert
      v-if="accountAlert"
      class="profile-alert"
      :variant="accountAlert.variant"
      :title="accountAlert.title"
    >
      {{ accountAlert.body }}
      <router-link class="profile-alert-link" to="/support">{{ PAGES.profile.contactSupport }}</router-link>
    </AppAlert>

    <!--
      身份条：头像 + 昵称 + 注册时间（+ 会员等级）+「编辑资料」锚点。
      这是「我是谁」的唯一出处，从原来的左栏里提出来，也让首屏第一眼有落点。
    -->
    <section class="ui-card profile-hero" :aria-label="PAGES.profile.identityAria">
      <div class="profile-hero-identity">
        <span class="u-avatar profile-hero-avatar">
          <SmartImage
            v-if="userStore.avatarUrl"
            :src="userStore.avatarUrl"
            :alt="nickname || PAGES.profile.accountAvatar"
            fallback-icon="user"
            loading="eager"
          />
          <AppIcon v-else name="user" />
        </span>
        <div class="profile-hero-text">
          <p class="profile-hero-name">{{ heroName }}</p>
          <p v-if="heroMeta" class="profile-hero-meta">{{ heroMeta }}</p>
        </div>
      </div>
      <div class="profile-hero-actions">
        <!--
          签到是每天一次的高频动作，直接放在身份条上（少一跳）；
          「编辑资料」是低频动作，降为次按钮，点开弹层再改，不在页面上常驻一块表单。
          两个动作纵向排列：窄屏时各自铺满一行，不并排挤压。
        -->
        <template v-if="userStore.isLoggedIn">
          <button
            v-if="checkinAvailable"
            type="button"
            class="u-btn-primary profile-hero-checkin"
            :disabled="checkinPending"
            @click="handleProfileCheckin"
          >
            {{ checkinPending ? PAGES.profile.checkinPending : PAGES.profile.checkinNow }}
          </button>
          <router-link v-else class="u-btn-secondary" to="/user/checkin">
            {{ PAGES.profile.checkinCalendar }}
          </router-link>
          <button type="button" class="u-btn-secondary" @click="openEditor">
            {{ PAGES.profile.editCta }}
          </button>
        </template>
        <!-- 游客点进个人中心唯一的目的就是登录，不要让他自己找入口 -->
        <button v-else type="button" class="u-btn-primary" @click="goLogin">
          {{ PAGES.profile.goLogin }}
        </button>
      </div>
    </section>

    <!--
      我的服务：订单 / 卡密 / 收藏 / 优惠券。
      这四项此前只能从顶栏下拉进，个人中心「我有什么」反而没有入口 —— 补回来。
    -->
    <nav v-if="userStore.isLoggedIn" class="profile-services" :aria-label="PAGES.profile.servicesAria">
      <router-link v-for="item in serviceEntries" :key="item.to" :to="item.to" class="ui-card profile-service">
        <span class="profile-service-icon"><AppIcon :name="item.icon" aria-hidden="true" /></span>
        <span class="profile-service-text">
          <span class="profile-service-name">{{ item.name }}</span>
          <span class="profile-service-desc">{{ item.desc }}</span>
        </span>
        <AppIcon class="profile-service-arrow" name="chevron-right" aria-hidden="true" />
      </router-link>
    </nav>

    <!--
      资料编辑：不在页面上常驻表单（那会让「看资料」和「改资料」两套结构重复），
      而是由身份条上的「编辑资料」按钮打开一个弹层。
    -->
    <div v-if="editorOpen" class="ec-overlay" @click.self="requestCloseEditor">
      <section
        id="profile-editor"
        ref="editorRef"
        class="ec-dialog profile-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        :aria-label="PAGES.profile.editAria"
      >
        <header class="profile-editor-head">
          <h2 id="profile-editor-title" class="profile-editor-title">{{ TRADE.profileEdit }}</h2>
          <button
            type="button"
            class="ec-icon-btn"
            :aria-label="PAGES.profile.closeEditor"
            @click="requestCloseEditor"
          >
            <AppIcon name="x" />
          </button>
        </header>

        <form class="profile-form" novalidate @submit.prevent="handleSubmit">
          <div class="profile-field-grid">
          <div class="u-field">
            <label class="u-field-label" for="profile-nickname">{{ TRADE.profileNickname }}</label>
            <input
              id="profile-nickname"
              ref="nicknameInputRef"
              v-model="form.nickname"
              class="u-input"
              type="text"
              maxlength="32"
              :placeholder="TRADE.profileNicknamePlaceholder"
              :disabled="!userStore.isLoggedIn"
              :aria-invalid="nicknameError ? 'true' : 'false'"
              :aria-describedby="nicknameError ? 'profile-nickname-hint profile-nickname-error' : 'profile-nickname-hint'"
              required
              @blur="validateNickname"
              @input="nicknameError = ''"
            />
            <span id="profile-nickname-hint" class="u-field-hint">{{ form.nickname.length }} / 32</span>
            <p v-if="nicknameError" id="profile-nickname-error" class="u-field-error" role="alert">
              {{ nicknameError }}
            </p>
          </div>

          <div class="u-field">
            <label class="u-field-label" for="profile-gender">{{ TRADE.profileGender }}</label>
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
                    :alt="nickname || PAGES.profile.accountAvatar"
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

          <!--
            头像 URL 对普通用户是内部实现外泄（占位符原来提示 /uploads 路径），
            上传已覆盖绝大多数场景。折叠进「高级」，默认不打扰。
            头像已是上传结果（站内路径）时，输入框不再把 /userApi/avatar/... 当值显示，
            只写一句「当前头像由上传设置」，输入位留给「改用外链」。
          -->
          <details class="profile-advanced">
            <summary class="profile-advanced-summary">
              {{ avatarFromUpload ? PAGES.profile.avatarExternalLabel : TRADE.profileAvatarUrl }}
            </summary>
            <div class="u-field profile-advanced-field">
              <label class="u-field-label" for="profile-avatar-url">
                {{ avatarFromUpload ? PAGES.profile.avatarExternalLabel : TRADE.profileAvatarUrl }}
              </label>
              <p v-if="avatarFromUpload" class="page-note profile-advanced-note">
                {{ PAGES.profile.avatarFromUploadNote }}
              </p>
              <input
                id="profile-avatar-url"
                v-model="avatarUrlInput"
                class="u-input"
                type="text"
                maxlength="500"
                :placeholder="TRADE.profileAvatarPlaceholder"
                :disabled="!userStore.isLoggedIn"
              />
              <span class="u-field-hint">{{ TRADE.profileAvatarUrlHint }}</span>
            </div>
          </details>

          <!-- 服务端校验（重名 / 敏感词）原样带回，不统一成「保存失败」 -->
          <p v-if="errorMessage" ref="formErrorRef" class="u-field-error" role="alert" tabindex="-1">
            {{ errorMessage }}
          </p>

          <div class="page-actions profile-actions">
            <button
              type="submit"
              class="u-btn-primary"
              :disabled="!userStore.isLoggedIn || saving || !isDirty"
              :aria-busy="saving"
            >
              <span v-if="saving" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
              <span>{{ saving ? PAGES.profile.saving : TRADE.profileSave }}</span>
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
      账号信息：只读，放在资料编辑之后。
      桌面两列、UID 横跨整行；手机上值不再装进盒子，只按 label + 文本排列。
    -->
    <section class="page-panel profile-account" :aria-label="PAGES.profile.accountAria">
      <h2 class="page-panel-head">{{ TRADE.profileBasic }}</h2>

      <dl class="profile-fields">
        <div
          v-for="row in readonlyRows"
          :key="row.key"
          class="profile-row"
          :class="{ 'profile-row--wide': row.key === 'uuid' }"
        >
          <dt>{{ row.label }}</dt>

          <!--
            用户 UID：dd 元素本身就是设计系统的 CardCodeBox —— label / value / act
            三段都是它的直接子元素，外面不再套只读字段底板，也不再多包一层 div；
            行高、左基线、上下留白由 .profile-field-value 统一提供给所有字段行。
            默认只显示前三段，点眼睛后显示明文，30 秒自动回到掩码；复制按钮在 __act 里。
          -->
          <dd
            v-if="row.key === 'uuid'"
            class="profile-field-value profile-field-value--code ec-code ec-code--sm"
          >
            <span class="ec-code__label">{{ uuidRevealed ? PAGES.profile.uidPlain : PAGES.profile.uidMasked }}</span>
            <span class="ec-code__value" :class="{ 'is-masked': !uuidRevealed }">
              {{ uuidDisplay }}
            </span>
            <div class="ec-code__act">
              <button
                type="button"
                class="ec-icon-btn"
                :aria-pressed="uuidRevealed ? 'true' : 'false'"
                :aria-label="uuidRevealed ? PAGES.profile.uidHide : PAGES.profile.uidShow"
                :disabled="!uuidRaw"
                @click="toggleUuid"
              >
                <AppIcon :name="uuidRevealed ? 'eye-off' : 'eye'" />
              </button>
              <button
                type="button"
                class="ec-icon-btn"
                :class="{ 'is-ok': uuidCopied }"
                :aria-label="uuidCopied ? PAGES.profile.uidCopiedAria : PAGES.profile.uidCopy"
                :disabled="!uuidRaw"
                @click="copyUuid"
              >
                <AppIcon :name="uuidCopied ? 'check-circle' : 'clipboard'" />
                <span class="ec-sr">{{ uuidCopied ? PAGES.profile.uidCopied : PAGES.profile.uidCopyShort }}</span>
              </button>
            </div>
          </dd>
          <dd v-else class="profile-field-value u-field-value">{{ row.value }}</dd>
        </div>
      </dl>

      <p class="page-note profile-note">{{ TRADE.profileReadonlyNote }}</p>

      <!-- 「不能自助改」必须给出路：账号与安全（2FA）/ 联系客服 -->
      <div class="profile-security">
        <router-link class="u-btn-secondary" to="/other/2fa">{{ PAGES.profile.securityEntry }}</router-link>
        <router-link class="u-btn-secondary" to="/support">{{ PAGES.profile.contactSupport }}</router-link>
      </div>
    </section>

    <!--
      会员权益摘要：放在资料双栏之后。
      它回答的是「我还有什么」，不该抢在「改资料 / 我的服务」之前占满首屏。
    -->
    <section
      v-if="userStore.isLoggedIn && memberSummaryVisible"
      class="ui-card profile-member"
      :aria-label="PAGES.profile.memberAria"
    >
      <div v-if="memberStore.loadingOverview && !memberStore.overview" class="profile-member-skeleton">
        <span class="u-skeleton profile-member-skeleton-line"></span>
        <span class="u-skeleton profile-member-skeleton-line profile-member-skeleton-line--short"></span>
      </div>

      <p v-else-if="memberStore.error" class="profile-member-error" role="alert">
        {{ memberStore.error }}
        <button type="button" class="u-btn-secondary" @click="memberStore.fetchOverview()">{{ PAGES.profile.retry }}</button>
      </p>

      <template v-else-if="memberStore.overview">
        <div class="profile-member-head">
          <p class="profile-member-title">
            <AppIcon name="star" aria-hidden="true" />
            {{ memberStore.isMember ? memberStore.levelName : PAGES.profile.notMember }}
          </p>
          <p class="profile-member-note">
            {{
              memberStore.isMember && memberStore.overview.days_left
                ? translate('pages.profile.memberDaysLeft', PAGES.profile.memberDaysLeft, {
                    days: memberStore.overview.days_left,
                  })
                : PAGES.profile.memberUpgradeNote
            }}
          </p>
        </div>

        <dl class="profile-member-stats">
          <div class="profile-member-stat">
            <dt class="profile-member-term">{{ PAGES.profile.growth }}</dt>
            <dd class="profile-member-value">
              <router-link class="profile-member-link" to="/member/growth">
                {{ formatNumber(memberStore.overview.growth ?? 0) }}
              </router-link>
              <!--
                成长值不写「x / 当前等级门槛」：那是已经越过的线，会被读成「还差」。
                有下一等级才写「距 V8 还差 13,515」；满级写「已达最高等级」；
                非会员不编造进度。
              -->
              <span v-if="growthNext" class="profile-member-sub">
                {{
                  translate('pages.profile.growthToNext', PAGES.profile.growthToNext, {
                    level: growthNext.name,
                    points: formatNumber(growthNext.toNext),
                  })
                }}
              </span>
              <span v-else-if="memberStore.isMember" class="profile-member-sub">{{ PAGES.profile.maxLevelNote }}</span>
            </dd>
          </div>
          <!-- 非会员的 points / coupons 键不存在，不是 0 —— 不渲染，也不写 0 -->
          <div v-if="memberStore.overview.points != null" class="profile-member-stat">
            <dt class="profile-member-term">{{ PAGES.profile.points }}</dt>
            <dd class="profile-member-value">
              <router-link class="profile-member-link" to="/points">{{ formatNumber(memberStore.points) }}</router-link>
              <span v-if="memberStore.overview.points_value" class="profile-member-sub">
                ≈ ¥{{ formatPointsValue(memberStore.points) }}
              </span>
            </dd>
          </div>
          <div v-if="memberStore.overview.coupons != null" class="profile-member-stat">
            <dt class="profile-member-term">{{ PAGES.profile.coupons }}</dt>
            <dd class="profile-member-value">
              <!--
                会员且 0 张时不要再把 0 和空态提示同时写出来：
                「优惠券 0」「暂无可用券 · 去领券」并排是自相矛盾的两句话，只保留后者。
              -->
              <router-link class="profile-member-link" to="/coupons">
                {{
                  memberStore.isMember && memberStore.overview.coupons === 0
                    ? PAGES.profile.couponsEmpty
                    : memberStore.overview.coupons
                }}
              </router-link>
            </dd>
          </div>
        </dl>

        <div class="profile-member-actions">
          <router-link class="u-btn-secondary" to="/member">{{ PAGES.profile.memberCenter }}</router-link>
          <router-link class="u-btn-secondary" to="/member/plans">{{ PAGES.profile.planCompare }}</router-link>
        </div>

        <p v-if="memberStore.overview.points_expiring" class="profile-member-remind">
          <AppIcon name="clock" aria-hidden="true" />
          {{ translate('pages.profile.pointsExpiring', PAGES.profile.pointsExpiring, {
            points: memberStore.overview.points_expiring.points,
            date: toDate(memberStore.overview.points_expiring.expire_at),
          }) }}
        </p>

        <!-- 邀请是积分来源之一，和会员/积分同属「我还有什么」，收进同一张卡的最后一行，
             不再单独占一张全宽卡。发奖时机是好友完成首单，不是注册时。 -->
        <p class="profile-member-invite">
          <AppIcon name="gift" aria-hidden="true" />
          <span class="profile-member-invite-text">
            {{ PAGES.profile.inviteTitle }} · {{ PAGES.profile.inviteDesc }}
          </span>
          <router-link class="profile-member-invite-link" to="/invite">
            {{ PAGES.profile.inviteCta }}
          </router-link>
        </p>
      </template>
    </section>

    <!--
      操作日志（可导出）：数据来源是服务端合并后的「本人全部重要操作」——`sstc.user_events`
      （登录/注册等没有主表可查的动作）与各业务主表（工具使用、下单、兑换卡密、收藏、加购、
      积分与成长值变动、签到、领券、开通会员），由 `GET /userLogsApi/` 读取。
      刻意**只放导出、不放页面内列表**：日志是「需要留证时才翻」的东西，常驻一张几百行的表
      只会把资料表单推下去。
      时间窗三档（一个月 / 半年 / 一年）与导出的 CSV 列由服务端决定，
      前端只负责把 blob 接成下载 —— 口径放在服务端，换接口时不会两边各写一套。
    -->
    <section v-if="userStore.isLoggedIn" class="ui-card profile-logs" :aria-label="PAGES.profile.logsAria">
      <div class="profile-logs-head">
        <div class="profile-logs-text">
          <p class="profile-logs-title">{{ PAGES.profile.logsTitle }}</p>
          <p class="profile-logs-desc">{{ PAGES.profile.logsDesc }}</p>
        </div>
        <button
          type="button"
          class="u-btn-primary"
          :disabled="downloadingLogs"
          :aria-busy="downloadingLogs"
          @click="handleDownloadLogs"
        >
          <span v-if="downloadingLogs" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
          <span>{{ downloadingLogs ? PAGES.profile.logsExporting : PAGES.profile.logsDownload }}</span>
        </button>
      </div>

      <!-- 时间范围只影响「导出多少」，不影响页面上的任何数据，因此按 tablist 表达 -->
      <div class="u-tabs u-tabs--pill profile-logs-tabs" role="tablist" :aria-label="PAGES.profile.logsRangeAria">
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
          {{ logRangeLabel(item) }}
        </button>
      </div>

      <p class="page-note profile-logs-note">{{ PAGES.profile.logsFootnote }}</p>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useMemberStore } from '@/stores/member'
import { usePointsStore } from '@/stores/points'
import AppAlert from '@/components/AppAlert.vue'
import AppIcon from '@/components/AppIcon.vue'
import SmartImage from '@/components/SmartImage.vue'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { resolveAssetUrl } from '@/utils/assetUrl.js'
import { PAGES, TRADE } from '@/constants/index.js'
import { formatNumber, translate } from '@/i18n/index.js'
import { formatPointsValue } from '@/constants/member.js'
// 生日用自绘日期选择器：原生 type="date" 的日历由系统绘制，主题化不了
import DatePickerField from '@/components/DatePickerField.vue'
// 性别用自绘下拉：原生 <select> 的弹出层同理，明暗两套主题都管不到
import SelectField from '@/components/SelectField.vue'
// 操作日志导出：时间窗与 CSV 列都由服务端决定，这里只挑范围、接 blob
import { LOG_RANGES, downloadMyLogs } from '@/api/ask/userLogs'
import { copyText } from '@/utils/clipboard.js'
import { createClickGuard } from '@/utils/rateLimit.js'
// 编辑资料改成弹层后，Escape / 焦点陷阱 / 滚动锁定必须走项目唯一的模态实现
import { useModalA11y } from '@/hooks/useModalA11y'

const userStore = useUserStore()
const memberStore = useMemberStore()
const pointsStore = usePointsStore()
const route = useRoute()
const router = useRouter()
const { userInfo, nickname } = storeToRefs(userStore)

/** 距某个时间点过去了几天（本地时区）；非法日期返回 null */
const daysSince = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  return days >= 0 ? days : null
}

/**
 * 账号徽标 / 身份条里的「注册 N 天」「V7」。
 *
 * 只在数据够用时显示：注册天数来自 created_at，会员等级来自会员摘要。
 * 两者都没有时才退回「已登录」—— 那是兜底，不再是常态文案。
 */
const registeredDays = computed(() => daysSince(userInfo.value?.created_at))

const accountBadge = computed(() => {
  if (!userStore.isLoggedIn) return PAGES.profile.statusGuest
  if (memberStore.isMember && memberStore.levelName) return memberStore.levelName
  if (registeredDays.value != null) {
    return translate('pages.profile.statusRegisteredDays', PAGES.profile.statusRegisteredDays, {
      days: registeredDays.value,
    })
  }
  return PAGES.profile.statusLoggedIn
})

const heroName = computed(() => {
  if (!userStore.isLoggedIn) return PAGES.profile.guestHeroName
  return nickname.value || PAGES.profile.accountNoNickname
})

const heroMeta = computed(() => {
  // 身份条只说「注册于哪天」：等级/注册天数已经由右上角徽标表达，重复一遍是噪音。
  if (!userStore.isLoggedIn) return ''
  const joined = toDate(userInfo.value?.created_at)
  return joined ? translate('pages.profile.accountSince', PAGES.profile.accountSince, { date: joined }) : ''
})

/**
 * banned / deleted 才置顶警示；active 属于内部状态，对用户没有信息量。
 *
 * 正常不可达（防御性代码）：服务端登录只放行 status='active'
 * （server/src/router/user.js:360），被封禁/注销的账号根本进不来这一页。
 * 保留这段是为了响应体被其他入口（如 token 续期、后台代登录）带回来时不至于静默。
 */
const accountAlert = computed(() => {
  const status = String(userInfo.value?.status || '').toLowerCase()
  if (status === 'banned') {
    return {
      variant: 'danger',
      title: PAGES.profile.accountBannedTitle,
      body: PAGES.profile.accountBannedBody,
    }
  }
  if (status === 'deleted') {
    return {
      variant: 'danger',
      title: PAGES.profile.accountDeletedTitle,
      body: PAGES.profile.accountDeletedBody,
    }
  }
  return null
})

/**
 * 下一等级与差值。
 *
 * 后端在满级时会删掉 next_level / next_level_name / next_level_threshold /
 * growth_to_next 四个键，因此「满级」的判据是键不存在，不是数值大小。
 * 用当前等级的 growth_threshold 当分母会得到「36485 / 20000」这种假进度。
 */
const growthNext = computed(() => {
  const overview = memberStore.overview
  if (!overview || overview.next_level == null || overview.growth_to_next == null) return null
  return { name: overview.next_level_name || '', toNext: overview.growth_to_next }
})

/** 我的服务四入口 —— 个人中心回答「我有什么」的第一屏 */
const serviceEntries = computed(() => [
  { to: '/user/orders', icon: 'package', name: PAGES.profile.serviceOrders, desc: PAGES.profile.serviceOrdersDesc },
  { to: '/user/kami', icon: 'key', name: PAGES.profile.serviceKami, desc: PAGES.profile.serviceKamiDesc },
  { to: '/user/favorites', icon: 'heart', name: PAGES.profile.serviceFavorites, desc: PAGES.profile.serviceFavoritesDesc },
  { to: '/coupons', icon: 'ticket', name: PAGES.profile.serviceCoupons, desc: PAGES.profile.serviceCouponsDesc },
])

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

const logRangeLabel = (item) =>
  ({
    '30d': PAGES.profile.logRange30,
    '180d': PAGES.profile.logRange180,
    '365d': PAGES.profile.logRange365,
  })[item.value] || item.label

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
      notify.info(PAGES.profile.checkinAlready)
    } else {
      notify.success(
        translate('pages.profile.checkinSuccess', PAGES.profile.checkinSuccess, {
          awarded: result.awarded,
          streak: result.streak,
        })
      )
    }
    // force: 签到是写操作，8 秒短缓存里还是签到前的快照（checkin_available 仍为 true），
    // 不穿透的话按钮会一直停在「立即签到」—— 这正是用户实测到的「签完没换成查看签到日历」。
    await memberStore.fetchOverview({ silent: true, force: true })
  } catch (error) {
    notify.error(error?.response?.data?.message || PAGES.profile.checkinFailed)
  } finally {
    checkinPending.value = false
  }
}

const saving = ref(false)
const errorMessage = ref('')
const nicknameError = ref('')
const nicknameInputRef = ref(null)
const formErrorRef = ref(null)

/**
 * 昵称校验（失焦时也跑一次）。
 *
 * 规则与后端白名单一致：去掉首尾空格后 2–32 个字符，且不能全是空格。
 * 只做 trim 非空是不够的 —— 单个字符、纯空格都该在字段下方就地报错，
 * 而不是等提交后把错误统一丢到表单底部。
 */
function validateNickname() {
  const raw = form.value.nickname || ''
  const value = raw.trim()
  if (!value) {
    nicknameError.value = raw.length > 0 ? PAGES.profile.nicknameWhitespace : PAGES.profile.nicknameRequired
    return false
  }
  if (value.length < 2) {
    nicknameError.value = PAGES.profile.nicknameTooShort
    return false
  }
  nicknameError.value = ''
  return true
}

/**
 * 游客去登录。
 *
 * 项目没有独立 `/login` 路由，登录是全局弹窗；因此先把回跳目标写进当前路由，
 * 登录成功后 App.vue 会读 `?redirect=` 再 replace 回来。
 */
function goLogin() {
  if (route.path !== '/user/profile' || route.query.redirect !== '/user/profile') {
    router.replace({ path: '/user/profile', query: { ...route.query, redirect: '/user/profile' } })
  }
  userStore.openLoginModal()
}

/** 关页面 / 刷新时的未保存拦截（只拦弹层打开且确有修改的情况） */
const handleBeforeUnload = (event) => {
  if (!editorOpen.value || !isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

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
  nicknameError.value = ''
}

const isDirty = computed(
  () =>
    // 昵称按 trim 后比较：只多打了首尾空格不算改动（后端也会 trim）
    form.value.nickname.trim() !== baseline.value.nickname.trim() ||
    form.value.avatar_url !== baseline.value.avatar_url ||
    form.value.gender !== baseline.value.gender ||
    form.value.birthday !== baseline.value.birthday
)

/**
 * 编辑弹层的开关。
 *
 * 页面常驻的是「看资料」，改资料由身份条上的按钮打开弹层 ——
 * 这样资料区不必同时承担两套结构，首屏也不会被一张永远展开的表单占住。
 */
const editorOpen = ref(false)

const {
  modalRef: editorRef,
  activate: activateEditor,
  deactivate: deactivateEditor,
} = useModalA11y({
  close: () => requestCloseEditor(),
  auto: false,
  initialFocus: '#profile-nickname',
})

function openEditor() {
  if (!userStore.isLoggedIn) return
  // 每次打开都从当前 userInfo 重新铺一遍，避免上次取消后残留半截修改
  fillForm()
  editorOpen.value = true
  activateEditor()
}

function closeEditor() {
  editorOpen.value = false
  resetForm()
  deactivateEditor()
}

/** 取消 / 遮罩 / Escape：有未保存修改时先确认，保存中不允许关 */
function requestCloseEditor() {
  if (saving.value) return
  if (isDirty.value && !window.confirm(PAGES.profile.unsavedConfirm)) return
  closeEditor()
}

/**
 * 路由内离开确认。
 *
 * 表单现在只在弹层里；弹层关着时页面没有可丢的修改，因此只在弹层打开时拦截。
 * `beforeunload` 只管关标签页，管不到 SPA 内部跳转，两条都要挂。
 */
onBeforeRouteLeave(() => {
  if (!editorOpen.value || !isDirty.value) return true
  return window.confirm(PAGES.profile.unsavedConfirm)
})

/**
 * 头像显示什么。
 *
 * 优先级：刚选中的预览 > 表单里的地址 > 已保存的头像。
 * 三个来源都要经 `resolveAssetUrl` —— 表单里可能是 `/uploads/...` 相对路径
 * （本地开发上传成功后服务端回写的就是它），或 `/userApi/avatar/<id>?v=...`
 * （4.0.5 起线上把头像字节存数据库，由该接口现取现发），
 * 直接塞进 `<img src>` 在生产环境会 404 或 401。
 */
const avatarShown = computed(() => {
  if (avatarPreview.value) return avatarPreview.value

  const raw = form.value.avatar_url.trim()
  if (!raw) return ''
  // 外部地址、站内磁盘路径、站内头像接口都放行；唯独不放行 javascript: / data:text 这类
  if (!/^(https?:\/\/|\/uploads\/|\/userApi\/avatar\/)/i.test(raw)) return ''
  return resolveAssetUrl(raw)
})

/**
 * 头像是不是「上传设置的」（站内路径）。
 *
 * 站内路径（/userApi/avatar/<id>?v=...）是服务端回写的实现细节，不该当作用户可编辑的值
 * 摆在输入框里 —— 用户会以为要自己填一个 URL，还顺带看到内部接口。
 * 这种情况下输入位会被清空只留「改用外链」的入口，保存时也不会把内部路径再写回去。
 */
const avatarFromUpload = computed(() => form.value.avatar_url.trim().startsWith('/'))

/**
 * 「高级」里的外链输入框。
 *
 * 站点内部路径不显示成值；用户只在这个框里填真正的外链。
 * 清空输入不会把已上传的头像弄丢（保存时 `avatar_url` 跳过 `/` 开头的值）。
 */
const avatarUrlInput = computed({
  get: () => (avatarFromUpload.value ? '' : form.value.avatar_url),
  set: (value) => {
    form.value.avatar_url = value
  },
})

/** 选中文件的提示：文件名 + 缩放后的体积，让用户知道「传上去的是多大」 */
const pickedInfo = computed(() => {
  if (!avatarPreview.value) return ''
  const size = previewSize.value
    ? translate('pages.profile.pickedCompressed', PAGES.profile.pickedCompressed, {
        size: previewSize.value,
      })
    : ''
  return `${sourceName.value || PAGES.profile.selectedImage}${size}`
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

/**
 * 最后登录：绝对时间 + 相对天数。
 * 「2026-11-20 · 2 天前」能自查「是不是我登的」；只给一个日期还要自己算。
 */
const lastLoginText = computed(() => {
  const raw = userInfo.value?.last_login_at
  const date = toDate(raw)
  if (!date) return '—'
  const days = daysSince(raw)
  if (days === 0) return `${date} · ${PAGES.profile.lastLoginToday}`
  if (days != null && days > 0) {
    return `${date} · ${translate('pages.profile.lastLoginDaysAgo', PAGES.profile.lastLoginDaysAgo, { days })}`
  }
  return date
})

const readonlyRows = computed(() => {
  const data = userInfo.value || {}
  const fields = TRADE.profileFields
  return [
    // 字段名「用户 UID」由 TRADE.profileFields.uuid 统一提供（值仍是 users.uuid，
    // 展示 / 复制逻辑都不变），这里不再就地覆盖，避免同一文案有两个来源。
    { key: 'uuid', label: fields.uuid, value: data.uuid || '—' },
    { key: 'username', label: fields.username, value: data.username || PAGES.profile.unset },
    { key: 'email', label: fields.email, value: data.email || PAGES.profile.unbound },
    { key: 'phone', label: fields.phone, value: data.phone || PAGES.profile.unbound },
    {
      key: 'userType',
      label: fields.userType,
      value: data.user_type === 'registered' ? PAGES.profile.registeredUser : PAGES.profile.guestUser,
    },
    // status（active|banned|deleted）不再以英文枚举出现在只读表里：
    // banned / deleted 改为页面顶部警示条，active 对用户没有信息量。
    { key: 'createdAt', label: fields.createdAt, value: toDate(data.created_at) || '—' },
    { key: 'lastLoginAt', label: fields.lastLoginAt, value: lastLoginText.value },
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
    notify.error(result.message || PAGES.profile.copyFailed)
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
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const resetForm = () => {
  form.value = { ...baseline.value }
  resetAvatar()
  errorMessage.value = ''
  nicknameError.value = ''
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

  // 与失焦校验同一套规则；失败时聚焦字段，而不是把错误丢在表单底部等用户找
  if (!validateNickname()) {
    await nextTick()
    nicknameInputRef.value?.focus()
    return
  }
  const nicknameValue = form.value.nickname.trim()

  saving.value = true
  try {
    // 只提交**真正改过**的字段：服务端把「未提交」与「提交为空」区分对待，
    // 全量提交会把没动过的头像/生日一并清空。
    const patch = {}
    if (nicknameValue !== baseline.value.nickname.trim()) patch.nickname = nicknameValue
    if (form.value.avatar_url !== baseline.value.avatar_url) {
      // 站内路径是上传接口回写的，不接受用户手填；保存时跳过它，
      // 免得把内部路径当成用户输入再写一遍（头像本身已经随上传保存过）。
      const avatarValue = form.value.avatar_url.trim()
      if (!avatarValue.startsWith('/')) patch.avatar_url = avatarValue || null
    }
    if (form.value.gender !== baseline.value.gender) patch.gender = form.value.gender || null
    if (form.value.birthday !== baseline.value.birthday) patch.birthday = form.value.birthday || null

    const result = await userStore.updateProfile(patch)
    if (result.success) {
      fillForm()
      notify.success(TRADE.profileSaved)
      // 保存成功即关闭弹层：页面重新以只读摘要呈现刚保存的值
      editorOpen.value = false
      deactivateEditor()
    } else if (result.field === 'nickname') {
      // 字段级错误（重名 / 敏感词）挂回昵称下方，banner 只说「保存失败」
      nicknameError.value = result.message
      errorMessage.value = PAGES.profile.nicknameSaveFailed
      await nextTick()
      nicknameInputRef.value?.focus()
    } else {
      // 服务端文案（重名 / 敏感词等）原样展示，不统一成「保存失败」
      errorMessage.value = result.message
      await nextTick()
      formErrorRef.value?.focus()
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
      throw new Error(PAGES.profile.exportFailed)
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // 文件名与内容对齐：这份 CSV 是账号与商城操作记录，不是工具使用统计
    link.download = `account-events-${logRange.value}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    notify.success(PAGES.profile.exportStarted)
  } catch (error) {
    notify.error(error?.message || PAGES.profile.exportFailed)
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
  window.addEventListener('beforeunload', handleBeforeUnload)
  // 深链进入时用户信息可能还没拉回来，补一次
  if (!userInfo.value?.uuid) userStore.getUserInfo()
})
</script>

<style scoped>
/*
 * 个人中心：整页单栏 —— 身份条（含签到与编辑）→ 我的服务 → 资料编辑 → 账号信息 → 会员 → 邀请 → 日志。
 * 外壳来自 .page-shell 系列，字段来自 .u-field 系列，这里只写本页特有的块。
 */

/* ── 会员权益摘要：单栏页面里的一条横向概览 ───────────────────── */
/* 两个类名合写提高优先级：global.css 的 .ui-card 是纵向 flex 卡片，
   这里要的是「标题在左、按钮在右、数字独占下一行」的网格，
   否则窄屏时三个数字和两个按钮会挤在同一行、文字互相贴住。 */
.ui-card.profile-member {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  column-gap: calc(var(--space-unit) * 4);
  row-gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 3);
}

.profile-member-head {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
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
  grid-column: 1 / -1;
  grid-row: 2;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 2) calc(var(--space-unit) * 4);
  margin: 0;
}

.profile-member-stat {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  min-width: 0;
}

.profile-member-term {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/*
 * 数字与说明必须同一行、之间留 6px：原来的 dd 是等宽字体，中文副文案继承后
 * 字距被拉散，且没有间距，「36,485距 V8 还差 3,510」会粘成一个词。
 * 数字保留等宽（对齐、易读），说明回到正文字体（中文才有正常字距）。
 */
.profile-member-value {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--fs-body);
  color: var(--text-primary);
  min-width: 0;
}

.profile-member-sub {
  font-family: var(--font-body);
  font-size: var(--fs-label);
  line-height: 1.5;
  color: var(--text-muted);
  white-space: nowrap;
}

/* 三个数字都可点：积分 / 优惠券 / 成长值各有落点页面 */
.profile-member-link {
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: inherit;
  text-decoration: none;
}

.profile-member-link:hover {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.profile-member-actions {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: calc(var(--space-unit) * 1.5);
  /* 不允许被数字挤压：按钮要么完整显示，要么整组换行 */
  flex: 0 0 auto;
}

/* 到期提醒横跨整行：它属于「需要你注意」的信息，不该挤在数字那一行 */
.profile-member-remind {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
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

/* ── 账号状态警示条（仅 banned / deleted 出现） ───────────────── */
.profile-alert {
  margin-bottom: calc(var(--space-unit) * 3);
}

.profile-alert-link {
  margin-left: calc(var(--space-unit) * 0.5);
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── 身份条：头像 + 昵称 / 注册信息 + 签到 / 编辑 ─────────────── */
.ui-card.profile-hero {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 3);
}

.profile-hero-identity {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  min-width: 0;
}

/*
 * 签到是这一页唯一的「今天要做的事」，放在最上、用主按钮；
 * 编辑资料是低频动作，降为次按钮并排在它下面。
 */
.profile-hero-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-unit);
  margin-left: auto;
  flex: 0 0 auto;
}

.profile-hero-actions .u-btn-primary,
.profile-hero-actions .u-btn-secondary {
  justify-content: center;
  white-space: nowrap;
}

.profile-hero-avatar {
  flex-shrink: 0;
  width: calc(var(--space-unit) * 7);
  height: calc(var(--space-unit) * 7);
  font-size: var(--fs-h2);
}

.profile-hero-text {
  min-width: 0;
}

.profile-hero-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  color: var(--text-primary);
}

.profile-hero-meta {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* ── 我的服务：订单 / 卡密 / 收藏 / 优惠券 ───────────────────── */
.profile-services {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 3);
}

.ui-card.profile-service {
  flex-direction: row;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 1.75) calc(var(--space-unit) * 2);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--transition-interactive), transform var(--transition-interactive);
}

.ui-card.profile-service:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.profile-service-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: calc(var(--space-unit) * 4);
  height: calc(var(--space-unit) * 4);
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  color: var(--accent);
  font-size: var(--fs-body);
}

.profile-service-text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  min-width: 0;
}

.profile-service-name {
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.profile-service-desc {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-service-arrow {
  margin-left: auto;
  flex-shrink: 0;
  color: var(--text-muted);
}

/* ── 编辑资料弹层：只放可改的四个字段 ───────────────────────────
 * 页面本身只展示资料，编辑不常驻；弹层宽度收在 640，避免输入框横跨整页。 */
.profile-editor {
  width: min(640px, 100%);
  max-height: min(86vh, 820px);
  overflow-y: auto;
  padding: calc(var(--space-unit) * 3);
}

.profile-editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 2.5);
}

.profile-editor-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.profile-editor .profile-form {
  gap: calc(var(--space-unit) * 2);
}

/* 账号信息在资料编辑下方，作为「我有哪些不可改的东西」的补充 */
.profile-account {
  margin-bottom: calc(var(--space-unit) * 3);
}

/*
 * 桌面/平板：两个短字段同排、UID 跨整行。
 * 只读值不再每行一个盒子堆成 600px 高的墙 —— 两列后这块高度减半。
 */
.profile-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: calc(var(--space-unit) * 3);
  row-gap: calc(var(--space-unit) * 1.25);
  margin: 0;
}

.profile-row {
  display: grid;
  grid-template-columns: calc(var(--space-unit) * 9) minmax(0, 1fr);
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

.profile-row--wide {
  grid-column: 1 / -1;
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

/* 「账号与安全 / 联系客服」：不能自助改的字段必须给出路 */
.profile-security {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
  margin-top: calc(var(--space-unit) * 1.5);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2.5);
}

/* 昵称失焦校验失败：字段自身给出红边（错误文字在下方，aria-describedby 已关联） */
.profile-form .u-input[aria-invalid='true'] {
  border-color: var(--danger);
}

.profile-form .u-input[aria-invalid='true']:focus {
  box-shadow: 0 0 0 2px var(--danger-bg);
}

/* 昵称 / 性别 / 生日：昵称独占一行，两个短字段并排 ——
 * 弹层只有 640 宽，三列会把生日压成「2003 年 01…」 */
.profile-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(var(--space-unit) * 2);
}

.profile-field-grid > .u-field:first-child {
  grid-column: 1 / -1;
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

/* ── 高级：外部图片地址（默认折叠） ───────────────────────────
 * 上传已覆盖绝大多数场景；URL 输入框对普通用户是内部实现外泄，
 * 因此收进 <details>，摘要文案也不出现 /uploads。 */
.profile-advanced {
  border-top: var(--stroke-width) solid var(--divider);
  padding-top: calc(var(--space-unit) * 2);
}

.profile-advanced-summary {
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.profile-advanced-summary:hover {
  color: var(--text-primary);
}

.profile-advanced-field {
  margin-top: calc(var(--space-unit) * 1.5);
}

/* 头像已是上传结果时的一句说明：不要把 /userApi/avatar/... 当值摆出来 */
.profile-advanced-note {
  margin: 0 0 calc(var(--space-unit));
  font-size: var(--fs-label);
}

.profile-actions {
  margin-top: calc(var(--space-unit));
}

/* 邀请收进会员卡的最后一行：一句说明 + 右侧入口，不再单占一张全宽卡 */
.profile-member-invite {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  padding-top: calc(var(--space-unit) * 1.5);
  border-top: var(--stroke-width) solid var(--divider);
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-member-invite-text {
  min-width: 0;
}

.profile-member-invite-link {
  margin-left: auto;
  font-weight: var(--fw-heading);
  color: var(--accent);
  text-decoration: none;
}

.profile-member-invite-link:hover {
  color: var(--accent-strong);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── 操作日志导出（1.7.0，`GET /userLogsApi/`） ─────────────────
   刻意不做成表格：日志是「需要留证时才翻」的东西，常驻列表会把资料表单推下去。
   版面 = 标题 + 一句话说明 + 右侧下载按钮，下面一行时间范围 tab。 */
.ui-card.profile-logs {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  /* 上方 .profile-ops 已经带 24px 下边距；这里不再叠加，否则两张卡之间会空出一条 */
  margin-top: 0;
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
  /* 平板：服务四宫格降到两列；会员条按钮回到标题下方，数字独占一行 */
  .profile-services {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-member {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-member-actions {
    grid-column: 1;
    grid-row: 2;
    justify-content: flex-start;
  }

  .profile-member-stats {
    grid-row: 3;
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

  /* 平板竖屏：资料字段两列放不下，回落单列；昵称独占一行，性别/生日并排 */
  .profile-fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-field-grid > .u-field:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 575px) {
  /*
   * 手机：账号信息不再一行一个 36px 的盒子（六行约 600px），
   * 改成「标签 + 文本」的紧凑行，靠 dl 的行间距分组。
   */
  .profile-row {
    grid-template-columns: calc(var(--space-unit) * 8) minmax(0, 1fr);
    gap: calc(var(--space-unit) * 1.25);
    align-items: baseline;
  }

  .profile-field-value,
  .profile-fields .u-field-value {
    min-height: 0;
    padding-block: 0;
    padding-inline: 0;
    border: 0;
    border-radius: 0;
    background: none;
    font-family: var(--font-body);
    font-size: var(--fs-sm);
    line-height: 32px;
  }

  /* 小屏 UID 还是需要卡片感：它是这一屏唯一要「复制」的串 */
  .profile-field-value--code {
    padding-inline: var(--ec-input-px);
    border: 1px solid var(--ec-border-subtle);
    border-radius: var(--ec-radius-lg);
    background: var(--ec-bg-muted);
    line-height: normal;
  }

  /* 昵称 / 性别 / 生日在手机上各占一行：两列会把性别、生日压成半宽 */
  .profile-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 手机：服务入口改 2×2，只留图标 + 名称 + 箭头，描述行隐藏 */
  .profile-services {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: calc(var(--space-unit) * 1.5);
  }

  .ui-card.profile-service {
    gap: calc(var(--space-unit));
    padding: calc(var(--space-unit) * 1.5);
  }

  .profile-service-desc {
    display: none;
  }

  .profile-member-stats {
    gap: calc(var(--space-unit) * 2);
  }

  /* 会员条窄屏：两个入口并排、够宽即可点，避免两个全宽按钮各占一行 */
  .profile-member-actions {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: stretch;
  }

  .profile-member-actions > * {
    flex: 1 1 auto;
  }

  /* 窄屏保持头像编辑器左右结构：只把头像与间距收一档，按钮继续钉在右侧 */
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

  /* 签到 / 编辑两个按钮在窄屏占满整行 */
  .profile-hero-actions {
    width: 100%;
    margin-left: 0;
  }

  /* 编辑弹层在手机上贴满可用宽度，纵向自己滚动 */
  .profile-editor {
    width: 100%;
    max-height: 100dvh;
    padding: calc(var(--space-unit) * 2);
  }

  /* 邀请行在窄屏让入口换到下一行左对齐 */
  .profile-member-invite-link {
    margin-left: 0;
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
