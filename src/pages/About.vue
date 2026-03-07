<template>
  <div class="about-page">
    <div class="page-header">
      <h1>关于我们</h1>
      <p>了解星辰商行的故事</p>
    </div>

    <div class="about-container">
      <section class="about-section">
        <h2>我们的愿景</h2>
        <p>
          星辰商行致力于为用户带来精选商品和优质服务。我们相信，每一件商品都承载着独特的故事和品质，
          我们的使命是让消费者在享受便利购物的同时，感受到生活的美好。
        </p>
      </section>

      <section class="about-section">
        <h2>我们的核心价值</h2>
        <div class="values-grid">
          <div class="value-card">
            <div class="value-icon">✨</div>
            <h3>品质优先</h3>
            <p>每一件商品都经过严格筛选，确保品质与美学的完美结合</p>
          </div>
          <div class="value-card">
            <div class="value-icon">⚡</div>
            <h3>高效服务</h3>
            <p>快速配送、贴心售后，让您的购物体验更加轻松</p>
          </div>
          <div class="value-card">
            <div class="value-icon">💫</div>
            <h3>创新体验</h3>
            <p>不断创新购物方式，为用户提供更好的体验</p>
          </div>
          <div class="value-card">
            <div class="value-icon">❤️</div>
            <h3>用户至上</h3>
            <p>以用户需求为中心，打造温暖的购物社区</p>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2>联系我们</h2>
        <div class="contact-info">
          <p>📍 地址：中国 北京市 朝阳区</p>
          <p>📞 电话：400-800-8888</p>
          <p>✉️ 邮箱：service@starrysky.com</p>
          <p>🕐 服务时间：9:00 - 22:00</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
// About page component
</script>

<style scoped>
.about-page {
  width: 100%;
  padding-top: 70px;
}

.page-header {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%);
  color: white;
}

.page-header h1 {
  font-size: 48px;
  margin: 0 0 16px 0;
  font-weight: 800;
}

.page-header p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

.about-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 80px 20px;
}

.about-section {
  margin-bottom: 80px;
}

.about-section h2 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 30px;
  color: var(--color-dark);
  border-bottom: 3px solid var(--color-primary);
  padding-bottom: 15px;
  display: inline-block;
}

.about-section p {
  font-size: 16px;
  line-height: 1.8;
  color: #666;
  margin: 0;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
  margin-top: 30px;
}

.value-card {
  padding: 30px;
  background: linear-gradient(135deg, rgba(138, 109, 255, 0.1) 0%, rgba(253, 121, 168, 0.1) 100%);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: all 0.3s ease-in-out;
}

.value-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
}

.value-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.value-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--color-dark);
}

.value-card p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.contact-info {
  font-size: 16px;
  line-height: 2;
  color: #666;
}

.contact-info p {
  margin: 8px 0;
}

@media (max-width: 767px) {
  .page-header {
    padding: 40px 16px;
  }

  .page-header h1 {
    font-size: 32px;
  }

  .page-header p {
    font-size: 14px;
  }

  .about-container {
    padding: 40px 16px;
  }

  .about-section h2 {
    font-size: 28px;
  }

  .values-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .value-card {
    padding: 20px;
  }

  .value-icon {
    font-size: 40px;
  }

  .value-card h3 {
    font-size: 18px;
  }
}
</style>
