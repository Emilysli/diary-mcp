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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('日记MCP已启动，端口: ' + PORT);
});
