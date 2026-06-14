/**
 * RPG 模式點位互動專用腳本
 * 包含公會成員門、訓練營選單、以及命名空間繫結邏輯。
 */

// ====================================================
// 1. 公會大廳 - 成員專用通道 (已鎖定維護中)
// ====================================================
window.openMemberDoorMenu = function () {
  if (window.rpgEngine) {
    window.rpgEngine.playRPGSequence([
      { n: "成員專用通道", t: "這扇門被緊緊鎖上了。門旁的石碑上刻著：「通道維護中，暫時封印。請靜待公會會長進一步的通知。」" }
    ]);
  }
};

// ====================================================
// 2. 冒險者訓練營 - 關卡載入與跳轉
// ====================================================
window.jumpToTrainingStage = function (chapterId) {
  if (window.uiManager && window.orchestrator) {
    // 備份主線進度，並標記為特訓練習模式，以保護主線存檔進度不被覆寫
    window.orchestrator.state.realChapter = window.orchestrator.state.currentChapter;
    window.orchestrator.state.isPractice = true;

    // 關閉當前 RPG 引擎
    if (window.rpgEngine) {
      window.rpgEngine.stop();
    }
    window.uiManager.hideOverlay();
    const gameMain = document.getElementById('game-main');
    if (gameMain) {
      gameMain.classList.remove('in-story');
    }

    console.log(`[Training] 正在載入歷史特訓關卡：${chapterId}`);
    window.orchestrator.state.currentChapter = chapterId;
    window.orchestrator.loadChapter(chapterId).then(() => {
      window.orchestrator.triggerPhase("SIMULATOR");

      // 動態注入「結束練習，返回城鎮」的懸浮退出按鈕，讓玩家隨時能安全退回主線
      const oldBtn = document.getElementById('practice-exit-btn');
      if (oldBtn) oldBtn.remove();

      const exitBtn = document.createElement('button');
      exitBtn.id = 'practice-exit-btn';
      exitBtn.style.position = 'fixed';
      exitBtn.style.bottom = '15px';
      exitBtn.style.left = '15px';
      exitBtn.style.zIndex = '99999';
      exitBtn.style.padding = '12px 20px';
      exitBtn.style.background = 'linear-gradient(135deg, #8b1e0f, #a02818)';
      exitBtn.style.border = '2px solid #ffd700';
      exitBtn.style.borderRadius = '30px';
      exitBtn.style.color = '#ffd700';
      exitBtn.style.fontWeight = 'bold';
      exitBtn.style.cursor = 'pointer';
      exitBtn.style.fontSize = '14px';
      exitBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
      exitBtn.style.transition = '0.2s';
      exitBtn.innerText = '🔙 結束特訓，返回城鎮';
      exitBtn.onclick = () => {
        exitBtn.remove();
        window.orchestrator.state.isPractice = false;
        if (window.orchestrator.state.realChapter) {
          window.orchestrator.state.currentChapter = window.orchestrator.state.realChapter;
        }
        window.orchestrator.triggerPhase("RPG_MODE");
      };

      exitBtn.onmouseover = () => {
        exitBtn.style.background = '#a02818';
        exitBtn.style.transform = 'scale(1.05)';
      };
      exitBtn.onmouseout = () => {
        exitBtn.style.background = '#8b1e0f';
        exitBtn.style.transform = 'none';
      };

      document.body.appendChild(exitBtn);
    });
  }
};

