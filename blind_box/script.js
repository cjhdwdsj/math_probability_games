/**
 * 盲盒收集大揭秘（趣味概率互动）脚本
 */

// ========================
// 1. 全局配置与状态
// ========================
const TOTAL_PAGES = 8;
let currentPage = 0;

const CHARACTERS = [
    { id: 1, name: "闪电小狐", icon: "🦊", color: "#f39c12" },
    { id: 2, name: "功夫阿宝", icon: "🐼", color: "#2c3e50" },
    { id: 3, name: "软萌泡泡", icon: "🐰", color: "#e84393" },
    { id: 4, name: "傲娇橘喵", icon: "🐱", color: "#e67e22" },
    { id: 5, name: "阳光柴柴", icon: "🐶", color: "#d35400" },
    { id: 6, name: "幻彩独角", icon: "🦄", color: "#9b59b6" }
];

const PRICE_PER_BOX = 69;

// 玩家抽盒状态
let gachaState = {
    draws: 0,
    collectedMap: {}, // id -> count
    isAnimating: false
};

// ========================
// 2. 初始化与页面导航
// ========================
document.addEventListener("DOMContentLoaded", () => {
    initAlbumGrid();
    updateNavigation();
    initKeyboardControls();
    recalcEV();
    initSimCanvas();
    updateLuckRank(14);
});

function goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) return;
    currentPage = pageIndex;

    const pages = document.querySelectorAll(".lesson-page");
    pages.forEach((page, idx) => {
        page.classList.remove("exit-left");
        if (idx === currentPage) {
            page.classList.add("active");
            page.setAttribute("aria-hidden", "false");
        } else {
            if (idx < currentPage) page.classList.add("exit-left");
            page.classList.remove("active");
            page.setAttribute("aria-hidden", "true");
        }
    });

    updateNavigation();

    // 当切换到模拟器页时，自动运行一次模拟绘制图表
    if (currentPage === 6) {
        setTimeout(runMonteCarloSim, 50);
    }
}

function nextPage() {
    if (currentPage < TOTAL_PAGES - 1) {
        goToPage(currentPage + 1);
    }
}

function prevPage() {
    if (currentPage > 0) {
        goToPage(currentPage - 1);
    }
}

function updateNavigation() {
    document.getElementById("current-page").textContent = currentPage + 1;
    document.getElementById("page-count").textContent = TOTAL_PAGES;

    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");

    btnPrev.disabled = (currentPage === 0);
    if (currentPage === TOTAL_PAGES - 1) {
        btnNext.textContent = "完成探索 🎉";
        btnNext.onclick = () => goToPage(0);
    } else {
        btnNext.innerHTML = '下一步 <span aria-hidden="true">→</span>';
        btnNext.onclick = nextPage;
    }
}

function initKeyboardControls() {
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
        if (e.key === "ArrowRight") nextPage();
        if (e.key === "ArrowLeft") prevPage();
    });
}

// ========================
// 3. 第 1 页：直觉预测
// ========================
function updateUserGuess(val) {
    document.getElementById("user-guess-display").textContent = val;
}

// ========================
// 4. 第 2 页：开箱抽卡机 (Gacha Lab)
// ========================
function initAlbumGrid() {
    const grid = document.getElementById("album-grid");
    if (!grid) return;
    grid.innerHTML = "";

    CHARACTERS.forEach(char => {
        const item = document.createElement("div");
        item.className = "album-item";
        item.id = `album-item-${char.id}`;
        item.innerHTML = `
            <div class="item-avatar">${char.icon}</div>
            <div class="item-name">${char.name}</div>
            <div class="item-count-badge" id="badge-${char.id}">0</div>
        `;
        grid.appendChild(item);
    });

    gachaState = {
        draws: 0,
        collectedMap: {},
        isAnimating: false
    };
    updateGachaUI();
}

// 单抽逻辑
function drawSingle() {
    if (gachaState.isAnimating) return;
    gachaState.isAnimating = true;

    hideMultiTray();

    const box = document.getElementById("mystery-box");
    const card = document.getElementById("reveal-card");
    const icon = document.getElementById("reveal-icon");
    const name = document.getElementById("reveal-name");
    const badge = document.getElementById("reveal-badge");

    const randomIdx = Math.floor(Math.random() * CHARACTERS.length);
    const chosen = CHARACTERS[randomIdx];

    // 1. 摇盒动画
    box.style.display = "flex";
    box.classList.add("shaking");
    card.classList.remove("popping");

    setTimeout(() => {
        box.classList.remove("shaking");

        const isNew = !gachaState.collectedMap[chosen.id];
        gachaState.draws++;
        gachaState.collectedMap[chosen.id] = (gachaState.collectedMap[chosen.id] || 0) + 1;

        // 2. 弹出揭晓卡
        icon.textContent = chosen.icon;
        name.textContent = chosen.name;
        if (isNew) {
            badge.className = "reveal-badge new";
            badge.textContent = "NEW! 全新点亮";
        } else {
            badge.className = "reveal-badge dup";
            badge.textContent = `重复 (已有 ${gachaState.collectedMap[chosen.id]} 个)`;
        }
        card.classList.add("popping");

        // 3. 刷新图鉴
        updateGachaUI(chosen.id, isNew);
        checkCompletion();
        gachaState.isAnimating = false;
    }, 450);
}

