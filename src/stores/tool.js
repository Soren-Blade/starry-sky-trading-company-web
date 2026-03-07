import { defineStore } from 'pinia';
import api from '@/api/index'

import { classifyToolsByClass } from '@/hooks/useClass' 

export const useToolStore = defineStore('tool', {
  state: () => ({
    toolData: null || [], // 工具数据
    toolMeta: null || [], // 工具元数据
    activeCategory: 'all', // 当前选中的分类数据
    // 共享苹果ID页
    appleIds: [] // 苹果ID列表
  }),
  actions: {
    // 获取工具列表
    async fetchTools() {
      try {
        const { success, data, meta } = await api.getTools()
        if(success){
          // 新分类数据
          let newToolsClass = classifyToolsByClass(data.tools)
          this.toolData = Object.assign({}, data, newToolsClass)
          this.toolMeta = meta
        }
      } catch (error) {
        console.error('获取工具列表失败:', error)
      }
    },
    // 切换当前分类
    setActiveCategory(category) {
      this.activeCategory = category
    },
    // 获取苹果ID列表
    async fetchAppleIds() {
      try {
        const { success, data, message } = await api.getAppleIds()
        if(success){
          this.appleIds = data
          console.log(`🍎 获取苹果ID列表成功`)
        }
      } catch (error) {
        console.error('获取苹果ID列表失败:', error)
      }
    },
    // 初始化
    init() {
      this.fetchTools()
    }
  }
});