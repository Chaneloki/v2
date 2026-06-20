/**
 * UI_v2 - ui_v2_menus.js
 */

UIManager.prototype.toggleSystemMenu = function() {
    const overlay = document.getElementById('sys-menu-overlay');
    if (!overlay) return;
    if (overlay.classList.contains('sys-overlay-hide')) {
        overlay.style.display = 'flex';
        // Q3 rAF 雙幀取代 void offsetWidth，消除同步 reflow
        requestAnimationFrame(() => requestAnimationFrame(() => {
            overlay.classList.remove('sys-overlay-hide');
            overlay.classList.add('sys-overlay-show');
        }));
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
    // Q3 rAF 雙幀取代 void offsetWidth
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.remove('sys-overlay-hide');
        overlay.classList.add('sys-overlay-show');
    }));
};

/**
 * [新增]: 番外篇與小型試煉入口（僅在完成第 8.5 章後解鎖，不需另外存檔）
 */
UIManager.prototype.goToExtras = function() {
    // [Fix 2026-06-21] 改用獨立旗標 magic_excel_v2_extras_unlocked 判斷，
    // 不再只看目前存檔的 currentChapter —— 否則 Ch8.5「無所謂了」結局
    // 清空 localStorage 後，玩家先前已解鎖的番外篇就會被誤判成尚未解鎖。
    const unlocked = localStorage.getItem('magic_excel_v2_extras_unlocked') === 'true';
    if (unlocked) {
        window.location.href = 'extras.html';
    } else {
        this.showMagicToast('完成第 8.5 章後即可開啟番外篇與小型試煉！', 'error');
    }
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

/**
 * [Fix 2026-06-19] 自訂頁內確認對話框（取代原生 confirm）。
 * 原生 window.confirm() 在 Chrome 會強制退出全螢幕，無法在之後可靠地復原
 * （瀏覽器不把對話框關閉視為使用者手勢）。改用此頁內彈窗即可完全避免退出全螢幕。
 * @returns {Promise<boolean>}
 */
UIManager.prototype.uiConfirm = function(message) {
    return new Promise((resolve) => {
        let modal = document.getElementById('ui-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ui-confirm-modal';
            modal.style.cssText =
                'display:none;position:fixed;inset:0;z-index:30000;' +
                'background:rgba(0,0,0,0.7);align-items:center;justify-content:center;';
            modal.innerHTML =
                '<div style="background:linear-gradient(145deg,#1a0f0a,#2a1a10);' +
                'border:2px solid rgba(255,215,0,0.6);border-radius:14px;padding:28px 26px;' +
                'max-width:min(420px,90vw);box-shadow:0 0 40px rgba(0,0,0,0.7);text-align:center;">' +
                '<div id="ui-confirm-msg" style="color:#e8d5a3;font-size:1rem;line-height:1.7;' +
                'margin-bottom:24px;white-space:pre-line;"></div>' +
                '<div style="display:flex;gap:14px;justify-content:center;">' +
                '<button id="ui-confirm-ok" style="padding:10px 28px;border-radius:8px;cursor:pointer;' +
                'border:1px solid rgba(255,215,0,0.6);background:rgba(255,215,0,0.18);color:#ffd700;' +
                'font-size:0.95rem;font-weight:700;letter-spacing:1px;">確定</button>' +
                '<button id="ui-confirm-cancel" style="padding:10px 28px;border-radius:8px;cursor:pointer;' +
                'border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.08);color:#ccc;' +
                'font-size:0.95rem;letter-spacing:1px;">取消</button>' +
                '</div></div>';
            document.body.appendChild(modal);
        }
        document.getElementById('ui-confirm-msg').textContent = message;
        modal.style.display = 'flex';

        const okBtn = document.getElementById('ui-confirm-ok');
        const cancelBtn = document.getElementById('ui-confirm-cancel');
        const cleanup = (result) => {
            modal.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(result);
        };
        okBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
    });
};

UIManager.prototype.handleSaveLoadClick = function(slot) {
    if(this.slMode === 'save') {
        const meta = window.orchestrator.getSaveMeta();
        const hasData = meta[slot] !== null;
        const proceed = (ok) => {
            if (!ok) return;
            window.orchestrator.saveGame(slot);
            window.uiManager.showMagicToast('手動存檔成功！', 'success');
            this.closeSaveLoadMenu();
        };
        if (!hasData) { proceed(true); return; }
        this.uiConfirm(`確定要儲存進度到 [${slot}] 嗎？\n這將會覆蓋原本的進度。`).then(proceed);
    } else {
        this.uiConfirm(`確定要讀取 [${slot}] 的進度嗎？\n未儲存的當前進度將會遺失。`).then((ok) => {
            if (!ok) return;
            window.orchestrator.loadGame(slot).then(success => {
                if(success) {
                    const titleScreen = document.getElementById('title-screen-overlay');
                    if(titleScreen && titleScreen.style.display !== 'none') {
                        titleScreen.style.opacity = '0';
                        setTimeout(() => titleScreen.style.display = 'none', 800);
                    }
                }
            });
            this.closeSaveLoadMenu();
        });
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
                this.uiConfirm(`確定要花費 ${av.price} G 購買「${av.name}」嗎？`).then((ok) => {
                    if (ok) {
                        state.coins -= av.price;
                        state.unlockedAvatars.push(av.id);
                        window.orchestrator.saveGame();
                        this.updateTopBarCoins(); // 更新左上角金幣
                        this.openAvatarShop(); // 重新渲染商店
                        this.showMagicToast('購買成功！可以在地圖中按 [Tab] 切換角色。', 'success');
                    }
                });
            };
        } else if (!isUnlocked) {
            card.onclick = () => this.showMagicToast('金幣不足！', 'error');
        }
        itemsContainer.appendChild(card);
    });
    
    overlay.style.display = 'flex';
    // Q3 rAF 雙幀取代 void offsetWidth
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.remove('sys-overlay-hide');
        overlay.classList.add('sys-overlay-show');
    }));
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

