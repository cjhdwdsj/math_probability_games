/**
 * 盲盒收集大揭秘 - 趣味概率互动脚本
 */

// ========================
// 1. 全局配置与状态
// ========================
const TOTAL_PAGES = 9;
let currentPage = 0;

const CHARACTERS = [
    { id: 1, name: "闪电小狐", icon: "🦊", color: "#f39c12" },
    { id: 2, name: "功夫阿宝", icon: "🐼", color: "#2c3e50" },
    { id: 3, name: "软萌泡泡", icon: "🐰", color: "#e84393" },
    { id: 4, name: "傲娇橘喵", icon: "🐱", color: "#e67e22" },
    { id: 5, name: "阳光柴柴", icon: "🐶", color: "#d35400" },
    { id: 6, name: "幻彩独角", icon: "🦄", color: "#9b59b6" }
];

const ALL_CHARACTERS = [
    { id: 1, name: "闪电小狐", icon: "🦊" },
    { id: 2, name: "功夫阿宝", icon: "🐼" },
    { id: 3, name: "软萌泡泡", icon: "🐰" },
    { id: 4, name: "傲娇橘喵", icon: "🐱" },
    { id: 5, name: "阳光柴柴", icon: "🐶" },
    { id: 6, name: "幻彩独角", icon: "🦄" },
    { id: 7, name: "呆萌小黄", icon: "🐤" },
    { id: 8, name: "抹茶跳跳", icon: "🐸" },
    { id: 9, name: "霸气萌虎", icon: "🐯" },
    { id: 10, name: "蜜糖小熊", icon: "🐻" },
    { id: 11, name: "极地小企", icon: "🐧" },
    { id: 12, name: "考拉乐乐", icon: "🐨" }
];

const PRICE_PER_BOX = 29;

const SSR_N_OPTS = [6, 7, 8, 9, 10, 11, 12];
const SSR_RATE_OPTS = [
    { denom: 24, label: "1/24 (微型隐藏)" },
    { denom: 36, label: "1/36 (小隐藏)" },
    { denom: 72, label: "1/72 (普通隐藏)" },
    { denom: 96, label: "1/96 (较难隐藏)" },
    { denom: 144, label: "1/144 (超级大隐藏)" },
    { denom: 288, label: "1/288 (至尊典藏)" }
];
const SSR_PROB_OPTS = [
    { pct: 0.05, label: "5% 把握 (天选欧皇 👑)" },
    { pct: 0.20, label: "20% 把握 (强运欧气 ✨)" },
    { pct: 0.50, label: "50% 把握 (中位凡人 😐)" },
    { pct: 0.80, label: "80% 把握 (稳健防守 🛡️)" },
    { pct: 0.95, label: "95% 把握 (大非酋保底 🌧️)" },
    { pct: 0.99, label: "99% 把握 (绝对防翻车 🔒)" }
];

