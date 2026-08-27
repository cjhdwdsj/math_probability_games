// ==========================================================================
// JS 模块 2: 像素艺术绘制引擎 (PIXEL-ART.JS)
// ==========================================================================

function drawPixelPortrait(canvas, passenger) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = "#21282b";
    ctx.fillRect(0, 0, w, h);
    
    const isDay3Usurper = (gameState.day === 3 && passenger.isFirst);

    // 衣服
    if (isDay3Usurper) {
        ctx.fillStyle = "#1b1e22"; // 黑色西装
        ctx.fillRect(16, 70, 68, 55);
        ctx.fillStyle = "#fff";     // 衬衫领
        ctx.fillRect(42, 70, 16, 15);
        ctx.fillStyle = "#e5b94c"; // 金色领带
        ctx.fillRect(47, 76, 6, 25);
    } else {
        ctx.fillStyle = passenger.isFirst ? "#524436" : (passenger.isVip ? "#705822" : "#38473c");
        ctx.fillRect(16, 75, 68, 50);
        ctx.fillStyle = "#fff";
        ctx.fillRect(42, 75, 16, 12);
    }
    
    // 脸部
    ctx.fillStyle = passenger.isFirst && !isDay3Usurper ? "#cfa27c" : "#e0ba97";
    ctx.fillRect(30, 25, 40, 50);
    
    // 眼睛 / 墨镜
    if (isDay3Usurper) {
        ctx.fillStyle = "#111"; // 墨镜
        ctx.fillRect(34, 42, 32, 10);
        ctx.fillStyle = "#333";
        ctx.fillRect(36, 44, 10, 6);
        ctx.fillRect(54, 44, 10, 6);
    } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(38, 44, 6, 6);
        ctx.fillRect(56, 44, 6, 6);
    }
    
    // 头发
    if (isDay3Usurper) {
        ctx.fillStyle = "#181a1c"; // 精致大背头
        ctx.fillRect(26, 14, 48, 16);
        ctx.fillRect(24, 20, 10, 20);
        ctx.fillRect(66, 20, 10, 20);
    } else if (passenger.isFirst) {
        ctx.fillStyle = "#2d1f15";
        ctx.fillRect(24, 15, 52, 16);
        ctx.fillRect(20, 22, 12, 15);
        ctx.fillRect(68, 20, 12, 18);
    } else {
        ctx.fillStyle = "#1a2124";
        ctx.fillRect(28, 18, 44, 14);
    }
    
    ctx.fillStyle = "#8a5840";
    ctx.fillRect(44, 60, 12, 4);
}

function drawMysteryPortrait(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = "#15191b";
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = "#0d1012";
    ctx.fillRect(10, 60, 80, 65);
    
    ctx.fillStyle = "#07090a";
    ctx.fillRect(12, 28, 76, 12);
    ctx.fillRect(24, 12, 52, 20);
    
    ctx.fillStyle = "#1b2024";
    ctx.fillRect(30, 38, 40, 30);
    
    ctx.fillStyle = "#f5d442";
    ctx.fillRect(38, 46, 6, 4);
    ctx.fillRect(56, 46, 6, 4);
}

function drawPixelPhoto(canvas, passenger) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = "#d8cdb4";
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = "#4a4235";
    ctx.fillRect(8, 32, 32, 28);
    ctx.fillStyle = "#7a6e5b";
    ctx.fillRect(14, 10, 20, 24);
    
    ctx.fillStyle = "#111";
    ctx.fillRect(18, 18, 3, 3);
    ctx.fillRect(27, 18, 3, 3);
}

function drawEmptyBooth(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1b2123";
    ctx.fillRect(0, 0, w, h);
}
