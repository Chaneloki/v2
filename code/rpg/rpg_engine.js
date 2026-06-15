/**
 * 試算表魔法冒險 v2 - RPG 引擎模組
 * 負責渲染地圖、處理人物行走、碰撞判定與 POI 互動。
 */
class RPGEngine {
    constructor() {
        this.isActive = false;
        this.currentMapId = null;
        this.mapData = null;
        this.showDebug = true; // [新增]: 預設開啟除錯紅色區塊顯示
        
        this.state = {
            x: 0, y: 0,
            speed: 5,
            keys: {},
            activePoi: null,
            inDialog: false,
            facing: 'down',
            step: 'left',
            stepCounter: 0
        };

        this.animationFrameId = null;
        
        // 綁定 DOM
        this.container = null;
        this.worldEl = null;
        this.playerEl = null;
        this.hintEl = null;
        this.dialogEl = null;
        this.dTitle = null;
        this.dText = null;
        
        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            this.state.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 'Enter') {
                if (this.state.inDialog) {
                    if (this.sequenceQueue && this.sequenceIndex < this.sequenceQueue.length - 1) {
                        this.sequenceIndex++;
                        this.renderSequenceLine();
                    } else {
                        // 最後一句或無 sequence 時：統一走 onComplete 路徑
                        this.sequenceQueue = null;
                        this.state.inDialog = false;
                        this.dialogEl.style.display = 'none';
                        this.resetSceneOverlay();
                        if (this.sequenceOnComplete) {
                            const cb = this.sequenceOnComplete;
                            this.sequenceOnComplete = null;
                            cb();
                        }
                    }
                } else if (this.state.activePoi) {
                    this.interactWith(this.state.activePoi);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.switchAvatar();
            } else if (e.key === 'F9' && !this.state.inDialog) {
                e.preventDefault();
                this.toggleDebug();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.isActive) return;
            this.state.keys[e.key.toLowerCase()] = false;
        });
    }

    switchAvatar() {
        if (!window.orchestrator) return;
        const state = window.orchestrator.state;
        const avatars = state.unlockedAvatars || ['main'];
        if (avatars.length <= 1) return;
        
        const currentIdx = avatars.indexOf(state.currentAvatar || 'main');
        const nextIdx = (currentIdx + 1) % avatars.length;
        state.currentAvatar = avatars[nextIdx];
        window.orchestrator.saveGame();
        
        if (this.hintEl) {
            this.hintEl.innerText = `🔄 已切換角色`;
            this.hintEl.style.display = 'block';
            setTimeout(() => { if (!this.state.activePoi) this.hintEl.style.display = 'none'; }, 2000);
        }
    }

    initDOM() {
        if (this.container) return; // 已初始化
        this.container = document.getElementById('rpg-container');
        this.worldEl = document.getElementById('rpg-world');
        this.playerEl = document.getElementById('rpg-player');
        this.hintEl = document.getElementById('rpg-action-hint');
        this.dialogEl = document.getElementById('rpg-dialog-box');
        this.dTitle = document.getElementById('rpg-dialog-title');
        this.dText = document.getElementById('rpg-dialog-text');
        this.dAvatar = document.getElementById('rpg-dialog-avatar');
    }

    start(mapId = "my_room") {
        this.stop(); // [性能優化]: 確保不會啟動多重遊戲迴圈導致嚴重卡頓
        this.initDOM();
        if (!window.RPG_MAPS || !window.RPG_MAPS[mapId]) {
            console.error(`找不到地圖: ${mapId}`);
            return;
        }
        
        // 1. 先顯示黑色遮罩並拉高層級，覆蓋未載入的地圖
        const overlayLayer = document.getElementById('rpg-overlay-layer');
        if (overlayLayer) {
            overlayLayer.style.opacity = '1';
            overlayLayer.style.zIndex = '999';
        }
        
        // 顯示 UI
        document.getElementById('story-overlay').style.display = 'none';
        document.getElementById('game-main').style.display = 'none';
        this.container.style.display = 'flex';
        this.container.style.opacity = '1';
        
        // 2. 預載入地圖資源
        const mapData = window.RPG_MAPS[mapId];
        this.preloadMapAssets(mapData).then(() => {
            this.loadMap(mapId);
            
            // 3. 淡出畫面並重置 zIndex
            if (overlayLayer) {
                overlayLayer.style.transition = 'opacity 0.5s ease';
                overlayLayer.style.opacity = '0';
                setTimeout(() => { overlayLayer.style.zIndex = '20'; }, 500);
            }
            
            // 啟動遊戲迴圈
            this.isActive = true;
            this.gameLoop();
        });
    }

    loadMap(mapId, spawnX, spawnY) {
        if (!window.RPG_MAPS || !window.RPG_MAPS[mapId]) {
            console.error(`找不到地圖: ${mapId}`);
            return;
        }
        
        this.currentMapId = mapId;
        this.mapData = window.RPG_MAPS[mapId];
        
        // 1. 設定玩家初始位置
        this.state.x = spawnX !== undefined ? spawnX : this.mapData.spawnPoint.x;
        this.state.y = spawnY !== undefined ? spawnY : this.mapData.spawnPoint.y;
        this.state.facing = 'down';
        this.state.keys = {};
        this.state.inDialog = false;
        this.state.activePoi = null;
        if (this.hintEl) {
            this.hintEl.style.display = 'none';
        }

        // 2. 構建地圖 DOM
        this.buildMap();
        
        // 3. 播放背景音樂
        if (this.mapData.bgm && window.orchestrator) {
            window.orchestrator.emit('playBGM', { file: this.mapData.bgm });
        }
        
        // 紀錄目前地圖到 orchestrator 以便存檔
        if (window.orchestrator) {
            window.orchestrator.state.rpgMapId = mapId;
            window.orchestrator.state.rpgX = this.state.x;
            window.orchestrator.state.rpgY = this.state.y;
        }
    }

    stop() {
        this.isActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null; // [性能優化]: 清除參照
        }
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    buildMap() {
        this.worldEl.innerHTML = '';
        this.worldEl.style.width = `${this.mapData.width}px`;
        this.worldEl.style.height = `${this.mapData.height}px`;
        this.worldEl.style.backgroundImage = `url('${this.mapData.bg}')`;
        this.worldEl.style.backgroundSize = '100% 100%';
        this.worldEl.style.backgroundRepeat = 'no-repeat';

        // 生成 POI
        if (this.mapData.pois) {
            this.mapData.pois.forEach(poi => {
                const el = document.createElement('div');
                el.className = 'rpg-poi';
                el.id = `poi-${poi.id}`;
                el.style.left = `${poi.x}px`;
                el.style.top = `${poi.y}px`;
                el.style.width = `${poi.w}px`;
                el.style.height = `${poi.h}px`;
                
                // [優化]: 以 span.rpg-poi-icon 包裹圖示以利於獨立隱藏
                el.innerHTML = `<span class="rpg-poi-icon">${poi.icon}</span><div class="rpg-poi-label">${poi.name}</div>`;
                
                // [優化]: 根據目前除錯狀態設定 POI 輔助框與 Emoji 顯示
                if (!this.showDebug) {
                    el.style.background = 'transparent';
                    el.style.border = 'none';
                    el.style.boxShadow = 'none';
                    const label = el.querySelector('.rpg-poi-label');
                    if (label) label.style.display = 'none';
                    const icon = el.querySelector('.rpg-poi-icon');
                    if (icon) icon.style.display = 'none';
                }
                
                // 將資料綁定到元素上，方便迴圈讀取
                el._poiData = poi;
                this.worldEl.appendChild(el);
            });
        }

        // 生成獨立精靈圖 (例如 NPC，不受 POI 隱藏影響)
        if (this.mapData.sprites) {
            this.mapData.sprites.forEach(sprite => {
                const el = document.createElement('img');
                el.src = sprite.img;
                el.style.position = 'absolute';
                el.style.left = `${sprite.x}px`;
                el.style.top = `${sprite.y}px`;
                if (sprite.w) el.style.width = `${sprite.w}px`;
                if (sprite.h) el.style.height = `${sprite.h}px`;
                el.style.pointerEvents = 'none'; // 讓滑鼠可以穿透，不影響 POI 互動
                this.worldEl.appendChild(el);
            });
        }

        // 🐛 DEBUG 模式：生成除錯用的空氣牆視覺化 (半透明紅色)
        // 調整完畢後可以將這段註解或刪除
        if (this.mapData.walls) {
            this.mapData.walls.forEach(wall => {
                const el = document.createElement('div');
                el.className = 'rpg-debug-wall'; // [新增]: 加入類別方便一鍵隱藏/顯示
                el.style.position = 'absolute';
                el.style.left = `${wall.x}px`;
                el.style.top = `${wall.y}px`;
                el.style.width = `${wall.w}px`;
                el.style.height = `${wall.h}px`;
                el.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; // 半透明紅色
                el.style.border = '2px dashed red';
                el.style.pointerEvents = 'none'; // 讓滑鼠可以穿透
                el.style.zIndex = '4000'; // 確保顯示在背景之上
                el.style.display = this.showDebug ? 'block' : 'none'; // 依狀態顯示
                
                // 顯示牆壁的 ID 名稱，方便除錯
                el.innerHTML = `<div style="color:white; font-size:16px; font-weight:bold; padding:2px; text-shadow: 1px 1px 2px black;">${wall.id}</div>`;
                this.worldEl.appendChild(el);
            });
        }
    }

    gameLoop() {
        if (!this.isActive) return;

        if (!this.state.inDialog) {
            this.updateMovement();
            this.updateCamera();
            this.checkCollisions();
            
            // [新增] 更新 Debug 資訊
            const coordsEl = document.getElementById('rpg-debug-coords');
            if (coordsEl) coordsEl.innerText = `X: ${Math.round(this.state.x)} | Y: ${Math.round(this.state.y)}`;
            
            const poiEl = document.getElementById('rpg-debug-poi');
            if (poiEl) poiEl.innerText = `Active POI: ${this.state.activePoi ? this.state.activePoi.name : 'None'}`;
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    updateMovement() {
        let dx = 0;
        let dy = 0;
        let isMoving = false;
        
        if (this.state.keys['w'] || this.state.keys['arrowup']) { dy -= this.state.speed; this.state.facing = 'up'; isMoving = true; }
        else if (this.state.keys['s'] || this.state.keys['arrowdown']) { dy += this.state.speed; this.state.facing = 'down'; isMoving = true; }
        
        if (this.state.keys['a'] || this.state.keys['arrowleft']) { dx -= this.state.speed; this.state.facing = 'left'; isMoving = true; }
        else if (this.state.keys['d'] || this.state.keys['arrowright']) { dx += this.state.speed; this.state.facing = 'right'; isMoving = true; }

        // 處理腳步動畫
        if (isMoving) {
            this.state.stepCounter++;
            if (this.state.stepCounter > 10) {
                this.state.step = (this.state.step === 'left') ? 'right' : 'left';
                this.state.stepCounter = 0;
            }
        } else {
            this.state.step = 'left';
            this.state.stepCounter = 0;
        }

        const avatar = window.orchestrator?.state?.currentAvatar || 'main';
        this.playerEl.style.backgroundImage = `url('rpg/charater/${avatar} ${this.state.facing} ${this.state.step}.png')`;

        let nextX = this.state.x + dx;
        let nextY = this.state.y + dy;
        
        let canMoveX = true;
        let canMoveY = true;
        
        // 碰撞檢測 (只判斷腳部)
        const pHitWidth = 20;
        const pHitHeight = 25;
        const pOffsetTop = 60;

        // 緊急救援：如果玩家目前的位置已經卡在牆壁裡（通常是因為舊存檔座標錯誤），則直接傳送回出生點
        let isStuck = false;
        if (this.mapData.walls) {
            this.mapData.walls.forEach(w => {
                const wRect = { left: w.x, right: w.x + w.w, top: w.y, bottom: w.y + w.h };
                const curRect = { 
                    left: this.state.x - pHitWidth, right: this.state.x + pHitWidth, 
                    top: this.state.y + pOffsetTop - pHitHeight, bottom: this.state.y + pOffsetTop + pHitHeight 
                };
                if (curRect.right > wRect.left && curRect.left < wRect.right && curRect.bottom > wRect.top && curRect.top < wRect.bottom) {
                    isStuck = true;
                }
            });
        }
        if (isStuck && this.mapData.spawnPoint) {
            console.warn("Player is stuck inside a wall! Emergency rescuing to spawn point...");
            this.state.x = this.mapData.spawnPoint.x;
            this.state.y = this.mapData.spawnPoint.y;
            nextX = this.state.x + dx;
            nextY = this.state.y + dy;
        }

        if (this.mapData.walls) {
            this.mapData.walls.forEach(w => {
                const wRect = { left: w.x, right: w.x + w.w, top: w.y, bottom: w.y + w.h };
                
                const pRectX = { 
                    left: nextX - pHitWidth, right: nextX + pHitWidth, 
                    top: this.state.y + pOffsetTop - pHitHeight, bottom: this.state.y + pOffsetTop + pHitHeight 
                };
                if (pRectX.right > wRect.left && pRectX.left < wRect.right && pRectX.bottom > wRect.top && pRectX.top < wRect.bottom) {
                    canMoveX = false;
                }
                
                const pRectY = { 
                    left: this.state.x - pHitWidth, right: this.state.x + pHitWidth, 
                    top: nextY + pOffsetTop - pHitHeight, bottom: nextY + pOffsetTop + pHitHeight 
                };
                if (pRectY.right > wRect.left && pRectY.left < wRect.right && pRectY.bottom > wRect.top && pRectY.top < wRect.bottom) {
                    canMoveY = false;
                }
            });
        }

        if (canMoveX) this.state.x = nextX;
        if (canMoveY) this.state.y = nextY;

        // 地圖邊界
        const margin = 40;
        if (this.state.x < margin) this.state.x = margin;
        if (this.state.y < margin) this.state.y = margin;
        if (this.state.x > this.mapData.width - margin) this.state.x = this.mapData.width - margin;
        if (this.state.y > this.mapData.height - margin) this.state.y = this.mapData.height - margin;
    }

    updateCamera() {
        const viewport = document.getElementById('rpg-container');
        const vw = viewport ? viewport.clientWidth : 816;
        const vh = viewport ? viewport.clientHeight : 624;
        
        let cx = (vw / 2) - this.state.x;
        let cy = (vh / 2) - this.state.y;

        if (cx > 0) cx = 0;
        if (cx < vw - this.mapData.width) cx = vw - this.mapData.width;
        if (cy > 0) cy = 0;
        if (cy < vh - this.mapData.height) cy = vh - this.mapData.height;

        // 如果地圖比視窗小，將地圖置中
        if (this.mapData.width < vw) {
            cx = (vw - this.mapData.width) / 2;
        }
        if (this.mapData.height < vh) {
            cy = (vh - this.mapData.height) / 2;
        }

        this.worldEl.style.transform = `translate(${cx}px, ${cy}px)`;

        // 修正視覺偏移，讓 sprite 完美對齊碰撞框
        // 碰撞框的 bottom 是 y + 85。div 寬高是 120x120
        let px = this.state.x + cx - 60; 
        let py = this.state.y + cy - 35; 
        this.playerEl.style.left = `${px}px`;
        this.playerEl.style.top = `${py}px`;
    }

    checkCollisions() {
        let touched = null;
        const pRect = { left: this.state.x - 75, right: this.state.x + 75, top: this.state.y - 75, bottom: this.state.y + 75 };
        const hitZone = 30;

        const poiEls = this.worldEl.querySelectorAll('.rpg-poi');
        poiEls.forEach(el => {
            const poi = el._poiData;
            const rRect = { left: poi.x, right: poi.x + poi.w, top: poi.y, bottom: poi.y + poi.h };
            
            if (pRect.right > rRect.left - hitZone && pRect.left < rRect.right + hitZone &&
                pRect.bottom > rRect.top - hitZone && pRect.top < rRect.bottom + hitZone) {
                touched = poi;
            }
        });

        if (touched) {
            if (this.state.activePoi?.id !== touched.id) {
                this.hintEl.style.display = 'block';
                this.hintEl.innerText = `按 [Enter] 調查：${touched.name}`;
                this.state.activePoi = touched;
            }
        } else {
            if (this.state.activePoi) {
                this.hintEl.style.display = 'none';
                this.state.activePoi = null;
            }
        }
    }

    interactWith(poi) {
        if (poi.mission && window.missionEngine?.tryInteract(poi)) return;

        const state = window.orchestrator?.state || {};
        const isFreeMode = state.currentChapter === '85' || state.currentChapter === 85;

        // 自由模式與章節間的房間限制
        if (poi.id === "exit_room") {
            if (!isFreeMode) {
                this.state.inDialog = true;
                this.hintEl.style.display = 'none';
                this.dialogEl.style.display = 'block';
                if(this.dAvatar) { this.dAvatar.style.display = 'none'; }
                this.dTitle.innerText = `◆ 離開房間`;
                
                let msg = "現在時間不早了，還是先休息吧。";
                switch(String(state.currentChapter)) {
                    case "15": msg = "明天還得應付米羅那傢伙的「美學要求」，不早點睡可不行..."; break; // 剛打完 Ch1
                    case "20": msg = "賽爾說得對，明天開始就要踏上旅程了，得養足精神。"; break; // 剛打完 Ch1.5
                    case "25": msg = "蘭奇的魔藥庫存問題總算解決了，今天真是累壞了，快點上床睡覺吧。"; break; // 剛打完 Ch2
                    case "30": msg = "金幣的計算告一段落，但明天可能會有更難的挑戰，必須好好休息。"; break; // 剛打完 Ch2.5
                    case "35": msg = "圖書館裡的規則真複雜... 明天還得繼續研究魔導書呢。"; break; // 剛打完 Ch3
                    case "40": msg = "收到那封信後，心裡總覺得毛毛的... 算了，先睡覺再說。"; break; // 剛打完 Ch3.5
                    case "45": msg = "今天在村莊外遇到那些傢伙真驚險... 明天得更小心點。"; break; // 剛打完 Ch4
                    case "50": msg = "兩邊的商隊衝突總算平息了，希望明天不會再有類似的事。"; break; // 剛打完 Ch4.5
                    case "55": msg = "這幾天發生的事太多了，我的腦袋需要好好整理一下。"; break; // 剛打完 Ch5
                    case "60": msg = "和大家一起唱歌的感覺真好... 但還是得早點休息。"; break; // 剛打完 Ch5.5
                    case "65": msg = "那座島嶼的秘密... 明天再去深究吧。"; break; // 剛打完 Ch6
                    case "70": msg = "王子的背影看起來很落寞... 算了，現在想這些也沒用。"; break; // 剛打完 Ch6.5
                    case "75": msg = "羅伊的舉動越來越難以預測了，必須時刻保持警惕。"; break; // 剛打完 Ch7
                    case "80": msg = "門終於打開了... 但門後到底有什麼，明天再面對吧。"; break; // 剛打完 Ch7.5
                    case "85": msg = "這一切的真相... 就在眼前了。但我需要最佳狀態來迎接它。"; break; // 剛打完 Ch8
                }
                
                this.dText.innerHTML = msg;
                return;
            }
        }

        // 先檢查解鎖條件
        if (poi.requiresFlag) {
            const flags = state.flags || {};
            if (!flags[poi.requiresFlag]) {
                this.state.inDialog = true;
                this.hintEl.style.display = 'none';
                this.dialogEl.style.display = 'block';
                if(this.dAvatar) { this.dAvatar.style.display = 'none'; }
                this.dTitle.innerText = `◆ 大門緊鎖`;
                this.dText.innerHTML = "大門被鎖上了...<br><br>👉 [系統說明] 您需要先在「公會大廳」承接相關委託才能解鎖這個地點。";
                return;
            }
        }

        if (poi.action === "TELEPORT") {
            // 切換地圖效果：先用黑色遮罩蓋住，進行精準預載
            const overlay = document.getElementById('rpg-overlay-layer');
            if (overlay) {
                overlay.style.transition = 'opacity 0.2s';
                overlay.style.zIndex = '999';
                overlay.style.opacity = '1';
            }
            
            this.container.style.transition = "opacity 0.3s";
            this.container.style.opacity = '0';
            
            setTimeout(() => {
                const nextMap = window.RPG_MAPS[poi.targetMap];
                this.preloadMapAssets(nextMap).then(() => {
                    this.loadMap(poi.targetMap, poi.targetX, poi.targetY);
                    this.container.style.opacity = '1';
                    
                    if (overlay) {
                        overlay.style.transition = 'opacity 0.4s ease';
                        overlay.style.opacity = '0';
                        setTimeout(() => { overlay.style.zIndex = '20'; }, 400);
                    }
                });
            }, 300);
            return;
        }

        if (poi.action === "EVAL") {
            if (poi.evalCode) {
                try {
                    eval(poi.evalCode);
                } catch(e) {
                    console.error("Eval action error:", e);
                }
            }
            return;
        }

        this.state.inDialog = true;
        this.hintEl.style.display = 'none';
        this.dialogEl.style.display = 'block';
        
        if (this.dAvatar) {
            if (poi.avatar) {
                this.dAvatar.src = poi.avatar;
                this.dAvatar.style.display = 'block';
            } else {
                this.dAvatar.style.display = 'none';
            }
        }

        this.dTitle.innerText = `◆ ${poi.name}`;
        
        let finalDesc = poi.desc || "......";
        const avatar = state.currentAvatar || 'main';
        if (poi.avatarDesc && poi.avatarDesc[avatar]) {
            finalDesc = poi.avatarDesc[avatar];
        }

        if (poi.id === "carriage" && isFreeMode) {
            finalDesc = "馬車夫：「勇者大人，目前沒有新的目的地，您可以在城內自由探索。」";
        }
        
        this.dText.innerHTML = finalDesc;
        
        // 特殊行動判定：切換章節
        if (poi.action === "NEXT_CHAPTER" && !isFreeMode && poi.id !== "carriage") {
            this.dText.innerHTML += `<br><br><button onclick="window.rpgEngine.proceedToNextChapter()" class="rpg-btn">出發！前往下一章</button>`;
        }
    }

    interactBed() {
        const state = window.orchestrator?.state || {};
        const isFreeMode = state.currentChapter === '85' || state.currentChapter === 85;

        if (isFreeMode) {
            this.state.inDialog = true;
            this.hintEl.style.display = 'none';
            this.dialogEl.style.display = 'block';
            if(this.dAvatar) { this.dAvatar.style.display = 'none'; }
            this.dTitle.innerText = `◆ 床鋪`;
            this.dText.innerHTML = "床鋪很舒服，但我現在沒有睡意。";
        } else {
            // 將 10, 15, 20 等內部章節編號，轉換回 1, 1_5, 2 的字串對應鍵值
            let chapterNum = state.currentChapter / 10;
            const chKey = String(chapterNum).replace('.', '_');
            const sleepKey = 'after_ch' + chKey;
            
            let dialogues = null;
            if (window.SLEEP_DIALOGUES && window.SLEEP_DIALOGUES[sleepKey]) {
                dialogues = window.SLEEP_DIALOGUES[sleepKey];
            } else {
                // 防呆機制：如果存檔章節太高 (例如 10) 但 story_sleep.js 沒寫該章的對話，就給個預設對話
                dialogues = [
                    { n: "我", t: "今天發生了好多事，不知不覺就這麼晚了……", a: "me" },
                    { n: "系統", t: "（你閉上眼睛，沉沉睡去。）", a: "system", bg: "black.png", bgm: "empty.mp3", auto: 1500, hideBox: true }
                ];
            }

            this.playRPGSequence(dialogues, () => {
                this.stop();
                if (window.orchestrator) {
                    window.orchestrator.loadNextChapter();
                }
            });
        }
    }

    playRPGSequence(dialogues, onComplete) {
        this.state.inDialog = true;
        this.hintEl.style.display = 'none';
        this.dialogEl.style.display = 'block';
        
        this.sequenceQueue = dialogues;
        this.sequenceIndex = 0;
        this.sequenceOnComplete = onComplete;
        
        this.renderSequenceLine();
    }

    renderSequenceLine() {
        if (!this.sequenceQueue) return;
        const line = this.sequenceQueue[this.sequenceIndex];
        const currentIndex = this.sequenceIndex;
        
        this.dTitle.innerText = `◆ ${line.n || '系統'}`;
        this.dText.innerHTML = line.t || '';

        // 頭像邏輯
        if (this.dAvatar) {
            if (line.a && line.a !== "system" && line.a !== "me" && line.a !== "head") {
                if (line.a.startsWith("npc_")) {
                    this.dAvatar.onerror = () => { this.dAvatar.style.display = 'none'; this.dAvatar.onerror = null; };
                    this.dAvatar.src = `rpg/npc/${line.a}.png`;
                } else {
                    this.dAvatar.onerror = null;
                    this.dAvatar.src = `Charater/${line.a}.png`; // 載入角色圖片
                }
                this.dAvatar.style.display = 'block';
            } else {
                this.dAvatar.onerror = null;
                this.dAvatar.style.display = 'none';
            }
        }

        if (line.hideBox) {
            this.dialogEl.style.display = 'none';
        } else {
            this.dialogEl.style.display = 'block'; // 修正: 原本是 flex 導致排版錯亂
        }

        // 若有 bg 要求：切換場景圖片 (例如 rpg/bg/library.png)，或 black.png 讓畫面變黑
        if (line.bg) {
            const overlayLayer = document.getElementById('rpg-overlay-layer');
            if (overlayLayer) {
                overlayLayer.style.transition = 'opacity 0.5s';
                overlayLayer.style.zIndex = '20';
                overlayLayer.style.opacity = '1';
                if (line.bg === "black.png") {
                    overlayLayer.style.backgroundColor = '#000';
                    overlayLayer.style.backgroundImage = 'none';
                } else {
                    overlayLayer.style.backgroundColor = '';
                    overlayLayer.style.backgroundImage = `url('${line.bg}')`;
                    overlayLayer.style.backgroundSize = 'cover';
                    overlayLayer.style.backgroundPosition = 'center';
                }
            }
        }

        // 若有 BGM 播放要求
        if (line.bgm && window.orchestrator) {
            window.orchestrator.emit('playBGM', { file: line.bgm });
        }

        // 若有 auto 屬性，自動跳轉下一句
        if (line.auto) {
            setTimeout(() => {
                if (this.sequenceQueue && this.sequenceIndex === currentIndex) {
                    if (this.sequenceIndex < this.sequenceQueue.length - 1) {
                        this.sequenceIndex++;
                        this.renderSequenceLine();
                    } else {
                        // 最後一行 auto 結束：清空 sequence，直接執行 callback（不等 Enter）
                        this.sequenceQueue = null;
                        this.state.inDialog = false;
                        this.dialogEl.style.display = 'none';
                        this.resetSceneOverlay();
                        if (this.sequenceOnComplete) {
                            const cb = this.sequenceOnComplete;
                            this.sequenceOnComplete = null;
                            cb();
                        }
                    }
                }
            }, line.auto);
        }
    }

    // 清除 playRPGSequence 期間透過 line.bg 切換的場景圖層，還原為地圖背景
    resetSceneOverlay() {
        const overlayLayer = document.getElementById('rpg-overlay-layer');
        if (overlayLayer) {
            overlayLayer.style.transition = 'opacity 0.4s ease';
            overlayLayer.style.opacity = '0';
            setTimeout(() => {
                overlayLayer.style.zIndex = '20';
                overlayLayer.style.backgroundImage = 'none';
                overlayLayer.style.backgroundColor = '';
            }, 400);
        }
    }

    closeDialog() {
        this.dialogEl.style.display = 'none';
        setTimeout(() => { this.state.inDialog = false; }, 100);

        if (this.sequenceQueue) {
            this.sequenceQueue = null;
            this.resetSceneOverlay();
            if (this.sequenceOnComplete) {
                const cb = this.sequenceOnComplete;
                this.sequenceOnComplete = null;
                cb();
            }
        }
    }
    
    proceedToNextChapter() {
        this.closeDialog();
        this.stop();
        if (window.orchestrator) {
            window.orchestrator.loadNextChapter();
        }
    }

    preloadMapAssets(mapData) {
        return new Promise((resolve) => {
            if (!mapData) {
                resolve();
                return;
            }
            
            const images = [];
            if (mapData.bg) images.push(mapData.bg);
            if (mapData.sprites) {
                mapData.sprites.forEach(sprite => {
                    if (sprite.img) images.push(sprite.img);
                });
            }
            
            if (images.length === 0) {
                resolve();
                return;
            }
            
            let loaded = 0;
            const total = images.length;
            const done = () => {
                loaded++;
                if (loaded >= total) resolve();
            };
            
            images.forEach(src => {
                const img = new Image();
                img.onload = done;
                img.onerror = done; // 即使出錯也要 done，防卡死
                img.src = src;
            });
            
            // 3 秒超時保護
            setTimeout(resolve, 3000);
        });
    }

    // ==========================================
    // [新增]: 一鍵隱藏/顯示紅色空氣牆與 POI 外框標籤
    // ==========================================
    toggleDebug(show) {
        this.showDebug = (show !== undefined) ? !!show : !this.showDebug;
        
        // 1. 切換空氣牆顯示
        document.querySelectorAll('.rpg-debug-wall').forEach(el => {
            el.style.display = this.showDebug ? 'block' : 'none';
        });
        
        // 2. 切換 POI 除錯提示 (隱藏外框與文字，僅保留隱藏互動功能)
        document.querySelectorAll('.rpg-poi').forEach(el => {
            const label = el.querySelector('.rpg-poi-label');
            const icon = el.querySelector('.rpg-poi-icon');
            if (this.showDebug) {
                el.style.background = ''; // 恢復原有樣式
                el.style.border = '';
                el.style.boxShadow = '';
                if (label) label.style.display = '';
                if (icon) icon.style.display = '';
            } else {
                el.style.background = 'transparent';
                el.style.border = 'none';
                el.style.boxShadow = 'none';
                if (label) label.style.display = 'none';
                if (icon) icon.style.display = 'none';
            }
        });
        
        // 3. 更新實體按鈕文字與背景樣式
        const btn = document.getElementById('rpg-debug-btn');
        if (btn) {
            if (this.showDebug) {
                btn.innerText = '👁️ 隱藏偵錯牆';
                btn.style.background = '#217346';
            } else {
                btn.innerText = '👁️ 顯示偵錯牆';
                btn.style.background = '#555555';
            }
        }
        
        console.log(`🔧 [RPGEngine] Debug Visuals: ${this.showDebug ? 'ENABLED' : 'DISABLED'}`);
    }
}

window.rpgEngine = new RPGEngine();
