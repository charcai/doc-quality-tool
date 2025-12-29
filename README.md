# 📚 开源文档质量检测工具

一个基于社区规范的开源项目文档质量自动化评估工具，通过分析 GitHub 仓库的文档内容，从五个维度评估项目的文档质量，并提供可视化报告和改进建议。

## ✨ 功能特性

- 🔍 **自动化分析**：输入 GitHub 仓库 URL，自动获取并分析文档内容
- 📊 **五维评估**：从完整性、规范性、可读性、时效性、可用性五个维度综合评分
- 📈 **可视化报告**：使用雷达图直观展示各维度得分，提供详细的诊断报告
- 💡 **改进建议**：针对每个维度提供具体的改进建议
- 🎨 **现代化 UI**：简洁美观的用户界面，基于 Vue 3 和 Tailwind CSS
- 🔒 **安全配置**：使用环境变量管理敏感信息，保护 GitHub Token

## 🛠️ 技术栈

### 后端
- **Node.js** + **Express**：Web 服务器框架
- **Axios**：HTTP 客户端，用于调用 GitHub API
- **dotenv**：环境变量管理

### 前端
- **Vue 3**：渐进式 JavaScript 框架
- **ECharts**：数据可视化图表库
- **Tailwind CSS**：实用优先的 CSS 框架

## 📋 前置要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- GitHub Personal Access Token（用于访问 GitHub API）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/charcai/doc-quality-tool.git
cd doc-quality-tool
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件（项目根目录下）：

```bash
cp .env.example .env  # 如果有示例文件
# 或者直接创建 .env 文件
```

在 `.env` 文件中添加你的 GitHub Token：

```env
GITHUB_TOKEN=your_github_token_here
```

#### 如何获取 GitHub Token？

1. 访问 [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 设置 Token 名称和过期时间
4. 勾选 `public_repo` 权限（如果仓库是私有的，还需要 `repo` 权限）
5. 点击 "Generate token"
6. 复制生成的 Token 并保存到 `.env` 文件中

⚠️ **重要**：Token 一旦生成后只显示一次，请妥善保管！

### 4. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3002` 启动。

### 5. 使用工具

在浏览器中打开 `http://localhost:3002`，输入要分析的 GitHub 仓库 URL（例如：`https://github.com/vuejs/core`），点击"开始检测"即可。

## 📖 使用说明

### Web 界面使用

1. 在输入框中输入完整的 GitHub 仓库 URL
2. 点击"开始检测"按钮
3. 等待分析完成（通常需要几秒钟）
4. 查看五维能力图谱和诊断报告

### API 使用

你也可以直接调用 API 接口：

```bash
curl -X POST http://localhost:3002/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/vuejs/core"}'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "repo": "vuejs/core",
    "totalScore": "85.5",
    "dimensions": {
      "completeness": {
        "score": 100,
        "details": "所有关键文件齐全"
      },
      "normativeness": {
        "score": 90,
        "details": "Markdown格式规范"
      },
      "readability": {
        "score": 80,
        "details": "图文并茂"
      },
      "timeliness": {
        "score": 100,
        "details": "最后提交于 5 天前"
      },
      "usability": {
        "score": 100,
        "details": "包含安装/运行命令"
      }
    }
  }
}
```

## 📊 评分维度说明

工具从以下五个维度评估文档质量：

### 1. 完整性 (Completeness) - 权重 30%

检查项目是否包含关键文档文件：
- ✅ README.md
- ✅ LICENSE
- ✅ CONTRIBUTING.md
- ✅ CODE_OF_CONDUCT.md

**评分规则**：根据存在的文件数量计算百分比。

### 2. 规范性 (Normativeness) - 权重 20%

评估 Markdown 文档的格式规范性：
- 是否包含一级标题（H1）
- 是否包含二级标题（H2）
- 是否包含代码块

**评分规则**：基础分 60 分，每满足一项条件加分。

### 3. 可读性 (Readability) - 权重 20%

评估文档的可读性和视觉呈现：
- 是否包含图片或架构图
- 是否使用列表格式

**评分规则**：基础分 50 分，有图片加 30 分，有列表加 20 分。

### 4. 时效性 (Timeliness) - 权重 15%

评估项目的活跃度和更新频率：
- 根据最后提交时间计算
- 90 天内：100 分
- 90-180 天：80 分
- 180-365 天：60 分
- 超过 365 天：40 分

### 5. 可用性 (Usability) - 权重 15%

评估文档的实用性：
- 是否包含安装命令（npm install、pip install、go get 等）
- 是否包含使用示例或演示

**评分规则**：基础分 50 分，有安装命令加 30 分，有使用示例加 20 分。

### 综合评分

综合评分 = Σ(各维度得分 × 对应权重)

## 📁 项目结构

```
doc-quality-tool/
├── analyzer.js          # 核心分析逻辑
├── server.js            # Express 服务器
├── package.json         # 项目配置和依赖
├── .env                 # 环境变量（不提交到 Git）
├── .gitignore          # Git 忽略文件
├── LICENSE             # 许可证
├── README.md           # 项目文档
└── public/
    └── index.html      # 前端页面
```

## 🔧 配置选项

### 修改服务器端口

在 `server.js` 中修改 `PORT` 变量：

```javascript
const PORT = 3002; // 修改为你想要的端口
```

### 调整评分权重

在 `analyzer.js` 中修改 `WEIGHTS` 对象：

```javascript
const WEIGHTS = {
    completeness: 0.3,    // 完整性权重
    normativeness: 0.2,   // 规范性权重
    readability: 0.2,     // 可读性权重
    timeliness: 0.15,     // 时效性权重
    usability: 0.15       // 可用性权重
};
```

### 调整 API 超时时间

在 `analyzer.js` 中修改 `timeout` 配置：

```javascript
timeout: 10000 // 单位：毫秒，默认 10 秒
```

## ❓ 常见问题

### Q: 为什么需要 GitHub Token？

A: GitHub API 有速率限制，使用 Token 可以提高 API 调用限制（从每小时 60 次提升到 5000 次）。

### Q: Token 会泄露吗？

A: 不会。Token 存储在 `.env` 文件中，该文件已添加到 `.gitignore`，不会被提交到代码仓库。

### Q: 支持私有仓库吗？

A: 支持。需要在生成 Token 时勾选 `repo` 权限（完整仓库访问权限）。

### Q: 分析失败怎么办？

A: 请检查以下几点：
1. GitHub URL 格式是否正确
2. 仓库是否存在且可访问
3. Token 是否有效且有足够权限
4. 网络连接是否正常

### Q: 可以分析非 GitHub 的仓库吗？

A: 目前仅支持 GitHub 仓库，未来可能会支持 GitLab、Bitbucket 等平台。

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发计划

- [ ] 支持 GitLab 和 Bitbucket
- [ ] 添加历史记录功能
- [ ] 支持批量分析
- [ ] 添加更多评分维度
- [ ] 支持自定义评分规则
- [ ] 添加数据导出功能
- [ ] 支持多语言文档检测

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [GitHub API](https://docs.github.com/en/rest) - 提供仓库数据接口
- [Vue.js](https://vuejs.org/) - 优秀的前端框架
- [ECharts](https://echarts.apache.org/) - 强大的数据可视化库
- [Tailwind CSS](https://tailwindcss.com/) - 实用的 CSS 框架

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/your-username/doc-quality-tool/issues)
- 发送 Pull Request

---

⭐ 如果这个项目对你有帮助，请给个 Star！

