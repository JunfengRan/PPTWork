# slide.html 写法（硬约束 + 怎么写好）

## 必须先理解：渲染管线为什么决定了约束

slide.html 同一份文件被两条不同管线吃：

| 场景 | 加载方式 | base URL | 相对路径能否解到磁盘 |
|------|----------|----------|----------------------|
| 前端预览（缩略图、主预览） | `<iframe :srcdoc="slide.html">` | `about:srcdoc` | **不能** |
| `screenshot.mjs` / `export.mjs` | playwright-core + 本地 static HTTP server | `http://127.0.0.1:xxx/` | 能 |

为了让前端 + 截图 + 导出三处看到的**同一个东西**，必须按 srcdoc 那条更严的来写。

## 单文件硬约束

**slide.html 必须是完全自包含的单文件。**

| 资源类型 | ✅ 允许 | ❌ 禁止 |
|----------|---------|---------|
| CSS | inline `<style>` | `<link rel="stylesheet" href="本地路径">` |
| JS  | inline `<script>` | `<script src="本地路径">` |
| 远程库（chart.js / d3 / fonts） | `<script src="https://...">` `<link href="https://...">` | http (必须 https) |
| 图片 | `<img src="https://...">` 或 `<img src="data:image/...;base64,...">` | `<img src="assets/x.png">` 或 `./x.png` |
| 字体 | Google Fonts 等 https CDN | 本地 .woff/.woff2 |

不要在 deck 或 slide 目录下建 `assets/` `shared/` `common/` 这种共用文件夹放 css/js。每张 slide 自给自足，**宁可重复也不要拆**。

## 为什么相对路径图片"似乎能用"但还是不要写

`<img src="assets/diagram.png">` 在 `screenshot.mjs` 和 `export.mjs` 时**真的能渲**（因为走 static HTTP server）。但前端预览（srcdoc）会显示破图。结果就是：

- 用户在前端缩略图列表 / 主预览里看不到图
- 用户截图时图突然出现
- 用户导出 PPTX 时图也在
- 用户问"为什么前端是空的" → 你解释半天

除非用户**明确**说"放弃前端预览，只要导出对就行"，否则一律 base64 inline 或远程 https。

## 本地图片怎么 inline

如果用户把图片放到了 slide 目录（或者你用 read 工具读了别处的图），转成 base64 写进 html：

```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..." alt="架构图">
```

读取 + 编码可以让用户/上游工具准备好 base64 字符串再粘进来；agent 自己写 html 时直接把 base64 串作为 `src` 值即可。base64 字符串可能很长 —— 这是必要代价。

如果图特别大（>2MB），先压缩或换 svg/远程 cdn。

## 反例（严禁）

```html
<!-- 全部会在 srcdoc 下 404，前端预览看不到样式 / 脚本 / 图 -->
<link rel="stylesheet" href="../assets/style.css">
<script src="./chart-config.js"></script>
<img src="./bg.jpg">
<img src="assets/diagram-slide-08.png">
```

## 正例

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="artifact-type" content="deck" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..900&display=swap">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      :root {
        --brand: #C7000B;
        --ink: #1A1A1A;
        --muted: #6B7280;
        --bg: #FFFFFF;
      }
      body {
        margin: 0;
        font-family: "Inter", "PingFang SC", sans-serif;
        background: var(--bg);
        color: var(--ink);
      }
      html, body { width: 1280px; height: 720px; }
      .slide { width: 1280px; height: 720px; padding: 64px; box-sizing: border-box; }
      .panel { padding: 24px; }
    </style>
  </head>
  <body>
    <div class="slide">
      <div class="panel">
        <canvas id="c" data-ppt-chart-canvas></canvas>
      </div>
    </div>
    <script>
      new Chart(document.getElementById('c'), {
        type: 'bar',
        data: { labels: ['A','B','C'], datasets: [{ data: [12, 19, 3] }] },
      })
    </script>
  </body>
</html>
```

## 写好 slide.html 的几条经验

### 必须声明制品类型 `<meta>`（**硬约束**）

每张 slide.html 的 `<head>` 必须包含：

```html
<meta name="artifact-type" content="deck">
```

前端 canvas 据此把 iframe 尺寸设为 1280×720，使 panel 较窄时出现滚动条（而不是裁掉内容），并保证 moveable / 选区坐标系跟设计稿 1:1 对齐。

漏写 → canvas 把当前文件当成"普通网页"按 100%/100% 流式渲染，PPT 会被裁切、moveable 拖拽位置错乱。**这是平台契约，写 slide.html 时第一行就放进去。**

设计尺寸由前端按 `artifact-type` 自动选择（deck → 1280×720），**不要**自己写 `artifact-design-size`，避免与平台规格漂移。

### 版心固定 1280×720（**硬约束**）

整页画布固定为 `1280×720` 像素（16:9），对应 PowerPoint 现代默认 16:9 尺寸 / pptxgenjs `LAYOUT_WIDE`（13.333 × 7.5 in）。前端缩略图、`screenshot.mjs`、`export.mjs` 的 editable 模式都依赖这个版心。

**`<html>` 和 `<body>` 必须显式写出 `width:1280px; height:720px;`**，禁止用 `100vh` / `min-height` / 纯 flex 居中代替显式高度——`html2pptx-pro` 与 headless 截图都是按 body 实际渲染尺寸算版心的，body 撑不住高度会导致所有元素坐标错位甚至超出 layout。

```html
<style>
  html, body { width: 1280px; height: 720px; margin: 0; }
  .slide-container { width: 1280px; height: 720px; }
