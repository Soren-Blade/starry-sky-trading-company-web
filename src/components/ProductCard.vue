<template>
  <div class="fp-card" @click="onGoDetail" role="button" tabindex="0">
    <div class="fp-media">
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
        <div class="fp-price">¥{{ product.price }}</div>
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
            {{ product.stock_quantity }}
          </div>
          <div class="meta-label">{{ product.stock_status.message }}</div>
        </div>

        <div class="meta-cta">
          <button
            class="cta-btn"
            :disabled="isOut"
            :class="{ disabled: isOut }"
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

const onGoDetail = () => emit("go-detail", props.product);
const onBuy = () => emit("buy", props.product);
</script>

<style scoped>
.fp-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(16, 14, 40, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}
.fp-media {
  position: relative;
  padding-bottom: 58%;
  background: #f2f2f6;
  overflow: hidden;
}
.fp-media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.36s ease;
}
.fp-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 18px 48px rgba(16, 14, 40, 0.12);
}
.fp-card:hover .fp-media img {
  transform: scale(1.04);
}

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
