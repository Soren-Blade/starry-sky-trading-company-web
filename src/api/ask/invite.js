import request from '../request'

/**
 * 邀请接口（1.6.0，契约 §4.18 / §4.19）
 *
 * 两条纪律：
 *   1. **`invite_code` 由服务端从 `uuid` 现算**，账号表里没有这一列 ——
 *      前端不要试图本地推导或缓存成「用户的码」，每次以接口返回为准。
 *   2. **`invitee_label` 是已经脱敏的标识**（如 `星***`）。前端拿到的时候就是
 *      脱敏值，不要试图拼接完整账号，也不要在提示语里暗示「对方是谁」。
 *
 * 邀请链接同样由服务端拼（它知道 `MAIL_LINK_BASE_URL`）：本地没有配置基址时
 * 返回的是相对路径 `/?invite=CODE`，前端因此**直接展示返回值**、不自己补域名。
 */
const baseURL = '/inviteApi'

/** 邀请概况：邀请码 / 链接 / 三态计数 / 奖励口径 / 进度 / 排行榜 */
function getSummary() {
  return request.get(`${baseURL}/getSummary`)
}

/** 邀请记录（分页，`limit` 上限 50 —— 服务端会夹取，前端不必自己限制） */
function getRecords(params) {
  return request.get(`${baseURL}/getRecords`, { params })
}

export { getSummary, getRecords }
