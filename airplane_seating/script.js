// ==========================================================================
// 《请出示证件：神秘 VIP 与篡位者航班》- 核心游戏引擎与状态机 (SCRIPT.JS)
// ==========================================================================

// ===== 全局游戏状态 =====
const gameState = {
    day: 1,
    flightNumber: "MA-404",
    totalSeats: 5,               // 初始小班次 N = 5
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

// ===== 页面初始化 =====
document.addEventListener("DOMContentLoaded", () => {
    initFlight();
    bindKeyboardShortcuts();
});

// ===== 键盘快捷键 =====
function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        if (gameState.dialogueTyping) return;
        
        if (e.code === "Space" || e.key === "n" || e.key === "N") {
            e.preventDefault();
            callNextEntrant();
        } else if (e.code === "Tab") {
            e.preventDefault();
            toggleStampDrawer();
        } else if (e.key === "1") {
            applyStamp("ASSIGNED");
        } else if (e.key === "2") {
            applyStamp("RANDOM");
        } else if (e.code === "Enter") {
            const returnBtn = document.getElementById("btn-return-doc");
            if (returnBtn && !returnBtn.disabled) {
                returnDocumentToPassenger();
            }
        }
    });
}

// ===== 初始化新航班 =====
function initFlight() {
    gameState.currentPassengerIndex = 0;
    gameState.isEntrantInBooth = false;
    gameState.currentEntrant = null;
    gameState.currentStamp = null;
    gameState.cabinSeats = {};
    
    // 初始化空座位
    for (let i = 1; i <= gameState.totalSeats; i++) {
        gameState.cabinSeats[i] = null;
    }
    
    // 生成 N 位乘客数据
    gameState.passengers = [];
    for (let i = 1; i <= gameState.totalSeats; i++) {
        const isFirst = (i === 1);
        const isVip = (i === gameState.totalSeats);
        
        const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + " " +
                     LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        
        gameState.passengers.push({
            id: i,
            name: name,
            assignedSeat: isFirst ? null : i, // 1号无票/无固定座位
            isFirst: isFirst,
            isVip: isVip,
            actualSeat: null,
            seed: Math.random() * 10000 // 用于像素头像生成的固定随机种子
        });
    }
    
    // 渲染客舱网格
    renderCabinGrid();
    renderQueue();
    
    // 重置桌面
    document.getElementById("boarding-pass").classList.add("hidden");
    document.getElementById("btn-return-doc").disabled = true;
    document.getElementById("stamp-impression").innerHTML = "";
    document.getElementById("queue-count").textContent = `等待登机: ${gameState.totalSeats} 人`;
    document.getElementById("status-indicator").className = "indicator-light";
    
    typeDialogue("航班已就绪。请按红色按钮呼叫 1 号乘客。");
}

