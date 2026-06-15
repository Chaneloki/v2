/**
 * 自由模式任務引擎 (Mission Engine)
 *
 * 負責：
 *  - 追蹤每條 window.FREE_MISSIONS 任務的目前階段 (state.missions)
 *  - 在 rpgEngine.interactWith(poi) 中派發符合目前階段的 POI 互動
 *  - 依照任務的 flow 陣列播放對話 / 自動串接後續站點
 *  - 內嵌 Excel 檢核點 (借用 SIMULATOR 階段，完成後返回 RPG 模式)
 *
 * 任務資料格式 (見 code/rpg/missions/training_records.js)：
 *   window.FREE_MISSIONS["<missionId>"] = {
 *     id, title, unlocksFlag,
 *     <stationKey>: [ ...對話陣列... ],   // 給 playRPGSequence 用
 *     flow: [
 *       { stage, lines: "<stationKey>", next, auto?, setFlags? },
 *       { stage, type: "excel", excelConfig, next },
 *       ...
 *     ]
 *   }
 *
 * POI 繫結：在 RPG_MAPS 的 poi 物件上加上
 *   mission: "<missionId>", missionStages: ["<stageId>", ...]
 * 互動時若任務目前階段在 missionStages 內，由本引擎接管 (回傳 true)。
 */
