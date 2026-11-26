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
      账号摘要：把「我是谁」（头像 + 昵称 + 注册信息）与「我有什么」（会员等级、
      成长值、积分、优惠券、邀请入口）合成一张卡。

      它们此前是两张各自带 padding 的卡，中间隔一档间距 —— 读起来像两个互不相关
      的模块，而用户的心智里这就是「我的账号」。合并后：
      · 身份行承载高频动作（签到 / 编辑），会员与统计向下展开；
      · 一张卡最多三个视觉层次（身份 → 会员 → 统计），比两张卡各自反复用标题更安静；
      · 首屏少一张卡的高度，我的服务与账号信息更早出现。

      状态必须完整：游客（只有身份 + 登录）、加载中（骨架）、加载失败（重试）、
      会员有下一级 / 会员满级 / 非会员（只有成长值）、积分即将到期。
    -->
    <section class="ui-card profile-summary" :aria-label="PAGES.profile.identityAria">
      <div class="profile-summary-head">
        <span class="u-avatar profile-summary-avatar">
          <SmartImage
            v-if="userStore.avatarUrl"
            :src="userStore.avatarUrl"
            :alt="nickname || PAGES.profile.accountAvatar"
            fallback-icon="user"
            loading="eager"
          />
          <AppIcon v-else name="user" />
        </span>
        <div class="profile-summary-identity">
          <p class="profile-summary-name">{{ heroName }}</p>
          <!--
            编辑资料是低频动作，不再和签到并排成第二个按钮：
            跟着「注册于 …」这行说明走，做成文字链，视觉重量降下来，
            身份行只留一个真正的主按钮。
          -->
          <p v-if="heroMeta || userStore.isLoggedIn" class="profile-summary-meta">
            <span v-if="heroMeta">{{ heroMeta }}</span>
            <span v-if="heroMeta && userStore.isLoggedIn" class="profile-summary-dot" aria-hidden="true">·</span>
            <button
              v-if="userStore.isLoggedIn"
              type="button"
              class="profile-summary-edit"
              @click="openEditor"
            >
              {{ PAGES.profile.editCta }}
            </button>
          </p>
        </div>
        <div class="profile-summary-actions">
          <!-- 签到是每天一次的高频动作，也是身份行唯一的主按钮 -->
          <template v-if="userStore.isLoggedIn">
            <button
              v-if="checkinAvailable"
              type="button"
              class="u-btn-primary profile-summary-checkin"
              :disabled="checkinPending"
              @click="handleProfileCheckin"
            >
              <AppIcon name="calendar" aria-hidden="true" />
              {{ checkinPending ? PAGES.profile.checkinPending : PAGES.profile.checkinNow }}
            </button>
            <router-link v-else class="u-btn-secondary" to="/user/checkin">
              <AppIcon name="calendar" aria-hidden="true" />
              {{ PAGES.profile.checkinCalendar }}
            </router-link>
          </template>
          <!-- 游客点进个人中心唯一的目的就是登录，不要让他自己找入口 -->
          <button v-else type="button" class="u-btn-primary" @click="goLogin">
            {{ PAGES.profile.goLogin }}
          </button>
        </div>
      </div>

      <template v-if="userStore.isLoggedIn && memberSummaryVisible">
        <div v-if="memberStore.loadingOverview && !memberStore.overview" class="profile-summary-skeleton">
          <span class="u-skeleton profile-summary-skeleton-line"></span>
          <span class="u-skeleton profile-summary-skeleton-line profile-summary-skeleton-line--short"></span>
        </div>

        <p v-else-if="memberStore.error" class="profile-summary-error" role="alert">
          {{ memberStore.error }}
          <button type="button" class="u-btn-secondary" @click="memberStore.fetchOverview()">
            {{ PAGES.profile.retry }}
          </button>
        </p>

        <template v-else-if="memberStore.overview">
          <div class="profile-summary-plan">
            <div class="profile-summary-plan-text">
              <p class="profile-summary-plan-name">
                <AppIcon name="star" aria-hidden="true" />
                {{ memberStore.isMember ? memberStore.levelName : PAGES.profile.notMember }}
              </p>
              <p class="profile-summary-plan-note">
                {{
                  memberStore.isMember && memberStore.overview.days_left
                    ? translate('pages.profile.memberDaysLeft', PAGES.profile.memberDaysLeft, {
                        days: memberStore.overview.days_left,
                      })
                    : PAGES.profile.memberUpgradeNote
                }}
              </p>
            </div>
            <div class="profile-summary-plan-actions">
              <!-- 会员中心 / 套餐对比是「去看看」型入口，不是主操作；文字链比两个次按钮安静 -->
              <router-link class="profile-summary-link" to="/member">
                {{ PAGES.profile.memberCenter }}
                <AppIcon name="chevron-right" aria-hidden="true" />
              </router-link>
              <router-link class="profile-summary-link" to="/member/plans">
                {{ PAGES.profile.planCompare }}
                <AppIcon name="chevron-right" aria-hidden="true" />
              </router-link>
            </div>
          </div>

          <dl class="profile-summary-stats">
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
                <router-link
                  class="profile-member-link"
                  :class="{
                    'profile-member-link--text':
                      memberStore.isMember && memberStore.overview.coupons === 0,
                  }"
                  to="/coupons"
                >
                  {{
                    memberStore.isMember && memberStore.overview.coupons === 0
                      ? PAGES.profile.couponsEmpty
                      : memberStore.overview.coupons
                  }}
                </router-link>
              </dd>
            </div>
          </dl>

          <p v-if="memberStore.overview.points_expiring" class="profile-summary-remind">
            <AppIcon name="clock" aria-hidden="true" />
            {{ translate('pages.profile.pointsExpiring', PAGES.profile.pointsExpiring, {
              points: memberStore.overview.points_expiring.points,
              date: toDate(memberStore.overview.points_expiring.expire_at),
            }) }}
          </p>

          <!-- 邀请是积分来源之一：图标 / 标题+说明 / 入口收在同一行，不再逐项换行 -->
          <div class="profile-member-invite">
            <span class="profile-member-invite-icon" aria-hidden="true">
              <AppIcon name="gift" />
            </span>
            <span class="profile-member-invite-body">
              <span class="profile-member-invite-title">{{ PAGES.profile.inviteTitle }}</span>
              <span class="profile-member-invite-desc">{{ PAGES.profile.inviteDesc }}</span>
            </span>
            <router-link class="profile-member-invite-link" to="/invite">
              {{ PAGES.profile.inviteCta }}
              <AppIcon name="chevron-right" aria-hidden="true" />
            </router-link>
          </div>
        </template>
      </template>
    </section>

    <!--
      我的服务：订单 / 卡密 / 收藏 / 优惠券。
      这四项此前只能从顶栏下拉进，个人中心「我有什么」反而没有入口 —— 补回来。
    -->
    <nav
      v-if="userStore.isLoggedIn"
      class="ui-card profile-services"
      :aria-label="PAGES.profile.servicesAria"
    >
      <router-link v-for="item in serviceEntries" :key="item.to" :to="item.to" class="profile-service">
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
            <label class="u-field-label" for="profile-email">{{ TRADE.profileFields.email }}</label>
            <input
              id="profile-email"
              v-model="form.email"
              class="u-input"
              type="email"
              inputmode="email"
              autocomplete="email"
              maxlength="254"
              :placeholder="TRADE.profileFields.email"
              :aria-invalid="emailError ? 'true' : 'false'"
              :aria-describedby="emailError ? 'profile-email-hint profile-email-error' : 'profile-email-hint'"
              @blur="validateEmail"
              @input="emailError = ''"
            />
            <span id="profile-email-hint" class="u-field-hint">{{ PAGES.profile.emailHint }}</span>
            <p v-if="emailError" id="profile-email-error" class="u-field-error" role="alert">
              {{ emailError }}
            </p>
          </div>

          <div class="u-field">
            <label class="u-field-label" for="profile-phone">{{ TRADE.profileFields.phone }}</label>
            <!--
              手机号按国际号码展示：前缀（+86）是「地区」而不是用户输入的一部分，
              单独成一个不可编辑的前缀块，输入框只装 11 位号码 —— 校验与接口
              仍然只认纯数字，格式化不进入数据层。
            -->
            <div class="profile-phone-group">
              <PhonePrefixPicker v-model="phoneDial" />
              <input
                id="profile-phone"
                v-model="form.phone"
                class="profile-phone-input"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                maxlength="11"
                :placeholder="PAGES.profile.phonePlaceholder"
                :aria-invalid="phoneError ? 'true' : 'false'"
                :aria-describedby="phoneError ? 'profile-phone-hint profile-phone-error' : 'profile-phone-hint'"
                @blur="validatePhone"
                @input="phoneError = ''"
              />
            </div>
            <span id="profile-phone-hint" class="u-field-hint">{{ PAGES.profile.phoneHint }}</span>
            <p v-if="phoneError" id="profile-phone-error" class="u-field-error" role="alert">
              {{ phoneError }}
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
              teleport
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

      <!--
        游客态：这一块七行全是「未设置 / 未绑定」。只读表格本身没错，
        错在它只说明「你没有」，不说明「登录后会有」。给它一句话的出口，
        用户才知道点上面的「去登录」能换来什么。
      -->
      <p v-if="!userStore.isLoggedIn" class="page-note profile-account-guest">
        {{ PAGES.profile.guestNote }}
      </p>

      <dl
        id="profile-account-list"
        class="profile-fields"
        :class="{ 'is-open': accountMoreOpen }"
      >
        <div
          v-for="row in readonlyRows"
          :key="row.key"
          class="profile-row"
          :class="{
            'profile-row--wide': row.key === 'uuid',
            'profile-row--extra': !ACCOUNT_PRIMARY_KEYS.includes(row.key),
          }"
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

      <!--
        手机端渐进披露：默认只留 UID / 用户名 / 邮箱 / 手机号这四条主信息，
        账号类型、注册时间、最后登录收进「更多账号信息」。桌面端 CSS 始终展开，
        按钮本身也只在 ≤767 出现 —— 空间足够时没必要多点一次。
      -->
      <button
        type="button"
        class="profile-more profile-account-toggle"
        :aria-expanded="accountMoreOpen ? 'true' : 'false'"
        aria-controls="profile-account-list"
        @click="accountMoreOpen = !accountMoreOpen"
      >
        <span>{{ accountMoreOpen ? PAGES.profile.accountCollapse : PAGES.profile.accountExpand }}</span>
        <AppIcon
          name="chevron-down"
          class="profile-more-icon"
          :class="{ 'is-open': accountMoreOpen }"
        />
      </button>

      <!-- 说明文字里直接给出路：改绑与二次验证、联系客服都做成行内文本链接，
           不再占一排按钮 —— 这是说明，不是主操作。 -->
      <p class="page-note profile-note">
        {{ TRADE.profileReadonlyNote }}
        <span class="profile-note-links">
          {{ PAGES.profile.securityHelp }}
          <router-link to="/other/2fa">{{ PAGES.profile.securityEntry }}</router-link>
          <span class="profile-note-sep" aria-hidden="true">·</span>
          <router-link to="/support">{{ PAGES.profile.contactSupport }}</router-link>
        </span>
      </p>
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
      </div>

      <!--
        时间范围与导出是同一组「对这段日志做什么」的工具：
        手机上压成一行 —— 滑轨占满剩余宽度，导出贴在右端；
        桌面同样是「左范围、右导出」，只是滑轨限宽。
      -->
      <div class="profile-logs-toolbar">
        <!-- 时间范围同时作用于「页面上的时间线」与「导出的 CSV」 -->
        <div class="profile-logs-range" role="tablist" :aria-label="PAGES.profile.logsRangeAria">
          <button
            v-for="item in LOG_RANGES"
            :key="item.value"
            type="button"
            role="tab"
            class="profile-logs-range-btn"
            :class="{ 'is-active': logRange === item.value }"
            :aria-selected="logRange === item.value"
            @click="selectLogRange(item.value)"
          >
            {{ logRangeLabel(item) }}
          </button>
        </div>

        <!--
          导出是低频动作：不用主色实心按钮和页面里的「签到」抢焦点，
          只用一枚安静的描边按钮，和范围控件同处一行。
        -->
        <button
          type="button"
          class="profile-logs-export"
          :disabled="downloadingLogs"
          :aria-busy="downloadingLogs"
          @click="handleDownloadLogs"
        >
          <span v-if="downloadingLogs" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
          <span>{{ downloadingLogs ? PAGES.profile.logsExporting : PAGES.profile.logsDownload }}</span>
        </button>
      </div>

      <!--
        时间线而不是表格：日志的读法是「最近发生了什么」，
        时间、类别、动作、结果四列足以扫读；细节只在有值时显示，
        过长由 CSS 省略，不撑破卡片。
      -->
      <div v-if="logsLoading" class="profile-log-state" aria-live="polite" aria-busy="true">
        <span v-for="n in 3" :key="n" class="u-skeleton profile-log-skeleton"></span>
      </div>

      <p v-else-if="logsError" class="profile-log-state profile-log-state--error" role="alert">
        <span>{{ logsError }}</span>
        <button type="button" class="u-btn-secondary" @click="loadLogs">{{ PAGES.profile.logsRetry }}</button>
      </p>

      <p v-else-if="!logItems.length" class="profile-log-state">{{ PAGES.profile.logsEmpty }}</p>

      <ol v-else id="profile-log-list" class="profile-log-list" :class="{ 'is-expanded': logsExpanded }">
        <li
          v-for="(item, index) in logItems"
          :key="`${item.created_at}-${item.action}-${item.target_id}`"
          class="profile-log-item"
          :class="{ 'profile-log-item--extra': index >= 3 }"
        >
          <span class="profile-log-icon" aria-hidden="true">
            <AppIcon :name="logIcon(item)" />
          </span>
          <div class="profile-log-body">
            <div class="profile-log-line">
              <span class="profile-log-action">{{ item.action_label }}</span>
              <span class="profile-log-outcome" :class="logOutcomeClass(item.outcome)">
                {{ item.outcome_label || '—' }}
              </span>
            </div>
            <p class="profile-log-meta">
              <time class="profile-log-time" :datetime="item.created_at">{{ formatLogTime(item.created_at) }}</time>
              <span class="profile-log-sep" aria-hidden="true">·</span>
              <span class="profile-log-category">{{ item.category_label }}</span>
            </p>
            <p v-if="item.detail" class="profile-log-detail" :title="item.detail">{{ item.detail }}</p>
          </div>
        </li>
      </ol>

      <!--
        手机端先给最近 3 条，想继续看再展开并重新拉 24 条；
        桌面端 CSS 始终显示全部预览条数，按钮只在 ≤767 出现。
      -->
      <button
        v-if="logItems.length > 3"
        type="button"
        class="profile-more profile-logs-more"
        :aria-expanded="logsExpanded ? 'true' : 'false'"
        aria-controls="profile-log-list"
        @click="toggleLogs"
      >
        <span>{{ logsExpanded ? PAGES.profile.logsCollapse : PAGES.profile.logsExpand }}</span>
        <AppIcon
          name="chevron-down"
          class="profile-more-icon"
          :class="{ 'is-open': logsExpanded }"
        />
      </button>

      <p v-if="logItems.length" class="profile-log-preview-note">
        {{ PAGES.profile.logsPreviewNote }}
      </p>

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
import { formatDate, formatNumber, translate } from '@/i18n/index.js'
import { formatPointsValue } from '@/constants/member.js'
// 生日用自绘日期选择器：原生 type="date" 的日历由系统绘制，主题化不了
import DatePickerField from '@/components/DatePickerField.vue'
// 性别用自绘下拉：原生 <select> 的弹出层同理，明暗两套主题都管不到
import SelectField from '@/components/SelectField.vue'
// 手机号前缀：点开可搜索国家 / 地区，面板 teleport 出弹层避免被 overflow 裁切
import PhonePrefixPicker from '@/components/PhonePrefixPicker.vue'
import { DEFAULT_DIAL, formatPhoneDisplay } from '@/constants/phoneCountries.js'
// 操作日志：时间线预览用 JSON（按范围 + 条数），导出走 CSV blob
import { LOG_RANGES, downloadMyLogs, getMyLogs } from '@/api/ask/userLogs'
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
const emailError = ref('')
const phoneError = ref('')
/**
 * 地区代码只做展示与输入辅助，不进入 `form`：
 * 接口仍然只收 11 位号码（`form.phone`），所以它不参与 isDirty / patch。
 */
