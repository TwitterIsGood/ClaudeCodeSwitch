# ClaudeSwitch

> 一键切换 Claude Code 多服务商配置，告别繁琐的 JSON 手动编辑

## 它解决什么问题？

Claude Code 用户在使用不同 API 服务商（如 Anthropic 官方、Azure、Bedrock 或自定义代理）时，需要手动编辑 `~/.claude/settings.json`，频繁修改环境变量和配置项——既繁琐又容易出错。

**ClaudeSwitch** 让这一切变得简单：

- **多服务商管理**：保存多套配置，随时切换
- **可视化编辑**：无需手写 JSON，界面操作一目了然
- **一键应用**：点击即可将配置写入环境变量
- **自动检测**：启动时自动定位默认配置文件

## 功能亮点

- 支持 API Key、Base URL、默认模型等完整配置
- 自定义服务商支持的模型列表
- Material Design 3 现代界面
- 原生桌面应用

## 快速开始

```bash
# 克隆项目
git clone https://github.com/yourname/claude-switch.git

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建发布版本
npm run tauri build
```

## 技术栈

- Tauri v2 + React 19 + TypeScript
- Material Web Components (M3)

## License

MIT