let ssrKnobState = {
    nIdx: 0,       // N = 6
    rateIdx: 2,    // 1/72
    probIdx: 3     // 80%
};

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
    initSSRKnobs();

    // 默认初始化各组件
    initTabletopScene(userGuess);
    updateSSRVisual();
    updateEVFromSliders();
    animateHarmonicPage(6);
    runMonteCarloSim();

    // 检查 URL 中的 ?p= 或 ?page= 参数并直接跳转（支持 1~8 页，大小写不敏感）
    const params = new URLSearchParams(window.location.search);
    let targetP = params.get("p") || params.get("P") || params.get("page") || params.get("PAGE");
    if (targetP !== null) {
        let pNum = parseInt(targetP, 10);
        if (pNum >= 1 && pNum <= TOTAL_PAGES) {
            goToPage(pNum - 1);
        } else if (pNum === 0) {
            goToPage(0);
        }
    }

    window.addEventListener("resize", () => {
        if (currentPage === 3) renderTrajectoryChart();
        if (currentPage === 5 && simCache) renderHistogram(1);
        if (currentPage === 6) updateSSRVisual(true);
    });

    window.addEventListener("popstate", () => {
        const p = new URLSearchParams(window.location.search);
        let q = p.get("p") || p.get("P") || p.get("page") || p.get("PAGE");
        if (q !== null) {
            let n = parseInt(q, 10);
            if (n >= 1 && n <= TOTAL_PAGES) goToPage(n - 1);
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

    // 自动将当前页码实时同步回 URL（方便调试，刷新后直接停留在当前页）
    try {
        const url = new URL(window.location.href);
        url.searchParams.set("p", pageIndex + 1);
        window.history.replaceState(null, "", url.toString());
    } catch (e) {}

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
    } else if (currentPage === 6) {
        setTimeout(updateSSRVisual, 80);
    } else if (currentPage === 7) {
        setTimeout(updateEVFromSliders, 80);
    }
}

let returnToSummary = false;

function jumpFromSummary(pageIdx) {
    returnToSummary = true;
    goToPage(pageIdx);
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
    if (!btnPrev || !btnNext) return;

    if (currentPage === 8) {
        returnToSummary = false;
    }

    if (returnToSummary && currentPage !== 8) {
        btnPrev.disabled = false;
        btnPrev.innerHTML = '<span aria-hidden="true">←</span> 回到总结页';
        btnPrev.onclick = () => {
            returnToSummary = false;
            goToPage(8);
        };
    } else {
        btnPrev.disabled = (currentPage === 0);
        btnPrev.innerHTML = '<span aria-hidden="true">←</span> 上一步';
        btnPrev.onclick = prevPage;
    }

    btnNext.disabled = false;
    btnNext.className = "btn btn-primary";

    if (currentPage === 0) {
        btnNext.innerHTML = '全款购入 <span aria-hidden="true">→</span>';
        btnNext.onclick = startTabletopGame;
    } else if (currentPage === 1) {
        btnNext.innerHTML = '准备开拆 <span aria-hidden="true">→</span>';
        btnNext.onclick = () => goToPage(2);
    } else if (currentPage === 2) {
        const uniqueCount = Object.keys(tableState.collectedMap).length;
        if (uniqueCount >= 6) {
            btnNext.disabled = false;
            btnNext.className = "btn btn-primary btn-gold";
            btnNext.innerHTML = '胜利结算，查看战报 <span aria-hidden="true">→</span>';
            btnNext.onclick = goToBattleReport;
        } else {
            btnNext.disabled = true;
            btnNext.textContent = `拆盒中 (已集齐 ${uniqueCount}/6 款)...`;
        }
    } else if (currentPage === 3) {
        btnNext.innerHTML = '为什么最后一只抽数急剧狂飙？ <span aria-hidden="true">→</span>';
        btnNext.onclick = nextPage;
    } else if (currentPage === 4) {
        btnNext.innerHTML = '为什么我买了 15 次依然抽不齐？ <span aria-hidden="true">→</span>';
        btnNext.onclick = nextPage;
    } else if (currentPage === 5) {
        btnNext.innerHTML = '等等，如果还有隐藏款呢？ <span aria-hidden="true">→</span>';
        btnNext.onclick = nextPage;
    } else if (currentPage === 6) {
        btnNext.innerHTML = '直接盲抽还是去二手？这是个问题 <span aria-hidden="true">→</span>';
        btnNext.onclick = nextPage;
    } else if (currentPage === 7) {
        btnNext.innerHTML = '收官总结：全图鉴通关指南 <span aria-hidden="true">→</span>';
        btnNext.onclick = nextPage;
    } else if (currentPage === 8) {
        btnNext.className = "btn btn-primary btn-gold";
        btnNext.innerHTML = '回到开头，重新开箱 🔄';
        btnNext.onclick = resetAllAndGoToStart;
    }
}

function resetAllAndGoToStart() {
    userGuess = 14;
    const guessElem = document.getElementById("stepper-guess-num");
    if (guessElem) guessElem.textContent = userGuess;
    initTabletopScene(userGuess);
    goToPage(0);
}

function initKeyboardControls() {
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
        const btnNext = document.getElementById("btn-next");
        if (e.key === "ArrowRight") {
            if (btnNext && !btnNext.disabled) btnNext.click();
        }
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
    hasCelebratedSlam = false;
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

    // 6款全齐，解锁胜利结算并触发6款顺次闪烁一遍金光波
    if (uniqueCount >= 6) {
        const winBtn = document.getElementById("btn-victory-settle");
        if (winBtn) {
            winBtn.disabled = false;
            winBtn.textContent = "全部集齐！立即胜利结算 →";
            winBtn.className = "btn btn-gold btn-sm";
        }
        triggerGrandSlamFlash();
    }
    updateNavigation();
}

let hasCelebratedSlam = false;

function triggerGrandSlamFlash() {
    if (hasCelebratedSlam) return;
    hasCelebratedSlam = true;

    CHARACTERS.forEach((char, index) => {
        setTimeout(() => {
            const slot = document.getElementById(`shelf-slot-${char.id}`);
            if (slot) {
                slot.classList.remove("grand-slam-flash");
                void slot.offsetWidth;
                slot.classList.add("grand-slam-flash");
                setTimeout(() => slot.classList.remove("grand-slam-flash"), 600);
            }
        }, index * 120);
    });
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

    if (titleElem) titleElem.textContent = `你拆了 ${opened} 袋才集齐，花费 ¥ ${totalCost.toLocaleString()}！`;
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
            badge.textContent = `超越了模拟中 ${pct}% · 天选欧皇 👑`;
            badge.className = "crowd-rank-pill god";
            colorClass = "gold";
        } else if (pct <= 25.0) {
            badge.textContent = `超越了模拟中 ${pct}% · 幸运欧气 ✨`;
            badge.className = "crowd-rank-pill good";
            colorClass = "green";
        } else if (pct <= 80.0) {
            badge.textContent = `超越了模拟中 ${pct}% · 凡人均值区 😐`;
            badge.className = "crowd-rank-pill mid";
            colorClass = "blue";
        } else if (pct <= 95.0) {
            badge.textContent = `超越了模拟中 ${pct}% · 轻度非酋 🌧️`;
            badge.className = "crowd-rank-pill bad";
            colorClass = "coral";
        } else {
            badge.textContent = `超越了模拟中 ${pct}% · 极度大非酋 😭`;
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
// 9. 第 5 页：隐藏款 SSR 机制与 FL 旋钮环形图
// ========================

// 容斥原理精确求解“集齐全部 N 款普通款 + 1 款隐藏款”在 X 次抽取内的累积概率 CDF
function getFullSetProb(X, N, K) {
    if (X < N + 1) return 0;
    const ps = 1 / K;
    const pr = (1 - ps) / N;

    function nCr(n, r) {
        if (r < 0 || r > n) return 0;
        if (r === 0 || r === n) return 1;
        let res = 1;
        for (let i = 1; i <= r; i++) {
            res = res * (n - i + 1) / i;
        }
        return res;
    }

    let sum1 = 0;
    for (let j = 0; j <= N; j++) {
        const sign = (j % 2 === 0) ? 1 : -1;
        const base = Math.max(0, 1 - j * pr);
        sum1 += sign * nCr(N, j) * Math.pow(base, X);
    }

    let sum2 = 0;
    for (let j = 0; j <= N; j++) {
        const sign = (j % 2 === 0) ? 1 : -1;
        const base = Math.max(0, 1 - ps - j * pr);
        sum2 += sign * nCr(N, j) * Math.pow(base, X);
    }

    return Math.max(0, Math.min(1, sum1 - sum2));
}

// 全图鉴计算缓存表，杜绝重复计算，查询时间 0ms
const fullSetDrawsCache = {};

// 二分法极速反解达成目标把握度 targetP 所需的最小抽数 X
function calculateFullSetDraws(targetP, N, K) {
    const cacheKey = `${N}_${K}_${targetP}`;
    if (fullSetDrawsCache[cacheKey]) return fullSetDrawsCache[cacheKey];

    let low = N + 1;
    let high = 5000;
    let ans = high;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (getFullSetProb(mid, N, K) >= targetP) {
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    fullSetDrawsCache[cacheKey] = ans;
    return ans;
}

let ssrDebounceTimer = null;

function initSSRKnobs() {
    setupKnobControl("fl-dial-n", 0, SSR_N_OPTS.length - 1, ssrKnobState.nIdx, (val, isDone) => {
        ssrKnobState.nIdx = val;
        updateSSRVisual(isDone);
    });

    setupKnobControl("fl-dial-rate", 0, SSR_RATE_OPTS.length - 1, ssrKnobState.rateIdx, (val, isDone) => {
        ssrKnobState.rateIdx = val;
        updateSSRVisual(isDone);
    });

    setupKnobControl("fl-dial-prob", 0, SSR_PROB_OPTS.length - 1, ssrKnobState.probIdx, (val, isDone) => {
        ssrKnobState.probIdx = val;
        updateSSRVisual(isDone);
    });
}

function setupKnobControl(dialId, minIdx, maxIdx, initialIdx, onChange) {
    const dial = document.getElementById(dialId);
    if (!dial) return;

    let currentIdx = initialIdx;
    let startY = 0;
    let isDragging = false;
    let accumulatedDelta = 0;

    dial.addEventListener("mousedown", (e) => {
        isDragging = true;
        startY = e.clientY;
        accumulatedDelta = 0;
        document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const deltaY = startY - e.clientY;
        startY = e.clientY;
        accumulatedDelta += deltaY;

        if (Math.abs(accumulatedDelta) >= 16) {
            const step = accumulatedDelta > 0 ? 1 : -1;
            const newIdx = Math.max(minIdx, Math.min(maxIdx, currentIdx + step));
            if (newIdx !== currentIdx) {
                currentIdx = newIdx;
                onChange(currentIdx, false);
            }
            accumulatedDelta = 0;
        }
    });

    window.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.userSelect = "";
            onChange(currentIdx, true);
        }
    });

    // 触屏滑动
    dial.addEventListener("touchstart", (e) => {
        isDragging = true;
        startY = e.touches[0].clientY;
        accumulatedDelta = 0;
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        const deltaY = startY - e.touches[0].clientY;
        startY = e.touches[0].clientY;
        accumulatedDelta += deltaY;

        if (Math.abs(accumulatedDelta) >= 16) {
            const step = accumulatedDelta > 0 ? 1 : -1;
            const newIdx = Math.max(minIdx, Math.min(maxIdx, currentIdx + step));
            if (newIdx !== currentIdx) {
                currentIdx = newIdx;
                onChange(currentIdx, false);
            }
            accumulatedDelta = 0;
        }
    }, { passive: true });

    window.addEventListener("touchend", () => {
        if (isDragging) {
            isDragging = false;
            onChange(currentIdx, true);
        }
    });

    // 滚轮微调
    dial.addEventListener("wheel", (e) => {
        e.preventDefault();
        const step = e.deltaY < 0 ? 1 : -1;
        const newIdx = Math.max(minIdx, Math.min(maxIdx, currentIdx + step));
        if (newIdx !== currentIdx) {
            currentIdx = newIdx;
            onChange(currentIdx, true);
        }
    }, { passive: false });

    // 轻点切换下一档
    dial.addEventListener("click", () => {
        const nextIdx = (currentIdx + 1) > maxIdx ? minIdx : (currentIdx + 1);
        currentIdx = nextIdx;
        onChange(currentIdx, true);
    });
}

