/**
 * 試算表魔法冒險 v2 - Ribbon 與 UI 面板模組 (ui_ribbon.js)
 */
console.log("💎 [ui_ribbon.js] 檔案已成功載入！");

    // --- Ribbon 分頁系統 ---
UIManager.prototype.switchTab = function(tabId) {
        this.activeTab = tabId;
        document.querySelectorAll('.ribbon-tabs .tab').forEach(t => {
            t.classList.toggle('active', t.id === `tab-${tabId}`);
        });
        this.renderRibbon(window.orchestrator.state.activeChapterModule?.simulator);
    }

UIManager.prototype.renderRibbon = function(config) {
        const container = document.getElementById('ribbon-btns');
        if (!container || !config) return;

        // #17 快取 key：若章節 + 任務沒有變化，跳過重建
        const state = window.orchestrator.state;
        const tasks = config.tasks;
        const currentTask = tasks[state.currentTaskIndex];
        const chapterId = state.currentChapter.toString();
        const cacheKey = `${chapterId}_${state.currentTaskIndex}`;
        if (container.dataset.cacheKey === cacheKey) return;
        container.dataset.cacheKey = cacheKey;
        container.innerHTML = "";
        const isChallenge = ["25", "35", "55"].includes(chapterId); // 移除 "15"，使其與 Ch1 同步

        // [挑戰模式]: 顯示所有該章節需要的技能
        if (isChallenge) {
            let challengeBtns = [];
            if (chapterId === "25") {
                challengeBtns = [
                    { id: "mergecenter", skill: "MERGE_CENTER" },
                    { id: "border", skill: "BORDER" },
                    { id: "fillcolor", skill: "FILL_COLOR" },
                    { id: "formatpainter", skill: "FORMAT" },
                    { id: "autosum", skill: "SUM" }
                ];
            } else if (chapterId === "35") {
                challengeBtns = [
                    { id: "find_group", skill: "SEARCH" }
                ];
            } else if (chapterId === "55") {
                challengeBtns = [
                    { id: "sort_filter_group", skill: "SORT_SIMPLE" },
                    { id: "data_group", skill: "SUBTOTAL" },
                    { id: "validation_btn", skill: "VALIDATION" }
                ];
            }
            
            challengeBtns.forEach(btnCfg => {
                const skill = window.orchestrator.skillDefs[btnCfg.skill];
                if (skill) {
                    let taskTab = 'start';
                    if (skill.cat === 'move' || skill.cat === 'view') taskTab = 'view';
                    if (skill.cat === 'data') taskTab = 'data';
                    if (skill.cat === 'insert') taskTab = 'insert';
                    
                    if (taskTab === this.activeTab) {
                        this._createRibbonBtn(btnCfg.id, btnCfg.skill, container);
                    }
                }
            });
        } else {
            // 標準模式 (Ch1, Ch1.5, Ch2, Ch3, Ch4, Ch5)
            const renderedBtns = new Set();

            if (currentTask && currentTask.unlockBtnId) {
                const taskTab = currentTask.tab || 'start';

                if (taskTab === this.activeTab) {
                    this._createRibbonBtn(currentTask.unlockBtnId, currentTask.unlockSkillId, container);
                    renderedBtns.add(currentTask.unlockBtnId);
                }
            }

            tasks.forEach(task => {
                if (task.unlockBtnId && state.unlockedSkills.includes(task.unlockSkillId)) {
                    if (!renderedBtns.has(task.unlockBtnId)) {
                        const skill = window.orchestrator.skillDefs[task.unlockSkillId];
                        let taskTab = task.tab || 'start';
                        // [新增]: 優先使用技能定義中的 cat
                        if (skill && skill.cat === 'data') taskTab = 'data';
                        if (skill && skill.cat === 'insert') taskTab = 'insert';
                        if (skill && (skill.cat === 'move' || skill.cat === 'view')) taskTab = 'view';

                        if (taskTab === this.activeTab) {
                            this._createRibbonBtn(task.unlockBtnId, task.unlockSkillId, container);
                            renderedBtns.add(task.unlockBtnId);
                        }
                    }
                }
            });

        }
    }

