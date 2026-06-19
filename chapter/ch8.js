/**
 * 試算表魔法冒險 v2 - 第 8 章【宴會】
 * 主章節：賽爾引導模式
 */

const generateCh8Data = () => {
    const names = [
        "方文澄","盧承望","徐靖安","沈博遠","唐仁壽",
        "馮玉章","賀明川","陸景行","吳宗賢","周念之",
        "蔣廷玉","韋長信","謝遠山","孟冬寒","曹思源",
        "錢明禮","辛守義","褚文靖","卞昌遠","阮依鶴"
    ];
    const regions = ["北境", "東郡", "南域", "西川", "中原"];

    const fixedById = {
        3:  ["盧承望", "北境", 72, 68, 74],   
        5:  ["徐靖安", "中原", 90, 90, 66],   
        8:  ["沈博遠", "南域", 91, 88, 92],   
        12: ["馮玉章", "西川", 68, 64, "58"], 
        17: ["陸景行", "東郡", 82, 85, 80],   
        20: ["辛守義", "中原", 52, 48, 55] };

    const usedNames = new Set(Object.values(fixedById).map(r => r[0]));
    const spareNames = names.filter(n => !usedNames.has(n));
    let si = 0;

    const rows = [
        ["編號","姓名","來源地","政績","民望","廉潔","初評","地區加分","總計","等第","推薦","","北境加分",10]
    ];

    for (let id = 1; id <= 20; id++) {
        if (fixedById[id]) {
            const [name, region, z, m, l] = fixedById[id];
            const total = Math.round((z + m + (typeof l === 'number' ? l : parseInt(l, 10) || 0)) / 3);
            rows.push([id, name, region, z, m, l, total, "", total, "", "", "", "", ""]);
        } else {
            const region = regions[Math.floor(Math.random() * regions.length)];
            const z = 55 + Math.floor(Math.random() * 40);
            const m = 50 + Math.floor(Math.random() * 45);
            const l = 45 + Math.floor(Math.random() * 50);
            const total = Math.round((z + m + l) / 3);
            rows.push([id, spareNames[si++], region, z, m, l, total, "", total, "", "", "", "", ""]);
        }
    }

    rows.push(["", "▶ 推薦人數合計（K欄）：", "", "", "", "", "", "", "", "", "", "", "", ""]);

    return rows;
};

window.V2_CHAPTERS = window.V2_CHAPTERS || {};

