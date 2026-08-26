#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 根目录直接设为当前脚本所在目录
const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// 确保 dist 目录存在
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

/**
 * 发现所有包含 index.html 的可打包子项目
 */
function discoverProjects() {
    const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== '.gemini') {
            const htmlPath = path.join(ROOT_DIR, entry.name, 'index.html');
            if (fs.existsSync(htmlPath)) {
                // 读取 HTML 标题
                const content = fs.readFileSync(htmlPath, 'utf8');
                const titleMatch = content.match(/<title>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1].trim() : entry.name;
                projects.push({
                    id: entry.name,
                    name: title,
                    dir: path.join(ROOT_DIR, entry.name),
                    htmlPath: htmlPath
                });
            }
        }
    }
    return projects;
}

/**
 * 单文件打包核心函数
 */
function bundleProject(project) {
    console.log(`\n📦 开始打包项目: [${project.name}] (${project.id})...`);
    let html = fs.readFileSync(project.htmlPath, 'utf8');
    const projectDir = project.dir;

    // 1. 内联本地 CSS 样式表 (<link rel="stylesheet" href="...">)
    html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>|<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi, (match, href1, href2) => {
        const href = href1 || href2;
        // 跳过远程 CDN (http/https/fonts.googleapis.com)
        if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
            return match;
        }

        const cleanHref = href.split('?')[0].split('#')[0];
        const cssFilePath = path.join(projectDir, cleanHref);

        if (fs.existsSync(cssFilePath)) {
            console.log(`  └─ 嵌入样式表: ${cleanHref}`);
            let cssContent = fs.readFileSync(cssFilePath, 'utf8');

            // 内联 CSS 内部引用的本地图片/字体 (url(...))
            cssContent = cssContent.replace(/url\((['"]?)([^'"\)]+)\1\)/g, (urlMatch, quote, imgUrl) => {
                if (imgUrl.startsWith('data:') || imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
                    return urlMatch;
                }
                const cleanImgUrl = imgUrl.split('?')[0].split('#')[0];
                const imgPath = path.resolve(path.dirname(cssFilePath), cleanImgUrl);
                if (fs.existsSync(imgPath)) {
                    const ext = path.extname(imgPath).toLowerCase().replace('.', '');
                    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                    const base64 = fs.readFileSync(imgPath).toString('base64');
                    return `url("data:${mime};base64,${base64}")`;
                }
                return urlMatch;
            });

            return `<style>\n/* Inlined from ${cleanHref} */\n${cssContent}\n</style>`;
        } else {
            console.warn(`  ⚠️ 未找到样式文件: ${cssFilePath}`);
            return match;
        }
    });

    // 2. 内联本地 JavaScript 脚本 (<script src="..."></script>)
    html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
        if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
            return match;
        }

        const cleanSrc = src.split('?')[0].split('#')[0];
        const jsFilePath = path.join(projectDir, cleanSrc);

        if (fs.existsSync(jsFilePath)) {
            console.log(`  └─ 嵌入脚本: ${cleanSrc}`);
            const jsContent = fs.readFileSync(jsFilePath, 'utf8');
            // 防止代码中自带 </script> 导致 HTML 闭合提前截断
            const safeJsContent = jsContent.replace(/<\/script>/gi, '<\\/script>');
            return `<script>\n/* Inlined from ${cleanSrc} */\n${safeJsContent}\n</script>`;
        } else {
            console.warn(`  ⚠️ 未找到脚本文件: ${jsFilePath}`);
            return match;
        }
    });

    // 3. 内联 HTML 中的本地 <img> 图片标签
    html = html.replace(/<img\s+([^>]*\s+)?src=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
        if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
            return match;
        }
        const cleanSrc = src.split('?')[0].split('#')[0];
        const imgPath = path.join(projectDir, cleanSrc);
        if (fs.existsSync(imgPath)) {
            console.log(`  └─ 嵌入图片: ${cleanSrc}`);
            const ext = path.extname(imgPath).toLowerCase().replace('.', '');
            const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            const base64 = fs.readFileSync(imgPath).toString('base64');
            return `<img ${before || ''}src="data:${mime};base64,${base64}"${after || ''}>`;
        }
        return match;
    });

    // 4. 写入 dist 输出目录
    const outFilename = `${project.id}.standalone.html`;
    const outFilePath = path.join(DIST_DIR, outFilename);
    fs.writeFileSync(outFilePath, html, 'utf8');

    const sizeKb = (fs.statSync(outFilePath).size / 1024).toFixed(1);
    console.log(`✅ 打包成功! 生成单文件:`);
    console.log(`   📄 路径: ${outFilePath}`);
    console.log(`   ⚖️ 大小: ${sizeKb} KB (包含全部 CSS + JS + 资源，双击直接运行)\n`);

    return outFilePath;
}

/**
 * 主执行函数
 */
async function main() {
    const projects = discoverProjects();
    const args = process.argv.slice(2);

    if (projects.length === 0) {
        console.error("❌ 未发现任何包含 index.html 的子项目目录。");
        process.exit(1);
    }

    // 支持命令行直接传入参数: node bundle.js all / node bundle.js blind_box
    if (args.length > 0) {
        const target = args[0].toLowerCase();
        if (target === 'all' || target === '全部') {
            projects.forEach(bundleProject);
            console.log(`🎉 全部 ${projects.length} 个项目已打包完毕！输出目录: ${DIST_DIR}`);
            process.exit(0);
        } else {
            const found = projects.find(p => p.id.toLowerCase() === target || p.name.toLowerCase().includes(target));
            if (found) {
                bundleProject(found);
                process.exit(0);
            } else {
                console.error(`❌ 未找到匹配的项目: "${args[0]}"`);
            }
        }
    }

    // 交互式控制台菜单
    console.log("==================================================");
    console.log("  📦 数学与概率探索实验室 · 单文件 HTML 打包工具");
    console.log("==================================================");
    console.log("请选择您要打包的项目：\n");

    projects.forEach((p, idx) => {
        console.log(`  [${idx + 1}] ${p.name} (${p.id})`);
    });
    console.log(`  [A] 一键打包全部项目 (All)`);
    console.log(`  [Q] 退出 (Quit)\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("请输入选项编号 (默认 1): ", (answer) => {
        rl.close();
        const choice = (answer || '1').trim().toLowerCase();

        if (choice === 'q') {
            console.log("已退出。");
            process.exit(0);
        }

        if (choice === 'a') {
            projects.forEach(bundleProject);
            console.log(`🎉 全部 ${projects.length} 个项目已打包完毕！输出目录: ${DIST_DIR}`);
            process.exit(0);
        }

        const num = parseInt(choice, 10);
        if (!isNaN(num) && num >= 1 && num <= projects.length) {
            bundleProject(projects[num - 1]);
        } else {
            console.log("⚠️ 无效选择，已退出。");
        }
    });
}

main();
