# 宝塔部署（首版）

本站是静态前端，运行时使用仓库中的本地浏览器引擎，不需要 Docker、Node 服务或第三方排盘 API。

## 1. 宝塔准备

- DNS 中为 `bazi.xiulian.lat` 添加指向 VPS1 公网 IP 的 A 记录。
- 在宝塔新建站点 `bazi.xiulian.lat`，站点目录建议为 `/www/wwwroot/bazi.xiulian.lat`。
- 目录必须独立于 Halo，绝不能选择 Halo 的目录。
- 配置该域名的 HTTPS 证书。

## 2. 克隆代码

先确认站点根目录为空。若目录中已有文件，请先停止并确认，不要覆盖或删除。

```bash
cd /www/wwwroot/bazi.xiulian.lat
git clone https://github.com/bbaa2023/bazi-paipan.git .
```

如提示 git 不存在，请在宝塔软件商店安装 Git 后再试。

## 3. 打开网站测试

访问 `https://bazi.xiulian.lat`，填写出生日期并点击「开始排盘」。本项目已将上游浏览器引擎文件放在 `vendor/bazi-engine.web.js`，运行时通过本站自身域名加载。

测试时可按 F12 → Network 检查：排盘运行不应请求 bazi-atlas.com 的 API。浏览器可通过 GitHub 拉取源码，但网站运行时不依赖 GitHub。

## 4. 后续更新

```bash
cd /www/wwwroot/bazi.xiulian.lat
git status
git pull --ff-only
```

若 `git status` 显示有本地修改，请先停止并联系维护者，不要强制覆盖。每次正式更新前，建议在宝塔备份整个站点目录。

## 5. 版权说明

上游引擎按 MIT License 发布。本仓库在 `vendor/LICENSE.bazi-engine` 保留完整许可证，浏览器 bundle 内原有版权声明也保持不变。页面底部仅用简短文字标注引擎名称及许可证，并链接上游项目。请勿删除随代码提供的版权和许可证文本。
