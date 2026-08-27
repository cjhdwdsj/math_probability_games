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

// 初始化航班数据
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