</style>
```

### 用 CSS 变量做主题层

颜色 / 字号 / 间距集中放 `:root` 上的 CSS 变量。换品牌色时改变量就够了，不要全文搜替换 hex。

### data-id / data-role 稳定

如果一页里某个元素以后可能要被宿主 `edit` / `patch` 工具局部精修，或者要被 `export.mjs` / `html2pptx-pro` 识别（比如 `[data-role="image-slot"]`、`[data-ppt-chart-canvas]`），加上稳定的 `data-id` / `data-role`。后续改文案时按 `data-id` 定位，不会破外层结构。

### 布局防溢出口诀（高频踩坑）

1280×720 是固定边界，**任何内容不得溢出**。下面是一套从 Flex/Grid 容器层就把溢出杀死的写法，遵守它能省掉 80% 的"截图发现文字被切了"的返工。

**1. 总容器锁死 + 隐藏溢出**

```html
<div class="slide" style="width:1280px;height:720px;overflow:hidden;box-sizing:border-box;">
```

`overflow:hidden` 是最后一道防线 —— 内容真溢出了至少不会撑变形版心，宁可被切也别走形。

**2. 三段html式骨架：页头 / 内容 / 页脚**

```html
<div class="slide" style="display:flex;flex-direction:column;">
  <header style="flex-shrink:0; height:64px;">标题区</header>
  <main   style="flex:1 1 0; min-height:0; overflow:hidden;">内容区</main>
  <footer style="flex-shrink:0; height:32px;">页脚</footer>
</div>
```

- 页头/页脚 `flex-shrink:0` + 固定高度（防内容多了被压扁）
- 内容区 `flex:1 1 0; min-height:0; overflow:hidden`（**`min-height:0` 不能省**，否则 flex 子元素会被内容撑超）

**3. `<main>` 禁止只有一个子元素**

只有一个子元素 → 它会顶天立地占满整个 main，里面再溢出就不可控。强制至少 2 个直接子元素，让 flex/grid 帮你分配空间：

```html
<!-- ❌ 顶天立地块 -->
<main><div>所有内容</div></main>

<!-- ✅ 至少分两块 -->
<main style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
  <div>左</div>
  <div>右</div>
</main>
```

**4. 子元素布局口诀**

| 父容器 | 子元素必须写 |
|--------|--------------|
| `display:grid; grid-template-columns:...`（左右分列） | `height:100%; min-height:0; overflow:hidden` |
| `display:flex; flex-direction:column`（上下分行） | `flex:1 1 0; min-height:0; overflow:hidden` |
| `display:flex; flex-direction:row`（横向排列） | `flex:1 1 0; min-width:0; overflow:hidden` |

记忆：**Grid 分列 → `height:100%`；Flex 分行/列 → `flex:1`；`min-*:0` 永远要带**。

**5. 文本溢出：宁可 clamp 也不要让它撑破容器**

长正文用 `-webkit-line-clamp` 截断（PPT 不该有"需要滚动看完"的页）：

```css
.bullet-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

长标题用 `text-wrap:balance` 让换行更均衡。

**6. 图片：永远 `object-fit: contain`，永远限尺寸**

```html
<img src="..." style="width:100%;height:100%;object-fit:contain;display:block;">
```

不限尺寸的 `<img>` 会按原始像素撑出去，1280×720 立刻爆。

**7. 慎用：会让 PPTX 导出渲染不一致的效果**

下面这些前端 iframe 看着挺好，**导出 PPTX 时大概率糊或丢失**：

- `backdrop-filter` / `filter: blur()` — 栅格化时模糊半径会偏
- `mix-blend-mode` — 大量 PPT 渲染器不支持
- 复杂 `background: linear-gradient + radial-gradient` 叠层 — 颜色断层
- `clip-path` 复杂多边形 — 截图边缘锯齿

非要用就给容器打 `data-raster="true"`（参见 `diagram-and-chart.md`），整块按位图嵌入，避免 PPT 引擎乱译。

### 图表 / 示意图怎么写

→ 单独看 `diagram-and-chart.md`。

### 演讲者备注：必须在 slide.html 里留节点

design.md 的 `Note` 段是演讲者讲稿，但**不会**直接进 PPTX。导出引擎只读 slide.html 里特定节点：

```html
<!-- 推荐：JSON 形式，最稳 -->
<script type="application/json" id="ppt-speaker-notes-json">
{ "text": "开场点题：3 年设备数涨 8 倍...\n承接到下一页的'三层新架构'。" }
</script>

<!-- 兜底：文本节点，用 hidden 避免在版面里渲染出来 -->
<div id="ppt-speaker-notes" hidden>
开场点题：3 年设备数涨 8 倍...
承接到下一页的"三层新架构"。
</div>
```

写 slide.html 时把 design.md 的 `Note` 段内容同步到这里（任选一种形式即可）。漏写 → 导出 PPTX 备注栏是空的，演讲者翻 PPT 没词。

### 一次写完一页，不要分多次"补"

同一页同一轮里把 design.md 三段 + slide.html 主体 + 关键文案 + 图表/示意图 + 必要 CSS 全部写完。先扔骨架后碎片补句的方式，跨轮易丢上下文，质量明显下降。

## 风险点

- ⚠️ 大范围 `innerHTML` 替换会破坏 `data-id` 稳定性，应使用宿主 `edit` / `patch` 工具按 `data-id` 局部精修
- ⚠️ base64 图片串很长但**不能省**，省掉就是前端预览空白
- ⚠️ Chart.js 等库如果走相对路径或本地文件 100% 不会执行，必须 https CDN
