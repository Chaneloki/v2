/**
 * 練習模式（特訓模式）防覆寫與防存檔 Monkey Patch 腳本
 * 攔截 saveGame, handleGameComplete, 與 next 流程以實現無縫返回主線地圖。
 */
window.initPracticeModeMonkeyPatch = function () {
  if (window.orchestrator) {
    // 1. 攔截 saveGame：避免練習關卡數據覆寫主線存檔
    if (!window.orchestrator._originalSaveGame) {
      window.orchestrator._originalSaveGame = window.orchestrator.saveGame;
      window.orchestrator.saveGame = function (slotType = 'auto') {
        if (this.state && this.state.isPractice) {
          console.log("⚠️ [Orchestrator] 目前處於特訓練習模式，略過存檔寫入以保護主線進度。");
          return;
        }
        return this._originalSaveGame.call(this, slotType);
      };
    }

    // 2. 攔截 handleGameComplete：特訓練習通關後的提示
    if (!window.orchestrator._originalHandleGameComplete) {
      window.orchestrator._originalHandleGameComplete = window.orchestrator.handleGameComplete;
      window.orchestrator.handleGameComplete = function () {
        if (this.state && this.state.isPractice) {
          const overlay = document.getElementById('notice-overlay');
          const title = document.getElementById('notice-title');
          const content = document.getElementById('notice-content');
          const btn = document.getElementById('notice-btn');

          if (overlay && title && content && btn) {
            title.innerText = "🎉 特訓完成！";
            content.innerHTML = `
              <div style="text-align:center; padding:20px;">
                <p style="font-size:18px;">您已順利完成本章節的特訓複習！</p>
                <p style="color:#217346; font-weight:bold; margin-top:10px;">欲速則不達，繼續保持練習吧！</p>
              </div>
            `;
            btn.innerText = "🔙 結束特訓並返回城鎮";
            btn.onclick = () => {
              overlay.style.display = 'none';
              const exitBtn = document.getElementById('practice-exit-btn');
              if (exitBtn) exitBtn.remove();

              this.state.isPractice = false;
              if (this.state.realChapter) {
                this.state.currentChapter = this.state.realChapter;
              }
              this.triggerPhase("RPG_MODE");
            };
            overlay.style.display = 'flex';
            return;
          }
        }
        return this._originalHandleGameComplete.call(this);
      };
    }

    // 3. 攔截 next 流程：通關後自動無縫返回 RPG 模式 (不播放練習章節的結局故事)
    if (!window.orchestrator._originalNext) {
      window.orchestrator._originalNext = window.orchestrator.next;
      window.orchestrator.next = function () {
        if (this.state && this.state.isPractice && this.state.currentPhase === 'SIMULATOR') {
          console.log("🎯 [Orchestrator] 練習關卡已全數完成！自動無縫返回 RPG 模式。");

          const exitBtn = document.getElementById('practice-exit-btn');
          if (exitBtn) exitBtn.remove();

          this.state.isPractice = false;
          if (this.state.realChapter) {
            this.state.currentChapter = this.state.realChapter;
          }

          this.loadChapter(this.state.currentChapter).then(() => {
            this.triggerPhase("RPG_MODE");

            setTimeout(() => {
              if (window.rpgEngine) {
                window.rpgEngine.playRPGSequence([
                  { n: "訓練營教官", t: "「精彩的表現，勇者大人！你已經順利完成了這次的特訓複習。繼續前往公會承接新的委託吧！」" }
                ]);
              }
            }, 300);
          });
          return;
        }
        return this._originalNext.call(this);
      };
    }
  }
};

// 立即執行與載入綁定
window.initPracticeModeMonkeyPatch();
window.addEventListener('load', window.initPracticeModeMonkeyPatch);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  window.initPracticeModeMonkeyPatch();
}
