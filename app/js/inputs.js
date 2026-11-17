/* ============================================================================
 * inputs.js · 三种输入方式：文字 / 语音 / 图片（OCR）
 * 语音：Web Speech API（zh-CN）；图片：Tesseract.js（按需懒加载，chi_sim+eng）。
 * ==========================================================================*/
(function () {
  'use strict';

  /* ---------- 语音输入 ---------- */
  function createVoice(onText, onState) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return { supported: false, toggle: function () {} };
    var rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = true;
    rec.continuous = true;
    var listening = false, base = '';

    rec.onresult = function (e) {
      var interim = '', final = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      onText(base + final + interim, !interim);
      if (final) base += final;
    };
    rec.onend = function () {
      if (listening) { try { rec.start(); } catch (e) {} }   // 持续听写
      else onState(false);
    };
    rec.onerror = function () { listening = false; onState(false, '语音识别出错或无权使用麦克风'); };

    return {
      supported: true,
      toggle: function (currentText) {
        if (listening) { listening = false; rec.stop(); onState(false); return; }
        base = currentText ? currentText + ' ' : '';
        try { rec.start(); listening = true; onState(true); }
        catch (e) { onState(false, '无法启动语音识别'); }
      }
    };
  }

  /* ---------- 图片输入（OCR） ---------- */
  var tessLoading = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (tessLoading) return tessLoading;
    tessLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('OCR 引擎加载失败（需要联网）')); };
      document.head.appendChild(s);
    });
    return tessLoading;
  }

  function ocrImage(file, onProgress) {
    return loadTesseract().then(function () {
      return Tesseract.recognize(file, 'chi_sim+eng', {
        logger: function (m) {
          if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
          else onProgress(-1);   // 加载模型阶段
        }
      });
    }).then(function (res) {
      // OCR 结果清理：去掉多余空白，修正常见误识别
      return res.data.text
        .replace(/\n{2,}/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
    });
  }

  window.GEO_INPUTS = { createVoice: createVoice, ocrImage: ocrImage };
})();
