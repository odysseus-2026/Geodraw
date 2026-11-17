# GeoDraw 几何图解 · 升级手册

本网页的几何识别能力全部来自 `js/patterns.js` 中的**几何规则库**。升级 = 扩充规则库，不需要改动其他文件。

## 文件结构

```
app/
├── index.html          # 页面结构
├── css/style.css       # 界面样式
├── js/
│   ├── patterns.js     # ★ 几何规则库（KIMI 更新区）——升级只改这个文件
│   ├── engine.js       # 识别引擎（归一化 → 匹配打分 → 绘图指令）
│   ├── geom2d.js       # 平面几何 SVG 渲染器（通用；支持 polygon/circle/ellipse/line/seg/point/angle）
│   ├── geom3d.js       # 立体几何 Three.js 渲染器（通用；支持 box/poly3/pyramid/sphere/disc/cone/cylinder/prism/point3/seg3）
│   ├── inputs.js       # 文字 / 语音 / 图片(OCR) 输入
│   ├── demo.js         # 演示测试题（可追加，用于回归测试；当前 5 道高考真题 + 4 道移植题）
│   └── app.js          # 界面装配
├── tools/
│   └── geometry_drawer.py   # v1.1.0 导入的 Python 几何作图程序（源文件备查；其能力已移植进 patterns.js）
└── UPGRADE.md          # 本文件
```

## 版本记录

- **v1.1.0**（2026-10-06）：导入 `geometry_drawer.py`。该程序基于 Python/matplotlib，无法在浏览器中直接运行，
  故将其全部图形能力**等价移植**为 JS 模式（椭圆与直线含中点弦、等边/等腰/直角三角形、精确尺寸四边形、
  正多边形、长方体、三棱锥 PA⊥底面、球；圆柱/圆锥支持半径与高）。同时为渲染器补充了
  `ellipse` / `line` / `poly3` 三个通用图元——`poly3`（顶点表+面表）可表达任意多面体，后续新增
  棱台、组合体等模式时优先复用。Python 源文件留存于 `tools/` 备查。
- **v1.0.0**（2026-10-06）：初版，9 类模式 + 5 道高考演示题。

## 升级流程（遇到无法识别的题目时）

1. 网页上无法识别的题目会自动进入「待升级队列」；
2. 点击「导出升级包」得到 `geodraw-升级包-YYYY-MM-DD.json`；
3. 把 JSON 内容发给 Kimi，说"请升级几何规则库"；
4. Kimi 在 `js/patterns.js` 末尾追加新模式对象，更新 `LIB.version` 与 `LIB.changelog`；
5. 保存新版本后刷新页面，新题型即可识别。

## 新增模式的写法

在 `patterns.js` 的 `LIB.patterns` 中追加一个对象（文件头有完整契约注释）：

```js
var p2xxx = {
  id: 'p2-xxx',            // 平面题 p2- 开头，立体题 p3- 开头
  name: '模式名称',
  dim: '2d',               // 或 '3d'
  kw: ['关键词'],
  test: function (t) {     // t 是归一化后的题面；返回 null=不匹配，对象=参数
    if (!/关键词/.test(t)) return null;
    return { /* 提取的参数 */ };
  },
  spec: function (p) {     // 返回绘图指令（2D/3D 指令格式见 patterns.js 文件头）
    return { items: [ ... ], notes: [] };
  }
};
```

规则：
- 模式按"越具体越靠前"的顺序注册；
- `test()` 宁缺毋滥：拿不准就返回 null，让给后面的模式；
- 题面缺少数值时用合理缺省值，并在 `notes` 里说明"按一般情形示意"；
- 追加后在 `demo.js` 中补一道对应测试题，保证每次升级可回归验证。