// 爽快五连抽逻辑（依次连环弹出 5 张卡片）
function drawMultipleAnimated(count = 5) {
    if (gachaState.isAnimating) return;
    gachaState.isAnimating = true;

    const box = document.getElementById("mystery-box");
    const card = document.getElementById("reveal-card");
    const tray = document.getElementById("multi-reveal-tray");

    box.style.display = "none";
    card.classList.remove("popping");
    tray.classList.add("show");
    tray.innerHTML = "";

    const results = [];
    for (let i = 0; i < count; i++) {
        const rand = Math.floor(Math.random() * CHARACTERS.length);
        const char = CHARACTERS[rand];
        const isNew = !gachaState.collectedMap[char.id];
        gachaState.draws++;
        gachaState.collectedMap[char.id] = (gachaState.collectedMap[char.id] || 0) + 1;
        results.push({ char, isNew });
    }

    results.forEach((res, idx) => {
        const mini = document.createElement("div");
        mini.className = "mini-reveal-card";
        mini.innerHTML = `
            <div class="mini-icon">${res.char.icon}</div>
            <div class="mini-name">${res.char.name}</div>
            <div class="mini-status ${res.isNew ? 'new' : 'dup'}">${res.isNew ? 'NEW!' : '重复'}</div>
        `;
        tray.appendChild(mini);

        setTimeout(() => {
            mini.classList.add("popped");
            updateGachaUI(res.char.id, res.isNew);
        }, idx * 120 + 80);
    });

    setTimeout(() => {
        checkCompletion();
        gachaState.isAnimating = false;
    }, count * 120 + 200);
}

// 一键抽到齐
function drawUntilCompleteAnimated() {
    if (gachaState.isAnimating) return;
    if (Object.keys(gachaState.collectedMap).length >= CHARACTERS.length) {
        resetGacha();
    }
    gachaState.isAnimating = true;
    hideMultiTray();

    const box = document.getElementById("mystery-box");
    const card = document.getElementById("reveal-card");
    box.style.display = "flex";
    card.classList.remove("popping");

    const timer = setInterval(() => {
        if (Object.keys(gachaState.collectedMap).length >= CHARACTERS.length || gachaState.draws >= 100) {
            clearInterval(timer);
            gachaState.isAnimating = false;
            updateGachaUI();
            checkCompletion();
            return;
        }

        const rand = Math.floor(Math.random() * CHARACTERS.length);
        const char = CHARACTERS[rand];
        const isNew = !gachaState.collectedMap[char.id];
        gachaState.draws++;
        gachaState.collectedMap[char.id] = (gachaState.collectedMap[char.id] || 0) + 1;
        updateGachaUI(char.id, isNew);
    }, 45);
}

function hideMultiTray() {
    const tray = document.getElementById("multi-reveal-tray");
    if (tray) {
        tray.classList.remove("show");
        tray.innerHTML = "";
    }
}

function updateGachaUI(lastChoseId = null, isNew = false) {
    const totalCollected = Object.keys(gachaState.collectedMap).length;
    document.getElementById("collected-count").textContent = totalCollected;
    document.getElementById("stat-total-draws").textContent = gachaState.draws;
    document.getElementById("stat-total-cost").textContent = (gachaState.draws * PRICE_PER_BOX).toLocaleString();

    let dupCount = Math.max(0, gachaState.draws - totalCollected);
    document.getElementById("stat-dup-count").textContent = dupCount;

    CHARACTERS.forEach(char => {
        const item = document.getElementById(`album-item-${char.id}`);
        const count = gachaState.collectedMap[char.id] || 0;
        const badge = document.getElementById(`badge-${char.id}`);

        if (count > 0) {
            item.classList.add("collected");
            if (count > 1) {
                item.classList.add("has-dup");
                badge.textContent = `×${count}`;
            } else {
                item.classList.remove("has-dup");
            }
        } else {
            item.classList.remove("collected", "has-dup");
        }
    });

    if (lastChoseId && isNew) {
        const justFoundItem = document.getElementById(`album-item-${lastChoseId}`);
        if (justFoundItem) {
            justFoundItem.classList.add("just-found");
            setTimeout(() => justFoundItem.classList.remove("just-found"), 600);
        }
    }
}

