<template>
  <!-- 卡片本身不可点击（操作都在内部按钮上），因此不加 role/tabindex -->
  <div class="apple-id-card ui-card">
    <div class="card-header">
      <div class="source-badge">{{ source }}</div>
      <div class="status-indicator" :class="getStatusClass(appleId)">
        {{ appleId.status || '未知' }}
      </div>
    </div>

    <div class="card-body">
      <div class="id-info">
        <div class="id-label">账号</div>
        <div class="id-value">{{ appleId.apple_id || '未知' }}</div>
      </div>

      <div v-if="appleId.password" class="id-info">
        <div class="id-label">密码</div>
        <div class="id-value password-field">
          <span :class="{ 'masked': !showPassword }">{{ showPassword ? appleId.password : '••••••••' }}</span>
          <button
            class="toggle-password"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            :aria-pressed="showPassword"
            @click.stop="togglePasswordVisibility"
          >
            <span aria-hidden="true">{{ showPassword ? '🙈' : '👁️' }}</span>
          </button>
        </div>
      </div>

      <div v-if="appleId.country" class="id-info">
        <div class="id-label">地区</div>
        <div class="id-value">{{ appleId.country }}</div>
      </div>

      <div v-if="appleId.create_time" class="id-info">
        <div class="id-label">更新时间</div>
        <div class="id-value">{{ formatDate(appleId.create_time) }}</div>
      </div>
    </div>

    <div class="card-actions">
      <button
        class="action-btn u-cta"
        :aria-label="`复制账号 ${appleId.apple_id || ''}`"
        @click.stop="copyToClipboard(appleId.apple_id)"
      >
        <span aria-hidden="true">📋</span> 复制账号
      </button>
      <button
        v-if="appleId.password"
        class="action-btn u-cta"
        aria-label="复制密码"
        @click.stop="copyToClipboard(appleId.password)"
      >
        <span aria-hidden="true">🔑</span> 复制密码
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  appleId: {
    type: Object,
    required: true
  },
  source: {
    type: String,
    required: true
  }
})

const showPassword = ref(false)

// 切换密码可见性
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// 获取状态样式类
const getStatusClass = (id) => {
  // 根据数据源和字段判断状态
  if (props.source === 'NanoCloud') {
    return id.status === '正常' ? 'active' : 'inactive'
  } else if (props.source === 'FangQiangNan') {
    return id.status === '正常' ? 'active' : 'inactive'
  }
  return 'unknown'
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '未知'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    message.success('已复制到剪贴板')
  }
}
</script>

<style scoped>
/* 外壳来自 global.css 的 .ui-card，这里只用令牌重申边框，
   避免将来改动 .ui-card 时这张卡静默失去边界 */
.apple-id-card {
  border-color: var(--border);
}

/* 卡头用次级表面 + 分隔线表达层级。
   原先的品红渐变属于规范外的装饰，已删除 —— 卡片身份靠排版而非渐变 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  padding-bottom: calc(var(--space-unit) * 1.5);
  border-bottom: 1px solid var(--border);
}

/* 数据源徽标比卡头再亮一档，保证与状态徽标同处一行时能分辨 */
.source-badge {
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-chip);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  border-radius: var(--radius-chip);
}

.status-indicator.active {
  color: var(--success);
  background: var(--success-bg);
}

.status-indicator.inactive {
  color: var(--danger);
  background: var(--danger-bg);
}

.status-indicator.unknown {
  color: var(--text-muted);
  background: var(--bg-soft);
}

/* 行间距交给卡片的 gap，比逐行 margin 更好随密度缩放 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

.id-info {
  display: flex;
  gap: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

.id-label {
  flex-shrink: 0;
  min-width: calc(var(--space-unit) * 10);
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  color: var(--text-muted);
}

/* 账号/密码串较长，优先截断而不是把布局撑破 */
.id-value {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-sm);
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.password-field {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
}

/* 掩码点用等宽字体才等距，同时避免泄密时长度一眼可估 */
.masked {
  font-family: var(--font-mono);
  letter-spacing: var(--tracking-label);
}

.toggle-password {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: calc(var(--space-unit) * 0.25);
  font-size: var(--fs-body);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: background-color var(--transition-interactive);
}

.toggle-password:hover {
  background: var(--bg-soft);
}

/* 操作区是卡片的收尾块：抬到次级表面并加一条分隔线 */
.card-actions {
  display: flex;
  gap: calc(var(--space-unit));
  padding-top: calc(var(--space-unit) * 1.5);
  background: var(--bg-surface-2);
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius-card) var(--radius-card);
}

/* 复制按钮复用 .u-cta（底色/圆角/hover 位移都随主题），
   这里只给触控目标一个高度下限 */
.action-btn {
  flex: 1;
  min-height: calc(var(--space-unit) * 5.5);
}

/* 小屏维持 id 行不换行 + 省略号截断（原行为保留） */
@media (max-width: 767px) {
  .id-info {
    flex-wrap: nowrap;
    gap: calc(var(--space-unit) * 0.5);
  }

  .id-label {
    min-width: auto;
    white-space: nowrap;
  }

  .id-value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 更窄时两个复制按钮并排会把文案压到换行，改为纵向堆叠 */
@media (max-width: 575px) {
  .card-actions {
    flex-direction: column;
  }
}
</style>
