/**
 * UI_v2 - ui_v2_audio.js
 */

UIManager.prototype.playSFX = function(f) {
        console.log(`[UIManager] 嘗試播放 SFX: ${f}`);
        if (window.soundManager) window.soundManager.playSFX(`sound_effect/${f}`);
    }

UIManager.prototype.playBGM = function(f) {
        console.log(`[UIManager] 嘗試播放 BGM: ${f}`);
        let a = document.getElementById('bgm');
        if (!a) {
            console.error("[UIManager] 找不到 ID 為 'bgm' 的 audio 標籤");
            return;
        }
        
        const newSrc = `BGM/${f}`;
        const currentSrc = a.getAttribute('data-current');

        // 如果來源相同且正在播放，則跳過 (避免重啟)
        if (currentSrc === newSrc && !a.paused) {
            console.log(`[UIManager] BGM ${f} 已在播放中，跳過。`);
            return;
        }
        
        // 如果來源不同，則更新
        if (currentSrc !== newSrc) {
            a.src = newSrc;
            a.setAttribute('data-current', newSrc);
            a.volume = 0.3; // [修正]: 降低背景音樂音量，避免蓋過音效與對話
        }

        // 強制執行播放 (處理暫停或被阻擋的情況)
        a.play().then(() => {
            console.log(`[UIManager] 成功播放: ${newSrc}`);
        }).catch((e) => {
            console.warn(`[UIManager] BGM 播放被阻擋:`, e);
        });
    }

UIManager.prototype.fadeInBGM = function(f) {
        console.log(`[UIManager] 漸入 BGM: ${f}`);
        let a = document.getElementById('bgm');
        if (!a) return;
        
        a.volume = 0;
        const newSrc = `BGM/${f}`;
        if (a.getAttribute('data-current') !== newSrc) {
            a.src = newSrc;
            a.setAttribute('data-current', newSrc);
        }
        
        a.play().then(() => {
            let vol = 0;
            const targetVol = 0.3;
            if (this.bgmFadeInterval) clearInterval(this.bgmFadeInterval);
            this.bgmFadeInterval = setInterval(() => {
                vol += 0.05;
                if (vol >= targetVol) {
                    a.volume = targetVol;
                    clearInterval(this.bgmFadeInterval);
                } else {
                    a.volume = vol;
                }
            }, 200);
        }).catch(e => console.warn(`[UIManager] 漸入 BGM 失敗:`, e));
    }

UIManager.prototype.fadeOutBGM = function(f = null) {
        console.log(`[UIManager] 漸出 BGM`);
        let a = document.getElementById('bgm');
        if (!a) return;
        
        if (this.bgmFadeInterval) clearInterval(this.bgmFadeInterval);
        let vol = a.volume;
        this.bgmFadeInterval = setInterval(() => {
            vol -= 0.05;
            if (vol <= 0) {
                a.volume = 0;
                a.pause();
                a.setAttribute('data-current', '');
                clearInterval(this.bgmFadeInterval);
                if (f) this.playBGM(f); // 漸出後接著播新的
            } else {
                a.volume = vol;
            }
        }, 200);
    }