function checkCompletion() {
    const totalCollected = Object.keys(gachaState.collectedMap).length;
    const banner = document.getElementById("gacha-complete-banner");
    const evalText = document.getElementById("gacha-eval-text");

    if (totalCollected >= CHARACTERS.length) {
        banner.style.display = "block";
        const d = gachaState.draws;
        if (d <= 8) {
            evalText.innerHTML = `总共仅用了 <strong>${d} 次</strong>！这运气简直是天选欧皇！🌟`;
        } else if (d <= 15) {
            evalText.innerHTML = `用了 <strong>${d} 次</strong>（花费 ¥${d*PRICE_PER_BOX}），属于标准正常运气！👍`;
        } else {
            evalText.innerHTML = `用了整整 <strong>${d} 次</strong>（花费 ¥${d*PRICE_PER_BOX}）！遭遇了残酷的非酋时刻！😭`;
        }
    } else {
        banner.style.display = "none";
    }
}

function resetGacha() {
    gachaState = {
        draws: 0,
        collectedMap: {},
        isAnimating: false
    };
    hideMultiTray();
    const box = document.getElementById("mystery-box");
    const card = document.getElementById("reveal-card");
    const banner = document.getElementById("gacha-complete-banner");
    if (box) box.style.display = "flex";
    if (card) card.classList.remove("popping");
    if (banner) banner.style.display = "none";
    updateGachaUI();
}

// ========================
// 5. 第 5 页：欧气段位测算器
// ========================
function updateLuckRank(val) {
    const draws = parseInt(val, 10);
    const text = document.getElementById("rank-draws-text");
    const badge = document.getElementById("luck-rank-badge");
    if (!text || !badge) return;

    text.textContent = `${draws} 次`;

    if (draws === 6) {
        badge.textContent = "段位：天选神王 👑 (1.5%)";
        badge.style.color = "#d48806";
        badge.style.borderColor = "#d48806";
        badge.style.background = "rgba(247, 200, 75, 0.2)";
    } else if (draws <= 9) {
        badge.textContent = "段位：幸运欧皇 ✨ (前15%)";
        badge.style.color = "#27ae60";
        badge.style.borderColor = "#27ae60";
        badge.style.background = "rgba(39, 174, 96, 0.1)";
    } else if (draws <= 16) {
        badge.textContent = "段位：普通凡人 😐 (正常均值)";
        badge.style.color = "var(--ink)";
        badge.style.borderColor = "var(--line)";
        badge.style.background = "rgba(47, 42, 37, 0.06)";
    } else if (draws <= 23) {
        badge.textContent = "段位：轻度非酋 🌧️ (后20%)";
        badge.style.color = "var(--coral)";
        badge.style.borderColor = "var(--coral)";
        badge.style.background = "rgba(233, 110, 86, 0.1)";
    } else {
        badge.textContent = "段位：至尊大冤种 😭 (后7%)";
        badge.style.color = "var(--purple)";
        badge.style.borderColor = "var(--purple)";
        badge.style.background = "rgba(154, 107, 199, 0.15)";
    }
}

// ========================
// 6. 第 6 页：隐藏款 SSR 机制
// ========================
function updateSsrCalculation(ssrRate) {
    const rate = parseInt(ssrRate, 10);
    const costDisp = document.getElementById("ssr-cost-display");
    const drawsDisp = document.getElementById("ssr-draws-display");

    if (rate === 0) {
        costDisp.textContent = "¥ 1,014";
        drawsDisp.textContent = "平均抽 14.7 次（无隐藏款）";
    } else if (rate === 72) {
        costDisp.textContent = "¥ 4,968";
        drawsDisp.textContent = "平均需要买 72 个 (1/72 隐藏款)！";
    } else if (rate === 144) {
        costDisp.textContent = "¥ 9,936";
        drawsDisp.textContent = "平均需要买 144 个 (1/144 超级隐藏)！";
    }
}

