// ==========================================================================
// JS 模块 7: 主游戏循环与事件驱动 (GAME.JS)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    initDraggableSystem();
    initStampKnobPullPhysics();
    bindKeyboardShortcuts();
    startTutorialPrologue();
});

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

function startTutorialPrologue() {
    gameState.isTutorial = true;
    gameState.flightNumber = "TRIAL-02";
    gameState.totalSeats = 2;
    
    initFlightState();
    
    // 锁定呼叫按钮，亮起忙碌红灯
    document.getElementById("btn-next-entrant").disabled = true;
    document.getElementById("status-indicator").className = "indicator-light busy";
    
    const canvas = document.getElementById("portrait-canvas");
    canvas.classList.remove("is-walking-in");
    void canvas.offsetWidth;
    canvas.classList.add("is-walking-in");
    drawMysteryPortrait(canvas);
    
    // 启动神秘人步进式对话序列 (点击或按空格/回车推进)
    runDialogueSequence([
        `[神秘人] "初次执勤，检票员。今晚有一项绝密指令：确保末位座位的【神秘 VIP】顺利入座。"`,
        `[神秘人] "在接管正式航班前，先用这架 2 人教学机熟悉标准检票流程。"`,
        `[神秘人] "核对左侧雷达空位后盖 🔴【按序就座】放行入座。去吧！"`
    ], () => {
        // 神秘人说完离去，窗口清空，解锁按钮，亮起绿灯
        drawEmptyBooth(canvas);
        typeDialogue(`[系统提示] 神秘人已离开。请按红色喇叭呼叫 1 号乘客登机。`, () => {
            document.getElementById("btn-next-entrant").disabled = false;
            document.getElementById("status-indicator").className = "indicator-light";
        });
    });
}

function callNextEntrant() {
    if (gameState.isEntrantInBooth || gameState.dialogueTyping || gameState.isTransitioningFlight) return;
    
    if (gameState.currentPassengerIndex >= gameState.totalSeats) {
        return;
    }
    
    document.getElementById("btn-next-entrant").disabled = true;
    document.getElementById("status-indicator").className = "indicator-light busy";
    
    gameState.currentPassengerIndex += 1;
    const passenger = gameState.passengers[gameState.currentPassengerIndex - 1];
    gameState.currentEntrant = passenger;
    gameState.isEntrantInBooth = true;
    gameState.currentStamp = null;
    
    // 队列小人过闸
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
    
    // 时间动态流逝
    if (gameState.currentPassengerIndex === 1) {
        updateClockDisplay(gameState.day === 1 && gameState.isTutorial ? "08:00" : "12:30");
    } else if (gameState.currentPassengerIndex === Math.ceil(gameState.totalSeats / 2)) {
        updateClockDisplay("13:45");
    } else if (gameState.currentPassengerIndex === gameState.totalSeats) {
        updateClockDisplay("14:50");
    }
    
    // 窗口角色登场动画
    const portraitCanvas = document.getElementById("portrait-canvas");
    if (portraitCanvas) {
        portraitCanvas.classList.remove("is-walking-in");
        void portraitCanvas.offsetWidth;
        portraitCanvas.classList.add("is-walking-in");
        drawPixelPortrait(portraitCanvas, passenger);
    }
    const photoCanvas = document.getElementById("pass-photo-canvas");
    if (photoCanvas) {
        drawPixelPhoto(photoCanvas, passenger);
    }
    
    setTimeout(() => {
        let greetText = "";
        if (passenger.isFirst) {
            greetText = `[1号乘客] "检票员师傅……我好像把登机牌弄丢了！请问我能登机吗？"`;
        } else if (passenger.isVip) {
            greetText = `[${passenger.id}号乘客] "检票员您好，我是本趟航班的末位 VIP，我的专属座位是 ${passenger.id} 号。"`;
        } else {
            greetText = `[${passenger.id}号乘客] "检票员您好，这是我的登机牌，我被分配在 ${passenger.assignedSeat} 号座位。"`;
        }
        
        typeDialogue(greetText, () => {
            presentBoardingPass(passenger);
        });
    }, 550);
}

function finalizeFlight() {
    if (gameState.isTransitioningFlight) return;
    gameState.isTransitioningFlight = true;
    
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
    
    const outcomeText = vipSuccess ? 
        `🎉 航班结算：第 ${gameState.totalSeats} 号神秘 VIP 顺利坐回专属宝座！` : 
        `❌ 航班结算：第 ${gameState.totalSeats} 号神秘 VIP 座位遭挤占失败！`;

    if (gameState.currentFlightToday < gameState.totalFlightsToday) {
        // 今日还有下一趟航班
        gameState.currentFlightToday += 1;
        typeDialogue(`${outcomeText} 正在为你接入今日第 ${gameState.currentFlightToday} 趟航班...`, () => {
            setTimeout(() => {
                if (gameState.day === 1) {
                    gameState.isTutorial = false;
                    gameState.flightNumber = "MA-404";
                    gameState.totalSeats = 5;
                } else if (gameState.day === 2) {
                    gameState.flightNumber = "EX-1000";
                    gameState.totalSeats = 10;
                }
                gameState.isTransitioningFlight = false;
                initFlightState();
                typeDialogue(`✈️ 今日第 ${gameState.currentFlightToday} 趟航班 (${gameState.flightNumber}) 已就绪！请按红色喇叭呼叫 1 号乘客登机。`);
            }, 1800);
        });
    } else {
        // 今日航班全部处理完毕 -> 触发夜幕过幕间与桌面大扫除！
        updateClockDisplay("18:00");
        const flightTagEl = document.getElementById("flights-left-tag");
        if (flightTagEl) flightTagEl.textContent = `DAY ${gameState.day} 航班已全部处理完毕 (下班打卡)`;
        
        typeDialogue(`${outcomeText} 🌇【DAY ${gameState.day} 执勤结束】今日航班已全部处理完毕。哨所打卡下班！`, () => {
            document.getElementById("btn-next-entrant").disabled = true;
            document.getElementById("status-indicator").className = "indicator-light";
            
            // 2.2 秒后平滑拉起夜间过幕间，并大扫除清理台面
            setTimeout(() => {
                gameState.isTransitioningFlight = false;
                if (gameState.day === 1) {
                    triggerNightIntermission(1, () => startDay2());
                } else if (gameState.day === 2) {
                    triggerNightIntermission(2, () => startDay3());
                }
            }, 2200);
        });
    }
}

function startDay2() {
    gameState.day = 2;
    gameState.currentFlightToday = 1;
    gameState.totalFlightsToday = 2;
    gameState.isTutorial = false;
    gameState.isRadarOffline = true;
    gameState.flightNumber = "FLIGHT-505";
    gameState.totalSeats = 5;
    
    initFlightState();
    typeDialogue("⚠️【DAY 2 · 08:00】第二日执勤开启！客舱雷达传感器硬件受损离线，请根据登机牌与乘客当面陈述进行盲盒检票。");
}

function startDay3() {
    gameState.day = 3;
    gameState.currentFlightToday = 1;
    gameState.totalFlightsToday = 1;
    gameState.isTutorial = false;
    gameState.isRadarOffline = false;
    gameState.isXrayActive = true;
    gameState.flightNumber = "VIP-777";
    gameState.totalSeats = 10;
    
    initFlightState();
    typeDialogue("✨【DAY 3 · 08:00】高维芯片已启动！雷达已全面恢复并点亮金色特权接力线。请呼叫 1 号西装乘客登机！");
}
