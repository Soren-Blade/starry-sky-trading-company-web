import { lookup, lookupOr } from '@/utils/safeLookup.js';

/**
 * 完整的 Emoji 渐变颜色映射表
 * 根据社交平台、账号状态、互动等场景分类
 */
const emojiGradientMap = {
  // ==================== 一、👥 社交互动类 ====================
  
  // 人物与关系
  '👤': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'social' }, // 个人 - 紫色系
  '👥': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'social' }, // 人群 - 深紫色
  '👪': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'social' }, // 家庭 - 温馨粉色
  '👫': { colors: ['#FF758C', '#FF7EB3'], angle: 135, category: 'social' }, // 男女手拉手 - 浪漫粉
  '👭': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'social' }, // 两个女人手拉手 - 柔粉
  '👬': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'social' }, // 两个男人手拉手 - 蓝色
  '💑': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'social' }, // 情侣爱心 - 热情红
  '💏': { colors: ['#FF758C', '#DD2476'], angle: 135, category: 'social' }, // 亲吻 - 粉红渐变
  '🤝': { colors: ['#6DD5ED', '#2193B0'], angle: 135, category: 'social' }, // 握手 - 信任蓝
  
  // 家庭组合 (示例)
  '👨‍👩‍👧‍👦': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'social' }, // 家庭组合 - 温馨渐变
  
  // 社交动作
  '🤗': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'social' }, // 拥抱 - 温暖黄
  '🫂': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'social' }, // 拥抱的人 - 柔和粉
  '👋': { colors: ['#A18CD1', '#FBC2EB'], angle: 135, category: 'social' }, // 挥手 - 告别紫
  '🤙': { colors: ['#4A00E0', '#8E2DE2'], angle: 135, category: 'social' }, // 打电话手势 - 通话紫
  '🤳': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'social' }, // 自拍 - 时尚紫
  '📸': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'social' }, // 拍照闪光灯 - 闪光橙
  '🎉': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'social' }, // 派对 - 庆祝红
  '🎊': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'social' }, // 彩球 - 欢快黄
  '🥳': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'social' }, // 派对脸 - 狂欢红
  '🎁': { colors: ['#FF758C', '#FF7EB3'], angle: 135, category: 'social' }, // 礼物 - 惊喜粉
  '💌': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'social' }, // 情书 - 浪漫粉
  
  // ==================== 二、📱 数字媒体与平台类 ====================
  
  // 通讯工具
  '📱': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'digital' }, // 手机 - 科技紫
  '📞': { colors: ['#4A00E0', '#8E2DE2'], angle: 135, category: 'digital' }, // 电话听筒 - 通话紫
  '📠': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'digital' }, // 传真机 - 办公紫
  '📧': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'digital' }, // 电子邮件 - 邮件蓝
  '📨': { colors: ['#6DD5ED', '#2193B0'], angle: 135, category: 'digital' }, // 收件 - 接收蓝
  '📩': { colors: ['#56CCF2', '#2F80ED'], angle: 135, category: 'digital' }, // 带附件邮件 - 附件蓝
  '✉️': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'digital' }, // 信封 - 传统蓝
  '💬': { colors: ['#A18CD1', '#FBC2EB'], angle: 135, category: 'digital' }, // 对话气泡 - 聊天紫
  '🗨️': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'digital' }, // 左对话气泡 - 对话紫
  '🗯️': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'digital' }, // 愤怒气泡 - 愤怒橙
  '💭': { colors: ['#C2E9FB', '#A1C4FD'], angle: 135, category: 'digital' }, // 思想气泡 - 思考浅蓝
  '📢': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'digital' }, // 喇叭 - 公告橙
  '📣': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'digital' }, // 扩音器 - 广播红
  '📯': { colors: ['#F09819', '#EDDE5D'], angle: 135, category: 'digital' }, // 号角 - 传统黄
  
  // 社交媒体相关
  '#️⃣': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'digital' }, // 话题标签 - 热门红
  '@️⃣': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'digital' }, // @提及 - 提及蓝
  '🔗': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'digital' }, // 链接 - 链接紫
  '📎': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'digital' }, // 回形针 - 附件紫
  '🖇️': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'digital' }, // 链接回形针 - 链接紫
  '📌': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'digital' }, // 图钉 - 固定红
  '📍': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'digital' }, // 圆图钉 - 定位橙
  '🔖': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'digital' }, // 书签 - 收藏黄
  '🏷️': { colors: ['#A18CD1', '#FBC2EB'], angle: 135, category: 'digital' }, // 标签 - 标签紫
  '🔐': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'digital' }, // 带钥匙锁 - 安全蓝
  '🔒': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'digital' }, // 挂锁关闭 - 锁定紫
  '🔓': { colors: ['#6DD5ED', '#2193B0'], angle: 135, category: 'digital' }, // 挂锁打开 - 解锁蓝
  '🔏': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'digital' }, // 锁和笔 - 编辑保护紫
  
  // ==================== 三、👤 账号身份与状态 ====================
  
  // 身份状态
  '👑': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 皇冠 - VIP金
  '⭐': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 星星 - 收藏黄
  '🌟': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 闪亮星星 - 明星金
  '🎖️': { colors: ['#F09819', '#EDDE5D'], angle: 135, category: 'status' }, // 军奖章 - 成就橙
  '🏆': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 奖杯 - 冠军金
  '🥇': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 金牌 - 第一名金
  '🥈': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'status' }, // 银牌 - 第二名银
  '🥉': { colors: ['#CD7F32', '#B87333'], angle: 135, category: 'status' }, // 铜牌 - 第三名铜
  '✅': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'status' }, // 勾选框 - 已验证绿
  '☑️': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'status' }, // 带勾选框 - 选中绿
  '✔️': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'status' }, // 粗体勾 - 确认绿
  '🔘': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'status' }, // 单选按钮 - 选择中紫
  
  // 状态指示
  '🔵': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'status' }, // 蓝色圆 - 在线蓝
  '🟢': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'status' }, // 绿色圆 - 在线绿
  '🟡': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 黄色圆 - 离开黄
  '🔴': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'status' }, // 红色圆 - 忙碌红
  '⏺️': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'status' }, // 录制按钮 - 直播红
  '⏏️': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'status' }, // 退出按钮 - 退出橙
  
  // 账号操作
  '👁️': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'status' }, // 眼睛 - 查看紫
  '👁️‍🗨️': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'status' }, // 眼睛在气泡中 - 已读绿
  '📤': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'status' }, // 发件箱 - 发送蓝
  '📥': { colors: ['#6DD5ED', '#2193B0'], angle: 135, category: 'status' }, // 收件箱 - 接收浅蓝
  '➕': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'status' }, // 加号 - 添加绿
  '➖': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'status' }, // 减号 - 取消橙
  '❌': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'status' }, // 交叉标记 - 删除红
  '🚫': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'status' }, // 禁止 - 屏蔽红
  '🔊': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 扬声器开 - 通知黄
  '🔇': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'status' }, // 扬声器静音 - 静音灰
  '🔕': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'status' }, // 通知关闭 - 免打扰灰
  '🔔': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'status' }, // 铃铛 - 通知黄
  '🔉': { colors: ['#FFD89B', '#19547B'], angle: 135, category: 'status' }, // 扬声器中音量 - 中音量橙蓝
  
  // ==================== 四、🌐 平台与内容类型 ====================
  
  // 内容形式
  '📷': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'content' }, // 相机 - 摄影紫
  '🎥': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'content' }, // 摄像机 - 视频红
  '📹': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'content' }, // 录像机 - 录像橙
  '🎞️': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'content' }, // 电影帧 - 电影紫
  '📼': { colors: ['#F09819', '#EDDE5D'], angle: 135, category: 'content' }, // 录像带 - 复古黄
  '📀': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'content' }, // DVD - 光盘紫
  '💿': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'content' }, // 光盘 - 数据蓝
  '📺': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'content' }, // 电视 - 电视红
  '📻': { colors: ['#F09819', '#EDDE5D'], angle: 135, category: 'content' }, // 收音机 - 广播黄
  '🎵': { colors: ['#8A2BE2', '#4B0082'], angle: 135, category: 'content' }, // 音符 - 音乐紫
  '🎶': { colors: ['#8A2BE2', '#4B0082'], angle: 135, category: 'content' }, // 多个音符 - 音乐深紫
  '🎙️': { colors: ['#4A00E0', '#8E2DE2'], angle: 135, category: 'content' }, // 录音室麦克风 - 录音紫
  '🎚️': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'content' }, // 音量滑块 - 调节橙
  '🎛️': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'content' }, // 控制旋钮 - 控制紫
  '📡': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'content' }, // 卫星天线 - 信号蓝
  '📶': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'content' }, // 信号强度条 - 信号绿
  '📳': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'content' }, // 振动模式 - 振动黄
  '📴': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'content' }, // 手机关闭 - 关机灰
  
  // 平台隐喻
  '🌐': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'platform' }, // 地球 - 全球蓝
  '🕸️': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'platform' }, // 蜘蛛网 - 网络紫
  '💻': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'platform' }, // 笔记本电脑 - 电脑蓝
  '🖥️': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'platform' }, // 台式电脑 - 台式紫
  '⌨️': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'platform' }, // 键盘 - 输入灰
  '🖱️': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'platform' }, // 电脑鼠标 - 鼠标紫
  '🖨️': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'platform' }, // 打印机 - 打印蓝
  '🗂️': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'platform' }, // 卡片分类 - 分类黄
  '📁': { colors: ['#FFD89B', '#19547B'], angle: 135, category: 'platform' }, // 文件文件夹 - 文件橙蓝
  '📂': { colors: ['#FFD89B', '#19547B'], angle: 135, category: 'platform' }, // 打开文件夹 - 打开文件
  '📄': { colors: ['#C2E9FB', '#A1C4FD'], angle: 135, category: 'platform' }, // 文档页面 - 文档浅蓝
  '📃': { colors: ['#FAD0C4', '#FF9A9E'], angle: 135, category: 'platform' }, // 卷曲页面 - 卷曲粉
  '📜': { colors: ['#F09819', '#EDDE5D'], angle: 135, category: 'platform' }, // 卷轴 - 历史黄
  '📊': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'platform' }, // 柱状图 - 数据蓝
  '📈': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'platform' }, // 上涨图表 - 增长绿
  '📉': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'platform' }, // 下跌图表 - 下降红
  '🗃️': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'platform' }, // 卡片盒 - 数据库紫
  '🗄️': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'platform' }, // 文件柜 - 存储灰
  
  // ==================== 五、🎭 社交情绪与反应 ====================
  
  // 反应与情感
  '👍': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'reaction' }, // 点赞 - 赞绿
  '👎': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'reaction' }, // 点踩 - 踩红
  '👏': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'reaction' }, // 鼓掌 - 鼓掌黄
  '🙌': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'reaction' }, // 举双手 - 庆祝红
  '💪': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'reaction' }, // 肌肉 - 力量橙
  '🫶': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'reaction' }, // 爱心手 - 爱心粉
  '🤟': { colors: ['#FF758C', '#DD2476'], angle: 135, category: 'reaction' }, // 爱你手势 - 爱你粉红
  '✌️': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'reaction' }, // 胜利手势 - 胜利绿
  '🤘': { colors: ['#8A2BE2', '#4B0082'], angle: 135, category: 'reaction' }, // 摇滚手势 - 摇滚紫
  
  // 爱心系列
  '❤️': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'reaction' }, // 红心 - 爱红
  '🧡': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'reaction' }, // 橙心 - 橙心
  '💛': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'reaction' }, // 黄心 - 黄心
  '💚': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'reaction' }, // 绿心 - 绿心
  '💙': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'reaction' }, // 蓝心 - 蓝心
  '💜': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'reaction' }, // 紫心 - 紫心
  '🖤': { colors: ['#000000', '#434343'], angle: 135, category: 'reaction' }, // 黑心 - 黑心
  '🤍': { colors: ['#F5F5F5', '#E0E0E0'], angle: 135, category: 'reaction' }, // 白心 - 白心
  '🤎': { colors: ['#8B4513', '#A0522D'], angle: 135, category: 'reaction' }, // 棕心 - 棕心
  '💔': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'reaction' }, // 破碎的心 - 伤心灰
  '❣️': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'reaction' }, // 粗体心叹号 - 强烈爱红
  '💘': { colors: ['#FF758C', '#DD2476'], angle: 135, category: 'reaction' }, // 带箭的心 - 爱之箭粉红
  '💝': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'reaction' }, // 带丝带的心 - 礼物心粉
  '💖': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'reaction' }, // 闪亮的心 - 闪亮粉
  '💗': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'reaction' }, // 渐变长大心 - 长大粉
  '💓': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'reaction' }, // 跳动的心 - 心跳红
  '💞': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'reaction' }, // 旋转的心 - 旋转粉
  '💕': { colors: ['#FF758C', '#FF7EB3'], angle: 135, category: 'reaction' }, // 两颗心 - 双心粉
  '💟': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'reaction' }, // 心形装饰 - 装饰粉
  '😍': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'reaction' }, // 爱心眼 - 喜爱红
  '🥰': { colors: ['#FF9A9E', '#FAD0C4'], angle: 135, category: 'reaction' }, // 带爱心的笑脸 - 幸福粉
  
  // 功能与状态
  '🔍': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'action' }, // 放大镜左 - 搜索紫
  '🔎': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'action' }, // 放大镜右 - 放大紫
  '✏️': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'action' }, // 铅笔 - 编辑蓝
  '📝': { colors: ['#C2E9FB', '#A1C4FD'], angle: 135, category: 'action' }, // 备忘录 - 笔记浅蓝
  '🗑️': { colors: ['#FF416C', '#FF4B2B'], angle: 135, category: 'action' }, // 废纸篓 - 删除红
  '🚮': { colors: ['#C0C0C0', '#A9A9A9'], angle: 135, category: 'action' }, // 垃圾桶标志 - 垃圾桶灰
  '🔄': { colors: ['#56CCF2', '#2F80ED'], angle: 135, category: 'action' }, // 顺时针箭头 - 刷新蓝
  '🔃': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'action' }, // 顺时针上下箭头 - 同步蓝
  '↩️': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'action' }, // 左箭头弯 - 返回橙
  '➡️': { colors: ['#56ab2f', '#a8e063'], angle: 135, category: 'action' }, // 右箭头 - 下一步绿
  '⬅️': { colors: ['#FF512F', '#F09819'], angle: 135, category: 'action' }, // 左箭头 - 上一步橙
  '⬆️': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'action' }, // 上箭头 - 向上紫
  '⬇️': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'action' }, // 下箭头 - 下载蓝
  '↗️': { colors: ['#FFE259', '#FFA751'], angle: 135, category: 'action' }, // 右上箭头 - 分享黄
  '↙️': { colors: ['#667eea', '#764ba2'], angle: 135, category: 'action' }, // 左下箭头 - 回家紫
  '🔀': { colors: ['#8A2BE2', '#4B0082'], angle: 135, category: 'action' }, // 交叉箭头 - 随机紫
  '🔁': { colors: ['#56CCF2', '#2F80ED'], angle: 135, category: 'action' }, // 重复箭头 - 循环蓝
  '🔂': { colors: ['#4A90E2', '#357ABD'], angle: 135, category: 'action' }, // 重复一次 - 单曲循环蓝
  
  // 默认配置
  'default': { colors: ['#8A6DFF', '#6C5CE7'], angle: 135, category: 'default' }
};

