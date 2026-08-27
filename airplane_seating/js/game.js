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
    
    const canvas = document.getElementById("portrait-canvas");
    canvas.classList.remove("is-walking-in");
    void canvas.offsetWidth;
    canvas.classList.add("is-walking-in");
    drawMysteryPortrait(canvas);
    
    typeDialogue(`[神秘人] "初次执勤，检票员。今晚有一项绝密指令：确保末位座位的【神秘 VIP】顺利入座。在接管大航班前，先用这架 2 人测试机熟悉操作。"`, () => {
        setTimeout(() => {
            typeDialogue(`[神秘人] "规则很简单：查验左侧雷达，核实专属座位是否被占。准备好后，按红色喇叭呼叫 1 号乘客。"`);
        }, 2800);
    });
}

function callNextEntrant() {
    if (gameState.isEntrantInBooth || gameState.dialogueTyping) return;
    
    if (gameState.currentPassengerIndex >= gameState.totalSeats) {
        typeDialogue("本趟航班所有乘客已全部登机完成！正在结算报告...");
        setTimeout(() => finalizeFlight(), 1200);
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
    
    // 窗口立绘走入
    const portraitCanvas = document.getElementById("portrait-canvas");
    portraitCanvas.classList.remove("is-walking-in");
    void portraitCanvas.offsetWidth;
    portraitCanvas.classList.add("is-walking-in");
    
    drawPixelPortrait(portraitCanvas, passenger);
    drawPixelPhoto(document.getElementById("pass-photo-canvas"), passenger);
    
    document.getElementById("boarding-pass").classList.add("hidden");
    
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
        
        typeDialogue(dialogueText, () => {
            presentBoardingPass(passenger);
        });
    }, 550);
}

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
