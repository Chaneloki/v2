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

            const blurLayer = document.getElementById('story-bg-blur');
            if (blurLayer) {
                if (line.bgBlur !== undefined && line.bgBlur !== null) {
                    // [Fix 2026-06-19] backdrop-filter 是手機 GPU 最貴的操作之一，手機模式下略過
                    if (localStorage.getItem('v2_device_mode') !== 'mobile') {
                        const blurValue = typeof line.bgBlur === 'number' ? `${line.bgBlur}px` : line.bgBlur;
                        blurLayer.style.backdropFilter = `blur(${blurValue})`;
                        blurLayer.style.webkitBackdropFilter = `blur(${blurValue})`;
                    }
                } else {
                    /* [修復 2026-06-24]: 移除 isMemory 自動延續模糊的全局邏輯。
                       原本「回憶模式且本行未指定 bgBlur」會直接保留上一行的模糊值，
                       導致角色立繪在沒有明確設定的行也被模糊/抖動，且效果完全
                       取決於前面哪一行設了 bgBlur，難以從章節腳本預期行為。
                       改為：每一行沒寫 bgBlur 就一律清除，模糊完全由 chapter/*.js
                       逐行的 bgBlur 欄位控制。 */
                    blurLayer.style.backdropFilter = 'blur(0px)';
                    blurLayer.style.webkitBackdropFilter = 'blur(0px)';
                }
            }
        };
        
        console.log("✅ [ext_blur.js] 模糊擴展已掛載至 uiManager.updateVisuals");
    };

    initExtension();
})();
