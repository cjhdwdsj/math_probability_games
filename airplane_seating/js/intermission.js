/* ==========================================================================
   JS 模块 7: 夜间过幕间叙事与桌面打扫清理 (INTERMISSION.JS)
   ========================================================================== */

/**
 * 触发夜间过幕间（屏幕半灰、字迹淡出、打扫清理台面）
 * @param {number} nightIndex - 1 (第1夜) 或 2 (第2夜)
 * @param {Function} onContinue - 点击继续的回调
 */
function triggerNightIntermission(nightIndex, onContinue) {
    const overlay = document.getElementById("night-intermission-overlay");
    const titleEl = document.getElementById("intermission-title");
    const bodyEl = document.getElementById("intermission-body");
    const btnEl = document.getElementById("btn-intermission-next");
    if (!overlay) return;

    // 清理桌面杂物（罚单、所有印章墨痕、隐藏登机牌并复位印章盒）
    cleanAndSweepDesk();

    if (nightIndex === 1) {
        titleEl.textContent = "🌙 第 1 夜 · 暴雨交加";
        bodyEl.innerHTML = "窗外雷鸣阵阵，狂风肆虐着边检机场机坪。<br><br>清晨当你再次走入机场边检闸口时，发现——<b>客舱实时雷达硬件严重受损，彻底失去信号（SIGNAL LOST）！</b><br><br>今天你将无法直接俯瞰客舱座位，只能凭借登机牌与乘客当面陈述，在脑海中盲盒推演全机命运……";
        btnEl.textContent = "➔ 开启 DAY 2 盲盒执勤";
        
        btnEl.onclick = () => {
            overlay.classList.remove("active");
            if (typeof onContinue === "function") onContinue();
        };
    } else {
        // 第 2 夜：3 段式深层谍战真相大揭秘 (The Big Reveal)
        let step = 1;
        
        function renderStep(s) {
            if (s === 1) {
                titleEl.textContent = "🌙 第 2 夜 · 谍影破晓与特权真相 [1/3]";
                bodyEl.innerHTML = `
                    <i>风雨中，神秘人推开边检木门，再次站在你的窗口前。</i><br><br>
                    <b>[神秘人]</b> “两天了，检票员。在雷达瘫痪的盲盒里检票，滋味如何？”<br><br>
                    <b>[神秘人]</b> “你是不是一直以为……前两天的 1 号乘客只是‘不小心把登机牌弄丢了’的糊涂虫？收起天真吧。在帝国航空司，特权阶层一直在使用非法特许通票肆意挑座，受害平民被迫像多米诺骨牌一样互相抢座！”
                `;
                btnEl.textContent = "▼ 听神秘人揭晓终极使命 [1/3]";
            } else if (s === 2) {
                titleEl.textContent = "🌙 第 2 夜 · 谍影破晓与特权真相 [2/3]";
                bodyEl.innerHTML = `
                    <b>[神秘人]</b> “现在，我告诉你为什么我一直命令你确保【末位乘客】的安全——”<br><br>
                    <b>[神秘人]</b> “末位乘客并不是普通贵宾，而是我们潜伏在帝国核心的<b>【王牌特工】</b>！机尾最后一个座位底下，焊接着存放帝国最高机密的<b>【自毁黑匣】</b>！”<br><br>
                    <b>[神秘人]</b> “如果 1 号高官的特权击鼓传花抢了末位座，特工就无法解除自毁终端，全机的情报和撤离计划将当场覆灭！”
                `;
                btnEl.textContent = "▼ 接受高维特权透视芯片 [2/3]";
            } else if (s === 3) {
                titleEl.textContent = "🌙 第 2 夜 · 芯片破晓 · 决战前夕 [3/3]";
                bodyEl.innerHTML = `
                    <i>神秘人从风衣中取出一枚泛着幽蓝与金色微光的<b>【高维特权透视芯片】</b>递到你手中。</i><br><br>
                    <b>[神秘人]</b> “明天，真正的帝国特权高官（1号西装男）将手持至尊特权卡登机。把这枚芯片插进雷达卡槽——你将亲眼看清特权金线在人群中流转的致命轨迹。”<br><br>
                    <b>[神秘人]</b> “帝国情报网与特工的生死，全在你的印章之下。”
                `;
                btnEl.textContent = "➔ 接入芯片 · 开启 DAY 3 决战执勤";
            }
        }
        
        renderStep(1);
        
        btnEl.onclick = () => {
            if (step < 3) {
                step++;
                renderStep(step);
            } else {
                overlay.classList.remove("active");
                if (typeof onContinue === "function") onContinue();
            }
        };
    }

    overlay.classList.add("active");
}

/**
 * 清理打扫工作台：移除所有罚单、印章印痕、隐藏登机牌、复位印章盒
 */
function cleanAndSweepDesk() {
    // 1. 清除全桌面所有罚单
    document.querySelectorAll(".citation-paper").forEach(el => el.remove());

    // 2. 清除全桌面所有盖章印痕
    document.querySelectorAll(".stamped-mark").forEach(el => el.remove());

    // 3. 隐藏登机牌与竞猜表
    const bp = document.getElementById("boarding-pass");
    if (bp) bp.classList.add("hidden");
    const wn = document.getElementById("wager-note");
    if (wn) wn.classList.add("hidden");

    // 4. 印章盒复位到右上初始位置
    const stampBox = document.getElementById("stamp-box");
    if (stampBox) {
        stampBox.style.left = "";
        stampBox.style.top = "110px";
        stampBox.style.right = "28px";
    }
}
