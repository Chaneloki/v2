/**
 * RPG 模式地圖資料庫
 * 存放所有地圖定義、碰撞牆邊界與 POI 點位資訊。
 */
window.RPG_MAPS = {
  // ----------------------------------------------------
  // 1. 街道樞紐 (The Hub)
  // ----------------------------------------------------
  "street": {
    name: "數據之城街道",
    bg: "rpg/bg/street.png",
    bgm: "begin.mp3",
    // 原圖 1408x768，放大兩倍 2816x1536
    width: 2816,
    height: 1536,
    spawnPoint: { x: 1400, y: 690 },
    walls: [
      // 新版街道的地圖邊界
      { id: "bound_top", x: 0, y: 250, w: 2816, h: 20 },
      { id: "bound_bot", x: 0, y: 1400, w: 2816, h: 200 },
      { id: "bound_left", x: 0, y: 0, w: 20, h: 1536 },
      { id: "bound_right", x: 2620, y: 0, w: 20, h: 1536 },

      // 上排建築 (基底在 700)
      { id: "w_guild", x: 0, y: 0, w: 500, h: 700 },     // 公會大廳
      { id: "w_dorm", x: 520, y: 0, w: 600, h: 700 },    // 宿舍 (邊界對齊石板路)
      { id: "w_arena", x: 1150, y: 0, w: 550, h: 700 },  // 競技場 (對齊石板路)
      { id: "w_tavern", x: 1670, y: 0, w: 500, h: 700 },// 酒館
      { id: "w_tree1", x: 0, y: 800, w: 100, h: 80 },
      { id: "w_tree2", x: 640, y: 820, w: 120, h: 80 },
      { id: "w_tree3", x: 820, y: 1330, w: 200, h: 150 },
      // 馬車區：向左延伸包覆白馬與大門
      { id: "w_carriage_stable", x: 2000, y: 300, w: 700, h: 200 }, // 右上方馬廄
      { id: "w_carriage_bushes", x: 2330, y: 500, w: 466, h: 350 }, // 柵欄與灌木叢

      // 下排建築 (基底在 800，圖書館、道具屋、研究所底部在 1250)
      { id: "w_training", x: 10, y: 870, w: 905, h: 690 },    // 訓練營 (包含左側草地，精準對齊十字路口)
      { id: "w_library", x: 1140, y: 820, w: 500, h: 450 },  // 圖書館 (包含右側草地)
      { id: "w_shop", x: 1650, y: 820, w: 500, h: 450 },     // 道具屋 (包含左側草叢)
      { id: "w_0shop", x: 2120, y: 890, w: 100, h: 380 },
      { id: "w_lab", x: 2330, y: 820, w: 466, h: 400 },       // 神秘研究所 (包含左側深色石牆)
      { id: "w_0lab", x: 2330, y: 1350, w: 466, h: 200 }
    ],
    pois: [
      {
        id: "door_guild", name: "公會大廳", icon: "🚪", x: 250, y: 700, w: 100, h: 80,
        action: "TELEPORT", targetMap: "guild_hall", targetX: 512, targetY: 850
      },

      {
        id: "door_dorm", name: "宿舍", icon: "🚪", x: 725, y: 700, w: 100, h: 80,
        action: "TELEPORT", targetMap: "dorm", targetX: 576, targetY: 450
      },

      {
        id: "door_arena", name: "競技場", icon: "🚪", x: 1300, y: 700, w: 100, h: 80,
        action: "TELEPORT", targetMap: "arena", targetX: 512, targetY: 800, requiresFlag: "unlocked_arena"
      },

      {
        id: "door_tavern", name: "酒館", icon: "🍺", x: 1850, y: 700, w: 100, h: 80,
        action: "TELEPORT", targetMap: "tavern", targetX: 512, targetY: 800
      },

      {
        id: "carriage", name: "旅行馬車", icon: "🐴", x: 2350, y: 350, w: 150, h: 100,
        desc: "馬車夫：「勇者大人，目前沒有新的目的地，您可以在城內自由探索。」"
      },

      // NPCs
      {
        id: "fairy", name: "賽爾", icon: "🧚", x: 500, y: 500, w: 80, h: 80,
        avatar: "Charater/fairy.png",
        desc: "賽爾：「別偷懶了，快點去完成任務！」"
      },

      {
        id: "door_training", name: "訓練營", icon: "⚔️", x: 350, y: 800, w: 150, h: 80,
        action: "TELEPORT", targetMap: "training", targetX: 622, targetY: 500
      },

      {
        id: "door_library", name: "圖書館", icon: "📚", x: 1325, y: 1250, w: 100, h: 80,
        action: "TELEPORT", targetMap: "library", targetX: 512, targetY: 800
      },

      {
        id: "door_shop", name: "道具屋", icon: "💰", x: 1875, y: 1250, w: 100, h: 80,
        action: "TELEPORT", targetMap: "shop_interior", targetX: 512, targetY: 800
      },

      {
        id: "door_lab", name: "研究所", icon: "🧪", x: 2633, y: 1250, w: 100, h: 80,
        action: "TELEPORT", targetMap: "secret_lab", targetX: 512, targetY: 800, requiresFlag: "unlocked_lab"
      }
    ]
  },

  // ----------------------------------------------------
  // 2. 公會大廳 (Guild Hall) - 縮放像素版
  // ----------------------------------------------------
  "guild_hall": {
    name: "奧德賽公會大廳",
    bg: "rpg/bg/club.png",
    bgm: "begin.mp3",
    // 50% 比例縮放（原圖 2752x1536，縮放至 1376x768，使人物比例更為和諧）
    width: 1376,
    height: 768,
    spawnPoint: { x: 630, y: 550 },
    sprites: [
      { id: "spr_club_npc", img: "rpg/npc/club npc.png", x: 700, y: 164, w: 250 }
    ],
    walls: [
      // 牆壁碰撞區 (等比縮放 50%)
      { id: "w_top_left", x: 100, y: 150, w: 350, h: 177 },       // 行 1~3, 列 B~H
      { id: "w_top_mid", x: 450, y: 80, w: 458, h: 118 },       // 行 1~2, 列 I~P (向上凹槽)
      { id: "w_top_right", x: 860, y: 140, w: 516, h: 177 },   // 行 1~3, 列 Q~Y
      { id: "w_left", x: 70, y: 0, w: 115, h: 768 },           // 列 B (左側黑邊與外牆)
      { id: "w_right", x: 1245, y: 0, w: 115, h: 768 },       // 列 Y (右側外牆與黑邊)
      { id: "w_bot_left", x: 80, y: 650, w: 573, h: 118 },    // 行 12~13, 列 B~K
      { id: "w_bot_right", x: 720, y: 650, w: 688, h: 118 },// 行 12~13, 列 N~Y (保留中間 L~M 為出口)

      // 室內家具碰撞區 (等比縮放 50%)
      { id: "w_counter_v", x: 650, y: 200, w: 57, h: 118 },  // 櫃台垂直段：列 K, 行 5~6
      { id: "w_counter_h", x: 650, y: 250, w: 344, h: 59 },  // 櫃台水平段：列 L~P, 行 6
      { id: "w_bench_bl", x: 115, y: 590, w: 458, h: 59 },   // 下左長椅：列 D~K, 行 11
      { id: "w_bench_br", x: 770, y: 590, w: 550, h: 59 }  // 下右長椅：列 N~W, 行 11
    ],
    pois: [
      {
        id: "mission", name: "公會接待員", icon: "💁‍♀️", x: 688, y: 236, w: 115, h: 118,
        desc: "「冒險者您好！這裡是奧德賽公會服務櫃台。您可以在這裡承接冒險任務，並在完成後前來領取優渥的獎勵！」<br><br>👉 [系統提示] 這裡可以隨時承接章節委託與領取結算酬勞。"
      },
      {
        id: "complete", name: "結算與佈告欄", icon: "📜", x: 1032, y: 236, w: 172, h: 118,
        desc: "「佈告欄上貼滿了各項任務的懸賞令與結算中心，辛苦了，這是您的報酬。」"
      },
      {
        id: "member_door", name: "成員專用通道", icon: "🚪", x: 115, y: 236, w: 115, h: 59,
        action: "EVAL", evalCode: "window.openMemberDoorMenu()"
      },
      {
        id: "exit_guild", name: "離開大廳", icon: "🔙", x: 573, y: 650, w: 115, h: 59,
        action: "TELEPORT", targetMap: "street", targetX: 300, targetY: 690
      }
    ]
  },

  // ----------------------------------------------------
  // 3. 公會儲藏室 (Storage Room)
  // ----------------------------------------------------
  "storage_room": {
    name: "公會儲藏室",
    bg: "rpg/bg/black.png",
    bgm: "begin.mp3",
    width: 1024,
    height: 1024,
    spawnPoint: { x: 512, y: 800 },
    walls: [
      { id: "bound_top", x: 0, y: 0, w: 1024, h: 120 },
      { id: "bound_bot", x: 0, y: 1004, w: 1024, h: 20 },
      { id: "bound_left", x: 0, y: 0, w: 20, h: 1024 },
      { id: "bound_right", x: 1004, y: 0, w: 20, h: 1024 }
    ],
    pois: [
      {
        id: "storage_chest", name: "儲物寶箱", icon: "📦", x: 450, y: 300, w: 120, h: 80,
        desc: "「這裡存放著冒險者公會的備用物資。目前空無一物。」"
      },
      {
        id: "exit_storage", name: "返回公會大廳", icon: "🔙", x: 450, y: 900, w: 120, h: 80,
        action: "TELEPORT", targetMap: "guild_hall", targetX: 172, targetY: 300
      }
    ]
  },

  // ----------------------------------------------------
  // 4. 冒險者訓練營 (Training Center)
  // ----------------------------------------------------
  "training": {
    name: "冒險者訓練營",
    bg: "rpg/bg/training.png",
    bgm: "begin.mp3",
    width: 1376,
    height: 768,
    spawnPoint: { x: 622, y: 500 },
    sprites: [
      { id: "spr_instructor", img: "rpg/npc/training npc.png", x: 740, y: 160, w: 200 }
    ],
    walls: [
      { id: "w_top", x: 65, y: 40, w: 1245, h: 170 },           // 行 1~2, 列 C~U
      { id: "w_left", x: 0, y: 0, w: 131, h: 768 },            // 列 B (左外牆與黑邊)
      { id: "w_right", x: 1220, y: 0, w: 131, h: 768 },        // 列 U~V (右外牆與黑邊)
      { id: "w_bot_left", x: 0, y: 680, w: 630, h: 320 },      // 行 8~9, 列 B~I
      { id: "w_bot_right", x: 740, y: 680, w: 630, h: 320 },   // 行 8~9, 列 K~V (保留中間 J 為出口)
      { id: "w_desk", x: 740, y: 200, w: 300, h: 120 },         // 教官書桌：列 L~O, 行 4
      { id: "w_dummies", x: 180, y: 300, w: 66, h: 300 },      // 訓練木人：列 D, 行 4~7
      { id: "w_targets1", x: 450, y: 320, w: 66, h: 33 },
      { id: "w_targets2", x: 450, y: 410, w: 66, h: 33 },
      { id: "w_targets3", x: 450, y: 510, w: 66, h: 33 },      // 射箭靶子：列 H, 行 4~7
      { id: "w_rack", x: 262, y: 155, w: 280, h: 85 },
      { id: "w_chair_left", x: 0, y: 640, w: 550, h: 50 },      // 行 8~9, 列 B~I
      { id: "w_chair_right", x: 800, y: 640, w: 600, h: 50 }         // 兵器架
    ],
    pois: [
      {
        id: "instructor", name: "訓練營教官", icon: "⚔️", x: 720, y: 256, w: 262, h: 85,
        desc: "「欲速則不達，勇者大人。練習是掌握試算表禁術的唯一捷徑。」<br><br>👉 [系統提示] 這裡可以進行挑戰關卡的複習與自主練習。",
        action: "EVAL", evalCode: "window.openTrainingMenu()"
      },
      {
        id: "exit_training", name: "離開訓練營", icon: "🔙", x: 590, y: 597, w: 65, h: 171,
        action: "TELEPORT", targetMap: "street", targetX: 425, targetY: 770
      }
    ]
  },

  // ----------------------------------------------------
  // 5. 宿舍大廳 (Dormitory)
  // ----------------------------------------------------
  "dorm": {
    name: "公會宿舍大廳",
    bg: "rpg/bg/dorm.png",
    bgm: "begin.mp3",
    width: 1152,
    height: 832,
    spawnPoint: { x: 640, y: 450 },
    sprites: [
      { id: "spr_receptionist", img: "rpg/npc/dorm npc.png", x: 930, y: 220, w: 250 }
    ],
    walls: [
      { id: "w_top_wall", x: 0, y: 0, w: 1152, h: 256 },          // 北側主牆面與房間門
      { id: "w_bot_left", x: 20, y: 544, w: 530, h: 288 },         // 南側左黑邊
      { id: "w_bot_right", x: 650, y: 544, w: 620, h: 288 },      // 南側右黑邊
      { id: "w_left", x: 30, y: 0, w: 32, h: 832 },                // 西側邊界
      { id: "w_right", x: 1120, y: 0, w: 32, h: 832 },            // 東側邊界
      { id: "w_counter", x: 950, y: 150, w: 500, h: 250 }         // 接待櫃台
    ],
    pois: [
      {
        id: "door_my_room", name: "Room 1 (我的房間)", icon: "🚪", x: 128, y: 224, w: 96, h: 64,
        action: "TELEPORT", targetMap: "my_room", targetX: 600, targetY: 500
      },
      {
        id: "door_room_2", name: "Room 2", icon: "🚪", x: 320, y: 224, w: 96, h: 64,
        requiresFlag: "unlocked_room_2", action: "TELEPORT", targetMap: "my_room", targetX: 600, targetY: 500
      },
      {
        id: "door_room_3", name: "Room 3", icon: "🚪", x: 512, y: 224, w: 96, h: 64,
        requiresFlag: "unlocked_room_3", action: "TELEPORT", targetMap: "my_room", targetX: 600, targetY: 500
      },
      {
        id: "door_room_4", name: "Room 4", icon: "🚪", x: 704, y: 224, w: 96, h: 64,
        requiresFlag: "unlocked_room_4", action: "TELEPORT", targetMap: "my_room", targetX: 600, targetY: 500
      },
      {
        id: "bulletin_board", name: "宿舍佈告欄", icon: "📜", x: 864, y: 224, w: 128, h: 64,
        desc: "【本月公告】<br>請各位冒險者注意夜間音量，並記得在月底前繳清房租與清潔費。"
      },
      {
        id: "receptionist", name: "管理員", icon: "💁‍♀️", x: 1040, y: 208, w: 96, h: 96,
        desc: "「歡迎回到宿舍，今天也要好好休息喔！如果有信件或包裹，我會幫您留意的。」"
      },
      {
        id: "exit_dorm", name: "離開宿舍", icon: "🔙", x: 576, y: 544, w: 128, h: 64,
        action: "TELEPORT", targetMap: "street", targetX: 775, targetY: 690
      }
    ]
  },

  // ----------------------------------------------------
  // 6. 主角房間 (My Room)
  // ----------------------------------------------------
  "my_room": {
    name: "我的房間",
    bg: "rpg/bg/room.png",
    bgm: "begin.mp3",
    width: 1197,
    height: 768,
    spawnPoint: { x: 600, y: 500 },
    walls: [
      { id: "w_bound_top", x: 0, y: 0, w: 1197, h: 250 },    // 上方石牆與窗戶
      { id: "w_bound_bot1", x: 250, y: 640, w: 460, h: 130 },
      { id: "w_bound_bot2", x: 785, y: 640, w: 115, h: 130 },   // 下方邊界
      { id: "w_bound_left", x: 10, y: 0, w: 280, h: 768 },    // 左側黑邊
      { id: "w_bound_right", x: 900, y: 0, w: 247, h: 768 }, // 右側黑邊
      { id: "w_bed", x: 250, y: 150, w: 180, h: 250 },       // 左上角床鋪
      { id: "w_bookcase", x: 780, y: 80, w: 130, h: 200 },  // 右上角書櫃
      { id: "w_desk", x: 310, y: 550, w: 220, h: 100 }       // 左下角書桌
    ],
    pois: [
      {
        id: "skill_book", name: "試算表禁術大全", icon: "📚", x: 780, y: 180, w: 100, h: 80,
        desc: "", action: "EVAL", evalCode: "window.open('skill_book.html', '_blank')"
      },
      {
        id: "diary", name: "回憶日記", icon: "📖", x: 320, y: 530, w: 80, h: 60,
        desc: "", action: "EVAL", evalCode: "window.uiManager.openMemoryDiary()"
      },
      {
        id: "bed", name: "床鋪", icon: "🛏️", x: 260, y: 200, w: 150, h: 100,
        desc: "睡覺", action: "EVAL", evalCode: "window.rpgEngine.interactBed()"
      },
      {
        id: "exit_room", name: "離開房間", icon: "🚪", x: 550, y: 700, w: 200, h: 60,
        action: "TELEPORT", targetMap: "dorm", targetX: 250, targetY: 300
      }
    ]
  },

  // ----------------------------------------------------
  // 7. 神秘道具屋 (Shop Interior)
  // ----------------------------------------------------
  "shop_interior": {
    name: "神秘道具屋",
    bg: "rpg/bg/black.png",
    bgm: "begin.mp3",
    width: 1024,
    height: 1024,
    spawnPoint: { x: 512, y: 800 },
    walls: [
      { id: "bound_top", x: 0, y: 0, w: 1024, h: 20 },
      { id: "bound_bot", x: 0, y: 1004, w: 1024, h: 20 },
      { id: "bound_left", x: 0, y: 0, w: 20, h: 1024 },
      { id: "bound_right", x: 1004, y: 0, w: 20, h: 1024 }
    ],
    pois: [
      {
        id: "shopkeeper", name: "道具屋老闆娘", icon: "💰", x: 500, y: 400, w: 120, h: 80,
        action: "EVAL", evalCode: "window.uiManager.openAvatarShop()",
        desc: "「哎呀，客官想買點什麼？聽說最近有新的冒險者造型哦...」"
      },
      {
        id: "exit_shop", name: "離開道具屋", icon: "🔙", x: 450, y: 900, w: 120, h: 80,
        action: "TELEPORT", targetMap: "street", targetX: 1875, targetY: 1300
      }
    ]
  },

  // ----------------------------------------------------
  // 8. 皇家圖書館 (Library)
  // ----------------------------------------------------
  "library": {
    name: "皇家圖書館",
    bg: "rpg/bg/library.png",
    bgm: "begin.mp3",
    width: 1632,
    height: 960,
    spawnPoint: { x: 864, y: 820 },
    sprites: [
      { id: "spr_librarian", img: "rpg/npc/library npc.png", x: 780, y: 225, w: 80 }
    ],
    walls: [
      { id: "w_top", x: 0, y: 0, w: 1632, h: 336 },               // 頂部書櫃
      { id: "w_desk", x: 720, y: 336, w: 240, h: 96 },            // 中央辦公桌
      { id: "w_left", x: 0, y: 0, w: 165, h: 960 },               // 左側書櫃主體
      { id: "w_right", x: 1470, y: 0, w: 162, h: 960 },           // 右側書櫃主體
      { id: "w_corner_left", x: 150, y: 300, w: 75, h: 300 },     // 左上角書櫃
      { id: "w_corner_right", x: 1400, y: 300, w: 78, h: 300 },   // 右上角書櫃
      { id: "w_bot_left", x: 0, y: 864, w: 740, h: 96 },          // 底部左側黑邊
      { id: "w_bot_right", x: 900, y: 864, w: 672, h: 96 },       // 底部右側黑邊
      { id: "w_table_tl", x: 336, y: 450, w: 150, h: 96 },
      { id: "w_chair_tl", x: 375, y: 390, w: 50, h: 50 },
      { id: "w_table_tr", x: 1150, y: 450, w: 150, h: 96 },
      { id: "w_chair_tr", x: 1190, y: 390, w: 50, h: 50 },
      { id: "w_table_bl", x: 336, y: 650, w: 150, h: 96 },
      { id: "w_chair_bl", x: 375, y: 600, w: 50, h: 50 },
      { id: "w_chair_bl2", x: 375, y: 750, w: 50, h: 50 },
      { id: "w_table_br", x: 1150, y: 650, w: 150, h: 96 },
      { id: "w_chair_br", x: 1190, y: 600, w: 50, h: 50 },
      { id: "w_chair_br2", x: 1190, y: 750, w: 50, h: 50 }
    ],
    pois: [
      {
        id: "librarian", name: "圖書館員", icon: "📚", x: 720, y: 300, w: 240, h: 132,
        desc: "「歡迎來到皇家圖書館，沿著紅地毯走就不會迷路了。」"
      },
      {
        id: "book_magic", name: "魔法古籍", icon: "📖", x: 0, y: 550, w: 165, h: 144,
        desc: "架上放著一本古老的魔法書... 裡面寫滿了看不懂的符號。"
      },
      {
        id: "book_history", name: "大陸史記", icon: "📜", x: 1470, y: 550, w: 162, h: 144,
        desc: "書架上這本書記錄著數據之城過去的輝煌與災難。"
      },
      {
        id: "book_red", name: "禁忌儀式", icon: "📕", x: 350, y: 200, w: 150, h: 136,
        desc: "上方架上有一本紅色封面的書，似乎記載著被公會禁止的儀式。"
      },
      {
        id: "book_purple", name: "魔藥學", icon: "🔮", x: 1150, y: 200, w: 150, h: 136,
        desc: "上方架上的書頁裡夾著幾片乾枯的魔法草藥，散發著奇異的香味。"
      },
      {
        id: "exit_library", name: "離開圖書館", icon: "🔙", x: 768, y: 864, w: 192, h: 96,
        action: "TELEPORT", targetMap: "street", targetX: 1325, targetY: 1300
      }
    ]
  }
};

// ----------------------------------------------------
// 街道路口傳送連動微調
// ----------------------------------------------------
if (window.RPG_MAPS && window.RPG_MAPS.street && window.RPG_MAPS.street.pois) {
  // 對齊公會大廳門口
  const streetGuildDoor = window.RPG_MAPS.street.pois.find(poi => poi.id === "door_guild");
  if (streetGuildDoor) {
    streetGuildDoor.targetX = 630;
    streetGuildDoor.targetY = 550;
  }
  // 對齊訓練營大門口
  const streetTrainingDoor = window.RPG_MAPS.street.pois.find(poi => poi.id === "door_training");
  if (streetTrainingDoor) {
    streetTrainingDoor.targetX = 622;
    streetTrainingDoor.targetY = 500;
  }
}
