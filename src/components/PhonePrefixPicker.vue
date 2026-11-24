<template>
  <div class="phone-prefix">
    <button
      ref="triggerRef"
      type="button"
      class="phone-prefix__trigger"
      :aria-label="PAGES.profile.phonePrefixChange"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      aria-controls="phone-prefix-panel"
      @click="toggle"
      @keydown.down.prevent="openPanel"
      @keydown.enter.prevent="openPanel"
      @keydown.space.prevent="openPanel"
    >
      <span class="phone-prefix__dial">{{ modelValue }}</span>
      <AppIcon name="chevron-down" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        id="phone-prefix-panel"
        ref="panelRef"
        class="phone-prefix__panel"
        :style="panelStyle"
        role="dialog"
        :aria-label="PAGES.profile.phoneCountryLabel"
      >
        <div class="phone-prefix__search-wrap">
          <AppIcon name="search" aria-hidden="true" />
          <input
            ref="searchRef"
            v-model="query"
            class="phone-prefix__search"
            type="search"
            autocomplete="off"
            :placeholder="PAGES.profile.phoneCountrySearch"
            :aria-label="PAGES.profile.phoneCountrySearch"
            aria-controls="phone-prefix-list"
            :aria-activedescendant="activeId"
            @keydown.esc.prevent="closeAndFocus"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="chooseActive"
          />
        </div>

        <ul id="phone-prefix-list" class="phone-prefix__list" role="listbox">
          <li
            v-for="(country, index) in filtered"
            :id="`phone-prefix-option-${country.iso}`"
            :key="country.iso"
            role="option"
            class="phone-prefix__item"
            :class="{
              'is-active': index === activeIndex,
              'is-selected': country.dial === modelValue,
              'is-disabled': !country.supported,
            }"
            :aria-selected="country.dial === modelValue ? 'true' : 'false'"
            :aria-disabled="country.supported ? 'false' : 'true'"
            @mousemove="activeIndex = index"
            @click="select(country)"
          >
            <span class="phone-prefix__name">{{ countryName(country, locale) }}</span>
            <span class="phone-prefix__code">{{ country.dial }}</span>
            <span v-if="!country.supported" class="phone-prefix__soon">
              {{ PAGES.profile.phoneCountryComingSoon }}
            </span>
          </li>
        </ul>

        <p v-if="!filtered.length" class="phone-prefix__empty">
          {{ PAGES.profile.phoneCountryEmpty }}
        </p>
        <p class="phone-prefix__note">{{ PAGES.profile.phoneCountryNote }}</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * 手机号地区代码选择器
 *
 * 触发器就是 `.profile-phone-group` 的左侧前缀块：显示当前区号 + 下折角。
 * 面板 teleport 到 body 并用 fixed 定位 —— 它要开在「编辑资料」弹层里，
 * 而弹层本身 `overflow-y: auto`，留在弹层内部会被滚出边界裁掉（生日日历踩过同一条坑）。
 *
 * 数据与保存边界：面板列出多个地区，但只有 `supported` 的条目可点；
 * 后端与校验目前仍只接受大陆 11 位号码，其他地区标注「即将支持」并置灰，
 * 避免让用户以为自己选完就能存一个海外号码。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { PAGES } from '@/constants'
import { useClickOutside } from '@/hooks/useClickOutside'
import { getLocale } from '@/i18n'
import { countryName, filterPhoneCountries } from '@/constants/phoneCountries'

const props = defineProps({
  /** 当前区号，如 `+86` */
  modelValue: { type: String, default: '+86' },
})

const emit = defineEmits(['update:modelValue'])

const locale = computed(() => getLocale())
const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const panelStyle = ref({})
const triggerRef = ref(null)
const panelRef = ref(null)
const searchRef = ref(null)

const filtered = computed(() => filterPhoneCountries(query.value, locale.value))

const activeId = computed(() => {
  const country = filtered.value[activeIndex.value]
  return country ? `phone-prefix-option-${country.iso}` : undefined
})

watch(query, () => {
  activeIndex.value = 0
})

/** 触发器矩形 + 面板实测尺寸 → fixed 坐标；空间不够就向上翻，绝不越出视口 */
const updatePosition = () => {
  const trigger = triggerRef.value
  if (!open.value || !trigger) return
  const rect = trigger.getBoundingClientRect()
  const panel = panelRef.value
  const panelWidth = panel?.offsetWidth || 288
  const panelHeight = panel?.offsetHeight || 320
  const gap = 6
  const edge = 8
  const viewportWidth = window.innerWidth || 0
  const viewportHeight = window.innerHeight || 0

  const left = Math.min(
    Math.max(edge, rect.left),
    Math.max(edge, viewportWidth - panelWidth - edge),
  )
  let top = rect.bottom + gap
  if (top + panelHeight > viewportHeight - edge && rect.top - gap - panelHeight > edge) {
    top = rect.top - gap - panelHeight
  }
  top = Math.min(Math.max(edge, top), Math.max(edge, viewportHeight - panelHeight - edge))

  panelStyle.value = { top: `${top}px`, left: `${left}px` }
}

