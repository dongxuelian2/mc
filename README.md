# Three.js 方块世界原型（TS）

一个轻量的 Minecraft 风格原型，基于 Three.js 与 Vite（TypeScript）。包含基础的地形生成、方块放置/破坏、粒子与音效、背包和物品栏。

## 功能
- 邻接剔除的体素网格（减少面数）
- 方块放置与破坏（含粒子碎屑与音效：可选资源包，否则回退合成音）
- 第一人称/第三人称移动、跳跃、重力与碰撞（疾跑/潜行）
- 7 种初始方块与生成纹理（可用本地资源包贴图替换）
- 热键切换物品栏、背包界面展示/选取方块

## 运行
```bash
npm install
npm run dev
```
浏览器打开提示的本地地址即可。

## 操作
- 鼠标左键：破坏方块
- 鼠标右键：放置当前选中方块
- 滚轮 / 1-7：切换物品栏方块
- WASD：移动，空格：跳跃
- Ctrl / 双击 W：疾跑
- Shift：潜行
- E：打开/关闭背包（会解除指针锁定，点击画面重新锁定）
- F5：切换第三人称视角

## 可选：使用本地 Minecraft 资源（贴图/音效）
出于版权原因，本仓库不内置 Mojang/Minecraft 原版资源；你可以从本地 `.minecraft/assets` 里提取到 `public/assets/` 后自动生效：

```bash
npm run extract:minecraft -- --version 1.21.4
```

- 贴图输出：`public/assets/blocks/`
- 音效输出：`public/assets/sounds/`

需要的文件名/结构见：`public/assets/blocks/README.md` 与 `public/assets/sounds/README.md`。
