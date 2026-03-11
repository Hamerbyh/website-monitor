# WebMonitor

一个面向站长、独立开发者和多站点运营者的 Website Monitor 项目，用来统一管理多个长期运营、低维护频率的网站，并优先发现真正需要处理的问题。

项目采用 Build in Public 的方式持续迭代，因此在设计上会优先考虑可扩展性、模块化和数据驱动，而不是只做一个“网站是否在线”的小工具。

## 项目目标

WebMonitor 的核心目标不是单纯展示数据，而是优先回答一个问题：

`现在有哪些网站需要我处理？`

因此首页会遵循 Action-Driven Dashboard 的设计思路：

- 有 Critical / Warning 事项时，优先展示 Issues / Alerts
- 没有重要事项时，再展示概览、流量和趋势数据

## 技术栈

当前项目整体技术选型如下：

- 框架：Next.js
- 前端运行时：React
- ORM：Drizzle ORM
- 数据库：PostgreSQL
- 认证系统：Better Auth
- 部署方式：Dokploy + Dockerfile
- 样式方案：Tailwind CSS
- 语言：TypeScript

## 为什么这样选型

- Next.js 适合作为当前阶段的一体化应用框架，便于同时承载页面、接口和后续管理后台能力
- Drizzle ORM 更贴近 SQL，Schema 可读性高，适合长期维护和 Build in Public 展示
- PostgreSQL 适合作为核心业务数据库，便于承载站点信息、检测结果、Issues、布局配置和后续扩展数据
- Better Auth 用于构建后续多用户登录、试用和权限体系
- Dokploy + Dockerfile 更适合前期低成本部署，方便在单 VPS 环境中快速上线和持续迭代

## 系统定位

这是一个数据库驱动、模块化、可扩展的多网站健康与流量管理面板。

它的第一阶段重点不是复杂的数据分析，而是帮助用户统一管理多个网站，并及时发现以下问题：

- 网站不可访问
- HTTPS / SSL 证书已过期或即将过期
- 域名即将过期
- DNS 解析异常
- 重定向链异常
- 页面健康检测失败

## 核心使用场景

目标用户通常拥有多个网站，这些站点往往具备以下特征：

- 长期运行，但不频繁维护
- 希望持续在线，避免基础性故障
- 需要统一查看健康状态和后续流量表现
- 后续可能需要分享给团队成员共同查看

典型诉求包括：

- 哪些网站挂了
- 哪些证书快过期了
- 哪些域名快过期了
- 哪些网站虽然在线，但 DNS、HTTPS 或重定向存在问题
- 在没有问题时，再看流量和趋势数据

## 首页设计原则

首页按优先级分层展示：

### 1. Issues / Alerts

优先展示需要处理的事项，例如：

- 网站 Down
- HTTPS 证书已过期
- HTTPS 证书将在 X 天内过期
- 域名将在 X 天内过期
- DNS 解析失败
- 页面健康检测失败

### 2. Overview Metrics

当没有严重问题时，展示总体概览，例如：

- 站点总数
- 健康站点数
- Down 站点数
- Warning 数
- 平均响应时间
- 最近 24h / 7d 可用率

### 3. Traffic / Trends

在无高优先级问题时，展示业务数据，例如：

- 每日流量
- 搜索点击
- 搜索曝光
- 访问趋势
- Top 网站表现

### 4. Site List

展示全部站点的当前状态，作为统一管理入口。

## MVP 功能范围

第一版聚焦在“多网站健康巡检面板”。

### 1. 站点管理

支持：

- 添加网站
- 编辑网站
- 删除网站
- 启用 / 停用监控

建议的站点基础信息包括：

- 站点名称
- 主域名
- 检测 URL
- 是否启用
- 备注
- 创建时间

### 2. 网站在线状态检测

支持远程 HTTP/HTTPS 可达性检测。

建议逻辑：

- 先发 `HEAD`
- `HEAD` 失败或不可靠时回退 `GET + Range: bytes=0-0`
- 记录状态码、耗时、错误信息和检测时间

状态分级：

- `up`
- `degraded`
- `down`

### 3. HTTPS / SSL 检测

支持：

