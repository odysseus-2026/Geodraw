/* ============================================================================
 * engine.js · 题面识别引擎
 * 流程：归一化 → 逐模式试匹配（打分）→ 取最高分 → 产出绘图指令与识别报告。
 * ==========================================================================*/
(function () {
  'use strict';

  /* 全角→半角、统一符号，便于正则匹配 */
  function normalize(text) {
    return String(text || '')
      .replace(/[！-～]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); })
      .replace(/−/g, '-')            // 数学减号
      .replace(/＝/g, '=')
      .replace(/[，、]/g, ',')
      .replace(/。/g, '.')
      .replace(/²/g, '²')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* 对一条题面运行所有模式，返回最佳匹配 */
  function match(text) {
    var t = normalize(text);
    var best = null;
    GEO_LIB.patterns.forEach(function (pt) {
      var params = null;
      try { params = pt.test(t); } catch (e) { /* 单个模式出错不影响整体 */ }
      if (!params) return;
      // 打分：关键词命中数 × 2 + 提取到的参数个数
      var hits = 0;
      pt.kw.forEach(function (k) { if (t.indexOf(k) >= 0) hits++; });
      var score = hits * 2 + Object.keys(params).length;
      if (!best || score > best.score) best = { pattern: pt, params: params, score: score, normalized: t };
    });
    return best;
  }

  /* 执行识别 + 生成绘图指令 */
  function solve(text) {
    var m = match(text);
    if (!m) return { ok: false, normalized: normalize(text) };
    var spec;
    try { spec = m.pattern.spec(m.params); }
    catch (e) { return { ok: false, error: String(e), normalized: m.normalized }; }
    return {
      ok: true,
      dim: m.pattern.dim,
      patternId: m.pattern.id,
      patternName: m.pattern.name,
      score: m.score,
      params: m.params,
      spec: spec,
      notes: spec.notes || [],
      normalized: m.normalized
    };
  }

  window.GEO_ENGINE = { normalize: normalize, match: match, solve: solve };
})();
