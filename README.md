# Oracle Kit

把 Oracle CLI 的本地补丁和 Codex skill 放在一起，方便安装、分享和维护。
基于 [steipete/oracle](https://github.com/steipete/oracle)，保留上游 MIT 许可。
这是独立维护的补丁快照，不是上游官方发行版。

## 内容

- `dist/`：当前已打补丁的 JavaScript CLI，可直接运行。
- `skills/oracle/`：可复制到 Codex 的 skill，已移除原机器固定路径。
- `tests/`：模型别名、推理强度、界面选择验证及 CLI 预览的离线回归测试。
- `patches/chat-work.patch`：历史修改记录；安装时不需要再次应用。
- [来源说明](NOTICE.md)：原包版本、补丁边界及许可证信息。

## 安装 CLI

需要 Node.js 24 或更高版本、npm 和 Git。以下命令适用于 Linux、macOS
以及 WSL 的 Bash；浏览器可以使用独立启动的 Chrome。

```bash
git clone https://github.com/Xuanoh/oracle-kit.git
cd oracle-kit
npm ci --omit=dev --ignore-scripts
node dist/bin/oracle-cli.js --help
npm test
```

如果希望直接使用 `oracle` 命令，在仓库内执行：

```bash
npm link --ignore-scripts
oracle --help
```

`npm link` 会创建指向此仓库的命令链接，因此请保留仓库目录。
如果已经装了另一个 `oracle`，先决定要保留哪个版本；也可以继续使用
`node /完整路径/oracle-kit/dist/bin/oracle-cli.js`，不修改现有命令。
这里没有发布 npm 包，不要用 `npx @xuanoh/oracle-kit` 安装。

## 安装 Codex skill

在仓库内执行以下命令。已有同名 skill 时停止，先自行备份或比较。

```bash
ORACLE_SKILL_PARENT="${CODEX_HOME:-$HOME/.codex}/skills"
mkdir -p "$ORACLE_SKILL_PARENT"
if [ -e "$ORACLE_SKILL_PARENT/oracle" ]; then
  echo "目标 oracle skill 已存在；请先备份或比较。"
else
  cp -R skills/oracle "$ORACLE_SKILL_PARENT/oracle"
fi
```

在新任务中显式使用 `$oracle`。该 skill 保留了原有的显式调用设置。
CLI 与 skill 分开安装；复制 skill 本身不会安装 CLI。

## 首次使用

用自己的 ChatGPT 账号登录专用 Chrome profile，并启用本机调试端口。
启动示例和操作步骤见 [安装与浏览器设置](skills/oracle/references/installation.md)。
先预览，不发送问题：

```bash
oracle --engine browser --remote-chrome 127.0.0.1:9222 \
  --browser-surface chat --model latest --browser-thinking-time pro \
  --dry-run json --files-report -p "请检查这个方案的主要问题"
```

检查预览和文件清单后，去掉 `--dry-run json` 才会实际提交。
附加文件时使用 `--file "path/to/file"`。文件内容会随问题发送。

## 已知边界

- 浏览器适配器依据原环境中观察到的 Chat/Work 菜单编写；其他账号、
  界面或后续版本可能不兼容。模型名称和强度表是适配器规则及历史观察，
  不是账号权限或后端模型身份保证。无法验证界面选择时会停止。
- 当前 `--followup` 在缺少首页 Chat/Work 切换控件的对话页可能失败。
  不承诺连续对话端到端可用；恢复细节见
  [followups.md](skills/oracle/references/followups.md)。
- 本仓库提供已编译运行时，不包含完整 TypeScript 开发源码。
  原安装标记为 0.16.1，但精确上游提交尚未确认；不要假设可以从干净
  npm 版本重放历史 patch。详见 [NOTICE.md](NOTICE.md)。
- 分享代码不包含账号权限。使用者需自行登录浏览器；API 模式需自己的
  API 配置，并确认可用模型与费用。
- 浏览器登录信息、cookies、密钥和 Oracle 会话不在仓库中。

## 更新与检查

```bash
git pull --ff-only
npm ci --omit=dev --ignore-scripts
npm test
```

更新后按上面的 skill 安装路径比较并替换旧副本。
自动化检查只运行离线回归测试，不登录浏览器、不发送问题，也不调用付费 API。
