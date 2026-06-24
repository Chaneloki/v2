/**
 * UI_v2 - ui_v2_core.js
 */

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
        this.searchTimeout = null; // [新增] 用於搜尋防抖 (Debounce)
        this.envAnimInterval = null; // [新增] 環境特效動畫計時器
        this.currentEnvFolder = null; // [新增] 紀錄當前動畫資料夾，避免重複啟動
        this.initEventListeners();
        this.initKeyboardListeners();
    }

    debounceSearch() {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.renderSkillList();
        }, 150); // 150ms 的防抖時間
    }

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

        // [核心優化]: 監聽劇情模式 (SEGMENT) 下，點擊側邊欄任何氣泡區域都觸發下一行
        document.addEventListener('click', (e) => {
            const el = e.target;
            const isBubble = el.id === 'elf-bubble' || el.id === 'e-t' || el.closest('#elf-bubble') || el.id === 'player-box' || el.id === 'p-t' || el.closest('#player-box');
            
            // [關鍵修正]: 劇情模式 (SEGMENT) 下，點擊側邊欄任何氣泡區域都觸發下一行
            if (this.currentStoryType === 'SEGMENT' && isBubble) {
                console.log("🖱️ [UIManager] 全域捕獲: 劇情氣泡點擊");
                e.stopPropagation();
                this.nextStoryLine();
                return;
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
            // Q1 移除重複 render()：render.js 已訂閱 startSimulator 事件並執行 render()，不需再呼叫一次
            
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

    initKeyboardListeners() {
        // #24 改用 addEventListener，避免 document.onkeydown 賦值覆蓋其他模組的鍵盤監聽器
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            document.removeEventListener('keyup', this._keyupHandler);
        }
        this._keydownHandler = (e) => {
            const state = window.orchestrator.state;
            if (state.currentPhase !== 'SIMULATOR' || this.isTrialActive) return;

            const k = e.key.toLowerCase();

            if (e.key === 'Shift') this.isShiftDown = true;
            if (e.ctrlKey && (k === 'arrowdown' || k === 'down')) { e.preventDefault(); this.triggerAction('quickjump'); return; }
            if (e.ctrlKey && (k === 'arrowup' || k === 'up')) { e.preventDefault(); this.triggerAction('jumpup'); return; }
            if (e.ctrlKey && (k === ';' || k === ':')) { e.preventDefault(); this.triggerAction('insertdate'); return; }
            // [Fix] Ctrl+中文分號 / Ctrl+；無反應提示
            if (e.ctrlKey && (k === '；' || k === '：' || (e.code === 'Semicolon' && k === 'process'))) {
                e.preventDefault();
                window.orchestrator.playStorySegment('fail_DATE_chinese_input');
                return;
            }
            // [Fix] 無 Ctrl 的中文全形分號：只在 INSERT_DATE 任務中提示切換輸入法
            if (!e.ctrlKey && k === '；') {
                const _s = window.orchestrator?.state;
                const _t = _s?.activeChapterModule?.simulator?.tasks?.[_s?.currentTaskIndex];
                if (_t?.expectedCondition?.actionId === 'INSERT_DATE') {
                    e.preventDefault();
                    window.orchestrator.playStorySegment('fail_DATE_chinese_input');
                    return;
                }
            }
            if (e.ctrlKey && k === 'e') { e.preventDefault(); this.triggerAction('open_format_dialog'); return; }
            if (k === 'alt' && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); this.triggerAction('freezepanes'); return; }
        };
        this._keyupHandler = (e) => {
            if (e.key === 'Shift') this.isShiftDown = false;
        };
        document.addEventListener('keydown', this._keydownHandler);
        document.addEventListener('keyup', this._keyupHandler);

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
            // #5 用座標數學取代 document.elementsFromPoint，避免每幀 hit-test 觸發 layout
            const renderer = window.gridRenderer;
            const wrapper = document.getElementById('wrapper');
            if (renderer && wrapper) {
                const wRect = wrapper.getBoundingClientRect();
                const relY = e.clientY - wRect.top + wrapper.scrollTop;
                const rIdx = Math.max(0, Math.floor(relY / renderer.rowHeight) - 1);
                const relX = e.clientX - wRect.left + wrapper.scrollLeft - renderer.rowHeadWidth;
                const cIdx = Math.max(0, Math.floor(relX / renderer.colWidth));
                const source = state.fillSourceRange;
                if (source && rIdx >= 0 && cIdx >= 0) {
                    state.selectedRange = {
                        minRow: Math.min(source.minRow, rIdx),
                        maxRow: Math.max(source.maxRow, rIdx),
                        minCol: source.minCol,
                        maxCol: source.maxCol
                    };
                    renderer._updateVisuals(state.gridData, state.gridData[0].length);
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
            // #4 每次拖曳只提示一次，避免每幀 mousemove 都觸發 toast
            if (window.uiManager && !this._shiftHintShown) {
                this._shiftHintShown = true;
                window.uiManager.showMagicToast("咦？沒按住 Shift 的話，這不是交換空間，是『取代術』啊！記得先按住 Shift 再拖曳！", 'error');
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
            this._shiftHintShown = false; // #4 重置，讓下次拖曳可以再次提示
        }
        // 2. 處理填充柄拖拽
        if (state.isDraggingFill) {
            state.isDraggingFill = false;
            // 僅在指定任務允許自動填滿，其他情況攔截並顯示提示
            const _ch  = state.currentChapter?.toString();
            const _tid = state.activeChapterModule?.simulator?.tasks?.[state.currentTaskIndex]?.id;
            // Ch8 / Ch8.5 的公式任務均需玩家拖拉填充，雖非主技能但必須允許
            const _ch8FormulaTasks = ['IF_BASIC_TASK', 'IFS_TASK', 'IF_PLUS_TASK', 'IF_AND_TASK'];
            // [修正]: Ch7 / Ch7.5 除了基礎自動填滿，絕對引用（含示範錯誤的相對引用陷阱）
            // 與 RANK 任務也都需要玩家拖拉公式填充，原本漏了這幾個 id 導致被誤判為非法拖拉。
            const _ch7FormulaTasks = ['FORMULA_AUTOFILL_TASK', 'ABS_REF_FAIL_TASK', 'ABS_REF_FIX_TASK', 'ABS_REF_TASK', 'RANK_TASK'];
            const _autofillOk =
                ((_ch === '10' || _ch === '15') && _tid === 'AUTO_FILL') ||
                ((_ch === '70' || _ch === '75') && _ch7FormulaTasks.includes(_tid)) ||
                ((_ch === '80' || _ch === '85') && _ch8FormulaTasks.includes(_tid));

            if (_autofillOk) {
                // 合法任務：執行自動填滿
                this.triggerAction('autofill');
            } else {
                // 非法使用：恢復原始選取範圍，顯示生氣提示
                if (state.fillSourceRange) {
                    state.selectedRange = JSON.parse(JSON.stringify(state.fillSourceRange));
                }
                state.fillSourceRange = null;
                if (window.gridRenderer) {
                    window.gridRenderer._updateVisuals(state.gridData, state.gridData[0]?.length || 0);
                }
                // 在左側精靈對話框顯示生氣反應，而非頂部橫幅
                if (window.orchestrator) {
                    window.orchestrator.emit('playStory', {
                        type: 'SEGMENT',
                        data: [{ n: "賽爾", t: "😠 哎！你在幹嘛！這些格子不是讓你隨便拉的啦！", a: "fairy" }]
                    });
                }
            }
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

    triggerAction(code, anchorEl) {
        if (!code || this.isTrialActive) return; // [新增]: 試煉中阻斷動作
        const actionKey = code.toLowerCase();

        // [優化]: 下拉選單邏輯 - 使用傳入的 anchorEl 定位
        if (actionKey === 'freezepanes') {
            this.showDropdown([
                { icon: '🔝', text: '凍結頂端列', action: 'freeze_top' }
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

}



// --- Initialize UI Manager ---
window.uiManager = new UIManager();
// initialization will be called after all scripts are loaded in index.html
