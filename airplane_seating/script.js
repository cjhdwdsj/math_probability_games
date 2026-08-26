// ===== 全局状态 =====
let probabilityChart = null;
let bulkSimulationRunning = false;
let userGameStats = { wins: 0, total: 0 };
let n3AnimationRunning = false;
let n3AnimationRunId = 0;
let n3ActiveRun = null;
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
    n3AnimationRunId += 1;
    n3AnimationRunning = false;
    n3ActiveRun = null;
    setN3Controls(false);

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
function createN3Plan() {
    const seatsState = Array(3).fill(null);
    const choices = [];

    for (let passenger = 0; passenger < 3; passenger += 1) {
        const choice = passenger === 0
            ? Math.floor(Math.random() * 3)
            : (seatsState[passenger] === null ? passenger : randomAvailableSeat(seatsState));
        seatsState[choice] = passenger;
        choices.push(choice);
    }

    return { choices, isSuccess: choices[2] === 2 };
}

function setN3Controls(isRunning) {
    const playButton = document.getElementById('play-n3');
    const skipButton = document.getElementById('skip-n3');
    if (playButton) {
        playButton.disabled = isRunning;
        playButton.textContent = isRunning ? '🎬 正在演示…' : '🎬 演示一次';
    }
    if (skipButton) skipButton.disabled = !isRunning;
}

function renderN3Status({ stage = 'idle', activeStep = -1, title, detail, choices = [] }) {
    const animationArea = document.getElementById('n3-animation');
    if (!animationArea) return;

    const stepNames = ['乘客 1 随机选座', '乘客 2 判断并入座', '乘客 3 获得最后座位'];
    const steps = stepNames.map((name, index) => {
        const isDone = index < activeStep;
        const isActive = index === activeStep;
        const choiceText = isDone && Number.isInteger(choices[index]) ? ` → ${choices[index] + 1} 号座位` : '';
        return `<li class="${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}"><b>${index + 1}</b><span>${name}${choiceText}</span></li>`;
    }).join('');

    animationArea.innerHTML = `
        <div class="animation-status is-${stage}">
            <div class="status-line"><span class="status-orb" aria-hidden="true"></span><strong>${title}</strong></div>
            <p class="animation-text">${detail}</p>
            <ol class="animation-steps" aria-label="三位乘客的入座步骤">${steps}</ol>
        </div>
    `;
}

function describeN3Choice(passenger, choice, ownSeat) {
    if (passenger === 0) return `第一位没有座位偏好，随机选中了 ${choice + 1} 号座位。`;
    if (choice === ownSeat) return `自己的 ${ownSeat + 1} 号座位空着，可以直接坐下。`;
    return `自己的 ${ownSeat + 1} 号座位已被占，只能在剩余座位中随机选中 ${choice + 1} 号座位。`;
}

async function waitForN3Step(runId, duration) {
    await sleep(duration);
    return runId === n3AnimationRunId && currentPageIndex === 2;
}

async function movePassenger(passenger, position, runId) {
    passenger.style.display = 'flex';
    passenger.classList.add('is-flying');
    passenger.style.left = `${window.innerWidth / 2 - 16}px`;
    passenger.style.top = '4.6rem';
    if (!await waitForN3Step(runId, 180)) return false;

    passenger.style.left = `${position.x}px`;
    passenger.style.top = `${position.y}px`;
    if (!await waitForN3Step(runId, 620)) return false;

    passenger.classList.remove('is-flying');
    passenger.classList.add('is-arrived');
    return true;
}

function completeN3Animation(plan, wasSkipped = false) {
    const seats = Array.from(document.querySelectorAll('.card-n3 .seat.mini'));
    const resultEl = document.getElementById('n3-result');
    if (!seats.length || !resultEl) return;

    seats.forEach((seat) => seat.classList.remove('occupied', 'wrong', 'current', 'checking', 'target'));
    plan.choices.forEach((choice, passenger) => {
        seats[choice].classList.add('occupied');
        if (choice !== passenger) seats[choice].classList.add('wrong');
    });
    seats[plan.choices[2]].classList.add('current');

    renderN3Status({
        stage: plan.isSuccess ? 'success' : 'fail',
        activeStep: 3,
        title: plan.isSuccess ? '终点：最后一位成功' : '终点：最后一位失败',
        detail: wasSkipped
            ? `已跳至结果：最后一位乘客坐到了 ${plan.choices[2] + 1} 号座位。`
            : `三位乘客均已入座，最后一位乘客坐到了 ${plan.choices[2] + 1} 号座位。`,
        choices: plan.choices
    });
    resultEl.innerHTML = plan.isSuccess
        ? '<span class="success">✅ 最后一位坐到了自己的座位。</span>'
        : '<span class="fail">❌ 最后一位没有坐到自己的座位。</span>';
}

