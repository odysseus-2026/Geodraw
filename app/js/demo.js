/* ============================================================================
 * demo.js · 演示测试：5 道高考几何真题 + 4 道移植能力题（v1.1.0）
 * 每道题标注了期望命中的模式 id（expect），用于自动化测试判定通过与否。
 * 「移植」题用于回归验证从 geometry_drawer.py 导入的图形能力。
 * ==========================================================================*/
(function () {
  'use strict';

  window.GEO_DEMOS = [
    {
      id: 'demo-1', dim: '2d', expect: 'p2-triangle',
      tag: '2021 · 全国甲卷',
      title: '三角形：已知两边一角',
      text: '在△ABC中，已知B=120°，AC=√19，AB=2，则BC=（ ）'
    },
    {
      id: 'demo-2', dim: '2d', expect: 'p2-circle-chord',
      tag: '2023 · 新课标Ⅰ卷',
      title: '圆与直线相交成弦',
      text: '已知直线l：x-my+1=0与⊙C：(x-1)²+y²=4交于A，B两点。'
    },
    {
      id: 'demo-3', dim: '3d', expect: 'p3-cube',
      tag: '2022 · 全国乙卷',
      title: '正方体与棱中点',
      text: '在正方体ABCD-A₁B₁C₁D₁中，棱长为2，E，F分别为棱AB，BC的中点。'
    },
    {
      id: 'demo-4', dim: '3d', expect: 'p3-pyramid',
      tag: '2022 · 新高考Ⅰ卷',
      title: '正四棱锥与外接球',
      text: '已知正四棱锥的侧棱长为l，其各顶点都在同一球面上。若该球的体积为36π，且3≤l≤3√3，则该正四棱锥体积的取值范围是（ ）'
    },
    {
      id: 'demo-5', dim: '3d', expect: 'p3-sphere-section',
      tag: '2020 · 全国Ⅰ卷',
      title: '球面上的三点与截面圆',
      text: '已知A，B，C为球O的球面上的三个点，⊙O₁为△ABC的外接圆。若⊙O₁的面积为4π，AB=BC=AC=OO₁，则球O的表面积为（ ）'
    },
    {
      id: 'demo-6', dim: '2d', expect: 'p2-triangle-special',
      tag: '移植 · 等边三角形',
      title: 'geometry_drawer.py 示例题',
      text: '在等边三角形ABC中，边长为4，求BC边上的高。'
    },
    {
      id: 'demo-7', dim: '2d', expect: 'p2-ellipse-line',
      tag: '移植 · 椭圆与直线',
      title: '椭圆的中点弦',
      text: '已知椭圆x²/4+y²/3=1，过点P(1,1)的直线l交椭圆于A，B两点，且P恰为弦AB的中点。'
    },
    {
      id: 'demo-8', dim: '3d', expect: 'p3-tetra',
      tag: '移植 · 三棱锥',
      title: 'PA⊥底面的三棱锥',
      text: '在三棱锥P-ABC中，PA⊥平面ABC，底面△ABC是边长为2的等边三角形，PA=3。'
    },
    {
      id: 'demo-9', dim: '3d', expect: 'p3-cube',
      tag: '移植 · 长方体',
      title: '长方体的长宽高',
      text: '在长方体ABCD-A₁B₁C₁D₁中，AB=3，AD=2，AA₁=4，求对角线AC₁的长。'
    }
  ];
})();
