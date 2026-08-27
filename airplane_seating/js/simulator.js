/* ==========================================================================
   JS 模块 8: 蒙特卡洛千次验算机与特权金线渲染 (SIMULATOR.JS)
   ========================================================================== */

/**
 * 极速运行千次蒙特卡洛模拟，验证任意 N 座位下 VIP 的真实归位概率
 * @param {number} totalTrials - 模拟航班总数 (如 1000)
 * @param {number} N - 航班座位数 (如 10 或 100)
 */
function runMonteCarloSimulation(totalTrials = 1000, N = 10) {
    const resultEl = document.getElementById("sim-result-text");
    const canvas = document.getElementById("sim-chart-canvas");
    if (!resultEl || !canvas) return;

    resultEl.innerHTML = '<span class="gold-text">正在飞速推演 ' + totalTrials + ' 趟 N=' + N + ' 航班...</span>';
    
    let vipWins = 0;
    const historyPoints = []; // 记录收敛轨迹采样点
    
    for (let t = 1; t <= totalTrials; t++) {
        // 模拟单次航班错配过程
        const seats = new Array(N + 1).fill(null);
        // 1 号随机挑一个座位 1 ~ N
        const firstChoice = Math.floor(Math.random() * N) + 1;
        seats[firstChoice] = 1;
        
        // 2 ~ N-1 号按序就座或随机挑剩余空座
        for (let p = 2; p < N; p++) {
            if (seats[p] === null) {
                seats[p] = p; // 自己的座位空着，直接坐下
            } else {
                // 自己的座位被占，挑剩余空位
                const available = [];
                for (let s = 1; s <= N; s++) {
                    if (seats[s] === null) available.push(s);
                }
                const pick = available[Math.floor(Math.random() * available.length)];
                seats[pick] = p;
            }
        }
        
        // 检查末位 N 号 VIP 的座位是否空闲（等价于其能否坐回）
        if (seats[N] === null) {
            vipWins++;
        }
        
        if (t % Math.max(1, Math.floor(totalTrials / 60)) === 0 || t === totalTrials) {
            historyPoints.push({
                trial: t,
                rate: (vipWins / t) * 100
            });
        }
    }
    
    const finalRate = ((vipWins / totalTrials) * 100).toFixed(2);
    resultEl.innerHTML = '推演 ' + totalTrials + ' 班 (N=' + N + ') 完成！VIP 成功率: <strong class="gold-text">' + finalRate + '%</strong> (严格收敛至 50.0% = 1/2)';
    
    drawConvergenceChart(canvas, historyPoints);
}

/**
 * 在像素画布上绘制概率收敛折线图
 */
function drawConvergenceChart(canvas, points) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#161b1d";
    ctx.fillRect(0, 0, w, h);
    
    // 绘制 50% 理论基准虚线
    const midY = h / 2;
    ctx.strokeStyle = "rgba(229, 185, 76, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = "#8a9ba8";
    ctx.font = "10px monospace";
    ctx.fillText("50% 理论中轴", 6, midY - 4);
    
    // 绘制实测收敛折线
    if (points.length < 2) return;
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    points.forEach((p, idx) => {
        const x = (idx / (points.length - 1)) * (w - 20) + 10;
        // 映射 rate (0% ~ 100%) 到画布高度 (从下往上)
        const y = h - (p.rate / 100) * h;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}