const onViewportChange = () => updatePosition()

const openPanel = async () => {
  if (open.value) return
  open.value = true
  query.value = ''
  const selected = filtered.value.findIndex((country) => country.dial === props.modelValue)
  activeIndex.value = selected >= 0 ? selected : 0
  await nextTick()
  updatePosition()
  searchRef.value?.focus()
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
}

const close = ({ restoreFocus = true } = {}) => {
  if (!open.value) return
  open.value = false
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  if (restoreFocus) triggerRef.value?.focus()
}

const closeAndFocus = () => close()

const toggle = () => {
  if (open.value) close()
  else openPanel()
}

const select = (country) => {
  if (!country?.supported) return
  emit('update:modelValue', country.dial)
  close()
}

const move = (step) => {
  const total = filtered.value.length
  if (!total) return
  activeIndex.value = (activeIndex.value + step + total) % total
}

const chooseActive = () => {
  const country = filtered.value[activeIndex.value]
  if (country) select(country)
}

useClickOutside(triggerRef, () => close({ restoreFocus: false }), {
  alsoInside: [panelRef],
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<style scoped>
.phone-prefix {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
}

/* 前缀本身就是触发器：高度跟输入框一致，右侧一条分隔线把「区号 / 号码」分开 */
.phone-prefix__trigger {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  height: 100%;
  padding: 0 calc(var(--space-unit) * 1.25);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  background: var(--bg-soft);
  border: 0;
  border-right: var(--stroke-width) solid var(--divider);
  cursor: pointer;
  transition:
    color var(--transition-interactive),
    background-color var(--transition-interactive);
}

.phone-prefix__trigger:hover {
  color: var(--text-primary);
}

.phone-prefix__trigger:focus-visible {
  outline: 2px solid var(--ec-border-focus);
  outline-offset: -2px;
}

.phone-prefix__trigger .app-icon {
  font-size: var(--fs-label);
  opacity: 0.72;
}

.phone-prefix__panel {
  position: fixed;
  z-index: var(--ec-z-tooltip, 600);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 288px;
  max-width: calc(100vw - 16px);
  padding: var(--dropdown-padding-y) 0 0;
  background: var(--bg-elevated);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--dropdown-radius);
  box-shadow: var(--shadow-float);
}

.phone-prefix__search-wrap {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0 calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 0.75);
  padding: 0 calc(var(--space-unit) * 1.25);
  color: var(--text-muted);
  background: var(--bg-soft);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-pill);
}

.phone-prefix__search-wrap:focus-within {
  border-color: var(--ec-border-focus);
  box-shadow: var(--focus-ring);
}

.phone-prefix__search-wrap .app-icon {
  flex: 0 0 auto;
  font-size: var(--fs-label);
}

.phone-prefix__search {
  flex: 1 1 auto;
  min-width: 0;
  height: calc(var(--ec-control-h-md) - 4px);
  font-family: var(--font-body);
  font-size: var(--fs-label);
  color: var(--text-primary);
  background: transparent;
  border: 0;
  outline: none;
}

.phone-prefix__search::placeholder {
  color: var(--placeholder);
}

.phone-prefix__list {
  max-height: 264px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.phone-prefix__item {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  min-height: var(--dropdown-item-height);
  padding: 0 var(--dropdown-item-padding-x);
  font-size: var(--dropdown-item-font-size);
  color: var(--text-secondary);
  border-left: var(--dropdown-active-bar) solid transparent;
  cursor: pointer;
}

.phone-prefix__item.is-active {
  background: var(--bg-soft);
}

.phone-prefix__item.is-selected {
  color: var(--accent);
  border-left-color: var(--accent);
}

.phone-prefix__item.is-disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.phone-prefix__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-prefix__code {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-variant-numeric: tabular-nums;
}

.phone-prefix__soon {
  padding: 0 calc(var(--space-unit) * 0.5);
  font-size: var(--fs-label);
  color: var(--text-muted);
  border: var(--stroke-width) solid var(--divider);
  border-radius: var(--radius-pill);
}

.phone-prefix__empty {
  margin: 0;
  padding: calc(var(--space-unit) * 2) var(--dropdown-item-padding-x);
  font-size: var(--fs-label);
  color: var(--text-muted);
  text-align: center;
}

.phone-prefix__note {
  margin: 0;
  padding: calc(var(--space-unit) * 0.75) var(--dropdown-item-padding-x);
  font-size: var(--fs-label);
  color: var(--text-muted);
  background: var(--bg-soft);
  border-top: var(--stroke-width) solid var(--divider);
}
</style>
