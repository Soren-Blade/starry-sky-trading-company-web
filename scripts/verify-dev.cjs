/**
 * 完整联调 + HMR 实测
 *
 * 这是本仓库唯一的**真实运行**验证：它与 `test/*.test.js` 不同 ——
 * 那些测试直接加载 `src/` 源码，无法证明「dev server 能起来、代理能转发、HMR 能推送」。
 *
 * 验证四件事：
 *   1. vite dev server 能启动，`/` 返回含 HMR 客户端与入口的 HTML
 *   2. dev 代理把 API 请求转发到后端（真实后端；vite.config 的 target 默认为 8080）
 *   3. HMR WebSocket 能握手（必须带子协议 `vite-hmr`）
 *   4. **改源文件后 HMR 真实推送变更**，且不触发整页 reload
 *
 * 用法：npm run verify:dev     （或 node scripts/verify-dev.cjs）
 *
 * 注意：会真实启动 vite dev server 与后端（占用 5173 / 8080），
 * 因此在受限沙箱中需要放宽权限（esbuild 要派生子进程）。
 * 脚本结束时会关闭两个服务、删除临时目录，并确保被改动的源文件已还原。
 */
const path = require('node:path')
const fs = require('node:fs')
const http = require('node:http')
const { spawn } = require('node:child_process')

const WEB = path.join(__dirname, '..')
const SERVER = path.join(WEB, '..', 'starry-sky-trading-company-server')

require(path.join(SERVER, 'node_modules', 'dotenv')).config({ path: path.join(SERVER, '.env') });
process.env.JWT_SECRET = 'probe-dev-secret-0123456789abcdef';
process.env.ADMIN_TOKEN = '';

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });

const httpGet = (port, p) =>
  new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: p, timeout: 10000 }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });

// 注意：executor 写成块体，不要用 `(r) => setTimeout(r, ms)` 这种返回值形式 ——
// promise executor 的返回值不会被读取（lint 的 no-promise-executor-return 会报）
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  });

