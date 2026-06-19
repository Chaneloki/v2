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
                    { id: "fillcolor", skill: "FILL" },
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
        if (isOpening) this.renderSkillList();
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

UIManager.prototype.renderSkillList = function() {
        const container = document.getElementById('s-list');
        const detailPanel = document.getElementById('s-detail-panel');
        const searchVal = document.getElementById('skill-search')?.value.toLowerCase() || "";
        const filter = this.currentSkillFilter || 'all';
        const orchestrator = window.orchestrator;
        
        if (!container || !detailPanel) return;

        const unlocked = orchestrator.state.unlockedSkills || [];
        const defs = orchestrator.skillDefs || {};

        // 重新定義原先的 cat 到新版的實用分類
        const getMappedCategory = (skillId, originalCat) => {
            const fastInputSkills = ['AUTOFILL', 'VALIDATION', 'insert_row', 'insert_col']; // 假設的 fast input 技能
            if (fastInputSkills.includes(skillId)) return 'fast_input';
            if (['move', 'view'].includes(originalCat)) return 'search_move';
            if (['org', 'insert'].includes(originalCat)) return 'org_format';
            if (['data', 'formula', 'logic'].includes(originalCat)) return 'calc_analyze';
            return 'search_move'; // fallback
        };

        const catStyles = {
            'search_move': { color: '#10ac84', icon: '🔍', name: '找資料與移動' },
            'org_format': { color: '#2e86de', icon: '🧹', name: '整理與排版' },
            'fast_input': { color: '#feca57', icon: '⚡', name: '快速輸入' },
            'calc_analyze': { color: '#ee5253', icon: '🧮', name: '運算與分析' }
        };

        const allSkillIds = Object.keys(defs);
        const filteredIds = allSkillIds.filter(id => {
            const s = defs[id];
            if (!s) return false;
            const mappedCat = getMappedCategory(id, s.cat);
            const matchCat = (filter === 'all' || mappedCat === filter);
            const matchSearch = (s.n.toLowerCase().includes(searchVal) || (s.d && s.d.toLowerCase().includes(searchVal)));
            return matchCat && matchSearch;
        });

        container.innerHTML = '';

        if (filteredIds.length === 0) {
            container.innerHTML = '<div class="empty-grimoire">找不到符合的禁術...</div>';
            return;
        }

        filteredIds.forEach(id => {
            const s = defs[id];
            const isUnlocked = unlocked.includes(id);
            const mappedCat = getMappedCategory(id, s.cat);
            const style = catStyles[mappedCat];

            const node = document.createElement('div');
            node.className = `grimoire-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            node.innerHTML = `
                <div class="card-icon" style="background: ${isUnlocked ? style.color : '#95a5a6'};">
                    ${isUnlocked ? (s.icon ? `<img src="${s.icon}">` : style.icon) : '🔒'}
                </div>
                <div class="card-info">
                    <div class="card-name">${isUnlocked ? s.n : '未知禁術'}</div>
                    <div class="card-cat" style="color: ${isUnlocked ? style.color : '#999'}">${style.name}</div>
                </div>
            `;

            node.onclick = () => {
                container.querySelectorAll('.grimoire-card').forEach(n => n.classList.remove('active'));
                node.classList.add('active');

                if (isUnlocked) {
                    // 自動生成一點情境說明 (如果 s.d 是單純的說明，我們幫它包裝一下)
                    const painPoint = s.pain || `當你在龐大的試算表中感到迷失，或是遇到需要大量人工處理的繁瑣工作時...`;
                    const effect = s.d || `發動此魔法，將自動為你處理眼前的難題。`;
                    const shortcutStr = s.s ? `<div class="spell-shortcut">詠唱咒語：<kbd>${s.s}</kbd></div>` : '';

                    detailPanel.innerHTML = `
                        <div class="detail-header">
                            <div class="detail-icon" style="background: ${style.color}">
                                ${s.icon ? `<img src="${s.icon}">` : style.icon}
                            </div>
                            <div class="detail-title">
                                <h2>${s.n}</h2>
                                <span class="detail-badge" style="background: ${style.color}">${style.name}</span>
                            </div>
                        </div>
                        
                        <div class="detail-body">
                            <div class="detail-section pain-point">
                                <h4>💔 常見災難 (Pain Point)</h4>
                                <p>${painPoint}</p>
                            </div>
                            <div class="detail-section effect">
                                <h4>✨ 救贖效果 (Effect)</h4>
                                <p>${effect}</p>
                                ${shortcutStr}
                            </div>
                        </div>

                        <div class="detail-footer">
                            <button class="review-btn" onclick="window.orchestrator.playSkillReplay('${id}')">
                                🎬 回顧賽爾的教學
                            </button>
                        </div>
                    `;
                } else {
                    detailPanel.innerHTML = `
                        <div class="locked-panel">
                            <div class="locked-icon">🔒</div>
                            <h3>尚未領悟的禁術</h3>
                            <p>繼續推進主線劇情，或在公會完成特定委託來解鎖這項強大能力吧！</p>
                        </div>
                    `;
                }
            };

            container.appendChild(node);
        });
        
        // 預設選中第一個
        if (container.firstElementChild) {
            container.firstElementChild.click();
        } else {
            detailPanel.innerHTML = `<div class="locked-panel"><div class="locked-icon">📖</div><h3>請選擇一項禁術</h3></div>`;
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

