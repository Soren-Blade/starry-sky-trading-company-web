import request from '../request'

/**
 * 任务中心接口（1.5.0 M5，契约 §4.16–§4.17）
 *
 * 两条纪律：
 *   1. **进度由服务端现算**：`getTasks` 每次调用都会把进度 upsert 回库，
 *      所以前端不需要「先查进度再判断」，也不要在本地累加进度；
 *   2. **签到任务只读数**：`daily_checkin` 的奖励由 `/pointsApi/checkin` 自己发，
 *      它的 `claimable` 恒为 `false`，前端据此把按钮置灰而不是隐藏（要让人看见已领）。
 */
const baseURL = '/taskApi'

/** 任务清单与进度（响应 `{ tasks: [...], claimable_points }`） */
function getTasks() {
  return request.get(`${baseURL}/getTasks`)
}

/**
 * 领取任务奖励（响应 `{ points, points_value, awarded, task }`）
 *
 * 失败码：`TASK_NOT_FOUND` 404、`TASK_NOT_CLAIMABLE` / `NOT_COMPLETED`
 * （带 `details{progress,target}`）/ `ALREADY_CLAIMED` 409。
 */
function claim(taskId) {
  return request.post(`${baseURL}/claim`, { task_id: taskId })
}

export { getTasks, claim }
