/**
 * 試算表魔法冒險 v2 - 第七章禁術動作實作
 * 包含：公式解析、絕對引用、RANK、跳躍式求和
 */

window.ch7Actions = {
    handleFormula(rIdx, cIdx, input) {
        const state = window.orchestrator.state;
        const currentTask = state.activeChapterModule?.simulator?.tasks?.[state.currentTaskIndex];
        if (!currentTask) return;

        const val = input.toString().trim();
        const data = state.gridData;
        const taskId = currentTask.id;
        const chap = state.currentChapter.toString();

        // 1. 檢查是否以 = 開頭
        if (!val.startsWith('=')) {
            if (taskId === "FORMULA_BASIC_INPUT_TASK" || taskId === "FORMULA_TEXT_FIX_TASK" || taskId === "FORMULA_AUTOFILL_TASK") {
                window.orchestrator.playStorySegment("fail_FORMULA_no_equal");
            }
            return;
        }

        const formula = val.substring(1).toUpperCase();

        // 2. 針對不同任務進行解析與反饋
        if (taskId === "FORMULA_BASIC_INPUT_TASK" || taskId === "FORMULA_TEXT_FIX_TASK" || taskId === "FORMULA_AUTOFILL_TASK" || taskId === "FORMULA_ARITH_TASK") {
            // Ch70: =D2+E2+F2, G欄 (6)
            // Ch75: =D2+E2, G欄 (6)
            if (cIdx !== 6) { 
                window.orchestrator.playStorySegment("fail_FORMULA_wrong_col");
                return;
            }
            const expectedRow = rIdx + 1; 
            const d = `D${expectedRow}`, e = `E${expectedRow}`, f = `F${expectedRow}`;
            
            let isTextError = false;
            let isCorrect = false;

            // 嚴格模式：引導玩家學會 *1 或 +0 處理文本格式
            if (chap === "70") {
                if (formula === `SUM(${d},${e},${f})` || formula === `SUM(${d}:${f})`) isTextError = true;
                else if (formula === `SUM(${d}*1,${e},${f})` || formula === `SUM(${d}+0,${e},${f})` || formula === `${d}*1+${e}+${f}` || formula === `${d}+0+${e}+${f}`) isCorrect = true;
            } else if (chap === "75") {
                if (formula === `SUM(${d},${e})` || formula === `SUM(${d}:${e})`) isTextError = true;
                else if (formula === `SUM(${d}*1,${e})` || formula === `SUM(${d}+0,${e})` || formula === `${d}*1+${e}` || formula === `${d}+0+${e}`) isCorrect = true;
            }

            if (isTextError && taskId === "FORMULA_BASIC_INPUT_TASK") {
                data[rIdx][cIdx] = "137"; 
                state.ch7_correct_formula_cell = { r: rIdx, c: cIdx, task: "FORMULA_ARITH_TASK_ERROR" };
                if (window.gridRenderer) window.gridRenderer.render();
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "FORMULA_ERROR_ENTERED", col: cIdx });
            } else if (isTextError && taskId === "FORMULA_ARITH_TASK") {
                window.orchestrator.playStorySegment("fail_FORMULA_text_unhandled");
            } else if (isCorrect && (taskId === "FORMULA_TEXT_FIX_TASK" || taskId === "FORMULA_ARITH_TASK")) {
                // 僅計算當前格，並記錄狀態，等待玩家手動下拉 autofill
                const dVal = parseFloat(data[rIdx][3]) || 0;
                const eVal = parseFloat(data[rIdx][4]) || 0;
                const fVal = chap === "70" ? (parseFloat(data[rIdx][5]) || 0) : 0;
                data[rIdx][cIdx] = dVal + eVal + fVal;
                state.ch7_correct_formula_cell = { r: rIdx, c: cIdx, task: "FORMULA_AUTOFILL_TASK" };
                if (window.gridRenderer) window.gridRenderer.render();
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "FORMULA_FIX_ENTERED", col: cIdx });
            }
        } 
        else if (taskId === "ABS_REF_FAIL_TASK" || taskId === "ABS_REF_FIX_TASK" || taskId === "ABS_REF_TASK") {
            // Ch70: =SUM(D2*1,E2,F2)*K1, K1係數
            // Ch75: =SUM(D2*1,E2)*J1, J1係數
            const targetCell = chap === "70" ? "K1" : "J1";
            const targetAbs = chap === "70" ? "$K$1" : "$J$1";

            const expectedRow = rIdx + 1;
            const d = `D${expectedRow}`, e = `E${expectedRow}`, f = `F${expectedRow}`;

            if (taskId === "ABS_REF_FAIL_TASK") {
                if (formula.includes(targetCell) && !formula.includes(targetAbs)) {
                    if (chap === "70") {
                        data[rIdx][cIdx] = ((parseFloat(data[rIdx][3]) || 0) + (parseFloat(data[rIdx][4]) || 0) + (parseFloat(data[rIdx][5]) || 0)) * 1.5;
                    } else {
                        data[rIdx][cIdx] = ((parseFloat(data[rIdx][3]) || 0) + (parseFloat(data[rIdx][4]) || 0)) * 1.2;
                    }
                    state.ch7_correct_formula_cell = { r: rIdx, c: cIdx, task: "ABS_REF_FAIL_TASK" };
                    if (window.gridRenderer) window.gridRenderer.render();
                } else if (formula.includes(targetAbs)) {
                    // 玩家直接寫出鎖死版本，超前過關？我們讓他也可以直接觸發過關
                    if (chap === "70") {
                        data[rIdx][cIdx] = ((parseFloat(data[rIdx][3]) || 0) + (parseFloat(data[rIdx][4]) || 0) + (parseFloat(data[rIdx][5]) || 0)) * 1.5;
                    } else {
                        data[rIdx][cIdx] = ((parseFloat(data[rIdx][3]) || 0) + (parseFloat(data[rIdx][4]) || 0)) * 1.2;
                    }
                    state.ch7_correct_formula_cell = { r: rIdx, c: cIdx, task: "ABS_REF_FIX_TASK" };
                    if (window.gridRenderer) window.gridRenderer.render();
                    window.orchestrator.validateStateChange({ type: 'ACTION', id: "ABS_REF_FAIL_APPLY", col: cIdx }); // 跳過錯誤教學
                }
            }
            else if (taskId === "ABS_REF_FIX_TASK" || taskId === "ABS_REF_TASK") {
                let isCorrect = false;
                if (chap === "70" && formula.includes(targetAbs)) isCorrect = true;
                else if (chap === "75" && formula.includes(targetAbs)) isCorrect = true;

                if (isCorrect) {
                    if (chap === "70") {
                        data[rIdx][cIdx] = ((parseFloat(data[rIdx][3]) || 0) + (parseFloat(data[rIdx][4]) || 0) + (parseFloat(data[rIdx][5]) || 0)) * 1.5;
                    } else {
                        data[rIdx][cIdx] = ((parseFloat(data[rIdx][3]) || 0) + (parseFloat(data[rIdx][4]) || 0)) * 1.2;
                    }
                    state.ch7_correct_formula_cell = { r: rIdx, c: cIdx, task: "ABS_REF_FIX_TASK" };
                    if (window.gridRenderer) window.gridRenderer.render();
                } else if (formula.includes(targetCell)) {
                    window.orchestrator.playStorySegment("fail_ABS_NO_DOLLAR");
                }
            }
        }
        else if (taskId === "RANK_TASK") {
            // [修復]: 確保玩家有輸入完整的 RANK 參數 (例如 ,0)) 之後，才進行各種錯誤判斷。若公式沒寫完，保留原字串。
            if (!formula.endsWith(",0)") && !formula.endsWith(",1)")) {
                return;
            }

            if (formula.endsWith(",1)")) {
                window.orchestrator.playStorySegment("fail_RANK_wrong_order");
                return;
            }

            // Ch70 & Ch75: =RANK(G2,$G$2:$G$21,0)
            const cleanFormulaForCheck = formula.replace(/\s+/g, '');
            if (cleanFormulaForCheck.includes("G2:G21") && !cleanFormulaForCheck.includes("$G$2:$G$21")) {
                const s = parseFloat(data[rIdx][6]) || 0;
                const scores = [];
                for(let r=1; r<=20; r++) scores.push(parseFloat(data[r][6]) || 0);
                const sorted = [...scores].sort((a,b) => b - a);
                data[rIdx][cIdx] = sorted.indexOf(s) + 1;
                state.ch7_correct_formula_cell = { r: rIdx, c: cIdx, task: "RANK_TASK_ERROR_NO_ABS" };
                if (window.gridRenderer) window.gridRenderer.render();
                window.orchestrator.playStorySegment("fail_RANK_no_abs");
                return;
            }
            
            const expectedRow = rIdx + 1;
            const cleanFormula = formula.replace(/\s+/g, '');
            if (cleanFormula === `RANK(G${expectedRow},$G$2:$G$21,0)`) {
                const scores = [];
                for(let r=1; r<=20; r++) scores.push(parseFloat(data[r][6]) || 0);
                const sorted = [...scores].sort((a,b) => b - a);
                const s = parseFloat(data[rIdx][6]) || 0;
                data[rIdx][cIdx] = sorted.indexOf(s) + 1;
                state.ch7_correct_formula_cell = { r: rIdx, c: cIdx, task: "RANK_TASK" };
                if (window.gridRenderer) window.gridRenderer.render();
            }
        }
        else if (taskId === "SUM_SKIP_TASK") {
            const cleanFormula = formula.replace(/\s+/g, '');
            
            if (chap === "70") {
                // Ch70: 3, 8, 17 號 -> row 4, 9, 18 -> SUM(D4,F4,D9,F9,D18,F18)
                if (cleanFormula === "SUM(D4,E4,F4,D9,E9,F9,D18,E18,F18)") {
                    window.orchestrator.playStorySegment("fail_SUM_WRONG_COL"); return;
                }
                if (cleanFormula === "SUM(D3,F3,D8,F8,D17,F17)") {
                     window.orchestrator.playStorySegment("fail_SUM_WRONG_RANGE"); return;
                }
                if (cleanFormula === "SUM(D4,F4,D9,F9,D18,F18)") {
                    data[rIdx][cIdx] = "463";
                    if (window.gridRenderer) window.gridRenderer.render();
                    window.orchestrator.validateStateChange({ type: 'ACTION', id: "SUM_NONCONTIG_APPLY", col: cIdx });
                }
            } else if (chap === "75") {
                // Ch75: 2, 7, 14 號 -> row 3, 8, 15 -> SUM(D3,E3,D8,E8,D15,E15)
                if (cleanFormula === "SUM(D3,E3,F3,D8,E8,F8,D15,E15,F15)") {
                    window.orchestrator.playStorySegment("fail_SUM_WRONG_COL"); return;
                }
                if (cleanFormula === "SUM(D2,E2,D7,E7,D14,E14)") {
                     window.orchestrator.playStorySegment("fail_SUM_WRONG_RANGE"); return;
                }
                if (cleanFormula === "SUM(D3,E3,D8,E8,D15,E15)") {
                    // 計算總和:
                    // 2: D3=920, E3=28
                    // 7: D8=870, E8=31
                    // 14: D15=1050, E15=38
                    // 總計 = 920+28+870+31+1050+38 = 2937
                    data[rIdx][cIdx] = "2937";
                    if (window.gridRenderer) window.gridRenderer.render();
                    window.orchestrator.validateStateChange({ type: 'ACTION', id: "SUM_NONCONTIG_APPLY", col: cIdx });
                }
            }
        }
    },

    _simulateDragFill(startRow, cIdx, calcFn) {
        const state = window.orchestrator.state;
        const data = state.gridData;
        let r = startRow;
        
        const sourceRow = startRow - 1;
        const colLabel = String.fromCharCode(65 + cIdx);
        const sourceCellId = `${colLabel}${sourceRow + 1}`;
        const sourceFormula = state.formulas?.[state.activeSheetId]?.[sourceCellId];
        
        const interval = setInterval(() => {
            if (r > 20) {
                clearInterval(interval);
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
                if (!state.formulas) state.formulas = {};
                if (!state.formulas[state.activeSheetId]) state.formulas[state.activeSheetId] = {};
                const currentCellId = `${colLabel}${r + 1}`;
                state.formulas[state.activeSheetId][currentCellId] = shiftedFormula;
            }

            if (window.gridRenderer) window.gridRenderer.render();
            r++;
        }, 50);
    },

    autofill() {
        const state = window.orchestrator.state;
        const data = state.gridData;
        const source = state.fillSourceRange;
        const fullRange = state.selectedRange;
        
        if (!source || !fullRange) return;
        const chap = state.currentChapter.toString();
        const rIdx = source.minRow;
        const cIdx = source.minCol;
        
        const correctCell = state.ch7_correct_formula_cell;
        // 如果玩家拖拉的是正確輸入公式的格子，執行 Ch7 的相對填充
        if (correctCell && correctCell.r === rIdx && correctCell.c === cIdx) {
            const taskId = correctCell.task;
            
            if (taskId === "FORMULA_AUTOFILL_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const dVal = parseFloat(data[r][3]) || 0;
                    const eVal = parseFloat(data[r][4]) || 0;
                    const fVal = chap === "70" ? (parseFloat(data[r][5]) || 0) : 0;
                    return dVal + eVal + fVal;
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "FORMULA_SUM_APPLY", col: cIdx });
            } 
            else if (taskId === "FORMULA_ARITH_TASK_ERROR") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const eVal = parseFloat(data[r][4]) || 0;
                    const fVal = chap === "70" ? (parseFloat(data[r][5]) || 0) : 0;
                    return eVal + fVal; // 模擬錯誤：文本被當成 0 忽略
                });
            }
            else if (taskId === "ABS_REF_FIX_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    if (chap === "70") {
                        return ((parseFloat(data[r][3]) || 0) + (parseFloat(data[r][4]) || 0) + (parseFloat(data[r][5]) || 0)) * 1.5;
                    } else {
                        return ((parseFloat(data[r][3]) || 0) + (parseFloat(data[r][4]) || 0)) * 1.2;
                    }
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "ABS_REF_APPLY", col: cIdx });
            }
            else if (taskId === "ABS_REF_FAIL_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    return 0; // 模擬往下拖拉係數變成空值(0)，所有分數乘出來都是 0
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "ABS_REF_FAIL_APPLY", col: cIdx });
            }
            else if (taskId === "RANK_TASK") {
                const scores = [];
                for(let r=1; r<=20; r++) scores.push(parseFloat(data[r][6]) || 0);
                const sorted = [...scores].sort((a,b) => b - a);
                
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const s = parseFloat(data[r][6]) || 0;
                    return sorted.indexOf(s) + 1;
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "RANK_APPLY", col: cIdx });
            }
            else if (taskId === "RANK_TASK_ERROR_NO_ABS") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const s = parseFloat(data[r][6]) || 0;
                    const offset = r - rIdx;
                    const scores = [];
                    for(let i = 1 + offset; i <= 20 + offset; i++) {
                        scores.push(parseFloat(data[i] ? data[i][6] : 0) || 0);
                    }
                    const sorted = [...scores].sort((a,b) => b - a);
                    return sorted.indexOf(s) + 1;
                });
            }
        } else {
            // 如果不是預期的任務格，檢查是否是一般公式字串，做正則替換
            const sourceVal = data[rIdx][cIdx] ? data[rIdx][cIdx].toString() : "";
            if (sourceVal.startsWith('=')) {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const rowOffset = r - rIdx;
                    return sourceVal.replace(/(\$?)([A-Z]+)(\$?)(\d+)/g, (match, p1, col, p3, row) => {
                        if (p3 === '$') return match; 
                        return p1 + col + p3 + (parseInt(row) + rowOffset);
                    });
                });
            } else {
                // 如果不是公式格，退回 Ch1 預設填充邏輯
                if (window.ch1Actions && window.ch1Actions.autofill) {
                    window.ch1Actions.autofill();
                }
            }
        }
    }
};