// ================= 新增：回憶日記 (Memory Diary) 功能 =================
UIManager.prototype.openMemoryDiary = function() {
    let overlay = document.getElementById('memory-diary-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'memory-diary-overlay';
        overlay.className = 'sys-overlay-hide modal-layer';
        document.body.appendChild(overlay);
    }
    
    // 計算最大解鎖章節，確保玩家重玩前面關卡時依然保留最高章節記錄
    let maxChapStr = localStorage.getItem('magic_excel_max_chapter');
    let maxChap = parseInt(maxChapStr || "10", 10);
    const currChap = parseInt(window.orchestrator.state.currentChapter, 10);
    if (currChap > maxChap) {
        maxChap = currChap;
        localStorage.setItem('magic_excel_max_chapter', maxChap);
    }

    const chapMap = [
        {val: 10, name: '第一章'},
        {val: 15, name: '第 1.5 章'},
        {val: 20, name: '第二章'},
        {val: 25, name: '第 2.5 章'},
        {val: 30, name: '第三章'},
        {val: 35, name: '第 3.5 章'},
        {val: 40, name: '第四章'},
        {val: 45, name: '第 4.5 章'},
        {val: 50, name: '第五章'},
        {val: 55, name: '第 5.5 章'},
        {val: 60, name: '第六章'},
        {val: 65, name: '第 6.5 章'},
        {val: 70, name: '第七章'},
        {val: 75, name: '第 7.5 章'},
        {val: 80, name: '第八章'},
        {val: 85, name: '第 8.5 章'}
    ];

    let itemsHTML = '';
    chapMap.forEach(ch => {
        if (ch.val <= maxChap) {
            itemsHTML += `
                <div style="border:2px solid #d2b48c; padding:15px; margin:5px 0; border-radius:10px; background:#fdf5e6; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#ffeeba'" onmouseout="this.style.background='#fdf5e6'" onclick="window.uiManager.reviewChapter(${ch.val})">
                    <span style="font-size:28px; vertical-align:middle;">📖</span>
                    <strong style="color:#8b4513; margin-left:15px; font-size:18px;">${ch.name}</strong>
                </div>
            `;
        } else {
            itemsHTML += `
                <div style="border:2px dashed #ccc; padding:15px; margin:5px 0; border-radius:10px; background:#f5f5f5; color:#999; cursor:not-allowed;">
                    <span style="font-size:28px; vertical-align:middle; filter:grayscale(1);">🔒</span>
                    <strong style="margin-left:15px; font-size:18px;">尚未解鎖</strong>
                </div>
            `;
        }
    });

    overlay.innerHTML = `
        <div class="sys-menu-panel" style="max-width: 500px; max-height:85vh; display:flex; flex-direction:column;">
            <div class="sys-menu-header" style="flex-shrink:0;">
                <h2>📖 回憶日記 (Memory Diary)</h2>
                <div class="sys-close-btn" onclick="window.uiManager.closeMemoryDiary()">×</div>
            </div>
            <div style="margin: 15px 0; color:#555; font-size:14px; line-height:1.5; flex-shrink:0;">
                <p>點擊已解鎖的章節可以回顧劇情或重新挑戰試算表關卡。</p>
                <p style="color:#b22222; font-weight:bold; margin-top:5px; background:rgba(178,34,34,0.1); padding:8px; border-radius:5px;">
                    ⚠️ 警告：跳轉至舊章節會更新您的當前進度。<br>強烈建議在回顧前，先在系統選單建立一個【手動存檔】！
                </p>
            </div>
            <div style="flex-grow:1; overflow-y:auto; padding-right:10px; display:flex; flex-direction:column; gap:8px;">
                ${itemsHTML}
            </div>
        </div>
    `;
    
    overlay.style.display = 'flex';
    // Q3 rAF 雙幀取代 void offsetWidth
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.remove('sys-overlay-hide');
        overlay.classList.add('sys-overlay-show');
    }));
};

UIManager.prototype.closeMemoryDiary = function() {
    const overlay = document.getElementById('memory-diary-overlay');
    if(!overlay) return;
    overlay.classList.remove('sys-overlay-show');
    overlay.classList.add('sys-overlay-hide');
    setTimeout(() => {
        if(overlay.classList.contains('sys-overlay-hide')) {
            overlay.style.display = 'none';
        }
    }, 200);
};



UIManager.prototype.reviewChapter = function(chapVal) {
    this.uiConfirm('確定要回顧這個章節嗎？\n請注意：這會將你的進度暫時跳轉到該章節，若不希望影響目前的進度，建議您先使用【手動存檔】！').then((ok) => {
        if (ok) {
            this.closeMemoryDiary();
            window.orchestrator.state.currentChapter = chapVal;
            window.orchestrator.loadChapter(chapVal).then(() => {
                window.orchestrator.triggerPhase('STORY_START');
                if (window.rpgEngine) {
                    window.rpgEngine.stop();
                }
            });
        }
    });
};

UIManager.prototype.confirmOpenSkillBook = function() {
    this.uiConfirm("確定要前往禁術大全嗎？\n未儲存的當前進度將會遺失。\n建議在前往前先「儲存進度」！").then((ok) => {
        if (ok) {
            window.location.href = 'skill_book.html';
        }
    });
};