const emojiSpriteCache = {};

function getEmojiSprite(icon) {
    if (emojiSpriteCache[icon]) return emojiSpriteCache[icon];

    const size = 64;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext("2d");

    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";
    offCtx.font = "46px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    offCtx.fillText(icon, size / 2, size / 2 + 2);

    emojiSpriteCache[icon] = offCanvas;
    return offCanvas;
}

function updateSSRVisual(isImmediate = false) {
    const nVal = SSR_N_OPTS[ssrKnobState.nIdx];
    const rateInfo = SSR_RATE_OPTS[ssrKnobState.rateIdx];
    const probInfo = SSR_PROB_OPTS[ssrKnobState.probIdx];

    const dialN = document.getElementById("fl-dial-n");
    const dialRate = document.getElementById("fl-dial-rate");
    const dialProb = document.getElementById("fl-dial-prob");

    const pillN = document.getElementById("knob-val-n");
    const pillRate = document.getElementById("knob-val-rate");
    const pillProb = document.getElementById("knob-val-prob");

    if (dialN) {
        const deg = -135 + (ssrKnobState.nIdx / (SSR_N_OPTS.length - 1)) * 270;
        dialN.style.transform = `rotate(${deg}deg)`;
    }
    if (dialRate) {
        const deg = -135 + (ssrKnobState.rateIdx / (SSR_RATE_OPTS.length - 1)) * 270;
        dialRate.style.transform = `rotate(${deg}deg)`;
    }
    if (dialProb) {
        const deg = -135 + (ssrKnobState.probIdx / (SSR_PROB_OPTS.length - 1)) * 270;
        dialProb.style.transform = `rotate(${deg}deg)`;
    }

    if (pillN) pillN.textContent = `${nVal} 款一套`;
    if (pillRate) pillRate.textContent = `${rateInfo.label}`;
    if (pillProb) pillProb.textContent = `${probInfo.label}`;

    const K = rateInfo.denom;
    const P = probInfo.pct;

    const neededDraws = calculateFullSetDraws(P, nVal, K);
    const totalCost = neededDraws * PRICE_PER_BOX;

    const drawsElem = document.getElementById("verdict-draws-num");
    const costElem = document.getElementById("verdict-cost-num");
    const noteElem = document.getElementById("verdict-note-box");

    if (drawsElem) drawsElem.textContent = `${neededDraws} 袋`;
    if (costElem) costElem.textContent = `¥ ${totalCost.toLocaleString()}`;

    const duplicateCount = Math.max(0, neededDraws - 1 - nVal);

    if (noteElem) {
        if (P <= 0.20) {
            noteElem.innerHTML = `💡 <strong>欧皇速通！</strong>达成 <strong>${(P * 100).toFixed(0)}% 把握</strong> 集齐<strong>全套 ${nVal} 款普通款 + 1 款隐藏款</strong>（共 ${nVal + 1} 款大满贯），需购买 <strong>${neededDraws} 袋</strong>。产生 <strong>${duplicateCount} 个</strong> 普通款重复立牌。`;
        } else {
            noteElem.innerHTML = `💡 达成 <strong>${(P * 100).toFixed(0)}% 把握</strong> 集齐<strong>全套 ${nVal} 款普通款 + 1 款隐藏款</strong>（共 ${nVal + 1} 款大满贯），需购买整整 <strong>${neededDraws} 袋</strong>。为了这 1 只隐藏款，桌上堆满了 <strong>${duplicateCount} 个</strong> 普通款重复立牌！`;
        }
    }

    renderSSRSwarm(neededDraws, nVal);
}

