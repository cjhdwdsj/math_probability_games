// ===== 全局状态 =====
let currentStage = 0;
let totalStages = 8;
let probabilityChart = null;
let bulkSimulationRunning = false;
let userGameStats = { wins: 0, total: 0 };

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    initializeUserGame();
    
    // 设置第一阶段为活跃
    updateStageVisibility();
    
    // 绑定键盘事件
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight') {
            nextStage();
        } else if (e.key === 'ArrowLeft') {
            prevStage();
        }
    });
});

// ===== 阶段导航函数 =====
function nextStage() {
    if (currentStage < totalStages - 1) {
        currentStage++;
        updateStageVisibility();
        scrollToTop();
    }
}

function prevStage() {
    if (currentStage > 0) {
        currentStage--;
        updateStageVisibility();
        scrollToTop();
    }
}

function goToStage(stageIndex) {
    currentStage = stageIndex;
    updateStageVisibility();
    scrollToTop();
}

function updateStageVisibility() {
    // 隐藏所有阶段
    document.querySelectorAll('.stage').forEach(stage => {
        stage.classList.remove('active');
    });
    
    // 显示当前阶段
    const currentStageElement = document.getElementById(`stage-${currentStage + 1}`);
    if (currentStageElement) {
        currentStageElement.classList.add('active');
    }
    
    // 更新导航按钮状态
    updateNavButtons();
}

