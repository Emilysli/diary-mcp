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
