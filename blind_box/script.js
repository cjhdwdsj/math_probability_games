/**
 * 盲盒收集大揭秘 - 趣味概率互动脚本
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

const PRICE_PER_BOX = 29;

const SSR_RATES = [
    { denom: 24, label: "1/24 (微型隐藏)" },
    { denom: 36, label: "1/36 (小隐藏)" },
    { denom: 72, label: "1/72 (普通隐藏)" },
    { denom: 96, label: "1/96 (较难隐藏)" },
    { denom: 144, label: "1/144 (超级大隐藏)" },
    { denom: 288, label: "1/288 (至尊典藏)" }
];

// 第 1 页：玩家猜想
let userGuess = 14;

// 第 2 页：桌面拆盒状态
let tableState = {
    boughtCount: 14,
    openedCount: 0,
    pouches: [],
    collectedMap: {},
    trajectoryHistory: [] // { step, uniqueCount, cost }
};

// 撕袋 & 抽拉立牌交互状态
let activePouchIdx = -1;
let activeCharacter = null;
let isStandeeTorn = false;
let isStandeePulled = false;
let isDraggingStandee = false;
let dragStartY = 0;
let currentPullDist = 0;

// 第 3 页（理论真相）动画状态
let currentHarmonicN = 6;
let harmonicTimers = [];

// 第 4 页（蒙特卡洛与人群排队）缓存与状态
let simCache = null;
let animFrameId = null;
let simSelectedN = 6;
let simUserDraws = 14;

// ========================
// 2. 初始化与页面生命周期
// ========================
document.addEventListener("DOMContentLoaded", () => {
    updateNavigation();
    initKeyboardControls();
    initStandeeDragListeners();
    initSimCanvasListeners();
    initCrowdQueue();

    // 默认初始化各组件
    initTabletopScene(userGuess);
    updateSsrFromSliders();
    updateEVFromSliders();
    animateHarmonicPage(6);
    runMonteCarloSim();

    window.addEventListener("resize", () => {
        if (currentPage === 3) renderTrajectoryChart();
        if (currentPage === 5 && simCache) renderHistogram(1);
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

    // 页面专属生命周期触发
    if (currentPage === 3) {
        setTimeout(renderTrajectoryChart, 80);
    } else if (currentPage === 4) {
        setTimeout(() => animateHarmonicPage(currentHarmonicN), 80);
    } else if (currentPage === 5) {
        setTimeout(() => {
            const initialDraws = tableState.openedCount > 0 ? tableState.openedCount : 14;
            simUserDraws = initialDraws;
            runMonteCarloSim();
            updateCrowdVisual(initialDraws);
        }, 80);
    } else if (currentPage === 7) {
        setTimeout(updateEVFromSliders, 80);
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
// 3. 第 1 页：猜想步进器与第 1.5 页过渡
// ========================
function adjustGuess(delta) {
    userGuess = Math.max(6, Math.min(30, userGuess + delta));
    const numElem = document.getElementById("stepper-guess-num");
    if (numElem) numElem.textContent = userGuess;
}

function startTabletopGame() {
    const titleElem = document.getElementById("trans-guess-title");
    const leadElem = document.getElementById("trans-guess-lead");

    if (titleElem && leadElem) {
        if (userGuess <= 10) {
            titleElem.textContent = `你猜只要 ${userGuess} 个就能集齐？`;
            leadElem.innerHTML = `6 款盲盒你觉得买 <strong style="color: var(--coral);">${userGuess}</strong> 袋就够了？行，<strong style="color: var(--coral);">${userGuess}</strong> 袋盲盒全给你买来扔桌上了，去拆拆看能不能如你所愿！`;
        } else if (userGuess <= 18) {
            titleElem.textContent = `你猜要买 ${userGuess} 个才能集齐？`;
            leadElem.innerHTML = `行！<strong style="color: var(--coral);">${userGuess}</strong> 袋盲盒已经全给你买好扔桌上了，去桌前亲手拆拆看 <strong style="color: var(--coral);">${userGuess}</strong> 袋到底能不能凑齐一套！`;
        } else {
            titleElem.textContent = `你猜要买 ${userGuess} 个？这么谨慎？`;
            leadElem.innerHTML = `看来你深知概率的险恶！<strong style="color: var(--coral);">${userGuess}</strong> 袋盲盒全给你买来扔桌上了，去桌前拆拆看能不能提前集齐！`;
        }
    }

    initTabletopScene(userGuess);
    goToPage(1); // 翻入第 1.5 页过渡页
}

// ========================
// 4. 第 2 页：拟真桌面拆盒台
// ========================
function initTabletopScene(count = 14) {
    tableState.boughtCount = count;
    tableState.openedCount = 0;
    tableState.collectedMap = {};
    tableState.trajectoryHistory = [{ step: 0, uniqueCount: 0, cost: 0 }];
    tableState.pouches = [];

    for (let i = 0; i < count; i++) {
        const tilt = (Math.random() * 20 - 10).toFixed(1);
        tableState.pouches.push({
            id: i,
            isOpened: false,
            character: null,
            tilt: tilt
        });
    }

    renderTablePouches();
    renderShelfGrid();
    updateLedgerUI();

    const winBtn = document.getElementById("btn-victory-settle");
    if (winBtn) {
        winBtn.disabled = true;
        winBtn.textContent = "🏆 胜利结算 (需集齐6款)";
        winBtn.className = "btn btn-gold btn-sm";
    }
}

function renderTablePouches() {
    const area = document.getElementById("table-scatter-area");
    if (!area) return;
    area.innerHTML = "";

    tableState.pouches.forEach((pouch, idx) => {
        const div = document.createElement("div");
        div.className = `foil-pouch ${pouch.isOpened ? 'opened' : ''}`;
        div.id = `pouch-${idx}`;
        div.style.transform = `rotate(${pouch.tilt}deg)`;
        div.title = pouch.isOpened ? "已拆封" : "点击拿起拆袋";
        div.innerHTML = pouch.isOpened ? `<span>${pouch.character ? pouch.character.icon : '✨'}</span>` : `<span>🎁</span>`;

        if (!pouch.isOpened) {
            div.onclick = () => openPouchModal(idx);
        }
        area.appendChild(div);
    });
}

function renderShelfGrid() {
    const grid = document.getElementById("shelf-grid");
    if (!grid) return;
    grid.innerHTML = "";

    CHARACTERS.forEach(char => {
        const count = tableState.collectedMap[char.id] || 0;
        const slot = document.createElement("div");
        slot.className = `standee-slot ${count > 0 ? 'unlocked' : ''} ${count > 1 ? 'has-dup' : ''}`;
        slot.id = `shelf-slot-${char.id}`;
        slot.innerHTML = `
            <div class="standee-avatar">${char.icon}</div>
            <div style="font-size: 0.65rem; font-weight: 700; color: var(--ink); margin-top: 2px;">${char.name}</div>
            <div class="standee-count-badge" id="shelf-badge-${char.id}">×${count}</div>
        `;
        grid.appendChild(slot);
    });

    const uniqueCount = Object.keys(tableState.collectedMap).length;
    const progTag = document.getElementById("shelf-progress-tag");
    if (progTag) progTag.textContent = `${uniqueCount} / 6`;
}

function updateLedgerUI() {
    const boughtElem = document.getElementById("ledger-bought-count");
    const openedElem = document.getElementById("ledger-opened-count");
    const remainElem = document.getElementById("ledger-remain-count");
    const costElem = document.getElementById("ledger-cost-display");

    const remain = Math.max(0, tableState.boughtCount - tableState.openedCount);
    const cost = tableState.boughtCount * PRICE_PER_BOX;

    if (boughtElem) boughtElem.textContent = `${tableState.boughtCount} 袋`;
    if (openedElem) openedElem.textContent = `${tableState.openedCount} 袋`;
    if (remainElem) remainElem.textContent = `${remain} 袋未拆`;
    if (costElem) costElem.textContent = `¥ ${cost.toLocaleString()}`;
}

function buyOneMoreBag() {
    tableState.boughtCount++;
    const newIdx = tableState.pouches.length;
    const tilt = (Math.random() * 20 - 10).toFixed(1);
    tableState.pouches.push({
        id: newIdx,
        isOpened: false,
        character: null,
        tilt: tilt
    });

    renderTablePouches();
    updateLedgerUI();
}

function refundUnopenedBags() {
    tableState.pouches = tableState.pouches.filter(p => p.isOpened);
    tableState.boughtCount = tableState.openedCount;
    renderTablePouches();
    updateLedgerUI();
}

function resetLife() {
    initTabletopScene(userGuess);
}

// ========================
// 5. 拟真撕铝箔袋 + 抽拉/点击亚克力立牌
// ========================
function openPouchModal(pouchIdx) {
    if (tableState.pouches[pouchIdx].isOpened) return;
    activePouchIdx = pouchIdx;

    const randChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    activeCharacter = randChar;
    tableState.pouches[pouchIdx].character = randChar;

    isStandeeTorn = false;
    isStandeePulled = false;
    isDraggingStandee = false;
    currentPullDist = 0;

    const modal = document.getElementById("unboxing-modal");
    const tearStrip = document.getElementById("modal-tear-strip");
    const standee = document.getElementById("modal-standee");
    const standeeIcon = document.getElementById("modal-standee-icon");
    const standeeName = document.getElementById("modal-standee-name");

    if (tearStrip) {
        tearStrip.classList.remove("torn");
    }

    if (standee) {
        standee.style.display = "flex";
        standee.style.transform = "translateY(0)";
        standee.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
    }

    if (standeeIcon) standeeIcon.textContent = randChar.icon;
    if (standeeName) standeeName.textContent = randChar.name;

    if (modal) modal.classList.add("active");
}

function tearFoilStrip() {
    if (isStandeeTorn) return;
    isStandeeTorn = true;

    const tearStrip = document.getElementById("modal-tear-strip");
    if (tearStrip) {
        tearStrip.classList.add("torn");
    }
}

function initStandeeDragListeners() {
    const standee = document.getElementById("modal-standee");
    if (!standee) return;

    // 鼠标拖拽
    standee.addEventListener("mousedown", (e) => {
        if (!isStandeeTorn || isStandeePulled) return;
        isDraggingStandee = true;
        dragStartY = e.clientY;
        currentPullDist = 0;
        standee.style.transition = "none";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDraggingStandee || isStandeePulled) return;
        const deltaY = dragStartY - e.clientY;
        if (deltaY > 0) {
            currentPullDist = deltaY;
            standee.style.transform = `translateY(-${Math.min(180, deltaY)}px)`;
            if (deltaY >= 80) {
                triggerPullComplete();
            }
        }
    });

    window.addEventListener("mouseup", () => {
        if (!isDraggingStandee) return;
        isDraggingStandee = false;
        if (!isStandeePulled) {
            if (currentPullDist >= 40) {
                triggerPullComplete();
            } else {
                standee.style.transition = "transform 0.3s var(--ease-bounce)";
                standee.style.transform = "translateY(0)";
            }
        }
    });

    // 触屏手势
    standee.addEventListener("touchstart", (e) => {
        if (!isStandeeTorn || isStandeePulled) return;
        isDraggingStandee = true;
        dragStartY = e.touches[0].clientY;
        currentPullDist = 0;
        standee.style.transition = "none";
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
        if (!isDraggingStandee || isStandeePulled) return;
        const deltaY = dragStartY - e.touches[0].clientY;
        if (deltaY > 0) {
            currentPullDist = deltaY;
            standee.style.transform = `translateY(-${Math.min(180, deltaY)}px)`;
            if (deltaY >= 80) {
                triggerPullComplete();
            }
        }
    }, { passive: true });

    window.addEventListener("touchend", () => {
        if (!isDraggingStandee) return;
        isDraggingStandee = false;
        if (!isStandeePulled) {
            if (currentPullDist >= 40) {
                triggerPullComplete();
            } else {
                standee.style.transition = "transform 0.3s var(--ease-bounce)";
                standee.style.transform = "translateY(0)";
            }
        }
    });
}

function triggerPullComplete() {
    if (!isStandeeTorn || isStandeePulled) return;
    isStandeePulled = true;
    isDraggingStandee = false;

    const standee = document.getElementById("modal-standee");
    const modal = document.getElementById("unboxing-modal");

    if (standee) {
        standee.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease";
        standee.style.transform = "translateY(-170px) scale(1.08)";
        standee.style.boxShadow = "0 0 28px rgba(247, 200, 75, 0.9)";
    }

    setTimeout(() => {
        if (modal) modal.classList.remove("active");
        completeUnboxingPouch();
    }, 450);
}

function completeUnboxingPouch() {
    if (activePouchIdx === -1 || !activeCharacter) return;

    const pouch = tableState.pouches[activePouchIdx];
    pouch.isOpened = true;
    tableState.openedCount++;

    const char = activeCharacter;
    const isNew = !tableState.collectedMap[char.id];
    tableState.collectedMap[char.id] = (tableState.collectedMap[char.id] || 0) + 1;

    const uniqueCount = Object.keys(tableState.collectedMap).length;

    // 记录开箱轨迹
    tableState.trajectoryHistory.push({
        step: tableState.openedCount,
        uniqueCount: uniqueCount,
        cost: tableState.openedCount * PRICE_PER_BOX
    });

    renderTablePouches();
    updateLedgerUI();
    renderShelfGrid();

    const shelfSlot = document.getElementById(`shelf-slot-${char.id}`);
    if (shelfSlot && isNew) {
        shelfSlot.classList.add("just-popped");
        setTimeout(() => shelfSlot.classList.remove("just-popped"), 500);
    }

    // 6款全齐，解锁胜利结算
    if (uniqueCount >= 6) {
        const winBtn = document.getElementById("btn-victory-settle");
        if (winBtn) {
            winBtn.disabled = false;
            winBtn.textContent = "🎉 全部集齐！立即胜利结算 👉";
            winBtn.className = "btn btn-gold btn-sm";
        }
    }
}

// ========================
// 6. 第 2.5 页：专属开箱战报过渡页
// ========================
function goToBattleReport() {
    goToPage(3); // 翻入第 2.5 战报页 (data-page="3")
}

function renderTrajectoryChart() {
    const canvas = document.getElementById("trajectory-canvas");
    if (!canvas) return;

    const opened = tableState.openedCount;
    const totalCost = opened * PRICE_PER_BOX;

    const titleElem = document.getElementById("report-main-title");
    const descElem = document.getElementById("report-sub-desc");

    if (titleElem) titleElem.textContent = `你一共拆了 ${opened} 袋，累计花费 ¥ ${totalCost.toLocaleString()}！`;
    if (descElem) descElem.innerHTML = `这是你的开箱花费曲线（横轴：已集齐款式数量，纵轴：累计花费金额）：`;

    // 绘制轨迹图
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || 600;
    const cssHeight = 155;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const paddingLeft = 55;
    const paddingBottom = 26;
    const paddingTop = 20;
    const paddingRight = 30;

    const plotWidth = cssWidth - paddingLeft - paddingRight;
    const plotHeight = cssHeight - paddingTop - paddingBottom;

    const maxCost = Math.max(totalCost, 14.7 * PRICE_PER_BOX);

    // 网格线
    ctx.strokeStyle = "rgba(47, 42, 37, 0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let c = 0; c <= 6; c++) {
        const x = paddingLeft + (c / 6) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, cssHeight - paddingBottom);
        ctx.stroke();

        ctx.fillStyle = "rgba(47, 42, 37, 0.5)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(c === 0 ? "0款" : `${c}款`, x, cssHeight - 8);
    }

    const yTicks = [0, Math.round(maxCost / 2), Math.round(maxCost)];
    yTicks.forEach(val => {
        const y = paddingTop + plotHeight * (1 - val / maxCost);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(cssWidth - paddingRight, y);
        ctx.stroke();

        ctx.fillStyle = "rgba(47, 42, 37, 0.5)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`¥${val}`, paddingLeft - 6, y + 3);
    });
    ctx.setLineDash([]);

    // 坐标轴
    ctx.strokeStyle = "rgba(47, 42, 37, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, cssHeight - paddingBottom);
    ctx.lineTo(cssWidth - paddingRight, cssHeight - paddingBottom);
    ctx.stroke();

    // 绘制轨迹折线
    const history = tableState.trajectoryHistory;
    if (!history || history.length === 0) return;

    const points = [{ u: 0, cost: 0 }];
    for (let u = 1; u <= 6; u++) {
        const match = history.find(h => h.uniqueCount === u);
        if (match) {
            points.push({ u: match.uniqueCount, cost: match.cost });
        }
    }

    if (points.length < 2) return;

    ctx.beginPath();
    points.forEach((pt, idx) => {
        const x = paddingLeft + (pt.u / 6) * plotWidth;
        const y = paddingTop + plotHeight * (1 - pt.cost / maxCost);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#e96e56";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    points.forEach((pt) => {
        const x = paddingLeft + (pt.u / 6) * plotWidth;
        const y = paddingTop + plotHeight * (1 - pt.cost / maxCost);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#e96e56";
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// ========================
// 7. 第 3 页：大白话求和与柱状图逐级累加动画
// ========================
function replayHarmonicAnimation() {
    animateHarmonicPage(currentHarmonicN);
}

function animateHarmonicPage(N = 6) {
    currentHarmonicN = N;

    harmonicTimers.forEach(t => clearTimeout(t));
    harmonicTimers = [];

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

    const stepValues = [];
    let totalExpectation = 0;
    for (let k = 1; k <= N; k++) {
        const val = N / (N - k + 1);
        stepValues.push({ k, val });
        totalExpectation += val;
    }

    const maxVal = stepValues[stepValues.length - 1].val;

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

    if (tipText) {
        if (N === 6) {
            tipText.innerHTML = `柱子高度直观展示：越到后面越难抽，最后一只（需买 <strong>6 次</strong>）的难度等于前面所有阶段的总和！`;
        } else if (N === 8) {
            tipText.innerHTML = `8 款一套时，最后一只平均需要抽 <strong>8 次</strong>，总共需要买 <strong>21.7 次</strong>！`;
        } else {
            tipText.innerHTML = `12 款大套时，最后一只平均需要买整整 <strong>12 次</strong>，总共需要抽 <strong>37.2 次</strong>（花费 ¥2,567）！`;
        }
    }

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

    const finalTimer = setTimeout(() => {
        const sumDisplay = document.getElementById("harmonic-sum-display");
        if (sumDisplay) sumDisplay.classList.add("show");
    }, stepValues.length * stepDelay + 140);
    harmonicTimers.push(finalTimer);
}

// ========================
// 8. 第 4 页：蒙特卡洛大规模模拟与人群排队切分
// ========================
let hoveredBinIndex = -1;

function setSimN(N) {
    simSelectedN = N;
    [6, 8, 12].forEach(num => {
        const btn = document.getElementById(`sim-btn-${num}`);
        if (btn) {
            if (num === N) btn.classList.add("active");
            else btn.classList.remove("active");
        }
    });

    let harmonicN = 0;
    for (let i = 1; i <= N; i++) harmonicN += 1 / i;
    const theoryMean = N * harmonicN;
    simUserDraws = Math.round(theoryMean);

    runMonteCarloSim();
}

const PERSON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

function initCrowdQueue() {
    const line = document.getElementById("crowd-people-line");
    if (!line) return;
    line.innerHTML = "";
    for (let i = 0; i < 20; i++) {
        const span = document.createElement("span");
        span.className = "crowd-person unlit";
        span.id = `person-${i}`;
        span.innerHTML = PERSON_SVG;
        line.appendChild(span);
    }
}

function updateCrowdVisual(val) {
    const draws = parseInt(val, 10);
    simUserDraws = draws;

    const displayElem = document.getElementById("crowd-draws-display");
    const badge = document.getElementById("crowd-rank-badge");
    const indicatorTag = document.getElementById("crowd-indicator-tag");
    const indicator = document.getElementById("crowd-indicator");
    const slider = document.getElementById("crowd-draws-slider");

    if (displayElem) displayElem.textContent = `${draws} 次`;
    if (slider && parseInt(slider.value, 10) !== draws) slider.value = draws;

    if (!simCache) return;
    const { N, maxDraws, bins, trials } = simCache;

    // 计算 <= draws 的累计玩家比例
    let countLeq = 0;
    for (let d = N; d <= Math.min(draws, maxDraws); d++) {
        countLeq += (bins[d] || 0);
    }
    const pct = ((countLeq / trials) * 100).toFixed(1);

    let colorClass = "blue";
    if (badge) {
        if (pct <= 3.0) {
            badge.textContent = `超越了全网 ${pct}% · 天选欧皇 👑`;
            badge.className = "crowd-rank-pill god";
            colorClass = "gold";
        } else if (pct <= 25.0) {
            badge.textContent = `超越了全网 ${pct}% · 幸运欧气 ✨`;
            badge.className = "crowd-rank-pill good";
            colorClass = "green";
        } else if (pct <= 80.0) {
            badge.textContent = `超越了全网 ${pct}% · 凡人均值区 😐`;
            badge.className = "crowd-rank-pill mid";
            colorClass = "blue";
        } else if (pct <= 95.0) {
            badge.textContent = `超越了全网 ${pct}% · 轻度非酋 🌧️`;
            badge.className = "crowd-rank-pill bad";
            colorClass = "coral";
        } else {
            badge.textContent = `超越了全网 ${pct}% · 极度大非酋 😭`;
            badge.className = "crowd-rank-pill worst";
            colorClass = "purple";
        }
    }

    if (indicatorTag) {
        indicatorTag.textContent = `第 ${draws} 次 · 超越 ${pct}%`;
    }

    const totalPeople = 20;
    const litCount = Math.min(totalPeople, Math.max(0, Math.round((pct / 100) * totalPeople)));

    for (let i = 0; i < totalPeople; i++) {
        const p = document.getElementById(`person-${i}`);
        if (p) {
            if (i < litCount) {
                p.className = `crowd-person lit ${colorClass}`;
            } else {
                p.className = "crowd-person unlit";
            }
        }
    }

    if (indicator) {
        const ratio = Math.min(0.96, Math.max(0.04, litCount / totalPeople));
        indicator.style.left = `${(ratio * 100).toFixed(1)}%`;
    }

    renderHistogram(1);
}

function initSimCanvasListeners() {
    const canvas = document.getElementById("sim-canvas");
    const tooltip = document.getElementById("chart-tooltip");
    if (!canvas || !tooltip) return;

    canvas.style.cursor = "crosshair";

    canvas.addEventListener("click", (e) => {
        if (!simCache || !simCache.layout) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        const { N, bucketMax, plotWidth, paddingLeft, totalBins } = simCache.layout;
        const binStep = plotWidth / totalBins;
        const relX = mouseX - paddingLeft;

        if (relX >= 0 && relX <= plotWidth) {
            const binIdx = Math.floor(relX / binStep) + N;
            if (binIdx >= N && binIdx <= bucketMax) {
                updateCrowdVisual(binIdx);
            }
        }
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!simCache || !simCache.layout) return;
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
                tooltip.innerHTML = `🎯 抽 <strong>${binIdx}</strong> 次集齐: <strong>${count}</strong> 人 (占比 <strong>${pct}%</strong>)<br><small style="color:#6e665e;">点击可定位下方进度条</small>`;
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
    const N = simSelectedN || 6;
    const trials = 10000;

    let harmonicN = 0;
    for (let i = 1; i <= N; i++) harmonicN += 1 / i;
    const theoryMean = N * harmonicN;

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

    // 同步更新滑块范围
    const slider = document.getElementById("crowd-draws-slider");
    if (slider) {
        slider.min = N;
        slider.max = Math.min(maxDraws, Math.max(35, bucketMax));
    }

    updateCrowdVisual(simUserDraws || Math.round(theoryMean));

    if (animFrameId) cancelAnimationFrame(animFrameId);
    let startTime = null;
    const duration = 280;

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

    const { N, theoryMean, bucketMax, bins, maxFrequency, trials } = simCache;

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

    const curvePoints = [];

    for (let d = startX; d <= bucketMax; d++) {
        const freq = bins[d] || 0;
        const ratio = (freq / maxFrequency) * progress;
        const barH = ratio * plotHeight;
        const x = paddingLeft + (d - startX) * binStep + (binStep - barWidth) / 2;
        const y = cssHeight - paddingBottom - barH;

        curvePoints.push({ x: x + barWidth / 2, y });

        const grad = ctx.createLinearGradient(x, y, x, cssHeight - paddingBottom);
        if (d <= N + Math.max(2, Math.floor(N * 0.3))) {
            grad.addColorStop(0, "#f7c84b");
            grad.addColorStop(1, "#f39c12");
        } else if (d > theoryMean * 1.3) {
            grad.addColorStop(0, "#b388ff");
            grad.addColorStop(1, "#7c4dff");
        } else {
            grad.addColorStop(0, "#5aabd9");
            grad.addColorStop(1, "#3498db");
        }

        ctx.fillStyle = grad;
        drawRoundedRect(ctx, x, y, barWidth, barH, Math.min(3, barWidth / 2));
        ctx.fill();

        if (hoveredBinIndex === d) {
            ctx.strokeStyle = "#2f2a25";
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, x - 1, y - 1, barWidth + 2, barH + 1, Math.min(3, barWidth / 2));
            ctx.stroke();
        }
    }

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

    // 理论平均线 (虚线)
    const theoryX = paddingLeft + (theoryMean - startX) * binStep + binStep / 2;
    if (theoryX >= paddingLeft && theoryX <= cssWidth - paddingRight) {
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#e96e56";
        ctx.lineWidth = 1.8;
        ctx.moveTo(theoryX, paddingTop - 4);
        ctx.lineTo(theoryX, cssHeight - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#e96e56";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`理论均值 ${theoryMean.toFixed(1)}次`, theoryX + 4, paddingTop + 8);
    }

    // 玩家当前选择的抽数竖线 (游标线)
    if (simUserDraws >= startX && simUserDraws <= bucketMax) {
        const userX = paddingLeft + (simUserDraws - startX) * binStep + binStep / 2;
        ctx.beginPath();
        ctx.strokeStyle = "#2f2a25";
        ctx.lineWidth = 2.5;
        ctx.moveTo(userX, paddingTop - 4);
        ctx.lineTo(userX, cssHeight - paddingBottom);
        ctx.stroke();

        ctx.fillStyle = "#2f2a25";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`▼ ${simUserDraws}次`, userX, paddingTop - 2);
    }

    ctx.strokeStyle = "rgba(47, 42, 37, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, cssHeight - paddingBottom);
    ctx.lineTo(cssWidth - paddingRight, cssHeight - paddingBottom);
    ctx.stroke();

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
// 11. 第 7 页：商业定价期望收益 EV 计算器
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

    const minCost = N * price;
    document.getElementById("ev-min-cost-display").textContent = `¥ ${minCost.toLocaleString()}`;
    document.getElementById("ev-min-draws-sub").textContent = `买齐 ${N} 个无重复`;

    let harmonicN = 0;
    for (let i = 1; i <= N; i++) harmonicN += 1 / i;
    const expectedDraws = N * harmonicN;
    const expectedCost = expectedDraws * price;
    document.getElementById("ev-exp-cost-display").textContent = `¥ ${expectedCost.toFixed(2)}`;
    document.getElementById("ev-exp-draws-sub").textContent = `平均需抽 ${expectedDraws.toFixed(1)} 次`;

    const thirdPartyPrice = reward;
    document.getElementById("ev-prize-display").textContent = `¥ ${thirdPartyPrice.toFixed(2)}`;

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
