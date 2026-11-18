/* ============================================================================
 * geom3d.js · 立体几何 Three.js 渲染器
 * 输入：patterns.js 中模式产生的 3D 绘图指令（spec，z 轴为竖直方向）。
 * 渲染器是通用的：新增模式时不需要修改本文件。
 * 交互：拖拽旋转、滚轮缩放。
 * ==========================================================================*/
(function () {
  'use strict';

  var EDGE = 0xf3f3f3;        // 棱线
  var FACE = 0x8a8a8a;        // 面（半透明）
  var ACCENT = 0xF63A22;      // 强调橙
  var MUTED = 0x8f8f8f;

  /* spec 坐标 (x,y,z，z 竖直) → three.js (x, z, y) */
  function V(p) { return new THREE.Vector3(p[0], p[2], p[1]); }

  function Stage3D(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171717);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    var hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 0.95);
    var dir = new THREE.DirectionalLight(0xffffff, 0.55);
    dir.position.set(4, 8, 5);
    this.scene.add(hemi, dir);

    this.grid = new THREE.GridHelper(24, 24, 0x333333, 0x242424);
    this.scene.add(this.grid);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 轨道状态
    this.center = new THREE.Vector3();
    this.radius = 10;
    this.theta = Math.PI / 4.5;
    this.phi = Math.PI / 3.4;
    this._bindOrbit();
    this._bindResize();

    var self = this;
    (function loop() {
      requestAnimationFrame(loop);
      self._updateCamera();
      self.renderer.render(self.scene, self.camera);
    })();
  }

  Stage3D.prototype._bindResize = function () {
    var self = this;
    function fit() {
      var w = self.container.clientWidth || 600, h = self.container.clientHeight || 400;
      self.camera.aspect = w / h;
      self.camera.updateProjectionMatrix();
      self.renderer.setSize(w, h);
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(this.container);
    else window.addEventListener('resize', fit);
  };

  Stage3D.prototype._bindOrbit = function () {
    var el = this.renderer.domElement, self = this;
    var dragging = false, px = 0, py = 0;
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', function (e) {
      dragging = true; px = e.clientX; py = e.clientY; el.style.cursor = 'grabbing';
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      self.theta -= (e.clientX - px) * 0.008;
      self.phi = Math.min(Math.PI - 0.15, Math.max(0.15, self.phi - (e.clientY - py) * 0.008));
      px = e.clientX; py = e.clientY;
    });
    el.addEventListener('pointerup', function () { dragging = false; el.style.cursor = 'grab'; });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.radius = Math.min(self.radius * 3, Math.max(self.radius / 3, self.radius * (1 + e.deltaY * 0.001)));
    }, { passive: false });
  };

  Stage3D.prototype._updateCamera = function () {
    var sp = Math.sin(this.phi), cp = Math.cos(this.phi);
    this.camera.position.set(
      this.center.x + this.radius * sp * Math.cos(this.theta),
      this.center.y + this.radius * cp,
      this.center.z + this.radius * sp * Math.sin(this.theta)
    );
    this.camera.lookAt(this.center);
  };

  /* 文字标签精灵（衬线斜体字母，数学惯例） */
  Stage3D.prototype._label = function (text, pos, accent) {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    var ctx = cv.getContext('2d');
    ctx.font = 'italic 600 64px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = accent ? '#F63A22' : '#f3f3f3';
    ctx.fillText(text, 128, 64);
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.position.copy(pos);
    var s = this.radius / 14;
    sp.scale.set(s * 2, s, 1);
    sp.renderOrder = 99;
    this.group.add(sp);
    return sp;
  };

  Stage3D.prototype._edgeMesh = function (geo, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    if (!opts.noFace) {
      var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        color: opts.faceColor || FACE, transparent: true, opacity: opts.faceOpacity != null ? opts.faceOpacity : 0.22,
        side: THREE.DoubleSide, depthWrite: false
      }));
      g.add(mesh);
    }
    var edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 1),
      new THREE.LineBasicMaterial({ color: opts.edgeColor || EDGE })
    );
    g.add(edges);
    return g;
  };

  /* 清空并重绘 */
  Stage3D.prototype.render = function (spec) {
    var self = this;
    // 清理旧图形
    while (this.group.children.length) {
      var ch = this.group.children.pop();
      ch.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); }
      });
    }
    var vertexMap = {};   // 顶点标签 → 坐标（供中点/连线引用）
    var labelPts = [];    // 待放置的标签

    (spec.items || []).forEach(function (it) {
      if (it.kind === 'box') self._buildBox(it, vertexMap, labelPts);
      else if (it.kind === 'poly3') self._buildPoly3(it, vertexMap, labelPts);
      else if (it.kind === 'pyramid') self._buildPyramid(it, vertexMap, labelPts);
      else if (it.kind === 'sphere') self._buildSphere(it, labelPts);
      else if (it.kind === 'disc') self._buildDisc(it, vertexMap, labelPts);
      else if (it.kind === 'cone') self._buildCone(it, labelPts);
      else if (it.kind === 'cylinder') self._buildCylinder(it);
      else if (it.kind === 'prism') self._buildPrism(it);
      else if (it.kind === 'point3') {
        var m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: EDGE }));
        m.position.copy(V(it.p)); self.group.add(m);
        if (it.label) labelPts.push({ t: it.label, p: V(it.p).clone().add(new THREE.Vector3(0.3, 0.25, 0)) });
      } else if (it.kind === 'seg3') {
        var geo = new THREE.BufferGeometry().setFromPoints([V(it.a), V(it.b)]);
        var mat = it.dash ? new THREE.LineDashedMaterial({ color: MUTED, dashSize: 0.16, gapSize: 0.12 })
                          : new THREE.LineBasicMaterial({ color: EDGE });
        var ln = new THREE.Line(geo, mat);
        if (it.dash) ln.computeLineDistances();
        self.group.add(ln);
        if (it.label) labelPts.push({ t: it.label, p: V(it.a).clone().lerp(V(it.b), 0.5).add(new THREE.Vector3(-0.95, 0.15, 0)), accent: true });
      }
    });

    // 取景（包围盒包含标签位置，避免顶点标签被裁出画面）
    var box = new THREE.Box3().setFromObject(this.group);
    if (!box.isEmpty()) {
      labelPts.forEach(function (lp) { box.expandByPoint(lp.p); });
      var sphere = box.getBoundingSphere(new THREE.Sphere());
      this.center.copy(sphere.center);
      this.radius = Math.max(sphere.radius * 3.2, 4);
      this.grid.position.y = box.min.y - 0.02;
    }
    var self2 = this;
    labelPts.forEach(function (lp) { self2._label(lp.t, lp.p, lp.accent); });
  };

  /* 正方体/长方体（dims=[长a, 宽b, 高c] 时为长方体） */
  Stage3D.prototype._buildBox = function (it, vertexMap, labelPts) {
    var s = it.size || 2;
    var dims = it.dims || [s, s, s];
    var a = dims[0], dep = dims[1], c = dims[2];
    var geo = new THREE.BoxGeometry(a, c, dep);
    var g = this._edgeMesh(geo);
    g.position.y = c / 2;
    this.group.add(g);
    var b = it.labels && it.labels.bottom || ['A', 'B', 'C', 'D'];
    var t = it.labels && it.labels.top || ['A₁', 'B₁', 'C₁', 'D₁'];
    var hx = a / 2, hz = dep / 2;
    var bottom = [[-hx, 0, hz], [hx, 0, hz], [hx, 0, -hz], [-hx, 0, -hz]];   // 前左/前右/后右/后左
    var top = bottom.map(function (p) { return [p[0], c, p[2]]; });
    for (var i = 0; i < 4; i++) {
      vertexMap[b[i].replace(/₁/g, '1')] = bottom[i];
      vertexMap[t[i].replace(/₁/g, '1')] = top[i];
      var vb = new THREE.Vector3(bottom[i][0], bottom[i][1], bottom[i][2]);
      var vt = new THREE.Vector3(top[i][0], top[i][1], top[i][2]);
      labelPts.push({ t: b[i], p: vb.clone().add(vb.clone().setY(0).normalize().multiplyScalar(0.5)).add(new THREE.Vector3(0, -0.25, 0)) });
      labelPts.push({ t: t[i], p: vt.clone().add(vt.clone().setY(0).normalize().multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.28, 0)) });
    }
    var self = this;
    (it.marks || []).forEach(function (mk) {
      var p1 = vertexMap[mk.edge[0]], p2 = vertexMap[mk.edge[1]];
      if (!p1 || !p2) return;
      var mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
      vertexMap[mk.label] = mid;
      var dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: ACCENT }));
      dot.position.set(mid[0], mid[1], mid[2]);
      self.group.add(dot);
      labelPts.push({ t: mk.label, p: dot.position.clone().add(new THREE.Vector3(0.35, 0.2, 0.15)), accent: true });
    });
    (it.segments || []).forEach(function (sg) {
      var p1 = vertexMap[sg[0]], p2 = vertexMap[sg[1]];
      if (!p1 || !p2) return;
      var geo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p1[0], p1[1], p1[2]), new THREE.Vector3(p2[0], p2[1], p2[2])]);
      self.group.add(new THREE.Line(geo2, new THREE.LineBasicMaterial({ color: ACCENT })));
    });
  };

  /* 任意多面体（通用图元）：verts 顶点表 + faces 面 + edges 附加棱 + dashed 虚线棱 */
  Stage3D.prototype._buildPoly3 = function (it, vertexMap, labelPts) {
    var verts = it.verts || {};
    var P = {}, self = this;
    Object.keys(verts).forEach(function (k) {
      P[k] = V(verts[k]);
      vertexMap[k] = [P[k].x, P[k].y, P[k].z];
    });
    // 面（扇形三角化）
    var pos = [], idx = [], idOf = {};
    function vid(k) {
      if (idOf[k] == null) { idOf[k] = pos.length / 3; pos.push(P[k].x, P[k].y, P[k].z); }
      return idOf[k];
    }
    (it.faces || []).forEach(function (f) {
      for (var i = 1; i < f.length - 1; i++) {
        if (P[f[0]] && P[f[i]] && P[f[i + 1]]) idx.push(vid(f[0]), vid(f[i]), vid(f[i + 1]));
      }
    });
    if (pos.length) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      this.group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        color: FACE, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false
      })));
    }
    // 棱：面边 + 显式 edges，去重；dashed 集合用虚线
    var dashed = {};
    (it.dashed || []).forEach(function (e) { dashed[e[0] + '|' + e[1]] = dashed[e[1] + '|' + e[0]] = true; });
    var seen = {}, edgeSet = [];
    function pushEdge(a, b) {
      var key = a < b ? a + '|' + b : b + '|' + a;
      if (!seen[key] && P[a] && P[b]) { seen[key] = true; edgeSet.push([a, b]); }
    }
    (it.faces || []).forEach(function (f) {
      for (var i = 0; i < f.length; i++) pushEdge(f[i], f[(i + 1) % f.length]);
    });
    (it.edges || []).forEach(function (e) { pushEdge(e[0], e[1]); });
    edgeSet.forEach(function (e) {
      var g2 = new THREE.BufferGeometry().setFromPoints([P[e[0]], P[e[1]]]);
      var isD = dashed[e[0] + '|' + e[1]];
      var ln = new THREE.Line(g2, isD
        ? new THREE.LineDashedMaterial({ color: MUTED, dashSize: 0.16, gapSize: 0.12 })
        : new THREE.LineBasicMaterial({ color: EDGE }));
      if (isD) ln.computeLineDistances();
      self.group.add(ln);
    });
    // 顶点标签：沿离形心方向外移
    var ks = Object.keys(P), cen = new THREE.Vector3();
    ks.forEach(function (k) { cen.add(P[k]); });
    if (ks.length) cen.multiplyScalar(1 / ks.length);
    ks.forEach(function (k) {
      var off = P[k].clone().sub(cen);
      if (off.length() < 1e-6) off.set(0.3, 0.3, 0); else off.normalize().multiplyScalar(0.45);
      labelPts.push({ t: k, p: P[k].clone().add(off) });
    });
  };

  /* 棱锥（n 边形底） */
  Stage3D.prototype._buildPyramid = function (it, vertexMap, labelPts) {
    var n = it.n || 4, side = it.side || 4, h = it.h || 4;
    var R = side / (2 * Math.sin(Math.PI / n));
    var base = [];
    for (var i = 0; i < n; i++) {
      var a = Math.PI / 2 + i * 2 * Math.PI / n + (n === 4 ? Math.PI / 4 : 0);
      base.push([R * Math.cos(a), 0, -R * Math.sin(a)]);
    }
    var apex = [0, h, 0];
    var geo = new THREE.BufferGeometry();
    var verts = [];
    base.forEach(function (p) { verts.push(p[0], p[1], p[2]); });
    verts.push(apex[0], apex[1], apex[2]);
    var idx = [];
    for (var i2 = 1; i2 < n - 1; i2++) idx.push(0, i2, i2 + 1);      // 底面扇形
    for (var i3 = 0; i3 < n; i3++) idx.push(i3, (i3 + 1) % n, n);    // 侧面
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.group.add(this._edgeMesh(geo, { faceOpacity: 0.16 }));
    var bl = it.baseLabels || [];
    for (var j = 0; j < n; j++) {
      if (bl[j]) {
        vertexMap[bl[j]] = base[j];
        var v = new THREE.Vector3(base[j][0], 0, base[j][2]);
        labelPts.push({ t: bl[j], p: v.clone().add(v.clone().normalize().multiplyScalar(0.45)).add(new THREE.Vector3(0, -0.22, 0)) });
      }
    }
    if (it.apex) {
      vertexMap[it.apex] = apex;
      labelPts.push({ t: it.apex, p: new THREE.Vector3(0.3, h + 0.3, 0) });
    }
  };

  /* 球（线框） */
  Stage3D.prototype._buildSphere = function (it) {
    var geo = new THREE.SphereGeometry(it.r, 40, 26);
    var wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x9a9a9a, wireframe: true, transparent: true, opacity: 0.34
    }));
    wire.position.copy(V(it.c));
    this.group.add(wire);
    var skin = new THREE.Mesh(new THREE.SphereGeometry(it.r, 40, 26), new THREE.MeshLambertMaterial({
      color: FACE, transparent: true, opacity: 0.07, depthWrite: false
    }));
    skin.position.copy(V(it.c));
    this.group.add(skin);
  };

  /* 截面圆盘（可内接多边形） */
  Stage3D.prototype._buildDisc = function (it, vertexMap, labelPts) {
    var c = V(it.c), r = it.r;
    var curve = new THREE.EllipseCurve(0, 0, r, r);
    var pts2 = curve.getPoints(64).map(function (p) { return new THREE.Vector3(p.x, 0, -p.y).add(c); });
    var loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts2), new THREE.LineBasicMaterial({ color: EDGE }));
    this.group.add(loop);
    var disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshLambertMaterial({
      color: FACE, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false
    }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.copy(c);
    this.group.add(disc);
    var dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: EDGE }));
    dot.position.copy(c);
    this.group.add(dot);
    if (it.label) labelPts.push({ t: it.label, p: c.clone().add(new THREE.Vector3(0.3, 0.24, 0)) });
    if (it.inscribed) {
      var vv = [];
      for (var i = 0; i < it.inscribed.length; i++) {
        var a = Math.PI / 2 + i * 2 * Math.PI / it.inscribed.length;
        var p = new THREE.Vector3(c.x + r * Math.cos(a), c.y, c.z - r * Math.sin(a));
        vv.push(p);
        vertexMap[it.inscribed[i]] = [p.x, p.z, p.y];   // 存回 spec 坐标系
        labelPts.push({ t: it.inscribed[i], p: p.clone().add(p.clone().sub(c).setY(0).normalize().multiplyScalar(0.42)) });
      }
      this.group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vv), new THREE.LineBasicMaterial({ color: ACCENT })));
    }
  };

  Stage3D.prototype._buildCone = function (it, labelPts) {
    var geo = new THREE.ConeGeometry(it.r, it.h, 48, 1, true);
    var g = this._edgeMesh(geo, { faceOpacity: 0.2 });
    g.position.y = it.h / 2;
    this.group.add(g);
    var base = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, it.r, it.r).getPoints(48).map(function (p) { return new THREE.Vector3(p.x, 0, -p.y); })),
      new THREE.LineBasicMaterial({ color: EDGE }));
    this.group.add(base);
    if (it.apex) labelPts.push({ t: it.apex, p: new THREE.Vector3(0.3, it.h + 0.3, 0) });
  };

  Stage3D.prototype._buildCylinder = function (it) {
    var geo = new THREE.CylinderGeometry(it.r, it.r, it.h, 48, 1, true);
    var g = this._edgeMesh(geo, { faceOpacity: 0.2 });
    g.position.y = it.h / 2;
    this.group.add(g);
    var self = this;
    [0, it.h].forEach(function (y) {
      self.group.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, it.r, it.r).getPoints(48).map(function (p) { return new THREE.Vector3(p.x, y, -p.y); })),
        new THREE.LineBasicMaterial({ color: EDGE })));
    });
  };

  Stage3D.prototype._buildPrism = function (it) {
    var n = it.n || 3, side = it.side || 3, h = it.h || 3.5;
    var R = side / (2 * Math.sin(Math.PI / n));
    var geo = new THREE.CylinderGeometry(R, R, h, n, 1, false);
    var g = this._edgeMesh(geo, { faceOpacity: 0.16 });
    g.position.y = h / 2;
    g.rotation.y = n === 3 ? Math.PI / 6 : Math.PI / n;
    this.group.add(g);
  };

  window.Stage3D = Stage3D;
})();
