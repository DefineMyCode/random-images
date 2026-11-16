# random-images

一个基于 [Lorem Picsum](https://picsum.photos) 免费开放 API 的随机图片浏览器。零依赖：Node 原生 `http` 服务 + 单文件前端。

在线演示：https://random-images.cloudzyro.app

## 功能

- **随机浏览**：一次取 12 张，`上一张` / `下一张` 无限翻阅，走到池边界自动向前/向后补一批
- **全屏查看**：点击主图进入；滚轮或双指捏合缩放（100%–500%），左键/单指拖拽平移，双击在 1× 与 2.5× 间切换；缩放后自动限制边界，拖不出空白
- **一键下载**：走服务端代理，文件名 `picsum-{id}.jpg`
- **一键分享**：优先 `navigator.share`，不支持时自动复制链接
- **深链**：`/?id=237` 直达指定图片，切图时地址自动同步
- **主题**：深/浅两套，首次跟随系统，之后记忆选择
- **移动端适配**：`100dvh` 高度约束、safe-area 安全区、按 `devicePixelRatio` 自适应取图、横屏独立断点

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/images?count=12` | 随机取一批图片列表，`count` 限制 4–30，上游失败自动重试 3 次 |
| GET | `/api/photo?id=237` | 单张图片元数据（作者、尺寸、Unsplash 原页） |
| GET | `/api/download?id=237` | 代理下载 1600×1000 原图，带 `Content-Disposition` |
| GET | `/api/health` | 运行状态、Node 版本、启动时间、uptime |

所有接口对 `id` 做数字校验，非法输入返回 `400 bad_id`；上游异常返回 `502 upstream_failed`。

## 本地运行

```bash
node server.js
# 或指定端口
PORT=8080 node server.js
```

要求 Node >= 20（使用全局 `fetch` 与 `Readable.fromWeb`）。

## 部署

通过 Cloudzyro MCP 部署（任意支持 MCP 的 AI 工具均可）：

```text
check_name → create_site → get_upload_link → 上传 zip → deploy_upload → get_deployment
```

打包时排除 `node_modules`、`.git`、构建产物与 `.env`。站点首次构建约 60 秒，状态流转为 `waiting → building → starting → live`。

平台免费档限制：100 GB/月流量、512 MB 内存 + 1 CPU、单版本 100 MB / 20,000 文件、可回滚 5 个版本。

## 目录结构

```text
index.html     单页前端，样式与交互内联
server.js      HTTP 服务、静态页面与 Picsum 代理
package.json   启动脚本与 Node 版本约束
```

## 数据来源

图片来自 [Lorem Picsum](https://picsum.photos)，原始作品托管于 [Unsplash](https://unsplash.com)。页面页脚保留摄影师署名与原图链接，点击可回到 Unsplash 原页。