window.V2_CHAPTERS["80"] = {
    meta: {
        title: "第 8 章：宴會",
        sheetName: "🏛️ 地方官員候選評鑑冊",
        reward: 4200
    },

    initialGridData: generateCh8Data(),

    skillDefs: {
        IF_BASIC: { n: "IF 條件邏輯", s: "在儲存格中輸入 =IF(條件, 真值, 假值)", pain: "物資發放需要根據身份判定：是戰士就給20份、其餘給10份，手動填寫容易手滑填錯。", d: "最基礎的邏輯決策。如果滿足條件，就執行「真值」結果，否則執行「假值」結果。", cat: "calc", parents: ["REF_ABSOLUTE","FUNC_RANK"] },
        IFS: { n: "IFS 多條件", s: "在儲存格中輸入 =IFS(條件1, 值1, 條件2, 值2...)", pain: "需要判定學生成績評級：90分以上是優、80分以上是良...使用巢狀 IF 會產生長串複雜括號，極易寫錯。", d: "IF 函數的升級版，依序檢查多個條件，只要有一個成立就傳回對應的值，避免套疊多層 IF。", cat: "calc", parents: ["IF_BASIC"] },
        IF_PLUS: { n: "條件邏輯運算", s: "在公式中利用邏輯值的乘加（* 代表且, + 代表或）進行計算", pain: "需要滿足兩個條件（如性別為女且學分大於20）才能獲得補貼，寫巢狀 IF 太過繁重。", d: "直接利用 TRUE=1、FALSE=0 的特性進行算術乘加，省去多層巢狀 IF 的複雜結構。", cat: "calc", parents: ["IF_BASIC"] },
        IF_CONCAT: { n: "文字邏輯拼接", s: "利用 & 連接符將多個 IF 公式拼接起來（如 =IF(...) & IF(...)）", pain: "要根據多個標籤拼接段落描述，如果用巢狀 IF 會導致分支數呈幾何級數增加，難以維護。", d: "將多個獨立條件判斷所輸出的文字串聯起來，各自獨立判斷互不干擾。", cat: "calc", parents: ["IF_BASIC"] },
        IF_AND: { n: "AND/OR 邏輯判定", s: "在公式中使用 AND() 或 OR() 函數包裹條件", pain: "需要判斷「同時滿足A和B」或「滿足A或B其中之一」時，無法直接在 IF 條件中寫入雙重判斷。", d: "AND 要求括號內所有條件全成立才為 TRUE；OR 只要有一個成立即為 TRUE，通常與 IF 搭配。", cat: "calc", parents: ["IF_BASIC"] }
    },

    story: {
        start: [
            { n: "系統", t: "（申時正。宮廷長廊內的燈火比往常璀璨了一倍。）", a: "system",
              bg: "bg7 glea.png", bgm: "grand1.mp3", bgmFade: "in", bgPos: "top right", bgZoom: 2.0, bgDur: "0s",
              env: "light/1", envFrames: 25, envspeed: 80, envOpacity: 0.6, envDrift: true },
            { n: "系統", t: "（紅燈籠一盞接一盞掛到廊柱上，在昏黃的光裡暈出重疊的影子。）", a: "system",
              bgPos: "center", bgZoom: 1.1, bgDur: "12s", se: "wind1.mp3", vol: 0.6, screenEffect: "glow" },
            { n: "系統", t: "（禮服換上身的那一刻，我才真切地感受到)", a: "system" },
            { n: "系統", t: "(這幾天我們棲身的並非一般的宅邸，而是這座王國的核心。）", a: "system" },
            { n: "我", t: "（我習慣性地拍了拍衣領，目光轉向走廊另一側。", a: "me",
              se: "clothes1.mp3", vol: 0.7 },
            { n: "我", t: "(米羅正對著牆壁的裝飾鏡反覆整理著袖口。）", a: "me" },
            { n: "米羅", t: "（他用力扯了扯那過於平整的衣領，聲音裡透著一種難以掩飾的緊繃）……這禮服貴死了吧。", a: "miro",
              shake: true, charAnim: "bounce" },
            { n: "夏特", t: "（正低頭專注地調試腰帶的扣環，神情波瀾不驚）別動，維持儀態。", a: "chate",
              se: "clothes1.mp3", charAnim: "sink" },
            { n: "夏特", t: "這就是宮廷宴會的規矩，越是壓抑，越是說明權力所在。", a: "chate" },
            { n: "葛蕾", t: "（快速掃了一遍眾人，最後停在備忘冊上，輕敲了兩下封皮）站姿，背直。客人不整齊，就是失禮。", a: "glea",
              se: "paper down.mp3" },
            { n: "賽爾", t: "（她從書頁縫隙裡探出小腦袋）哼，這衣服太沉，本仙子不需要禮服。", a: "fairy",
              se: "fairy_sleep.mp3", vol: 0.7, shake: true },
            { n: "我", t: "（我壓低聲音，帶著笑意）別裝了，你那是縮在書裡沒人看得到", a: "me",
              se: "girl_smile1.mp3" },
            { n: "我", t: "否則你想穿也沒人給你做這尺寸的禮服。", a: "me" },
            { n: "賽爾", t: "（她猛地振翅，高傲地揚起下巴）不懂就別亂說，這叫戰略低調！", a: "fairy",
              se: "fairy_laugh.mp3", vol: 0.8 },

            { n: "系統", t: "（踏入大殿的瞬間，穹頂宏大得近乎非人。）", a: "system",
              bg: "bg8 hall.png", bgm: "grand2.mp3", bgmFade: "in", bgPos: "bottom", bgZoom: 2.0, bgDur: "0s",
              flash: true, flashSFX: "trans.mp3", vol: 0.8,
              env: "light/1", envFrames: 25, envspeed: 60, envOpacity: 0.5, envDrift: true },
            { n: "系統", t: "（貼金的柱子如森林般聳立，燈火層層推進，將深處染得金碧輝煌。）", a: "system",
              bgPos: "center", bgZoom: 1.0, bgDur: "15s", se: "wind1.mp3", vol: 0.4 },
            { n: "系統", t: "（殿堂盡頭的主座上，一個身影端正得如同雕塑)", a: "king",
              bgPos: "center bottom", bgZoom: 1.5, bgDur: "10s" },
            { n: "系統", t: "(他披掛著繁複貴重的織錦，聲音低沉且平緩)", a: "king" },
            { n: "系統", t: "(正一字一句地誦讀著開場的訓詞。）", a: "king" },
            { n: "我", t: "（國王。當我親眼目睹那位權力巔峰者的真容時，心臟莫名漏跳了一拍。)", a: "me",
              flash: true, flashSFX: "flash.mp3", vol: 0.7, screenEffect: "heartbeat" },
            { n: "我", t: "(儘管距離遙遠，那股君臨天下的壓迫感仍清晰可辨。）", a: "me" },
            { n: "我", t: "（他的每句話都字字得體，節奏平穩。那聽起來不像是一個活人的演說。）", a: "me" },
            { n: "系統", t: "（就在這近乎機械的誦讀聲中，我敏銳地捕捉到了一個細節。）", a: "system",
              bgPos: "right", bgZoom: 1.5, bgDur: "8s" },
            { n: "國王", t: "（視線並不總是在賓客身上，而是每隔一段時間，就會下意識地向側位瞥去。）", a: "king" },
            { n: "我", t: "（順著他的目光望去——晏就站在那裡，立於側位，身姿挺拔如松，臉上掛著一抹微笑。）", a: "me" , a: "prince" , se: "girl_laugh.mp3", vol: 1.0 },
            { n: "國王", t: "（他的聲音迴盪在大殿上方）各位遠道而來，一路辛苦了。", a: "king",shake:true},
            { n: "國王", t: "皇宮備有薄宴，若有招待不周之處，告知下人便是。", a: "king" },

            { n: "系統", t: "（宴席開始，各桌官員的話聲像潮水般浮了起來。）", a: "system",
              bg: "bg8 hall.png", bgm: "daily.mp3", bgPos: "center", bgZoom: 1.1,
              flash: true, flashSFX: "bell.mp3", vol: 0.7 },
            { n: "柔依", t: "（靜靜地站在我們這桌身後的陰影裡，視線冷冽地掃視著場內。）", a: "royi",
              bgPos: "left", bgZoom: 1.5 },
            { n: "王子", t: "（她繞過幾桌貴族，步伐輕盈得像個局外人，最後在我們這桌側方坐下）你們今天倒是規矩得過分。", a: "prince",
              se: "walk.mp3", vol: 0.6, bg: "bg8 hall.png", bgPos: "center", bgZoom: 1.1 },
            { n: "米羅", t: "（他壓低了聲音，有些不自在地整理衣袖）宴會嘛，總得稍微收斂一點。", a: "miro" },
            { n: "王子", t: "（她優雅地撐著臉頰，眼中帶著戲謔的笑意）這倒不必。", a: "prince",
              se: "girl_smile1.mp3" },
            { n: "王子", t: "皇宮這地方，裝出來的從容，比真正緊張的人更顯眼。", a: "prince" , se: "heartbeat.mp3", vol: 1.0 },
            { n: "夏特", t: "（只是沉默地將面前的酒杯挪開，沒有說話。）", a: "chate" },
            { n: "葛蕾", t: "（抬頭看向晏）閒話到此為止。宴席已經開始，有什麼需要我們做的嗎？", a: "glea"},
            { n: "王子", t: "（端起茶碗，輕輕抿了一口）當然。", a: "prince" },
            { n: "王子", t: "等會兒各地官員入席，每人有份評鑑冊。上面的等級評定欄還是空的。", a: "prince" },
            { n: "王子", t: "文員說今年的評分系統比往年複雜，條件多了幾層", a: "prince"},
            { n: "王子", t: "我第一個就想到了你們。", a: "prince"},
            { n: "我", t: "（我低頭翻開那疊冊子。政績、民望、廉潔，還有複雜的北境加分規則。)", a: "me",
              se: "paper down.mp3" },
            { n: "我", t: "(這些數據的交叉計算量，早已遠超常規邏輯。）", a: "me" },
            { n: "王子", t: "（她慢悠悠地從袖口抽出一張草稿紙遞過來）規則都在這裡，照著做就行。你們用不了多久的。", a: "prince",
              se: "paper down.mp3", vol: 0.7 },
            { n: "賽爾", t: "（她從書頁縫隙中靈活地鑽了出來，飛到那張規則表上方快速瀏覽）", a: "fairy",
              se: "fairy_laugh.mp3", vol: 0.7 },
            { n: "賽爾", t: "嘖，為了卡人還真是費盡心思……多了個新函數，我來指揮！", a: "fairy" },
        ],

        discovery_IF_BASIC: [
            { n: "賽爾", t: "先看K欄——推薦欄。規則很簡單：", a: "fairy" },
            { n: "賽爾", t: "總計（I欄）達到80分或以上的，寫「推薦」，否則寫「不推薦」。", a: "fairy" },
            { n: "賽爾", t: "這種「如果怎樣就給A，否則給B」的判斷，用的是[[IF函數|gold]]。", a: "fairy" },
            { n: "賽爾", t: "格式：[[=IF(logical_test, value_if_true, value_if_false)|gold]]。三個參數，缺一不可。", a: "fairy" },
            { n: "賽爾", t: "這裡就是：[[=IF(I2>=80,\"推薦\",\"不推薦\")|gold]]。文字答案要加雙引號，數字不用。", a: "fairy" },
            { n: "賽爾", t: "K2輸好了往下拖拉，二十行一口氣填完。", a: "fairy" },
        ],

        success_IF_BASIC: [
            { n: "系統", t: "（K欄的推薦標記一格格出現了。）", a: "system", se: "coin2.mp3", vol: 0.8 },
            { n: "我", t: "（二十個人，一眼就能看出誰過了線。）", a: "me" },
            { n: "米羅", t: "（好奇地數著）……推薦的有幾個？", a: "miro", shake: true },
            { n: "葛蕾", t: "（掃了一眼）先別數。等第欄還沒填。", a: "glea", se: "paper down.mp3" },
        ],

        discovery_IFS: [
            { n: "賽爾", t: "J欄——等第欄。三個等級：總計90以上是「優」，80到89是「良」，80以下是「待察」。", a: "fairy" },
            { n: "賽爾", t: "要判斷多個條件，如果只用IF會變成複雜的嵌套。我們可以改用更直觀的[[IFS函數|gold]]。", a: "fairy" },
            { n: "賽爾", t: "[[=IFS(I2>=90,\"優\",I2>=80,\"良\",TRUE,\"待察\")|gold]]", a: "fairy" },
            { n: "賽爾", t: "IFS會按順序檢查條件，一旦成立就給值。最後的TRUE代表「以上皆非」時的預設值。", a: "fairy" },
            { n: "賽爾", t: "記住，條件的順序很重要，要從最嚴格的開始往下排。", a: "fairy" },
        ],

        success_IFS: [
            { n: "系統", t: "（J欄出現了三種等第。第8號沈博遠標了「優」；第17號陸景行標了「良」；最後一行辛守義是「待察」。）", a: "system",
              se: "coin2.mp3", vol: 0.8 },
            { n: "夏特", t: "（看了一眼）待察的比我預期的多。", a: "chate", se: "pen.mp3" },
            { n: "賽爾", t: "（滿意地飛舞）IFS 函數是不是比一層層剝洋蔥的嵌套簡單多了？只要順序對了就沒問題。", a: "fairy" },
        ],

        mid_story: [
            { n: "系統", t: "（大殿的人聲在第一盅茶後漸漸活起來。", a: "system"},
            { n: "系統", t: "離得遠的人湊近說話，離得近的人開始有點隨意。）", a: "system" },
            { n: "王子", t: "（靠著椅背，語氣比剛才更鬆動）評鑑冊整理得很快。今年的地方名單，我打算提交皇兄過目。", a: "prince" },
            { n: "王子", t: "說起來——你們沿路走過那麼多地方，金穗鎮、驛站、邊境……", a: "prince"},
            { n: "王子", t: "你們看到的，比坐在這裡的任何人都多。", a: "prince" },
            { n: "葛蕾", t: "（安靜了一下，才開口）金穗鎮那邊，帳目的問題其實不是孤例。", a: "glea" },
            { n: "葛蕾", t: "很多地方都有類似的情況。", a: "glea" },
            { n: "王子", t: "（點了點頭，認真地看著葛蕾）我知道。這也是為什麼需要會處理數據的人", a: "prince" },
            { n: "王子", t: "不只是算帳，是看得出數字背後的問題。", a: "prince" },
            { n: "米羅", t: "（有些意外）你的意思是……我們能幫上這種事？", a: "miro"},
            { n: "王子", t: "（語氣輕但紮實）你們現在做的不就是嗎？", a: "prince"},
            { n: "我", t: "（我沒有立刻說話。大殿的火光、冊子上的名字、沿路見過的那些臉", a: "me" },
            { n: "我", t: "這些東西在腦子裡重疊在一起。）", a: "me" },
            { n: "我", t: "（如果留在這裡，能真的把那些問題做成什麼的話……）", a: "me"},
            { n: "夏特", t: "（低聲，像在說給自己聽）用數字替人說話——跑了這麼久，原來繞回來了。", a: "chate" },
            { n: "王子", t: "（沒有追問，只是把茶碗放下，靜靜看著我們。）", a: "prince" },
            { n: "我", t: "（我看著這群人——賽爾縮在書裡，米羅正認真地想著什麼", a: "me" },
            { n: "我", t: "葛蕾手指輕輕敲著備忘冊，夏特沉默但是在的。）", a: "me" },
            { n: "我", t: "（從倉庫到現在，我從來沒想過「留下」這兩個字。）", a: "me"},
            { n: "我", t: "（但此刻它出現在腦子裡，不像逃不掉，反而像是一個選擇。）", a: "me"},
        ],

        discovery_IF_PLUS: [
            { n: "賽爾", t: "H欄——地區加分欄。規則：來自北境的人，加10分；其他地區加0分。", a: "fairy" },
            { n: "賽爾", t: "你可以用 =IF(C2=[[(\"北境\")|gold]],$N$1,0) 做一個簡單IF", a: "fairy" },
            { n: "賽爾", t: "北境係數存在N1，用絕對引用鎖住。", a: "fairy" },
            { n: "賽爾", t: "但更快的方法是[[回避IF嵌套（+連接）|gold]]——利用 TRUE=1、FALSE=0 的性質：", a: "fairy" },
            { n: "賽爾", t: "[[=(C2=\"北境\")*$N$1|gold]]——條件成立就乘以10，不成立就乘以0，不需要IF。", a: "fairy" },
            { n: "賽爾", t: "如果有多個加分條件，只要把它們加起來：[[=(C2=\"北境\")|gold]]*10 + (D2>=85)*5", a: "fairy" },
            { n: "賽爾", t: "這樣就不需要嵌套了。", a: "fairy" },
        ],

        success_IF_PLUS: [
            { n: "系統", t: "（H欄的加分填上了。北境的人都多了10分，其他是0。）", a: "system",
              se: "coin2.mp3", vol: 0.8 },
            { n: "我", t: "（我把I欄的總計公式設好——G欄加上H欄——然後往下拖。）", a: "me", se: "paper down.mp3" },
            { n: "米羅", t: "（指著第3號）盧承望，加了分以後剛好越過80……他本來是不推薦的。", a: "miro", shake: true },
            { n: "夏特", t: "這就是地區加分的作用——讓偏遠地方的人有機會。", a: "chate" },
        ],

        discovery_IF_CONCAT: [
            { n: "賽爾", t: "（補充一個進階用法）如果要把多個條件拼成一段文字——比如「[推薦]優等」", a: "fairy" },
            { n: "賽爾", t: "用 & 連接多個IF。", a: "fairy" },
            { n: "賽爾", t: "[[=IF(K2=\"推薦\",\"[推薦]\",\"\")&IF(J2=\"優\",\"優等\",IF(J2=\"良\",\"良等\",\"待察\"))|gold]]", a: "fairy" },
            { n: "賽爾", t: "前半用 & 接推薦標記，後半嵌套接等第——兩段文字無縫拼在一起。", a: "fairy" },
            { n: "賽爾", t: "不符合條件的輸出空字串 \"\"，不留空格。", a: "fairy" },
            { n: "賽爾", t: "這不是本次的必做任務，但你可以在備注欄試試看。", a: "fairy" },
        ],

        discovery_IF_AND: [
            { n: "賽爾", t: "最後一個。某些候選人需要「政績和廉潔都達標」才能列入特別推薦名單。", a: "fairy" },
            { n: "賽爾", t: "同時滿足兩個條件，用[[AND函數|gold]]配合IF：", a: "fairy" },
            { n: "賽爾", t: "[[=IF(AND(D2>=80,F2>=80),\"特別推薦\",\"\")|gold]]", a: "fairy" },
            { n: "賽爾", t: "AND裡面所有條件都成立，才輸出「特別推薦」，否則輸出空字串。", a: "fairy" },
            { n: "賽爾", t: "AND的括號裡可以放很多條件，用逗號隔開，每個都要成立才算數。", a: "fairy" },
        ],

        success_IF_AND: [
            { n: "系統", t: "（備注欄出現了幾個「特別推薦」。只有政績和廉潔都達80以上的人才進了這份名單。）", a: "system",
              se: "coin2.mp3", vol: 0.8 },
            { n: "葛蕾", t: "（掃了一眼）比推薦的少很多。這份標準比單看總分嚴多了。", a: "glea",
              se: "paper down.mp3" },
            { n: "夏特", t: "廉潔低但總分高的人，不在這份名單裡。這是對的。", a: "chate" },
            { n: "賽爾", t: "（飛回書頁，語氣平靜）評完了。冊子可以交出去了。", a: "fairy", se: "fairy_sleep.mp3" },
        ],

        end: [
            { n: "系統", t: "（評鑑冊已被侍從取走。大殿內，賓客們陸續離席。）", a: "system",
              bg: "bg8 hall.png", bgm: "sweet.mp3", bgmFade: "out", bgPos: "center", bgZoom: 1.1,
              flash: true, flashSFX: "trans.mp3", vol: 0.7,
              env: "light/1", envFrames: 25, envspeed: 80, envOpacity: 0.3, envDrift: true },
            { n: "我", t: "（我緩緩將魔導書合上。指尖觸及書封的瞬間，一股異樣的溫熱透過掌心傳來)", a: "me",
              bgPos: "right", bgZoom: 1.5, bgDur: "8s" },
            { n: "我", t: "(那是賽爾殘留的體溫。）", a: "me" },
            { n: "我", t: "（腦海中，晏方才在宴席間說的那些話如同層層疊疊的咒語，揮之不去。）", a: "me" },
            { n: "葛蕾", t: "（她走到我身側，目光透過斑駁的燈影看向我)", a: "glea",
              se: "girl_attraction.mp3", vol: 0.7, charAnim: "slideIn" },
            { n: "葛蕾", t: "(聲音低得只有我們兩人能聽見）你在想什麼？", a: "glea" },
            { n: "我", t: "（我轉過頭，迎上她那雙認真而銳利的眼眸。在這一刻，所有防備都顯得多餘。）", a: "me" },
            { n: "我", t: "我在想——留下，或許是對的。", a: "me" },
            { n: "葛蕾", t: "（她微微一怔，似乎沒預料到我會給出這樣坦率的答案。)", a: "glea" },
            { n: "葛蕾", t: "(目光隨即緩緩地點了點頭，像是在認可這個共同的賭注。）", a: "glea" },

            { n: "系統", t: "（變故突生——）", a: "system",
              bg: "bg8 hall.png", bgm: "no.mp3", bgPos: "center", bgZoom: 1.1,
              flash: true, flashSFX: "boom.mp3", vol: 0.8, screenEffect: "glitch" },
            { n: "賽爾", t: "（原本正窩在書頁中的她，一種純粹的警覺令她猛地飛了出來)",bg: "bg8 broke.png", a: "fairy", bgm: "magic.mp3", vol: 0.8, shake: true, charAnim: "bounce" },
            { n: "賽爾", t: "(翅膀在燭光下繃得筆直）等等——", a: "fairy" },
            { n: "夏特", t: "（他眼神一凜，手下意識地按向腰間，卻撲了個空。宮廷宴會禁止攜帶武器。)", a: "chate",
              se: "clothes1.mp3" },
            { n: "葛蕾", t: "（她敏銳地發現備忘冊的邊緣正在消融，迅速轉頭看向我。）", a: "glea",
              se: "paper down.mp3", shake: true, screenEffect: "dissolve" },
            { n: "我", t: "（書封下，透出一道極其微弱的光)", a: "me",
              flash: true, flashSFX: "flash.mp3", vol: 0.9, screenEffect: "glow",
              env: "white smoke/1", envFrames: 25, envspeed: 60, envOpacity: 0.4, envDrift: true },
            { n: "我", t: "(那不是燭火的反光，而是從試算表最深處的矩陣裡，一層層透出來的幽光。）", a: "me" },
            { n: "賽爾", t: "（她的聲音低得只有我能聽見，透著嚴肅）它……它在要求我們強制進入試算表維度。", a: "fairy",
              se: "whisper.mp3", vol: 0.7, screenEffect: "dissolve"  },
            { n: "我", t: "（我甚至來不及發出疑問)", a: "me",
              bgPos: "center", bgZoom: 2.0, bgDur: "2s", screenEffect: "dissolve"  },
            { n: "我", t: "(光芒迅速擴散)", a: "me",bg: "white.png", flash: true, flashSFX: "flash.mp3" },
            { n: "我", t: "(它從周圍的空氣裡、從地面的紋路裡同時湧出，將現實的邊界溶解）", a: "me",bg: "white.png", screenEffect: "dissolve"  },
            { n: "米羅", t: "（他看著周圍的景色開始如水波般暈開，困惑地環顧四周）這是怎——", a: "miro",
              shake: true, screenEffect: "dissolve",bg: "white.png" },
            { n: "系統", t: "（光吞沒了大殿。吞沒了燈火。吞沒了所有聲音。）", a: "system",
              bg: "black.png", clearWhiteout: true,
              bgm: "system.mp3",se:"broke.mp3",vol:2.0, screenEffect: "glow"},
            { n: "系統", t: "（它帶著我們所有人都離開了）", a: "system",
              bgPos: "center", bgZoom: 1.5, bgDur: "10s",se:"broke.mp3",vol:1.0 },
            { n: "系統", t: "……", a: "system",
            bgPos: "center", bgZoom: 1.0, bgDur: "20s",
              env: "loading/1", envFrames: 60, envSpeed: 50, envOpacity: 1.0, envDrift: false,se:"broke.mp3",vol:2.0 },
            { n: "系統", t: "…………", a: "system", bgPos: "center", bgZoom: 1.0,se:"broke.mp3",vol:2.0 },
            { n: "系統", t: "………………", se:"broke.mp3",vol:2.0 },
        ],

        fail_IF_no_equal: [
            { n: "賽爾", t: "「差一點——IF跟所有公式一樣，要以等號開頭。試試在最前面加上 [[=|gold]]。」", a: "fairy" }
        ],
        fail_IF_missing_param: [
            { n: "賽爾", t: "「IF需要三個參數：條件、真值、假值，缺一不可。格式：[[=IF(條件,\"真\",\"假\")|gold]]。」", a: "fairy" }
        ],
        fail_IF_no_quotes: [
            { n: "賽爾", t: "「文字答案要加雙引號。推薦要寫 [[\"推薦\"|gold]]，不是直接輸入 推薦。」", a: "fairy" }
        ],
        fail_IFS_wrong_order: [
            { n: "賽爾", t: "等一下！條件的順序不對。IFS會從第一個條件開始檢查，如果先判斷 >=80 給「良」，那 95 分的人也會直接拿到「良」，永遠輪不到後面的「優」。請從最嚴格的條件（>=90）開始！", a: "fairy", shake: true }
        ],
        fail_IF_PLUS_no_abs: [
            { n: "賽爾", t: "「北境加分係數在N1，往下拖拉時它會跑掉。把N1改成 [[$N$1|gold]] 鎖住它。」", a: "fairy" }
        ],
        fail_IF_AND_one_condition: [
            { n: "賽爾", t: "「特別推薦是『政績AND廉潔都要達標』，不是只看一個條件。", a: "fairy" },
            { n: "賽爾", t: "在AND的括號裡把兩個條件都寫上去：[[AND(D2>=80,F2>=80)|gold]]。」", a: "fairy" }
        ],
        fail_IF_BASIC_wrong_col: [
            { n: "賽爾", t: "「推薦判斷用的是I欄——總計，不是G欄總分。", a: "fairy" },
            { n: "賽爾", t: "北境加分還沒算進去的話，總計會跟總分一樣，但它們不是同一格。」", a: "fairy" }
        ],
        fail_IF_BASIC_generic: [
            { n: "賽爾", t: "「嗯……公式好像哪裡不太對。再檢查一下：[[=IF(I2>=80,\"推薦\",\"不推薦\")|gold]]，欄位、符號跟逗號都要對齊喔。」", a: "fairy" }
        ],
        fail_IFS_generic: [
            { n: "賽爾", t: "「公式好像哪裡不太對。再檢查一下：[[=IFS(I2>=90,\"優\",I2>=80,\"良\",TRUE,\"待察\")|gold]]，條件順序跟逗號都要對齊喔。」", a: "fairy" }
        ],
        fail_IF_PLUS_H_generic: [
            { n: "賽爾", t: "「H欄的公式好像哪裡不太對。再檢查一下：[[=(C2=\"北境\")*$N$1|gold]]，括號跟引號都要對齊喔。」", a: "fairy" }
        ],
        fail_IF_PLUS_I_generic: [
            { n: "賽爾", t: "「I欄的公式好像哪裡不太對。再檢查一下：[[=G2+H2|gold]]，把G欄總分跟H欄加分加起來就好。」", a: "fairy" }
        ],
        fail_IF_AND_generic: [
            { n: "賽爾", t: "「公式好像哪裡不太對。再檢查一下：[[=IF(AND(D2>=80,F2>=80),\"特別推薦\",\"\")|gold]]，括號跟逗號都要對齊喔。」", a: "fairy" }
        ] },

    simulator: {
        bgm: "game_bgm.mp3",
        tasks: [
            {
                id:           "IF_BASIC_TASK",
                tutorHint: "【任務：標記推薦】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：在 K2 輸入公式：<br>[[=IF(I2>=80,\"推薦\",\"不推薦\")|gold]]<br>輸入完成後，向下拖拉到 K21。</span>",
                playerText:   "【 K欄：推薦標記 】<br>📌 規則：總計(I欄) >= 80，標記「推薦」，否則「不推薦」。<br>💡 技巧：[[IF(條件, 真值, 假值)|#ff9800]]。",
                targetCell:   { r: 1, c: 10 },
                ghostText:    "[[=IF(I2>=80,\"推薦\",\"不推薦\")|gold]]",
                unlockSkillId:"IF_BASIC",
                expectedCondition: { type: "ACTION", actionId: "IF_APPLY", col: 10 },
                storySegmentBefore: "discovery_IF_BASIC",
                storySegmentAfter:  "success_IF_BASIC"
            },
            {
                id:           "IFS_TASK",
                tutorHint: "【任務：判定等第】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：在 J2 輸入公式：<br>[[=IFS(I2>=90,\"優\",I2>=80,\"良\",TRUE,\"待察\")|gold]]<br>輸入完成後，向下拖拉到 J21。</span>",
                playerText:   "【 J欄：等第判定 】<br>📌 規則：>=90「優」，80~89「良」，<80「待察」。<br>💡 技巧：使用 [[IFS|#ff9800]] 函數，條件必須由[[嚴格|#f44336]]排到[[寬鬆|#4caf50]]，最後用 TRUE 收尾。",
                targetCell:   { r: 1, c: 9 },
                ghostText:    "[[=IF(K2=\"推薦\",\"[推薦]\",\"\")&IF(J2=\"優\",\"優等\",IF(J2=\"良\",\"良等\",\"待察\"))|gold]]",
                unlockSkillId:"IFS",
                expectedCondition: { type: "ACTION", actionId: "IFS_APPLY", col: 9 },
                storySegmentBefore: "discovery_IFS",
                storySegmentAfter:  "success_IFS",
                midStoryAfter:      "mid_story"
            },
            {
                id:           "IF_PLUS_TASK",
                tutorHint: "【任務：計算地區加分與更新總計】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：1️⃣ 在 H2 輸入：[[=(C2=\"北境\")*$N$1|gold]]，拖拉到 H21。<br>2️⃣ 在 I2 輸入：[[=G2+H2|gold]]，拖拉到 I21 覆蓋舊總計。</span>",
                playerText:   "【 H & I 欄：加分與總計 】<br>📌 規則：北境來的人加10分(鎖定N1)。<br>💡 技巧：利用 [[(條件)*數值|#ff9800]] 的方式取代 IF。<br>⚠️ 注意：I欄更新後，前面的等第與推薦會[[自動變動|#4caf50]]！",
                targetCell:   { r: 1, c: 7 },
                ghostText:    "=(C2=\"北境\")*$N$1",
                unlockSkillId:"IF_PLUS",
                expectedCondition: { type: "ACTION", actionId: "IF_PLUS_APPLY", col: 7 },
                storySegmentBefore: "discovery_IF_PLUS",
                storySegmentAfter:  "success_IF_PLUS"
            },
            {
                id:           "IF_AND_TASK",
                tutorHint: "【任務：篩選特別推薦名單】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：在 L2 輸入公式：<br>[[=IF(AND(D2>=80,F2>=80),\"特別推薦\",\"\")|gold]]<br>輸入完成後，向下拖拉到 L21。</span>",
                playerText:   "【 L欄：特別推薦 】<br>📌 規則：政績與廉潔皆需 >= 80。<br>💡 技巧：[[AND(條件1, 條件2)|#ff9800]] 可以將多個條件綁定，全部成立才算 TRUE。",
                targetCell:   { r: 1, c: 11 },
                ghostText:    "=IF(AND(D2>=80,F2>=80),\"特別推薦\",\"\")",
                unlockSkillId:"IF_AND",
                expectedCondition: { type: "ACTION", actionId: "IF_AND_APPLY", col: 11 },
                storySegmentBefore: "discovery_IF_AND",
                storySegmentAfter:  "success_IF_AND"
            }
        ]
    }
};
