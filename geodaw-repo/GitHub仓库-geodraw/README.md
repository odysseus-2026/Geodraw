# GeoDraw 几何图解 · 高中数学几何题自动画图

输入一段几何题文字（或语音 / 拍照识别），自动绘制对应的**平面图形**或**三维立体图形**，
支持鼠标旋转、缩放、平移，帮助学生与审稿人直观理解几何结构。

## 目标用户

- 高中生：读几何题时在脑中"看不见图"，想立刻看到准确图形；
- 教师/出题人：快速生成课堂演示图；
- 同学/审稿人：在浏览器里自由旋转三维模型，检查任意视角。

## 功能一览

| 模块 | 说明 |
|---|---|
| 文字/语音/图片(OCR) 输入 | 多方式输入题目，图片自动转文字 |
| 识别引擎 | 规则库归一化 → 匹配打分 → 生成绘图指令 |
| 2D 渲染 | SVG，支持 polygon/circle/ellipse/line/seg/point/angle 等通用图元 |
| 3D 渲染 | Three.js，支持 box/poly3/pyramid/sphere/cone/cylinder/prism 等，可旋转缩放 |
| 演示测试 | 内置 5 道高考真题 + 4 道移植能力题，一键回归测试 |
| 待升级队列 | 无法识别的题目自动记录，导出 JSON 交给 AI 扩充规则库（见 UPGRADE.md） |

## 快速开始

纯静态网页，无需安装。任选其一：

```bash
# 方式一：直接双击 index.html（部分浏览器限制数据加载）
# 方式二：本地起服务（推荐）
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 目录结构

见 [UPGRADE.md](./UPGRADE.md)。核心：`js/patterns.js` 为几何规则库，升级只改这一个文件。

## 反馈

网页右上角「提交反馈」按钮直达 Issues；或访问
https://github.com/odysseus-2026/geodraw/issues 。

## License

MIT
