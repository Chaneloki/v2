/**
 * RPG 自由模式 - 主角房間地圖定義 (保留用於章節過渡)
 */
window.RPG_MAPS = Object.assign(window.RPG_MAPS || {}, {
  // ----------------------------------------------------
  // 1. 主角房間 (My Room)
  // ----------------------------------------------------
  "my_room": {
    name: "我的房間",
    bg: "rpg/bg/room.png",
    bgm: "daily.mp3",
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
        id: "diary", name: "回憶日記", icon: "📖", x: 350, y: 530, w: 100, h: 60,
        desc: "", action: "EVAL", evalCode: "window.uiManager.openMemoryDiary()"
      },
      {
        id: "bed", name: "床鋪", icon: "🛏️", x: 260, y: 200, w: 150, h: 100,
        desc: "睡覺", action: "EVAL", evalCode: "window.rpgEngine.interactBed()"
      },
      {
        id: "exit_room", name: "離開房間", icon: "🚪", x: 700, y: 650, w: 150, h: 100,
        action: "TELEPORT", targetMap: "my_room", targetX: 600, targetY: 500
      }
    ]
  }
});
