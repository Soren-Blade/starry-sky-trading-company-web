<template>
  <!--
    两个根节点是刻意的：HelpModal 必须是遮罩层的**兄弟**而不是子节点。
    `.u-modal-overlay` 上有 backdrop-filter，而 backdrop-filter 会让元素成为
    fixed 后代的包含块（与 Navbar 踩过的坑同源）—— 嵌在里面的弹窗会以
    遮罩层的 padding box 为参照定位，并在遮罩层滚动时跟着滚。
  -->
  <div class="u-modal-overlay" @click.self="$emit('close')">
    <div
      ref="modalRef"
      class="u-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <h2 id="login-modal-title" class="visually-hidden">
        {{ activeTab === 'login' ? '登录' : '注册' }}
      </h2>

      <button type="button" class="u-modal-close" @click="$emit('close')" aria-label="关闭弹窗">
        ✕
      </button>

      <!-- Tabs -->
      <div class="modal-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'login' }"
          @click="switchTab('login')"
        >
          登录
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'register' }"
          @click="switchTab('register')"
        >
          注册
        </button>
      </div>

      <!-- Tab Content -->
      <div class="u-modal-body tab-content">
        <!-- Login Form -->
        <form v-if="activeTab === 'login'" class="form login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-username">用户名</label>
            <input
              id="login-username"
              v-model="loginForm.username"
              class="u-input"
              type="text"
              placeholder="请输入用户名/邮箱/手机号"
              required
            />
          </div>

          <div class="form-group">
            <label for="login-password">密码</label>
            <input
              id="login-password"
              v-model="loginForm.password"
              class="u-input"
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>

          <div class="form-options">
            <label class="u-checkbox">
              <input v-model="loginForm.rememberMe" type="checkbox" /><span class="u-checkbox-box" aria-hidden="true"></span>
              <span :title="AUTH.rememberHint">{{ AUTH.rememberMe }}</span>
            </label>
            <button type="button" class="link-btn" @click="showHelpModal = true">
              {{ AUTH.forgotPassword }}?
            </button>
          </div>
          <p class="page-note remember-hint">{{ AUTH.rememberHint }}</p>

          <button
            type="submit"
            class="u-btn-primary submit-btn"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span v-if="loading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
            <span class="btn-text">{{ loading ? '登录中...' : '登录' }}</span>
          </button>

          <div class="divider">或者</div>

          <div class="social-login">
            <button
              type="button"
              class="u-btn-secondary social-btn"
              @click="showHelpModal = true"
            >
              <span>微信登录</span>
            </button>
            <button
              type="button"
              class="u-btn-secondary social-btn"
              @click="showHelpModal = true"
            >
              <span>QQ登录</span>
            </button>
          </div>
          <p class="social-note page-note">
            第三方登录尚未接入。需要协助请
            <button type="button" class="link-btn" @click="showHelpModal = true">联系客服</button>。
          </p>
        </form>

        <!-- Register Form -->
        <form v-else class="form register-form" @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="register-username">用户名</label>
            <input
              id="register-username"
              v-model="registerForm.username"
              class="u-input"
              type="text"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-email">邮箱</label>
            <input
              id="register-email"
              v-model="registerForm.email"
              class="u-input"
              type="email"
              placeholder="请输入邮箱地址"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-password">密码</label>
            <input
              id="register-password"
              v-model="registerForm.password"
              class="u-input"
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-confirm">确认密码</label>
            <input
              id="register-confirm"
              v-model="registerForm.confirmPassword"
              class="u-input"
              type="password"
              placeholder="请再次输入密码"
              required
            />
          </div>

          <div class="form-options">
            <label class="u-checkbox">
              <input v-model="registerForm.agreeTerms" type="checkbox" /><span class="u-checkbox-box" aria-hidden="true"></span>
              <span>
                {{ AUTH.agreePrefix }}
                <router-link to="/terms" class="inline-link">用户协议</router-link>
                {{ AUTH.and }}
                <router-link to="/privacy" class="inline-link">隐私政策</router-link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            class="u-btn-primary submit-btn"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span v-if="loading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
            <span class="btn-text">{{ loading ? '提交中...' : '注册' }}</span>
          </button>
        </form>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="success-message" role="status">
        {{ successMessage }}
      </div>
    </div>
  </div>

  <!-- 找回密码 / 联系客服：当前没有邮件与短信服务，如实说明并给出真实联系方式，
       而不是留一个点了什么都不发生的 `href="#"`。
       注意它在遮罩层**外面**（见模板顶部注释）。 -->
  <HelpModal
    v-if="showHelpModal"
    :title="AUTH.forgotTitle"
    :intro="AUTH.forgotIntro"
    :steps="AUTH.forgotSteps"
    @close="showHelpModal = false"
  />
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useModalA11y } from '@/hooks/useModalA11y';
import HelpModal from '@/components/HelpModal.vue';
import {
  getRememberPreference,
  getRememberedIdentifier,
} from '@/hooks/useToken/index.js';
import { AUTH } from '@/constants/index.js';

