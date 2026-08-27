// ==========================================================================
// 《请出示证件：神秘 VIP 与篡位者航班》- 核心游戏引擎与过场动画编排 (SCRIPT.JS V5)
// ==========================================================================

// ===== 全局游戏状态 =====
const gameState = {
    day: 1,
    isTutorial: true,            // 开局新手教程标志 (N = 2)
    flightNumber: "TRIAL-02",
    totalSeats: 2,               // 教程阶段 2 个座位
    currentPassengerIndex: 0,    // 当前窗口处理的乘客序号 (1 ~ N)
    passengers: [],              // 本趟航班的所有乘客对象
    cabinSeats: {},              // 座位占用字典 { 1: passengerId, 2: passengerId ... }
    
    // 执勤统计
    stats: {
        flightsCompleted: 0,
        vipWins: 0,
        vipLosses: 0
    },
    
    // 状态标记
    isEntrantInBooth: false,
    currentEntrant: null,
    currentStamp: null,
    isMysteryEventTriggered: false,
    dialogueTyping: false
};

// 预设名字库
const FIRST_NAMES = ["IVAN", "SERGEI", "DIMITRI", "ELENA", "NATASHA", "BORIS", "ALEXEI", "SONIA", "YURI", "KATIA"];
const LAST_NAMES = ["V.", "K.", "P.", "S.", "M.", "N.", "B.", "G.", "T.", "Z."];

let highestZIndex = 100;

// ===== 页面初始化 =====
document.addEventListener("DOMContentLoaded", () => {
    initDraggableSystem();
    bindKeyboardShortcuts();
    startTutorialPrologue();
});

// ===== 开局神秘人交代任务与新手引导 =====
function startTutorialPrologue() {
    gameState.isTutorial = true;
    gameState.flightNumber = "TRIAL-02";
    gameState.totalSeats = 2;
    
    initFlightState();
    
    // 绘制神秘人黑风衣画像
    const canvas = document.getElementById("portrait-canvas");
    canvas.classList.remove("is-walking-in");
    void canvas.offsetWidth; // 触发 reflow
    canvas.classList.add("is-walking-in");
    drawMysteryPortrait(canvas);
    
    typeDialogue(`[神秘人] "初次执勤，检票员。今晚有一项绝密指令：确保末位座位的【神秘 VIP】顺利入座。在接管大航班前，先用这架 2 人测试机熟悉操作。"`, () => {
        setTimeout(() => {
            typeDialogue(`[神秘人] "规则很简单：查验左侧雷达，核实专属座位是否被占。准备好后，按红色喇叭呼叫 1 号乘客。"`);
        }, 2800);
    });
}

// ===== 键盘快捷键 =====
function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        if (gameState.dialogueTyping) return;
        
        if (e.code === "Space" || e.key === "n" || e.key === "N") {
            e.preventDefault();
            callNextEntrant();
        } else if (e.key === "1") {
            pressStamp("ASSIGNED");
        } else if (e.key === "2") {
            pressStamp("RANDOM");
        } else if (e.code === "Enter") {
            const returnBtn = document.getElementById("btn-return-doc");
            if (returnBtn && !returnBtn.disabled) {
                returnDocumentToPassenger();
            }
        }
    });
}

