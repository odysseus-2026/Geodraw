# -*- coding: utf-8 -*-
"""
geometry_drawer.py
==================
高中几何图形自动生成器
输入一段几何题目的中文文字描述，自动绘制对应的二维平面图形或三维立体图形。

用法：
    python geometry_drawer.py "在等边三角形ABC中，边长为4"
    python geometry_drawer.py            # 进入交互模式，连续输入描述

支持的图形：
  二维：圆、三角形（等边/等腰/直角/一般）、正方形、矩形、平行四边形、
        梯形、正三~十边形
                     '正方体、长方体、圆柱、圆锥、球、三棱锥、椭圆与直线')
"""

import re
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']


def extract_numbers(text):
    """提取文本中的数字（支持 3、3.5 等）"""
    return [float(n) for n in re.findall(r'(\d+\.?\d*)', text)]


# ==================== 2D 绘图 ====================

def setup_2d():
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.set_aspect('equal')
    ax.axis('off')
    return fig, ax


def label_points_2d(ax, pts):
    for (x, y), lab in zip(pts, LABELS):
        ax.text(x, y, lab, fontsize=13, fontweight='bold',
                ha='center', va='center',
                bbox=dict(facecolor='white', edgecolor='none', pad=1.5))
        ax.plot(x, y, 'ko', ms=4)


def draw_triangle(kind, side=3.0, base=None, height=None):
    fig, ax = setup_2d()
    if kind == 'equilateral':
        h = side * np.sqrt(3) / 2
        pts = [(-side/2, 0), (side/2, 0), (0, h)]
    elif kind == 'right':
        pts = [(0, 0), (base or side, 0), (0, height or side)]
    elif kind == 'isosceles':
        pts = [(-side/2, 0), (side/2, 0), (0, height or side)]
    else:
        pts = [(0, 0), (base or side, 0), (side*0.35, height or side*0.8)]
    ax.add_patch(Polygon(pts, closed=True, fill=False, edgecolor='#1f77b4', lw=2))
    label_points_2d(ax, pts)
    ax.autoscale_view(); ax.margins(0.15)
    return fig


def draw_circle(r=2.0, center_label='O'):
    fig, ax = setup_2d()
    ax.add_patch(Circle((0, 0), r, fill=False, edgecolor='#d62728', lw=2))
    ax.plot(0, 0, 'ko', ms=4)
    ax.text(0, 0, center_label, fontsize=13, fontweight='bold',
            ha='center', va='center',
            bbox=dict(facecolor='white', edgecolor='none', pad=1.5))
    ax.plot([0, r], [0, 0], 'k--', lw=1.2)
    ax.text(r/2, 0.12, f'r={r:g}', fontsize=11)
    ax.set_xlim(-r*1.3, r*1.3); ax.set_ylim(-r*1.3, r*1.3)
    return fig


def draw_square(a=3.0):
    fig, ax = setup_2d()
    pts = [(0, 0), (a, 0), (a, a), (0, a)]
    ax.add_patch(Polygon(pts, closed=True, fill=False, edgecolor='#2ca02c', lw=2))
    label_points_2d(ax, pts); ax.margins(0.15)
    return fig


def draw_rectangle(a=4.0, b=2.5):
    fig, ax = setup_2d()
    pts = [(0, 0), (a, 0), (a, b), (0, b)]
    ax.add_patch(Polygon(pts, closed=True, fill=False, edgecolor='#2ca02c', lw=2))
    label_points_2d(ax, pts); ax.margins(0.15)
    return fig


def draw_parallelogram(a=4.0, b=2.5, angle_deg=60):
    fig, ax = setup_2d()
    th = np.radians(angle_deg)
    dx = b * np.cos(th); dy = b * np.sin(th)
    pts = [(0, 0), (a, 0), (a+dx, dy), (dx, dy)]
    ax.add_patch(Polygon(pts, closed=True, fill=False, edgecolor='#2ca02c', lw=2))
    label_points_2d(ax, pts)
    ax.autoscale_view(); ax.margins(0.15)
    return fig


