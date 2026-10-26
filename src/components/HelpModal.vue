<template>
  <!--
    按设计系统 §8.3 的弹层选择：这里不需要用户当场决策，但内容要能回看，
    属于「留存」类；说明 + 步骤 + 联系方式是一段较长的文档，
    所以用 Drawer（右侧 480，内容区可整段滚动）而不是 Dialog。
  -->
  <div class="ec-overlay" @click.self="$emit('close')">
    <aside
      ref="modalRef"
      class="ec-drawer help-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div class="ec-drawer__head">
        <h2 id="help-modal-title" class="help-drawer-title">{{ title }}</h2>

        <button type="button" class="ec-icon-btn" aria-label="关闭弹窗" @click="$emit('close')">
          <AppIcon name="x" />
        </button>
      </div>

      <div class="ec-drawer__body help-body">
        <p v-if="intro" class="help-intro">{{ intro }}</p>

        <ol v-if="steps && steps.length" class="help-steps">
          <li v-for="(step, index) in steps" :key="index" class="help-step">
            <span class="help-step-index" aria-hidden="true">{{ index + 1 }}</span>
            <span>{{ step }}</span>
          </li>
        </ol>

        <!-- 联系方式来自 constants/CONTACT，与页脚、关于我们共用一份，
             不在这里再抄一遍邮箱地址 -->
        <dl class="help-contact">
          <div class="help-contact-row">
            <dt><AppIcon name="phone" /> 客服电话</dt>
            <dd><a :href="CONTACT.telHref">{{ CONTACT.phone }}</a></dd>
          </div>
          <div class="help-contact-row">
            <dt><AppIcon name="mail" /> 客服邮箱</dt>
            <dd><a :href="CONTACT.mailtoHref">{{ CONTACT.email }}</a></dd>
          </div>
          <div class="help-contact-row">
            <dt><AppIcon name="clock" /> 服务时间</dt>
            <dd>{{ CONTACT.hours }}</dd>
          </div>
        </dl>
      </div>

      <div class="ec-drawer__foot">
        <!-- 客服中心对游客开放（`/support` 没有 requiresAuth），所以这个入口
             不需要先登录 —— 弹窗里说「请联系客服」，就得给一个真能到达的地方 -->
        <router-link v-if="feedback" to="/support" class="u-btn-secondary" @click="$emit('close')">
          去提交反馈
        </router-link>
        <router-link to="/about" class="u-btn-secondary" @click="$emit('close')">
          查看关于我们
        </router-link>
        <button type="button" class="u-btn-primary" @click="$emit('close')">我知道了</button>
      </div>
    </aside>
  </div>
</template>

<script setup>
/**
 * 通用「说明 + 联系方式」弹窗
 *
 * 目前两处用它：
 *   1. 登录弹窗里的「忘记密码?」—— 平台没有邮件/短信服务，无法自助重置；
 *   2. 「联系客服」入口。
 *
 * 为什么不是一句「请联系客服」了事：那样用户仍然不知道该找谁、怎么找。
 * 这里把**可点的电话与邮箱**（`tel:` / `mailto:`，手机可直接唤起）摆出来，
 * 并说明自助重置为什么不可用 —— 这是能给的、诚实的答案。
 * 底部的「去提交反馈」再往前一步：`/support` 对游客开放，用户看完说明
 * 可以立刻把问题写下来（`feedback` 属性默认开启，见 defineProps 的注释）。
 *
 * 无障碍：模态约定（Escape / 焦点陷阱 / 焦点归还 / 滚动锁定）走
 * `useModalA11y`，与 LoginModal 是同一份实现。
 */
import AppIcon from '@/components/AppIcon.vue'
import { useModalA11y } from '@/hooks/useModalA11y'
import { CONTACT } from '@/constants/index.js'

defineProps({
  /** 弹窗标题，同时作为 aria-labelledby 指向的可见标题 */
  title: { type: String, required: true },
  /** 开头的说明段落 */
  intro: { type: String, default: '' },
  /** 编号步骤（可选） */
  steps: { type: Array, default: () => [] },
  /**
   * 是否显示「去提交反馈」入口（默认显示）
   *
   * 弹窗里写着「请联系客服」，如果只给电话与邮箱，用户还得自己找一圈；
   * 客服中心是站内的闭环通道（游客也能用），所以默认就摆出来。
   * 需要纯说明的场景（例如未来某个只讲规则、不引导提问的弹窗）可以关掉。
   */
  feedback: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

const { modalRef } = useModalA11y({ close: () => emit('close') })
</script>

<style scoped>
/*
 * 外壳（遮罩、抽屉定位、宽度、内边距、滚动、关闭按钮）全部来自设计系统的
 * `.ec-overlay` / `.ec-drawer` / `.ec-drawer__head|body|foot` / `.ec-icon-btn`，
 * 与明暗两套自动同步；这里只保留本抽屉特有的内部排布。
 */

.help-drawer-title {
  margin: 0;
  font-size: var(--ec-h3-size);
  font-weight: 600;
  color: var(--ec-text-primary);
}

.help-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2.5);
}

.help-intro {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.help-steps {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: help-step;
}

.help-step {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.25);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 序号做成等宽数字的小圆片：读起来像操作步骤而不是一段散文 */
.help-step-index {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 2.5);
  height: calc(var(--space-unit) * 2.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  color: var(--text-on-accent);
  background: var(--accent);
  border-radius: var(--radius-pill);
}

/* 联系方式：标签 + 值的对照表，与 About 页的联系方式表同构 */
.help-contact {
  display: flex;
  flex-direction: column;
  margin: 0;
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.help-contact-row {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
}

.help-contact-row + .help-contact-row {
  border-top: var(--stroke-width) solid var(--divider);
}

.help-contact-row dt {
  flex-shrink: 0;
  min-width: calc(var(--space-unit) * 10);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.help-contact-row dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-primary);
}

.help-contact-row a {
  color: var(--accent);
  transition: color var(--transition-interactive);
}

.help-contact-row a:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

@media (max-width: 575px) {
  .help-contact-row {
    flex-direction: column;
    gap: calc(var(--space-unit) * 0.5);
  }

  .help-contact-row dt {
    min-width: 0;
  }
}
</style>