// ===== 物理桌面拖拽引擎 (支持登机牌、便签、印章盒) =====
function initDraggableSystem() {
    const draggables = document.querySelectorAll(".draggable-item");
    const surface = document.getElementById("counter-surface");

    draggables.forEach(el => {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        el.addEventListener("mousedown", (e) => {
            if (e.target.closest("button") || e.target.closest(".btn-return-doc")) {
                return;
            }

            isDragging = true;
            el.classList.add("is-dragging");
            highestZIndex += 1;
            el.style.zIndex = highestZIndex;

            const rect = el.getBoundingClientRect();
            const surfaceRect = surface.getBoundingClientRect();

            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left - surfaceRect.left;
            initialTop = rect.top - surfaceRect.top;

            el.style.left = `${initialLeft}px`;
            el.style.top = `${initialTop}px`;
            el.style.right = "auto";
            el.style.bottom = "auto";

            const onMouseMove = (moveEvent) => {
                if (!isDragging) return;
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                let nextLeft = initialLeft + dx;
                let nextTop = initialTop + dy;

                const maxLeft = surfaceRect.width - el.offsetWidth;
                const maxTop = surfaceRect.height - el.offsetHeight;
                nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
                nextTop = Math.max(0, Math.min(nextTop, maxTop));

                el.style.left = `${nextLeft}px`;
                el.style.top = `${nextTop}px`;
            };

            const onMouseUp = () => {
                isDragging = false;
                el.classList.remove("is-dragging");
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    });
}

// ===== 初始化航班状态 =====
function initFlightState() {
    gameState.currentPassengerIndex = 0;
    gameState.isEntrantInBooth = false;
    gameState.currentEntrant = null;
    gameState.currentStamp = null;
    gameState.cabinSeats = {};
    
    document.getElementById("cabin-flight-title").textContent = `✈️ 航班客舱实时雷达 (${gameState.flightNumber})`;
    document.getElementById("memo-flight").textContent = gameState.flightNumber;
    document.getElementById("pass-flight-code").textContent = gameState.flightNumber;
    
    for (let i = 1; i <= gameState.totalSeats; i++) {
        gameState.cabinSeats[i] = null;
    }
    
    gameState.passengers = [];
    for (let i = 1; i <= gameState.totalSeats; i++) {
        const isFirst = (i === 1);
        const isVip = (i === gameState.totalSeats);
        
        const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + " " +
                     LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        
        gameState.passengers.push({
            id: i,
            name: name,
            assignedSeat: isFirst ? null : i,
            isFirst: isFirst,
            isVip: isVip,
            actualSeat: null,
            seed: Math.random() * 10000
        });
    }
    
    renderCabinGrid();
    renderQueue();
    
    const passCard = document.getElementById("boarding-pass");
    passCard.classList.add("hidden");
    document.getElementById("btn-return-doc").disabled = true;
    document.getElementById("stamp-impression").innerHTML = `<span class="stamp-placeholder-hint">← 拖动印章盒对准此处下压盖印</span>`;
    document.getElementById("queue-count").textContent = `等待登机: ${gameState.totalSeats} 人`;
    document.getElementById("status-indicator").className = "indicator-light";
    document.getElementById("btn-next-entrant").disabled = false;
}

// ===== 渲染排队小人队列 (在铁丝网后从左至右排入) =====
function renderQueue() {
    const queueLine = document.getElementById("queue-line");
    queueLine.innerHTML = "";
    
    for (let i = gameState.currentPassengerIndex + 1; i <= gameState.totalSeats; i++) {
        const sprite = document.createElement("div");
        sprite.className = "queue-sprite" + (i === gameState.totalSeats ? " is-vip-sprite" : "");
        sprite.id = `queue-sprite-${i}`;
        
        if (i === gameState.currentPassengerIndex + 1) {
            sprite.classList.add("active-entrant");
        }
        
        const badge = document.createElement("span");
        badge.className = "sprite-badge";
        badge.textContent = i === gameState.totalSeats ? `👑${i}` : String(i);
        sprite.appendChild(badge);
        
        queueLine.appendChild(sprite);
    }
}

// ===== 渲染客舱座席雷达 =====
function renderCabinGrid() {
    const grid = document.getElementById("cabin-seats-grid");
    grid.innerHTML = "";
    
    for (let i = 1; i <= gameState.totalSeats; i++) {
        const occupantId = gameState.cabinSeats[i];
        const cell = document.createElement("div");
        cell.className = "seat-cell";
        
        if (i === gameState.totalSeats) {
            cell.classList.add("is-vip");
        }
        
        if (occupantId === null) {
            cell.classList.add("is-empty");
            cell.innerHTML = `
                <div class="seat-num-tag">${i === gameState.totalSeats ? "👑 " + i : i}</div>
                <div class="seat-status-desc">[空闲]</div>
            `;
        } else {
            const isCorrect = (occupantId === i);
            cell.classList.add(isCorrect ? "is-assigned-correct" : "is-stolen");
            cell.innerHTML = `
                <div class="seat-num-tag">${i === gameState.totalSeats ? "👑 " + i : i}</div>
                <div class="seat-status-desc">${occupantId}号就座</div>
            `;
        }
        
        grid.appendChild(cell);
    }
    
    const vipSeatOccupant = gameState.cabinSeats[gameState.totalSeats];
    const vipIndicator = document.getElementById("vip-status-indicator");
    if (vipSeatOccupant === null) {
        vipIndicator.textContent = `👑 VIP (No.${gameState.totalSeats}) 状态: 空闲`;
        vipIndicator.style.backgroundColor = "#f7e2a3";
    } else if (vipSeatOccupant === gameState.totalSeats) {
        vipIndicator.textContent = `👑 VIP (No.${gameState.totalSeats}) 状态: 成功归位! 🎉`;
        vipIndicator.style.backgroundColor = "#c6eac8";
    } else {
        vipIndicator.textContent = `👑 VIP (No.${gameState.totalSeats}) 状态: 被 ${vipSeatOccupant}号 抢占! ❌`;
        vipIndicator.style.backgroundColor = "#f7c1be";
    }
}

// ===== 叫号：下一位乘客入场动画编排 =====
function callNextEntrant() {
    if (gameState.isEntrantInBooth || gameState.dialogueTyping) return;
    
    if (gameState.currentPassengerIndex >= gameState.totalSeats) {
        typeDialogue("本趟航班所有乘客已全部登机完成！正在结算报告...");
        setTimeout(() => finalizeFlight(), 1200);
        return;
    }
    
    // 锁定呼叫按钮，亮起忙碌红灯
    document.getElementById("btn-next-entrant").disabled = true;
    document.getElementById("status-indicator").className = "indicator-light busy";
    
    gameState.currentPassengerIndex += 1;
    const passenger = gameState.passengers[gameState.currentPassengerIndex - 1];
    gameState.currentEntrant = passenger;
    gameState.isEntrantInBooth = true;
    gameState.currentStamp = null;
    
    // 1. 队列小人穿过右侧闸门动画
    const currentSprite = document.getElementById(`queue-sprite-${passenger.id}`);
    const turnstileDoor = document.getElementById("turnstile-door");
    if (turnstileDoor) {
        turnstileDoor.classList.add("open");
        setTimeout(() => turnstileDoor.classList.remove("open"), 500);
    }
    if (currentSprite) {
        currentSprite.classList.add("is-leaving");
    }
    
    document.getElementById("queue-count").textContent = `等待登机: ${gameState.totalSeats - gameState.currentPassengerIndex} 人`;
    
    // 2. 窗口里小人缓缓走入窗口动画 (is-walking-in)
    const portraitCanvas = document.getElementById("portrait-canvas");
    portraitCanvas.classList.remove("is-walking-in");
    void portraitCanvas.offsetWidth; // 重置 CSS 动画
    portraitCanvas.classList.add("is-walking-in");
    
    drawPixelPortrait(portraitCanvas, passenger);
    drawPixelPhoto(document.getElementById("pass-photo-canvas"), passenger);
    
    // 隐藏登机牌，等小人完全走入并说完话后再递出
    document.getElementById("boarding-pass").classList.add("hidden");
    
    // 3. 等待小人走入就绪 (500ms 后)，开始显示对话并慢速跳字
    setTimeout(() => {
        let dialogueText = "";
        if (passenger.isFirst) {
            dialogueText = `[1号] ${passenger.name}: "呃……长官，我的登机牌好像找不到了，随便给我安排个位吧！"`;
        } else {
            const isSeatTaken = (gameState.cabinSeats[passenger.assignedSeat] !== null);
            if (isSeatTaken) {
                const usurperId = gameState.cabinSeats[passenger.assignedSeat];
                dialogueText = `[${passenger.id}号] ${passenger.name}: "报告长官！我的 ${passenger.assignedSeat} 号座位好像被 ${usurperId} 号抢了！我该怎么办？"`;
            } else {
                dialogueText = `[${passenger.id}号] ${passenger.name}: "长官好，这是我的登机牌，我被分配在 ${passenger.assignedSeat} 号座位。"`;
            }
        }
        
        // 4. 对话打字机跳字 (慢速跳字 ~36ms/字)
        typeDialogue(dialogueText, () => {
            // 5. 对话全部跳完后，递出单子 (登机牌滑出)
            presentBoardingPass(passenger);
        });
    }, 550);
}

// ===== 递出纸质登机牌 =====
function presentBoardingPass(passenger) {
    const passCard = document.getElementById("boarding-pass");
    const stampSlot = document.getElementById("stamp-impression");
    stampSlot.innerHTML = `<span class="stamp-placeholder-hint">← 拖动印章盒对准此处下压盖印</span>`;
    document.getElementById("btn-return-doc").disabled = true;
    
    if (passenger.isFirst) {
        document.getElementById("pass-name").textContent = passenger.name;
        document.getElementById("pass-seat").textContent = "无票 (LOST)";
        document.getElementById("pass-type-badge").textContent = "UNASSIGNED";
    } else {
        document.getElementById("pass-name").textContent = passenger.name;
        document.getElementById("pass-seat").textContent = passenger.assignedSeat < 10 ? "0" + passenger.assignedSeat : String(passenger.assignedSeat);
        document.getElementById("pass-type-badge").textContent = passenger.isVip ? "👑 VIP GUEST" : "ECONOMY";
    }
    
    // 从右上由上往下滑入
    passCard.style.left = "auto";
    passCard.style.right = "260px";
    passCard.style.top = "16px";
    passCard.classList.remove("hidden");
    highestZIndex += 1;
    passCard.style.zIndex = highestZIndex;
}

// ===== 实体下压盖章机制 (按压把手) =====
function pressStamp(stampType) {
    if (!gameState.isEntrantInBooth || !gameState.currentEntrant) return;
    
    const passCard = document.getElementById("boarding-pass");
    if (passCard.classList.contains("hidden")) return;
    
    const unitId = (stampType === "ASSIGNED") ? "stamp-unit-assigned" : "stamp-unit-random";
    const knob = document.querySelector(`#${unitId} .stamp-knob`);
    
    knob.classList.add("is-pressing");
    setTimeout(() => knob.classList.remove("is-pressing"), 180);
    
    gameState.currentStamp = stampType;
    const stampSlot = document.getElementById("stamp-impression");
    const rot = (Math.random() * 6 - 3).toFixed(1);
    
    if (stampType === "ASSIGNED") {
        stampSlot.innerHTML = `<div class="stamped-mark stamped-assigned" style="--rot:${rot}">🔴 按序就座</div>`;
    } else {
        stampSlot.innerHTML = `<div class="stamped-mark stamped-random" style="--rot:${rot}">🔵 批准随意</div>`;
    }
    
    document.getElementById("btn-return-doc").disabled = false;
}

// ===== 放行乘客走入客舱 =====
function returnDocumentToPassenger() {
    if (!gameState.isEntrantInBooth || !gameState.currentEntrant || !gameState.currentStamp) return;
    
    const passenger = gameState.currentEntrant;
    const stamp = gameState.currentStamp;
    
    // 规则校验
    let isRuleViolated = false;
    let violationReason = "";
    
    if (passenger.isFirst) {
        if (stamp !== "RANDOM") {
            isRuleViolated = true;
            violationReason = "1号乘客无票，必须盖 🔵【批准随意就座】！";
        }
    } else {
        const isSeatTaken = (gameState.cabinSeats[passenger.assignedSeat] !== null);
        if (!isSeatTaken && stamp !== "ASSIGNED") {
            isRuleViolated = true;
            violationReason = `该乘客 ${passenger.assignedSeat} 号座位完好空闲，必须盖 🔴【按序就座】！`;
        } else if (isSeatTaken && stamp !== "RANDOM") {
            isRuleViolated = true;
            violationReason = `该乘客 ${passenger.assignedSeat} 号已被占用，必须盖 🔵【批准随意就座】！`;
        }
    }
    
    if (isRuleViolated) {
        issueCitation(violationReason);
    }
    
    // 执行入座逻辑
    let finalSeat = null;
    if (stamp === "ASSIGNED") {
        finalSeat = passenger.assignedSeat;
    } else {
        const freeSeats = [];
        for (let i = 1; i <= gameState.totalSeats; i++) {
            if (gameState.cabinSeats[i] === null) {
                freeSeats.push(i);
            }
        }
        finalSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
    }
    
    passenger.actualSeat = finalSeat;
    gameState.cabinSeats[finalSeat] = passenger.id;
    
    renderCabinGrid();
    document.getElementById("boarding-pass").classList.add("hidden");
    gameState.isEntrantInBooth = false;
    gameState.currentEntrant = null;
    document.getElementById("status-indicator").className = "indicator-light";
    document.getElementById("btn-next-entrant").disabled = false;
    
    renderQueue();
    
    if (finalSeat === passenger.assignedSeat) {
        typeDialogue(`[${passenger.id}号] "谢谢长官！顺利坐回 ${finalSeat} 号位。"`);
    } else {
        typeDialogue(`[${passenger.id}号] "好吧……我走向了 ${finalSeat} 号空座位入座。"`);
    }
}

// ===== 弹出违规罚单 =====
function issueCitation(reason) {
    document.getElementById("citation-reason").textContent = reason;
    document.getElementById("citation-paper").classList.remove("hidden");
}

function dismissCitation() {
    document.getElementById("citation-paper").classList.add("hidden");
}

// ===== 结算当前航班 =====
function finalizeFlight() {
    gameState.stats.flightsCompleted += 1;
    const vipSuccess = (gameState.cabinSeats[gameState.totalSeats] === gameState.totalSeats);
    
    if (vipSuccess) {
        gameState.stats.vipWins += 1;
    } else {
        gameState.stats.vipLosses += 1;
    }
    
    document.getElementById("stat-flights").textContent = String(gameState.stats.flightsCompleted);
    document.getElementById("stat-vip-wins").textContent = String(gameState.stats.vipWins);
    document.getElementById("stat-vip-losses").textContent = String(gameState.stats.vipLosses);
    const rate = ((gameState.stats.vipWins / gameState.stats.flightsCompleted) * 100).toFixed(1);
    document.getElementById("stat-vip-rate").textContent = `${rate}%`;
    
    if (gameState.isTutorial) {
        const tutorialResult = vipSuccess ? 
            "🎉 2 人测试通过！VIP 成功入座。" : 
            "❌ 2 人测试结束：1号抢了 2号VIP的座位，VIP被迫坐了 1号。";
        
        typeDialogue(`${tutorialResult} 你已掌握基本规则！正在为你接入 5 人正规航班 MA-404...`, () => {
            setTimeout(() => {
                gameState.isTutorial = false;
                gameState.flightNumber = "MA-404";
                gameState.totalSeats = 5;
                initFlightState();
                typeDialogue("航班 MA-404 已就绪！请按喇叭呼叫 1 号乘客登机。");
            }, 3000);
        });
    } else {
        const outcomeText = vipSuccess ? 
            `🎉 航班结算：第 ${gameState.totalSeats} 号神秘 VIP 顺利坐回宝座！` : 
            `❌ 航班结算：第 ${gameState.totalSeats} 号神秘 VIP 座位遭挤占失败！`;
        
        typeDialogue(`${outcomeText} (已完成 ${gameState.stats.flightsCompleted} 班，VIP 成功率: ${rate}%)。准备下一班...`);
        
        setTimeout(() => {
            initFlightState();
            typeDialogue("新航班已就绪，请继续呼叫 1 号乘客。");
        }, 2800);
    }
}

// ===== 打字机对话输出引擎 (慢速沉浸跳字 ~36ms/字) =====
function typeDialogue(text, callback) {
    const el = document.getElementById("tape-dialogue");
    gameState.dialogueTyping = true;
    el.textContent = "";
    
    let i = 0;
    const speed = 36; // 舒适温润的打字节奏
    
    const timer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(timer);
            gameState.dialogueTyping = false;
            if (callback) callback();
        }
    }, speed);
}

