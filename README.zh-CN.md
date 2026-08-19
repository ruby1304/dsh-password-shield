# dsh-password-shield

一个单一职责的 DSH Web 插件：屏蔽旧会话中漂在聊天输入框上方的 iCloud 密码补全浮窗。

## 问题

iCloud 密码 Chrome 扩展会对每个网页运行 WebKit 风格的凭证字段启发式判定。在部分 DSH 会话页面中，它会误判聊天输入框并注入空状态补全列表：

- iCloud 密码
- 打开“密码” App
- 查找和创建密码

不需要存在已保存密码。这个空状态本身就说明：扩展判定应该提供自动填充，但没有找到属于 DSH 地址的凭证。

浮窗是扩展追加到 `<body>` 的 `<div popover>`，其 open shadow root 中包含指向扩展 `completion_list.html` 的 iframe。

## 修复方式

插件只监听这一种明确结构。它出现时，插件移除 completion-list iframe，并强制隐藏宿主；宿主仍保留在 DOM 中，因此扩展自己的显示/隐藏状态机可以安全收尾。

插件明确**不会**：

- 改写 `input[type=password]`；
- 修改 API Key 输入框；
- 修改 autocomplete 属性；
- 读取或保存字段内容；
- 隐藏普通 DSH popover；
- 隐藏其他扩展的无关 iframe。

## 安装

```bash
dsh plugin --profile web add dsh-password-shield@0.3.0 --save-exact --ignore-scripts
# 重启 dsh web
```

仅在开发时使用经过审阅的 checkout：

```bash
dsh plugin --profile web add github:ruby1304/dsh-password-shield#<完整-commit-sha> --save-exact --ignore-scripts
```

生产环境不要使用可变分支或 `link:` checkout。

## 隐私与安全

- Host 侧为空实现，不读取凭据、文件系统，不启动进程，也不发起网络请求。
- 浏览器侧不读取输入值，也不修改密码或 API Key 输入框。
- 匹配范围限定为公开的 iCloud Passwords 扩展 ID，以及开放 shadow root 内的 `completion_list.html` iframe。
- 插件不发送遥测，也不保存状态。

卸载命令为 `dsh plugin --profile web remove dsh-password-shield`。重启 DSH Web 并刷新已打开页面后生效；当前页面中已被移除的 iframe 只能通过刷新页面恢复。

## 测试

```bash
npm install
npm run check
npm run release:check
```

测试覆盖：页面已有/动态插入的 iCloud 浮窗、普通 DSH popover、其他扩展 iframe，以及“绝不修改密码框和普通文本框”的回归保证。

## License

MIT
