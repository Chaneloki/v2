/**
 * 試算表魔法冒險 v2 - 核心引擎總控 (v45 行為驅動版)
 */

class GameState {
    constructor() {
        this.currentChapter = 10;
        this.currentPhase = 'STORY_START'; 
        this.currentStoryIndex = 0; // [新增]: 逐行存檔點
        this.activeStoryType = null; // [新增]: 當前故事類型 ('PHASE' | 'SEGMENT')
        this.activeStoryKey = null;  // [新增]: 當前劇情片段 Key
        this.sheets = {}; // { [sheetId]: gridData }
        this.sheetNames = {}; // { [sheetId]: label }
        this.formulas = {}; // [新增]: { [sheetId]: { [cellId]: formulaString } }
        this.activeSheetId = 'st-1';
        this.cellStyles = {}; // { [cellId]: { CSS props } }
        this.unlockedSkills = [];
        this.coins = 1000;
        
        // 互動狀態
        this.selectedCell = { r: 0, c: 0 };
        this.selectedRange = { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
        this.isSelecting = false;
        
        this.currentTaskIndex = 0;
        this.hasPlayedMidStory = false;
        
        this.playerConfig = { gender: 'girl' };
        this.activeChapterModule = null;
        this.multiSelectedCells = []; // [新增]: 支援非連續選取 (如定位空格)
        
        // RPG 狀態
        this.rpgMapId = 'my_room';
        this.rpgX = null;
        this.rpgY = null;
        this.flags = {}; // 劇情與地圖解鎖進度
        this.isFilterActive = false; // [新增]: 紀錄是否開啟篩選模式 (顯示漏斗箭頭)
        this.isOutlineVisible = false; // [新增]: 支援小計後的大綱按鈕
        this.editingCell = null; // [新增]: 追蹤當前正在編輯的儲存格 (用於公式點選)
        
        // [新增]: 角色切換狀態
        this.unlockedAvatars = ['main'];
        this.currentAvatar = 'main';

        // [新增]: 自由模式任務進度 { [missionId]: { stage, done } }
        this.missions = {};
    }

    get gridData() {
        return this.sheets[this.activeSheetId] || [];
    }

    resetChapterData() {
        this.activeSheetId = 'st-1';
        this.sheets = {};
        this.sheetNames = {};
        this.formulas = {};
        this.cellStyles = {};
        this.currentTaskIndex = 0;
        this.currentStoryIndex = 0;
        this.activeStoryType = null;
        this.activeStoryKey = null;
        this.hasPlayedMidStory = false;
        this.isSelecting = false;
        this.selectedCell = { r: 0, c: 0 };
        this.selectedRange = { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
        this.multiSelectedCells = [];
        this.isFormatPainting = false;
        this.isDraggingCol = false;
        this.isDraggingFill = false;
        this.isFilterActive = false;
        this.isOutlineVisible = false;
        this.isFrozen = false;
    }
}

class Orchestrator {
    constructor() {
        this.state = new GameState();
        this.eventBus = new EventTarget();
        this.skillDefs = {}; // 會由章節模組填充
        
        // 判定條件處理器
        this.conditionHandlers = {
            'SCROLL_CHECK': (cond) => {
                const wrapper = document.getElementById('wrapper');
                return wrapper && wrapper.scrollTop >= (cond.minScroll || 10);
            },
            'ACTION': (cond, signal) => {
                const isMatch = signal && signal.type === 'ACTION' && signal.id === cond.actionId;
                if (!isMatch) return false;
                // [優化]: 優先檢查信號中的 col，若無則檢查當前選取格
                if (cond.col !== undefined) {
                    const actualCol = (signal.col !== undefined) ? signal.col : this.state.selectedCell.c;
                    return actualCol === cond.col;
                }
                return true;
            },
            'CELL_VALUE': (cond) => {
                const data = this.state.gridData;
                const v = data[cond.r] ? data[cond.r][cond.c] : "";
                // #21 快取編譯好的 RegExp，避免每次條件判斷都重建
                if (cond.regex) {
                    if (!cond._cachedRegex) cond._cachedRegex = new RegExp(cond.regex);
                    return cond._cachedRegex.test(v);
                }
                return v === cond.value;
            },
            'MATRIX_COLUMN_CONTENT': (cond) => {
                const data = this.state.gridData;
                return data[0] && data[0][cond.colIdx] === cond.expectedTitle;
            }
        };
    }

    get ChapterSequence() { return ["10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "60", "65", "70", "75", "80", "85"]; }

    async init() {
        console.log("Orchestrator: Initializing...");

        // [Fix 2026-06-21] 番外篇解鎖旗標 magic_excel_v2_extras_unlocked 與一般存檔
        // 一樣存在 localStorage 裡，因此 Ch8.5「無所謂了」結局的 localStorage.clear()
        // 會把它一併清掉——這是刻意保留的行為：選擇「無所謂了」代表玩家放棄了這條
        // 故事線，番外篇與小型試煉應該跟著鎖回去，即便先前已經解鎖過也一樣。
        // 不要在這裡把旗標補回來。

        // 1. 初始化渲染器 (關鍵修正：否則表格不顯示)
        if (window.gridRenderer) window.gridRenderer.init();

        // 2. 預設載入目前章節
        await this.loadChapter(this.state.currentChapter);
        
        // 3. 啟動預載入 (針對下一章節)
        this.preloadNextChapterAssets();
        
        // 4. 啟動流程 (注意：原本是 auto startFlow，現配合 v45 改由 UI 按鈕啟動)
    }

    /**
     * [性能優化]: 預載入策略 (Preloading)
     * 利用 requestIdleCallback 在瀏覽器空閒時下載下一章資源
     */
    preloadNextChapterAssets() {
        if (!window.requestIdleCallback) return;

        const seq = this.ChapterSequence;
        const currentIdx = seq.indexOf(this.state.currentChapter.toString());
        const nextChapterId = seq[currentIdx + 1];

        if (!nextChapterId) return;

        requestIdleCallback(() => {
            console.log(`🚀 [Preloader] 偵測到閒置，開始預載入 Ch ${nextChapterId} 資源...`);
            
            // 嘗試載入模組 (如果尚未載入)
            const module = window.V2_CHAPTERS[nextChapterId];
            if (!module) return;

            // 1. 提取所有背景圖與 CG
            const assets = new Set();
            const extractAssets = (lines) => {
                if (!lines) return;
                lines.forEach(line => {
                    if (line.bg) {
                        const path = line.bg.includes('/') ? line.bg : `BG/${line.bg}`;
                        assets.add(path);
                    }
                    if (line.bgm) assets.add(`BGM/${line.bgm}`);
                    
                    // [新增] 提取音效並預載入 (包含性別處理)
                    if (line.se) {
                        if (line.se.startsWith('me_')) {
                            const baseName = line.se.substring(3);
                            assets.add(`sound_effect/boy_${baseName}`);
                            assets.add(`sound_effect/girl_${baseName}`);
                        } else {
                            assets.add(`sound_effect/${line.se}`);
                        }
                    }
                });
            };

            extractAssets(module.story?.start);
            extractAssets(module.story?.end);
            Object.values(module.story || {}).forEach(extractAssets);
            if (module.simulator?.bgm) assets.add(`BGM/${module.simulator.bgm}`);

            // 2. 執行非阻塞下載
            assets.forEach(url => {
                if (url.endsWith('.mp3')) {
                    const audio = new Audio();
                    audio.src = url;
                    audio.preload = "auto";
                } else {
                    const img = new Image();
                    img.src = url;
                }
            });
            console.log(`✅ [Preloader] 已預載入 ${assets.size} 個資源項。`);
        }, { timeout: 2000 });
    }

    async loadChapter(chapterId) {
        const chapterModule = window.V2_CHAPTERS[chapterId];
        if (!chapterModule) {
            console.error(`[Orchestrator] 找不到章節模組: ${chapterId}`);
            return;
        }

        this.state.activeChapterModule = chapterModule;

        // [新增] 玩家抵達 Ch8.5 即永久解鎖番外篇入口旗標（與主存檔分開存放）
        if (chapterId && chapterId.toString() === '85') {
            localStorage.setItem('magic_excel_v2_extras_unlocked', 'true');
        }

        // 只有在非「載入存檔」的情況下才重置所有數據
        if (!this._isLoadingFromSave) {
            this.state.resetChapterData();
            this.state.currentPhase = 'STORY_START';
        }
        
        if (chapterModule.customConditionHandlers) {
            Object.assign(this.conditionHandlers, chapterModule.customConditionHandlers);
        }

        if (chapterModule.initialGridData) {
            // [關鍵修正]: 如果不是載入存檔，則強制寫入新章節數據，確保舊數據不殘留
            if (!this._isLoadingFromSave) {
                this.state.sheets = {
                    "st-1": JSON.parse(JSON.stringify(chapterModule.initialGridData))
                };
                this.state.sheetNames = {
                    "st-1": chapterModule.meta?.sheetName || "🛡️ 裝備清單"
                };
            }
        }
        
        if (chapterModule.skillDefs) {
            Object.assign(this.skillDefs, chapterModule.skillDefs);
        }

        const nTitle = document.getElementById('notice-title');
        if (nTitle && chapterModule.meta) nTitle.innerText = chapterModule.meta.title;

        // [Fix 2026-06-19] 章節切換時清除上一章遺留的輪播 interval，防止背景持續耗電
        if (window.uiManager?.bgSlideshowInterval) {
            clearInterval(window.uiManager.bgSlideshowInterval);
            window.uiManager.bgSlideshowInterval = null;
            window.uiManager.currentSlideshow = null;
        }

        this.emit('chapterLoaded', { chapterId });

        // 載入當前章節後，啟動下一章預載
        this.preloadNextChapterAssets();
    }

    /**
     * [新增]: 多槽位存檔邏輯 (支援 auto, manual_1, manual_2)
     */
    saveGame(slotType = 'auto') {
        // 禁術回顧模式只是借用章節資料展示教學片段，禁止寫入存檔覆蓋玩家真實進度
        if (this.state._isReplayMode) return;
        // [性能優化]: 使用 debounce 非同步處理存檔，避免阻塞 UI (no lag)
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        
        this._saveTimeout = setTimeout(() => {
            const saveData = {
                currentChapter: this.state.currentChapter,
                currentPhase: this.state.currentPhase,
                currentStoryIndex: this.state.currentStoryIndex, 
                activeStoryType: this.state.activeStoryType,
                activeStoryKey: this.state.activeStoryKey,
                currentTaskIndex: this.state.currentTaskIndex,
                unlockedSkills: this.state.unlockedSkills,
                coins: this.state.coins,
                playerConfig: this.state.playerConfig,
                sheets: this.state.sheets,
                sheetNames: this.state.sheetNames,
                activeSheetId: this.state.activeSheetId,
                cellStyles: this.state.cellStyles,
                rpgMapId: this.state.rpgMapId,
                rpgX: this.state.rpgX,
                rpgY: this.state.rpgY,
                flags: this.state.flags,
                unlockedAvatars: this.state.unlockedAvatars,
                currentAvatar: this.state.currentAvatar,
                missions: this.state.missions,
                timestamp: new Date().getTime()
            };
            
            // 相容舊版存檔鍵值
            const key = slotType === 'auto' ? 'magic_excel_v2_save' : `magic_excel_v2_save_${slotType}`;
            localStorage.setItem(key, JSON.stringify(saveData));
            
            // [性能優化]: 獨立寫入輕量 MetaData，讓存檔選單一秒開啟不卡頓
            const metaKey = `${key}_meta`;
            const metaData = {
                chapter: saveData.currentChapter,
                coins: saveData.coins,
                timestamp: saveData.timestamp
            };
            localStorage.setItem(metaKey, JSON.stringify(metaData));
            
            console.log(`💾 [Orchestrator] 存檔完成 (${slotType})`);
        }, 500); // 延遲 500ms 合併存檔請求
    }

    /**
     * [新增]: 讀取所有存檔槽位的 Metadata 供 UI 顯示
     */
    getSaveMeta() {
        const slots = ['auto', 'manual_1', 'manual_2'];
        const meta = {};
        
        slots.forEach(slot => {
            const key = slot === 'auto' ? 'magic_excel_v2_save' : `magic_excel_v2_save_${slot}`;
            const metaKey = `${key}_meta`;
            
            // 1. [性能優化]: 優先讀取輕量 MetaData，避免 Parse MB 級距的舊存檔導致卡頓
            const rawMeta = localStorage.getItem(metaKey);
            if (rawMeta) {
                try {
                    meta[slot] = JSON.parse(rawMeta);
                    return; // 成功讀取輕量資料，跳過這一個槽位
                } catch(e) {}
            }
            
            // 2. 降級相容：如果是舊版存檔還沒有 meta，只能忍受一次卡頓讀取
            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    meta[slot] = {
                        chapter: data.currentChapter,
                        coins: data.coins,
                        timestamp: data.timestamp
                    };
                    // 順手自動補上 metaKey，下次打開秒進
                    localStorage.setItem(metaKey, JSON.stringify(meta[slot]));
                } catch(e) {
                    meta[slot] = null;
                }
            } else {
                meta[slot] = null;
            }
        });
        return meta;
    }

    /**
     * [修改]: 多槽位讀檔邏輯
     */
    async loadGame(slotType = 'auto') {
        if (this._isCurrentlyLoading) {
            console.warn("[Orchestrator] 已經在讀檔中，忽略重複請求。");
            return false;
        }
        
        const key = slotType === 'auto' ? 'magic_excel_v2_save' : `magic_excel_v2_save_${slotType}`;
        const raw = localStorage.getItem(key);
        if (!raw) return false;

        try {
            this._isCurrentlyLoading = true;
            const data = JSON.parse(raw);
            this._isLoadingFromSave = true; 
            
            this.state.currentChapter = data.currentChapter;
            this.state.currentPhase = data.currentPhase || 'STORY_START';
            this.state.currentStoryIndex = data.currentStoryIndex || 0;
            this.state.activeStoryType = data.activeStoryType || null; // [恢復]
            this.state.activeStoryKey = data.activeStoryKey || null;   // [恢復]
            this.state.currentTaskIndex = data.currentTaskIndex || 0;
            this.state.unlockedSkills = data.unlockedSkills || [];
            this.state.coins = data.coins || 0;
            this.state.playerConfig = data.playerConfig || { gender: 'girl' };
            
            if (data.sheets) this.state.sheets = data.sheets;
            if (data.sheetNames) this.state.sheetNames = data.sheetNames;
            if (data.activeSheetId) this.state.activeSheetId = data.activeSheetId;
            if (data.cellStyles) this.state.cellStyles = data.cellStyles;
            if (data.rpgMapId) this.state.rpgMapId = data.rpgMapId;
            if (data.rpgX !== undefined) this.state.rpgX = data.rpgX;
            if (data.rpgY !== undefined) this.state.rpgY = data.rpgY;
            if (data.flags) this.state.flags = data.flags;
            if (data.unlockedAvatars) this.state.unlockedAvatars = data.unlockedAvatars;
            if (data.currentAvatar) this.state.currentAvatar = data.currentAvatar;
            if (data.missions) this.state.missions = data.missions;

            await this.loadChapter(this.state.currentChapter);
            
            const overlay = document.getElementById('notice-overlay');
            if (overlay) overlay.style.display = 'none';
            
            console.log(`📖 [Orchestrator] 讀檔成功，恢復階段: ${this.state.currentPhase}, 行號: ${this.state.currentStoryIndex}`);
            
            // [關鍵優化]: 根據存檔中的故事狀態進行恢復
            if (this.state.activeStoryType === 'SEGMENT' && this.state.activeStoryKey) {
                // 如果存檔時正在進行劇情片段，先觸發基礎階段，再恢復片段
                this.triggerPhase(this.state.currentPhase, true); // 靜默觸發基礎階段
                this.playStorySegment(this.state.activeStoryKey);
            } else {
                this.triggerPhase(this.state.currentPhase);
            }
            
            this._isLoadingFromSave = false; 
            this._isCurrentlyLoading = false;
            return true;
        } catch (e) {
            console.error("讀取存檔失敗:", e);
            this._isLoadingFromSave = false;
            this._isCurrentlyLoading = false;
            return false;
        }
    }

    switchSheet(id) {
        if (this.state.activeSheetId === id) return;
        this.state.activeSheetId = id;
        this.emit('sheetSwitched', { id });
        if (window.gridRenderer) window.gridRenderer.render();
    }

    addSheet(id, data, label) {
        this.state.sheets[id] = data;
        this.state.sheetNames[id] = label; // [關鍵修正]: 儲存工作表名稱
        this.emit('sheetAdded', { id, label });
        this.switchSheet(id);
    }

    addCoins(amount) {
        this.state.coins += amount;
        this.emit('coinsChanged', { coins: this.state.coins });
        this.saveGame();
    }

    startFlow() { this.triggerPhase(this.state.currentPhase); }

    triggerPhase(phase) {
        this.state.currentPhase = phase;
        this.saveGame(); // [核心優化]: 階段切換時即刻存檔
        if (!this.state.activeChapterModule) return;
        const story = this.state.activeChapterModule.story || {};
        const simulator = this.state.activeChapterModule.simulator || {};

        if (phase === 'SIMULATOR') {
            // [核心規範]: 遊戲階段使用預設或專屬 BGM
            if (this.state.currentChapter.toString() === '85') {
                this.emit('playBGM', { file: 'rpg game_bgm.mp3' });
            } else {
                this.emit('playBGM', { file: 'game_bgm.mp3' });
            }
        } else {
            const lines = (phase === 'STORY_START') ? story.start : (phase === 'STORY_END' ? story.end : []);
            if (lines && lines.length > 0) {
                const firstBgmLine = lines.find(l => l.bgm);
                if (firstBgmLine) {
                    if (!this._isLoadingFromSave) this.emit('playBGM', { file: firstBgmLine.bgm });
                } else {
                    const cId = this.state.currentChapter.toString();
                    if (cId === "10") this.emit('playBGM', { file: 'story_bgm1.mp3' });
                    else if (cId === "15") this.emit('playBGM', { file: 'story_bgm1.5.mp3' });
                    else if (cId === "20") this.emit('playBGM', { file: 'story_bgm2.mp3' });
                    else if (cId === "25") this.emit('playBGM', { file: 'story_bgm2.5.mp3' });
                    else if (cId === "30") this.emit('playBGM', { file: 'story_bgm2.mp3' });
                    else if (cId === "35") this.emit('playBGM', { file: 'story_bgm2.5.mp3' });
                    else if (cId === "40") this.emit('playBGM', { file: 'begin.mp3' });
                    else if (cId === "45") this.emit('playBGM', { file: 'good friend.mp3' });
                    else if (cId === "50") this.emit('playBGM', { file: 'good friend.mp3' });
                }
            }
        }

        switch (phase) {
            case 'STORY_START': 
                this.emit('playStory', { type: 'PHASE', data: story.start }); 
                break;
            case 'SIMULATOR': 
                this.emit('startSimulator', { config: simulator, coins: this.state.coins }); 
                if (window.gridRenderer) window.gridRenderer.render();
                
                // [新增]: 啟動時播放第一項任務的引導劇情 (如有)
                // 禁術回顧模式會自行指定要播放的單一片段，需跳過此處的自動引導，避免兩段劇情搶播
                const firstTask = simulator.tasks?.[this.state.currentTaskIndex];
                if (firstTask && firstTask.storySegmentBefore && !this._isLoadingFromSave && !this.state._isReplayMode) {
                    this.playStorySegment(firstTask.storySegmentBefore);
                }
                break;
            case 'STORY_END': 
                this.addCoins(this.state.activeChapterModule.meta.reward || 0);
                this.unlockAllChapterSkills(); // [新增]: 章節結束時自動補完解鎖所有技能
                this.emit('playStory', { type: 'PHASE', data: story.end }); 
                break;
            case 'RPG_MODE':
                if (window.rpgEngine) {
                    if (this.state.rpgX !== null && this.state.rpgY !== null) {
                        window.rpgEngine.start(this.state.rpgMapId || "my_room");
                        window.rpgEngine.state.x = this.state.rpgX;
                        window.rpgEngine.state.y = this.state.rpgY;
                    } else {
                        window.rpgEngine.start(this.state.rpgMapId || "my_room");
                    }
                }
                break;
        }
    }

    /**
     * [新增]: 自動解鎖當前章節模組中定義的所有技能
     */
    unlockAllChapterSkills() {
        if (!this.state.activeChapterModule || !this.state.activeChapterModule.simulator) return;
        const tasks = this.state.activeChapterModule.simulator.tasks || [];
        tasks.forEach(task => {
            if (task.unlockSkillId) {
                this.unlockSkill(task.unlockSkillId);
            }
        });
    }

    validateStateChange(externalSignal) {
        if (this.state.currentPhase !== 'SIMULATOR') return;

        if (this.state.isFormatPainting) {
            const range = this.state.selectedRange;
            if (range && range.minRow === 3 && range.maxRow === 9 && range.minCol === 0 && range.maxCol === 4) {
                console.log("[Orchestrator] 格式刷目標範圍正確，開始拓印樣式");
                const sourceRow = this.state.formatPainterSource.r;
                for (let r = range.minRow; r <= range.maxRow; r++) {
                    for (let c = range.minCol; c <= range.maxCol; c++) {
                        const sourceId = String.fromCharCode(65 + c) + (sourceRow + 1);
                        const targetId = String.fromCharCode(65 + c) + (r + 1);
                        if (this.state.cellStyles[sourceId]) {
                            this.state.cellStyles[targetId] = { ...this.state.cellStyles[sourceId] };
                        }
                    }
                }
                this.state.isFormatPainting = false;
                if (window.gridRenderer) window.gridRenderer.render();
                this.validateAction("FORMAT_PAINTER");
                return;
            }
            // [Fix] 玩家拖選了明顯完整的 2D 範圍但位置錯誤 → 顯示失敗提示
            const is2DRange = range && (range.maxRow > range.minRow) && (range.maxCol > range.minCol);
            if (is2DRange) {
                this.playStorySegment('fail_FORMAT_wrong_target');
            }
            return;
        }
        
        const tasks = this.state.activeChapterModule.simulator.tasks;
        const currentTask = tasks[this.state.currentTaskIndex];

        if (currentTask && this.checkCondition(currentTask.expectedCondition, externalSignal)) {
            console.log(`🎯 [Orchestrator] 任務完成: ${currentTask.id}`);
            const finishTask = () => {
                if (currentTask.unlockSkillId) {
                    this.unlockSkill(currentTask.unlockSkillId);
                }

                // [優化順序]: 先播成功回饋 (storySegmentAfter)，再播劇情推進 (midStoryAfter)
                const playMidStory = () => {
                    if (currentTask.midStoryAfter) {
                        this.state.hasPlayedMidStory = true;
                        this.playStorySegment(currentTask.midStoryAfter, () => {
                            if (currentTask.onMidStoryComplete) currentTask.onMidStoryComplete();
                            this.nextTask();
                        });
                    } else {
                        this.nextTask();
                    }
                };

                if (currentTask.storySegmentAfter) {
                    this.playStorySegment(currentTask.storySegmentAfter, playMidStory);
                } else {
                    playMidStory();
                }
            };
            
            // 全域章節中點劇情 (僅針對未定義 midStoryAfter 的任務)
            const midPointIndex = Math.floor(tasks.length / 2);
            if (!this.state.hasPlayedMidStory && this.state.currentTaskIndex === midPointIndex && !currentTask.midStoryAfter) {
                this.state.hasPlayedMidStory = true;
                this.playStorySegment('mid_story', finishTask);
            } else {
                finishTask();
            }
        }
    }

    validateAction(actionId) {
        this.validateStateChange({ type: 'ACTION', id: actionId });
    }

    checkCondition(cond, signal) {
        if (!cond) return false;
        const handler = this.conditionHandlers[cond.type];
        if (handler) return handler(cond, signal);
        return false;
    }

    unlockSkill(id) {
        if (this.state.unlockedSkills.includes(id)) return;
        this.state.unlockedSkills.push(id);
        const skill = this.skillDefs[id];
        this.emit('skillUnlocked', { id, skill });
        this.saveGame();
    }

    playStorySegment(key, cb) {
        const seg = this.state.activeChapterModule.story[key];
        if (!seg) { if(cb) cb(); return; }
        
        // [修正]: 除非有明確背景更換 (bg)，否則預設走 SEGMENT (側邊欄小氣泡)
        const hasBG = seg.some(line => line.bg);
        const type = hasBG ? 'PHASE' : 'SEGMENT';

        console.log(`🎬 [Orchestrator] 播放片段: ${key}, 模式: ${type}`);
        this.emit('playStory', { type, data: seg, onComplete: cb });
    }

    nextTask() {
        const tasks = this.state.activeChapterModule.simulator.tasks;
        this.state.currentTaskIndex++;
        this.saveGame(); // 自動存檔新進度
        if (this.state.currentTaskIndex >= tasks.length) {
            this.next();
        } else {
            const nextTask = tasks[this.state.currentTaskIndex];
            // [新增]: 任務切換時播放引導劇情 (如有)
            if (nextTask && nextTask.storySegmentBefore) {
                this.playStorySegment(nextTask.storySegmentBefore);
            }
            this.emit('taskChanged', { task: nextTask });
        }
    }

    next() {
        const flow = ['STORY_START', 'SIMULATOR', 'STORY_END'];
        const currentIdx = flow.indexOf(this.state.currentPhase);
        const nextIdx = currentIdx + 1;
        if (nextIdx < flow.length) {
            this.triggerPhase(flow[nextIdx]); // #16 triggerPhase 內已呼叫 saveGame，移除重複調用
        } else if (this.state.currentPhase === 'STORY_END' || this.state.currentPhase === 'RPG_MODE') {
            // ch8.5 完結後直接進入通關結算
            if (this.state.currentChapter.toString() === '85') {
                this.loadNextChapter();
                return;
            }
            this.state.currentPhase = 'RPG_MODE'; // Ensure phase is explicitly RPG_MODE
            this.saveGame();
            if (window.rpgEngine) {
                // 如果有紀錄的 RPG 座標，就載入該地圖與座標
                if (this.state.rpgX !== null && this.state.rpgY !== null) {
                    window.rpgEngine.start(this.state.rpgMapId || "my_room");
                    // 覆蓋 spawnPoint
                    window.rpgEngine.state.x = this.state.rpgX;
                    window.rpgEngine.state.y = this.state.rpgY;
                } else {
                    window.rpgEngine.start(this.state.rpgMapId || "my_room");
                }
            } else {
                this.loadNextChapter();
            }
        }
    }



    async loadNextChapter() {
        const seq = this.ChapterSequence;
        const currentIdx = seq.indexOf(this.state.currentChapter.toString());
        const nextIdx = currentIdx + 1;
        if (nextIdx < seq.length) {
            const nextId = seq[nextIdx];
            // 檢查下一個章節是否已定義，若未定義則視為通關
            if (!window.V2_CHAPTERS[nextId]) {
                this.handleGameComplete();
                return;
            }
            this.state.currentChapter = nextId;
            await this.loadChapter(this.state.currentChapter);
            this.saveGame(); // 存檔新章節狀態
            this.startFlow();
        } else {
            this.handleGameComplete();
        }
    }



    handleGameComplete() {
        // [Fix 2026-06-21] 原本依賴的 #notice-overlay/#notice-title/#notice-content/#notice-btn
        // 在 game.html 中根本不存在，導致一定會落入 else 分支跳出原生 alert()，
        // 玩家因此完全沒看到「前往番外篇與小型試煉」的入口。改為自行動態建立彈窗 DOM。
        let overlay = document.getElementById('game-complete-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'game-complete-overlay';
            overlay.style.cssText =
                'display:none;position:fixed;inset:0;z-index:30000;' +
                'background:rgba(0,0,0,0.75);align-items:center;justify-content:center;';
            overlay.innerHTML =
                '<div style="background:linear-gradient(145deg,#1a0f0a,#2a1a10);' +
                'border:2px solid rgba(255,215,0,0.6);border-radius:14px;padding:32px 30px;' +
                'max-width:min(440px,90vw);box-shadow:0 0 40px rgba(0,0,0,0.7);text-align:center;">' +
                '<h2 style="color:#ffd700;margin:0 0 14px;font-size:1.3rem;">🎉 恭喜！冒險暫告一段落</h2>' +
                '<div id="game-complete-content"></div>' +
                '</div>';
            document.body.appendChild(overlay);
        }

        const content = document.getElementById('game-complete-content');
        content.innerHTML = `
            <div style="text-align:center; color:#e8d5a3;">
                <p style="font-size:18px; margin:0 0 8px;">您已完成了目前開放的所有章節！</p>
                <p style="margin:0 0 8px;">您的數據禁術已經達到了巔峰等級。</p>
                <p style="color:#9be8a5; font-weight:bold; margin:10px 0;">總獲取金幣：${this.state.coins} G</p>
                <hr style="border:1px dashed rgba(255,215,0,0.3); margin:20px 0;">
                <button id="game-complete-extras-btn" style="width:100%; padding:12px 24px; border-radius:8px; border:1px solid rgba(255,215,0,0.6); background:rgba(255,215,0,0.18); color:#ffd700; font-weight:bold; cursor:pointer; margin-bottom:8px; font-size:0.95rem;">🌙 前往番外篇與小型試煉</button>
                <p style="font-size:12px; color:#dfb56c; margin:0 0 12px;">下次想再回來，也可以隨時點擊系統選單（⚙️）裡的 🌙 月亮圖示進入！</p>
                <button id="game-complete-restart-btn" style="width:100%; padding:10px 24px; border-radius:8px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.08); color:#ccc; cursor:pointer; margin-bottom:12px;">✨ 回到起點重新挑戰</button>
                <p style="font-size:12px; color:#999;">（敬請期待後續更多精彩章節）</p>
            </div>
        `;

        document.getElementById('game-complete-extras-btn').onclick = () => {
            window.location.href = 'extras.html';
        };
        document.getElementById('game-complete-restart-btn').onclick = () => {
            localStorage.removeItem('magic_excel_v2_save');
            window.location.reload();
        };

        overlay.style.display = 'flex';
    }

    start() {
        const overlay = document.getElementById('notice-overlay');
        if (overlay) overlay.style.display = 'none';
        this.startFlow();
    }

    /**
     * [新增]: 處理儲存格編輯後的邏輯 (支援反向教學與隱藏獎勵)
     */
    handleCellEdit(rIdx, cIdx, oldValue, newValue) {
        const chapter = this.state.currentChapter.toString();

        // --- Ch 7 專屬邏輯：公式解析與驗證 ---
        if (chapter === "70" || chapter === "75") {
            if (window.ch7Actions && window.ch7Actions.handleFormula) {
                window.ch7Actions.handleFormula(rIdx, cIdx, newValue);
            } else {
                this._handleCh7Formula(rIdx, cIdx, newValue);
            }
            return; 
        }

        // --- Ch 8 專屬邏輯：公式解析與驗證 ---
        if (chapter === "80") {
            if (window.ch8Actions && window.ch8Actions.handleFormula) {
                window.ch8Actions.handleFormula(rIdx, cIdx, newValue);
            }
            return; 
        }

        // --- Ch 8.5 專屬邏輯：公式解析與驗證 ---
        if (chapter === "85") {
            if (window.ch85Actions && window.ch85Actions.handleFormula) {
                window.ch85Actions.handleFormula(rIdx, cIdx, newValue);
            }
            return; 
        }

        const isCh50 = chapter === "50";
        const isCh55 = chapter === "55";

        if (!isCh50 && !isCh55) return;
        if (!this.state.ch5_validation_active) return;

        // 針對 數量 欄位的編輯 (50: D欄[3], 55: E欄[4])
        const qtyCol = isCh50 ? 3 : 4;
        const catCol = isCh50 ? 2 : 3;
        const hhCol = isCh50 ? 1 : 2;

        if (cIdx === qtyCol) {
            const num = parseInt(newValue);
            const row = this.state.gridData[rIdx];
            const isSubtotal = row && (
                (row[catCol] && row[catCol].includes("總計")) || 
                (row[hhCol] && row[hhCol].includes("小計")) ||
                (row[catCol] === "總計")
            );

            if (isSubtotal) {
                // 情境：編輯小計列
                this.playStorySegment("bonus_VALIDATION_subtotal");
                // 恢復原值 (小計格不可隨意手動改)
                this.state.gridData[rIdx][cIdx] = oldValue;
                if (window.gridRenderer) window.gridRenderer.render();
            } else if (!isNaN(num)) {
                if (num > 50) {
                    // 情境：輸入無效數據 (>50)
                    this.playStorySegment("bonus_VALIDATION_fail");
                    this.state.gridData[rIdx][cIdx] = oldValue;
                    if (window.gridRenderer) window.gridRenderer.render();
                } else {
                    // 情境：輸入有效數據 (1-50)，但提醒不要改真實帳目
                    this.playStorySegment("bonus_VALIDATION_ok");
                }
            }
        }
    }

    /**
     * [核心擴充]: Ch7 公式解析與驗證引擎
     */
    _handleCh7Formula(rIdx, cIdx, input) {
        const currentTask = this.state.activeChapterModule?.simulator?.tasks?.[this.state.currentTaskIndex];
        if (!currentTask) return;

        const val = input.toString().trim();
        const data = this.state.gridData;
        const taskId = currentTask.id;

        // 1. 檢查是否以 = 開頭
        if (!val.startsWith('=')) {
            if (taskId === "FORMULA_ARITH_TASK" || taskId === "ABS_REF_TASK" || taskId === "RANK_TASK" || taskId === "SUM_SKIP_TASK") {
                this.playStorySegment("fail_FORMULA_no_equal");
            }
            return;
        }

        const formula = val.substring(1).toUpperCase();

        // 2. 針對不同任務進行解析與反饋
        if (taskId === "FORMULA_ARITH_TASK") {
            // 預期公式：=D2+E2+F2 或 =D2*1+E2+F2
            if (cIdx !== 6) { // G 欄
                this.playStorySegment("fail_FORMULA_wrong_col");
                return;
            }
            const expectedRow = rIdx + 1; // e.g., rIdx 1 (第二行) 對應 D2
            const d = `D${expectedRow}`;
            const e = `E${expectedRow}`;
            const f = `F${expectedRow}`;
            
            if (formula === `${d}+${e}+${f}`) {
                // 模擬未轉數值的結果 (假設武試是文字)
                data[rIdx][cIdx] = "137"; // 故意給個錯的分數
                if (window.gridRenderer) window.gridRenderer.render();
                this.playStorySegment("fail_FORMULA_text_unhandled");
            } else if (formula === `${d}*1+${e}+${f}` || formula === `${d}+0+${e}+${f}`) {
                // 正確處理
                this._simulateDragFill(rIdx, cIdx, (r) => {
                    const wu = parseFloat(data[r][3]) || 0;
                    const wen = parseFloat(data[r][4]) || 0;
                    const ce = parseFloat(data[r][5]) || 0;
                    return wu + wen + ce;
                });
                this.validateAction("FORMULA_SUM_APPLY");
            }
        } 
        else if (taskId === "ABS_REF_TASK") {
            // 預期公式：=D2+E2+F2*$K$1
            if (formula.includes("K1") && !formula.includes("$K$1")) {
                this.playStorySegment("fail_ABS_NO_DOLLAR");
                return;
            }
            if (formula.includes("$") && !formula.includes("$K$1")) {
                this.playStorySegment("fail_ABS_WRONG_CELL");
                return;
            }
            
            const expectedRow = rIdx + 1;
            const d = `D${expectedRow}`, e = `E${expectedRow}`, f = `F${expectedRow}`;
            if (formula === `${d}+${e}+${f}*$K$1` || formula === `${d}*1+${e}+${f}*$K$1` || formula === `${d}+0+${e}+${f}*$K$1`) {
                this._simulateDragFill(rIdx, cIdx, (r) => {
                    const wu = parseFloat(data[r][3]) || 0;
                    const wen = parseFloat(data[r][4]) || 0;
                    const ce = parseFloat(data[r][5]) || 0;
                    return wu + wen + (ce * 1.5);
                });
                this.validateAction("ABS_REF_APPLY");
            }
        }
        else if (taskId === "RANK_TASK") {
            // 預期公式：=RANK(G2,$G$2:$G$21,0)
            if (formula.includes("G2:G21") && !formula.includes("$G$2:$G$21")) {
                this.playStorySegment("fail_RANK_no_abs");
                return;
            }
            if (formula.endsWith(",1)")) {
                this.playStorySegment("fail_RANK_wrong_order");
                return;
            }
            
            const expectedRow = rIdx + 1;
            if (formula === `RANK(G${expectedRow},$G$2:$G$21,0)`) {
                // 收集所有分數進行排名
                const scores = [];
                for(let r=1; r<=20; r++) scores.push(parseFloat(data[r][6]) || 0);
                const sorted = [...scores].sort((a,b) => b - a);
                
                this._simulateDragFill(rIdx, cIdx, (r) => {
                    const s = parseFloat(data[r][6]) || 0;
                    return sorted.indexOf(s) + 1;
                });
                this.validateAction("RANK_APPLY");
            }
        }
        else if (taskId === "SUM_SKIP_TASK") {
            // 預期公式：=SUM(D4,F4,D9,F9,D18,F18)
            const cleanFormula = formula.replace(/\s+/g, '');
            if (cleanFormula === "SUM(D4,E4,F4,D9,E9,F9,D18,E18,F18)") {
                this.playStorySegment("fail_SUM_WRONG_COL");
                return;
            }
            if (cleanFormula === "SUM(D3,F3,D8,F8,D17,F17)") {
                 this.playStorySegment("fail_SUM_WRONG_RANGE");
                 return;
            }
            
            if (cleanFormula === "SUM(D4,F4,D9,F9,D18,F18)") {
                // 計算總和 (id 3, 8, 17 在資料中是 index 3, 8, 17，因為第一行是標題，所以對應行數+1= 4, 9, 18)
                // 3(index3): 72+80=152
                // 8(index8): 92+58=150
                // 17(index17): 76+85=161
                // 總計: 463
                data[rIdx][cIdx] = "463";
                if (window.gridRenderer) window.gridRenderer.render();
                this.validateAction("SUM_NONCONTIG_APPLY");
            }
        }
    }

    /**
     * 模擬往下拖拉填滿 (為 Ch7 提供視覺反饋)
     */
    _simulateDragFill(startRow, cIdx, calcFn) {
        // #6 清除前一次未完成的填充動畫，防止多次觸發時 setInterval 堆疊
        if (this._fillIntervalId) {
            clearInterval(this._fillIntervalId);
            this._fillIntervalId = null;
        }

        const data = this.state.gridData;
        let r = startRow;

        const sourceRow = startRow - 1;
        const colLabel = String.fromCharCode(65 + cIdx);
        const sourceCellId = `${colLabel}${sourceRow + 1}`;
        const sourceFormula = this.state.formulas?.[this.state.activeSheetId]?.[sourceCellId];

        // 簡單的動畫效果，一格格填滿
        this._fillIntervalId = setInterval(() => {
            if (r > 20) {
                clearInterval(this._fillIntervalId);
                this._fillIntervalId = null;
                return;
            }
            data[r][cIdx] = calcFn(r);
            
            // [新增]: 拖拉填充公式自動平移
            if (sourceFormula) {
                const rowOffset = r - sourceRow;
                const shiftedFormula = sourceFormula.replace(/(\$?)([A-Za-z]+)(\$?)(\d+)/g, (match, p1, col, p3, row) => {
                    if (p3 === '$') return match; 
                    return p1 + col + p3 + (parseInt(row) + rowOffset);
                });
                if (!this.state.formulas) this.state.formulas = {};
                if (!this.state.formulas[this.state.activeSheetId]) this.state.formulas[this.state.activeSheetId] = {};
                const currentCellId = `${colLabel}${r + 1}`;
                this.state.formulas[this.state.activeSheetId][currentCellId] = shiftedFormula;
            }

            if (window.gridRenderer) window.gridRenderer.render();
            r++;
        }, 50);
    }

    /**
     * [新增]: 處理表頭點擊 (選取整欄) 的反向教學邏輯
     */
    handleHeaderClick(colIdx) {
        const chapter = this.state.currentChapter.toString();
        const isCh50 = chapter === "50";
        const isCh55 = chapter === "55";

        if (!isCh50 && !isCh55) return;
        const tasks = this.state.activeChapterModule?.simulator?.tasks;
        if (!tasks) return;
        const currentTask = tasks[this.state.currentTaskIndex];
        if (!currentTask) return;

        const qtyCol = isCh50 ? 3 : 4;

        if (currentTask.id === "SORT_TASK") {
            // 情境：排序任務中選取整欄 (錯誤做法)
            if (isCh50) this.playStorySegment("discovery_COLUMN_SELECT_SORT");
        } else if (currentTask.id === "VALIDATION_TASK" && colIdx === qtyCol) {
            // 情境：驗證任務中選取整欄 (正確且高明的做法)
            this.playStorySegment("discovery_COLUMN_SELECT_VALIDATION");
        }
    }

    // #22 在 init 時建立 skillId → {chId, taskIndex} 查表，避免 playSkillReplay 每次 O(chapters×tasks)
    _buildSkillReplayIndex() {
        this._skillReplayIndex = {};
        if (!window.V2_CHAPTERS) return;
        for (const chId of Object.keys(window.V2_CHAPTERS)) {
            const ch = window.V2_CHAPTERS[chId];
            if (!ch || !ch.simulator || !ch.simulator.tasks) continue;
            ch.simulator.tasks.forEach((task, taskIndex) => {
                if (task.unlockSkillId && !this._skillReplayIndex[task.unlockSkillId]) {
                    this._skillReplayIndex[task.unlockSkillId] = { chId, taskIndex };
                }
            });
        }
    }

    // [新增] 禁術大全專用：直接跳到該禁術誕生的確切章節與任務畫面 (任務提示本身就是操作教學，不需插播前後台詞鋪陳)
    async playSkillReplay(skillId) {
        const sModal = document.getElementById('s-modal');
        if (sModal) sModal.style.display = 'none';

        // 延遲建立索引（V2_CHAPTERS 需要在章節載入後才齊全）
        if (!this._skillReplayIndex) this._buildSkillReplayIndex();
        const entry = this._skillReplayIndex[skillId];

        if (!entry) {
            alert('這項禁術的教學回顧似乎遺失了！');
            if (sModal) sModal.style.display = 'block';
            return;
        }

        // 進入唯讀回顧模式：封鎖存檔，避免把這段暫時載入的章節覆寫到玩家的真實進度
        this.state._isReplayMode = true;
        this.state.currentChapter = entry.chId;
        await this.loadChapter(entry.chId);

        // 精確還原到該技能誕生的那一個任務 (loadChapter 會重置 currentTaskIndex，須在其後設定)
        this.state.currentTaskIndex = entry.taskIndex;
        this.triggerPhase('SIMULATOR');
        // 不主動插播劇情對白：玩家若真的在此操作成功，原有的 storySegmentAfter 仍會自然觸發顯示
    }

    emit(n, d) { this.eventBus.dispatchEvent(new CustomEvent(n, { detail: d })); }
    on(n, cb) {
        // #15 返回 remove 函數，讓呼叫方可在需要時取消訂閱，避免事件監聽器積累
        const handler = (e) => cb(e.detail);
        this.eventBus.addEventListener(n, handler);
        return () => this.eventBus.removeEventListener(n, handler);
    }
}

window.orchestrator = new Orchestrator();
