// ===== 全局状态 =====
let probabilityChart = null;
let bulkSimulationRunning = false;
let userGameStats = { wins: 0, total: 0 };
let n3AnimationRunning = false;
let currentPageIndex = 0;
let pageTransitionTimer = null;

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initializePager();
    initializeChart();
    initializeUserGame();
    lockWheelNavigation();
});

// ===== 固定页翻页控制 =====
function initializePager() {
    const pages = getPages();
    document.getElementById('page-count').textContent = String(pages.length);
    updatePageUI(false);

    document.addEventListener('keydown', (event) => {
        const target = event.target;
        const isFormControl = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
        if (isFormControl) return;

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            nextPage();
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            previousPage();
        }
        if (event.key === 'Home') {
            event.preventDefault();
            goToPage(0);
        }
        if (event.key === 'End') {
            event.preventDefault();
            goToPage(getPages().length - 1);
        }
    });
}

function lockWheelNavigation() {
    // 页面不接收滚轮翻页，也不会因滚轮发生垂直滚动。
    document.addEventListener('wheel', (event) => event.preventDefault(), { passive: false });
}

function getPages() {
    return Array.from(document.querySelectorAll('.lesson-page'));
}

function goToPage(index, shouldFocus = true) {
    const pages = getPages();
    if (!pages.length) return;

    const nextIndex = Math.min(Math.max(index, 0), pages.length - 1);
    if (nextIndex === currentPageIndex && pages[currentPageIndex].classList.contains('active')) return;

    const previousIndex = currentPageIndex;
    const direction = nextIndex > previousIndex ? 1 : -1;
    const oldPage = pages[previousIndex];
    const newPage = pages[nextIndex];

    document.querySelectorAll('.passenger').forEach((passenger) => passenger.remove());
    n3AnimationRunning = false;

    if (pageTransitionTimer) window.clearTimeout(pageTransitionTimer);

    oldPage.classList.remove('active');
    oldPage.classList.toggle('exit-left', direction > 0);
    oldPage.setAttribute('aria-hidden', 'true');

    newPage.classList.remove('exit-left');
    newPage.classList.add('active');
    newPage.setAttribute('aria-hidden', 'false');

    currentPageIndex = nextIndex;
    updatePageUI(shouldFocus);

    pageTransitionTimer = window.setTimeout(() => {
        pages.forEach((page, pageIndex) => {
            if (pageIndex !== currentPageIndex) page.classList.remove('exit-left');
        });
    }, 300);
}

function nextPage() {
    goToPage(currentPageIndex + 1);
}

function previousPage() {
    goToPage(currentPageIndex - 1);
}

function updatePageUI(shouldFocus) {
    const pages = getPages();
    const current = currentPageIndex + 1;
    const previousButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');

    document.getElementById('current-page').textContent = String(current);
    previousButton.disabled = currentPageIndex === 0;
    nextButton.disabled = currentPageIndex === pages.length - 1;
    nextButton.setAttribute('aria-label', currentPageIndex === pages.length - 1 ? '已到最后一页' : '下一页');

    document.querySelectorAll('.page-dot').forEach((dot, index) => {
        const active = index === currentPageIndex;
        dot.classList.toggle('active', active);
        if (active) {
            dot.setAttribute('aria-current', 'step');
        } else {
            dot.removeAttribute('aria-current');
        }
    });

    if (shouldFocus) {
        window.setTimeout(() => {
            const title = pages[currentPageIndex].querySelector('h1, h2');
            if (title instanceof HTMLElement) title.focus({ preventScroll: true });
        }, 40);
    }
}

// ===== 工具函数 =====
function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomAvailableSeat(seatsState) {
    const available = seatsState
        .map((seat, index) => seat === null ? index : null)
        .filter((seat) => seat !== null);
    return available[Math.floor(Math.random() * available.length)];
}

