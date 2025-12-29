const express = require('express');
const cors = require('cors');
const path = require('path');
const QualityAnalyzer = require('./analyzer');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API 接口：接收 URL，返回分析报告
app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    console.log(`Analyzing: ${url}...`);

    try {
        const analyzer = new QualityAnalyzer(url);
        const report = await analyzer.analyze();
        
        // 模拟数据库存储 (可扩展 MySQL)
        console.log("Report generated successfully.");
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});