/**
 * 把任意输入规整成可查询的 emoji 字符串
 * 后端字段可能为 null/undefined/数字，直接 .trim() 会抛 TypeError。
 * @param {*} value
 * @returns {string}
 */
function normalizeEmoji(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value).trim();
  return value.trim();
}

/**
 * Emoji 渐变背景生成器
 */
class EmojiGradientGenerator {
  constructor() {
    this.gradientMap = emojiGradientMap;
    this.categories = {
      social: '社交互动类',
      digital: '数字媒体类',
      status: '账号状态类',
      content: '内容类型类',
      platform: '平台隐喻类',
      reaction: '社交情绪类',
      action: '功能操作类',
      default: '默认'
    };
  }

  /**
   * 获取emoji对应的渐变背景
   * @param {string} emoji - emoji表情
   * @param {Object} options - 配置选项
   * @returns {string} linear-gradient CSS字符串
   */
  getGradient(emoji, options = {}) {
    const {
      angle = null,
      colors = null,
      useDefault = true,
      opacity = 1
    } = options;

    // 调用方（如 CategoriesSection）直接透传后端字段，icon_url 可能为 null，
    // 这里做兜底，避免 emoji.trim() 抛 TypeError 导致整块渲染失败。
    const cleanEmoji = normalizeEmoji(emoji);

    // 必须用自有属性查找：`this.gradientMap['toString']` 会取到
    // Object.prototype.toString（函数），于是下面访问 .colors 得到 undefined，
    // 最终在 finalColors[0] 处抛
    // 「TypeError: Cannot read properties of undefined (reading '0')」。
    // 实测确认：'toString' / 'constructor' / 'valueOf' / 'hasOwnProperty' / '__proto__'
    // 都会触发，而后端字段是外部数据，不能假定它一定是合法 emoji。
    let gradientConfig = lookup(this.gradientMap, cleanEmoji, null);

    // 如果未找到且允许使用默认
    if (!gradientConfig && useDefault) {
      gradientConfig = lookup(this.gradientMap, 'default', null);
    }

    // 如果还是没有配置，返回随机渐变
    if (!gradientConfig) {
      return this.generateRandomGradient(angle);
    }

    const finalAngle = angle !== null ? angle : gradientConfig.angle;
    const finalColors = colors !== null ? colors : gradientConfig.colors || [];

    // 配置缺失颜色时也走随机渐变，避免渲染出 `linear-gradient(...undefined...)`
    if (finalColors.length < 2) {
      return this.generateRandomGradient(angle);
    }

    // 如果设置了透明度，转换为rgba
    let colorStops = `${finalColors[0]} 0%, ${finalColors[1]} 100%`;
    if (opacity < 1) {
      const rgbaColors = finalColors.map(hex => this.hexToRgba(hex, opacity));
      colorStops = `${rgbaColors[0]} 0%, ${rgbaColors[1]} 100%`;
    }

    return `linear-gradient(${finalAngle}deg, ${colorStops})`;
  }

