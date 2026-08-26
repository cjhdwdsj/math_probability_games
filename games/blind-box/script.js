/**
 * 盲盒收集问题（Coupon Collector's Problem）渐进式互动脚本
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
});

function goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) return;
    currentPage = pageIndex;

    const pages = document.querySelectorAll(".lesson-page");
    pages.forEach((page, idx) => {
        if (idx === currentPage) {
            page.classList.add("active");
            page.setAttribute("aria-hidden", "false");
        } else {
            page.classList.remove("active");
            page.setAttribute("aria-hidden", "true");
        }
    });

    updateNavigation();

    // 当切换到模拟器页时，如果未运行过则自动运行一次初始化图表
    if (currentPage === 6) {
        setTimeout(runMonteCarloSim, 100);
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

    // 自动滚动到顶部
    const stage = document.querySelector(".lesson-stage");
    if (stage) stage.scrollTop = 0;
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

function drawSingle() {
    if (gachaState.isAnimating) return;
    gachaState.isAnimating = true;

    const box = document.getElementById("mystery-box");
    const card = document.getElementById("reveal-card");
    const icon = document.getElementById("reveal-icon");
    const name = document.getElementById("reveal-name");
    const badge = document.getElementById("reveal-badge");

    // 随机抽一个角色
    const randomIdx = Math.floor(Math.random() * CHARACTERS.length);
    const chosen = CHARACTERS[randomIdx];

    // 1. 摇晃盒子动画
    box.classList.add("shaking");
    card.classList.remove("popping");

    setTimeout(() => {
        box.classList.remove("shaking");

        // 2. 统计更新
        const isNew = !gachaState.collectedMap[chosen.id];
        gachaState.draws++;
        gachaState.collectedMap[chosen.id] = (gachaState.collectedMap[chosen.id] || 0) + 1;

        // 3. 展示揭晓卡
        icon.textContent = chosen.icon;
        name.textContent = chosen.name;
        if (isNew) {
            badge.className = "reveal-badge new";
            badge.textContent = "NEW! 全新点亮";
        } else {
            badge.className = "reveal-badge dup";
            badge.textContent = `重复 (第 ${gachaState.collectedMap[chosen.id]} 个)`;
        }
        card.classList.add("popping");

        // 4. 刷新图鉴与数据
        updateGachaUI(chosen.id, isNew);
        gachaState.isAnimating = false;
    }, 600);
}

function drawMultiple(count) {
    if (gachaState.isAnimating) return;
    for (let i = 0; i < count; i++) {
        const randomIdx = Math.floor(Math.random() * CHARACTERS.length);
        const chosen = CHARACTERS[randomIdx];
        gachaState.draws++;
        gachaState.collectedMap[chosen.id] = (gachaState.collectedMap[chosen.id] || 0) + 1;
    }
    updateGachaUI();
}

function drawUntilComplete() {
    if (gachaState.isAnimating) return;
    let safetyCounter = 0;
    while (Object.keys(gachaState.collectedMap).length < CHARACTERS.length && safetyCounter < 1000) {
        const randomIdx = Math.floor(Math.random() * CHARACTERS.length);
        const chosen = CHARACTERS[randomIdx];
        gachaState.draws++;
        gachaState.collectedMap[chosen.id] = (gachaState.collectedMap[chosen.id] || 0) + 1;
        safetyCounter++;
    }
    updateGachaUI();
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
        justFoundItem.classList.add("just-found");
        setTimeout(() => justFoundItem.classList.remove("just-found"), 800);
    }
}

function resetGacha() {
    gachaState = {
        draws: 0,
        collectedMap: {},
        isAnimating: false
    };
    const card = document.getElementById("reveal-card");
    if (card) card.classList.remove("popping");
    updateGachaUI();
}

// ========================
// 5. 第 6 页：隐藏款 SSR 机制
// ========================
function updateSsrCalculation(ssrRate) {
    const rate = parseInt(ssrRate, 10);
    const costDisp = document.getElementById("ssr-cost-display");
    const drawsDisp = document.getElementById("ssr-draws-display");

    if (rate === 0) {
        costDisp.textContent = "¥ 1,014";
        drawsDisp.textContent = "平均 14.7 次（无隐藏款）";
    } else if (rate === 72) {
        costDisp.textContent = "¥ 4,968";
        drawsDisp.textContent = "平均需要 72 次 (1/72 隐藏款)！";
    } else if (rate === 144) {
        costDisp.textContent = "¥ 9,936";
        drawsDisp.textContent = "平均需要 144 次 (1/144 超级隐藏)！";
    }
}

// ========================
// 6. 第 7 页：蒙特卡洛大规模模拟引擎
// ========================
let lastSimResults = null;

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

    // 计算理论值 N * H_N
    let harmonicN = 0;
    for (let i = 1; i <= N; i++) harmonicN += 1 / i;
    const theoryMean = N * harmonicN;
    document.getElementById("sim-theory-result").textContent = theoryMean.toFixed(2);

    // 运行快速模拟
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

    // 绘制直方图
    drawHistogram(results, N, theoryMean, simMean, minDraws, maxDraws);
}

function drawHistogram(results, N, theoryMean, simMean, minDraws, maxDraws) {
    const canvas = document.getElementById("sim-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 统计频数
    const bucketMax = Math.min(maxDraws, Math.max(40, N * 5));
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
    const paddingLeft = 45;
    const paddingBottom = 30;
    const paddingTop = 25;
    const paddingRight = 20;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const startX = N; // 最小抽齐次数必为 N
    const totalBins = bucketMax - startX + 1;
    const barWidth = Math.max(3, (plotWidth / totalBins) - 2);

    // 1. 绘制网格背景
    ctx.strokeStyle = "rgba(47, 42, 37, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = paddingTop + (plotHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
    }

    // 2. 绘制每个频数柱子
    for (let d = startX; d <= bucketMax; d++) {
        const freq = bins[d] || 0;
        const barH = (freq / maxFrequency) * plotHeight;
        const x = paddingLeft + (d - startX) * (plotWidth / totalBins);
        const y = height - paddingBottom - barH;

        // 颜色渐变：欧皇金 -> 普通蓝 -> 非酋紫
        if (d <= N + 2) {
            ctx.fillStyle = "#f7c84b"; // 欧皇
        } else if (d > theoryMean * 1.5) {
            ctx.fillStyle = "#9a6bc7"; // 非酋
        } else {
            ctx.fillStyle = "#5aabd9"; // 普通
        }

        ctx.fillRect(x, y, barWidth, barH);
        ctx.strokeStyle = "rgba(47, 42, 37, 0.4)";
        ctx.strokeRect(x, y, barWidth, barH);
    }

    // 3. 绘制理论期望线 (红虚线)
    const theoryX = paddingLeft + (theoryMean - startX) * (plotWidth / totalBins);
    ctx.beginPath();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "#e96e56";
    ctx.lineWidth = 2.5;
    ctx.moveTo(theoryX, paddingTop);
    ctx.lineTo(theoryX, height - paddingBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // 理论文字标签
    ctx.fillStyle = "#e96e56";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`理论期望 E = ${theoryMean.toFixed(1)}`, theoryX + 6, paddingTop + 15);

    // 4. 坐标轴与刻度
    ctx.strokeStyle = "rgba(47, 42, 37, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(width - paddingRight, height - paddingBottom);
    ctx.stroke();

    ctx.fillStyle = "#6e665e";
    ctx.font = "11px sans-serif";
    ctx.fillText(`最小 ${N} 次`, paddingLeft, height - 10);
    ctx.fillText(`${bucketMax}+ 次 (长尾非酋)`, width - paddingRight - 110, height - 10);
}

// ========================
// 7. 第 8 页：商业定价期望收益 EV 计算器
// ========================
function recalcEV() {
    const priceInput = document.getElementById("ev-price");
    const rewardInput = document.getElementById("ev-reward");
    if (!priceInput || !rewardInput) return;

    const price = parseFloat(priceInput.value) || 0;
    const reward = parseFloat(rewardInput.value) || 0;

    // 6 款基础款期望 14.7 次
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
        tipElem.textContent = `平均每玩一轮玩家亏损 ${Math.abs(expectedValue).toFixed(1)} 元！商家期望收益为正。`;
    } else {
        badge.className = "ev-result-badge";
        valElem.style.color = "var(--leaf)";
        valElem.textContent = `+ ¥ ${expectedValue.toFixed(2)}`;
        tipElem.textContent = `玩家期望收益为正！这属于良心福利或羊毛活动。`;
    }
}