def draw_trapezoid(a=4.0, b=2.0, h=2.5):
    fig, ax = setup_2d()
    pts = [(0, 0), (a, 0), (a-(a-b)/2, h), ((a-b)/2, h)]
    ax.add_patch(Polygon(pts, closed=True, fill=False, edgecolor='#2ca02c', lw=2))
    label_points_2d(ax, pts)
    ax.autoscale_view(); ax.margins(0.15)
    return fig


def draw_regular_polygon(n=5, r=2.5):
    fig, ax = setup_2d()
    angles = np.linspace(np.pi/2, np.pi/2 + 2*np.pi, n, endpoint=False)
    pts = [(r*np.cos(t), r*np.sin(t)) for t in angles]
    ax.add_patch(Polygon(pts, closed=True, fill=False, edgecolor='#9467bd', lw=2))
    label_points_2d(ax, pts)
    ax.set_xlim(-r*1.3, r*1.3); ax.set_ylim(-r*1.3, r*1.3)
    return fig


# ==================== 3D 绘图 ====================

def setup_3d():
    fig = plt.figure(figsize=(7, 6))
    ax = fig.add_subplot(111, projection='3d')
    ax.set_axis_off()
    return fig, ax


def _cuboid_faces(a, b, c):
    V = [(0,0,0),(a,0,0),(a,b,0),(0,b,0),
         (0,0,c),(a,0,c),(a,b,c),(0,b,c)]
    faces = [[V[0],V[1],V[2],V[3]], [V[4],V[5],V[6],V[7]],
             [V[0],V[1],V[5],V[4]], [V[2],V[3],V[7],V[6]],
             [V[1],V[2],V[6],V[5]], [V[0],V[3],V[7],V[4]]]
    return V, faces


def draw_cube(a=3.0):
    return draw_cuboid(a, a, a)


def draw_cuboid(a=4.0, b=2.5, c=2.0):
    fig, ax = setup_3d()
    V, faces = _cuboid_faces(a, b, c)
    ax.add_collection3d(Poly3DCollection(faces, alpha=0.15, facecolor='#1f77b4',
                                         edgecolor='k', lw=1.5))
    for (x, y, z), lab in zip(V, LABELS):
        ax.text(x, y, z, lab, fontsize=12, fontweight='bold')
        ax.scatter([x], [y], [z], color='k', s=15)
    ax.set_xlim(-0.5, a+0.5); ax.set_ylim(-0.5, b+0.5); ax.set_zlim(-0.5, c+0.5)
    ax.view_init(elev=20, azim=-60)
    return fig


def draw_cylinder(r=2.0, h=5.0, n=40):
    fig, ax = setup_3d()
    th = np.linspace(0, 2*np.pi, n)
    x = r*np.cos(th); y = r*np.sin(th)
    ax.plot(x, y, np.zeros_like(th), color='k', lw=1.5)
    ax.plot(x, y, np.full_like(th, h), color='k', lw=1.5)
    for t in [0, np.pi/2]:
        ax.plot([r*np.cos(t), r*np.cos(t)], [r*np.sin(t), r*np.sin(t)], [0, h], 'k-', lw=1)
    X, Y = np.meshgrid(np.linspace(-r, r, 20), np.linspace(-r, r, 20))
    for z0 in [0, h]:
        ax.plot_surface(X, Y, np.where(X**2 + Y**2 <= r**2, z0, np.nan),
                        alpha=0.25, color='#ff7f0e')
    ax.text(r, 0, -0.3, 'r', fontsize=11)
    ax.text(0, 0, h/2, f'h={h:g}', fontsize=11)
    ax.set_xlim(-r*1.3, r*1.3); ax.set_ylim(-r*1.3, r*1.3); ax.set_zlim(-0.5, h+0.5)
    ax.view_init(elev=18, azim=-60)
    return fig