  /**
   * 获取emoji的详细信息
   * @param {string} emoji - emoji表情
   * @returns {Object} emoji详细信息
   */
  getEmojiInfo(emoji) {
    const cleanEmoji = normalizeEmoji(emoji);
    // 同 getGradient：必须用自有属性查找，否则 'toString' 这类输入会取到函数
    const config =
      lookup(this.gradientMap, cleanEmoji, null) || lookup(this.gradientMap, 'default', null);

    return {
      emoji: cleanEmoji,
      gradient: this.getGradient(cleanEmoji),
      colors: config ? config.colors : [],
      angle: config ? config.angle : null,
      category: config ? config.category : null,
      categoryName: lookupOr(this.categories, config ? config.category : null, '未知分类')
    };
  }

  /**
   * 生成随机渐变
   * @param {number} angle - 渐变角度
   * @returns {string} linear-gradient字符串
   */
  generateRandomGradient(angle = 135) {
    const gradients = [
      ['#FF9A9E', '#FAD0C4'], // 柔和粉色
      ['#6DD5ED', '#2193B0'], // 天蓝色
      ['#A18CD1', '#FBC2EB'], // 淡紫色
      ['#FFD89B', '#19547B'], // 橙色到深蓝
      ['#56CCF2', '#2F80ED'], // 蓝色系
      ['#FFECD2', '#FCB69F'], // 橙色系
      ['#C2E9FB', '#A1C4FD'], // 浅蓝色
      ['#FF9A9E', '#FECFEF'], // 粉红色
      ['#43CBFF', '#9708CC'], // 蓝紫色
      ['#FAD961', '#F76B1C'], // 橙黄色
    ];
    
    const randomColors = gradients[Math.floor(Math.random() * gradients.length)];
    return `linear-gradient(${angle}deg, ${randomColors[0]} 0%, ${randomColors[1]} 100%)`;
  }

