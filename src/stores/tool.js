import { defineStore } from 'pinia'
import api from '@/api/index'
import { classifyToolsByClass } from '@/hooks/useClass'

/**
 * 工具目录聚合分页的取数上限。
 *
 * 后端 getTools 的单页上限就是 100（超过会被截到 100），因此第一页按 100 取。
 * 页数与条数是**防御性**硬上限：`has_next` 由后端计算，一旦它恒为 true
 * （分页字段被代理改写、后端 bug，或将来换成别的分页语义），
 * 没有上限的循环会一直发请求，把标签页拖死。当前目录只有 37 条，
 * 10 页 × 100 条远高于真实规模 —— 触顶说明数据异常，而不是目录变大了。
 */
const TOOL_FETCH_PAGE_SIZE = 100
const TOOL_FETCH_MAX_PAGES = 10
const TOOL_FETCH_MAX_TOOLS = 1000

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
        /**
         * 获取工具列表并完成分类。
         *
         * `/tool` 页要做全目录的分类计数、分类筛选和搜索，因此默认必须拿到**全部**工具：
         * 后端 getTools 的默认 limit 是 20，只取第一页会让左轨计数、分类与搜索
         * 只覆盖前 20 条（37 条目录里另外 17 条既看不见也搜不到）。
         * 这里先按后端上限 100 取第一页，再顺着 `has_next` 把余下的页拼起来。
         *
         * 外部显式传 page / limit 时按调用方给的分页语义执行、**不做聚合** ——
         * 搜索页 / 首页热门工具各自只需要一页，替它们取全量会改变返回条数与加载成本。
         */
        async fetchTools(params = {}) {
            this.toolsLoading = true
            this.toolsError = null
            try {
                const externallyPaged = params.page !== undefined || params.limit !== undefined
                const firstParams = externallyPaged
                    ? { ...params }
                    : { ...params, limit: TOOL_FETCH_PAGE_SIZE }

                const firstResponse = await api.getTools(firstParams)
                if (!firstResponse.success) {
                    throw new Error(firstResponse.message || '获取工具列表失败')
                }

                const firstData = firstResponse.data
                // 先累加到局部数组、所有页都成功后才写 store：
                // 中途失败时保留上一次成功的目录，而不是让界面看到半份列表
                const tools = [...(firstData?.tools ?? [])]
                const serverPagination = firstData?.pagination
                let hasNext = serverPagination?.has_next === true

                if (!externallyPaged) {
                    let page = 1
                    // 任一条件触发就停：页数上限、条数上限（防 has_next 恒真导致死循环），
                    // 以及后端返回空页（has_next 与实际数据矛盾时不再空转）
                    while (hasNext && page < TOOL_FETCH_MAX_PAGES && tools.length < TOOL_FETCH_MAX_TOOLS) {
                        page += 1
                        const nextResponse = await api.getTools({
                            ...params,
                            page,
                            limit: TOOL_FETCH_PAGE_SIZE,
                        })
                        if (!nextResponse.success) {
                            throw new Error(nextResponse.message || '获取工具列表失败')
                        }

                        const nextTools = nextResponse.data?.tools ?? []
                        if (nextTools.length === 0) break

                        tools.push(...nextTools)
                        hasNext = nextResponse.data?.pagination?.has_next === true
                    }
                }

                // classifyToolsByClass 会返回 { classified, classes }
                const classifiedResult = classifyToolsByClass(tools)
                const total = Number(serverPagination?.total)

                this.toolData = {
                    tools,
                    classes: classifiedResult.classes ?? [],
                    classified: classifiedResult.classified ?? {},
                    // 聚合后整份目录等价于「第 1 页」：page / total_pages 固定为 1，
                    // limit 取实际合并条数，total 仍用后端给的真实总数 ——
                    // 调用方既知道当前拿到了多少条，也知道目录一共有多少条。
                    // 外部显式分页时原样透传后端分页信息，不篡改调用方的语义。
                    // 后端整份响应都没带 pagination 时没有可用的 total：
                    // 保持上一次的分页信息，而不是编造 total=0 覆盖掉它。
                    pagination: externallyPaged
                        ? (serverPagination ?? this.toolData.pagination)
                        : serverPagination
                            ? {
                                page: 1,
                                limit: tools.length,
                                total: Number.isFinite(total) ? total : tools.length,
                                total_pages: tools.length > 0 ? 1 : 0,
                                has_next: false,
                                has_prev: false,
                            }
                            : this.toolData.pagination,
                    filters: firstData?.filters ?? {},
                    meta: firstResponse.meta ?? null,
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
