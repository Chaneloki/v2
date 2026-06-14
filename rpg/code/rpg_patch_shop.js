/**
 * 道具屋與角色探索系統 Monkey Patch (自訂奇幻 RPG 版)
 * 處理商店場景重設、變身、金幣解鎖與鍵盤/滑鼠雙模控制選單。
 */
window.initShopMonkeyPatch = function () {
  if (window.RPG_MAPS && window.RPG_MAPS.shop_interior) {
    // 1. 更新商店地圖設定為無碰撞、合適尺寸、與新的靜態背景
    window.RPG_MAPS.shop_interior.bg = "rpg/bg/shop_interior.png";
    window.RPG_MAPS.shop_interior.width = 816;
    window.RPG_MAPS.shop_interior.height = 624;
    window.RPG_MAPS.shop_interior.spawnPoint = { x: 408, y: 312 };
    window.RPG_MAPS.shop_interior.walls = []; // 清空碰撞牆，因為不能走動
    window.RPG_MAPS.shop_interior.pois = [];  // 清空 POI 互動點，由進入地圖時自動觸發
  }

  // 2. 攔截 loadMap，進入商店時隱藏角色，並自動打開商店
  if (window.rpgEngine && !window.rpgEngine._originalLoadMap) {
    window.rpgEngine._originalLoadMap = window.rpgEngine.loadMap;
    window.rpgEngine.loadMap = function (mapId, spawnX, spawnY) {
      this._originalLoadMap(mapId, spawnX, spawnY);
      if (mapId === 'shop_interior') {
        if (this.playerEl) {
          this.playerEl.style.display = 'none';
        }
        setTimeout(() => {
          if (window.uiManager) {
            window.uiManager.openAvatarShop();
          }
        }, 150);
      } else {
        if (this.playerEl) {
          this.playerEl.style.display = 'block';
        }
      }
    };
  }

  // 3. 攔截 updateMovement，禁止在商店中移動，並處理角色圖片對應
  if (window.rpgEngine && !window.rpgEngine._originalUpdateMovement) {
    window.rpgEngine._originalUpdateMovement = window.rpgEngine.updateMovement;
    window.rpgEngine.updateMovement = function () {
      if (this.currentMapId === 'shop_interior') {
        return; // 商店內不允許走動
      }
      this._originalUpdateMovement();

      // 處理 prince 角色對應到 prince_boy 檔名的相容性
      const avatar = window.orchestrator?.state?.currentAvatar || 'main';
      if (avatar === 'prince') {
        const bgUrl = this.playerEl.style.backgroundImage;
        if (bgUrl && bgUrl.includes('rpg/charater/prince ')) {
          this.playerEl.style.backgroundImage = bgUrl.replace('rpg/charater/prince ', 'rpg/charater/prince_boy ');
        }
      }
    };
  }

  // 4. 攔截 closeAvatarShop，離開商店時自動傳送出店門口並移除鍵盤選單監聽
  if (window.uiManager && !window.uiManager._originalCloseAvatarShop) {
    window.uiManager._originalCloseAvatarShop = window.uiManager.closeAvatarShop;
    window.uiManager.closeAvatarShop = function () {
      this._originalCloseAvatarShop();
      if (window._shopKeyDownHandler) {
        window.removeEventListener('keydown', window._shopKeyDownHandler);
        window._shopKeyDownHandler = null;
      }
      if (window.rpgEngine && window.rpgEngine.currentMapId === 'shop_interior') {
        if (window.rpgEngine.container) {
          window.rpgEngine.container.style.transition = "opacity 0.3s";
          window.rpgEngine.container.style.opacity = '0';
          setTimeout(() => {
            window.rpgEngine.loadMap("street", 1875, 1300);
            window.rpgEngine.container.style.opacity = '1';
          }, 300);
        } else {
          window.rpgEngine.loadMap("street", 1875, 1300);
        }
      }
    };
  }

  // 5. 重寫 openAvatarShop，實現獨家羊皮紙 & 深木框奇幻 RPG 介面且支援鍵盤/滑鼠雙模操作
  if (window.uiManager) {
    window.uiManager.openAvatarShop = function () {
      let overlay = document.getElementById('avatar-shop-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'avatar-shop-overlay';
        overlay.className = 'sys-overlay-hide';
        // 配合 rpg-container 大小與定位，使用深色木質邊框
        overlay.style.position = 'absolute';
        overlay.style.width = '816px';
        overlay.style.height = '624px';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.zIndex = '999';
        overlay.style.border = '6px solid #5c4033';
        overlay.style.overflow = 'hidden';
        overlay.style.background = '#000';
        overlay.style.display = 'none';
        overlay.style.boxShadow = '0 0 30px rgba(0,0,0,0.9)';
        overlay.style.boxSizing = 'border-box';
        document.body.appendChild(overlay);
      }

      overlay.innerHTML = '';

      const shopContainer = document.createElement('div');
      shopContainer.style.width = '100%';
      shopContainer.style.height = '100%';
      shopContainer.style.background = '#2b1a0d'; // 深色基底
      shopContainer.style.display = 'flex';
      shopContainer.style.flexDirection = 'column';
      shopContainer.style.boxSizing = 'border-box';
      shopContainer.style.fontFamily = "'Courier New', Courier, monospace";
      shopContainer.style.color = '#382212'; // 復古羊皮紙深墨色
      shopContainer.style.imageRendering = 'pixelated';
      shopContainer.style.userSelect = 'none';

      // A. 上半部：商店立繪背景 (374px)
      const topDiv = document.createElement('div');
      topDiv.style.width = '100%';
      topDiv.style.height = '374px';
      topDiv.style.backgroundImage = "url('rpg/bg/shop_interior.png')";
      topDiv.style.backgroundSize = 'cover';
      topDiv.style.backgroundPosition = 'center';
      topDiv.style.borderBottom = '6px solid #5c4033';
      topDiv.style.boxSizing = 'border-box';

      // B. 下半部：對話框與選單 (242px) - 載入羊皮紙背景圖
      const bottomDiv = document.createElement('div');
      bottomDiv.style.width = '100%';
      bottomDiv.style.height = '242px';
      bottomDiv.style.display = 'flex';
      bottomDiv.style.backgroundImage = "url('rpg/bg/parchment_ui.png')";
      bottomDiv.style.backgroundSize = 'cover';
      bottomDiv.style.backgroundPosition = 'center';
      bottomDiv.style.boxSizing = 'border-box';
      bottomDiv.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.15)';

      // B1. 左側對話描述區
      const leftDiv = document.createElement('div');
      leftDiv.style.flex = '2.2';
      leftDiv.style.padding = '25px 30px';
      leftDiv.style.borderRight = '6px solid #5c4033';
      leftDiv.style.boxSizing = 'border-box';
      leftDiv.style.fontSize = '20px';
      leftDiv.style.textAlign = 'left';
      leftDiv.style.lineHeight = '1.8';
      leftDiv.style.overflowY = 'auto';
      leftDiv.style.color = '#382212';

      // B2. 右側主選單區
      const rightDiv = document.createElement('div');
      rightDiv.style.flex = '1';
      rightDiv.style.padding = '25px 20px';
      rightDiv.style.boxSizing = 'border-box';
      rightDiv.style.fontSize = '20px';
      rightDiv.style.display = 'flex';
      rightDiv.style.flexDirection = 'column';
      rightDiv.style.justifyContent = 'flex-start';
      rightDiv.style.gap = '15px';
      rightDiv.style.textAlign = 'left';
      rightDiv.style.color = '#382212';

      bottomDiv.appendChild(leftDiv);
      bottomDiv.appendChild(rightDiv);

      shopContainer.appendChild(topDiv);
      shopContainer.appendChild(bottomDiv);
      overlay.appendChild(shopContainer);

      let typingTimer = null;
      let activeMenuType = 'main'; // 'main', 'choose', 'talk', 'talk_back', 'dialog'
      let activeIndex = 0;
      let totalOptions = 3;

      // 復古打字機演出效果
      function showText(textLines, onComplete) {
        if (typingTimer) clearInterval(typingTimer);
        leftDiv.innerHTML = '';

        let lineIdx = 0;
        let charIdx = 0;

        textLines.forEach(() => {
          const p = document.createElement('div');
          p.style.marginBottom = '5px';
          p.style.fontWeight = 'bold';
          leftDiv.appendChild(p);
        });

        const paragraphs = leftDiv.children;

        function typeChar() {
          if (lineIdx >= textLines.length) {
            clearInterval(typingTimer);
            typingTimer = null;
            if (onComplete) onComplete();
            return;
          }

          const line = textLines[lineIdx];
          const p = paragraphs[lineIdx];

          if (charIdx < line.length) {
            p.textContent += line[charIdx];
            charIdx++;
          } else {
            lineIdx++;
            charIdx = 0;
          }
        }

        typingTimer = setInterval(typeChar, 25);
      }

      // 載入主選單
      function loadMainMenu() {
        activeMenuType = 'main';
        activeIndex = 0;
        totalOptions = 3;

        leftDiv.style.display = 'block';
        leftDiv.style.gridTemplateColumns = 'none';
        leftDiv.style.gridRowGap = '0';
        leftDiv.style.gridColumnGap = '0';

        showText([
          "* 歡迎來到奧德賽道具屋。",
          "* 請問有什麼我可以幫您的？"
        ]);

        rightDiv.innerHTML = '';

        const menuOptions = [
          { name: 'Choose', label: '選擇角色', action: () => loadChooseMenu() },
          { name: 'Talk', label: '與店主交談', action: () => loadTalkMenu() },
          { name: 'Exit', label: '離開商店', action: () => window.uiManager.closeAvatarShop() }
        ];

        menuOptions.forEach((opt, idx) => {
          const div = document.createElement('div');
          div.style.cursor = 'pointer';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.position = 'relative';
          div.style.paddingLeft = '24px';
          div.style.transition = 'color 0.2s';
          div.style.fontWeight = 'bold';

          div.innerHTML = `<span class="ut-heart" style="position: absolute; left: 0px; visibility: ${idx === 0 ? 'visible' : 'hidden'}; color: #b8860b; font-weight: bold; width: 14px; text-align: center;">✦</span><span>${opt.name}</span>`;

          if (idx === 0) {
            div.style.color = '#217346';
          }

          div._highlight = () => {
            activeIndex = idx;
            const hearts = rightDiv.querySelectorAll('.ut-heart');
            const options = rightDiv.children;
            hearts.forEach((h, hIdx) => {
              if (hIdx === idx) {
                h.style.visibility = 'visible';
                options[hIdx].style.color = '#217346';
              } else {
                h.style.visibility = 'hidden';
                options[hIdx].style.color = '#382212';
              }
            });
          };

          div.onmouseenter = div._highlight;
          div.onclick = opt.action;
          rightDiv.appendChild(div);
        });
      }

      // 載入角色更換選單
      function loadChooseMenu() {
        activeMenuType = 'choose';
        activeIndex = 0;
        totalOptions = 6;

        leftDiv.innerHTML = '';
        leftDiv.style.display = 'grid';
        leftDiv.style.gridTemplateColumns = '1fr 1fr';
        leftDiv.style.gridRowGap = '15px';
        leftDiv.style.gridColumnGap = '10px';
        leftDiv.style.alignContent = 'start';

        const state = window.orchestrator.state;
        const currentAvatar = state.currentAvatar || 'main';

        if (!state.unlockedAvatars) {
          state.unlockedAvatars = ['main'];
        }

        const avatarConfigs = {
          'main': { name: '主角', price: 0 },
          'miro': { name: '米羅', price: 0 },
          'chate': { name: '夏特', price: 0 },
          'glea': { name: '葛蕾', price: 0 },
          'prince': { name: '王子', price: 0 }
        };

        const avatars = [
          { id: 'main' },
          { id: 'miro' },
          { id: 'chate' },
          { id: 'glea' },
          { id: 'prince' },
          { id: 'back', name: '[返回]' }
        ];

        avatars.forEach((av, idx) => {
          const isBack = av.id === 'back';
          const config = isBack ? { name: av.name, price: 0 } : avatarConfigs[av.id];
          const isUnlocked = isBack || av.id === 'main' || state.unlockedAvatars.includes(av.id);
          const isActive = !isBack && (currentAvatar === av.id || (av.id === 'prince' && currentAvatar === 'prince_boy'));

          const div = document.createElement('div');
          div.style.cursor = 'pointer';
          div.style.fontSize = '18px';
          div.style.position = 'relative';
          div.style.paddingLeft = '24px';
          div.style.transition = 'color 0.2s';
          div.style.fontWeight = 'bold';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.height = '36px';

          let displayName = config.name;
          if (isActive) {
            displayName += ' (當前)';
          } else if (!isUnlocked && !isBack) {
            displayName += ` [🔒 💰 ${config.price} G]`;
          }

          div.innerHTML = `<span class="ut-left-heart" style="position: absolute; left: 0px; visibility: ${idx === 0 ? 'visible' : 'hidden'}; color: #b8860b; font-weight: bold; width: 14px; text-align: center;">✦</span><span>* ${displayName}</span>`;

          if (idx === 0) {
            div.style.color = '#217346';
          }

          div._highlight = () => {
            activeIndex = idx;
            const hearts = leftDiv.querySelectorAll('.ut-left-heart');
            const items = leftDiv.querySelectorAll('div');
            hearts.forEach((h, hIdx) => {
              if (hIdx === idx) {
                h.style.visibility = 'visible';
                items[hIdx].style.color = '#217346';
              } else {
                h.style.visibility = 'hidden';
                items[hIdx].style.color = '#382212';
              }
            });

            if (isBack) {
              rightDiv.innerHTML = `
                <div style="color: #664422; font-size: 14px; line-height: 1.5; font-weight: bold;">
                  * 返回主選單。<br><br>
                  * 點擊或 Enter 鍵即可回到上一層。
                </div>
              `;
            } else {
              if (isUnlocked) {
                rightDiv.innerHTML = `
                  <div style="color: #664422; font-size: 14px; line-height: 1.5; font-weight: bold;">
                    * 角色：${config.name}<br><br>
                    * 狀態：已解鎖 (${isActive ? '出戰中' : '休息中'})<br><br>
                    * 點擊或 Enter 鍵即可變身為此角色進行自由探索。
                  </div>
                `;
              } else {
                rightDiv.innerHTML = `
                  <div style="color: #664422; font-size: 14px; line-height: 1.5; font-weight: bold;">
                    * 角色：${config.name}<br><br>
                    * 狀態：🔒 尚未解鎖<br><br>
                    * 解鎖價格：${config.price} G<br><br>
                    * 點擊或 Enter 鍵花費金幣解鎖此角色！
                  </div>
                `;
              }
            }
          };

          div.onmouseenter = div._highlight;

          div.onclick = () => {
            if (isBack) {
              loadMainMenu();
            } else if (!isUnlocked) {
              const price = config.price;
              const userCoins = state.coins || 0;

              if (userCoins < price) {
                leftDiv.style.display = 'block';
                leftDiv.style.gridTemplateColumns = 'none';
                showText([
                  `* 您的金幣不足！`,
                  `* 擁有金幣: ${userCoins} G | 需要金幣: ${price} G`,
                  `* 請先前往公會完成委託賺取酬勞。`
                ], () => {
                  setTimeout(() => loadChooseMenu(), 2500);
                });
              } else {
                if (confirm(`確定要花費 ${price} G 購買並解鎖「${config.name}」角色造型嗎？`)) {
                  state.coins -= price;
                  state.unlockedAvatars.push(av.id);
                  window.orchestrator.saveGame();

                  const topCoins = document.getElementById('coin-count');
                  if (topCoins) {
                    topCoins.innerText = state.coins;
                  }

                  leftDiv.style.display = 'block';
                  leftDiv.style.gridTemplateColumns = 'none';
                  showText([
                    `* 成功支付了 ${price} G！`,
                    `* 已順利解鎖夥伴 [${config.name}]。`
                  ], () => {
                    setTimeout(() => loadChooseMenu(), 1500);
                  });
                }
              }
            } else {
              state.currentAvatar = av.id;
              window.orchestrator.saveGame();

              leftDiv.style.display = 'block';
              leftDiv.style.gridTemplateColumns = 'none';

              showText([
                `* 已成功變身為 ${config.name}！`,
                `* 現在您可以使用這個身份在街道探索了。`
              ], () => {
                setTimeout(() => loadChooseMenu(), 1200);
              });
            }
          };

          leftDiv.appendChild(div);
        });

        rightDiv.innerHTML = `
          <div style="color: #664422; font-size: 14px; line-height: 1.5; font-weight: bold;">
            * 角色更換面板<br><br>
            * 請點擊左側角色名稱進行解鎖或變更。<br><br>
            * 點擊 [返回] 回到主選單。
          </div>
        `;
      }

      // 載入交談主題選單
      function loadTalkMenu() {
        activeMenuType = 'talk';
        activeIndex = 0;
        totalOptions = 3;

        leftDiv.innerHTML = '';
        leftDiv.style.display = 'block';
        leftDiv.style.gridTemplateColumns = 'none';

        const topics = [
          {
            title: '關於這間商店',
            dialogue: [
              "* 老闆娘：「這裡是奧德賽公會特設的角色調度中心。」",
              "* 「冒險者可以用這個面板切換不同的夥伴。」",
              "* 「這樣就能體驗大家的特長 and 冒險本領了。」"
            ]
          },
          {
            title: '關於角色彩蛋',
            dialogue: [
              "* 老闆娘：「聽說那些夥伴們對城鎮的各個地標有不同的想法。」",
              "* 「比如米羅喜歡對建築配色指點山，葛瑞對研究所很感興趣。」",
              "* 「切換角色後去街道的各大門口點點看，會有特別收穫哦。」"
            ]
          },
          {
            title: '[返回]',
            action: () => loadMainMenu()
          }
        ];

        topics.forEach((topic, idx) => {
          const div = document.createElement('div');
          div.style.cursor = 'pointer';
          div.style.marginBottom = '15px';
          div.style.position = 'relative';
          div.style.paddingLeft = '24px';
          div.style.transition = 'color 0.2s';
          div.style.fontWeight = 'bold';
          div.style.display = 'flex';
          div.style.alignItems = 'center';

          div.innerHTML = `<span class="ut-talk-heart" style="position: absolute; left: 0px; visibility: ${idx === 0 ? 'visible' : 'hidden'}; color: #b8860b; font-weight: bold; width: 14px; text-align: center;">✦</span><span>* ${topic.title}</span>`;

          if (idx === 0) {
            div.style.color = '#217346';
          }

          div._highlight = () => {
            activeIndex = idx;
            const hearts = leftDiv.querySelectorAll('.ut-talk-heart');
            const items = leftDiv.querySelectorAll('div');
            hearts.forEach((h, hIdx) => {
              if (hIdx === idx) {
                h.style.visibility = 'visible';
                items[hIdx].style.color = '#217346';
              } else {
                h.style.visibility = 'hidden';
                items[hIdx].style.color = '#382212';
              }
            });
          };

          div.onmouseenter = div._highlight;

          div.onclick = () => {
            if (topic.action) {
              topic.action();
            } else {
              activeMenuType = 'dialog';

              showText(topic.dialogue, () => {
                const backHint = document.createElement('div');
                backHint.style.marginTop = '15px';
                backHint.style.color = '#217346';
                backHint.style.fontSize = '14px';
                backHint.style.cursor = 'pointer';
                backHint.style.fontWeight = 'bold';
                backHint.textContent = "[ 點擊此處或 Enter 返回交談選單 ]";

                backHint._highlight = () => {
                  backHint.style.color = '#ffd700';
                };
                backHint.onmouseenter = backHint._highlight;
                backHint.onmouseout = () => {
                  backHint.style.color = '#217346';
                };

                backHint.onclick = (e) => {
                  e.stopPropagation();
                  loadTalkMenu();
                };
                leftDiv.appendChild(backHint);

                activeIndex = 0;
                totalOptions = 1;
                activeMenuType = 'talk_back';
              });
            }
          };

          leftDiv.appendChild(div);
        });

        rightDiv.innerHTML = `
          <div style="color: #664422; font-size: 14px; line-height: 1.5; font-weight: bold;">
            * 與店主交談<br><br>
            * 請點擊左側對話主題打聽情報。<br><br>
            * 按 Esc 返回主選單。
          </div>
        `;
      }

      // --- 鍵盤控制高亮與觸發輔助 ---
      function highlightOption(idx) {
        if (activeMenuType === 'main') {
          if (rightDiv.children[idx] && rightDiv.children[idx]._highlight) {
            rightDiv.children[idx]._highlight();
          }
        } else if (activeMenuType === 'choose' || activeMenuType === 'talk') {
          if (leftDiv.children[idx] && leftDiv.children[idx]._highlight) {
            leftDiv.children[idx]._highlight();
          }
        } else if (activeMenuType === 'talk_back') {
          const backHint = leftDiv.querySelector('div:last-child');
          if (backHint && backHint._highlight) backHint._highlight();
        }
      }

      function triggerOption(idx) {
        if (activeMenuType === 'main') {
          if (rightDiv.children[idx]) rightDiv.children[idx].click();
        } else if (activeMenuType === 'choose' || activeMenuType === 'talk') {
          if (leftDiv.children[idx]) leftDiv.children[idx].click();
        } else if (activeMenuType === 'talk_back') {
          const backHint = leftDiv.querySelector('div:last-child');
          if (backHint) backHint.click();
        }
      }

      const handleShopKeyDown = (e) => {
        if (overlay.style.display === 'none') return;

        const key = e.key.toLowerCase();

        if (key === 'w' || key === 'arrowup') {
          e.preventDefault();
          if (activeMenuType === 'dialog') return;
          activeIndex = (activeIndex - 1 + totalOptions) % totalOptions;
          highlightOption(activeIndex);
        } else if (key === 's' || key === 'arrowdown') {
          e.preventDefault();
          if (activeMenuType === 'dialog') return;
          activeIndex = (activeIndex + 1) % totalOptions;
          highlightOption(activeIndex);
        } else if (key === 'enter' || key === ' ') {
          e.preventDefault();
          triggerOption(activeIndex);
        } else if (key === 'escape') {
          e.preventDefault();
          if (activeMenuType === 'dialog') return;
          if (activeMenuType !== 'main') {
            loadMainMenu();
          } else {
            window.uiManager.closeAvatarShop();
          }
        }
      };

      // 註冊全域監聽器，確保不重複
      window.removeEventListener('keydown', window._shopKeyDownHandler);
      window._shopKeyDownHandler = handleShopKeyDown;
      window.addEventListener('keydown', window._shopKeyDownHandler);

      // 顯示選單
      overlay.style.display = 'block';
      void overlay.offsetWidth;
      overlay.classList.remove('sys-overlay-hide');
      overlay.classList.add('sys-overlay-show');

      loadMainMenu();
    };
  }
};

// 立即執行一次 Patch
window.initShopMonkeyPatch();

// 在 load 事件時與命名空間綁定同步再次執行，以防載入順序問題
window.addEventListener('load', window.initShopMonkeyPatch);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  window.initShopMonkeyPatch();
}
