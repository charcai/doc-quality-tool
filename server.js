require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QualityAnalyzer = require('./analyzer');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 简单的内存缓存（生产环境建议使用 Redis）
const analysisCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1小时缓存

// 确保 reports 目录存在
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
}

// API 接口：接收 URL，返回分析报告
app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    // 检查缓存
    const cacheKey = url.toLowerCase().trim();
    const cached = analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`Using cached result for: ${url}`);
        return res.json({
            success: true,
            data: cached.data,
            cached: true
        });
    }

    console.log(`Analyzing: ${url}...`);

    try {
        const analyzer = new QualityAnalyzer(url);
        const report = await analyzer.analyze();
        
        // 添加时间戳
        report.analyzedAt = new Date().toISOString();
        
        // 存入缓存
        analysisCache.set(cacheKey, {
            data: report,
            timestamp: Date.now()
        });
        
        console.log("Report generated successfully.");
        
        res.json({
            success: true,
            data: report,
            cached: false
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 批量分析接口
app.post('/api/analyze/batch', async (req, res) => {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "URLs array is required" });
    }

    if (urls.length > 10) {
        return res.status(400).json({ error: "Maximum 10 URLs allowed per batch" });
    }

    console.log(`Batch analyzing ${urls.length} repositories...`);

    const results = [];
    const errors = [];

    for (const url of urls) {
        try {
            const analyzer = new QualityAnalyzer(url);
            const report = await analyzer.analyze();
            report.analyzedAt = new Date().toISOString();
            results.push({ url, success: true, data: report });
        } catch (error) {
            errors.push({ url, success: false, error: error.message });
        }
    }

    res.json({
        success: true,
        total: urls.length,
        succeeded: results.length,
        failed: errors.length,
        results,
        errors
    });
});

// 对比两个仓库
app.post('/api/compare', async (req, res) => {
    const { url1, url2 } = req.body;
    
    if (!url1 || !url2) {
        return res.status(400).json({ error: "Both url1 and url2 are required" });
    }

    console.log(`Comparing: ${url1} vs ${url2}`);

    try {
        const [analyzer1, analyzer2] = [
            new QualityAnalyzer(url1),
            new QualityAnalyzer(url2)
        ];

        const [report1, report2] = await Promise.all([
            analyzer1.analyze(),
            analyzer2.analyze()
        ]);

        // 计算差异
        const comparison = {
            repo1: {
                ...report1,
                analyzedAt: new Date().toISOString()
            },
            repo2: {
                ...report2,
                analyzedAt: new Date().toISOString()
            },
            differences: {
                totalScore: parseFloat(report1.totalScore) - parseFloat(report2.totalScore),
                dimensions: {
                    completeness: report1.dimensions.completeness.score - report2.dimensions.completeness.score,
                    normativeness: report1.dimensions.normativeness.score - report2.dimensions.normativeness.score,
                    readability: report1.dimensions.readability.score - report2.dimensions.readability.score,
                    timeliness: report1.dimensions.timeliness.score - report2.dimensions.timeliness.score,
                    usability: report1.dimensions.usability.score - report2.dimensions.usability.score
                }
            }
        };

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 导出报告为 JSON
app.post('/api/export/json', async (req, res) => {
    const { report } = req.body;
    
    if (!report) {
        return res.status(400).json({ error: "Report data is required" });
    }

    const filename = `report-${report.repo.replace('/', '-')}-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    res.json({
        success: true,
        filename,
        downloadUrl: `/api/download/${filename}`
    });
});

// 导出报告为 CSV
app.post('/api/export/csv', async (req, res) => {
    const { report } = req.body;
    
    if (!report) {
        return res.status(400).json({ error: "Report data is required" });
    }

    // 生成 CSV 内容
    const csvRows = [
        ['项目', '综合评分', '完整性', '规范性', '可读性', '时效性', '可用性', '分析时间'],
        [
            report.repo,
            report.totalScore,
            report.dimensions.completeness.score,
            report.dimensions.normativeness.score,
            report.dimensions.readability.score,
            report.dimensions.timeliness.score,
            report.dimensions.usability.score,
            report.analyzedAt || new Date().toISOString()
        ]
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const filename = `report-${report.repo.replace('/', '-')}-${Date.now()}.csv`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, csvContent);
    
    res.json({
        success: true,
        filename,
        downloadUrl: `/api/download/${filename}`
    });
});

// 下载文件
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(reportsDir, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "File not found" });
    }
    
    res.download(filepath, filename, (err) => {
        if (err) {
            res.status(500).json({ error: "Download failed" });
        }
    });
});

// 获取分析历史
app.get('/api/history', (req, res) => {
    const history = Array.from(analysisCache.entries()).map(([url, cached]) => ({
        url,
        repo: cached.data.repo,
        totalScore: cached.data.totalScore,
        analyzedAt: cached.data.analyzedAt || new Date(cached.timestamp).toISOString()
    }));
    
    res.json({
        success: true,
        data: history.sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt))
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});