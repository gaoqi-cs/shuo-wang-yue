# 朔望月项目上下文

本文件是本项目的长期维护上下文。再次打开项目时，先完整阅读本文件，再修改代码。

## 项目定位

《朔望月》是一个离线可运行的中文网页卡牌游戏试玩版，主题为中国节气、传统农历节日和月相变化。整体体验强调月夜庭院、东方水墨、黑木银器、暖色灯笼与冷色月光，同时包含下注、诈唬、资源管理和满月技能等竞技机制。

项目路径：`D:\codexworkplace\shuo-wang-yue`

当前预览地址：`http://127.0.0.1:4317/`

静态服务启动方式：

```powershell
python -m http.server 4317 --bind 127.0.0.1
```

项目不依赖构建工具、包管理器或外部网络资源。直接打开 `index.html` 也可以运行，但开发时优先使用静态服务器。

## 文件结构

- `index.html`：全部页面结构、游戏 HUD、对话框和操作按钮。
- `styles.css`：基础布局、页面、牌面、角色、按钮、动画和响应式规则。
- `table-theme.css`：牌桌场景的高级视觉覆盖，包括庭院、灯笼、桌面包边、星轨和座位布局。该文件在 `styles.css` 后加载。
- `game.js`：卡牌数据、规则判定、人机、下注状态机、技能、教程、战绩和所有交互。
- `assets/*.svg`：六个搞怪动物角色头像。
- `README.md`：简短运行说明和功能摘要。
- `AGENTS.md`：本长期上下文文件。

当前右上角控件由 `table-theme.css` 固定定位，包含新手、牌力、俯视和退出。背景音乐候选位于 `audio-options/`：月庭主页使用 01，开始游戏到满月前使用 02，满月后使用 03。`game.js` 使用 HTMLAudio 播放背景音乐，并通过 Web Audio API 生成轮到行动、发牌、放道、加注、弃权、出局、摊牌和胜利音效；声音按钮控制音乐与所有动作音。

## 页面流程

1. 游客输入席上名并进入月庭。
2. 月庭主页提供开始游戏、战绩、图鉴和观月札记。
3. 选择六个角色之一、人机数量和难度。
4. 进行最多八回合牌局。
5. 每回合结束自动切换俯视视角并展示完整摊牌原因。
6. 八回合结束或只剩一名仍持有“道”的角色时进入终局排名。
7. 战绩、札记和教学完成状态写入 `localStorage`。

## 角色

六名角色各有一个四阶固有技能，每回合最多发动一次、整局最多四次；新回合只恢复本回合的发动资格，累计阶数不清零，道尽对决期间全部禁用。主动技能只能在自己的行动席发动，被动技能由结算自动触发。AI 与玩家遵守相同规则。

统一代价：第 1 次无代价；第 2 次在朔月牌力 -5、满月牌力 +5；第 3 次在朔月牌力 -15、满月牌力 +15，并扣 3 道；第 4 次扣 5 道并立即退出当前回合。技能扣道后若道尽，进入既有道尽待判流程。

- 白狐 · 霜弦「封月」：锁定任意角色的一张明牌或暗牌，本回合不能被交换或送出。
- 黑熊 · 墨岳「镇岳」：第 1/2/3 阶跟注减免 1/2/3 道，仍视为完整跟注。
- 赤鹿 · 丹枝「回枝」：输掉一回但仍存活时自动恢复 2/5/8 道，上限 12。
- 雪鹰 · 星烬「鹰瞰」：第 1/2/3 阶查看最多 1/2/3 名对手的暗牌直到回合结束。
- 灰狼 · 夜岚「断势」：第 1/2/3 阶加注后限制最多 1/2/3 名对手下一次只能跟注或弃权。
- 玉兔 · 月栖「借月」：第 1/2/3 阶通过滑杆秘密选择 ±5/±10/±15 的牌力修正。

每个席位头像旁有单字技能徽记，随时可点击查看技能、剩余次数和当前状态。玩家自己的主动技能通过操作栏“角色技”发动；借月数值只对使用者可见，但摊牌时必须解释实际修正值。

