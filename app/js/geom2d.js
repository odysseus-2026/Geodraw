/* ============================================================================
 * geom2d.js · 平面几何 SVG 渲染器
 * 输入：patterns.js 中模式产生的 2D 绘图指令（spec）；输出：SVG 字符串。
 * 渲染器是通用的：新增模式时不需要修改本文件。
 * ==========================================================================*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#0A0A0A';        // 主墨色
  var ACCENT = '#F63A22';     // 强调橙
  var MUTED = '#9a9a9a';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 收集所有坐标点用于自动取景 */
  function collectPts(spec) {
    var pts = [];
    (spec.items || []).forEach(function (it) {
      if (it.pts) pts = pts.concat(it.pts);
      if (it.c) {
        var ex = it.rx != null ? it.rx : it.r, ey = it.ry != null ? it.ry : it.r;
        pts.push([it.c[0] - ex, it.c[1] - ey], [it.c[0] + ex, it.c[1] + ey]);
      }
      if (it.a) pts.push(it.a);
      if (it.b) pts.push(it.b);
      if (it.p) pts.push(it.p);
      if (it.v) pts.push(it.v);
    });
    return pts;
  }

  /* 把过 a、b 的直线裁剪到取景矩形内（数学坐标），返回两端点 */
  function clipLine(a, b, vx, vy, vw, vh) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var t0 = -1e9, t1 = 1e9;
    if (Math.abs(dx) < 1e-12) { if (a[0] < vx || a[0] > vx + vw) return null; }
    else {
      var tx1 = (vx - a[0]) / dx, tx2 = (vx + vw - a[0]) / dx;
      t0 = Math.max(t0, Math.min(tx1, tx2)); t1 = Math.min(t1, Math.max(tx1, tx2));
    }
    if (Math.abs(dy) < 1e-12) { if (a[1] < vy || a[1] > vy + vh) return null; }
    else {
      var ty1 = (vy - a[1]) / dy, ty2 = (vy + vh - a[1]) / dy;
      t0 = Math.max(t0, Math.min(ty1, ty2)); t1 = Math.min(t1, Math.max(ty1, ty2));
    }
    if (t0 > t1) return null;
    return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
  }

  /* 点标签的放置方向：取该点相对图形重心的外侧 */
  function labelOffset(p, cx, cy) {
    var dx = p[0] - cx, dy = p[1] - cy;
    var len = Math.hypot(dx, dy) || 1;
    return [dx / len * 0.32, dy / len * 0.32];
  }

  function render(spec) {
    var pts = collectPts(spec);
    if (!pts.length) pts = [[0, 0], [4, 4]];
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var spanX = (maxX - minX) || 4, spanY = (maxY - minY) || 4;
    var pad = Math.max(spanX, spanY) * 0.28 + 0.6;
    var vx = minX - pad, vy = minY - pad, vw = spanX + pad * 2, vh = spanY + pad * 2;

    var s = [];
    s.push('<svg xmlns="' + NS + '" viewBox="' + [vx, -vy - vh, vw, vh].map(function (n) { return +n.toFixed(3); }).join(' ') +
      '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">');

    // 数学坐标系（y 向上）→ SVG（y 向下）：用 group 翻转
    s.push('<g transform="scale(1,-1)">');

    var unit = Math.max(spanX, spanY) / 10;          // 刻度/字高的相对单位
    var sw = Math.max(spanX, spanY) * 0.016;         // 线宽
    var labels = [];   // 文本在翻转组外绘制，避免镜像

    /* 坐标轴 */
    if (spec.view && spec.view.axes) {
      s.push('<line x1="' + vx + '" y1="0" x2="' + (vx + vw) + '" y2="0" stroke="' + MUTED + '" stroke-width="' + sw * 0.6 + '"/>');
      s.push('<line x1="0" y1="' + (-vy - vh) + '" x2="0" y2="' + -vy + '" stroke="' + MUTED + '" stroke-width="' + sw * 0.6 + '"/>');
      // 刻度
      var lo = Math.floor(vx), hi = Math.ceil(vx + vw);
      for (var gx = lo; gx <= hi; gx++) {
        if (gx === 0) continue;
        s.push('<line x1="' + gx + '" y1="' + (-unit * 0.08) + '" x2="' + gx + '" y2="' + (unit * 0.08) + '" stroke="' + MUTED + '" stroke-width="' + sw * 0.5 + '"/>');
      }
      var loy = Math.floor(-vy - vh), hiy = Math.ceil(-vy);
      for (var gy = loy; gy <= hiy; gy++) {
        if (gy === 0) continue;
        s.push('<line x1="' + (-unit * 0.08) + '" y1="' + gy + '" x2="' + (unit * 0.08) + '" y2="' + gy + '" stroke="' + MUTED + '" stroke-width="' + sw * 0.5 + '"/>');
      }
      labels.push(textEl(vx + vw - unit * 0.4, -unit * 0.34, 'x', unit * 0.52, MUTED, true));
      labels.push(textEl(unit * 0.2, -vy - unit * 0.5, 'y', unit * 0.52, MUTED, true));
      labels.push(textEl(-unit * 0.24, -unit * 0.28, 'O', unit * 0.5, MUTED, true));
    }


    (spec.items || []).forEach(function (it) {
      if (it.kind === 'polygon') {
        var d = it.pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ') + ' Z';
        s.push('<path d="' + d + '" fill="rgba(246,58,34,0.06)" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round"/>');
        (it.labels || []).forEach(function (lb, i) {
          var p = it.pts[i], off = labelOffset(p, cx, cy);
          labels.push(textEl(p[0] + off[0], p[1] + off[1], lb, unit * 0.62, INK, true));
        });
        (it.sideLabels || []).forEach(function (sl) {
          var p1 = it.pts[sl.i], p2 = it.pts[(sl.i + 1) % it.pts.length];
          var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
          var off = labelOffset([mx, my], cx, cy);
          labels.push(textEl(mx + off[0], my + off[1], sl.text, unit * 0.5, ACCENT, false));
        });
      } else if (it.kind === 'circle') {
        s.push('<circle cx="' + it.c[0] + '" cy="' + it.c[1] + '" r="' + it.r + '" fill="none" stroke="' + INK + '" stroke-width="' + sw + '"/>');
        if (it.label) labels.push(textEl(it.c[0] + it.r * 0.76, it.c[1] + it.r * 0.76, it.label, unit * 0.62, INK, true));
      } else if (it.kind === 'ellipse') {
        s.push('<ellipse cx="' + it.c[0] + '" cy="' + it.c[1] + '" rx="' + it.rx + '" ry="' + it.ry +
          '" fill="rgba(246,58,34,0.04)" stroke="' + INK + '" stroke-width="' + sw + '"/>');
        if (it.label) labels.push(textEl(it.c[0] + it.rx * 0.72, it.c[1] - it.ry * 0.8, it.label, unit * 0.62, INK, true));
      } else if (it.kind === 'line') {
        var cl = clipLine(it.a, it.b, vx, vy, vw, vh);
        if (cl) {
          s.push('<line x1="' + cl[0][0] + '" y1="' + cl[0][1] + '" x2="' + cl[1][0] + '" y2="' + cl[1][1] +
            '" stroke="' + ACCENT + '" stroke-width="' + sw * 0.9 + '"/>');
          if (it.label) labels.push(textEl(cl[1][0], cl[1][1] + unit * 0.3, it.label, unit * 0.56, ACCENT, true));
        }
      } else if (it.kind === 'seg') {
        s.push('<line x1="' + it.a[0] + '" y1="' + it.a[1] + '" x2="' + it.b[0] + '" y2="' + it.b[1] +
          '" stroke="' + (it.dash ? MUTED : INK) + '" stroke-width="' + sw * (it.dash ? 0.7 : 1) + '"' + (it.dash ? ' stroke-dasharray="' + unit * 0.16 + ' ' + unit * 0.12 + '"' : '') + '/>');
        if (it.labels) {
          labels.push(textEl(it.a[0] - unit * 0.3, it.a[1] + unit * 0.28, it.labels[0], unit * 0.62, INK, true));
          labels.push(textEl(it.b[0] + unit * 0.12, it.b[1] + unit * 0.28, it.labels[1], unit * 0.62, INK, true));
        }
        if (it.label) {
          labels.push(textEl((it.a[0] + it.b[0]) / 2 + unit * 0.1, (it.a[1] + it.b[1]) / 2 + unit * 0.22, it.label, unit * 0.46, ACCENT, false));
        }
      } else if (it.kind === 'point') {
        s.push('<circle cx="' + it.p[0] + '" cy="' + it.p[1] + '" r="' + sw * 1.6 + '" fill="' + (it.accent ? ACCENT : INK) + '"/>');
        if (it.label) {
          var poff = labelOffset(it.p, cx, cy);
          labels.push(textEl(it.p[0] + poff[0], it.p[1] + poff[1], it.label, unit * 0.58, it.accent ? ACCENT : INK, true));
        }
      } else if (it.kind === 'angle') {
        var a1 = Math.atan2(it.a[1] - it.v[1], it.a[0] - it.v[0]);
        var a2 = Math.atan2(it.b[1] - it.v[1], it.b[0] - it.v[0]);
        var rr = unit * 0.9;
        var x1 = it.v[0] + rr * Math.cos(a1), y1 = it.v[1] + rr * Math.sin(a1);
        var x2 = it.v[0] + rr * Math.cos(a2), y2 = it.v[1] + rr * Math.sin(a2);
        var large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
        s.push('<path d="M' + x1.toFixed(3) + ' ' + y1.toFixed(3) + ' A' + rr + ' ' + rr + ' 0 ' + large + ' 1 ' + x2.toFixed(3) + ' ' + y2.toFixed(3) +
          '" fill="none" stroke="' + ACCENT + '" stroke-width="' + sw * 0.9 + '"/>');
        var mid = (a1 + a2) / 2;
        labels.push(textEl(it.v[0] + rr * 1.7 * Math.cos(mid), it.v[1] + rr * 1.7 * Math.sin(mid), it.text, unit * 0.48, ACCENT, false));
      }
    });

    s.push('</g>');

    /* 文本层（不翻转）：数学坐标 y 取反即得 SVG 坐标 */
    labels.forEach(function (l) {
      s.push('<text x="' + l.x.toFixed(3) + '" y="' + (-l.y).toFixed(3) + '" font-size="' + l.size.toFixed(3) +
        '" fill="' + l.fill + '" text-anchor="middle" dominant-baseline="middle"' +
        (l.serif ? ' font-family="Georgia,Times New Roman,serif" font-style="italic"' : ' font-family="Menlo,Consolas,monospace"') +
        '>' + esc(l.text) + '</text>');
    });

    s.push('</svg>');
    return s.join('');

    function textEl(x, y, text, size, fill, serif) {
      return { x: x, y: y, text: text, size: size, fill: fill, serif: serif };
    }
  }

  window.GEOM2D = { render: render };
})();
