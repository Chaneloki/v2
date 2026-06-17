/**
 * UI_v2 - ui_v2_story.js
 */

UIManager.prototype.handlePlayStory = function({ type, data, onComplete }) {
        // [關鍵優化]: 無論是 PHASE 還是 SEGMENT，讀檔時都恢復精確行號
        // 必須在覆寫 storyQueue 前比較，否則 isSameStory 永遠是 true (與自己比較)
        const isSameStory = (this.storyQueue === data);
        this.storyQueue = data;

        if (window.orchestrator._isLoadingFromSave) {
            this.currentStoryIndex = window.orchestrator.state.currentStoryIndex || 0;
            console.log(`🎬 [UIManager] 偵測到存檔斷點，恢復第 ${this.currentStoryIndex} 行`);
            
            // [新增]: 讀檔時必須向前掃描以恢復背景與環境
            this.syncVisualsToCurrentIndex();
        } else if (type === 'PHASE' && isSameStory && this.currentStoryIndex > 0 && window.orchestrator.state.currentStoryIndex > 0) {
            // [修復]: 僅 PHASE（全螢幕過場）才保留行號，SEGMENT（側欄提示/錯誤警告）每次都從頭播放
            console.warn(`🎬 [UIManager] 攔截重複播放觸發，保留目前行號: ${this.currentStoryIndex}`);
        } else {
            this.currentStoryIndex = 0;
            window.orchestrator.state.currentStoryIndex = 0;
        }

        this.currentStoryType = type; 
        this.onStorySegmentComplete = onComplete || null;
        
        const overlay = document.getElementById('story-overlay');
        const gameMain = document.getElementById('game-main');

        const startStoryPlay = () => {
            if (type === 'PHASE') {
                if (overlay) { overlay.style.display = 'flex'; overlay.style.opacity = '1'; }
            } else {
                if (overlay) overlay.style.display = 'none';
                if (gameMain) gameMain.classList.add('in-story'); // 觸發側邊欄暗淡模式
                const tt = document.getElementById('t-t');
                if (tt) tt.innerText = "📜 劇情進行中...";
                this.enableSidebarClick();
            }
            this.renderCurrentStoryLine();
        };

        // 僅針對全螢幕劇場 (PHASE) 進行精準載入過場，避免玩家等待
        if (type === 'PHASE') {
            this.showPreloader();
            this.preloadStoryAssets(data).then(() => {
                this.hidePreloader();
                startStoryPlay();
            });
        } else {
            startStoryPlay();
        }
    }

UIManager.prototype.syncVisualsToCurrentIndex = function() {
        if (this.currentStoryIndex <= 0) return;

        let lastBG = null;
        let lastBGM = null;
        let lastMemory = false;

        // 向前掃描到當前行
        for (let i = 0; i <= this.currentStoryIndex; i++) {
            const line = this.storyQueue[i];
            if (!line) continue;
            if (line.bg) lastBG = line.bg;
            if (line.bgm) lastBGM = line.bgm;
            if (line.isMemory !== undefined) lastMemory = line.isMemory;
        }

        // 應用背景
        if (lastBG) {
            const stage = document.getElementById('story-stage');
            if (stage) {
                const fullPath = (lastBG.includes('/')) ? lastBG : `BG/${lastBG}`;
                stage.style.backgroundImage = `url('${fullPath}')`;
                    
                    // [新增]: 像素世界掃描線與群像判定
                    if (lastBG.includes('pixel') || lastBG === 'cg/ch8_5_cg1.png') {
                        stage.classList.add('rpg-scanlines', 'rpg-ensemble');
                    } else if (lastBG !== 'black.png' && lastBG !== 'white.png' && !lastBG.includes('flash') && lastBG !== 'cg/ch8_5_cg1.png') {
                        stage.classList.remove('rpg-scanlines', 'rpg-ensemble');
                    }
                
                // 同時恢復回憶濾鏡
                if (lastMemory) stage.classList.add('memory-filter');
                else stage.classList.remove('memory-filter');
            }
        }

        // 應用音樂
        if (lastBGM) this.playBGM(lastBGM);
    }

UIManager.prototype.nextStoryLine = function() {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }

        this.currentStoryIndex++;
        // [關鍵]: 逐行更新存檔
        window.orchestrator.state.currentStoryIndex = this.currentStoryIndex;
        window.orchestrator.saveGame();
        
        this.renderCurrentStoryLine();
    }

