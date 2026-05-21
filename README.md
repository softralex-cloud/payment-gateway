# Payment Gateway - 卡支付到USDT系统

完整的自建卡支付处理系统，自动转换为USDT到TRON钱包。

## 功能特性

- ✅ 安全的卡信息处理和加密存储
- ✅ 自动支付处理和验证
- ✅ 实时转换为USDT
- ✅ 自动发送到TRON钱包
- ✅ 一次性支付和订阅模式
- ✅ 订阅管理（修改、取消）
- ✅ 完整的交易记录系统
- ✅ 退款处理
- ✅ 后台管理系统
- ✅ JWT认证
- ✅ 支持英国和萨尔瓦多客户
- ✅ 美金计价

## 技术栈

- **后端**：Node.js + Express
- **数据库**：PostgreSQL
- **加密**：AES-256 + bcrypt
- **区块链**：TRON (TronWeb)
- **支付处理**：自建处理引擎

## 快速开始

### 前置要求

- Node.js >= 14
- PostgreSQL >= 12
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/softralex-cloud/payment-gateway.git
cd payment-gateway

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env

# 配置.env文件中的敏感信息

# 初始化数据库
npm run db:init

# 启动开发服务器
npm run dev
```

### 生产部署

```bash
npm run start
```

## 项目结构

```
payment-gateway/
├── src/
│   ├── index.js                 # 应用入口
│   ├── services/
│   │   ├── paymentService.js    # 支付业务逻辑
│   │   ├── subscriptionService.js
│   │   ├── tronService.js       # TRON转账
│   │   ├── encryptionService.js # 加密服务
│   │   └── cardValidation.js    # 卡验证
│   ├── routes/
│   │   ├── payment.js
│   │   ├── subscription.js
│   │   ├── refund.js
│   │   ├── auth.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── auth.js              # JWT认证
│   └── database/
│       └── schemas.sql          # 数据库模式
├── .env.example
├── package.json
└── API.md
```

## API文档

详见 `API.md`

## 支付流程

```
1. 客户访问支付页面
   ↓
2. 输入卡信息（卡号、有效期、CVV）
   ↓
3. 前端加密卡信息发送到后端
   ↓
4. 后端验证卡信息
   ↓
5. 调用支付处理API（隐藏的）
   ↓
6. 支付成功后转换为USDT
   ↓
7. 自动发送到您的TRON钱包
   ↓
8. 记录交易到数据库
   ↓
9. 返回成功状态给客户
```

## 订阅流程

```
1. 客户创建订阅（选择周期：月/年）
   ↓
2. 第一次支付立即处理
   ↓
3. 后台任务记录下次续费时间
   ↓
4. 每天检查是否有待续费的订阅
   ↓
5. 自动扣款并转USDT
   ↓
6. 如果失败，记录重试
   ↓
7. 客户可随时修改或取消
```

## 数据库设计

### 主要表结构

- **users** - 客户信息
- **payment_cards** - 加密的卡信息
- **payments** - 支付记录
- **subscriptions** - 订阅记录
- **transactions** - 区���链交易
- **refunds** - 退款记录
- **audit_log** - 审计日志

## 安全特性

- 🔐 AES-256加密卡数据
- 🔐 bcrypt密码哈希
- 🔐 JWT token认证
- 🔐 HTTPS通信（生产必须）
- 🔐 CORS限制
- 🔐 请求速率限制
- 🔐 SQL注入防护
- 🔐 XSS防护
- 🔐 完整审计日志

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| TRON_PRIVATE_KEY | TRON钱包私钥 | ✅ |
| TRON_ADDRESS | USDT接收地址 | ✅ |
| DB_* | 数据库配置 | ✅ |
| JWT_SECRET | JWT密钥 | ✅ |
| ENCRYPTION_KEY | 数据加密密钥（32字符） | ✅ |
| PAYMENT_PROVIDER | 支付处理商 | ✅ |
| PAYMENT_API_KEY | 支付API密钥 | ✅ |

## 部署指南

### Docker部署

```bash
docker-compose up -d
```

### 生产配置必须项

- HTTPS证书
- 防火墙规则
- 数据库备份
- 日志监控
- 错误告警
- 性能监控

## 支持的卡类型

- 💳 Visa
- 💳 Mastercard
- 💳 Debit Cards

## 支持的客户

- 🇬🇧 英国（GBP支持）
- 🇸🇻 萨尔瓦多（USD）
- 💰 计价：美金（USD）

## TRON网络信息

- 网络：TRON主网
- USDT合约：TR7NHqjeKQxGTCi8q282JJUC56oysPmzJv
- 接收地址：TXbC1Y4mYBee91CH4XmEqfiW7WZKFJnKzr

## 许可证

MIT

## 支持

如有问题，请开Issue或联系技术支持。