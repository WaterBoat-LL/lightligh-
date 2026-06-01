# TOOLBOX_Lully

TOOLBOX_Lully 是一个静态个人工具站/博客首页项目，当前主要包含现代化首页导航、工具模块卡片、项目介绍页签、致谢友链页面，以及一个通过 iframe 嵌入的智能体助手页面。

项目不依赖本地构建工具，直接使用 HTML、CSS 和 CDN 版 Vue 2 运行。

## 功能概览

- 顶部导航栏：左侧使用独立放大的 TOOLBOX 品牌区，中间为搜索栏，右侧使用三横条汉堡按钮收纳 `MENU`、`PART`、`HELPER`、`THANKS` 等入口。
- 首页欢迎区：展示欢迎文案、极客风终端状态面板和从指定日期开始累计的陪伴时间。
- 分类卡片区：展示 tool、communication、fun、help 四个模块卡片，并支持搜索过滤。
- 项目介绍页：通过 Vue 状态切换不同介绍内容，包括个人介绍、机械结构工程相关智能体、电路/PLC 相关智能体和友链。
- 智能体助手页：`HELPER` 页面通过 `iframe` 加载 `view.html`，并在其中接入百度智能体嵌入 SDK。
- 致谢页面：`THANKS` 页面展示友链和项目致谢内容。
- 静态资源：包含 SVG 图标、PNG 图片和 JPG 背景/插图资源。

## 技术栈

- HTML5
- CSS3
- Vue 2.7.14（通过 jsDelivr CDN 引入）
- 百度智能体 EmbedWebSDK（通过远程脚本引入）

## 目录结构

```text
.
├── README.md
└── blogs
    ├── index.html                 # 主页面
    ├── view.html                  # 智能体嵌入页面
    ├── tool_style.css             # 页面样式
    ├── 82.svg
    ├── 个人认证.svg
    ├── 交流.png
    ├── 分类.svg
    ├── 发现.svg
    ├── 工具.svg
    ├── 工具 (1).svg
    ├── 工具盒.png
    ├── 攻略.svg
    ├── 月光.jpg
    ├── 服务.svg
    ├── 生成咖啡温馨图片.png
    └── 菜单.svg
```

## 本地运行

### 方式一：直接打开

直接在浏览器中打开：

```text
blogs/index.html
```

### 方式二：使用本地静态服务器

在项目根目录执行：

```bash
cd blogs
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

如果页面需要加载 Vue CDN 或百度智能体 SDK，请确保当前网络可以访问对应远程资源。

## 主要文件说明

### `blogs/index.html`

项目主页面，包含：

- 页面基础结构
- 顶部导航
- MENU 首页内容
- PART 项目介绍内容
- HELPER iframe 容器
- THANKS 致谢和友链内容
- Vue 实例和页面状态逻辑

Vue 中主要状态包括：

- `active_Page`：控制当前显示的页面区域。
- `activeTab`：控制 PART 页面中的介绍页签。
- `searchText`：控制首页模块卡片的搜索过滤。
- `filteredCards`：根据搜索关键词计算当前显示的模块卡片。
- `day`、`hour`、`minute`、`second`：用于显示累计时间。

### `blogs/view.html`

智能体嵌入页，通过远程脚本加载百度智能体 EmbedWebSDK。

### `blogs/tool_style.css`

全站样式文件，包含：

- 页面基础样式
- 现代化深色极客风背景、网格纹理和扫描线效果
- 个性化标题/数字字体、顶部汉堡菜单、搜索框和响应式布局
- 首页欢迎区、终端状态面板和模块卡片样式
- PART 项目介绍布局
- HELPER 页面 iframe 容器样式
- THANKS 致谢页面样式

## 开发备注

- 当前项目是纯静态页面，没有 `package.json`、构建脚本或后端服务。
- 页面源码已统一为 UTF-8 编码，建议后续继续使用 UTF-8 保存文件。
- `index.html` 当前使用单一 `#app` 作为 Vue 根节点，页面切换由 Vue 状态控制。
- 当前主题保留原有深色背景、橙色强调线和已有图片/SVG 标识，在此基础上重构为更现代、更极客化的视觉风格。
- 个性字体通过 Google Fonts 引入，网络不可用时会回退到系统字体。

## 部署

由于项目是静态站点，可以部署到任意静态托管平台，例如：

- GitHub Pages
- Cloudflare Pages
- Vercel
- Netlify
- Nginx 静态目录

部署时将 `blogs` 目录作为站点根目录，或将 `blogs/index.html` 所在目录配置为静态资源目录即可。

## 在线访问

👉 https://github.com/WaterBoat-LL/lightligh-
