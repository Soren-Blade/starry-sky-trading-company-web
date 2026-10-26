/**
 * 工具派生标签（需求 7·后半）
 *
 * 工具目录里每条工具只有一个分类标签（`class_name`，如「视频工具」）。
 * 这里从 `tool_name` + `description` 做**确定性的关键词匹配**，派生 1–3 个短标签，
 * 由 ToolCard 展示在分类标签之后。
 *
 * 约束：
 * - 纯函数、无随机 / 无时间 / 无网络：同一输入永远得到同一输出；
 * - 关键词取自线上 `sstc.tools` 的 36 条真实描述（另有
 *   `starry-sky-trading-company-server/docs/migrations/2026-10-18-upsert-tool-catalog.sql`
 *   作为 seed 对照），标签限定 2–4 个汉字；
 * - 不重复：标签表里每个标签只出现一次；与工具自己的 `class_name` 相同的标签
 *   会被丢弃 —— 否则同一行里会出现两个一模一样的方块（需求里的「同一行文案不重复」）；
 * - 没有命中时返回空数组，调用方不要渲染空标签。
 *
 * 展示层（ToolCard）最多显示 3 个标签，分类标签占其中一个名额。
 */

/** 单条工具最多派生的标签数（纯函数上限） */
export const MAX_TOOL_TAGS = 3

/**
 * 关键词 → 标签规则。数组顺序即优先级：越具体的规则越靠前，
 * `生成器` / `开发者` 这类泛化标签放最后兜底。
 *
 * `keywords` 一律小写；匹配时把 tool_name + description 整体小写后做
 * `includes()`，所以英文大小写不敏感，中文不受影响。
 *
 * 关键词要尽量「成词」：例如不用裸 `下载`（共享 AppleId 的描述里也有「下载」，
 * 会被误判成解析下载）、不用裸 `sha`（Shadowrocket 里含 `sha` 子串）。
 */
const RULES = Object.freeze([
  // ── 媒体与解析 ──────────────────────────────────────────────
  { tag: '解析下载', keywords: ['解析下载', '视频下载', '下载链接', '分享链接', '短视频下载', '直链'] },
  { tag: '图像处理', keywords: ['图片', '图像', '照片', 'jpg', 'png'] },
  { tag: '视频处理', keywords: ['视频', '音视频'] },
  { tag: '音频处理', keywords: ['音频', '声音', '音轨'] },

  // ── 编码 / 安全 ─────────────────────────────────────────────
  { tag: '安全验证', keywords: ['2fa', 'totp', '动态口令', '验证码', '密钥'] },
  { tag: '加解密', keywords: ['加解密', '加密', '解密', 'aes', 'rsa'] },
  { tag: '编码解码', keywords: ['编码', '解码', 'base64', 'hex', 'url 编码'] },
  { tag: '哈希校验', keywords: ['哈希', 'md5', 'sha-1', 'sha-256', 'sha-512', 'sha1', 'sha256', 'sha512'] },

  // ── 数值 / 时间 ─────────────────────────────────────────────
  { tag: '单位换算', keywords: ['单位换算', '换算', '长度', '重量', '面积', '体积', '温度'] },
  { tag: '进制转换', keywords: ['进制', '二进制', '八进制', '十六进制'] },
  { tag: '时间戳', keywords: ['时间戳'] },
  { tag: '日期计算', keywords: ['日期计算', '日期'] },
  { tag: '倒计时', keywords: ['倒计时'] },

  // ── 设计与图文 ──────────────────────────────────────────────
  { tag: '二维码', keywords: ['二维码', 'qr'] },
  { tag: '颜色工具', keywords: ['颜色', '调色板', '色值'] },
  { tag: '趣味娱乐', keywords: ['骰子', '硬币', '趣味', '游戏', '抽奖'] },
  { tag: '样式生成', keywords: ['阴影', '圆角', '边框样式'] },
  { tag: '布局调试', keywords: ['flexbox', 'grid', '布局'] },
  { tag: '格式转换', keywords: ['格式转换', '格式互转', '转码'] },

  // ── 网络 / 链接 / 生成 ─────────────────────────────────────
  { tag: '网络查询', keywords: ['ip 查询', 'dns', '网络'] },
  { tag: '链接处理', keywords: ['短链', 'og ', 'url 解析', 'url 净化'] },
  { tag: '生成器', keywords: ['生成', 'uuid', '随机', '抽取'] },

  // ── 文档 / 数据 ─────────────────────────────────────────────
  { tag: '文档处理', keywords: ['文档', 'pdf', '幻灯片', '演示文稿', 'office'] },
  { tag: '表格处理', keywords: ['表格', 'excel', '电子表格'] },
  { tag: '数据处理', keywords: ['数据', 'json', 'csv', 'yaml', 'xml'] },

  // ── 开发 / 文本 ─────────────────────────────────────────────
  { tag: '正则工具', keywords: ['正则'] },
  { tag: '代码处理', keywords: ['代码'] },
  { tag: '令牌解析', keywords: ['jwt', '令牌'] },
  { tag: '定时任务', keywords: ['cron', '定时'] },
  { tag: '数据库', keywords: ['sql', '数据库'] },
  { tag: '账号共享', keywords: ['苹果id', 'appleid', '苹果账号', '账号稳定'] },
  { tag: '文本处理', keywords: ['文本', '字符串', '清理', '替换', '速查'] },
  { tag: '计算器', keywords: ['计算', 'bmi'] },
  { tag: '生活工具', keywords: ['星座', '生肖', '生活'] },
  { tag: '开发者', keywords: ['api', 'git', 'sql', 'json', 'css', 'html', 'jwt', 'cron', 'uuid', '测试', 'flexbox', 'grid'] },
])

/**
 * 从工具名称 / 描述派生短标签。
 *
 * @param {{ tool_name?: string, description?: string, class_name?: string } | null | undefined} tool
 * @returns {string[]} 至多 {@link MAX_TOOL_TAGS} 个标签；没有命中时返回空数组
 */
export function toolTagsOf(tool) {
  if (!tool || typeof tool !== 'object') return []

  const name = typeof tool.tool_name === 'string' ? tool.tool_name : ''
  const description = typeof tool.description === 'string' ? tool.description : ''
  const haystack = `${name}\n${description}`.toLowerCase()
  if (!haystack.trim()) return []

  // 分类标签已经占据同一行的第一个位置，派生标签不能再重复它
  const className = typeof tool.class_name === 'string' ? tool.class_name.trim() : ''

  const tags = []
  for (const rule of RULES) {
    if (tags.length >= MAX_TOOL_TAGS) break
    if (rule.tag === className) continue
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) tags.push(rule.tag)
  }
  return tags
}
