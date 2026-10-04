<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="not-found-icon">404</div>
        <h1>页面未找到</h1>
        <p>抱歉，您访问的页面不存在或已被删除</p>
        
        <router-link to="/" class="back-home-btn">
          <span>返回首页</span>
          <span class="arrow">→</span>
        </router-link>

        <div class="suggestions">
          <h3>您可能想查看：</h3>
          <ul>
            <li><router-link to="/categories">商品分类</router-link></li>
            <li><router-link to="/hot">热门推荐</router-link></li>
            <li><router-link to="/about">关于我们</router-link></li>
          </ul>
        </div>
      </div>

      <div class="not-found-illustration">
        <div class="floating-star">⭐</div>
        <div class="floating-diamond">💎</div>
        <div class="floating-sparkle">✨</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Not Found page component
</script>

<style scoped>
.not-found-page {
  width: 100%;
  min-height: 100vh;
  padding-top: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-page-soft);
}

.not-found-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  max-width: var(--container-narrow);
  width: 100%;
  padding: 60px 20px;
}

.not-found-content {
  text-align: left;
}

.not-found-icon {
  font-size: 120px;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
  line-height: 1;
}

.not-found-content h1 {
  font-size: 48px;
  font-weight: 800;
  color: var(--color-dark);
  margin: 0 0 16px 0;
}

.not-found-content p {
  font-size: 18px;
  color: var(--color-text-secondary);
  margin: 0 0 40px 0;
  line-height: 1.6;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 32px;
  background: var(--gradient-primary);
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease-in-out;
  margin-bottom: 40px;
}

.back-home-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
}

.back-home-btn .arrow {
  transition: transform 0.3s ease-in-out;
}

.back-home-btn:hover .arrow {
  transform: translateX(4px);
}

.suggestions {
  padding: 24px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.suggestions h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-dark);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestions ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestions a {
  font-size: 14px;
  color: var(--color-primary);
  text-decoration: none;
  transition: all 0.3s ease-in-out;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
}

.suggestions a:hover {
  border-bottom-color: var(--color-primary);
  padding-left: 4px;
}

.not-found-illustration {
  position: relative;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-star,
.floating-diamond,
.floating-sparkle {
  position: absolute;
  font-size: 80px;
  animation: float 3s ease-in-out infinite;
}

.floating-star {
  top: 20px;
  left: 30px;
  animation-delay: 0s;
}

.floating-diamond {
  top: 150px;
  right: 40px;
  font-size: 60px;
  animation-delay: 1s;
}

.floating-sparkle {
  bottom: 40px;
  left: 50%;
  font-size: 50px;
  animation-delay: 0.5s;
}

@media (max-width: 991px) {
  .not-found-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .not-found-icon {
    font-size: 100px;
  }

  .not-found-content h1 {
    font-size: 36px;
  }

  .not-found-illustration {
    height: 200px;
  }

  .floating-star,
  .floating-diamond,
  .floating-sparkle {
    font-size: 60px;
  }

  .floating-diamond {
    font-size: 50px;
  }

  .floating-sparkle {
    font-size: 40px;
  }
}

@media (max-width: 767px) {
  .not-found-page {
    padding-top: 56px;
  }

  .not-found-container {
    padding: 40px 16px;
    gap: 30px;
  }

  .not-found-icon {
    font-size: 80px;
  }

  .not-found-content h1 {
    font-size: 28px;
  }

  .not-found-content p {
    font-size: 14px;
    margin-bottom: 30px;
  }

  .back-home-btn {
    width: 100%;
    justify-content: center;
    margin-bottom: 30px;
  }

  .suggestions {
    padding: 16px;
  }

  .suggestions h3 {
    font-size: 12px;
  }

  .suggestions a {
    font-size: 13px;
  }

  .not-found-illustration {
    height: 150px;
  }

  .floating-star,
  .floating-diamond,
  .floating-sparkle {
    font-size: 40px;
  }

  .floating-diamond {
    font-size: 32px;
  }

  .floating-sparkle {
    font-size: 24px;
  }
}
</style>
