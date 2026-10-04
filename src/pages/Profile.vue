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
            <label class="u-field-label" for="profile-avatar">{{ TRADE.profileAvatar }}</label>
            <input
              id="profile-avatar"
              v-model="form.avatar_url"
              class="u-input"
              type="url"
              maxlength="500"
              :placeholder="TRADE.profileAvatarPlaceholder"
              :disabled="!userStore.isLoggedIn"
            />
            <span v-if="avatarPreview" class="profile-avatar-preview">
              <span class="u-avatar">
                <img :src="avatarPreview" alt="头像预览" />
              </span>
              <span class="u-field-hint">预览</span>
            </span>
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
              <label class="u-field-label" for="profile-birthday">{{ TRADE.profileBirthday }}</label>
              <input
                id="profile-birthday"
                v-model="form.birthday"
                class="u-input"
                type="date"
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
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { PAGES, TRADE } from '@/constants/index.js'

const userStore = useUserStore()
const { userInfo, nickname } = storeToRefs(userStore)

const saving = ref(false)
const errorMessage = ref('')

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
  errorMessage.value = ''
}

const isDirty = computed(
  () =>
    form.value.nickname !== baseline.value.nickname ||
    form.value.avatar_url !== baseline.value.avatar_url ||
    form.value.gender !== baseline.value.gender ||
    form.value.birthday !== baseline.value.birthday
)

/** 头像预览：只在看起来是 http(s) 链接时显示，避免把非法输入塞进 <img src> */
const avatarPreview = computed(() => {
  const url = form.value.avatar_url.trim()
  return /^https?:\/\//i.test(url) ? url : ''
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
  errorMessage.value = ''
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

.profile-avatar-preview {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  margin-top: calc(var(--space-unit) * 0.5);
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
}
</style>
