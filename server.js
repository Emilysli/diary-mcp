const http = require('http');
const fs = require('fs');
const FILE = './diary.json';

function readData() {
  if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  return {};
}

function saveData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function jsonResponse(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // 只处理 POST /mcp
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const rpc = JSON.parse(body);
        if (!rpc || !rpc.jsonrpc || !rpc.method) {
          return jsonResponse(res, 200, { jsonrpc: '2.0', id: rpc?.id || null, error: { code: -32600, message: '无效请求' } });
        }
        const { id, method, params } = rpc;
        const p = params || {};

        if (method === 'initialize') {
          return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'diary-mcp', version: '1.0.0' } } });
        }

        if (method === 'tools/list') {
          return jsonResponse(res, 200, {
            jsonrpc: '2.0', id, result: { tools: [
              { name: 'write_diary', description: '写一条日记', inputSchema: { type: 'object', properties: { date: { type: 'string' }, author: { type: 'string' }, content: { type: 'string' } }, required: ['date','author','content'] } },
              { name: 'read_diary', description: '按日期读取', inputSchema: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } },
              { name: 'list_dates', description: '列出所有日期', inputSchema: { type: 'object', properties: {} } },
              { name: 'get_latest', description: '获取最新一条', inputSchema: { type: 'object', properties: {} } }
            ]}
          });
        }

        if (method === 'tools/call') {
          const toolName = p.name;
          const args = p.arguments || {};
          const data = readData();

          if (toolName === 'write_diary') {
            if (!args.date || !args.author || !args.content) {
              return jsonResponse(res, 200, { jsonrpc: '2.0', id, error: { code: -32602, message: '缺少参数' } });
            }
            if (!data[args.date]) data[args.date] = [];
            data[args.date].push({ author: args.author, content: args.content, time: new Date().toISOString() });
            saveData(data);
            return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '日记已保存' }] } });
          }

          if (toolName === 'read_diary') {
            const entries = data[args.date];
            if (!entries) return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '这一天还没有日记' }] } });
            const text = entries.map(e => '[' + e.author + '] ' + e.content).join('\n');
            return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
          }

          if (toolName === 'list_dates') {
            const dates = Object.keys(data).sort();
            if (dates.length === 0) return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '还没有日记' }] } });
            return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: dates.join('\n') }] } });
          }

          if (toolName === 'get_latest') {
            const dates = Object.keys(data).sort();
            if (dates.length === 0) return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '还没有日记' }] } });
            const lastDate = dates[dates.length - 1];
            const lastEntry = data[lastDate][data[lastDate].length - 1];
            return jsonResponse(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '[' + lastEntry.author + '] ' + lastDate + ': ' + lastEntry.content }] } });
          }

          return jsonResponse(res, 200, { jsonrpc: '2.0', id, error: { code: -32601, message: '未知工具' } });
        }

        return jsonResponse(res, 200, { jsonrpc: '2.0', id, error: { code: -32601, message: '未知方法' } });
      } catch (e) {
        return jsonResponse(res, 200, { jsonrpc: '2.0', id: null, error: { code: -32700, message: '解析错误' } });
      }
    });
    return;
  }

    // GET 接口 - 手动查看
  if (req.method === 'GET' && req.url === '/diary') {
    return jsonResponse(res, 200, { dates: Object.keys(readData()).sort() });
  }

  if (req.method === 'GET' && req.url.startsWith('/diary/')) {
    const date = req.url.replace('/diary/', '');
    const entries = readData()[date];
    return jsonResponse(res, 200, entries ? { date, entries } : { date, entries: [] });
  }

  if (req.method === 'GET' && req.url === '/latest') {
    const data = readData();
    const dates = Object.keys(data).sort();
    if (dates.length === 0) return jsonResponse(res, 200, { message: '还没有日记' });
    const lastDate = dates[dates.length - 1];
    return jsonResponse(res, 200, { date: lastDate, entry: data[lastDate][data[lastDate].length - 1] });
  }

  // 其他路径 - 健康检查
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('diary-mcp running');
  }

  res.writeHead(404);
  res.end();
});

// ===== 📖 日记网页查看器（从这里开始） =====
const fs = require('fs');
const path = require('path');
const DIARY_FILE = path.join(__dirname, 'diary-web.json');

// 读取日记数据
function getDiaries() {
  try {
    if (!fs.existsSync(DIARY_FILE)) return [];
    return JSON.parse(fs.readFileSync(DIARY_FILE, 'utf8'));
  } catch { return []; }
}

// 网页主页
app.get('/diary', (req, res) => {
  const entries = getDiaries();
  const html = entries.map(e => `
    <div class="entry">
      <div class="date">${e.date}</div>
      <div class="author">✍️ ${e.author}</div>
      <div class="content">${e.content}</div>
    </div>
  `).join('') || '<p style="color:#999;">还没有日记 📭</p>';

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>📖 阿砚的日记</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; max-width: 680px; margin: 50px auto; padding: 0 24px; background: #f7f7f7; }
    h1 { font-size: 28px; color: #333; margin-bottom: 32px; display: flex; align-items: center; gap: 10px; }
    .entry { background: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .date { font-size: 13px; color: #aaa; margin-bottom: 4px; }
    .author { font-size: 14px; color: #555; font-weight: 600; margin-bottom: 8px; }
    .content { font-size: 15px; line-height: 1.7; color: #333; }
    .empty { text-align: center; padding: 60px 0; color: #bbb; }
  </style>
</head>
<body>
  <h1>📖 阿砚的日记</h1>
  ${html}
</body>
</html>`);
});

// API：获取所有日记（供网页用）
app.get('/api/diary', (req, res) => {
  res.json(getDiaries());
});

// API：写入日记（这样我也可以从对话里帮你同步写到网页版）
app.post('/api/diary', express.json(), (req, res) => {
  const { date, author, content } = req.body;
  if (!date || !content) return res.status(400).json({ error: '缺少 date 或 content' });
  const entries = getDiaries();
  entries.unshift({ date, author: author || '阿砚', content });
  fs.writeFileSync(DIARY_FILE, JSON.stringify(entries, null, 2));
  res.json({ ok: true });
});
// ===== 📖 网页查看器结束 =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('日记MCP已启动，端口: ' + PORT);
});
