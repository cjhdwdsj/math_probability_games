// ===== 全局状态 =====
let probabilityChart = null;
let bulkSimulationRunning = false;
let userGameStats = { wins: 0, total: 0 };
let n3AnimationRunning = false;

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    initializeUserGame();
    
    // 为所有按钮添加点击反馈
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.95)';
        });
        btn.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
});

// ===== 工具函数 =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== N=2 模拟 =====
function simulateN2() {
    const simulations = 100;
    let successCount = 0;
    const results = [];
    
    for (let i = 0; i < simulations; i++) {
        const firstChoice = Math.random() < 0.5 ? 1 : 2;
        const isSuccess = firstChoice === 1;
        results.push(isSuccess);
        if (isSuccess) successCount++;
    }
    
    const percentage = ((successCount / simulations) * 100).toFixed(1);
    
    // 显示结果
    const resultEl = document.querySelector('.card-n2 .result');
    if (resultEl) {
        resultEl.innerHTML = `概率：<span class="highlight">${percentage}%</span>`;
    }
    
    // 动画展示
    animateN2Result(results);
}

function animateN2Result(results) {
    const seats = document.querySelectorAll('.card-n2 .seat.mini');
    const scenarios = document.querySelectorAll('.card-n2 .scenario');
    
    if (!seats.length || !scenarios.length) return;
    
    // 重置
    seats.forEach(s => s.classList.remove('occupied', 'wrong', 'current'));
    scenarios.forEach(s => s.style.opacity = '0.5');
    
    // 随机选择一个结果演示
    const randomIndex = Math.floor(Math.random() * results.length);
    const isSuccess = results[randomIndex];
    
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

// ===== N=3 动画演示 =====
async function animateN3() {
    if (n3AnimationRunning) return;
    n3AnimationRunning = true;
    
    const animationArea = document.getElementById('n3-animation');
    const resultEl = document.getElementById('n3-result');
    const seats = document.querySelectorAll('.card-n3 .seat.mini');
    
    if (!animationArea || !seats.length) {
        n3AnimationRunning = false;
        return;
    }
    
    // 重置
    seats.forEach(s => s.classList.remove('occupied', 'wrong', 'current'));
    animationArea.innerHTML = '<p class="animation-text">正在演示...</p>';
    if (resultEl) resultEl.textContent = '';
    
    // 创建乘客元素
    const passengers = [];
    for (let i = 0; i < 3; i++) {
        const p = document.createElement('div');
        p.className = 'passenger';
        p.textContent = i + 1;
        p.style.position = 'absolute';
        p.style.display = 'none';
        document.body.appendChild(p);
        passengers.push(p);
    }
    
    const n = 3;
    const seatsState = Array(n).fill(null);
    const seatPositions = [];
    
    // 获取座位位置
    seats.forEach((seat, index) => {
        const rect = seat.getBoundingClientRect();
        seatPositions.push({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        });
    });
    
    // 第一个乘客随机选择座位（不选座位3，这样更容易演示连锁反应）
    const firstChoice = Math.random() < 0.5 ? 0 : 1;
    seatsState[firstChoice] = 0;
    
    // 动画：第一个乘客移动到座位
    passengers[0].style.display = 'flex';
    passengers[0].style.left = `${window.innerWidth / 2}px`;
    passengers[0].style.top = '100px';
    await sleep(300);
    
    passengers[0].style.left = `${seatPositions[firstChoice].x}px`;
    passengers[0].style.top = `${seatPositions[firstChoice].y}px`;
    await sleep(800);
    
    seats[firstChoice].classList.add('occupied', 'wrong');
    animationArea.innerHTML = `<p class="animation-text">乘客1坐了座位${firstChoice + 1}</p>`;
    await sleep(1000);
    
    // 第二个乘客
    if (seatsState[1] === null) {
        // 自己的座位空着，坐下
        seatsState[1] = 1;
        passengers[1].style.display = 'flex';
        passengers[1].style.left = `${window.innerWidth / 2}px`;
        passengers[1].style.top = '100px';
        await sleep(300);
        
        passengers[1].style.left = `${seatPositions[1].x}px`;
        passengers[1].style.top = `${seatPositions[1].y}px`;
        await sleep(800);
        
        seats[1].classList.add('occupied');
        animationArea.innerHTML = `<p class="animation-text">乘客2坐了座位2</p>`;
        await sleep(1000);
    } else {
        // 自己的座位被占，随机选剩下的
        const available = seatsState.map((s, i) => s === null ? i : null).filter(i => i !== null);
        const choice = available[Math.floor(Math.random() * available.length)];
        seatsState[choice] = 1;
        
        passengers[1].style.display = 'flex';
        passengers[1].style.left = `${window.innerWidth / 2}px`;
        passengers[1].style.top = '100px';
        await sleep(300);
        
        passengers[1].style.left = `${seatPositions[choice].x}px`;
        passengers[1].style.top = `${seatPositions[choice].y}px`;
        await sleep(800);
        
        seats[choice].classList.add('occupied');
        if (choice !== 1) {
            seats[choice].classList.add('wrong');
        }
        animationArea.innerHTML = `<p class="animation-text">乘客2坐了座位${choice + 1}</p>`;
        await sleep(1000);
    }
    
    // 第三个乘客坐最后剩下的座位
    const lastSeat = seatsState.indexOf(null);
    seatsState[lastSeat] = 2;
    
    passengers[2].style.display = 'flex';
    passengers[2].style.left = `${window.innerWidth / 2}px`;
    passengers[2].style.top = '100px';
    await sleep(300);
    
    passengers[2].style.left = `${seatPositions[lastSeat].x}px`;
    passengers[2].style.top = `${seatPositions[lastSeat].y}px`;
    await sleep(800);
    
    seats[lastSeat].classList.add('occupied', 'current');
    
    const isSuccess = lastSeat === 2;
    animationArea.innerHTML = `<p class="animation-text">乘客3坐了座位${lastSeat + 1}</p>`;
    await sleep(1000);
    
    if (resultEl) {
        resultEl.innerHTML = isSuccess ? '<span class="success">✅ 最后一位坐到自己座位！</span>' : '<span class="fail">❌ 最后一位没坐到自己座位</span>';
    }
    
    // 清理乘客元素
    passengers.forEach(p => p.remove());
    
    n3AnimationRunning = false;
}

function simulateN3() {
    const simulations = 50;
    let successCount = 0;
    
    for (let i = 0; i < simulations; i++) {
        const n = 3;
        const seatsState = Array(n).fill(null);
        
        const firstChoice = Math.floor(Math.random() * n);
        seatsState[firstChoice] = 0;
        
        if (seatsState[1] === null) {
            seatsState[1] = 1;
        } else {
            const available = seatsState.map((s, idx) => s === null ? idx : null).filter(i => i !== null);
            const choice = available[Math.floor(Math.random() * available.length)];
            seatsState[choice] = 1;
        }
        
        const lastSeat = seatsState.indexOf(null);
        if (lastSeat === 2) successCount++;
    }
    
    const percentage = ((successCount / simulations) * 100).toFixed(1);
    const resultEl = document.getElementById('n3-result');
    if (resultEl) {
        resultEl.innerHTML = `模拟结果：${successCount}/50 = <span class="highlight">${percentage}%</span>`;
    }
}

// ===== 大规模验证 =====
function initializeChart() {
    const ctx = document.getElementById('probability-chart');
    if (!ctx) return;
    
    const labels = Array.from({ length: 100 }, (_, i) => i + 1);
    const data = Array(100).fill(50);
    
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
                        text: '概率 (%)',
                        font: { size: 12 }
                    },
                    ticks: {
                        font: { size: 11 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '模拟次数',
                        font: { size: 12 }
                    },
                    ticks: {
                        font: { size: 11 }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

async function runBulkSimulation(times) {
    if (bulkSimulationRunning) return;
    
    bulkSimulationRunning = true;
    const n = 100;
    let successCount = 0;
    
    document.getElementById('total-simulations').textContent = '0';
    document.getElementById('success-count').textContent = '0';
    document.getElementById('current-probability').textContent = '0%';
    
    if (probabilityChart) {
        probabilityChart.data.datasets[0].data = Array(100).fill(0);
        probabilityChart.update('none');
    }
    
    for (let i = 0; i < times; i++) {
        const result = simulateOnce(n);
        if (result) successCount++;
        
        const total = i + 1;
        const probability = ((successCount / total) * 100).toFixed(1);
        
        document.getElementById('total-simulations').textContent = total;
        document.getElementById('success-count').textContent = successCount;
        document.getElementById('current-probability').textContent = probability + '%';
        
        if (probabilityChart && i < 100) {
            probabilityChart.data.datasets[0].data[i] = parseFloat(probability);
            probabilityChart.update('none');
        }
        
        if (i % 20 === 0) {
            await sleep(0);
        }
    }
    
    bulkSimulationRunning = false;
}

function simulateOnce(n) {
    const seatsState = Array(n).fill(null);
    const firstChoice = Math.floor(Math.random() * n);
    seatsState[firstChoice] = 0;
    
    for (let p = 1; p < n - 1; p++) {
        if (seatsState[p] === null) {
            seatsState[p] = p;
        } else {
            const available = seatsState.map((s, idx) => s === null ? idx : null).filter(i => i !== null);
            const choice = available[Math.floor(Math.random() * available.length)];
            seatsState[choice] = p;
        }
    }
    
    const lastSeat = seatsState.indexOf(null);
    return lastSeat === n - 1;
}

function resetBulkSimulation() {
    if (probabilityChart) {
        probabilityChart.data.datasets[0].data = Array(100).fill(50);
        probabilityChart.update();
    }
    
    document.getElementById('total-simulations').textContent = '0';
    document.getElementById('success-count').textContent = '0';
    document.getElementById('current-probability').textContent = '0%';
}

// ===== 互动游戏 =====
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
    
    gameSeatsContainer.innerHTML = '';
    
    for (let i = 1; i <= n; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat mini available';
        seat.dataset.seat = i;
        seat.innerHTML = `<span class="seat-number">${i}</span>`;
        
        if (i === n) {
            seat.classList.add('last');
        }
        
        seat.addEventListener('click', function() {
            if (!this.classList.contains('available')) return;
            userSelectSeat(i, n);
        });
        
        gameSeatsContainer.appendChild(seat);
    }
    
    document.getElementById('game-result').classList.add('hidden');
}

async function userSelectSeat(selectedSeat, n) {
    const seats = document.querySelectorAll('#game-seats .seat.mini');
    
    if (selectedSeat - 1 >= 0 && selectedSeat - 1 < seats.length) {
        seats[selectedSeat - 1].classList.remove('available');
        seats[selectedSeat - 1].classList.add('occupied', 'wrong');
    }
    
    const seatsState = Array(n).fill(null);
    seatsState[selectedSeat - 1] = 0;
    
    // 创建乘客元素
    const passengers = [];
    for (let i = 1; i < n; i++) {
        const p = document.createElement('div');
        p.className = 'passenger';
        p.textContent = i + 1;
        p.style.position = 'absolute';
        p.style.display = 'none';
        document.body.appendChild(p);
        passengers.push(p);
    }
    
    const seatPositions = [];
    seats.forEach((seat, index) => {
        const rect = seat.getBoundingClientRect();
        seatPositions.push({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        });
    });
    
    // 模拟后续乘客
    for (let p = 1; p < n - 1; p++) {
        if (seatsState[p] === null) {
            seatsState[p] = p;
            if (p < seats.length) {
                seats[p].classList.remove('available');
                seats[p].classList.add('occupied');
            }
            
            // 动画
            passengers[p-1].style.display = 'flex';
            passengers[p-1].style.left = `${window.innerWidth / 2}px`;
            passengers[p-1].style.top = '50px';
            await sleep(100);
            
            passengers[p-1].style.left = `${seatPositions[p].x}px`;
            passengers[p-1].style.top = `${seatPositions[p].y}px`;
            await sleep(300);
        } else {
            const available = seatsState.map((s, idx) => s === null ? idx : null).filter(i => i !== null);
            const choice = available[Math.floor(Math.random() * available.length)];
            seatsState[choice] = p;
            
            if (choice < seats.length) {
                seats[choice].classList.remove('available');
                seats[choice].classList.add('occupied');
                if (choice !== p) {
                    seats[choice].classList.add('wrong');
                }
            }
            
            // 动画
            passengers[p-1].style.display = 'flex';
            passengers[p-1].style.left = `${window.innerWidth / 2}px`;
            passengers[p-1].style.top = '50px';
            await sleep(100);
            
            passengers[p-1].style.left = `${seatPositions[choice].x}px`;
            passengers[p-1].style.top = `${seatPositions[choice].y}px`;
            await sleep(300);
        }
    }
    
    // 最后一位乘客
    const lastSeat = seatsState.indexOf(null);
    if (lastSeat >= 0 && lastSeat < seats.length) {
        seatsState[lastSeat] = n - 1;
        seats[lastSeat].classList.remove('available');
        seats[lastSeat].classList.add('occupied', 'current');
    }
    
    const isSuccess = lastSeat === n - 1;
    
    // 清理乘客元素
    passengers.forEach(p => p.remove());
    
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
    const wins = userGameStats.wins;
    const total = userGameStats.total;
    const rate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    
    if (document.getElementById('user-wins')) {
        document.getElementById('user-wins').textContent = wins;
        document.getElementById('user-total').textContent = total;
        document.getElementById('user-rate').textContent = rate + '%';
    }
    
    const userStats = document.getElementById('user-stats');
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