const phoneDial = ref(DEFAULT_DIAL)
const nicknameInputRef = ref(null)
const emailInputRef = ref(null)
const phoneInputRef = ref(null)
const formErrorRef = ref(null)

/** 已有的登录凭据不能清空：清空等于把账号的登录方式删掉 */
function validateEmail() {
  const raw = (form.value.email || '').trim()
  if (!raw) {
    emailError.value = baseline.value.email ? PAGES.profile.emailRequired : ''
    return !emailError.value
  }
  emailError.value = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw) ? '' : PAGES.profile.emailInvalid
  return !emailError.value
}

function validatePhone() {
  const raw = (form.value.phone || '').trim().replace(/[\s-]/g, '')
  if (!raw) {
    phoneError.value = baseline.value.phone ? PAGES.profile.phoneRequired : ''
    return !phoneError.value
  }
  phoneError.value = /^1[3-9]\d{9}$/.test(raw) ? '' : PAGES.profile.phoneInvalid
  return !phoneError.value
}

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
  email: '',
  phone: '',
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
    email: data.email || '',
    phone: data.phone || '',
    avatar_url: data.avatar_url || '',
    gender: data.gender || '',
    birthday: toDateInput(data.birthday),
  }
  baseline.value = { ...form.value }
  // 已保存的资料成为新基线，本地预览（未提交的选图）随之作废
  resetAvatar()
  errorMessage.value = ''
  nicknameError.value = ''
  emailError.value = ''
  phoneError.value = ''
}