async function animateN3() {
    if (n3AnimationRunning || currentPageIndex !== 2) return;

    const seats = Array.from(document.querySelectorAll('.card-n3 .seat.mini'));
    const resultEl = document.getElementById('n3-result');
    if (!seats.length || !resultEl) return;

    const runId = ++n3AnimationRunId;
    const plan = createN3Plan();
    n3AnimationRunning = true;
    n3ActiveRun = plan;
    setN3Controls(true);
    resultEl.textContent = '';
    seats.forEach((seat) => seat.classList.remove('occupied', 'wrong', 'current', 'checking', 'target'));

    const passengers = Array.from({ length: 3 }, (_, index) => {
        const passenger = document.createElement('div');
        passenger.className = 'passenger';
        passenger.dataset.passenger = String(index + 1);
        passenger.textContent = String(index + 1);
        passenger.style.display = 'none';
        document.body.appendChild(passenger);
        return passenger;
    });
    const seatPositions = seats.map((seat) => {
        const rect = seat.getBoundingClientRect();
        return { x: rect.left + rect.width / 2 - 16, y: rect.top + rect.height / 2 - 16 };
    });

    try {
        renderN3Status({
            stage: 'running',
            activeStep: 0,
            title: '入座演示开始',
            detail: '先观察第一位乘客随机打破规则。',
            choices: plan.choices
        });
        if (!await waitForN3Step(runId, 520)) return;

        for (let passenger = 0; passenger < 3; passenger += 1) {
            const choice = plan.choices[passenger];
            const ownSeat = passenger;
            const displaced = passenger > 0 && choice !== ownSeat;

            if (displaced) {
                seats[ownSeat].classList.add('checking');
                renderN3Status({
                    stage: 'checking',
                    activeStep: passenger,
                    title: `乘客 ${passenger + 1} 发现座位被占`,
                    detail: `自己的 ${ownSeat + 1} 号座位已被占；现在只剩 ${plan.choices.slice(passenger).map((seat) => `${seat + 1} 号`).join('、')} 座位的连锁选择。`,
                    choices: plan.choices
                });
                if (!await waitForN3Step(runId, 680)) return;
                seats[ownSeat].classList.remove('checking');
            }

            seats[choice].classList.add('target');
            renderN3Status({
                stage: 'running',
                activeStep: passenger,
                title: `轮到乘客 ${passenger + 1}`,
                detail: describeN3Choice(passenger, choice, ownSeat),
                choices: plan.choices
            });
            if (!await waitForN3Step(runId, 420)) return;
            if (!await movePassenger(passengers[passenger], seatPositions[choice], runId)) return;

            seats[choice].classList.remove('target');
            seats[choice].classList.add('occupied');
            if (choice !== ownSeat) seats[choice].classList.add('wrong');
            if (passenger === 2) seats[choice].classList.add('current');

            renderN3Status({
                stage: 'seated',
                activeStep: passenger + 1,
                title: `乘客 ${passenger + 1} 已入座`,
                detail: `座位 ${choice + 1} 已被占用。${passenger < 2 ? '继续观察下一位乘客。' : '答案已经揭晓。'}`,
                choices: plan.choices
            });
            if (!await waitForN3Step(runId, passenger === 2 ? 420 : 720)) return;
        }

        completeN3Animation(plan);
    } finally {
        passengers.forEach((passenger) => passenger.remove());
        if (runId === n3AnimationRunId) {
            n3AnimationRunning = false;
            n3ActiveRun = null;
            setN3Controls(false);
        }
    }
}

function skipN3Animation() {
    if (!n3AnimationRunning || !n3ActiveRun || currentPageIndex !== 2) return;
    n3AnimationRunId += 1;
    document.querySelectorAll('.passenger').forEach((passenger) => passenger.remove());
    completeN3Animation(n3ActiveRun, true);
    n3AnimationRunning = false;
    n3ActiveRun = null;
    setN3Controls(false);
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