def draw_cone(r=2.0, h=5.0, n=40):
    fig, ax = setup_3d()
    th = np.linspace(0, 2*np.pi, n)
    x = r*np.cos(th); y = r*np.sin(th)
    ax.plot(x, y, np.zeros_like(th), color='k', lw=1.5)
    for t in [0, np.pi/2]:
        ax.plot([0, r*np.cos(t)], [0, r*np.sin(t)], [h, 0], 'k-', lw=1.2)
    ax.plot([0, 0], [0, 0], [0, h], 'k--', lw=1)
    X, Y = np.meshgrid(np.linspace(-r, r, 20), np.linspace(-r, r, 20))
    ax.plot_surface(X, Y, np.where(X**2 + Y**2 <= r**2, 0, np.nan), alpha=0.25, color='#ff7f0e')
    ax.text(0, 0, h+0.25, 'P', fontsize=12, fontweight='bold')
    ax.text(r*0.6, r*0.6, -0.3, 'r', fontsize=11)
    ax.text(0.15, 0, h/2, f'h={h:g}', fontsize=11)
    ax.set_xlim(-r*1.3, r*1.3); ax.set_ylim(-r*1.3, r*1.3); ax.set_zlim(-0.5, h+0.6)
    ax.view_init(elev=18, azim=-60)
    return fig


def draw_sphere(r=2.5):
    fig = plt.figure(figsize=(7, 6))
    ax = fig.add_subplot(111, projection='3d')
    u = np.linspace(0, np.pi, 40); v = np.linspace(0, 2*np.pi, 40)
    U, V = np.meshgrid(u, v)
    ax.plot_surface(r*np.sin(U)*np.cos(V), r*np.sin(U)*np.sin(V), r*np.cos(U),
                    alpha=0.35, color='#d62728', edgecolor='none')
    th = np.linspace(0, 2*np.pi, 60)
    ax.plot(r*np.cos(th), r*np.sin(th), np.zeros_like(th), 'k--', lw=1)
    ax.plot(np.zeros_like(th), r*np.cos(th), r*np.sin(th), 'k--', lw=1)
    ax.plot([0, r], [0, 0], [0, 0], 'k-', lw=1.2)
    ax.text(r/2, 0, 0.15, f'r={r:g}', fontsize=11)
    ax.text(0, 0, 0, 'O', fontsize=12, fontweight='bold')
    ax.set_axis_off()
    lim = r*1.25
    ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim); ax.set_zlim(-lim, lim)
    ax.view_init(elev=20, azim=-60)
    return fig




def _line_ellipse_intersections(a2, b2, x0, y0, k):
    """直线 y=k(x-x0)+y0 与椭圆 x^2/a2+y^2/b2=1 的交点"""
    c = y0 - k * x0
    A = 1/a2 + k*k/b2
    B = 2*k*c/b2
    C = c*c/b2 - 1
    roots = np.roots([A, B, C])
    xs = [r.real for r in roots if abs(r.imag) < 1e-9]
    return [(x, k*(x-x0)+y0) for x in sorted(xs)]


def draw_ellipse_with_line(a2=4.0, b2=3.0, x0=1.0, y0=1.0, k=1.0, title=''):
    """椭圆 + 过定点 P(x0,y0)、斜率为 k 的直线，标出交点 A、B"""
    a, b = np.sqrt(a2), np.sqrt(b2)
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.set_aspect('equal'); ax.grid(True, ls=':', alpha=0.5)
    t = np.linspace(0, 2*np.pi, 300)
    ax.plot(a*np.cos(t), b*np.sin(t), color='#1f77b4', lw=2,
            label=f'$x^2/{a2:g}+y^2/{b2:g}=1$')
    pts = _line_ellipse_intersections(a2, b2, x0, y0, k)
    if len(pts) == 2:
        xs = np.linspace(pts[0][0]-0.5, pts[1][0]+0.5, 10)
        ab_len = abs(pts[0][0]-pts[1][0]) * np.sqrt(1 + k*k)
    else:
        xs = np.linspace(-a, a, 10); ab_len = None
    ax.plot(xs, k*(xs-x0)+y0, 'r-', lw=1.5,
            label=f'$l: y-{y0:g}={k:g}(x-{x0:g})$')
    for (px, py), lab in zip(pts, ['A', 'B']):
        ax.plot(px, py, 'ko', ms=5)
        ax.text(px, py+0.12, lab, fontsize=13, fontweight='bold', ha='center')
    ax.plot(x0, y0, 'b*', ms=14)
    ax.text(x0+0.06, y0-0.25, f'P({x0:g},{y0:g})', fontsize=11, color='b')
    ax.axhline(0, color='k', lw=0.8); ax.axvline(0, color='k', lw=0.8)
    ttl = title or (f'椭圆与直线（|AB|={ab_len:.4g}）' if ab_len else '椭圆与直线')
    ax.set_title(ttl, fontsize=12)
    ax.legend(fontsize=10, loc='lower right')
    lim = max(a, b) * 1.25
    ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim)
    return fig