const isDirty = computed(
  () =>
    // 文本字段按 trim 后比较：只多打了首尾空格不算改动（后端也会 trim）
    form.value.nickname.trim() !== baseline.value.nickname.trim() ||
    form.value.email.trim() !== baseline.value.email.trim() ||
    form.value.phone.trim() !== baseline.value.phone.trim() ||
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

/**
 * 手机端账号信息只默认展示这四行；其余行收进「更多账号信息」。
 * 桌面端不受影响（CSS 始终展开）。
 */
const ACCOUNT_PRIMARY_KEYS = ['uuid', 'username', 'email', 'phone']
const accountMoreOpen = ref(false)

const readonlyRows = computed(() => {
  const data = userInfo.value || {}
  const fields = TRADE.profileFields
  return [
    // 字段名「用户 UID」由 TRADE.profileFields.uuid 统一提供（值仍是 users.uuid，
    // 展示 / 复制逻辑都不变），这里不再就地覆盖，避免同一文案有两个来源。
    { key: 'uuid', label: fields.uuid, value: data.uuid || '—' },
    { key: 'username', label: fields.username, value: data.username || PAGES.profile.unset },
    { key: 'email', label: fields.email, value: data.email || PAGES.profile.unbound },
    {
      key: 'phone',
      label: fields.phone,
      // 号码是「地区 + 本地号」，只显示 11 位数字会让用户不确定能不能境外拨打；
      // 存库仍是纯数字，这里只是展示层加 `+86` 与 3-4-4 分组。
      value: data.phone ? formatPhoneDisplay(data.phone, DEFAULT_DIAL) : PAGES.profile.unbound,
    },
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

  // 按钮变对勾只是「局部反馈」，视线不在按钮上的用户看不到；
  // 再给一条 toast，确保「复制成功了」这件事一定被听见/看见。
  notify.success(PAGES.profile.uidCopied)
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
  emailError.value = ''
  phoneError.value = ''
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

  // 与失焦校验同一套规则；失败时聚焦第一个出错的字段，
  // 而不是把错误丢在表单底部等用户自己找。
  const checks = [
    { ok: validateNickname(), ref: nicknameInputRef },
    { ok: validateEmail(), ref: emailInputRef },
    { ok: validatePhone(), ref: phoneInputRef },
  ]
  const firstInvalid = checks.find((item) => !item.ok)
  if (firstInvalid) {
    await nextTick()
    firstInvalid.ref.value?.focus()
    return
  }
  const nicknameValue = form.value.nickname.trim()
  const emailValue = form.value.email.trim().toLowerCase()
  const phoneValue = form.value.phone.trim().replace(/[\s-]/g, '')

  saving.value = true
  try {
    // 只提交**真正改过**的字段：服务端把「未提交」与「提交为空」区分对待，
    // 全量提交会把没动过的头像/生日一并清空。
    const patch = {}
    if (nicknameValue !== baseline.value.nickname.trim()) patch.nickname = nicknameValue
    if (emailValue !== baseline.value.email.trim().toLowerCase()) patch.email = emailValue
    if (phoneValue !== baseline.value.phone.trim()) patch.phone = phoneValue
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
    } else if (result.field === 'email' || result.field === 'phone') {
      // 服务端预检到重复（目前只在 message 里给文案，字段级由前端兜底）
      const target = result.field === 'email' ? emailError : phoneError
      target.value = result.message
      errorMessage.value = PAGES.profile.fieldSaveFailed
      await nextTick()
      ;(result.field === 'email' ? emailInputRef : phoneInputRef).value?.focus()
    } else {
      // 服务端文案（重名 / 敏感词 / 该邮箱已占用等）原样展示
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
 * 操作日志时间线。
 *
 * 页面只展示最近几条（服务端 `limit` 单独生效），导出仍走完整 CSV；
 * 两个动作共用 `logRange`，切换范围会同时刷新列表。
 */
const LOG_PREVIEW_LIMIT = 6
const LOG_EXPANDED_LIMIT = 24
const logItems = ref([])
const logsLoading = ref(false)
const logsError = ref('')
const logsExpanded = ref(false)
const logLimit = ref(LOG_PREVIEW_LIMIT)
let logRequestSeq = 0

/** 列表时间用「月/日 时:分」：同一年内的记录，年份是噪音 */
const formatLogTime = (value) =>
  formatDate(value, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

/** 结果徽标：成功 / 失败 / 中性（服务端 outcome 是英文枚举，别直接展示） */
const logOutcomeClass = (outcome) => {
  const value = String(outcome || '').toLowerCase()
  if (['success', 'succeeded', 'ok', 'completed', 'approved'].includes(value)) {
    return 'profile-log-outcome--ok'
  }
  if (['failed', 'failure', 'error', 'rejected', 'denied', 'cancelled'].includes(value)) {
    return 'profile-log-outcome--bad'
  }
  return 'profile-log-outcome--muted'
}

/**
 * 时间线左侧的类别字形。
 * 图标只承担「这是哪一类事」的扫读，不承担装饰；未知类别退回时钟。
 */
const logIcon = (item) => {
  const category = String(item?.category_label || '')
  if (category.includes('账号') || category.includes('登录')) return 'user'
  if (category.includes('订单')) return 'package'
  if (category.includes('卡密')) return 'key'
  if (category.includes('积分')) return 'star'
  if (category.includes('签到')) return 'calendar'
  if (category.includes('会员') || category.includes('成长')) return 'crown'
  return 'clock'
}

const loadLogs = async () => {
  if (!userStore.isLoggedIn) {
    logItems.value = []
    return
  }
  const seq = ++logRequestSeq
  logsLoading.value = true
  logsError.value = ''
  try {
    const result = await getMyLogs({ range: logRange.value, limit: logLimit.value })
    if (seq !== logRequestSeq) return
    const items = Array.isArray(result?.data?.items) ? result.data.items : []
    logItems.value = items.slice(0, logLimit.value)
  } catch (error) {
    if (seq !== logRequestSeq) return
    logItems.value = []
    logsError.value = error?.message || PAGES.profile.logsLoadFailed
  } finally {
    if (seq === logRequestSeq) logsLoading.value = false
  }
}

/** 切换范围：先刷新列表，再让导出跟着当前范围走；展开态回到默认的 3 条 */
const selectLogRange = (value) => {
  if (logRange.value === value) return
  logRange.value = value
  logsExpanded.value = false
  logLimit.value = LOG_PREVIEW_LIMIT
  loadLogs()
}

/**
 * 手机端「查看全部 / 收起」。
 *
 * 展开时把 limit 提到 24 条并重新请求；收起时回到 6 条预览，
 * 这样即使服务器之后清掉了旧数据，页面也不会留着一份过期的长列表。
 */
const toggleLogs = async () => {
  logsExpanded.value = !logsExpanded.value
  logLimit.value = logsExpanded.value ? LOG_EXPANDED_LIMIT : LOG_PREVIEW_LIMIT
  await loadLogs()
}

/* 首屏在挂载后再拉日志：SSR 不需要它，也避免登录态尚未 hydrate 时发请求 */
onMounted(() => {
  loadLogs()
})

watch(
  () => userStore.userId,
  (next, prev) => {
    if (next !== prev) loadLogs()
  }
)

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
/* ── 账号摘要：一张「通行证」卡 ─────────────────────────────────
 * 4.14.0：不再是一张白卡里堆五段 —— 顶部做成带品牌色的「通行证封面」，
 * 头像与身份压在上面；下半部分才是等级、数字与邀请。
 * 一张卡只有一处挥霍：封面渐变；数字用等宽大字，其余保持安静。 */
.ui-card.profile-summary {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  margin-bottom: calc(var(--space-unit) * 3);
  overflow: hidden;
}

.profile-summary-head {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2.5);
  background:
    radial-gradient(120% 150% at 0% 0%, var(--accent-soft) 0%, transparent 58%),
    var(--bg-elevated);
  border-bottom: var(--stroke-width) solid var(--divider);
}

.profile-summary-avatar {
  flex-shrink: 0;
  width: calc(var(--space-unit) * 9);
  height: calc(var(--space-unit) * 9);
  font-size: var(--fs-h2);
}

.profile-summary-identity {
  flex: 1 1 auto;
  min-width: 0;
}

.profile-summary-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  color: var(--text-primary);
}

.profile-summary-meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 0.5);
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-summary-dot {
  color: var(--divider);
}

/* 编辑资料：低频动作做成文字链，和「注册于 …」同一行，身份行只留一个主按钮 */
.profile-summary-edit {
  padding: 0;
  font-family: var(--font-body);
  font-size: var(--fs-label);
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  background: none;
  border: 0;
  cursor: pointer;
}

.profile-summary-edit:hover {
  text-decoration-thickness: 2px;
}

.profile-summary-edit:focus-visible {
  outline: 2px solid var(--ec-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-input);
}

/* 签到是这一页唯一的「今天要做的事」，也是身份行唯一的主按钮 */
.profile-summary-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: var(--space-unit);
}

.profile-summary-actions .u-btn-primary,
.profile-summary-actions .u-btn-secondary {
  justify-content: center;
  white-space: nowrap;
}

.profile-summary-actions .app-icon {
  font-size: var(--fs-body);
  opacity: 0.9;
}

.profile-summary-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit));
  width: auto;
  margin: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5);
}

