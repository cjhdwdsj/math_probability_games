// ==========================================================================
// JS 模块 6: 盖章与登机牌流转系统 (STAMPING.JS)
// ==========================================================================

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
    
    // 由上往下滑入
    passCard.style.left = "auto";
    passCard.style.right = "260px";
    passCard.style.top = "16px";
    passCard.classList.remove("hidden");
    highestZIndex += 1;
    passCard.style.zIndex = highestZIndex;
}

function initStampKnobPullPhysics() {
    const units = [
        { id: "stamp-unit-assigned", type: "ASSIGNED" },
        { id: "stamp-unit-random", type: "RANDOM" }
    ];

    units.forEach(({ id, type }) => {
        const knob = document.querySelector(`#${id} .stamp-knob`);
        if (!knob) return;

        let isPulling = false;
        let startY = 0;
        let hasStamped = false;
        const MAX_STROKE = 22; // 最大机械物理行程
        const TRIGGER_STROKE = 15; // 触底盖印行程阈值 (拉到 15px 时咔哒盖印)

        knob.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            isPulling = true;
            startY = e.clientY;
            hasStamped = false;
            knob.style.transition = "none";

            const onMouseMove = (moveEvent) => {
                if (!isPulling) return;
                const deltaY = Math.max(0, moveEvent.clientY - startY);
                const currentY = Math.min(deltaY, MAX_STROKE);
                knob.style.transform = `translateY(${currentY}px)`;

                // 物理拉到底部 (>= 15px) 瞬间触发盖章打击！
                if (currentY >= TRIGGER_STROKE && !hasStamped) {
                    hasStamped = true;
                    pressStamp(type, false);
                }
            };

            const onMouseUp = (upEvent) => {
                if (!isPulling) return;
                isPulling = false;
                
                const deltaY = Math.max(0, upEvent.clientY - startY);
                // 如果只是快速点击（位移 < 4px）且还没盖过章，触发点击盖章
                if (deltaY < 4 && !hasStamped) {
                    pressStamp(type, true);
                }

                // 弹簧阻尼回弹
                knob.style.transition = "transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
                knob.style.transform = "translateY(0px)";

                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    });
}

function pressStamp(stampType, playAnimate = true) {
    if (!gameState.isEntrantInBooth || !gameState.currentEntrant) return;
    
    const passCard = document.getElementById("boarding-pass");
    if (passCard.classList.contains("hidden")) return;
    
    const unitId = (stampType === "ASSIGNED") ? "stamp-unit-assigned" : "stamp-unit-random";
    const knob = document.querySelector(`#${unitId} .stamp-knob`);
    
    if (playAnimate && knob) {
        knob.classList.add("is-pressing");
        setTimeout(() => knob.classList.remove("is-pressing"), 180);
    }
    
    gameState.currentStamp = stampType;
    const stampSlot = document.getElementById("stamp-impression");
    const rot = (Math.random() * 6 - 3).toFixed(1);
    
    const inkColor = (stampType === "ASSIGNED") ? "#ba2824" : "#23588d";
    
    if (stampType === "ASSIGNED") {
        stampSlot.innerHTML = `<div class="stamped-mark stamped-assigned" style="--rot:${rot}">🔴 按序就座</div>`;
    } else {
        stampSlot.innerHTML = `<div class="stamped-mark stamped-random" style="--rot:${rot}">🔵 批准随意</div>`;
    }
    
    // Balatro 风格打击感反馈：微震屏 + 墨汁微粒飞溅
    if (typeof triggerScreenShake === "function") triggerScreenShake();
    if (typeof spawnInkParticles === "function") spawnInkParticles(stampSlot, inkColor);
    
    document.getElementById("btn-return-doc").disabled = false;
}

function returnDocumentToPassenger() {
    if (!gameState.isEntrantInBooth || !gameState.currentEntrant || !gameState.currentStamp) return;
    
    const passenger = gameState.currentEntrant;
    const stamp = gameState.currentStamp;
    
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
    
    let finalSeat = null;
    if (stamp === "ASSIGNED") {
        if (passenger.assignedSeat !== null && gameState.cabinSeats[passenger.assignedSeat] === null) {
            finalSeat = passenger.assignedSeat;
        } else if (passenger.isFirst && gameState.cabinSeats[1] === null) {
            finalSeat = 1; // 1号虽无票但被盖了按序就座，则默认坐回属于他的1号位
        } else {
            // 被占用或异常状态，回退到随机可用座位
            const freeSeats = [];
            for (let i = 1; i <= gameState.totalSeats; i++) {
                if (gameState.cabinSeats[i] === null) freeSeats.push(i);
            }
            finalSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
        }
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
