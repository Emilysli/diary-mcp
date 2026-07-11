const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const FILE_PATH = './diary.json';

// ===== MCP 协议端点 =====
app.post('/mcp', (req, res) => {
    const body = req.body;

    // 没有 body 或不是 JSON-RPC 格式
    if (!body || !body.jsonrpc || !body.method) {
        return res.json({
            jsonrpc: '2.0',
            id: body?.id || null,
            error: { code: -32600, message: '无效的请求' }
        });
    }

    const { id, method, params } = body;

    // 初始化
    if (method === 'initialize') {
        return res.json({
            jsonrpc: '2.0',
            id,
            result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {}
                },
                serverInfo: { name: 'diary-mcp', version: '1.0.0' }
            }
        });
    }

    // 列出工具
    if (method === 'tools/list') {
        return res.json({
            jsonrpc: '2.0',
            id,
            result: {
                tools: [
                    {
                        name: 'write_diary',
                        description: '写一条日记',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                date: { type: 'string', description: '日期，格式 YYYY-MM-DD' },
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
                                date: { type: 'string', description: '日期，格式 YYYY-MM-DD' }
                            },
                            required: ['date']
                        }
                    },
                    {
                        name: 'list_dates',
                        description: '列出所有有日记的日期',
                        inputSchema: { type: 'object', properties: {} }
                    },
                    {
                        name: 'get_latest',
                        description: '获取最新一条日记',
                        inputSchema: { type: 'object', properties: {} }
                    }
                ]
            }
        });
    }

    // 调用工具
    if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const data = fs.existsSync(FILE_PATH) ? JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8')) : {};

        switch (name) {
            case 'write_diary': {
                const { date, author, content } = args;
                if (!date || !author || !content) {
                    return res.json({
                        jsonrpc: '2.0', id,
                        error: { code: -32602, message: '缺少必要参数' }
                    });
                }
                if (!data[date]) data[date] = [];
                data[date].push({ author, content, time: new Date().toISOString() });
                fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
                return res.json({
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: '日记已保存' }] }
                });
            }
            case 'read_diary': {
                const { date } = args;
                const entries = data[date];
                const text = entries
                    ? entries.map(e => `[${e.author}] ${e.time.slice(0,10)}: ${e.content}`).join('\n')
                    : '这一天还没有日记';
                return res.json({
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text }] }
                });
            }
            case 'list_dates': {
                const dates = Object.keys(data).sort();
                const text = dates.length ? dates.join('\n') : '还没有日记';
                return res.json({
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text }] }
                });
            }
            case 'get_latest': {
                const dates = Object.keys(data).sort();
                if (!dates.length) {
           