.profile-summary-skeleton-line {
  display: block;
  height: calc(var(--space-unit) * 2);
  border-radius: var(--radius-media);
}

.profile-summary-skeleton-line--short {
  width: 40%;
}

.profile-summary-error {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

/* 等级 + 期限 + 去处的「会员状态条」：徽章与入口同一行，说明落在下一行。
   用浅底描边条把「计划」从统计数字里分出来，但不再让三段各占一行。 */
.profile-summary-plan {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'name actions'
    'note note';
  align-items: center;
  column-gap: calc(var(--space-unit) * 1.5);
  row-gap: calc(var(--space-unit) * 0.35);
  margin: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2.5) 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  background: var(--bg-soft);
  border: var(--stroke-width) solid var(--divider);
  border-radius: var(--radius-panel);
}

/* 只让子项参与网格：名字与说明分别是两行，入口固定在右上 */
.profile-summary-plan-text {
  display: contents;
}

/* 等级名做成小徽章：它是一张「通行证」的编号，不是标题 */
.profile-summary-plan-name {
  display: inline-flex;
  grid-area: name;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  width: fit-content;
  margin: 0;
  padding: calc(var(--space-unit) * 0.25) calc(var(--space-unit) * 1);
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: var(--radius-pill);
}

.profile-summary-plan-note {
  grid-area: note;
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-summary-plan-actions {
  display: flex;
  grid-area: actions;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: calc(var(--space-unit) * 1.5);
}

/* 「去看看」型入口：文字 + 右折角，不抢主按钮的视觉重量 */
.profile-summary-link {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.25);
  font-family: var(--font-body);
  font-size: var(--fs-label);
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--transition-interactive);
}

