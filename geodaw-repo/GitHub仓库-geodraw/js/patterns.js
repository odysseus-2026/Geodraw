/* ============================================================================
 * GeoDraw 几何规则库 · patterns.js
 * ============================================================================
 * ★★★ KIMI 更新区 ★★★
 *
 * 本文件是整个程序的"知识库"，也是唯一需要定期升级的文件。
 * 当网页遇到无法识别的几何题时，升级流程为：
 *   1. 用户在网页上点击「导出升级包」，得到 upgrade-request.json（含题目原文）
 *   2. 把该文件内容发给 Kimi，并说"请升级几何规则库"
 *   3. Kimi 只需在本文件 PATTERNS 数组末尾追加一个新模式对象，并更新
 *      LIB.version / LIB.changelog，渲染器（geom2d.js / geom3d.js）无需改动
 *
 * ── 新模式对象的写法（契约）──────────────────────────────────────────────
 * {
 *   id:   'p2-xxx',              // 唯一 id，平面题以 p2- 开头，立体题以 p3- 开头
 *   name: '模式名称',             // 显示在「识别报告」中
 *   dim:  '2d' | '3d',
 *   kw:   ['关键词1','关键词2'],  // 用于粗筛打分
 *   test(t){ ... return params 或 null },   // t 为已归一化的题面文本；
 *                                           // 返回 null 表示不匹配，
 *                                           // 返回对象即匹配（对象即提取到的参数）
 *   spec(p){ ... return 绘图指令 },          // p 为 test() 的返回值
 *                                           // spec 可附带 notes:['给人看的注释']
 * }
 *
 * ── 2D 绘图指令（spec 返回值）────────────────────────────────────────────
 * { view:{axes:true|false},                   // 是否画坐标轴
 *   items:[
 *     {kind:'polygon', pts:[[x,y],...], labels:['A','B',...], // 多边形（自动闭合）
 *                      sideLabels:[{i:0,text:'2'}]},          // 第 i 条边的中点标注
 *     {kind:'circle',  c:[x,y], r:2, label:'C'},              // 圆
 *     {kind:'ellipse', c:[x,y], rx:2, ry:1.4, label:'C'},     // 椭圆（轴平行坐标轴）
 *     {kind:'line',    a:[x,y], b:[x,y], label:'l'},          // 直线（自动延伸至取景边界）
 *     {kind:'seg',     a:[x,y], b:[x,y], dash:true},          // 线段（可虚线）
 *     {kind:'point',   p:[x,y], label:'O', accent:true},      // 点（可带标签/强调色）
 *     {kind:'angle',   v:[x,y], a:[x,y], b:[x,y], text:'120°'}// 角弧（顶点 v）
 *   ]}
 *
 * ── 3D 绘图指令 ─────────────────────────────────────────────────────────
 * { items:[
 *     {kind:'box',     size:2, dims:[a,b,c],                  // dims=[长,宽,高] 时为长方体
 *                      labels:{bottom:['A','B','C','D'],top:['A₁','B₁','C₁','D₁']},
 *                      marks:[{edge:['A','B'],label:'E'}], segments:[['E','F']]},
 *     {kind:'poly3',   verts:{A:[x,y,z],...}, faces:[['A','B','C'],...],
 *                      edges:[['P','A']], dashed:[['B','C']]},// 任意多面体（通用图元）
 *     {kind:'pyramid', n:4, side:4, h:3, apex:'P', baseLabels:['A','B','C','D']},
 *     {kind:'sphere',  c:[0,0,0], r:3, wire:true},
 *     {kind:'disc',    c:[0,0,-2], r:2, label:'O₁', inscribed:['A','B','C']},
 *     {kind:'cone',    r:2, h:3, apex:'S'},
 *     {kind:'cylinder',r:1.5, h:3},
 *     {kind:'prism',   n:3, side:3, h:3},                     // n=底面边数
 *     {kind:'point3',  p:[x,y,z], label:'O'},
 *     {kind:'seg3',    a:[x,y,z], b:[x,y,z], dash:true, label:'h=3'}
 * ]}
 * ==========================================================================*/