UIManager.prototype.renderCurrentStoryLine = function() {
        if (this.currentStoryIndex >= this.storyQueue.length) {
            this.finishStoryGroup();
            return;
        }

        const line = this.storyQueue[this.currentStoryIndex];
        const state = window.orchestrator.state;
        
        const blinkTag = line.auto ? "" : "<span style='font-size:12px;color:#8b4513;float:right;animation:blink 1s infinite;margin-top:10px'>▼ CLICK</span>";

        // [新增]: 支援自訂腳本執行
        if (line.action) {
            try {
                eval(line.action);
            } catch(e) {
                console.error("Action execution failed:", e);
            }
        }

        if (this.currentStoryType === 'SEGMENT') {
            const eb = document.getElementById('elf-bubble'), pb = document.getElementById('player-box');
            const et = document.getElementById('e-t'), pt = document.getElementById('p-t');

            // [關鍵優化]: 互斥的發言狀態管理
            if (line.a === 'me') {
                // 玩家發言：高亮玩家盒，暗淡導師盒
                if (pb) pb.classList.add('speaking');
                if (eb) eb.classList.remove('speaking');
                if (pt) pt.innerHTML = this.highlightText(line.t) + blinkTag;
            } else {
                // 導師/NPC發言：高亮導師盒，暗淡玩家盒
                if (eb) eb.classList.add('speaking');
                if (pb) pb.classList.remove('speaking');
                if (et) et.innerHTML = `<strong>${line.n}：</strong><br>${this.highlightText(line.t)}${blinkTag}`;
            }
        } else {
            const sn = document.getElementById('s-name'), st = document.getElementById('s-text');
            if (sn) sn.innerText = line.n || "";
            if (st) st.innerHTML = this.highlightText(line.t);
            
            // [新增]: 處理信箋顯示
            if (line.letter) {
                this.showLetter();
            } else {
                this.hideLetter();
            }

            // [新增]: 處理賽爾留言條顯示
            if (line.note) {
                this.showNote(line.noteContent);
            } else {
                this.hideNote();
            }

            const sb = document.getElementById('dialogue-box');
            if (sb) {
                if (line.hideBox) {
                    sb.style.transition = 'opacity 0.2s';
                    sb.style.opacity = '0';
                    sb.style.pointerEvents = 'none';
                } else {
                    sb.style.transition = 'opacity 0.2s';
                    sb.style.opacity = '1';
                    sb.style.pointerEvents = 'auto';
                }
            }
        }

        this.updateVisuals(line);

        // [新增]: 處理自動推進劇情
        if (line.auto) {
            this.autoAdvanceTimer = setTimeout(() => this.nextStoryLine(), line.auto);
        }
    }

UIManager.prototype.showNote = function(content) {
        const modal = document.getElementById('note-modal');
        const ct = document.getElementById('note-content');
        if (modal && ct) {
            ct.innerHTML = this.highlightText(content || "");
            modal.style.display = 'flex';
            this.playSFX('success.mp3');
        }
    }

UIManager.prototype.hideNote = function() {
        const modal = document.getElementById('note-modal');
        if (modal) modal.style.display = 'none';
    }

UIManager.prototype.showLetter = function() {
        const modal = document.getElementById('letter-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('letter-modal-active'), 10);
            this.playSFX('success.mp3');
        }
    }

UIManager.prototype.hideLetter = function() {
        const modal = document.getElementById('letter-modal');
        if (modal) {
            modal.classList.remove('letter-modal-active');
            setTimeout(() => modal.style.display = 'none', 500);
        }
    }

