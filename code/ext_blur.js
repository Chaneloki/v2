/**
 * 試算表魔法冒險 v2 - 背景模糊擴展插件 (強化調試版)
 */
(function() {
    console.log("✨ [ext_blur.js] 背景模糊插件已啟動，等待 uiManager...");

    let _initRetries = 0;
    const initExtension = () => {
        if (!window.uiManager || !window.uiManager.updateVisuals) {
            // #19 最多重試 50 次（5 秒），避免無限輪詢
            if (++_initRetries < 50) setTimeout(initExtension, 100);
            else console.warn('[ext_blur.js] 超過最大等待次數，放棄初始化。');
            return;
        }

        const originalUpdateVisuals = window.uiManager.updateVisuals;

        window.uiManager.updateVisuals = function(line) {
            // 執行原始邏輯
            originalUpdateVisuals.call(this, line);

            const bgLayer = document.getElementById('story-bg-layer');
            if (bgLayer) {
                if (line.bgBlur !== undefined && line.bgBlur !== null) {
                    const blurValue = typeof line.bgBlur === 'number' ? `${line.bgBlur}px` : line.bgBlur;
                    bgLayer.style.filter = `blur(${blurValue})`;
                } else {
                    bgLayer.style.filter = 'none';
                }
            }
        };
        
        console.log("✅ [ext_blur.js] 模糊擴展已掛載至 uiManager.updateVisuals");
    };

    initExtension();
})();
