import { defineStore } from 'pinia'
import api from '@/api/index'
import { classifyToolsByClass } from '@/hooks/useClass'

/**
 * 工具目录与共享 Apple ID
 *
 * 原实现的 toolData 形状是未定义的（初始化为 [] 却到处当对象用），
 * 这里把形状固定下来：{ tools, classes, classified, pagination, filters }。
 */
export const useToolStore = defineStore('tool', {
    state: () => ({
        toolData: {
            tools: [],
            classes: [],
            classified: {},
            pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
            filters: {},
        },
        activeCategory: 'all',
        /** 共享 Apple ID：后端返回 { nanoCloud: [], fangQiangNan: [] } */
        appleIds: { nanoCloud: [], fangQiangNan: [] },
        toolsLoading: false,
        toolsError: null,
        appleIdsLoading: false,
        appleIdsError: null,
    }),

    getters: {
        /** 所有工具（扁平） */
        allTools: (state) => state.toolData.tools || [],
        /** 分类列表 */
        toolClasses: (state) => state.toolData.classes || [],
        /** Apple ID 总数 */
        appleIdCount: (state) =>
            (state.appleIds.nanoCloud?.length || 0) + (state.appleIds.fangQiangNan?.length || 0),
    },

    actions: {
        /** 获取工具列表并完成分类 */
        async fetchTools(params = {}) {
            this.toolsLoading = true
            this.toolsError = null
            try {
                const { success, data, meta, message } = await api.getTools(params)
                if (!success) {
                    throw new Error(message || '获取工具列表失败')
                }
                const tools = data?.tools ?? []
                // classifyToolsByClass 会返回 { classified, classes }
                const classifiedResult = classifyToolsByClass(tools)

                this.toolData = {
                    tools,
                    classes: classifiedResult.classes ?? [],
                    classified: classifiedResult.classified ?? {},
                    pagination: data?.pagination ?? this.toolData.pagination,
                    filters: data?.filters ?? {},
                    meta: meta ?? null,
                }
                return true
            } catch (error) {
                this.toolsError = error.message
                console.warn('获取工具列表失败:', error.message)
                return false
            } finally {
                this.toolsLoading = false
            }
        },

        /** 切换当前分类（统一入口，避免组件直接改 state） */
        setActiveCategory(category) {
            this.activeCategory = category
        },

        /** 获取共享 Apple ID 列表 */
        async fetchAppleIds() {
            this.appleIdsLoading = true
            this.appleIdsError = null
            try {
                const { success, data, message } = await api.getAppleIds()
                if (!success) {
                    throw new Error(message || '获取 Apple ID 列表失败')
                }
                this.appleIds = {
                    nanoCloud: data?.nanoCloud ?? [],
                    fangQiangNan: data?.fangQiangNan ?? [],
                }
                return true
            } catch (error) {
                this.appleIdsError = error.message
                this.appleIds = { nanoCloud: [], fangQiangNan: [] }
                console.warn('获取 Apple ID 列表失败:', error.message)
                return false
            } finally {
                this.appleIdsLoading = false
            }
        },

        /** 初始化工具页数据 */
        async init() {
            return this.fetchTools()
        },
    },
})
