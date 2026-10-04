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
        class="action-btn copy-btn"
        :aria-label="`复制账号 ${appleId.apple_id || ''}`"
        @click.stop="copyToClipboard(appleId.apple_id)"
      >
        📋 复制账号
      </button>
      <button
        v-if="appleId.password"
        class="action-btn copy-btn"
        aria-label="复制密码"
        @click.stop="copyToClipboard(appleId.password)"
      >
        🔑 复制密码
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
/* 外壳（背景/圆角/阴影/hover 位移）统一来自 global.css 的 .ui-card，
   这里只保留苹果 ID 卡特有的边框处理 */
.apple-id-card {
  border: 1px solid var(--color-border-contrast);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.source-badge {
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
}

.status-indicator {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.status-indicator.active {
  background: rgba(72, 187, 120, 0.9);
}

.status-indicator.inactive {
  background: rgba(229, 62, 62, 0.9);
}

.status-indicator.unknown {
  background: rgba(160, 174, 192, 0.9);
}

.card-body {
  padding: 20px;
}

.id-info {
  display: flex;
  margin-bottom: 12px;
  align-items: center;
}

.id-info:last-child {
  margin-bottom: 0;
}

.id-label {
  min-width: 80px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted-dark);
  margin-right: 12px;
}

.id-value {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-soft-dark);
  word-break: break-all;
}

.password-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.masked {
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
}

.toggle-password {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.toggle-password:hover {
  background: rgba(0, 0, 0, 0.1);
}

.card-actions {
  padding: 16px 20px;
  background: #f7fafc;
  border-top: 1px solid var(--color-border-contrast);
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.copy-btn {
  background: var(--gradient-indigo);
  color: white;
}

.copy-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 响应式设计 */
@media (max-width: 767px) {
  .card-header {
    padding: 12px 16px;
  }

  .card-body {
    padding: 16px;
  }

  .card-actions {
    padding: 12px 16px;
    flex-direction: row; /* keep buttons side-by-side */
  }

  /* force info rows to stay inline and truncate long text */
  .id-info {
    flex-direction: row;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
  }

  .id-label {
    min-width: auto;
    margin-right: 4px;
    white-space: nowrap;
  }

  .id-value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>