def draw_triangular_pyramid(a=2.0, h=2.0):
    """三棱锥 P-ABC：底面为边长 a 的正三角形，PA 垂直底面，PA=h"""
    fig, ax = setup_3d()
    s3 = np.sqrt(3)
    A = np.array([0.0, 0, 0]); B = np.array([a, 0, 0])
    C = np.array([a/2, a*s3/2, 0]); P = np.array([0.0, 0, h])
    for X, Y in [(A, B), (B, C), (C, A)]:
        ax.plot(*zip(X, Y), 'k--', lw=1.2)      # 底面虚线
    ax.plot(*zip(A, P), 'k-', lw=1.8)           # PA 垂直底面
    ax.plot(*zip(B, P), 'k-', lw=1.5)
    ax.plot(*zip(C, P), 'k-', lw=1.5)
    ax.add_collection3d(Poly3DCollection([[A, B, C]], alpha=0.15, facecolor='#1f77b4'))
    ax.text(*A, 'A', fontsize=13, fontweight='bold')
    ax.text(*(B+np.array([0.15, 0, 0])), 'B', fontsize=13, fontweight='bold')
    ax.text(*(C+np.array([0, 0.15, 0])), 'C', fontsize=13, fontweight='bold')
    ax.text(*(P+np.array([0, 0, 0.18])), 'P', fontsize=13, fontweight='bold')
    for X in [A, B, C, P]:
        ax.scatter(*X, color='k', s=15)
    ax.text(0.25, 0.15, h/2, f'PA={h:g}', fontsize=11)
    ax.text(a/2, -0.25, 0, f'a={a:g}', fontsize=11)
    ax.set_axis_off()
    ax.set_xlim(-0.6, a+0.6); ax.set_ylim(-0.6, a*s3/2+0.6); ax.set_zlim(-0.3, h+0.5)
    ax.view_init(elev=16, azim=-55)
    return fig

# ==================== 解析器 ====================

