/**
 * 試算表魔法冒險 v2 - UI 控制層 (v45 絕對同步版)
 */
console.log("💎 [ui.js] 檔案已成功載入！");

class UIManager {
    constructor() {
        console.log("💎 [UIManager] 正在實例化...");
        this.storyQueue = [];
        this.currentStoryIndex = 0;
        this.currentStoryType = 'PHASE';
        this.onStorySegmentComplete = null;
        this.activeTab = 'start'; // 預設分頁回歸全域預設
        this.fairyAppeared = false; // [新增] 紀錄賽爾是否已登場過 (用於觸發特效)
        this.isTrialActive = false; // [新增] 紀錄目前是否正在進行試煉 (用於阻斷操作)
        this.isCurrentCG = false; // [新增] 紀錄當前是否處於 CG 背景
        this.isShowingEasterEgg = false; // [新增] 紀錄是否正在顯示彩蛋台詞
        this.searchTimeout = null; // [新增] 用於搜尋防抖 (Debounce)
        this.envAnimInterval = null; // [新增] 環境特效動畫計時器
        this.currentEnvFolder = null; // [新增] 紀錄當前動畫資料夾，避免重複啟動
        this.initEventListeners();
    }

    /**
     * [新增] 防抖搜尋功能
     */
    debounceSearch() {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.renderSkillList();
        }, 150); // 150ms 的防抖時間
    }

    /**
     * [新增] 開始新遊戲邏輯 (隱藏標題畫面)
     */
    startNewGame() {
        const overlay = document.getElementById('title-screen-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                window.orchestrator.start();
            }, 800);
        } else {
            window.orchestrator.start();
        }
    }

    initEventListeners() {
        console.info("🚀 [UIManager] 事件系統初始化中...");

        // [核心優化]: 監聽所有妖精與主角（模擬器與劇情中）的點擊，觸發彩蛋
        document.addEventListener('click', (e) => {
            const el = e.target;
            const isElf = el.id === 'elf-img' || el.id === 'a-f' || el.classList.contains('char-img');
            const isPlayer = el.id === 's-btn' || el.id === 'a-m';
            const isBubble = el.id === 'elf-bubble' || el.id === 'e-t' || el.closest('#elf-bubble') || el.id === 'player-box' || el.id === 'p-t' || el.closest('#player-box');
            
            // [關鍵修正]: 劇情模式 (SEGMENT) 下，點擊側邊欄任何氣泡區域都觸發下一行
            if (this.currentStoryType === 'SEGMENT' && isBubble) {
                console.log("🖱️ [UIManager] 全域捕獲: 劇情氣泡點擊");
                e.stopPropagation();
                this.nextStoryLine();
                return;
            }

            if (isElf) {
                console.log(`✅ [UIManager] 觸發妖精互動 (ID: ${el.id})`);
                el.classList.add('elf-wow');
                setTimeout(() => el.classList.remove('elf-wow'), 400);

                // [優化]: 只有在非劇情進行中才觸發隨機台詞
                if (window.orchestrator.state.currentPhase === 'SIMULATOR' && this.currentStoryType !== 'SEGMENT') {
                    this.showEasterEgg('fairy');
                }
            }

            if (isPlayer) {
                console.log(`✅ [UIManager] 觸發主角互動`);
                this.showEasterEgg('me');
            }

            // [新增]: 點擊氣泡回到任務提示
            if (isBubble && window.orchestrator.state.currentPhase === 'SIMULATOR' && this.isShowingEasterEgg) {
                const state = window.orchestrator.state;
                const task = state.activeChapterModule.simulator.tasks[state.currentTaskIndex];
                this.updateTutorUI(task);
            }
        }, true); 

        // [新增] 右鍵選單監聽器
        document.addEventListener('contextmenu', (e) => {
            const state = window.orchestrator.state;
            if (state.currentPhase !== 'SIMULATOR') return;

            // 檢查是否點擊在 Grid 內
            const cell = e.target.closest('.cell');
            if (cell) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY);
            }
        });

        // 點擊其他地方關閉右鍵選單
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('#context-menu')) {
                this.hideContextMenu();
            }
        });

        // [新增] 雙擊儲存格監聽器
        document.addEventListener('dblclick', (e) => {
            const state = window.orchestrator.state;
            if (state.currentPhase !== 'SIMULATOR') return;

            const cell = e.target.closest('.cell');
            if (cell && state.activeSheetId.startsWith('st-pivot')) {
                this.triggerAction('pivot_method_change');
            }
        });

        window.orchestrator.on('playStory', (data) => this.handlePlayStory(data));
        window.orchestrator.on('startSimulator', (data) => {
            this.hideOverlay();
            const gm = document.getElementById('game-main');
            if (gm) { 
                gm.style.display = 'flex'; 
                gm.style.visibility = 'visible'; 
                setTimeout(() => gm.style.opacity = '1', 10); 
            }

            const dTab = data.config?.defaultTab || 'start';
            this.switchTab(dTab);

            this.updateTutorUI(data.config?.tasks[window.orchestrator.state.currentTaskIndex]);
            this.updatePlayerSBtn();
            this.renderSheetBar(); 
            
            // [關鍵修正]: 強制執行一次渲染，確保表格出現
            if (window.gridRenderer) window.gridRenderer.render();
            
            const firstTask = data.config?.tasks[window.orchestrator.state.currentTaskIndex];
            if (firstTask && firstTask.quiz) {
                this.openTrialModal(firstTask.quiz);
            }
        });
        window.orchestrator.on('taskChanged', (data) => {
            // [關鍵優化]: 如果正在播放「段落劇情」(SEGMENT)，不要立即更新 UI，避免破壞氣泡。
            // 劇情結束後的 finishStoryGroup 會自動更新到正確的 task。
            if (this.currentStoryType !== 'SEGMENT') {
                this.updateTutorUI(data.task);
            }
            
            this.renderRibbon(window.orchestrator.state.activeChapterModule.simulator);
            if (data.task && data.task.quiz) {
                this.openTrialModal(data.task.quiz);
            }
        });
        window.orchestrator.on('skillUnlocked', (data) => {
            this.showSkillUnlockToast(data.id, data.skill);
            // 解鎖新技能後重新渲染工具列，確保按鈕能「固定」住
            this.renderRibbon(window.orchestrator.state.activeChapterModule.simulator);
        });
        window.orchestrator.on('coinsChanged', (data) => this.updateCoins(data.coins));
        
        // 工作表事件
        window.orchestrator.on('sheetAdded', () => this.renderSheetBar());
        window.orchestrator.on('sheetSwitched', (data) => {
            this.updateSheetTabUI(data.id);
            // [新增]: 切換 Sheet 時重新應用引導高亮 (針對 Ch6)
            if (window.ch6Actions?._applyA1Highlight) window.ch6Actions._applyA1Highlight();
        });
        window.orchestrator.on('playBGM', (data) => this.playBGM(data.file));
        
        // [新增]: 章節切換時徹底重置 UI 暫存狀態
        window.orchestrator.on('chapterLoaded', () => this.resetTemporaryUIState());
    }

    /**
     * [新增]: 重置跨章節的 UI 狀態 (如自訂排序清單、層級等)
     */
    resetTemporaryUIState() {
        console.log("💎 [UIManager] 偵測到章節更迭，正在清理暫存狀態...");
        this._sortLevels = [];
        this._selectedCustomList = null;
        this._activeSortOrderSelect = null;

        // 清理自訂清單面板中的 DOM (防止 Ch4 的「重症/中症」留在 Ch4.5 面板裡)
        const pane = document.getElementById('excel-custom-lists-pane');
        if (pane) pane.innerHTML = "";

        // 清理排序對話框中的 DOM
        const sortBody = document.getElementById('sort-levels-body');
        if (sortBody) sortBody.innerHTML = "";
    }

    // --- 右鍵選單系統 ---
    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu');
        if (!menu) return;

        // [新增]: 根據章節動態注入選單項
        const state = window.orchestrator.state;
        const chap = state.currentChapter.toString();
        
        // 清理舊有的動態項 (如果有)
        const dynamicItems = menu.querySelectorAll('.dynamic-item');
        dynamicItems.forEach(item => item.remove());

        if (chap === "60" || chap === "65") {
            const groupItem = document.createElement('div');
            groupItem.className = 'dropdown-item dynamic-item';
            groupItem.innerHTML = `<span class="icon">📦</span><span class="text">組成群組... (G)</span>`;
            groupItem.onclick = () => { this.hideContextMenu(); this.triggerAction('pivot_group_apply'); };
            menu.insertBefore(groupItem, menu.firstChild);

            if (state.activeSheetId.startsWith('st-pivot')) {
                const methodItem = document.createElement('div');
                methodItem.className = 'dropdown-item dynamic-item';
                methodItem.innerHTML = `<span class="icon">🔢</span><span class="text">值欄位設定...</span>`;
                methodItem.onclick = () => { this.hideContextMenu(); this.triggerAction('pivot_method_change'); };
                menu.insertBefore(methodItem, groupItem.nextSibling);
            }
        }

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
    }

    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        if (menu) menu.style.display = 'none';
    }

    handlePlayStory({ type, data, onComplete }) {
        this.storyQueue = data;
        
        // [關鍵優化]: 無論是 PHASE 還是 SEGMENT，讀檔時都恢復精確行號
        if (window.orchestrator._isLoadingFromSave) {
            this.currentStoryIndex = window.orchestrator.state.currentStoryIndex || 0;
            console.log(`🎬 [UIManager] 偵測到存檔斷點，恢復第 ${this.currentStoryIndex} 行`);
            
            // [新增]: 讀檔時必須向前掃描以恢復背景與環境
            this.syncVisualsToCurrentIndex();
        } else {
            this.currentStoryIndex = 0;
            window.orchestrator.state.currentStoryIndex = 0;
        }

        this.currentStoryType = type; 
        this.onStorySegmentComplete = onComplete || null;
        
        const overlay = document.getElementById('story-overlay');
        const gameMain = document.getElementById('game-main');

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
    }

    /**
     * [新增]: 讀檔環境同步邏輯
     * 向前掃描劇本隊列，找出最近的一個背景(bg)與音樂(bgm)並應用
     */
    syncVisualsToCurrentIndex() {
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

    nextStoryLine() {
        this.currentStoryIndex++;
        // [關鍵]: 逐行更新存檔
        window.orchestrator.state.currentStoryIndex = this.currentStoryIndex;
        window.orchestrator.saveGame();
        
        this.renderCurrentStoryLine();
    }

    renderCurrentStoryLine() {
        if (this.currentStoryIndex >= this.storyQueue.length) {
            this.finishStoryGroup();
            return;
        }

        const line = this.storyQueue[this.currentStoryIndex];
        const state = window.orchestrator.state;
        
        const blinkTag = "<span style='font-size:12px;color:#8b4513;float:right;animation:blink 1s infinite;margin-top:10px'>▼ CLICK</span>";

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
        }

        this.updateVisuals(line);
    }

    showNote(content) {
        const modal = document.getElementById('note-modal');
        const ct = document.getElementById('note-content');
        if (modal && ct) {
            ct.innerHTML = this.highlightText(content || "");
            modal.style.display = 'flex';
            this.playSFX('success.mp3');
        }
    }

    hideNote() {
        const modal = document.getElementById('note-modal');
        if (modal) modal.style.display = 'none';
    }

    showLetter() {
        const modal = document.getElementById('letter-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('letter-modal-active'), 10);
            this.playSFX('success.mp3');
        }
    }

    hideLetter() {
        const modal = document.getElementById('letter-modal');
        if (modal) {
            modal.classList.remove('letter-modal-active');
            setTimeout(() => modal.style.display = 'none', 500);
        }
    }

    updateVisuals(line) {
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
            'chate_rpg': 'a-ma'
        };
        
        // 關鍵路徑還原
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
            'chate_rpg': 'Charater/chate rpg.png'
        };

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
                
                elfImg.classList.remove('char-bounce', 'char-sink', 'char-slideIn');
                if (line.charAnim) {
                    void elfImg.offsetWidth;
                    elfImg.classList.add(`char-${line.charAnim}`);
                }
            }
        }

        // 僅在全螢幕模式下更換大型立繪
        if (this.currentStoryType === 'PHASE') {
            document.querySelectorAll('.char-img').forEach(img => {
                img.classList.remove('char-active');
                img.classList.remove('fairy-appear'); // 清除舊動畫
            });

            // [關鍵優化]: 紀錄並更新當前是否為 CG 模式
            if (line.bg) {
                this.isCurrentCG = line.bg.startsWith('cg/');
            }

            if (!this.isCurrentCG && line.a !== 'system') {
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
                    
                    targetImg.classList.remove('char-bounce', 'char-sink', 'char-slideIn');
                    if (line.charAnim) {
                        void targetImg.offsetWidth;
                        targetImg.classList.add(`char-${line.charAnim}`);
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
                // 先重置類別以允許重複觸發
                flashEl.classList.remove('flash-active');
                void flashEl.offsetWidth; // 強制重繪
                flashEl.classList.add('flash-active');
                
                // 閃光通常伴隨震動音效 (可選)
                if (line.flashSFX) this.playSFX(line.flashSFX);
            }

            // [新增]: 處理電影感震動特效 (Shake Effect)
            if (line.shake) {
                const stage = document.getElementById('story-stage');
                if (stage) {
                    stage.classList.remove('shake-active');
                    void stage.offsetWidth; // 強制重繪
                    stage.classList.add('shake-active');
                }
            }
            
            // [新增]: 處理電影感畫面特效 (Screen Effect: glitch, heartbeat, dissolve, glow)
            if (line.screenEffect) {
                const stage = document.getElementById('story-stage');
                if (stage) {
                    stage.classList.remove('screen-glitch', 'screen-heartbeat', 'screen-dissolve', 'screen-glow');
                    void stage.offsetWidth;
                    stage.classList.add(`screen-${line.screenEffect}`);
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
                void whiteoutEl.offsetWidth;
                whiteoutEl.classList.add('whiteout-active');
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
                    void stuffContainer.offsetWidth; // 強制重繪
                    stuffContainer.classList.add('shake-active');
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

    enableSidebarClick() {
        const eb = document.getElementById('elf-bubble'), pb = document.getElementById('player-box');
        const nextHandler = (e) => {
            if (e) e.stopPropagation();
            this.nextStoryLine();
        };
        if (eb) { eb.style.cursor = 'pointer'; eb.onclick = nextHandler; }
        if (pb) { pb.style.cursor = 'pointer'; pb.onclick = nextHandler; }
    }

    // --- 鍵盤系統 ---
    initKeyboardListeners() {
        document.onkeydown = (e) => {
            const state = window.orchestrator.state;
            if (state.currentPhase !== 'SIMULATOR' || this.isTrialActive) return;

            const k = e.key.toLowerCase();
            
            if (e.key === 'Shift') this.isShiftDown = true;
            if (e.ctrlKey && (k === 'arrowdown' || k === 'down')) { e.preventDefault(); this.triggerAction('quickjump'); return; }
            if (e.ctrlKey && (k === 'arrowup' || k === 'up')) { e.preventDefault(); this.triggerAction('jumpup'); return; }
            if (e.ctrlKey && (k === ';' || k === ':')) { e.preventDefault(); this.triggerAction('insertdate'); return; }
            if (e.ctrlKey && k === 'e') { e.preventDefault(); this.triggerAction('open_format_dialog'); return; }
            if (k === 'alt' && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); this.triggerAction('freezepanes'); return; }
        };

        document.onkeyup = (e) => {
            if (e.key === 'Shift') this.isShiftDown = false;
        };

        // --- 性能優化：節流處理全域滑鼠移動 ---
        let moveTick = false;
        document.addEventListener('mousemove', (e) => {
            if (moveTick) return;
            moveTick = true;
            window.requestAnimationFrame(() => {
                this.handleGlobalMouseMove(e);
                moveTick = false;
            });
        });
        document.addEventListener('mouseup', (e) => this.handleGlobalMouseUp(e));
    }

    handleGlobalMouseMove(e) {
        const state = window.orchestrator.state;
        const currentChapter = state.currentChapter.toString();
        const isCh1 = currentChapter === "10" || currentChapter === "15" || currentChapter === "1" || currentChapter === "1.5";

        // --- 處理填充柄拖拽 (Auto Fill Expansion) ---
        if (state.isDraggingFill) {
            const cells = document.elementsFromPoint(e.clientX, e.clientY);
            const targetCell = cells.find(el => el.classList.contains('cell'));
            if (targetCell) {
                const id = targetCell.id; // e.g., "A5"
                const colLabel = id.match(/[A-Z]+/)[0];
                const rowNum = parseInt(id.match(/\d+/)[0]);
                const cIdx = colLabel.charCodeAt(0) - 65;
                const rIdx = rowNum - 1;

                // 擴展目前的選取範圍 (僅限垂直擴展)
                const source = state.fillSourceRange;
                if (source) {
                    state.selectedRange = {
                        minRow: Math.min(source.minRow, rIdx),
                        maxRow: Math.max(source.maxRow, rIdx),
                        minCol: source.minCol,
                        maxCol: source.maxCol
                    };
                    window.gridRenderer._updateVisuals(state.gridData, state.gridData[0].length);
                }
            }
            return;
        }

        if (!state.isDraggingCol) return;

        // [新增]: 限制交換空間僅限 Ch1
        if (!isCh1) {
            state.isDraggingCol = false;
            return;
        }

        const gl = document.getElementById('green-line');
        const wrapper = document.getElementById('wrapper');
        const cC = document.getElementById('C1'); // 以 C1 作為目標參考點
        if (!gl || !wrapper || !cC) return;

        const rect = cC.getBoundingClientRect();
        const wrapRect = wrapper.getBoundingClientRect();

        // 只有按住 Shift 才顯示插入線 (真實 Excel 交換行為)
        if (this.isShiftDown || e.shiftKey) {
            if (e.clientX > rect.left + rect.width / 2) {
                gl.style.display = 'block';
                gl.style.left = (rect.right - wrapRect.left + wrapper.scrollLeft) + 'px';
                gl.style.height = wrapper.scrollHeight + 'px';
                gl.style.top = '0px';
            } else {
                gl.style.display = 'none';
            }
        } else {
            gl.style.display = 'none';
            // 提示玩家需要按住 Shift
            const pt = document.getElementById('p-t');
            if (pt && !pt.innerText.includes('Shift')) {
                pt.innerHTML = `<span style="color:#ff4757">「咦？沒按住 Shift 的話，這不是交換空間，是『取代術』啊！」</span>`;
            }
        }
    }

    handleGlobalMouseUp(e) {
        const state = window.orchestrator.state;
        const currentChapter = state.currentChapter.toString();
        const isCh1 = currentChapter === "10" || currentChapter === "15" || currentChapter === "1" || currentChapter === "1.5";

        // 1. 處理欄位拖拽交換
        if (state.isDraggingCol) {
            const gl = document.getElementById('green-line');
            // [新增]: 僅在 Ch1 執行交換
            if (gl && gl.style.display === 'block' && (this.isShiftDown || e.shiftKey) && isCh1) {
                this.triggerAction('columnswap');
            }
            state.isDraggingCol = false;
            if (gl) gl.style.display = 'none';
        }
        // 2. 處理填充柄拖拽
        if (state.isDraggingFill) {
            state.isDraggingFill = false;
            // 模擬 v41：如果向下拖拽（或單純點擊釋放），執行自動填滿
            this.triggerAction('autofill');
        }

        // 3. 處理範圍選取結束
        if (state.isSelecting) {
            state.isSelecting = false;
            // [新增]: 結束拖拉公式範圍選取
            if (state.formulaRangeSelection) {
                state.formulaRangeSelection = null;
            }
            // 範圍選取後自動檢查任務條件
            window.orchestrator.validateStateChange();
        }
    }

    disableSidebarClick() {
        const eb = document.getElementById('elf-bubble'), pb = document.getElementById('player-box');
        if (eb) { eb.style.cursor = 'default'; eb.onclick = null; }
        if (pb) { pb.style.cursor = 'default'; pb.onclick = null; }
    }

    finishStoryGroup() {
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

    hideOverlay() { document.getElementById('story-overlay').style.display = 'none'; }

    updateTutorUI(task) {
        if (!task) return;
        this.isShowingEasterEgg = false; // [新增] 重置彩蛋狀態
        const et = document.getElementById('e-t'), tt = document.getElementById('t-t'), pt = document.getElementById('p-t');
        
        const fullHint = task.tutorHint || "";
        
        // 1. [主氣泡]: 顯示導師對話 (現在此為主要指令來源)
        if (et) et.innerHTML = this.highlightText(fullHint);
        
        // 2. [目標標籤]: 根據用戶建議，隱藏冗餘的紅字標籤
        if (tt) {
            tt.style.display = "none";
        }

        // 3. [主角氣泡]: 更新主角心聲
        if (pt && task.playerText) pt.innerHTML = this.highlightText(task.playerText);

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

    /**
     * [新增]: 顯示隨機彩蛋台詞
     */
    showEasterEgg(role) {
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

    highlightText(txt) { 
        if (window.textHighlighter) return window.textHighlighter.highlight(txt);
        // [優化]: 支援更多樣式標籤 (strike, black)
        return (txt || "").replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, content, style) => {
            if (style === 'strike') return `<span class="hl-strike">${content}</span>`;
            if (style === 'black') return `<span class="hl-black">${content}</span>`;
            return `<span class="hl-${style}">${content}</span>`;
        });
    }

    triggerAction(code, anchorEl) {
        if (!code || this.isTrialActive) return; // [新增]: 試煉中阻斷動作
        const actionKey = code.toLowerCase();

        // [優化]: 下拉選單邏輯 - 使用傳入的 anchorEl 定位
        if (actionKey === 'freezepanes') {
            this.showDropdown([
                { icon: '🔝', text: '凍結頂端列', action: 'freeze_top' },
                { icon: '📏', text: '凍結首欄', action: 'freeze_first_col' },
                { icon: '🧊', text: '凍結窗格', action: 'freeze_logic' }
            ], anchorEl);
            return;
        }

        if (actionKey === 'sort_group' || actionKey === 'sort_filter_group') {
            const state = window.orchestrator.state;
            if (state.currentChapter.toString() === "50" && window.ch5Actions) {
                window.ch5Actions.sort_filter_group(anchorEl);
            } else if (window.ch4Actions) {
                window.ch4Actions.sort_filter_group(anchorEl);
            }
            return;
        }

        if (actionKey === 'filter') {
            if (window.ch4Actions) window.ch4Actions.filter(anchorEl);
            return;
        }

        if (actionKey === 'adv_filter') {
            this.openAdvFilterDialog();
            return;
        }

        if (actionKey === 'border') {
            this.showDropdown([
                { icon: '▦', text: '所有框線', action: 'allborders' },
                { icon: '📉', text: '其他框線 (斜線)', action: 'open_format_dialog_border' }
            ], anchorEl);
            return;
        }

        if (actionKey === 'find_group') {
            this.showDropdown([
                { icon: '🔍', text: '尋找...', action: 'find' },
                { icon: '🔄', text: '取代...', action: 'replace' },
                { icon: '📍', text: '到...', action: 'empty' }
            ], anchorEl);
            return;
        }

        if (actionKey === 'data_group') {
            const chap = window.orchestrator.state.currentChapter.toString();
            if ((chap === "50" || chap === "55") && window.ch5Actions) {
                window.ch5Actions.data_group(anchorEl);
            }
            return;
        }

        if (actionKey === 'insert_group') {
            const chap = window.orchestrator.state.currentChapter.toString();
            if ((chap === "60" || chap === "65") && window.ch6Actions) {
                window.ch6Actions.insert_group(anchorEl);
            }
            return;
        }

        if (actionKey === 'validation_btn') {
            const chap = window.orchestrator.state.currentChapter.toString();
            if ((chap === "50" || chap === "55") && window.ch5Actions) {
                window.ch5Actions.validation_btn(anchorEl);
            }
            return;
        }

        let targetObj = null;
        const currentChap = window.orchestrator.state.currentChapter.toString();
        
        // [關鍵修復]: 優先匹配當前章節的動作模組，避免 Ch4 攔截了 Ch5 的同名動作
        const chapMap = {
            "10": window.ch1Actions, "15": window.ch1Actions,
            "20": window.ch2Actions, "25": window.ch2Actions,
            "30": window.ch3Actions, "35": window.ch3Actions,
            "40": window.ch4Actions, "45": window.ch4Actions,
            "50": window.ch5Actions, "55": window.ch5Actions,
            "60": window.ch6Actions, "65": window.ch6Actions,
            "70": window.ch7Actions, "75": window.ch7Actions,
            "80": window.ch8Actions, "85": window.ch85Actions
        };

        const activeChapActions = chapMap[currentChap];
        if (activeChapActions && activeChapActions[actionKey]) {
            targetObj = activeChapActions;
        } else {
            // 回退邏輯：掃描所有模組 (相容舊有跨章節調用)
            if (window.ch1Actions && window.ch1Actions[actionKey]) targetObj = window.ch1Actions;
            else if (window.ch2Actions && window.ch2Actions[actionKey]) targetObj = window.ch2Actions;
            else if (window.ch3Actions && window.ch3Actions[actionKey]) targetObj = window.ch3Actions;
            else if (window.ch4Actions && window.ch4Actions[actionKey]) targetObj = window.ch4Actions;
            else if (window.ch5Actions && window.ch5Actions[actionKey]) targetObj = window.ch5Actions;
        }

        if (targetObj) {
            targetObj[actionKey](anchorEl);
        } else if (actionKey === 'open_format_dialog_border') {
            this.openFormatDialog('border');
        } else if (actionKey === 'open_format_dialog') {
            this.openFormatDialog('number');
        } else {
            console.warn(`[UIManager] 未找到禁術動作: ${actionKey}`);
        }
        window.orchestrator.validateStateChange();
    }

    // --- 下拉選單系統 ---
    showDropdown(options, anchorEl) {
        const menu = document.getElementById('dropdown-menu');
        const content = document.getElementById('dropdown-content');
        if (!menu || !content || !anchorEl) return;

        content.innerHTML = "";
        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<span class="icon">${opt.icon}</span><span class="text">${opt.text}</span>`;
            item.onclick = (e) => {
                e.stopPropagation();
                this.hideDropdown();
                // 透過 triggerAction 統一分流處理
                this.triggerAction(opt.action);
            };
            content.appendChild(item);
        });

        // 定位
        const rect = anchorEl.getBoundingClientRect();
        menu.style.top = rect.bottom + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.display = 'block';

        // 點擊外部關閉
        const closer = (e) => {
            if (!menu.contains(e.target)) {
                this.hideDropdown();
                document.removeEventListener('mousedown', closer);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closer), 10);
    }

    hideDropdown() {
        const menu = document.getElementById('dropdown-menu');
        if (menu) menu.style.display = 'none';
    }

    /**
     * [優化]: 自定義魔法提示框，取代原生 alert() 以防止全螢幕中斷
     */
    showMagicToast(msg, type = 'success') {
        const container = document.getElementById('game-container') || document.body;
        const toast = el('div', {
            className: `magic-toast ${type}`,
            style: {
                position: 'fixed',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '20px 40px',
                background: type === 'success' ? 'rgba(33,115,70,0.95)' : 'rgba(178,34,34,0.95)',
                color: '#fff',
                borderRadius: '12px',
                boxShadow: '0 0 30px rgba(0,0,0,0.5)',
                zIndex: '10000',
                fontSize: '18px',
                fontWeight: 'bold',
                pointerEvents: 'none',
                opacity: '0',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            },
            innerHTML: `✨ ${this.highlightText(msg)}`
        });

        container.appendChild(toast);
        
        // 觸發進場動畫
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.top = '25%';
        });

        // 3秒後移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.top = '20%';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    playSFX(f) {
        console.log(`[UIManager] 嘗試播放 SFX: ${f}`);
        if (window.soundManager) window.soundManager.playSFX(`sound_effect/${f}`);
    }

    playBGM(f) {
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
    
    fadeInBGM(f) {
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
    
    fadeOutBGM(f = null) {
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

    skipStory() { this.currentStoryIndex = this.storyQueue.length; this.finishStoryGroup(); }

    /**
     * [新增] 啟動環境動畫 (循環或單次播放 PNG 序列)
     */
    startEnvAnimation(folder, totalFrames, speed, loop = true) {
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

    /**
     * [新增] 停止環境動畫
     */
    stopEnvAnimation() {
        if (this.envAnimInterval) {
            clearInterval(this.envAnimInterval);
            this.envAnimInterval = null;
        }
        this.currentEnvFolder = null;
    }
}

window.uiManager = new UIManager();
window.uiManager.initKeyboardListeners();

// ================= 系統導航樞紐 (System Menu) =================
UIManager.prototype.toggleSystemMenu = function() {
    const overlay = document.getElementById('sys-menu-overlay');
    if (!overlay) return;
    if (overlay.classList.contains('sys-overlay-hide')) {
        overlay.style.display = 'flex';
        void overlay.offsetWidth;
        overlay.classList.remove('sys-overlay-hide');
        overlay.classList.add('sys-overlay-show');
    } else {
        overlay.classList.remove('sys-overlay-show');
        overlay.classList.add('sys-overlay-hide');
        setTimeout(() => {
            if(overlay.classList.contains('sys-overlay-hide')) {
                overlay.style.display = 'none';
            }
        }, 200);
    }
};

UIManager.prototype.openSaveLoadMenu = function(mode) {
    this.slMode = mode;
    const overlay = document.getElementById('save-load-overlay');
    if(!overlay) return;
    const title = document.getElementById('sl-title');
    const grid = document.getElementById('sl-grid');
    
    if(mode === 'save') {
        title.innerText = "💾 儲存進度 (選擇槽位)";
    } else {
        title.innerText = "📜 讀取進度";
    }
    
    const meta = window.orchestrator.getSaveMeta();
    grid.innerHTML = '';
    
    const slots = mode === 'save' ? ['manual_1', 'manual_2'] : ['auto', 'manual_1', 'manual_2'];
    const slotNames = {
        'auto': '自動存檔',
        'manual_1': '手動存檔 1',
        'manual_2': '手動存檔 2'
    };
    
    slots.forEach(slot => {
        const data = meta[slot];
        const div = document.createElement('div');
        
        if(data) {
            const chapMap = {"10":"1", "15":"1.5", "20":"2", "25":"2.5", "30":"3", "35":"3.5", "40":"4", "45":"4.5", "50":"5", "55":"5.5", "60":"6", "65":"6.5", "70":"7", "75":"7.5", "80":"8", "85":"8.5"};
            const displayChapter = chapMap[data.chapter] || data.chapter;
            const dateStr = new Date(data.timestamp).toLocaleString();
            div.className = 'sl-slot';
            div.innerHTML = `
                <div class="sl-info">
                    <div class="sl-title">${slotNames[slot]} - 第 ${displayChapter} 章</div>
                    <div class="sl-meta">⏳ ${dateStr} | 💰 ${data.coins} G</div>
                </div>
                <div class="sl-icon">${mode === 'save' ? '💾' : '📜'}</div>
            `;
        } else {
            div.className = 'sl-slot sl-slot-empty';
            div.innerHTML = `
                <div class="sl-info">
                    <div class="sl-title">${slotNames[slot]}</div>
                    <div class="sl-meta">--- 空槽位 ---</div>
                </div>
                <div class="sl-icon">✨</div>
            `;
        }
        
        div.onclick = () => this.handleSaveLoadClick(slot);
        grid.appendChild(div);
    });
    
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.remove('sys-overlay-hide');
    overlay.classList.add('sys-overlay-show');
};

UIManager.prototype.closeSaveLoadMenu = function() {
    const overlay = document.getElementById('save-load-overlay');
    if(!overlay) return;
    overlay.classList.remove('sys-overlay-show');
    overlay.classList.add('sys-overlay-hide');
    setTimeout(() => {
        if(overlay.classList.contains('sys-overlay-hide')) {
            overlay.style.display = 'none';
        }
    }, 200);
};

UIManager.prototype.handleSaveLoadClick = function(slot) {
    if(this.slMode === 'save') {
        const meta = window.orchestrator.getSaveMeta();
        const hasData = meta[slot] !== null;
        if(!hasData || confirm(`確定要儲存進度到 [${slot}] 嗎？這將會覆蓋原本的進度。`)) {
            window.orchestrator.saveGame(slot);
            window.uiManager.showMagicToast('手動存檔成功！', 'success');
            this.closeSaveLoadMenu();
        }
    } else {
        if(confirm(`確定要讀取 [${slot}] 的進度嗎？未儲存的當前進度將會遺失。`)) {
            window.orchestrator.loadGame(slot);
            this.closeSaveLoadMenu();
        }
    }
};

UIManager.prototype.openAvatarShop = function() {
    let overlay = document.getElementById('avatar-shop-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'avatar-shop-overlay';
        overlay.className = 'sys-overlay-hide modal-layer';
        overlay.innerHTML = `
            <div class="sys-menu-panel" style="max-width: 500px; text-align: center;">
                <div class="sys-menu-header">
                    <h2>👗 神秘服飾店 (Avatar Shop)</h2>
                    <div class="sys-close-btn" onclick="window.uiManager.closeAvatarShop()">×</div>
                </div>
                <div style="margin: 15px 0;">
                    💰 目前持有金幣: <strong id="shop-coin-display" style="color:#217346; font-size:18px;">0</strong> G
                </div>
                <div id="shop-items" style="display: flex; flex-wrap:wrap; gap: 15px; justify-content: center;">
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    // 渲染商品
    const itemsContainer = document.getElementById('shop-items');
    itemsContainer.innerHTML = '';
    
    const state = window.orchestrator.state;
    const coins = state.coins || 0;
    document.getElementById('shop-coin-display').innerText = coins;
    
    const shopAvatars = [
        { id: 'boy', name: '王國小男孩', price: 100, icon: '👦' },
        { id: 'girl', name: '王國小女孩', price: 100, icon: '👧' },
        { id: 'fairy', name: '賽爾精靈', price: 500, icon: '🧚' }
    ];
    
    shopAvatars.forEach(av => {
        const isUnlocked = state.unlockedAvatars.includes(av.id);
        const canBuy = !isUnlocked && coins >= av.price;
        
        const card = document.createElement('div');
        card.style.border = '2px solid ' + (isUnlocked ? '#217346' : '#ccc');
        card.style.borderRadius = '10px';
        card.style.padding = '15px';
        card.style.width = '120px';
        card.style.background = isUnlocked ? 'rgba(33,115,70,0.1)' : '#fff';
        card.style.cursor = isUnlocked ? 'default' : (canBuy ? 'pointer' : 'not-allowed');
        card.style.opacity = (!isUnlocked && !canBuy) ? '0.6' : '1';
        
        card.innerHTML = `
            <div style="font-size:40px;">${av.icon}</div>
            <div style="font-weight:bold; margin-top:10px;">${av.name}</div>
            <div style="margin-top:5px; font-size:14px; color:${isUnlocked ? '#217346' : '#8b4513'};">
                ${isUnlocked ? '已解鎖' : `💰 ${av.price} G`}
            </div>
        `;
        
        if (!isUnlocked && canBuy) {
            card.onclick = () => {
                if (confirm(`確定要花費 ${av.price} G 購買「${av.name}」嗎？`)) {
                    state.coins -= av.price;
                    state.unlockedAvatars.push(av.id);
                    window.orchestrator.saveGame();
                    this.updateTopBarCoins(); // 更新左上角金幣
                    this.openAvatarShop(); // 重新渲染商店
                    alert('購買成功！可以在地圖中按 [Tab] 切換角色。');
                }
            };
        } else if (!isUnlocked) {
            card.onclick = () => alert('金幣不足！');
        }
        itemsContainer.appendChild(card);
    });
    
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.remove('sys-overlay-hide');
    overlay.classList.add('sys-overlay-show');
};

UIManager.prototype.closeAvatarShop = function() {
    const overlay = document.getElementById('avatar-shop-overlay');
    if(!overlay) return;
    overlay.classList.remove('sys-overlay-show');
    overlay.classList.add('sys-overlay-hide');
    setTimeout(() => {
        if(overlay.classList.contains('sys-overlay-hide')) {
            overlay.style.display = 'none';
        }
    }, 200);
};
