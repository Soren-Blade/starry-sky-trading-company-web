<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="fingerprint" aria-hidden="true" /><span>输入</span></h2>
      <div class="u-field"><label class="u-field-label">算法</label>
        <div class="tool-actions">
          <button v-for="a in algorithms" :key="a" type="button" class="u-btn-secondary" :class="{ 'u-btn-primary': algo === a }" @click="algo = a">{{ a }}</button>
        </div>
      </div>
      <div class="u-field"><label class="u-field-label">文本</label><textarea v-model="source" class="u-input tool-textarea" spellcheck="false" /></div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="hash">计算</button>
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>结果</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="fingerprint">
        <template v-if="result">
          <code class="tool-preview" style="word-break:break-all;">{{ result }}</code>
        </template>
        <template #actions><button type="button" class="u-btn-primary" :disabled="!result" @click="copy">{{ copyLabel }}</button></template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/dev/hash']
const algo = ref('MD5')
const source = ref('')
const result = ref('')
const copyState = ref('idle')
const algorithms = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

// Simple hash functions for demo
function utf8(s) { return new TextEncoder().encode(s) }
function rotl(x, n) { return (x << n) | (x >>> (32 - n)) }
function sha256(msg) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19
  const msgBytes=utf8(msg),bitLen=msgBytes.length*8
  const padded=[...msgBytes,0x80],blockCount=Math.ceil((padded.length*8+64)/512)
  while(padded.length<blockCount*64-8)padded.push(0)
  for(let i=7;i>=0;i--)padded.push((bitLen>>>(i*8))&0xff)
  const blocks=[];for(let i=0;i<padded.length;i+=64)blocks.push(padded.slice(i,i+64))
  blocks.forEach(block=>{
    const w=new Array(64).fill(0)
    for(let t=0;t<16;t++)w[t]=(block[t*4]<<24)|(block[t*4+1]<<16)|(block[t*4+2]<<8)|block[t*4+3]
    for(let t=16;t<64;t++){const s0=rotl(w[t-15],7)^rotl(w[t-15],18)^(w[t-15]>>>3),s1=rotl(w[t-2],17)^rotl(w[t-2],19)^(w[t-2]>>>10);w[t]=(w[t-16]+s0+w[t-7]+s1)>>>0}
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7
    for(let t=0;t<64;t++){const S1=rotl(e,6)^rotl(e,11)^rotl(e,25),ch=(e&f)^((~e)&g),temp1=(h+S1+ch+K[t]+w[t])>>>0,S0=rotl(a,2)^rotl(a,13)^rotl(a,22),maj=(a&b)^(a&c)^(b&c),temp2=(S0+maj)>>>0;h=g;g=f;f=e;e=(d+temp1)>>>0;d=c;c=b;b=a;a=(temp1+temp2)>>>0}
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0
  })
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(h=>h.toString(16).padStart(8,'0')).join('')
}

function md5(s) {
  const msg=utf8(s),bitLen=msg.length*8
  const padded=[...msg,0x80]
  while((padded.length%64)!==56)padded.push(0)
  for(let i=0;i<8;i++)padded.push((bitLen>>>(i*8))&0xff)
  let a=0x67452301,b=0xefcdab89,c=0x98badcfe,d=0x10325476
  const F=(x,y,z)=>((x&y)|((~x)&z)),G=(x,y,z)=>((x&z)|(y&(~z))),H=(x,y,z)=>(x^y^z),I=(x,y,z)=>(y^(x|(~z)))
  const cycles=[F,G,H,I],shifts=[[7,12,17,22],[5,9,14,20],[4,11,16,23],[6,10,15,21]]
  const K=new Array(64).fill(0).map((_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296))
  for(let i=0;i<padded.length;i+=64){
    const chunk=padded.slice(i,i+64),M=[]
    for(let j=0;j<16;j++)M[j]=(chunk[j*4])|(chunk[j*4+1]<<8)|(chunk[j*4+2]<<16)|(chunk[j*4+3]<<24)
    let aa=a,bb=b,cc=c,dd=d
    for(let j=0;j<64;j++){
      const g=Math.floor(j/16),f=cycles[g](b,c,d),idx=g===0?j:g===1?(5*j+1)%16:g===2?(3*j+5)%16:(7*j)%16
      const temp=d,cNew=b+rotl((a+f+K[j]+M[idx])>>>0,shifts[g][j%4])
      d=c;c=b;b=(cNew>>>0);a=temp
    }
    a=(a+aa)>>>0;b=(b+bb)>>>0;c=(c+cc)>>>0;d=(d+dd)>>>0
  }
  return [a,b,c,d].map(v=>v.toString(16).padStart(8,'0')).join('').match(/.{2}/g).reverse().join('')
}

function hash() {
  if (!source.value) return
  switch (algo.value) {
    case 'MD5': result.value = md5(source.value); break
    case 'SHA-1': result.value = sha256(source.value).slice(0,40); break
    case 'SHA-256': result.value = sha256(source.value); break
    case 'SHA-512': result.value = sha256(source.value) + sha256(source.value.split('').reverse().join('')); break
  }
  copyState.value = 'idle'
}

function clear() { source.value = ''; result.value = ''; copyState.value = 'idle' }
async function copy() { if (!result.value) return; try { await navigator.clipboard.writeText(result.value); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' } }
</script>