.profile-summary-link .app-icon {
  font-size: var(--fs-label);
  opacity: 0.6;
  transition: transform var(--transition-interactive);
}

.profile-summary-link:hover {
  color: var(--accent);
}

.profile-summary-link:hover .app-icon {
  transform: translateX(2px);
}

.profile-summary-link:focus-visible {
  outline: 2px solid var(--ec-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-input);
}

.profile-summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 0;
  row-gap: calc(var(--space-unit) * 2);
  margin: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5) 0;
  padding-top: calc(var(--space-unit) * 2);
  border-top: var(--stroke-width) solid var(--divider);
}

/* 一项统计 = 标签 + 数字 + 说明，三者纵向排列；说明与数字之间必须有间距，
   否则「36,485 距 V8 还差 13,515」会粘成一句话。 */
.profile-member-stat {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  min-width: 0;
  padding-inline: calc(var(--space-unit) * 1.5);
  border-left: var(--stroke-width) solid var(--divider);
}

.profile-member-stat:first-child {
  padding-left: 0;
  border-left: 0;
}

.profile-member-stat:last-child {
  padding-right: 0;
}

.profile-member-term {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.profile-member-value {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  font-family: var(--font-body);
}

/* 数字是数据：等宽 + 大字，便于竖排/横排对齐。 */
.profile-member-link {
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  font-variant-numeric: tabular-nums;
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  color: inherit;
  text-decoration: none;
}

/* 「暂无可用券 · 去领券」是散文（空态 + 动作），必须回到正文字体与字号；
   否则它会继承上一行数字的等宽字号，和旁边的「优惠券」标签明显不是一套字。 */
.profile-member-link--text {
  font-family: var(--font-body);
  font-size: var(--fs-label);
  line-height: 1.5;
  color: var(--accent);
}

.profile-member-link:hover {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.profile-member-sub {
  font-family: var(--font-body);
  font-size: var(--fs-label);
  line-height: 1.5;
  color: var(--text-muted);
  white-space: nowrap;
}

/* 到期提醒横跨整行：它属于「需要你注意」的信息，不该挤在数字那一行 */
.profile-summary-remind {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  margin: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5) 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-label);
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: var(--radius-input);
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


/* ── 我的服务：订单 / 卡密 / 收藏 / 优惠券 ─────────────────────
 * 4.8.0：不再让四个入口各自顶一张卡（四层边框 + 四层阴影太吵），
 * 收成一张分组卡：桌面 4 列、平板 2×2，靠发丝分隔线分组。
 * 这是移动端最常见、也最安静的分组列表形态。 */
.ui-card.profile-services {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 0;
  margin-bottom: calc(var(--space-unit) * 2);
  overflow: hidden;
}

.profile-service {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 1.75) calc(var(--space-unit) * 2);
  color: inherit;
  text-decoration: none;
  border-left: 1px solid var(--divider);
  transition: background-color var(--transition-interactive);
}