// ===== 手册切换 Tab =====
function switchManualTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
    
    if (tabName === "cabin") {
        document.getElementById("tab-btn-cabin").classList.add("active");
        document.getElementById("tab-cabin").classList.remove("hidden");
    } else if (tabName === "rules") {
        document.getElementById("tab-btn-rules").classList.add("active");
        document.getElementById("tab-rules").classList.remove("hidden");
    } else if (tabName === "stats") {
        document.getElementById("tab-btn-stats").classList.add("active");
        document.getElementById("tab-stats").classList.remove("hidden");
    }
}

// ===== 过程式像素肖像绘制 (Canvas 8-Bit) =====
function drawPixelPortrait(canvas, passenger) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = "#21282b";
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = passenger.isFirst ? "#524436" : (passenger.isVip ? "#705822" : "#38473c");
    ctx.fillRect(16, 75, 68, 50);
    
    ctx.fillStyle = "#fff";
    ctx.fillRect(42, 75, 16, 12);
    
    ctx.fillStyle = passenger.isFirst ? "#cfa27c" : "#e0ba97";
    ctx.fillRect(30, 25, 40, 50);
    
    ctx.fillStyle = "#111";
    ctx.fillRect(38, 44, 6, 6);
    ctx.fillRect(56, 44, 6, 6);
    
    ctx.fillStyle = passenger.isFirst ? "#2d1f15" : "#1a2124";
    if (passenger.isFirst) {
        ctx.fillRect(24, 15, 52, 16);
        ctx.fillRect(20, 22, 12, 15);
        ctx.fillRect(68, 20, 12, 18);
    } else {
        ctx.fillRect(28, 18, 44, 14);
    }
    
    ctx.fillStyle = "#8a5840";
    ctx.fillRect(44, 60, 12, 4);
}

function drawMysteryPortrait(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = "#15191b";
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = "#0d1012";
    ctx.fillRect(10, 60, 80, 65);
    
    ctx.fillStyle = "#07090a";
    ctx.fillRect(12, 28, 76, 12);
    ctx.fillRect(24, 12, 52, 20);
    
    ctx.fillStyle = "#1b2024";
    ctx.fillRect(30, 38, 40, 30);
    
    ctx.fillStyle = "#f5d442";
    ctx.fillRect(38, 46, 6, 4);
    ctx.fillRect(56, 46, 6, 4);
}

function drawPixelPhoto(canvas, passenger) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = "#d8cdb4";
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = "#4a4235";
    ctx.fillRect(8, 32, 32, 28);
    ctx.fillStyle = "#7a6e5b";
    ctx.fillRect(14, 10, 20, 24);
    
    ctx.fillStyle = "#111";
    ctx.fillRect(18, 18, 3, 3);
    ctx.fillRect(27, 18, 3, 3);
}
