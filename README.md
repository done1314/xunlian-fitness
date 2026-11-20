# 循练 · 我的健身计划

[打开训练计划](https://done1314.github.io/xunlian-fitness/)

从 main 分支根目录通过 GitHub Pages 发布。推送后 GitHub 会自动更新网站。

每天查看训练动作、组数、次数与动作图。底部“今日训练”和“我的”两个入口，支持浅色/深色外观。

界面参考 Apple 系统应用的标题、分组、列表和浮动导航。动作图使用整卡宽度，玻璃材质只用于浮动控件，文字和训练图保持清晰。玻璃边缘处理参考[这篇文章](https://juejin.cn/post/7514618352829448244)，视觉层级对照 [Apple 官方设计示例](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)。

- 默认推、拉、蹲排序，每轮后休息一天，可自行调整。
- 设置训练开始日期、训练顺序、每周固定休息日。
- 点击“今日休息”后，原训练与后续计划顺延一天；支持取消。
- 编辑动作、组数、次数、图片与动作要点，支持添加与移除。
- 图片可放大查看；无需计时或完成打卡。
- 浏览器本地保存、离线缓存、JSON 备份与导入。

训练内容及 20 张图解来自提供的《三分化图解训练计划.pdf》。交互参考 [study-guardian-webapp](https://github.com/done1314/study-guardian-webapp)。

这是无构建的静态 Web App，可使用 GitHub Pages 从 main 分支根目录发布，也可使用任意静态服务器在本地预览。计划保存在当前浏览器，不同设备不自动同步。详细使用方法见[使用说明](使用说明.md)。