.profile-service:nth-child(4n + 1) {
  border-left: 0;
}

.profile-service:hover {
  background: var(--bg-soft);
}

.profile-service:active {
  background: var(--ec-bg-muted);
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

/* 复制成功：按钮本身也要变（对勾 + 成功色），否则只有 toast 一闪而过；
 * 1.5 秒后组件把 is-ok 摘掉，恢复正常图标与颜色。 */
.profile-field-value--code .ec-icon-btn.is-ok {
  color: var(--success);
  border-color: var(--success);
  background: var(--success-bg);
}

.profile-note {
  margin-top: calc(var(--space-unit) * 2.5);
}

/* ── 渐进披露：账号信息 / 操作日志的「更多」 ─────────────────────────────
 * 桌面端不需要二次点击，按钮只在 ≤767 出现；手机端把次要行收起来，
 * 首屏给主信息与最近 3 条日志，想看再展开。 */
.profile-more {
  display: none;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 0.75);
  width: 100%;
  margin-top: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 0.75) 0;
  font-size: var(--fs-label);
  color: var(--accent);
  background: none;
  border: 0;
  cursor: pointer;
}

.profile-more-icon {
  font-size: var(--fs-body);
  transition: transform var(--transition-interactive);
}

.profile-more-icon.is-open {
  transform: rotate(180deg);
}

.profile-more:focus-visible {
  outline: 2px solid var(--ec-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-input);
}

/* 游客态：表头下面先给一句「登录能换来什么」，再让只读行登场 */
.profile-account-guest {
  margin-top: calc(var(--space-unit) * 1);
  margin-bottom: calc(var(--space-unit) * 2);
}

/* 说明里的「改绑与验证」入口做成行内文本链接：
 * 这是补充说明，不是主操作，不该有一排按钮的重量。 */
.profile-note-links {
  display: inline;
  white-space: normal;
}

.profile-note-links a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.profile-note-links a:hover {
  text-decoration-thickness: 2px;
}

.profile-note-sep {
  margin: 0 calc(var(--space-unit) * 0.5);
  color: var(--text-muted);
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

/* 手机号：区号选择器与输入框拼成一个控件。
 * 区号不参加校验，也不写进 form.phone，输入框只装 11 位号码；
 * 两者共享同一圈边框与焦点环，视觉上不能读成「两个字段」。 */
.profile-phone-group {
  display: flex;
  align-items: center;
  height: var(--ec-control-h-md);
  overflow: hidden;
  background: var(--ec-input-bg, var(--bg-elevated));
  border: 1px solid var(--ec-input-border);
  border-radius: var(--ec-input-radius);
  transition:
    border-color var(--transition-interactive),
    box-shadow var(--transition-interactive);
}

.profile-phone-group:focus-within {
  border-color: var(--ec-border-focus);
  box-shadow: var(--focus-ring);
}

.profile-phone-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding-inline: var(--ec-input-px);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  color: var(--text-primary);
  background: transparent;
  border: 0;
  outline: none;
}

.profile-phone-input::placeholder {
  color: var(--placeholder);
}

.profile-phone-group:has(.profile-phone-input[aria-invalid='true']) {
  border-color: var(--danger);
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

/* 邀请收进摘要卡的最后一行：图标 / 标题+说明 / 入口同一行，说明超长单行省略 */
.profile-member-invite {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: calc(var(--space-unit) * 1.25);
  margin: calc(var(--space-unit) * 2) 0 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 2.5);
  border-top: var(--stroke-width) solid var(--divider);
  background: var(--bg-soft);
}

.profile-member-invite-icon {
  display: grid;
  place-items: center;
  width: calc(var(--space-unit) * 3.5);
  height: calc(var(--space-unit) * 3.5);
  font-size: var(--fs-body);
  color: var(--accent);
  background: var(--bg-elevated);
  border-radius: var(--radius-pill);
}

