# Option Seeker - 美股期权分析平台

## 项目概述

**Option Seeker** 是一个美股期权筛选与多维度量化分析平台，提供实时美股期权数据的多维度筛选功能，帮助用户发现高性价比的期权机会。

- **技术栈**: React + TypeScript (前端) | FastAPI Python (后端) | LongPort OpenAPI (数据源)
- **定位**: 个人期权分析工具集合

---

## 目录结构

```
D:/cc/option-seeker/
├── frontend/                    # React + TypeScript 前端
│   ├── src/
│   │   ├── components/          # React 组件
│   │   │   ├── OptionSeeker.tsx # 期权分析主界面
│   │   │   ├── CandlestickChart.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── Tools.tsx
│   │   │   └── Blog.tsx
│   │   ├── services/
│   │   │   └── api.ts           # Axios API 客户端
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript 类型定义
│   │   ├── App.tsx              # 主应用 (含路由)
│   │   ├── main.tsx             # 入口
│   │   └── index.css            # Tailwind CSS
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                     # Python FastAPI 后端
│   ├── routers/
│   │   └── analysis.py          # API 路由
│   ├── services/
│   │   └── option_analyzer.py   # 核心分析逻辑
│   ├── models/
│   │   └── schemas.py           # Pydantic 模型
│   └── main.py                  # FastAPI 入口
│
├── imgs/                        # 图片资源
├── README.md
├── REPOSITORY.md                # 本文档
└── test_calc_index.py
```

---

## 核心文件

| 文件 | 作用 |
|------|------|
| `frontend/src/components/OptionSeeker.tsx` | 期权分析主界面 - 搜索、筛选、结果表格 |
| `frontend/src/components/CandlestickChart.tsx` | K线图组件 |
| `backend/services/option_analyzer.py` | 核心分析计算 (ITM概率、年化收益、评分) |
| `backend/routers/analysis.py` | API 路由定义 |
| `backend/models/schemas.py` | 数据模型定义 |

---

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **UI 库**: Ant Design 5
- **路由**: React Router DOM 6
- **HTTP**: Axios
- **样式**: Tailwind CSS 3 + PostCSS
- **图表**: 自定义 K 线图实现

### 后端
- **框架**: FastAPI (Python)
- **服务器**: Uvicorn
- **数据处理**: Pandas, NumPy, SciPy
- **外部 API**: LongPort OpenAPI (美股期权数据)
- **验证**: Pydantic v2

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/stock/{symbol}` | GET | 获取股票信息和当前价格（含昨收价、交易时段标签） |
| `/api/candlesticks/{symbol}` | GET | 获取 K 线数据 (支持 period/count 参数) |
| `/api/analyze` | POST | 期权筛选分析 (支持多维度过滤，含 min_volume) |
| `/api/search/{query}` | GET | 按代码/名称搜索股票 |

---

## 核心计算逻辑 (`option_analyzer.py`)

- `calculate_itm_probability()` - 基于 Black-Scholes 的 ITM 概率
- `calculate_annual_return()` - 卖方的年化收益
- `calculate_price_diff_percent()` - 当前价格到行权价的距离
- `calculate_recommendation_score()` - 综合评分 (收益、概率、价格差、成交量、持仓量)

---

## 开发命令

### 前端
```bash
cd frontend
npm install
npm run dev    # 开发服务器 (端口 3000)
npm run build  # 生产构建到 dist/
```

### 后端
```bash
cd backend
pip install -r requirements.txt
py -3.14 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 数据流程

1. **前端**: 用户输入股票代码和筛选条件 → Axios 发送请求
2. **后端**: FastAPI 接收请求 → 调用 LongPort SDK 获取数据 → 计算分析指标
3. **返回**: `OptionAnalysis[]` 包含行权价、到期日、溢价、年化收益、ITM概率、评分等

---

## 配置说明

- **Vite 代理**: 开发服务器将 `/api` 请求代理到 `http://localhost:8000`
- **CORS**: 后端允许所有来源
- **LongPort SDK**: 使用 `Config.from_env()` 认证 (需要 `LONGPORT_*` 环境变量)
- **缓存**: 后端股票数据 5 分钟缓存 (`_get_with_cache`)
