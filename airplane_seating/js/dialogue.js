// ==========================================================================
// JS 模块 4: 打字机对话与录音纸条引擎 (DIALOGUE.JS)
// ==========================================================================

function typeDialogue(text, callback) {
    const el = document.getElementById("tape-dialogue");
    gameState.dialogueTyping = true;
    el.textContent = "";
    
    let i = 0;
    const speed = 35; // 35ms 慢速真实打字节奏
    
    const timer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(timer);
            gameState.dialogueTyping = false;
            if (callback) callback();
        }
    }, speed);
}
