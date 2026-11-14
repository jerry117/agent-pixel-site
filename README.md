# Agent 像素工地

在 DeepSeek Harness 输入框上方搭一块像素工地，让当前会话的 Agent、子代理和 workflow 成员化身小工人。

- 读文件去档案室，写代码砌墙盖房，工具失败烟囱冒烟，等待审批时举牌。
- 子代理带帐篷或小屋入驻，workflow 成员住蓝图小屋。
- 任务牌显示待办进度，鼠标悬停可看任务明细；全部完成时屋顶插旗。
- 工地居中显示，多工人时横向滚动；支持中英文和减少动态效果的系统偏好。

## 安装

在 DSH「插件 → 添加插件」的包名或地址栏填入 Release 安装包地址：

```text
https://github.com/jerry117/agent-pixel-site/releases/download/v1.0.0/jerry117-agent-pixel-site-1.0.0.tgz
```

也可下载 [v1.0.0 安装包](https://github.com/jerry117/agent-pixel-site/releases/download/v1.0.0/jerry117-agent-pixel-site-1.0.0.tgz)，在同一栏填下载文件的绝对路径。按 DSH 提示启用或重新加载，打开一个会话后，工地会直接出现在输入框上方，无需单独寻找按钮。

源码安装地址为 `github:jerry117/agent-pixel-site`。这里的地址不包含 `npx` 或其他终端命令。

### GitHub Packages

公开包名为 `@jerry117/agent-pixel-site`，版本 `1.0.0`。GitHub npm registry 下载公开包也需要认证，先按 [官方说明](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) 使用具有 `read:packages` 权限的个人访问令牌（classic）登录：

```sh
npm login --scope=@jerry117 --auth-type=legacy --registry=https://npm.pkg.github.com
npm config set @jerry117:registry https://npm.pkg.github.com
npm install @jerry117/agent-pixel-site@1.0.0
```

DSH 通过包名安装时，也需读取相同的 registry 与认证配置。Release 安装包无需 GitHub Packages 登录。

原本地插件名为 `@local/agent-pixel-site`。迁移到公开包时，请先禁用原本地版本，再启用公开版本，避免两个插件重复注册同一个会话投影和界面槽位。

## 数据与兼容性

状态全部由当前会话日志折叠到 `pixelSite` 投影，客户端负责渲染。子代理展示父会话记录的派工和结算状态，不展示子会话内部的每一步工具动作。最多保留 12 名工人和 8 条待办。

插件不调用模型，不需要 API Key，也不向外部服务发送会话数据。细节提示可能显示当前工具的文件名、命令或查询片段，分享工地截图前请检查显示内容。

需要宿主提供 `sessionProjections`、`conversation.input.dock`、`useProjection` 和 locale 接口。原本地版本曾做 DSH 加载排障；公开包会验证递归组件渲染，重新命名后的包尚需在实际 DSH 中安装验收。接口随 DSH 版本演进，尚未提供完整宿主兼容性矩阵。

## 开发与发布

无第三方构建依赖，使用 Node.js 22 或更高版本：

```sh
npm test
npm pack
```

`render-check.mjs` 递归调用像素子组件，覆盖状态矩阵、空投影和无 props 情况，可检测高度参数遮蔽 `createElement` 一类的子组件渲染错误。它不替代真实宿主的渲染和数据集成验证。

在 GitHub Actions 手动运行 **Publish Plugin**，会先运行检查，再发布 GitHub Package，并创建包含 `.tgz` 的 Release。后续发布请先更新版本号；同一 npm 版本不可覆盖。

实现文档：[中文](https://github.com/jerry117/agent-pixel-site/blob/main/docs/DETAIL.zh.md) · [English](https://github.com/jerry117/agent-pixel-site/blob/main/docs/DETAIL.md)

MIT License.