// ===== 渲染排队小人队列 =====
function renderQueue() {
    const queueLine = document.getElementById("queue-line");
    queueLine.innerHTML = "";
    
    for (let i = gameState.currentPassengerIndex + 1; i <= gameState.totalSeats; i++) {
        const sprite = document.createElement("div");
        sprite.className = "queue-sprite" + (i === gameState.totalSeats ? " is-vip-sprite" : "");
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
                <div class="seat-status-desc">${occupantId}号占有</div>
            `;
        }
        
        grid.appendChild(cell);
    }
    
    // 更新 VIP 状态栏
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

// ===== 叫号：下一位乘客进屋 =====
function callNextEntrant() {
    if (gameState.isEntrantInBooth) return;
    
    // 检查是否触发神秘人叩窗
    if (!gameState.isMysteryEventTriggered && gameState.stats.flightsCompleted >= 2) {
        triggerMysteryEncounter();
        return;
    }
    
    if (gameState.currentPassengerIndex >= gameState.totalSeats) {
        typeDialogue("本趟航班所有乘客已全部登机完成！正在结算报告...");
        setTimeout(() => finalizeFlight(), 1200);
        return;
    }
    
    gameState.currentPassengerIndex += 1;
    const passenger = gameState.passengers[gameState.currentPassengerIndex - 1];
    gameState.currentEntrant = passenger;
    gameState.isEntrantInBooth = true;
    gameState.currentStamp = null;
    
    document.getElementById("status-indicator").className = "indicator-light busy";
    document.getElementById("queue-count").textContent = `等待登机: ${gameState.totalSeats - gameState.currentPassengerIndex} 人`;
    renderQueue();
    
    // 绘制窗口大像素头像
    drawPixelPortrait(document.getElementById("portrait-canvas"), passenger);
    
    // 绘制登机牌一寸照
    drawPixelPhoto(document.getElementById("pass-photo-canvas"), passenger);
    
    // 呈现登机牌
    const passCard = document.getElementById("boarding-pass");
    const stampSlot = document.getElementById("stamp-impression");
    stampSlot.innerHTML = "";
    document.getElementById("btn-return-doc").disabled = true;
    
    if (passenger.isFirst) {
        document.getElementById("pass-name").textContent = passenger.name;
        document.getElementById("pass-seat").textContent = "无票 (LOST)";
        document.getElementById("pass-type-badge").textContent = "UNASSIGNED";
        passCard.classList.remove("hidden");
        
        typeDialogue(`[1号] ${passenger.name}: "呃……长官，我的登机牌好像找不到了，随便给我安排个位吧！"`);
    } else {
        document.getElementById("pass-name").textContent = passenger.name;
        document.getElementById("pass-seat").textContent = passenger.assignedSeat < 10 ? "0" + passenger.assignedSeat : String(passenger.assignedSeat);
        document.getElementById("pass-type-badge").textContent = passenger.isVip ? "👑 VIP GUEST" : "ECONOMY";
        passCard.classList.remove("hidden");
        
        // 检查专属座位是否被占
        const isSeatTaken = (gameState.cabinSeats[passenger.assignedSeat] !== null);
        if (isSeatTaken) {
            const usurperId = gameState.cabinSeats[passenger.assignedSeat];
            typeDialogue(`[${passenger.id}号] ${passenger.name}: "报告长官！我的 ${passenger.assignedSeat} 号座位好像被 ${usurperId} 号抢了！我该怎么办？"`);
        } else {
            typeDialogue(`[${passenger.id}号] ${passenger.name}: "长官好，这是我的登机牌，我被分配在 ${passenger.assignedSeat} 号座位。"`);
        }
    }
}

// ===== 切换滑动印章架 =====
function toggleStampDrawer() {
    const drawer = document.getElementById("stamp-drawer");
    drawer.classList.toggle("is-open");
}

// ===== 盖章操作 =====
function applyStamp(stampType) {
    if (!gameState.isEntrantInBooth || !gameState.currentEntrant) return;
    
    gameState.currentStamp = stampType;
    const stampSlot = document.getElementById("stamp-impression");
    const rot = (Math.random() * 6 - 3).toFixed(1); // -3deg ~ +3deg 真实印泥倾角
    
    if (stampType === "ASSIGNED") {
        stampSlot.innerHTML = `<div class="stamped-mark stamped-assigned" style="--rot:${rot}">🔴 按序就座</div>`;
    } else {
        stampSlot.innerHTML = `<div class="stamped-mark stamped-random" style="--rot:${rot}">🔵 批准随意</div>`;
    }
    
    document.getElementById("btn-return-doc").disabled = false;
    
    // 自动收起印章架
    setTimeout(() => {
        const drawer = document.getElementById("stamp-drawer");
        drawer.classList.remove("is-open");
    }, 250);
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
        // 随机选择剩余空位
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
    
    // 更新界面
    renderCabinGrid();
    document.getElementById("boarding-pass").classList.add("hidden");
    gameState.isEntrantInBooth = false;
    gameState.currentEntrant = null;
    document.getElementById("status-indicator").className = "indicator-light";
    
    // 对白反馈
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
    
    // 更新统计
    document.getElementById("stat-flights").textContent = String(gameState.stats.flightsCompleted);
    document.getElementById("stat-vip-wins").textContent = String(gameState.stats.vipWins);
    document.getElementById("stat-vip-losses").textContent = String(gameState.stats.vipLosses);
    const rate = ((gameState.stats.vipWins / gameState.stats.flightsCompleted) * 100).toFixed(1);
    document.getElementById("stat-vip-rate").textContent = `${rate}%`;
    
    const outcomeText = vipSuccess ? 
        `🎉 航班结算：第 ${gameState.totalSeats} 号神秘 VIP 顺利坐回宝座！` : 
        `❌ 航班结算：第 ${gameState.totalSeats} 号神秘 VIP 座位遭挤占失败！`;
    
    typeDialogue(`${outcomeText} (已完成 ${gameState.stats.flightsCompleted} 班，VIP 成功率: ${rate}%)。正在准备下一班...`);
    
    setTimeout(() => {
        initFlight();
    }, 2800);
}

// ===== 神秘人叩窗事件 (第二阶段转折) =====
function triggerMysteryEncounter() {
    gameState.isMysteryEventTriggered = true;
    gameState.isEntrantInBooth = true;
    
    // 绘制神秘人黑风衣高领像
    drawMysteryPortrait(document.getElementById("portrait-canvas"));
    
    typeDialogue(`[神秘人] "检票员先生……看起来你很沮丧。无论你多么严格地盖章，最后那位神秘 VIP 能否坐上宝座，难道真的只是一场不可控的混乱吗？"`, () => {
        setTimeout(() => {
            typeDialogue(`[神秘人] "你猜他能坐回自己座位的概率是多少？这和飞机座位数 N 有关系吗？……去看看最后一张座位的宿命吧。"`, () => {
                setTimeout(() => {
                    // 恢复
                    gameState.isEntrantInBooth = false;
                    typeDialogue("神秘人化作虚影离去了……请继续按喇叭呼叫乘客。");
                }, 4000);
            });
        }, 3500);
    });
}

// ===== 打字机对话输出引擎 =====
function typeDialogue(text, callback) {
    const el = document.getElementById("tape-dialogue");
    gameState.dialogueTyping = true;
    el.textContent = "";
    
    let i = 0;
    const speed = 25;
    
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
        document.querySelector(".manual-tab-bar .tab-btn:nth-child(1)").classList.add("active");
        document.getElementById("tab-cabin").classList.remove("hidden");
    } else if (tabName === "rules") {
        document.querySelector(".manual-tab-bar .tab-btn:nth-child(2)").classList.add("active");
        document.getElementById("tab-rules").classList.remove("hidden");
    } else if (tabName === "stats") {
        document.querySelector(".manual-tab-bar .tab-btn:nth-child(3)").classList.add("active");
        document.getElementById("tab-stats").classList.remove("hidden");
    }
}

// ===== 过程式像素肖像绘制 (Canvas 8-Bit) =====
function drawPixelPortrait(canvas, passenger) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // 背景墙
    ctx.fillStyle = "#272f33";
    ctx.fillRect(0, 0, w, h);
    
    // 衣服大衣
    ctx.fillStyle = passenger.isFirst ? "#524436" : (passenger.isVip ? "#705822" : "#38473c");
    ctx.fillRect(16, 75, 64, 45);
    
    // 领口
    ctx.fillStyle = "#fff";
    ctx.fillRect(40, 75, 16, 12);
    
    // 头部皮肤
    ctx.fillStyle = passenger.isFirst ? "#cfa27c" : "#e0ba97";
    ctx.fillRect(28, 25, 40, 48);
    
    // 眼睛
    ctx.fillStyle = "#111";
    ctx.fillRect(36, 42, 6, 6);
    ctx.fillRect(54, 42, 6, 6);
    
    // 头发/帽子
    ctx.fillStyle = passenger.isFirst ? "#2d1f15" : "#1a2124";
    if (passenger.isFirst) {
        // 凌乱鸡窝头
        ctx.fillRect(24, 15, 48, 16);
        ctx.fillRect(20, 22, 10, 15);
        ctx.fillRect(66, 20, 10, 18);
    } else {
        // 顺从平头/便帽
        ctx.fillRect(26, 18, 44, 14);
    }
    
    // 胡须/嘴巴
    ctx.fillStyle = "#8a5840";
    ctx.fillRect(42, 58, 12, 4);
}

function drawMysteryPortrait(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // 黑暗剪影背景
    ctx.fillStyle = "#15191b";
    ctx.fillRect(0, 0, w, h);
    
    // 黑色大风衣高领
    ctx.fillStyle = "#0d1012";
    ctx.fillRect(10, 60, 76, 60);
    
    // 宽檐风衣帽
    ctx.fillStyle = "#07090a";
    ctx.fillRect(12, 28, 72, 12);
    ctx.fillRect(24, 12, 48, 20);
    
    // 阴影中的面部
    ctx.fillStyle = "#1b2024";
    ctx.fillRect(28, 38, 40, 30);
    
    // 泛着金光的两只眼睛
    ctx.fillStyle = "#f5d442";
    ctx.fillRect(36, 46, 6, 4);
    ctx.fillRect(54, 46, 6, 4);
}

function drawPixelPhoto(canvas, passenger) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = "#d8cdb4";
    ctx.fillRect(0, 0, w, h);
    
    // 黑白寸照
    ctx.fillStyle = "#4a4235";
    ctx.fillRect(8, 35, 32, 25);
    ctx.fillStyle = "#7a6e5b";
    ctx.fillRect(14, 12, 20, 24);
    
    // 眼睛
    ctx.fillStyle = "#111";
    ctx.fillRect(18, 20, 3, 3);
    ctx.fillRect(27, 20, 3, 3);
}
