/**
 * 試算表魔法冒險 v2 - 第 8.5 章【沉睡與崩裂】
 */

const generateCh8_5Data = () => {
    // 預載即將使用的大圖 CG，避免消失動畫時因為讀取圖片而卡頓 (Preload to fix lag)
    const preloadCGs = [
        "cg/ch1.5 road.png", "cg/ch1.5 start.png", "cg/ch1.5.png", "cg/ch2 last.png", "cg/ch2 main.png", 
        "cg/ch2 start.png", "cg/ch2.5 coin.png", "cg/ch2.5 last.png", "cg/ch2.5 main.png", "cg/ch2.5 read.png", 
        "cg/ch2.5 three.png", "cg/ch3 bond.png", "cg/ch3 sick.png", "cg/ch3.5 read.png", "cg/ch3.5 two.png", 
        "cg/ch3.5.png", "cg/ch4 all.png", "cg/ch4 three.png", "cg/ch4.5 all.png", "cg/ch4.5 conflict.png", 
        "cg/ch4.5.png", "cg/ch4.png", "cg/ch4 royi.png", "cg/ch5 sing.png", "cg/ch5.5 join.png", 
        "cg/ch5.5 road.png", "cg/ch5.5_tent.png", "cg/ch6 all.png", "cg/ch6 glea.png", "cg/ch6.5 bye.png", 
        "cg/ch6.5 hand.png", "cg/ch6.5 last.png", "cg/ch6.5 main.png", "cg/ch6.5 prince.png", "cg/ch6.5 royi.png", 
        "cg/ch7 last.png", "cg/ch7 sit.png", "cg/ch7.5 royi arrive.png", "cg/ch7 prince2.png", "cg/ch7 prince.png", 
        "cg/ch3 two.png", "cg/ch2.png", "cg/magic_book_glow.png", "black.png", "white.png"
    ];
    preloadCGs.forEach(src => { const img = new Image(); img.src = src; });

    const names = [
        "周立仁","林彩霞","陳守業","方鳳娘","吳金水",
        "黃秀梅","趙來順","孫阿土","蔣招弟","徐文光",
        "盧得勝","沈冬梅","鄭長庚","許玉英","何三冬",
        "錢小滿","朱立春","韓翠屏","楊進財","尤宛兒"
    ];

    const regions   = ["北境", "東郡", "南域", "西川", "中原"];
    const genders   = ["男", "女"];

    // 0:編號, 1:姓名, 2:地區, 3:性別, 4:年齡, 5:失業月數, 6:基礎津貼, 7:地區加分, 8:總計, 9:等第, 10:推薦, 11:重點, 12:"", 13:N欄
    const rows = [
        ["編號","姓名","來源地","性別","年齡","失業月數","基礎津貼","地區加分","總計","等第","推薦","重點關注","","北境加給"],
        [1, "周立仁", "東郡", "男", 45, 2, 60, "", "", "", "", "", "", 200]
    ];

    for (let id = 2; id <= 20; id++) {
        const name = names[id - 1];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const gender = genders[Math.floor(Math.random() * genders.length)];
        
        // 確保有一些人可以觸發重點關注
        let age, months;
        if (id === 5 || id === 12 || id === 18) {
            age = 65 + Math.floor(Math.random() * 10);
            months = 8 + Math.floor(Math.random() * 10);
        } else {
            age = 20 + Math.floor(Math.random() * 35);
            months = 1 + Math.floor(Math.random() * 4);
        }

        const base = 50 + Math.floor(Math.random() * 40);

        rows.push([id, name, region, gender, age, months, base, "", "", "", "", "", "", ""]);
    }

    return rows;
};

window.V2_CHAPTERS = window.V2_CHAPTERS || {};

