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
        bodyEl.innerHTML = "窗外雷鸣阵阵，狂风肆虐着边检哨所。<br><br>清晨当你再次走入哨所时，发现——<b>客舱实时雷达硬件严重受损，彻底失去信号（SIGNAL LOST）！</b><br><br>今天你将无法直接俯瞰客舱座位，只能凭借登机牌与乘客当面陈述，在脑海中盲盒推演全机命运……";
        btnEl.textContent = "➔ 开启 DAY 2 盲盒执勤";
    } else {
        titleEl.textContent = "🌙 第 2 夜 · 芯片与破晓";
        bodyEl.innerHTML = "神秘人深夜再次来到你的窗口。<br><br><i>“在完全看不见客舱盲盒的情况下，你觉得无论座位扩大到 100 人还是 1000 人，最后一位 VIP 坐到自己座位的概率是多少？它和座位总数到底有没有关系？”</i><br><br>神秘人递给你一块<b>【高维透视升级芯片】</b>。<br><br>你将芯片插入雷达卡槽——客舱不再是黑盒，金色的特权轨迹在眼前彻底连通！你的检票工作变得截然不同了。";
        btnEl.textContent = "➔ 开启 DAY 3 特权透视执勤";
    }

    overlay.classList.add("active");

    btnEl.onclick = () => {
        overlay.classList.remove("active");
        if (typeof onContinue === "function") {
            onContinue();
        }
    };
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