// ===== N = 2 模拟 =====
function simulateN2() {
    const simulations = 100;
    let successCount = 0;
    const results = [];

    for (let i = 0; i < simulations; i += 1) {
        const firstChoice = Math.random() < 0.5 ? 0 : 1;
        const isSuccess = firstChoice === 0;
        results.push(isSuccess);
        if (isSuccess) successCount += 1;
    }

    const percentage = ((successCount / simulations) * 100).toFixed(1);
    const resultEl = document.querySelector('.n2-result');
    if (resultEl) {
        resultEl.innerHTML = `本次模拟：${successCount}/${simulations} = <span class="highlight">${percentage}%</span>`;
    }
    animateN2Result(results);
}

function animateN2Result(results) {
    const seats = document.querySelectorAll('.card-n2 .seat.mini');
    const scenarios = document.querySelectorAll('.card-n2 .scenario');
    if (!seats.length || !scenarios.length) return;

    seats.forEach((seat) => seat.classList.remove('occupied', 'wrong', 'current'));
    scenarios.forEach((scenario) => scenario.style.opacity = '0.45');

    const isSuccess = results[Math.floor(Math.random() * results.length)];
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

// ===== N = 3 动画演示 =====
async function animateN3() {
    if (n3AnimationRunning || currentPageIndex !== 2) return;
    n3AnimationRunning = true;

    const animationArea = document.getElementById('n3-animation');
    const resultEl = document.getElementById('n3-result');
    const seats = Array.from(document.querySelectorAll('.card-n3 .seat.mini'));
    if (!animationArea || !seats.length) {
        n3AnimationRunning = false;
        return;
    }

    seats.forEach((seat) => seat.classList.remove('occupied', 'wrong', 'current'));
    animationArea.innerHTML = '<p class="animation-text">正在演示入座过程…</p>';
    resultEl.textContent = '';

    const passengers = Array.from({ length: 3 }, (_, index) => {
        const passenger = document.createElement('div');
        passenger.className = 'passenger';
        passenger.textContent = String(index + 1);
        passenger.style.display = 'none';
        document.body.appendChild(passenger);
        return passenger;
    });

    const seatPositions = seats.map((seat) => {
        const rect = seat.getBoundingClientRect();
        return { x: rect.left + rect.width / 2 - 16, y: rect.top + rect.height / 2 - 16 };
    });
    const seatsState = Array(3).fill(null);
    const firstChoice = Math.random() < 0.5 ? 0 : 1;

    try {
        seatsState[firstChoice] = 0;
        await movePassenger(passengers[0], seatPositions[firstChoice]);
        if (currentPageIndex !== 2) return;
        seats[firstChoice].classList.add('occupied', firstChoice === 0 ? '' : 'wrong');
        animationArea.innerHTML = `<p class="animation-text">乘客 1 坐了 ${firstChoice + 1} 号座位。</p>`;
        await sleep(650);

        const passenger2Choice = seatsState[1] === null ? 1 : randomAvailableSeat(seatsState);
        seatsState[passenger2Choice] = 1;
        await movePassenger(passengers[1], seatPositions[passenger2Choice]);
        if (currentPageIndex !== 2) return;
        seats[passenger2Choice].classList.add('occupied');
        if (passenger2Choice !== 1) seats[passenger2Choice].classList.add('wrong');
        animationArea.innerHTML = `<p class="animation-text">乘客 2 坐了 ${passenger2Choice + 1} 号座位。</p>`;
        await sleep(650);

        const lastSeat = seatsState.indexOf(null);
        seatsState[lastSeat] = 2;
        await movePassenger(passengers[2], seatPositions[lastSeat]);
        if (currentPageIndex !== 2) return;
        seats[lastSeat].classList.add('occupied', 'current');
        const isSuccess = lastSeat === 2;
        animationArea.innerHTML = `<p class="animation-text">乘客 3 坐了 ${lastSeat + 1} 号座位。</p>`;
        resultEl.innerHTML = isSuccess
            ? '<span class="success">✅ 最后一位坐到了自己的座位。</span>'
            : '<span class="fail">❌ 最后一位没有坐到自己的座位。</span>';
    } finally {
        passengers.forEach((passenger) => passenger.remove());
        n3AnimationRunning = false;
    }
}

async function movePassenger(passenger, position) {
    passenger.style.display = 'flex';
    passenger.style.left = `${window.innerWidth / 2 - 16}px`;
    passenger.style.top = '4.5rem';
    await sleep(120);
    passenger.style.left = `${position.x}px`;
    passenger.style.top = `${position.y}px`;
    await sleep(460);
}

function simulateN3() {
    const simulations = 50;
    let successCount = 0;
    for (let i = 0; i < simulations; i += 1) {
        if (simulateOnce(3)) successCount += 1;
    }
    const percentage = ((successCount / simulations) * 100).toFixed(1);
    const resultEl = document.getElementById('n3-result');
    if (resultEl) {
        resultEl.innerHTML = `本次模拟：${successCount}/${simulations} = <span class="highlight">${percentage}%</span>`;
    }
}

// ===== 大规模验证 =====
function initializeChart() {
    const svg = document.getElementById('probability-chart');
    if (!(svg instanceof SVGElement)) return;
    probabilityChart = { svg, samples: Array(100).fill(50) };
    renderProbabilityChart();
}

function renderProbabilityChart() {
    if (!probabilityChart) return;

    const { svg, samples } = probabilityChart;
    const width = 720;
    const height = 250;
    const plot = { left: 47, right: 14, top: 18, bottom: 32 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const x = (index) => plot.left + (index / (samples.length - 1)) * plotWidth;
    const y = (value) => plot.top + ((100 - value) / 100) * plotHeight;
    const esc = (value) => String(value).replace(/[&<>\"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

    const grid = [0, 25, 50, 75, 100].map((value) => {
        const position = y(value).toFixed(1);
        return `<line x1="${plot.left}" y1="${position}" x2="${width - plot.right}" y2="${position}" class="chart-grid"/><text x="${plot.left - 8}" y="${Number(position) + 4}" class="chart-label" text-anchor="end">${esc(value)}%</text>`;
    }).join('');
    const xLabels = [1, 25, 50, 75, 100].map((value) => {
        const position = x(value - 1).toFixed(1);
        return `<text x="${position}" y="${height - 9}" class="chart-label" text-anchor="middle">${esc(value)}</text>`;
    }).join('');

    let path = '';
    samples.forEach((value, index) => {
        if (!Number.isFinite(value)) return;
        const point = `${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
        path += path ? ` L ${point}` : `M ${point}`;
    });

    const theoryY = y(50).toFixed(1);
    svg.innerHTML = `
        <title>最后一位乘客成功概率的模拟曲线</title>
        <desc>蓝色实线为模拟概率，橙色虚线表示理论值百分之五十。</desc>
        ${grid}
        <line x1="${plot.left}" y1="${theoryY}" x2="${width - plot.right}" y2="${theoryY}" class="chart-theory"/>
        ${path ? `<path d="${path}" class="chart-line"/>` : ''}
        <text x="${width - plot.right}" y="${Number(theoryY) - 7}" class="chart-theory-label" text-anchor="end">理论值 50%</text>
        ${xLabels}
    `;
}

async function runBulkSimulation(times) {
    if (bulkSimulationRunning) return;
    bulkSimulationRunning = true;
    const n = 100;
    let successCount = 0;
    const totalEl = document.getElementById('total-simulations');
    const successEl = document.getElementById('success-count');
    const probabilityEl = document.getElementById('current-probability');

    totalEl.textContent = '0';
    successEl.textContent = '0';
    probabilityEl.textContent = '0%';
    if (probabilityChart) {
        probabilityChart.samples = Array(100).fill(null);
        renderProbabilityChart();
    }

    try {
        for (let index = 0; index < times; index += 1) {
            if (simulateOnce(n)) successCount += 1;
            const total = index + 1;
            const probability = Number(((successCount / total) * 100).toFixed(1));
            totalEl.textContent = String(total);
            successEl.textContent = String(successCount);
            probabilityEl.textContent = `${probability}%`;

            if (probabilityChart && index < 100) {
                probabilityChart.samples[index] = probability;
                renderProbabilityChart();
            }
            if (index % 25 === 0) await sleep(0);
        }
    } finally {
        bulkSimulationRunning = false;
    }
}

function simulateOnce(n) {
    const seatsState = Array(n).fill(null);
    seatsState[Math.floor(Math.random() * n)] = 0;

    for (let passenger = 1; passenger < n - 1; passenger += 1) {
        const chosenSeat = seatsState[passenger] === null ? passenger : randomAvailableSeat(seatsState);
        seatsState[chosenSeat] = passenger;
    }
    return seatsState.indexOf(null) === n - 1;
}

function resetBulkSimulation() {
    if (probabilityChart) {
        probabilityChart.samples = Array(100).fill(50);
        renderProbabilityChart();
    }
    document.getElementById('total-simulations').textContent = '0';
    document.getElementById('success-count').textContent = '0';
    document.getElementById('current-probability').textContent = '0%';
}

// ===== 互动游戏 =====
function initializeUserGame() {
    generateUserGameSeats();
}

function generateUserGameSeats() {
    const select = document.getElementById('user-n-select');
    const container = document.getElementById('game-seats');
    if (!select || !container) return;

    const n = Number.parseInt(select.value, 10);
    container.innerHTML = '';
    for (let number = 1; number <= n; number += 1) {
        const seat = document.createElement('button');
        seat.type = 'button';
        seat.className = 'seat mini available';
        seat.dataset.seat = String(number);
        seat.setAttribute('aria-label', `选择 ${number} 号座位`);
        seat.textContent = String(number);
        if (number === n) seat.classList.add('last');
        seat.addEventListener('click', () => userSelectSeat(number, n));
        container.appendChild(seat);
    }
    document.getElementById('game-result').classList.add('hidden');
}

async function userSelectSeat(selectedSeat, n) {
    if (currentPageIndex !== 6) return;
    const seats = Array.from(document.querySelectorAll('#game-seats .seat.mini'));
    if (!seats.some((seat) => seat.classList.contains('available'))) return;

    seats.forEach((seat) => seat.classList.remove('available'));
    const seatsState = Array(n).fill(null);
    seatsState[selectedSeat - 1] = 0;
    seats[selectedSeat - 1].classList.add('occupied');
    if (selectedSeat !== 1) seats[selectedSeat - 1].classList.add('wrong');

    for (let passenger = 1; passenger < n - 1; passenger += 1) {
        const choice = seatsState[passenger] === null ? passenger : randomAvailableSeat(seatsState);
        seatsState[choice] = passenger;
        seats[choice].classList.add('occupied');
        if (choice !== passenger) seats[choice].classList.add('wrong');
        await sleep(n > 10 ? 20 : 70);
        if (currentPageIndex !== 6) return;
    }

    const lastSeat = seatsState.indexOf(null);
    seatsState[lastSeat] = n - 1;
    seats[lastSeat].classList.add('occupied', 'current');
    const isSuccess = lastSeat === n - 1;

    const indicator = document.getElementById('result-indicator');
    const text = document.getElementById('result-text');
    indicator.textContent = isSuccess ? '✅' : '❌';
    indicator.className = `result-indicator ${isSuccess ? 'success' : 'fail'}`;
    text.textContent = isSuccess ? '最后一位坐到了自己的座位。' : '最后一位没有坐到自己的座位。';
    document.getElementById('game-result').classList.remove('hidden');

    userGameStats.total += 1;
    if (isSuccess) userGameStats.wins += 1;
}

function resetGame() {
    generateUserGameSeats();
}

function showUserStats() {
    const rate = userGameStats.total > 0 ? ((userGameStats.wins / userGameStats.total) * 100).toFixed(1) : '0';
    document.getElementById('user-wins').textContent = String(userGameStats.wins);
    document.getElementById('user-total').textContent = String(userGameStats.total);
    document.getElementById('user-rate').textContent = `${rate}%`;
    document.getElementById('user-stats').classList.remove('hidden');
}
