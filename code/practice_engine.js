/**
 * 試算表魔法冒險 v2 - 小型試煉引擎 (practice_engine.js)
 * 通關後額外內容專用：完全獨立於 orchestrator.js，不影響任何章節邏輯。
 * 提供：隨機資料產生器、小型 =公式 運算器、13 個單一技能題目模板。
 */
(function () {
    'use strict';

    // ========== 共用隨機小工具 ==========
    function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function pickN(arr, n) { return shuffle(arr).slice(0, n); }
    function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function randomDate(startYear, endYear) {
        const y = randomInt(startYear, endYear);
        const m = randomInt(1, 12);
        const d = randomInt(1, 28);
        return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    }

    const SURNAMES = ["陳", "林", "黃", "張", "李", "王", "吳", "劉", "蔡", "楊", "許", "鄭", "謝", "郭", "洪"];
    const GIVEN_NAMES = ["志明", "美玲", "家豪", "淑芬", "俊傑", "雅婷", "承恩", "怡君", "建宏", "佳穎", "柏宇", "思妤", "彥廷", "語芯", "宗翰"];
    const REGIONS = ["北境", "南疆", "東岸", "西陵", "中原"];
    const GRADES = ["優", "良", "中", "待察"];

    function randomName() { return pickRandom(SURNAMES) + pickRandom(GIVEN_NAMES); }

    // ========== 通用練習表格產生器 ==========
    // 欄位（固定 8 欄，設計成可同時滿足目前 13 個技能模板與未來擴充）：
    // A編號 B姓名 C地區 D等級 E數值A F數值B G文字型分數 H日期
    function generatePracticeTable(rowCount) {
        rowCount = rowCount || randomInt(8, 10);
        const header = ["編號", "姓名", "地區", "等級", "數值A", "數值B", "文字型分數", "日期"];
        const rows = [];
        for (let i = 1; i <= rowCount; i++) {
            const numA = randomInt(10, 99);
            const numB = randomInt(10, 99);
            rows.push([
                i,
                randomName(),
                pickRandom(REGIONS),
                pickRandom(GRADES),
                numA,
                numB,
                numB + "分", // 文字型數字：數字黏著文字，無法直接參與計算，需先轉換
                randomDate(2025, 2026)
            ]);
        }
        return { header, rows };
    }

    // ========== A1 參照工具 ==========
    function colLetterToIndex(letter) {
        let idx = 0;
        for (let i = 0; i < letter.length; i++) idx = idx * 26 + (letter.charCodeAt(i) - 64);
        return idx - 1;
    }
    function indexToColLetter(idx) {
        let s = '';
        idx += 1;
        while (idx > 0) {
            const rem = (idx - 1) % 26;
            s = String.fromCharCode(65 + rem) + s;
            idx = Math.floor((idx - 1) / 26);
        }
        return s;
    }
    function cellRefToValue(ref, table) {
        const m = ref.match(/^\$?([A-Z]+)\$?(\d+)$/i);
        if (!m) return undefined;
        const c = colLetterToIndex(m[1].toUpperCase());
        const r = parseInt(m[2], 10);
        if (r === 1) return table.header[c];
        const row = table.rows[r - 2];
        if (!row) return undefined;
        const raw = row[c];
        if (typeof raw === 'number') return raw;
        const num = parseFloat(raw);
        return isNaN(num) ? raw : num;
    }
    function rangeToValues(ref, table) {
        const m = ref.match(/^(\$?[A-Z]+\$?\d+):(\$?[A-Z]+\$?\d+)$/i);
        if (!m) return [cellRefToValue(ref, table)];
        const startM = m[1].match(/^\$?([A-Z]+)\$?(\d+)$/i);
        const endM = m[2].match(/^\$?([A-Z]+)\$?(\d+)$/i);
        const c1 = colLetterToIndex(startM[1].toUpperCase()), r1 = parseInt(startM[2], 10);
        const c2 = colLetterToIndex(endM[1].toUpperCase()), r2 = parseInt(endM[2], 10);
        const vals = [];
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
            for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
                vals.push(cellRefToValue(`${indexToColLetter(c)}${r}`, table));
            }
        }
        return vals;
    }

    // ========== 小型公式運算引擎 ==========
    // 評估玩家輸入的 "=..." 公式字串，回傳計算結果；非公式（純數值/文字）直接原樣比對。
    function evaluateFormula(formulaStr, table) {
        if (formulaStr === undefined || formulaStr === null) return undefined;
        let f = String(formulaStr).trim();
        if (f === '') return undefined;
        if (!f.startsWith('=')) {
            const n = parseFloat(f);
            return isNaN(n) ? f : n;
        }
        f = f.slice(1).trim();
        try {
            const jsExpr = transpile(f, table);
            // eslint-disable-next-line no-new-func
            return Function('"use strict"; return (' + jsExpr + ');')();
        } catch (e) {
            return { __error: e.message };
        }
    }

    function transpile(expr, table) {
        let out = expr;

        // 1) 保護多字元運算子，避免被單一 "=" 規則誤判
        out = out.replace(/<>/g, 'NE');
        out = out.replace(/>=/g, 'GE');
        out = out.replace(/<=/g, 'LE');

        // 2) 範圍參照 -> 陣列常量
        out = out.replace(/\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+/gi, (m) => {
            const vals = rangeToValues(m, table).map(v =>
                typeof v === 'string' ? JSON.stringify(v) : (v === undefined ? 'undefined' : v));
            return '[' + vals.join(',') + ']';
        });

        // 3) 單一儲存格參照 -> 數值/字串常量
        out = out.replace(/\$?[A-Z]+\$?\d+/gi, (m) => {
            const v = cellRefToValue(m, table);
            return typeof v === 'string' ? JSON.stringify(v) : (v === undefined ? 'undefined' : v);
        });

        // 4) 函式名稱轉成內部實作
        out = out.replace(/\bSUM\s*\(/gi, '__SUM(');
        out = out.replace(/\bIFS\s*\(/gi, '__IFS(');
        out = out.replace(/\bIF\s*\(/gi, '__IF(');
        out = out.replace(/\bAND\s*\(/gi, '__AND(');
        out = out.replace(/\bOR\s*\(/gi, '__OR(');
        out = out.replace(/\bRANK\s*\(/gi, '__RANK(');
        out = out.replace(/\bCOUNTIF\s*\(/gi, '__COUNTIF(');

        // 5) 單一 "=" 視為比較（IF 條件常見寫法 A1=10），轉成嚴格相等
        out = out.replace(/=/g, '===');

        // 6) 還原被保護的多字元運算子
        out = out.replace(/NE/g, '!==');
        out = out.replace(/GE/g, '>=');
        out = out.replace(/LE/g, '<=');

        return `(function(){
            const __flat = a => a.reduce((acc, v) => acc.concat(Array.isArray(v) ? __flat(v) : v), []);
            const __SUM = (...a) => __flat(a).reduce((s, v) => s + (Number(v) || 0), 0);
            const __IF = (c, t, f) => c ? t : f;
            const __IFS = (...a) => { for (let i = 0; i < a.length; i += 2) { if (a[i]) return a[i + 1]; } return undefined; };
            const __AND = (...a) => a.every(Boolean);
            const __OR = (...a) => a.some(Boolean);
            const __RANK = (v, arr) => { const sorted = __flat([arr]).map(Number).sort((x, y) => y - x); return sorted.indexOf(Number(v)) + 1; };
            const __COUNTIF = (arr, cond) => __flat([arr]).filter(v => v === cond).length;
            return ${out};
        })()`;
    }

    // 寬鬆比對：數字容許浮點誤差，文字/布林轉字串比對（TRUE/FALSE 不分大小寫）
    function answersMatch(actual, expected) {
        if (actual && typeof actual === 'object' && actual.__error) return false;
        if (typeof expected === 'number') {
            const a = typeof actual === 'boolean' ? NaN : Number(actual);
            return !isNaN(a) && Math.abs(a - expected) < 0.001;
        }
        if (typeof expected === 'boolean') {
            const s = String(actual).trim().toUpperCase();
            return s === (expected ? 'TRUE' : 'FALSE') || actual === expected;
        }
        return String(actual).trim() === String(expected).trim();
    }

    // ========== 13 個單一技能題目模板 ==========
    // 每個模板：skillId、uiType（'single' 單格答案 / 'column' 整欄答案 / 'sort' 排序控制 / 'toggle' 切換鈕）、
    // build(table) -> { requirement, ...模板專屬資訊 }
    const TEMPLATES = [
        {
            skillId: 'SUM', uiType: 'single', answerLabel: '數值A 總和',
            build(t) {
                const sum = t.rows.reduce((s, r) => s + r[4], 0);
                return { requirement: `這份名單的「數值A」欄需要核對總量，請計算「數值A」欄的總和，填入答案格。`, correctAnswer: sum };
            }
        },
        {
            skillId: 'FUNC_SUM_MULTI', uiType: 'single', answerLabel: '指定列加總',
            build(t) {
                const idxs = pickN([...t.rows.keys()], 2).sort((a, b) => a - b);
                const sum = idxs.reduce((s, i) => s + t.rows[i][4], 0);
                const rowNums = idxs.map(i => i + 2); // 試算表列號（跳過表頭）
                return { requirement: `老闆只想看第 ${rowNums[0]} 列與第 ${rowNums[1]} 列這兩位的「數值A」加總（中間其他列不要算進去），請把結果填入答案格。`, correctAnswer: sum };
            }
        },
        {
            skillId: 'IF_BASIC', uiType: 'column', answerHeader: '結果',
            build(t) {
                const threshold = pickRandom([50, 55, 60, 65, 70]);
                const correct = t.rows.map(r => (r[4] >= threshold ? '合格' : '不合格'));
                return { requirement: `請判斷每一列的「數值A」是否達到 ${threshold} 分以上：達到請在「結果」欄填「合格」，未達到則填「不合格」。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'IFS', uiType: 'column', answerHeader: '等第',
            build(t) {
                const correct = t.rows.map(r => r[4] >= 90 ? '優' : (r[4] >= 60 ? '中等' : '待加強'));
                return { requirement: `請依「數值A」評定等第：90 以上為「優」，60～89 為「中等」，60 以下為「待加強」，填入「等第」欄。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'IF_AND', uiType: 'column', answerHeader: '雙項達標',
            build(t) {
                const correct = t.rows.map(r => (r[4] >= 60 && r[5] >= 60) ? '雙項達標' : '');
                return { requirement: `只有「數值A」與「數值B」都達到 60 分以上，才能在「雙項達標」欄填「雙項達標」，否則留空。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'IF_PLUS', uiType: 'column', answerHeader: '加分後總計',
            build(t) {
                const bonusRegion = pickRandom(REGIONS);
                const correct = t.rows.map(r => r[4] + (r[2] === bonusRegion ? 10 : 0));
                return { requirement: `來自「${bonusRegion}」的人額外加 10 分，請把每個人「數值A」加分後的總計填入「加分後總計」欄。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'REF_ABSOLUTE', uiType: 'column', answerHeader: '獎金',
            build(t) {
                const rate = pickRandom([1.5, 2, 2.5, 3]);
                // Pad with column I (empty), Column J (固定倍率 label), Column K (rate cell)
                t.header.push("", "固定倍率", "倍率數值");
                t.rows.forEach((row, i) => {
                    if (i === 0) {
                        row.push("", "倍率", rate);
                    } else {
                        row.push("", "", "");
                    }
                });
                const correct = t.rows.map(r => Math.round(r[4] * rate * 100) / 100);
                return { requirement: `每個人的獎金 = 「數值A」 × 固定倍率（在 K2 儲存格中，每一列都要乘同一個倍率），請在「獎金」欄輸入公式計算（公式中需使用 $ 絕對引用鎖定 K2 儲存格）。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'FUNC_RANK', uiType: 'column', answerHeader: '名次',
            build(t) {
                const vals = t.rows.map(r => r[4]);
                const sorted = vals.slice().sort((a, b) => b - a);
                const correct = vals.map(v => sorted.indexOf(v) + 1);
                return { requirement: `請依「數值A」算出每個人在全體中的名次（數值最大＝第1名），填入「名次」欄。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'COMPARE_OP', uiType: 'column', answerHeader: '數值A較高',
            build(t) {
                const correct = t.rows.map(r => r[4] > r[5]);
                return { requirement: `請判斷每一列「數值A」是否大於「數值B」，是填 TRUE，不是填 FALSE，填入「數值A較高」欄。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'TEXT_TO_NUM', uiType: 'column', answerHeader: '純數字分數',
            build(t) {
                const correct = t.rows.map(r => parseInt(r[6], 10));
                return { requirement: `「文字型分數」欄看起來是分數，但其實是文字（後面黏著「分」字），公式無法直接計算。請把它轉成純數字，填入「純數字分數」欄。`, correctAnswer: correct };
            }
        },
        {
            skillId: 'FILTER', uiType: 'single', answerLabel: '符合人數',
            build(t) {
                const region = pickRandom(REGIONS);
                const count = t.rows.filter(r => r[2] === region).length;
                return { requirement: `請數出「地區」欄為「${region}」的總人數，填入答案格。`, correctAnswer: count };
            }
        },
        {
            skillId: 'SORT_SIMPLE', uiType: 'sort',
            build(t) {
                const dir = pickRandom(['desc', 'asc']);
                return {
                    requirement: `這份名單目前是亂的，請依「數值A」由${dir === 'desc' ? '大到小' : '小到大'}重新排列整份名單。`,
                    sortCol: 4, sortDir: dir
                };
            }
        },
        {
            skillId: 'F', uiType: 'toggle',
            build(t) {
                return { requirement: `這份名單很長，如果一路往下捲動，最上面的欄位標題（編號／姓名／地區...）就會跟著消失不見，之後完全看不出每一欄代表什麼。請想辦法讓標題列固定在最上面。` };
            }
        }
    ];

    function drawTask(skillDefs) {
        const tpl = pickRandom(TEMPLATES);
        const table = generatePracticeTable();
        const built = tpl.build(table);
        const def = (skillDefs && skillDefs[tpl.skillId]) || {};
        return Object.assign({
            skillId: tpl.skillId,
            uiType: tpl.uiType,
            answerHeader: tpl.answerHeader,
            answerLabel: tpl.answerLabel,
            tip: def.s || '（這項禁術的提示尚未記載）',
            skillName: def.n || tpl.skillId,
            table
        }, built);
    }

    window.PracticeEngine = {
        pickRandom, pickN, shuffle, randomInt, randomDate,
        generatePracticeTable, evaluateFormula, answersMatch,
        TEMPLATES, drawTask
    };
})();