  /**
   * 十六进制颜色转RGBA
   * @private
   */
  hexToRgba(hex, opacity = 1) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * 获取分类下的所有emoji
   * @param {string} category - 分类
   * @returns {Array} emoji数组
   */
  getEmojisByCategory(category) {
    return Object.entries(this.gradientMap)
      .filter(([emoji, config]) => config.category === category && emoji !== 'default')
      .map(([emoji]) => emoji);
  }

  /**
   * 获取所有分类信息
   * @returns {Object} 分类信息
   */
  getCategoryInfo() {
    const info = {};
    Object.entries(this.categories).forEach(([key, name]) => {
      const emojis = this.getEmojisByCategory(key);
      info[key] = {
        name,
        count: emojis.length,
        emojis: emojis.slice(0, 10) // 只显示前10个
      };
    });
    return info;
  }

  /**
   * 添加自定义emoji渐变
   * @param {string} emoji - emoji
   * @param {Object} config - 配置
   */
  addCustomEmoji(emoji, config) {
    if (config && Array.isArray(config.colors) && config.colors.length >= 2) {
      this.gradientMap[emoji] = {
        colors: config.colors,
        angle: config.angle || 135,
        category: config.category || 'custom'
      };
      return true;
    }
    return false;
  }

  /**
   * 获取完整的CSS样式对象
   * @param {string} emoji - emoji表情
   * @param {Object} styleOptions - 样式选项
   * @returns {Object} CSS样式对象
   */
  getEmojiStyle(emoji, styleOptions = {}) {
    const {
      width = '60px',
      height = '60px',
      borderRadius = '12px',
      fontSize = '24px',
      display = 'flex',
      alignItems = 'center',
      justifyContent = 'center',
      fontWeight = 'bold',
      color = '#FFFFFF',
      boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)',
      ...gradientOptions
    } = styleOptions;