const emit = defineEmits(['close', 'login-success']);
const userStore = useUserStore();

const activeTab = ref('login');
const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);

/** 「忘记密码」弹窗：讲清当前不支持自助重置，并给出真实联系方式 */
const showHelpModal = ref(false);

/**
 * 模态约定（Escape / 焦点陷阱 / 焦点归还 / 滚动锁定）统一由 useModalA11y 提供。
 * 这里只负责把 close 接到 emit 上。
 */
const { modalRef } = useModalA11y({ close: () => emit('close') });

const loginForm = ref({
  // 「记住我」的默认值与上次登录的账号都从本地存储恢复：
  // 勾过就保持勾选（这是用户上次的选择），勾过才带出账号。
  username: getRememberedIdentifier(),
  password: '',
  rememberMe: getRememberPreference(),
});

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
});

const handleLogin = async () => {
  errorMessage.value = '';

  if (!loginForm.value.username || !loginForm.value.password) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;

  try {
    // 输入既可能是用户名，也可能是邮箱或手机号，交给后端按 login_type 判定
    const identifier = loginForm.value.username.trim();
    const loginType = identifier.includes('@')
      ? 'email'
      : /^1[3-9]\d{9}$/.test(identifier)
        ? 'phone'
        : 'username';

    const result = await userStore.login({
      login_type: loginType,
      username: loginType === 'username' ? identifier : undefined,
      email: loginType === 'email' ? identifier : undefined,
      phone: loginType === 'phone' ? identifier : undefined,
      password: loginForm.value.password,
      // 仅客户端偏好：决定 refresh token 是否持久化（关掉浏览器后是否仍登录）
      rememberMe: loginForm.value.rememberMe,
    });

    if (result.success) {
      emit('login-success', identifier);
      resetForms();
    } else {
      errorMessage.value = result.message || '用户名或密码错误';
    }
  } catch (error) {
    errorMessage.value = error.message || '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  errorMessage.value = '';

  if (
    !registerForm.value.username ||
    !registerForm.value.email ||
    !registerForm.value.password ||
    !registerForm.value.confirmPassword
  ) {
    errorMessage.value = '请填写所有字段';
    return;
  }

  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致';
    return;
  }

  if (!registerForm.value.agreeTerms) {
    errorMessage.value = '请同意用户协议和隐私政策';
    return;
  }

  loading.value = true;

  try {
    const result = await userStore.register({
      username: registerForm.value.username.trim(),
      email: registerForm.value.email.trim(),
      password: registerForm.value.password,
    });

    if (result.success) {
      successMessage.value = result.message || '注册成功，请使用该账号登录';
      resetForms();
      // 注册成功后切回登录页签，降低用户操作成本
      activeTab.value = 'login';
    } else {
      errorMessage.value = result.message || '注册失败';
    }
  } catch (error) {
    errorMessage.value = error.message || '注册失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

/**
 * 清空表单。
 *
 * 账号与「记住我」**不能清成空值**：它们要回到本地存储里那份偏好 ——
 * 否则用户勾了「记住我」登录一次之后，再打开弹窗会看到账号被清空、勾也没了，
 * 看上去就像「记住我根本没生效」。密码则必须清掉。
 */
const resetForms = () => {
  loginForm.value = {
    username: getRememberedIdentifier(),
    password: '',
    rememberMe: getRememberPreference(),
  };
  registerForm.value = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  };
};

const switchTab = (tab) => {
  activeTab.value = tab;
  errorMessage.value = '';
  successMessage.value = '';
};
</script>

<style scoped>
/*
 * 登录/注册弹窗
 *
 * 外壳（宽度 480~520px、内边距 24~28px、圆角 16~24px、遮罩、阴影、关闭按钮尺寸）
 * 全部来自 global.css 的 .u-modal-overlay / .u-modal / .u-modal-close 与 --modal-* 令牌；
 * 输入框与按钮同理复用 .u-input / .u-btn-primary / .u-btn-secondary / .u-checkbox。
 * 这里只保留登录弹窗特有的内部布局。
 */

/* ── 页签：下划线式，与主题弹窗的胶囊页签区分开 ─────────── */
.modal-tabs {
  display: flex;
  /*
   * 右侧给关闭按钮让位。页签行与 ✕ 处在同一条垂直带上，不让位的话
   * 「注册」页签会一直铺到弹窗右边缘、压在按钮底下 ——
   * 即便 ✕ 已经靠 z-index 提到上层（见 global.css 的 .u-modal-close），
   * 页签的悬停底色与选中下划线仍会紧贴按钮，看上去像是按钮的一部分。
   * 与 .u-modal-title 的 padding-right 是同一套做法。
   */
  padding-right: calc(var(--modal-close-size) + var(--space-unit));
  margin-bottom: calc(var(--space-unit) * 3);
  border-bottom: var(--stroke-width) solid var(--divider);
}

.tab-btn {
  position: relative;
  flex: 1;
  height: var(--btn-height);
  font-size: var(--btn-font-size);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  transition: color var(--transition-interactive);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: calc(var(--stroke-width) * -1);
  left: 0;
  height: var(--dropdown-active-bar);
  background: var(--accent);
}

/* ── 表单 ───────────────────────────────────────────────── */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--modal-title-gap);
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
}

