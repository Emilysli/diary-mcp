const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const FILE_PATH = './diary.json';

app.get('/diary/:date', (req, res) => {
    const data = fs.existsSync(FILE_PATH) ? JSON.parse(fs.readFileSync(FILE_PATH)) : {};
    const entries = data[req.params.date];
    res.json(entries ? { date: req.params.date, entries } : { date: req.params.date, entries: [], message: '这一天还没有日记' });
});

app.post('/diary', (req, res) => {
    const { date, author, content } = req.body;
    if (!date || !author || !content) return res.json({ success: false, error: '需要提供 date、author、content' });
    const data = fs.existsSync(FILE_PATH) ? JSON.parse(fs.readFileSync(FILE_PATH)) : {};
    if (!data[date]) data[date] = [];
    data[date].push({ author, content, time: new Date().toISOString() });
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.get('/diary', (req, res) => {
    const data = fs.existsSync(FILE_PATH) ? JSON.parse(fs.readFileSync(FILE_PATH)) : {};
    res.json({ dates: Object.keys(data).sort() });
});

app.get('/latest', (req, res) => {
    const data = fs.existsSync(FILE_PATH) ? JSON.parse(fs.readFileSync(FILE_PATH)) : {};
    const dates = Object.keys(data).sort();
    if (!dates.length) return res.json({ message: '还没有日记' });
    const last = dates[dates.length - 1];
    res.json({ date: last, entry: data[last][data[last].length - 1] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('📔 日记MCP跑在端口 ' + PORT));
