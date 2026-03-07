import { defineStore } from 'pinia';
import { reactive } from 'vue'
import { message } from 'ant-design-vue'
import api from '@/api/index'

export const useShopStore = defineStore('shop', {
  state: () => ({
    shopClass: reactive({}), // 商品分类
    shopInfo: reactive({}), // 商品信息
    pagination: reactive({}) // 分页信息
  }),
  actions: {
    // 获取分类数据
    async getCategories() {
      try {
        let params = {
          tree: true
        }
        const result = await api.getCategories(params)
        if (result.success) {
          Object.assign(this.shopClass, result.data)
        }
      } catch (error) {
        message.warning(error)
      }
    },
    // 获取商品数据
    async getProducts() {
      try {
        let params = {
          in_stock: 'all'
        }
        const result = await api.getProducts(params)
        if (result.success) {
          Object.assign(this.shopInfo, result.data.products)
          Object.assign(this.pagination, result.data.pagination)
        }
      } catch (error) {
        message.warning(error)
      }
    },
    // 初始化
    init() {
      this.getCategories(),
      this.getProducts()
    }
  }
});