.profile-member-invite-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.15);
  min-width: 0;
}

.profile-member-invite-title {
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.profile-member-invite-desc {
  overflow: hidden;
  font-size: var(--fs-label);
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-member-invite-link {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.15);
  padding: calc(var(--space-unit) * 0.35) calc(var(--space-unit) * 1);
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--accent);
  white-space: nowrap;
  text-decoration: none;
  background: var(--bg-elevated);
  border-radius: var(--radius-pill);
  transition:
    color var(--transition-interactive),
    background-color var(--transition-interactive);
}

.profile-member-invite-link .app-icon {
  font-size: var(--fs-label);
  opacity: 0.7;
}

.profile-member-invite-link:hover {
  color: var(--accent-strong);
  background: var(--accent-soft);
}

/* ── 操作日志：一条活动轨迹（`GET /userLogsApi/?format=json`） ─────
   4.14.0：不再把日志画成五列表格。移动端读的是「最近发生了什么」：
   一条 = 类别字形 + 动作 + 结果 + 时间/类别 + 细节；桌面同样走这条轨迹，
   只是行更宽。导出降级为文字按钮，时间范围改成滑轨分段控件。 */
.ui-card.profile-logs {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
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

/* 范围 + 导出是一条工具栏：手机上压成一行，桌面也是左范围右导出 */
.profile-logs-toolbar {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
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

/* 导出：一条安静的描边按钮，不跟页面主按钮抢重量 */
.profile-logs-export {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 0.5);
  flex: 0 0 auto;
  margin-left: auto;
  min-height: calc(var(--space-unit) * 4);
  padding: 0 calc(var(--space-unit) * 1.5);
  font-family: var(--font-body);
  font-size: var(--fs-label);
  color: var(--text-secondary);
  background: transparent;
  border: var(--stroke-width) solid var(--divider);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    color var(--transition-interactive),
    border-color var(--transition-interactive),
    background-color var(--transition-interactive);
}

.profile-logs-export:hover:not(:disabled) {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: transparent;
}

.profile-logs-export:focus-visible {
  outline: 2px solid var(--ec-border-focus);
  outline-offset: 2px;
}

.profile-logs-export:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* 时间范围：一条滑轨，选中段是抬起的小胶囊，不是三个独立按钮 */
.profile-logs-range {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  flex: 1 1 auto;
  gap: 2px;
  width: auto;
  min-width: 0;
  max-width: 22rem;
  padding: 3px;
  background: var(--bg-soft);
  border-radius: var(--radius-pill);
}

.profile-logs-range-btn {
  min-height: calc(var(--space-unit) * 3.5);
  padding: 0 calc(var(--space-unit));
  font-family: var(--font-body);
  font-size: var(--fs-label);
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    color var(--transition-interactive),
    background-color var(--transition-interactive),
    box-shadow var(--transition-interactive);
}

.profile-logs-range-btn.is-active {
  color: var(--text-primary);
  font-weight: var(--fw-heading);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
}

.profile-logs-range-btn:focus-visible {
  outline: 2px solid var(--ec-border-focus);
  outline-offset: 2px;
}

/* 轨迹本体：左字形 + 右侧文本，行与行之间只有一条发丝线 */
.profile-log-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.profile-log-item {
  display: grid;
  grid-template-columns: calc(var(--space-unit) * 4) minmax(0, 1fr);
  align-items: start;
  column-gap: calc(var(--space-unit) * 1.25);
  padding: calc(var(--space-unit) * 1.5) 0;
  border-top: var(--stroke-width) solid var(--divider);
}
.profile-log-item:first-child {
  padding-top: 0;
  border-top: 0;
}
.profile-log-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 4);
  height: calc(var(--space-unit) * 4);
  color: var(--text-secondary);
  background: var(--bg-soft);
  border-radius: var(--radius-pill);
}
.profile-log-icon .app-icon {
  font-size: var(--fs-body);
}
.profile-log-body {
  min-width: 0;
}
.profile-log-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
}
.profile-log-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 0.5);
  margin: calc(var(--space-unit) * 0.35) 0 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.profile-log-time {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  white-space: nowrap;
}
.profile-log-sep {
  color: var(--divider);
}
.profile-log-category {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.profile-log-action {
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}
.profile-log-detail {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-label);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 结果不是一枚满色胶囊：小圆点 + 文案，安静地落在动作行右端 */
.profile-log-outcome {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  flex: 0 0 auto;
  font-size: var(--fs-label);
  color: var(--text-muted);
  white-space: nowrap;
}
.profile-log-outcome::before {
  content: '';
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
}
.profile-log-outcome--ok {
  color: var(--success);
}
.profile-log-outcome--bad {
  color: var(--danger);
}
.profile-log-preview-note {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.profile-log-state {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: calc(var(--space-unit) * 2) 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.profile-log-state--error {
  color: var(--danger);
}
.profile-log-skeleton {
  display: block;
  width: 100%;
  height: calc(var(--space-unit) * 2.5);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 991px) {
  /* 平板：服务分组卡降成 2×2，分隔线也跟着改到第一列与第二行
   * （选择器必须带上 .ui-card：基础规则是 .ui-card.profile-services，
   *  单类选择器在媒体查询里赢不了它 —— 4.8.0 首次上线就踩过） */
  .ui-card.profile-services {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-service {
    border-left: 0;
  }

  .profile-service:nth-child(2n) {
    border-left: 1px solid var(--divider);
  }

  .profile-service:nth-child(n + 3) {
    border-top: 1px solid var(--divider);
  }

  .profile-summary-plan {
    grid-template-columns: minmax(0, 1fr);
    row-gap: calc(var(--space-unit) * 1.5);
  }

  .profile-summary-plan-actions {
    justify-content: flex-start;
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

  /* 页头徽标：全站在窄屏把 --row 页头改成竖排（标题 + 动作各占一行），
   * 但「游客 / V7 / 注册 N 天」是**状态**，不是动作。竖排之后它掉到描述下面
   * 独占一行，和描述之间空出一段，读起来像第二个眉标。这里把它收回标题右侧。 */
  .profile-page .page-shell-head--row {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--ec-space-3);
  }

  .profile-page .page-shell-head--row > div {
    flex: 1 1 auto;
    min-width: 0;
  }

  .profile-page .page-shell-head--row > .u-tag {
    flex: none;
    margin-top: 2px;
  }

  /* 底部悬浮 Tab 的空间由 App.vue 的 .app-container 统一预留一次
   * （高度 + 12px + safe-area）。这里不再重复加 padding，否则最后一张卡
   * 到页脚会多出近 110px 的空白。 */

  /* UID 行的眼睛 / 复制：28px 在手指下太小，撑到 44 并让卡片跟着长高 */
  .profile-field-value--code .ec-icon-btn {
    width: var(--ec-control-h-lg);
    height: var(--ec-control-h-lg);
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

  /* 账号信息：主四行常驻，次三行收进「更多账号信息」 */
  .profile-row--extra {
    display: none;
  }

  .profile-fields.is-open .profile-row--extra {
    display: grid;
  }

  .profile-account-toggle,
  .profile-logs-more {
    display: flex;
  }

  /* 日志：最近 3 条常驻，展开后显示到 24 条 */
  .profile-log-item--extra {
    display: none;
  }

  .profile-log-list.is-expanded .profile-log-item--extra {
    display: grid;
  }

  .profile-field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-field-grid > .u-field:first-child {
    grid-column: 1 / -1;
  }

  .profile-logs-range {
    max-width: none;
  }

  /* 手机端轨迹再收一档：字形 3.5 单位、行距 1.25，结果仍靠右 */
  .profile-log-item {
    grid-template-columns: calc(var(--space-unit) * 3.5) minmax(0, 1fr);
    column-gap: var(--space-unit);
    padding: calc(var(--space-unit) * 1.25) 0;
  }

  .profile-log-icon {
    width: calc(var(--space-unit) * 3.5);
    height: calc(var(--space-unit) * 3.5);
  }

  .profile-log-action {
    font-size: var(--fs-label);
  }

  .profile-log-line {
    gap: var(--space-unit);
  }
}

@media (max-width: 575px) {
  /*
   * 手机：账号信息不再「标签列 + 值」横排（八行会把屏幕拉成一张表单）。
   * 改成两行一组：小号标签在上、值在下，行与行之间用发丝线分隔，
   * 这一屏更像原生设置页，扫读顺序也更自然。
   */
  .profile-row {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--space-unit) * 0.35);
    align-items: start;
    padding-block: calc(var(--space-unit) * 1.1);
    border-top: 1px solid var(--divider);
  }

  .profile-row:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .profile-row dt {
    font-size: var(--fs-label);
    letter-spacing: 0.02em;
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

  /* 手机：服务分组卡 2×2，只留图标 + 名称 + 箭头，描述行隐藏 */
  .ui-card.profile-services {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-service {
    gap: calc(var(--space-unit));
    padding: calc(var(--space-unit) * 1.5);
  }

  .profile-service-desc {
    display: none;
  }

  /* 手机端节奏：卡片之间从 24 收到 16，卡片内边距也收一档，整屏更接近原生列表 */
  .ui-card.profile-summary,
  .profile-account,
  .ui-card.profile-logs {
    margin-bottom: calc(var(--space-unit) * 2);
  }

  .page-panel.profile-account,
  .ui-card.profile-logs {
    padding: calc(var(--space-unit) * 2);
  }

  /* 摘要卡：手机保留封面内边距，把统计压成「成长值整行 + 积分/优惠券并排」 */
  .ui-card.profile-summary {
    padding: 0;
  }

  .profile-summary-head {
    flex-wrap: wrap;
    padding: calc(var(--space-unit) * 2);
    gap: calc(var(--space-unit) * 1.5);
  }

  .profile-summary-avatar {
    width: calc(var(--space-unit) * 7);
    height: calc(var(--space-unit) * 7);
    font-size: var(--fs-h3);
  }

  .profile-summary-actions {
    width: 100%;
    margin-left: 0;
  }

  .profile-summary-actions > * {
    flex: 1 1 auto;
  }

  .profile-summary-plan {
    margin: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2) 0;
    padding: calc(var(--space-unit)) calc(var(--space-unit) * 1.5);
    column-gap: calc(var(--space-unit));
  }

  .profile-summary-plan-actions {
    justify-content: flex-end;
    gap: calc(var(--space-unit) * 1.25);
  }

  .profile-summary-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 0;
    row-gap: calc(var(--space-unit) * 1.5);
    margin: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2) 0;
  }

  .profile-summary-stats > .profile-member-stat:first-child {
    grid-column: 1 / -1;
    padding-bottom: calc(var(--space-unit) * 1.5);
    border-bottom: var(--stroke-width) solid var(--divider);
  }

  .profile-summary-remind {
    margin: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2) 0;
  }

  .profile-member-invite {
    margin-top: calc(var(--space-unit) * 1.5);
    padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 2);
    gap: calc(var(--space-unit));
  }

  .profile-member-invite-icon {
    width: calc(var(--space-unit) * 3);
    height: calc(var(--space-unit) * 3);
  }

  /* 编辑弹层在手机上贴满可用宽度，纵向自己滚动 */
  .profile-editor {
    width: 100%;
    max-height: 100dvh;
    padding: calc(var(--space-unit) * 2);
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

  /* 操作日志：范围与导出压成一行；滑轨吃掉剩余宽度，导出贴右端 */
  .profile-logs-toolbar {
    gap: calc(var(--space-unit) * 0.75);
  }

  .profile-logs-range {
    max-width: none;
  }

  .profile-logs-range-btn {
    padding: 0 calc(var(--space-unit) * 0.5);
  }

  .profile-logs-export {
    padding: 0 calc(var(--space-unit) * 0.75);
  }
}
</style>
