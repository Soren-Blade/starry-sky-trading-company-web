<template>
  <!-- 卡片本身不可点击（操作都在内部按钮上），因此不加 role/tabindex -->
  <div class="apple-id-card ui-card">
    <div class="card-header">
      <span class="u-tag source-badge">{{ source }}</span>
      <span class="u-tag status-indicator" :class="getStatusClass(appleId)">
        {{ appleId.status || '未知' }}
      </span>
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
        class="action-btn u-btn-primary"
        :aria-label="`复制账号 ${appleId.apple_id || ''}`"
        @click.stop="copyToClipboard(appleId.apple_id)"
      >
        <span aria-hidden="true">📋</span> 复制账号
      </button>
      <button
        v-if="appleId.password"
        class="action-btn u-btn-primary"
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
import { notify } from '@/hooks/useToast/index.js'

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

// 状态徽标的语义变体类名：交给 global.css 的 .u-tag--success / .u-tag--danger，
// 默认（无变体）即中性标签，组件内不再自写三套配色。
// 根据数据源和字段判断状态
const getStatusClass = (id) => {
  if (props.source === 'NanoCloud' || props.source === 'FangQiangNan') {
    return id.status === '正常' ? 'u-tag--success' : 'u-tag--danger'
  }
  return ''
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

// 复制到剪贴板（提示走右上角提示框门面，3000ms 自动消失、悬停暂停）
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    notify.success('已复制到剪贴板')
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    notify.success('已复制到剪贴板')
  }
}
</script>

<style scoped>
/* 外壳（表面/边框/圆角/阴影）来自 global.css 的 .ui-card：
   内边距由共享类提供（--card-padding），子元素只加分隔与行间距 */

/* 卡头：一条分隔线表达层级，不引入新颜色。
   原先的品红渐变属于规范外的装饰，已删除 —— 卡片身份靠排版而非渐变 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  padding-bottom: calc(var(--space-unit) * 1.5);
  border-bottom: var(--stroke-width) solid var(--border);
}

/* 数据源徽标：外观全部来自 .u-tag（高度/内边距/圆角/中性配色），
   这里只保证长数据源名截断而不撑破卡头 */
.source-badge {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 状态徽标：语义色由 .u-tag--success / .u-tag--danger 提供，
   未知来源退回 .u-tag 的中性默认态，组件内不再自写三套配色 */
.status-indicator {
  flex-shrink: 0;
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

/* 显隐密码：行内小按钮，圆角与悬停底色走令牌 */
.toggle-password {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: calc(var(--space-unit) * 0.25);
  font-size: var(--fs-body);
  border-radius: var(--btn-radius);
  cursor: pointer;
  transition: background-color var(--transition-interactive);
}

.toggle-password:hover {
  background: var(--bg-soft);
}

/* 操作区是卡片的收尾块：一条分隔线 + 收尾间距（左右内边距仍由 .ui-card 负责） */
.card-actions {
  display: flex;
  gap: var(--space-unit);
  padding-top: calc(var(--space-unit) * 1.5);
  border-top: var(--stroke-width) solid var(--border);
}

/* 复制按钮复用 .u-btn-primary（底色/圆角/hover 位移都随主题），
   这里只让两个按钮等分操作区宽度；高度由 --btn-height 决定 */
.action-btn {
  flex: 1;
}

/* 小屏维持 id 行不换行 + 省略号截断（原行为保留），
   并按规范收一档：内边距 ×0.8、正文字号 ×0.95 */
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

  .id-label,
  .id-value {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .toggle-password {
    padding: calc(var(--space-unit) * 0.25 * var(--mobile-padding-scale));
  }

  .card-actions {
    gap: calc(var(--space-unit) * var(--mobile-padding-scale));
    padding-top: calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
  }
}

/* 更窄时两个复制按钮并排会把文案压到换行，改为纵向堆叠 */
@media (max-width: 575px) {
  .card-actions {
    flex-direction: column;
  }
}
</style>
