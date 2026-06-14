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

// ====================================================
// 2. RPG 除錯視覺輔助切換系統 (Red Walls & POI Show/Hide Toggle)
// ====================================================
window.rpgDebugVisuals = true; // 預設開啟除錯顯示

window.applyRPGDebugVisuals = function () {
  if (!window.rpgEngine || !window.rpgEngine.worldEl) return;
  const show = window.rpgDebugVisuals;

  // A. 切換紅色空氣牆顯示
  const divs = window.rpgEngine.worldEl.querySelectorAll('div');
  divs.forEach(div => {
    const isRedBG = div.style.backgroundColor && div.style.backgroundColor.includes('rgba(255, 0, 0');
    const isRedBorder = div.style.border && div.style.border.includes('red');
    if (isRedBG || isRedBorder) {
      div.style.display = show ? 'block' : 'none';
    }
  });

  // B. 切換 POI 標記顯示 (隱藏 icon 與文字，但保留碰撞和 Enter 互動功能)
  const pois = window.rpgEngine.worldEl.querySelectorAll('.rpg-poi');
  pois.forEach(poi => {
    poi.style.opacity = show ? '1' : '0';
    poi.style.pointerEvents = show ? 'auto' : 'none'; // 隱藏時不可滑鼠點擊，防穿透，只能走路接近按 Enter 互動
  });

  // C. 更新右上角 UI 按鈕文字
  const toggleBtn = document.getElementById('rpg-debug-toggle-btn');
  if (toggleBtn) {
    toggleBtn.innerText = show ? '👁️ 除錯模式: 開' : '🙈 除錯模式: 關';
    toggleBtn.style.background = show ? '#ffd700' : '#444';
    toggleBtn.style.color = show ? '#000' : '#fff';
  }
};

window.toggleRPGDebugVisuals = function () {
  window.rpgDebugVisuals = !window.rpgDebugVisuals;
  window.applyRPGDebugVisuals();

  // 顯示 Toast 提醒玩家
  if (window.uiManager && typeof window.uiManager.showMagicToast === 'function') {
    window.uiManager.showMagicToast(
      window.rpgDebugVisuals 
        ? "👁️ 已開啟除錯模式 (顯示空氣牆與 POI)" 
        : "🙈 已開啟實機遊玩模式 (已隱藏空氣牆與 POI)"
    );
  }
};

window.initHideRedWallsPatch = function () {
  if (window.rpgEngine) {
    if (window.rpgEngine._isHideRedWallsPatched) return;
    window.rpgEngine._isHideRedWallsPatched = true;

    // 1. 攔截 buildMap，使每次建置地圖時都自動套用當前的顯示設定
    const originalBuildMap = window.rpgEngine.buildMap;
    window.rpgEngine.buildMap = function () {
      originalBuildMap.call(this);
      window.applyRPGDebugVisuals();
    };

    // 2. 在右上角除錯面板動態插入 Toggle 按鈕
    const insertToggleBtn = () => {
      const debugInfo = document.getElementById('rpg-debug-info');
      if (debugInfo && !document.getElementById('rpg-debug-toggle-btn')) {
        // 將面板 pointer-events 設為 auto 以便點擊
        debugInfo.style.pointerEvents = 'auto';

        const btn = document.createElement('button');
        btn.id = 'rpg-debug-toggle-btn';
        btn.style.marginTop = '6px';
        btn.style.padding = '4px 8px';
        btn.style.background = '#ffd700';
        btn.style.color = '#000';
        btn.style.border = '1px solid #ffd700';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '10px';
        btn.style.transition = '0.2s';
        btn.innerText = '👁️ 除錯模式: 開';
        btn.onclick = () => window.toggleRPGDebugVisuals();
        debugInfo.appendChild(btn);
      }
    };

    insertToggleBtn();
    window.applyRPGDebugVisuals();
  }
};

// 立即執行與載入事件監聽
window.initHideRedWallsPatch();
window.addEventListener('load', () => {
  window.initHideRedWallsPatch();
  // 註冊全域按鍵監聽：在 RPG 探索時按 H 鍵切換除錯顯示
  window.addEventListener('keydown', (e) => {
    if (!window.rpgEngine || !window.rpgEngine.isActive) return;
    if (e.key.toLowerCase() === 'h' && !window.rpgEngine.state.inDialog) {
      e.preventDefault();
      window.toggleRPGDebugVisuals();
    }
  });
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  window.initHideRedWallsPatch();
}

// ====================================================
// 3. 全局大小寫不敏感資源路徑修正補丁 (Case Sensitivity Auto-Healing Patch)
// ====================================================
(function () {
  const pathCaseMap = {
    "cg/ch1 main.png": "CG/ch1 main.png",
    "charater/魔導書.png": "Charater/魔導書.png",
    "cg/ch1.png": "CG/ch1.png",
    "cg/ch2.5 read.png": "CG/Ch2.5 read.png",
    "cg/ch2.png": "CG/ch2.png",
    "cg/ch3 sick.png": "CG/Ch3 sick.png",
    "cg/ch4.5 conflict.png": "CG/Ch4.5 conflict.png",
    "cg/ch4 royi.png": "CG/Ch4 royi.png",
    "cg/ch4 all.png": "CG/Ch4 all.png",
    "cg/ch5 childhood.png": "CG/Ch5 childhood.png",
    "cg/ch3 two.png": "CG/ch3 two.png"
  };

  function fixPathCase(url) {
    if (!url || typeof url !== 'string') return url;
    let lowerUrl = url.toLowerCase();
    for (let key in pathCaseMap) {
      if (lowerUrl.includes(key)) {
        let index = lowerUrl.indexOf(key);
        let prefix = url.substring(0, index);
        let suffix = url.substring(index + key.length);
        return prefix + pathCaseMap[key] + suffix;
      }
    }
    return url;
  }

  // A. 攔截 Image.src 的設定
  const originalImageSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (originalImageSrcDescriptor) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      get: function() {
        return originalImageSrcDescriptor.get.call(this);
      },
      set: function(val) {
        if (typeof val === 'string') {
          val = fixPathCase(val);
        }
        originalImageSrcDescriptor.set.call(this, val);
      }
    });
  }

  // B. 攔截 Audio.src 的設定 (用於 BGM/SE)
  const originalAudioSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (originalAudioSrcDescriptor) {
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      get: function() {
        return originalAudioSrcDescriptor.get.call(this);
      },
      set: function(val) {
        if (typeof val === 'string') {
          val = fixPathCase(val);
        }
        originalAudioSrcDescriptor.set.call(this, val);
      }
    });
  }

  // C. 攔截 style.backgroundImage 的設定
  const originalBgImageDescriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'backgroundImage') 
      || Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'background-image');
  if (originalBgImageDescriptor) {
    Object.defineProperty(CSSStyleDeclaration.prototype, 'backgroundImage', {
      get: function() {
        return originalBgImageDescriptor.get.call(this);
      },
      set: function(val) {
        if (typeof val === 'string') {
          val = fixPathCase(val);
        }
        originalBgImageDescriptor.set.call(this, val);
      }
    });
  }

  // 額外攔截 setProperty
  const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(propertyName, value, priority) {
    if ((propertyName === 'background-image' || propertyName === 'backgroundImage') && typeof value === 'string') {
      value = fixPathCase(value);
    }
    return originalSetProperty.call(this, propertyName, value, priority);
  };
})();