UIManager.prototype._createRibbonBtn = function(btnId, skillId, container) {
        const skill = window.orchestrator.skillDefs[skillId];
        let btnLabel = skill ? skill.n : btnId;
        
        // [新增]: 針對進階篩選進行特殊樣式處理 (圖示在左，文字在右)
        const isAdvFilter = btnId === 'adv_filter';
        if (isAdvFilter) btnLabel = "進階"; // 強制縮短名稱

        const children = [];
        if (skill && skill.icon) {
            children.push(el('img', { src: skill.icon, alt: btnLabel }));
        }
        children.push(el('span', { innerText: btnLabel }));

        const btn = el('button', {
            id: btnId,
            className: `ribbon-btn ${isAdvFilter ? 'medium-horizontal' : 'big'}`,
            onclick: (e) => this.triggerAction(btnId, e.currentTarget)
        }, children);
        
        container.appendChild(btn);
    }

    // --- 工作表系統 ---
UIManager.prototype.renderSheetBar = function() {
        const bar = document.getElementById('sheet-bar');
        const addBtn = document.getElementById('add-sheet');
        if (!bar || !addBtn) return;

        // 移除現有的標籤 (保留新增按鈕)
        bar.querySelectorAll('.sheet').forEach(s => s.remove());

        const state = window.orchestrator.state;
        const sheets = state.sheets;

        Object.keys(sheets).forEach(id => {
            const label = state.sheetNames[id] || "🛡️ 裝備清單";
            const tab = el('div', {
                className: 'sheet' + (id === state.activeSheetId ? ' active' : ''),
                id: id,
                innerText: label,
                onclick: () => window.orchestrator.switchSheet(id)
            });
            
            addBtn.before(tab);
        });
    }

UIManager.prototype.updateSheetTabUI = function(activeId) {
        document.querySelectorAll('.sheet').forEach(tab => {
            tab.classList.toggle('active', tab.id === activeId);
        });
    }

UIManager.prototype.updateCoins = function(coins) {
        const el = document.getElementById('coin-count');
        if (el) el.innerText = coins;
    }

    // --- 技能系統 ---
UIManager.prototype.openSkills = function() {
        const m = document.getElementById('s-modal');
        if (!m) return;
        const isOpening = m.style.display !== 'block';
        m.style.display = isOpening ? 'block' : 'none';
        if (isOpening) {
            // [新增] 點擊彈窗背景關閉彈窗
            const detailModal = document.getElementById('s-detail-modal');
            if (detailModal && !detailModal.dataset.clickBound) {
                detailModal.dataset.clickBound = "true";
                detailModal.addEventListener('click', (e) => {
                    if (e.target === detailModal) {
                        this.closeDetailModal();
                    }
                });
            }

            this.currentSkillFilter = this.currentSkillFilter || 'layout';
            const tabBtn = document.querySelector(`.skill-tab[onclick*="'${this.currentSkillFilter}'"]`);
            if (tabBtn) {
                document.querySelectorAll('.skill-tab').forEach(t => t.classList.remove('active'));
                tabBtn.classList.add('active');
            }
            this.renderSkillList();
        }
    }

UIManager.prototype.showSkillUnlockToast = function(id, skill) {
        const toast = document.getElementById('skill-toast');
        const name = document.getElementById('skill-toast-name');
        if (!toast || !name) return;
        name.innerText = skill ? skill.n : id;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
        if (document.getElementById('s-modal')?.style.display === 'block') this.renderSkillList();
    }

