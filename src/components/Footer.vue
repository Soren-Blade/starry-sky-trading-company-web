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

          <!--
            联系方式行。这里原本是四个社交图标（微信/QQ/微博/抖音），
            每个都指向 `href="#"` —— 点了什么都不发生，而平台也没有这些官方账号。
            编四个假链接比留死链更糟，因此换成真实可用的电话与邮箱：
            `tel:` / `mailto:` 在手机上能直接唤起拨号与写邮件。
          -->
          <ul class="contact-links">
            <li v-for="item in FOOTER.contacts" :key="item.key">
              <a :href="item.href" class="contact-link" :aria-label="item.label">
                <span aria-hidden="true">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            </li>
          </ul>
          <p class="contact-hours">
            {{ FOOTER.hoursLabel }}：{{ CONTACT.hours }}
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
              | <router-link :to="link.to">{{ link.label }}</router-link>
            </template>
          </p>

          <!-- Links -->
          <div class="footer-bottom-links">
            <router-link v-for="link in FOOTER.bottomLinks" :key="link.label" :to="link.to">
              {{ link.label }}
            </router-link>
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
 * 文案（品牌名 / 简介 / 联系方式 / 结算方式 / 版权 / 底部链接）全部取自
 * `constants/content.js` 的 SITE、FOOTER 与 CONTACT，组件只负责结构与样式。
 *
 * 链接全部指向真实路由（`/terms`、`/privacy`、`/rules`、`/about`）或真实协议
 * （`tel:` / `mailto:`）—— 改造前这里 6 个链接都是 `href="#"`。
 */
import { SITE, FOOTER, CONTACT } from '@/constants/content.js';
</script>

<style scoped>
/*
 * 页脚：表面与文字全部走令牌，因此浅色主题是浅底深字、深色主题是深底浅字，
 * 两套都成立，不需要为某个主题写例外。
 * 内边距与分割线间距统一由 --section-gap 派生，移动端整体乘 --mobile-section-scale。
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

/*
 * 联系方式行：与原先的社交圆钮占同样的位置，但每一项都是真实可点的
 * `tel:` / `mailto:`，并按胶囊按钮的尺寸给足可点区域。
 */
.contact-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  height: max(var(--icon-btn-size), var(--avatar-size));
  padding: 0 calc(var(--icon-btn-size) * 0.4);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-footer);
  background: var(--bg-soft);
  /* 描边取 currentColor（= --text-footer）：页脚底色五套各不相同
   * （深底 / 浅底 / 深蓝），只有跟着页脚文字色走才能保证控件始终可见 ——
   * 截图里 tech-minimal 的圆钮原本几乎和页脚糊在一起。 */
  border: var(--stroke-width) solid currentColor;
  border-radius: var(--radius-pill);
  transition:
    background-color var(--transition-interactive),
    color var(--transition-interactive),
    border-color var(--transition-interactive),
    transform var(--transition-interactive);
}

.contact-link:hover {
  color: var(--text-on-accent);
  background: var(--accent);
  border-color: var(--accent);
  transform: translateY(calc(var(--space-unit) * -0.5));
}

.contact-hours {
  margin: calc(var(--space-unit) * 1.5) 0 0;
  font-size: var(--fs-label);
  color: var(--text-footer-muted);
}

/* 分割线：宽度也走描边令牌，neo-brutalism 下自动变粗 */
.footer-divider {
  height: var(--stroke-width);
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

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
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

/* 移动端：页脚留白 ×--mobile-section-scale，两侧内边距再按 ×0.8 收 */
@media (max-width: 767px) {
  .footer-container {
    padding: calc(var(--section-gap) * 0.4 * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .footer-content {
    margin-bottom: calc(var(--section-gap) * 0.3 * var(--mobile-section-scale));
  }

  .footer-divider {
    margin-bottom: calc(var(--section-gap) * 0.3 * var(--mobile-section-scale));
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
    padding: calc(var(--section-gap) * 0.3 * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .contact-links {
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
