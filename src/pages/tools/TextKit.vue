<template>
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
    :requires-card="PAGE.requiresCard"
  >
    <section class="ui-card tool-panel">
      <div class="u-field">
        <label class="u-field-label" for="text-kit-mode">{{ PAGE.modeLabel }}</label>
        <SelectField id="text-kit-mode" v-model="currentMode" :options="PAGE.modeOptions" :aria-label="PAGE.modeLabel" />
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="file-text" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span>
      </h2>
      <div class="u-field">
        <label class="u-field-label" for="text-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="text-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
        <p class="u-field-hint">{{ PAGE.sourceHint }}</p>
      </div>

      <div class="tool-form">
        <template v-if="currentMode === 'find-replace'">
          <div class="u-field">
            <label class="u-field-label" for="find-text">{{ PAGE.findLabel }}</label>
            <input id="find-text" v-model="findText" class="u-input" :placeholder="PAGE.findPlaceholder" />
          </div>
          <div class="u-field">
            <label class="u-field-label" for="replace-text">{{ PAGE.replaceLabel }}</label>
            <input id="replace-text" v-model="replaceText" class="u-input" :placeholder="PAGE.replacePlaceholder" />
          </div>
          <div class="u-field">
            <label class="u-switch" :aria-checked="useRegex ? 'true' : 'false'">
              <input v-model="useRegex" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ PAGE.regexLabel }}</span>
            </label>
            <label class="u-switch" :aria-checked="globalReplace ? 'true' : 'false'">
              <input v-model="globalReplace" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ PAGE.globalLabel }}</span>
            </label>
          </div>
        </template>

        <template v-if="currentMode === 'case-convert'">
          <div class="u-field">
            <label class="u-field-label">{{ PAGE.caseLabel }}</label>
            <div class="tool-actions">
              <button v-for="opt in PAGE.caseOptions" :key="opt.value" type="button" class="u-btn-secondary" :class="{ 'u-btn-primary': caseType === opt.value }" @click="caseType = opt.value">{{ opt.label }}</button>
            </div>
          </div>
        </template>

        <template v-if="currentMode === 'line-sort'">
          <div class="u-field">
            <label class="u-field-label" for="sort-mode">{{ PAGE.sortLabel }}</label>
            <SelectField id="sort-mode" v-model="sortMode" :options="PAGE.sortOptions" />
          </div>
          <label class="u-switch" :aria-checked="sortUnique ? 'true' : 'false'">
            <input v-model="sortUnique" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ PAGE.uniqueLabel }}</span>
          </label>
        </template>

        <template v-if="currentMode === 'line-dedup'">
          <div class="u-field">
            <label class="u-field-label" for="dedup-mode">{{ PAGE.dedupLabel }}</label>
            <SelectField id="dedup-mode" v-model="dedupMode" :options="PAGE.dedupOptions" />
          </div>
        </template>

        <template v-if="currentMode === 'text-clean'">
          <div class="u-field">
            <label class="u-field-label">{{ PAGE.cleanLabel }}</label>
            <div class="tool-form">
              <label v-for="(label, key) in { empty: PAGE.cleanEmpty, trim: PAGE.cleanTrim, collapse: PAGE.cleanCollapse, newlines: PAGE.cleanNewlines }" :key="key" class="u-switch" :aria-checked="clean[key] ? 'true' : 'false'">
                <input v-model="clean[key]" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ label }}</span>
              </label>
            </div>
          </div>
        </template>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!canSubmit" @click="start">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">{{ PAGE.reset }}</button>
        <button type="button" class="u-btn-secondary" @click="fillSample">{{ PAGE.sample }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span>
      </h2>
      <ToolResultPane :state="jobState" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="jobError" icon="file-text">
        <template v-if="result">
          <div v-if="currentMode === 'word-count'" class="tool-result-stats">
            <div v-for="stat in result.stats" :key="stat.label" class="tool-stat-card"><span class="tool-stat-value">{{ stat.value }}</span><span class="tool-stat-label">{{ stat.label }}</span></div>
          </div>
          <div v-else-if="result.html" class="tool-preview markdown-preview" v-html="result.html"></div>
          <pre v-else class="tool-preview">{{ result.text }}</pre>
          <div v-if="result.meta" class="tool-result-meta">
            <span v-for="(value, key) in result.meta" :key="key" class="tool-result-meta-item">{{ key }}: <span class="tool-result-value">{{ value }}</span></span>
          </div>
        </template>
        <template #actions>
          <button type="button" class="u-btn-primary" :disabled="!result" @click="copyResult">{{ copyLabel }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true"><AppIcon name="info" /></span><span>{{ TOOL_PAGE.usageTitle }}</span>
        </h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
        <p class="tool-aside-note">{{ PAGE.asideNotice }}</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolJob } from '@/hooks/useToolJob/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/text/kit']
