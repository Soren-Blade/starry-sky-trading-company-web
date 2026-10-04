<template>
  <section class="hero-section">
    <!-- 背景装饰 -->
    <div class="hero-background">
      <div class="stars-container">
        <div
          v-for="(star, index) in stars"
          :key="index"
          class="star"
          :style="{
            left: star.x + '%',
            top: star.y + '%',
            '--delay': star.delay + 's',
            '--duration': star.duration + 's',
            '--size': star.size + 'px',
          }"
        ></div>
      </div>
    </div>

    <!-- 内容容器 -->
    <div class="hero-container">
      <div class="hero-content">
        <!-- 标题 -->
        <h1 class="hero-title">
          <span class="title-gradient">探索星辰之美</span>
        </h1>

        <!-- 副标题 -->
        <p class="hero-subtitle">
          在星辰商行，发现生活的美好时刻<br />每一件商品都承载着独特的故事与品质
        </p>

        <!-- CTA按钮 -->
        <div class="hero-actions">
          <button class="btn btn-primary" @click="handleShopNow">
            <span>立即购物</span>
            <span class="icon">→</span>
          </button>
          <button class="btn btn-secondary" @click="handleLearnMore">
            <span>了解更多</span>
            <span class="icon">↓</span>
          </button>
        </div>

        <!-- 特性展示 -->
        <div class="hero-features">
          <div class="feature-item" v-for="(feature, index) in features" :key="index">
            <span class="feature-icon">{{ feature.icon }}</span>
            <span class="feature-text">{{ feature.text }}</span>
          </div>
        </div>
      </div>

      <!-- 插画装饰 -->
      <div class="hero-illustration">
        <div class="illustration-circle"></div>
        <div class="illustration-content">
          <span class="big-emoji">✨</span>
        </div>
      </div>
    </div>

    <!-- 浮动元素 -->
    <div class="floating-elements">
      <div class="float-item float-1">💎</div>
      <div class="float-item float-2">🌙</div>
      <div class="float-item float-3">⭐</div>
      <div class="float-item float-4">✨</div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { domUtils } from '@/utils/index.js';

const emit = defineEmits(['shop-click', 'learn-more-click']);

const stars = ref([]);
const features = [
  { icon: '🎁', text: '品质保证' },
  { icon: '⚡', text: '快速配送' },
  { icon: '💳', text: '安全支付' },
];

const generateStars = () => {
  const starsArray = [];
  for (let i = 0; i < 30; i++) {
    starsArray.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 4,
      size: 1 + Math.random() * 3,
    });
  }
  stars.value = starsArray;
};

const handleShopNow = () => {
  emit('shop-click');
  // 可以添加路由导航或平滑滚动
};

const handleLearnMore = () => {
  emit('learn-more-click');
  domUtils.smoothScroll('.categories-section');
};

onMounted(() => {
  generateStars();
});
</script>

<style scoped>
.hero-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  margin-top: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-light) 0%, #EEE 50%, #EEEEEE 100%);
}

/* 背景装饰 */
.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.stars-container {
  position: absolute;
  width: 100%;
  height: 100%;
}

.star {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: radial-gradient(
    circle at 30% 30%,
    rgba(138, 109, 255, 0.8),
    rgba(138, 109, 255, 0.2)
  );
  border-radius: 50%;
  animation: starGlow var(--duration) ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes starGlow {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

/* 主容器 */
.hero-container {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
  padding: 80px 20px;
}

/* 内容区域 */
.hero-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
  letter-spacing: -1px;
}

.title-gradient {
  background: linear-gradient(135deg, #8A6DFF 0%, var(--color-primary-dark) 50%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--color-text-secondary);
  line-height: 1.8;
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  transition: left 0.3s ease-in-out;
  z-index: -1;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
}

.btn-primary:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(138, 109, 255, 0.6);
}

.btn-primary:active {
  transform: translateY(-2px);
}

.btn-secondary {
  background: white;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-secondary:hover {
  background: rgba(138, 109, 255, 0.05);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.2);
}

.btn-secondary:active {
  transform: translateY(-2px);
}

.btn .icon {
  display: inline-block;
  transition: transform 0.3s ease-in-out;
  font-size: 18px;
}

.btn:hover .icon {
  transform: translateX(4px);
}

.btn-secondary:hover .icon {
  transform: translateY(4px);
}

/* 特性展示 */
.hero-features {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-dark);
}

.feature-icon {
  font-size: 24px;
  display: block;
  animation: float 3s ease-in-out infinite;
}

/* 插画装饰 */
.hero-illustration {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  animation: fadeInScale 0.8s ease-out 0.4s both;
}

.illustration-circle {
  position: absolute;
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, rgba(138, 109, 255, 0.3) 0%, rgba(253, 121, 168, 0.2) 100%);
  border-radius: 50%;
  filter: blur(40px);
  animation: float 4s ease-in-out infinite;
}

.illustration-content {
  position: relative;
  z-index: 5;
  font-size: 120px;
  animation: floatRandom 5s ease-in-out infinite;
}

.big-emoji {
  display: block;
}

/* 浮动元素 */
.floating-elements {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.float-item {
  position: absolute;
  font-size: 48px;
  animation: floatRandom 5s ease-in-out infinite;
}

.float-1 {
  top: 15%;
  left: 10%;
  animation-delay: 0s;
}

.float-2 {
  top: 70%;
  right: 10%;
  animation-delay: 1s;
  font-size: 40px;
}

.float-3 {
  bottom: 20%;
  left: 5%;
  animation-delay: 2s;
}

.float-4 {
  top: 40%;
  right: 5%;
  animation-delay: 1.5s;
  font-size: 32px;
}

/* 响应式 */
@media (max-width: 1199px) {
  .hero-section {
    margin-top: 60px;
    min-height: auto;
  }

  .hero-container {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 60px 20px;
  }

  .hero-title {
    font-size: 44px;
  }

  .hero-illustration {
    height: 320px;
  }

  .illustration-circle {
    width: 250px;
    height: 250px;
  }

  .illustration-content {
    font-size: 100px;
  }
}

@media (max-width: 767px) {
  .hero-section {
    margin-top: 56px;
  }

  .hero-container {
    padding: 40px 16px;
    gap: 30px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-actions {
    gap: 12px;
  }

  .btn {
    padding: 12px 24px;
    font-size: 14px;
  }

  .hero-features {
    gap: 20px;
  }

  .feature-item {
    font-size: 13px;
    gap: 6px;
  }

  .feature-icon {
    font-size: 20px;
  }

  .hero-illustration {
    height: 250px;
  }

  .illustration-circle {
    width: 200px;
    height: 200px;
  }

  .illustration-content {
    font-size: 80px;
  }

  .float-item {
    font-size: 32px;
  }

  .float-2 {
    font-size: 28px;
  }

  .float-4 {
    font-size: 24px;
  }
}

@media (max-width: 575px) {
  .hero-container {
    padding: 30px 12px;
  }

  .hero-title {
    font-size: 24px;
  }

  .hero-subtitle {
    font-size: 14px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    padding: 12px 20px;
    font-size: 14px;
  }

  .hero-features {
    flex-direction: column;
    gap: 12px;
  }

  .hero-illustration {
    display: none;
  }

  .float-item {
    display: none;
  }
}
</style>
