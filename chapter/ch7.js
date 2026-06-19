/**
 * 試算表魔法冒險 v2 - 第 7 章【進入皇宮】
 * 主章節：賽爾引導模式
 *
 * 故事定位：
 * - 銜接 ch6.5（主角團進入主城，柔依同行）
 * - 本章：進入皇宮安頓、群像章節、晏身份揭曉（王子）、接受國王考驗
 * - 教學：公式基礎（算術運算符、文本轉數值）→ 絕對引用 → RANK → 跳躍式求和
 *
 * 文風強制規則：
 * 1. 感官先行、Show Don't Tell、對話口語化、不說滿
 * 2. 王子（晏）：大智若愚，偶露精準，說了重話自己笑著帶過
 * 3. 賽爾：ch7 全程飛得比平時低，話少了，但個性還在
 * 4. 柔依：在皇宮異常自在，細節藏在動作裡，沒有人注意到
 * 5. 葛蕾：後勤腦瞬間啟動，然後意識到自己是客人，把手背到背後
 * 6. 米羅：說不出哪裡不舒服，但就是不舒服
 * 7. 夏特：觀察到學院地位 vs 皇宮地位的差別，沉默
 */

const generateCh7Data = () => {
    const names = [
        "蕭長風","陳霜晴","李承澤","周玉書","林暮雪",
        "韓清遠","沈月白","謝長安","楊曉霞","魏廣野",
        "孫伯溫","盧明鑒","吳依柔","程志遠","徐歸鴻",
        "錢以安","趙錦行","柳煙雨","方鳴玉","唐烈炎"
    ];
    const regions = ["北境","東郡","南域","西川","中原"];

    // 固定角色（id: [姓名, 來源地, 武試, 文試, 策論]）
    // id=3, 8, 17 是國王欽點的三位——跳躍式求和任務用
    const fixedById = {
        1:  ["蕭長風", "北境", 88, 72, 65],
        3:  ["李承澤", "中原", 72, 85, 80],  // 欽點 A：策文雙強
        5:  ["林暮雪", "中原", 78, 82, 78],
        8:  ["謝長安", "東郡", 92, 65, 58],  // 欽點 B：武試最強
        12: ["盧明鑒", "南域", 65, 92, 70],
        17: ["錢以安", "西川", 76, 74, 85],  // 欽點 C：策論型
        20: ["唐烈炎", "西川", 60, 58, 95],  // 策論最高（加係數後排名衝）
    };

    const usedNames  = new Set(Object.values(fixedById).map(r => r[0]));
    const spareNames = names.filter(n => !usedNames.has(n));
    let si = 0;

    // 第 0 列是標題列；K1（index 10）存放策論係數 1.5，供絕對引用任務使用
    const rows = [
        ["編號","姓名","來源地","武試","文試","策論","總分","排名","","策論係數",1.5]
    ];

    for (let id = 1; id <= 20; id++) {
        if (fixedById[id]) {
            const [name, region, wu, wen, ce] = fixedById[id];
            rows.push([id, name, region, wu, wen, ce, "", "", "", "", ""]);
        } else {
            const region = regions[Math.floor(Math.random() * regions.length)];
            const wu  = 55 + Math.floor(Math.random() * 40);
            const wen = 50 + Math.floor(Math.random() * 45);
            const ce  = 45 + Math.floor(Math.random() * 50);
            rows.push([id, spareNames[si++], region, wu, wen, ce, "", "", "", "", ""]);
        }
    }

    // 最後一列：欽點合計提示行，供跳躍式求和任務使用（G22 填公式）
    rows.push(["", "▶ 欽點考生合計（3、8、17號）武試＋策論：", "", "", "", "", "", "", "", "", ""]);

    return rows;
};

window.V2_CHAPTERS = window.V2_CHAPTERS || {};

