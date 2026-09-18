# Oracle Kit

**让 Codex 带着问题和项目文件，向 ChatGPT 咨询第二意见。**

当你用 Codex 写代码、排查问题或推敲方案时，有些问题值得交给另一个模型再看一遍。
Oracle Kit 把这个过程接入工作流：整理问题、选取相关文件、发送给 ChatGPT，
再把回答带回当前任务，供 Codex 分析和验证。

例如，你可以直接对 Codex 说：

> 用 $oracle 审查这个重构方案，附上相关实现，重点找兼容性问题和遗漏的边界情况。

## 能用来做什么

- **审查方案**：在开始改代码前，检查设计假设、接口边界和取舍。
- **协助排错**：把错误信息、相关实现和已经尝试过的方法交给另一个模型分析。
- **检查代码**：围绕一次修改提供必要上下文，寻找潜在缺陷和回归风险。
- **推敲论证**：附上草稿或实验摘要，检查论证中的跳步、反例和证据缺口。

Oracle 的回答是一份可供核查的建议。Codex 仍需要结合代码、测试或原始材料，
判断哪些建议成立，再继续完成任务。

## CLI 和 skill 各做什么

Oracle Kit 包含两个配合使用的部分，也可以单独使用 CLI。

| 组件 | 作用 |
| --- | --- |
| **Oracle CLI** | 接收问题和文件，通过浏览器或 API 发起咨询，并收集回答、保存会话。 |
| **Codex skill** | 指导 Codex 组织问题、选择上下文、预览发送内容，以及处理回答和失败后的恢复。 |

浏览器模式连接你已登录的 Chrome，使用 ChatGPT 网页进行咨询。
本 Kit 的适配器增加了 Chat / Work 界面选择，并分别处理模型菜单和推理强度。
API 模式则需要单独配置对应服务的 API 凭据。

一次典型的咨询过程是：

```text
你提出任务
    ↓
Codex 整理问题和相关文件
    ↓
Oracle 预览上下文 → 发送给 ChatGPT → 收集回答
    ↓
Codex 核查建议，继续处理任务
```

## 开始使用

需要 **Node.js 24+、npm 和 Git**。使用浏览器模式还需要 Chrome，
以及你自己的 ChatGPT 登录账号。下面的安装命令适用于 Bash（Linux、macOS 或 WSL）。

### 1. 安装 CLI

```bash
git clone https://github.com/Xuanoh/oracle-kit.git
cd oracle-kit
npm ci --omit=dev --ignore-scripts
npm link --ignore-scripts
oracle --help
```

`npm link` 将 `oracle` 命令链接到这个目录，安装后请保留它。
如果你已经安装了其他版本的 Oracle，可以跳过链接，使用
`node dist/bin/oracle-cli.js` 运行本仓库的版本。

### 2. 连接浏览器

启动一个启用了调试端口的专用 Chrome，并在其中登录 ChatGPT。
Linux 示例：

```bash
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.oracle/browser-profile"
```

macOS、Windows 和 WSL 的设置见 [浏览器连接说明](skills/oracle/references/installation.md)。
调试端口应仅供本机访问；每位使用者都应使用自己的登录状态。

### 3. 在 Codex 中启用 skill

把本仓库的 `skills/oracle` 目录复制到 Codex 的 skills 目录。
下面的命令支持自定义 `CODEX_HOME`，并在已有同名 skill 时停止复制：

```bash
ORACLE_SKILL_PARENT="${CODEX_HOME:-$HOME/.codex}/skills"
mkdir -p "$ORACLE_SKILL_PARENT"
if [ -e "$ORACLE_SKILL_PARENT/oracle" ]; then
  echo "oracle skill 已存在，请先比较或备份。"
else
  cp -R skills/oracle "$ORACLE_SKILL_PARENT/oracle"
fi
```

然后在 Codex 新任务中用 `$oracle` 发起咨询，例如：

> 用 $oracle 检查这次修改是否遗漏边界情况。附上相关代码和测试，先查看要发送的内容，再咨询并核查回答。

## 直接在终端使用

也可以自己准备问题和文件。下面的命令预览一次代码审查请求：

```bash
oracle --engine browser --remote-chrome 127.0.0.1:9222 \
  --browser-surface chat --model latest --browser-thinking-time pro \
  -p "请审查这些代码，重点检查错误处理和边界情况。" \
  --file "src/**" \
  --dry-run json --files-report
```

把 `src/**` 换成需要咨询的文件路径。检查预览后，去掉 `--dry-run json` 即可发送。
问题和选中的文件会提交给所选服务，请确认文件中没有密钥等不应发送的内容。
示例中的模型与强度需要在你的账号界面中可用。

文件选择规则见 [文件与问题组织](skills/oracle/references/bundles.md)，
模型选择见 [浏览器选项](skills/oracle/references/browser.md)，
会话查看和 API 使用见 [会话与 API](skills/oracle/references/sessions-api.md)。

## 当前限制

- ChatGPT 网页和账号可用选项可能不同。适配器无法验证所选界面、模型或强度时会停止；网页上的选择也不能证明后端模型身份。
- 连续对话仍有已知兼容性问题：`--followup` 在部分对话页可能失败。遇到超时应先确认原请求的状态，避免重复发送。详见 [会话恢复](skills/oracle/references/followups.md)。

## 项目来源与维护

基于 [steipete/oracle](https://github.com/steipete/oracle)，遵循 [MIT 许可](LICENSE)。
本仓库维护了额外的浏览器适配和 Codex skill。
当前 CLI 以已编译 JavaScript 形式提供，尚未整理成完整的 TypeScript 开发源码仓库；
版本来源和历史补丁说明见 [NOTICE.md](NOTICE.md)。

更新 CLI 并运行离线检查：

```bash
git pull --ff-only
npm ci --omit=dev --ignore-scripts
npm test
```

skill 安装的是副本，更新后需要另外同步。离线测试不发送咨询，也不调用付费 API。