function updateNavButtons() {
    const prevButtons = document.querySelectorAll('.btn-prev');
    const nextButtons = document.querySelectorAll('.btn-next');
    
    prevButtons.forEach(btn => {
        btn.disabled = currentStage === 0;
        btn.style.opacity = currentStage === 0 ? '0.5' : '1';
        btn.style.cursor = currentStage === 0 ? 'not-allowed' : 'pointer';
    });
    
    nextButtons.forEach(btn => {
        btn.disabled = currentStage === totalStages - 1;
        btn.style.opacity = currentStage === totalStages - 1 ? '0.5' : '1';
        btn.style.cursor = currentStage === totalStages - 1 ? 'not-allowed' : 'pointer';
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function restartTutorial() {
    currentStage = 0;
    updateStageVisibility();
    
    // 重置模拟状态
    resetBulkSimulation();
    resetUserGame();
    
    // 隐藏完成页面
    document.getElementById('completion-page').classList.add('hidden');
    
    scrollToTop();
}

function completeTutorial() {
    document.getElementById('completion-page').classList.remove('hidden');
}

// ===== 工具函数 =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 第2阶段：N=2 模拟 =====
function simulateN2() {
    const simulations = 10;
    let successCount = 0;
    const results = [];
    
    for (let i = 0; i < simulations; i++) {
        // 第一个乘客随机选择座位1或2
        const firstChoice = Math.random() < 0.5 ? 1 : 2;
        
        // 如果第一个乘客选了座位1，第二个乘客坐座位2（成功）
        // 如果第一个乘客选了座位2，第二个乘客坐座位1（失败）
        const lastPassengerSuccess = firstChoice === 1;
        results.push(lastPassengerSuccess);
        if (lastPassengerSuccess) successCount++;
    }
    
    // 显示结果
    const percentage = ((successCount / simulations) * 100).toFixed(1);
    
    document.getElementById('n2-count').textContent = successCount;
    document.getElementById('n2-percent').textContent = percentage;
    document.getElementById('n2-results').classList.remove('hidden');
    
    // 动画展示
    animateN2Simulation(results);
}

function animateN2Simulation(results) {
    const seats = document.querySelectorAll('#stage-2 .seat');
    const scenarios = document.querySelectorAll('#stage-2 .scenario');
    
    // 重置所有座位状态
    seats.forEach(seat => {
        seat.classList.remove('occupied', 'wrong', 'current');
    });
    
    // 随机选择一个结果来演示
    const randomIndex = Math.floor(Math.random() * results.length);
    const isSuccess = results[randomIndex];
    
    // 高亮对应的情景
    scenarios.forEach(scenario => {
        scenario.style.opacity = '0.5';
    });
    
    if (isSuccess) {
        scenarios[0].style.opacity = '1';
        seats[0].classList.add('occupied');
        seats[1].classList.add('current');
    } else {
        scenarios[1].style.opacity = '1';
        seats[1].classList.add('occupied', 'wrong');
        seats[0].classList.add('current');
    }
}

function showN2Stats() {
    document.getElementById('n2-results').classList.remove('hidden');
}

// ===== 第3阶段：N=3 动画演示 =====
function animateN3() {
    const seats = document.querySelectorAll('#stage-3 .seat');
    
    // 重置座位
    seats.forEach(seat => {
        seat.classList.remove('occupied', 'wrong', 'current');
    });
    
    // 模拟过程
    const n = 3;
    const seatsState = Array(n).fill(null);
    
    // 第一个乘客坐座位2
    const firstChoice = 1; // 0-indexed, 所以座位2是index 1
    seatsState[firstChoice] = 0; // 乘客1坐在座位2
    seats[firstChoice].classList.add('occupied', 'wrong');
    
    // 第二个乘客要坐座位2，被占，随机选剩下的
    const availableSeats = seatsState.map((s, i) => s === null ? i : null).filter(i => i !== null);
    const secondChoice = availableSeats[Math.floor(Math.random() * availableSeats.length)];
    seatsState[secondChoice] = 1; // 乘客2坐在随机座位
    seats[secondChoice].classList.add('occupied');
    
    // 第三个乘客坐最后剩下的座位
    const lastSeat = seatsState.indexOf(null);
    seatsState[lastSeat] = 2;
    seats[lastSeat].classList.add('occupied', 'current');
    
    // 判断是否成功
    const isSuccess = lastSeat === 2; // 第3个乘客应该坐座位3（index 2）
    
    // 显示结果
    let resultText = document.querySelector('#stage-3 .animation-result');
    if (!resultText) {
        resultText = document.createElement('div');
        resultText.className = 'animation-result';
        document.querySelector('#stage-3 .simulation-box').appendChild(resultText);
    }
    
    resultText.textContent = isSuccess ? '✅ 最后一位坐到自己座位！' : '❌ 最后一位没坐到自己座位';
    resultText.className = 'animation-result ' + (isSuccess ? 'success' : 'fail');
}

function simulateN3() {
    const simulations = 50;
    let successCount = 0;
    
    for (let i = 0; i < simulations; i++) {
        const n = 3;
        const seatsState = Array(n).fill(null);
        
        // 第一个乘客随机坐
        const firstChoice = Math.floor(Math.random() * n);
        seatsState[firstChoice] = 0;
        
        // 第二个乘客
        if (seatsState[1] === null) {
            seatsState[1] = 1;
        } else {
            const available = seatsState.map((s, idx) => s === null ? idx : null).filter(i => i !== null);
            const choice = available[Math.floor(Math.random() * available.length)];
            seatsState[choice] = 1;
        }
        
        // 第三个乘客坐最后剩下的
        const lastSeat = seatsState.indexOf(null);
        const isSuccess = lastSeat === 2;
        
        if (isSuccess) successCount++;
    }
    
    const percentage = ((successCount / simulations) * 100).toFixed(1);
    document.getElementById('n3-count').textContent = successCount;
    document.getElementById('n3-percent').textContent = percentage;
    document.getElementById('n3-results').classList.remove('hidden');
}

// ===== 第5阶段：大规模验证 =====
function initializeChart() {
    const ctx = document.getElementById('probability-chart');
    if (!ctx) return;
    
    const labels = Array.from({ length: 100 }, (_, i) => i + 1);
    const data = Array(100).fill(0);
    
    probabilityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '最后一位成功的概率 (%)',
                data: data,
                borderColor: '#6ab3de',
                backgroundColor: 'rgba(106, 179, 222, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '概率 (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '模拟次数'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: '概率收敛到50%',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

async function runBulkSimulation(times) {
    if (bulkSimulationRunning) return;
    
    bulkSimulationRunning = true;
    const n = 100; // N值
    let successCount = 0;
    
    // 重置统计
    document.getElementById('total-simulations').textContent = '0';
    document.getElementById('success-count').textContent = '0';
    document.getElementById('current-probability').textContent = '0%';
    
    // 清空图表数据
    if (probabilityChart) {
        probabilityChart.data.datasets[0].data = Array(100).fill(0);
        probabilityChart.update();
    }
    
    // 模拟
    for (let i = 0; i < times; i++) {
        const result = simulateOnce(n);
        if (result) successCount++;
        
        // 更新显示
        const total = i + 1;
        const probability = ((successCount / total) * 100).toFixed(1);
        
        document.getElementById('total-simulations').textContent = total;
        document.getElementById('success-count').textContent = successCount;
        document.getElementById('current-probability').textContent = probability + '%';
        
        // 更新图表
        if (probabilityChart && i < 100) {
            probabilityChart.data.datasets[0].data[i] = parseFloat(probability);
            probabilityChart.update();
        }
        
        // 让UI有时间更新
        if (i % 10 === 0) {
            await sleep(0);
        }
    }
    
    bulkSimulationRunning = false;
}

function simulateOnce(n) {
    const seatsState = Array(n).fill(null);
    
    // 第一个乘客随机坐
    const firstChoice = Math.floor(Math.random() * n);
    seatsState[firstChoice] = 0;
    
    // 后续乘客
    for (let p = 1; p < n - 1; p++) {
        if (seatsState[p] === null) {
            // 自己的座位空着，坐下
            seatsState[p] = p;
        } else {
            // 自己的座位被占，随机选剩下的
            const available = seatsState.map((s, idx) => s === null ? idx : null).filter(i => i !== null);
            const choice = available[Math.floor(Math.random() * available.length)];
            seatsState[choice] = p;
        }
    }
    
    // 最后一位乘客坐最后剩下的座位
    const lastSeat = seatsState.indexOf(null);
    const isSuccess = lastSeat === n - 1;
    
    return isSuccess;
}

function resetBulkSimulation() {
    if (probabilityChart) {
        probabilityChart.data.datasets[0].data = Array(100).fill(0);
        probabilityChart.update();
    }
    
    document.getElementById('total-simulations').textContent = '0';
    document.getElementById('success-count').textContent = '0';
    document.getElementById('current-probability').textContent = '0%';
}

// ===== 第7阶段：互动游戏 =====
function initializeUserGame() {
    const nSelect = document.getElementById('user-n-select');
    if (nSelect) {
        nSelect.addEventListener('change', function() {
            generateUserGameSeats();
        });
    }
    
    generateUserGameSeats();
}

function generateUserGameSeats() {
    const n = parseInt(document.getElementById('user-n-select').value);
    const gameSeatsContainer = document.getElementById('game-seats');
    
    // 清空现有座位
    gameSeatsContainer.innerHTML = '';
    
    // 生成新的座位
    for (let i = 1; i <= n; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat available';
        seat.dataset.seat = i;
        seat.innerHTML = `<span class="seat-number">${i}</span>`;
        
        // 如果是最后一个座位，特殊标记
        if (i === n) {
            seat.classList.add('last');
        }
        
        seat.addEventListener('click', function() {
            if (!this.classList.contains('available')) return;
            
            // 用户选择第一位乘客的座位
            userSelectSeat(i, n);
        });
        
        gameSeatsContainer.appendChild(seat);
    }
    
    // 重置结果显示
    document.getElementById('game-result').classList.add('hidden');
}

function userSelectSeat(selectedSeat, n) {
    const seats = document.querySelectorAll('#game-seats .seat');
    
    // 标记第一位乘客的选择
    if (selectedSeat - 1 >= 0 && selectedSeat - 1 < seats.length) {
        seats[selectedSeat - 1].classList.remove('available');
        seats[selectedSeat - 1].classList.add('occupied', 'wrong');
    }
    
    // 模拟后续乘客
    const seatsState = Array(n).fill(null);
    seatsState[selectedSeat - 1] = 0; // 第一个乘客坐在选中的座位
    
    // 后续乘客（1到n-2）
    for (let p = 1; p < n - 1; p++) {
        if (seatsState[p] === null) {
            // 自己的座位空着，坐下
            seatsState[p] = p;
            if (p < seats.length) {
                seats[p].classList.remove('available');
                seats[p].classList.add('occupied');
            }
        } else {
            // 自己的座位被占，随机选剩下的
            const available = seatsState.map((s, idx) => s === null ? idx : null).filter(i => i !== null);
            const choice = available[Math.floor(Math.random() * available.length)];
            seatsState[choice] = p;
            if (choice < seats.length) {
                seats[choice].classList.remove('available');
                seats[choice].classList.add('occupied');
                
                // 如果选了错误的座位
                if (choice !== p) {
                    seats[choice].classList.add('wrong');
                }
            }
        }
    }
    
    // 最后一位乘客
    const lastSeat = seatsState.indexOf(null);
    if (lastSeat >= 0 && lastSeat < seats.length) {
        seatsState[lastSeat] = n - 1;
        seats[lastSeat].classList.remove('available');
        seats[lastSeat].classList.add('occupied', 'current');
    }
    
    // 判断是否成功
    const isSuccess = lastSeat === n - 1;
    
    // 显示结果
    const resultIndicator = document.getElementById('result-indicator');
    const resultText = document.getElementById('result-text');
    
    if (resultIndicator && resultText) {
        resultIndicator.textContent = isSuccess ? '✅' : '❌';
        resultIndicator.className = 'result-indicator ' + (isSuccess ? 'success' : 'fail');
        resultText.textContent = isSuccess ? '最后一位坐到自己座位！' : '最后一位没坐到自己座位';
        
        document.getElementById('game-result').classList.remove('hidden');
    }
    
    // 更新统计
    userGameStats.total++;
    if (isSuccess) userGameStats.wins++;
}

function resetGame() {
    const n = parseInt(document.getElementById('user-n-select').value);
    generateUserGameSeats();
}

function showUserStats() {
    const userStats = document.getElementById('user-stats');
    const wins = userGameStats.wins;
    const total = userGameStats.total;
    const rate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    
    if (document.getElementById('user-wins')) {
        document.getElementById('user-wins').textContent = wins;
        document.getElementById('user-total').textContent = total;
        document.getElementById('user-rate').textContent = rate + '%';
    }
    
    if (userStats) {
        userStats.classList.remove('hidden');
    }
}

function resetUserGame() {
    userGameStats = { wins: 0, total: 0 };
    generateUserGameSeats();
    const userStats = document.getElementById('user-stats');
    if (userStats) {
        userStats.classList.add('hidden');
    }
}

// ===== 通用模拟函数 =====
function simulateAirplaneSeating(n) {
    const seatsState = Array(n).fill(null);
    
    // 第一个乘客随机坐
    const firstChoice = Math.floor(Math.random() * n);
    seatsState[firstChoice] = 0;
    
    // 后续乘客
    for (let p = 1; p < n - 1; p++) {
        if (seatsState[p] === null) {
            // 自己的座位空着，坐下
            seatsState[p] = p;
        } else {
            // 自己的座位被占，随机选剩下的
            const available = seatsState.map((s, idx) => s === null ? idx : null).filter(i => i !== null);
            const choice = available[Math.floor(Math.random() * available.length)];
            seatsState[choice] = p;
        }
    }
    
    // 最后一位乘客坐最后剩下的座位
    const lastSeat = seatsState.indexOf(null);
    const isSuccess = lastSeat === n - 1;
    
    return {
        isSuccess: isSuccess,
        seatsState: seatsState,
        lastSeat: lastSeat
    };
}