function renderSSRSwarm(neededDraws, nVal) {
    const canvas = document.getElementById("ssr-swarm-canvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || 260;
    const cssHeight = rect.height || 240;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const centerX = cssWidth / 2;
    const centerY = cssHeight / 2;

    // 100% 真实全量 1:1 绘制：多少袋就实打实绘制多少颗粒子！
    const displayCount = neededDraws;
    const minR = 52;  // 内层贴近黄金核心立牌边缘
    const maxR = 114; // 外层延伸到圆环边缘
    const goldenAngle = 2.399963229728653; // 137.507764度 黄金角分布

    // 基础自适应字号：少时大立牌（28px~21px）饱满不空旷，多时（1500+）自适应微缩
    let baseSize;
    if (displayCount <= 20) {
        baseSize = 28;
    } else if (displayCount <= 60) {
        baseSize = 28 - ((displayCount - 20) / 40) * 7; // 28 -> 21px
    } else if (displayCount <= 180) {
        baseSize = 21 - ((displayCount - 60) / 120) * 6.5; // 21 -> 14.5px
    } else if (displayCount <= 500) {
        baseSize = 14.5 - ((displayCount - 180) / 320) * 4.5; // 14.5 -> 10px
    } else {
        baseSize = Math.max(5.5, 10 - ((displayCount - 500) / 1150) * 4.2); // 10 -> 5.8px
    }

    for (let i = 0; i < displayCount; i++) {
        let char;
        if (i < nVal) {
            char = ALL_CHARACTERS[i] || ALL_CHARACTERS[0];
        } else {
            const pseudoRand = ((i * 9301 + 49297) % 233280) / 233280;
            const randIdx = Math.floor(pseudoRand * nVal);
            char = ALL_CHARACTERS[randIdx] || ALL_CHARACTERS[0];
        }

        const norm = Math.sqrt((i + 0.5) / displayCount); // 均匀面积密度 (0 内 -> 1 外)
        const r = minR + norm * (maxR - minR);
        const theta = i * goldenAngle;

        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);

        // 强烈的非线性指数级内外反差（悬殊7倍比差）：
        // 内圈 norm=0 放大到 2.20x (内层极度醒目大立牌，清晰可辨)
        // 外圈 norm=1 陡降衰减至 0.30x (边缘极其微小星砂微尘)
        const decayCurve = Math.pow(1 - norm, 1.3);
        const scale = 0.30 + decayCurve * 1.90;
        const itemSize = Math.max(2.5, Math.min(36, Math.round(baseSize * scale * 10) / 10));

        const sprite = getEmojiSprite(char.icon);
        ctx.drawImage(sprite, x - itemSize / 2, y - itemSize / 2, itemSize, itemSize);
    }
}

