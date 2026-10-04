<template>
  <div
    class="fp-card ui-card ui-card-interactive"
    role="link"
    tabindex="0"
    :aria-label="`查看商品 ${product.main_title || product.name}`"
    @click="onGoDetail"
    @keydown.enter.prevent="onGoDetail"
    @keydown.space.prevent="onGoDetail"
  >
    <div class="fp-media ui-card-media">
      <img
        :src="product.main_image_url || product.image"
        :alt="product.main_title || product.name"
      />
    </div>

    <div class="fp-body">
      <div class="fp-head-row">
        <div>
          <div class="fp-title" :title="product.main_title || product.name">
            {{ product.main_title || product.name }}
          </div>
          <div class="fp-sub">
            {{
              product.sub_title ||
              product.author ||
              product.seller ||
              "星辰商行"
            }}
          </div>
        </div>
        <div class="fp-price">{{ formatPrice(product.price) }}</div>
      </div>

      <div class="fp-meta">
        <div class="meta-item">
          <div class="meta-num">
            {{
              formatReviewCount(
                product.viewCount ??
                  product.reviewCount ??
                  product.view_count ??
                  0
              )
            }}
          </div>
          <div class="meta-label">浏览</div>
        </div>
        <div class="meta-item">
          <div class="meta-num">
            {{
              formatReviewCount(
                product.sales_count ?? product.sales ?? product.sold ?? 0
              )
            }}
          </div>
          <div class="meta-label">销量</div>
        </div>
        <div class="meta-item">
          <div class="meta-num" :class="{ out: isOut }">
            {{ product.stock_quantity ?? 0 }}
          </div>
          <!-- stock_status 来自后端计算，这里做缺失兜底，避免直接取 .message 崩溃 -->
          <div class="meta-label">{{ stockLabel }}</div>
        </div>

        <div class="meta-cta">
          <button
            class="cta-btn"
            :disabled="isOut"
            :class="{ disabled: isOut }"
            :aria-label="isOut ? '该商品缺货' : `购买 ${product.main_title || product.name}`"
            @click.stop="onBuy"
          >
            {{ isOut ? "缺货" : "购买" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { formatUtils } from "@/utils";

const props = defineProps({
  product: { type: Object, required: true },
});
const emit = defineEmits(["go-detail", "buy"]);

const formatReviewCount = formatUtils.formatReviewCount;
const formatPrice = formatUtils.formatPrice;

const parseStockRaw = (p) =>
  p.stock_quantity ?? p.stock ?? p.stockCount ?? p.stock_count ?? null;
const parseStockNumber = (p) => {
  const raw = parseStockRaw(p);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const isOut = computed(() => {
  const n = parseStockNumber(props.product);
  if (n === 0) return true;
  if (n > 0) return false;
  if (
    "is_in_stock" in props.product &&
    typeof props.product.is_in_stock === "boolean"
  )
    return !props.product.is_in_stock;
  return false;
});

// stock_status 由后端计算，缺失时兜底，避免模板直接取 .message 抛错
const stockLabel = computed(() => props.product.stock_status?.message || "库存");

const onGoDetail = () => emit("go-detail", props.product);
const onBuy = () => emit("buy", props.product);
</script>

<style scoped>
/* 外壳（背景/圆角/阴影/hover 位移）来自 global.css 的 .ui-card 与 .ui-card-media，
   这里只保留商品卡特有的内部布局 */
.fp-body {
  padding: 16px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fp-title {
  font-size: 16px;
  font-weight: 700;
  color: #222;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fp-sub {
  font-size: 12px;
  color: #999;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fp-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  max-height: 44px;
  overflow: hidden;
}

.fp-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.fp-price {
  font-size: 20px;
  color: #000000;
  padding: 6px 10px;
  border-radius: 10px;
}

.fp-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}
.meta-item {
  display: flex;
  flex-direction: column;
}
.meta-num {
  font-weight: 700;
  color: #111;
}
.meta-label {
  font-size: 12px;
  color: #999;
}
.meta-cta {
  margin-left: auto;
}
.cta-btn {
  background: linear-gradient(90deg, #8a6dff, #6c5ce7);
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}
.cta-btn.disabled,
.cta-btn:disabled {
  background: linear-gradient(90deg, #e0e0e6, #d8d6e8);
  color: #9a98a8;
  cursor: not-allowed;
}

.meta-num.out {
  color: #d9534f;
  font-weight: 800;
}

/* @media (max-width:767px) {
  .fp-head-row { flex-direction:column; align-items:flex-start; }
  .fp-price { align-self:flex-end; margin-top:8px; }
} */
</style>
