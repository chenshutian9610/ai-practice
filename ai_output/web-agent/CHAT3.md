---
功能: 聊天框模型选择器 + 双击 Esc 停止输出
环境: claudecode + minimax-m2.5
工具:
  - playwright-cli
  - spec-kit
    1. /speckit-specify
    2. /speckit-clearify [optional]
    3. /speckit-plan
    4. /speckit-tasks
    5. /speckit-implement
    6. /speckit-test [no this skill]
---

```
接下来我说的话, 你要追加到 @CHAT3.md 里面, 格式用 ``` 包裹, 结尾要换行
```

```
你知道 python 的 uv 吗, 帮我安装
```

```
你没有把我的话追加到 @CHAT3.md  中, 希望你下次记得
```

```
只需要记录我的话, 不需要你的, 同时两个``` 之间需要有两个换行符
```

```sh
# 终端安装 spec-kit
specify init . --ai claude
```

```
你还是没有追加到 @CHAT3.md 中
```

```text
@speckit-specify @docs/ 是初版功能, @openspec/ 是第二版追加的功能
基于上述设计, 聊天框增加一个模型切换的功能
1. 模型列表每次点击选择的时候实时查询有多少模型, 支持搜索框过滤
2. 原先在设置那里的模型, 定义修改为默认模型, 新的聊天窗口默认选中的模型
```

```text
@speckit-specify 修改下, 模型列表只在第一次实时查询, 然后缓存在当前浏览器, 然后在模型搜索框旁边加一个刷新按钮, 点击后再重新拉取模型列表
```

```text
/speckit-plan
```

```text
/speckit-tasks
```

```text
/speckit-implement
```

```text
启动服务
```

```text
设置页面的 Model 要改名为默认模型, 作为新聊天窗口的默认模型
```

```text
有问题, 默认模型配置的是 qwen3-8b, 新窗口的默认模型是 gpt
```

```text
增加一个中断功能, 快捷键是两次esc, 作用是打断模型输出
```

```
中断按钮没有用, 无法停止 ai 的输出, 你自己修复然后验证 /playwright-cli
```

```
把发送按钮和暂停按钮合并成一个, 因为同一时间也只有一个可以按
```

```
把发送按钮的快捷键从 ctrl+enter 改成 enter
```

```
当发送消息等待回答的时候, 聊天框的hint改成 "停止输出, 双击 Esc"
```

```
没有哦, 我指的是这个位置
https://minimax-algeng-chat-tts.oss-cn-wulanchabu.aliyuncs.com/ccv2%2F2026-04-23%2FMiniMax-M2.5-highspeed%2F2042084921912070173%2F26c2b0900bde531f13a52c41e2e7b56d5ff3b0c3b945c331ecc8cad1ffbacb55..png
```

```
这次改对了, 把你前面两次改错的恢复回去
```

```
你忘了追加 @CHAT3.md
```


