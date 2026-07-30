# GitHub 发布流程

以下命令由项目维护者自行执行。执行前确认当前目录是 `D:\codexworkplace\shuo-wang-yue`，并检查没有不应发布的本地文件。

## 首次发布

```powershell
cd D:\codexworkplace\shuo-wang-yue
git status
git diff --stat
git diff --check
git add AGENTS.md README.md SKILL-PERMISSIONS.md GITHUB-WORKFLOW.md .gitignore
git add game.js game-data.js game-rules.js game-runtime.js index.html
git add premium-ui.css skill-effects.css mobile-landscape.css tests
git commit -m "feat: improve skill privacy onboarding and mobile play"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<你的仓库名>.git
git push -u origin main
```

已有 `origin` 时先执行 `git remote -v`，不要重复添加远程仓库。

## 后续更新

```powershell
cd D:\codexworkplace\shuo-wang-yue
git status
git diff
git diff --check
git add .
git commit -m "fix: describe the change"
git push
```

远程有新提交时：

```powershell
git fetch origin
git pull --rebase origin main
git push
```

## 发布前验证

```powershell
node --check game.js
node --check game-rules.js
node --test tests\*.test.js
git diff --check
```

本地预览：`python -m http.server 4317 --bind 127.0.0.1`，访问 `http://127.0.0.1:4317/`，检查新手教学、撼岳、同契、霜境、加注确认和手机横屏布局。