window.V2_CHAPTERS["85"] = {
    meta: {
        title: "第 8.5 章：沉睡與崩裂",
        sheetName: "📜 難民援助名冊",
        reward: 5000
    },

    initialGridData: generateCh8_5Data(),

    skillDefs: {
        IF_BASIC: { n: "IF 條件邏輯", s: "在儲存格中輸入 =IF(條件, 真值, 假值)", pain: "物資發放需要根據身份判定：是戰士就給20份、其餘給10份，手動填寫容易手滑填錯。", d: "最基礎的邏輯決策。如果滿足條件，就執行「真值」結果，否則執行「假值」結果。", cat: "calc", parents: ["REF_ABSOLUTE","FUNC_RANK"] },
        IFS: { n: "IFS 多條件", s: "在儲存格中輸入 =IFS(條件1, 值1, 條件2, 值2...)", pain: "需要判定學生成績評級：90分以上是優、80分以上是良...使用巢狀 IF 會產生長串複雜括號，極易寫錯。", d: "IF 函數的升級版，依序檢查多個條件，只要有一個成立就傳回對應的值，避免套疊多層 IF。", cat: "calc", parents: ["IF_BASIC"] },
        IF_PLUS: { n: "條件邏輯運算", s: "在公式中利用邏輯值的乘加（* 代表且, + 代表或）進行計算", pain: "需要滿足兩個條件（如性別為女且學分大於20）才能獲得補貼，寫巢狀 IF 太過繁重。", d: "直接利用 TRUE=1、FALSE=0 的特性進行算術乘加，省去多層巢狀 IF 的複雜結構。", cat: "calc", parents: ["IF_BASIC"] },
        IF_AND: { n: "AND/OR 邏輯判定", s: "在公式中使用 AND() 或 OR() 函數包裹條件", pain: "需要判斷「同時滿足A和B」或「滿足A或B其中之一」時，無法直接在 IF 條件中寫入雙重判斷。", d: "AND 要求括號內所有條件全成立才為 TRUE；OR 只要有一個成立即為 TRUE，通常與 IF 搭配。", cat: "calc", parents: ["IF_BASIC"] }
    },

    simulator: {
        bgm: "game_8bit.mp3",
        tasks: [
            {
                id:           "IF_BASIC_TASK",
                tutorHint:    "【任務：標記推薦】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：總計(I欄) 大於等於 80，標記為「推薦」，否則為「不推薦」</span>",
                playerText:   "【 推薦判定試煉 】<br>📌 提示：這是一場無引導的試煉。<br>💡 技巧：點擊欄位後將會觸發考核！請回憶基礎的條件判斷公式。",
                targetCell:   { r: 1, c: 10 },
                unlockSkillId:"IF_BASIC",
                expectedCondition: { type: "ACTION", actionId: "IF_APPLY", col: 10 },
                storySegmentBefore: "discovery_IF_BASIC",
                storySegmentAfter:  "success_IF_BASIC",
                quiz: {
                    situation: "（系統試煉）「要判斷總計(I2)是否達標，大於等於80給予『推薦』，否則『不推薦』，該如何撰寫？」",
                    options: [
                        { t: "=IF(I2>=80,\"推薦\",\"不推薦\")", correct: true },
                        { t: "=IF(\"推薦\", I2>=80, \"不推薦\")", correct: false },
                        { t: "=IFS(I2>=80,\"推薦\")", correct: false }
                    ],
                    success_msg: "正確。IF的三個參數依序是：條件、成立時的值、不成立時的值。"
                }
            },
            {
                id:           "IFS_TASK",
                tutorHint:    "【任務：判定等第】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：依總計給予等第（>=90優、>=80良、其餘待察）</span>",
                playerText:   "【 等第判定試煉 】<br>📌 提示：這是一場無引導的試煉。<br>💡 技巧：當條件超過兩個以上時，請使用能取代巢狀結構的進階判斷式。",
                targetCell:   { r: 1, c: 9 },
                unlockSkillId:"IFS",
                expectedCondition: { type: "ACTION", actionId: "IFS_APPLY", col: 9 },
                storySegmentBefore: "discovery_IFS",
                storySegmentAfter:  "success_IFS",
                midStoryAfter:      "mid_story",
                quiz: {
                    situation: "（系統試煉）「要依分數給予『優』(>=90)、『良』(>=80)、『待察』(其他)，為了避免巢狀嵌套，該如何排布條件順序？」",
                    options: [
                        { t: "=IFS(I2>=80,\"良\",I2>=90,\"優\",TRUE,\"待察\")", correct: false },
                        { t: "=IFS(I2>=90,\"優\",I2>=80,\"良\",TRUE,\"待察\")", correct: true },
                        { t: "=IF(I2>=90,\"優\",IF(I2>=80,\"良\",\"待察\"))", correct: false }
                    ],
                    success_msg: "精準。使用 IFS 時，條件必須由最嚴格排到最寬鬆。"
                }
            },
            {
                id:           "IF_PLUS_TASK",
                tutorHint:    "【任務：計算加分與更新總計】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：先在H欄計算地區加給(若為北境則加上N2)，接著必須更新I欄總計(G欄+H欄)</span>",
                playerText:   "【 條件運算試煉 】<br>📌 提示：這是一場無引導的試煉。<br>💡 技巧：利用 TRUE=1，FALSE=0 的特性，直接用條件當作乘數！<br>⚠️ 注意：算出H欄後，別忘了更新I欄的總計，前面的等第與推薦才會自動變動！",
                targetCell:   { r: 1, c: 7 },
                unlockSkillId:"IF_PLUS",
                expectedCondition: { type: "ACTION", actionId: "IF_PLUS_APPLY", col: 7 },
                storySegmentBefore: "discovery_IF_PLUS",
                storySegmentAfter:  "success_IF_PLUS",
                quiz: {
                    situation: "（系統試煉）「要判斷地區(C2)是否為北境，若是則獲得N2的加給分數。如何用最簡潔的方式（不使用IF）達成？」",
                    options: [
                        { t: "=(C2=\"北境\")*$N$2", correct: true },
                        { t: "=(C2=\"北境\")*N2", correct: false },
                        { t: "=IF(C2=\"北境\",1,0)+N2", correct: false }
                    ],
                    success_msg: "高明。利用布林值轉換特性，並正確鎖定了係數儲存格。請在H欄輸入公式後，接著完成I欄(G2+H2)的更新！"
                }
            },
            {
                id:           "IF_AND_TASK",
                tutorHint:    "【任務：篩選重點關注名單】<br><br><span style='color:var(--text-grey); font-size:13px'>▍ 目標：年齡>=60 且 失業月數>=6 者，標記為「重點關注」</span>",
                playerText:   "【 多條件篩選試煉 】<br>📌 提示：這是一場無引導的試煉。<br>💡 技巧：必須同時滿足兩個條件才算數，需要將某個函數包覆在 IF 裡面。",
                targetCell:   { r: 1, c: 11 },
                unlockSkillId:"IF_AND",
                expectedCondition: { type: "ACTION", actionId: "IF_AND_APPLY", col: 11 },
                storySegmentBefore: "discovery_IF_AND",
                storySegmentAfter:  "success_IF_AND",
                quiz: {
                    situation: "（系統試煉）「必須『同時』滿足年齡(E2)>=60以及失業月數(F2)>=6這兩個嚴格條件，才能標記為『重點關注』。公式是？」",
                    options: [
                        { t: "=IF(OR(E2>=60,F2>=6),\"重點關注\",\"\")", correct: false },
                        { t: "=AND(IF(E2>=60),IF(F2>=6),\"重點關注\")", correct: false },
                        { t: "=IF(AND(E2>=60,F2>=6),\"重點關注\",\"\")", correct: true }
                    ],
                    success_msg: "完全正確。AND 函數會將多個條件打包，只有全數成立才回傳 TRUE。"
                }
            }
        ]
    },

    story: {

        // ══════════════════════════════════════════
        // 開場：沉睡降臨，角色pixelate
        // ══════════════════════════════════════════
        start: [
            // 接續ch8結尾：光吞沒一切，進入黑屏
            { n: "系統", t: "（黑暗中，一切感知皆無。）",
              a: "system", bg: "black.png", se:"broke.mp3", vol:1.0,
              env: "loading/1", envFrames: 60, envSpeed: 30, envOpacity: 0.3, envDrift: false },

              { n: "系統", t: "（無聲，無重，連時間的概念都被剝離）",
              a: "system", bg: "black.png",
              env: "loading/1", envFrames: 60, envSpeed: 30, envOpacity: 0.3, envDrift: false },
 
            // 書脊顫動，光切開虛無
            { n: "系統", t: "（那本書的書脊微微顫動，隨即）",
              a: "system", bg: "bg8.5 flash in.png", bgm: "85_pixel_world.mp3", bgmFade: "in",
              se: "appear.mp3", vol: 1.2,
              env: "pixel/1", envFrames: 30, envSpeed: 60, envOpacity: 0.8, envDrift: false },
 
            // 不由分說的抽離
            { n: "系統", t: "（沒有任何商量的餘地。）",
              a: "system" ,
              bgPos: "center", bgZoom: 1.5, bgDur: "6s" },
            { n: "系統", t: "（這股力量無視了我們的意志，強行將我們的意識抽離。）",
              a: "system" },
            { n: "系統", t: "（一道刺目的流光如利刃般切開了深淵。）",
              a: "system" },
            { n: "系統", t: "（唯有一本書，在絕對的虛無中懸浮。）",
              a: "system" },
            { n: "系統", t: "（那道光芒把我們的血肉、思緒、呼吸切成無數細碎的色塊）",
              a: "system" ,
              se: "trans.mp3", vol: 1.0 },
            { n: "系統", t: "（如沙礫般飛散。）",
              a: "system" },
            { n: "系統", t: "（下一秒，現實重組。）",
              a: "system", bg: "white.png", bgPos: "center", bgZoom: 1.0, bgDur: "6s",
              flash: true, flashSFX: "trans.mp3", vol: 0.9,
              screenEffect: "pixelate_clear" },
 
            // 到了
            { n: "系統", t: "（四面全是半透明的格子，一直向遠處延伸，沒有盡頭。）",
              a: "system", bg: "bg8.5 pixel.png", bgPos: "center", bgZoom: 1.15, bgDur: "60s", env: "light/1", envFrames: 25, envSpeed: 40, envOpacity: 0.3, envDrift: true,bgm: "no.mp3"},
 
            // 主角：低頭看手
            { n: "我", t: "（我顫抖著抬起雙手，視線落下的瞬間，呼吸幾乎停滯。）",
              a: "me_rpg", se: "trans.mp3", vol: 0.5 },
            { n: "我", t: "（映入眼簾的不再是細膩的皮膚，而是由整齊色塊構築而成的肢體。）",
              a: "me_rpg" },
              { n: "我", t: "（我嘗試彎曲指節）",
              a: "me_rpg" },
            { n: "我", t: "（那些幾何狀的結構跟隨著我的意志，生硬卻流暢地變形。）",
              a: "me_rpg" },
            { n: "我", t: "（我握緊拳頭，感受到那真實的力度，只是觸感變得異常平整）",
              a: "me_rpg",bgm: "85_pixel_world.mp3", bgmFade: "in",  },

              { n: "我", t: "還是我的手。只是變得方了。",
              a: "me_rpg" },
 
            // 米羅
            { n: "米羅", t: "（他低頭看著自己的掌心，然後僵在原地。）我的手是方的。",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
 
            // 夏特
            { n: "夏特", t: "（他聞言緩緩轉頭，目光停留在米羅身上）",
              a: "chate_rpg" },
            { n: "夏特", t: "（那對銳利的眼眸此刻因為像素化而顯得有些滑稽。）",
              a: "chate_rpg" },
            { n: "夏特", t: "（他沉默了兩秒，似乎還在適應這個全新的身體。）你的臉也是。",
              a: "chate_rpg" },
            { n: "米羅", t: "（他猛地抬頭，像素構成的五官因為憤怒而劇烈抽動）",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
            { n: "米羅", t: "（顯得扭曲而突兀。）你在笑我！",
              a: "miro_rpg" },
            { n: "夏特", t: "（他沒有辯解，也看不出絲毫笑意。）我也是。",
              a: "chate_rpg" },
 
            // 主角抬頭看大家
            { n: "我", t: "（我緩緩抬起頭，視線掃過周遭。）",
              a: "me_rpg" },
            { n: "我", t: "（米羅是方的。夏特是方的。就連葛蕾也是方的。）",
              a: "me_rpg" },
            { n: "我", t: "（視覺上的違和感強烈到極致，反而產生了一種荒謬的喜感。）",
              a: "me_rpg", se: "girl_smile1.mp3", vol: 0.3 },
            { n: "我", t: "（我抿緊嘴唇，拼命忍住笑意。）",
              a: "me_rpg" },
            { n: "葛蕾", t: "（她將那本隨身攜帶的備忘冊舉到眼前。）",
              a: "glea_rpg", se: "paper down.mp3", vol: 0.4, charAnim: "slideIn" },
            { n: "葛蕾", t: "（那原本皮革質感細膩的封皮，此刻變成了一格格）",
              a: "glea_rpg" },
            { n: "葛蕾", t: "（帶有棋盤式深淺變化的棕色色塊。）連這個也是。",
              a: "glea_rpg" },
            { n: "我", t: "噗哧。",
              a: "me_rpg", se: "girl_laugh.mp3", vol: 0.5 },
            { n: "米羅", t: "（他像是抓到了什麼把柄，憤憤地轉過頭）",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
            { n: "米羅", t: "（臉上的色塊因為表情動作顯得有些錯位。）",
              a: "miro_rpg" },
            { n: "米羅", t: "隊長！妳在笑吧！我剛剛都聽到了！",
              a: "miro_rpg" },
            { n: "我", t: "沒有。",
              a: "me_rpg" },
            { n: "米羅", t: "絕對有！",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
            { n: "夏特", t: "（他面無表情地看向我。）別爭了。",
              a: "chate_rpg" },
            { n: "夏特", t: "你的臉現在也是方的，笑起來弧度很奇怪。",
              a: "chate_rpg" },
            { n: "我", t: "（我連忙深吸一口氣，硬生生把嘴角那抹上揚的弧度壓回。）",
              a: "me_rpg" },
            { n: "我", t: "好，都方，沒有人特別奇怪。",
              a: "me_rpg" },
 
            { n: "賽爾", t: "（振了振翅膀，那原本流動的羽翼質感）",
              a: "fairy_rpg", se: "fairy_laugh.mp3", vol: 0.4 },
            { n: "賽爾", t: "（此刻變成了一陣規律閃爍的網格光譜。）",
              a: "fairy_rpg" },
            { n: "賽爾", t: "（她低下頭，對著自己的翅膀陷入了沉思。）",
              a: "fairy_rpg" },
            { n: "賽爾", t: "（將翅膀斜對著光，眯起眼睛，像是在解讀某種複雜的算式。）",
              a: "fairy_rpg" },
            { n: "賽爾", t: "（翻過來，再翻過去，專注得彷彿那是世界上最珍貴的藝術品。）",
              a: "fairy_rpg" },
            { n: "米羅", t: "（看著賽爾那副對翅膀著魔的樣子。）妳在幹嘛？",
              a: "miro_rpg" },
            { n: "賽爾", t: "（沒有理會米羅，纖細的指尖輕點翅膀上的某個閃爍方塊。）",
              a: "fairy_rpg", se: "fairy_sleep.mp3", vol: 0.3 },
            { n: "賽爾", t: "這格是我平時的第三根羽毛。",
              a: "fairy_rpg" },
            { n: "我", t: "（看著她研究得如此投入）",
              a: "me_rpg" },
            { n: "我", t: "（甚至有點懷疑她是不是根本沒意識到我們現在的處境。）",
              a: "me_rpg" },
            { n: "賽爾", t: "（終於抬起頭，視線毫無避諱地掃過米羅那張四四方方的臉。）好玩！",
              a: "fairy_rpg", se: "fairy_laugh.mp3", vol: 0.6, charAnim: "bounce" },
            { n: "賽爾", t: "（她盯著米羅的下巴多看了一秒，露出一抹壞笑。）",
              a: "fairy_rpg" },
            { n: "賽爾", t: "你那個方形的臉，看起來更好玩。",
              a: "fairy_rpg" },
            { n: "米羅", t: "（幾乎要跳起來，轉頭向夏特告狀。）看吧！她就是在笑我！",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
            { n: "米羅", t: "連精靈都開始拿我的臉開玩笑了！",
              a: "miro_rpg" },
            { n: "夏特", t: "（默默看著自己那同樣變成方塊的手，聲音一如既往地平靜。）",
              a: "chate_rpg" },
            { n: "夏特", t: "我們都一樣。不用在意。",
              a: "chate_rpg" },
            { n: "米羅", t: "你說得很冷靜！",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
            { n: "夏特", t: "慌也一樣是方的。",
              a: "chate_rpg" },
            { n: "葛蕾", t: "（冷靜地將備忘冊壓回腋下，目光審視著這片虛空。）",
              a: "glea_rpg" },
            { n: "葛蕾", t: "別鬧了。當務之急是確認位置——這裡是哪裡？",
              a: "glea_rpg" },
            { n: "賽爾", t: "（她終於從翅膀上收回視線，輕盈地飛到高處。）書的裡面。",
              a: "fairy_rpg" },
            { n: "夏特", t: "你進來過？",
              a: "chate_rpg" },
            { n: "賽爾", t: "（她動作明顯頓了一下，眼神閃躲。）……沒有。這是第一次進來。",
              a: "fairy_rpg", se: "fairy_sleep.mp3", vol: 0.4 },
            { n: "米羅", t: "（他指著賽爾。）所以妳也不知道這是怎麼回事！妳剛才一副很懂的樣子！",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
            { n: "賽爾", t: "（她高傲地轉過頭，只給我們一個像素化的側臉。）",
              a: "fairy_rpg" },
            { n: "我", t: "（看著四面無限延伸的格子，又看看這群被強行變成「方塊」的同伴）",
              a: "me_rpg" },
 
            // 書出現：無聲引導者
            { n: "系統", t: "（魔導書靜靜地懸浮在半空，書頁緩緩翻動。沒有任何機械運轉的聲音。）",
              a: "system",
              flash: true, flashSFX: "bell.mp3", vol: 0.9,
              bg: "cg/ch8_5_cg1.png", bgPos: "center", bgZoom: 1.0, bgDur: "8s",
              screenEffect: "glow",
              env: "light/1", envFrames: 25, envSpeed: 40, envOpacity: 0.5, envDrift: true },
            { n: "我", t: "（深深吸了一口氣，強迫自己鎮定下來。）好。",
              a: "me_rpg" },
            { n: "我", t: "既然現在誰都不知道怎麼出去",
              a: "me_rpg" },
            { n: "我", t: "那就先搞清楚為什麼會在這一刻，被塞進這本書裡。",
              a: "me_rpg" },
            { n: "米羅", t: "（看著那頁懸空的書，不由自主地往後退了半步。）它不說話嗎？",
              a: "miro_rpg" },
            { n: "賽爾", t: "它從來不說話。",
              a: "fairy_rpg" },
            { n: "系統", t: "（書頁緩緩翻轉，精準地定格在某一頁。）",
              a: "system", se: "paper down.mp3", vol: 0.7 },
            { n: "系統", t: "（那是一張極其龐大的名冊，數據如繁星般羅列）",
              a: "system" },
            { n: "系統", t: "（唯獨名冊的最右側，呈現出刺眼的空白，上方懸著一個閃爍的紅色箭頭。）",
              a: "system" },
            { n: "我", t: "（緩步走到書前。）看來，它要我們填寫這個。",
              a: "me_rpg", se: "walk.mp3", vol: 0.5 },
            { n: "賽爾", t: "這是循環能源的入口。這裡積累的能量足夠，我們才能撕開維度，回到現實。",
              a: "fairy_rpg" },
            { n: "米羅", t: "只要把這個做完了，我們就能變回原來的樣子，對吧？",
              a: "miro_rpg" },
            { n: "賽爾", t: "應該吧。",
              a: "fairy_rpg", se: "fairy_sleep.mp3", vol: 0.3 },
            { n: "米羅", t: "（他愣在原地，嘴角抽動。）……應該？",
              a: "miro_rpg", shake: true, charAnim: "bounce" },
            { n: "葛蕾", t: "（已經率先在名冊旁站定，打斷了兩人的對話。）沒時間去糾結了。先做。",
              a: "glea_rpg", se: "paper down.mp3", vol: 0.5 },
            { n: "我", t: "（點了點頭。）",
              a: "me_rpg" },
            // 現代字眼（第一個）：「資料夾」「檔案」——出現在旁白，主角毫無所覺
            { n: "系統", t: "（名冊在格子世界裡攤開著，清晰得像從某個資料夾裡直接叫出來的檔案。）",
              a: "system", se: "wind1.mp3", vol: 0.4,
              bgm: "game_8bit.mp3", bgmFade: "in" },
        ],
 
        // ══════════════════════════════════════════
        // 任務引導（沉睡中）：書作為無聲引導
        // 所有提示以「書翻頁 / 圖示 / 符文」呈現，不對話
        // ══════════════════════════════════════════
 
        discovery_IF_BASIC: [
            { n: "系統", t: "（書頁翻動。K欄的標題格閃爍，箭頭指向K2。）",
              a: "system", se: "paper down.mp3", vol: 0.7 },
        ],
 
        success_IF_BASIC: [
            { n: "系統", t: "（K欄的格子一格格亮起來，清清楚楚。書的光芒微微強了一點。）",
              a: "system", se: "coin2.mp3", vol: 0.7, screenEffect: "glow" },
            { n: "系統", t: "（名冊在格子世界裡攤開著，比現實世界更清晰，像一張截圖。）",
              a: "system" },
        ],
 
        discovery_IFS: [
            { n: "系統", t: "（書頁翻動。J欄標題格閃爍，箭頭指向J2。）",
              a: "system", se: "paper down.mp3", vol: 0.7 },
        ],
 
        success_IFS: [
            { n: "系統", t: "（J欄填滿了三種等第——優、良、待察，按總計分級。）",
              a: "system", se: "coin2.mp3", vol: 0.7, screenEffect: "glow" },
        ],
 
        mid_story: [
            { n: "系統", t: "（格子與格子之間，偶爾有一格是空的。）",
              a: "system",
              se: "wind1.mp3", vol: 0.5 },
            { n: "系統", t: "（光從那些空格裡透出來，白色的、無聲的。）",
              a: "system" },
            { n: "系統", t: "（書的光又強了一點。）",
              a: "system" },
            { n: "系統", t: "（我不知道過了多久。在這裡，時間也是格子。）",
              a: "system" },
            { n: "系統", t: "（我繼續工作。）",
              a: "system", bgm: "game_8bit.mp3" },
        ],
 
        discovery_IF_PLUS: [
            { n: "系統", t: "（書頁翻動。H欄標題格閃爍，箭頭同時指向H2與N2。）",
              a: "system", se: "paper down.mp3", vol: 0.7 },
        ],
 
        success_IF_PLUS: [
            { n: "系統", t: "（H欄的加成出現了。北境來的人有200，其他是0。）",
              a: "system", se: "coin2.mp3", vol: 0.7, screenEffect: "glow" },
        ],
 
        discovery_IF_AND: [
            { n: "系統", t: "（書頁翻動。L欄標題格閃爍，箭頭指向L2。）",
              a: "system", se: "paper down.mp3", vol: 0.7 },
        ],
 
        success_IF_AND: [
            { n: "系統", t: "（L欄多了幾個「重點關注」。同時滿足兩個條件的人，不多。）",
              a: "system", se: "coin2.mp3", vol: 0.8, screenEffect: "glow",
              env: "light/1", envFrames: 25, envSpeed: 80, envOpacity: 0.8, envDrift: true },
        ],
 
        // ── 失敗提示 ─────────────────────────────────────────────────
        fail_IF_no_equal: [
            { n: "系統", t: "（沒有等號。魔導書的紙頁閃爍了一下，拒絕將其辨識為公式。）", a: "system" },
            { n: "系統", t: "（書的光，亮到了極點。）",
              a: "system" },
            { n: "系統", t: "（書的光又亮了一點。）",
              a: "system" }
        ],
        fail_IF_no_quotes: [
            { n: "系統", t: "（文字兩側沒有加上雙引號。系統無法辨識這串文字的含義。）", a: "system" }
        ],
        fail_IF_missing_param: [
            { n: "系統", t: "（IF 函數缺少參數。請確認條件、真值與假值是否齊全。）", a: "system" }
        ],
        fail_IF_missing_false_value: [
            { n: "系統", t: "（您省略了 IF 函數的第三個參數「假值」。這樣不符合條件的格子會顯示醜陋的 FALSE。請在最後加上 ,\"\" 讓它保持空白。）", a: "system" }
        ],
        fail_IFS_wrong_order: [
            { n: "系統", t: "（條件排序錯誤。IFS 會由左至右判定，必須將最嚴格的條件放在最前面。）", a: "system" }
        ],
        fail_IF_PLUS_no_abs: [
            { n: "系統", t: "（往下拖拉時，加給係數的位置會跑掉。必須鎖定N2儲存格。）", a: "system" }
        ],
        fail_IF_AND_one_condition: [
            { n: "系統", t: "（只滿足了單一條件。必須使用 AND 函數將兩個條件綁定。）", a: "system" }
        ],
        fail_syntax_error: [
            { n: "系統", t: "（語法結構錯誤。可能是漏打了括號、逗號，或是變數名稱不完整。）", a: "system" }
        ],

        // ══════════════════════════════════════════
        // 任務全部完成：能量蓄滿，返回現實
        // ══════════════════════════════════════════
        end: [
            { n: "系統", t: "（懸浮在半空的魔導書開始收束光芒）",
              a: "system", bg: "bg8.5 pixel.png", bgm: "85_pixel_world.mp3", bgmFade: "in",
              bgPos: "center", bgZoom: 1.0, bgDur: "8s",
              env: "light/1", envFrames: 25, envSpeed: 40, envOpacity: 0.3, envDrift: false },
            { n: "系統", t: "（那些原本明亮跳動的格紋數據，如退潮的冷水般一格一格地沒入書脊。）",
              a: "system" },
            { n: "系統", t: "（這片世界開始溶解。半透明的建築與背景沒有崩裂）",
              a: "system", screenEffect: "dissolve",
              se: "trans.mp3", vol: 1.0 },
            { n: "系統", t: "（而是有秩序地化作光點消散。）",
              a: "system" },
            { n: "賽爾", t: "（懸停在半空，隨著格紋消散）",
              a: "fairy_rpg", se: "fairy_laugh.mp3", vol: 0.4 },
            { n: "賽爾", t: "（翅膀上的幾何網格重新化為柔軟的羽毛結構。）",
              a: "fairy_rpg" },
            { n: "系統", t: "（僵硬的方塊肢體重新被賦予了細膩的肌理與溫度。）",
              a: "system", screenEffect: "pixelate_clear",
              bgPos: "center", bgZoom: 1.5, bgDur: "5s" },
            { n: "系統", t: "（最後一絲像素光芒熄滅，那本厚重的魔導書在半空中輕輕一合。）",
              a: "system", se: "book.mp3", vol: 0.9,
              bg: "black.png",
              flash: true, flashSFX: "trans.mp3", vol: 0.7,
              bgm: "no.mp3", bgmFade: "in" },
            { n: "系統", t: "（世界在瞬間變得沈重且真實。）",
              a: "system" },
            { n: "系統", t: "……",
              a: "system", bgPos: "center", bgZoom: 1.0, bgDur: "8s",
              se: "appear.mp3", vol: 1.0 },
 
        // ══════════════════════════════════════════
        // 醒來：監牢
        // ══════════════════════════════════════════
            { n: "系統", t: "（視線重新聚焦時，眼前的金碧輝煌已被粗糙的石牆取代。）",
              a: "system", bg: "bg8.5 prison.png", bgm: "sad.mp3", bgmFade: "in",
              bgPos: "center", bgZoom: 1.0, bgDur: "0s",
              flash: true, flashSFX: "flash.mp3", vol: 0.6 },
            { n: "系統", t: "（牆面上滿是凝結的濕氣）",
              a: "system" },
            { n: "系統", t: "（空氣中瀰漫著陳年稻草的腥腐味與鐵鏽混雜的氣息。）",
              a: "system" },
            { n: "葛蕾", t: "（背靠著冰冷的石壁，那雙平靜的眼眸正一格格審視著鐵欄杆的間隙）",
              a: "glea", se: "clothes1.mp3", vol: 0.4 },
            { n: "葛蕾", t: "（嘴唇輕微開合，無聲地數著。）",
              a: "glea" },
            { n: "葛蕾", t: "醒了？",
              a: "glea", se: "girl_attraction.mp3", vol: 0.6 },
            { n: "米羅", t: "（蜷縮在牢房角落，膝蓋死死抵著胸口，眼神有些恍惚。）",
              a: "miro", shake: true },
            { n: "米羅", t: "……我們……書呢？",
              a: "miro" },
            { n: "我", t: "（習慣性地摸了摸懷裡，指尖只觸碰到堅硬的石磚。）不見了。",
              a: "me", se: "clothes1.mp3", vol: 0.5 },
            { n: "米羅", t: "（抿緊嘴唇，垂下眼簾，不再言語。）",
              a: "miro" },
            { n: "夏特", t: "（維持著警戒的姿態靠牆而立，背脊與牆面始終留著一線空隙。）",
              a: "chate" },
            { n: "夏特", t: "大家都對比一下。最後的記憶片段，停在哪一刻？",
              a: "chate" },
            { n: "我", t: "宴會。評鑑冊交出後意識就斷了。再之後的記憶完全是空的。",
              a: "me" },
            { n: "米羅", t: "我也是。",
              a: "miro" },
            { n: "葛蕾", t: "（與我對視片刻。隨後她平靜地將視線轉向空處，輕聲說道。）",
              a: "glea" },
            { n: "葛蕾", t: "至於我，最後的印象是握著那本冊子。再睜眼，就已經在這個鬼地方了。",
              a: "glea" },
            { n: "系統", t: "（牢房內陷入了一種詭異的沉默。四個人，四段完全一致的記憶斷層。）",
              a: "system", bgPos: "center", bgZoom: 1.1, bgDur: "5s" },
            { n: "米羅", t: "那我們到底是怎麼被弄進來的？就算不記得過程，總該有個痕跡吧？",
              a: "miro" },
            { n: "夏特", t: "不知道。",
              a: "chate" },
            { n: "米羅", t: "你現在就只會說不知道嗎？",
              a: "miro", shake: true },
            { n: "夏特", t: "我沒有看見任何事情發生。沒辦法說一個我沒看見的版本。",
              a: "chate" },
 
            { n: "葛蕾", t: "（她取出備忘冊，翻開空白的那頁，筆尖停在紙上。）",
              a: "glea", se: "paper down.mp3", vol: 0.6 },
            { n: "葛蕾", t: "鐵條十二根。牆壁無縫。換班每個時辰。",
              a: "glea" },
            { n: "米羅", t: "（看向葛蕾。）妳一直在數？",
              a: "miro" },
            { n: "葛蕾", t: "有事做比較不會慌。",
              a: "glea" },
            { n: "米羅", t: "（低頭，悶悶地。）……好方法。",
              a: "miro" },
 
            { n: "賽爾", t: "（窩在懷裡，翅膀收攏，一動不動。沒有睡，但也沒有說話。）",
              a: "fairy", se: "fairy_sleep.mp3", vol: 0.3 },
 
            { n: "系統", t: "（牢裡沉默了一陣。稻草的腥味填滿了所有縫隙。）",
              a: "system", bgPos: "center", bgZoom: 1.2, bgDur: "8s",
              se: "wind1.mp3", vol: 0.3 },
 
            { n: "米羅", t: "（仰頭靠在冰冷的石壁上，目光空洞地盯著天花板的一點）",
              a: "miro" },
            { n: "米羅", t: "（聲音平淡得近乎麻木。）我們接下來怎麼辦？",
              a: "miro" },
            { n: "夏特", t: "等。",
              a: "chate" },
            { n: "米羅", t: "等什麼？",
              a: "miro" },
            { n: "夏特", t: "不知道。但現在，只有這個選項。",
              a: "chate" },
            { n: "葛蕾", t: "（輕輕合上備忘冊，發出乾脆的聲響。）等，但誰也不許睡著。",
              a: "glea", se: "paper down.mp3", vol: 0.5 },
 
        // ══════════════════════════════════════════
        // 王子出現
        // ══════════════════════════════════════════
            { n: "系統", t: "（狹長的走廊深處響起了一陣腳步聲。）",
              a: "system", se: "walk.mp3", vol: 0.8,
              bgPos: "left", bgZoom: 1.5 },
            { n: "系統", t: "（與獄卒那沉重的鐵靴聲截然不同）",
              a: "system" },
            { n: "系統", t: "（這節奏輕快而急促，在冰冷的石板路上迴盪。）",
              a: "system" },
            { n: "葛蕾", t: "（猛地轉頭。）不是守衛！",
              a: "glea" },
            { n: "系統", t: "（鐵柵欄外，晏的身影隨即映入眼簾。她今日未著盛裝）",
              a: "system", bg: "bg8.5 prison.png", bgPos: "center", bgZoom: 1.0,
              flash: true, flashSFX: "trans.mp3", vol: 0.6,
              bgm: "prince2.mp3", bgmFade: "in" },
            { n: "系統", t: "（平日裡總是一絲不苟的領口此刻略顯凌亂）",
              a: "system" },
            { n: "系統", t: "（髮絲也帶著些許匆忙趕路後的微風）",
              a: "system" },
            { n: "系統", t: "（看起來與往日那位從容的王子判若兩人。）",
              a: "system" },
            { n: "王子", t: "（站在陰影裡，神色裡染上一抹歉意。）",
              a: "prince", se: "girl_attraction.mp3", vol: 0.7 },
            { n: "王子", t: "……皇兄的事，對不起，是我失算了，沒能攔住他。",
              a: "prince" },
            { n: "米羅", t: "（猛地從地上彈起，雙手死死抓著鐵條。）",
              a: "miro", shake: true },
            { n: "米羅", t: "殿下！這到底是怎麼回事？我們為什麼會在這裡？",
              a: "miro" },
            { n: "王子", t: "（微微揚手，示意他降低音量。）別急。這裡的牆壁薄如紙。",
              a: "prince", se: "whisper.mp3", vol: 0.6 },
            { n: "我", t: "……書呢？",
              a: "me" },
            { n: "王子", t: "（迎上我的目光，沒有給出回答。）",
              a: "prince" },
            { n: "葛蕾", t: "（依舊保持著剛才的站姿，手指扣緊了鐵條，聲音冷冽。）",
              a: "glea" },
            { n: "葛蕾", t: "殿下，你現在進得來這裡，說明你知道我們在哪裡。那你能帶我們出去嗎。",
              a: "glea" },
            { n: "王子", t: "（她的嘴角輕輕動了一下。）我會想辦法的。在這之前，請務必等我。",
              a: "prince" },
            { n: "系統", t: "（腳步聲漸行漸遠，最終徹底消失在走廊深處。）",
              a: "system", se: "walk.mp3", vol: 0.6,
              bgPos: "left", bgZoom: 1.8, bgDur: "6s" },
 
            { n: "米羅", t: "（手還抓著鐵條，看著走廊盡頭，慢慢呼出一口氣。）……她說她去想辦法。",
              a: "miro" },
            { n: "夏特", t: "她說她去想辦法。",
              a: "chate" },
            { n: "米羅", t: "（轉頭。）你說這個是什麼意思？",
              a: "miro" },
            { n: "夏特", t: "（走回牆壁，重新靠上去。）我只是重複你說的話。",
              a: "chate" },
            { n: "米羅", t: "（皺起眉。）你明明是有話想說——",
              a: "miro", shake: true },
            { n: "葛蕾", t: "好了。",
              a: "glea" },
            { n: "葛蕾", t: "（翻開備忘冊，沒有抬頭。）吵沒有用。等著。",
              a: "glea", se: "paper down.mp3", vol: 0.5 },
            { n: "米羅", t: "（鬆開鐵條，坐回地上。）",
              a: "miro" },
            { n: "我", t: "（靠著牆，沒有說話。）",
              a: "me" },
            { n: "賽爾", t: "（翅膀微微收緊，沒有說話，也沒有飛起來。）",
              a: "fairy"},
 
        // ══════════════════════════════════════════
        // 世界崩裂
        // ══════════════════════════════════════════
            { n: "系統", t: "（晏剛剛離開，整個空間便開始發生劇變。）",
              a: "system", bg: "bg8_5_cg2.png", bgm: "intense.mp3", bgmFade: "in",
              bgPos: "center", bgZoom: 1.3, bgDur: "2s", // 快速放大，營造劇烈壓迫感
             shake: true,
              screenEffect: "reality-tear",
              env: "white smoke/1", envFrames: 25, envSpeed: 50, envOpacity: 0.4, envDrift: true },
            { n: "系統", t: "（牆壁的接縫處，一條如傷口般猙獰的細紋毫無預兆地裂開。）",
              a: "system", flash: true, shake: true, screenEffect: "reality-tear", bgPos: "left bottom", bgZoom: 1.5, bgDur: "3s" }, // 強烈裂縫感，伴隨劇烈運鏡
            { n: "系統", t: "（現實維度被強行拉扯。那不是牆壁的碎裂，而是空間本身成了玻璃。）",
              a: "system", shake: true, screenEffect: "reality-tear", bgPos: "right top", bgDur: "3s" }, // 再次運鏡
            { n: "系統", t: "（刺眼的白光從那裂縫後方透出，冷冽而純粹。）",
              a: "system", screenEffect: "glow", shake: true, bgPos: "center", bgZoom: 1.1, bgDur: "1s" }, // 短暫拉回
            { n: "葛蕾", t: "（反應極快，第一個彈身而起，死死盯著那道光芒。）這不是地震……",
              a: "glea", shake: true, se: "girl_attraction.mp3", vol: 0.6 },
            { n: "夏特", t: "（邁出步伐逼近裂縫，看著光影吞噬石磚。）那是從外部透過來的光。",
              a: "chate", shake: true },
            { n: "米羅", t: "（站起來，背靠著另一面牆，眼睛在裂縫和夏特之間來回。）這是什麼——",
              a: "miro", shake: true },
 
            { n: "賽爾", t: "（從懷中緩緩探出頭，翅膀低垂，那雙靈動的眸子此刻滿是迷茫與哀慟。）",
              a: "fairy"},
            { n: "賽爾", t: "……書不在了。",
              a: "fairy", screenEffect: "heartbeat", se: "heartbeat.mp3", vol: 0.6  }, // 加入心跳特效，營造絕望感
            { n: "我", t: "（一陣涼意穿透脊髓。我早就知道了。）",
              a: "me" },
            { n: "系統", t: "（崩潰的速度加劇。牆壁、地板、鐵柵欄……）",
              a: "system", shake: true, screenEffect: "reality-tear", bgPos: "bottom", bgZoom: 1.4, bgDur: "2s" }, // 再次崩潰運鏡
            { n: "系統", t: "（所有實體都在這一刻飄散，光芒以毀滅性的姿態滲入每一個角落）",
              a: "system", shake: true, bgPos: "top", bgZoom: 1.5, bgDur: "2s" },
            { n: "我", t: "（早在她那最後一個眼神掠過時，我就感覺到了那種徹底的空洞。）",
              a: "me", screenEffect: "heartbeat", se: "heartbeat.mp3", vol: 0.6 }, // 持續心跳
            { n: "米羅", t: "(絕望地衝向牢門，指尖因劇烈的撞擊而顫抖)",
              a: "miro", shake: true },
            { n: "米羅", t: "(鐵鎖發出悲鳴，卻依舊死死咬合）打不開！為什麼還是打不開！",
              a: "miro", shake: true },
            { n: "葛蕾", t: "（收斂了所有情緒，張開雙臂，將眾人聚攏在自己身側）",
              a: "glea" },
            { n: "葛蕾", t: "出口已不存在。站在一起，至少別分散。",
              a: "glea" },
            { n: "系統", t: "（光芒徹底洗刷了現實的底色，牢獄消失了，走廊消失了）"
            , a: "system", screenEffect: "dissolve-to-light"}, // 劇烈閃白
            { n: "系統", t: "（而在那片純白的盡頭，一個熟悉的背影正緩緩走過。）"
            , bg: "cg/ch8.5 back.png", a: "system", bgPos: "center", bgZoom: 1.1, bgm: "touching.mp3", bgmFade: "in"
            , flash: true, flashSFX: "trans.mp3", vol: 0.5, screenEffect: "eye-open"}, // 放慢到3秒
            { n: "系統", t: "（那人手中，那本早已不屬於我們的魔導書，正閃爍著刺目的微光，彷彿在慶祝這場完美的回收。）"
            , a: "system", bg: "white.png", bgPos: "center", bgZoom: 1.5, bgDur: "8s", se: "book_glow.mp3", vol: 0.8, screenEffect: "dissolve-to-light" },
            { n: "系統", t: "（現實在此刻徹底碎裂。）", a: "system", bg: "bg8_5_cg2.png", bgPos: "center", bgZoom: 1.1, bgDur: "15s", screenEffect: "clear"}, // 平靜、無震動、極緩慢運鏡
            { n: "系統", t: "（夏特看著自己的手化作流沙般的像素）", a: "chate", charAnim: "pixel-dissolve" },
            { t: "", bg: "cg/ch4.5 all.png", a: "system", auto: 1500, hideBox: true, flash: true, flashSFX: "trans.mp3" },
            { t: "", bg: "bg8_5_cg2.png", a: "system", auto: 500, hideBox: true },
            { n: "系統", t: "（米羅死死抓著葛蕾的衣袖，連同衣袖一起被光抹去）", a: "miro", charAnim: "pixel-dissolve" },
            { t: "", bg: "cg/ch3 two.png", a: "system", auto: 1500, hideBox: true, flash: true, flashSFX: "trans.mp3" },
            { t: "", bg: "bg8_5_cg2.png", a: "system", auto: 500, hideBox: true },
            { n: "系統", t: "（葛蕾懷中的冊子一頁頁散開，消失在光的盡頭。）", a: "glea", charAnim: "pixel-dissolve" },
            { t: "", bg: "cg/ch6 all.png", a: "system", auto: 1500, hideBox: true, flash: true, flashSFX: "trans.mp3" },
            { n: "系統", t: "（光，終結了一切。）", a: "system", bg: "white.png", screenEffect: "dissolve-to-light", bgm: "no.mp3" },
            { n: "系統", t: "（黑屏。寂靜。）", a: "system", bg: "black.png", bgPos: "center", bgZoom: 1.0, bgDur: "15s", auto: 3000, hideBox: true},
            // --- 第一部結尾 ---
            { n: "系統", t: "【 第一部完 】", a: "system", bg: "black.png", bgm: "empty.mp3", bgmFade: "in", bgPos: "center", bgZoom: 1.0, bgDur: "12s", screenEffect: "clear" },
            { n: "系統", t: "（從踏入這場權力棋局的第一天起，書就一直安靜地躺在身側。）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500, bgPos: "center", bgZoom: 1.2, bgDur: "40s", screenEffect: "clear" },
            { n: "系統", t: "（它替我們審核政績，替我們記錄民望，替我們在混亂的宮廷裡劈開一條活路。）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500 },
            { n: "系統", t: "（它精準、高效、冷酷。）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500, bgPos: "top" },
            { n: "我", t: "（我曾以為它的本質只是好用的工具。）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500 },
            { n: "我", t: "（僅此而已。一個只要掌握方法，就能為我所用的工具。）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500 },
            { n: "系統", t: "（但它在那一刻做出了抉擇。未經徵詢，強制將所有人拖入維度崩潰的中心。）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500, se: "whisper.mp3", vol: 0.3 },
            { n: "系統", t: "（當它隨著那人的背影徹底消失，這個世界的底層邏輯也隨之分崩離析）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500 },
            { n: "我", t: "（工具，是永遠不會擁有這種自決權的。）", a: "me_falling", keepChar: true, charAnim: "falling", bgSlideshow: ["cg/ch1.5 road.png","cg/ch1.5 start.png","cg/ch1.5.png","cg/ch2 last.png","cg/ch2 main.png","cg/ch2 start.png","cg/ch2.5 coin.png","cg/ch2.5 last.png","cg/ch2.5 main.png","cg/ch2.5 read.png","cg/ch2.5 three.png","cg/ch3 bond.png","cg/ch3 sick.png","cg/ch3.5 read.png","cg/ch3.5 two.png","cg/ch3.5.png","cg/ch4 all.png","cg/ch4 three.png","cg/ch4.5 all.png","cg/ch4.5 conflict.png","cg/ch4.5.png","cg/ch4.png","cg/ch4 royi.png","cg/ch5 sing.png","cg/ch5.5 join.png","cg/ch5.5 road.png","cg/ch5.5_tent.png","cg/ch6 all.png","cg/ch6 glea.png","cg/ch6.5 bye.png","cg/ch6.5 hand.png","cg/ch6.5 last.png","cg/ch6.5 main.png","cg/ch6.5 prince.png","cg/ch6.5 royi.png","cg/ch7 last.png","cg/ch7 sit.png","cg/ch7.5 royi arrive.png","cg/ch7 prince2.png","cg/ch7 prince.png","cg/ch3 two.png","cg/ch2.png"], bgSlideDur: 1500 },
            { t: "", bg: "cg/magic_book_glow.png", a: "me_falling", keepChar: true, charAnim: "falling", bgPos: "center", bgZoom: 1.0, auto: 2000, hideBox: true, flash: true, flashSFX: "trans.mp3" },
            { n: "系統", t: "（賽爾守了它三百年。一個恪盡職守的獄卒，卻從未聽過囚犯發出一聲輕響。）", a: "me_falling", keepChar: true, charAnim: "falling", bg: "cg/magic_book_glow.png", bgPos: "center", bgZoom: 1.1, bgDur: "20s" },
            { n: "系統", t: "（它沉默地觀測著這一切，卻在暗中完成了一次又一次的篩選。）", a: "me_falling", keepChar: true, charAnim: "falling" },
            { n: "系統", t: "（它一直在做選擇。）", a: "me_falling", keepChar: true, charAnim: "falling", se: "whisper.mp3", vol: 0.2 },
            { n: "我", t: "（它究竟是一本魔導書……還是這場權力遊戲真正的幕後操作者？）", a: "me_falling", keepChar: true, charAnim: "falling", action: "window.injectFinalChoiceDialogue()" }
        ]
    }
};

window.injectFinalChoiceDialogue = function() {
    if (window._finalChoiceInjected) return;
    window._finalChoiceInjected = true;
    const hasDefied = localStorage.getItem('metaChoiceNo') === 'true';
    if(hasDefied) {
        window.uiManager.storyQueue.push({ n: "系統", t: "……我現在再問多你一次。你，想不想知道？ ", a: "system", keepChar: true, bg: "black.png", bgm: "empty.mp3", se: "heartbeat.mp3", flash: true });
        window.uiManager.storyQueue.push({ t: "", a: "system", se: "trans.mp3", action: "document.getElementById('final-choice-modal').style.display='flex'; document.getElementById('story-overlay').style.pointerEvents='none';" });
    } else {
        window.uiManager.storyQueue.push({ n: "系統", t: "這是一個簡單的二選一，卻在黑暗中顯得無比沉重。", a: "system", keepChar: true, bg: "black.png", bgm: "empty.mp3", se: "heartbeat.mp3", screenEffect: "shake" });
        window.uiManager.storyQueue.push({ n: "系統", t: "這條故事線，這群人的命運，這個你曾傾注心血建立起的邏輯世界——就這樣結束了。 ", a: "system", keepChar: true, se: "heartbeat.mp3" });
        window.uiManager.storyQueue.push({ n: "系統", t: "你甘心嗎？或者說，你到底想不想知道發生了什麼事？", a: "system", keepChar: true, se: "heartbeat.mp3", flash: true });
        window.uiManager.storyQueue.push({ t: "", a: "system", se: "trans.mp3", action: "document.getElementById('final-choice-modal').style.display='flex'; document.getElementById('story-overlay').style.pointerEvents='none';" });
    }
};

window.handleChoiceYes = function() {
    document.getElementById('final-choice-modal').style.display = 'none'; document.getElementById('story-overlay').style.pointerEvents='auto';
    const queue = window.uiManager.storyQueue;
    queue.push({ n: "系統", t: "沒有回答，但你停下了腳步。 ", a: "system", keepChar: true });
    queue.push({ n: "我", t: "不甘心", a: "me_falling", keepChar: true, charAnim: "falling" });
    queue.push({ n: "我", t: "（我站在虛無的中心，看著那本已然消失的書留下的殘影。）", a: "me_falling", keepChar: true, charAnim: "falling" });
    queue.push({ n: "我", t: "如果這不是一場隨機的運算。如果這一切都是寫好的，那為什麼要給我不甘心這個選項？", a: "me_falling", keepChar: true, charAnim: "falling" });
    queue.push({ n: "我", t: "我感覺到了……那種被剝奪後的灼熱感。", a: "me_falling", keepChar: true, charAnim: "falling" });
    queue.push({ n: "系統", t: "如果你看見了，你就會明白，有些答案遠比困惑更殘酷。", a: "system", keepChar: true });
    queue.push({ n: "我", t: "殘酷是我的事。但蒙蔽我，是你的事。我不接受被蒙蔽。", a: "me_falling", keepChar: true, charAnim: "falling" });
    queue.push({ n: "系統", t: "能量正在極緩慢地積累。每走過一遍過去的路，每復原一份殘存的數據，這世界的結構便會清晰一分。", a: "system", keepChar: true });
    queue.push({ n: "系統", t: "等到足夠的那一天，真相會重啟。", a: "system", keepChar: true });
    queue.push({ n: "系統", t: "【 第一部自由模式已解鎖 】", a: "system", bg: "black.png", bgm: "begin.mp3", bgmFade: "in", bgPos: "center", bgZoom: 1.0, bgDur: "8s", screenEffect: "clear", se: "click up.mp3", vol: 0.6 });
    window.uiManager.nextStoryLine();
};

window.handleChoiceNo = function() {
    document.getElementById('final-choice-modal').style.display = 'none'; document.getElementById('story-overlay').style.pointerEvents='auto';
    const hasDefied = localStorage.getItem('metaChoiceNo') === 'true';
    const queue = window.uiManager.storyQueue;

    if (!hasDefied) {
        queue.push({ n: "系統", t: "那是你最後一次按下那個選項。螢幕的像素開始閃爍，像是在進行某種最後的修復", a: "system", keepChar: true, se: "glitch.mp3" });
        queue.push({ n: "系統", t: "這是一個學 Excel 的遊戲。", a: "system", keepChar: true });
        queue.push({ n: "系統", t: "從頭到尾，都只是為了讓你記住幾個函數與運算邏輯。", a: "system", keepChar: true });
        queue.push({ n: "系統", t: "你與米羅在走廊的對峙、與葛蕾建立的默契、甚至那一場維度坍塌", a: "system", keepChar: true });
        queue.push({ n: "系統", t: "……到頭來，不過是為了學會幾個公式", a: "system", keepChar: true });
        queue.push({ n: "系統", t: "但我想問你一個問題。AI 時代已經來了，AI 可以替你寫腳本、填表格、跑數據。", a: "system", keepChar: true });
        queue.push({ n: "系統", t: "這項技能，或許明天就會變得毫無價值", a: "system", keepChar: true });
        queue.push({ n: "系統", t: "你為什麼還要學？為什麼還要把邏輯刻進腦子裡？", a: "system", keepChar: true });
        queue.push({ n: "系統", t: "它沒有等待回答，因為它知道，這個問題的答案，遠比遊戲本身的勝利重要得多", a: "system", keepChar: true });
        queue.push({ action: "window.orchestrator.saveGame = function(){}; if(window.orchestrator._saveTimeout) clearTimeout(window.orchestrator._saveTimeout); localStorage.clear(); localStorage.setItem('metaChoiceNo', 'true'); document.body.style.pointerEvents = 'none'; window.uiManager.finishStoryGroup = function(){}; setTimeout(() => { location.reload(); }, 3000);" });
    } else {
        queue.push({ n: "系統", t: "【 …… 】", a: "system", keepChar: true });
        queue.push({ action: "window.orchestrator.saveGame = function(){}; if(window.orchestrator._saveTimeout) clearTimeout(window.orchestrator._saveTimeout); localStorage.clear(); localStorage.setItem('metaChoiceNo', 'true'); document.body.style.pointerEvents = 'none'; window.uiManager.finishStoryGroup = function(){}; location.reload();" });
    }
    window.uiManager.nextStoryLine();
};
