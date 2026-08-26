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

const SSR_RATES = [
    { denom: 24, label: "1/24 (微型隐藏)" },
    { denom: 36, label: "1/36 (小隐藏)" },
    { denom: 72, label: "1/72 (普通隐藏)" },
    { denom: 96, label: "1/96 (较难隐藏)" },
    { denom: 144, label: "1/144 (超级大隐藏)" },
    { denom: 288, label: "1/288 (至尊典藏)" }
];

// 玩家抽盒状态
let gachaState = {
    draws: 0,
    collectedMap: {},
    isAnimating: false
};

// 第 4 页动画状态
let currentHarmonicN = 6;
let harmonicTimers = [];

// 模拟器缓存数据
let simCache = null;
let animProgress = 1;
let animFrameId = null;

// ========================
// 2. 初始化与页面导航
// ========================
document.addEventListener("DOMContentLoaded", () => {
    initAlbumGrid();
    updateNavigation();
    initKeyboardControls();
    initSimCanvasListeners();
    updateLuckRank(14);
    updateSsrFromSliders();
    updateEVFromSliders();
    animateHarmonicPage(6);

    window.addEventListener("resize", () => {
        if (currentPage === 6 && simCache) {
            renderHistogram(1);
        }
    });
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

    // 页面专属进入动画触发
    if (currentPage === 3) {
        setTimeout(() => animateHarmonicPage(currentHarmonicN), 80);
    }

    if (currentPage === 6) {
        setTimeout(runMonteCarloSim, 80);
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

    box.style.display = "flex";
    box.classList.add("shaking");
    card.classList.remove("popping");

    setTimeout(() => {
        box.classList.remove("shaking");

        const isNew = !gachaState.collectedMap[chosen.id];
        gachaState.draws++;
        gachaState.collectedMap[chosen.id] = (gachaState.collectedMap[chosen.id] || 0) + 1;

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

        updateGachaUI(chosen.id, isNew);
        checkCompletion();
        gachaState.isAnimating = false;
    }, 450);
}

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
// 5. 第 4 页：大白话求和与柱状图逐级累加动画
// ========================
function replayHarmonicAnimation() {
    animateHarmonicPage(currentHarmonicN);
}

function animateHarmonicPage(N = 6) {
    currentHarmonicN = N;

    // 清除旧定时器
    harmonicTimers.forEach(t => clearTimeout(t));
    harmonicTimers = [];

    // 更新预设按钮状态
    [6, 8, 12].forEach(num => {
        const btn = document.getElementById(`h-btn-${num}`);
        if (btn) {
            if (num === N) btn.classList.add("active");
            else btn.classList.remove("active");
        }
    });

    const titleElem = document.getElementById("harmonic-calc-title");
    if (titleElem) titleElem.textContent = `集齐一套 ${N} 款盲盒的真实买法：`;

    const stepsWrap = document.getElementById("harmonic-steps-wrap");
    const barsWrap = document.getElementById("harmonic-bars-wrap");
    const tipText = document.getElementById("harmonic-tip-text");
    if (!stepsWrap || !barsWrap) return;

    // 计算各阶段理论期望 E_k = N / (N - k + 1)
    const stepValues = [];
    let totalExpectation = 0;
    for (let k = 1; k <= N; k++) {
        const val = N / (N - k + 1);
        stepValues.push({ k, val });
        totalExpectation += val;
    }

    const maxVal = stepValues[stepValues.length - 1].val; // N.0 次

    // 1. 构建 HTML 骨架（初始隐藏状态）
    stepsWrap.innerHTML = "";
    stepValues.forEach((step, idx) => {
        const isLast = (idx === stepValues.length - 1);
        const pill = document.createElement("span");
        pill.className = `plain-pill ${isLast ? 'last-pill' : ''}`;
        pill.id = `hpill-${step.k}`;
        pill.textContent = isLast ? `最后1只: ${step.val.toFixed(1)}次` : `第${step.k}只: ${step.val.toFixed(1)}次`;
        stepsWrap.appendChild(pill);

        if (!isLast) {
            const plus = document.createElement("span");
            plus.textContent = "+";
            plus.style.opacity = "0.5";
            stepsWrap.appendChild(plus);
        }
    });

    const sumPill = document.createElement("span");
    sumPill.id = "harmonic-sum-display";
    sumPill.className = "harmonic-sum-pill";
    sumPill.textContent = `= ${totalExpectation.toFixed(1)} 次！`;
    stepsWrap.appendChild(sumPill);

    barsWrap.innerHTML = "";
    stepValues.forEach((step, idx) => {
        const isLast = (idx === stepValues.length - 1);
        const cont = document.createElement("div");
        cont.className = "h-bar-container";
        cont.id = `hbar-cont-${step.k}`;

        const valTag = document.createElement("div");
        valTag.className = "h-bar-val";
        valTag.id = `hbar-val-${step.k}`;
        valTag.textContent = `${step.val.toFixed(1)}` + (isLast ? " 🔥" : "");

        const bar = document.createElement("div");
        bar.className = `h-bar ${isLast ? 'last-bar' : ''}`;
        bar.id = `hbar-${step.k}`;

        const label = document.createElement("div");
        label.className = "h-bar-label";
        label.textContent = isLast ? "最后1只" : `第${step.k}只`;

        cont.appendChild(valTag);
        cont.appendChild(bar);
        cont.appendChild(label);
        barsWrap.appendChild(cont);
    });

    // 动态提示文案
    if (tipText) {
        if (N === 6) {
            tipText.innerHTML = `柱子高度直观展示：越到后面越难抽，最后一只（需买 <strong>6 次</strong>）的难度等于前面所有阶段的总和！`;
        } else if (N === 8) {
            tipText.innerHTML = `8 款一套时，最后一只平均需要抽 <strong>8 次</strong>，总共需要买 <strong>21.7 次</strong>！`;
        } else {
            tipText.innerHTML = `12 款大套时，最后一只平均需要买整整 <strong>12 次</strong>，总共需要抽 <strong>37.2 次</strong>（花费 ¥2,567）！`;
        }
    }

    // 2. 依次逐级执行动画（Staggered Animation）
    const stepDelay = Math.max(90, Math.min(160, 900 / N));

    stepValues.forEach((step, idx) => {
        const timer = setTimeout(() => {
            const pill = document.getElementById(`hpill-${step.k}`);
            const bar = document.getElementById(`hbar-${step.k}`);
            const valTag = document.getElementById(`hbar-val-${step.k}`);
            const cont = document.getElementById(`hbar-cont-${step.k}`);

            if (pill) pill.classList.add("show");
            if (valTag) valTag.classList.add("show");
            if (bar) {
                const targetH = Math.max(14, (step.val / maxVal) * 90);
                bar.style.height = `${targetH}px`;
            }
            if (idx === stepValues.length - 1 && cont) {
                cont.classList.add("highlight-last");
            }
        }, idx * stepDelay + 60);
        harmonicTimers.push(timer);
    });

    // 最后一棒：显示总和与爆发徽章
    const finalTimer = setTimeout(() => {
        const sumDisplay = document.getElementById("harmonic-sum-display");
        if (sumDisplay) sumDisplay.classList.add("show");
    }, stepValues.length * stepDelay + 140);
    harmonicTimers.push(finalTimer);
}

// ========================
// 6. 第 5 页：欧气段位测算器
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
// 7. 第 6 页：隐藏款 SSR 机制（滑块实时测算）
// ========================
function updateSsrFromSliders() {
    const nSlider = document.getElementById("ssr-n-slider");
    const rateSlider = document.getElementById("ssr-rate-slider");
    if (!nSlider || !rateSlider) return;

    const N = parseInt(nSlider.value, 10);
    const rateIdx = parseInt(rateSlider.value, 10) - 1;
    const ssrInfo = SSR_RATES[rateIdx] || SSR_RATES[2];

    document.getElementById("ssr-n-badge").textContent = `${N} 款一套`;
    document.getElementById("ssr-rate-badge").textContent = ssrInfo.label;

    // 隐藏款概率计算
    const ssrDenom = ssrInfo.denom;
    const ssrProbPct = (1 / ssrDenom) * 100;
    const regularTotalPct = (1 - 1 / ssrDenom) * 100;
    const singleRegularPct = regularTotalPct / N;

    const regularProbElem = document.getElementById("ssr-regular-prob");
    const singleRegularElem = document.getElementById("ssr-single-regular-prob");
    const ssrProbElem = document.getElementById("ssr-prob");
    const ssrFractionElem = document.getElementById("ssr-fraction-display");

    if (regularProbElem) regularProbElem.textContent = `${regularTotalPct.toFixed(2)}%`;
    if (singleRegularElem) singleRegularElem.textContent = `${singleRegularPct.toFixed(1)}%`;
    if (ssrProbElem) ssrProbElem.textContent = `${ssrProbPct.toFixed(2)}%`;
    if (ssrFractionElem) ssrFractionElem.textContent = `1/${ssrDenom}`;

    // 基础全套期望
    let harmonicN = 0;
    for (let i = 1; i <= N; i++) harmonicN += 1 / i;
    const regularDraws = N * harmonicN;
    const regularCost = regularDraws * PRICE_PER_BOX;

    // 隐藏款期望
    const ssrDraws = ssrDenom;
    const ssrCost = ssrDraws * PRICE_PER_BOX;
    const ratio = (ssrDraws / regularDraws).toFixed(1);

    document.getElementById("ssr-regular-cost").textContent = `¥ ${Math.round(regularCost).toLocaleString()}`;
    document.getElementById("ssr-regular-draws").textContent = `普通全套平均抽 ${regularDraws.toFixed(1)} 次`;

    document.getElementById("ssr-cost-display").textContent = `¥ ${Math.round(ssrCost).toLocaleString()}`;
    document.getElementById("ssr-draws-display").textContent = `平均需要买 ${ssrDraws} 个！`;

    document.getElementById("ssr-ratio-display").textContent = `${ratio} 倍`;
}

// ========================
// 8. 第 7 页：高清动态直方图模拟引擎
// ========================
let hoveredBinIndex = -1;

function initSimCanvasListeners() {
    const canvas = document.getElementById("sim-canvas");
    const tooltip = document.getElementById("chart-tooltip");
    if (!canvas || !tooltip) return;

    canvas.addEventListener("mousemove", (e) => {
        if (!simCache) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const { N, bucketMax, plotWidth, paddingLeft, totalBins } = simCache.layout;
        const binStep = plotWidth / totalBins;
        const relX = mouseX - paddingLeft;

        if (relX >= 0 && relX <= plotWidth) {
            const binIdx = Math.floor(relX / binStep) + N;
            if (binIdx >= N && binIdx <= bucketMax) {
                hoveredBinIndex = binIdx;
                const count = simCache.bins[binIdx] || 0;
                const pct = ((count / simCache.trials) * 100).toFixed(2);
                tooltip.style.display = "block";
                tooltip.style.left = `${mouseX}px`;
                tooltip.style.top = `${mouseY}px`;
                tooltip.innerHTML = `🎯 抽 <strong>${binIdx}</strong> 次集齐: <strong>${count}</strong> 人 (占比 <strong>${pct}%</strong>)`;
                renderHistogram(1);
                return;
            }
        }
        hideTooltip();
    });

    canvas.addEventListener("mouseleave", hideTooltip);
}

function hideTooltip() {
    const tooltip = document.getElementById("chart-tooltip");
    if (tooltip) tooltip.style.display = "none";
    if (hoveredBinIndex !== -1) {
        hoveredBinIndex = -1;
        renderHistogram(1);
    }
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

    const sorted = results.slice().sort((a, b) => a - b);
    const p99 = sorted[Math.floor(trials * 0.995)];
    const bucketMax = Math.min(maxDraws, Math.max(p99, Math.ceil(theoryMean * 2.2)));

    const bins = new Array(maxDraws + 1).fill(0);
    for (let i = 0; i < results.length; i++) {
        bins[results[i]]++;
    }

    let maxFrequency = 0;
    for (let d = N; d <= bucketMax; d++) {
        if (bins[d] > maxFrequency) maxFrequency = bins[d];
    }
    if (maxFrequency === 0) maxFrequency = 1;

    simCache = {
        results,
        N,
        theoryMean,
        simMean,
        minDraws,
        maxDraws,
        bucketMax,
        bins,
        maxFrequency,
        trials,
        layout: {}
    };

    // 触发平滑生长动画
    if (animFrameId) cancelAnimationFrame(animFrameId);
    let startTime = null;
    const duration = 300;

    function animateChart(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        renderHistogram(ease);

        if (progress < 1) {
            animFrameId = requestAnimationFrame(animateChart);
        } else {
            animFrameId = null;
        }
    }

    animFrameId = requestAnimationFrame(animateChart);
}

function renderHistogram(progress = 1) {
    if (!simCache) return;
    const canvas = document.getElementById("sim-canvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || 700;
    const cssHeight = 145;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const { N, theoryMean, simMean, bucketMax, bins, maxFrequency, trials } = simCache;

    const paddingLeft = 44;
    const paddingBottom = 26;
    const paddingTop = 20;
    const paddingRight = 20;

    const plotWidth = cssWidth - paddingLeft - paddingRight;
    const plotHeight = cssHeight - paddingTop - paddingBottom;

    const startX = N;
    const totalBins = bucketMax - startX + 1;
    const binStep = plotWidth / totalBins;
    const barWidth = Math.max(1.5, binStep - 1);

    simCache.layout = { N, bucketMax, plotWidth, paddingLeft, totalBins };

    // 1. 绘制 Y 轴背景网格虚线与百分比
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";

    const gridLines = 3;
    for (let i = 0; i <= gridLines; i++) {
        const yValRatio = i / gridLines;
        const yPos = heightFromBottom(yValRatio);
        const pct = ((maxFrequency * yValRatio / trials) * 100).toFixed(1);

        ctx.strokeStyle = "rgba(47, 42, 37, 0.08)";
        ctx.beginPath();
        ctx.moveTo(paddingLeft, yPos);
        ctx.lineTo(cssWidth - paddingRight, yPos);
        ctx.stroke();

        ctx.fillStyle = "rgba(47, 42, 37, 0.45)";
        ctx.fillText(`${pct}%`, paddingLeft - 6, yPos + 3);
    }
    ctx.setLineDash([]);

    function heightFromBottom(ratio) {
        return paddingTop + plotHeight * (1 - ratio);
    }

    // 2. 绘制每个频数柱子（圆角渐变柱）
    const curvePoints = [];

    for (let d = startX; d <= bucketMax; d++) {
        const freq = bins[d] || 0;
        const ratio = (freq / maxFrequency) * progress;
        const barH = ratio * plotHeight;
        const x = paddingLeft + (d - startX) * binStep + (binStep - barWidth) / 2;
        const y = cssHeight - paddingBottom - barH;

        curvePoints.push({ x: x + barWidth / 2, y });

        // 颜色渐变：欧皇金 -> 正常蓝 -> 非酋紫
        const grad = ctx.createLinearGradient(x, y, x, cssHeight - paddingBottom);
        if (d <= N + Math.max(2, Math.floor(N * 0.3))) {
            grad.addColorStop(0, "#f7c84b"); // 欧皇金
            grad.addColorStop(1, "#f39c12");
        } else if (d > theoryMean * 1.3) {
            grad.addColorStop(0, "#b388ff"); // 非酋紫
            grad.addColorStop(1, "#7c4dff");
        } else {
            grad.addColorStop(0, "#5aabd9"); // 正常蓝
            grad.addColorStop(1, "#3498db");
        }

        ctx.fillStyle = grad;
        drawRoundedRect(ctx, x, y, barWidth, barH, Math.min(3, barWidth / 2));
        ctx.fill();

        // 鼠标悬停高亮外边框
        if (hoveredBinIndex === d) {
            ctx.strokeStyle = "#2f2a25";
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, x - 1, y - 1, barWidth + 2, barH + 1, Math.min(3, barWidth / 2));
            ctx.stroke();
        }
    }

    // 3. 绘制平滑拟合趋势曲线 (KDE Curve)
    if (curvePoints.length > 2 && progress >= 0.7) {
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (let i = 0; i < curvePoints.length - 1; i++) {
            const xc = (curvePoints[i].x + curvePoints[i + 1].x) / 2;
            const yc = (curvePoints[i].y + curvePoints[i + 1].y) / 2;
            ctx.quadraticCurveTo(curvePoints[i].x, curvePoints[i].y, xc, yc);
        }
        ctx.strokeStyle = "rgba(47, 42, 37, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.stroke();
    }

    // 4. 绘制理论期望参考线 (红色虚线)
    const theoryX = paddingLeft + (theoryMean - startX) * binStep + binStep / 2;
    if (theoryX >= paddingLeft && theoryX <= cssWidth - paddingRight) {
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#e96e56";
        ctx.lineWidth = 2;
        ctx.moveTo(theoryX, paddingTop - 4);
        ctx.lineTo(theoryX, cssHeight - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#e96e56";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`理论平均 ${theoryMean.toFixed(1)}次`, theoryX + 4, paddingTop + 8);
    }

    // 5. 坐标轴与刻度
    ctx.strokeStyle = "rgba(47, 42, 37, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, cssHeight - paddingBottom);
    ctx.lineTo(cssWidth - paddingRight, cssHeight - paddingBottom);
    ctx.stroke();

    // 动态生成 6 个均匀漂亮的 X 轴刻度
    ctx.fillStyle = "#6e665e";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";

    const tickCount = 6;
    const stepSize = Math.max(1, Math.round((bucketMax - startX) / (tickCount - 1)));
    const ticks = [];
    for (let i = 0; i < tickCount; i++) {
        const val = (i === 0) ? startX : (i === tickCount - 1 ? bucketMax : startX + i * stepSize);
        if (!ticks.includes(val) && val <= bucketMax) ticks.push(val);
    }

    ticks.forEach(tickVal => {
        const tickX = paddingLeft + (tickVal - startX) * binStep + binStep / 2;
        ctx.fillText(`${tickVal}次`, tickX, cssHeight - 8);
    });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (height <= 0) return;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ========================
// 9. 第 8 页：商业定价期望收益 EV 计算器（滑块实时联动）
// ========================
function setEVPreset(n, price, reward) {
    const nSlider = document.getElementById("ev-n-slider");
    const priceSlider = document.getElementById("ev-price-slider");
    const rewardSlider = document.getElementById("ev-reward-slider");
    if (nSlider) nSlider.value = n;
    if (priceSlider) priceSlider.value = price;
    if (rewardSlider) rewardSlider.value = reward;
    updateEVFromSliders();
}

function updateEVFromSliders() {
    const nSlider = document.getElementById("ev-n-slider");
    const priceSlider = document.getElementById("ev-price-slider");
    const rewardSlider = document.getElementById("ev-reward-slider");
    if (!nSlider || !priceSlider || !rewardSlider) return;

    const N = parseInt(nSlider.value, 10);
    const price = parseFloat(priceSlider.value) || 0;
    const reward = parseFloat(rewardSlider.value) || 0;

    document.getElementById("ev-n-badge").textContent = `${N} 款一套`;
    document.getElementById("ev-price-badge").textContent = `¥ ${price}`;
    document.getElementById("ev-reward-badge").textContent = `¥ ${reward}`;

    // 1. 最低门槛 (0重复)
    const minCost = N * price;
    document.getElementById("ev-min-cost-display").textContent = `¥ ${minCost.toLocaleString()}`;
    document.getElementById("ev-min-draws-sub").textContent = `买齐 ${N} 个无重复`;

    // 2. 数学期望总花费
    let harmonicN = 0;
    for (let i = 1; i <= N; i++) harmonicN += 1 / i;
    const expectedDraws = N * harmonicN;
    const expectedCost = expectedDraws * price;
    document.getElementById("ev-exp-cost-display").textContent = `¥ ${expectedCost.toFixed(2)}`;
    document.getElementById("ev-exp-draws-sub").textContent = `平均需抽 ${expectedDraws.toFixed(1)} 次`;

    // 3. 第三方全套售价
    const thirdPartyPrice = reward;
    document.getElementById("ev-prize-display").textContent = `¥ ${thirdPartyPrice.toFixed(2)}`;

    // 4. 理性省钱对比：盲抽期望花费 - 第三方售价
    const savedAmount = expectedCost - thirdPartyPrice;
    const badge = document.getElementById("ev-badge");
    const valElem = document.getElementById("ev-val");
    const tipElem = document.getElementById("ev-tip");

    if (savedAmount >= 0) {
        badge.className = "ev-result-badge positive";
        valElem.style.color = "var(--leaf)";
        const savedPct = ((savedAmount / expectedCost) * 100).toFixed(0);
        valElem.textContent = `净省 ¥ ${savedAmount.toFixed(2)} (立省 ${savedPct}%)`;

        const premium = thirdPartyPrice - minCost;
        if (premium > 0) {
            const premiumPct = ((premium / minCost) * 100).toFixed(0);
            tipElem.textContent = `看似比官方原价 (¥${minCost.toFixed(0)}) 溢价了 ¥${premium.toFixed(0)} (+${premiumPct}%)，但相比自己盲抽的期望花费 (¥${expectedCost.toFixed(1)})，直接买全套净省下 ¥${savedAmount.toFixed(1)}！省钱又省心。`;
        } else {
            tipElem.textContent = `售价甚至低于或等于官方原价 (¥${minCost.toFixed(0)})，这属于捡漏神仙价格！`;
        }
    } else {
        const extra = Math.abs(savedAmount);
        badge.className = "ev-result-badge negative";
        valElem.style.color = "var(--coral)";
        valElem.textContent = `多花 ¥ ${extra.toFixed(2)} (溢价过高)`;
        tipElem.textContent = `第三方标价已超过盲抽期望总花费 (¥${expectedCost.toFixed(1)})，溢价过高被宰，不如直接去买官方未拆整盒。`;
    }
}
