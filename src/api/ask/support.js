import request from '../request'

/**
 * 客服中心接口（后端 `docs/API.md` §4.24）
 *
 * 这一组端点**游客也能用**：`/supportApi` 只挂 `requireAccessToken` +
 * `requireActiveAccount`，没有 `requireRegisteredAccount` —— 游客是平台里
 * 唯一「没有邮箱、没有站内通知」的身份，客服入口是他唯一的求助通道。
 *
 * 四件事：开一条会话、列我的会话、看某条会话的全文、往里追问。
 * 会话对外**只有回执号**（`FB…`），内部自增 id 不出接口 —— 因此前端任何地方
 * 都不要拼 `/supportApi/getThread?id=…` 这种调用。
 */
const baseURL = '/supportApi'

/**
 * 提交反馈（开一条会话）
 *
 * @param {{category?: string, subject: string, body: string, contact_email?: string}} payload
 * @returns {Promise<{data: {thread_no: string, message_id: number, status: string}}>}
 *
 * 两个身份差别（服务端决定，前端只管传不传）：
 * - 注册用户：`contact_email` 可省略（服务端拿账号邮箱兜底）；
 * - 游客：必须自己填 —— 回执与客服回复**只**发到那里，也是唯一的人工查询凭据。
 *
 * 频次上限（同一身份 24 小时 5 次）超出时抛 429 `RATE_LIMITED`，错误文案由
 * 服务端给出，页面直接展示，不要在这里另写一份。
 */
function createThread(payload) {
  return request.post(`${baseURL}/createThread`, payload)
}

/** 我的会话列表（分页）；`unread` 是总未读，不受分页影响 */
function getThreads(params) {
  return request.get(`${baseURL}/getThreads`, { params })
}

/**
 * 会话详情（含全部消息）
 * @param {string} threadNo 回执号
 *
 * 会话不存在**或不是自己的**，服务端都回 404 `THREAD_NOT_FOUND` ——
 * 因此页面不要试图用错误码区分「没有」与「不是你的」（那是刻意的防枚举）。
 */
function getThread(threadNo) {
  return request.get(`${baseURL}/getThread`, { params: { thread_no: threadNo } })
}

/** 追问我方会话：正文 ≤5000，成功后状态被推回 `open`（等运营） */
function reply(threadNo, body) {
  return request.post(`${baseURL}/reply`, { thread_no: threadNo, body })
}

export { createThread, getThreads, getThread, reply }
