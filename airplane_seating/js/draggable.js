// ==========================================================================
// JS 模块 3: 物理桌面拖拽引擎 (DRAGGABLE.JS)
// ==========================================================================

function initDraggableSystem() {
    const draggables = document.querySelectorAll(".draggable-item");
    const surface = document.getElementById("counter-surface");

    draggables.forEach(el => {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        el.addEventListener("mousedown", (e) => {
            if (e.target.closest("button") || e.target.closest(".btn-return-doc")) {
                return;
            }

            isDragging = true;
            el.classList.add("is-dragging");
            highestZIndex += 1;
            el.style.zIndex = highestZIndex;

            const rect = el.getBoundingClientRect();
            const surfaceRect = surface.getBoundingClientRect();

            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left - surfaceRect.left;
            initialTop = rect.top - surfaceRect.top;

            el.style.left = `${initialLeft}px`;
            el.style.top = `${initialTop}px`;
            el.style.right = "auto";
            el.style.bottom = "auto";

            const onMouseMove = (moveEvent) => {
                if (!isDragging) return;
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                let nextLeft = initialLeft + dx;
                let nextTop = initialTop + dy;

                const maxLeft = surfaceRect.width - el.offsetWidth;
                const maxTop = surfaceRect.height - el.offsetHeight;
                nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
                nextTop = Math.max(0, Math.min(nextTop, maxTop));

                el.style.left = `${nextLeft}px`;
                el.style.top = `${nextTop}px`;
            };

            const onMouseUp = () => {
                isDragging = false;
                el.classList.remove("is-dragging");
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    });
}