    return {
      width,
      height,
      borderRadius,
      background: this.getGradient(emoji, gradientOptions),
      fontSize,
      display,
      alignItems,
      justifyContent,
      fontWeight,
      color,
      boxShadow,
      userSelect: 'none'
    };
  }
}

// 创建单例实例
const emojiGradientGenerator = new EmojiGradientGenerator();

// ==================== 导出部分 ====================

/**
 * 主函数：获取emoji渐变背景
 * @param {string} emoji - emoji表情
 * @param {Object} options - 配置选项
 * @returns {string} linear-gradient CSS字符串
 */
export function getEmojiGradient(emoji, options = {}) {
  return emojiGradientGenerator.getGradient(emoji, options);
}

/**
 * 获取emoji详细信息
 * @param {string} emoji - emoji表情
 * @returns {Object} emoji详细信息
 */
export function getEmojiInfo(emoji) {
  return emojiGradientGenerator.getEmojiInfo(emoji);
}

/**
 * 获取分类下的emoji
 * @param {string} category - 分类
 * @returns {Array} emoji数组
 */
export function getEmojisByCategory(category) {
  return emojiGradientGenerator.getEmojisByCategory(category);
}

/**
 * 获取所有分类信息
 * @returns {Object} 分类信息
 */
export function getCategoryInfo() {
  return emojiGradientGenerator.getCategoryInfo();
}

/**
 * 添加自定义emoji渐变
 * @param {string} emoji - emoji
 * @param {Object} config - 配置
 * @returns {boolean} 是否成功
 */
export function addCustomEmoji(emoji, config) {
  return emojiGradientGenerator.addCustomEmoji(emoji, config);
}

/**
 * 获取完整的CSS样式对象
 * @param {string} emoji - emoji表情
 * @param {Object} styleOptions - 样式选项
 * @returns {Object} CSS样式对象
 */
export function getEmojiStyle(emoji, styleOptions = {}) {
  return emojiGradientGenerator.getEmojiStyle(emoji, styleOptions);
}

/**
 * 生成随机渐变
 * @param {number} angle - 渐变角度
 * @returns {string} linear-gradient字符串
 */
export function generateRandomGradient(angle = 135) {
  return emojiGradientGenerator.generateRandomGradient(angle);
}

// 导出映射表和类
export { emojiGradientMap };
export { EmojiGradientGenerator };

// 默认导出主函数
export default getEmojiGradient;