实现时必须区分两个状态：`charSkillUses` 保存整局累计阶数，不能在 `startRound()` 中清零；`charSkillUsed` 只表示本回合是否已经发动，必须在新回合重置。所有技能代价统一通过 `GameRules.characterSkillCost()` 计算，不能在各技能分支中重复硬编码。第三阶扣道导致道归零时必须进入道尽待判；第四阶必须扣除 5 道、设置本回合退场状态并跳过该角色后续行动。

敌方角色的技能解释徽记固定在头像左上方的独立区域，不得覆盖头像主体、角色名或明牌。桌面与移动端修改席位尺寸、明牌位置或徽记尺寸后，都要检查 `.character-skill-badge` 与 `.seat-visible` 的边界不相交。

头像使用项目内 SVG，表现为真实动物头部特征加略显搞怪的表情或配饰。不要退回单纯汉字圆形占位符。

## 卡牌数据

牌库共 36 张：

- 24 张节气牌
- 12 张传统农历节日牌

每张牌包含 `id`、名称、类别、农历月份、农历日期和基础牌力。

基础牌力公式：

```text
基础牌力 = 农历月份 + 农历日期
```

日期必须继续使用结构化数字存储，不能从显示文本反向解析。

卡面设计参考东方节气水墨海报，但已经去除年份、二维码、英文品牌和海报冗余信息。当前卡面结构为：类别、右上角牌力、水墨季节景物、纵向牌名和底部农历日期。

## 基础牌局

每名角色初始拥有：

- 12 道可用筹码
- 2 道保留筹码仅作为设定展示，不参与下注

每回合重新洗混完整牌库：

- 每人一张明牌
- 每人一张暗牌
- 中央一张公共牌

玩家的明牌和暗牌在手牌上方有明确标注。所有对手的明牌必须始终显示在其头像旁，并展示牌名与基础牌力。

## 月相判定

第 1 至 4 回合为朔月：

```text
牌力 = 明牌 + 暗牌 + 公共牌 + 所有技能额外牌
```

总牌力越大越强。

第 5 至 8 回合为满月。当前不再使用旧版固定 16 点上限，而采用动态月限：

| 回合 | 月限 |
|---|---:|
| 5 | 44 |
| 6 | 48 |
| 7 | 52 |
| 8 | 56 |

最接近且不超过当回合月限者最强。超过月限为“蚀月”，只失去当前回合资格，下一回合可以继续。若本回合所有存活玩家都超过月限，则改为只比较暗牌点数，暗牌点数最高者作为唯一赢家。

修改月限时必须同步检查：界面显示、人机判断、爆牌判定、赢家计算、教程、牌力侧栏和回合复盘。

## 道与淘汰

- 每回合仍在场的角色强制投入 1 道。
- 可用道降到 0 时进入本回合的待判状态。
- 弃权不会退回本回合已经投入桌面的道。
- 出局者后续回合不再行动。
- 场上只剩一名仍持有道的角色时，该角色提前赢得整局。
- “尽数投入”会使道归零并进入“道尽·待判”，按钮必须明确标注为待判，而不是立即出局。

不要恢复旧设计中的残月道或自动补充筹码。

当前实际规则有一个重要例外：角色在本回合把道降到 0 时进入“道尽·待判”，不会立即淘汰。其他仍在场角色必须在这一轮继续选择跟注或弃权并完成拼点；道尽者若获胜则保留资格，若未获胜则在摊牌后变为“道尽淘汰”。道尽者不能再行动，但仍参与本轮牌力比较。

一旦出现道尽待判，全桌进入道尽对决：除道尽者外的所有仍在场角色只能跟注或弃权，不能观望、加注、尽数投入、易牌、抽技能或赌命；所有人完成决策后立即拼点。

