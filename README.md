# Oracle Kit

**让 Codex 遇到难题时，去问 ChatGPT，再回来继续做。**

> Oracle Kit 基于 **Peter Steinberger 的 [steipete/oracle](https://github.com/steipete/oracle)** 二次开发。
> 核心 CLI 来自上游；本仓库在此基础上增加了 Chat / Work 浏览器适配、模型与推理强度选择补丁，
> 并整合了 Codex skill 和安装文档。本项目独立维护，非上游官方发行版。
> 保留上游 [MIT 许可及版权声明](LICENSE)，具体来源见 [NOTICE.md](NOTICE.md)。

Oracle Kit 给 Codex 提供了一条咨询另一个模型的通路。
你说清楚想解决什么，Codex 负责整理问题、挑选项目文件，通过 Oracle 向 ChatGPT
发起咨询，拿到回答后核查建议，再继续当前任务。

适合在方案拿不准、bug 久查不明，或者需要另一轮代码与论证审查时使用。

## 安装：把这段话发给 Codex

```text
帮我安装 Oracle Kit：https://github.com/Xuanoh/oracle-kit

先读取仓库的 docs/setup.md，检查我的环境，安装 CLI 和 Codex skill，
并完成文档中的验证。保留已有配置；需要我登录浏览器时告诉我。
```

你需要自己的 ChatGPT 账号。浏览器模式使用你已登录的 Chrome；环境依赖、
浏览器连接和 skill 安装由 agent 按文档处理。

## 使用：直接说你要它帮什么忙

在 Codex 新任务中显式调用 `$oracle`：

```text
用 $oracle 看一下这个方案，重点找我可能忽略的假设和失败场景。
```

```text
这个 bug 已经试了几种办法还没解决。用 $oracle 带上相关代码、
报错和已尝试的方法，找出下一步最值得验证的原因。
```

```text
用 $oracle 审查这次修改。核查它提出的问题，把确认存在的 bug 修好。
```

问题组织、上下文选择、发送前预览和回答收集都由 agent 完成。
Oracle 提供第二意见；是否采纳，仍要通过代码、测试或原始材料验证。

## 给 agent

安装或更新时读取 [docs/setup.md](docs/setup.md)。
执行咨询时读取 [Oracle skill](skills/oracle/SKILL.md)，其中包含文件组织、
模型与推理强度选择、会话恢复和 API 使用说明。

Kit 包含可独立使用的 **Oracle CLI**，以及指导 Codex 使用它的 **skill**。
浏览器适配支持分别选择 Chat / Work、模型和推理强度，具体取决于账号界面。
当前连续对话仍有兼容性限制，见 [会话恢复](skills/oracle/references/followups.md)。

---

基于 [steipete/oracle](https://github.com/steipete/oracle) · [MIT](LICENSE) ·
[运行时与补丁来源](NOTICE.md)
