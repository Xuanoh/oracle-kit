# 安装与验证（给 agent）

当用户要求安装 Oracle Kit 时，完成安装和可用性检查，并报告实际结果。
先检查操作系统、现有 Node.js/npm/Git、`oracle` 命令、Codex skill 目录和浏览器连接。
复用兼容的现有环境；下面的 Bash 命令是安装路径示例，按实际平台调整。

把仓库放在用户指定的位置或其常用工具目录中。如果已有 checkout，先检查本地修改；
不要覆盖其他版本的 CLI、skill 或浏览器 profile。已有同名文件时先比较，
没有差异即可复用；有差异且用户未授权替换时，报告具体冲突。
缺少运行时依赖时，遵循当前环境已有的安装权限和工具管理方式。


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

macOS、Windows 和 WSL 的设置见 [浏览器连接说明](../skills/oracle/references/installation.md)。
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

文件选择规则见 [文件与问题组织](../skills/oracle/references/bundles.md)，
模型选择见 [浏览器选项](../skills/oracle/references/browser.md)，
会话查看和 API 使用见 [会话与 API](../skills/oracle/references/sessions-api.md)。

## 验证完成情况

- 确认实际执行的 CLI 来自这个 checkout，且 `--help` 含 `--browser-surface`。
- 运行 `npm test`，检查离线回归结果。
- 确认 skill 已安装到当前 Codex 使用的目录，其引用文件完整。
- 从运行 Oracle 的环境检查 Chrome 调试端口；需要登录时，让用户在浏览器中自行完成。
- 用不附带项目文件的简单问题运行 `--dry-run json --files-report`，检查预览。

安装验证不需要实际发送咨询，也不需要调用付费 API。
分别报告 CLI/skill 是否安装、浏览器是否可连接、是否还需用户登录；
不要把 dry-run 成功描述成已经完成真实问答。
完成后给用户一条可以在 Codex 新任务中直接使用的 `$oracle` 示例。

## 后续使用和更新

实际咨询时读取 [Oracle skill](../skills/oracle/SKILL.md)，按用户任务选择必要上下文。
浏览器界面差异和连续对话问题见 [浏览器选项](../skills/oracle/references/browser.md)
与 [会话恢复](../skills/oracle/references/followups.md)。

更新前检查本地修改，然后在仓库中执行：

```bash
git pull --ff-only
npm ci --omit=dev --ignore-scripts
npm test
```

skill 安装的是副本，需要比较并同步；`npm link` 创建的 CLI 链接继续使用此 checkout。
运行时来源及历史 patch 的限制见 [NOTICE.md](../NOTICE.md)。