满月开始（第 5 回合）会先出现一次赌命选择：不赌命、赌命 +10 或赌命 -10。赌命加减只作用于第 5 回合的牌力比较；从第 5 回合开始，赌命者每回合都必须获胜，否则当回合结算后淘汰，并把剩余道尽量均分给其他仍在场角色。第 8 回合没有新的赌命入口。

易牌在朔月四回合内、轮到玩家自己的行动席时都可使用，总计 2 次；玩家可分别选择更换明牌或暗牌，不要求必须在首次下注前使用。

## 轮流下注状态机

下注不再批量执行。当前实现按席位逐人推进：

1. 明牌基础牌力最高者先行动。
2. 当前行动者头像和姓名产生金色高光。
3. 人机显示思考进度，并等待约 2.2 至 4 秒后决策。
4. 可执行观望、跟注、加注、弃权或尽数投入。
5. 加注次数没有固定上限，只受剩余道限制。
6. 每次有人加注，其他未弃权且未出局者必须重新表态。
7. 直到所有剩余角色投入相同、弃权或出局才进入摊牌。

核心状态字段包括：

- `game.currentTurnId`
- `game.turnIndex`
- `game.needsAction`
- `game.highBet`
- `game.resolving`

核心函数包括：

- `advanceTurn()`
- `takeAction()`
- `aiDecision()`
- `resolveRound()`

修改下注逻辑时必须避免自动替玩家跟注，也不能恢复三次加注限制。

## 玩家策略能力

每局拥有两次普通“易牌”，只能在当前回合首次下注行动前更换自己的明牌。次数跨回合保留。

右上角有一个小型“牌力”按钮，打开侧栏后按基础牌力从大到小显示全部 36 张牌。满月阶段同时显示当前月限。

## 满月技能牌

第 5 至 8 回合，轮到玩家时每回合可以抽一次随机技能牌：

- `易牌`：立即更换自己的明牌。
- `换牌`：选择一名角色，与其互换一张明牌或暗牌。
- `透视`：查看一名角色本回合的暗牌，结果保留在需要手动关闭的侧栏中。
- `加牌`：额外抽一张暗牌并计入总牌力。
- `送牌`：把自己的当前明牌加入指定角色的明牌区，自己补抽一张明牌。

技能涉及其他角色时必须让玩家手动选择目标。技能产生的额外牌必须计入 `power()`，并在回合摊牌中列出。

“加牌”抽到后不会自动使用：技能面板提供保留或放弃。保留的额外暗牌叠放在玩家暗牌后方，鼠标悬停可查看牌名和牌力。

## 摊牌与解释

每回合结束：

1. 自动将牌桌切换为俯视状态。
2. 留出约 1.8 秒观察桌面。
3. 展示公共牌、本回合规则、月盘数量和赢家。
4. 逐人展示明牌、暗牌、技能额外牌、总牌力、弃权、出局或蚀月状态。

这一流程的目标是让玩家明确知道为什么没有获胜，不能简化成只显示赢家姓名。

## 人机规则

人机只能根据自己的暗牌、公开明牌、公共牌、下注历史和难度决策，不能读取玩家暗牌。

当前风格包括谨慎、激进和观察。难度会调整跟注与加注倾向。人机必须遵守同样的道、淘汰、月限和加注规则。

## 视觉布局

牌桌界面的固定布局原则：

- 对手座位只分布在桌面上半圈，不占用玩家手牌区域。
- 玩家状态席位位于左下角，玩家手牌位于底部中央。
- 其他角色的明牌紧贴头像显示。
- 月相图标位于左上回合信息旁，不能遮挡中央或顶部角色。
- 操作栏固定在底部。
- 牌力、新手、视角和退出入口位于右上角。

`table-theme.css` 提供当前高级场景：深色黑木月桌、金属包边、星轨刻度、中心银盘、远山、栏杆和暖色灯笼。后续优化应延续冷月光与暖灯光的双光源，避免单一蓝黑或大面积紫色渐变。

## 响应式要求

- 桌面和移动端都不能让手牌遮挡其他角色。
- 移动端对手明牌可以缩小，但不能隐藏牌名和牌力。
- 按钮文字必须完整显示。
- 对话框内容过长时应允许内部滚动。
- 禁止角色、手牌、公共牌、月相标记和操作栏互相穿模。

