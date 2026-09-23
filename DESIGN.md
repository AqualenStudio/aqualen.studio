# Aqualen Studio 官网设计规范

## 定位

多游戏工作室官网。品牌叙事先于单一产品；Stellum 为当前项目，Inkighter 为已发售 Steam 作品，Capy Strike 为休止中的历史项目。Stellum 尚未具备公开宣传素材，页面以排版与品牌几何装饰呈现开发状态，不把旧作图片或新造的设定当作 Stellum 内容。

## 视觉系统

| 用途 | 值 | 原则 |
| --- | --- | --- |
| 品牌深海蓝 | `#101f2b` | 页眉、首屏、Stellum 展示位 |
| 深墨底色 | `#0b1721` | 影像区、页脚、视频弹窗 |
| 象牙纸 | `#f2efe7` | 作品列表、正文、信息阅读 |
| 香槟金 | `#d1b78a` | 深底强调、主按钮、装饰细线 |
| 深金 | `#806139` | 浅底文字标签和交互强调 |
| 正文辅助色 | 浅底 `#566460`，深底 `#b3bfc3` | 避免浅金小字落在白底 |

- 英文展示字体：本地 Cormorant Garamond 500；日文标题：本地 Noto Serif JP 500；缺字回退 Yu Mincho / Georgia。正文和控件保持 Segoe UI / Yu Gothic / Meiryo / Arial。
- 字体为 WOFF2 子集，合计约 100KB，许可证保存在 `assets/fonts/`。访客不请求外部字体服务。新增日文内容后运行 `node scripts/fonts.mjs` 更新子集（此维护步骤需要网络）；未收录字符仍有系统字体回退。
- 桌面 H1 48–94px（Stellum 特殊标题最高 160px），H2 34–60px，正文 14–15px / 1.75–1.95，辅助说明 12px，装饰编号 8–10px。
- 手机 H1 47–56px，H2 32–42px；日文长标题单独设定行高与缩放。
- 阅读容器最大 1280px；桌面章节间距 104px，平板 72px，手机 60px。正文约 65 字符宽。
- 边界使用 1px 细线、轻微颗粒、直角框；仅印章、播放按钮和箭头容器使用圆形。
- RPG 深化：双线按钮、作品四角金线、章节序号印记、当前导航菱形标记。图案属于工作室 UI，不代表 Stellum 已公开设定。保留正文留白，不在全部容器堆叠纹饰。

## 页面规划

1. 首页：工作室品牌首屏 → Stellum 当前项目提示 → 作品展厅 → Inkighter 影像 → 真实日誌 → 工作室介绍 → 联系。
2. Games：全部 / 开发中 / 发售 / 休止筛选，作品状态不混用。
3. Stellum：开发中标题展示、已知事实和联系入口。
4. Inkighter：现有插画、Steam、官方预告片；不编造未核实的卖点。
5. Capy Strike：休止状态、归档插画、现有可玩原型。
6. Journal：仅真实文章，不凭空添加开发里程碑。
7. Studio：创作取向、公司主体、商务和媒体联系方式。
8. Privacy / 404 / Prototype：统一的全站外壳。

## 交互规范

- 页面切换：原生 CSS View Transitions，180ms 淡出 / 400ms 入场；不支持的浏览器正常导航，保留前进、后退、新标签行为。
- 首屏插画缓慢缩放，按钮 2px 抬升，图片 hover 约 4% 缩放，章节最多 22px 入场。
- 不自动播放视频或声音；用户点击后创建 YouTube 隐私增强播放器。关闭和 Escape 都卸载 iframe、归还焦点。
- 系统 `prefers-reduced-motion` 优先，页脚支持会话间保存的减少动效选项。
- 点击纹章仅用于导航和主操作，不阻塞跳转、不添加音效；减少动效时关闭。键盘操作使用清晰焦点，移动端不依赖 hover。
- 内容与链接默认可见；无 JavaScript 时仍可浏览所有页面和作品，视频链接直接指向 YouTube。
- 英日切换更新正文及导航；品牌装饰短句保留英文。Capy 原型游戏界面明确标记为英文。

## 维护

- 页面源：`site/pages.mjs`；共用外壳：`site/layout.mjs`；原型 DOM：`site/prototype.mjs`。
- 样式：`assets/css/style.css`；RPG 视觉层：`assets/css/rpg.css`；原型补充：`assets/css/prototype.css`。
- 行为：`assets/js/site.js`；游戏流程：`assets/js/rogue-survivor.js`；纯规则：`assets/js/capy-core.mjs`；Canvas 渲染：`assets/js/capy-render.mjs`。游戏使用原生 ES Modules，静态主机须以 JavaScript MIME 提供 `.mjs`。
- 构建：`node scripts/build.mjs`，输出根目录 HTML 和 sitemap；提交时包含生成文件。现有静态托管不需要改部署流程。
- 检查：`node scripts/check.mjs`。
- 游戏回归：`node --experimental-vm-modules scripts/test-capy.mjs`（纯规则与隔离 DOM 流程，不替代真实浏览器测试）。
- 预览：`node scripts/serve.mjs`，打开 `http://127.0.0.1:4173`。仅供本机预览。
- 更新 Stellum 时替换其对应展示位与文案即可，无需改全站结构。不要直接编辑生成后的 HTML，避免下次构建覆盖。

## 参考方向

研究日期：2026-09-23。仅参考层级和交互思路，未复制第三方品牌、美术或源码。

- [FGO](https://www.fate-go.jp/)：大幅插画、细线装饰与章节入口。
- [碧蓝幻想](https://granbluefantasy.com/ja/)：视觉先行，信息按内容层级展开。
- [原神](https://genshin.hoyoverse.com/ja/home)：全幅视觉的沉浸式方向参考。
- [任天堂](https://www.nintendo.com/jp/index.html)：多产品入口与资讯层级。
- [游戏王](https://www.konami.com/yugioh/)：系列门户下的独立产品入口。

## Capy 原型升级范围

- 保留既有绘本角色与背景、自动射击、生存成长、三条能力组合和本地最高分；仍标记为归档原型。
- 增加开始、暂停、结算界面；升级卡有图标与等级变化，连续升级排队发放。
- 固定 1120 × 632 世界坐标及 60Hz 模拟；窄屏镜头跟随，窗口变化不改变角色速度与碰撞边界。
- 绘制时裁切素材透明留白，加入落地阴影、纵向排序、叶片击败效果、林间光线和冲刺残影。没有生成或替换新的产品宣传图。
- 护盾与受击保护统一；箭矢采用线段检测和单目标去重；Boss 加入蓄力范围提示。粒子、敌人与弹幕有数量上限，暂停状态不重复绘制。
- 游戏键盘仅在画布输入区域生效；失焦、切换标签页自动暂停；触屏独立摇杆和冲刺，取消触控后清除输入。
- 本轮重点是完整试玩与表现，未新增地图、关卡、音频或存档系统。后续精灵帧动画与新场景需要专门的美术制作。
