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
        'MERGE_CENTER': { key: '跨欄置中', desc: '跨欄置中 (A1:E1)' },
        'ALL_BORDERS':  { key: '所有框線', desc: '所有框線 (A2:E10)' },
        'FILL_COLOR':   { key: '填滿色彩', desc: '填滿色彩 (標題列 & 資料列)' },
        'FORMAT_PAINTER': { key: '格式刷', desc: '格式刷 (吸取並應用)' },
        'CUSTOM_FORMAT': { key: '自訂格式', desc: '自訂格式 (右鍵選單)' },
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
            'border:2px solid rgba(255,215,0,0.55);border-radius:18px;padding:16px 14px;' +
            'max-width:min(360px,90vw);width:calc(100vw - 40px);max-height:52vh;overflow-y:auto;' +
            'box-shadow:0 0 50px rgba(0,0,0,0.8);text-align:center;">' +
                '<div id="ph-msg" style="color:#e8d5a3;font-size:clamp(0.7rem,2.2vw,0.9rem);line-height:1.5;' +
                'margin-bottom:10px;word-break:break-word;"></div>' +
                '<div id="ph-key-badge" style="display:inline-block;' +
                'background:rgba(255,215,0,0.12);border:1.5px solid rgba(255,215,0,0.55);' +
                'border-radius:8px;padding:6px 12px;font-size:clamp(0.9rem,2.2vw,1.1rem);font-family:monospace;' +
                'color:#ffd700;letter-spacing:2px;font-weight:700;margin-bottom:12px;word-break:break-word;overflow-wrap:break-word;"></div>' +
                '<button id="ph-ok-btn" style="margin-top:6px;padding:8px 16px;' +
                'background:linear-gradient(135deg,rgba(33,115,70,0.65),rgba(33,115,70,0.45));' +
                'border:2px solid rgba(33,115,70,0.85);border-radius:30px;color:#fff;' +
                'font-size:clamp(0.8rem,1.8vw,0.9rem);font-weight:700;letter-spacing:1px;cursor:pointer;' +
                'transition:background 0.2s;white-space:normal;">好的，示範給我看！</button>' +
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

    /* ── 自動捲動至顯示區域（行動模式） ────────────────────────────── */
    function _scrollToCell(cellId) {
        var wrapper = document.getElementById('wrapper');
        var cell = document.getElementById(cellId);
        if (!wrapper || !cell) return;

        var rect = cell.getBoundingClientRect();
        var wrapperRect = wrapper.getBoundingClientRect();

        /* 同時計算縱向與橫向捲動，使格子出現在左上角 */
        var targetScrollTop  = wrapper.scrollTop  + (rect.top  - wrapperRect.top)  - 80;
        var targetScrollLeft = wrapper.scrollLeft + (rect.left - wrapperRect.left) - 60;

        targetScrollTop  = Math.max(0, targetScrollTop);
        targetScrollLeft = Math.max(0, targetScrollLeft);

        wrapper.scrollTo({ top: targetScrollTop, left: targetScrollLeft, behavior: 'smooth' });
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

    /* 取得工具欄按鈕位置（btnId = 'mergecenter', 'border', 'fillcolor', 'formatpainter'…） */
    function _toolbarBtnRect(btnId) {
        var el = document.getElementById(btnId);
        return el ? el.getBoundingClientRect() : null;
    }

    /* 短暫高亮工具欄按鈕，模擬點擊視覺回饋 */
    function _flashBtn(btnId) {
        var el = document.getElementById(btnId);
        if (!el) return;
        var origBg = el.style.background;
        var origTransform = el.style.transform;
        el.style.transition = 'background 0.08s, transform 0.08s';
        el.style.background = 'rgba(255,215,0,0.5)';
        el.style.transform = 'scale(0.88)';
        setTimeout(function () {
            el.style.background = origBg;
            el.style.transform = origTransform;
            el.style.transition = '';
        }, 180);
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
        _scrollToCell('A1');

        var s = window.orchestrator.state;
        s.selectedCell = s.selectedCell || { r: 0, c: 0 };

        setTimeout(function () {
            var startR = _cellRect('A1');
            if (startR) _showCursor(startR.left + startR.width / 2, startR.top + startR.height / 2);
            _showKeyHint('Ctrl  +  ↓');
        }, 400);

        setTimeout(function () {
            var wrapper = document.getElementById('wrapper');
            if (wrapper) wrapper.scrollTo({ top: 99999, behavior: 'smooth' });
            var endR = _cellRect('A25') || _cellRect('A20');
            if (endR) _moveCursor(endR.left + endR.width / 2, endR.top + endR.height / 2);
        }, 1100);

        setTimeout(function () {
            _hideKeyHint();
            window.ch1Actions && window.ch1Actions.quickjump();
            done();
        }, 2400);
    }

    /* 2. 回跳頂端（Ctrl+↑） */
    function _animJumpUp(done) {
        _scrollToCell('A1');

        var s = window.orchestrator.state;
        s.selectedCell = s.selectedCell || { r: 90, c: 0 };

        setTimeout(function () {
            _showKeyHint('Ctrl  +  ↑');
        }, 400);

        setTimeout(function () {
            var topR = _cellRect('A1');
            if (topR) _showCursor(topR.left + topR.width / 2, topR.top + topR.height / 2);
        }, 1100);

        setTimeout(function () {
            _hideKeyHint();
            window.ch1Actions && window.ch1Actions.jumpup();
            done();
        }, 2400);
    }

    /* 3. 欄位對調（Shift + 拖曳） */
    function _animColumnSwap(done) {
        _scrollToCell('B1');

        setTimeout(function () {
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
            }, 1600);
        }, 400);
    }

    /* 4. 自動填滿（拖曳填滿柄） */
    function _animAutoFill(done) {
        _scrollToCell('A3');

        var s = window.orchestrator.state;

        /* 先清空選取，游標出現時才同步選取 A3:A4 */
        s.selectedCell = null;
        s.selectedRange = null;
        if (window.gridRenderer) window.gridRenderer.render();

        setTimeout(function () {
            /* 游標出現在 A3，同步設定來源範圍 */
            s.fillSourceRange = { minRow: 2, maxRow: 3, minCol: 0, maxCol: 0 };
            s.selectedRange   = { minRow: 2, maxRow: 3, minCol: 0, maxCol: 0 };
            s.selectedCell    = { r: 2, c: 0 };
            if (window.gridRenderer) window.gridRenderer.render();
            var a3Rect = _cellRect('A3');
            if (a3Rect) _showCursor(a3Rect.left + a3Rect.width / 2, a3Rect.top + a3Rect.height / 2);
            _showKeyHint('拖曳填滿柄  ↓');
        }, 400);

        setTimeout(function () {
            /* 游標移到 A4 右下角（填滿柄小方塊） */
            var a4Rect = _cellRect('A4');
            if (a4Rect) _moveCursor(a4Rect.right - 7, a4Rect.bottom - 7);
        }, 1000);

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
        }, 1500);

        setTimeout(function () {
            _hideKeyHint();
            _hideDragLine();
            window.ch1Actions && window.ch1Actions.autofill();
            done();
        }, 2800);
    }

    /* 5. 插入日期（Ctrl+;） */
    function _animInsertDate(done) {
        var s = window.orchestrator.state;

        /* 確保在裝備清單分頁（呼叫 switchSheet 以正確更新 gridData + UI） */
        if (window.orchestrator && s.activeSheetId !== 'st-1') {
            window.orchestrator.switchSheet('st-1');
        }
        s.selectedCell = null;
        s.selectedRange = null;
        if (window.gridRenderer) window.gridRenderer.render();

        _scrollToCell('E2');

        setTimeout(function () {
            s.selectedRange = { minRow: 1, maxRow: 5, minCol: 4, maxCol: 4 };
            s.selectedCell  = { r: 1, c: 4 };
            if (window.gridRenderer) window.gridRenderer.render();
            var e2Rect = _cellRect('E2');
            if (e2Rect) _showCursor(e2Rect.left + e2Rect.width / 2, e2Rect.top + e2Rect.height / 2);
            _showKeyHint('Ctrl  +  ;');
        }, 400);

        setTimeout(function () {
            _hideKeyHint();
            window.ch1Actions && window.ch1Actions.insertdate();
            done();
        }, 2400);
    }

    /* [Ch2] 6. 跨欄置中（A1:E1） */
    function _animMergeCenter(done) {
        _scrollToCell('A1');

        var s = window.orchestrator.state;
        /* 先清空選取，等游標出現後才模擬「點擊」選取 A1，
           避免 cell 提前高亮導致助理感覺是在事後才出現 */
        s.selectedCell = null;
        s.selectedRange = null;
        if (window.gridRenderer) window.gridRenderer.render();

        /* 游標出現在 A1，同步「點擊」選取 A1 */
        setTimeout(function () {
            s.selectedCell = { r: 0, c: 0 };
            s.selectedRange = { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
            if (window.gridRenderer) window.gridRenderer.render();
            var a1Rect = _cellRect('A1');
            if (a1Rect) _showCursor(a1Rect.left + a1Rect.width / 2, a1Rect.top + a1Rect.height / 2);
            _showKeyHint('點擊  A1');
        }, 400);

        /* 游標拖曳至 E1 */
        setTimeout(function () {
            var e1Rect = _cellRect('E1');
            if (e1Rect) _moveCursor(e1Rect.right - 8, e1Rect.top + e1Rect.height / 2);
            _showKeyHint('拖曳至  E1');
        }, 1100);

        /* 拖曳結束 → 選取範圍擴展到 A1:E1 */
        setTimeout(function () {
            s.selectedRange = { minRow: 0, maxRow: 0, minCol: 0, maxCol: 4 };
            if (window.gridRenderer) window.gridRenderer.render();
            _hideKeyHint();
        }, 1800);

        /* 游標移到工具欄「跨欄置中」按鈕 */
        setTimeout(function () {
            var btnRect = _toolbarBtnRect('mergecenter');
            if (btnRect) _moveCursor(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
            _showKeyHint('跨欄置中按鈕');
        }, 2100);

        /* 點擊按鈕 → 執行 */
        setTimeout(function () {
            _flashBtn('mergecenter');
            _hideKeyHint();
            window.ch2Actions && window.ch2Actions.mergecenter();
            done();
        }, 2700);
    }

    /* [Ch2] 7. 所有框線（A2:E10） */
    function _animAllBorders(done) {
        _scrollToCell('A2');

        var s = window.orchestrator.state;
        /* 先清空選取，游標出現時才同步選取 */
        s.selectedCell = null;
        s.selectedRange = null;
        if (window.gridRenderer) window.gridRenderer.render();

        /* 游標出現在 A2，先「點擊」選取單一起始格 A2（尚未展開範圍） */
        setTimeout(function () {
            s.selectedCell = { r: 1, c: 0 };
            s.selectedRange = { minRow: 1, maxRow: 1, minCol: 0, maxCol: 0 };
            if (window.gridRenderer) window.gridRenderer.render();
            var a2Rect = _cellRect('A2');
            if (a2Rect) _showCursor(a2Rect.left + a2Rect.width / 2, a2Rect.top + a2Rect.height / 2);
            _showKeyHint('選取  A2:E10');
        }, 400);

        /* 游標拖曳至 E10：先移動游標，等游標真的「滑」到 E10（0.55s 過渡）
           後才展開選取範圍，避免反白比游標快 */
        setTimeout(function () {
            var e10Rect = _cellRect('E10') || _cellRect('E9');
            if (e10Rect) _moveCursor(e10Rect.right - 8, e10Rect.bottom - 8);
            setTimeout(function () {
                s.selectedRange = { minRow: 1, maxRow: 9, minCol: 0, maxCol: 4 };
                if (window.gridRenderer) window.gridRenderer.render();
            }, 560);
        }, 1000);

        /* 游標移到「框線」工具欄按鈕 */
        setTimeout(function () {
            _hideKeyHint();
            var btnRect = _toolbarBtnRect('border');
            if (btnRect) _moveCursor(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
            _showKeyHint('框線按鈕');
        }, 2000);

        /* 點擊框線按鈕 → 彈出下拉選單 */
        setTimeout(function () {
            _flashBtn('border');
            _hideKeyHint();
            var borderBtn = document.getElementById('border');
            if (window.uiManager && borderBtn) {
                window.uiManager.showDropdown([
                    { icon: '▦', text: '所有框線', action: 'allborders' },
                    { icon: '📉', text: '其他框線 (斜線)', action: 'open_format_dialog_border' }
                ], borderBtn);
            }
        }, 2500);

        /* 游標移到下拉選單第一項「所有框線」 */
        setTimeout(function () {
            var menu = document.getElementById('dropdown-menu');
            var firstItem = menu && menu.querySelector('.dropdown-item');
            if (firstItem) {
                var itemRect = firstItem.getBoundingClientRect();
                _moveCursor(itemRect.left + itemRect.width / 2, itemRect.top + itemRect.height / 2);
            }
            _showKeyHint('所有框線');
        }, 2900);

        /* 游標滑到選單項後停留，讓玩家看清楚再點擊（等 700ms） */
        setTimeout(function () {
            var menu = document.getElementById('dropdown-menu');
            var firstItem = menu && menu.querySelector('.dropdown-item');
            if (firstItem) {
                firstItem.style.transition = 'background 0.15s';
                firstItem.style.background = 'rgba(255,215,0,0.5)';
                setTimeout(function () { firstItem.style.background = ''; firstItem.style.transition = ''; }, 350);
            }
        }, 3600);

        /* 點擊完畢 → 執行 */
        setTimeout(function () {
            if (window.uiManager) window.uiManager.hideDropdown();
            _hideKeyHint();
            window.ch2Actions && window.ch2Actions.allborders();
            done();
        }, 3950);
    }

    /* [Ch2] 8. 填滿色彩（標題列 & 資料列） */
    function _animFillColor(done) {
        _scrollToCell('A2');

        var s = window.orchestrator.state;
        s.selectedCell = null;
        s.selectedRange = null;
        if (window.gridRenderer) window.gridRenderer.render();

        setTimeout(function () {
            s.selectedCell = { r: 1, c: 0 };
            s.selectedRange = { minRow: 1, maxRow: 1, minCol: 0, maxCol: 0 };
            if (window.gridRenderer) window.gridRenderer.render();
            var a2Rect = _cellRect('A2');
            if (a2Rect) _showCursor(a2Rect.left + a2Rect.width / 2, a2Rect.top + a2Rect.height / 2);
            _showKeyHint('選取  A2:E2');
        }, 400);

        setTimeout(function () {
            var e2Rect = _cellRect('E2');
            if (e2Rect) _moveCursor(e2Rect.right - 8, e2Rect.top + e2Rect.height / 2);
            setTimeout(function () {
                s.selectedRange = { minRow: 1, maxRow: 1, minCol: 0, maxCol: 4 };
                if (window.gridRenderer) window.gridRenderer.render();
            }, 560);
        }, 1000);

        /* 游標移到「填滿色彩」按鈕（第一次） */
        setTimeout(function () {
            _hideKeyHint();
            var btnRect = _toolbarBtnRect('fillcolor');
            if (btnRect) _moveCursor(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
            _showKeyHint('填滿色彩按鈕');
        }, 1600);

        /* 點擊 → 執行第一次填色，提示選第二列 */
        setTimeout(function () {
            _flashBtn('fillcolor');
            _hideKeyHint();
            window.ch2Actions && window.ch2Actions.fillcolor();
            _showKeyHint('再選 A3:E3');
        }, 2200);

        /* 游標回格子，先選單一起始格 A3 */
        setTimeout(function () {
            s.selectedCell = { r: 2, c: 0 };
            s.selectedRange = { minRow: 2, maxRow: 2, minCol: 0, maxCol: 0 };
            if (window.gridRenderer) window.gridRenderer.render();
            var a3Rect = _cellRect('A3');
            if (a3Rect) _showCursor(a3Rect.left + a3Rect.width / 2, a3Rect.top + a3Rect.height / 2);
        }, 3000);

        setTimeout(function () {
            var e3Rect = _cellRect('E3');
            if (e3Rect) _moveCursor(e3Rect.right - 8, e3Rect.top + e3Rect.height / 2);
            setTimeout(function () {
                s.selectedRange = { minRow: 2, maxRow: 2, minCol: 0, maxCol: 4 };
                if (window.gridRenderer) window.gridRenderer.render();
            }, 560);
            _hideKeyHint();
        }, 3500);

        /* 游標移到「填滿色彩」按鈕（第二次） */
        setTimeout(function () {
            var btnRect = _toolbarBtnRect('fillcolor');
            if (btnRect) _moveCursor(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
            _showKeyHint('再按填滿色彩');
        }, 4200);

        /* 點擊 → 執行第二次填色 */
        setTimeout(function () {
            _flashBtn('fillcolor');
            _hideKeyHint();
            window.ch2Actions && window.ch2Actions.fillcolor();
            done();
        }, 4900);
    }

    /* [Ch2] 9. 格式刷（兩段式：吸取 → 應用） */
    function _animFormatPainter(done) {
        _scrollToCell('A3');

        var s = window.orchestrator.state;
        s.selectedCell = null;
        s.selectedRange = null;
        if (window.gridRenderer) window.gridRenderer.render();

        setTimeout(function () {
            s.selectedCell = { r: 2, c: 0 };
            s.selectedRange = { minRow: 2, maxRow: 2, minCol: 0, maxCol: 0 };
            if (window.gridRenderer) window.gridRenderer.render();
            var a3Rect = _cellRect('A3');
            if (a3Rect) _showCursor(a3Rect.left + a3Rect.width / 2, a3Rect.top + a3Rect.height / 2);
            _showKeyHint('選取  A3:E3');
        }, 400);

        setTimeout(function () {
            var e3Rect = _cellRect('E3');
            if (e3Rect) _moveCursor(e3Rect.right - 8, e3Rect.top + e3Rect.height / 2);
            setTimeout(function () {
                s.selectedRange = { minRow: 2, maxRow: 2, minCol: 0, maxCol: 4 };
                if (window.gridRenderer) window.gridRenderer.render();
            }, 560);
        }, 1000);

        /* 游標移到「格式刷」按鈕（吸取格式） */
        setTimeout(function () {
            _hideKeyHint();
            var btnRect = _toolbarBtnRect('formatpainter');
            if (btnRect) _moveCursor(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
            _showKeyHint('格式刷按鈕');
        }, 1600);

        /* 點擊 → 吸取格式 */
        setTimeout(function () {
            _flashBtn('formatpainter');
            _hideKeyHint();
            window.ch2Actions && window.ch2Actions.formatpainter();
            _showKeyHint('格式已吸取！');
        }, 2200);

        /* 游標回格子，先選單一起始格 A4 */
        setTimeout(function () {
            _hideKeyHint();
            _showKeyHint('現在選  A4:E10');
            s.selectedCell = { r: 3, c: 0 };
            s.selectedRange = { minRow: 3, maxRow: 3, minCol: 0, maxCol: 0 };
            if (window.gridRenderer) window.gridRenderer.render();
            var a4Rect = _cellRect('A4');
            if (a4Rect) _showCursor(a4Rect.left + a4Rect.width / 2, a4Rect.top + a4Rect.height / 2);
        }, 3000);

        setTimeout(function () {
            var e10Rect = _cellRect('E10') || _cellRect('E9');
            if (e10Rect) _moveCursor(e10Rect.right - 8, e10Rect.bottom - 8);
            setTimeout(function () {
                s.selectedRange = { minRow: 3, maxRow: 9, minCol: 0, maxCol: 4 };
                if (window.gridRenderer) window.gridRenderer.render();
            }, 560);
            _hideKeyHint();
        }, 3600);

        /* 游標移到「格式刷」按鈕（應用格式） */
        setTimeout(function () {
            var btnRect = _toolbarBtnRect('formatpainter');
            if (btnRect) _moveCursor(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
            _showKeyHint('再按格式刷');
        }, 4400);

        /* 點擊 → 觸發 validateStateChange 讓 orchestrator 拓印格式並完成任務 */
        setTimeout(function () {
            _flashBtn('formatpainter');
            _hideKeyHint();
            if (window.orchestrator) window.orchestrator.validateStateChange();
            done();
        }, 5100);
    }

    /* [Ch2] 10. 自訂格式（選取 → 右鍵 → 格式對話框 → 確定） */
    function _animCustomFormat(done) {
        _scrollToCell('D3');

        var s = window.orchestrator.state;

        /* 游標出現在 D3，先「點擊」選取單一起始格 D3（尚未展開範圍） */
        setTimeout(function () {
            s.selectedCell = { r: 2, c: 3 };
            s.selectedRange = { minRow: 2, maxRow: 2, minCol: 3, maxCol: 3 };
            if (window.gridRenderer) window.gridRenderer.render();
            var d3Rect = _cellRect('D3');
            if (d3Rect) _showCursor(d3Rect.left + d3Rect.width / 2, d3Rect.top + d3Rect.height / 2);
            _showKeyHint('選取  D3:D10');
        }, 400);

        /* 游標拖曳至 D10，拖到才展開選取範圍 D3:D10 */
        setTimeout(function () {
            var d10Rect = _cellRect('D10') || _cellRect('D9');
            if (d10Rect) _moveCursor(d10Rect.left + d10Rect.width / 2, d10Rect.bottom - 8);
            setTimeout(function () {
                s.selectedRange = { minRow: 2, maxRow: 9, minCol: 3, maxCol: 3 };
                if (window.gridRenderer) window.gridRenderer.render();
            }, 560);
        }, 1000);

        /* 游標移到中間格子 D5，準備右鍵 */
        setTimeout(function () {
            _hideKeyHint();
            _showKeyHint('右鍵點擊');
            var d5Rect = _cellRect('D5');
            if (d5Rect) _moveCursor(d5Rect.left + d5Rect.width / 2, d5Rect.top + d5Rect.height / 2);
        }, 1600);

        /* 真正叫出右鍵選單（context-menu），就像桌面右鍵一樣 */
        setTimeout(function () {
            _hideKeyHint();
            var d5Rect = _cellRect('D5');
            if (window.uiManager && d5Rect) {
                var mx = d5Rect.left + d5Rect.width / 2;
                var my = d5Rect.top + d5Rect.height / 2;
                window.uiManager.showContextMenu(mx, my);
            }
        }, 2100);

        /* 游標移到選單「設定儲存格格式」項 */
        setTimeout(function () {
            var menu = document.getElementById('context-menu');
            var firstItem = menu && menu.querySelector('.dropdown-item:not(.disabled)');
            if (firstItem) {
                var ir = firstItem.getBoundingClientRect();
                _moveCursor(ir.left + ir.width / 2, ir.top + ir.height / 2);
            }
            _showKeyHint('設定儲存格格式');
        }, 2700);

        /* 點擊「設定儲存格格式」→ 收起選單並開啟格式對話框 */
        setTimeout(function () {
            var menu = document.getElementById('context-menu');
            var firstItem = menu && menu.querySelector('.dropdown-item:not(.disabled)');
            if (firstItem) {
                firstItem.style.transition = 'background 0.08s';
                firstItem.style.background = 'rgba(255,215,0,0.4)';
                setTimeout(function () { firstItem.style.background = ''; firstItem.style.transition = ''; }, 180);
            }
            if (window.uiManager) {
                window.uiManager.hideContextMenu();
                window.uiManager.openFormatDialog('number');
            }
            _hideKeyHint();
        }, 3300);

        /* 游標移到對話框「確定」按鈕 */
        setTimeout(function () {
            _hideKeyHint();
            var confirmBtn = document.querySelector('#excel-format-modal .excel-ok');
            if (confirmBtn) {
                var r = confirmBtn.getBoundingClientRect();
                _moveCursor(r.left + r.width / 2, r.top + r.height / 2);
            }
            _showKeyHint('確定');
        }, 3900);

        /* 點擊確定 → 執行 customformat → 完成任務 */
        setTimeout(function () {
            var confirmBtn = document.querySelector('#excel-format-modal .excel-ok');
            if (confirmBtn) {
                confirmBtn.style.transition = 'background 0.08s';
                confirmBtn.style.background = 'rgba(255,215,0,0.4)';
                setTimeout(function () { confirmBtn.style.background = ''; confirmBtn.style.transition = ''; }, 180);
            }
            _hideKeyHint();
            if (window.uiManager) window.uiManager.confirmFormatDialog();
            done();
        }, 4500);
    }

    /* ── 動畫路由 ─────────────────────────────────────────────── */
    var _ANIM_MAP = {
        'QUICK_JUMP':  _animQuickJump,
        'JUMP_UP':     _animJumpUp,
        'COLUMN_SWAP': _animColumnSwap,
        'AUTO_FILL':   _animAutoFill,
        'INSERT_DATE': _animInsertDate,
        'MERGE_CENTER': _animMergeCenter,
        'ALL_BORDERS':  _animAllBorders,
        'FILL_COLOR':   _animFillColor,
        'FORMAT_PAINTER': _animFormatPainter,
        'CUSTOM_FORMAT': _animCustomFormat,
    };

    function _runAnim(actionId) {
        _dom.overlay.style.display = 'block';

        /* 全域：動畫開始前先清空選取狀態，確保所有任務都是「cursor 出現才選格子」 */
        var _s = window.orchestrator && window.orchestrator.state;
        if (_s) {
            _s.selectedCell  = null;
            _s.selectedRange = null;
            if (window.gridRenderer) window.gridRenderer.render();
        }

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

    /* 各動作對應的「預先捲動目標格」，讓氣泡出現時格子就已在視窗內 */
    var _BUBBLE_SCROLL_TARGET = {
        'QUICK_JUMP':     'A1',
        'JUMP_UP':        'A1',
        'COLUMN_SWAP':    'B1',
        'AUTO_FILL':      'A3',
        'INSERT_DATE':    'E2',
        'MERGE_CENTER':   'A1',
        'ALL_BORDERS':    'A2',
        'FILL_COLOR':     'A2',
        'FORMAT_PAINTER': 'A3',
        'CUSTOM_FORMAT':  'D3',
    };

    /**
     * 啟動手機助理（彈出氣泡 → 動畫 → 執行動作）
     * @param {string} actionId
     */
    function launch(actionId) {
        if (!isMobile()) return;
        var cfg = INCOMPATIBLE[actionId];
        if (!cfg) return;
        _ensureDOM();
        /* 氣泡出現前先捲到任務相關格，Ch1 / Ch2 行為一致 */
        var scrollTarget = _BUBBLE_SCROLL_TARGET[actionId];
        if (scrollTarget) _scrollToCell(scrollTarget);
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

        /* 共用：處理單一任務（決定是否、何時彈出助理） */
        function _handleTask(task, delay) {
            if (!isMobile()) return;
            if (!task) return;
            var actionId = task.expectedCondition && task.expectedCondition.actionId;
            if (!INCOMPATIBLE[actionId]) return;

            if (task.quiz) {
                /* .5 章節：有測驗框 → 先讓玩家答題，答對後由 Observer 觸發 */
                _pendingAfterTrial = actionId;
            } else {
                _pendingAfterTrial = null;
                /* 若故事 overlay 仍在顯示，等它關閉後再彈出助理 */
                var gameMain = document.getElementById('game-main');
                if (gameMain && gameMain.classList.contains('in-story')) {
                    var _storyObs = new MutationObserver(function () {
                        if (!gameMain.classList.contains('in-story')) {
                            _storyObs.disconnect();
                            setTimeout(function () { launch(actionId); }, 500);
                        }
                    });
                    _storyObs.observe(gameMain, { attributes: true, attributeFilter: ['class'] });
                } else {
                    /* 故事已結束，直接計時彈出 */
                    setTimeout(function () { launch(actionId); }, delay || 500);
                }
            }
        }

        /* 任務間切換（第 2 個任務之後） */
        window.orchestrator.on('taskChanged', function (data) {
            _handleTask(data && data.task, 500);
        });

        /* [Fix 2026-06-19] 模擬器啟動時的「第一個任務」(index 0)
           orchestrator 不會為 index 0 發出 taskChanged，故另外監聽 startSimulator。
           例如 Ch2 第一個任務即為 MERGE_CENTER（跨欄置中）。 */
        window.orchestrator.on('startSimulator', function (data) {
            if (!isMobile()) return;
            var cfg = data && data.config;
            var tasks = cfg && cfg.tasks;
            if (!tasks) return;
            var idx = window.orchestrator.state.currentTaskIndex || 0;
            /* [Fix] 用 setTimeout(0) 讓 orchestrator 在 emit 之後緊接呼叫的
               playStorySegment() 先執行（加上 in-story class），
               再由 _handleTask 判斷是否需要等故事結束後才彈出助理 */
            setTimeout(function () {
                _handleTask(tasks[idx], 900);
            }, 0);
        });
    }

    return { shouldHandle: shouldHandle, launch: launch, init: init };

})();
