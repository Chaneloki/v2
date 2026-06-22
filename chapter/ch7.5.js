/**
 * 試算表魔法冒險 v2 - 第 7.5 章【文牘庫】
 * 挑戰模式：無引導，使用彈窗試煉
 *
 * 欄位佈局：
 * A=編號 B=地區 C=物資類別 D=調度量 E=比往年增幅(%) F=備注 G=加權合計(空) H=排名(空) I=調度係數(標題) J=1.2(值)
 * 係數格 = J1，絕對引用寫 $J$1 (修正欄位數量以匹配實際需求)
 */

const generateCh7_5Data = () => {
    const districts = ["北境郡", "東郡", "南域", "西川", "中原"];
    const categories = ["糧食", "布匹", "藥材", "農具", "銀錢"];

    const fixedById = {
        1:  ["北境郡", "糧食",  "480 ", 12, "正常"],
        2:  ["東郡",   "銀錢",  "920 ", 28, "異常"],
        4:  ["南域",   "布匹",  "310 ",  9, "正常"],
        7:  ["西川",   "農具",  "870 ", 31, "異常"],
        10: ["中原",   "糧食",  "540 ", 15, "正常"],
        14: ["東郡",   "銀錢", "1050 ", 38, "異常"],
        18: ["北境郡", "糧食",  "290 ",  7, "正常"] };

    const rows = [
        ["編號", "地區", "物資類別", "調度量", "額外增調", "備注", "加權合計", "排名", "調度係數", 1.2]
    ];

    const randPool = [];
    for (let i = 0; i < 20; i++) {
        randPool.push({
            district: districts[Math.floor(Math.random() * districts.length)],
            cat:      categories[Math.floor(Math.random() * categories.length)],
            qty:      150 + Math.floor(Math.random() * 400),
            pct:      3 + Math.floor(Math.random() * 12),
            note:     "正常"
        });
    }

    let randIdx = 0;
    for (let id = 1; id <= 20; id++) {
        if (fixedById[id]) {
            const [dist, cat, qty, pct, note] = fixedById[id];
            rows.push([id, dist, cat, qty, pct, note, "", "", "", ""]);
        } else {
            const r = randPool[randIdx++];
            rows.push([id, r.district, r.cat, r.qty, r.pct, r.note, "", "", "", ""]);
        }
    }

    rows.push(["", "▶ 異常地區合計（2、7、14號）調度量＋額外增調：", "", "", "", "", "", "", "", ""]);

    return rows;
};

window.V2_CHAPTERS = window.V2_CHAPTERS || {};

