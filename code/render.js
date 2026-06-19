/**
 * 試算表魔法冒險 v2 - 核心渲染引擎 (v45 行為克隆 + 性能優化版)
 * [Change Log 2026-06-10]: 
 * 1. 新增公式高亮層 (Syntax Overlay) 與動態解析 (_highlightFormula)。
 * 2. 加入強制 JS 動態同步寬度運算，徹底解決 CSS Grid 加上 contenteditable 造成的文字截斷 BUG。
 * [Change Log 2026-05-25]: 
 * 1. 導入 cellMap 與 headerMap 快取 DOM 節點。
 * 2. 分離「結構渲染 (_renderFull)」與「視覺更新 (_updateVisuals)」。
 * 3. 互動事件 (滑鼠拖曳選取) 改為僅觸發視覺更新，大幅提升流暢度。
 */

class GridRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.isInitialized = false;
        this.cellMap = new Map(); // 快取儲存 (rIdx,cIdx) -> DOM
        this.headerMap = new Map(); // 快取儲存 (colIdx) -> Header DOM
        
        // --- 虛擬渲染參數 ---
        this.rowHeight = 32;
        this.colWidth = 150;
        this.rowHeadWidth = 50;
        this.bufferRows = 10; // 上下多渲染的緩衝行數
        this.lastScrollTop = 0;
        
        // [新增]: 獨立維護 Syntax Overlay 以避免被 innerHTML 清除
        this.syntaxOverlay = document.createElement('div');
        this.syntaxOverlay.className = 'syntax-overlay';
        this.syntaxOverlay.style.display = 'none';
        this.syntaxOverlay.style.color = '#333'; // 確保預設文字為深色
    }

    init() {
        this.container = document.getElementById(this.containerId);
        const wrapper = document.getElementById('wrapper');
        
        if (!this.container || !wrapper) return;

        // --- 性能優化：節流捲動監聽 (虛擬捲動核心) ---
        let isScrolling = false;
        wrapper.onscroll = () => {
            if (isScrolling) return;
            isScrolling = true;
            window.requestAnimationFrame(() => {
                const state = window.orchestrator.state;
                // [修復]: 拖拉選取時禁止重繪，防止輸入框失去焦點
                if (state.isSelecting || state.isDraggingFill || state.isDraggingCol) {
                    isScrolling = false;
                    return;
                }
                
                // [優化]: 捲動時僅在跨越行高閾值時觸發重繪
                const scrollTop = wrapper.scrollTop;
                if (Math.abs(scrollTop - this.lastScrollTop) > this.rowHeight) {
                    this.render(); 
                    this.lastScrollTop = scrollTop;
                }
                
                if (wrapper.scrollTop > 30) {
                    window.orchestrator.validateStateChange();
                }
                isScrolling = false;
            });
        };

        // --- [新增]: 高性能自動捲動偵測 ---
        this._setupAutoScroll(wrapper);

        // --- 訂閱大腦事件 ---
        window.orchestrator.on('chapterLoaded', () => this.render());
        window.orchestrator.on('startSimulator', () => this.render());
        window.orchestrator.on('taskChanged', () => this.render());
        window.orchestrator.on('sheetSwitched', () => this.render());

        this.isInitialized = true;
        console.log("Renderer: Virtual Scrolling mode active (32px).");
    }

    /**
     * [內部] 自動捲動邏輯 (使用 requestAnimationFrame 確保流暢)
     */
    _setupAutoScroll(wrapper) {
        // #11 防止多次 init() 重複堆疊 document 級監聽器
        if (this._autoScrollSetup) return;
        this._autoScrollSetup = true;

        let scrollTick = null;

        const stopScroll = () => { if (scrollTick) { cancelAnimationFrame(scrollTick); scrollTick = null; } };

        // [Fix 2026-06-19] touchend/touchcancel: 手機觸控結束時必須取消 rAF 迴圈，
        // 否則 mouseup 不觸發導致迴圈永不停止，CPU 持續滿載。
        document.addEventListener('touchend',    stopScroll, { passive: true });
        document.addEventListener('touchcancel', stopScroll, { passive: true });

        wrapper.addEventListener('mousemove', (e) => {
            const state = window.orchestrator.state;
            if (!state.isSelecting && !state.isDraggingFill && !state.isDraggingCol) {
                stopScroll();
                return;
            }

            const rect = wrapper.getBoundingClientRect();
            const threshold = 50;
            let vx = 0, vy = 0;

            if (e.clientX > rect.right - threshold) vx = 15;
            else if (e.clientX < rect.left + threshold) vx = -15;

            if (e.clientY > rect.bottom - threshold) vy = 15;
            else if (e.clientY < rect.top + threshold) vy = -15;

            if (vx !== 0 || vy !== 0) {
                if (!scrollTick) {
                    const tick = () => {
                        wrapper.scrollLeft += vx;
                        wrapper.scrollTop += vy;
                        
                        // [修復]: 自動捲動時，不觸發 render()，改為發送 mouseover 事件以擴展選取範圍
                        const r = wrapper.getBoundingClientRect();
                        const ty = Math.max(r.top + 10, Math.min(r.bottom - 10, e.clientY));
                        const tx = Math.max(r.left + 10, Math.min(r.right - 10, e.clientX));
                        
                        const cells = document.elementsFromPoint(tx, ty);
                        const tCell = cells.find(el => el.classList.contains('cell'));
                        if (tCell) {
                            if (window.orchestrator.state.isSelecting) {
                                tCell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                            } else if (window.orchestrator.state.isDraggingFill && window.uiManager) {
                                window.uiManager.handleGlobalMouseMove({ clientX: tx, clientY: ty });
                            }
                        }
                        
                        scrollTick = requestAnimationFrame(tick);
                    };
                    scrollTick = requestAnimationFrame(tick);
                }
            } else {
                stopScroll();
            }
        });

        document.addEventListener('mouseup', stopScroll);

        // [修復]: 滑鼠往上拖出 wrapper 範圍時，依據 X 座標推算欄位，維持橫向選取不中斷
        document.addEventListener('mousemove', (e) => {
            const state = window.orchestrator.state;
            if (!state.isSelecting || state.formulaRangeSelection || !state.selectedCell) return;
            const rect = wrapper.getBoundingClientRect();
            if (e.clientY >= rect.top) return; // 還在 wrapper 內，交給 cell onmouseover 處理
            // #23 用欄頭反向 Map 取代 querySelectorAll + indexOf，O(n) → O(1)
            const els = document.elementsFromPoint(e.clientX, rect.top + 4);
            const header = els.find(el => el.classList.contains('l-head') && el.classList.contains('letter'));
            if (!header) return;
            // 若尚未建立欄頭 Map，立即建立（欄頭在渲染後不會移動）
            if (!this._headerIndexMap) {
                this._headerIndexMap = new Map();
                document.querySelectorAll('.l-head.letter').forEach((el, i) => this._headerIndexMap.set(el, i));
            }
            const colIdx = this._headerIndexMap.has(header) ? this._headerIndexMap.get(header) : -1;
            if (colIdx < 0) return;
            const start = state.selectedCell;
            const newRange = {
                minRow: Math.min(start.r, 0),
                maxRow: Math.max(start.r, 0),
                minCol: Math.min(start.c, colIdx),
                maxCol: Math.max(start.c, colIdx)
            };
            if (!state.selectedRange ||
                state.selectedRange.minCol !== newRange.minCol ||
                state.selectedRange.maxCol !== newRange.maxCol) {
                state.selectedRange = newRange;
                this._updateVisuals(
                    window.orchestrator.state.gridData,
                    Object.keys(window.orchestrator.state.gridData[0] || {}).length,
                    0, window.orchestrator.state.gridData.length
                );
            }
        });
    }

    /**
     * 更新選取範圍 (由動作腳本呼叫)
     */
    updateSelectionRange(minCol, minRow, maxCol, maxRow) {
        window.orchestrator.state.selectedRange = { minCol, minRow, maxCol, maxRow };
    }

    /**
     * 解析公式並回傳所有參照的儲存格/範圍
     */
    _parseFormulaReferences(formula) {
        if (!formula || !formula.startsWith('=')) return [];
        // 匹配單一儲存格 (例如 G2, $A$1) 或是範圍 (例如 G2:G21, $A$1:$B$10)
        const regex = /\$?([A-Za-z]+)\$?(\d+)(?::\$?([A-Za-z]+)\$?(\d+))?/g;
        let match;
        const refs = [];
        while ((match = regex.exec(formula)) !== null) {
            const c1 = match[1].toUpperCase().charCodeAt(0) - 65;
            const r1 = parseInt(match[2]) - 1;
            if (match[3] && match[4]) {
                const c2 = match[3].toUpperCase().charCodeAt(0) - 65;
                const r2 = parseInt(match[4]) - 1;
                refs.push({ minRow: Math.min(r1, r2), maxRow: Math.max(r1, r2), minCol: Math.min(c1, c2), maxCol: Math.max(c1, c2) });
            } else {
                refs.push({ minRow: r1, maxRow: r1, minCol: c1, maxCol: c1 });
            }
        }
        return refs;
    }

    /**
     * 公式自動完成選單
     */
    _showAutocomplete(targetEl, suggestions) {
        let box = document.getElementById('formula-autocomplete');
        if (!box) {
            box = document.createElement('div');
            box.id = 'formula-autocomplete';
            box.style.position = 'absolute';
            box.style.background = '#fff';
            box.style.border = '1px solid #ccc';
            box.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            box.style.zIndex = '10000';
            box.style.borderRadius = '4px';
            box.style.padding = '4px 0';
            box.style.fontFamily = 'monospace';
            box.style.fontSize = '14px';
            box.style.minWidth = '120px';
            document.body.appendChild(box);
        }
        
        box.innerHTML = '';
        suggestions.forEach(s => {
            const item = document.createElement('div');
            item.textContent = "ƒx " + s;
            item.style.padding = '6px 12px';
            item.style.cursor = 'pointer';
            item.style.color = '#333';
            item.onmouseover = () => item.style.backgroundColor = '#eef7ff';
            item.onmouseout = () => item.style.backgroundColor = 'transparent';
            item.onmousedown = (e) => {
                e.preventDefault(); // 防止失去焦點
                const state = window.orchestrator.state;
                if (state.editingCell && state.editingCell.el) {
                    const el = state.editingCell.el;
                    const newValue = "=" + s + "(";
                    el.textContent = newValue;
                    state.gridData[state.editingCell.r][state.editingCell.c] = newValue;
                    
                    // [新增]: 同步更新 Syntax Overlay
                    if (this.syntaxOverlay) {
                        el.classList.add('syntax-active');
                        this.syntaxOverlay.innerHTML = this._highlightFormula(newValue);
                    }
                    
                    // 將游標移至最後，避免跳到下一行
                    const sel = window.getSelection();
                    if (el.firstChild && el.firstChild.nodeType === 3) { // TEXT_NODE
                        sel.collapse(el.firstChild, el.firstChild.length);
                    } else {
                        sel.collapse(el, el.childNodes.length);
                    }
                    
                    this._hideAutocomplete();
                }
            };
            box.appendChild(item);
        });
        
        const rect = targetEl.getBoundingClientRect();
        box.style.left = rect.left + 'px';
        box.style.top = (rect.bottom + 4) + 'px';
        box.style.display = 'block';
    }

    _hideAutocomplete() {
        const box = document.getElementById('formula-autocomplete');
        if (box) box.style.display = 'none';
    }

    /**
     * 全量渲染入口 (相容舊版，執行完整的結構重建)
     */
    render() {
        if (!this.container) return;

        const state = window.orchestrator.state;
        const data = state.gridData;
        if (!data || data.length === 0) return;

        let maxC = 0;
        data.forEach(row => { if (row.length > maxC) maxC = row.length; });

        // #1 強制全量重建時清除 diff 快取
        this._lastRenderData = null;
        this._renderFull(data, maxC);
    }

    /**
     * [內部] 結構渲染：重建所有 DIV 元素並綁定基本事件
     * [優化]: 虛擬渲染版，只繪製可見區域
     */
    _renderFull(data, maxC) {
        const state = window.orchestrator.state;
        
        // [性能優化]: 不要每次 scroll 虛擬渲染都重建 cellStyles，這會引發嚴重的記憶體回收 (GC) 導致卡頓。
        // 只有在 ch45_red_marked 剛發生或是初次渲染時才計算一次
        if (state.ch45_red_marked && !state._ch45StylesCalculated) {
            state.cellStyles = {}; 
            for (let rIdx = 1; rIdx < data.length; rIdx++) {
                if (data[rIdx][3] === "命危") {
                    for (let cIdx = 0; cIdx < data[rIdx].length; cIdx++) {
                        const colLabel = String.fromCharCode(65 + cIdx);
                        const cellId = colLabel + (rIdx + 1);
                        state.cellStyles[cellId] = { color: '#b22222', fontWeight: 'bold', backgroundColor: '#ffe6e6' };
                    }
                }
            }
            state._ch45StylesCalculated = true; // 標記已計算，直到被外力清空
        }

        const wrapper = document.getElementById('wrapper');
        const styles = state.cellStyles || {};
        
        // 1. 計算可見範圍
        const scrollTop = wrapper.scrollTop;
        const wrapperHeight = wrapper.clientHeight || 600; // 增加回退值避免計算為 0

        const startIdx = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.bufferRows);
        const endIdx = Math.min(data.length - 1, Math.ceil((scrollTop + wrapperHeight) / this.rowHeight) + this.bufferRows);

        // #1 虛擬捲動 diff：若渲染範圍與資料指針相同，跳過整個 DOM 重建（只重整 visuals）
        if (this._lastRenderStart === startIdx &&
            this._lastRenderEnd === endIdx &&
            this._lastRenderData === data) {
            this._updateVisuals(data, maxC, startIdx, endIdx);
            return;
        }
        this._lastRenderStart = startIdx;
        this._lastRenderEnd = endIdx;
        this._lastRenderData = data;

        this.cellMap.clear();
        this.headerMap.clear();

        // 2. 設定容器總高度 (維持捲動軸感) 與 Grid 佈局
        // 重要：必須設定 gridTemplateRows 以確保 grid-row 定位正確
        const totalHeight = (data.length + 1) * this.rowHeight; 
        const isOutline = state.isOutlineVisible;
        const colShift = isOutline ? 1 : 0;

        this.container.style.height = `${totalHeight}px`;
        this.container.style.display = 'grid';
        
        const gridCols = [];
        if (isOutline) gridCols.push('30px');
        gridCols.push(`${this.rowHeadWidth}px`);
        gridCols.push(`repeat(${maxC}, ${this.colWidth}px)`);
        this.container.style.gridTemplateColumns = gridCols.join(' ');
        this.container.style.gridTemplateRows = `repeat(${data.length + 1}, ${this.rowHeight}px)`;
        
        const fragment = document.createDocumentFragment();

        // 2.5 渲染大綱側邊欄 (如果啟用)
        if (isOutline) {
            const outlineSidebar = el('div', {
                className: 'outline-sidebar',
                style: {
                    gridRow: `2 / span ${data.length}`,
                    gridColumn: '1',
                    position: 'sticky',
                    left: '0px',
                    zIndex: '950'
                }
            });
            
            // 模擬一些大綱按鈕
            data.forEach((row, rIdx) => {
                if (rIdx === 0) return;
                if (row[1] && (row[1].includes("總計") || row[1].includes("小計"))) {
                    const btn = el('div', {
                        className: 'outline-btn',
                        innerText: '-',
                        onclick: () => {
                            window.uiManager.showMagicToast("「這道封印暫時不可觸碰，請先專心處理眼前的帳目。」", "error");
                        }
                    });
                    // 計算按鈕位置：使用絕對定位或簡單插入到 sidebar
                    btn.style.position = 'absolute';
                    btn.style.top = `${(rIdx) * this.rowHeight + 9}px`;
                    outlineSidebar.appendChild(btn);
                }
            });
            fragment.appendChild(outlineSidebar);
        }

        // 3. 渲染標題列 (固定在第 1 行)
        const headers = [' '];
        for (let i = 0; i < maxC; i++) headers.push(String.fromCharCode(65 + i));
        
        headers.forEach((h, idx) => {
            const colIdx = idx - 1;
            const div = el('div', {
                className: 'l-head' + (idx > 0 ? ' letter' : ''),
                innerText: h,
                style: {
                    position: 'sticky',
                    top: '0px',
                    zIndex: '1000',
                    gridRow: '1',
                    gridColumn: (idx + 1 + colShift),
                    userSelect: 'none'
                },
                onmousedown: colIdx >= 0 ? (e) => {
                    if (e.button !== 0) return;

                    // [修復]: 標題列底部與第一列儲存格視覺上緊鄰，滑鼠稍微往上一點點就會誤觸「選取整欄」。
                    // 若按下位置在標題列底部邊緣附近，視為點擊第一列的儲存格，改交給該格的選取邏輯處理。
                    if (e.offsetY >= this.rowHeight - 3) {
                        const targetCell = this.cellMap.get(`0,${colIdx}`);
                        if (targetCell) {
                            e.stopPropagation();
                            targetCell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: e.clientX, clientY: e.clientY }));
                            return;
                        }
                    }

                    e.stopPropagation();
                    state.selectedCell = { r: 0, c: colIdx };
                    state.selectedRange = { minRow: 0, maxRow: data.length - 1, minCol: colIdx, maxCol: colIdx };
                    state.isDraggingCol = true;
                    state.draggedColIdx = colIdx;
                    this._updateVisuals(data, maxC, startIdx, endIdx);
                    window.orchestrator.handleHeaderClick(colIdx);
                } : null,
                onmouseover: colIdx >= 0 ? () => {
                    // [修復]: 拖曳選取範圍時，滑鼠若稍微滑到標題列上方，仍依目前所在欄位延伸選取範圍，
                    // 避免「往上一點點」就中斷橫向選取 (例如選取 A1:E1)
                    if (state.isSelecting && !state.formulaRangeSelection && state.selectedCell) {
                        const start = state.selectedCell;
                        state.selectedRange = {
                            minRow: Math.min(start.r, 0),
                            maxRow: Math.max(start.r, 0),
                            minCol: Math.min(start.c, colIdx),
                            maxCol: Math.max(start.c, colIdx)
                        };
                        this._updateVisuals(data, maxC, startIdx, endIdx);
                    }
                } : null
            });

            if (colIdx >= 0) this.headerMap.set(colIdx, div);
            fragment.appendChild(div);
        });

        // 4. 渲染可見資料格
        const renderRow = (rIdx) => {
            const row = data[rIdx];
            if (!row) return; // 邊界檢查
            const rNum = rIdx + 1;
            const gridRowPos = rIdx + 2; 

            const rowLabel = el('div', {
                className: `l-head r-${rNum}`,
                innerText: rNum,
                style: {
                    gridRow: gridRowPos,
                    gridColumn: (1 + colShift),
                    position: 'sticky',
                    left: isOutline ? '30px' : '0px',
                    zIndex: '900',
                    userSelect: 'none',
                    ...(rIdx === 0 && state.isFrozen ? { top: `${this.rowHeight}px`, zIndex: '1001' } : {})
                }
            });
            
            fragment.appendChild(rowLabel);

            row.forEach((cellVal, cIdx) => {
                const colLabel = String.fromCharCode(65 + cIdx);
                const cellId = colLabel + rNum;
                
                // [新增]: 樞紐分析表任務引導高亮注入
                let extraClass = "";
                if (cellId === 'A1' && window.ch6Actions?._pivotState?.shouldHighlightA1) {
                    extraClass = " tutorial-highlight-pulse";
                }

                // [新增]: 任務目標儲存格 (閃爍提示) 與 幽靈浮水印提示 (Ghost Text)
                const currentTask = state.activeChapterModule?.simulator?.tasks?.[state.currentTaskIndex];
                let ghostAttr = {};
                if (currentTask && currentTask.targetCell && currentTask.targetCell.r === rIdx && currentTask.targetCell.c === cIdx) {
                    extraClass += " task-target-cell";
                    if (currentTask.ghostText && !cellVal) {
                        extraClass += " has-ghost-text";
                        ghostAttr['data-ghost'] = currentTask.ghostText;
                    }
                }

                // [新增]: 第七章 判斷 D 欄 (cIdx === 3) 為文字格式
                const chapter = state.currentChapter.toString();
                const isCh7TextCol = (chapter === "70" || chapter === "75") && cIdx === 3 && rIdx > 0;
                if (isCh7TextCol) {
                    extraClass += " text-format-warning";
                }

                // [新增]: 數值靠右，文字靠左
                let defaultAlign = 'left';
                if (!isCh7TextCol && cellVal !== "" && !isNaN(cellVal)) {
                    defaultAlign = 'right';
                }

                // 預先計算可編輯性與可複製性，避免重複呼叫
                const _editable = this._isCellEditable(rIdx, cIdx, state, currentTask);
                const _copyable = _editable || this._isCellCopyable(rIdx, cIdx, state, currentTask);
                const cell = el('div', {
                    id: cellId,
                    className: `cell r-${rNum}${extraClass}`,
                    textContent: cellVal.toString(), // [修復]: 移除 trim() 保留「斜線任務」需要的開頭空格
                    contentEditable: _editable ? "plaintext-only" : "false", // [2026-06-17] 儲存格保護
                    ...ghostAttr,
                    style: {
                        gridRow: gridRowPos,
                        gridColumn: (cIdx + 2 + colShift),
                        lineHeight: '32px', // [修復]: 固定行高確保垂直居中穩定
                        textAlign: defaultAlign,
                        // 非玩家輸入格且不在可複製範圍：禁止文字選取
                        userSelect: _copyable ? 'auto' : 'none',
                        ...(styles[cellId] || {}),
                        ...(rIdx === 0 && state.isFrozen ? { position: 'sticky', top: `${this.rowHeight}px`, zIndex: '1000' } : {})
                    },
                    oninput: (e) => {
                        // [修復]: 強制移除所有換行符，避免數據污染，改讀 textContent (斜線儲存格除外)
                        const cleanVal = e.target.style.whiteSpace === 'pre' ? e.target.textContent : e.target.textContent.replace(/\r?\n|\r/g, "");
                        data[rIdx][cIdx] = cleanVal;

                        // #2 rAF debounce：每次按鍵只在下一個 animation frame 執行一次 _updateVisuals + syntax highlight
                        if (this._inputRafId) cancelAnimationFrame(this._inputRafId);
                        const _target = e.target;
                        this._inputRafId = requestAnimationFrame(() => {
                            this._inputRafId = null;

                            // 動態解析整個公式，高亮所有被參照的儲存格
                            state.formulaRefRanges = this._parseFormulaReferences(cleanVal);
                            this._updateVisuals(data, maxC, startIdx, endIdx);

                            // [新增]: 公式自動完成提示（僅限 ch7/7.5/8/8.5，且只顯示已教過的函數）
                            const _acChap = state.currentChapter.toString();
                            const _acChapOk = ["70", "75", "80", "85"].includes(_acChap);
                            if (cleanVal.startsWith('=') && _acChapOk) {
                                const _skillFuncMap = {
                                    "FORMULA_BASIC": "SUM",
                                    "FUNC_RANK":     "RANK",
                                    "IF_BASIC":      "IF",
                                    "IFS":           "IFS",
                                    "IF_AND":        "AND"
                                };
                                const _unlocked = state.unlockedSkills || [];
                                const _curTask = state.activeChapterModule?.simulator?.tasks?.[state.currentTaskIndex];
                                const _curSkill = _curTask?.unlockSkillId;
                                const _allowedFuncs = Object.entries(_skillFuncMap)
                                    .filter(([skillId]) => _unlocked.includes(skillId) || skillId === _curSkill)
                                    .map(([, funcName]) => funcName);

                                const upperVal = cleanVal.toUpperCase().substring(1);
                                const suggestions = _allowedFuncs.filter(f => f.startsWith(upperVal) || upperVal === "");

                                if (suggestions.length > 0) {
                                    this._showAutocomplete(_target, suggestions);
                                } else {
                                    this._hideAutocomplete();
                                }
                            } else {
                                this._hideAutocomplete();
                            }

                            // [新增]: 更新 Syntax Overlay 且動態同步寬度
                            if (cleanVal.startsWith('=')) {
                                _target.classList.add('syntax-active');
                                if (this.syntaxOverlay) {
                                    // #12 快取 _highlightFormula 結果，只在公式實際改變時重算
                                    if (this._lastHighlightInput !== cleanVal) {
                                        this._lastHighlightInput = cleanVal;
                                        this._lastHighlightResult = this._highlightFormula(cleanVal);
                                    }
                                    this.syntaxOverlay.innerHTML = this._lastHighlightResult;
                                    // #3 延後讀取 scrollWidth，避免 innerHTML 寫入後立即讀取造成 layout thrashing
                                    requestAnimationFrame(() => {
                                        const textWidth = this.syntaxOverlay.scrollWidth;
                                        const newWidth = Math.max(150, textWidth + 20) + 'px';
                                        _target.style.width = newWidth;
                                        this.syntaxOverlay.style.width = newWidth;
                                    });
                                }
                            } else {
                                _target.classList.remove('syntax-active');
                                if (this.syntaxOverlay) this.syntaxOverlay.innerHTML = "";
                                _target.style.width = "";
                                this.syntaxOverlay.style.width = "";
                            }
                        });
                    },
                    onfocus: (e) => {
                        // 紀錄編輯前的值，以便還原或比對
                        e.target._oldValue = e.target.textContent;
                        state.editingCell = { r: rIdx, c: cIdx, el: e.target };

                        // [修復]: 先還原真實公式字串，再定位 Syntax Overlay，
                        // 否則 overlay 會以「計算結果」而非「公式」來排版，導致 syntax-active 不啟動且游標對不齊。
                        const sheetFormulas = state.formulas?.[state.activeSheetId];
                        if (sheetFormulas && sheetFormulas[cellId]) {
                            e.target.textContent = sheetFormulas[cellId];
                            // [修復]: 公式格還原後強制靠左，防止數字格 textAlign:right 導致遊標跑到右側與 overlay 錯位
                            e.target.style.textAlign = 'left';
                        }
                        // [修復]: focus 時移除 ghost text，避免提示字與遊標重疊造成視覺混亂
                        e.target.classList.remove('has-ghost-text');
                        e.target.removeAttribute('data-ghost');

                        // 定位並顯示 Syntax Overlay（此時 textContent 已是公式字串）
                        if (this.syntaxOverlay) {
                            this.syntaxOverlay.style.display = 'block';
                            this.syntaxOverlay.style.gridRow = e.target.style.gridRow;
                            this.syntaxOverlay.style.gridColumn = e.target.style.gridColumn;
                            const val = e.target.textContent.replace(/\r?\n|\r/g, "");

                            if (val.startsWith('=')) {
                                e.target.classList.add('syntax-active');
                                this.syntaxOverlay.innerHTML = this._highlightFormula(val);
                                // [終極修復]: 同步寬度
                                const textWidth = this.syntaxOverlay.scrollWidth;
                                const newWidth = Math.max(150, textWidth + 20) + 'px';
                                e.target.style.width = newWidth;
                                this.syntaxOverlay.style.width = newWidth;
                                // [修復]: textContent 賦值後瀏覽器會全選文字，選取藍底會透過透明文字顯現。
                                // 用 rAF 把游標移到公式末端，消除選取背景。
                                requestAnimationFrame(() => {
                                    const sel = window.getSelection();
                                    if (sel && e.target.firstChild && e.target.firstChild.nodeType === Node.TEXT_NODE) {
                                        const r = document.createRange();
                                        r.setStart(e.target.firstChild, e.target.firstChild.length);
                                        r.collapse(true);
                                        sel.removeAllRanges();
                                        sel.addRange(r);
                                    }
                                });
                            } else {
                                e.target.classList.remove('syntax-active');
                                this.syntaxOverlay.innerHTML = "";
                                e.target.style.width = "";
                                this.syntaxOverlay.style.width = "";
                            }
                        }

                        // [終極修復]: 如果儲存格是空的，直接清空其 HTML，消滅隱形 <br> 或幽靈文字節點
                        if (e.target.textContent.trim() === '') {
                            e.target.innerHTML = '';
                        }
                        // 移除聚焦時全選內容的邏輯，讓瀏覽器原生行為決定游標位置 (點哪就在哪)
                    },
                    onkeydown: (e) => {
                        if (e.key === 'Enter' && !e.ctrlKey) {
                            e.preventDefault();
                            e.target.blur(); // 模擬 Excel 按下 Enter 完成編輯
                        } else if (e.key === 'Escape') {
                            // [新增]: Esc 取消編輯，還原原始值，避免公式參照模式卡住無法跳出
                            e.preventDefault();
                            e.target.textContent = e.target._oldValue || '';
                            data[rIdx][cIdx] = e.target._oldValue || '';
                            state.formulaRangeSelection = null;
                            state.formulaRefRanges = null;
                            state.isSelecting = false;
                            e.target.blur();
                        } else if (e.key === 'F4') {
                            e.preventDefault();
                            const sel = window.getSelection();
                            if (sel.rangeCount > 0) {
                                const range = sel.getRangeAt(0);
                                if (range.startContainer === e.target || range.startContainer.parentNode === e.target) {
                                    // [修復]: 永遠從 e.target.textContent（即時 DOM）讀取公式，
                                    // state.formulas 只在 onblur 更新，在輸入期間會是舊值，導致 F4 offset 對不上。
                                    const _sheetForms = state.formulas?.[state.activeSheetId];
                                    const text = (e.target.textContent || _sheetForms?.[cellId] || data[rIdx][cIdx] || '').toString();
                                    // offset: 若 cursor 在文字節點，取字元 offset；否則 0。
                                    const offset = (range.startContainer.nodeType === Node.TEXT_NODE)
                                        ? range.startOffset
                                        : 0;
                                    const regex = /\$?[A-Za-z]+\$?\d+/g;
                                    let match;
                                    let targetMatch = null;
                                    while ((match = regex.exec(text)) !== null) {
                                        const start = match.index;
                                        const end = match.index + match[0].length;
                                        if (offset >= start && offset <= end) {
                                            targetMatch = match;
                                            break;
                                        }
                                    }
                                    if (targetMatch) {
                                        const ref = targetMatch[0];
                                        const start = targetMatch.index;
                                        const end = start + ref.length;
                                        const colMatch = ref.match(/\$?([A-Za-z]+)/);
                                        const rowMatch = ref.match(/\$?(\d+)/);
                                        const isColAbs = colMatch[0].startsWith('$');
                                        const isRowAbs = rowMatch[0].startsWith('$');
                                        const col = colMatch[1].toUpperCase();
                                        const row = rowMatch[1];

                                        let nextRef = ref;
                                        if (!isColAbs && !isRowAbs) nextRef = `$${col}$${row}`;
                                        else if (isColAbs && isRowAbs) nextRef = `${col}$${row}`;
                                        else if (!isColAbs && isRowAbs) nextRef = `$${col}${row}`;
                                        else nextRef = `${col}${row}`;

                                        const newText = text.substring(0, start) + nextRef + text.substring(end);
                                        e.target.textContent = newText;
                                        data[rIdx][cIdx] = newText;
                                        // [修復]: 同步更新 state.formulas，讓連續按 F4 時每次都能讀到最新公式
                                        if (!state.formulas) state.formulas = {};
                                        if (!state.formulas[state.activeSheetId]) state.formulas[state.activeSheetId] = {};
                                        state.formulas[state.activeSheetId][cellId] = newText;

                                        // [修復]: 重新確保 syntax-active 與 Overlay 可見，
                                        // 防止 textContent 賦值或 sel.removeAllRanges 在某些瀏覽器
                                        // 觸發 blur → syntax-active 被移除 → 儲存格文字與 Overlay 雙重顯示造成亂碼。
                                        if (this.syntaxOverlay && newText.startsWith('=')) {
                                            e.target.classList.add('syntax-active');
                                            this.syntaxOverlay.style.display = 'block';
                                            this.syntaxOverlay.style.gridRow = e.target.style.gridRow;
                                            this.syntaxOverlay.style.gridColumn = e.target.style.gridColumn;
                                            this.syntaxOverlay.innerHTML = this._highlightFormula(newText);
                                            const textWidth = this.syntaxOverlay.scrollWidth;
                                            const newWidth = Math.max(150, textWidth + 20) + 'px';
                                            e.target.style.width = newWidth;
                                            this.syntaxOverlay.style.width = newWidth;
                                        }

                                        const newOffset = Math.min(start + nextRef.length, newText.length);
                                        const newRange = document.createRange();
                                        if (e.target.firstChild && e.target.firstChild.nodeType === Node.TEXT_NODE) {
                                            newRange.setStart(e.target.firstChild, newOffset);
                                            newRange.setEnd(e.target.firstChild, newOffset);
                                            sel.removeAllRanges();
                                            sel.addRange(newRange);
                                            // [修復]: sel.removeAllRanges 可能在部分瀏覽器引發 blur，
                                            // 在 addRange 後明確補回 syntax-active 與 overlay 狀態。
                                            e.target.classList.add('syntax-active');
                                            if (this.syntaxOverlay) this.syntaxOverlay.style.display = 'block';
                                        }
                                    }
                                }
                            }
                        }
                    },
                    onblur: (e) => {
                        this._hideAutocomplete();
                        state.editingCell = null;
                        
                        // [新增]: 清除公式參照高亮
                        state.formulaRefRanges = null;
                        state.formulaRangeSelection = null;
                        this._updateVisuals(data, maxC, startIdx, endIdx);
                        
                        // [新增]: 隱藏 Syntax Overlay
                        e.target.classList.remove('syntax-active');
                        if (this.syntaxOverlay) {
                            this.syntaxOverlay.style.display = 'none';
                            this.syntaxOverlay.innerHTML = "";
                            this.syntaxOverlay.style.width = "";
                        }
                        e.target.style.width = "";

                        // [新增]: 移除 Ghost Text
                        e.target.classList.remove('has-ghost-text');
                        e.target.removeAttribute('data-ghost');

                        // 如果沒有輸入且原本有 ghostText，重新補回 class（下次 render 也會補回）
                        if (!e.target.textContent && currentTask && currentTask.targetCell && currentTask.targetCell.r === rIdx && currentTask.targetCell.c === cIdx && currentTask.ghostText) {
                            e.target.classList.add('has-ghost-text');
                            e.target.setAttribute('data-ghost', currentTask.ghostText);
                        }
                        
                        const oldVal = e.target._oldValue;
                        // [修復]: 離開時再次清理數據 (斜線儲存格除外)
                        const newVal = e.target.style.whiteSpace === 'pre' ? e.target.textContent : e.target.textContent.replace(/\r?\n|\r/g, "").trim();
                        e.target.textContent = newVal;
                        
                        const sheetFormulas = state.formulas?.[state.activeSheetId];
                        const existingFormula = sheetFormulas ? sheetFormulas[cellId] : null;
                        let didChange = (oldVal !== newVal);
                        
                        // [新增]: 記憶真實公式
                        if (newVal.startsWith('=')) {
                            if (!state.formulas) state.formulas = {};
                            if (!state.formulas[state.activeSheetId]) state.formulas[state.activeSheetId] = {};
                            state.formulas[state.activeSheetId][cellId] = newVal;
                        } else {
                            if (state.formulas?.[state.activeSheetId]?.[cellId]) {
                                delete state.formulas[state.activeSheetId][cellId];
                            }
                        }
                        
                        // [修復]: 若玩家只是點開有公式的格子並直接按下 Enter（沒有修改），則恢復原本計算好的數值，不要變成公式字串
                        // sameFormula=true 時仍需呼叫 handleCellEdit，讓 ch7/ch8 的錯誤公式可以反覆觸發提示
                        let sameFormula = false;
                        if (newVal.startsWith('=') && newVal === existingFormula) {
                            e.target.textContent = oldVal;
                            data[rIdx][cIdx] = oldVal;
                            didChange = false; // 無真正變動，跳過 saveGame
                            sameFormula = true;
                        } else {
                            data[rIdx][cIdx] = newVal;
                        }
                        
                        // [修復]: 離開編輯狀態時，強制將選取範圍切換回當前編輯的儲存格
                        // 這樣如果玩家在編輯時點選了其他格子帶入公式，結束編輯後不會停留在該格子，而是回到原本編輯的格子，讓拖拉柄顯示在正確位置
                        if (state.editingCell && state.editingCell.el === e.target) {
                            state.selectedCell = { r: rIdx, c: cIdx };
                            state.selectedRange = { minRow: rIdx, maxRow: rIdx, minCol: cIdx, maxCol: cIdx };
                            if (state.formulaRangeSelection) state.formulaRangeSelection = null;
                            if (state.formulaRefRanges) state.formulaRefRanges = [];
                        }
                        
                        // [新增]: 延遲清除編輯狀態，給 mousedown 留出判斷時間
                        setTimeout(() => {
                            if (state.editingCell && state.editingCell.el === e.target) {
                                state.editingCell = null;
                                if (window.gridRenderer) window.gridRenderer.render(); // 重新渲染以還原計算結果
                            }
                        }, 200);

                        if (didChange || sameFormula) {
                            window.orchestrator.handleCellEdit(rIdx, cIdx, oldVal, newVal);
                            if (didChange) window.orchestrator.saveGame();
                        }
                    },
                    onmousedown: (e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation();

                        // [新增]: 模擬 Excel 點選儲存格自動填入公式功能
                        const editing = state.editingCell;
                        if (editing && editing.el && editing.el.textContent.startsWith('=')) {
                            // 如果點擊的不是正在編輯的格子
                            if (editing.r !== rIdx || editing.c !== cIdx) {
                                e.preventDefault(); // 阻止焦點轉移
                                const targetAddr = String.fromCharCode(65 + cIdx) + (rIdx + 1);
                                
                                // 檢查最後一個字元，決定是「替換」還是「追加」
                                const currentText = editing.el.textContent;
                                const lastChar = currentText.slice(-1);
                                const operators = ['+', '-', '*', '/', '(', ',', '='];
                                
                                if (operators.includes(lastChar)) {
                                    state.formulaRangeSelection = { baseText: currentText, startR: rIdx, startC: cIdx, editingEl: editing.el };
                                    editing.el.textContent = currentText + targetAddr;
                                } else {
                                    // 簡化：如果最後不是運算符，預設加上 + 號
                                    state.formulaRangeSelection = { baseText: currentText + "+", startR: rIdx, startC: cIdx, editingEl: editing.el };
                                    editing.el.textContent = currentText + "+" + targetAddr;
                                }
                                
                                // 同步數據至 state
                                data[editing.r][editing.c] = editing.el.textContent;
                                
                                // [新增]: 同步更新 Syntax Overlay
                                if (this.syntaxOverlay) {
                                    this.syntaxOverlay.innerHTML = this._highlightFormula(editing.el.textContent);
                                }
                                
                                // 把游標移到文字最後面 (避免選取到換行節點導致跳下一行)
                                requestAnimationFrame(() => {
                                    const sel = window.getSelection();
                                    if (editing.el.firstChild && editing.el.firstChild.nodeType === 3) {
                                        sel.collapse(editing.el.firstChild, editing.el.firstChild.length);
                                    } else {
                                        sel.collapse(editing.el, editing.el.childNodes.length);
                                    }
                                });
                                
                                // [修復]: 公式參照選取時，不改變 selectedRange，而是即時解析公式字串
                                state.isSelecting = true;
                                state.formulaRefRanges = this._parseFormulaReferences(editing.el.textContent);
                                this._updateVisuals(data, maxC, startIdx, endIdx);
                                return; // 提早返回
                            }
                        }
                        
                        // [優化]: 如果點擊在已選取的「多重選取」儲存格內，不要清除清單，僅更新活動格
                        const isPartOfMulti = state.multiSelectedCells && state.multiSelectedCells.some(c => c.r === rIdx && c.c === cIdx);
                        if (isPartOfMulti) {
                            state.selectedCell = { r: rIdx, c: cIdx };
                        } else {
                            state.multiSelectedCells = []; // 手動選取一般區域時清除多重選取
                            state.selectedCell = { r: rIdx, c: cIdx };
                        }

                        const isAlreadyActive = state.selectedCell && state.selectedCell.r === rIdx && state.selectedCell.c === cIdx;
                        const hasRange = state.selectedRange && (state.selectedRange.minRow !== state.selectedRange.maxRow || state.selectedRange.minCol !== state.selectedRange.maxCol);
                        
                        state.isSelecting = true;
                        if (!isPartOfMulti) {
                            state.selectedRange = { minRow: rIdx, maxRow: rIdx, minCol: cIdx, maxCol: cIdx };
                        }
                        
                        this._updateVisuals(data, maxC, startIdx, endIdx);

                        // [修復拖曳卡頓]: 避免原生文字選取干擾儲存格拖曳
                        // [2026-06-17] 鎖定格 (contentEditable=false) 跳過 preventDefault，保留原生文字選取能力供玩家 copy
                        const editingCell = state.editingCell;
                        if (!editingCell || editingCell.el !== e.currentTarget) {
                            if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('excel-filter-icon')) {
                                if (e.currentTarget.contentEditable !== 'false') {
                                    e.preventDefault();
                                    e.currentTarget.focus();
                                }
                            }
                        }
                    },
                    onmouseover: (e) => {
                        if (state.isSelecting) {
                            if (state.formulaRangeSelection) {
                                const fState = state.formulaRangeSelection;
                                
                                const startCol = String.fromCharCode(65 + fState.startC);
                                const endCol = String.fromCharCode(65 + cIdx);
                                const startRow = fState.startR + 1;
                                const endRow = rIdx + 1;
                                
                                const minC = startCol <= endCol ? startCol : endCol;
                                const maxC = startCol > endCol ? startCol : endCol;
                                const minR = Math.min(startRow, endRow);
                                const maxR = Math.max(startRow, endRow);
                                
                                let rangeStr = "";
                                if (minC === maxC && minR === maxR) {
                                    rangeStr = minC + minR;
                                } else {
                                    rangeStr = minC + minR + ":" + maxC + maxR;
                                }
                                
                                const newText = fState.baseText + rangeStr;
                                if (fState.editingEl.textContent !== newText) {
                                    fState.editingEl.textContent = newText;
                                    data[state.editingCell.r][state.editingCell.c] = newText;
                                    state.formulaRefRanges = this._parseFormulaReferences(newText);
                                    
                                    // [新增]: 同步更新 Syntax Overlay 與寬度
                                    if (this.syntaxOverlay) {
                                        this.syntaxOverlay.innerHTML = this._highlightFormula(newText);
                                        const textWidth = this.syntaxOverlay.scrollWidth;
                                        const newWidth = Math.max(150, textWidth + 20) + 'px';
                                        fState.editingEl.style.width = newWidth;
                                        this.syntaxOverlay.style.width = newWidth;
                                    }
                                }
                                
                                this._updateVisuals(data, maxC, startIdx, endIdx);
                            } else {
                                const start = state.selectedCell;
                                state.selectedRange = {
                                    minRow: Math.min(start.r, rIdx),
                                    maxRow: Math.max(start.r, rIdx),
                                    minCol: Math.min(start.c, cIdx),
                                    maxCol: Math.max(start.c, cIdx)
                                };
                                
                                this._updateVisuals(data, maxC, startIdx, endIdx);
                            }
                        }
                    }
                });

                // [新增]: 篩選箭頭邏輯
                if (rIdx === 0 && state.isFilterActive) {
                    const filterBtn = el('div', {
                        className: 'excel-filter-icon',
                        innerText: '▼',
                        onclick: (e) => {
                            e.stopPropagation();
                            window.uiManager.showColumnFilterDropdown(cIdx, e.currentTarget);
                        }
                    });
                    cell.appendChild(filterBtn);
                    cell.classList.add('has-filter');
                }

                if (rIdx === 0 && state.isFrozen) cell.classList.add('frozen');
                this.cellMap.set(`${rIdx},${cIdx}`, cell);
                fragment.appendChild(cell);
            });
        };

        if (state.isFrozen && startIdx > 0) renderRow(0);

        for (let i = startIdx; i <= endIdx; i++) {
            if (i === 0 && state.isFrozen && startIdx > 0) continue; 
            renderRow(i);
        }

        this.container.innerHTML = '';
        this.container.appendChild(fragment);
        this.container.appendChild(this.syntaxOverlay); // [新增]: 將 overlay 確保接在 grid 中
        
        this._updateVisuals(data, maxC, startIdx, endIdx);
    }

    /**
     * [重點優化] 視覺更新：不重建 DOM，僅更新 CSS 類別與填充柄
     */
    _updateVisuals(data, maxC, startIdx, endIdx) {
        const state = window.orchestrator.state;
        const range = state.selectedRange;

        // 1. 更新 Header 高亮
        this.headerMap.forEach((div, colIdx) => {
            const isColSelected = range && range.minCol === colIdx && range.maxCol === colIdx && 
                                 range.minRow === 0 && range.maxRow >= data.length - 1;
            div.classList.toggle('selected', !!isColSelected);
        });

        // 2. 更新 Cell 狀態 (僅針對已繪製的 Cell)
        // #10 將 multiSelectedCells 轉為 Set 以 O(1) 查找，取代逐格 O(n) 線性搜尋
        const multiSet = state.multiSelectedCells
            ? new Set(state.multiSelectedCells.map(c => `${c.r},${c.c}`))
            : null;

        this.cellMap.forEach((cell, key) => {
            const coords = key.split(',').map(Number);
            const rIdx = coords[0], cIdx = coords[1];

            const isMulti = multiSet && multiSet.has(key);
            const isInRange = (range && rIdx >= range.minRow && rIdx <= range.maxRow && 
                                      cIdx >= range.minCol && cIdx <= range.maxCol) || isMulti;
            
            const isFullColSel = range && cIdx >= range.minCol && cIdx <= range.maxCol && 
                                 range.minRow === 0 && range.maxRow >= data.length - 1;

            if (cell.classList.contains('selected') !== !!isInRange) {
                cell.classList.toggle('selected', !!isInRange);
            }
            if (cell.classList.contains('l-sel') !== !!isFullColSel) {
                cell.classList.toggle('l-sel', !!isFullColSel);
            }

            // [新增]: 公式參照範圍的虛線框 (支援多重範圍)
            let isInRefRange = false;
            if (state.formulaRefRanges && state.formulaRefRanges.length > 0) {
                for (const ref of state.formulaRefRanges) {
                    if (rIdx >= ref.minRow && rIdx <= ref.maxRow && cIdx >= ref.minCol && cIdx <= ref.maxCol) {
                        isInRefRange = true;
                        break;
                    }
                }
            }
            if (cell.classList.contains('formula-ref-cell') !== isInRefRange) {
                cell.classList.toggle('formula-ref-cell', isInRefRange);
            }

            const shouldHaveHandle = isInRange && rIdx === range.maxRow && cIdx === range.maxCol;
            let handle = cell.querySelector('.fill-handle');

            if (shouldHaveHandle) {
                if (!handle) {
                    handle = el('div', {
                        className: 'fill-handle',
                        onmousedown: (e) => {
                            e.stopPropagation();
                            state.isDraggingFill = true;
                            state.fillSourceRange = JSON.parse(JSON.stringify(state.selectedRange));
                        }
                    });
                    cell.appendChild(handle);
                }
            } else if (handle) {
                handle.remove();
            }
        });
    }

    _checkIsSelected(state, r, c) {
        if (state.selectedCell && state.selectedCell.r === r && state.selectedCell.c === c) return true;
        const range = state.selectedRange;
        return range && r >= range.minRow && r <= range.maxRow && c >= range.minCol && c <= range.maxCol;
    }
    // [新增]: 公式語法高亮解析器
    _highlightFormula(formula) {
        if (!formula) return "";
        let out = '';
        let token = '';
        
        const pushToken = (type) => {
            if (!token) return;
            if (type === 'string') out += `<span style="color: #1e8e3e;">${token}</span>`; // Green
            else if (type === 'func') out += `<span style="color: #1a73e8;">${token}</span>`; // Blue
            else if (type === 'ref') out += `<span style="color: #e53935;">${token}</span>`; // Red
            else if (type === 'num') out += `<span style="color: #0288d1;">${token}</span>`; // Light Blue
            else out += token; // normal
            token = '';
        };

        let i = 0;
        while (i < formula.length) {
            let char = formula[i];
            
            if (char === '"') {
                pushToken('normal');
                token += char;
                i++;
                while (i < formula.length && formula[i] !== '"') {
                    token += formula[i];
                    i++;
                }
                if (i < formula.length) { token += '"'; i++; }
                pushToken('string');
                continue;
            }
            
            if (/[A-Z]/i.test(char)) {
                pushToken('normal');
                let word = char;
                i++;
                while (i < formula.length && /[A-Z0-9$]/i.test(formula[i])) {
                    word += formula[i];
                    i++;
                }
                token = word;
                if (i < formula.length && formula[i] === '(') {
                    pushToken('func');
                } else if (/^\$?[A-Z]+\$?[0-9]+$/i.test(word)) {
                    pushToken('ref');
                } else {
                    pushToken('normal');
                }
                continue;
            }
            
            if (/[0-9]/.test(char)) {
                pushToken('normal');
                while (i < formula.length && /[0-9.]/.test(formula[i])) {
                    token += formula[i];
                    i++;
                }
                pushToken('num');
                continue;
            }
            
            token += char;
            pushToken('normal');
            i++;
        }
        pushToken('normal');
        return out;
    }

    // [2026-06-17] 儲存格保護：判斷指定儲存格是否允許玩家輸入
    _isCellEditable(rIdx, cIdx, state, currentTask) {
        const chapter = state.currentChapter?.toString();
        if (state.currentPhase !== 'SIMULATOR') return false;

        // Ch1 / Ch1.5：INSERT_DATE 任務時開放 E 欄（col 4）供玩家點選並按 Ctrl+;
        if (chapter === '10' || chapter === '15') {
            return currentTask?.id === 'INSERT_DATE' && rIdx > 0 && cIdx === 4;
        }

        // Ch3 / Ch3.5：只在 EMPTY_TASK 時開放目標欄位（E 或 F）的非標題列
        const emptyTaskCol = { '30': 4, '35': 5 };
        if (Object.prototype.hasOwnProperty.call(emptyTaskCol, chapter)) {
            return currentTask?.id === 'EMPTY_TASK' && rIdx > 0 && cIdx === emptyTaskCol[chapter];
        }

        // 公式章節 (Ch7/7.5/8/8.5)：只開放當前任務的 targetCell
        if (['70', '75', '80', '85'].includes(chapter)) {
            if (!currentTask?.targetCell) return false;
            const tc = currentTask.targetCell;
            if (rIdx === tc.r && cIdx === tc.c) return true;
            // IF_PLUS_TASK 需要同時開放 H 欄 (7) 與 I 欄 (8)
            if (currentTask.id === 'IF_PLUS_TASK' && tc.c === 7 && rIdx === tc.r && cIdx === 8) return true;
            return false;
        }

        // 其他章節：全部鎖定，不允許輸入
        return false;
    }

    // 判斷指定儲存格是否允許玩家複製（不可編輯，但可選取文字）
    _isCellCopyable(rIdx, cIdx, state, currentTask) {
        if (state.currentPhase !== 'SIMULATOR') return false;
        const chapter = state.currentChapter?.toString();
        const condType = currentTask?.expectedCondition?.type;

        // Ch3 / Ch3.5 搜尋類任務：全格開放複製，玩家需要讀取關鍵字貼入尋找框
        if (['30', '35'].includes(chapter) &&
            ['SEARCH_VAL', 'REPLACE_CHECK', 'FUZZY_DONE_SIGNAL'].includes(condType)) {
            return true;
        }


        return false;
    }
}

window.gridRenderer = new GridRenderer('grid');
