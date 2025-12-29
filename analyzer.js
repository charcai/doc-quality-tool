const axios = require('axios');

// ==========================================
// 配置区域
// ==========================================
// 从环境变量读取 Token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN 环境变量未设置，请在 .env 文件中配置');
}

const axiosConfig = {
    headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Doc-Quality-Tool-v1',
        'Accept': 'application/vnd.github.v3+json' // 明确告诉 GitHub 我们要 JSON 数据
    },
    timeout: 10000 // 设置 10 秒超时，防止卡死
};

// 评分权重
const WEIGHTS = {
    completeness: 0.3,
    normativeness: 0.2,
    readability: 0.2,
    timeliness: 0.15,
    usability: 0.15
};

class QualityAnalyzer {
    constructor(repoUrl) {
        this.repoUrl = repoUrl;
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) throw new Error("无效的 GitHub URL");
        this.owner = match[1];
        this.repo = match[2];
        this.apiBase = `https://api.github.com/repos/${this.owner}/${this.repo}`;
    }

    // 辅助函数：专门用来下载文件内容（抗干扰版）
    async fetchFileContent(fileApiUrl) {
        try {
            // 我们请求文件的 API 地址，而不是 download_url
            // GitHub 会返回一个 JSON，里面包含 content (Base64编码)
            const res = await axios.get(fileApiUrl, axiosConfig);
            
            if (res.data.content && res.data.encoding === 'base64') {
                // 解码 Base64
                return Buffer.from(res.data.content, 'base64').toString('utf-8');
            }
            return ""; 
        } catch (error) {
            console.warn(`[警告] 文件下载失败: ${fileApiUrl}`, error.message);
            return ""; // 如果下载失败，返回空字符串，不要崩掉整个程序
        }
    }

    async analyze() {
        try {
            console.log(`[1/4] 正在连接仓库: ${this.owner}/${this.repo}`);
            const repoInfo = await axios.get(this.apiBase, axiosConfig);
            
            console.log(`[2/4] 获取文件列表...`);
            const contents = await axios.get(`${this.apiBase}/contents`, axiosConfig);
            const files = contents.data.map(f => f.name);

            console.log(`[3/4] 下载关键文档内容...`);
            // 找到对应的文件对象
            const readmeObj = contents.data.find(f => /^readme/i.test(f.name));
            const contribObj = contents.data.find(f => /^contributing/i.test(f.name));
            
            // 并行下载，且使用了上面的抗干扰函数
            const [readmeContent, contribContent] = await Promise.all([
                readmeObj ? this.fetchFileContent(readmeObj.url) : Promise.resolve(""),
                contribObj ? this.fetchFileContent(contribObj.url) : Promise.resolve("")
            ]);

            console.log(`[4/4] 执行质量分析算法...`);

            // --- 下面是具体的分析逻辑 (保持不变) ---
            const completeness = this.checkCompleteness(files);
            const normativeness = this.checkNormativeness(readmeContent);
            const readability = this.checkReadability(readmeContent);
            const timeliness = this.checkTimeliness(repoInfo.data);
            const usability = this.checkUsability(readmeContent);

            const totalScore = (
                completeness.score * WEIGHTS.completeness +
                normativeness.score * WEIGHTS.normativeness +
                readability.score * WEIGHTS.readability +
                timeliness.score * WEIGHTS.timeliness +
                usability.score * WEIGHTS.usability
            ).toFixed(1);

            return {
                repo: `${this.owner}/${this.repo}`,
                totalScore,
                dimensions: {
                    completeness,
                    normativeness,
                    readability,
                    timeliness,
                    usability
                }
            };

        } catch (error) {
            // 这里会打印详细错误到你的黑窗口终端
            console.error("=============== 错误详情 ===============");
            if (error.response) {
                console.error("HTTP 状态码:", error.response.status);
                console.error("错误信息:", JSON.stringify(error.response.data, null, 2));
            } else {
                console.error("系统错误:", error.message);
            }
            console.error("========================================");
            
            // 抛出给前端看
            if (error.response && error.response.status === 404) {
                throw new Error("找不到该仓库，请检查链接是否正确。");
            }
            if (error.response && error.response.status === 401) {
                throw new Error("Token 失效，请检查代码中的 GitHub Token。");
            }
            throw new Error("网络连接失败，请查看后台终端日志。");
        }
    }

    // ------------------------------------------------
    // 下面是具体的评分规则逻辑 (完全保持原样)
    // ------------------------------------------------

    checkCompleteness(files) {
        const checks = [
            { key: 'README', regex: /^readme/i },
            { key: 'LICENSE', regex: /^license/i },
            { key: 'CONTRIBUTING', regex: /^contributing/i },
            { key: 'CODE_OF_CONDUCT', regex: /^code_of_conduct/i }
        ];

        let found = 0;
        let missing = [];
        checks.forEach(check => {
            if (files.some(f => check.regex.test(f))) found++;
            else missing.push(check.key);
        });

        return {
            score: (found / checks.length) * 100,
            details: missing.length === 0 ? "所有关键文件齐全" : `缺失文件: ${missing.join(', ')}`
        };
    }

    checkNormativeness(content) {
        if (!content) return { score: 0, details: "未检测到内容或下载失败" };
        
        const hasH1 = /^#\s/m.test(content);
        const hasH2 = /^##\s/m.test(content);
        const hasCodeBlocks = /```[\s\S]*?```/.test(content);
        
        let score = 60; 
        if (hasH1) score += 10;
        if (hasH2) score += 10;
        if (hasCodeBlocks) score += 20;

        return {
            score: Math.min(100, score),
            details: hasCodeBlocks ? "Markdown格式规范" : "缺少代码块或标题层级不清晰"
        };
    }

    checkReadability(content) {
        if (!content) return { score: 0, details: "未检测到内容或下载失败" };

        const hasImages = /!\[.*?\]\(.*?\)/.test(content) || /<img/i.test(content);
        const hasLists = /^(\*|-|\d\.)\s/m.test(content);
        
        let score = 50;
        if (hasImages) score += 30;
        if (hasLists) score += 20;

        return {
            score: Math.min(100, score),
            details: hasImages ? "图文并茂" : "建议添加图片或架构图"
        };
    }

    checkTimeliness(repoData) {
        const lastUpdate = new Date(repoData.pushed_at);
        const now = new Date();
        const diffDays = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

        let score = 100;
        if (diffDays > 365) score = 40;
        else if (diffDays > 180) score = 60;
        else if (diffDays > 90) score = 80;

        return {
            score,
            details: `最后提交于 ${diffDays} 天前`
        };
    }

    checkUsability(content) {
        if (!content) return { score: 0, details: "未检测到内容或下载失败" };

        const installCmd = /npm install|pip install|go get|cargo build|yarn add/i.test(content);
        const usageEx = /usage|example|demo/i.test(content);

        let score = 50;
        if (installCmd) score += 30;
        if (usageEx) score += 20;

        return {
            score: Math.min(100, score),
            details: installCmd ? "包含安装/运行命令" : "缺少明确的安装或启动命令"
        };
    }
}

module.exports = QualityAnalyzer;