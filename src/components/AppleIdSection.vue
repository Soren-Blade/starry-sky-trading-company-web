<template>
  <section class="apple-id-section">
    <div class="section-container">
      <!-- 使用说明 -->
      <div class="guide-section">
        <button class="guide-toggle" @click="showGuide = !showGuide">
          <span class="toggle-icon">{{ showGuide ? "▼" : "▶" }}</span>
          <span class="toggle-text">📖 使用说明（新手必看）</span>
        </button>
        <div v-if="showGuide" class="guide-content">
          <div class="guide-item tutorial">
            <h4 class="guide-subtitle">使用教程</h4>
            <ol class="guide-list">
              <li>1 - 打开应用商店（App Store）</li>
              <li>2 - 左上角退出当前ID，复制账户、密码登陆共享ID</li>
              <li>3 - 登陆提示选择 - 其他选项 - 不升级 - 以后</li>
              <li>4 - 下载成功后退出共享ID，登陆自己ID</li>
            </ol>
            <!-- <p class="guide-note">如果不懂请看底下教程视频，不按教程操作锁机概不收费！</p> -->
          </div>

          <div class="guide-item tips">
            <h4 class="guide-subtitle">友情提示</h4>
            <ul class="guide-tips-list">
              <li>
                <strong>密码更新：</strong
                >密码30分钟更新一次，过期后请自行来官网获取最新密码，请勿使用旧密码登入
              </li>
              <li>
                <strong>下载软件：</strong
                >下载软件后必须退出共享AppID，重新登陆自己的AppID
              </li>
              <li>
                <strong>安装说明：</strong
                >如果已经安装过需要先卸载旧版本重新安装，否则账号会提示锁定
              </li>
              <li>
                <strong>账号锁定：</strong>如果账号锁定等待40分钟然后来获取
              </li>
              <li>
                <strong>重要警告：</strong>请勿登入iCloud，开双重认证会锁机器
              </li>
              <li>
                <strong>责任声明：</strong>不按教程操作出现问题概不负责！！
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 风险提示 -->
      <div class="risk-warning">
        <div class="warning-item critical">
          <span class="warning-icon">⚠️</span>
          <div class="warning-content">
            <p class="warning-title">使用APP Store登录</p>
            <p class="warning-text">
              使用苹果ID必须从App
              Store登录，千万不要登录「iCloud」，否则可能导致锁机或者隐私泄漏！
            </p>
          </div>
        </div>
        <div class="warning-item scam">
          <span class="warning-icon">⚠️</span>
          <div class="warning-content">
            <p class="warning-title">防范诈骗行为</p>
            <p class="warning-text">
              本站不提供任何付费解锁服务，也不会索取任何个人信息。任何收费解锁或信息索取行为，均为诈骗，请提高警惕。
            </p>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loader-wrapper">
          <div class="gradient-spinner"></div>
          <div class="loader-dot">🍎</div>
        </div>
        <p class="loading-text">正在加载苹果ID列表</p>
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-container">
        <p class="error-message">{{ error }}</p>
        <button class="retry-btn" @click="fetchAppleIds">重试</button>
      </div>

      <!-- 苹果ID网格 -->
      <div v-else class="apple-ids-grid">
        <!-- NanoCloud 数据源 -->
        <div v-if="nanoCloudIds.length > 0" class="data-source-section">
          <h3 class="source-title">主线路</h3>
          <div class="ids-grid">
            <AppleIdCard
              v-for="(id, index) in nanoCloudIds"
              :key="`nano-${index}`"
              :appleId="id"
              source="NanoCloud"
            />
          </div>
        </div>

        <!-- FangQiangNan 数据源 -->
        <div v-if="fangQiangNanIds.length > 0" class="data-source-section">
          <h3 class="source-title">副线路</h3>
          <div class="ids-grid">
            <AppleIdCard
              v-for="(id, index) in fangQiangNanIds"
              :key="`fang-${index}`"
              :appleId="id"
              source="FangQiangNan"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-if="nanoCloudIds.length === 0 && fangQiangNanIds.length === 0"
          class="empty-note"
        >
          <p>暂无可用的苹果ID</p>
          <p>请稍后再试，或者联系客服获取帮助</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToolStore } from '@/stores/tool'
import AppleIdCard from '@/components/AppleIdCard.vue'

const toolStore = useToolStore()
// loading / error 统一由 store 提供：原先组件内的 error 永远不会被赋值
// （store 的 fetchAppleIds 吞掉异常并返回 false，组件的 catch 收不到），
// 导致失败时只显示空态、重试按钮不可达。
const { appleIds, appleIdsLoading: loading, appleIdsError: error } = storeToRefs(toolStore)

const showGuide = ref(false)

// 计算不同数据源的ID
const nanoCloudIds = computed(() => appleIds.value?.nanoCloud || [])
const fangQiangNanIds = computed(() => appleIds.value?.fangQiangNan || [])

// 获取苹果ID列表（重试按钮复用同一入口）
const fetchAppleIds = () => toolStore.fetchAppleIds()

// 组件挂载时获取数据
onMounted(() => {
  fetchAppleIds()
})
</script>

<style scoped>
.apple-id-section {
  position: relative;
  width: 100%;
  padding: 48px 0 0 0;
  background: linear-gradient(180deg, var(--color-light) 0%, #f1f2f4 100%);
}

.section-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 80px;
  animation: fadeInUp 0.6s ease-out;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 16px;
  letter-spacing: -1px;
}

.title-icon {
  display: inline-block;
  font-size: 48px;
  animation: float 3s ease-in-out infinite;
}