(async () => {
  // ── 1. 启动后端（vite 代理的 target 是 8080，这里直接用 8080）────────
  const app = require(path.join(SERVER, 'src', 'index.js'));
  const backend = await new Promise((resolve) => {
    // 强制 8080，与 vite.config.js 的默认 apiTarget 一致
    const s = app.listen(8080, '127.0.0.1', () => resolve(s));
  });
  console.error('  后端已启动 :8080');

  // ── 2. 启动 vite dev（宽松权限下才可行）──────────────────────────
  const tmpDir = path.join(WEB, '.tmp-probe');
  fs.mkdirSync(tmpDir, { recursive: true });
  const vite = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: WEB,
    shell: true,
    env: { ...process.env, TMP: tmpDir, TEMP: tmpDir, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let viteOut = '';
  vite.stdout.on('data', (d) => (viteOut += d.toString()));
  vite.stderr.on('data', (d) => (viteOut += d.toString()));

  // 等就绪（最多 40 秒）
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    if (/ready in|Local:/.test(viteOut)) {
      ready = true;
      break;
    }
  }
  check('vite dev 启动并就绪', ready, ready ? '' : viteOut.slice(-300));
  if (!ready) {
    console.error(viteOut);
    process.exit(1);
  }

  // ── 3. HTML 骨架 ─────────────────────────────────────────────────
  const index = await httpGet(5173, '/');
  check('GET / -> 200', index.status === 200, `HTTP ${index.status}`);
  check('HTML 含 HMR 客户端', index.body.includes('@vite/client'));
  check('HTML 含入口 main.js', index.body.includes('/src/main.js'));

  // ── 4. 代理转发（前后端联调的关键）──────────────────────────────
  const health = await httpGet(5173, '/health');
  let healthJson = null;
  try {
    healthJson = JSON.parse(health.body);
  } catch {
    /* 非 JSON */
  }
  check(
    '代理 /health 转发到后端并返回后端 JSON',
    health.status === 200 && healthJson && typeof healthJson === 'object',
    `HTTP ${health.status}，body=${health.body.slice(0, 120)}`
  );

  const visitor = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({});
    const req = http.request(
      { host: '127.0.0.1', port: 5173, path: '/user/visitorLogin', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  check(
    '代理 POST /user/visitorLogin 返回 token 响应头',
    visitor.status === 200 && Boolean(visitor.headers['access-token']),
    `HTTP ${visitor.status}，access-token=${Boolean(visitor.headers['access-token'])}`
  );

  // ── 4b. 每个前端 API 请求路径都必须能被代理接住 ─────────────────
  //
  // 这是本项目真实踩过的坑：`vite.config.js` 的 proxy 是按路径逐条列出的，
  // 且**不能**简单地写 `'/user'` —— `/user/kami`、`/user/orders` 是前端路由，
  // 整段代理会让这些页面在 dev 下永远打不开。于是 `/user` 下的四个接口各自列了一条。
  // 新增一个后端前缀却忘了加代理规则时，dev 下该接口会被 dev server 自己接住，
  // 返回 index.html；前端拿到一段 HTML 去解析，报的却是「网络错误」，
  // 排查方向被完全带偏。
  //
  // 判定规则：每个具体调用路径，要么**整条**是 proxy 的键（`/user/login` 这种），
  // 要么它的**第一段**是 proxy 的键（`/cartApi/getCart` → `/cartApi`）。
  const apiDir = path.join(WEB, 'src', 'api', 'ask');
  const callPaths = new Set();

  for (const file of fs.readdirSync(apiDir).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(apiDir, file), 'utf8');

    const bases = {};
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*['"]([^'"]+)['"]/g)) bases[m[1]] = m[2];

    for (const m of src.matchAll(/request\.(?:get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]*)[`'"]/g)) {
      // `${baseURL}` 还原成字面量；`${encodeURIComponent(x)}` 这类还原不了也无妨 ——
      // 后面只看第一段路径。
      const resolved = m[1].replace(/\$\{(\w+)\}/g, (_, name) => (name in bases ? bases[name] : ''));
      callPaths.add(resolved.split('?')[0]);
    }
  }

  const viteConfig = fs.readFileSync(path.join(WEB, 'vite.config.js'), 'utf8');
  const proxyBlock = viteConfig.slice(viteConfig.indexOf('proxy:'));
  const proxyKeys = new Set(
    [...proxyBlock.matchAll(/^\s*'([^']+)':\s*\{\s*target/gm)].map((m) => m[1])
  );

  check(
    '静态比对：前端 API 调用路径已全部解析出来',
    callPaths.size >= 15,
    `解析到 ${callPaths.size} 条：${[...callPaths].join(', ')}`
  );

  const firstSegment = (p) => '/' + String(p).split('/').filter(Boolean)[0];
  const unproxied = [...callPaths].filter(
    (p) => !proxyKeys.has(p) && !proxyKeys.has(firstSegment(p))
  );
  check(
    'vite.config.js 的代理能覆盖全部前端 API 调用路径',
    unproxied.length === 0,
    `以下路径在 dev 下不会被转发：${unproxied.join(', ')}`
  );

  // 交易前缀是本次新增的三条，单独真实请求一次
  for (const [prefix, expected] of [
    ['/cartApi/getCart', 'UNAUTHORIZED'],
    ['/orderApi/getOrders', 'UNAUTHORIZED'],
    ['/favoriteApi/getFavorites?target_type=product', 'UNAUTHORIZED'],
  ]) {
    const res = await httpGet(5173, prefix);
    let json = null;
    try {
      json = JSON.parse(res.body);
    } catch {
      /* 不是 JSON —— 说明被 dev server 接住返回了 index.html */
    }
    check(
      `代理 ${prefix} 转发到后端（返回 JSON 而不是 index.html）`,
      Boolean(json) && (json.code === expected || json.success === false),
      `HTTP ${res.status}，body=${res.body.slice(0, 120)}`
    );
  }

  // `/uploads` 不是 `request()` 调用，上面对 API 调用路径的静态比对**覆盖不到它**，
  // 而它一旦没被代理，表现是「头像上传成功但图片不显示」—— 极难联想到代理配置。
  // 这里直接打一个不存在的文件：后端会回 JSON 404，dev server 未被代理时回 index.html。
  const uploadsProbe = await httpGet(5173, '/uploads/avatars/__probe__.png');
  let uploadsJson = null;
  try {
    uploadsJson = JSON.parse(uploadsProbe.body);
  } catch {
    /* index.html */
  }
  check(
    '代理 /uploads 转发到后端（用户上传的头像才能在 dev 下显示）',
    uploadsProbe.status === 404 && uploadsJson?.code === 'NOT_FOUND',
    `HTTP ${uploadsProbe.status}，body=${uploadsProbe.body.slice(0, 120)}`
  );

  // ── 5. HMR 真实推送 ─────────────────────────────────────────────
  // 注意：Vite 的 HMR socket 必须带子协议 `vite-hmr`，只给 URL 会握手失败。
  // 见 /@vite/client 里的 `new WebSocket(url, "vite-hmr")`。
  //
  // 另外：真实浏览器会先通过同一 socket 加载模块，Vite 才能算出「哪些模块需要更新」
  // 并发出 `update` 消息；只连 socket 不加载模块时，Vite 走的是 `custom:file-changed`
  // 通知。为贴近真实场景，下面先让 socket 加载入口模块，再改文件并观察 update。
  const clientSrc = await httpGet(5173, '/@vite/client');
  const tokenMatch = clientSrc.body.match(/wsToken\s*=\s*"([^"]*)"/);
  const wsToken = tokenMatch ? tokenMatch[1] : '';

  const messages = [];
  const ws = new WebSocket(`ws://127.0.0.1:5173/?token=${wsToken}`, 'vite-hmr');
  let wsOpen = false;

  await new Promise((resolve) => {
    const t = setTimeout(resolve, 10000);
    ws.onopen = () => {
      wsOpen = true;
      clearTimeout(t);
      resolve();
    };
    ws.onerror = () => {
      clearTimeout(t);
      resolve();
    };
    ws.onmessage = (ev) => {
      try {
        messages.push(JSON.parse(ev.data));
      } catch {
        /* 忽略非 JSON */
      }
    };
  });
  check('HMR WebSocket 已连接（子协议 vite-hmr）', wsOpen);

  if (wsOpen) {
    // 先触发 Vite 解析这些模块，使其进入模块图（真实浏览器加载页面时就是这样）
    const warmup = [
      '/src/main.js',
      '/src/components/SectionHeader.vue',
      '/src/components/KamiSection.vue',
      '/src/hooks/useKamiDisplay/index.js',
    ];
    for (const p of warmup) {
      try {
        await httpGet(5173, p);
      } catch {
        /* 单个模块失败不影响结论 */
      }
    }
    await sleep(1500);

    // 触发一次真实文件变更（只改注释内容，随后还原）
    const target = path.join(WEB, 'src', 'components', 'SectionHeader.vue');
    const original = fs.readFileSync(target, 'utf8');
    const marker = `<!-- hmr-probe-${Date.now()} -->`;

    try {
      for (let round = 1; round <= 3; round++) {
        const before = messages.length;
        fs.writeFileSync(target, original + `\n${marker}-${round}\n`, 'utf8');
        for (let i = 0; i < 12; i++) {
          await sleep(400);
          if (messages.length > before) break;
        }
        if (messages.some((m) => m.type === 'update' || m.type === 'full-reload')) break;
      }
    } finally {
      fs.writeFileSync(target, original, 'utf8');
    }

    console.error('  --- HMR 收到的消息 ---');
    for (const m of messages) {
      console.error('    ' + JSON.stringify(m).slice(0, 220));
    }

    const updates = messages.filter((m) => m.type === 'update');
    const fullReload = messages.filter((m) => m.type === 'full-reload');
    const changedNotices = messages.filter(
      (m) => m.type === 'custom' && m.event === 'file-changed'
    );

    // 核心结论：Vite 确实把「本文件变化」通过 HMR socket 推给了客户端。
    // 两种形态都算通过：模块图中的 `update`，或文件监听级的 `custom:file-changed`。
    const sawOurFile =
      updates.some((m) => (m.updates || []).some((u) => String(u.path || '').includes('SectionHeader'))) ||
      changedNotices.some((m) => String((m.data && m.data.file) || '').includes('SectionHeader'));
    check('HMR 推送了 SectionHeader.vue 的变更（update 或 file-changed）', sawOurFile);
    check(
      'HMR 未触发整页 reload（应是局部热更新，而非刷新）',
      fullReload.length === 0,
      `收到 ${fullReload.length} 条 full-reload`
    );
    check(
      'HMR 连接后收到服务端业务消息',
      messages.some((m) => m.type !== 'connected'),
      `仅收到 ${JSON.stringify(messages.map((m) => m.type))}`
    );
  }

  const sourceRestored = !fs
    .readFileSync(path.join(WEB, 'src', 'components', 'SectionHeader.vue'), 'utf8')
    .includes('hmr-probe-');
  check('探测后源文件已还原', sourceRestored);

  // ── 6. 清理 ─────────────────────────────────────────────────────
  try {
    ws.close();
  } catch {
    /* ignore */
  }
  vite.kill();
  backend.close();
  await sleep(1500);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const pass = results.filter((r) => r.ok).length;
  console.log('');
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d && !r.ok ? '  [' + r.d + ']' : ''}`);
  }
  console.log(`\n  DEV_PROBE ${pass}/${results.length}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => {
  console.error('  探测脚本异常：' + e.message);
  process.exit(1);
});
