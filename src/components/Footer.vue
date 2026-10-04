<template>
  <footer class="footer">
    <div class="footer-container">
      <!-- Main Footer Content -->
      <div class="footer-content">
        <!-- About Section -->
        <div class="footer-section about">
          <div class="footer-logo">
            <span class="logo-icon">⭐</span>
            <span class="logo-text">星辰商行</span>
          </div>
          <p class="about-text">
            星辰商行致力于为用户带来精选商品和优质服务。每一件商品都经过严格筛选，确保品质与美学的完美结合。
          </p>
          <div class="social-links">
            <a href="#" class="social-link wechat" aria-label="WeChat" title="微信">📱</a>
            <a href="#" class="social-link qq" aria-label="QQ" title="QQ">💬</a>
            <a href="#" class="social-link weibo" aria-label="Weibo" title="微博">🌍</a>
            <a href="#" class="social-link douyin" aria-label="Douyin" title="抖音">🎵</a>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="footer-divider"></div>

      <!-- Footer Bottom -->
      <div class="footer-bottom">
        <div class="footer-bottom-container">
          <!-- Payment Methods -->
          <div class="payment-methods">
            <span class="method-label">安全支付:</span>
            <span class="payment-icon">💳</span>
            <span class="payment-icon">🏦</span>
            <span class="payment-icon">📱</span>
          </div>

          <!-- Copyright -->
          <p class="copyright">
            © 2024 星辰商行. All rights reserved. | 
            <a href="#">备案号</a> | 
            <a href="#">隐私政策</a>
          </p>

          <!-- Links -->
          <div class="footer-bottom-links">
            <a href="#">平台规则</a>
            <a href="#">诚信声明</a>
            <a href="#">法律声明</a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
// Footer component - no reactive data needed
</script>

<style scoped>
.footer {
  width: 100%;
  background: linear-gradient(
    135deg,
    #2D3436 0%,
    #1a1f23 50%,
    #2D3436 100%
  );
  color: var(--color-border-strong);
  margin-top: 120px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.footer::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(138, 109, 255, 0.1) 0%,
    transparent 70%
  );
  border-radius: 50%;
  pointer-events: none;
}

.footer-container {
  position: relative;
  z-index: 10;
  max-width: 1320px;
  margin: 0 auto;
  padding: 60px 20px;
}

/* Footer Content */
.footer-content {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.footer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* max-width: 400px; */
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 28px;
  animation: float 3s ease-in-out infinite;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.about-text {
  font-size: 13px;
  line-height: 1.6;
  color: #aaa;
  margin-bottom: 16px;
}

.social-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.social-link {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(138, 109, 255, 0.1);
  border-radius: 50%;
  font-size: 20px;
  transition: all 0.3s ease-in-out;
  text-decoration: none;
  color: inherit;
}

.social-link:hover {
  background: var(--gradient-primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(138, 109, 255, 0.3);
}

/* Divider */
.footer-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(138, 109, 255, 0.2) 50%,
    transparent 100%
  );
  margin-bottom: 40px;
}

/* Footer Bottom */
.footer-bottom {
  padding: 20px 0;
  border-radius: 8px;
}

.footer-bottom-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.payment-methods {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #aaa;
}

.method-label {
  font-weight: 600;
}

.payment-icon {
  font-size: 20px;
}

.copyright {
  font-size: 12px;
  color: #aaa;
  margin: 0;
  flex: 1;
  text-align: center;
}

.copyright a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.3s ease-in-out;
}

.copyright a:hover {
  text-decoration: underline;
}

.footer-bottom-links {
  display: flex;
  gap: 20px;
  font-size: 12px;
}

.footer-bottom-links a {
  color: #aaa;
  text-decoration: none;
  transition: all 0.3s ease-in-out;
}

.footer-bottom-links a:hover {
  color: var(--color-primary);
}

/* 响应式设计 */
@media (max-width: 1199px) {
  .footer-container {
    padding: 50px 20px;
  }
}

/*
 * 小屏适配。
 * 合并说明：原先是两个相邻的 `@media (max-width: 991px)` 块，
 * 选择器（.footer-bottom-container / .footer-section）不重叠，合并后层叠结果不变。
 */
@media (max-width: 991px) {
  .footer-bottom-container {
    gap: 15px;
  }

  .footer-section {
    max-width: 100%;
  }
}

@media (max-width: 767px) {
  .footer-container {
    padding: 40px 16px;
  }

  .footer-content {
    margin-bottom: 30px;
  }

  .footer-bottom-container {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .copyright {
    text-align: left;
    order: 1;
  }

  .payment-methods {
    order: 2;
  }

  .footer-bottom-links {
    order: 3;
    width: 100%;
    justify-content: flex-start;
  }

  .social-links {
    gap: 8px;
  }

  .social-link {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
}

@media (max-width: 575px) {
  .footer-container {
    padding: 30px 12px;
  }

  .footer-content {
    gap: 20px;
  }

  .logo-text {
    font-size: 16px;
  }

  .about-text {
    font-size: 12px;
  }

  .payment-methods {
    flex-direction: row;
    gap: 8px;
    width: auto;
    justify-content: flex-start;
  }

  .method-label {
    margin-right: 8px;
  }

  .footer-bottom-links {
    flex-direction: row;
    gap: 12px;
    width: auto;
    flex-wrap: wrap;
  }

  .copyright {
    font-size: 11px;
    text-align: left;
  }
}
</style>
