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
        /**
         * 当前用户**有效**的工具授权 id 数组。
         *
         * 只存 id 而不是整份授权：工具页判断按钮文案只需要「有没有」，
         * 到期日之类展示在卡密页，不在这里重复。
         *
         * 未登录 / 游客 / 查询失败时为 null（区别于「查到了、结果是空数组」）——
         * 这两种情况对界面含义不同，见 fetchEntitlements。
         * 用数组而不是 Set：Pinia 的 state 保持可序列化，组件里再包成 Set。
         */
        validToolIds: null,
        entitlementsLoading: false,
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

        /**
         * 拉取当前用户的**有效**工具授权。
         *
         * 失败时把 validToolIds 置为 null 而不是空集合 —— 两者对界面含义不同：
         * 空集合是「确定没有授权」（按钮显示「立即激活」），
         * null 是「不知道」（此时不该显示任何需要卡密的判断，避免把已付费用户
         * 误导到激活页）。因此失败要保留 null。
         */
        async fetchEntitlements() {
            this.entitlementsLoading = true
            try {
                const { success, data, message } = await api.getMyEntitlements()
                if (!success) {
                    throw new Error(message || '获取工具授权失败')
                }
                const ids = Array.isArray(data?.valid_tool_ids) ? data.valid_tool_ids : []
                this.validToolIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)))]
                return true
            } catch (error) {
                this.validToolIds = null
                // 不弹 toast：工具页在授权查询失败时仍应正常展示目录，
                // 只是需要卡密的工具一律按「未激活」呈现（按钮指向激活页，点进去能自助解决）
                console.warn('获取工具授权失败:', error.message)
                return false
            } finally {
                this.entitlementsLoading = false
            }
        },

        /** 清空授权状态（退出登录 / 退出游客时调用，避免把上一个账号的授权留给下一个人） */
        clearEntitlements() {
            this.validToolIds = null
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