## 本地数据

使用以下 `localStorage` 键：

- `shuoWangHistory`：最多 20 场历史战绩与回合记录。
- `shuoWangNote`：观月札记。
- `shuoWangTutorialSeen`：是否完成或跳过新手教学。

修改数据结构时需要兼容旧存档，读取时提供默认值。

## 验证方式

每次修改至少执行：

```powershell
node --check game.js
```

并确认以下资源通过本地服务返回 HTTP 200：

- `/index.html`
- `/styles.css`
- `/table-theme.css`
- `/game.js`
- 六个 `/assets/*.svg`

高风险玩法修改需要检查：

- 八回合能否完成
- 第五回合月相与技能是否切换
- 无限加注是否最终收敛
- 弃权后已下注道是否留在月盘
- 道归零后是否进入待判，并在未赢得本回合月盘时于回合结束淘汰
- 只剩一人持有道时是否提前结束
- 所有满月技能是否正确改变目标和牌力
- 摊牌说明是否与实际判定一致

## 当前限制

- 这是单机试玩版，没有真人联网匹配。
- 没有后端账号系统，登录和战绩均为本地数据。
- 音效按钮目前只有界面状态，没有完整音频资产。
- 角色头像为项目内 SVG，不是三维模型。
- 当前环境未配置 Playwright 所需的 `npx`，此前主要使用语法检查与 HTTP 资源检查验证。

背景音乐已落地为 `audio-options/` 下的三个 WAV：月庭使用 01，普通牌局使用 02，满月使用 03，终局结果回到 02。音乐使用 `HTMLAudio` 循环播放，动作音效继续由 Web Audio API 生成。

## 维护原则

- 保持项目完全独立，不要把文件写到 `D:\codexworkplace` 根目录。
- 不引入外部 CDN，除非用户明确同意联网依赖。
- 规则判定与视觉动画保持分离，赢家不能由动画位置决定。
- 修改规则时同步更新教程、侧栏说明、摊牌文案和本文件。
- 新增长期机制后，必须把最新规则补充进本文件，保证下一次会话能够恢复完整上下文。

## 2026-07-28 visual system update

- `ui-polish.css` is the final visual override layer and must load after `cinema-fix.css`.
- `design-system/shuo-wang-yue/MASTER.md` records the authoritative tokens, color roles, motion rules, and responsive constraints.
- The visual direction is premium Chinese moonlit courtyard: ink jade, moon silver, lantern gold, and restrained cinnabar danger states.
- Keep the project dependency-free. Do not add remote fonts, icon CDNs, or visual libraries for routine polish.
- Preview the current project at `http://127.0.0.1:4321/`.
- Eastern motion motifs live in `ui-polish.css`: moon-gate/cloud silhouettes, lake ripples, lantern sway, lunar pot dial, current-turn light, full-moon acceleration, and the table seal. Keep them CSS-only and preserve reduced-motion support.
- React Bits-inspired motion is implemented locally in `motion-effects.css` and `motion-effects.js`; no React dependency is used. The shared Canvas renders aurora, full-moon rays and particles, while delegated pointer events provide spotlight, glare, magnet and click-spark feedback.
- Extra hidden cards from `加牌` are rendered by `renderExtraHidden()` as a poker-like fan to the right of the main hidden card. Every card must keep an exposed strip and support hover, keyboard focus, and mobile tap to reveal its name and value.
- The character setup panel shows the selected character's skill name and description. `renderCharacter()` must update these fields whenever the portrait changes.
- `imperial-theme.css` provides the optional 宫灯漆金 theme. Theme state is stored in `shuoWangTheme`; keep the explicit selector on the character setup screen and the compact in-game toggle synchronized through `applyTheme()`.
- Core logic is split into dependency-free browser/CommonJS modules: `game-data.js`, `game-rules.js`, `game-ai.js`, and `game-runtime.js`. Keep `game.js` focused on DOM rendering and game-flow orchestration.
- Run `node --test tests\*.test.js` after rule, AI, skill, or timer changes. The suite covers full-moon limits, all-bust dark-card resolution, 道尽 restrictions, 镇岳, 封月, 断势, 借月, 回枝, AI hidden-information fairness, and stale timer cancellation.
- All game-flow delays must use the scheduler from `game-runtime.js`; call `scheduler.cancelAll()` when starting a new match, starting a new round, or leaving the table. A short-lived decorative cleanup timer in `motion-effects.js` is not game flow.
- `skill-effects.css` owns the six character-skill cinemas. Each effect must remain between 1 and 3 seconds across the three speed modes, block accidental table actions while active, and provide a reduced-motion fallback.
- `skill-card-effects.css` owns the shared full-moon card-skill stage. 易牌、换牌、透视、加牌、送牌 use distinct motion while state changes occur at the animation midpoint.
- The left-side `round-guide` displays the human player's current scored power, phase rule, call cost, and character-skill state. Never reveal another player's secret 借月 direction or hidden card through this panel.
- `shuoWangSpeed` stores `immersive`, `standard`, or `fast`. Keep setup controls, the in-game compact toggle, AI delays, round transitions, full-moon cinema, and skill cinemas synchronized with the selected speed.

