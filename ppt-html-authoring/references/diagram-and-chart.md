# 图表与示意图

PPT 涉及"信息可视化"时，**默认积极上图**而不是堆数字 / 堆段落。本文件讲三类视觉元素的写法：

1. **数据图表**（柱、折、饼、雷达等）→ Chart.js
2. **示意图**（流程、架构、系统边界、图标 + 连接线）→ 内联 SVG
3. **强制栅格化**（有特殊视觉效果、不能被 PPTX 原生支持的）→ `data-raster="true"`

## 1. 数据图表：Chart.js

### 占位约定

数据图表的 canvas 必须打 `data-ppt-chart-canvas` 属性。export 引擎识别这个标记后会把 Chart.js 的配置翻译成 pptxgenjs 的图表，导出 PPTX 后是**可编辑**的原生图表（用户能在 PowerPoint 里改数据）。

```html
<canvas id="revenue-chart" data-ppt-chart-canvas></canvas>
<script>
  new Chart(document.getElementById('revenue-chart'), {
    type: 'bar',
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{
        label: '营收(亿元)',
        data: [12.4, 15.8, 18.2, 22.1],
        backgroundColor: '#C7000B',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
    },
  })
</script>
```

### 何时用图表

任何页面上出现以下任一关键词都该考虑图表：

- 趋势 / 增长 / 下降 / 同比 / 环比
- 占比 / 比例 / 分布 / 构成
- 对比 / 排名 / Top N
- 阶段变化 / 多系列对比

### 数据形态 → 图表类型决策表

| 数据形态 | 用什么 | Chart.js type | 备注 |
|----------|--------|---------------|------|
| 时间序列（≥3 个时间点） | 折线 | `line` | 强调趋势；点少建议加 `pointRadius` |
| 时间序列对比（多系列） | 柱（分组）或折线（多线） | `bar` / `line` | 系列 ≤ 4 |
| 类别占比（总和=100%） | 饼 / 环 | `pie` / `doughnut` | 切片 ≤ 5，否则换条形 |
| 多类别比较（≥4 类别） | 柱状 | `bar` | 超过 8 类换横向条形（`indexAxis:'y'`） |
| 2-3 项对比 | 横向条形或对比卡片 | `bar`(`indexAxis:'y'`) | 项目少时大字数字卡也可 |
| 多维评估（5-8 维度） | 雷达 | `radar` | 维度 < 4 用条形即可 |
| 两变量关系 | 散点 | `scatter` | 数据点 ≥ 8 才有意义 |
| 累积构成 | 堆叠柱 / 堆叠区 | `bar`(stacked) / `line`(stacked area) | 系列 ≤ 5 |

数据点 < 3 / 系列只有 1~2 个值 / 用户只想强调一个数字 → **不要图表**，用大字号数字卡（KPI）更有冲击力。

### Chart.js 在 PPT 场景的"安全配置"（强制）

PPT 是静态产物，加上要被 `screenshot.mjs` 抓帧、`export.mjs` 二次解析，下面几条几乎是硬性的：

```js
new Chart(canvas, {
  type: 'bar',
  data: {...},
  options: {
    responsive: true,
    maintainAspectRatio: false,    // 必须 false：让 canvas 撑满父容器，不被宽高比强制拉伸
    animation: false,              // 必须 false：动画会让截图抓到未渲染完的帧
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: { enabled: false }, // PPT 是静态，不需要 hover tooltip
    },
    scales: {
      x: { ticks: { font: { size: 12 } } },
      y: { ticks: { font: { size: 12 } }, beginAtZero: true },
    },
  },
})
```

**容器侧硬性要求**：

```html
<!-- ✅ 父元素必须有显式高度，canvas 才能撑满 -->
<div style="flex:1 1 0; min-height:0; position:relative;">
  <canvas id="c" data-ppt-chart-canvas></canvas>
</div>

<!-- ❌ 父元素无高度 → canvas 高度 = 0 → 截图空白 -->
<div>
  <canvas id="c" data-ppt-chart-canvas></canvas>
</div>
```

要点：
- canvas 父元素必须**显式有高度**（`flex:1` + `min-height:0` 在 flex 容器里、或者写死 `height:240px`）
- `responsive:true` + `maintainAspectRatio:false` 配合 `display:block` 让 canvas 撑满父容器
- canvas 自身**不要**写死 `width`/`height` 属性，交给 Chart.js 自适应

### 不要

- 装饰性 canvas 不要打 `data-ppt-chart-canvas` 标记（导出会被当成图表配置，必失败）
- 别伪装图表 —— 用 svg 画一个看起来像柱图的东西又不带 Chart.js 配置，导出时只能整块栅格化，丢失可编辑性
- 千万**别开 `animation`**（默认是开的）—— 截图会抓到 0.3 秒的"还在长出来"的中间帧