// ========================
// 7. 第 7 页：蒙特卡洛大规模模拟引擎
// ========================
function initSimCanvas() {
    const canvas = document.getElementById("sim-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function runMonteCarloSim() {
    const nSelect = document.getElementById("sim-n-select");
    const trialsSelect = document.getElementById("sim-trials-select");
    if (!nSelect || !trialsSelect) return;

    const N = parseInt(nSelect.value, 10);
    const trials = parseInt(trialsSelect.value, 10);

    let harmonicN = 0;
    for (let i = 1; i <= N; i++) harmonicN += 1 / i;
    const theoryMean = N * harmonicN;
    document.getElementById("sim-theory-result").textContent = theoryMean.toFixed(2);

    const results = new Array(trials);
    let totalDrawsSum = 0;
    let minDraws = Infinity;
    let maxDraws = -Infinity;

    for (let t = 0; t < trials; t++) {
        let collectedCount = 0;
        let draws = 0;
        const mask = new Uint8Array(N);

        while (collectedCount < N) {
            draws++;
            const rand = (Math.random() * N) | 0;
            if (mask[rand] === 0) {
                mask[rand] = 1;
                collectedCount++;
            }
        }

        results[t] = draws;
        totalDrawsSum += draws;
        if (draws < minDraws) minDraws = draws;
        if (draws > maxDraws) maxDraws = draws;
    }

    const simMean = totalDrawsSum / trials;
    document.getElementById("sim-avg-result").textContent = simMean.toFixed(2);
    document.getElementById("sim-min-result").textContent = minDraws;
    document.getElementById("sim-max-result").textContent = maxDraws;

    drawHistogram(results, N, theoryMean, simMean, minDraws, maxDraws);
}

function drawHistogram(results, N, theoryMean, simMean, minDraws, maxDraws) {
    const canvas = document.getElementById("sim-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const bucketMax = Math.min(maxDraws, Math.max(36, N * 4));
    const bins = new Array(bucketMax + 1).fill(0);
    for (let i = 0; i < results.length; i++) {
        const val = results[i];
        if (val <= bucketMax) {
            bins[val]++;
        } else {
            bins[bucketMax]++;
        }
    }

    const maxFrequency = Math.max(...bins);
    const paddingLeft = 40;
    const paddingBottom = 22;
    const paddingTop = 18;
    const paddingRight = 15;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const startX = N;
    const totalBins = bucketMax - startX + 1;
    const barWidth = Math.max(2, (plotWidth / totalBins) - 1.5);

    ctx.strokeStyle = "rgba(47, 42, 37, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
        const y = paddingTop + (plotHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
    }

    for (let d = startX; d <= bucketMax; d++) {
        const freq = bins[d] || 0;
        const barH = (freq / maxFrequency) * plotHeight;
        const x = paddingLeft + (d - startX) * (plotWidth / totalBins);
        const y = height - paddingBottom - barH;

        if (d <= N + 1) {
            ctx.fillStyle = "#f7c84b";
        } else if (d > theoryMean * 1.4) {
            ctx.fillStyle = "#9a6bc7";
        } else {
            ctx.fillStyle = "#5aabd9";
        }

        ctx.fillRect(x, y, barWidth, barH);
    }

    const theoryX = paddingLeft + (theoryMean - startX) * (plotWidth / totalBins);
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "#e96e56";
    ctx.lineWidth = 2;
    ctx.moveTo(theoryX, paddingTop);
    ctx.lineTo(theoryX, height - paddingBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#e96e56";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(`平均值 ${theoryMean.toFixed(1)} 次`, theoryX + 4, paddingTop + 10);

    ctx.strokeStyle = "rgba(47, 42, 37, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(width - paddingRight, height - paddingBottom);
    ctx.stroke();

    ctx.fillStyle = "#6e665e";
    ctx.font = "10px sans-serif";
    ctx.fillText(`最少 ${N} 次`, paddingLeft, height - 6);
    ctx.fillText(`${bucketMax}+ 次 (非酋长尾)`, width - paddingRight - 90, height - 6);
}

// ========================
// 8. 第 8 页：商业定价期望收益 EV 计算器
// ========================
function recalcEV() {
    const priceInput = document.getElementById("ev-price");
    const rewardInput = document.getElementById("ev-reward");
    if (!priceInput || !rewardInput) return;

    const price = parseFloat(priceInput.value) || 0;
    const reward = parseFloat(rewardInput.value) || 0;

    const expectedDraws = 14.7;
    const expectedCost = expectedDraws * price;
    const expectedValue = reward - expectedCost;

    const badge = document.getElementById("ev-badge");
    const valElem = document.getElementById("ev-val");
    const tipElem = document.getElementById("ev-tip");

    if (expectedValue < 0) {
        badge.className = "ev-result-badge negative";
        valElem.style.color = "var(--coral)";
        valElem.textContent = `- ¥ ${Math.abs(expectedValue).toFixed(2)}`;
        tipElem.textContent = `平均每玩一轮玩家净亏损 ${Math.abs(expectedValue).toFixed(1)} 元！商家稳赚。`;
    } else {
        badge.className = "ev-result-badge";
        valElem.style.color = "var(--leaf)";
        valElem.textContent = `+ ¥ ${expectedValue.toFixed(2)}`;
        tipElem.textContent = `玩家净收益为正，这属于商家倒贴的良心活动。`;
    }
}
