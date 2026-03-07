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
            星辰商行致力于为用户带来精选商品和优质服务。<br />
            每一件商品都经过严格筛选，确保品质与美学的完美结合。
          </p>
          <div class="social-links">
            <a href="#" class="social-link wechat" aria-label="WeChat" title="微信">📱</a>
            <a href="#" class="social-link qq" aria-label="QQ" title="QQ">💬</a>
            <a href="#" class="social-link weibo" aria-label="Weibo" title="微博">🌍</a>
            <a href="#" class="social-link douyin" aria-label="Douyin" title="抖音">🎵</a>
          </div>
        </div>

        <!-- Help Section -->
        <div class="footer-section links">
          <h4 class="section-title">帮助中心</h4>
          <ul class="link-list">
            <li><a href="#">常见问题</a></li>
            <li><a href="#">联系我们</a></li>
            <li><a href="#">在线客服</a></li>
            <li><a href="#">反馈建议</a></li>
          </ul>
        </div>

        <!-- Service Section -->
        <div class="footer-section links">
          <h4 class="section-title">服务</h4>
          <ul class="link-list">
            <li><a href="#">关于我们</a></li>
            <li><a href="#">配送说明</a></li>
            <li><a href="#">退货政策</a></li>
            <li><a href="#">售后服务</a></li>
          </ul>
        </div>

        <!-- Community Section -->
        <div class="footer-section links">
          <h4 class="section-title">社区</h4>
          <ul class="link-list">
            <li><a href="#">用户协议</a></li>
            <li><a href="#">隐私政策</a></li>
            <li><a href="#">商务合作</a></li>
            <li><a href="#">加入我们</a></li>
          </ul>
        </div>

        <!-- Contact Section -->
        <div class="footer-section contact">
          <h4 class="section-title">联系我们</h4>
          <p class="contact-info">
            📍 地址：中国 北京市 朝阳区<br />
            📞 电话：400-800-8888<br />
            ✉️ 邮箱：service@starrysky.com<br />
            🕐 服务时间：9:00 - 22:00
          </p>
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
  color: #ddd;
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
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-section {
  display: flex;
  flex-direction: column;
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

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
}

.link-list a {
  font-size: 13px;
  color: #aaa;
  text-decoration: none;
  transition: all 0.3s ease-in-out;
  position: relative;
}

.link-list a::before {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--gradient-primary);
  transition: width 0.3s ease-in-out;
}

.link-list a:hover {
  color: var(--color-primary);
}

.link-list a:hover::before {
  width: 100%;
}

.contact-info {
  font-size: 12px;
  line-height: 1.8;
  color: #aaa;
  margin: 0;
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
  .footer-content {
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
  }

  .footer-container {
    padding: 50px 20px;
  }
}

@media (max-width: 991px) {
  .footer-content {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }

  .section-title {
    font-size: 13px;
  }

  .link-list a {
    font-size: 12px;
  }

  .contact-info {
    font-size: 11px;
  }
}

@media (max-width: 767px) {
  .footer-container {
    padding: 40px 16px;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 30px;
    margin-bottom: 30px;
  }

  .footer-bottom-container {
    flex-direction: column;
    gap: 16px;
  }

  .copyright {
    text-align: left;
  }

  .footer-bottom-links {
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

  .section-title {
    font-size: 12px;
  }

  .logo-text {
    font-size: 16px;
  }

  .about-text {
    font-size: 12px;
  }

  .link-list a {
    font-size: 11px;
  }

  .contact-info {
    font-size: 10px;
  }

  .payment-methods {
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .method-label {
    width: 100%;
  }

  .footer-bottom-links {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .copyright {
    font-size: 11px;
  }
}
</style>
