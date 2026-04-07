# Lianying's Trove - 个人站点

一个集美股期权分析、工具集合、博客于一体的个人站点。

## 子项目

### Option Seeker - 美股期权分析平台

一个现代化的美股期权筛选与多维度量化分析平台。

- **实时行情** - 通过长桥券商 API 获取美股实时报价与期权链数据
- **多维度筛选** - 按年化收益率、权利金、价差百分比等灵活筛选
- **智能推荐** - 综合多因素计算推荐分数
- **K线图表** - 支持多种周期的 K 线走势查看
- **暗色主题** - 现代化暗色模式界面设计

### 工具集合

- **JSON 解析** - 格式化、压缩、校验
- **密码生成器** - 支持自定义长度、字符类型、数量

### 浮光掠影

个人博客，记录生活的温度。

---

## 环境要求

- **Python**: >= 3.7
- **Node.js**: >= 18

## 安装与启动

### 开发模式

```bash
# 安装前端依赖
cd frontend
npm install

# 启动后端（终端1）
cd backend
pip install -r requirements.txt
py -3.14 -m uvicorn main:app --host 0.0.0.0 --port 8000

# 启动前端（终端2）
cd frontend
npm run dev
```

访问 http://localhost:3000

### 生产部署

```bash
# 1. 构建前端
cd frontend
npm install
npm run build

# 构建产物在 dist/ 目录，可部署到静态托管服务或 Nginx

# 2. 启动后端
cd backend
pip install -r requirements.txt
py -3.14 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/option-seeker/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 使用 PM2 部署后端

```bash
cd backend
pip install -r requirements.txt
pm2 start "py -3.14 -m uvicorn main:app --host 0.0.0.0 --port 8000" --name option-seeker-api
pm2 save
pm2 startup
```

## 长桥券商配置

本项目使用[长桥证券 OpenAPI](https://open.longportapp.com/)获取美股期权数据（国内用户可访问 [open.longportapp.cn](https://open.longportapp.cn/)）。

### 1. 开通权限

- 长桥证券账户（支持港美股）
- 开通「美股期权」OpenAPI 权限

### 2. 配置环境变量

代码中使用传统 API Key 模式（`LONGPORT_*`, `LONGBRIDGE_*`），OAuth 2.0 则需自行修改后端代码。

## 核心指标说明

| 指标 | 说明 |
|------|------|
| **年化收益率（卖方）** | 卖出期权时，基于权利金与持有期计算的年化收益百分比 |
| **行权概率 (ITM)** | 期权到期时处于价内（实值）的概率，基于 Black-Scholes 模型 |
| **价差百分比** | 当前股价与行权价的差距百分比 |
| **权利金** | 期权当前市场价格 |
| **盈亏平衡** | 期权到期时刚好回本的标的股价 |
| **隐含波动率 (IV)** | 市场对未来波动率的预期 |
| **推荐值** | 综合年化收益率、ITM 概率、价差、流动性计算的推荐分数 |

## 使用限制

- 由于券商 API 频率限制，部分远期期权合约可能未返回
- 数据存在一定延迟，不构成投资建议
- 仅供学习研究使用，投资有风险

## License

MIT
