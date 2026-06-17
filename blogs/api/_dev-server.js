// 本地开发服务器 - 模拟 Vercel Serverless Functions
// 使用: npm run dev

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 加载 .env 文件
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;
const BLOGS_DIR = path.join(__dirname, '..', 'blogs');
const API_DIR = __dirname;

// MIME 类型映射
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = parsed.pathname;

  // API 路由
  if (pathname.startsWith('/api/')) {
    const fnName = pathname.replace('/api/', '').replace(/\/$/, '') || 'agent-config';
    const fnPath = path.join(API_DIR, fnName + '.js');

    if (fs.existsSync(fnPath)) {
      // 模拟 Vercel serverless function 的 req/res
      const mockReq = {
        method: req.method,
        headers: req.headers,
        query: parsed.query,
        body: null,
      };

      // 收集 POST body
      if (req.method === 'POST' || req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try { mockReq.body = JSON.parse(body); } catch { mockReq.body = body; }
          callApiFn(fnPath, mockReq, res);
        });
        return;
      }

      callApiFn(fnPath, mockReq, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // 静态文件路由
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const filePath = path.join(BLOGS_DIR, pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});

function callApiFn(fnPath, mockReq, res) {
  // Vercel serverless functions 使用 ES module export default
  // 我们需要处理两种格式
  try {
    delete require.cache[require.resolve(fnPath)];
    const mod = require(fnPath);

    // 包装 res 以兼容 Vercel 的 res.status().json() 链式调用 + SSE 流式支持
    const mockRes = {
      _status: 200,
      _headers: {},
      _wroteHead: false,
      _ensureHead() {
        if (this._wroteHead) return;
        res.writeHead(this._status, this._headers);
        this._wroteHead = true;
      },
      status(code) { this._status = code; return this; },
      setHeader(key, val) { this._headers[key] = val; return this; },
      json(data) {
        this._ensureHead();
        if (!this._headers['content-type'] && !this._headers['Content-Type']) {
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify(data));
      },
      write(chunk) {
        this._ensureHead();
        res.write(chunk);
      },
      end(chunk) {
        this._ensureHead();
        res.end(chunk);
      },
    };

    const handler = mod.default || mod;
    handler(mockReq, mockRes);
  } catch (e) {
    console.error('[API Error]', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

server.listen(PORT, () => {
  console.log(`\n  TOOLBOX_Lully dev server running at:\n`);
  console.log(`  > Local:   http://localhost:${PORT}`);
  console.log(`  > API:     http://localhost:${PORT}/api/chat`);
  console.log(`\n  Make sure .env file has APPBUILDER_API_KEY set.\n`);
});
