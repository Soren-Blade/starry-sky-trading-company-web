import request from '../request'

/**
 * 消息中心接口（后端 `docs/API.md` §4.23）
 *
 * 这一组端点**只对注册用户开放**：`/mailApi` 挂了 `requireRegisteredAccount`，
 * 游客拿到的是 403 `REGISTERED_ACCOUNT_REQUIRED`。这是刻意的 ——
 * 后端 `enqueue_notification` 对非注册用户直接返回 false，
 * 游客不会有任何站内通知，给他一个能打开的空页面毫无意义。
 *
 * 客服会话（游客唯一的求助通道）在 `./support.js` 里，两组接口的身份要求不同。
 */
const baseURL = '/mailApi'

/**
 * 站内通知列表（分页）
 *
 * 响应里的 `unread` **不受分页影响**，是未读总数的权威值 ——
 * 因此翻到第二页也能拿到正确的角标数字，不必再发一次 /getUnreadCount。
 */
function getMessages(params) {
  return request.get(`${baseURL}/getMessages`, { params })
}

/** 未读数：顶栏角标专用，只取一个数字 */
function getUnreadCount() {
  return request.get(`${baseURL}/getUnreadCount`)
}

/**
 * 标记已读
 * @param {number[]|null} ids 省略或传 null = 全部标为已读
 */
function markRead(ids) {
  return request.post(`${baseURL}/markRead`, ids ? { ids } : {})
}

/** 通知偏好（六开关）+ 账号邮箱是否已填写（脱敏后的展示值） */
function getPreferences() {
  return request.get(`${baseURL}/getPreferences`)
}

/**
 * 更新通知偏好：只提交要改的项，其它项服务端保持原样
 * @param {object} patch 例如 `{ email_enabled: false }`
 */
function updatePreferences(patch) {
  return request.post(`${baseURL}/updatePreferences`, patch)
}

/**
 * 邮件投递台账
 *
 * 只回模板名、状态、重试次数与时间 —— 没有正文，也没有收件地址。
 * 这条边界是刻意的：台账是用来回答「信发出去了吗」的，不是邮件内容的备份。
 */
function getMailLog(params) {
  return request.get(`${baseURL}/getMailLog`, { params })
}

export { getMessages, getUnreadCount, markRead, getPreferences, updatePreferences, getMailLog }