// ====================================================
// 3. 冒險者訓練營 - 教官選單展示
// ====================================================
window.openTrainingMenu = function () {
  // 移除舊的 modal (避免重複生成)
  const oldModal = document.getElementById('training-camp-modal');
  if (oldModal) oldModal.remove();

  // 定義所有主線與支線章節清單
  const stages = [
    { id: "10", name: "第一章：倉庫物資清單 (凍結頂端列 & 快速選取)" },
    { id: "15", name: "第一.五章：空間轉移與填滿柄" },
    { id: "20", name: "第二章：冒險裝備表 (斜線與填滿格式)" },
    { id: "25", name: "第二.五章：回憶名冊試煉" },
    { id: "30", name: "第三章：皇家旅客名冊 (定位條件與 Ctrl+Enter)" },
    { id: "35", name: "第三.五章：賽爾的離別留言" },
    { id: "40", name: "第四章：傷患名冊 (單欄排序與篩選)" },
    { id: "45", name: "第四.五章：重症排序與自訂序列" },
    { id: "50", name: "第五章：金穗鎮的舊帳 (分組小計與進階篩選)" },
    { id: "55", name: "第五.五章：金穗鎮皇家特助試煉" },
    { id: "60", name: "第六章：皇家國庫流水帳 (樞紐分析表建立)" },
    { id: "65", name: "第六.五章：樞紐分析折線圖" },
    { id: "70", name: "第七章：國庫總決算 (公式轉換與自動填滿)" },
    { id: "75", name: "第七.五章：國庫資料總歸檔試煉" },
    { id: "80", name: "第八章：終焉門扉的開啟" }
  ];

  const unlockedStages = stages;

  // 創建 Modal 遮罩
  const modal = document.createElement('div');
  modal.id = 'training-camp-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
  modal.style.zIndex = '15000';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.fontFamily = '"Microsoft JhengHei", sans-serif';

  // 創建卡片
  const card = document.createElement('div');
  card.style.width = '480px';
  card.style.maxHeight = '80vh';
  card.style.background = '#1e120a';
  card.style.border = '3px solid #c8a261';
  card.style.borderRadius = '10px';
  card.style.padding = '20px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.boxShadow = '0 0 25px rgba(200, 162, 97, 0.4)';
  card.style.color = '#e0d5c1';

  // 標題
  const title = document.createElement('h2');
  title.style.margin = '0 0 15px 0';
  title.style.textAlign = 'center';
  title.style.color = '#ffd700';
  title.style.fontSize = '20px';
  title.innerText = '⚔️ 訓練營模擬特訓';
  card.appendChild(title);

  // 提示文字
  const desc = document.createElement('p');
  desc.style.fontSize = '13px';
  desc.style.color = '#b0a490';
  desc.style.lineHeight = '1.6';
  desc.style.margin = '0 0 15px 0';
  desc.innerHTML = '教官：「欲速則不達，勇者大人。請選擇你要進行複習的特訓關卡，或者點擊按鈕直接開啟當前的考驗！」';
  card.appendChild(desc);

  // 滾動清單
  const listContainer = document.createElement('div');
  listContainer.style.flex = '1';
  listContainer.style.overflowY = 'auto';
  listContainer.style.display = 'flex';
  listContainer.style.flexDirection = 'column';
  listContainer.style.gap = '8px';
  listContainer.style.marginBottom = '20px';
  listContainer.style.paddingRight = '5px';

  unlockedStages.forEach(stage => {
    const btn = document.createElement('button');
    btn.className = 'rpg-teleport-btn';
    btn.style.width = '100%';
    btn.style.padding = '10px 12px';
    btn.style.textAlign = 'left';
    btn.style.background = '#2d1b0f';
    btn.style.border = '1px solid #5a3c26';
    btn.style.borderRadius = '5px';
    btn.style.color = '#e0d5c1';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    btn.style.transition = '0.2s';
    btn.innerText = stage.name;

    btn.onmouseover = () => {
      btn.style.background = '#4a2f1b';
      btn.style.borderColor = '#c8a261';
      btn.style.color = '#ffd700';
    };
    btn.onmouseout = () => {
      btn.style.background = '#2d1b0f';
      btn.style.borderColor = '#5a3c26';
      btn.style.color = '#e0d5c1';
    };

    btn.onclick = () => {
      modal.remove();
      window.jumpToTrainingStage(stage.id);
    };
    listContainer.appendChild(btn);
  });
  card.appendChild(listContainer);

  // 控制底欄
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.flexDirection = 'column';
  footer.style.gap = '10px';

  // 我想嘗試新挑戰按鈕
  const newChallengeBtn = document.createElement('button');
  newChallengeBtn.style.padding = '12px';
  newChallengeBtn.style.background = 'linear-gradient(135deg, #8b1e0f, #a02818)';
  newChallengeBtn.style.border = '2px solid #ffd700';
  newChallengeBtn.style.borderRadius = '6px';
  newChallengeBtn.style.color = '#ffd700';
  newChallengeBtn.style.fontWeight = 'bold';
  newChallengeBtn.style.cursor = 'pointer';
  newChallengeBtn.style.fontSize = '13px';
  newChallengeBtn.innerText = '🌟 我想嘗試新的挑戰！(Try Something New)';
  newChallengeBtn.onclick = () => {
    modal.remove();
    if (window.rpgEngine) {
      window.rpgEngine.playRPGSequence([
        { n: "訓練營教官", t: "「勇者大人，如果你想嘗試新的挑戰，請前往<b>【奧德賽公會大廳】</b>承接任務。接待員那邊可能會有新的試算表委託與冒險等著你！」" }
      ]);
    } else {
      alert("教官：「勇者大人，如果你想嘗試新的挑戰，請前往【奧德賽公會大廳】承接任務。那裡可能有新的試算表委託等著你！」");
    }
  };
  footer.appendChild(newChallengeBtn);

  // 關閉按鈕
  const closeBtn = document.createElement('button');
  closeBtn.style.padding = '8px';
  closeBtn.style.background = '#444';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '5px';
  closeBtn.style.color = '#fff';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '12px';
  closeBtn.innerText = '關閉 (Close)';
  closeBtn.onclick = () => modal.remove();
  footer.appendChild(closeBtn);

  card.appendChild(footer);
  modal.appendChild(card);
  document.body.appendChild(modal);
};

// ====================================================
// 4. 命名空間相容繫結 (Namespace Binds)
// ====================================================
window.openTrainingMenuNamespaceBind = function () {
  if (window.uiManager) {
    window.uiManager.openTrainingMenu = window.openTrainingMenu;
    window.uiManager.openMemberDoorMenu = window.openMemberDoorMenu;
  }
  if (window.rpgEngine) {
    window.rpgEngine.openTrainingMenu = window.openTrainingMenu;
    window.rpgEngine.openMemberDoorMenu = window.openMemberDoorMenu;
  }
};

// 立即執行與載入綁定
window.openTrainingMenuNamespaceBind();
window.addEventListener('load', window.openTrainingMenuNamespaceBind);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  window.openTrainingMenuNamespaceBind();
}