- HTTPS 是否可正常握手
- 证书是否有效
- 证书是否已过期
- 证书剩余有效天数
- 域名与证书是否匹配

### 4. 域名健康 / 到期提醒

支持：

- 域名到期时间
- 剩余天数
- 到期预警

### 5. DNS 基础检测

支持：

- 域名是否可正常解析
- A / AAAA / CNAME 基础解析状态
- DNS 错误识别

### 6. 重定向检测

支持：

- 最终 URL
- 是否自动跳转 HTTPS
- 是否存在异常跳转
- 是否存在重定向链问题

### 7. 首页 Issues 面板

首页根据规则自动生成需要关注的事项，例如：

- `site_down`
- `ssl_expired`
- `ssl_expiring_soon`
- `domain_expiring_soon`
- `dns_failed`

Issues 应基于数据库和规则生成，而不是硬编码在页面逻辑中。

### 8. 流量模块预留

MVP 可先预留结构，后续逐步接入：

- Google Search Console
- Google Analytics
- 其他流量 / SEO / API 数据源

## 工程设计原则

由于项目会持续公开开发和不断扩展，因此必须避免早期硬编码导致的后续维护问题。

### 1. 核心业务尽量不要硬编码

以下内容不应写死在代码中：

- 首页模块显示逻辑
- Issues 类型及阈值
- 检测规则
- 站点配置
- 首页卡片配置
- 集成数据源配置
- 提示规则
- 用户自定义面板布局

### 2. 配置尽量数据库化

建议保留在代码中的内容：

- 系统级常量
- 基础文案
- 枚举定义
- 默认配置模板
- 安全策略底线
- 环境变量

建议放入数据库的内容：

- 站点信息
- 检测结果
- 检测历史
- 证书状态
- 域名状态
- 首页模块配置
- 用户面板布局
- 流量来源绑定信息
- 告警规则
- 用户偏好设置

## 技术架构

### 部署形态

前期以单 VPS + Dokploy 为主，尽量降低部署成本和维护复杂度。

建议部署结构：

- Next.js Web Dashboard
- API 能力（可先由 Next.js Route Handlers 承载）
- 定时任务 / Job Worker
- PostgreSQL 数据库
- Dokploy 基于 Dockerfile 进行部署

可以同机部署，但代码和职责边界应保持清晰。

### 前后端关系

如果前期以单体应用形式开发，建议在代码层面仍保持明确边界：

- Web UI
- API
- Job / Scheduler
- Shared schema / types

这样后续无论是否拆分服务，都更容易演进。

## 数据模型建议

至少应包含以下核心实体：

- `users`：用户与权限体系
- `sites`：站点基础信息
- `site_checks`：在线检测记录
- `site_ssl_status`：HTTPS / SSL 检测结果
- `site_domain_status`：域名到期与 WHOIS 结果
- `site_dns_status`：DNS 检测结果
- `issues`：需要处理的问题
- `dashboard_widgets`：首页支持的模块定义
- `dashboard_layouts`：用户首页布局配置
- `integrations`：外部服务接入信息
- `traffic_daily_metrics`：流量类日级指标

## 开发建议

当前阶段推荐按以下思路推进：

- 用 Next.js 作为主应用框架，统一承载页面和接口
- 用 Drizzle 管理数据库 Schema 与迁移
- 用 PostgreSQL 承载配置、状态和历史数据
- 用 Better Auth 预留多用户登录和权限体系
- 用独立 Job / Cron 执行巡检、证书检测和域名检测
- 用 Dokploy + Dockerfile 管理部署和发布

## 后续扩展方向

这个项目未来可以逐步扩展为更完整的 Website Operations Dashboard，例如：

- 多用户登录
- 用户试用
- 站点分组
- 多维告警
- Google Search Console 接入
- Google Analytics 接入
- SEO 指标接入
- 自定义看板
- 团队共享
- 付费能力

因此从 MVP 开始就应保证：

- 表结构可扩展
- API 结构可扩展
- 首页模块化
- 规则系统不写死

## 一句话总结

WebMonitor 不应该被设计成一个“只检测网站是否在线”的小工具，而应该从一开始就按下面这个方向建设：

一个数据库驱动、模块化、可扩展的多网站健康与流量管理面板。
