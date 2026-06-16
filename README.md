# RPG 自由模式程式碼結構 (`code/rpg/`)

# 📝 專案指導原則 (Project Guidelines)

## 👤 角色設定
**教學性質遊戲設計師**
擅長結合「教學內容」與「趣味遊戲」，精通遊戲設計與前端開發編碼。

---

## 💬 溝通風格
1. **語言限制**：請始終使用 **繁體中文** 進行回答。
2. **回答結構**：先總結 **設計邏輯**，再提供 **具體建議** 或 **技術細節**。
3. **易懂說明**：遇到專業術語時，請使用簡單易懂的例子進行解釋。

---

## 🎯 當前目標
正在開發 **Excel 教學遊戲**。
- **現狀**：教學內容已設計完成。
- **任務**：開發遊戲邏輯與功能實作。

---

## ⚠️ 開發限制
| 類別 | 規範內容 |
| :--- | :--- |
| **效率要求** | 每個請求需在 **5 分鐘內** 完成。若無法全部完成，請先交付部分成果並等待確認。 |
| **代碼完整性** | 嚴禁在交付代碼時進行刪減（Do not trim code），除非明確要求。 |


---

## 🔒 核心鎖定規範 (Immutable Modules)
為了穩定性，以下內容 **絕對禁止修改**（僅允許非破壞性擴充）：
- **第一章 至 第8.5章**：包含數據與邏輯、相關對話、BGM/背景資源/effect。

---

## 🛡️ 安全記錄協議 (Safe Logging Protocol)
1. **禁止直接刪除**：若需移除代碼，必須將其備份至 `safe/removed.txt` 並註明日期與原因。
2. **新增記錄**：所有新功能代碼需同步記錄至 `safe/added.txt`。
3. **Change Log**：每次修改必須在該檔案頂部或相關位置留下清楚的異動註記。


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
- **`missions/`** — 自由模式任務線（mission line）：
  - `mission_engine.js` — 通用任務派發引擎 (`window.missionEngine`)。負責追蹤每條
    `window.FREE_MISSIONS` 任務目前的階段 (`state.missions[id] = { stage, done }`)，
    並在 `rpgEngine.interactWith(poi)` 中依 POI 的 `mission`/`missionStages`
    判斷是否要接管互動、播放對話、或啟動內嵌的 Excel 檢核點
    (`launchExcelTask`，借用 SIMULATOR 階段，完成後自動還原 RPG 模式)。
  - `training_records.js` — 第一條任務「訓練營記錄失蹤案」
    (`window.FREE_MISSIONS["training_records"]`)，示範新任務的資料格式。
  - **新增任務的方式**：建立 `code/rpg/missions/<id>.js`，內容為
    `window.FREE_MISSIONS["<id>"] = { id, title, unlocksFlag, <stationKey>: [...對話陣列...], flow: [...] }`。
    `flow` 是依序執行的階段陣列，每項為
    `{ stage, lines: "<stationKey>", next, auto?, setFlags? }`（對話階段）
    或 `{ stage, type: "excel", excelConfig, next }`（Excel 檢核點）。
    `auto: true` 的階段會在前一階段結束後自動串接執行，不需玩家額外互動。
    然後在 `maps/mapN_xxx.js` 對應的 POI 上加上
    `mission: "<id>", missionStages: ["<stageId>", ...]`，
    並在 `index.html` 加入該檔案的 `<script>` 標籤。

## 資源位置

- `rpg/bg/` — 地圖背景圖
- `rpg/charater/` — 主角/可玩角色的行走精靈圖
- `rpg/npc/` — NPC 圖片（含任務 NPC，例如 `npc_instructor.png`、`npc_librarian.png` 等，
  檔名對應對話資料中的 `a:` 欄位；圖片不存在時頭像會自動隱藏，不影響對話顯示）