.section-description {
  font-size: 18px;
  color: var(--color-text-secondary);
  margin: 0;
}

.loading-container,
.error-container {
  text-align: center;
  padding: 80px 20px;
}

.loader-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 28px;
}

/* 渐变色旋转圆环 */
.gradient-spinner {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #ff9ff3 0%,
    #f368e0 25%,
    #667eea 50%,
    #764ba2 75%,
    #ff9ff3 100%
  );
  animation: spinGradient 2s linear infinite;
  padding: 3px;
}

.gradient-spinner::before {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--color-light);
}

/* 中心苹果图标 */
.loader-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  animation: pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  z-index: 10;
}

.loading-text {
  font-size: 15px;
  color: #4a5568;
  margin: 0 0 18px 0;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* 点状加载指示器 */
.loading-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9ff3, #f368e0);
  animation: dotBounce 1.4s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.error-message {
  color: #ff4757;
  margin-bottom: 16px;
  font-size: 16px;
}

.retry-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
}

/* 风险提示样式 */
.risk-warning {
  margin-bottom: 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-item {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 10px;
  border-left: 4px solid;
  animation: slideInLeft 0.4s ease-out;
}

.warning-item.critical {
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.1) 0%,
    rgba(255, 152, 0, 0.1) 100%
  );
  border-left-color: #ff6b6b;
}

.warning-item.scam {
  background: linear-gradient(
    135deg,
    rgba(244, 67, 54, 0.1) 0%,
    rgba(229, 57, 53, 0.1) 100%
  );
  border-left-color: #f44336;
}

.warning-icon {
  display: flex;
  align-items: flex-start;
  font-size: 24px;
  flex-shrink: 0;
  padding-top: 2px;
}

.warning-content {
  flex: 1;
}

.warning-title {
  font-size: 15px;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 6px 0;
}

.warning-text {
  font-size: 14px;
  color: #4a5568;
  margin: 0;
  line-height: 1.6;
}

.warning-item.critical .warning-title {
  color: #d32f2f;
}

.warning-item.scam .warning-title {
  color: #c62828;
}

/* 使用说明样式 */
.guide-section {
  margin-bottom: 48px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.guide-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #ff9ff3 0%, #f368e0 100%);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  text-align: left;
}

.guide-toggle:hover {
  box-shadow: 0 4px 12px rgba(243, 104, 224, 0.3);
}

.toggle-icon {
  display: inline-flex;
  align-items: center;
  transition: transform 0.3s ease;
}

.toggle-text {
  flex: 1;
}

.guide-content {
  padding: 24px;
  background: #fafbfc;
  animation: slideDown 0.3s ease-out;
}

.guide-item {
  margin-bottom: 24px;
}

.guide-item:last-child {
  margin-bottom: 0;
}

.guide-subtitle {
  font-size: 16px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 12px;
  margin-top: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.guide-item.tutorial .guide-subtitle::before {
  content: "▸";
  color: #667eea;
  font-size: 18px;
}

.guide-item.tips .guide-subtitle::before {
  content: "▸";
  color: #f368e0;
  font-size: 18px;
}

.guide-list {
  margin: 0;
  padding-left: 24px;
  color: #4a5568;
  line-height: 1.8;
}

.guide-list li {
  margin-bottom: 8px;
  font-size: 14px;
}

.guide-tips-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
  color: #4a5568;
}

.guide-tips-list li {
  padding: 8px 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
}

.guide-tips-list li::before {
  content: "●";
  position: absolute;
  left: 0;
  color: #667eea;
}

.guide-note {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fff9e6;
  border-left: 3px solid #ffd700;
  color: #7d6608;
  font-size: 13px;
  border-radius: 4px;
}

/*
 * 小屏适配。
 * 合并说明：原先有三个 `@media (max-width: 767px)` 块，选择器互不重叠
 * （guide-* / section-* / ids-grid / warning-*），合并后层叠结果不变。
 */

.apple-ids-grid {
  display: flex;
  flex-direction: column;
  gap: 60px;
}

.data-source-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.source-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #2d3748;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 12px;
}

.ids-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.empty-note {
  text-align: center;
  color: #888;
  padding: 60px 20px;
  background: rgba(250, 250, 250, 0.7);
  border-radius: 16px;
  font-size: 18px;
}

/* 响应式设计 */
@media (max-width: 1199px) {
  .ids-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 767px) {
  /* 区块头（与 global.css 的 767px 块保持同一套缩放） */
  .section-title {
    font-size: 32px;
  }

  .title-icon {
    font-size: 32px;
  }

  .section-description {
    font-size: 16px;
  }

  .section-header {
    margin-bottom: 40px;
  }

  /* 本组件特有：指南与警告区 */
  .guide-toggle {
    padding: 14px 16px;
    font-size: 14px;
  }

  .guide-content {
    padding: 16px;
  }

  .guide-list {
    padding-left: 20px;
  }

  .guide-tips-list li {
    font-size: 13px;
    padding-left: 18px;
  }

  .data-source-section {
    padding: 24px 16px;
  }

  .ids-grid {
    grid-template-columns: 1fr;
  }

  .warning-item {
    padding: 12px 16px;
    gap: 12px;
  }

  .warning-icon {
    font-size: 20px;
  }

  .warning-title {
    font-size: 14px;
  }

  .warning-text {
    font-size: 13px;
  }
}

@media (max-width: 575px) {
  .apple-id-section {
    padding: 32px 0;
  }

  .section-container {
    padding: 0 16px;
  }
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes spinGradient {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 0.8;
  }
}

@keyframes dotBounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-12px);
    opacity: 1;
  }
}
</style>