window.missionEngine = {

    /**
     * 取得 (或初始化) 某任務的存檔狀態
     * { stage: <目前階段id> | null, done: boolean }
     */
    getMissionState(missionId) {
        const orchestrator = window.orchestrator;
        const state = orchestrator.state;
        state.missions = state.missions || {};

        if (!state.missions[missionId]) {
            const def = window.FREE_MISSIONS && window.FREE_MISSIONS[missionId];
            const firstStage = def && def.flow && def.flow[0] ? def.flow[0].stage : null;
            state.missions[missionId] = { stage: firstStage, done: false };
        }
        return state.missions[missionId];
    },

    getStage(missionId) {
        return this.getMissionState(missionId).stage;
    },

    /**
     * 由 rpgEngine.interactWith(poi) 呼叫。
     * 若此 POI 屬於某個任務，且任務目前階段就是這個 POI 能觸發的階段，
     * 則播放該階段並回傳 true (呼叫端應直接 return，不要再走一般 POI 邏輯)。
     * 否則回傳 false，讓一般 POI 邏輯 (含 requiresFlag) 繼續處理。
     */
    tryInteract(poi) {
        const missionId = poi.mission;
        const def = window.FREE_MISSIONS && window.FREE_MISSIONS[missionId];
        if (!def) return false;

        const mState = this.getMissionState(missionId);
        if (mState.done || !mState.stage) return false;

        if (!poi.missionStages || !poi.missionStages.includes(mState.stage)) return false;

        this.runStage(missionId, mState.stage);
        return true;
    },

    /**
     * 執行指定階段：播放對話或啟動 Excel 任務，完成後自動推進到下一階段。
     * 若下一階段標記了 auto:true (無需玩家互動)，會接著自動執行。
     */
    runStage(missionId, stageId) {
        const def = window.FREE_MISSIONS[missionId];
        const stage = def.flow.find(f => f.stage === stageId);
        if (!stage) {
            console.warn(`[MissionEngine] 找不到階段: ${missionId}.${stageId}`);
            return;
        }

        if (stage.type === 'excel') {
            this.launchExcelTask(stage.excelConfig, () => this.advance(missionId, stage));
            return;
        }

        const lines = def[stage.lines];
        if (!lines) {
            console.warn(`[MissionEngine] 找不到對話內容: ${missionId}.${stage.lines}`);
            this.advance(missionId, stage);
            return;
        }

        window.rpgEngine.playRPGSequence(lines, () => this.advance(missionId, stage));
    },

    /**
     * 套用本階段的 setFlags，並把任務狀態推進到 stage.next。
     * 若下一階段是 auto:true，立刻接著執行；否則等待玩家走到下一個 POI。
     */
    advance(missionId, stage) {
        const orchestrator = window.orchestrator;
        const state = orchestrator.state;
        const mState = this.getMissionState(missionId);

        if (stage.setFlags) {
            state.flags = state.flags || {};
            stage.setFlags.forEach(flagId => { state.flags[flagId] = true; });
        }

        if (!stage.next) {
            mState.stage = null;
            mState.done = true;
            orchestrator.saveGame();
            return;
        }

        mState.stage = stage.next;
        orchestrator.saveGame();

        const def = window.FREE_MISSIONS[missionId];
        const nextStage = def.flow.find(f => f.stage === stage.next);
        if (nextStage && nextStage.auto) {
            this.runStage(missionId, nextStage.stage);
        }
    },

    /**
     * 暫時離開 RPG 模式，借用 SIMULATOR 階段執行一個內嵌的 Excel 檢核點。
     * 完成所有 tasks 後自動還原 RPG 模式並呼叫 onDone()。
     * 改編自 rpg_interactions.js 的 jumpToTrainingStage。
     */
    launchExcelTask(excelConfig, onDone) {
        const orchestrator = window.orchestrator;
        const state = orchestrator.state;
        const rpg = window.rpgEngine;

        // 備份目前狀態，結束後還原
        this._excelBackup = {
            rpgMapId: rpg.currentMapId,
            rpgX: rpg.state.x,
            rpgY: rpg.state.y,
            isPractice: state.isPractice,
            realChapter: state.realChapter,
            activeChapterModule: state.activeChapterModule,
            currentPhase: state.currentPhase,
            sheets: state.sheets,
            sheetNames: state.sheetNames,
            formulas: state.formulas,
            cellStyles: state.cellStyles,
            activeSheetId: state.activeSheetId,
            currentTaskIndex: state.currentTaskIndex,
            currentStoryIndex: state.currentStoryIndex,
            activeStoryType: state.activeStoryType,
            activeStoryKey: state.activeStoryKey,
            hasPlayedMidStory: state.hasPlayedMidStory,
            selectedCell: state.selectedCell,
            selectedRange: state.selectedRange,
            origNext: orchestrator.next.bind(orchestrator)
        };

        state.isPractice = true;
        rpg.stop();
        if (window.uiManager) window.uiManager.hideOverlay();
        const gameMain = document.getElementById('game-main');
        if (gameMain) gameMain.classList.remove('in-story');

        // 建立一個臨時的「章節模組」，只用來驅動 SIMULATOR 階段
        state.resetChapterData();
        state.activeChapterModule = {
            meta: { sheetName: excelConfig.sheetName || '任務檔案' },
            story: {},
            initialGridData: excelConfig.gridData,
            simulator: { mode: 'GUIDED', tasks: excelConfig.tasks }
        };
        state.sheets = { 'st-1': JSON.parse(JSON.stringify(excelConfig.gridData)) };
        state.sheetNames = { 'st-1': excelConfig.sheetName || '任務檔案' };

        // 攔截「全部任務完成」的流程：
        // nextTask() 在 currentTaskIndex 超出 tasks.length 時會呼叫 orchestrator.next()，
        // 我們暫時覆寫 next() 讓它改為還原 RPG 模式並觸發 onDone()。
        orchestrator.next = () => {
            this.finishExcelTask(onDone, true);
        };

        orchestrator.triggerPhase('SIMULATOR');
        this._injectExcelExitButton();
    },

    /**
     * 還原 RPG 模式，把臨時的 Excel 任務狀態清掉。
     * completed=true 表示任務完成 (呼叫 onDone)；false 表示玩家提早退出 (不推進任務)。
     */
    finishExcelTask(onDone, completed) {
        const orchestrator = window.orchestrator;
        const state = orchestrator.state;
        const rpg = window.rpgEngine;
        const backup = this._excelBackup;
        if (!backup) return;

        orchestrator.next = backup.origNext;

        state.isPractice = backup.isPractice;
        state.realChapter = backup.realChapter;
        state.activeChapterModule = backup.activeChapterModule;
        state.currentPhase = 'RPG_MODE';
        state.sheets = backup.sheets;
        state.sheetNames = backup.sheetNames;
        state.formulas = backup.formulas;
        state.cellStyles = backup.cellStyles;
        state.activeSheetId = backup.activeSheetId;
        state.currentTaskIndex = backup.currentTaskIndex;
        state.currentStoryIndex = backup.currentStoryIndex;
        state.activeStoryType = backup.activeStoryType;
        state.activeStoryKey = backup.activeStoryKey;
        state.hasPlayedMidStory = backup.hasPlayedMidStory;
        state.selectedCell = backup.selectedCell;
        state.selectedRange = backup.selectedRange;

        const exitBtn = document.getElementById('mission-excel-exit-btn');
        if (exitBtn) exitBtn.remove();

        rpg.start(backup.rpgMapId || 'street');
        rpg.state.x = backup.rpgX;
        rpg.state.y = backup.rpgY;

        orchestrator.saveGame();
        this._excelBackup = null;

        if (completed && onDone) onDone();
    },

    /**
     * 注入懸浮「退出檢核」按鈕，讓玩家可以提早離開 (不會推進任務進度)。
     */
    _injectExcelExitButton() {
        const oldBtn = document.getElementById('mission-excel-exit-btn');
        if (oldBtn) oldBtn.remove();

        const exitBtn = document.createElement('button');
        exitBtn.id = 'mission-excel-exit-btn';
        exitBtn.style.position = 'fixed';
        exitBtn.style.bottom = '15px';
        exitBtn.style.left = '15px';
        exitBtn.style.zIndex = '99999';
        exitBtn.style.padding = '12px 20px';
        exitBtn.style.background = 'linear-gradient(135deg, #8b1e0f, #a02818)';
        exitBtn.style.border = '2px solid #ffd700';
        exitBtn.style.borderRadius = '30px';
        exitBtn.style.color = '#ffd700';
        exitBtn.style.fontWeight = 'bold';
        exitBtn.style.cursor = 'pointer';
        exitBtn.style.fontSize = '14px';
        exitBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
        exitBtn.style.transition = '0.2s';
        exitBtn.innerText = '🔙 暫停任務，返回城鎮';
        exitBtn.onclick = () => this.finishExcelTask(null, false);
        exitBtn.onmouseover = () => {
            exitBtn.style.background = '#a02818';
            exitBtn.style.transform = 'scale(1.05)';
        };
        exitBtn.onmouseout = () => {
            exitBtn.style.background = '#8b1e0f';
            exitBtn.style.transform = 'none';
        };

        document.body.appendChild(exitBtn);
    }
};