## 2026-07-29 serialized effects update

- 同契的两枚月签为“同月”和“背月”，不再使用 A/B。撼岳复用全屏对决台，目标选择“迎锋”或“敛势”。
- 所有角色技能、公共技能牌、跟注、加注和结算被动必须串行播放。`operationBusy` 为统一交互锁，忙碌期间玩家和 AI 都不能开始下一项操作。
- 回合结束固定顺序为：拼点揭示、逐个播放回枝等结算被动、逐个播放逐寂等奖励，最后才打开回合结果对话框。禁止技能影院与回合结果同时出现。
- 新增会产生视觉反馈的规则时，必须加入既有串行队列或在完成回调中释放操作锁，不得用独立计时器并发推进牌局。
- 撼岳与同契等“影院 + 效果选择”技能必须先完整播放技能影院，影院关闭后保持 0.5 秒空场，再打开选择界面；选择结束后不得重复播放同一段全屏影院。AI 与玩家使用完全相同的顺序。

## Frost Realm Rule

- `霜境` no longer blocks card exchanges or gifts. Any character that targets `白狐 · 霜弦` with an active character skill receives `霜痕`; their next round begins with their active character skill sealed, while normal betting actions remain available.

## 2026-07-29 skill feedback update

- 所有角色技能和公共技能牌必须在结束时提供结构化结果回执，至少说明发动者、目标、选择、牌或道的变化、持续状态与解除时机。关键结果不能只写入行动日志。
- 封月必须直接在被封牌面显示“封月 · 0点”，座位状态同时说明明牌或暗牌归零；摊牌计算继续使用 `lockedZone`，不得只做视觉变灰。
- 换牌、易牌和送牌动画必须清晰展示来源牌、空中移动阶段、目标落点和最终归属。动画结束后的回执必须列出旧牌、新牌、牌力和接收者。
- `visibleExtras` 中的受赠明牌必须持续显示在目标座位旁，不能等到摊牌才出现。额外牌仍需计入牌力与摊牌说明。
- 霜境导致换牌或送牌失败时必须明确显示“霜境保护”，不得误报为封月锁定。
- 鹰瞰的情报面板只能在技能影院结束并空场 0.5 秒后打开；追影建立后，情报面板必须显示目标当前技能使用状态与可公开的使用方向。
- 回枝、逐寂、镇岳、断势、逐月必须显示明确数值或限制结果，例如恢复前后道数、应付与实付、断势施加者和解除时机、逐月获得次数。
- AI 发动封月、鹰瞰、借月、撼岳或同契后，必须在演出和结果阶段全部结束后再恢复 `aiDecision()`，不得在影院播放期间尝试下注。
- 同契的“同月/背月”按钮必须使用一致的墨玉深色背景、月金边框和高对比文字；禁止首个选项继承浅色或白色通用按钮背景。
- 同契胜负揭示后的“令其本回合弃权/取走 2 道”处置按钮使用专用 `.covenant-outcome` 样式；两个按钮都不得回退到浏览器默认白色背景，移动端需纵向排列并完整显示文字。
- 玩家通过鹰瞰或透视获得情报后，右上角显示本回合“情报”按钮，可重复打开月镜情报面板；新回合必须清空 `game.visionTargets` 与 `game.visionTarget` 并隐藏入口。
- 封月牌面必须展示明显的月轮受封视觉、交叉封条、“封”印与 0 点说明，玩家手牌和对手座位明牌使用同一状态语言，并支持 reduced-motion。
- 封月牌面视觉现使用独立 `.moon-seal` DOM 层：冷却牌面、银色月轮、双向月环、朱砂符片与“牌力归零”标签。禁止退回覆盖整张牌的粗线 X；原牌名和画面必须保持可辨，右上牌力角标必须真实显示为 0。

