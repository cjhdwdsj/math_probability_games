// ==========================================================================
// JS 模块 8: Balatro 风格 3D 悬浮与打击反馈引擎 (JUICE.JS)
// ==========================================================================

// 初始化 3D 卡牌物理微倾斜
function initCard3DTilt(element) {
    if (!element) return;
    
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

// 盖印墨汁微粒飞溅 (Ink Splatter Particles)
function spawnInkParticles(targetEl, color) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const surface = document.getElementById("counter-surface");
    const surfaceRect = surface.getBoundingClientRect();
    
    const originX = (rect.left + rect.width / 2) - surfaceRect.left;
    const originY = (rect.top + rect.height / 2) - surfaceRect.top;
    
    const count = 10;
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
        particle.style.backgroundColor = color;
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
        particle.style.setProperty("--dx", dx);
        particle.style.setProperty("--dy", dy);
        
        surface.appendChild(particle);
        setTimeout(() => particle.remove(), 400);
    }
}
