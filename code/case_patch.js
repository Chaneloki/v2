/**
 * 全局資源路徑大小寫自動糾正補丁 (Case Sensitivity Auto-Healing Patch)
 * 解決 Windows 本地大小寫不敏感而線上 Linux 伺服器大小寫敏感導致的 404 資源加載錯誤。
 */
(function () {
  // 記錄代碼中所有大小寫不一致的引用路徑對應硬碟上正確的大小寫檔名
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

  // 自動糾正路徑大小寫的輔助函數
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

  // A. 攔截 Image.src 設定
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

  // B. 攔截 Audio/Media.src 設定 (用於 BGM、Sound Effects 預載)
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

  // C. 攔截 style.backgroundImage 設定
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

  // D. 額外攔截 setProperty
  const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(propertyName, value, priority) {
    if ((propertyName === 'background-image' || propertyName === 'backgroundImage') && typeof value === 'string') {
      value = fixPathCase(value);
    }
    return originalSetProperty.call(this, propertyName, value, priority);
  };
  
  console.log('[CasePatch] 全局大小寫自動糾正攔截器已成功啟動！');
})();
