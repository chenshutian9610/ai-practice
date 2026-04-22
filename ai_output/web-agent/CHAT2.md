---
功能: 新增 mcp server 支持
环境: claudecode + minimax-m2.5
工具:
  - playwright-cli
  - openspec
    1. /opsx:propose
    2. /opsx:apply
    3. /opsx:archive
---

```sh
npm install -g @playwright/cli@latest
playwright-cli install --skills

npm install -g @fission-ai/openspec@latest
openspec init
```

```
/opsx:propose @docs/ 是原有的需求文档, 增加新需求 "mcp server" 的支持
```

```
/opsx:apply  
```

```
启动服务, 然后使用 /playwright-cli 验证 mcp server                                                                          
测试用的 mcp server 如下 
{
  "mcpServers": {
    "time": {
      "command": "python",
      "args": ["-m", "mcp_server_time"]
    }
  }
}
```

```
我配置了一个有效的 llm, 你可以用这个继续测试, 现在最基本的聊天功能有问题了 /playwright-cli
```

```
和 AI 聊天的时候有正常加载聊天信息, 但是刷新页面后看历史聊天记录, AI 的记录消失了
```

```
AI 回答结束后, 还在 loading, 要卡一下之后才能继续聊天
```

```
未解决, AI 回答结束后需要等待 4s 左右, 才可以继续对话
```

```
停顿的更久了, 你自己测试验证下, 我要的效果是 AI 回答结束后, 不久后就可以继续下次对话, 而不是要 loading 几秒 /playwright-cli
```

```
http 的 mcp server 配置无效, 比如 https://mcp-weathertrax.jaredco.com, 自行测试 /playwright-cli
```

```
我同时配置了 weather(http)和time(stdio), ai 只获取到weather的工具
```

```
聊天框的发送改成 Ctrl+enter, 不要一点 enter 就发消息
```

```
AI回答后loading时间长的问题又出现了, 自己测试看效果 /playwright-cli 
```

```
更新README
```