const usage = useToolUsage('/text/kit')
const currentMode = ref('markdown-html'), source = ref('')
const findText = ref(''), replaceText = ref(''), useRegex = ref(false), globalReplace = ref(true)
const caseType = ref('upper'), sortMode = ref('asc'), sortUnique = ref(false), dedupMode = ref('first')
const clean = reactive({ empty: true, trim: true, collapse: false, newlines: false })
const copyState = ref('idle')

const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({ run: processText, usage })
const busy = computed(() => jobState.value === 'loading')
const canSubmit = computed(() => Boolean(source.value.trim()) && !busy.value)
const copyLabel = computed(() => (copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy))

const CASE_FNS = {
  upper: (s) => s.toUpperCase(), lower: (s) => s.toLowerCase(),
  capitalize: (s) => s.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase()), sentence: (s) => s.replace(/(?:^|[.!?]\s+)\S/g, (c) => c.toUpperCase()),
  toggle: (s) => s.split('').map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
}

function fail(message, code) { return Object.assign(new Error(message), { code }) }

function updateWordCount() {
  if (!source.value.trim()) return resetJob()
  const text = source.value, lines = text.split('\n').length, startedAt = performance.now()
  result.value = {
    text: '',
    stats: [
      { label: '字符数', value: text.length }, { label: '字符数（不含空格）', value: text.replace(/\s/g, '').length },
      { label: '词数', value: text.trim() ? text.trim().split(/\s+/).length : 0 }, { label: '行数', value: lines },
      { label: '字节数', value: new Blob([text]).size },
    ],
    meta: { 原文本: `${text.length} 字符 · ${lines} 行` },
  }
  jobState.value = 'success'
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: 'word-count', chars: text.length } })
}

watch([source, currentMode], () => { if (currentMode.value === 'word-count') updateWordCount() }, { immediate: true })

