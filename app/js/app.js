/* ============================================================================
 * app.js · 界面装配：输入区 / 识别报告 / 演示测试 / 待升级队列 / 模态框
 * ==========================================================================*/
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var stage3d = null;               // 3D 舞台懒加载

  /* ---------------- 渲染结果 ---------------- */
  function showStage(dim) {
    $('stage2d').style.display = dim === '2d' ? 'block' : 'none';
    $('stage3d').style.display = dim === '3d' ? 'block' : 'none';
    $('segPlane').classList.toggle('on', dim === '2d');
    $('segSolid').classList.toggle('on', dim === '3d');
    $('stageEmpty').style.display = 'none';
    $('hint3d').style.display = dim === '3d' ? 'block' : 'none';
  }

  function renderResult(res) {
    if (!res.ok) {
      showUnmatched();
      renderReport(null, res);
      return;
    }
    showStage(res.dim);
    if (res.dim === '2d') {
      $('stage2d').innerHTML = GEOM2D.render(res.spec);
    } else {
      if (!stage3d) stage3d = new Stage3D($('stage3d'));
      stage3d.render(res.spec);
    }
    $('stageNotes').textContent = res.notes.length ? '注：' + res.notes.join('；') : '';
    renderReport(res, null);
  }

  function showUnmatched() {
    $('stage2d').style.display = 'none';
    $('stage3d').style.display = 'none';
    $('segPlane').classList.remove('on');
    $('segSolid').classList.remove('on');
    $('stageEmpty').style.display = 'flex';
    $('hint3d').style.display = 'none';
    $('stageNotes').textContent = '';
  }

  function renderReport(res, failRes) {
    var el = $('report');
    if (failRes || !res) {
      el.innerHTML =
        '<div class="rep-line rep-bad">未识别 · 该题的几何结构不在当前规则库中</div>' +
        '<div class="rep-kv"><span>处理</span><b>已自动加入下方「待升级队列」，可导出升级包交给 Kimi 更新规则库</b></div>';
      return;
    }
    var kv = [];
    kv.push(['命中模式', res.patternName + ' <i>(' + res.patternId + ')</i>']);
    kv.push(['图形类型', res.dim === '2d' ? '平面几何' : '立体几何']);
    kv.push(['匹配强度', String(res.score)]);
    var ps = {};
    Object.keys(res.params).forEach(function (k) { ps[k] = res.params[k]; });
    kv.push(['提取参数', Object.keys(ps).length ? JSON.stringify(ps) : '（无，按一般情形示意）']);
    if (res.notes.length) kv.push(['绘制说明', res.notes.join('；')]);
    el.innerHTML = '<div class="rep-line rep-ok">识别成功</div>' + kv.map(function (p) {
      return '<div class="rep-kv"><span>' + p[0] + '</span><b>' + p[1] + '</b></div>';
    }).join('');
  }

  /* ---------------- 求解入口 ---------------- */
  function solveCurrent() {
    var text = $('ta').value.trim();
    if (!text) { pulse($('ta')); return null; }
    var res = GEO_ENGINE.solve(text);
    renderResult(res);
    if (!res.ok) addToQueue(text);
    return res;
  }

  function pulse(el) {
    el.classList.add('pulse');
    setTimeout(function () { el.classList.remove('pulse'); }, 600);
  }

  /* ---------------- 待升级队列 ---------------- */
  var QKEY = 'geodraw-upgrade-queue';
  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; }
  }
  function saveQueue(q) { localStorage.setItem(QKEY, JSON.stringify(q)); }

  function addToQueue(text) {
    var q = loadQueue();
    if (q.some(function (it) { return it.text === text; })) return;
    q.push({ text: text, time: new Date().toISOString() });
    saveQueue(q);
    renderQueue();
  }

  function renderQueue() {
    var q = loadQueue();
    $('queueCount').textContent = q.length;
    if (!q.length) {
      $('queueList').innerHTML = '<div class="queue-empty">暂无待升级题目 —— 无法识别的题目会自动记录在这里</div>';
      return;
    }
    $('queueList').innerHTML = q.map(function (it, i) {
      return '<div class="queue-item"><span class="queue-text">' + escapeHtml(it.text) + '</span>' +
        '<button class="queue-del" data-i="' + i + '" title="移除">×</button></div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.queue-del'), function (btn) {
      btn.onclick = function () {
        var q2 = loadQueue(); q2.splice(+btn.dataset.i, 1); saveQueue(q2); renderQueue();
      };
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function exportUpgradePack() {
    var q = loadQueue();
    var pack = {
      type: 'geodraw-upgrade-request',
      libVersion: GEO_LIB.version,
      exportedAt: new Date().toISOString(),
      instructions: '把本文件发给 Kimi，并说"请升级几何规则库"。Kimi 会在 js/patterns.js 的 KIMI 更新区追加新模式并更新版本号。',
      unsolvedProblems: q
    };
    var blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'geodraw-升级包-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------------- 演示测试 ---------------- */
  function renderDemos() {
    $('demoList').innerHTML = GEO_DEMOS.map(function (d, i) {
      return '<button class="demo-item" data-i="' + i + '">' +
        '<span class="dot" id="dot-' + d.id + '"></span>' +
        '<span class="demo-main"><b>' + d.tag + '</b><i>' + d.title + '</i></span>' +
        '<span class="demo-dim">' + (d.dim === '2d' ? '平面' : '立体') + '</span>' +
        '</button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.demo-item'), function (btn) {
      btn.onclick = function () { runDemo(+btn.dataset.i); };
    });
  }

  function runDemo(i) {
    var d = GEO_DEMOS[i];
    $('ta').value = d.text;
    var res = solveCurrent();
    var dot = $('dot-' + d.id);
    dot.className = 'dot ' + (res && res.ok && res.patternId === d.expect ? 'pass' : 'fail');
    return res && res.ok && res.patternId === d.expect;
  }

  function runAllDemos() {
    var pass = 0, i = 0;
    $('testSummary').textContent = '测试进行中…';
    Array.prototype.forEach.call(document.querySelectorAll('.demo-item .dot'), function (d) { d.className = 'dot run'; });
    (function step() {
      if (i >= GEO_DEMOS.length) {
        $('testSummary').textContent = '测试完成：' + pass + ' / ' + GEO_DEMOS.length + ' 通过';
        $('testSummary').className = pass === GEO_DEMOS.length ? 'ok' : 'bad';
        return;
      }
      if (runDemo(i)) pass++;
      i++;
      setTimeout(step, 650);
    })();
  }

  /* ---------------- 输入方式 ---------------- */
  function initInputs() {
    // 语音
    var voice = GEO_INPUTS.createVoice(function (text) {
      $('ta').value = text;
    }, function (listening, err) {
      $('btnVoice').classList.toggle('listening', listening);
      $('voiceHint').textContent = listening ? '正在聆听，请读出题目…再点一次结束' : (err || '读出题目，自动转为文字（需允许麦克风）');
    });
    if (!voice.supported) {
      $('btnVoice').classList.add('off');
      $('voiceHint').textContent = '当前浏览器不支持语音识别，请用 Chrome / Edge';
    }
    $('btnVoice').onclick = function () { voice.toggle($('ta').value.trim()); };

    // 图片
    $('btnImage').onclick = function () { $('fileImg').click(); };
    $('fileImg').onchange = function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      $('imgPrev').src = URL.createObjectURL(file);
      $('imgPrev').style.display = 'block';
      setOcr(0, '正在加载 OCR 引擎（首次较慢）…');
      GEO_INPUTS.ocrImage(file, function (pct) {
        setOcr(pct, pct < 0 ? '正在下载中文识别模型…' : '识别中 ' + pct + '%');
      }).then(function (text) {
        setOcr(100, '识别完成，已填入输入框（请核对后点击「生成图形」）');
        if (text) $('ta').value = ($('ta').value ? $('ta').value + '\n' : '') + text;
        setTimeout(function () { setOcr(-1, ''); }, 4000);
      }).catch(function (err) {
        setOcr(-1, String(err.message || err));
      });
    };
  }

  function setOcr(pct, msg) {
    var wrap = $('ocrWrap');
    if (pct < 0 && !msg) { wrap.style.display = 'none'; $('imgPrev').style.display = 'none'; return; }
    wrap.style.display = 'block';
    $('ocrMsg').textContent = msg;
    $('ocrBar').style.width = Math.max(pct, 4) + '%';
  }

  /* ---------------- 模态框 ---------------- */
  function openModal(html) {
    $('modalBody').innerHTML = html;
    $('modal').style.display = 'flex';
  }
  function closeModal() { $('modal').style.display = 'none'; }

  function showGuide() {
    openModal(
      '<h2>如何让程序学会新题型</h2>' +
      '<p>本程序的"大脑"是 <code>js/patterns.js</code> 中的几何规则库（当前 v' + GEO_LIB.version + '，共 ' + GEO_LIB.patterns.length + ' 类模式）。升级不需要重写程序，只需扩充规则库：</p>' +
      '<ol>' +
      '<li>当题目无法识别时，会自动进入本页左下角的<b>待升级队列</b>；</li>' +
      '<li>点击「导出升级包」，得到一个 JSON 文件（含题目原文与当前版本号）；</li>' +
      '<li>打开 Kimi 对话，发送该文件并说「请升级几何规则库」；</li>' +
      '<li>Kimi 会在 <code>patterns.js</code> 的 KIMI 更新区追加新模式、更新版本号与更新记录，并保存新版网页；</li>' +
      '<li>刷新页面后，新题型即可识别出图。</li>' +
      '</ol>' +
      '<p class="modal-note">规则库采用"识别 → 参数 → 绘图指令"三段式契约，新增模式不影响已有功能，渲染器无需改动。</p>'
    );
  }

  function showChangelog() {
    var rows = GEO_LIB.changelog.map(function (c) {
      return '<div class="log-row"><b>v' + c.v + '</b><span>' + c.date + '</span><p>' + c.note + '</p></div>';
    }).join('');
    var pats = GEO_LIB.patterns.map(function (p) {
      return '<span class="pat-tag">' + p.name + '</span>';
    }).join('');
    openModal('<h2>更新记录</h2>' + rows +
      '<h2 style="margin-top:18px">当前规则库（' + GEO_LIB.patterns.length + ' 类模式）</h2>' +
      '<div class="pat-list">' + pats + '</div>');
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    $('libVer').textContent = '规则库 v' + GEO_LIB.version + ' · ' + GEO_LIB.patterns.length + ' 类模式';
    $('btnSolve').onclick = solveCurrent;
    $('ta').addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') solveCurrent();
    });
    $('btnRunAll').onclick = runAllDemos;
    $('btnExport').onclick = exportUpgradePack;
    $('btnClear').onclick = function () { saveQueue([]); renderQueue(); };
    $('btnGuide').onclick = showGuide;
    $('btnChangelog').onclick = showChangelog;
    $('modalClose').onclick = closeModal;
    $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
    renderDemos();
    renderQueue();
    initInputs();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
