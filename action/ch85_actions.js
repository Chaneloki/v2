/**
 * 試算表魔法冒險 v2 - 第 8.5 章【沉睡與崩裂】動作實作
 */

window.ch85Actions = {
    handleFormula(rIdx, cIdx, input) {
        const state = window.orchestrator.state;
        const currentTask = state.activeChapterModule?.simulator?.tasks?.[state.currentTaskIndex];
        if (!currentTask) return;

        const val = input.toString().trim();
        const data = state.gridData;
        const taskId = currentTask.id;

        // 1. 檢查是否以 = 開頭
        if (!val.startsWith('=')) {
            window.orchestrator.playStorySegment("fail_IF_no_equal");
            return;
        }

        const rawFormula = val.substring(1);
        const formulaObj = rawFormula.replace(/\s+/g, '');
        const upperFormula = formulaObj.toUpperCase();

        const expectedRow = rIdx + 1;
        // 欄位：G=基礎(6), H=加分(7), I=總計(8), J=等第(9), K=推薦(10), L=重點(11)
        const e = `E${expectedRow}`, f = `F${expectedRow}`, g = `G${expectedRow}`, h = `H${expectedRow}`, i = `I${expectedRow}`;

        if (taskId === "IF_BASIC_TASK") {
            if (cIdx !== 10) return; // K 欄

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
                const total = parseFloat(data[rIdx][8]) || 0; // I欄
                data[rIdx][cIdx] = total >= 80 ? "推薦" : "不推薦";
                state.ch85_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                if (window.gridRenderer) window.gridRenderer.render();
            } else {
                window.orchestrator.playStorySegment("fail_syntax_error");
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
                const total = parseFloat(data[rIdx][8]) || 0;
                let result = "待察";
                if (total >= 90) result = "優";
                else if (total >= 80) result = "良";
                
                data[rIdx][cIdx] = result;
                state.ch85_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                if (window.gridRenderer) window.gridRenderer.render();
            } else {
                window.orchestrator.playStorySegment("fail_syntax_error");
            }
        }
        else if (taskId === "IF_PLUS_TASK") {
            if (cIdx === 7) { // H 欄 (地區加分)
                if (upperFormula.includes("N2") && !upperFormula.includes("$N$2")) {
                    window.orchestrator.playStorySegment("fail_IF_PLUS_no_abs");
                    return;
                }
                
                if (upperFormula.includes(`(C${expectedRow}="北境")*$N$2`) || upperFormula.includes(`(C${expectedRow}='北境')*$N$2`)) {
                    const region = data[rIdx][2];
                    const n2_val = parseFloat(data[1][13]) || 20; // N2 is index 13, row 1
                    data[rIdx][cIdx] = region === "北境" ? n2_val : 0;
                    state.ch85_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                    if (window.gridRenderer) window.gridRenderer.render();
                } else {
                    window.orchestrator.playStorySegment("fail_syntax_error");
                }
            }
            else if (cIdx === 8) { // I 欄 (總計)
                if (upperFormula === `${g}+${h}` || upperFormula === `${h}+${g}`) {
                    const gVal = parseFloat(data[rIdx][6]) || 0;
                    const hVal = parseFloat(data[rIdx][7]) || 0;
                    data[rIdx][cIdx] = gVal + hVal;
                    state.ch85_correct_formula_cell = { r: rIdx, c: cIdx, task: "IF_PLUS_TOTAL" };
                    if (window.gridRenderer) window.gridRenderer.render();
                } else {
                    window.orchestrator.playStorySegment("fail_syntax_error");
                }
            }
        }
        else if (taskId === "IF_AND_TASK") {
            if (cIdx !== 11) return; // L 欄

            if (!upperFormula.includes("AND")) {
                window.orchestrator.playStorySegment("fail_IF_AND_one_condition");
                return;
            }

            // 檢查是否省略了第三個參數 (假值)
            if ((upperFormula.includes(`IF(AND(E${expectedRow}>=60,F${expectedRow}>=6),"重點關注")`) || 
                 upperFormula.includes(`IF(AND(F${expectedRow}>=6,E${expectedRow}>=60),"重點關注")`) ||
                 upperFormula.includes(`IF(AND(E${expectedRow}>=60,F${expectedRow}>=6),'重點關注')`)) && 
                !upperFormula.includes('""') && !upperFormula.includes("''")) {
                window.orchestrator.playStorySegment("fail_IF_missing_false_value");
                return;
            }

            if (upperFormula.includes(`IF(AND(E${expectedRow}>=60,F${expectedRow}>=6),"重點關注","")`) || 
                upperFormula.includes(`IF(AND(F${expectedRow}>=6,E${expectedRow}>=60),"重點關注","")`) ||
                upperFormula.includes(`IF(AND(E${expectedRow}>=60,F${expectedRow}>=6),'重點關注','')`)) {
                
                const age = parseFloat(data[rIdx][4]) || 0;
                const months = parseFloat(data[rIdx][5]) || 0;
                data[rIdx][cIdx] = (age >= 60 && months >= 6) ? "重點關注" : "";
                
                state.ch85_correct_formula_cell = { r: rIdx, c: cIdx, task: taskId };
                if (window.gridRenderer) window.gridRenderer.render();
            } else {
                window.orchestrator.playStorySegment("fail_syntax_error");
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
        
        const correctCell = state.ch85_correct_formula_cell;
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
                    const n2_val = parseFloat(data[1][13]) || 20;
                    return region === "北境" ? n2_val : 0;
                });
            }
            else if (taskId === "IF_PLUS_TOTAL") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const gVal = parseFloat(data[r][6]) || 0;
                    const hVal = parseFloat(data[r][7]) || 0;
                    return gVal + hVal;
                });
                
                setTimeout(() => {
                    window.orchestrator.validateStateChange({ type: 'ACTION', id: "IF_PLUS_APPLY", col: 7 }); 
                }, 1500);
            }
            else if (taskId === "IF_AND_TASK") {
                this._simulateDragFill(rIdx + 1, cIdx, (r) => {
                    const age = parseFloat(data[r][4]) || 0;
                    const months = parseFloat(data[r][5]) || 0;
                    return (age >= 60 && months >= 6) ? "重點關注" : "";
                });
                window.orchestrator.validateStateChange({ type: 'ACTION', id: "IF_AND_APPLY", col: cIdx });
            }
            
            state.ch85_correct_formula_cell = null;
        } else {
            // 如果嘗試自動填滿但當前儲存格的公式是錯的
            window.orchestrator.playStorySegment("fail_syntax_error");
        }
    }
};