def parse_geometry(text):
    """解析中文几何描述 -> (figure, 图形说明)"""
    t = text
    nums = extract_numbers(t)

    def num(i, default):
        return nums[i] if len(nums) > i else default

    # ---- 3D 立体 ----
    if '三棱锥' in t:
        a = num(0, 2.0)
        m_pa = re.search(r'PA\s*=\s*(\d+\.?\d*)', t)
        h = float(m_pa.group(1)) if m_pa else a
        return draw_triangular_pyramid(a, h), f'三棱锥P-ABC（底面边长{a:g}，PA={h:g}）'

    if '球' in t:
        r = nums[0] if nums else 2.5
        return draw_sphere(r), f'球（半径 r={r:g}）'

    if '圆柱' in t:
        r = num(0, 2.0); h = num(1, 5.0)
        return draw_cylinder(r, h), f'圆柱（底面半径 r={r:g}，高 h={h:g}）'

    if '圆锥' in t:
        r = num(0, 2.0); h = num(1, 5.0)
        return draw_cone(r, h), f'圆锥（底面半径 r={r:g}，高 h={h:g}）'

    if '正方体' in t:
        a = num(0, 3.0)
        return draw_cube(a), f'正方体（棱长 a={a:g}）'

    if '长方体' in t:
        if len(nums) >= 3:
            a, b, c = nums[0], nums[1], nums[2]
        else:
            a, b, c = 4.0, 2.5, 2.0
        return draw_cuboid(a, b, c), f'长方体（长{a:g}，宽{b:g}，高{c:g}）'

    # ---- 2D 平面 ----
    m = re.search(r'正(三|四|五|六|七|八|九|十)边形', t)
    if m:
        cn = {'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}
        n = cn[m.group(1)]
        return draw_regular_polygon(n, num(0, 2.5)), f'正{n}边形'

    if '等边三角形' in t:
        s = num(0, 3.0)
        return draw_triangle('equilateral', s), f'等边三角形（边长 {s:g}）'

    if '直角三角形' in t:
        base = num(0, 3.0)
        height = num(1, None) if len(nums) > 1 else None
        return draw_triangle('right', base=base, height=height), '直角三角形'

    if '等腰三角形' in t:
        s = num(0, 3.0)
        height = num(1, None) if len(nums) > 1 else None
        return draw_triangle('isosceles', s, height=height), '等腰三角形'

    if '三角形' in t:
        return draw_triangle('scalene', num(0, 3.0), num(1, 4.0), num(2, 2.4)), '三角形'

    if '正方形' in t:
        return draw_square(num(0, 3.0)), f'正方形（边长 {num(0,3.0):g}）'

    if '矩形' in t or '长方形' in t:
        return draw_rectangle(num(0, 4.0), num(1, 2.5)), '矩形'

    if '平行四边形' in t:
        return draw_parallelogram(num(0, 4.0), num(1, 2.5)), '平行四边形'

    if '梯形' in t:
        return draw_trapezoid(num(1, 4.0), num(0, 2.0), num(2, 2.5)), '梯形'

    # ---- 解析几何 ----
    if '椭圆' in t:
        ma = re.search(r'x\^?2\s*/\s*(\d+\.?\d*)', t)
        mb = re.search(r'y\^?2\s*/\s*(\d+\.?\d*)', t)
        a2 = float(ma.group(1)) if ma else 4.0
        b2 = float(mb.group(1)) if mb else 3.0
        mp = re.search(r'P\s*\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)', t)
        x0, y0 = (float(mp.group(1)), float(mp.group(2))) if mp else (1.0, 1.0)
        if '中点' in t:
            k = -b2 * x0 / (a2 * y0)   # 中点弦斜率公式 k=-b^2*x0/(a^2*y0)
            return draw_ellipse_with_line(a2, b2, x0, y0, k), \
                f'中点弦：y-{y0:g}={k:g}(x-{x0:g})'
        mk = re.search(r'斜率\D{0,4}(-?\d+\.?\d*)', t)
        k = float(mk.group(1)) if mk else 1.0
        return draw_ellipse_with_line(a2, b2, x0, y0, k), f'椭圆与斜率为{k:g}的直线'

    if '圆' in t:
        return draw_circle(num(0, 2.0)), f'圆（半径 r={num(0,2.0):g}）'

    raise ValueError('暂未识别该几何图形。支持：圆、各类三角形、四边形、正多边形、'
                     '正方体、长方体、圆柱、圆锥、球、三棱锥、椭圆与直线')


def save_geometry(text, outpath='geometry.png'):
    fig, desc = parse_geometry(text)
    fig.savefig(outpath, dpi=150, bbox_inches='tight')
    plt.close(fig)
    return desc, outpath


def main():
    if len(sys.argv) > 1:
        text = ' '.join(sys.argv[1:])
        desc, path = save_geometry(text)
        print(f'已生成：{desc} -> {path}')
    else:
        print('几何图形生成器（输入几何描述，输入 q 退出）')
        print('示例：在等边三角形ABC中，边长为4')
        while True:
            text = input('\n几何描述> ').strip()
            if text.lower() in ('q', 'quit', 'exit'):
                break
            if not text:
                continue
            try:
                desc, path = save_geometry(text)
                print(f'已生成：{desc} -> {path}')
            except ValueError as e:
                print(f'错误：{e}')


if __name__ == '__main__':
    main()
