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

    <div class="profile-layout">
      <!-- 左：账号信息（只读） -->
      <section class="page-panel" aria-label="账号信息">
        <h2 class="page-panel-head">{{ TRADE.profileBasic }}</h2>

        <div class="profile-identity">
          <span class="u-avatar profile-avatar">
            <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" :alt="nickname || '用户头像'" />
            <span v-else aria-hidden="true">👤</span>
          </span>
          <div class="profile-identity-text">
            <p class="profile-name">{{ nickname || '未设置昵称' }}</p>
            <p class="profile-since">注册于 {{ toDate(userInfo.created_at) || '—' }}</p>
          </div>
        </div>

        <dl class="profile-fields">
          <div v-for="row in readonlyRows" :key="row.key" class="profile-row">
            <dt>{{ row.label }}</dt>
            <dd class="u-field-value">{{ row.value }}</dd>
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
                  <img v-if="avatarShown" :src="avatarShown" :alt="nickname || '用户头像'" />
                  <span v-else aria-hidden="true">👤</span>
                </span>

                <div class="avatar-desc">
                  <p class="u-field-hint avatar-hint">{{ TRADE.profileAvatarHint }}</p>
                  <p v-if="pickedInfo" class="u-field-hint avatar-hint">{{ pickedInfo }}</p>
                </div>
              </div>

              <!-- 原生 file input 藏起来、用 label 触发：原生控件在五套风格下无法主题化。
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
                <!-- 用文本字形而不是 emoji：emoji 不受 CSS color 影响，
                     悬停变色与五套风格都会失效（✕ 关闭按钮也是同样的取舍） -->
                <span v-else class="avatar-upload-icon" aria-hidden="true">↑</span>
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
              <select
                id="profile-gender"
                v-model="form.gender"
                class="u-input"
                :disabled="!userStore.isLoggedIn"
              >
                <option value="">{{ TRADE.profileGenderUnset }}</option>
                <option value="male">{{ TRADE.profileGenderMale }}</option>
                <option value="female">{{ TRADE.profileGenderFemale }}</option>
                <option value="unknown">{{ TRADE.profileGenderUnknown }}</option>
              </select>
            </div>

            <div class="u-field">
              <span class="u-field-label">{{ TRADE.profileBirthday }}</span>
              <!--
                原生 `<input type="date">` 的弹出日历由操作系统绘制，五套主题都管不到；
                这里换成消费 ui-kit-data.css §11 的 DatePickerField。
                值仍是 `YYYY-MM-DD` 或空串，与原生控件的 value 同构，
                因此 toDateInput()、isDirty 与 `patch.birthday = … || null` 都不必改。
                面板内「未来日期」不可选（沿用脚本里已有的 today 常量作为 max）；
                不再用 `<label for>` 关联 —— label 的 for 只对可标记元素
                （input / select / textarea）生效，指向 button 是无效关联，
                所以可访问名改由组件的 ariaLabel 提供。
              -->
              <DatePickerField
                id="profile-birthday"
                v-model="form.birthday"
                :aria-label="TRADE.profileBirthday"
                :max="today"
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
  </div>
</template>

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
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { resolveAssetUrl } from '@/utils/assetUrl.js'
import { PAGES, TRADE } from '@/constants/index.js'
// 生日用自绘日期选择器：原生 type="date" 的日历由系统绘制，主题化不了
import DatePickerField from '@/components/DatePickerField.vue'

const userStore = useUserStore()
const { userInfo, nickname } = storeToRefs(userStore)

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

const today = new Date().toISOString().slice(0, 10)

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
 * 用 `watch(..., { immediate: true })` 而不是 `onMounted` 预填表单。
 *
 * `onMounted` 在首屏渲染**之后**才跑，用户会先看到一瞬空输入框再被填上；
 * 深链进入时（userInfo 还要等接口）这个空窗更长。immediate watch 让表单
 * 始终是「当前 userInfo 的投影」，账号切换与首次加载走的是同一条路径。
 */
watch(
  () => userInfo.value?.uuid,
  () => fillForm(),
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

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: var(--section-gap);
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

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 991px) {
  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
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
}
</style>