window.V2_CHAPTERS["75"] = {
    meta: {
        title: "第 7.5 章：文牘庫",
        sheetName: "📜 地方物資調度記錄",
        reward: 3800
    },

    initialGridData: generateCh7_5Data(),

    skillDefs: {
        FORMULA_BASIC: { n: "公式引導符 =", s: "在儲存格中輸入等號 = 作為公式開頭", pain: "在儲存格輸入計算公式（如 10+20）卻只顯示文字，表格無法啟動自動計算。", d: "等號是公式的啟動咒語。它告訴試算表「接下來是計算指令，而不是普通文字」。", cat: "calc", parents: [] },
        OPERATOR_ARITH: { n: "算術運算符", s: "+ − × ÷   & ^ %",                    d: "+ 加  − 減  * 乘  / 除；& 連接文字；^ 次方；% 百分號",                            cat: "formula", icon: "icon/公式.png" },
        TEXT_TO_NUM: { n: "文本轉數值", s: "在看起來像數字的文字格後方乘以 1 或加上 0 （如 =A1*1）", pain: "從舊系統匯出的數據看起來是數字，但左上角有綠色三角標記，導致 SUM 公式將它們全部忽略算為 0。", d: "通過無損的算術運算，將被儲存為文字格式的數字強制轉化為可供公式計算的真正數值。", cat: "calc", parents: ["FORMULA_BASIC"] },
        COMPARE_OP: { n: "比較運算符", s: "在公式中使用比較符號（=, >, <, >=, <=, <>）", pain: "需要判斷兩個儲存格的數值是否一致，肉眼核對容易漏看。", d: "比對兩個值，結果僅會回傳 TRUE (成立) 或 FALSE (不成立)。", cat: "calc", parents: ["FORMULA_BASIC"] },
        REF_RELATIVE: { n: "相對引用", s: "在公式中直接點選其他儲存格（例如 A1）", pain: "當需要計算每位旅客的剩餘糧食時，不想為上千個人重複撰寫一千條計算公式。", d: "公式的變動參照。向下拖曳填充公式時，參照格會自動跟著向下偏移一行。", cat: "calc", parents: ["FORMULA_BASIC"] },
        REF_ABSOLUTE: { n: "絕對引用", s: "在公式輸入過程中按下 F4 鍵，為參照格加上 $ 鎖定符（如 $AskillDefs: {）", pain: "計算所有新生的學分比例時，公式往下拖曳會導致分母的「總學分格」跑位變為空白，產生錯誤。", d: "鎖定公式參照格。無論公式如何拖曳填充，加上 $ 的儲存格位置都將雷打不動。", cat: "calc", parents: ["REF_RELATIVE"] },
        FUNC_RANK: { n: "RANK 函數", s: "在儲存格中輸入 =RANK(數值, 範圍, 排序順序)", pain: "需要排出上千位新生的綜合成績名次，手動比對數值會耗費大量心力。", d: "在指定的數值範圍中，自動算出某個數值在全體當中的名次順位。", cat: "calc", parents: ["REF_ABSOLUTE","FUNC_SUM_MULTI"] },
        FUNC_SUM_MULTI: { n: "自動加總 & 跳躍求和", s: "在公式中使用逗號隔開多個儲存格或範圍（如 =SUM(A1, C1, E1:E5)）", pain: "計算總金額時，需要跳過中間的非數值欄位，傳統 SUM 只能累加連續區域。", d: "讓 SUM 函數能夠跳躍式累加不連續的多個單格或多個區域。", cat: "calc", parents: ["SUM"] }
    },

    story: {

        // ── 開場：早飯後，庭院集合 ──────────────────────────────────────
        start: [
            { n: "系統", t: "（早飯後的庭院，晨光正斜斜地切過地面，將一整排梅樹的影子拉得又長又細。）", a: "system",
              bg: "bg7 garden.png", bgm: "daily.mp3", bgPos: "center", bgZoom: 1.1,
              env: "light/1", envFrames: 25, envspeed: 80, envOpacity: 0.3, envDrift: true },
            { n: "我", t: "（手裡的茶碗還透著熱氣，指尖輕輕摩挲著瓷邊，目光時不時越過花叢看向走廊的轉角。）", a: "me",
              bgPos: "right", bgZoom: 1.5, bgDur: "8s", se: "clothes1.mp3" },
            { n: "米羅", t: "（蹲在庭院角落，像發現了什麼新大陸，眼睛幾乎要貼到地面上）", a: "miro",
              se: "boy_breath.mp3", vol: 0.8, shake: true },
            { n: "米羅", t: "……怪了，這磚縫裡冒出了青苔，昨天我經過時明明還是乾淨的。", a: "miro" },
            { n: "夏特", t: "（身子倚著廊柱，那本薄冊子已經翻了幾十頁，視線卻始終維持在一個平靜的水平面上）", a: "chate" },
            { n: "夏特", t: "你蹲在那兒研究一塊地磚的生長史", a: "chate" },
            { n: "夏特", t: "若是讓路過的禁衛看見，只會覺得我們這群外來人不太正常。", a: "chate" },
            { n: "米羅", t: "（站起來拍拍褲腳）就是好奇嘛。", a: "miro", shake: true, se: "clothes1.mp3" },
            { n: "葛蕾", t: "（翻著備忘冊）宴會是後天。今天沒有別的事。", a: "glea",
              se: "paper down.mp3", vol: 0.8 },
            { n: "葛蕾", t: "晏既然說了要帶我們去個地方，那耐心等著就是了。", a: "glea" },
            { n: "我", t: "（賽爾縮在書脊旁邊，呼吸沉穩，大概還在睡。）", a: "me",
              se: "fairy_sleep.mp3", vol: 0.6 },

            // 柔依先到
            { n: "系統", t: "（廊道的盡頭響起腳步聲。那聲音並不急促，一輕一沉，節奏分明地在地磚上交疊。）", a: "system",
              se: "walk.mp3", vol: 0.6, bgPos: "left", bgZoom: 1.5, bgDur: "5s" },
            { n: "系統", t: "（柔依的身影率先出現在光影裡。）", a: "system",
              bg: "cg/ch7.5 royi arrive.png", bgPos: "center", bgZoom: 1.1, bgDur: "5s",
              flash: true, flashSFX: "trans.mp3", vol: 0.8 },
            { n: "我", t: "（她神情如常，走到庭院邊緣，隨即安靜地停下）", a: "me" },
            { n: "我", t: "（側身退到廊柱後，目光卻頻頻投向來時的走廊。）", a: "me" },
            { n: "我", t: "（她今天換了一身更利於行動的便裝，腰間別著一枚小銅鎖，）", a: "me" },
            { n: "我", t: "（金屬的冷光在晨曦下晃了一下。）", a: "me", flash: true, flashSFX: "bell.mp3" },

            // 晏出場
            { n: "系統", t: "（走廊盡頭，那道纖細的身影終於顯現。）", a: "system",
              bg: "bg7 garden.png", bgm: "prince.mp3", bgPos: "left", bgZoom: 1.8,
              flash: true, flashSFX: "bell.mp3", vol: 0.8 },
            { n: "我", t: "（與昨天那身華麗的禮裙不同，她今日換了一襲簡約的素色長衫，袖口紮得利落。）", a: "me", bgPos: "center", bgZoom: 1.2, bgDur: "5s" },
            { n: "我", t: "（手裡拎著一個舊燈籠，燈殼上蒙著一層薄灰。）", a: "me" },
            { n: "王子", t: "（腳步輕盈，走近時臉上帶著一貫的笑意）等久了？", a: "prince", se: "walk.mp3" },
            { n: "米羅", t: "沒多久。那燈籠是怎麼了，殼都灰了。", a: "miro", shake: true },
            { n: "王子", t: "（隨手將那燈籠在手裡拋了拋）那個地方……沒有別的燈。這傢伙雖然舊，但還算靠得住。", a: "prince",
              se: "girl_smile1.mp3", vol: 0.8 },
            { n: "葛蕾", t: "沒有燈的地方？", a: "glea" },
            { n: "王子", t: "（淡淡一笑）有燈，不過是些舊油燈。宮人畏懼那裡的晦氣，平常是不往那邊跑的。", a: "prince" },
            { n: "我", t: "（她說得雲淡風輕，但「宮人畏懼那裡的晦氣」這幾個字）", a: "me" },
            { n: "我", t: "（聽在耳裡卻莫名讓人背脊一涼。）", a: "me" },
            { n: "我", t: "（我正想追問那到底是哪裡，她已經轉身沒入了一條狹窄的側道。）", a: "me", se: "walk.mp3" },

            // 走廊——往文牘庫
            { n: "系統", t: "（我們跟隨晏步入側道。這裡比主廊路窄得多，只容兩人並肩。）", a: "system",
              bg: "bg7 corridor.png", bgm: "suspense.mp3", bgPos: "right", bgZoom: 1.5,
              flash: true, flashSFX: "trans.mp3", vol: 0.8,
              env: "white smoke/1", envFrames: 25, envspeed: 60, envOpacity: 0.15, envDrift: true },
            { n: "系統", t: "（兩側牆面透出一股經年累月累積下來的潮濕與冰冷。）", a: "system" },
            { n: "系統", t: "（燈架越來越稀，每隔很長一段才有一盞，火苗細得幾乎看不出在燃。）", a: "system",
              bgPos: "left", bgZoom: 1.5, bgDur: "8s" },

            // 文牘庫門口
            { n: "系統", t: "（廊道的盡頭佇立著一扇矮門。）", a: "system",
              bg: "bg7.5 archive door.png", bgPos: "center", bgZoom: 1.2,
              flash: true, flashSFX: "trans.mp3", vol: 0.6 },
            { n: "系統", t: "（木板上的裂痕如蛛網般蔓延，斑駁的鐵環上鏽跡叢生，早已與枯朽的門框融為一體。）", a: "system" },
            { n: "王子", t: "（把燈籠遞給柔依，走去推門）這裡沉得很，我先來。", a: "prince",
              se: "put down.mp3", vol: 0.8 },
            { n: "系統", t: "（隨即，門軸低沉而沙啞的摩擦聲響起。）", a: "system",
              bg: "bg7.5 archive door open.png", bgPos: "center", bgZoom: 1.1,
              se: "door open.mp3", vol: 1.0, shake: true },
            { n: "我", t: "（紙張風化後的粉塵、凝固已久的墨漬，還有某種時光腐爛的味道，從門縫裡頂出來。）", a: "me",
              se: "wind1.mp3", vol: 0.5, env: "white smoke/1", envOpacity: 0.4 },
            { n: "米羅", t: "（不自覺地抬手捂住鼻子，嗆得直皺眉）……哇，這門到底是有多久沒開過了？", a: "miro", shake: true },
            { n: "夏特", t: "（他沒有遮掩，只是靜靜地站在門口，微微壓下眉頭）全是帳冊。", a: "chate", bgPos: "center", bgZoom: 1.5, bgDur: "5s" },

            // 柔依進門找燈
            { n: "柔依", t: "（踏入了門檻。室內滯悶的灰塵隨著她的動作微微揚起。）", a: "royi",
              bg: "bg7.5 dark.png", bgPos: "right", bgZoom: 2.0,
              flash: true, flashSFX: "trans.mp3", vol: 0.8, bgm: "suspense.mp3" },
            { n: "我", t: "（她沒有絲毫遲疑，更沒有向四處張望，徑直穿過黑暗，朝著右側的角落走去。）", a: "me", se: "walk.mp3" },
            { n: "我", t: "（我緊隨其後跨入門內，視線被濃重的黑暗擋住，只能憑本能摸索門邊牆上的凸起。）", a: "me" },
            { n: "柔依", t: "（右側角落靜靜佇立著一座矮木架。探手取下一盞舊油燈。）", a: "royi" },
            { n: "柔依", t: "（用指尖輕扣燈罩邊緣，隨著一聲清脆的聲響，火苗幽幽燃起。）", a: "royi"
              ,bg: "bg7.5 archive.png",bgPos: "right", bgZoom: 2.5, bgDur: "5s", se: "put down.mp3", vol: 0.7, flash: true, flashSFX: "bell.mp3" },
            { n: "我", t: "（昏黃的火光由她手中擴散開來，把最近的一排帳冊脊背照亮了。）", a: "me",
              bgPos: "center", bgZoom: 1.1, bgDur: "10s", env: "light/1", envOpacity: 0.2 },
            { n: "我", t: "（我後來看見門邊架子上掛著一個小木牌，刻著油燈的樣子。）", a: "me" },

            // 房間
            { n: "系統", t: "（帳冊架子從地板一路攀升至頂，幾乎沒入黑暗的天花板。）", a: "system",
              bgPos: "left", bgZoom: 1.5, bgDur: "8s" },
            { n: "系統", t: "（每隔幾尺便貼著泛黃的手寫標籤，隨著視線向深處延伸）", a: "system" },
            { n: "系統", t: "（那些筆跡愈發潦草，紙張也越顯枯萎焦黃。）", a: "system" , se: "paper down.mp3", vol: 0.8 },
            { n: "葛蕾", t: "（腳步輕緩地走到架子中心，將手背到身後，仰頭凝視著那些標籤）", a: "glea" , se: "walk.mp3", vol: 1.0 },
            { n: "葛蕾", t: "……各地的物資調度記錄？", a: "glea" },
            { n: "王子", t: "（轉身走向另一側，燈火隨著腳步跳動）對，地方物資、官員往來、年度統計，一應俱全。", a: "prince", se: "walk.mp3", vol: 1.0 },
            { n: "王子", t: "這地方沒人管，就這樣被歲月埋著。", a: "prince" },
            { n: "我", t: "（晏的手指順著帳冊脊背緩緩劃過。）", a: "me" },
            { n: "我", t: "（當劃過某一冊時，她的指尖微不可察地頓了頓，隨即若無其事地收回。）", a: "me" },
            { n: "王子", t: "（笑了笑，眼神示意了一下整排架子）這裡頭故事多著呢。", a: "prince" },
            { n: "王子", t: "你們隨便翻，說不定能看到些好玩的。", a: "prince" },
            { n: "米羅", t: "（隨手抽出一本，只翻了兩頁，臉色就變了）晏……", a: "miro" },
            { n: "米羅", t: "這些數字，是調度量？這規模大得嚇人。", a: "miro"  },
            { n: "我", t: "（我走到剛才她指尖停留的位置，抽出那本帳冊，翻開。）", a: "me",
              se: "paper down.mp3", vol: 0.7 },

            // 秘密檔案
            { n: "我", t: "（翻開冊子，內頁泛黃，墨跡雖舊卻極其鋒利——是「官員任免記錄」。）", a: "me",
              bg: "bg7.5 archive.png", bgPos: "center", bgZoom: 1.2, bgDur: "8s",
              flash: true, flashSFX: "trans.mp3", vol: 0.6 },
            { n: "我", t: "（我往後翻閱。那一年，地方官員的任免名單密密麻麻，從春到秋，竟換了四十七個人。）", a: "me", bgPos: "right", bgZoom: 1.5, bgDur: "5s" },
            { n: "我", t: "（每一道任命的下方，都紅豔豔地蓋著國王的玉璽。）", a: "me"},
            { n: "夏特", t: "（目光掃過名單）這頻率完全不正常。", a: "chate", se: "clothes1.mp3", vol: 0.7 },
            { n: "夏特", t: "即便王國在大規模改制，也不可能以這種近乎「清算」的速度替換官員。", a: "chate" },
            { n: "我", t: "（心跳快了幾拍。帳冊夾層裡滑落出一疊輕薄的文件，我伸手拾起。）", a: "me",
              bg: "bg7.5 archive.png", stuffOpacity: 0.9, bgPos: "center", bgZoom: 1.2, bgDur: "8s",
              flash: true, flashSFX: "trans.mp3", vol: 0.5 },
            { n: "我", t: "（同年，各地上報的稅收重組方案。五個不同地區，五份不同人的字跡。）", a: "me",
              stuff: "paper.png", stuffScale: 2.0, bgPos: "left", bgZoom: 1.5, bgDur: "5s" },
            { n: "我", t: "（措辭一樣，邏輯一樣，連分段的位置都一樣。）", a: "me"},
            { n: "葛蕾", t: "（冷眼掠過那些文件）五個地區的方案格式完全相同。", a: "glea"},
            { n: "葛蕾", t: "地方官不可能有這種默契，除非有人事先出了一套範本，讓各地照填。", a: "glea"},
            { n: "米羅", t: "（聲音壓得極低，幾乎是從喉嚨裡擠出來的）那……這些命令全都是國王蓋的章？", a: "miro", shake: true},
            { n: "系統", t: "……", a: "system",  bgPos: "left", bgZoom: 1.5, bgDur: "8s" },
            { n: "系統", t: "…………", a: "system",  bgPos: "left", bgZoom: 1.5, bgDur: "8s" },
            { n: "系統", t: "………………", a: "system",  bgPos: "left", bgZoom: 1.5, bgDur: "8s" },

            // 轉向任務
            { n: "王子", t: "（目光落回手裡的冊子，翻到某一頁，聲音和剛才沒什麼兩樣）欸，找到了。", a: "prince",
              se: "girl_smile1.mp3", vol: 0.8, bgm: "kingdom.mp3" },
            { n: "米羅", t: "（快步走到晏的身側）找到什麼了？", a: "miro", se: "walk.mp3" },
            { n: "王子", t: "這幾年地方調度記錄，從來沒人整理過。", a: "prince" },
            { n: "王子", t: "我想看各地異常調度量的排名，和幾個特定地區的合計。", a: "prince" },
            { n: "王子", t: "（把冊子和一份數據表一起遞過來）魔導書能用嗎？", a: "prince",
              se: "paper down.mp3", vol: 0.8 },
            { n: "我", t: "（我接過冊子，翻了翻。計算欄全是空的。）能用。", a: "me",
              se: "paper down.mp3", vol: 0.7,flash: true, flashSFX: "boom.mp3", vol: 1.0 },
        ],

        // ── 中場：柔依與王子 ──────────────────────────────────────
        mid_story: [
            { n: "系統", t: "（房間另一頭，柔依在整理一疊積灰的卷宗，油燈放在她左手邊。）", a: "system" },
            { n: "我", t: "（晏走過去，把手裡的帳冊放到卷宗堆旁邊，沒說話。）", a: "me",
              se: "put down.mp3", vol: 0.6 },
            { n: "我", t: "（我沒有刻意往那邊看，但眼角就是掃到了。）", a: "me" },
            { n: "我", t: "（柔依的手指在卷宗角落扣了兩下，不出聲，就那個動作。）", a: "me" },
            { n: "我", t: "（晏把那疊帳冊往旁邊挪了一點，讓出她手邊的空間。）", a: "me" },
            { n: "我", t: "（我不知道那算不算一個請求和一個回應。）", a: "me" },
            { n: "柔依", t: "（眼睛看著手裡的卷宗）這批卷宗比我記得的多一些。", a: "royi" },
            { n: "王子", t: "（翻著冊子，也沒看她）前年加進來的，我讓人搬的。", a: "prince" },
            { n: "柔依", t: "知道了。", a: "royi",
              se: "paper down.mp3", vol: 0.5 },
            { n: "系統", t: "（兩個人各做各的。）", a: "system" },
            { n: "我", t: "（她們翻文書的手在同一疊卷宗的邊角碰了一下。）", a: "me"  },
            { n: "我", t: "（兩個人各自往旁邊讓了半寸，動作都沒斷，繼續翻。）", a: "me"  },
            { n: "我", t: "（我把視線移回表格。心裡有個東西卡了一下，說不清是什麼，過了就過了。）", a: "me" },
        ],

        // ── 任務1成功 ─────────────────────────────────────────────────
        success_FORMULA_ARITH: [
            { n: "系統", t: "（G欄的數字一格格填上來。幾個備注「異常」的地區，數字從數列裡明顯凸出來。）", a: "system",
              se: "coin2.mp3", vol: 0.8 },
            { n: "米羅", t: "（指著G欄）2號和14號差太多了，光用眼睛看就看出來了。", a: "miro", shake: true },
            { n: "夏特", t: "（掃了一眼）不加係數的話只是比均值高一點，不夠顯眼。", a: "chate" },
            { n: "王子", t: "（走過來，低頭看了一眼G欄）係數是用來放大差距的。有些東西，不放大就看不見。", a: "prince",
              se: "girl_attraction.mp3", vol: 0.7 },
            { n: "我", t: "（她說「不放大就看不見」。我盯著G欄，腦子裡轉了一下，沒轉出什麼。）", a: "me" },
        ],

        // ── 任務2成功 ─────────────────────────────────────────────────
        success_ABS_REF: [
            { n: "系統", t: "（拖拉後，係數格固定住了，每一行的加權合計都正確。）", a: "system",
              se: "coin2.mp3", vol: 0.8 },
            { n: "米羅", t: "（在小本上記了一筆，又點了點頭）鎖死，記住了。", a: "miro",
              se: "pen.mp3", vol: 0.7 },
            { n: "葛蕾", t: "（走過來看了一眼）基準格鎖住，下面的算式全跟著，以後要改係數也只改一個地方。" },
        ],

        // ── 任務3成功：RANK ──────────────────────────────────────────
        success_RANK: [
            { n: "系統", t: "（H欄的名次數字出來了。2號東郡、7號西川、14號東郡，穩穩佔在前頭。）", a: "system",
              se: "coin2.mp3", vol: 0.8, flash: true, flashSFX: "bell.mp3" },
            { n: "米羅", t: "（指著螢幕）東郡上了兩次。而且兩次都是銀錢調度，不是糧食，不是布，是錢。", a: "miro",
              se: "boy_attraction.mp3", vol: 0.7 },
            { n: "夏特", t: "（看著H欄）排名告訴我們誰在頂端。誰讓它在頂端，是另一個問題。", a: "chate" },
            { n: "王子", t: "（聲音從書架另一邊傳過來）兩個問題都值得問。", a: "prince" },
            { n: "我", t: "（我沒辦法確定她在接夏特的話，還是在說別的。）", a: "me" },
        ],

        // ── 結局 ─────────────────────────────────────────────────────
        end: [
            { n: "系統", t: "（帳冊歸回木架。柔依把油燈吹滅，燈罩放回矮木架的原位，動作跟取燈時一樣俐落。）", a: "system",
              bg: "bg7.5 archive.png", bgPos: "center", bgZoom: 1.1,
              se: "wind1.mp3", vol: 0.5, bgm: "sweet.mp3", flash: true, flashSFX: "trans.mp3" },
            { n: "米羅", t: "（忍不住回頭望了那扇破舊的矮門一眼）真的不需要叫人來打掃一下嗎？", a: "miro",bg: "bg7.5 dark.png" },
            { n: "王子", t: "（單手將那扇腐朽的木門重新合上）不必。", a: "prince", se: "door open.mp3",bg: "bg7.5 archive door.png" },
            { n: "米羅", t: "（不解地追問）為什麼？", a: "miro", shake: true },
            { n: "王子", t: "（拎起那盞積灰的舊燈籠，轉身朝來時的方向走去）灰塵厚，說明沒人來翻過。", a: "prince"},
            { n: "系統", t: "……", a: "system",  bgPos: "left", bgZoom: 1.5, bgDur: "8s" },
            { n: "系統", t: "…………", a: "system",  bgPos: "left", bgZoom: 1.5, bgDur: "8s" },
            { n: "系統", t: "………………", a: "system",  bgPos: "left", bgZoom: 1.5, bgDur: "8s" },

            // 庭院
            { n: "系統", t: "（午前的陽光溢滿了整座庭院，光影比早晨更加熾烈。）", a: "system",
              bg: "bg7 garden.png", bgm: "2_emotional.mp3", bgPos: "center", bgZoom: 1.1,
              flash: true, flashSFX: "bell.mp3", vol: 0.8,
              env: "light/1", envFrames: 25, envspeed: 80, envOpacity: 0.3, envDrift: true },
            { n: "王子", t: "（隨手將那盞積灰的舊燈籠擱在廊下的欄杆上，撣了撣袖口。）", a: "prince",
              se: "clothes1.mp3", vol: 0.7 },
            { n: "王子", t: "（撣去了剛才在檔案室裡沾染的那些腐朽塵埃）很快就是宴會了。", a: "prince" },
            { n: "米羅", t: "（精神一振）對！宴會有什麼需要我們——", a: "miro", shake: true },
            { n: "王子", t: "（輕笑一聲，直接打斷，語氣帶著一種不容置疑的從容）今天先吃飯。", a: "prince",
              se: "girl_smile1.mp3", vol: 0.8 },
            { n: "王子", t: "天大的事，也得吃飽了再說。", a: "prince" },
            { n: "葛蕾", t: "（落筆）宴會時間確認過了，申時正。", a: "glea",
              se: "pen.mp3", vol: 0.7 },
            { n: "夏特", t: "我記得。", a: "chate" },
            { n: "賽爾", t: "（終於整個人從書頁裡鑽出來）宴會？我沒睡過宴會吧？", a: "fairy",
              se: "fairy_sleep.mp3", vol: 0.7, shake: true },
            { n: "米羅", t: "（忍著笑）你沒睡過，你睡的是整條廊道。", a: "miro", se: "boy_smile.mp3" },
            { n: "賽爾", t: "（振翅，高傲地）廊道的空氣出奇地好。", a: "fairy",
              se: "fairy_laugh.mp3", vol: 0.8 },
            { n: "我", t: "（晏看著這群吵吵鬧鬧的夥伴，嘴角勾起了一抹極淺的弧度。轉身朝庭院深處走去。）" },
            { n: "我", t: "（裙擺掠過地面，步子彷如初見。）" },
        ],

        // ── 失敗提示 ─────────────────────────────────────────────────
        fail_FORMULA_no_equal: [
            { n: "系統", t: "（沒有等號。試算表只把它當成了文字。）", a: "system" }
        ],
        fail_FORMULA_wrong_col: [
            { n: "系統", t: "（欄位不對。調度量在D欄，增幅在E欄。）", a: "system" }
        ],
        fail_FORMULA_text_unhandled: [
            { n: "系統", t: "（有幾格是文本格式。把公式裡的D改成D*1強制轉成數值試試。）", a: "system" }
        ],
        fail_ABS_NO_DOLLAR: [
            { n: "系統", t: "（往下拖拉時，J1跑掉了。係數格必須鎖住，試著加入 $ 符號。）", a: "system" }
        ],
        fail_ABS_WRONG_CELL: [
            { n: "系統", t: "（鎖錯了。係數在 J1，絕對引用要寫 $J$1。）", a: "system" }
        ],
        fail_RANK_no_abs: [
            { n: "系統", t: "（RANK的第二個參數必須用絕對引用鎖住。寫成 $G$2:$G$21。）", a: "system" }
        ],
        fail_RANK_wrong_order: [
            { n: "系統", t: "（第三個參數填錯了。0才是降序——數字大的排前面。）", a: "system" }
        ],
        fail_SUM_WRONG_RANGE: [
            { n: "系統", t: "（異常地區是2、7、14號。對應到帳冊的第3、8、15行。）", a: "system" }
        ],
        fail_SUM_WRONG_COL: [
            { n: "系統", t: "（只需要調度量和增幅。D欄與E欄。把不需要的格子拿掉。）", a: "system" }
        ] },

    simulator: {
        bgm: "BGM/game.mp3",
        tasks: [
            {
                id:           "FORMULA_ARITH_TASK",
                tutorHint:    "【任務：計算基礎合計】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：試著計算調度量加額外增調的基礎合計</span>",
                playerText:   "【 文牘庫試煉 】<br>📌 提示：這是一場無引導的試煉，必須靠自己回憶之前學過的禁術來完成。<br>💡 技巧：點擊欄位後將會觸發考核！",
                targetCell:   { r: 1, c: 6 },
                // [2026-06-10 移除無用按鈕] unlockBtnId:  "formula_group",
                unlockSkillId:"FORMULA_BASIC",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "FORMULA_FIX_ENTERED", col: 6 },
                storySegmentBefore: null,
                storySegmentAfter:  null,
                quiz: {
                    // [2026-06-10 修改] 原版備份："（挑戰模式）「要算出基礎合計，該在 G2 輸入什麼公式？」"
                    situation: "（文牘庫試煉）「要算出基礎合計，但注意『調度量』目前是文字格式。該輸入什麼公式，才能強制將文字轉成數值並加總？」",
                    options: [
                        { t: "=SUM(D2,E2)", correct: false },
                        { t: "=D2+E2", correct: false },
                        { t: "=SUM(D2*1,E2)", correct: true }
                    ],
                    success_msg: "正確。調度量是文字格式，必須乘 1 喚醒為數值才能加總。"
                }
            },
            {
                id:           "FORMULA_AUTOFILL_TASK",
                tutorHint:    "【任務：套用公式】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：將剛才完成的公式向下拖拉，套用至整列</span>",
                playerText:   "【 自動填滿試煉 】<br>📌 提示：這是一場無引導的試煉。<br>💡 技巧：拖拉右下角的控制點即可套用。",
                targetCell:   { r: 1, c: 6 },
                // [2026-06-10 移除無用按鈕] unlockBtnId:  "formula_group",
                unlockSkillId:"FORMULA_BASIC",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "FORMULA_SUM_APPLY", col: 6 },
                storySegmentBefore: null,
                storySegmentAfter:  "success_FORMULA_ARITH" },
            {
                id:           "ABS_REF_TASK",
                tutorHint:    "【任務：乘上調度係數】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：請修改公式，乘上調度係數（J1）並完成整列計算</span>",
                playerText:   "【 絕對參照試煉 】<br>📌 提示：這是一場無引導的試煉。<br>💡 技巧：必須將 J1 用某種符號釘死，才不會在拖拉時跑位！",
                targetCell:   { r: 1, c: 6 },
                // [2026-06-10 移除無用按鈕] unlockBtnId:  "formula_group",
                unlockSkillId:"REF_ABSOLUTE",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "ABS_REF_APPLY", col: 6 },
                storySegmentBefore: null,
                storySegmentAfter:  "success_ABS_REF",
                midStoryAfter:      "mid_story",
                quiz: {
                    // [2026-06-10 修改] 原版備份："（挑戰模式）「為了讓公式往下拖拉時，係數始終指向 J1，我該怎麼寫？」"
                    situation: "（文牘庫試煉）「為了讓公式往下套用時，調度係數（J1）不會跟著跑位，該如何用『釘子』將它鎖死？」",
                    options: [
                        { t: "=SUM(D2,E2)*J1", correct: false },
                        { t: "=SUM(D2,E2)*J$1", correct: false },
                        { t: "=SUM(D2,E2)*$J$1", correct: true }
                    ],
                    success_msg: "沒錯。用 $ 把行與列徹底釘死。"
                }
            },
            {
                id:           "RANK_TASK",
                tutorHint:    "【任務：計算地區排名】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：請計算各區加權合計的排名</span>",
                playerText:   "【 排名試煉 】<br>📌 提示：這是一場無引導的試煉。<br>💡 技巧：回憶一下 RANK 函數的三個參數，並注意範圍鎖定！",
                targetCell:   { r: 1, c: 7 },
                // [2026-06-10 移除無用按鈕] unlockBtnId:  "formula_group",
                unlockSkillId:"FUNC_RANK",
                // [2026-06-10 移除無用按鈕] tab:          "formula",
                expectedCondition: { type: "ACTION", actionId: "RANK_APPLY", col: 7 },
                storySegmentBefore: "mid_story_tasks",
                storySegmentAfter:  "success_RANK",
                quiz: {
                    // [2026-06-10 修改] 原版備份："（挑戰模式）「要對 G2 在 G2:G21 的範圍內做降序排名（數值大排前），公式是？」"
                    situation: "（文牘庫試煉）「要對 G2 進行排名，範圍是整疊卷宗 ($G$2:$G$21)，且數值越大名次越前（降序）。公式該怎麼寫？」",
                    options: [
                        { t: "=RANK(G2, G2:G21, 0)", correct: false },
                        { t: "=RANK(G2, $G$2:$G$21, 1)", correct: false },
                        { t: "=RANK(G2, $G$2:$G$21, 0)", correct: true }
                    ],
                    success_msg: "精準。範圍要鎖死，0 代表降序。"
                }
            }
        ]
    }
};