UIManager.prototype.updateVisuals = function(line) {
        // v45 ID 對照表
        const charMap = { 
            'me': 'a-m', 
            'fairy': 'a-f', 
            'head': 'a-ma', 
            'system': 'a-b', 
            'glea': 'a-g', 
            'miro_tired': 'a-l', 
            'miro': 'a-l', 
            'npc1': 'a-g',
            'npc2': 'a-g',
            'lange': 'a-l',
            'chate': 'a-g',
            'royi': 'a-g',
            'prince': 'a-g',
            'king': 'a-l',
            'prince_back': 'a-ma',
            'unknown_figure': 'a-l',
            'me_rpg': 'a-m',
            'fairy_rpg': 'a-f',
            'glea_rpg': 'a-g',
            'miro_rpg': 'a-l',
            'chate_rpg': 'a-ma',
            'me_falling': 'a-f'
        };
        
        // #7 charAssets 按章節快取：章節不變時直接重用，避免每行劇本重建整個物件
        const _chap = window.orchestrator.state.currentChapter;
        if (!this._charAssets || this._charAssetChapter !== _chap) {
            this._charAssetChapter = _chap;
            this._charAssets = {
                'me': (_chap == 80 || _chap == 85) ? 'Charater/main palace.png' : `Charater/main ${window.orchestrator.state.playerConfig.gender}.png`,
                'fairy': 'Charater/fairy.png',
                'head': 'Charater/head.png',
                'system': 'Charater/魔導書.png',
                'glea': (_chap == 80 || _chap == 85) ? 'Charater/glea palace.png' : 'Charater/glea.png',
                'miro_tired': 'Charater/Miro tired.png',
                'miro': (_chap == 80 || _chap == 85) ? 'Charater/miro palace.png' : ((_chap >= 40) ? 'Charater/Miro new.png' : 'Charater/Miro.png'),
                'npc1': 'Charater/npc1.png',
                'npc2': 'Charater/npc2.png',
                'lange': 'Charater/lange.png',
                'chate': (_chap == 80 || _chap == 85) ? 'Charater/chate palace.png' : ((_chap >= 45) ? 'Charater/chate new.png' : 'Charater/chate.png'),
                'royi': (_chap == 75) ? 'Charater/royi easy.png' : ((_chap == 70 || _chap == 80) ? 'Charater/royi palace.png' : 'Charater/Royi.png'),
                'prince': (_chap == 85) ? 'Charater/prince serious.png' : ((_chap == 75) ? 'Charater/prince easy.png' : ((_chap == 70 || _chap == 80) ? 'Charater/prince1.png' : 'Charater/prince boy.png')),
                'king': 'Charater/king.png',
                'prince_back': 'Charater/main boy4 back.png',
                'unknown_figure': 'Charater/main boy3 back.png',
                'me_rpg': 'Charater/main rpg.png',
                'fairy_rpg': 'Charater/fairy rpg.png',
                'glea_rpg': 'Charater/glea rpg.png',
                'miro_rpg': 'Charater/miro rpg.png',
                'chate_rpg': 'Charater/chate rpg.png',
                'me_falling': 'Charater/me_falling.png'
            };
        }
        const charAssets = this._charAssets;

        const elfImg = document.getElementById('elf-img');

        // [新增]: 在 SEGMENT (側邊欄劇情) 模式下，若非玩家發言，則替換導師圖片
        if (this.currentStoryType === 'SEGMENT' && line.a !== 'me') {
            if (elfImg) {
                const newSrc = charAssets[line.a] || charAssets['fairy'];
                if (!elfImg.src.includes(newSrc)) {
                    elfImg.style.transition = 'opacity 0.2s';
                    elfImg.style.opacity = '0';
                    setTimeout(() => {
                        elfImg.src = newSrc;
                        elfImg.style.opacity = '1';
                    }, 200);
                }
                
                elfImg.classList.remove('char-bounce', 'char-sink', 'char-slideIn', 'char-dissolve', 'char-pixel-dissolve', 'char-shake');
                if (line.charAnim) {
                    // #9 rAF 雙幀替代 void offsetWidth，避免強制同步 reflow
                    const _anim = line.charAnim;
                    requestAnimationFrame(() => requestAnimationFrame(() => elfImg.classList.add(`char-${_anim}`)));
                }
            }
        }

        // 僅在全螢幕模式下更換大型立繪
        if (this.currentStoryType === 'PHASE') {
            // #8 快取 .char-img 列表，避免每行劇本重複 querySelectorAll
            if (!this._charImgEls || this._charImgEls.length === 0) {
                this._charImgEls = Array.from(document.querySelectorAll('.char-img'));
            }
            this._charImgEls.forEach(img => {
                img.classList.remove('char-active');
                img.classList.remove('fairy-appear', 'char-bounce', 'char-sink', 'char-slideIn', 'char-dissolve', 'char-pixel-dissolve', 'char-shake');
            });

            // [關鍵點]: 記錄並更新目前是否為 CG 模式
            if (line.bg) {
                this.isCurrentCG = line.bg.startsWith('cg/');
            }

            if ((!this.isCurrentCG || line.keepChar) && line.a !== 'system') {
                const targetImg = document.getElementById(charMap[line.a]);
                if (targetImg) {
                    const correctSrc = charAssets[line.a];
                    if (correctSrc && !targetImg.src.includes(correctSrc)) targetImg.src = correctSrc;
                    targetImg.classList.add('char-active');
                    
                    // [新增]: 像素人物待機動畫
                    if (line.a.endsWith('_rpg')) {
                        targetImg.classList.add('char-rpg-idle');
                    } else {
                        targetImg.classList.remove('char-rpg-idle');
                    }
                    
                    targetImg.classList.remove('char-bounce', 'char-sink', 'char-slideIn', 'char-dissolve', 'char-pixel-dissolve', 'char-shake');
                    if (line.charAnim) {
                        // Q3 rAF 雙幀取代 void offsetWidth
                        const _anim = line.charAnim;
                        requestAnimationFrame(() => requestAnimationFrame(() => targetImg.classList.add(`char-${_anim}`)));
                    }

                    // [修正]: 僅在第一章 (Ch1) 賽爾首次登場時播放音效
                    if (line.a === 'fairy' && !this.fairyAppeared) {
                        targetImg.classList.add('fairy-appear');
                        this.fairyAppeared = true;
                        
                        const state = window.orchestrator.state;
                        if (state.currentChapter.toString() === "10") {
                            this.playSFX('wow.mp3');
                        }
                    }
                }
            }

            if (line.bg) {
                const stage = document.getElementById('story-stage');
                if (stage) {
                    // [修正]: 如果路徑已經包含目錄(如 cg/)，則不重複加上 BG/
                    const fullPath = (line.bg.includes('/') ) ? line.bg : `BG/${line.bg}`;
                    stage.style.backgroundImage = `url('${fullPath}')`;
                    
                    // [新增]: 像素世界掃描線與群像判定
                    if (line.bg.includes('pixel') || line.bg === 'cg/ch8_5_cg1.png') {
                        stage.classList.add('rpg-scanlines', 'rpg-ensemble');
                    } else if (line.bg !== 'black.png' && line.bg !== 'white.png' && !line.bg.includes('flash') && line.bg !== 'cg/ch8_5_cg1.png') {
                        stage.classList.remove('rpg-scanlines', 'rpg-ensemble');
                    }
                    
                    // [新增]: 結局魔導書的墜落與神祕濾鏡延續
                    if (line.bg.includes('magic_book_glow.png')) {
                        stage.classList.add('bg-myst-falling');
                    } else {
                        stage.classList.remove('bg-myst-falling');
                    }
                }
            }

            // [新增功能]: 自動背景輪播 (Background Slideshow)
            if (line.bgSlideshow) {
                const newSlideshowStr = JSON.stringify(line.bgSlideshow);
                if (this.currentSlideshow !== newSlideshowStr) {
                    if (this.bgSlideshowInterval) clearInterval(this.bgSlideshowInterval);
                    this.currentSlideshow = newSlideshowStr;
                    let ssIdx = 0;
                    
                    // 立即觸發第一次背景
                    const setSlideBg = () => {
                        const nextBg = line.bgSlideshow[ssIdx];
                        const fp = (nextBg.includes('/')) ? nextBg : `BG/${nextBg}`;
                        const stg = document.getElementById('story-stage');
                        if (stg) {
                            // 放大背景以便進行平移，並套用連續向下平移的動畫，營造主角往下墜落的錯覺
                            stg.style.backgroundSize = '130%';
                            stg.classList.add('bg-falling-pan');
                            
                            // 加入黑色半透明漸層遮罩，讓畫面具有空虛、透明的回憶感
                            stg.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url('${fp}')`;
                            stg.classList.add('screen-flash');
                            setTimeout(() => stg.classList.remove('screen-flash'), 100);
                            if (window.orchestrator && window.orchestrator.audio) window.orchestrator.audio.playSFX('trans.mp3', 0.1);
                        }
                    };
                    
                    setSlideBg(); // 立即執行第一次

                    this.bgSlideshowInterval = setInterval(() => {
                        ssIdx = (ssIdx + 1) % line.bgSlideshow.length;
                        setSlideBg();
                    }, line.bgSlideDur || 3000);
                }
            } else {
                if (this.bgSlideshowInterval) { 
                    clearInterval(this.bgSlideshowInterval); 
                    this.bgSlideshowInterval = null; 
                    this.currentSlideshow = null; 
                    const stg = document.getElementById('story-stage');
                    if (stg) stg.classList.remove('bg-falling-pan');
                }
            }

            // [新增]: 處理背景/CG 的位移、縮放與鏡頭運動 (Sticky Camera Movement)
            const stage = document.getElementById('story-stage');
            if (stage) {
                const duration = line.bgDur || "0.5s";
                stage.style.transition = `background 0.5s ease-out, background-position ${duration} ease-in-out, background-size ${duration} ease-in-out`;

                // [優化]: 狀態持久化 (Sticky)
                // 只有在劇本中有明確定義時才更新位移與縮放，否則維持上一行的狀態
                if (line.bgPos) stage.style.backgroundPosition = line.bgPos;
                if (line.bgZoom) {
                    stage.style.backgroundSize = isNaN(line.bgZoom) ? line.bgZoom : `${line.bgZoom * 100}%`;
                }

                // 回憶濾鏡特效
                if (line.isMemory) {
                    stage.classList.add('memory-filter');
                } else {
                    stage.classList.remove('memory-filter');
                }
            }
            // [新增]: 處理物品/元素/道具 (Stuff/Elements)
            const stuffImg = document.getElementById('story-stuff');
            if (stuffImg) {
                if (line.stuff) {
                    // 如果路徑不含 /，預設指向 stuff/ 目錄 (根據用戶要求)
                    const stuffSrc = (line.stuff.includes('/')) ? line.stuff : `stuff/${line.stuff}`;
                    if (!stuffImg.src.includes(stuffSrc)) stuffImg.src = stuffSrc;
                    
                    // 處理位置與縮放
                    const stuffContainer = document.getElementById('stuff-container');
                    if (stuffContainer) {
                        stuffContainer.style.justifyContent = line.stuffPos === 'left' ? 'flex-start' : (line.stuffPos === 'right' ? 'flex-end' : 'center');
                        stuffContainer.style.alignItems = line.stuffVPos === 'top' ? 'flex-start' : (line.stuffVPos === 'bottom' ? 'flex-end' : 'center');
                        
                        // [優化]: 讓設定為 bottom 的物品能真正貼底
                        stuffContainer.style.padding = line.stuffVPos === 'bottom' ? "0" : "10%";
                    }
                    
                    const scale = line.stuffScale || 0.8;
                    const opacity = line.stuffOpacity !== undefined ? line.stuffOpacity : 1;
                    const dx = line.stuffX || "0px";
                    const dy = line.stuffY || "0px";
                    
                    stuffImg.style.transform = `scale(${scale}) translate(${dx}, ${dy})`;
                    stuffImg.style.opacity = opacity;
                } else {
                    stuffImg.style.opacity = '0';
                    stuffImg.style.transform = 'scale(0.8) translate(0px, 0px)';
                }
            }

            // [新增]: 處理環境大氣特效 (Environment Atmos)
            const envContainer = document.getElementById('env-container');
            const envImg = document.getElementById('story-env');
            if (envContainer && envImg) {
                // [優化]: 狀態持久化 (Sticky) - 僅在有定義時更新，設為 null 時停止
                if (line.env !== undefined) {
                    if (line.env) {
                        if (line.envFrames) {
                            // [新增]: 啟動序列幀動畫 (如 0.png, 1.png...)
                            this.startEnvAnimation(line.env, line.envFrames, line.envSpeed, line.envLoop);
                        } else {
                            // 靜態大氣圖
                            this.stopEnvAnimation();
                            const envSrc = (line.env.includes('/')) ? line.env : `stuff/${line.env}`;
                            if (!envImg.src.includes(envSrc)) envImg.src = envSrc;
                        }
                        
                        envContainer.style.transition = `opacity ${line.envDur || '1.5s'}`;
                        envContainer.style.opacity = line.envOpacity || "0.6";
                        
                        // 處理漂浮動畫
                        if (line.envDrift) {
                            envImg.classList.add('env-drift');
                        } else {
                            envImg.classList.remove('env-drift');
                        }
                    } else {
                        // 顯式設為 null，停止並隱藏
                        this.stopEnvAnimation();
                        envContainer.style.opacity = '0';
                    }
                }
            }

            // [新增]: 處理電影感閃光特效 (Flash Effect)
            if (line.flash) {
                let flashEl = document.getElementById('flash-overlay');
                if (!flashEl) {
                    flashEl = document.createElement('div');
                    flashEl.id = 'flash-overlay';
                    flashEl.className = 'flash-overlay';
                    document.body.appendChild(flashEl);
                }
                flashEl.classList.remove('flash-active');
                requestAnimationFrame(() => requestAnimationFrame(() => flashEl.classList.add('flash-active')));
                
                // 閃光通常伴隨震動音效 (可選)
                if (line.flashSFX) this.playSFX(line.flashSFX);
            }

            // [新增]: 處理電影感震動特效 (Shake Effect)
            if (line.shake) {
                const stage = document.getElementById('story-stage');
                if (stage) {
                    stage.classList.remove('shake-active');
                    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('shake-active')));
                }
            }
            
            // [新增]: 處理電影感畫面特效 (Screen Effect: glitch, heartbeat, dissolve, glow)
            if (line.screenEffect) {
                const stage = document.getElementById('story-stage');
                if (stage) {
                    stage.classList.remove('screen-glitch', 'screen-heartbeat', 'screen-dissolve', 'screen-glow', 'screen-reality-tear', 'screen-reality-tear-slow', 'screen-eye-open', 'screen-dissolve-to-light', 'screen-clear');
                    const _effect = line.screenEffect;
                    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add(`screen-${_effect}`)));
                }
            }
            
            // [新增]: 處理全屏白化擴散 (Whiteout)
            if (line.whiteout) {
                let whiteoutEl = document.getElementById('whiteout-overlay');
                if (!whiteoutEl) {
                    whiteoutEl = document.createElement('div');
                    whiteoutEl.id = 'whiteout-overlay';
                    whiteoutEl.className = 'whiteout-overlay';
                    document.body.appendChild(whiteoutEl);
                }
                whiteoutEl.classList.remove('whiteout-active');
                requestAnimationFrame(() => requestAnimationFrame(() => whiteoutEl.classList.add('whiteout-active')));
            }
            
            // [新增]: 清除全屏白化 (用於強烈轉場)
            if (line.clearWhiteout) {
                let whiteoutEl = document.getElementById('whiteout-overlay');
                if (whiteoutEl) {
                    whiteoutEl.classList.remove('whiteout-active');
                    whiteoutEl.style.opacity = '0';
                }
            }

            // [新增]: 處理獨立物品震動特效 (Stuff Shake Effect)
            if (line.stuffShake) {
                const stuffContainer = document.getElementById('stuff-container');
                if (stuffContainer) {
                    stuffContainer.classList.remove('shake-active');
                    requestAnimationFrame(() => requestAnimationFrame(() => stuffContainer.classList.add('shake-active')));
                }
            }
            }

            if (line.bgm === null) {
                let a = document.getElementById('bgm');
                if (a) {
                    a.pause();
                    a.setAttribute('data-current', '');
                }
            } else if (line.bgm) {
                if (line.bgmFade === "in") {
                    this.fadeInBGM(line.bgm);
                } else if (line.bgmFade === "out") {
                    this.fadeOutBGM(line.bgm);
                } else {
                    this.playBGM(line.bgm);
                }
            } else if (line.bgmFade === "out") {
                this.fadeOutBGM();
            }

        // --- [新增] 處理音效 (SE) 包含性別判定 ---
        if (line.se) {
            let sfxFile = line.se;
            const gender = window.orchestrator.state.playerConfig.gender || 'boy';
            
            // 將前綴 'me_' 替換為實際性別前綴 (如 'boy_' 或 'girl_')
            if (sfxFile.startsWith('me_')) {
                sfxFile = sfxFile.replace('me_', `${gender}_`);
            }
            
            this.playSFX(sfxFile, line.vol);
        }
    }

UIManager.prototype.enableSidebarClick = function() {
        const eb = document.getElementById('elf-bubble'), pb = document.getElementById('player-box');
        const nextHandler = (e) => {
            if (e) e.stopPropagation();
            this.nextStoryLine();
        };
        if (eb) { eb.style.cursor = 'pointer'; eb.onclick = nextHandler; }
        if (pb) { pb.style.cursor = 'pointer'; pb.onclick = nextHandler; }
    }

UIManager.prototype.disableSidebarClick = function() {
        const eb = document.getElementById('elf-bubble'), pb = document.getElementById('player-box');
        if (eb) { eb.style.cursor = 'default'; eb.onclick = null; }
        if (pb) { pb.style.cursor = 'default'; pb.onclick = null; }
    }

UIManager.prototype.finishStoryGroup = function() {
        this.disableSidebarClick();
        document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));

        const state = window.orchestrator.state;
        const type = this.currentStoryType;
        const cb = this.onStorySegmentComplete;

        this.currentStoryType = null;
        this.onStorySegmentComplete = null;

        if (type === 'SEGMENT') {
            this.hideOverlay();

            const elfImg = document.getElementById('elf-img');
            if (elfImg) {
                elfImg.style.transition = 'opacity 0.2s';
                elfImg.style.opacity = '0';
                setTimeout(() => {
                    elfImg.src = 'Charater/fairy.png';
                    elfImg.style.opacity = '1';
                }, 200);
            }

            state.activeStoryType = null;
            state.activeStoryKey = null;

            if (cb) cb();

            // [關鍵修正]: 僅在回調執行後沒有開啟新劇情的情況下，才更新導師 UI
            // 否則 updateTutorUI 會覆蓋掉新劇情的首行對話
            if (state.currentPhase === 'SIMULATOR' && !this.currentStoryType) {
                const task = state.activeChapterModule.simulator.tasks[state.currentTaskIndex];
                this.updateTutorUI(task);
            }
        } else {
            // PHASE 模式
            if (cb) {
                this.hideOverlay();
                cb();
                
                // [關鍵修正]: 同樣需要檢查是否有續接劇情
                if (state.currentPhase === 'SIMULATOR' && !this.currentStoryType) {
                    const task = state.activeChapterModule.simulator.tasks[state.currentTaskIndex];
                    this.updateTutorUI(task);
                }
            } else {
                // 這是章節整段的 PHASE (START/END)
                const et = document.getElementById('e-t'), pt = document.getElementById('p-t');
                if (et) et.innerHTML = "";
                if (pt) pt.innerHTML = "";
                window.orchestrator.next();
            }
        }
    }

UIManager.prototype.hideOverlay = function() { document.getElementById('story-overlay').style.display = 'none'; }


UIManager.prototype.updateTutorUI = function(task) {
        if (!task) return;
        this.isShowingEasterEgg = false; // [新增] 重置彩蛋狀態
        const et = document.getElementById('e-t'), tt = document.getElementById('t-t'), pt = document.getElementById('p-t');
        
        const fullHint = task.tutorHint || "";
        
        // 1. [主氣泡]: 顯示導師對話 (現在此為主要指令來源)
        if (et) {
            et.innerHTML = this.highlightText(fullHint);
            this._applySelectableKeywords(et, task);
        }

        // 2. [目標標籤]: 根據用戶建議，隱藏冗餘的紅字標籤
        if (tt) {
            tt.style.display = "none";
        }

        // 3. [主角氣泡]: 更新主角心聲
        if (pt && task.playerText) {
            pt.innerHTML = this.highlightText(task.playerText);
            this._applySelectableKeywords(pt, task);
        }

        // [新增]: 自動切換到對應的 Ribbon 分頁 (如 insert, data)
        if (task.tab && this.activeTab !== task.tab) {
            this.switchTab(task.tab);
        }

        // [新增]: 針對第 6 章持久化高亮 (確保任務切換或對話結束後依然存在)
        const state = window.orchestrator.state;
        if ((state.currentChapter == 60 || state.currentChapter == 65) && window.ch6Actions?._applyA1Highlight) {
            window.ch6Actions._applyA1Highlight();
        }
    }

// 根據任務條件，找出需要玩家精確輸入的關鍵字，在 DOM 中包裹 .kw-copy span 使其可選取複製
UIManager.prototype._applySelectableKeywords = function(el, task) {
    if (!el || !task) return;

    const keywords = new Set();

    // 來源一：expectedCondition（ch3 / ch3.5 搜尋類任務）
    const cond = task.expectedCondition;
    if (cond) {
        if (cond.type === 'SEARCH_VAL' && cond.value)         keywords.add(cond.value);
        if (cond.type === 'REPLACE_CHECK') {
            if (cond.oldVal) keywords.add(cond.oldVal);
            if (cond.newVal) keywords.add(cond.newVal);
        }
        if (cond.type === 'FUZZY_DONE_SIGNAL' && cond.pattern) keywords.add(cond.pattern);
    }

    // 來源二：tutorHint 內所有 [[公式|顏色]] 標記中的雙引號字串常數
    // 這裡的公式才是玩家需要參考輸入的，是最可靠的關鍵字來源
    const rawHint = task.tutorHint || '';
    (rawHint.match(/\[\[(.*?)\|.*?\]\]/g) || []).forEach(tag => {
        const formulaPart = tag.replace(/^\[\[/, '').replace(/\|[^\]]+\]\]$/, '');
        (formulaPart.match(/"([^"]+)"/g) || []).forEach(m => { const s = m.slice(1, -1); if (s) keywords.add(s); });
    });

    // 來源三：quiz 正確選項的公式字串常數（ch8.5 無 [[]] 標記，改從 quiz 提取）
    const correctOpt = task.quiz?.options?.find(o => o.correct);
    if (correctOpt) {
        (correctOpt.t.match(/"([^"]+)"/g) || []).forEach(m => { const s = m.slice(1, -1); if (s) keywords.add(s); });
    }

    if (keywords.size === 0) return;

    // 長字優先，避免短字先配對截斷長字（如「推薦」vs「不推薦」）
    const kwArray = Array.from(keywords).filter(k => k.length > 0).sort((a, b) => b.length - a.length);

    // 用 TreeWalker 掃描所有文字節點，找到關鍵字就插入 .kw-copy span
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const toProcess = [];
    let node;
    while ((node = walker.nextNode())) {
        if (kwArray.some(kw => node.textContent.includes(kw))) toProcess.push(node);
    }

    toProcess.forEach(textNode => {
        let remaining = textNode.textContent;
        const parent = textNode.parentNode;
        // 避免在已套用 .kw-copy 的節點內重複處理
        if (parent && parent.classList && parent.classList.contains('kw-copy')) return;

        const frag = document.createDocumentFragment();
        let changed = false;

        while (remaining.length > 0) {
            let earliest = -1, matchedKw = null;
            for (const kw of kwArray) {
                const idx = remaining.indexOf(kw);
                if (idx !== -1 && (earliest === -1 || idx < earliest)) {
                    earliest = idx;
                    matchedKw = kw;
                }
            }
            if (matchedKw === null) { frag.appendChild(document.createTextNode(remaining)); break; }
            if (earliest > 0)       frag.appendChild(document.createTextNode(remaining.slice(0, earliest)));
            const span = document.createElement('span');
            span.className = 'kw-copy';
            span.textContent = matchedKw;
            frag.appendChild(span);
            remaining = remaining.slice(earliest + matchedKw.length);
            changed = true;
        }

        if (changed) parent.replaceChild(frag, textNode);
    });
};

UIManager.prototype.showEasterEgg = function(role) {
        const eggs = {
            fairy: [
                "別直盯著我瞧，快去算賬！",
                "本仙子今天的翅膀也閃閃發亮呢！",
                "這招『自動填滿』可是我研究了三百年的禁術！",
                "哎呀！你點到我的隱形魔杖了。",
                "如果你能一秒做完這張表，我就告訴你一個祕密。",
                "Excel 的靈魂不在滑鼠，在你的手指（快捷鍵）！",
                "剛才……是不是有一格數據跳了一下？"
            ],
            me: [
                "（這支分叉毛筆到底能不能用啊……）",
                "（等這份工打完，我一定要去喝杯最貴的麥酒。）",
                "（賽爾這傢伙，總是坐在我肩膀上偷懶。）",
                "（這表頭怎麼比龍鱗還硬，凍結不動？）",
                "（剛才那格數據……是我的幻覺嗎？）",
                "（我真的能在沙漏漏完前對齊所有格子嗎？）"
            ]
        };

        const pool = eggs[role];
        const randomLine = pool[Math.floor(Math.random() * pool.length)];
        
        if (role === 'fairy') {
            const et = document.getElementById('e-t');
            const hint = "<br><span style='font-size:10px; color:#666; font-style:italic'>(點擊氣泡回到任務)</span>";
            if (et) et.innerHTML = `<strong>賽爾：</strong><br>${randomLine}${hint}`;
            this.playSFX('wow.mp3');
            this.isShowingEasterEgg = true;
        } else {
            const pt = document.getElementById('p-t');
            if (pt) pt.innerHTML = `「${randomLine}」`;
        }
    }

UIManager.prototype.highlightText = function(txt) { 
        if (window.textHighlighter) return window.textHighlighter.highlight(txt);
        // [優化]: 支援更多樣式標籤 (strike, black)
        return (txt || "").replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, content, style) => {
            if (style === 'strike') return `<span class="hl-strike">${content}</span>`;
            if (style === 'black') return `<span class="hl-black">${content}</span>`;
            return `<span class="hl-${style}">${content}</span>`;
        });
    }

UIManager.prototype.skipStory = function() { this.currentStoryIndex = this.storyQueue.length; this.finishStoryGroup(); }


UIManager.prototype.startEnvAnimation = function(folder, totalFrames, speed, loop = true) {
        if (this.currentEnvFolder === folder) return; // 避免重複啟動相同動畫
        
        this.stopEnvAnimation();
        this.currentEnvFolder = folder;
        
        const envImg = document.getElementById('story-env');
        if (!envImg) return;

        let frame = 0;
        // [關鍵修復]: 立刻顯示第一幀，避免因 interval 導致的延遲與空白
        envImg.src = `stuff/${folder}/${frame}.png`;
        frame++;

        if (totalFrames <= 1) return;

        this.envAnimInterval = setInterval(() => {
            if (frame >= totalFrames) {
                // 支援 boolean 的 false 與字串的 "false"
                if (String(loop) === "false") {
                    clearInterval(this.envAnimInterval);
                    this.envAnimInterval = null;
                    return;
                }
                frame = 0; // 若非單次播放，則循環重置為 0
            }
            envImg.src = `stuff/${folder}/${frame}.png`;
            frame++;
        }, speed || 100);
    }

UIManager.prototype.stopEnvAnimation = function() {
        if (this.envAnimInterval) {
            clearInterval(this.envAnimInterval);
            this.envAnimInterval = null;
        }
        this.currentEnvFolder = null;
    }

// ==========================================
// [新增]: 劇情精準預載機制 (Pre-story Preloader)
// ==========================================
UIManager.prototype.showPreloader = function() {
    let preloader = document.getElementById('story-preloader');
    if (!preloader) {
        preloader = document.createElement('div');
        preloader.id = 'story-preloader';
        preloader.style.cssText = `
            position: fixed;
            inset: 0;
            background: radial-gradient(circle, #150f0c 0%, #080504 100%);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ffd700;
            opacity: 0;
            transition: opacity 0.5s ease;
            pointer-events: all;
            font-family: "Microsoft JhengHei", serif;
        `;
        preloader.innerHTML = `
            <div class="magic-loader-ring" style="
                width: 80px;
                height: 80px;
                border: 4px solid rgba(33, 115, 70, 0.2);
                border-top: 4px solid #217346;
                border-bottom: 4px solid #ffd700;
                border-radius: 50%;
                animation: rotatePreloader 1.5s linear infinite;
                margin-bottom: 20px;
                box-shadow: 0 0 25px rgba(33, 115, 70, 0.5);
            "></div>
            <div style="font-size: 1.6em; text-shadow: 0 0 15px rgba(255, 215, 0, 0.6); margin-bottom: 10px; letter-spacing: 3px; font-weight: bold;">正在吟唱載入魔法...</div>
            <div style="font-size: 0.95em; color: rgba(255, 255, 255, 0.75); letter-spacing: 1px;" id="story-preloader-text">正在翻閱試算表魔導書...</div>
        `;
        document.body.appendChild(preloader);
        
        // 注入專屬的旋轉動畫樣式
        if (!document.getElementById('preloader-style')) {
            const style = document.createElement('style');
            style.id = 'preloader-style';
            style.innerHTML = `
                @keyframes rotatePreloader {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    preloader.style.display = 'flex';
    // Q3 rAF 雙幀取代 void offsetWidth
    requestAnimationFrame(() => requestAnimationFrame(() => { preloader.style.opacity = '1'; }));
};

UIManager.prototype.hidePreloader = function() {
    const preloader = document.getElementById('story-preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
};

UIManager.prototype.preloadStoryAssets = function(storyQueue) {
    return new Promise((resolve) => {
        if (!storyQueue || storyQueue.length === 0) {
            resolve();
            return;
        }

        const charAssets = {
            'me': (window.orchestrator.state.currentChapter == 80 || window.orchestrator.state.currentChapter == 85) ? 'Charater/main palace.png' : `Charater/main ${window.orchestrator.state.playerConfig.gender}.png`,
            'fairy': 'Charater/fairy.png',
            'head': 'Charater/head.png',
            'system': 'Charater/魔導書.png',
            'glea': (window.orchestrator.state.currentChapter == 80 || window.orchestrator.state.currentChapter == 85) ? 'Charater/glea palace.png' : 'Charater/glea.png',
            'miro_tired': 'Charater/Miro tired.png',
            'miro': (window.orchestrator.state.currentChapter == 80 || window.orchestrator.state.currentChapter == 85) ? 'Charater/miro palace.png' : ((window.orchestrator.state.currentChapter >= 40) ? 'Charater/Miro new.png' : 'Charater/Miro.png'),
            'npc1': 'Charater/npc1.png',
            'npc2': 'Charater/npc2.png',
            'lange': 'Charater/lange.png',
            'chate': (window.orchestrator.state.currentChapter == 80 || window.orchestrator.state.currentChapter == 85) ? 'Charater/chate palace.png' : ((window.orchestrator.state.currentChapter >= 45) ? 'Charater/chate new.png' : 'Charater/chate.png'),
            'royi': (window.orchestrator.state.currentChapter == 75) ? 'Charater/royi easy.png' : ((window.orchestrator.state.currentChapter == 70 || window.orchestrator.state.currentChapter == 80) ? 'Charater/royi palace.png' : 'Charater/Royi.png'),
            'prince': (window.orchestrator.state.currentChapter == 85) ? 'Charater/prince serious.png' : ((window.orchestrator.state.currentChapter == 75) ? 'Charater/prince easy.png' : ((window.orchestrator.state.currentChapter == 70 || window.orchestrator.state.currentChapter == 80) ? 'Charater/prince1.png' : 'Charater/prince boy.png')),
            'king': 'Charater/king.png',
            'prince_back': 'Charater/main boy4 back.png',
            'unknown_figure': 'Charater/main boy3 back.png',
            'me_rpg': 'Charater/main rpg.png',
            'fairy_rpg': 'Charater/fairy rpg.png',
            'glea_rpg': 'Charater/glea rpg.png',
            'miro_rpg': 'Charater/miro rpg.png',
            'chate_rpg': 'Charater/chate rpg.png',
            'me_falling': 'Charater/me_falling.png'
        };

        const imageURLs = new Set();
        const audioURLs = new Set();

        storyQueue.forEach(line => {
            if (line.bg) {
                const fullPath = line.bg.includes('/') ? line.bg : `BG/${line.bg}`;
                imageURLs.add(fullPath);
            }
            if (line.bgm) {
                audioURLs.add(`BGM/${line.bgm}`);
            }
            if (line.se) {
                let sfxFile = line.se;
                const gender = window.orchestrator.state.playerConfig.gender || 'boy';
                if (sfxFile.startsWith('me_')) {
                    sfxFile = sfxFile.replace('me_', `${gender}_`);
                }
                audioURLs.add(`sound_effect/${sfxFile}`);
            }
            if (line.a && charAssets[line.a]) {
                imageURLs.add(charAssets[line.a]);
            }
            if (line.bgSlideshow) {
                line.bgSlideshow.forEach(bg => {
                    const fullPath = bg.includes('/') ? bg : `BG/${bg}`;
                    imageURLs.add(fullPath);
                });
            }
            if (line.env) {
                const envSrc = line.env.includes('/') ? line.env : `stuff/${line.env}`;
                imageURLs.add(envSrc);
            }
        });

        const total = imageURLs.size + audioURLs.size;
        let loaded = 0;

        const updateProgress = () => {
            const el = document.getElementById('story-preloader-text');
            if (el) el.innerText = `正在注入試算表魔力... (${loaded}/${total})`;
        };

        if (total === 0) {
            resolve();
            return;
        }

        const promises = [];

        imageURLs.forEach(url => {
            promises.push(new Promise((res) => {
                const img = new Image();
                img.onload = () => { loaded++; updateProgress(); res(); };
                img.onerror = () => { loaded++; updateProgress(); res(); };
                img.src = url;
            }));
        });

        audioURLs.forEach(url => {
            promises.push(new Promise((res) => {
                const audio = new Audio();
                audio.oncanplaythrough = () => {
                    audio.src = ''; // #20 預載完成後釋放資源，防止記憶體洩漏
                    loaded++; updateProgress(); res();
                };
                audio.onerror = () => { loaded++; updateProgress(); res(); };
                audio.src = url;
                audio.preload = 'auto';
            }));
        });

        // 5 秒安全閥，超時自動跳過以防遊戲死鎖
        const timeoutPromise = new Promise((res) => setTimeout(res, 5000));

        Promise.race([
            Promise.all(promises),
            timeoutPromise
        ]).then(() => {
            resolve();
        });
    });
};

