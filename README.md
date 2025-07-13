# miniAI

miniAI是一个本地化运行的微信小程序AI Agent开发框架，让开发者无需搭建后端服务即可实现功能完整的AI应用。框架提供大模型接入、工具调用、RAG和记忆功能等核心能力，同时提供简单的对话界面，便于测试或修改使用。

![展示动画](https://github.com/yuanlin-yu/miniAi/blob/main/assets/miniAI.mp4)

## :sparkles: 核心优势

- **零后端开发**：一般小程序AI Agent通过调用后端api实现，要么使用云开发，要么自建后端（需要ICP备案）。本框架提供本地化运行方案，无需建立后端，只需提供大语言模型的api地址和密钥，即可轻松搭建AI Agent，大大降低AI Agent搭建成本；
- **完全本地化**：数据无需离开用户设备，保障隐私安全
- **低成本接入**：独立开发者也能轻松构建专业级AI应用
- **灵活扩展**：支持自定义工具函数和知识库增强

## :star2: 主要功能

| 功能模块 | 描述 | 特点 |
|---------|------|------|
| **大模型接入** | 支持qwen, deepseek等主流大模型API | 通过大模型baseurl和api key引入，通过设置背景提示词及tempeture参数定制AI Agent，支持流式输出 |
| **工具调用** | 开发者自定义函数扩展 | 灵活集成业务逻辑 |
| **RAG增强** | 文本embedding向量生成及RAG语义搜索 | 基于随机投影树（RP-Tree） 算法的内存向量数据库 |
| **记忆功能** | 对话历史管理 | 本地化保存历史聊天记录，随时读取进行持续对话 |

## :rocket: 开始使用

**1. 克隆本仓库链接**:
```
git clone https://github.com/yuanlin-yu/miniAI.git
```
或从本页面下载压缩包后解压。

**2. 设置环境变量**:
1、修改项目根目录下project.congfig.json中的`appid`, 输入框架使用者的`appid`；
2、修改`utils\miniAI`目录下的`env.js`文件，输入大模型以及embedding模型的相关参数（base url, api key, model name等）；

**3. 运行项目**:
1、使用微信开发者工具导入项目目录即可打开项目；
2、通过`utils\miniAI`目录下的`index.js`配置agent（按需要进行agent大模型、工具及记忆功能设置），通过`tools\tools.js`进行相关工具函数定义，已提供相关例子；
3、通过预览进行后续项目运行及调试，项目已提供简单的聊天交互界面；

## :bulb: 主要函数介绍

|  函数 | 变量 | 描述 |
|--------|------|------|
| `useChat(input, isStream)` | `input`: 类型: `string`, 用户输入的信息; `isStream`: 类型: `boolean`, 默认未false，当为true时，流式输出模式打开 | 调用 LLM 聊天接口，支持普通返回或流式输出。|
| `messagesCallback(callback)` | `callback`: 类型: `function`,  messages更新后的回调函数 | 通常配合`useChat(input, isStream)`一起使用，把`useChat(input, isStream)`实时更新的messages通过回调函数执行后续指令，使用范例见项目代码。 |
| `newChat()` | 无 | 初始化当前聊天上下文。 |
| `useMemory(type, fileName)` | `type`: 类型: `string`,  执行聊天记录存取的方式，提供以下四种方式：`write`：保存、 `read`：读取、 `delete`：删除、 `info`：获取记忆文件信息包括创建、最新更新时间等；`fileName`: 类型: `string`, 保存聊天记录的文件名；| 采用微信小程序文件api进行聊天记录存取。 |
| `recallMemory(messages)` | `messages`: 类型: `array`,  聊天记录数组；| 把当前聊天上下文更新为输入的messages； |
| `initRagDB(fileName)` | `fileName`: 类型: `string`,  Rag数据保存文件名；| 初始化Rag向量数据库，后续操作相关数据都保存在名为`{fileName}_rag`文件中。 |
| `initRagDB(fileName)` | `fileName`: 类型: `string`,  Rag数据保存文件名；| 初始化Rag向量数据库，后续操作相关数据都保存在名为`{fileName}_rag`文件中。 |
| `generateVectorChunksArray(textContent, chunkSize, overlapSize)` | `textContent`: 类型: `string`,  需要进行分段的字符串段落；`chunkSize`: 类型: `number`,  分段长度，默认值为1000；`overlapSize`: 类型: `number`,  分段之间重叠长度，默认值为200；| 将指定字符串段落进行分段，并通过embedding模型转化为向量，输出字符串-向量矩阵，同时自动添加保存到当前`initRagDB(fileName)` 初始化的文件。 |
| `gcleanChunks()` | 无 |  删除当前`initRagDB(fileName)` 初始化的数据文件。 |
| `query(text, topK)` | `text`: 类型: `string`,  需要查询的输入文本；`topK`: 类型: `number`,  根据Rag语义搜索返回的按相似性排序的字符串数数量，默认值为3； |  把输入文本通过embedding模型转化为向量后在当前Rag向量数据库中进行语义搜索并返回。 |

## :warning: 其他说明

1、useChat的stream模式推荐使用手机进行预览，微信开发者工具的模拟器中可能会出现运行失败的情况；
2、引用的大模型base url域名需先登陆微信公众平台，在个人小程序开发账号中添加域名，待审核通过后即可使用；
3、本项目直接用wx.quest进行大模型url请求，所以baseurl一般使用https://xxx.com/chat/completions的形式，而非openai的 /v1 形式，具体以使用的大模型api文档为准；
4、项目提供了rag文本段落示例，通过`pages\index\data.js`文件引入，开发者可根据自己需求进行相关修改，如可通过读入文件的形式等；

## :green_book: 许可证

本项目采用 MIT License，灵活开源
[MIT](https://opensource.org/license/MIT).

## :iphone: 联系

本库持续完善中，欢迎交流，可关注抖音号`Aaron ChatAnything`，了解更多AI应用独立开发分享。
