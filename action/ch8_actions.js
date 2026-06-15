/**
 * 試算表魔法冒險 v2 - 第八章禁術動作實作
 * 包含：IF、IF 嵌套、AND 函數
 */

window.ch8Actions = {
    handleFormula(rIdx, cIdx, input) {
        const state = window.orchestrator.state;
        const currentTask = state.activeChapterModule?.simulator?.tasks?.[state.currentTaskIndex];
        if (!currentTask) return;

        const val = input.toString().trim();
        const data = state.gridData;
        const taskId = currentTask.id;

        // 1. 檢查是否以 = 開頭
        if (!val.startsWith('=')) {
            if (taskId === "IF_BASIC_TASK" || taskId === "IFS_TASK" || taskId === "IF_PLUS_TASK" || taskId === "IF_AND_TASK") {
                window.orchestrator.playStorySegment("fail_IF_no_equal");
            }
            return;
        }

        const rawFormula = val.substring(1);
        const formulaObj = rawFormula.replace(/\s+/g, '');
        const upperFormula = formulaObj.toUpperCase();

        const expectedRow = rIdx + 1;
        const c = `C${expectedRow}`, d = `D${expectedRow}`, f = `F${expectedRow}`, g = `G${expectedRow}`, h = `H${expectedRow}`, i = `I${expectedRow}`, j = `J${expectedRow}`, k = `K${expectedRow}`;

        if (taskId === "IF_BASIC_TASK") {
            if (cIdx !== 10) return; // K 欄

            if (upperFormula.includes("G2>=80") || upperFormula.includes(`G${expectedRow}>=80`)) {
                window.orchestrator.playStorySegment("fail_IF_BASIC_wrong_col");
                return;
            }

            if (upperFormula.includes("推薦") && !formulaObj.includes('"推薦"') && !formulaObj.includes('”推薦”') && !formulaObj.includes("'推薦'")) {
                window.orchestrator.playStorySegment("fail_IF_no_quotes");
                return;
            }

            if (upperFormula.startsWith("IF(")) {
                const commaCount = upperFormula.split(',').length - 1;
                if (commaCount < 2) {
                    window.orchestrator.playStorySegment("fail_IF_missing_param");
                    return;
                }
            }

            if (upperFormula.includes(`IF(${i}>=80,"推薦","不推薦")`) || upperFormula.includes(`IF(${i}>=80,'推薦','不推薦')`) || upperFormula.includes(`IF(${i}>=80,”推薦”,”不推薦”)`)) {
                // 計算當前格結果
                const total = parseFloat(data[rIdx][8]) || 0;
                data[rIdx][cIdx] = total >= 80 ? "推薦" : "不推薦";
                state.ch8_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                // 不自動填充，等玩家手動往下拖拉
                if (window.gridRenderer) window.gridRenderer.render();
            } else {
                window.orchestrator.playStorySegment("fail_IF_BASIC_generic");
            }
        }
        else if (taskId === "IFS_TASK") {
            if (cIdx !== 9) return; // J 欄

            if (upperFormula.includes(`IFS(${i}>=80,"良"`) || upperFormula.includes(`IFS(${i}>=80,'良'`)) {
                window.orchestrator.playStorySegment("fail_IFS_wrong_order");
                return;
            }

            if (upperFormula.includes(`IFS(${i}>=90,"優",${i}>=80,"良",TRUE,"待察")`) || 
                upperFormula.includes(`IFS(${i}>=90,'優',${i}>=80,'良',TRUE,'待察')`) ||
                upperFormula.includes(`IFS(${i}>=90,"優",${i}>=80,"良",${i}<80,"待察")`) ||
                upperFormula.includes(`IFS(${i}>=90,'優',${i}>=80,'良',${i}<80,'待察')`)) {
                // 計算當前格結果
                const total = parseFloat(data[rIdx][8]) || 0;
                let result = "待察";
                if (total >= 90) result = "優";
                else if (total >= 80) result = "良";
                
                data[rIdx][cIdx] = result;
                state.ch8_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                if (window.gridRenderer) window.gridRenderer.render();
            } else {
                window.orchestrator.playStorySegment("fail_IFS_generic");
            }
        }
        else if (taskId === "IF_PLUS_TASK") {
            if (cIdx === 7) { // H 欄
                if (upperFormula.includes("N1") && !upperFormula.includes("$N$1")) {
                    window.orchestrator.playStorySegment("fail_IF_PLUS_no_abs");
                    return;
                }
                
                if (upperFormula.includes(`(${c}="北境")*$N$1`) || upperFormula.includes(`(${c}='北境')*$N$1`) || upperFormula.includes(`IF(${c}="北境",$N$1,0)`)) {
                    const region = data[rIdx][2];
                    data[rIdx][cIdx] = region === "北境" ? 10 : 0;
                    state.ch8_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                    if (window.gridRenderer) window.gridRenderer.render();
                } else {
                    window.orchestrator.playStorySegment("fail_IF_PLUS_H_generic");
                }
            }
            else if (cIdx === 8) { // I 欄
                if (upperFormula === `${g}+${h}`) {
                    const gVal = parseFloat(data[rIdx][6]) || 0;
                    const hVal = parseFloat(data[rIdx][7]) || 0;
                    data[rIdx][cIdx] = gVal + hVal;
                    state.ch8_correct_formula_cell = { r: rIdx, c: cIdx, task: "IF_PLUS_TOTAL" };
                    if (window.gridRenderer) window.gridRenderer.render();
                } else {
                    window.orchestrator.playStorySegment("fail_IF_PLUS_I_generic");
                }
            }
        }
        else if (taskId === "IF_AND_TASK") {
            if (cIdx !== 11) return; // L 欄

            if (upperFormula.includes(`IF(${d}>=80,"特別推薦"`) || upperFormula.includes(`IF(${f}>=80,"特別推薦"`)) {
                if (!upperFormula.includes("AND")) {
                    window.orchestrator.playStorySegment("fail_IF_AND_one_condition");
                    return;
                }
            }

            if (upperFormula.includes(`IF(AND(${d}>=80,${f}>=80),"特別推薦","")`) || 
                upperFormula.includes(`IF(AND(${f}>=80,${d}>=80),"特別推薦","")`) ||
                upperFormula.includes(`IF(AND(${d}>=80,${f}>=80),'特別推薦','')`)) {
                
                const z = parseFloat(data[rIdx][3]) || 0;
                const l = parseFloat(data[rIdx][5]) || 0;
                data[rIdx][cIdx] = (z >= 80 && l >= 80) ? "特別推薦" : "";

                state.ch8_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                if (window.gridRenderer) window.gridRenderer.render();
            } else {
                window.orchestrator.playStorySegment("fail_IF_AND_generic");
            }
        }
    },

    _simulateDragFill(startRow, cIdx, calcFn) {
        const state = window.orchestrator.state;
        const data = state.gridData;
        let r = startRow;
        
        const interval = setInterval(() => {
            if (r > 20) {
                clearInterval(interval);
                return;
            }
            data[r][cIdx] = calcFn(r);
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
        
        const rIdx = source.minRow;
        const cIdx = source.minCol;
        
        const correctCell = state.ch8_correct_formula_cell;
        // 如果玩家拖拉的是正確輸入公式的格子，執行手動填充並過關
        if (correctCell && correctCell.r === rIdx && correctCell.c === cIdx) {
            const taskId = correctCell.task;
            
            if (taskId === "IF_BASIC_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const total = parseFloat(data[r][8]) || 0;
                    return total >= 80 ? "推薦" : "不推薦";
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "IF_APPLY", col: cIdx });
            }
            else if (taskId === "IFS_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const total = parseFloat(data[r][8]) || 0;
                    if (total >= 90) return "優";
                    if (total >= 80) return "良";
                    return "待察";
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "IFS_APPLY", col: cIdx });
            }
            else if (taskId === "IF_PLUS_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const region = data[r][2];
                    return region === "北境" ? 10 : 0;
                });
            }
            else if (taskId === "IF_PLUS_TOTAL") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const gVal = parseFloat(data[r][6]) || 0;
                    const hVal = parseFloat(data[r][7]) || 0;
                    return gVal + hVal;
                });
                
                // 等待 I 欄填充完畢後再過關 (H 欄與 I 欄都完成了)
                setTimeout(() => {
                    window.orchestrator.validateStateChange({ type: 'ACTION', id: "IF_PLUS_APPLY", col: 7 }); // actionId 定義在 col 7
                }, 1500);
            }
            else if (taskId === "IF_AND_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const z = parseFloat(data[r][3]) || 0;
                    const l = parseFloat(data[r][5]) || 0;
                    return (z >= 80 && l >= 80) ? "特別推薦" : "";
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "IF_AND_APPLY", col: cIdx });
            }
            
            // 清除紀錄，防止重複觸發
            state.ch8_correct_formula_cell = null;
        }
    }
};