// 基于二级市场博弈闭环的公允建议定价计算：
// 1. 全套打包建议价 = 官方原价总额 * 1.50 (微低于单买全部，让混合策略在图表中间形成完美的U型最优解谷底)
function getRecFullPrice(N, pBox) {
    return Math.round((N * pBox * 1.50) / 5) * 5; // 5元取整
}

// 2. 单买确认款建议价 = 单抽原价 * 1.55 (单款挑选溢价，确保买齐N只单买总价高于打包一口价)
function getRecSinglePrice(pBox) {
    return Math.round(pBox * 1.55);
}

function applyRecSinglePrice() {
    const priceSlider = document.getElementById("ev-price-slider");
    const singleSlider = document.getElementById("ev-single-slider");
    if (!priceSlider || !singleSlider) return;
    const pBox = parseFloat(priceSlider.value) || 29;
    const rec = getRecSinglePrice(pBox);
    singleSlider.value = rec;
    updateEVFromSliders();
}

function applyRecFullPrice() {
    const nSlider = document.getElementById("ev-n-slider");
    const priceSlider = document.getElementById("ev-price-slider");
    const fullSlider = document.getElementById("ev-full-slider");
    if (!nSlider || !priceSlider || !fullSlider) return;
    const N = parseInt(nSlider.value, 10) || 6;
    const pBox = parseFloat(priceSlider.value) || 29;
    const rec = getRecFullPrice(N, pBox);
    fullSlider.value = rec;
    updateEVFromSliders();
}