(function () {
  'use strict';

  var LIB = {
    version: '1.1.0',
    updated: '2026-10-06',
    changelog: [
      { v: '1.1.0', date: '2026-10-06', note: '导入 geometry_drawer.py 的图形能力：新增椭圆与直线（含中点弦）、特殊三角形（等边/等腰/直角）、精确尺寸四边形（正方形/矩形/平行四边形/梯形）、正多边形、三棱锥（PA⊥底面）、球，共 6 类模式；长方体支持长×宽×高参数，圆柱/圆锥支持底面半径与高（圆锥支持母线反解高）；渲染器新增 ellipse / line / poly3 通用图元；演示测试增至 9 题' },
      { v: '1.0.0', date: '2026-10-06', note: '初版：三角形、圆与弦、四边形、正方体、棱锥、球与截面、圆锥、圆柱、棱柱，共 10 类模式；内置 5 道高考题演示' }
    ]
  };

  /* ---------- 小工具 ---------- */
  function D(x) { return Math.round(x * 1000) / 1000; }           // 坐标取整
  function num(s) {                                                 // "√19" / "3.5" → 数值
    s = String(s).trim();
    if (s.charAt(0) === '√') return Math.sqrt(parseFloat(s.slice(1)));
    return parseFloat(s);
  }
  function sub1(s) { return s.replace(/1/g, '₁'); }                 // A1 → A₁
  function desub(s) { return s.replace(/₁/g, '1'); }                // A₁ → A1

  /* ==========================================================================
   * 平面几何模式
   * ==========================================================================*/

  /* 三角形（含边角条件） */
  var p2Triangle = {
    id: 'p2-triangle', name: '三角形（边角条件）', dim: '2d',
    kw: ['三角形', '△'],
    test: function (t) {
      if (!/△|三角形/.test(t)) return null;
      if (/外接圆|球面/.test(t)) return null;                       // 交给球截面模式
      var p = { labels: ['A', 'B', 'C'] };
      var m = t.match(/△\s*([A-Z]{3})/);
      if (m) p.labels = m[1].split('');
      var am = t.match(/[∠]?([A-Z])\s*[=＝]\s*(\d+)\s*[°º]/);
      if (am) p.angle = { v: am[1], deg: +am[2] };
      p.sides = [];
      var re = /([A-Z]{2})\s*[=＝]\s*(√?\d+(?:\.\d+)?)/g, x;
      while ((x = re.exec(t))) p.sides.push({ e: x[1], v: x[2] });
      return p;
    },
    spec: function (p) {
      var L = p.labels;
      var c = 2, ang = 60, a = 3;                                   // 缺省：AB=2, ∠B=60°, BC=3
      (p.sides || []).forEach(function (s) {
        var e = desub(s.e);
        if (e === L[0] + L[1] || e === L[1] + L[0]) c = num(s.v);   // AB
        if (e === L[1] + L[2] || e === L[2] + L[1]) a = num(s.v);   // BC
      });
      if (p.angle && p.angle.v === L[1]) ang = p.angle.deg;
      var bSide = null;
      (p.sides || []).forEach(function (s) {
        var e = desub(s.e);
        if (e === L[0] + L[2] || e === L[2] + L[0]) bSide = num(s.v); // AC=b
      });
      var solved = false;
      if (bSide && p.angle && p.angle.v === L[1]) {                 // 余弦定理反解 a
        var rad = ang * Math.PI / 180;
        var A = 1, B = -2 * c * Math.cos(rad), C = c * c - bSide * bSide;
        var disc = B * B - 4 * A * C;
        if (disc >= 0) { a = (-B + Math.sqrt(disc)) / 2; solved = true; }
      }
      var rad = ang * Math.PI / 180;
      var Bp = [0, 0], Ap = [D(c), 0], Cp = [D(a * Math.cos(rad)), D(a * Math.sin(rad))];
      var items = [{
        kind: 'polygon', pts: [Ap, Bp, Cp], labels: L,
        sideLabels: [{ i: 0, text: String(c) }]
      }];
      if (p.angle && p.angle.v === L[1]) items.push({ kind: 'angle', v: Bp, a: Ap, b: Cp, text: ang + '°' });
      if (bSide) {
        items.push({ kind: 'seg', a: Ap, b: Cp, label: '√' + Math.round(bSide * bSide) });
      }
      var notes = [];
      if (solved) notes.push('已按余弦定理由 b、c 与 ∠B 反解出 a=BC，图形按真实比例绘制');
      if (!p.angle && !(p.sides || []).length) notes.push('题面未给出具体边角数值，按一般三角形示意');
      return { view: {}, items: items, notes: notes };
    }
  };

  /* 圆与直线（弦） */
  var p2CircleChord = {
    id: 'p2-circle-chord', name: '圆与直线相交（弦）', dim: '2d',
    kw: ['⊙', '圆', '直线', '交于', '弦'],
    test: function (t) {
      if (/椭圆|双曲线|抛物线/.test(t)) return null;               // 圆锥曲线不在本库
      if (!/[⊙圆]/.test(t)) return null;
      if (!/直线|交于|弦|切/.test(t)) return null;
      var p = { h: 0, k: 0, r: 2, clabel: 'C' };
      var cm = t.match(/⊙\s*([A-Z])/); if (cm) p.clabel = cm[1];
      var em = t.match(/\(x\s*([-+]\s*\d+(?:\.\d+)?)?\)\s*²?\s*\+\s*\(?y\s*([-+]\s*\d+(?:\.\d+)?)?\)?\s*²\s*=\s*(\d+(?:\.\d+)?)/);
      if (em) {
        p.h = em[1] ? -parseFloat(em[1].replace('−', '-').replace(/\s/g, '')) : 0;
        p.k = em[2] ? -parseFloat(em[2].replace('−', '-').replace(/\s/g, '')) : 0;
        p.r = Math.sqrt(parseFloat(em[3]));
        p.fromEq = true;
      }
      p.hasLineParam = /直线.*[a-z](?![a-z])/i.test(t) && /my|kx|λ|参数/.test(t);
      return p;
    },
    spec: function (p) {
      // 取一条斜率为 1、距圆心 0.55r 的弦作示意（直线含参数时的代表情形）
      var h = p.h, k = p.k, r = p.r;
      var b0 = k - h + r * 0.55 * Math.SQRT2;                        // 直线 y=x+b0
      // 求交点：(x-h)²+(x+b0-k)²=r²
      var A = 2, B = 2 * (b0 - k - h), C = h * h + (b0 - k) * (b0 - k) - r * r;
      var disc = B * B - 4 * A * C, pts;
      if (disc >= 0) {
        var x1 = (-B - Math.sqrt(disc)) / (2 * A), x2 = (-B + Math.sqrt(disc)) / (2 * A);
        pts = [[D(x1), D(x1 + b0)], [D(x2), D(x2 + b0)]];
      } else {
        pts = [[D(h - r * 0.7), D(k + r * 0.7)], [D(h + r * 0.7), D(k - r * 0.7)]];
      }
      var items = [
        { kind: 'circle', c: [D(h), D(k)], r: D(r), label: p.clabel },
        { kind: 'seg', a: pts[0], b: pts[1], labels: ['A', 'B'] },
        { kind: 'point', p: [D(h), D(k)] },
        { kind: 'seg', a: [D(h), D(k)], b: pts[1], dash: true, label: 'r=' + D(r) }
      ];
      var notes = p.hasLineParam ? ['直线方程含参数，图示取使弦距圆心约 0.55r 的代表位置'] : [];
      if (p.fromEq) notes.push('已从圆的标准方程解析出圆心 (' + D(h) + ',' + D(k) + ')、半径 ' + D(r));
      return { view: { axes: true }, items: items, notes: notes };
    }
  };

  /* 圆（一般） */
  var p2Circle = {
    id: 'p2-circle', name: '圆', dim: '2d',
    kw: ['圆', '⊙'],
    test: function (t) {
      if (/椭圆|双曲线|抛物线/.test(t)) return null;               // 圆锥曲线不在本库
      if (!/[⊙圆]/.test(t)) return null;
      var p = { label: 'O' };
      var cm = t.match(/[⊙圆]\s*([A-Z])/); if (cm) p.label = cm[1];
      var rm = t.match(/半径\s*(?:为|=|＝)\s*(\d+(?:\.\d+)?)/); if (rm) p.r = +rm[1];
      return p;
    },
    spec: function (p) {
      var r = p.r || 2;
      return { view: {}, notes: [], items: [
        { kind: 'circle', c: [0, 0], r: r, label: p.label },
        { kind: 'point', p: [0, 0] },
        { kind: 'seg', a: [0, 0], b: [D(r * 0.707), D(r * 0.707)], label: 'r=' + r }
      ] };
    }
  };

  /* 四边形（平行四边形/矩形/菱形/正方形/梯形） */
  var p2Quad = {
    id: 'p2-quad', name: '四边形', dim: '2d',
    kw: ['平行四边形', '矩形', '菱形', '正方形', '梯形', '四边形'],
    test: function (t) {
      var m = t.match(/平行四边形|矩形|菱形|正方形|梯形|四边形/);
      if (!m) return null;
      if (/正方体|正方形\s*ABCD\s*的?中心|平面/.test(t) && /平面|球|棱/.test(t)) return null; // 立体题排除
      var p = { type: m[0], labels: ['A', 'B', 'C', 'D'] };
      var lm = t.match(/(?:平行四边形|矩形|菱形|正方形|梯形|四边形)\s*([A-Z]{4})/);
      if (lm) p.labels = lm[1].split('');
      return p;
    },
    spec: function (p) {
      var pts;
      if (p.type === '正方形' || p.type === '矩形') pts = [[0, 0], [3, 0], [3, p.type === '正方形' ? 3 : 2], [0, p.type === '正方形' ? 3 : 2]];
      else if (p.type === '菱形') pts = [[0, 0], [2.6, 0], [3.9, 1.8], [1.3, 1.8]];
      else if (p.type === '梯形') pts = [[0, 0], [3.6, 0], [2.6, 1.8], [1, 1.8]];
      else pts = [[0, 0], [3.2, 0], [4.1, 1.9], [0.9, 1.9]];       // 平行四边形
      return { view: {}, notes: ['按「' + p.type + '」的一般形状示意'], items: [
        { kind: 'polygon', pts: pts, labels: p.labels }
      ] };
    }
  };

  /* ==========================================================================
   * v1.1.0 新增 · 移植自 geometry_drawer.py 的平面图形能力
   * ==========================================================================*/

  /* 椭圆与直线（含中点弦） */
  var p2EllipseLine = {
    id: 'p2-ellipse-line', name: '椭圆与直线', dim: '2d',
    kw: ['椭圆', '直线', '中点', '斜率', '弦'],
    test: function (t) {
      if (!/椭圆/.test(t)) return null;
      var p = {};
      var ma = t.match(/x\s*(?:²|\^?2)\s*\/\s*(\d+(?:\.\d+)?)/);   // x²/a²（兼容 x^2、x2）
      var mb = t.match(/y\s*(?:²|\^?2)\s*\/\s*(\d+(?:\.\d+)?)/);
      p.a2 = ma ? parseFloat(ma[1]) : 4;
      p.b2 = mb ? parseFloat(mb[1]) : 3;
      var mp = t.match(/P\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
      p.x0 = mp ? parseFloat(mp[1]) : 1;
      p.y0 = mp ? parseFloat(mp[2]) : 1;
      if (/中点/.test(t)) p.midChord = true;
      var mk = t.match(/斜率\s*(?:为|=)?\s*(-?\d+(?:\.\d+)?)/) || t.match(/[kK]\s*=\s*(-?\d+(?:\.\d+)?)/);
      if (mk) p.k = parseFloat(mk[1]);
      return p;
    },
    spec: function (p) {
      var a = Math.sqrt(p.a2), b = Math.sqrt(p.b2);
      var k = p.k, notes = [];
      if (p.midChord) {
        k = -p.b2 * p.x0 / (p.a2 * p.y0);                          // 中点弦斜率公式
        notes.push('由中点弦公式 k=-b²x₀/(a²y₀) 得直线斜率 k=' + D(k));
      }
      if (k == null) { k = 1; notes.push('题面未给斜率，按 k=1 示意'); }
      // 直线 y=k(x-x0)+y0 与椭圆 x²/a²+y²/b²=1 联立求交点
      var c = p.y0 - k * p.x0;
      var A = 1 / p.a2 + k * k / p.b2, B = 2 * k * c / p.b2, C = c * c / p.b2 - 1;
      var disc = B * B - 4 * A * C;
      var items = [{ kind: 'ellipse', c: [0, 0], rx: D(a), ry: D(b) }];
      var p1, p2;
      if (disc > 0) {
        var x1 = (-B - Math.sqrt(disc)) / (2 * A), x2 = (-B + Math.sqrt(disc)) / (2 * A);
        p1 = [D(x1), D(k * (x1 - p.x0) + p.y0)];
        p2 = [D(x2), D(k * (x2 - p.x0) + p.y0)];
        var len = D(Math.abs(x2 - x1) * Math.sqrt(1 + k * k));
        items.push({ kind: 'seg', a: p1, b: p2 });
        items.push({ kind: 'point', p: p1, label: 'A' });
        items.push({ kind: 'point', p: p2, label: 'B' });
        notes.push('直线与椭圆交于 A、B，弦长 |AB|≈' + len);
      } else {
        var xa = p.x0 - a, xb = p.x0 + a;
        p1 = [D(xa), D(k * (xa - p.x0) + p.y0)];
        p2 = [D(xb), D(k * (xb - p.x0) + p.y0)];
        notes.push('该斜率下直线与椭圆无公共点，按直线位置示意');
      }
      items.push({ kind: 'line', a: p1, b: p2, label: 'l' });
      items.push({ kind: 'point', p: [p.x0, p.y0], label: 'P', accent: true });
      return { view: { axes: true }, items: items, notes: notes };
    }
  };

  /* 特殊三角形：等边 / 等腰 / 直角 / 等腰直角 */
  var p2TriangleSpecial = {
    id: 'p2-triangle-special', name: '特殊三角形（等边/等腰/直角）', dim: '2d',
    kw: ['等边三角形', '正三角形', '等腰三角形', '直角三角形'],
    test: function (t) {
      var kind = null;
      if (/等边三角形|正三角形/.test(t)) kind = 'equilateral';
      else if (/等腰直角三角形/.test(t)) kind = 'iso-right';
      else if (/直角三角形/.test(t)) kind = 'right';
      else if (/等腰三角形/.test(t)) kind = 'isosceles';
      if (!kind) return null;
      if (/棱锥|棱柱|棱台/.test(t)) return null;                    // 立体题底面描述交给立体模式
      var p = { kind: kind, labels: ['A', 'B', 'C'] };
      var lm = t.match(/△\s*([A-Z]{3})/) || t.match(/三角形\s*([A-Z]{3})/);
      if (lm) p.labels = lm[1].split('');
      var sm = t.match(/边长\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/);
      if (sm) p.side = num(sm[1]);
      p.sides = [];
      var re = /([A-Z]{2})\s*=\s*(√?\d+(?:\.\d+)?)/g, x;
      while ((x = re.exec(t))) p.sides.push({ e: x[1], v: x[2] });
      var hm = t.match(/高\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/);
      if (hm) p.h = num(hm[1]);
      var rm = t.match(/[∠]([A-Z])\s*=\s*90\s*[°º]/) || t.match(/([A-Z])\s*为直角/);
      if (rm) p.rightAt = rm[1];
      var ym = t.match(/腰\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/);
      if (ym) p.leg = num(ym[1]);
      var dm = t.match(/底边\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/);
      if (dm) p.base = num(dm[1]);
      return p;
    },
    spec: function (p) {
      var L = p.labels, notes = [];
      function sideOf(e1, e2) {
        for (var i = 0; i < p.sides.length; i++) {
          var e = desub(p.sides[i].e);
          if (e === e1 + e2 || e === e2 + e1) return num(p.sides[i].v);
        }
        return null;
      }
      function edgeIdx(e1, e2) {
        for (var i = 0; i < 3; i++) {
          var a = L[i], b = L[(i + 1) % 3];
          if ((a === e1 && b === e2) || (a === e2 && b === e1)) return i;
        }
        return -1;
      }
      var pos = {}, sideLabels = [];
      if (p.kind === 'equilateral') {
        var s = p.side || sideOf(L[0], L[1]) || sideOf(L[1], L[2]) || sideOf(L[0], L[2]) || 3;
        var h = s * Math.sqrt(3) / 2;
        pos[L[0]] = [D(-s / 2), 0]; pos[L[1]] = [D(s / 2), 0]; pos[L[2]] = [0, D(h)];
        sideLabels.push({ i: 0, text: String(D(s)) });
        if (!p.side && !p.sides.length) notes.push('题面未给边长，按边长 3 示意');
      } else if (p.kind === 'right' || p.kind === 'iso-right') {
        var rv = p.rightAt || L[2];                                  // 未指明时默认直角在第三顶点
        var others = L.filter(function (l) { return l !== rv; });
        var hyp = sideOf(others[0], others[1]);
        var l1 = sideOf(rv, others[0]), l2 = sideOf(rv, others[1]);
        if (p.kind === 'iso-right') {
          var lg = l1 || l2 || p.side || (hyp ? D(hyp / Math.SQRT2) : 3);
          l1 = l2 = lg;
        } else {
          if (l1 == null && l2 != null && hyp) l1 = D(Math.sqrt(Math.max(hyp * hyp - l2 * l2, 0.25)));
          if (l2 == null && l1 != null && hyp) l2 = D(Math.sqrt(Math.max(hyp * hyp - l1 * l1, 0.25)));
          if (l1 == null) l1 = hyp ? D(hyp / Math.SQRT2) : 3;
          if (l2 == null) l2 = hyp ? D(hyp / Math.SQRT2) : 4;
        }
        pos[rv] = [0, 0]; pos[others[0]] = [D(l1), 0]; pos[others[1]] = [0, D(l2)];
        if (!p.sides.length && !p.side) notes.push('题面未给直角边长，按 ' + D(l1) + '、' + D(l2) + ' 示意');
      } else {                                                       // isosceles
        var b = p.base || sideOf(L[0], L[1]) || 3;
        var lg2 = p.leg || sideOf(L[0], L[2]) || sideOf(L[1], L[2]);
        var hh = p.h || (lg2 ? D(Math.sqrt(Math.max(lg2 * lg2 - b * b / 4, 0.25))) : b);
        pos[L[0]] = [D(-b / 2), 0]; pos[L[1]] = [D(b / 2), 0]; pos[L[2]] = [0, D(hh)];
        sideLabels.push({ i: 0, text: String(D(b)) });
        if (lg2) {
          var ei = edgeIdx(L[0], L[2]);
          if (ei >= 0) sideLabels.push({ i: ei, text: String(D(lg2)) });
        }
        if (!p.base && !p.leg && !p.h && !p.sides.length) notes.push('题面未给尺寸，按底边 3 的等腰三角形示意');
      }
      var pts = L.map(function (l) { return pos[l]; });
      p.sides.forEach(function (sv) {
        var e = desub(sv.e), idx = edgeIdx(e.slice(0, 1), e.slice(1));
        if (idx >= 0 && !sideLabels.some(function (sl) { return sl.i === idx; }))
          sideLabels.push({ i: idx, text: sv.v });
      });
      var items = [{ kind: 'polygon', pts: pts, labels: L, sideLabels: sideLabels }];
      if (p.kind === 'right' || p.kind === 'iso-right') {
        var rv2 = p.rightAt || L[2];
        var o2 = L.filter(function (l) { return l !== rv2; });
        items.push({ kind: 'angle', v: pos[rv2], a: pos[o2[0]], b: pos[o2[1]], text: '90°' });
      }
      return { view: {}, items: items, notes: notes };
    }
  };

  /* 四边形（精确尺寸）：正方形 / 矩形 / 平行四边形 / 梯形 */
  var p2QuadExact = {
    id: 'p2-quad-exact', name: '四边形（精确尺寸）', dim: '2d',
    kw: ['正方形', '矩形', '长方形', '平行四边形', '梯形'],
    test: function (t) {
      if (/正方体|长方体|棱锥|棱柱|球/.test(t)) return null;         // 立体题排除
      var m = t.match(/平行四边形|正方形|矩形|长方形|梯形/);
      if (!m) return null;
      var p = { type: m[0], labels: ['A', 'B', 'C', 'D'] };
      var lm = t.match(/(?:平行四边形|正方形|矩形|长方形|梯形)\s*([A-Z]{4})/);
      if (lm) p.labels = lm[1].split('');
      p.sides = [];
      var re = /([A-Z]{2})\s*=\s*(√?\d+(?:\.\d+)?)/g, x;
      while ((x = re.exec(t))) p.sides.push({ e: x[1], v: x[2] });
      var sm = t.match(/边长\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (sm) p.side = num(sm[1]);
      var am = t.match(/[∠]?([A-Z])\s*=\s*(\d+)\s*[°º]/); if (am) p.angle = { v: am[1], deg: +am[2] };
      var hm = t.match(/高\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (hm) p.h = num(hm[1]);
      var up = t.match(/上底\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (up) p.top = num(up[1]);
      var dn = t.match(/下底\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (dn) p.bottom = num(dn[1]);
      if (/AD\s*∥\s*BC|BC\s*∥\s*AD/.test(t)) p.adbc = true;          // 梯形的另一标注习惯
      if (!p.sides.length && p.side == null && p.h == null && p.top == null && p.bottom == null) return null; // 无尺寸 → 通用四边形模式
      return p;
    },
    spec: function (p) {
      var L = p.labels, notes = [];
      function sideOf(e1, e2) {
        for (var i = 0; i < p.sides.length; i++) {
          var e = desub(p.sides[i].e);
          if (e === e1 + e2 || e === e2 + e1) return num(p.sides[i].v);
        }
        return null;
      }
      var pts;
      if (p.type === '正方形') {
        var s = p.side || sideOf(L[0], L[1]) || 3;
        pts = [[0, 0], [D(s), 0], [D(s), D(s)], [0, D(s)]];
      } else if (p.type === '矩形' || p.type === '长方形') {
        var a = sideOf(L[0], L[1]) || p.side || 4;
        var b = sideOf(L[1], L[2]) || 2.5;
        pts = [[0, 0], [D(a), 0], [D(a), D(b)], [0, D(b)]];
      } else if (p.type === '梯形') {
        var bottom, top;
        if (p.adbc) {                                                // AD∥BC：AD 上底、BC 下底
          bottom = p.bottom || sideOf(L[1], L[2]) || 4;
          top = p.top || sideOf(L[0], L[3]) || 2;
        } else {                                                     // 默认 AB∥CD：AB 下底、CD 上底
          bottom = p.bottom || sideOf(L[0], L[1]) || 4;
          top = p.top || sideOf(L[2], L[3]) || 2;
        }
        var h = p.h || 2.5, inset = (bottom - top) / 2;
        if (p.adbc) pts = [[D(inset), D(h)], [0, 0], [D(bottom), 0], [D(bottom - inset), D(h)]];
        else pts = [[0, 0], [D(bottom), 0], [D(bottom - inset), D(h)], [D(inset), D(h)]];
      } else {                                                       // 平行四边形
        var a2 = sideOf(L[0], L[1]) || p.side || 4;
        var b2 = sideOf(L[0], L[3]) || sideOf(L[1], L[2]) || 2.5;
        var th = (p.angle && p.angle.v === L[0] ? p.angle.deg : 60) * Math.PI / 180;
        var dx = b2 * Math.cos(th), dy = b2 * Math.sin(th);
        pts = [[0, 0], [D(a2), 0], [D(a2 + dx), D(dy)], [D(dx), D(dy)]];
        if (!p.angle) notes.push('题面未给内角，按 ∠' + L[0] + '=60° 示意');
      }
      var sideLabels = [];
      p.sides.forEach(function (sv) {
        var e = desub(sv.e);
        for (var i = 0; i < 4; i++) {
          var x1 = L[i], x2 = L[(i + 1) % 4];
          if ((x1 === e.slice(0, 1) && x2 === e.slice(1)) || (x2 === e.slice(0, 1) && x1 === e.slice(1))) {
            if (!sideLabels.some(function (sl) { return sl.i === i; })) sideLabels.push({ i: i, text: sv.v });
          }
        }
      });
      if (p.type === '正方形' && p.side && !sideLabels.length) sideLabels.push({ i: 0, text: String(D(p.side)) });
      var items = [{ kind: 'polygon', pts: pts, labels: L, sideLabels: sideLabels }];
      if (p.type === '平行四边形' && p.angle) {
        var vi = L.indexOf(p.angle.v);
        items.push({ kind: 'angle', v: pts[vi], a: pts[(vi + 1) % 4], b: pts[(vi + 3) % 4], text: p.angle.deg + '°' });
      }
      return { view: {}, items: items, notes: notes };
    }
  };

  /* 正多边形（正三~十边形） */
  var p2RegularPolygon = {
    id: 'p2-regular-polygon', name: '正多边形', dim: '2d',
    kw: ['边形'],
    test: function (t) {
      var m = t.match(/正([三四五六七八九十])边形/);
      if (!m) return null;
      if (/棱锥|棱柱|棱台/.test(t)) return null;
      var p = { n: { 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }[m[1]] };
      var rm = t.match(/(?:外接圆)?半径\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (rm) p.R = num(rm[1]);
      var sm = t.match(/边长\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (sm) p.side = num(sm[1]);
      var lm = t.match(/边形\s*([A-Z]{3,10})/);
      if (lm && lm[1].length >= p.n) p.labels = lm[1].slice(0, p.n).split('');
      return p;
    },
    spec: function (p) {
      var R = p.R || (p.side ? p.side / (2 * Math.sin(Math.PI / p.n)) : 2.5);
      var pts = [];
      for (var i = 0; i < p.n; i++) {
        var a = Math.PI / 2 + i * 2 * Math.PI / p.n;
        pts.push([D(R * Math.cos(a)), D(R * Math.sin(a))]);
      }
      var labels = p.labels || [];
      if (!labels.length) for (var j = 0; j < p.n; j++) labels.push(String.fromCharCode(65 + j));
      var notes = [];
      if (p.side) notes.push('由边长 ' + p.side + ' 反解外接圆半径 R≈' + D(R));
      if (!p.side && !p.R) notes.push('题面未给尺寸，按外接圆半径 2.5 示意');
      return { view: {}, notes: notes, items: [{ kind: 'polygon', pts: pts, labels: labels }] };
    }
  };

  /* ==========================================================================
   * 立体几何模式
   * ==========================================================================*/

  /* 正方体 / 长方体 */
  var p3Cube = {
    id: 'p3-cube', name: '正方体 / 长方体', dim: '3d',
    kw: ['正方体', '立方体', '长方体'],
    test: function (t) {
      if (!/正方体|立方体|长方体/.test(t)) return null;
      var p = { size: 2, marks: [], segments: [] };
      var sm = t.match(/棱长\s*(?:为|=|＝)\s*(\d+(?:\.\d+)?)/);
      if (sm) p.size = +sm[1];
      // 长方体：长×宽×高（v1.1.0 移植自 geometry_drawer.py）
      if (/长方体/.test(t) && !/正方体|立方体/.test(t)) {
        var ea = t.match(/AB\s*=\s*(√?\d+(?:\.\d+)?)/);
        var eb = t.match(/(?:AD|BC)\s*=\s*(√?\d+(?:\.\d+)?)/);
        var ec = t.match(/AA\s*[₁1]\s*=\s*(√?\d+(?:\.\d+)?)/);
        var cl = t.match(/长\s*(?:为|=)\s*(\d+(?:\.\d+)?)/);
        var cw = t.match(/宽\s*(?:为|=)\s*(\d+(?:\.\d+)?)/);
        var ch = t.match(/高\s*(?:为|=)\s*(\d+(?:\.\d+)?)/);
        if (ea || eb || ec || cl || cw || ch) {
          p.dims = [
            ea ? num(ea[1]) : (cl ? +cl[1] : 4),
            eb ? num(eb[1]) : (cw ? +cw[1] : 2.5),
            ec ? num(ec[1]) : (ch ? +ch[1] : 2)
          ];
        }
      }
      // "E，F分别为棱AB，BC的中点" / "E为棱AB的中点"
      var dm = t.match(/([A-Z])\s*[,、，]\s*([A-Z])\s*分别为?\s*(?:棱)?\s*([A-D][A-D])(?:₁|1)?\s*[,、，]\s*([A-D][A-D])(?:₁|1)?\s*的中点/);
      if (dm) {
        p.marks.push({ label: dm[1], edge: [desub(dm[3].slice(0, 1)), desub(dm[3].slice(1))] });
        p.marks.push({ label: dm[2], edge: [desub(dm[4].slice(0, 1)), desub(dm[4].slice(1))] });
        p.segments.push([dm[1], dm[2]]);
      } else {
        var re = /([A-Z])\s*为\s*(?:棱)?\s*([A-D][A-D])((?:₁|1)?[A-D]?)\s*的中点/g, x;
        while ((x = re.exec(t))) {
          var e2 = desub(x[2] + (x[3] || '')).slice(0, 2);
          p.marks.push({ label: x[1], edge: [e2.slice(0, 1), e2.slice(1)] });
        }
      }
      return p;
    },
    spec: function (p) {
      var notes = [];
      if (p.dims) notes.push('长方体尺寸：长 ' + p.dims[0] + ' × 宽 ' + p.dims[1] + ' × 高 ' + p.dims[2]);
      if (p.marks.length) notes.push('已识别 ' + p.marks.length + ' 个棱中点并在图中标出');
      return { notes: notes, items: [{
        kind: 'box', size: p.size, dims: p.dims,
        labels: { bottom: ['A', 'B', 'C', 'D'], top: ['A₁', 'B₁', 'C₁', 'D₁'] },
        marks: p.marks, segments: p.segments
      }] };
    }
  };

  /* 三棱锥 P-ABC（PA⊥底面，v1.1.0 移植自 geometry_drawer.py） */
  var p3Tetra = {
    id: 'p3-tetra', name: '三棱锥（PA⊥底面）', dim: '3d',
    kw: ['三棱锥', 'PA', '垂直'],
    test: function (t) {
      if (!/三棱锥/.test(t)) return null;
      if (!/PA\s*[⊥垂直]|垂直\s*于?\s*(?:平面|底面)/.test(t)) return null;
      var p = {};
      var am = t.match(/边长\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/) || t.match(/AB\s*=\s*(√?\d+(?:\.\d+)?)/);
      if (am) p.a = num(am[1]);
      var hm = t.match(/PA\s*=\s*(√?\d+(?:\.\d+)?)/);
      if (hm) p.h = num(hm[1]);
      return p;
    },
    spec: function (p) {
      var a = p.a || 2, h = p.h || a;
      var s3 = Math.sqrt(3);
      var notes = [];
      if (!p.a) notes.push('题面未给底面边长，按 a=2 示意');
      if (!p.h) notes.push('题面未给 PA，按 PA=底面边长 示意');
      return { notes: notes, items: [{
        kind: 'poly3',
        verts: {
          A: [0, 0, 0], B: [a, 0, 0],
          C: [D(a / 2), D(a * s3 / 2), 0],
          P: [0, 0, h]
        },
        faces: [['A', 'B', 'C'], ['A', 'B', 'P'], ['B', 'C', 'P'], ['C', 'A', 'P']],
        dashed: [['A', 'B'], ['B', 'C'], ['C', 'A']]          // 底面棱按虚线处理
      }] };
    }
  };

  /* 球（半径 / 直径 / 体积 / 表面积，v1.1.0 移植自 geometry_drawer.py） */
  var p3Sphere = {
    id: 'p3-sphere', name: '球', dim: '3d',
    kw: ['球', '半径'],
    test: function (t) {
      if (!/球/.test(t)) return null;
      if (/棱锥|棱柱|棱台|正方体|长方体|圆柱|圆锥|截面|外接|内接|球面/.test(t)) return null; // 组合情形交给其他模式
      var p = {};
      var rm = t.match(/半径\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (rm) p.r = num(rm[1]);
      var dm = t.match(/直径\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (dm) p.r = num(dm[1]) / 2;
      var vm = t.match(/体积\s*(?:为|=)\s*(\d+(?:\.\d+)?)\s*π/);
      if (vm) { p.r = D(Math.cbrt(3 * parseFloat(vm[1]) / 4)); p.from = '体积'; }
      var fm = t.match(/表面积\s*(?:为|=)\s*(\d+(?:\.\d+)?)\s*π/);
      if (fm) { p.r = D(Math.sqrt(parseFloat(fm[1]) / 4)); p.from = '表面积'; }
      return p;
    },
    spec: function (p) {
      var r = p.r || 2.5;
      var notes = [];
      if (p.from) notes.push('由' + p.from + '反解球半径 r=' + r);
      if (!p.r) notes.push('题面未给尺寸，按半径 2.5 示意');
      return { notes: notes, items: [
        { kind: 'sphere', c: [0, 0, 0], r: r, wire: true },
        { kind: 'point3', p: [0, 0, 0], label: 'O' },
        { kind: 'seg3', a: [0, 0, 0], b: [r, 0, 0], label: 'r=' + r }
      ] };
    }
  };

  /* 棱锥（正四棱锥等，可带外接球） */
  var p3Pyramid = {
    id: 'p3-pyramid', name: '棱锥', dim: '3d',
    kw: ['棱锥'],
    test: function (t) {
      if (!/棱锥/.test(t)) return null;
      var p = { n: 4, circumSphere: false };
      var nm = t.match(/正?([三四五六])棱锥/);
      if (nm) p.n = { 三: 3, 四: 4, 五: 5, 六: 6 }[nm[1]];
      if (/球面|外接球|同一球/.test(t)) p.circumSphere = true;
      return p;
    },
    spec: function (p) {
      // 外接球情形：球心在高线上、R=3、球心距底面 2.66 → 底面外接圆半径 √(9−2.66²)≈1.39
      var side = 4, h = p.n === 4 ? 5.66 : 4;
      if (p.circumSphere && p.n === 4) {
        var Rb = Math.sqrt(9 - 2.66 * 2.66);
        side = D(Rb * 2 * Math.sin(Math.PI / 4));
      }
      var items = [{
        kind: 'pyramid', n: p.n, side: side, h: h,
        apex: 'P', baseLabels: ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, p.n)
      }];
      if (p.circumSphere) {
        items.push({ kind: 'sphere', c: [0, 0, 2.66], r: 3, wire: true });
      }
      var notes = [];
      if (p.circumSphere) notes.push('题面涉及顶点共球面，已用线框球画出外接球（示意）');
      return { items: items, notes: notes };
    }
  };

  /* 球与截面（球面上三点 / 外接圆） */
  var p3SphereSection = {
    id: 'p3-sphere-section', name: '球与截面圆', dim: '3d',
    kw: ['球', '截面', '外接圆'],
    test: function (t) {
      if (!/球/.test(t)) return null;
      if (/棱锥|棱柱/.test(t)) return null;                        // 棱锥/棱柱+外接球由各自模式负责
      if (!/截面|外接圆|球面上|⊙\s*O/.test(t)) return null;
      var p = { triangle: /△|三个点|三点/.test(t) };
      var am = t.match(/⊙\s*O[₁1]?\s*的面积为\s*(\d+(?:\.\d+)?)\s*π/);
      if (am) { p.r1 = Math.sqrt(+am[1]); p.fromArea = true; }
      return p;
    },
    spec: function (p) {
      var r1 = p.r1 || 2;
      // 若题面为 2020 全国Ⅰ卷型：AB=BC=AC=OO₁，等边三角形边长=√3·r1
      var d = r1 * Math.sqrt(3);                                     // OO₁
      var R = Math.sqrt(r1 * r1 + d * d);                            // 球半径
      var items = [
        { kind: 'sphere', c: [0, 0, 0], r: D(R), wire: true },
        { kind: 'point3', p: [0, 0, 0], label: 'O' },
        { kind: 'disc', c: [0, 0, D(-d)], r: r1, label: 'O₁',
          inscribed: p.triangle ? ['A', 'B', 'C'] : null },
        { kind: 'seg3', a: [0, 0, 0], b: [0, 0, D(-d)], dash: true, label: 'OO₁' }
      ];
      var notes = [];
      if (p.fromArea) notes.push('由 ⊙O₁ 面积反解截面半径 r₁=' + D(r1) + '，并按 AB=BC=AC=OO₁ 作出等边三角形截面（比例示意）');
      return { items: items, notes: notes };
    }
  };

  /* 圆锥（v1.1.0 支持底面半径/高/母线参数） */
  var p3Cone = {
    id: 'p3-cone', name: '圆锥', dim: '3d',
    kw: ['圆锥'],
    test: function (t) {
      if (!/圆锥/.test(t)) return null;
      var p = {};
      var rm = t.match(/(?:底面)?半径\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (rm) p.r = num(rm[1]);
      var hm = t.match(/高\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (hm) p.h = num(hm[1]);
      var lm = t.match(/母线\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (lm) p.l = num(lm[1]);
      return p;
    },
    spec: function (p) {
      var r = p.r || 2, h = p.h, notes = [];
      if (!h && p.l && p.r) {
        h = D(Math.sqrt(Math.max(p.l * p.l - r * r, 0.25)));
        notes.push('由母线 l=' + p.l + ' 与底面半径 r=' + r + ' 反解高 h≈' + h);
      }
      if (!h) h = 3.5;
      return { notes: notes, items: [
        { kind: 'cone', r: r, h: h, apex: 'S' },
        { kind: 'seg3', a: [0, 0, 0], b: [0, 0, h], dash: true, label: 'h=' + h },
        { kind: 'seg3', a: [0, 0, 0], b: [r, 0, 0], label: 'r=' + r }
      ] };
    }
  };

  /* 圆柱（v1.1.0 支持底面半径/高参数） */
  var p3Cylinder = {
    id: 'p3-cylinder', name: '圆柱', dim: '3d',
    kw: ['圆柱'],
    test: function (t) {
      if (!/圆柱/.test(t)) return null;
      var p = {};
      var rm = t.match(/(?:底面)?半径\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (rm) p.r = num(rm[1]);
      var hm = t.match(/高\s*(?:为|=)\s*(√?\d+(?:\.\d+)?)/); if (hm) p.h = num(hm[1]);
      return p;
    },
    spec: function (p) {
      var r = p.r || 1.6, h = p.h || 3.2;
      return { notes: [], items: [
        { kind: 'cylinder', r: r, h: h },
        { kind: 'seg3', a: [r, 0, 0], b: [r, 0, h], label: 'h=' + h },
        { kind: 'seg3', a: [0, 0, 0], b: [r, 0, 0], label: 'r=' + r }
      ] };
    }
  };

  /* 棱柱 */
  var p3Prism = {
    id: 'p3-prism', name: '棱柱', dim: '3d',
    kw: ['棱柱'],
    test: function (t) {
      if (!/棱柱/.test(t)) return null;
      var p = { n: 4 };
      var nm = t.match(/直?([三四五六])棱柱/);
      if (nm) p.n = { 三: 3, 四: 4, 五: 5, 六: 6 }[nm[1]];
      return p;
    },
    spec: function (p) {
      return { notes: [], items: [{ kind: 'prism', n: p.n, side: 3, h: 3.5 }] };
    }
  };

  /* ---------- 注册表：越具体的模式越靠前 ---------- */
  LIB.patterns = [
    p3SphereSection,   // 球+截面（先于棱锥，避免"球面上"被棱锥抢走）
    p3Tetra,           // 三棱锥 PA⊥底面（先于一般棱锥）
    p3Pyramid,
    p3Cube,            // 正方体 / 长方体（含长宽高参数）
    p3Sphere,          // 单独的球（组合情形已在 test 中排除）
    p3Cone, p3Cylinder, p3Prism,
    p2EllipseLine,     // 椭圆与直线（圆类模式已排除圆锥曲线，不会冲突）
    p2CircleChord,     // 圆+直线（先于单独的圆）
    p2TriangleSpecial, // 等边/等腰/直角三角形（先于一般三角形）
    p2Triangle,
    p2Circle,
    p2QuadExact,       // 有尺寸的四边形（先于一般四边形）
    p2RegularPolygon,
    p2Quad
  ];

  window.GEO_LIB = LIB;
})();