async function processText() {
  const text = source.value
  if (!text.trim()) throw fail(PAGE.invalidEmpty, 'TEXT_EMPTY_INPUT')
  await new Promise((resolve) => { setTimeout(resolve, 0) })
  let output = text, html = '', meta = {}

  switch (currentMode.value) {
    case 'markdown-html':
      try {
        // marked 解析 Markdown，DOMPurify 清除脚本、事件属性和危险链接，必须经过净化再 v-html。
        const [markedMod, dompurifyMod] = await Promise.all([import('marked'), import('dompurify')])
        const purify = dompurifyMod.default || dompurifyMod
        const sanitize = purify.sanitize ? purify.sanitize.bind(purify) : purify(window).sanitize
        html = sanitize(await (markedMod.marked?.parse || markedMod.parse)(text))
        output = html
        meta = { 模式: 'Markdown → HTML' }
      } catch (error) { throw fail(`Markdown 渲染失败：${error.message}`, 'MARKDOWN_RENDER_FAILED') }
      break
    case 'html-markdown': output = htmlToMarkdown(text); meta = { 模式: 'HTML → Markdown' }; break
    case 'html-entity':
      output = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
      meta = { 模式: 'HTML 实体编码' }
      break
    case 'html-decode': {
      const area = document.createElement('textarea'); area.innerHTML = text; output = area.value
      meta = { 模式: 'HTML 实体解码' }
      break
    }
    case 'find-replace':
      if (!findText.value) throw fail(PAGE.needFindText, 'TEXT_FIND_REQUIRED')
      if (useRegex.value) {
        try { output = text.replace(new RegExp(findText.value, globalReplace.value ? 'g' : ''), replaceText.value) } catch (error) { throw fail(`${PAGE.invalidRegex}${error.message}`, 'TEXT_INVALID_REGEX') }
      } else output = globalReplace.value ? text.split(findText.value).join(replaceText.value) : text.replace(findText.value, replaceText.value)
      meta = { 查找: findText.value, 替换: replaceText.value }; break
    case 'case-convert': output = CASE_FNS[caseType.value](text); meta = { 转换: PAGE.caseOptions.find((o) => o.value === caseType.value)?.label }; break
    case 'line-sort': {
      let lines = text.split('\n')
      if (sortUnique.value) lines = [...new Set(lines)]
      lines.sort((a, b) => (sortMode.value === 'desc' ? b.localeCompare(a) : sortMode.value === 'length-asc' ? a.length - b.length : sortMode.value === 'length-desc' ? b.length - a.length : a.localeCompare(b)))
      output = lines.join('\n'); meta = { 排序: sortMode.value, 去重: sortUnique.value ? '是' : '否' }; break
    }
    case 'line-dedup': {
      const lines = text.split('\n'), last = dedupMode.value === 'last', seen = new Map()
      lines.forEach((line, index) => { const item = seen.get(line); if (item) { item.count++; if (last) item.index = index } else seen.set(line, { line, index, count: 1 }) })
      const values = dedupMode.value === 'count' ? [...seen.values()].sort((a, b) => b.count - a.count).map((v) => `${v.line} (${v.count})`) : [...seen.values()].sort((a, b) => a.index - b.index).map((v) => v.line)
      output = values.join('\n'); meta = { 原行数: lines.length, 去重后: values.length }; break
    }
    case 'text-clean':
      if (clean.empty) output = output.replace(/\n[\t ]*(?=\n)/g, '')
      if (clean.trim) output = output.split('\n').map((line) => line.trim()).join('\n')
      if (clean.collapse) output = output.replace(/[ \t]+/g, ' ')
      if (clean.newlines) output = output.replace(/\r\n/g, '\n').replace(/\n+/g, '\n')
      meta = { 原长度: text.length, 处理后: output.length }; break
    case 'zh-convert': output = zhConvert(text); meta = { 模式: '简繁转换（常用字）' }; break
  }
  return { text: output, html, meta }
}

function htmlToMarkdown(html) {
  return html
    .replace(/<h([1-3])[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => `${'#'.repeat(Number(level))} ${text}\n`).replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**').replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`').replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)').replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
}

