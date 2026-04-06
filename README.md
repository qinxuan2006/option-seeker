# Option Seeker - 港美股期权分析平台

一个现代化的港美股期权筛选和分析平台，帮助投资者找到最优期权策略。

## 功能特点

- 支持港美股期权数据查询
- 智能期权推荐算法
- 年化收益率计算
- 行权概率分析
- 实时筛选功能
- 美观的现代化界面

## 技术栈

### 后端
- Python 3.7+
- Flask (Web 框架)
- yfinance (期权数据)
- pandas, numpy, scipy

### 前端
- React 18
- TypeScript
- Vite
- Ant Design
- Tailwind CSS

## 快速开始

### ⚠️ 重要提示：Python 版本

当前你的环境是 Python 3.7，建议升级到 **Python 3.10 或 3.11** 以获得最佳体验。

升级 Python：
1. 访问 https://www.python.org/downloads/ 下载 Python 3.10 或 3.11
2. 安装时勾选 "Add Python to PATH"
3. 重启终端

### 安装依赖并启动

#### 方式一：一键启动 (Windows)
双击 `start-all.bat` 文件即可同时启动前后端服务。

#### 方式二：分别启动

##### 启动后端
```bash
cd backend
pip install -r requirements.txt
python main.py
```
后端服务将运行在 http://localhost:8000

##### 启动前端
```bash
cd frontend
npm install
npm run dev
```
前端服务将运行在 http://localhost:3000

## 使用说明

1. 在首页输入股票代码（如 AAPL, TSLA, GOOGL 等）
2. 选择期权类型（看涨/看跌）
3. 设置最远到期日
4. 点击"开始分析"按钮
5. 使用筛选条件过滤结果
6. 查看推荐值排序的期权列表

## 核心指标说明

- **年化收益**: 基于权利金和持有期计算的年化收益率
- **行权概率**: 期权到期时处于价内的概率（基于Black-Scholes模型）
- **价差百分比**: 当前股价与行权价的差距百分比
- **推荐值**: 综合多个因素计算的推荐分数

## 注意事项

- 所有数据分析均不构成投资建议
- 数据来源于公开市场数据，可能存在延迟
- 仅供学习和研究使用
- 建议使用 Python 3.10+

## API 文档

启动后端后访问 http://localhost:8000/ 查看 API 端点：

- `GET /` - API 信息
- `GET /health` - 健康检查
- `GET /api/stock/{symbol}` - 获取股票信息
- `GET /api/search/{query}` - 搜索股票
- `POST /api/analyze` - 分析期权

## License

MIT
