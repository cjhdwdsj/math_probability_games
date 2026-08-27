// ==========================================================================
// JS 模块 1: 全局游戏状态与基础配置 (STATE.JS)
// ==========================================================================

const gameState = {
    day: 1,
    isTutorial: true,            // 开局新手教程标志 (N = 2)
    flightNumber: "TRIAL-02",
    totalSeats: 2,               // 教程阶段 2 个座位
    currentPassengerIndex: 0,    // 当前窗口处理的乘客序号 (1 ~ N)
    passengers: [],              // 本趟航班的所有乘客对象
    cabinSeats: {},              // 座位占用字典 { 1: passengerId, 2: passengerId ... }
    
    // 今日排班与时间管理
    currentFlightToday: 1,
    totalFlightsToday: 2,
    currentTime: "08:00",
    
    // 机制标记
    isRadarOffline: false,       // Day 2 盲盒模式标志
    isXrayActive: false,         // Day 3 特权金线透视标志
    
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
    dialogueTyping: false,
    isTransitioningFlight: false
};

// 预设名字库
const FIRST_NAMES = ["IVAN", "SERGEI", "DIMITRI", "ELENA", "NATASHA", "BORIS", "ALEXEI", "SONIA", "YURI", "KATIA"];
const LAST_NAMES = ["V.", "K.", "P.", "S.", "M.", "N.", "B.", "G.", "T.", "Z."];

let highestZIndex = 100;

function updateClockDisplay(timeStr) {
    if (timeStr) gameState.currentTime = timeStr;
    const clockEl = document.getElementById("desk-clock");
    const tapeTagEl = document.getElementById("tape-header-tag");
    if (clockEl) clockEl.textContent = `DAY ${gameState.day} · ${gameState.currentTime} GRESTIN`;
    if (tapeTagEl) tapeTagEl.textContent = `AUDIO LOG 📟 [${gameState.currentTime} GRESTIN]`;
}

// 初始化航班数据
function initFlightState() {
    gameState.currentPassengerIndex = 0;
    gameState.isEntrantInBooth = false;
    gameState.currentEntrant = null;
    gameState.currentStamp = null;
    gameState.cabinSeats = {};
    
    // 今日剩余航班显示
    const remainingFlights = (gameState.totalFlightsToday - gameState.currentFlightToday + 1);
    const flightTagEl = document.getElementById("flights-left-tag");
    if (flightTagEl) {
        if (remainingFlights <= 1) {
            flightTagEl.textContent = "今日剩余航班: 1 架 (今日末班)";
        } else {
            flightTagEl.textContent = `今日剩余航班: ${remainingFlights} 架`;
        }
    }
    
    // 时间初始化
    if (gameState.isTutorial) {
        gameState.currentTime = "08:00";
    } else {
        gameState.currentTime = "12:30";
    }
    updateClockDisplay();
    
    document.getElementById("cabin-flight-title").textContent = `✈️ 航班客舱实时雷达 (${gameState.flightNumber})`;
    document.getElementById("memo-flight").textContent = gameState.flightNumber;
    document.getElementById("pass-flight-code").textContent = gameState.flightNumber;
    
    for (let i = 1; i <= gameState.totalSeats; i++) {
        gameState.cabinSeats[i] = null;
    }
    
    gameState.passengers = [];
    for (let i = 1; i <= gameState.totalSeats; i++) {
        // 第一关教学关全员持有正规有效登机牌；正规航班 (非教学关) 1号才丢失登机牌
        const isLostTicket = (i === 1 && !gameState.isTutorial);
        const isVip = (i === gameState.totalSeats);
        
        const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + " " +
                     LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        
        gameState.passengers.push({
            id: i,
            name: name,
            assignedSeat: isLostTicket ? null : i,
            isFirst: isLostTicket,
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
