# TRPG掷骰计算器 部署指南

## 项目概述
这是一个支持复杂掷骰公式的TRPG掷骰计算器，使用React + Vite构建，支持：
- 基本掷骰（NdM格式）
- Keep操作（取最高/最低值）
- 比较判别
- 复合运算
- 精确概率计算和图表显示

## 本地开发

### 环境要求
- Node.js 16+ 
- npm 或 pnpm

### 安装和运行
```bash
# 克隆项目
git clone <repository-url>
cd trpg-dice-calculator

# 安装依赖
npm install
# 或
pnpm install

# 启动开发服务器
npm run dev
# 或
pnpm run dev
```

## 生产构建和部署

### 1. 本地构建
```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## GitHub Pages 自动部署（推荐）

本项目已配置 GitHub Actions 自动部署到 GitHub Pages。

### 部署步骤

#### 1. 推送代码到 GitHub

```bash
# 如果还没有初始化 git 仓库
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit with GitHub Pages deployment"

# 添加远程仓库（将 YOUR_USERNAME 替换为您的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/trpg-dice-calculator.git

# 推送到主分支
git push -u origin main
```

#### 2. 启用 GitHub Pages

1. 访问您的 GitHub 仓库页面
2. 点击 **Settings** 选项卡
3. 在左侧菜单中找到 **Pages**
4. 在 **Source** 部分选择 **GitHub Actions**
5. 保存设置

#### 3. 自动部署

一旦您推送代码到 `main` 分支，GitHub Actions 会自动：
1. 检出代码
2. 安装 Node.js 依赖
3. 构建项目 (`npm run build`)
4. 部署到 GitHub Pages

#### 4. 访问您的网站

部署完成后，您的网站将在以下地址可用：
```
https://YOUR_USERNAME.github.io/trpg-dice-calculator/
```

### GitHub Actions 配置说明

- **工作流文件**: `.github/workflows/deploy.yml`
- **触发条件**: 推送到 `main` 分支或手动触发
- **构建环境**: Ubuntu 最新版本，Node.js 20
- **权限**: 已配置 GitHub Pages 必要权限

### 手动触发部署

您也可以在 GitHub 仓库的 **Actions** 选项卡中手动触发部署：
1. 访问 **Actions** 选项卡
2. 选择 **Deploy to GitHub Pages** 工作流
3. 点击 **Run workflow** 按钮

### 2. 其他静态网站部署

#### Netlify
1. 将项目推送到GitHub
2. 在Netlify中连接GitHub仓库
3. 构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`

#### Vercel
1. 将项目推送到GitHub
2. 在Vercel中导入项目
3. 自动检测Vite项目设置

#### GitHub Pages
1. 确保`vite.config.js`中设置了正确的base路径：
   ```js
   export default {
     base: '/your-repo-name/',
     // ... 其他配置
   }
   ```
2. 构建并部署：
   ```bash
   npm run build
   # 将dist文件夹内容部署到gh-pages分支
   ```

#### 自定义服务器
1. 构建项目：`npm run build`
2. 将`dist`文件夹内容复制到Web服务器
3. 配置服务器支持SPA路由（如果需要）

### 3. Docker部署
```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

构建和运行：
```bash
docker build -t trpg-dice-calculator .
docker run -p 8080:80 trpg-dice-calculator
```

## 功能特性

### 支持的掷骰公式
- `NdM` - N个M面骰子（如：2d6, 3d10）
- `dM` - 单个M面骰子（如：d20, d8）
- `kh(NdM)` - 取最高值（如：kh(2d20)）
- `kl(NdM)` - 取最低值（如：kl(2d20)）
- `kKh(NdM)` - 取K个最高值（如：k3h(4d6)）
- `kKl(NdM)` - 取K个最低值（如：k3l(4d6)）
- `A > B`, `A < B`, `A = B` - 比较判别
- `+`, `-`, `*`, `/` - 四则运算
- `()` - 括号分组

### 计算结果
- 完整概率分布
- 平均值
- 最可能结果及其概率
- 结果范围
- 总可能性数量
- 交互式图表显示
- 详细概率表格

## 技术架构

### 核心组件
- `DiceCalculator` - 主要计算引擎，支持完整语法解析
- `SimpleDiceCalculator` - 简化版计算器，用于基本掷骰
- `Lexer` - 词法分析器
- `Parser` - 语法分析器

### UI组件
- `FormulaInput` - 公式输入组件
- `ResultDisplay` - 结果显示组件
- `DiceChart` - 图表组件

### 依赖库
- React 19 + Vite 6
- Tailwind CSS + shadcn/ui
- Recharts（图表）
- Lucide React（图标）

## 常见问题

### Q: 计算结果为什么这么准确？
A: 使用打表遍历算法，计算所有可能的结果组合，确保概率分布的完全准确性。

### Q: 支持的最大骰子数量是多少？
A: 理论上没有限制，但大量骰子会增加计算时间和内存使用。建议单次计算不超过10个高面数骰子。

### Q: 如何添加新的掷骰语法？
A: 需要修改`diceCalculator.js`中的词法分析器和语法分析器，添加相应的token类型和解析规则。

## 更新日志

### v1.0.0
- 支持基本掷骰语法
- 完整的概率计算
- 图表和表格显示
- Keep操作支持
- 比较判别功能
- 四则运算支持

## 许可证
MIT License
