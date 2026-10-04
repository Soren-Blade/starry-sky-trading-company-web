import { ref } from 'vue'

/**
 * 「悬停或聚焦即展开」的展开态。
 *
 * 用于把一段内容收成一个图标按钮、悬停展开、点击展开并聚焦的场景
 * （顶栏搜索就是这个形态）。
 *
 * 展开条件必须是**悬停中 或 焦点在内部**，只看其中一个都会坏：
 *
 *   - 只看悬停：用户点开输入框、打完字、把鼠标移开 —— 焦点还在输入框里，
 *     搜索框却被抽走了，输入到一半的内容直接消失。
 *   - 只看焦点：鼠标悬停（还没点进去）时不会展开，与「悬停展开」不符。
 *
 * 触屏上还有一层坑：点按时浏览器会补发一对 mouseenter / mouseleave，
 * 而补的 leave 往往要等下一次点别处才来。若不判断设备是否真的能悬停，
 * 手机上「展开搜索后点别处」会因为还记着「悬停中」而关不掉。
 * 因此 `canHover` 可注入，默认读 `matchMedia('(hover: hover)')`。
 *
 * @param {object} [options]
 * @param {() => boolean} [options.canHover] 该设备是否真的支持悬停
 */
export function useHoverDisclosure({ canHover } = {}) {
    const open = ref(false)

    // 两个来源分开记录：它们各自到达与离开的时机不同，
    // 合并成一个布尔就无法正确回答「现在还有没有理由保持展开」
    let hovered = false
    let focused = false

    const detectHover =
        canHover ||
        (() =>
            typeof window !== 'undefined' && typeof window.matchMedia === 'function'
                ? window.matchMedia('(hover: hover)').matches
                : true)

    const sync = () => {
        open.value = hovered || focused
    }

    return {
        open,

        /** 悬停进入（触屏上会被忽略） */
        onEnter() {
            if (!detectHover()) return
            hovered = true
            sync()
        },

        /** 悬停离开。焦点还在内部时不会收起 —— 这正是上面说的那个组合 */
        onLeave() {
            hovered = false
            sync()
        },

        onFocusIn() {
            focused = true
            sync()
        },

        onFocusOut() {
            focused = false
            sync()
        },

        /** 立刻展开（点击图标时用，不等焦点事件到达） */
        reveal() {
            open.value = true
        },

        /** 彻底收起：Escape、提交之后 */
        close() {
            hovered = false
            focused = false
            sync()
        },
    }
}
