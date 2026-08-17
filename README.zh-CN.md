# dsh-password-shield

消除 DeepSeek Harness（dsh）Web 界面 API 密钥输入框上丑陋的浏览器密码提示。

DSH 官方 Web UI 把 API Key 输入框（首次启动的「添加一个 API Key 开始使用」弹窗、
**设置 → 模型**、**设置 → 插件 → 网页搜索**）渲染成
`<input type="password" autocomplete="off">`。Chrome 对密码框会**故意忽略**
`autocomplete="off"`，于是会在弹窗上冒出「保存密码？」/钥匙图标气泡；iCloud
密码等其他密码管理器也一样。老 dsh web 实例（比如长期运行或经 SSH 隧道访问的
旧 profile）里，首次引导或插件 API Key 弹窗还在，这个提示尤其容易出现。

这个纯客户端插件把所有 DSH 密码框改成 `type="text"`，再用
`-webkit-text-security: disc` 保持圆点遮罩。Chrome 密码管理器只追踪真正的
`type="password"` 字段，所以提示不会再出现；React 受控值、输入和 dsh 凭证
存储流程完全不变。

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
| 浏览器弹保存/自动填充密码 UI | 浏览器只看到一个普通文本框 |
| 原生密码框显示圆点 | `-webkit-text-security: disc` 显示圆点 |

守卫在客户端 bundle 加载后立即启动，并持续监听 DOM：

- 转换已存在的字段；
- 转换后续插入的字段（React 弹窗、设置页、第三方插件面板）；
- React 把字段重新渲染回 `password` 时再次转换；
- 遍历打开的 shadow root；
- 插件卸载时清理 observer 和定时器。

## 为什么用插件而不是只改上游？

上游的密码框遮罩本身是合理的 UX，问题出在浏览器行为。用插件可以不改
DSH 主仓库、不受版本影响，并且能同时覆盖其他会渲染密码框的 DSH 插件。

## 安全

本插件不读取、不存储、不传输任何输入值，只修改页面内的 input 类型和
autofill 属性。API Key 仍走 DSH 原有的凭证流程。

## 开发

```bash
npm install
npm test
```

## License

MIT
