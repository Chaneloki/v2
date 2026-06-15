/**
 * RPG 系統 UI 與視覺微調補丁
 * 處理對話框位置動態調整與隱藏除錯紅色空氣牆。
 */

// ====================================================
// 1. RPG 對話框位置動態調整 (Dialogue Box Dynamic Positioning)
// ====================================================
window.initDialoguePositionPatch = function () {
  if (window.rpgEngine) {
    if (window.rpgEngine._isPositionPatched) return;
    window.rpgEngine._isPositionPatched = true;

    // 攔截 playRPGSequence (對話序列)
    const originalPlayRPGSequence = window.rpgEngine.playRPGSequence;
    window.rpgEngine.playRPGSequence = function (dialogues, onComplete) {
      if (this.dialogEl) {
        // 如果對話大於等於 2 句，視為劇情場景，對話框在頂部；否則在底部
        if (dialogues && dialogues.length >= 2) {
          this.dialogEl.style.top = '40px';
          this.dialogEl.style.bottom = 'auto';
        } else {
          this.dialogEl.style.top = 'auto';
          this.dialogEl.style.bottom = '40px';
        }
      }
      return originalPlayRPGSequence.call(this, dialogues, onComplete);
    };

    // 攔截 interactWith (一般互動) -> 一律設在底部
    const originalInteractWith = window.rpgEngine.interactWith;
    window.rpgEngine.interactWith = function (poi) {
      if (this.dialogEl) {
        this.dialogEl.style.top = 'auto';
        this.dialogEl.style.bottom = '40px';
      }
      return originalInteractWith.call(this, poi);
    };

    // 攔截 interactBed (床鋪互動) -> 一律設在底部 (若是睡前劇情，後續會由 playRPGSequence 改設為頂部)
    const originalInteractBed = window.rpgEngine.interactBed;
    window.rpgEngine.interactBed = function () {
      if (this.dialogEl) {
        this.dialogEl.style.top = 'auto';
        this.dialogEl.style.bottom = '40px';
      }
      return originalInteractBed.call(this);
    };
  }
};

// 立即執行與事件綁定
window.initDialoguePositionPatch();
window.addEventListener('load', window.initDialoguePositionPatch);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  window.initDialoguePositionPatch();
}