UIManager.prototype.setSkillFilter = function(cat, btn) {
        this.currentSkillFilter = cat;
        document.querySelectorAll('.skill-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderSkillList();
    }

// 技能樹結構定義 (對齊實用層級與學習進度)
const TreeStructures = {
    layout: {
        title: "📦 版面與可讀性難題",
        subtitle: "解決表格長度過大導致標題消失、欄位錯亂與排版雜亂等閱讀問題。",
        tiers: ["Tier 1: 核心固定", "Tier 2: 分類結構", "Tier 3: 標題對齊", "Tier 4: 視覺美化", "Tier 5: 快速拓印"],
        nodes: [
            { id: "F", x: 60, y: 140, tier: 1 },
            { id: "SWAP", x: 260, y: 60, tier: 2 },
            { id: "S", x: 260, y: 220, tier: 2 },
            { id: "MERGE_CENTER", x: 460, y: 140, tier: 3 },
            { id: "BORDER", x: 660, y: 60, tier: 4 },
            { id: "FILL_COLOR", x: 660, y: 220, tier: 4 },
            { id: "FORMAT", x: 860, y: 140, tier: 5 }
        ],
        connections: [
            { from: "F", to: "SWAP" },
            { from: "F", to: "S" },
            { from: "SWAP", to: "MERGE_CENTER" },
            { from: "S", to: "MERGE_CENTER" },
            { from: "MERGE_CENTER", to: "BORDER" },
            { from: "MERGE_CENTER", to: "FILL_COLOR" },
            { from: "BORDER", to: "FORMAT" },
            { from: "FILL_COLOR", to: "FORMAT" }
        ]
    },
    query: {
        title: "🔍 搜尋與檢索難題",
        subtitle: "在大海撈針的巨量旅客名冊中，精確定位、改寫或篩選符合條件的資料列。",
        tiers: ["Tier 1: 導航躍遷", "Tier 2: 定位排序", "Tier 3: 批次篩選", "Tier 4: 模糊與多重", "Tier 5: 複雜過濾"],
        nodes: [
            { id: "NAV", x: 60, y: 140, tier: 1 },
            { id: "SEARCH", x: 260, y: 60, tier: 2 },
            { id: "SORT_SIMPLE", x: 260, y: 220, tier: 2 },
            { id: "REPLACE", x: 460, y: 60, tier: 3 },
            { id: "FILTER", x: 460, y: 220, tier: 3 },
            { id: "FUZZY", x: 660, y: 60, tier: 4 },
            { id: "SORT_MULTI", x: 660, y: 155, tier: 4 },
            { id: "SORT_CUSTOM", x: 660, y: 250, tier: 4 },
            { id: "FILTER_ADV", x: 860, y: 200, tier: 5 }
        ],
        connections: [
            { from: "NAV", to: "SEARCH" },
            { from: "NAV", to: "SORT_SIMPLE" },
            { from: "SEARCH", to: "REPLACE" },
            { from: "SORT_SIMPLE", to: "FILTER" },
            { from: "REPLACE", to: "FUZZY" },
            { from: "FILTER", to: "SORT_MULTI" },
            { from: "FILTER", to: "SORT_CUSTOM" },
            { from: "SORT_MULTI", to: "FILTER_ADV" },
            { from: "SORT_CUSTOM", to: "FILTER_ADV" }
        ]
    },
    entry: {
        title: "⚡ 輸入與資料防錯",
        subtitle: "解決數據重複輸入手酸、忘記填報日期，以及限制隊友輸入錯誤內容的防錯手段。",
        tiers: ["Tier 1: 規律生成", "Tier 2: 批量填充", "Tier 3: 規範限制"],
        nodes: [
            { id: "AUTOFILL", x: 60, y: 140, tier: 1 },
            { id: "DATE", x: 260, y: 60, tier: 2 },
            { id: "EMPTY", x: 260, y: 220, tier: 2 },
            { id: "VALIDATION", x: 460, y: 140, tier: 3 }
        ],
        connections: [
            { from: "AUTOFILL", to: "DATE" },
            { from: "AUTOFILL", to: "EMPTY" },
            { from: "DATE", to: "VALIDATION" },
            { from: "EMPTY", to: "VALIDATION" }
        ]
    },
    calc: {
        title: "🧮 計算與統計分析",
        subtitle: "公式賦能，實現多維度求和、排名，以及大容量資料分組與多層條件邏輯判斷。",
        tiers: ["Tier 1: 啟動", "Tier 2: 相對計算", "Tier 3: 鎖定排名", "Tier 4: 基礎分流", "Tier 5: 複合邏輯", "Tier 6: 分組大綱", "Tier 7: 多維統計"],
        nodes: [
            { id: "FORMULA_BASIC", x: 60, y: 150, tier: 1 },
            { id: "REF_RELATIVE", x: 230, y: 40, tier: 2 },
            { id: "SUM", x: 230, y: 120, tier: 2 },
            { id: "TEXT_TO_NUM", x: 230, y: 200, tier: 2 },
            { id: "COMPARE_OP", x: 230, y: 280, tier: 2 },
            { id: "REF_ABSOLUTE", x: 400, y: 60, tier: 3 },
            { id: "FUNC_SUM_MULTI", x: 400, y: 160, tier: 3 },
            { id: "FUNC_RANK", x: 570, y: 60, tier: 4 },
            { id: "IF_BASIC", x: 570, y: 180, tier: 4 },
            { id: "IFS", x: 740, y: 30, tier: 5 },
            { id: "IF_PLUS", x: 740, y: 110, tier: 5 },
            { id: "IF_CONCAT", x: 740, y: 190, tier: 5 },
            { id: "IF_AND", x: 740, y: 270, tier: 5 },
            { id: "SUBTOTAL", x: 910, y: 60, tier: 6 },
            { id: "PIVOT_CREATE", x: 910, y: 180, tier: 6 },
            { id: "SUBTOTAL_NESTED", x: 1080, y: 60, tier: 7 },
            { id: "PIVOT_METHOD", x: 1080, y: 150, tier: 7 },
            { id: "PIVOT_GROUP", x: 1080, y: 240, tier: 7 }
        ],
        connections: [
            { from: "FORMULA_BASIC", to: "REF_RELATIVE" },
            { from: "FORMULA_BASIC", to: "SUM" },
            { from: "FORMULA_BASIC", to: "TEXT_TO_NUM" },
            { from: "FORMULA_BASIC", to: "COMPARE_OP" },
            { from: "REF_RELATIVE", to: "REF_ABSOLUTE" },
            { from: "SUM", to: "FUNC_SUM_MULTI" },
            { from: "REF_ABSOLUTE", to: "IF_BASIC" },
            { from: "FUNC_SUM_MULTI", to: "IF_BASIC" },
            { from: "IF_BASIC", to: "IFS" },
            { from: "IF_BASIC", to: "IF_PLUS" },
            { from: "IF_BASIC", to: "IF_CONCAT" },
            { from: "IF_BASIC", to: "IF_AND" },
            { from: "IFS", to: "SUBTOTAL" },
            { from: "IF_PLUS", to: "PIVOT_CREATE" },
            { from: "IF_CONCAT", to: "PIVOT_CREATE" },
            { from: "IF_AND", to: "PIVOT_CREATE" },
            { from: "SUBTOTAL", to: "SUBTOTAL_NESTED" },
            { from: "PIVOT_CREATE", to: "PIVOT_METHOD" },
            { from: "PIVOT_CREATE", to: "PIVOT_GROUP" }
        ]
    }
};

// 賽爾貼心生存指南吐槽庫
const CielTipsRegistry = {
    F: "游標記得點在首列或表格內，不然魔導書抓不到要凍結誰喔！",
    SWAP: "按住 Shift 的時候一定要看到綠色插入虛線出現再放開，不然會直接覆蓋！",
    S: "新建立的分頁記得雙擊修改一個好認的名字，免得之後稽查官找不到在哪。",
    MERGE_CENTER: "合併儲存格後只會保留最左上角那一格的資料，如果裡面都有寫字可別瞎合併！",
    BORDER: "外框要粗，內線要細。別把整張表塗成黑炭格子，典儀官會嫌棄的！",
    FILL_COLOR: "底色不要選飽和度太高的亮色，保護一下別人的視網膜，淡雅的淺綠或淺灰才是高級感。",
    FORMAT: "先選取你的『完美範例』，點擊格式刷，就可以批次將排版拓印到下方所有空白資料列！",
    NAV: "數據斷層（比如中間有空行）會攔截跳轉，記得多跳幾次直到真正的底端！",
    SEARCH: "字元拼音或大小寫不同會漏找，點開選項可以設定完全匹配來精確定位。",
    SORT_SIMPLE: "千萬只選一欄就按排序！系統會提示你要擴充選取範圍，否則會導致男女配對或資料錯移！",
    REPLACE: "如果不小心在沒有設定尋找範圍時點了全部取代，整張表格的名冊都有可能被你毀掉，記得先按 Ctrl+Z！",
    FILTER: "篩選隱藏的行並不是刪除，它們只是躲起來了。隨時點擊【清除篩選】即可恢復名冊全貌。",
    FUZZY: "星號 * 代表任意長度字元，問號 ? 剛好代表一個字元，例如『旅客 3?』能精準抓出 30 到 39 號旅客！",
    SORT_MULTI: "排序層級的優先順序是從上往下執行的，第一排序條件完全相同時才會執行第二條件！",
    SORT_CUSTOM: "如果在自訂清單裡打錯了順序字眼（如打成輕症、重症、中症），排序就會完全偏離你的計畫。",
    FILTER_ADV: "條件區域的表頭必須與主表格完全一致，連空格都不能多，否則進階篩選會無法識別！",
    AUTOFILL: "選中兩個有規律的格子（如1和2），滑鼠懸停到右下角變成黑色十字點時，點擊並向下拖曳！",
    DATE: "按 Ctrl + ; 可以快速生成當天日期！記得別在中文輸入法下輸入分號喔，不然魔導書會生氣的！",
    EMPTY: "定位空格後，不要亂動選取區！在編輯欄直接輸入公式（如 =↑ 複製上列），然後按 Ctrl + Enter 填滿！",
    FORMULA_BASIC: "等號是一切公式的發動咒語。在儲存格寫 any 加減乘除前，必須先敲下 = 號！",
    REF_RELATIVE: "相對引用會跟著你公式的拖曳方向跟著跑。你往下一行，它參照的位置就往下一行，非常聰明！",
    SUM: "按下 Alt + = 即可一鍵求和。它會聰明地往上或往左自動尋找數字邊界，為你省去打字的麻煩！",
    REF_ABSOLUTE: "鎖定儲存格的魔法！按一下 F4 鍵，儲存格字母 and 數字前面就會出現 $ 符號，這樣公式怎麼拖它都不會動！",
    FUNC_SUM_MULTI: "SUM 函數裡面用英文逗號隔開不同的單格或範圍，它會自動將它們全部加總，實現跳躍求和！",
    FUNC_RANK: "RANK 函數的第二個範圍參數必須絕對引用（鎖定），否則往下拖曳公式時，對比的範圍會跑位！",
    IF_BASIC: "IF 的三個參數缺一不可：IF(我的測試條件, 成立時回傳A, 不成立時回傳B)。",
    IFS: "IFS 是多重條件的最佳選擇。它會由左往右逐一檢查條件，只要有一項成立就停止並傳回結果，注意條件要由嚴格排到寬鬆！",
    IF_PLUS: "TRUE 乘上任何數字等於該數字本身，FALSE 乘上任何數字等於 0，用這個小算術可以完美省去 IF 嵌套！",
    PIVOT_CREATE: "選好名冊資料範圍，直接點擊【插入】➜【樞紐分析表】。建立後，把需要歸類的欄位拖進『列』即可！"
};

UIManager.prototype.renderSkillList = function() {
        const canvasArea = document.getElementById('tree-canvas-area');
        const svg = document.getElementById('tree-svg');
        const bg = document.getElementById('tree-grid-bg');
        const detailPanel = document.getElementById('s-detail-panel');
        const searchVal = document.getElementById('skill-search')?.value.toLowerCase() || "";
        const filter = (this.currentSkillFilter && this.currentSkillFilter !== 'all') ? this.currentSkillFilter : 'layout';
        const orchestrator = window.orchestrator;
        
        if (!canvasArea || !svg || !bg || !detailPanel) return;

        const unlockedSkills = orchestrator.state.unlockedSkills || [];
        const allSkillDefs = orchestrator.skillDefs || {};

        const treeCfg = TreeStructures[filter];
        if (!treeCfg) return;

        // 更新進度條文字 (如果有的話)
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            const totalCount = Object.keys(allSkillDefs).length || 24;
            const progressPercent = Math.round((unlockedSkills.length / totalCount) * 100);
            progressText.innerText = `已領悟技能：${unlockedSkills.length} / ${totalCount} (${progressPercent}%)`;
        }

        // 1. 調整畫布尺寸適應層級數量
        const totalTiers = treeCfg.tiers.length;
        const tierWidth = (filter === 'calc') ? 170 : 200;
        const canvasWidth = totalTiers * tierWidth + 80;
        canvasArea.style.width = `${canvasWidth}px`;
        bg.style.width = `${canvasWidth}px`;
        
        // 動態計算高度防止底部節點卡片被裁切
        const maxY = Math.max(...treeCfg.nodes.map(n => n.y));
        const canvasHeight = Math.max(340, maxY + 75);
        canvasArea.style.height = `${canvasHeight}px`;

        // 2. 渲染背景 Tier 分欄
        bg.innerHTML = '';
        for(let i=0; i<totalTiers; i++) {
            const col = document.createElement('div');
            col.className = 'tree-grid-col';
            col.style.width = `${tierWidth}px`;
            col.style.flex = 'none';
            col.innerHTML = `<span class="tree-grid-col-title">${treeCfg.tiers[i]}</span>`;
            bg.appendChild(col);
        }

        // 3. 清理舊卡片 (保留 SVG)
        canvasArea.querySelectorAll('.tree-node-card').forEach(n => n.remove());
        svg.innerHTML = '';

        const nodeWidth = 120;
        const nodeHeight = 52;

        // 4. 繪製卡片節點
        treeCfg.nodes.forEach(node => {
            const s = allSkillDefs[node.id];
            const isUnlocked = unlockedSkills.includes(node.id);
            
            // 搜尋過濾條件
            let matchesSearch = true;
            if (searchVal) {
                matchesSearch = s && (s.n.toLowerCase().includes(searchVal) || (s.d && s.d.toLowerCase().includes(searchVal)) || (s.s && s.s.toLowerCase().includes(searchVal)));
            }

            const card = document.createElement('div');
            card.className = `tree-node-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            card.id = `node-${node.id}`;
            card.style.left = `${node.x}px`;
            card.style.top = `${node.y}px`;

            card.innerHTML = `
                <div class="node-name-label">${isUnlocked ? (s ? s.n : node.id) : '未解鎖禁術'}</div>
                <div class="node-badge">${isUnlocked ? '已掌握' : ''}</div>
                <div class="node-lock-icon">🔒</div>
            `;

            if (matchesSearch === false) {
                card.style.opacity = '0.15';
            }

            // 點擊事件：載入詳情
            card.onclick = () => this.selectNode(node.id, treeCfg, true);
            
            // 懸停高亮上下游依賴關係
            card.onmouseenter = () => this.highlightPaths(node.id, treeCfg);
            card.onmouseleave = () => this.resetPaths();

            canvasArea.appendChild(card);
        });

        // 5. 繪製 SVG 貝茲連線
        treeCfg.connections.forEach(conn => {
            const fromNode = treeCfg.nodes.find(n => n.id === conn.from);
            const toNode = treeCfg.nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return;

            const isFromUnlocked = unlockedSkills.includes(conn.from);
            const isToUnlocked = unlockedSkills.includes(conn.to);
            const isLinkUnlocked = isFromUnlocked && isToUnlocked;

            const startX = fromNode.x + nodeWidth;
            const startY = fromNode.y + nodeHeight / 2;
            const endX = toNode.x;
            const endY = toNode.y + nodeHeight / 2;
            const dx = Math.abs(endX - startX) * 0.45;

            // 繪製二次貝茲曲線
            const pathStr = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathStr);
            path.setAttribute('class', `tree-link ${isLinkUnlocked ? 'unlocked' : 'locked'}`);
            path.setAttribute('id', `link-${conn.from}-${conn.to}`);
            path.dataset.from = conn.from;
            path.dataset.to = conn.to;

            svg.appendChild(path);
        });

        // 預設點選第一個節點 (非手動點擊，不彈出視窗)
        if (treeCfg.nodes.length > 0) {
            this.selectNode(treeCfg.nodes[0].id, treeCfg, false);
        }
    }

UIManager.prototype.selectNode = function(id, config, isManualClick = false) {
        document.querySelectorAll('.tree-node-card').forEach(n => n.classList.remove('active'));
        const activeCard = document.getElementById(`node-${id}`);
        if (activeCard) activeCard.classList.add('active');

        const unlockedSkills = window.orchestrator.state.unlockedSkills || [];
        const allSkillDefs = window.orchestrator.skillDefs || {};
        const s = allSkillDefs[id];
        const isUnlocked = unlockedSkills.includes(id);
        const detailPanel = document.getElementById('s-detail-panel');
        const filter = (this.currentSkillFilter && this.currentSkillFilter !== 'all') ? this.currentSkillFilter : 'layout';

        const catStyles = {
            'layout': { color: '#1c72cd', name: '版面與可讀性' },
            'query': { color: '#0d8a66', name: '搜尋與檢索' },
            'entry': { color: '#c07a00', name: '輸入與防錯' },
            'calc': { color: '#d32f2f', name: '計算與統計分析' }
        };

        const style = catStyles[filter] || { color: '#888', name: '未知' };

        if (!s) {
            detailPanel.innerHTML = `<div class="locked-panel"><div class="locked-icon">📖</div><h3>未定義技能</h3></div>`;
            return;
        }

        if (isUnlocked) {
            // 痛點與說明
            const painText = s.pain || "表格向下延伸或數據過多時，難以肉眼直觀分析資料。";
            const effectText = s.d || "發動魔法後將解決數據痛點。";
            
            // 處理操作路徑的鍵盤樣式括號標記
            const formatPath = (pathStr) => {
                if (!pathStr) return "";
                return pathStr.replace(/Ctrl\s*\+\s*H/g, '<kbd>Ctrl</kbd> + <kbd>H</kbd>')
                              .replace(/Ctrl\s*\+\s*F/g, '<kbd>Ctrl</kbd> + <kbd>F</kbd>')
                              .replace(/Ctrl\s*\+\s*;/g, '<kbd>Ctrl</kbd> + <kbd>;</kbd>')
                              .replace(/Alt\s*\+\s*=/g, '<kbd>Alt</kbd> + <kbd>=</kbd>')
                              .replace(/Ctrl/g, '<kbd>Ctrl</kbd>')
                              .replace(/Shift/g, '<kbd>Shift</kbd>')
                              .replace(/Alt/g, '<kbd>Alt</kbd>')
                              .replace(/F4/g, '<kbd>F4</kbd>')
                              .replace(/F5/g, '<kbd>F5</kbd>');
            };
            const formattedPath = formatPath(s.s);
            const cielTip = CielTipsRegistry[id] || "選取正確的表格儲存格再點擊發動，這是一切操作的鐵律！";

            // 3. 【技能脈絡 (Skill Context)】- 查找前置與後續
            const parentIds = s.parents || [];
            const childIds = [];
            config.connections.forEach(conn => {
                if (conn.from === id) childIds.push(conn.to);
            });

            let contextHtml = '';
            if (parentIds.length > 0 || childIds.length > 0) {
                contextHtml = `<div class="detail-section skill-context-box">
                    <h4>🔗 技能脈絡關係</h4>`;
                
                if (parentIds.length > 0) {
                    const parentNames = parentIds.map(pid => {
                        const ps = allSkillDefs[pid];
                        return `<span class="context-link" onclick="window.uiManager.jumpToNode('${pid}')">${ps ? ps.n : pid}</span>`;
                    }).join(', ');
                    contextHtml += `<p style="margin-bottom:8px">前置依賴：基於你已掌握的 ${parentNames}，才能順利施展本項操作。</p>`;
                }
                
                if (childIds.length > 0) {
                    const childNames = childIds.map(cid => {
                        const cs = allSkillDefs[cid];
                        return `<span class="context-link" onclick="window.uiManager.jumpToNode('${cid}')">${cs ? cs.n : cid}</span>`;
                    }).join(', ');
                    contextHtml += `<p>解鎖衍生：掌握本項後，你將能解鎖學習更強大的 ${childNames}！</p>`;
                }
                
                contextHtml += `</div>`;
            }

            detailPanel.innerHTML = `
                <div class="detail-header">
                    <div class="detail-icon" style="background: ${style.color}">
                        ${filter === 'layout' ? '📦' : (filter === 'query' ? '🔍' : (filter === 'entry' ? '⚡' : '🧮'))}
                    </div>
                    <div class="detail-title">
                        <h2>${s.n}</h2>
                        <span class="detail-badge" style="background: ${style.color}">${style.name}</span>
                    </div>
                </div>
                
                <div class="detail-body">
                    <div class="detail-section pain-point">
                        <h4>💔 遇見的麻煩 (Pain Point)</h4>
                        <p>${painText}</p>
                    </div>
                    
                    <div class="detail-section effect">
                        <h4>✨ 施展路徑 (Action Path)</h4>
                        <p>${effectText}</p>
                        <div class="spell-shortcut">路徑：${formattedPath}</div>
                    </div>

                    <div class="detail-section ciel-tips">
                        <h4>🧚 賽爾的生存提示 (Ciel's Tips)</h4>
                        <p>「${cielTip}」</p>
                    </div>

                    ${contextHtml}
                </div>

                <div class="detail-footer">
                    <button class="review-btn" disabled style="background: #cccccc !important; color: #888888 !important; box-shadow: none !important; cursor: not-allowed !important;">
                        🎬 回顧賽爾的教學 (未完成)
                    </button>
                </div>
            `;
        } else {
            detailPanel.innerHTML = `
                <div class="locked-panel">
                    <div class="locked-icon">🔒</div>
                    <h3>未領悟的禁術</h3>
                    <p>這項能力需要你在驛站冒險中，進一步處理更多混亂的數據委託，或完成前置技能的修煉後解鎖！</p>
                </div>
            `;
        }

        // 手動點擊時，彈出詳情視窗
        if (isManualClick) {
            const modal = document.getElementById('s-detail-modal');
            if (modal) modal.style.display = 'flex';
        }
    }

UIManager.prototype.closeDetailModal = function() {
        const modal = document.getElementById('s-detail-modal');
        if (modal) modal.style.display = 'none';
    }

UIManager.prototype.highlightPaths = function(nodeId, config) {
        const upstreams = new Set();
        const downstreams = new Set();

        // 遞迴尋找上游依賴
        function findUpstreams(curr) {
            config.connections.forEach(conn => {
                if (conn.to === curr && !upstreams.has(conn.from)) {
                    upstreams.add(conn.from);
                    const link = document.getElementById(`link-${conn.from}-${curr}`);
                    if (link) link.classList.add('highlight-upstream');
                    findUpstreams(conn.from);
                }
            });
        }

        // 遞迴尋找下游解鎖
        function findDownstreams(curr) {
            config.connections.forEach(conn => {
                if (conn.from === curr && !downstreams.has(conn.to)) {
                    downstreams.add(conn.to);
                    const link = document.getElementById(`link-${curr}-${conn.to}`);
                    if (link) link.classList.add('highlight-downstream');
                    findDownstreams(conn.to);
                }
            });
        }

        findUpstreams(nodeId);
        findDownstreams(nodeId);

        // 卡片邊框高亮
        upstreams.forEach(id => {
            const el = document.getElementById(`node-${id}`);
            if (el) el.style.borderColor = '#ffe566';
        });
        downstreams.forEach(id => {
            const el = document.getElementById(`node-${id}`);
            if (el) el.style.borderColor = '#2ed573';
        });
    }

UIManager.prototype.resetPaths = function() {
        document.querySelectorAll('.tree-link').forEach(l => {
            l.classList.remove('highlight-upstream', 'highlight-downstream');
        });
        document.querySelectorAll('.tree-node-card').forEach(c => {
            c.style.borderColor = ''; // 還原樣式
        });
    }

UIManager.prototype.jumpToNode = function(nodeId) {
        // 尋找 nodeId 所在的類別
        let targetCat = null;
        Object.keys(TreeStructures).forEach(cat => {
            const hasNode = TreeStructures[cat].nodes.some(n => n.id === nodeId);
            if (hasNode) targetCat = cat;
        });

        if (targetCat) {
            if (targetCat !== this.currentSkillFilter) {
                const tabBtn = document.querySelector(`.skill-tab[onclick*="'${targetCat}'"]`);
                this.setSkillFilter(targetCat, tabBtn);
            }
            
            // 點擊並滾動至該節點
            setTimeout(() => {
                const card = document.getElementById(`node-${nodeId}`);
                if (card) {
                    card.click();
                    // 滾動 viewport 到中央
                    const viewport = document.getElementById('tree-viewport');
                    if (viewport) {
                        const xPos = parseInt(card.style.left) - viewport.clientWidth / 2 + card.clientWidth / 2;
                        viewport.scrollTo({ left: Math.max(0, xPos), behavior: 'smooth' });
                    }
                }
            }, 100);
        }
    }

UIManager.prototype.updatePlayerSBtn = function() {
        const sBtn = document.getElementById('s-btn');
        if (!sBtn) return;
        const chapter = window.orchestrator.state.currentChapter;
        const gender = window.orchestrator.state.playerConfig.gender;

        if (chapter >= 1.5) {
            sBtn.innerHTML = `<img src="Charater/main ${gender}.png" style="width:100%; height:100%; object-fit: cover;">`;
            sBtn.style.borderRadius = '50%';
            sBtn.style.border = '3px solid #ffd700';
            sBtn.style.overflow = 'hidden';
            sBtn.style.background = '#fff';
        } else {
            sBtn.innerHTML = '📜';
            sBtn.style.borderRadius = '10px';
            sBtn.style.border = 'none';
        }
    }