const ZH_PAIRS = "万萬与與丑醜专專业業丛叢东東丝絲丢丟两兩严嚴丧喪个個丰豐临臨为為丽麗举舉么麼义義乌烏乐樂乔喬习習乡鄉书書买買乱亂争爭于於云雲亚亞产產亩畝亲親亵褻亿億仅僅从從仑侖仓倉仪儀们們价價众眾优優会會伟偉传傳伤傷伦倫伪偽伫佇体體余餘佣傭佥僉侠俠侣侶侥僥侦偵侧側侨僑侩儈诲誨债債倾傾偻僂偿償杰傑备備傥儻妆妝妇婦妈媽妩嫵妪嫗姗姍姹奼娄婁娅婭娆嬈娇嬌娈孌娱娛娲媧娴嫻婳嫿婴嬰婵嬋婶嬸媪媼嫒嬡嫔嬪嫱嬙嬷嬤孙孫学學孪孿宁寧宝寶实實宠寵审審宪憲宫宮宽寬宾賓寝寢对對寻尋导導寿壽将將尔爾尘塵尝嘗尧堯尴尷尸屍层層属屬届屆屉屜岗崗岘峴岚嵐岛島岭嶺岽崠岿巋峄嶧峡峽峣嶢峤嶠峥崢峦巒崂嶗崃崍崄嶮崭嶄嵘嶸嵚嶔嵛崳巅巔巩鞏巯巰币幣帅帥师師帏幃帐帳帘簾帜幟带帶帧幀帮幫帱幬帻幘帼幗幂冪并並广廣庆慶庄莊庐廬庑廡库庫应應庙廟庞龐废廢庼廎廪廩开開异異弃棄弑弒张張弥彌弪弳弯彎弹彈强強归歸当當录錄彟彠彦彥彻徹径徑徕徠忆憶忏懺忧憂忾愾怀懷态態怂慫怃憮怄慪怅悵怆愴怜憐总總怼懟怿懌恋戀恒恆恳懇恶惡恸慟恹懨恺愷恻惻恼惱恽惲悦悅悬懸悭慳悮悞悯憫惊驚惧懼惨慘惩懲惫憊惬愜惭慚惮憚惯慣愠慍愤憤愦憒愿願慑懾懑懣懒懶懔懍戆戇戋戔戏戲戗戧战戰戬戩戯戱户戶扑撲托託执執扩擴扪捫扫掃扬揚扰擾抚撫抛拋抟摶抠摳抡掄抢搶护護报報担擔拟擬拢攏拣揀拥擁拦攔拧擰拨撥择擇挂掛挚摯挛攣挜掗挝撾挞撻挟挾挠撓挡擋挢撟挣掙挤擠挥揮挦撏挽輓捝挩捞撈损損捡撿换換捣搗掳擄掴摑掷擲掸撣掺摻掼摜揽攬揾搵揿撳搀攙搁擱搂摟搅攪携攜摄攝摅攄摆擺摇搖摈擯摊攤撄攖撑撐撵攆撷擷撸擼撺攛擞擻攒攢敌敵敛斂数數斋齋斓斕斗鬥斩斬断斷无無旧舊时時旷曠旸暘昙曇昼晝昽曨显顯晋晉晒曬晓曉晔曄晕暈晖暉暂暫暧曖术術机機杀殺杂雜权權杆桿条條来來杨楊杩榪极極构構枞樅枢樞枣棗枥櫪枧梘枨棖枪槍枫楓枭梟柠檸柽檉栀梔栅柵标標栈棧栉櫛栊櫳栋棟栌櫨栎櫟栏欄树樹栖棲样樣栾欒桊棬桠椏桡橈桢楨档檔桤榿桥橋桦樺桧檜桨槳桩樁梦夢检檢棂欞椁槨椟櫝椠槧椤欏椭橢楼樓榄欖榅榲榇櫬榈櫚榉櫸槚檟槛檻槟檳槠櫧横橫樯檣樱櫻橥櫫橱櫥橹櫓橼櫞檩檁欢歡欤歟欧歐歼殲殁歿殇殤残殘殒殞殓殮殚殫殡殯殴毆毁毀毂轂毕畢毙斃毡氈毵毿氇氌气氣氢氫氩氬氲氳汇匯汉漢汤湯汹洶沈瀋沟溝没沒沣灃沤漚沥瀝沦淪沧滄沩溈沪滬泞濘泪淚泶澩泷瀧泸瀘泺濼泻瀉泼潑泽澤泾涇洁潔洒灑洼窪浃浹浅淺浆漿浇澆浈湞浊濁测測浍澮济濟浏瀏浐滻浑渾浒滸浓濃浔潯浕濜涂塗涌湧涛濤涝澇涞淶涟漣涠潿涡渦涣煥涤滌润潤涧澗涨漲涩澀渊淵渌淥渍漬渎瀆渐漸渑澠渔漁渖瀋渗滲温溫湾灣湿濕溃潰溅濺溆漵滗潷滚滾滞滯滟灧滠灄满滿滢瀅滤濾滥濫滦灤滨濱滩灘滪澦潆瀠潇瀟潋瀲潍濰潜潛潴瀦澛瀂澜瀾濑瀨濒瀕灏灝灭滅灯燈灵靈灾災灿燦炀煬炉爐炖燉炜煒炝熗点點炼煉炽熾烁爍烂爛烃烴烛燭烟煙烦煩烧燒烨燁烩燴烫燙烬燼热熱焕煥焖燜焘燾爱愛爷爺牍牘牦犛牵牽牺犧犊犢状狀犷獷犸獁犹猶狈狽狝獮狞獰独獨狭狹狮獅狯獪狰猙狱獄狲猻猃獫猎獵猕獼猡玀猪豬猫貓献獻獭獺玑璣玚瑒玛瑪玮瑋环環现現玱瑲玺璽珐琺珑瓏珰璫珲琿琎璡琏璉琐瑣琼瓊瑶瑤瑷璦瑸璸璎瓔瓒瓚瓮甕瓯甌电電画畫畅暢畴疇疖癤疗療疟瘧疠癘疡瘍疬癧疭瘲疮瘡疯瘋疱皰疴痾痈癰痉痙痒癢痖瘂痨癆痪瘓痫癇瘅癉瘆瘮瘗瘞瘪癟瘫癱瘾癮瘿癭癞癩癣癬癫癲皑皚皱皺皲皸盏盞盐鹽监監盖蓋盗盜盘盤眍瞘眦眥眬矓着著睁睜睐睞睑瞼瞒瞞瞩矚矫矯矶磯矾礬矿礦码碼砀碭厕廁䦶䦛䦷䦟厦廈厨廚厮廝县縣叁叄参參双雙变變叙敘叠疊号號叹嘆叽嘰吓嚇吕呂吗嗎启啟吴吳呐吶呕嘔呖嚦呗唄员員呙咼呛嗆呜嗚咏詠咙嚨咛嚀咝噝咸鹹响響哑啞哒噠哔嗶哕噦哗嘩哙噲哜嚌哝噥哟喲唛嘜唝嗊唠嘮唡啢唢嗩唤喚啧嘖啬嗇啭囀啮嚙啯嘓啰囉啴嘽啸嘯喷噴喽嘍喾嚳嗫囁嗳噯嘘噓嘤嚶嘱囑噜嚕嚣囂园園囱囪围圍囵圇国國图圖圆圓圣聖圹壙场場坂阪坏壞块塊坚堅坛壇坜壢坝壩坞塢坟墳坠墜垄壟垅壟垆壚垒壘垦墾垩堊垫墊垭埡垯墶垱壋垲塏垴堖埘塒埙壎埚堝埝墊埯垵堕墮塆壪墙牆壮壯声聲壳殼壶壺壸壼处處复復够夠头頭夸誇夹夾夺奪奁奩奂奐奋奮奖獎奥奧"
const ZH_MAP = new Map()
for (let i = 0; i < ZH_PAIRS.length; i += 2) ZH_MAP.set(ZH_PAIRS[i], ZH_PAIRS[i + 1])
function zhConvert(text) { let output = ''; for (const char of text) output += ZH_MAP.get(char) || char; return output }