window.V2_CHAPTERS["70"] = {
    meta: {
        title: "第 7 章：進入皇宮",
        sheetName: "⚔️ 選才考核評鑑冊",
        reward: 3500
    },

    initialGridData: generateCh7Data(),

    skillDefs: {
        FORMULA_BASIC: { n: "公式引導符 =", s: "在儲存格中輸入等號 = 作為公式開頭", pain: "在儲存格輸入計算公式（如 10+20）卻只顯示文字，表格無法啟動自動計算。", d: "等號是公式的啟動咒語。它告訴試算表「接下來是計算指令，而不是普通文字」。", cat: "calc", parents: [] },
        OPERATOR_ARITH: { n: "算術運算符", s: "+ − × ÷   & ^ %",                   d: "+ 加  − 減  * 乘  / 除；& 連接文字；^ 次方；% 百分號——這幾個符號可以組合成幾乎所有計算",    cat: "formula", icon: "icon/公式.png" },
        TEXT_TO_NUM: { n: "文本轉數值", s: "在看起來像數字的文字格後方乘以 1 或加上 0 （如 =A1*1）", pain: "從舊系統匯出的數據看起來是數字，但左上角有綠色三角標記，導致 SUM 公式將它們全部忽略算為 0。", d: "通過無損的算術運算，將被儲存為文字格式的數字強制轉化為可供公式計算的真正數值。", cat: "calc", parents: ["FORMULA_BASIC"] },
        COMPARE_OP: { n: "比較運算符", s: "在公式中使用比較符號（=, >, <, >=, <=, <>）", pain: "需要判斷兩個儲存格的數值是否一致，肉眼核對容易漏看。", d: "比對兩個值，結果僅會回傳 TRUE (成立) 或 FALSE (不成立)。", cat: "calc", parents: ["FORMULA_BASIC"] },
        REF_RELATIVE: { n: "相對引用", s: "在公式中直接點選其他儲存格（例如 A1）", pain: "當需要計算每位旅客的剩餘糧食時，不想為上千個人重複撰寫一千條計算公式。", d: "公式的變動參照。向下拖曳填充公式時，參照格會自動跟著向下偏移一行。", cat: "calc", parents: ["FORMULA_BASIC"] },
        REF_ABSOLUTE: { n: "絕對引用", s: "在公式輸入過程中按下 F4 鍵，為參照格加上 $ 鎖定符（如 $AskillDefs: {）", pain: "計算所有新生的學分比例時，公式往下拖曳會導致分母的「總學分格」跑位變為空白，產生錯誤。", d: "鎖定公式參照格。無論公式如何拖曳填充，加上 $ 的儲存格位置都將雷打不動。", cat: "calc", parents: ["REF_RELATIVE"] },
        FUNC_RANK: { n: "RANK 函數", s: "在儲存格中輸入 =RANK(數值, 範圍, 排序順序)", pain: "需要排出上千位新生的綜合成績名次，手動比對數值會耗費大量心力。", d: "在指定的數值範圍中，自動算出某個數值在全體當中的名次順位。", cat: "calc", parents: ["REF_ABSOLUTE","FUNC_SUM_MULTI"] },
        FUNC_SUM_MULTI: { n: "自動加總 & 跳躍求和", s: "在公式中使用逗號隔開多個儲存格或範圍（如 =SUM(A1, C1, E1:E5)）", pain: "計算總金額時，需要跳過中間的非數值欄位，傳統 SUM 只能累加連續區域。", d: "讓 SUM 函數能夠跳躍式累加不連續的多個單格或多個區域。", cat: "calc", parents: ["SUM"] }
    },

    story: {

        // ── 開場：抵達皇宮 ───────────────────────────────────────────────
        start: [
            // 城門廣場——感官先行
            { n: "系統", t: "（皇宮的外城牆壓在頭頂上。磚縫裡積了幾十年的苔蘚，叫人想到的只有重量。）", a: "system",
              bg: "bg7 gate.png", bgm: "kingdom sad.mp3", bgPos: "center", bgZoom: 1.1, env: "white smoke/1", envFrames: 25, envspeed: 80, envOpacity: 0.2, envDrift: true },
            { n: "系統", t: "（廣場正午的石板曬得泛白，刺得人眼睛發酸。）", a: "system"
            , bgPos: "bottom", bgZoom: 1.5,flash: true, flashSFX: "flash.mp3", vol: 1.0 },
            { n: "系統", t: "（守門侍衛的手死死扣在槍柄上，視線像是一把平滑的鈍刀從我們頭頂掃過去。）", a: "system"
            , bgPos: "right bottom", bgZoom: 1.5 , bgDur:"10s", se: "clothes1.mp3" },
            { n: "系統", t: "（被那種視線掃到的瞬間，我感覺自己像是一片透明的空氣，這種不適比他手中的槍還要讓人喘不過氣。）", a: "system", flash: true, flashSFX: "flash.mp3" },
            { n: "我", t: "（邀請信離手的瞬間，掌心還殘留著信紙粗糙的紋理。）", a: "me", se: "paper down.mp3" , flash: true, flashSFX: "flash.mp3" },
            { n: "我", t: "（等待的幾秒鐘，短得像一輩子。）", a: "me"},

            // 管事出來
            { n: "系統", t: "（城門側邊的小門開了。一個穿深藍官服的管事走出來，視線在我們幾個人身上掃了一圈。）", a: "system",
              flash: true, flashSFX: "trans.mp3", vol: 0.8, bgPos: "right", bgZoom: 1.5, bgDur: "3s" },
            { n: "系統", t: "（他的視線像是一張無形的網，把我們一行人嚴嚴實實地罩住。）", a: "system"
            , env: "net/1", envFrames: 1, envspeed: 80, envOpacity: 1.0, envDrift: true},
            { n: "系統", t: "（我忍不住握緊了藏在袖子裡的指尖。他在看什麼？）"
            , a: "system",env:null},
            { n: "系統", t: "（我的衣服是否沾了塵土？還是他在衡量這幾個外來者會帶來多少麻煩？）"
            , a: "system" },
            { n: "管事", t: "邀請在案。諸位請隨我來。", a: "npc2", se: "walk.mp3" },
            { n: "管事", t: "宴會安排在三日後。住所、飲食已備妥，若有需要，吩咐侍從即可。", a: "npc2" },

            // 走廊——群像
            { n: "系統", t: "（這條走廊長得沒完沒了。）", a: "system",
              bg: "bg7 corridor.png", bgm: "greatscare.mp3", bgPos: "center", bgZoom: 1.2, vol: 0.5, flash: true, flashSFX: "trans.mp3" },
            { n: "系統", t: "（每走七步，就會撞進下一盞燈架的火光裡。）", a: "system", bgPos: "right", bgZoom: 1.5, bgDur: "10s" },
            { n: "系統", t: "（那火苗連晃都不晃一下，安靜得像是在嘲諷外頭那個千瘡百孔的世界。）", a: "system"},

            { n: "我", t: "（米羅的步子慢了，他那原本與我同步的腳步聲，在空曠的走廊裡顯得有些脫節。）", a: "me", se: "walk.mp3" },
            { n: "米羅", t: "（這裡的人，走路的時候不需要看路。）", a: "miro", shake: true },
            { n: "米羅", t: "（他卻做不到。他每走一步，視線就得謹慎地確認腳下的磚縫。）", a: "miro" },

            { n: "我", t: "（夏特在一幅山水卷軸前停了下來。我下意識跟著頓住。）", a: "me", se: "clothes1.mp3",bg:"bg7 chate.png", bgPos: "left", bgZoom: 1.8, bgDur: "5s"},
            { n: "我", t: "（側頭看去，那只是一幅尋常的蒼松遠山圖。）", a: "me", se: "clothes1.mp3" },
            { n: "我", t: "（他的背影向來挺拔得像把劍的脊背，在那幅畫前停著，竟有種說不出的僵硬。）", a: "me" },
            { n: "夏特", t: "（雲端尖塔的那些位置，是我磨破了筆尖、熬乾了眼淚才坐上的。）", bgPos: "right", bgZoom: 1.1, bgDur: "8s" , se: "paper down.mp3", vol: 0.8 },
            { n: "夏特", t: "（皇宮的人，不需要去爭取什麼。他們生來就屬於這裡。）"},

            { n: "我", t: "（賽爾縮在書頁裡，甚至沒探出半個腦袋。）", a: "me", se: "fairy_sleep.mp3",bg: "bg7 corridor.png" },

            { n: "葛蕾", t: "（這條走廊長得離譜，燈架又密。）", a: "glea", bgPos: "center", bgZoom: 1.2,bg: "bg7 glea.png", bgm: "not match.mp3" },
            { n: "葛蕾", t: "（按這火苗燃燒的速度，一日至少得換兩次燈油。）", a: "glea" },
            { n: "葛蕾", t: "（全宮算下來……嘖，誰管後勤的？簡直在燒錢！）", a: "glea", shake: true, bgPos: "center", bgZoom: 1.5 },
            { n: "葛蕾", t: "（把手背到身後。我是客人，不是管事。）", a: "glea", se: "clothes1.mp3", bgPos: "center", bgZoom: 1.2 , bgDur:"6s" },
            // 安頓
            { n: "管事", t: "（帶到住所，逐一發放房間鑰匙。）如有任何需要，拉這條繩子即可。", a: "npc2",
              bg: "bg7 room.png", se: "put down.mp3", vol: 0.8, flash: true, flashSFX: "trans.mp3", bgPos: "center", bgZoom: 1.1, bgm: "kingdom sad.mp3" },
            { n: "管事", t: "今晚餐食在西廂。三日後宴會前不另行安排，諸位可自行在宮中走動。", a: "npc2" },
            { n: "我", t: "（鑰匙是黃銅的，比我想像中沉。）謝謝。", a: "me", se: "coin2.mp3" },
            { n: "米羅", t: "（輕聲）這床比我整年睡過的加起來都要軟……", a: "miro", se: "boy_breath.mp3" },

            // 庭院——出來走走
            { n: "系統", t: "（在這房間裡坐了一盞茶的時間，卻連一個字都沒辦法思考。）", a: "system",
              bg: "bg7 room.png", bgm: "bad things.mp3", bgPos: "center", bgZoom: 1.1, flash: true, flashSFX: "flash.mp3" },
            { n: "系統", t: "（杯底的茶早就涼透了，杯沿上甚至沒沾到一點唇印。）", a: "system", se: "put down.mp3", bgPos: "center", bgZoom: 1.5 , bgDur:"10s" },
            { n: "系統", t: "（我實在坐不住，乾脆走到庭院裡。）", a: "system"},
            { n: "系統", t: "（皇宮的庭院，梅樹被規訓得毫無生氣，地面更是連一絲雜草的縫隙都不留。）", a: "system"
            , bg: "bg7 garden.png",bgPos: "center top", bgZoom: 1.5, bgDur: "10s",bgm:"no.mp3", se: "wind1.mp3", vol: 1.0 },

            // 先是手
            { n: "我", t: "（我原本只是漫不經心地掃過，庭院裡的梅樹修得太過規整，看久了眼球會發酸）", a: "me",
              bgPos: "right", bgZoom: 1.5 },
            { n: "我", t: "（正準備把目光挪開時，角落裡的一抹亮色卻像鉤子一樣，強行扯住了我的視線)"
            , a: "me", flash: true, flashSFX: "bell.mp3",bg:"cg/ch7 prince.png",bgm:"showup.mp3"  },
            { n: "我", t: "(那是個背對著我的身影。）", a: "me" },
            { n: "我", t: "（她的手搭在粗糙的石柱上，指節細得過分，白得像是不沾一點塵土的細瓷。）"
            , a: "me", bgPos: "center", bgZoom: 2.0, bgDur: "5s", se: "wind1.mp3", vol: 1.0
            ,stuff:"white hand.png", stuffOpacity: 0.8,stuffScale: 2.0,bgBlur: 10, stuffPos: "left"},
            { n: "我", t: "（那種毫無雜質的白，在這座灰撲撲的皇宮裡顯得格外刺眼。）", a: "me", bgPos: "center", bgZoom: 1.1 , bgDur:"10s"
            ,stuff:"white hand.png", stuffOpacity: 0.8,stuffScale: 2.0,bgBlur: 10, stuffPos: "left"},
            { n: "我", t: "（記憶中某個片段像被點燃的引信，猛地竄了上來。）", a: "me", se: "high peach.mp3", vol: 1.0},
            // 葛蕾注意到的是另一件事
            { n: "葛蕾", t: "（低聲）那兩個人的衣袍，不是宮中役使的裁法。", a: "glea"
            , se: "paper down.mp3",bg:"cg/ch7 two.png", bgPos: "center", bgZoom: 2.0,flash: true, flashSFX: "flash.mp3", vol: 1.0},

            // 米羅注意到站著那個人
            { n: "米羅", t: "（壓低聲音，有些粗魯地拉了拉我的袖子，指尖的力道帶著一絲難以掩飾的驚愕）", a: "miro", shake: true, se: "clothes1.mp3" },
            { n: "米羅", t: "隊長，你看那個站著的。", a: "miro", shake: true, se: "clothes1.mp3" },
            { n: "我", t: "（我順著米羅的視線看過去。柔依……她就在那裡，站在那個背影的後方。"
            , a: "me", bgPos: "left", bgZoom: 1.5, flash: true, flashSFX: "flash.mp3",stuff:"royi eyes.png",stuffScale: 1.7, stuffOpacity: 0.8},
            { n: "我", t: "(穿著剪裁合身的深色侍女服，褪去了那身藥師袍的寬鬆，顯得格外嚴謹俐落）"
            , a: "me", bgPos: "left", bgZoom: 2.0, bgDur:"10s"},
            { n: "我", t: "（那身裝束剪裁精細，穿在她身上，合身得好像她本來就是這皇宮裡的一份子。）", a: "me" },
            { n: "葛蕾", t: "（冷靜地掃視過兩人的身形，語氣裡透著一點不可思議）是柔依，沒錯。", a: "glea" },
            { n: "我", t: "（我沒有接話。夏特在旁邊安靜得出奇，視線在那個挺拔的背影與柔依之間徘徊。）", a: "me", bgPos: "center", bgZoom: 1.2 },
            { n: "我", t: "（在這座高牆環繞、連一根閒草都不容許存在的皇宮裡，能看見熟人。）", a: "me", bgPos: "center", bgZoom: 1.5, bgDur:"10s" },
            { n: "我", t: "（這種感覺簡直奇妙得過了頭。）", a: "me" },
            { n: "我", t: "（原本那種身處陌生宮殿的緊繃感，被沖淡了不少。）", a: "me", se: "girl_smile1.mp3" },

            // 米羅認出柔依，並冇認出晏——那個背影是個女人，跟他記憶裡的晏對不上
            { n: "米羅", t: "（像是終於反應過來，嘴角忍不住往上揚）……柔依姊！", a: "miro", shake: true, bgPos: "left", bgZoom: 2.0},

            // 「柔依姊」還在庭院裡——
            { n: "系統", t: "（廊道裡傳來腳步聲。節奏平穩，靴跟落在石磚上的聲音清脆得不帶一絲雜質。）", a: "system",
              se: "walk.mp3", vol: 0.5, bgPos: "center", bgZoom: 1.0,bg:"bg7 garden.png" },
            { n: "宮人", t: "王子殿下，宴會前的最終清單要請您過目簽署。", a: "npc2" },

            // 全組呆住
            { n: "我", t: "（我們誰都沒有動，空氣彷彿凝固成了漿糊。）", a: "me", bgm: "no.mp3", flash: true, flashSFX: "boom.mp3" },
            { n: "我", t: "（米羅臉上那抹為了重逢而綻放的笑，還沒來得及散去，就這樣僵硬地掛在臉上，看起來既滑稽又有些手足無措。）", a: "me", shake: true , se: "girl_laugh.mp3", vol: 1.0 },

            // 那個人轉過來——臉熟悉，但腦子一時跟不上
            { n: "我", t: "（那個人轉過身來。我看見了熟悉的眉眼，那雙笑起來會瞇成碎金線的眼睛。）", a: "me",
            flash: true, flashSFX: "flash.mp3", vol: 1.0,bg:"cg/no.png",
            bgm: "prince.mp3", bgPos: "center", bgZoom: 1.1,stuff:"prince eyes.png",stuffScale: 1.7},
            { n: "我", t: "（只是，他身上沒了船上那件袍子。)"
            , a: "me", bgPos: "bottom", bgZoom: 1.5,bg:"cg/ch7 prince2.png",flash: true, flashSFX: "flash.mp3", vol: 1.0 },
            { n: "我", t: "（取而代之的是一襲純白色的長裙。）", a: "me", bgPos: "center", bgZoom: 1.5,bgDur:"10s"},
            { n: "我", t: "（層層疊疊的衣料像雲朵一樣順著身形傾瀉而下，領口處繡著繁複而精緻的銀紋。）"
            , a: "me" , bgPos: "top", bgZoom: 1.5, bgDur: "10s"},
            { n: "我", t: "（那樣乾淨的白色映著他清秀的臉龐。）", a: "me"},
            { n: "我", t: "（裙擺搖曳的弧度帶著一股說不出的從容，跟在船上的那個樣子，其實也沒什麼兩樣。）", a: "me"},
            { n: "我", t: "（「王子殿下」四個字在空氣中震盪，我腦子裡空白了一瞬，好不容易才將那個遞水袋的少年與眼前這個身影重疊在一起。）"
            , a: "me", se: "bell.mp3",bg:"cg/ch6.5 prince.png"},
            { n: "我", t: "（晏。竟然是晏。）"
            , a: "me",bg:"cg/ch7 prince2.png" ,flash: true, flashSFX: "flash.mp3", vol: 1.0, bgPos: "center", bgZoom: 1.1},

            // 群像反應——各自的那一刻
            { n: "米羅", t: "（原本的興奮消退，取而代之的是過度衝擊後的呆滯）晏？……晏是王子？", a: "miro", bg: "bg7 garden.png", shake: true },
            // 夏特——懸著的東西落定了
            { n: "我", t: "（我偷偷瞥向夏特。他沒有驚訝，反倒肩膀那份若有似無的緊繃鬆弛了下來。）", a: "me", se: "clothes1.mp3" },
            // 葛蕾——她在船上就已經覺得哪裡不對
            { n: "葛蕾", t: "（沉默了半晌。再抬頭時，語氣裡透著果然如此的無奈）……在船上，我就覺得哪裡不對勁。", a: "glea", se: "paper down.mp3" },
            { n: "我", t: "（我聽著他們的話，心裡那種震驚慢慢散去，剩下的竟然全是一種純粹的喜悅）", a: "me" , shake: true },
            { n: "我", t: "（不管身份不管穿著，站在那裡的晏還是一樣的從容，一樣的瀟灑。）", a: "me", se: "girl_smile1.mp3" },

            // ——只有玩家能看到：王子的記憶——
            { bg: "cg/prince card.png", flash: true, flashSFX: "boom.mp3", vol: 0.8,
              bgm: "rose.mp3", bgPos: "center", bgZoom: 1.1 },
            { n: "系統", t: "（廊道長得沒了邊際，壓得人透不過氣。）", a: "system",
              bg: "bg7 corridor.png", bgm: "conspiracy.mp3", bgPos: "center", bgZoom: 1.5, bgDur: "10s", env: "white smoke/1", envOpacity: 0.3 },
            { n: "系統", t: "（暗橘色的燈火懸在半空，光芒在那層晦暗的積塵面前顯得無力，怎麼也照不到腳邊。）"
            , a: "system", se: "heartbeat.mp3", vol: 1.0
},
            { n: "系統", t: "（那個小小的身影陷在過於寬闊的長廊中央。）", a: "system" },
            { n: "系統", t: "（仰頭看燈時，脖頸處繃出一道脆弱的弧線，那眼神裡連一點光都沒沾上。）", a: "system" },
            { n: "宮人", t: "公主殿下，學好規矩，嫁個好人家就行了……其他的，少問。", a: "npc1",
              se: "whisper.mp3", shake: true },
            { n: "系統", t: "（靴底重重地磕在磚面上，一下又一下。)", a: "system",
              se: "walk.mp3", vol: 1.0, bgPos: "center top", bgZoom: 2.0 },
            { n: "系統", t: "(那沉悶的聲響在廊道裡迴盪，像是將整條長廊的空氣都踩得死死的，最後碎在盡頭的深淵裡。）", a: "system", bgPos: "center bottom", bgZoom: 2.0,bgDur:"10s" },
            { n: "系統", t: "（後來，長廊裡的呼喚聲改了。)", a: "system",
              bg: "bg7 glea.png", flash: true, flashSFX: "bell.mp3", bgPos: "center", bgZoom: 1.1, bgDur:"15s"  },
            { n: "系統", t: "（坊間都在傳，陛下疼愛胞妹，特意下令將王國的孩子統一稱為「王子」）", a: "system",
              bg: "bg3 kingdom.png"},
            { n: "系統", t: "(因為無論性別，皆是王國血脈，理應享有同等尊貴而沉重的厚愛。）", a: "system"},
            // ——記憶結束——
            { n: "系統", t: "（記憶結束）", a: "system",
              bg: "cg/ch7_prince.png", flash: true, flashSFX: "memory_out.mp3", vol: 0.8,
              bgm: "prince.mp3", bgPos: "center", bgZoom: 2.0, env: null },

            { n: "王子", t: "（他轉身揮了揮手，示意身後的宮人退下。）"
            ,bg: "bg7 garden.png", a: "prince", se: "girl_smile1.mp3", vol: 0.8},
            { n: "王子", t: "（宮人躬身離開後，他毫無貴族架子地在那方矮欄杆上坐了下來。）",bg: "cg/ch7 sit.png", bgPos: "center", bgZoom: 1.1, bgDur:"10s" },
            { n: "王子", t: "（嘴角那抹笑意先是暈開，隨後眼眸微彎，眼神明亮得晃人。）"},
            { n: "王子", t: "說好後會有期，比我猜的要快。", a: "prince" },
            { n: "王子", t: "我還以為你們得先在主城那迷宮一樣的街道裡繞個幾圈，才能找著這兒。", a: "prince" },
            { n: "王子", t: "（他目光轉向米羅，帶出一點戲謔）", a: "prince",bg: "cg/ch7 sit.png", bgPos: "left", bgZoom: 1.5},
            { n: "王子", t: "怎麼，這才幾天沒見，眼圈就黑成這樣？看來主城的床墊沒船上的貨箱好睡啊。", a: "prince"},
            { n: "米羅", t: "（被他這熟悉的調侃一激，繃著的身體反而鬆了下來）你還真認得我啊", a: "miro", bg: "bg7 garden.png", shake: true},
            { n: "王子", t: "（他笑意漸收，換上一種玩味的認真）", a: "prince", bg: "cg/ch7 sit.png", flash: true, flashSFX: "flash.mp3", bgPos: "center", bgZoom: 1.2 },
            { n: "王子", t: "船上第一夜，我看見書頁裡透出的光，那光色跟船上的燈火完全不同。", bgPos: "center", bgZoom: 1.5,bgDur:"10s"},
            { n: "王子", t: "我就想，這群人有意思，帶著與眾不同的底牌。當時就覺得，遲早得再碰一次。"},

            // 柔依說明——解釋關係
            { n: "米羅", t: "（視線在兩人之間來回，還在努力消化這兩人的關係）等等……柔依姊和殿下", a: "miro", bg: "bg7 garden.png", shake: true },
            { n: "柔依", t: "（站姿挺拔，語氣冷靜且利落）", a: "royi", se: "paper down.mp3" },
            { n: "柔依", t: "我隨侍殿下多年。出宮是殿下的任務，我們去各地走走，看看民生行情，不便透露身份。", a: "royi"},
            { n: "米羅", t: "（腦中似乎有一根弦斷了，呆滯道）等等，那你在義診所那次——", a: "miro" },
            { n: "柔依", t: "行經各地時，我偶爾會找地方幫忙，那次義診所只是其中一站。", a: "royi" },
            { n: "柔依", t: "（她淡淡地看向我們，嘴角勾起一抹極淺的弧度）你們上船那天，我就認出來了。", a: "royi", se: "girl_smile1.mp3" },
            { n: "王子", t: "（他輕輕接過話）正好借路，順便看看各地。這宮裡悶，出來轉轉才看得到真章。", a: "prince"
            , se: "girl_attraction.mp3", vol: 0.7, bgPos: "center", bgZoom: 2.0, bgDur: "5s" },
            { n: "王子", t: "（他向我們微微頷首，眼底那股溫和的笑意，讓人很容易就忘了剛才那聲「王子殿下」。", a: "prince", flash: true, flashSFX: "bell.mp3" },
            { n: "王子", t: "在這宮裡，禮數總是少不了。但出了這道門，那些尊稱就免了吧。叫我晏就好。", a: "prince" },

            // 差事——不然今天這麼長的走廊白走了
            { n: "王子", t: "（從欄杆上跳下來，從袖裡取出一本冊子）正好有個差事。不然今天這麼長的走廊白走了。", a: "prince",
              se: "paper down.mp3", vol: 0.8, bgPos: "center", bgZoom: 1.1,bgm:"daily.mp3" },
            { n: "王子", t: "選才考核冊，二十個人，分數都在，但總分和排名還沒算出來。文員搞了兩天沒搞定。", a: "prince" },
            { n: "我", t: "（接過冊子翻了翻。「總分」和「排名」兩欄空著，一個數字都沒有。）", a: "me", se: "paper down.mp3", vol: 0.7 },
            { n: "王子", t: "策論今年加了係數，1.5，在冊子右側那格。", a: "prince" },
            { n: "王子", t: "（往庭院那邊走去，邊走邊說）我覺得你們用不了兩天。有問題來找我。", a: "prince",
              se: "walk.mp3", vol: 0.7, bgPos: "right", bgZoom: 1.5 },

            // 賽爾出場
            { n: "我", t: "（還沒來得及細看冊子，魔導書裡就漫出一道微光。）", a: "me"
            , se: "fairy laugh.mp3", vol: 0.6, flash: true, flashSFX: "trans.mp3" },
            { n: "王子", t: "（他腳步微微一頓，轉過頭來。）", a: "prince", se: "walk.mp3", bgPos: "left", bgZoom: 1.8 },
            { n: "王子", t: "（那雙清亮的眼睛直直地看向我的肩頭，在那半空中停留了一拍）精靈。" , shake: true },
            { n: "賽爾", t: "（她下意識地縮了縮翅膀，隨即驕傲地揚起下巴，聲音脆生生的）三百年靈體，這本書的守護者，幸會，王子殿下。", a: "fairy", shake: true },
            { n: "王子", t: "（他沒有因為賽爾的驕傲而感到冒犯，反而露出了一個淺淡的笑容。）幸會。", a: "prince", se: "girl_smile1.mp3", bgPos: "center", bgZoom: 1.2 },
            { n: "我", t: "（賽爾的翅膀微微一頓。她沒說什麼，飛回帳冊上方去了。）", a: "me", flash: true, flashSFX: "boom.mp3", vol: 1.0},
        ],

        // ── 任務1引導：公式基礎 (輸入錯誤) ────────────────────────────
        discovery_FORMULA_BASIC: [
            { n: "賽爾", t: "先說最基礎的規矩。試算表裡，[[公式以等號開頭|gold]]——就這一條。", a: "fairy" },
            { n: "賽爾", t: "在G2輸入 [[=SUM(D2,E2,F2)|gold]]，它就會用加總函數把武試、文試、策論三欄加起來。", a: "fairy" },
            // [2026-06-10 修改] 原版備份：{ n: "賽爾", t: "不過你可得睜大眼睛，看看這張表裡的數字有沒有什麼古怪的地方。比如那些字是[[靠左還是靠右|gold]]？左上角有沒有什麼[[奇怪的綠色標記|gold]]？", a: "fairy" },
        ],

        // ── 任務2引導：修正文字格式 ────────────────────────────
        discovery_FORMULA_FIX: [
            { n: "系統", t: "（按下 Enter 後，格子裡跳出的數字 137，比我預計的少了一大截。）", a: "system", se: "error.mp3", vol: 0.8 },
            { n: "葛蕾", t: "（看了一眼）你這是把武試的成績全給吞了？", a: "glea", shake: true },
            { n: "我", t: "（我仔細看了看，文試和策論的加總沒錯，唯獨『武試』那一欄，像是被徹底無視了。）", a: "me" },
            { n: "賽爾", t: "（敲了敲表頭）看清楚，武試那欄的字體靠左，左上角還有個[[綠色標記|green]]，這是[[文字格式|red]]的偽裝！SUM 函數遇到文字就會直接忽略它！", a: "fairy" },
            { n: "賽爾", t: "遇到這種情況，得加點強制手段。只要把文字格式乘上數字 1（*1），試算表就會把它當作真正的數字來計算！把公式改成 [[=SUM(D2*1,E2,F2)|gold]] 試試看。", a: "fairy" }
        ],

        success_FORMULA_FIX: [
            { n: "系統", t: "（數字跳轉為 225。計算正確了。）", a: "system", flash: true, flashSFX: "boom.mp3" },
        ],

        // ── 任務3引導：相對引用下拉填充 ────────────────────────────
        discovery_FORMULA_AUTOFILL: [
            { n: "賽爾", t: "第一格算對了。接下來，抓住儲存格右下角的控制點往下拖拉——格子會跟著行號移動，這叫[[相對引用|gold]]。二十行一口氣算完。", a: "fairy" },
        ],

        success_FORMULA_AUTOFILL: [
            { n: "系統", t: "（G列的數字一格格填上來，二十行全算完了。）", a: "system", se: "coin2.mp3", vol: 0.8 },
            { n: "我", t: "（比手算快多了。）", a: "me" },
        ],

        bonus_TEXT_NUM: [
            // [2026-06-10 修改] 原版備份：
            // { n: "賽爾", t: "（補充一句）順帶一提，運算符不只四則。& 可以把兩欄文字接在一起——比如 =B2&\"（\"&C2&\")\" 就能顯示「蕭長風（北境）」。^ 是次方，% 是百分號。", a: "fairy" },
            // { n: "賽爾", t: "還有比較運算符：> < >= <= <> ——比較結果只有 TRUE 或 FALSE，而 TRUE=1、FALSE=0，可以直接參與計算。這個技巧有時候可以代替 IF，有空試試。", a: "fairy" },
            { n: "賽爾", t: "（補充一句）順帶一提，試算表的符號不只加減乘除。", a: "fairy" },
            { n: "賽爾", t: "想把兩格文字接在一起就用 [[&|gold]] 符號！", a: "fairy" },
            { n: "賽爾", t: "例如 [[=B2 & \"(\" & C2 & \")\"|gold]]，就能自動拼出「蕭長風(北境)」。", a: "fairy" },
            { n: "米羅", t: "（眼睛一亮）喔！這用來整理名單滿方便的！", a: "miro", shake: true, se: "boy_smile.mp3" },
            { n: "賽爾", t: "還有 [[^|gold]] 是次方，[[%|gold]] 是百分號，這些都不難。", a: "fairy" },
            { n: "賽爾", t: "真正的高手技巧是比較符號：[[> < >= <= <>|gold]] （大於、小於、不等於）。", a: "fairy" },
            { n: "葛蕾", t: "（思考了一下）比較大小？那算出來的結果不就是「對」或「錯」嗎？", a: "glea", se: "clothes1.mp3" },
            { n: "賽爾", t: "沒錯！結果會是 [[TRUE 或 FALSE|gold]]。但在這裡，[[TRUE 就是 1，FALSE 就是 0|red]]！", a: "fairy", shake: true },
            { n: "賽爾", t: "它們可以直接拿來做加減乘除，有時候連 IF 函數都省了。以後有機會再教你們！", a: "fairy" },
        ],

        // ── 任務2引導：絕對引用 ────────────────────────────────────────
        // ── 任務4A引導：相對引用的災難 ────────────────────────────────────────
        discovery_ABS_REF: [
            // [2026-06-10 修改] 原版備份：
            // { n: "賽爾", t: "現在來處理加成。總分還要乘以右上角 K1 格子裡的係數 1.5。", a: "fairy" },
            // { n: "賽爾", t: "把 G2 的公式改成 [[=SUM(D2*1,E2,F2)*K1|gold]]，然後像剛才一樣往下拖拉看看。", a: "fairy" },
            { n: "賽爾", t: "基礎總分算好了。不過晏剛才有交代，王國今年的新政策特別看重『策論』，所以要給它加上加成係數！", a: "fairy" },
            { n: "賽爾", t: "這可是能改變排名的關鍵。現在我們要把 K1 格子裡的「策論係數 1.5」乘進去。", a: "fairy" },
            { n: "賽爾", t: "把 G2 的公式改成 [[=SUM(D2*1,E2,F2)*K1|gold]]，加上乘號與 K1 係數格，然後像剛才一樣往下拖拉看看。", a: "fairy" },
        ],

        discovery_ABS_FIX: [
            { n: "系統", t: "（拖拉之後，下面的成績變得慘不忍睹。有些人的成績甚至變成了 0。）", a: "system", se: "error.mp3" },
            { n: "賽爾", t: "看到了吧！點開 G3 的公式看看，變成了 =SUM(D3*1,E3,F3)*K2。K 欄跟著往下跑了，但 K2 是空格，乘出來當然全毀了。", a: "fairy" },
            { n: "賽爾", t: "我們得把 K1 這格「鎖死」。回到 G2，點擊公式裡的 K1 旁邊，按下鍵盤上的 [[F4|gold]] 鍵！", a: "fairy" },
            // [2026-06-10 修改] 原版備份：加上了 $ 符號變成 [[$K$1|gold]] 後，$ 就會把行和列都固定住。改好後再往下拖拉覆蓋一次！
            { n: "賽爾", t: "那個 $ 符號就像『釘子』！加上去變成 [[$K$1|gold]] 後，等於把行和列都牢牢釘死在 K1 上。這樣拖拉時就不會跑掉了，改好後再往下拖拉一次！", a: "fairy" }
        ],

        success_ABS_REF: [
            { n: "我", t: "（修改後重新拖拉——G3 顯示 =SUM(D3*1,E3,F3)*$K$1，每一行的成績都正確乘上了係數。）", a: "me", se: "coin2.mp3" },
            { n: "賽爾", t: "這就是[[絕對引用|gold]]。全表共用的係數、稅率、基準值——全部用這個鎖住。", a: "fairy", flash: true, flashSFX: "bell.mp3" },
        ],

        // ── 中場：王子的觀察 ────────────────────────────────────────────
        mid_story: [
            { n: "我", t: "（晏坐在庭院另一邊，沒有走。我偶爾往那邊瞄一眼，她偶爾往這邊看，然後收回去。）", a: "me" },
            { n: "米羅", t: "（認真盯著G列，皺了皺眉）欸，加了係數之後，第20號的唐烈炎……總分好像要衝很高？", a: "miro", se: "boy_attraction.mp3", shake: true },
            { n: "我", t: "（算了一下）策論95，乘以1.5是142.5。加上武試60和文試58……對，總分確實很高。", a: "me" },
            { n: "夏特", t: "（冷靜地說）係數是設計來讓策論型的人翻盤的。有人刻意在引進這類人才。", a: "chate", se: "pen.mp3" },
            { n: "王子", t: "（從對面走過來，語氣輕快）你猜對了。", a: "prince", se: "walk.mp3", flash: true, flashSFX: "trans.mp3", vol: 0.6 },
            { n: "夏特", t: "（停了一拍）你一直在聽。", a: "chate" , shake: true },
            { n: "王子", t: "（笑著說）我就坐在那裡，你們說話的聲音又不小。", a: "prince", se: "girl_smile1.mp3" },
            { n: "王子", t: "（停了一停，帶著一點真心高興的語氣）能從係數讀出人才政策意圖的——不多。你有意思。", a: "prince", flash: true, flashSFX: "bell.mp3" },
            { n: "賽爾", t: "（從帳冊上方飛過，低聲）「不多」兩個字，已經算稱讚了。", a: "fairy", se: "fairy laugh.mp3" },
        ],

        // ── 任務3引導：RANK 函數 ──────────────────────────────────────
        discovery_RANK: [
            { n: "賽爾", t: "總分有了，接下來排名。用[[RANK函數|gold]]：", a: "fairy" },
            // [2026-06-10 修改] 原版備份：在H2輸入... 三個參數：第一格是要排名的分數...
            { n: "賽爾", t: "在H2輸入 [[=RANK(G2,$G$2:$G$21,0)|gold]]。", a: "fairy" },
            { n: "賽爾", t: "RANK 函數有三個位置要填，記住口訣：『你是誰、跟誰比、怎麼排』。", a: "fairy" },
            { n: "賽爾", t: "第一格填你的分數 (G2)；第二格填全體範圍（記得用 $ 釘死 [[$G$2:$G$21|gold]]）；第三格填 [[0 代表降序|gold]]（分數越高，名次越前）。", a: "fairy" },
        ],

        success_RANK: [
            { n: "系統", t: "（H列出現了名次數字。第17號錢以安排第一名，第20號唐烈炎排第三。）", a: "system", se: "coin2.mp3" },
            { n: "米羅", t: "（指著螢幕）哇，策論型的果然衝上來了！不加係數的話他們根本不在前十啊。", a: "miro", shake: true },
            { n: "葛蕾", t: "（看了一眼）前三名裡有兩個策論型。這個係數確實在改結構，不只是讓他們多幾分。", a: "glea", se: "paper down.mp3" },
            { n: "我", t: "（她走過來看了一眼排名。目光在第20號那行停了一拍，沒說話。）", a: "me" , shake: true },
        ],



        // ── 結局 ──────────────────────────────────────────────────────
        end: [
            { n: "系統", t: "（帳冊被最後一名侍從小心翼翼地捧走，庭院隨之安靜下來。）", a: "system",
              bg: "bg7 garden.png", bgm: "sweet.mp3", bgPos: "right", bgZoom: 1.5,
              se: "put down.mp3", vol: 0.7 },
            { n: "系統", t: "（夕陽殘照，我們幾個人就這樣站在晏的面前，彷彿剛結束一場不可思議的夢。）"
            , a: "system", bgPos: "center", bgZoom: 1.1 , bgDur:"10s"},
            { n: "王子", t: "（滿意地拍了拍手）行，過了。我就知道找你們準沒錯。", a: "prince", se: "clothes1.mp3" , shake: true },
            { n: "王子", t: "宴會的事到時候再說。這幾天你們先安心住著，宮裡大，哪裡想走走就走走，別客氣。", a: "prince" },
            { n: "米羅", t: "（忍不住問道）……晏，這宮裡真的哪裡都能走嗎？", a: "miro"  },
            { n: "王子", t: "大多數地方都行。你們是客人。", a: "prince" },
            { n: "王子", t: "（他忽然停下腳步，回過頭看向我們，那雙漂亮的眼眸裡閃過一抹難得的雀躍）"
            , a: "prince", flash: true, flashSFX: "bell.mp3",bg:"cg/ch7 last.png",bgm:"prince2.mp3"
            , env: "light/1", envFrames: 25, envspeed:80, envOpacity: 0.4, envDrift:true, bgPos: "left top", bgZoom: 2.0 },
            { n: "王子", t: "對了，明天有個地方想帶你們去。住在這裡的人才知道在哪，外面找不著。", a: "prince", bgPos: "center", bgZoom: 1.1 , bgDur:"10s"},
            { n: "王子", t: "(微微歪過頭，語氣裡透著邀請朋友去私藏秘密基地的口吻）去嗎？", a: "prince"},
            { n: "米羅", t: "去！", a: "miro", shake: true, se: "boy_wa.mp3",bg: "bg7 garden.png" },
            { n: "夏特", t: "（淡淡地）有空。", a: "chate" },
            { n: "葛蕾", t: "（她合上那一整天都在記錄的備忘冊，發出輕脆的聲響）可以。", a: "glea", se: "paper down.mp3" },
            { n: "我", t: "(我迎向晏帶笑的目光，心裡那點初入宮廷的焦慮徹底煙消雲散）", a: "me" , se: "girl_laugh.mp3", vol: 1.0 },
            { n: "我", t: "我們都在。", a: "me", bgPos: "right", bgZoom: 1.5},
            { n: "王子", t: "（滿意地笑了，邁開腳步朝廊道的深處走去，裙擺掠過地面，步履瀟灑如初）", a: "prince"
            , se: "walk.mp3",bg:"cg/ch7 last.png", bgPos: "center", bgZoom: 1.1,bgDur:"10s" },
            { n: "王子", t: "那明天見。吃完早飯在這個庭院等。", a: "prince" },
            { n: "我", t: "（我看著她的背影緩緩隱入廊道那片橘紅色的光影裡。腳步聲漸漸消失。）", a: "me"
            , flash: true, flashSFX: "trans.mp3",bg: "bg7 garden.png"},
        ],

        // ── 失敗提示 ──────────────────────────────────────────────────
        fail_FORMULA_no_equal: [
            { n: "賽爾", t: "「差一點——沒有等號的輸入，試算表會直接當成文字，不會計算。記得以 [[=|gold]] 號開頭。」", a: "fairy" }
        ],
        fail_FORMULA_wrong_col: [
            { n: "賽爾", t: "「欄位選錯了。武試是D欄、文試是E欄、策論是F欄。這一行對應的就是 D2、E2、F2。」", a: "fairy" }
        ],
        fail_FORMULA_text_unhandled: [
            { n: "賽爾", t: "「有幾格的武試分還是文本格式，加總時被當成零了。把公式裡的 D2 改成 [[D2*1|gold]] 或 [[D2+0|gold]] 就能強制轉成數值。」", a: "fairy" }
        ],
        fail_ABS_NO_DOLLAR: [
            { n: "賽爾", t: "「試著往下拖拉——K欄跑掉了吧？K2、K3都是空格，策論加成全部消失了。」", a: "fairy" },
            { n: "賽爾", t: "「游標停在 K1 上，按一下 [[F4|gold]] 鍵，或手動輸入 [[$K$1|gold]]，把它鎖住。」", a: "fairy" }
        ],
        fail_ABS_WRONG_CELL: [
            { n: "賽爾", t: "「鎖錯格子了。策論係數放在 K1，絕對引用要寫 [[$K$1|gold]]，不是別的格。」", a: "fairy" }
        ],
        fail_RANK_no_abs: [
            { n: "賽爾", t: "「RANK 的第二個參數——排名範圍——要用絕對引用鎖住。寫成 [[$G$2:$G$21|gold]]。不鎖的話往下拖拉，範圍會移位，名次全部跑亂。」", a: "fairy" }
        ],
        fail_RANK_wrong_order: [
            { n: "賽爾", t: "「第三個參數填錯了。[[0|gold]] 是降序（分高排前），[[1|gold]] 是升序（分低排前）。考核當然是分高的排前面。」", a: "fairy" }
        ],
        fail_SUM_WRONG_RANGE: [
            { n: "賽爾", t: "「欽點考生是3號、8號、17號，對應到帳冊的第4行、第9行、第18行——標題佔了第1行，所以要加1。」", a: "fairy" },
            { n: "賽爾", t: "「要算的是武試（D欄）加策論（F欄），跳過文試（E欄）。格式：[[=SUM(D4,F4,D9,F9,D18,F18)|gold]]。」", a: "fairy" }
        ],
        fail_SUM_WRONG_COL: [
            { n: "賽爾", t: "「多算了文試欄（E欄）。欽點合計只看武試和策論，把E欄的格子從SUM裡拿掉。」", a: "fairy" }
        ] },

    simulator: {
        bgm: "BGM/game_bgm.mp3",
        tasks: [
            {
                id:           "FORMULA_BASIC_INPUT_TASK",
                tutorHint: "【任務：計算總分】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：在 G2 輸入：<br>[[=SUM(D2,E2,F2)|gold]]<br>用加總函數把三欄分數算出來。</span>",
                playerText:   "【 G欄：總計 】<br>📌 規則：加總武試(D)、謀略(E)、品格(F)的分數。<br>💡 技巧：[[SUM(數值1, 數值2...)|#ff9800]]。",
                targetCell:   { r: 1, c: 6 },
                ghostText:    "=SUM(D2,E2,F2)",
                unlockSkillId:"FORMULA_BASIC",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "FORMULA_ERROR_ENTERED", col: 6 },
                storySegmentBefore: "discovery_FORMULA_BASIC",
                storySegmentAfter:  null
            },
            {
                id:           "FORMULA_TEXT_FIX_TASK",
                tutorHint: "【任務：修正文字格式】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：試著把公式改成：<br>[[=SUM(D2*1,E2,F2)|gold]]<br>用 *1 強制將文字轉成數字。</span>",
                playerText:   "【 修正文字格式 】<br>📌 發現：D2被人動過手腳變成了文字，SUM 函數會忽略文字格式！<br>💡 技巧：用 [[*1|#ff9800]]讓它變回數字，才能被計算。",
                targetCell:   { r: 1, c: 6 },
                ghostText:    "=SUM(D2*1,E2,F2)",
                unlockSkillId:"FORMULA_BASIC",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "FORMULA_FIX_ENTERED", col: 6 },
                storySegmentBefore: "discovery_FORMULA_FIX",
                storySegmentAfter:  "success_FORMULA_FIX"
            },
            {
                id:           "FORMULA_AUTOFILL_TASK",
                tutorHint: "【任務：套用公式】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：向下拖拉 G2 的控制點到 G21，把二十位考生的基礎總分算出來。</span>",
                playerText:   "【 自動填滿 】<br>📌 操作：滑鼠移到G2右下角變黑十字時，長按往下拉。<br>💡 技巧：這是試算表最基礎也最強大的功能！",
                targetCell:   { r: 1, c: 6 },
                unlockSkillId:"FORMULA_BASIC",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "FORMULA_SUM_APPLY", col: 6 },
                storySegmentBefore: "discovery_FORMULA_AUTOFILL",
                storySegmentAfter:  "success_FORMULA_AUTOFILL",
                midStoryAfter:      "bonus_TEXT_NUM"
            },
            {
                id:           "ABS_REF_FAIL_TASK",
                tutorHint: "【任務：加入策論係數】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：把 G2 的公式改為：<br>[[=SUM(D2*1,E2,F2)*K1|gold]]<br>再拖拉到 G21 看看會發生什麼事。</span>",
                playerText:   "【 相對參照的陷阱 】<br>📌 觀察：K1 的 1.5 代表策論係數。<br>⚠️ 警告：在拖拉公式時，相對參照的 K1 會變成 K2、K3，導致後面的資料全錯！",
                targetCell:   { r: 1, c: 6 },
                ghostText:    "=SUM(D2*1,E2,F2)*K1",
                unlockSkillId:"REF_ABSOLUTE",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "ABS_REF_FAIL_APPLY", col: 6 },
                storySegmentBefore: "discovery_ABS_REF",
                storySegmentAfter:  "discovery_ABS_FIX"
            },
            {
                id:           "ABS_REF_FIX_TASK",
                tutorHint: "【任務：鎖定係數 (絕對參照)】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：按 F4 鍵把公式裡的 K1 變成 [[$K$1|gold]] 鎖死，然後再次往下拖拉覆蓋錯誤的數據。</span>",
                playerText:   "【 絕對參照 】<br>📌 規則：在欄列前面加上 $ 符號（如 [[$K$1|#4caf50]]）。<br>💡 技巧：拖拉公式時，它就會永遠鎖定在那一格，不會跑掉！",
                targetCell:   { r: 1, c: 6 },
                ghostText:    "=SUM(D2*1,E2,F2)*$K$1",
                unlockSkillId:"REF_ABSOLUTE",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "ABS_REF_APPLY", col: 6 },
                storySegmentBefore: null,
                storySegmentAfter:  "success_ABS_REF",
                midStoryAfter:      "mid_story"
            },
            {
                id:           "RANK_TASK",
                tutorHint: "【任務：計算排名】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：在 H2 輸入：<br>[[=RANK(G2,$G$2:$G$21,0)|gold]]<br>向下拖拉到 H21，算出每位考生的名次。</span>",
                playerText:   "【 H欄：排名 】<br>📌 規則：計算這格分數在所有分數中的排名。<br>💡 技巧：[[RANK(值, $範圍$, 0)|#ff9800]]。記得範圍一定要加上 $ 鎖死！",
                targetCell:   { r: 1, c: 7 },
                ghostText:    "=RANK(G2,$G$2:$G$21,0)",
                unlockSkillId:"FUNC_RANK",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "RANK_APPLY", col: 7 },
                storySegmentBefore: "discovery_RANK",
                storySegmentAfter:  "success_RANK"
            }
        ]
    }
};