.form-group label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  color: var(--text-secondary);
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-unit);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

/* 「记住我」的说明：这行的语义（关掉浏览器后是否仍登录）不看说明是猜不到的，
 * 因此把它写在复选框下面，而不是塞进 title 里让移动端无法发现。 */
.remember-hint {
  margin-top: calc(var(--space-unit) * -1.5);
  font-size: var(--fs-label);
  line-height: var(--leading-body);
}

.u-checkbox span {
  color: var(--text-secondary);
}

/* 「忘记密码」「联系客服」与协议链接都必须是真实可交互元素。
 * 原来是 `<a href="#">` —— 点了只会在地址栏多一个 `#`。
 * 忘记密码是打开弹窗（button），协议是站内路由（router-link），
 * 因此不能共用一套标签，只共用外观。 */
.link-btn,
.inline-link {
  padding: 0;
  font-size: inherit;
  font-family: inherit;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-interactive);
}

.link-btn:hover,
.inline-link:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

.inline-link {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.social-note {
  margin-top: calc(var(--space-unit));
  text-align: center;
}

.submit-btn {
  width: 100%;
}

/* ── 分隔线与第三方登录 ─────────────────────────────────── */
.divider {
  position: relative;
  margin: calc(var(--space-unit) * 2) 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  text-align: center;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(50% - var(--space-unit) * 2.5);
  height: var(--stroke-width);
  background: var(--divider);
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.social-login {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(var(--space-unit) * 1.5);
}

/* 微信 / QQ 统一成次按钮：令牌体系里没有第三方品牌色的位置 */
.social-btn {
  width: 100%;
}

/* ── 结果提示：语义色 10% 底 + 语义色文字（规范第八节的颜色变体）── */
.error-message,
.success-message {
  margin-top: var(--modal-title-gap);
  padding: var(--tag-padding-y) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  text-align: center;
  border-radius: var(--radius-input);
}

.error-message {
  color: var(--danger);
  background: var(--danger-bg);
  animation: shake var(--enter-duration) var(--enter-ease) both;
}

.success-message {
  color: var(--success);
  background: var(--success-bg);
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(calc(var(--space-unit) * -0.6));
  }

  75% {
    transform: translateX(calc(var(--space-unit) * 0.6));
  }
}

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 767px) {
  .form-options {
    flex-direction: column;
    align-items: flex-start;
  }

  .social-login {
    grid-template-columns: 1fr;
  }
}
</style>