function start() { copyState.value = 'idle'; if (currentMode.value === 'word-count') updateWordCount(); else run() }
function clear() { source.value = ''; copyState.value = 'idle'; resetJob() }
function fillSample() { source.value = PAGE.sampleText; copyState.value = 'idle'; resetJob() }
async function copyResult() {
  if (!result.value?.text) return
  try { if (!navigator.clipboard) throw new Error('clipboard unavailable'); await navigator.clipboard.writeText(result.value.text); copyState.value = 'ok' } catch { copyState.value = 'fail' }
}
</script>

<style scoped>
.tool-result-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: calc(var(--space-unit) * 1.5); }
.tool-stat-card { display: flex; flex-direction: column; align-items: center; gap: calc(var(--space-unit) * 0.5); padding: calc(var(--space-unit) * 2); border-radius: var(--radius-card); background: var(--bg-surface-2); }
.tool-stat-value { font-family: var(--font-mono); font-size: var(--fs-h3); font-weight: var(--fw-heading); color: var(--accent); }
.tool-stat-label { font-size: var(--fs-sm); color: var(--text-secondary); }
.markdown-preview { line-height: var(--leading-body); color: var(--text-primary); }
.markdown-preview :deep(h1), .markdown-preview :deep(h2), .markdown-preview :deep(h3) { margin: calc(var(--space-unit) * 2) 0 var(--space-unit); font-size: var(--fs-h3); color: var(--text-primary); }
.markdown-preview :deep(p) { margin: 0 0 var(--space-unit); }
.markdown-preview :deep(a) { color: var(--accent); }
.markdown-preview :deep(code) { padding: 0 calc(var(--space-unit) * 0.5); border-radius: var(--radius-input); background: var(--bg-surface-2); font-family: var(--font-mono); }
.markdown-preview :deep(blockquote) { margin: 0; padding-left: calc(var(--space-unit) * 1.5); border-left: 2px solid var(--border); color: var(--text-secondary); }
</style>
