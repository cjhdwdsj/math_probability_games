// ==========================================================================
// JS 模块 5: 客舱雷达与手册规程管理 (CABIN.JS)
// ==========================================================================

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

function issueCitation(reason) {
    document.getElementById("citation-reason").textContent = reason;
    document.getElementById("citation-paper").classList.remove("hidden");
}

function dismissCitation() {
    document.getElementById("citation-paper").classList.add("hidden");
}