function updateEVFromSliders() {
    const nSlider = document.getElementById("ev-n-slider");
    const priceSlider = document.getElementById("ev-price-slider");
    const singleSlider = document.getElementById("ev-single-slider");
    const fullSlider = document.getElementById("ev-full-slider");
    const chartContainer = document.getElementById("ev-stacked-chart");
    const summaryElem = document.getElementById("ev-summary-callout");

    if (!nSlider || !priceSlider || !singleSlider || !fullSlider || !chartContainer) return;

    const N = parseInt(nSlider.value, 10);
    const pBox = parseFloat(priceSlider.value) || 29;
    const pSingle = parseFloat(singleSlider.value) || 35;
    const pFull = parseFloat(fullSlider.value) || 280;

    document.getElementById("ev-n-badge").textContent = `${N} 款一套`;
    document.getElementById("ev-price-badge").textContent = `¥ ${pBox} / 抽`;
    document.getElementById("ev-single-badge").textContent = `¥ ${pSingle} / 只`;
    document.getElementById("ev-full-badge").textContent = `¥ ${pFull} / 套`;

    // 动态更新公允建议定价按钮
    const recSingle = getRecSinglePrice(pBox);
    const recFull = getRecFullPrice(N, pBox);
    const recSingleBtn = document.getElementById("ev-rec-single-btn");
    const recFullBtn = document.getElementById("ev-rec-full-btn");
    if (recSingleBtn) recSingleBtn.textContent = `建议 ¥${recSingle}`;
    if (recFullBtn) recFullBtn.textContent = `建议 ¥${recFull}`;

    // 1. 构建所有策略列表
    const strategies = [];

    // 判断一口价打包与分别单买 N 只哪个更划算
    const singleAllCost = N * pSingle;
    const isSingleCheaper = (singleAllCost < pFull);

    if (isSingleCheaper) {
        // 单买 N 只更便宜：直接显示橙色的单买 N 个策略
        strategies.push({
            type: "used_singles",
            name: `二手单买 ${N} 款`,
            blindDraws: 0,
            blindCost: 0,
            usedCost: singleAllCost,
            totalCost: singleAllCost,
            isOrange: true,
            usedCount: N
        });
    } else {
        // 打包一口价更便宜：显示紫色的全套打包策略
        strategies.push({
            type: "used_full",
            name: "二手全套打包",
            blindDraws: 0,
            blindCost: 0,
            usedCost: pFull,
            totalCost: pFull,
            isPurple: true
        });
    }

    // 计算盲抽前 k 款不同款式的期望抽数
    const harmonicPrefix = [0];
    for (let j = 0; j < N; j++) {
        harmonicPrefix.push(harmonicPrefix[j] + N / (N - j));
    }

    // 策略 1 ~ N-1：抽 k 款 + 补 N-k 只
    for (let k = 1; k < N; k++) {
        const expDraws = harmonicPrefix[k];
        const blindCost = expDraws * pBox;
        const usedCount = N - k;
        const usedCost = usedCount * pSingle;
        const totalCost = blindCost + usedCost;

        strategies.push({
            type: "hybrid",
            k: k,
            usedCount: usedCount,
            name: `抽 ${k} 款 + 补 ${usedCount} 只`,
            blindDraws: expDraws,
            blindCost: blindCost,
            usedCost: usedCost,
            totalCost: totalCost
        });
    }

    // 策略 N：纯盲抽到底
    const pureExpDraws = harmonicPrefix[N];
    const pureBlindCost = pureExpDraws * pBox;
    strategies.push({
        type: "pure_blind",
        name: "纯盲抽到底",
        blindDraws: pureExpDraws,
        blindCost: pureBlindCost,
        usedCost: 0,
        totalCost: pureBlindCost
    });

    // 2. 寻找最优策略 (总花费最低) 与 最大花费 (用于确定 100% 柱长比例)
    let minCost = Infinity;
    let maxCost = -Infinity;
    let bestStrategy = null;

    strategies.forEach(s => {
        if (s.totalCost < minCost) {
            minCost = s.totalCost;
            bestStrategy = s;
        }
        if (s.totalCost > maxCost) {
            maxCost = s.totalCost;
        }
    });

    // 3. 渲染横向堆叠柱状图
    chartContainer.innerHTML = "";
    strategies.forEach(s => {
        const isBest = (s === bestStrategy);
        const row = document.createElement("div");
        row.className = `ev-row ${isBest ? "is-best" : ""}`;

        const widthPct = Math.max(12, Math.min(100, (s.totalCost / maxCost) * 100)).toFixed(1);
        const blindSegPct = s.totalCost > 0 ? ((s.blindCost / s.totalCost) * 100).toFixed(1) : 0;
        const usedSegPct = s.totalCost > 0 ? ((s.usedCost / s.totalCost) * 100).toFixed(1) : 0;

        let barSegmentsHtml = "";
        if (s.isPurple) {
            barSegmentsHtml = `<div class="ev-bar-seg purple" style="width: 100%;">一口价 ¥${s.totalCost.toFixed(0)}</div>`;
        } else if (s.isOrange) {
            barSegmentsHtml = `<div class="ev-bar-seg orange" style="width: 100%;">单买${s.usedCount}只 ¥${s.totalCost.toFixed(0)}</div>`;
        } else {
            if (s.blindCost > 0) {
                const bPct = parseFloat(blindSegPct);
                let text = "";
                if (bPct >= 20) text = `抽${s.blindDraws.toFixed(1)}次 ¥${s.blindCost.toFixed(0)}`;
                else if (bPct >= 9) text = `¥${s.blindCost.toFixed(0)}`;
                barSegmentsHtml += `<div class="ev-bar-seg blue" style="width: ${blindSegPct}%;" title="盲抽期望：${s.blindDraws.toFixed(1)}次 (¥${s.blindCost.toFixed(0)})">${text}</div>`;
            }
            if (s.usedCost > 0) {
                const uPct = parseFloat(usedSegPct);
                let text = "";
                if (uPct >= 20) text = `补${s.usedCount}只 ¥${s.usedCost.toFixed(0)}`;
                else if (uPct >= 9) text = `¥${s.usedCost.toFixed(0)}`;
                barSegmentsHtml += `<div class="ev-bar-seg orange" style="width: ${usedSegPct}%;" title="二手补齐：${s.usedCount}只 (¥${s.usedCost.toFixed(0)})">${text}</div>`;
            }
        }

        row.innerHTML = `
            <div class="ev-row-label">
                <span class="ev-strategy-name">${s.name}</span>
                ${isBest ? '<span class="ev-best-badge">🏆 最优解</span>' : ''}
            </div>
            <div class="ev-bar-track">
                <div class="ev-stacked-bar" style="width: ${widthPct}%;">
                    ${barSegmentsHtml}
                </div>
            </div>
            <span class="ev-total-val">¥ ${s.totalCost.toFixed(1)}</span>
        `;
        chartContainer.appendChild(row);
    });

    // 4. 渲染底部理性决策点评
    if (summaryElem && bestStrategy) {
        const saved = pureBlindCost - bestStrategy.totalCost;
        const savedPct = ((saved / pureBlindCost) * 100).toFixed(0);

        if (bestStrategy.type === "used_full") {
            summaryElem.innerHTML = `💡 <strong>数学家决策：</strong>当前二手全套打包价 (¥${pFull}) 极具性价比！相比自己纯盲抽期望花费 (¥${pureBlindCost.toFixed(1)}) <strong>净省 ¥ ${saved.toFixed(1)} (立省 ${savedPct}%)</strong>，直接全套打包不仅省钱，还彻底免去开盒重复与非酋翻车风险！`;
        } else if (bestStrategy.type === "used_singles") {
            summaryElem.innerHTML = `💡 <strong>数学家决策：</strong>当前分别【单买 ${N} 个确认款】(¥${singleAllCost}) 相比全套打包 (¥${pFull}) 与纯盲抽 (¥${pureBlindCost.toFixed(1)}) 都是最省钱的，<strong>净省 ¥ ${saved.toFixed(1)} (立省 ${savedPct}%)</strong>！`;
        } else if (bestStrategy.type === "pure_blind") {
            summaryElem.innerHTML = `💡 <strong>数学家决策：</strong>二手平台单买与打包溢价过高，自己纯盲抽期望总花费 (¥${pureBlindCost.toFixed(1)}) 反而是最优选择！`;
        } else {
            summaryElem.innerHTML = `💡 <strong>数学家决策：</strong>【抽 ${bestStrategy.k} 款 + 补 ${bestStrategy.usedCount} 只】是当前行情的<strong>黄金平衡解</strong>！平均只需花费 <strong>¥ ${bestStrategy.totalCost.toFixed(1)}</strong>，相比头铁纯盲抽 (¥${pureBlindCost.toFixed(1)}) <strong>净省 ¥ ${saved.toFixed(1)} (立省 ${savedPct}%)</strong>。既享受了前 ${bestStrategy.k} 次开箱的爽快感，又在难度最高的后 ${bestStrategy.usedCount} 只上果断二手单买精准止损！`;
        }
    }
}
