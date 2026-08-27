// ==========================================================================
// JS 模块 8: Balatro 风格 3D 悬浮与打击反馈引擎 (JUICE.JS)
// ==========================================================================

// 初始化 3D 卡牌物理微倾斜 (仅对轻薄纸质单据生效，印章盒保持平稳放置)
function initCard3DTilt(element) {
    if (!element || element.id === "stamp-box" || element.classList.contains("stamp-box-draggable")) return;
    
    element.addEventListener("mousemove", (e) => {
        if (element.classList.contains("is-dragging")) return;
        
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // 限制在 ±8 度的舒适立体倾角
        const tiltX = (((y - centerY) / centerY) * -8).toFixed(2);
        const tiltY = (((x - centerX) / centerX) * 8).toFixed(2);
        
        element.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.025, 1.025, 1.025)`;
    });
    
    element.addEventListener("mouseleave", () => {
        if (element.classList.contains("is-dragging")) return;
        element.style.transform = `perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
}

// 震屏打击感 (Screen Shake)
function triggerScreenShake() {
    const container = document.getElementById("booth-container");
    container.classList.remove("screen-shaking");
    void container.offsetWidth; // 触发 reflow
    container.classList.add("screen-shaking");
    setTimeout(() => {
        container.classList.remove("screen-shaking");
    }, 150);
}

// 盖印墨汁微粒飞溅 (Ink Splatter Particles - 支持坐标与元素投射)
function spawnInkParticles(x, y, color) {
    const surface = document.getElementById("counter-surface");
    if (!surface) return;
    const surfaceRect = surface.getBoundingClientRect();
    
    let originX = 0, originY = 0;
    let inkColor = "#ba2824";
    
    if (typeof x === "object" && x !== null) {
        const rect = x.getBoundingClientRect();
        originX = (rect.left + rect.width / 2) - surfaceRect.left;
        originY = (rect.top + rect.height / 2) - surfaceRect.top;
        inkColor = y || inkColor;
    } else {
        originX = x - surfaceRect.left;
        originY = y - surfaceRect.top;
        inkColor = color || inkColor;
    }
    
    const count = 12;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement("div");
        particle.className = "ink-particle";
        
        const size = Math.random() * 5 + 3;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 35 + 15;
        const dx = (Math.cos(angle) * dist).toFixed(1) + "px";
        const dy = (Math.sin(angle) * dist).toFixed(1) + "px";
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = inkColor;
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
        particle.style.setProperty("--dx", dx);
        particle.style.setProperty("--dy", dy);
        
        surface.appendChild(particle);
        setTimeout(() => particle.remove(), 400);
    }
}
