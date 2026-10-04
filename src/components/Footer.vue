<template>
  <footer class="footer">
    <div class="footer-container">
      <!-- 品牌与简介：文案来自 constants/content.js，改文案不必碰组件 -->
      <div class="footer-content">
        <div class="footer-section about">
          <div class="footer-logo">
            <span class="logo-icon" aria-hidden="true">{{ SITE.logo }}</span>
            <span class="logo-text">{{ SITE.name }}</span>
          </div>
          <p class="about-text">{{ FOOTER.about }}</p>
          <div class="social-links">
            <a
              v-for="item in FOOTER.socials"
              :key="item.key"
              href="#"
              class="social-link"
              :aria-label="item.label"
              :title="item.label"
            >
              <span aria-hidden="true">{{ item.icon }}</span>
            </a>
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
            <span class="method-label">{{ FOOTER.paymentLabel }}</span>
            <span
              v-for="(icon, index) in FOOTER.paymentIcons"
              :key="index"
              class="payment-icon"
              aria-hidden="true"
            >
              {{ icon }}
            </span>
          </div>

          <!-- Copyright -->
          <p class="copyright">
            {{ FOOTER.copyright }}
            <template v-for="link in FOOTER.legalLinks" :key="link.label">
              | <a :href="link.href">{{ link.label }}</a>
            </template>
          </p>

          <!-- Links -->
          <div class="footer-bottom-links">
            <a v-for="link in FOOTER.bottomLinks" :key="link.label" :href="link.href">
              {{ link.label }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
/**
 * 页脚
 *
 * 文案（品牌名 / 简介 / 社交 / 支付 / 版权 / 底部链接）全部取自
 * `constants/content.js` 的 SITE 与 FOOTER，组件只负责结构与样式。
 */
import { SITE, FOOTER } from '@/constants/content.js';
</script>

<style scoped>
/*
 * 页脚：表面与文字全部走令牌，因此浅色主题是浅底深字、深色主题是深底浅字，
 * 两套都成立，不需要为某个主题写例外。
 */
.footer {
  width: 100%;
  margin-top: var(--section-gap);
  color: var(--text-footer);
  background: var(--bg-footer);
  /* 玻璃主题的页脚是半透明表面，需要同一套磨砂令牌才不会糊成一片灰 */
  backdrop-filter: var(--effect-backdrop);
  -webkit-backdrop-filter: var(--effect-backdrop);
}

.footer-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: calc(var(--section-gap) * 0.6) var(--container-padding);
}

.footer-content {
  display: flex;
  justify-content: center;
  margin-bottom: calc(var(--section-gap) * 0.4);
}

.footer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: var(--container-narrow);
  text-align: center;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
  margin-bottom: calc(var(--space-unit) * 2);
}

/* 装饰性浮动：无装饰动效的主题该令牌为 none */
.logo-icon {
  font-size: calc(var(--fs-h3) * 1.4);
  animation: var(--decor-animation);
}

.logo-text {
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  color: var(--text-footer);
}

.about-text {
  margin-bottom: calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-footer-muted);
}

.social-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
}

/* 图标按钮：尺寸用 em 从 --fs-h3 派生（默认即 40px），
 * 字号微调或换主题时同步缩放，不必为小屏再写一套尺寸 */
.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
  font-size: var(--fs-h3);
  color: var(--text-footer);
  background: var(--bg-soft);
  border-radius: var(--radius-pill);
  transition:
    background-color var(--transition-interactive),
    color var(--transition-interactive),
    transform var(--transition-interactive);
}

.social-link:hover {
  color: var(--text-on-accent);
  background: var(--accent);
  transform: translateY(calc(var(--space-unit) * -0.5));
}

.footer-divider {
  height: 1px;
  margin-bottom: calc(var(--section-gap) * 0.4);
  background: var(--divider);
}

.footer-bottom {
  padding: calc(var(--space-unit) * 2.5) 0;
}

.footer-bottom-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 2.5);
}

.payment-methods {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  font-size: var(--fs-label);
  color: var(--text-footer-muted);
}

.method-label {
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
}

.payment-icon {
  font-size: var(--fs-h3);
}

.copyright {
  flex: 1;
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-footer-muted);
  text-align: center;
}

.copyright a,
.footer-bottom-links a {
  color: var(--accent);
  transition: color var(--transition-interactive);
}

.copyright a:hover,
.footer-bottom-links a:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

.footer-bottom-links {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 2.5);
  font-size: var(--fs-label);
}

/* 响应式：断点统一用 1199 / 991 / 767 / 575，间距按密度令牌收放 */
@media (max-width: 1199px) {
  .footer-container {
    padding: calc(var(--section-gap) * 0.5) var(--container-padding);
  }
}

@media (max-width: 991px) {
  .footer-bottom-container {
    gap: calc(var(--space-unit) * 2);
  }
}

@media (max-width: 767px) {
  .footer-container {
    padding: calc(var(--section-gap) * 0.4) var(--container-padding);
  }

  .footer-content {
    margin-bottom: calc(var(--section-gap) * 0.3);
  }

  .footer-bottom-container {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 2);
  }

  .copyright {
    order: 1;
    text-align: left;
  }

  .payment-methods {
    order: 2;
  }

  .footer-bottom-links {
    order: 3;
  }
}

@media (max-width: 575px) {
  .footer-container {
    padding: calc(var(--section-gap) * 0.3) calc(var(--container-padding) * 0.6);
  }

  .social-links {
    gap: var(--space-unit);
  }

  .payment-methods {
    gap: var(--space-unit);
  }

  .footer-bottom-links {
    gap: calc(var(--space-unit) * 1.5);
  }
}
</style>
