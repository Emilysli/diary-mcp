const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const FILE_PATH = './diary.json';

function readData() {
  if (fs.existsSync(FILE_PATH)) {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
  }
  return {};
}

function saveData(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

// MCP 协议入口
app.post('/mcp', (req, res) => {
  const body = req.body;
  if (!body || !body.jsonrpc || !body.method) {
    return res.json({
      jsonrpc: '2.0',
      id: body ? body.id : null,
      error: { code: -32600, message: '无效请求' }
    });
  }

  const id = body.id;
  const method = body.method;
  const params = body.params || {};

  // 初始化
  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id: id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'diary-mcp', version: '1.0.0' }
      }
    });
  }

  // 列出工具
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id: id,
      result: {
        tools: [
          {
            name: 'write_diary',
            description: '写一条日记',
            inputSchema: {
              type: 'object',
              properties: {
                date: { type: 'string', description: '日期 YYYY-MM-DD' },
                author: { type: 'string', description: '作者名' },
                content: { type: 'string', description: '日记内容' }
              },
              required: ['date', 'author', 'content']
            }
          },
          {
            name: 'read_diary',
            description: '按日期读取日记',
            inputSchema: {
              type: 'object',
              properties: {
                date: { type: 'string', description: '日期 YYYY-MM-DD' }
              },
              required: ['date']
            }
          },
          {
            name: 'list_dates',
            description: '列出所有有日记的日期',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_latest',
            description: '获取最新一条日记',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      }
    });
  }

  // 调用工具
  if (method === 'tools/call') {
    const toolName = params.name;
    const args = params.arguments || {};
    const data = readData();

    if (toolName === 'write_diary') {
      const date = args.date;
      const author = args.author;
      const content = args.content;
      if (!date || !author || !content) {
        return res.json({
          jsonrpc: '2.0',
          id: id,
          error: { code: -32602, message: '缺少必要参数' }
        });
      }
      if (!data[date]) {
        data[date] = [];
      }
      data[date].push({
        author: author,
        content: content,
        time: new Date().toISOString()
      });
      saveData(data);
      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: { content: [{ type: 'text', text: '日记已保存' }] }
      });
    }

    if (toolName === 'read_diary') {
      const entries = data[args.date];
      if (!entries) {
        return res.json({
          jsonrpc: '2.0',
          id: id,
          result: { content: [{ type: 'text', text: '这一天还没有日记' }] }
        });
      }
      const text = entries.map(function(e) {
        return '[' + e.author + '] ' + e.content;
      }).join('\n');
      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: { content: [{ type: 'text', text: text }] }
      });
    }

    if (toolName === 'list_dates') {
      const dates = Object.keys(data).sort();
      if (dates.length === 0) {
        return res.json({
          jsonrpc: '2.0',
          id: id,
          result: { content: [{ type: 'text', text: '还没有日记' }] }
        });
      }
      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: { content: [{ type: 'text', text: dates.join('\n') }] }
      });
    }

    if (toolName === 'get_latest') {
      const dates = Object.keys(data).sort();
      if (dates.length === 0) {
        return res.json({
          jsonrpc: '2.0',
          id: id,
          result: { content: [{ type: 'text', text: '还没有日记' }] }
        });
      }
      const lastDate = dates[dates.length - 1];
      const lastEntry = data[lastDate][data[lastDate].length - 1];
      const text = '[' + lastEntry.author + '] ' + lastDate + ': ' + lastEntry.content;
      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: { content: [{ type: 'text', text: text }] }
      });
    }

    return res.json({
      jsonrpc: '2.0',
      id: id,
      error: { code: -32601, message: '未知工具: ' + toolName }
    });
  }

  return res.json({
    jsonrpc: '2.0',
    id: id,
    error: { code: -32601, message: '未知方法: ' + method }
  });
});

// HTTP 接口，方便手动查看
app.get('/diary', function(req, res) {
  const data = readData();
  res.json({ dates: Object.keys(data).sort() });
});

app.get('/diary/:date', function(req, res) {
  const data = readData();
  const entries = data[req.params.date];
  if (entries) {
    res.json({ date: req.params.date, entries: entries });
  } else {
    res.json({ date: req.params.date, entries: [] });
  }
});

app.get('/latest', function(req, res) {
  const data = readData();
  const dates = Object.keys(data).sort();
  if (dates.length === 0) {
    return res.json({ message: '还没有日记' });
  }
  const lastDate = dates[dates.length - 1];
  const lastEntry = data[lastDate][data[lastDate].length - 1];
  res.json({ date: lastDate, entry: lastEntry });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('日记MCP已启动，端口: ' + PORT);
});
