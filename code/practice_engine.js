/**
 * 試算表魔法冒險 v2 - 小型試煉引擎 (practice_engine.js)
 * 提供：隨機資料情境與組合產生器、擴充式公式運算器（支援 & 連接符）、33 個技能題目模板。
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

    // ========== 5 大主題情境與子主題組合池 (Scenarios & Combiner) ==========
    const SCENARIOS = [
        {
            id: "student",
            name: "學生期末成績單",
            headers: ["學號", "學生姓名", "班級", "德育等第", "期末考試", "平時成績", "文字型分數", "登記日期"],
            itemUnit: "位學生",
            yesVal: "及格",
            noVal: "不及格",
            customOrder: ["優", "良", "中", "待察"],
            ifsRules: "90分以上為「優」，60～89分為「中等」，60分以下為「待加強」",
            ifsFormula: '=IFS(E2>=90,"優",E2>=60,"中等",TRUE,"待加強")',
            ifsCorrect: (valA) => valA >= 90 ? "優" : (valA >= 60 ? "中等" : "待加強"),
            valARange: [40, 100],
            valBRange: [40, 100],
            txtSuffix: "分",
            subgroups: [
                {
                    name: "東方魔導學部",
                    surnames: ["陳", "林", "黃", "張", "李", "王", "吳", "劉", "蔡", "楊", "許", "鄭", "謝", "郭", "洪"],
                    givens: ["清月", "雨婷", "晨曦", "墨染", "子騫", "晚寧", "慕白", "書意", "若溪", "潯", "志明", "美玲", "家豪", "淑芬"],
                    categories: ["1年A班", "2年B班", "3年C班", "4年D班"]
                },
                {
                    name: "西法聖保羅學部",
                    surnames: ["史密斯", "波特", "格林", "布朗", "戴維斯", "米勒", "威爾遜", "泰勒", "瓊斯", "克拉克"],
                    givens: ["艾倫", "海倫娜", "奧利凡", "克洛伊", "阿爾伯特", "維多利亞", "愛德華", "愛麗絲", "大衛", "露西"],
                    categories: ["法術一班", "元素二班", "幻獸三班", "召喚四班"],
                    isWesternName: true
                },
                {
                    name: "精靈森之秘社",
                    surnames: ["伊莉", "萊拉", "芬蘭", "塞蕾", "法瑞", "奧蕾", "希爾", "凱蘭", "亞拉", "菲娜"],
                    givens: ["斯", "娜", "迪爾", "莉亞", "爾", "絲", "瓦", "諾", "娜斯", "提爾"],
                    categories: ["橡木學派", "潮汐集會", "微風旅團", "烈火儀式"]
                }
            ],
            statuses: ["優", "良", "中", "待察"],
            valBLabel: "平時分數"
        },
        {
            id: "adventurer",
            name: "冒險者任務紀錄",
            headers: ["任務編號", "委託冒險者", "冒險等級", "任務評價", "金幣獎勵", "消耗魔力", "文字型分數", "完成日期"],
            itemUnit: "名冒險者",
            yesVal: "高額獎勵",
            noVal: "一般獎勵",
            customOrder: ["傳說", "史詩", "稀有", "普通"],
            ifsRules: "800金幣以上為「高階」，500～799金幣為「中階」，500金幣以下為「低階」",
            ifsFormula: '=IFS(E2>=800,"高階",E2>=500,"中階",TRUE,"低階")',
            ifsCorrect: (valA) => valA >= 800 ? "高階" : (valA >= 500 ? "中階" : "低階"),
            valARange: [150, 950],
            valBRange: [10, 90],
            txtSuffix: "點",
            subgroups: [
                {
                    name: "物理冒險戰團",
                    surnames: ["雷恩", "亞瑟", "格羅姆", "瓦莉拉", "烏瑟", "安度因", "希爾瓦斯", "吉安娜", "加洛什", "穆拉丁"],
                    givens: ["·風行者", "·影歌", "·銅鬚", "·怒風", "·鐵拳", "·斬擊者", "·影護者", "·逐日者", "·金幣", "·灰燼"],
                    categories: ["劍士營", "遊俠隊", "重盾衛", "狂戰士"]
                },
                {
                    name: "秘法奧術學會",
                    surnames: ["大魔導士 ", "秘術師 ", "聖光使者 ", "深淵術士 ", "喚風者 ", "星占師 ", "暗影客 ", "結界師 "],
                    givens: ["安東尼", "卡德加", "麥迪文", "羅寧", "莫德拉", "泰蘭德", "瑪法里奧", "伊利丹", "維倫", "雷諾"],
                    categories: ["冰霜部", "火焰部", "奧術部", "召喚部"],
                    isPreTitle: true
                }
            ],
            statuses: ["傳說", "史詩", "稀有", "普通"],
            valBLabel: "魔力消耗"
        },
        {
            id: "sales",
            name: "帝國商會銷售報表",
            headers: ["訂單編號", "負責業務", "銷售區域", "訂單狀態", "銷售金額", "推廣成本", "文字型分數", "銷售日期"],
            itemUnit: "筆訂單",
            yesVal: "達標",
            noVal: "未達標",
            customOrder: ["特優", "優良", "普通"],
            ifsRules: "8000以上為「特優」，5000～7999為「優良」，5000以下為「普通」",
            ifsFormula: '=IFS(E2>=8000,"特優",E2>=5000,"優良",TRUE,"普通")',
            ifsCorrect: (valA) => valA >= 8000 ? "特優" : (valA >= 5000 ? "優良" : "普通"),
            valARange: [1500, 9900],
            valBRange: [100, 800],
            txtSuffix: "件",
            subgroups: [
                {
                    name: "鐵與火兵器庫",
                    surnames: ["精鋼", "黑曜石", "龍鱗", "生鐵", "寒鐵", "橡木", "秘銀", "白骨", "黃銅", "熔岩"],
                    givens: ["闊劍", "圓盾", "刺劍", "長弓", "短弩", "長槍", "全身甲", "戰鎚", "手斧", "面甲"],
                    categories: ["近戰部", "遠程部", "護具部", "重裝部"]
                },
                {
                    name: "皇家珠寶商行",
                    surnames: ["紅寶石", "藍寶石", "祖母綠", "翡翠", "紫水晶", "黃金", "白銀", "黑珍珠", "鑽石", "琥珀"],
                    givens: ["戒環", "吊墜", "項鍊", "手鐲", "耳環", "皇冠", "護身符", "胸針", "指環", "髮簪"],
                    categories: ["首飾部", "禮冠部", "護符部", "古玩部"]
                }
            ],
            statuses: ["特優", "優良", "普通"],
            valBLabel: "推廣成本"
        },
        {
            id: "potion",
            name: "皇家藥水庫存清冊",
            headers: ["藥水編號", "藥水名稱", "元素屬性", "安全狀態", "庫存數量", "每瓶重量", "文字型分數", "入庫日期"],
            itemUnit: "瓶藥水",
            yesVal: "充足",
            noVal: "不足",
            customOrder: ["特高", "安全", "偏低", "短缺"],
            ifsRules: "200瓶以上為「充足」，80～199瓶為「偏低」，80瓶以下為「短缺」",
            ifsFormula: '=IFS(E2>=200,"充足",E2>=80,"偏低",TRUE,"短缺")',
            ifsCorrect: (valA) => valA >= 200 ? "充足" : (valA >= 80 ? "偏低" : "短缺"),
            valARange: [10, 300],
            valBRange: [5, 45],
            txtSuffix: "毫升",
            subgroups: [
                {
                    name: "生命與魔力恢復系",
                    surnames: ["微量", "初級", "中效", "強力", "極致", "大師", "皇家", "帝國", "瞬效", "神聖"],
                    givens: ["治療劑", "恢復水", "活力合劑", "回魔水", "醒神液", "治癒神水", "精力合劑"],
                    categories: ["生命組", "魔力組", "活力組", "大師組"]
                },
                {
                    name: "元素防護系",
                    surnames: ["烈火", "寒冰", "避雷", "防毒", "禦風", "聖光", "抗冥", "地裂"],
                    givens: ["護盾藥劑", "抗性魔粉", "防護黏液", "屏障神水", "增幅合劑"],
                    categories: ["防護部", "精煉部", "噴霧組", "合劑組"]
                }
            ],
            statuses: ["特高", "安全", "偏低", "短缺"],
            valBLabel: "每瓶重量"
        },
        {
            id: "beast",
            name: "幻獸捕捉與培育日誌",
            headers: ["記錄編號", "幻獸種類", "稀有程度", "健康評估", "戰鬥力", "捕獲難度", "文字型分數", "發現日期"],
            itemUnit: "隻幻獸",
            yesVal: "極強",
            noVal: "普通",
            customOrder: ["傳說", "史詩", "稀有", "普通"],
            ifsRules: "800戰力以上為「傳說」，500～799戰力為「精銳」，500戰力以下為「普通」",
            ifsFormula: '=IFS(E2>=800,"傳說",E2>=500,"精銳",TRUE,"普通")',
            ifsCorrect: (valA) => valA >= 800 ? "傳說" : (valA >= 500 ? "精銳" : "普通"),
            valARange: [300, 990],
            valBRange: [10, 95],
            txtSuffix: "隻",
            subgroups: [
                {
                    name: "深林與九天野獸",
                    surnames: ["烈焰", "霜凍", "雷霆", "極光", "風暴", "幽夜", "裂空", "劇毒", "聖耀", "黃金"],
                    givens: ["馬", "狼", "狐", "豹", "飛鷹", "巨雕", "猛虎", "猛犬", "野豬", "幼豹"],
                    categories: ["深林部", "天空部", "火山部", "極寒組"]
                },
                {
                    name: "深海鱗甲幻獸",
                    surnames: ["波濤", "潮汐", "深淵", "冰晶", "珊瑚", "滄海", "激流", "幽冥"],
                    givens: ["海靈", "巨龜", "海蛇", "人魚", "巨鯨", "狂鯊", "水母", "墨魚"],
                    categories: ["淺海部", "深淵部", "珊瑚礁", "潮汐帶"]
                }
            ],
            statuses: ["傳說", "史詩", "稀有", "普通"],
            valBLabel: "捕獲難度"
        }
    ];

    // ========== 姓/名 (前綴/後綴) 交叉拼接隨機名字邏輯 ==========
    function generateScenarioName(subgroup) {
        const p = pickRandom(subgroup.surnames);
        const s = pickRandom(subgroup.givens);
        if (subgroup.isWesternName) {
            return p + "·" + s;
        } else if (subgroup.isPreTitle) {
            return p + s;
        }
        return p + s;
    }

    // 業務員隨機姓名生成器 (用於 sales 情境中的「負責業務」)
    function generateSalesPerson() {
        const first = ["趙", "錢", "孫", "李", "周", "吳", "鄭", "王", "陳", "林", "黃", "張", "劉", "楊"];
        const last = ["業務", "經理", "專員", "主管", "商務"];
        return pickRandom(first) + pickRandom(last);
    }

    // ========== 情境化隨機資料表格產生器 ==========
    function generatePracticeTableForScenario(sc, subgroup, rowCount) {
        rowCount = rowCount || randomInt(8, 10);
        const header = sc.headers.slice();
        const rows = [];
        const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

        for (let i = 1; i <= rowCount; i++) {
            const valA = randomInt(sc.valARange[0], sc.valARange[1]);
            const valB = randomInt(sc.valBRange[0], sc.valBRange[1]);
            
            // 決定名稱/品項名稱
            let itemName = "";
            if (sc.id === "sales") {
                // 如果是商會，品項是兵器或珠寶
                itemName = generateScenarioName(subgroup);
            } else {
                itemName = generateScenarioName(subgroup);
            }

            // 負責人/業務員名字 (如果是 sales 情境)
            let seller = itemName;
            if (sc.id === "sales") {
                seller = generateSalesPerson();
            }

            rows.push([
                sc.id === "student" ? `STU-${1000 + i}` : (sc.id === "adventurer" ? `REQ-${2000 + i}` : `ORD-${3000 + i}`), // 0: ID
                sc.id === "sales" ? seller : itemName, // 1: 負責人/項目名稱
                sc.id === "sales" ? pickRandom(subgroup.categories) : pickRandom(subgroup.categories), // 2: 區域/分類
                pickRandom(sc.statuses), // 3: 等級/狀態
                valA, // 4: 數值A
                valB, // 5: 數值B
                valB + sc.txtSuffix, // 6: 文字型數字 (數值B + 後綴)
                randomDate(2026, 2026) // 7: 日期 (固定 2026 年)
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

    // ========== 擴充式公式運算引擎 ==========
    // 支援 & 連接符字串拼接，解析前將其轉為 + 號。
    function replaceAmpersands(expr) {
        let result = '';
        let inDouble = false;
        let inSingle = false;
        for (let i = 0; i < expr.length; i++) {
            const char = expr[i];
            if (char === '"' && !inSingle) {
                inDouble = !inDouble;
                result += char;
            } else if (char === "'" && !inDouble) {
                inSingle = !inSingle;
                result += char;
            } else if (char === '&' && !inDouble && !inSingle) {
                result += '+';
            } else {
                result += char;
            }
        }
        return result;
    }

    function evaluateFormula(formulaStr, table) {
        if (formulaStr === undefined || formulaStr === null) return undefined;
        let f = String(formulaStr).trim();
        if (f === '') return undefined;
        if (!f.startsWith('=')) {
            const n = parseFloat(f);
            return isNaN(n) ? f : n;
        }
        f = f.slice(1).trim();
        f = replaceAmpersands(f); // 擴充：將 & 轉換為 +
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
        out = out.replace(/<>/g, ' NE ');
        out = out.replace(/>=/g, ' GE ');
        out = out.replace(/<=/g, ' LE ');

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

        // 5) 單一 "=" 視為比較，轉成嚴格相等
        out = out.replace(/=/g, '===');

        // 6) 還原被保護的多字元運算子
        out = out.replace(/ NE /g, '!==');
        out = out.replace(/ GE /g, '>=');
        out = out.replace(/ LE /g, '<=');

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

    // 寬鬆比對：數字容許浮點誤差，文字/布林轉字串比對
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

    // ========== 33 個技能題目模板 (按 Ribbon/公式 分門別類) ==========
    const TEMPLATES = [
        // --- 常用工具與格式化 (6 項) ---
        {
            skillId: 'SUM', uiType: 'single',
            build(t, sc) {
                const sum = t.rows.reduce((s, r) => s + r[4], 0);
                return {
                    requirement: `這份名單的「${sc.headers[4]}」欄需要核對總量，請在下方答案格計算「${sc.headers[4]}」欄的總和。（提示：選中格子點擊【常用】➜【自動加總】可以快速產生公式）`,
                    correctAnswer: sum,
                    answerLabel: `${sc.headers[4]}總計`
                };
            }
        },
        {
            skillId: 'MERGE_CENTER', uiType: 'merge',
            build(t, sc) {
                return {
                    requirement: `請選取第 1 列的表頭範圍（A1 至 H1），並點擊【常用】➜【跨欄置中】將表頭合併並置中。`,
                    correctAnswer: { minRow: -1, maxRow: -1, minCol: 0, maxCol: 7 }
                };
            }
        },
        {
            skillId: 'BORDER', uiType: 'border',
            build(t, sc) {
                return {
                    requirement: `請框選整個表格數據區域（A2 至 H${t.rows.length + 1}），並點擊【常用】➜【所有框線】為試算表繪製清晰的框格。`,
                    correctAnswer: { minRow: 0, maxRow: t.rows.length - 1, minCol: 0, maxCol: 7 }
                };
            }
        },
        {
            skillId: 'FILL_COLOR', uiType: 'fill',
            build(t, sc) {
                return {
                    requirement: `請選取第 1 列的表頭範圍（A1 至 H1），並點擊【常用】➜【填滿色彩】為表頭上底色（推薦使用淡雅色彩保護眼睛）。`,
                    correctAnswer: { minRow: -1, maxRow: -1, minCol: 0, maxCol: 7 }
                };
            }
        },
        {
            skillId: 'FORMAT', uiType: 'format',
            build(t, sc) {
                return {
                    requirement: `第一行數據（A2:H2）已經設定了黃色底色與粗邊框。請選取 A2:H2 範圍，點擊【常用】➜【格式刷】，然後拖曳覆蓋塗刷下方其餘各行（A3:H${t.rows.length + 1}），快速複製排版。`,
                    correctAnswer: { minRow: 1, maxRow: t.rows.length - 1, minCol: 0, maxCol: 7 }
                };
            }
        },
        {
            skillId: 'F', uiType: 'toggle',
            build(t, sc) {
                return {
                    requirement: `這份名單較長，向下滾動時首列的標題（${sc.headers.slice(0,4).join('/')}...）會消失。請點選【檢視】➜【凍結頂端列】將首行固定在最上方。`
                };
            }
        },

        // --- 定位、搜尋與取代 (5 項) ---
        {
            skillId: 'SEARCH', uiType: 'search',
            build(t, sc) {
                const targetRow = pickRandom(t.rows);
                const targetName = targetRow[1];
                return {
                    requirement: `這份名冊很長，請按下 Ctrl + F 快捷鍵打開【尋找】對話框，搜尋業務/名稱為「${targetName}」的項目，並點擊「找下一個」來跳轉選中該格。`,
                    correctAnswer: targetName
                };
            }
        },
        {
            skillId: 'REPLACE', uiType: 'replace',
            build(t, sc) {
                const oldVal = pickRandom(sc.statuses);
                const newVal = oldVal + "(已審核)";
                return {
                    requirement: `請按下 Ctrl + H 快捷鍵打開【取代】對話框，將所有狀態/等第為「${oldVal}」的格子「全部取代」為「${newVal}」。`,
                    correctAnswer: { oldVal, newVal }
                };
            }
        },
        {
            skillId: 'FUZZY', uiType: 'fuzzy',
            build(t, sc) {
                // 找到一個名字的前兩個字
                const names = t.rows.map(r => r[1]);
                let prefix = names[0].substring(0, 2);
                if (prefix.includes("·") || prefix.includes(" ")) {
                    prefix = names[0].substring(0, 1);
                }
                const pattern = prefix + "*";
                return {
                    requirement: `請按下 Ctrl + F 快捷鍵打開【尋找】對話框。點開「選項 >>」設定高亮格式為「綠色樣式」，並在尋找目標中輸入模糊比對符「${pattern}」（* 代表任意字元），最後點擊「全部尋找」標記所有符合項目。`,
                    correctAnswer: pattern
                };
            }
        },
        {
            skillId: 'DATE', uiType: 'single', answerLabel: '登記日期',
            build(t, sc) {
                const today = new Date().toLocaleDateString();
                return {
                    requirement: `請在答案格中插入今天的登記日期。（提示：可以使用快捷鍵 Ctrl + ; 快速插入，或直接輸入 YYYY/MM/DD，如：${today}）。`,
                    correctAnswer: today
                };
            }
        },
        {
            skillId: 'AUTOFILL', uiType: 'column', answerHeader: '數值總和',
            build(t, sc) {
                const correct = t.rows.map(r => r[4] + r[5]);
                return {
                    requirement: `我們需要計算每個人的數值總和。第一列已經填寫好公式，請選取第 2 列答案格，並點擊右下角「填滿拉柄」向下拖拉，使用「自動填滿」完成整欄計算。`,
                    correctAnswer: correct,
                    initialFormula: `=E2+F2`
                };
            }
        },

        // --- 篩選與排序功能 (6 項) ---
        {
            skillId: 'FILTER', uiType: 'filter_ui',
            build(t, sc) {
                const cat = pickRandom(t.rows.map(r => r[2]));
                return {
                    requirement: `請先點選【資料】➜【篩選】開啟漏斗按鈕，然後點擊「${sc.headers[2]}」欄標題旁的箭頭 ▼，在勾選列表中只勾選「${cat}」（取消其他勾選）進行過濾。`,
                    correctAnswer: cat,
                    colIdx: 2
                };
            }
        },
        {
            skillId: 'SORT_SIMPLE', uiType: 'sort',
            build(t, sc) {
                const dir = pickRandom(['desc', 'asc']);
                return {
                    requirement: `請選中「${sc.headers[4]}」欄的任意格子，點擊【資料】➜【${dir === 'desc' ? '降序排序' : '升序排序'}】對名冊進行重新排序。`,
                    sortCol: 4, sortDir: dir
                };
            }
        },
        {
            skillId: 'SORT_MULTI', uiType: 'sort_dialog',
            build(t, sc) {
                return {
                    requirement: `請選中數據區任意格，點擊【資料】➜【自訂排序】打開多重條件對話框。設定「主要條件」為「${sc.headers[3]}」，排序順序為「自訂清單」（手動輸入「${sc.customOrder.join(', ')}」），並點擊確定執行。`,
                    correctAnswer: [{ col: 3, order: 'custom_done' }]
                };
            }
        },
        {
            skillId: 'SORT_CUSTOM', uiType: 'sort_dialog',
            build(t, sc) {
                return {
                    requirement: `這份名冊需要按特定的優先級對齊。請點擊【資料】➜【自訂排序】，選擇欄位為「${sc.headers[3]}」，並設定順序為自訂清單：「${sc.customOrder.join(', ')}」（每行一個項目），確認並套用。`,
                    correctAnswer: [{ col: 3, order: 'custom_done' }]
                };
            }
        },
        {
            skillId: 'FILTER_ADV', uiType: 'filter_adv',
            build(t, sc) {
                const targetCat = t.rows[0][2];
                return {
                    requirement: `請點擊【資料】➜【進階篩選】。設定條件為「${sc.headers[2]} 等於 ${targetCat}」或「${sc.headers[3]} 等於 ${sc.customOrder[0]}」（聯動或條件過濾），確認執行進階篩選。`,
                    correctAnswer: { cat: targetCat, status: sc.customOrder[0] }
                };
            }
        },
        {
            skillId: 'OUTLINE', uiType: 'outline_toggle',
            build(t, sc) {
                return {
                    requirement: `表格已做好分組。請點擊【檢視】➜【大綱】按鈕，打開/關閉左側的折疊控制面板以方便調整版面。`
                };
            }
        },

        // --- 數據分析與小計 (5 項) ---
        {
            skillId: 'VALIDATION', uiType: 'validation_ui',
            build(t, sc) {
                return {
                    requirement: `我們需要限制「${sc.headers[5]}」欄的輸入。請點擊該欄頭選中整欄，點擊【資料】➜【資料驗證】，限制為「整數」，介於 ${sc.valBRange[0]} 到 ${sc.valBRange[1]} 之間。`,
                    correctAnswer: { col: 5, min: sc.valBRange[0], max: sc.valBRange[1] }
                };
            }
        },
        {
            skillId: 'SUBTOTAL', uiType: 'subtotal_ui',
            build(t, sc) {
                return {
                    requirement: `請先按「${sc.headers[2]}」欄進行升序排序，然後點擊【資料】➜【小計】。選擇分組欄位為「${sc.headers[2]}」，計算函數為「加總」，加總欄位勾選「${sc.headers[4]}」，執行小計。`,
                    correctAnswer: { groupCol: 2, sumCol: 4 }
                };
            }
        },
        {
            skillId: 'PIVOT_CREATE', uiType: 'pivot_ui',
            build(t, sc) {
                return {
                    requirement: `請選取數據區域任意格，點擊【插入】➜【樞紐分析表】➜【確定】。在右側面板中，拖曳「${sc.headers[2]}」至【列】，拖曳「${sc.headers[4]}」至【值】。`,
                    correctAnswer: { row: sc.headers[2], val: sc.headers[4] }
                };
            }
        },
        {
            skillId: 'PIVOT_GROUP', uiType: 'pivot_group_ui',
            build(t, sc) {
                return {
                    requirement: `樞紐分析表中已將「${sc.headers[7]}」拖至列區域。請右鍵點擊表格中的月份文字（如三月），點選【組成群組】，將時間歸類方式設定為「季」（Quarters）分組展示。`,
                    correctAnswer: { key: "季" }
                };
            }
        },
        {
            skillId: 'IF_CONCAT', uiType: 'column', answerHeader: '拼接備註',
            build(t, sc) {
                const correct = t.rows.map(r => (r[4] >= 60 ? sc.yesVal : sc.noVal) + "-" + r[2]);
                return {
                    requirement: `請在「拼接備註」欄寫公式：將判定狀態與分類合併在一起，格式如：「${sc.yesVal}-${t.rows[0][2]}」。公式為：=IF(E2>=60,"${sc.yesVal}","${sc.noVal}")&"-"&C2。`,
                    correctAnswer: correct
                };
            }
        },

        // --- 公式運算 (11 項) ---
        {
            skillId: 'FORMULA_BASIC', uiType: 'column', answerHeader: '數值總計',
            build(t, sc) {
                const correct = t.rows.map(r => r[4] + r[5]);
                return {
                    requirement: `請在「數值總計」欄位使用基礎公式（不使用SUM），計算每筆的「${sc.headers[4]}」加上「${sc.headers[5]}」的和（公式格式如 =E2+F2）。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'REF_RELATIVE', uiType: 'column', answerHeader: '數值差值',
            build(t, sc) {
                const correct = t.rows.map(r => r[4] - r[5]);
                return {
                    requirement: `請在「數值差值」欄位使用相對引用公式，計算每筆的「${sc.headers[4]}」減去「${sc.headers[5]}」的差額。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'FUNC_SUM_MULTI', uiType: 'single', answerLabel: '指定兩列和',
            build(t, sc) {
                const idxs = [0, 2]; // 固定的第 2 列與第 4 列
                const sum = idxs.reduce((s, i) => s + t.rows[i][4], 0);
                return {
                    requirement: `老闆只想看第 2 列與第 4 列這兩筆的「${sc.headers[4]}」相加。請在答案格中輸入對應公式（如 =E2+E4）。`,
                    correctAnswer: sum
                };
            }
        },
        {
            skillId: 'IF_BASIC', uiType: 'column', answerHeader: '基礎分流',
            build(t, sc) {
                const threshold = pickRandom([50, 60, 70, 80]);
                const correct = t.rows.map(r => (r[4] >= threshold ? sc.yesVal : sc.noVal));
                return {
                    requirement: `請判斷「${sc.headers[4]}」是否達到 ${threshold}：達到填「${sc.yesVal}」，未達到填「${sc.noVal}」，填入「基礎分流」欄。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'IFS', uiType: 'column', answerHeader: '等第評估',
            build(t, sc) {
                const correct = t.rows.map(r => sc.ifsCorrect(r[4]));
                return {
                    requirement: `請依「${sc.headers[4]}」分數評定等第，規則：${sc.ifsRules}，填入「等第評估」欄。（提示：公式最後可用 TRUE 代表預設值）`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'IF_AND', uiType: 'column', answerHeader: '雙項檢核',
            build(t, sc) {
                const correct = t.rows.map(r => (r[4] >= 60 && r[5] >= 60) ? "達標" : "");
                return {
                    requirement: `只有「${sc.headers[4]}」與「${sc.headers[5]}」都達到 60 以上，才在「雙項檢核」欄填寫「達標」，否則留空。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'IF_PLUS', uiType: 'column', answerHeader: '加成結果',
            build(t, sc) {
                const cat = t.rows[0][2]; // 隨機拿第一個項目的類別
                const correct = t.rows.map(r => r[4] + (r[2] === cat ? 10 : 0));
                return {
                    requirement: `來自「${cat}」的人，「${sc.headers[4]}」額外加 10 分。請在「加成結果」欄使用邏輯乘加運算（如 =E2+(C2="${cat}")*10）計算總值。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'REF_ABSOLUTE', uiType: 'column', answerHeader: '最終乘積',
            build(t, sc) {
                const rate = pickRandom([1.5, 2, 2.5, 3]);
                t.header.push("", "基準倍率", "倍率格");
                t.rows.forEach((row, i) => {
                    if (i === 0) row.push("", "倍率", rate);
                    else row.push("", "", "");
                });
                const correct = t.rows.map(r => Math.round(r[4] * rate * 100) / 100);
                return {
                    requirement: `每個人的乘積 = 「${sc.headers[4]}」 × 基準倍率（存於 K2 儲存格中，每一行乘數鎖定）。請在「最終乘積」欄寫公式，公式中需用 $ 絕對引用鎖住 K2 儲存格。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'FUNC_RANK', uiType: 'column', answerHeader: '排名',
            build(t, sc) {
                const vals = t.rows.map(r => r[4]);
                const sorted = vals.slice().sort((a, b) => b - a);
                const correct = vals.map(v => sorted.indexOf(v) + 1);
                return {
                    requirement: `請在「排名」欄使用 RANK 函數計算每筆「${sc.headers[4]}」的排名。注意：公式中的比對範圍參數必須絕對引用鎖定！`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'COMPARE_OP', uiType: 'column', answerHeader: '數值比較',
            build(t, sc) {
                const correct = t.rows.map(r => r[4] > r[5]);
                return {
                    requirement: `請在「數值比較」欄輸入比較公式，判斷每一行「${sc.headers[4]}」是否大於「${sc.headers[5]}」，回傳 TRUE 或 FALSE。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'TEXT_TO_NUM', uiType: 'column', answerHeader: '純數值',
            build(t, sc) {
                const correct = t.rows.map(r => r[5]);
                return {
                    requirement: `「${sc.headers[6]}」欄後面多黏了一個文字「${sc.txtSuffix}」，無法直接做數學計算。請在「純數值」欄寫公式，將其轉為純數字。`,
                    correctAnswer: correct
                };
            }
        },
        {
            skillId: 'FILTER', uiType: 'single', answerLabel: '符合數',
            build(t, sc) {
                const cat = t.rows[0][2];
                const count = t.rows.filter(r => r[2] === cat).length;
                return {
                    requirement: `請使用 COUNTIF 統計「${sc.headers[2]}」欄中，為「${cat}」的總筆數，並將結果填寫在下方答案格。`,
                    correctAnswer: count,
                    answerLabel: `${cat} 統計數`
                };
            }
        }
    ];

    function drawTask(skillDefs) {
        const sc = pickRandom(SCENARIOS);
        const subgroup = pickRandom(sc.subgroups);
        
        // 隨機抽樣一個技能模板
        const tpl = pickRandom(TEMPLATES);
        const table = generatePracticeTableForScenario(sc, subgroup);
        const built = tpl.build(table, sc);
        const def = (skillDefs && skillDefs[tpl.skillId]) || {};
        
        return Object.assign({
            skillId: tpl.skillId,
            uiType: tpl.uiType,
            answerHeader: tpl.answerHeader,
            answerLabel: tpl.answerLabel,
            tip: def.s || '（這項禁術的提示尚未記載）',
            skillName: def.n || tpl.skillId,
            table,
            scenario: sc,
            subgroup: subgroup
        }, built);
    }

    window.PracticeEngine = {
        pickRandom, pickN, shuffle, randomInt, randomDate,
        generatePracticeTable: generatePracticeTableForScenario, evaluateFormula, answersMatch,
        TEMPLATES, drawTask, SCENARIOS
    };
})();