## 技能决策权限（现行规则）

- 撼岳由发起者指定目标；迎锋/敛势只能由被攻击者选择，AI 目标由 AI 自行决定，玩家界面不得显示可操作按钮。
- 同契由发起者和被攻击者分别秘密选择同月/背月，双方不能替对方选择。
- 同契选择相同则发起者获胜，选择不同则被攻击者获胜；揭示后的效果类型仍由技能发起者选择，负面效果必须自动施加给败者。
- 技能选择必须绑定 `phase` 与 `decisionMakerId`，UI 隐藏按钮不能替代逻辑层权限校验。

## 移动端横屏

- 触控手机端以横屏牌桌为唯一完整布局；竖屏时显示旋转设备提示，不得将牌桌、操作栏或技能选择压缩到不可用。
- 横屏布局必须适配安全区、低高度设备、触控目标和横向可滚动操作栏；不隐藏核心牌局组件。
- Android WebView 由 `android:screenOrientation="landscape"` 锁定横屏。网页资源由 Android 的 `syncWebAssets` 任务同步，修改网页资源后应重新构建 APK。

## 2026-07-30 maintenance summary

- 新手教学必须按朔月基础、技能教学、满月规则逐阶段开放；当前阶段与之前阶段可用上一步/下一步，未解锁步骤必须说明原因；完成一次全流程后允许自由浏览。进度键为 `shuoWangTutorialProgressV3`。
- 撼岳由发起者指定目标，但“迎锋 / 敛势”只能由被攻击者决定；AI 对 AI 的选择对玩家隐藏。
- 同契的发起者与被攻击者分别决定“同月 / 背月”；胜负由规则判定，胜负后的弃权/取走 2 道由发起者决定，负面效果自动施加给败者。
- 霜境的实际效果是给所有对白狐·霜弦使用主动技能的角色施加霜痕，使其下一回合主动技能封锁；正常下注不受影响，失败反馈使用“霜境保护”。
- 加注滑轨只预选金额，必须点击确认按钮才提交；非本人回合允许预选；不要使用双向箭头光标。
- 手机网页以横屏为完整布局，竖屏显示旋转提示；更新网页资源后同步 Android WebView 资源并重新构建 APK。
- `mobile-landscape.css` 必须同时适配登录页、选角页和牌局页；使用 `dvh`、安全区和基于可用高度的 `clamp()`，避免只缩放牌桌而让首页标题或底部控件溢出。移动端组件四周至少保留 6-8px 内边距。
- 横屏提示不能只依赖 CSS `orientation` 媒体查询；`orientation-support.js` 必须使用 `visualViewport`/`innerWidth` 与 `innerHeight` 运行时判断，并监听 `resize`、`orientationchange`，兼容 iPhone Safari 和 Android WebView。
- GitHub 发布由维护者手动完成，遵循 `GITHUB-WORKFLOW.md`；不要自动执行 commit、push 或远程仓库写操作。
