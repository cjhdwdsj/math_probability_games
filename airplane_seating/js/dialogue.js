let activeDialogueTimer = null;
let activeSequence = null;

function typeDialogue(text, callback) {
    const el = document.getElementById("tape-dialogue");
    const hintEl = document.getElementById("tape-step-hint");
    if (!el) return;
    if (hintEl) hintEl.classList.add("hidden");

    if (activeDialogueTimer) {
        clearInterval(activeDialogueTimer);
        activeDialogueTimer = null;
    }

    gameState.dialogueTyping = true;
    el.textContent = "";
    
    let i = 0;
    const speed = 25;
    
    activeDialogueTimer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(activeDialogueTimer);
            activeDialogueTimer = null;
            gameState.dialogueTyping = false;
            if (callback) callback();
        }
    }, speed);
}

// 步进式多段剧情对话序列 (支持按空格/回车/点击录音条步进)
function runDialogueSequence(lines, onComplete) {
    if (!lines || lines.length === 0) {
        if (onComplete) onComplete();
        return;
    }

    let currentIndex = 0;
    let isCurrentLineDone = false;
    const el = document.getElementById("tape-dialogue");
    const hintEl = document.getElementById("tape-step-hint");

    function renderLine(index) {
        isCurrentLineDone = false;
        if (hintEl) hintEl.classList.add("hidden");
        
        typeDialogue(lines[index], () => {
            isCurrentLineDone = true;
            if (hintEl) {
                hintEl.textContent = (index < lines.length - 1) ? "▼ 点击或按空格继续" : "▼ 点击开始执勤";
                hintEl.classList.remove("hidden");
            }
        });
    }

    function advance() {
        if (!isCurrentLineDone) {
            // 如果还在逐字打印，点击直接秒出当前全句
            if (activeDialogueTimer) {
                clearInterval(activeDialogueTimer);
                activeDialogueTimer = null;
            }
            if (el) el.textContent = lines[currentIndex];
            isCurrentLineDone = true;
            gameState.dialogueTyping = false;
            if (hintEl) {
                hintEl.textContent = (currentIndex < lines.length - 1) ? "▼ 点击或按空格继续" : "▼ 点击开始执勤";
                hintEl.classList.remove("hidden");
            }
            return;
        }

        // 已经打印完，步进到下一句
        currentIndex++;
        if (currentIndex < lines.length) {
            renderLine(currentIndex);
        } else {
            // 全部播报完毕
            if (hintEl) hintEl.classList.add("hidden");
            activeSequence = null;
            if (onComplete) onComplete();
        }
    }

    activeSequence = { advance };
    renderLine(0);
}

document.addEventListener("DOMContentLoaded", () => {
    const tape = document.getElementById("transcript-tape");
    if (tape) {
        tape.addEventListener("click", () => {
            if (activeSequence) activeSequence.advance();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (activeSequence && (e.code === "Space" || e.code === "Enter")) {
            e.preventDefault();
            activeSequence.advance();
        }
    });
});
