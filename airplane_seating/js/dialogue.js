// ==========================================================================
// JS 模块 4: 打字机对话与录音纸条引擎 (DIALOGUE.JS)
// ==========================================================================

let activeDialogueTimer = null;

function typeDialogue(text, callback) {
    const el = document.getElementById("tape-dialogue");
    if (!el) return;

    // 彻底清除并中断任何正在运行的历史打字机定时器，杜绝两句话交错穿插乱码
    if (activeDialogueTimer) {
        clearInterval(activeDialogueTimer);
        activeDialogueTimer = null;
    }

    gameState.dialogueTyping = true;
    el.textContent = "";
    
    let i = 0;
    const speed = 28; // 28ms 节奏
    
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
