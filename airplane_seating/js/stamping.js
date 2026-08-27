// ==========================================================================
// JS 模块 6: 盖章与登机牌流转系统 (STAMPING.JS)
// ==========================================================================

function presentBoardingPass(passenger) {
    const passCard = document.getElementById("boarding-pass");
    const stampSlot = document.getElementById("stamp-impression");
    stampSlot.innerHTML = `<span class="stamp-placeholder-hint">[ 推荐盖印区 ]</span>`;
    
    // 清除上一个乘客登机牌上的历史印章印记
    passCard.querySelectorAll(".stamped-mark").forEach(el => el.remove());
    
    document.getElementById("btn-return-doc").disabled = true;
    gameState.currentStamp = null;
    
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

function createStampMark(parentEl, x, y, stampType, rot) {
    if (!parentEl) return;
    const mark = document.createElement("div");
    mark.className = `stamped-mark ${stampType === "ASSIGNED" ? "stamped-assigned" : "stamped-random"}`;
    mark.style.left = `${x}px`;
    mark.style.top = `${y}px`;
    mark.style.setProperty("--rot", rot);
    mark.textContent = (stampType === "ASSIGNED") ? "🔴 按序就座" : "🔵 批准随意";
    parentEl.appendChild(mark);
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
    const unitId = (stampType === "ASSIGNED") ? "stamp-unit-assigned" : "stamp-unit-random";
    const knob = document.querySelector(`#${unitId} .stamp-knob`);
    const shoeEl = document.querySelector(`#${unitId} .stamp-shoe`);
    
    if (playAnimate && knob) {
        knob.classList.add("is-pressing");
        setTimeout(() => knob.classList.remove("is-pressing"), 180);
    }
    
    // 计算印章红色/蓝色块体的中心定位点 (Impact Center Point)
    let Px = 0, Py = 0;
    if (shoeEl) {
        const shoeRect = shoeEl.getBoundingClientRect();
        Px = shoeRect.left + shoeRect.width / 2;
        Py = shoeRect.top + shoeRect.height / 2;
    } else {
        Px = window.innerWidth / 2;
        Py = window.innerHeight / 2;
    }
    
    const rot = (Math.random() * 6 - 3).toFixed(1);
    const inkColor = (stampType === "ASSIGNED") ? "#ba2824" : "#23588d";
    
    // 物理命中检测：全桌面任何物体皆可承接盖章
    const passCard = document.getElementById("boarding-pass");
    const isPassVisible = passCard && !passCard.classList.contains("hidden");
    
    let hitTarget = null;
    let hitX = 0;
    let hitY = 0;
    
    // 1. 优先检测是否落在乘客登机牌上
    if (isPassVisible) {
        const r = passCard.getBoundingClientRect();
        if (Px >= r.left && Px <= r.right && Py >= r.top && Py <= r.bottom) {
            hitTarget = passCard;
            hitX = Px - r.left;
            hitY = Py - r.top;
            
            // 成功盖在登机牌上！记录指令并激活放行按钮
            gameState.currentStamp = stampType;
            document.getElementById("btn-return-doc").disabled = false;
        }
    }
    
    // 2. 检测是否盖在便签纸上
    if (!hitTarget) {
        const memo = document.getElementById("vip-memo");
        if (memo) {
            const r = memo.getBoundingClientRect();
            if (Px >= r.left && Px <= r.right && Py >= r.top && Py <= r.bottom) {
                hitTarget = memo;
                hitX = Px - r.left;
                hitY = Py - r.top;
            }
        }
    }
    
    // 3. 检测是否盖在罚单上
    if (!hitTarget) {
        const citations = document.querySelectorAll(".citation-paper");
        for (const cit of citations) {
            const r = cit.getBoundingClientRect();
            if (Px >= r.left && Px <= r.right && Py >= r.top && Py <= r.bottom) {
                hitTarget = cit;
                hitX = Px - r.left;
                hitY = Py - r.top;
                break;
            }
        }
    }
    
    // 4. 检测是否盖在左侧工作手册上
    if (!hitTarget) {
        const manual = document.getElementById("cabin-manual");
        if (manual) {
            const r = manual.getBoundingClientRect();
            if (Px >= r.left && Px <= r.right && Py >= r.top && Py <= r.bottom) {
                hitTarget = manual;
                hitX = Px - r.left;
                hitY = Py - r.top;
            }
        }
    }
    
    // 5. 默认直接印在桌面上 (Counter Surface)
    if (!hitTarget) {
        const surface = document.getElementById("counter-surface");
        if (surface) {
            const r = surface.getBoundingClientRect();
            hitTarget = surface;
            hitX = Px - r.left;
            hitY = Py - r.top;
        }
    }
    
    if (hitTarget) {
        createStampMark(hitTarget, hitX, hitY, stampType, rot);
    }
    
    // Balatro 风格打击感反馈：微震屏 + 在命中定位点爆出墨汁微粒
    if (typeof triggerScreenShake === "function") triggerScreenShake();
    if (typeof spawnInkParticles === "function") spawnInkParticles(Px, Py, inkColor);
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
        typeDialogue(`[${passenger.id}号] "谢谢检票员！顺利坐回 ${finalSeat} 号位。"`);
    } else {
        typeDialogue(`[${passenger.id}号] "好的，我这就去坐 ${finalSeat} 号空座位。"`);
    }
}
