# RPG 自由模式程式碼結構 (`code/rpg/`)

此資料夾包含 RPG 自由探索模式（Ch8.5 之後的像素世界）的所有程式碼。
對應的圖片資源放在專案根目錄的 `rpg/`（`rpg/bg/`、`rpg/charater/`、`rpg/npc/`）。

## 檔案說明

- **`rpg_engine.js`** — 核心引擎：角色移動、攝影機、碰撞、對話框、POI 互動派發
  (`window.rpgEngine`)。
- **`maps/`** — 地圖資料庫 (`window.RPG_MAPS`)。**每個大地圖一個檔案**：
  - `map1_street.js` — 大地圖 1：城市街道及其室內場景（公會大廳、宿舍、訓練營、
    道具屋、圖書館、儲藏室、我的房間）。
  - 未來新增大地圖時，依序新增 `map2_xxx.js`、`map3_xxx.js`...，每個檔案用
    `window.RPG_MAPS = Object.assign(window.RPG_MAPS || {}, { ... })` 的方式
    合併自己的地圖資料（不要直接覆寫整個 `RPG_MAPS`），並在 `index.html`
    新增對應的 `<script>` 標籤。
- **`rpg_interactions.js`** — 特殊 POI 互動處理（公會成員門、訓練營關卡跳轉等）。
- **`rpg_shop.js`** — 道具屋/角色商店系統（購買並切換可遊玩角色）。
- **`rpg_practice_mode.js`** — 特訓/練習模式的存檔保護（避免覆寫主線進度）。
- **`rpg_dialog_ui.js`** — 對話框版面微調與除錯牆顯示。
- **`story_sleep.js`** — 房間睡覺/章節銜接相關邏輯。
- **`missions/`** — （規劃中，尚未建立）未來放置任務線（mission line）註冊表與
  各角色任務資料。

## 資源位置

- `rpg/bg/` — 地圖背景圖
- `rpg/charater/` — 主角/可玩角色的行走精靈圖
- `rpg/npc/` — NPC 圖片
