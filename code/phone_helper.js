/**
 * [手機助理系統] Phone Helper
 * 當玩家使用手機模式遇到鍵盤/滑鼠動作任務時，
 * 彈出助理對話框 → 播放幽靈游標示範動畫 → 代為執行動作。
 *
 * Added: 2026-06-19
 * Affects: Ch1 / Ch1.5 的 QUICK_JUMP / JUMP_UP / COLUMN_SWAP / AUTO_FILL / INSERT_DATE
 */

window.phoneHelper = (function () {

    /* ── 手機不相容的動作 ──────────────────────────────────────── */
    var INCOMPATIBLE = {
        'QUICK_JUMP':  { key: 'Ctrl + ↓', desc: '快速跳到資料底端' },
        'JUMP_UP':     { key: 'Ctrl + ↑', desc: '快速跳回資料頂端' },
        'COLUMN_SWAP': { key: 'Shift + 拖曳', desc: '交換欄位位置' },
        'AUTO_FILL':   { key: '拖曳填滿柄', desc: '自動填入序列編號' },
        'INSERT_DATE': { key: 'Ctrl + ;', desc: '插入今天的日期' },
    };

    /* ── 工具 ─────────────────────────────────────────────────── */
    function isMobile() {
        return localStorage.getItem('v2_device_mode') === 'mobile';
    }

    /* ── DOM 元素（懶初始化）──────────────────────────────────── */
    var _dom = {};

    function _ensureDOM() {
        if (_dom.ready) return;
        _dom.ready = true;

        /* 助理氣泡（可互動，z=16000） */
        _dom.bubble = document.createElement('div');
        _dom.bubble.id = 'ph-bubble';
        _dom.bubble.style.cssText =
            'display:none;position:fixed;inset:0;z-index:16000;' +
            'background:rgba(0,0,0,0.62);align-items:center;justify-content:center;' +
            'pointer-events:auto;';
        _dom.bubble.innerHTML =
            '<div style="background:linear-gradient(145deg,#0a1628,#1b3050);' +
            'border:2px solid rgba(255,215,0,0.55);border-radius:18px;padding:20px 18px;' +
            'max-width:min(360px,90vw);width:calc(100vw - 40px);max-height:90vh;overflow-y:auto;' +
            'box-shadow:0 0 50px rgba(0,0,0,0.8);text-align:center;">' +
                '<img id="ph-fairy" src="Charater/fairy.png" style="height:60px;object-fit:contain;' +
                'margin-bottom:8px;filter:drop-shadow(0 0 10px rgba(100,200,255,0.8));">' +
                '<div id="ph-msg" style="color:#e8d5a3;font-size:clamp(0.75rem,2.5vw,0.98rem);line-height:1.6;' +
                'margin-bottom:12px;word-break:break-word;"></div>' +
                '<div id="ph-key-badge" style="display:inline-block;' +
                'background:rgba(255,215,0,0.12);border:1.5px solid rgba(255,215,0,0.55);' +
                'border-radius:8px;padding:8px 16px;font-size:clamp(1rem,2.5vw,1.25rem);font-family:monospace;' +
                'color:#ffd700;letter-spacing:2px;font-weight:700;margin-bottom:16px;word-break:break-word;overflow-wrap:break-word;"></div>' +
                '<br>' +
                '<button id="ph-ok-btn" style="margin-top:6px;padding:10px 20px;' +
                'background:linear-gradient(135deg,rgba(33,115,70,0.65),rgba(33,115,70,0.45));' +
                'border:2px solid rgba(33,115,70,0.85);border-radius:30px;color:#fff;' +
                'font-size:clamp(0.85rem,2vw,1rem);font-weight:700;letter-spacing:1px;cursor:pointer;' +
                'transition:background 0.2s;white-space:normal;'>好的，示範給我看！</button>' +
            '</div>';
        document.body.appendChild(_dom.bubble);

        /* 動畫覆蓋層（pointer-events:none，z=15000） */
        _dom.overlay = document.createElement('div');
        _dom.overlay.id = 'ph-overlay';
        _dom.overlay.style.cssText =
            'display:none;position:fixed;inset:0;z-index:15000;pointer-events:none;';
        document.body.appendChild(_dom.overlay);

        /* 幽靈游標 */
        _dom.cursor = document.createElement('div');
        _dom.cursor.id = 'ph-cursor';
        _dom.cursor.innerHTML =
            '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M4 2 L4 27 L9 21 L15 33 L18 31 L12 19 L21 19 Z"' +
            ' fill="white" stroke="#1a1a1a" stroke-width="1.8"/></svg>';
        _dom.cursor.style.cssText =
            'position:absolute;opacity:0;pointer-events:none;' +
            'transition:left 0.55s cubic-bezier(.4,0,.2,1),top 0.55s cubic-bezier(.4,0,.2,1),opacity 0.3s;' +
            'filter:drop-shadow(2px 3px 5px rgba(0,0,0,0.55));z-index:2;';
        _dom.overlay.appendChild(_dom.cursor);

        /* 拖曳軌跡線 */
        _dom.dragLine = document.createElement('div');
        _dom.dragLine.id = 'ph-drag-line';
        _dom.dragLine.style.cssText =
            'position:absolute;pointer-events:none;opacity:0;' +
            'background:rgba(33,115,70,0.65);width:3px;border-radius:2px;' +
            'transition:height 0.5s ease,opacity 0.3s;transform-origin:top center;z-index:1;';
        _dom.overlay.appendChild(_dom.dragLine);

        /* 按鍵提示牌（z=3，居中固定） */
        _dom.keyHint = document.createElement('div');
        _dom.keyHint.id = 'ph-key-hint';
        _dom.keyHint.style.cssText =
            'position:fixed;top:44%;left:50%;transform:translate(-50%,-50%);' +
            'background:rgba(0,0,0,0.88);color:#ffd700;padding:16px 28px;' +
            'border-radius:12px;font-size:1.8rem;font-weight:700;font-family:monospace;' +
            'letter-spacing:4px;border:2px solid rgba(255,215,0,0.6);' +
            'box-shadow:0 0 28px rgba(255,215,0,0.28);opacity:0;transition:opacity 0.4s;' +
            'pointer-events:none;z-index:3;text-align:center;white-space:nowrap;';
        _dom.overlay.appendChild(_dom.keyHint);

        /* 綁定 OK 按鈕 hover */
        var okBtn = document.getElementById('ph-ok-btn');
        okBtn.addEventListener('mouseover', function () {
            okBtn.style.background = 'rgba(33,115,70,0.9)';
        });
        okBtn.addEventListener('mouseout', function () {
            okBtn.style.background =
                'linear-gradient(135deg,rgba(33,115,70,0.65),rgba(33,115,70,0.45))';
        });
    }

    /* ── 游標 / 鍵盤提示工具 ──────────────────────────────────── */
    function _showCursor(x, y) {
        _dom.cursor.style.left = (x - 4) + 'px';
        _dom.cursor.style.top  = (y - 4) + 'px';
        _dom.cursor.style.opacity = '1';
    }
    function _moveCursor(x, y) {
        _dom.cursor.style.left = (x - 4) + 'px';
        _dom.cursor.style.top  = (y - 4) + 'px';
    }
    function _hideCursor() { _dom.cursor.style.opacity = '0'; }

    function _showKeyHint(text) {
        _dom.keyHint.textContent = text;
        _dom.keyHint.style.opacity = '1';
    }
    function _hideKeyHint() { _dom.keyHint.style.opacity = '0'; }

    function _showDragLine(x, y, targetH) {
        _dom.dragLine.style.left    = x + 'px';
        _dom.dragLine.style.top     = y + 'px';
        _dom.dragLine.style.height  = '0px';
        _dom.dragLine.style.opacity = '1';
        void _dom.dragLine.offsetHeight; // trigger reflow so transition fires
        _dom.dragLine.style.height  = targetH + 'px';
    }
    function _hideDragLine() { _dom.dragLine.style.opacity = '0'; }

    /* 取得格子螢幕位置（cellId = 'A1', 'B2'…） */
    function _cellRect(cellId) {
        var el = document.getElementById(cellId);
        return el ? el.getBoundingClientRect() : null;
    }

    /* 取得欄首位置（colIdx 0-based）*/
    function _colHeaderRect(colIdx) {
        if (window.gridRenderer && window.gridRenderer.headerMap) {
            var el = window.gridRenderer.headerMap.get(colIdx);
            return el ? el.getBoundingClientRect() : null;
        }
        return null;
    }

    /* ── 動畫定義 ─────────────────────────────────────────────── */

    /* 1. 快速跳轉（Ctrl+↓） */
    function _animQuickJump(done) {
        var s = window.orchestrator.state;
        s.selectedCell = s.selectedCell || { r: 0, c: 0 };

        var startR = _cellRect('A1');
        if (startR) _showCursor(startR.left + startR.width / 2, startR.top + startR.height / 2);
        _showKeyHint('Ctrl  +  ↓');

        setTimeout(function () {
            var wrapper = document.getElementById('wrapper');
            if (wrapper) wrapper.scrollTo({ top: 99999, behavior: 'smooth' });
            var endR = _cellRect('A25') || _cellRect('A20') || startR;
            if (endR) _moveCursor(endR.left + endR.width / 2, endR.top + endR.height / 2);
        }, 700);

        setTimeout(function () {
            _hideKeyHint();
            window.ch1Actions && window.ch1Actions.quickjump();
            done();
        }, 2000);
    }

    /* 2. 回跳頂端（Ctrl+↑） */
    function _animJumpUp(done) {
        var s = window.orchestrator.state;
        s.selectedCell = s.selectedCell || { r: 90, c: 0 };

        _showKeyHint('Ctrl  +  ↑');

        setTimeout(function () {
            var wrapper = document.getElementById('wrapper');
            if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
            var topR = _cellRect('A1');
            if (topR) _showCursor(topR.left + topR.width / 2, topR.top + topR.height / 2);
        }, 700);

        setTimeout(function () {
            _hideKeyHint();
            window.ch1Actions && window.ch1Actions.jumpup();
            done();
        }, 2000);
    }

    /* 3. 欄位對調（Shift + 拖曳） */
    function _animColumnSwap(done) {
        var bRect = _colHeaderRect(1); // 欄 B（等級）
        var cRect = _colHeaderRect(2); // 欄 C（類別）

        _showKeyHint('Shift  +  拖曳');

        if (bRect) {
            var bx = bRect.left + bRect.width / 2;
            var by = bRect.top  + bRect.height / 2;
            _showCursor(bx, by);

            setTimeout(function () {
                if (cRect) {
                    /* 游標滑向 C 欄右側 */
                    _moveCursor(cRect.right - 8, cRect.top + cRect.height / 2);
                }
            }, 750);
        }

        setTimeout(function () {
            _hideKeyHint();
            window.ch1Actions && window.ch1Actions.columnswap();
            done();
        }, 2000);
    }

    /* 4. 自動填滿（拖曳填滿柄） */
    function _animAutoFill(done) {
        var s = window.orchestrator.state;

        /* 步驟一：先選取 A3:A4（來源兩格，有 MP-001 / MP-002），設定 fillSourceRange */
        s.fillSourceRange = { minRow: 2, maxRow: 3, minCol: 0, maxCol: 0 };
        s.selectedRange   = { minRow: 2, maxRow: 3, minCol: 0, maxCol: 0 };
        s.selectedCell    = { r: 2, c: 0 };
        if (window.gridRenderer) window.gridRenderer.render();

        /* 游標出現在 A3，下移至 A4 填滿柄位置 */
        var a3Rect = _cellRect('A3');
        if (a3Rect) _showCursor(a3Rect.left + a3Rect.width / 2, a3Rect.top + a3Rect.height / 2);
        _showKeyHint('拖曳填滿柄  ↓');

        setTimeout(function () {
            /* 游標移到 A4 右下角（填滿柄小方塊） */
            var a4Rect = _cellRect('A4');
            if (a4Rect) _moveCursor(a4Rect.right - 7, a4Rect.bottom - 7);
        }, 600);

        setTimeout(function () {
            /* 步驟二：拖曳至 A12，同時擴展 selectedRange 至全範圍 */
            s.selectedRange = { minRow: 2, maxRow: 11, minCol: 0, maxCol: 0 };
            if (window.gridRenderer) window.gridRenderer.render();

            var a4Rect = _cellRect('A4');
            var a12Rect = _cellRect('A12') || a4Rect;
            if (a4Rect && a12Rect) {
                var hx = a4Rect.right - 7;
                var hy = a4Rect.bottom - 7;
                var lineH = a12Rect.bottom - hy;
                _showDragLine(hx - 1, hy, lineH > 0 ? lineH : 80);
                _moveCursor(hx, a12Rect.bottom - 7);
            }
        }, 1100);

        setTimeout(function () {
            _hideKeyHint();
            _hideDragLine();
            window.ch1Actions && window.ch1Actions.autofill();
            done();
        }, 2400);
    }

    /* 5. 插入日期（Ctrl+;） */
    function _animInsertDate(done) {
        var s = window.orchestrator.state;

        /* 確保在裝備清單分頁（呼叫 switchSheet 以正確更新 gridData + UI） */
        if (window.orchestrator && s.activeSheetId !== 'st-1') {
            window.orchestrator.switchSheet('st-1');
        }
        s.selectedRange = { minRow: 1, maxRow: 5, minCol: 4, maxCol: 4 };
        s.selectedCell  = { r: 1, c: 4 };
        if (window.gridRenderer) window.gridRenderer.render();

        var e2Rect = _cellRect('E2');
        if (e2Rect) _showCursor(e2Rect.left + e2Rect.width / 2, e2Rect.top + e2Rect.height / 2);
        _showKeyHint('Ctrl  +  ;');

        setTimeout(function () {
            _hideKeyHint();
            window.ch1Actions && window.ch1Actions.insertdate();
            done();
        }, 2000);
    }

    /* ── 動畫路由 ─────────────────────────────────────────────── */
    var _ANIM_MAP = {
        'QUICK_JUMP':  _animQuickJump,
        'JUMP_UP':     _animJumpUp,
        'COLUMN_SWAP': _animColumnSwap,
        'AUTO_FILL':   _animAutoFill,
        'INSERT_DATE': _animInsertDate,
    };

    function _runAnim(actionId) {
        _dom.overlay.style.display = 'block';
        var fn = _ANIM_MAP[actionId];
        if (fn) {
            fn(function () {
                _dom.overlay.style.display = 'none';
                _hideCursor();
                _hideKeyHint();
                _hideDragLine();
            });
        } else {
            _dom.overlay.style.display = 'none';
        }
    }

    /* ── 助理氣泡 ─────────────────────────────────────────────── */
    function _showBubble(actionId, cfg) {
        _ensureDOM();
        document.getElementById('ph-msg').innerHTML =
            '因為你使用手機，<br>【<strong style="color:#ffd700;">' + cfg.desc + '</strong>】<br>' +
            '的鍵盤操作無法直接觸控完成。<br><br>' +
            '讓我示範給你看，就像在真正的 Excel 上操作一樣！' +
            '<br><br>' +
            '<span style="font-size:0.82rem;color:rgba(200,185,140,0.65);line-height:1.5;">' +
            '💻 建議使用電腦玩，才能自己試試看操作。<br>' +
            '親手犯錯才是最好的學習方式喔！' +
            '</span>';
        document.getElementById('ph-key-badge').textContent = cfg.key;

        /* 清除舊的點擊事件，只綁一次 */
        var okBtn = document.getElementById('ph-ok-btn');
        var newBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newBtn, okBtn);
        newBtn.addEventListener('mouseover', function () {
            newBtn.style.background = 'rgba(33,115,70,0.9)';
        });
        newBtn.addEventListener('mouseout', function () {
            newBtn.style.background =
                'linear-gradient(135deg,rgba(33,115,70,0.65),rgba(33,115,70,0.45))';
        });
        newBtn.addEventListener('click', function () {
            _dom.bubble.style.display = 'none';
            _runAnim(actionId);
        });

        _dom.bubble.style.display = 'flex';
    }

    /* ── 公開 API ─────────────────────────────────────────────── */

    /**
     * 判斷此 actionId 在手機模式下是否需要助理介入
     * @param {string} actionId - e.g. 'QUICK_JUMP'
     * @returns {boolean}
     */
    function shouldHandle(actionId) {
        return isMobile() && !!INCOMPATIBLE[actionId];
    }

    /**
     * 啟動手機助理（彈出氣泡 → 動畫 → 執行動作）
     * @param {string} actionId
     */
    function launch(actionId) {
        if (!isMobile()) return;
        var cfg = INCOMPATIBLE[actionId];
        if (!cfg) return;
        _ensureDOM();
        _showBubble(actionId, cfg);
    }

    /**
     * 初始化：向 orchestrator 註冊 taskChanged 監聽，
     * 手機模式下遇到不相容動作時自動彈出助理氣泡。
     * 若該任務帶有 quiz（.5 章節），則等玩家答對後再彈出。
     * 由 game.html 的 window.load → orchestrator.init().then() 呼叫。
     */
    function init() {
        if (!window.orchestrator) return;

        /* 用來暫存「等測驗完成後才要啟動」的 actionId */
        var _pendingAfterTrial = null;

        /* MutationObserver：監視 trial-modal 被隱藏（即答對後關閉）*/
        var trialModal = document.getElementById('trial-modal');
        if (trialModal) {
            var _trialObserver = new MutationObserver(function () {
                /* trial-modal 的 display 變回 'none' → 測驗結束 */
                if (trialModal.style.display === 'none' && _pendingAfterTrial) {
                    var actionId = _pendingAfterTrial;
                    _pendingAfterTrial = null;
                    /* 稍等 600ms，讓成功提示 toast 先顯示完 */
                    setTimeout(function () { launch(actionId); }, 600);
                }
            });
            _trialObserver.observe(trialModal, { attributes: true, attributeFilter: ['style'] });
        }

        window.orchestrator.on('taskChanged', function (data) {
            if (!isMobile()) return;
            var task = data && data.task;
            if (!task) return;
            var actionId = task.expectedCondition && task.expectedCondition.actionId;
            if (!INCOMPATIBLE[actionId]) return;

            if (task.quiz) {
                /* .5 章節：有測驗框 → 先讓玩家答題，答對後由 Observer 觸發 */
                _pendingAfterTrial = actionId;
            } else {
                /* 一般章節：稍等 500ms 讓導師提示 UI 更新完再彈 */
                _pendingAfterTrial = null;
                setTimeout(function () { launch(actionId); }, 500);
            }
        });
    }

    return { shouldHandle: shouldHandle, launch: launch, init: init };

})();