## 2. 示意图：内联 SVG

流程、架构层级、系统边界、组织关系、关系图、简单的"图标 + 短标签 + 连接线" —— 优先**直接在 html 里写 `<svg>...</svg>`**。

`html2pptx-pro`（editable 默认引擎）会自动识别 SVG 节点并映射进 PPTX；复杂 SVG 可能退化为栅格图层。**你不需要手动 SVG → PNG 转换。**

### 最小示例

```html
<div data-role="image-slot" style="width:100%;height:100%;">
  <svg viewBox="0 0 600 360" style="width:100%;height:100%;">
    <!-- 三个层级 -->
    <rect x="40"  y="40"  width="160" height="80" fill="#E8F1FF" stroke="#1F6FEB" stroke-width="2"/>
    <text x="120" y="85"  text-anchor="middle" font-size="18" fill="#1F6FEB">网点</text>

    <rect x="220" y="40"  width="160" height="80" fill="#FFF3E0" stroke="#E07B00" stroke-width="2"/>
    <text x="300" y="85"  text-anchor="middle" font-size="18" fill="#E07B00">边缘</text>

    <rect x="400" y="40"  width="160" height="80" fill="#E8F5E9" stroke="#2E7D32" stroke-width="2"/>
    <text x="480" y="85"  text-anchor="middle" font-size="18" fill="#2E7D32">核心云</text>

    <!-- 连接线 -->
    <line x1="200" y1="80" x2="220" y2="80" stroke="#999" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="380" y1="80" x2="400" y2="80" stroke="#999" stroke-width="2" marker-end="url(#arrow)"/>

    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <polygon points="0 0, 10 5, 0 10" fill="#999"/>
      </marker>
    </defs>
  </svg>
</div>
```

### 简单示意图的另一种写法：图标 + 标签 + 绝对定位连接线

不想画 svg 时也可以用 div + 绝对定位 + CSS 边框拼出箭头，但要注意两点：

1. 形态尽量简单（横线、竖线、转角折成两段，不要复杂贝塞尔曲线）
2. 颜色用 CSS 变量，不要写死 hex

```html
<div class="line" style="position:absolute;left:120px;top:180px;width:120px;height:2px;background:var(--brand);"></div>
<div class="arrow" style="position:absolute;left:238px;top:176px;
     border-top:5px solid transparent;border-bottom:5px solid transparent;
     border-left:8px solid var(--brand);"></div>
```

### 反例（一定避免）

```html
<!-- ❌ image-slot 里只有占位文案，截图是空的 -->
<div data-role="image-slot">
  <p>场景示意图</p>
</div>

<!-- ❌ 引用本地 png，前端预览看不到（违反单文件硬约束） -->
<div data-role="image-slot">
  <img src="assets/diagram.png">
</div>
```

## 3. 强制栅格化：data-raster="true"

用于 PPTX 不能原生表达的视觉效果（CSS 渐变 + 滤镜的复杂卡片、含 mix-blend-mode 的层叠等）。给容器打上 `data-raster="true"`，export 时这块整体按截图嵌入 PPTX。

```html
<div data-raster="true" style="
  width:100%;height:160px;
  background: linear-gradient(135deg, #C7000B 0%, #1F6FEB 100%);
  mix-blend-mode: multiply;
  filter: blur(0.3px);
">
  ...
</div>
```

代价：栅格后失去可编辑性。**不要滥用** —— 凡能用 SVG 表达的就用 SVG。

## image-slot 自检（导出前必看）

凡是 slide.html 里有 `[data-role="image-slot"]` 的页（图文分栏类的版式），导出前确认：

- [ ] image-slot 里有真实视觉元素：内联 `<svg>`、`<img data:base64>`、或 `data-raster="true"` 容器
- [ ] **没有**只剩"场景示意图"这种占位文字
- [ ] **没有**残留的 `[data-diagram-placeholder="true"]` 节点
- [ ] `screenshot.mjs` 截图里**真的能看到**这块图，看不到 → PPTX 也会是空的

## 选型快查

| 信息形态 | 用 |
|----------|---|
| 数字趋势 / 占比 / 对比 | Chart.js（数据图表） |
| 流程 / 阶段 / 时间线 | 内联 SVG |
| 架构层级 / 系统边界 | 内联 SVG |
| 图标 + 短标签 + 连线 | 内联 SVG 或 div + 绝对定位 |
| 含品牌渐变 / 复杂滤镜的装饰卡 | `data-raster="true"` |
| 真的需要外部美图 | `<img src="https://...">` 远程 https |
| 用户给了本地 png 一定要用 | base64 inline |
