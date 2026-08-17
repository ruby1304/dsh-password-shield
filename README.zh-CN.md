# dsh-password-shield

消除 DeepSeek Harness（dsh）Web 界面里丑陋的浏览器密码提示气泡。

气泡其实有两种、来自两套引擎，这个插件两个都处理：

## 气泡 1 —— Chrome 自带的「保存密码？」提示

DSH 官方 Web UI 把 API Key 输入框（首次启动的「添加一个 API Key 开始使用」弹窗、
**设置 → 模型**、**设置 → 插件 → 网页搜索**）渲染成
`<input type="password" autocomplete="off">`。Chrome 对密码框会**故意忽略**
`autocomplete="off"`，于是会在弹窗上冒出「保存密码？」/钥匙图标气泡。其他以
`type="password"` 为判断依据的 Chromium 密码管理器也一样。

**修法：** 插件把所有 DSH 密码框改写成 `type="text"`，再用
`-webkit-text-security: disc` 保持圆点遮罩。Chrome 自带密码管理器只追踪真正的
`type="password"` 字段，所以提示不再出现；React 受控值、输入和 dsh 凭证存储
流程完全不变。

## 气泡 2 —— iCloud 密码的自动填充浮窗（漂在聊天输入框上）

iCloud 密码 Chrome 扩展会对每个页面跑 WebKit 风格的表单启发式判定。在 dsh 的
会话页面上，它会把某个文本框误判成凭证字段，然后弹出它的补全列表——就是那个
写着「iCloud 密码 / 打开‘密码’ App / 查找和创建密码」、漂在聊天输入框上方的
浮窗，哪怕这个站点根本没存过密码。页面属性没法可靠地关掉这套启发式，但这个
浮窗本身是页面内元素：扩展会往 `<body>` 追加一个 `<div popover>`，它的 open
shadow root 里挂着一个指向扩展 `completion_list.html` 的 iframe。

**修法：** 插件监听 DOM，在这个容器插入的瞬间就地中和——移除 shadow 里的
iframe 并把宿主强制隐藏（但不把它从 DOM 摘下来，扩展自己的 popover 状态机不会
因此抛异常）。气泡在 dsh 页面上永远不会渲染出来。

## 安装

```bash
dsh plugin --profile web add dsh-password-shield
# 重启正在运行的 dsh web
```

也可以手动在 `~/.dsh/profiles/web/cordis.patch.yml` 加一行：

```yaml
- insert:
    - id: password-shield
      name: 'dsh-password-shield'
```

然后把包链接/安装进 profile，重启 `dsh web`。

## 改动对比

| 之前 | 之后 |
|---|---|
| `<input type="password" autocomplete="off">` | `<input type="text" data-dsh-password-shield="masked" autocomplete="off">` |
| Chrome 弹保存/自动填充密码 UI | Chrome 只看到一个普通文本框 |
| iCloud 密码浮窗漂在聊天输入框上 | 浮窗容器插入即被中和 |

守卫在客户端 bundle 加载后立即启动，并持续监听 DOM：

- 转换已存在的字段；
- 转换后续插入的字段（React 弹窗、设置页、第三方插件面板）；
- React 把字段重新渲染回 `password` 时再次转换；
- 遍历打开的 shadow root；
- iCloud 补全浮窗一出现就中和；
- 插件卸载时清理 observer 和定时器。

## 安全

本插件不读取、不存储、不传输任何输入值，只修改页面内的 input 类型/autofill
属性，并隐藏 iCloud 密码的页内浮窗。API Key 仍走 DSH 原有的凭证流程。

## 开发

```bash
npm install
npm test
```

## License

MIT
