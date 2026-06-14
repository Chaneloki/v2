/**
 * RPG æ¨¡å??ªç”±ä»»å?å¼•æ? (rpg_mission_engine.js)
 * è² è²¬ä»»å?å°è©±?”æˆª?ç?é¡Œè§£?–æ??¶ã€Excel ?äº¤?‰é??‡ä»»?™ç??‹æ?ä¹…å??? */

(function () {
    console.log("?? [rpg_mission_engine.js] ä»»å?å¼•æ?è¼‰å…¥ä¸?..");

    // æ³¨å…¥?¤é¢¨?‡ç¾ä»???€?Ÿè??ˆç?ç­”é? Modal æ¨??
    const style = document.createElement('style');
    style.innerHTML = `
        .quiz-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Microsoft JhengHei', sans-serif;
        }
        .quiz-card {
            width: 500px;
            background: #1a0f0a;
            border: 3px solid #c8a261;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 0 30px rgba(200, 162, 97, 0.4);
            color: #e0d5c1;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .quiz-title {
            text-align: center;
            color: #ffd700;
            font-size: 20px;
            font-weight: bold;
            border-bottom: 2px dashed #c8a261;
            padding-bottom: 12px;
            margin: 0;
        }
        .quiz-question {
            font-size: 15px;
            line-height: 1.6;
            color: #ffd700;
        }
        .quiz-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .quiz-opt-btn {
            width: 100%;
            padding: 12px 16px;
            background: #2d1b0f;
            border: 1px solid #5a3c26;
            border-radius: 6px;
            color: #e0d5c1;
            text-align: left;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .quiz-opt-btn:hover {
            background: #4a2f1b;
            border-color: #c8a261;
            color: #ffd700;
            transform: translateX(6px);
        }
        .quiz-feedback {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            min-height: 20px;
        }
    `;
    document.head.appendChild(style);

    // ä»»å?ç®¡ç??©ä»¶
    const MissionEngine = {
        // ?å??–ç???(?¥ç„¡?‡å‰µç«‹ç©º?€??
        initStates() {
            const state = window.orchestrator?.state;
            if (state) {
                if (state.activeMissionId === undefined) state.activeMissionId = null;
                if (state.activeMissionStep === undefined) state.activeMissionStep = null;
            }
        },

        // ?‹å??¿æ¥ä»»å?
        startMission(missionId) {
            this.initStates();
            const state = window.orchestrator.state;
            const mission = window.FREE_MISSIONS[missionId];
            if (!mission) return;

            state.activeMissionId = missionId;
            state.activeMissionStep = "counter_pickup";
            window.orchestrator.saveGame();

            // ?­æ”¾?¥å?å°è©±
            if (window.rpgEngine) {
                window.rpgEngine.playRPGSequence(mission.counter_pickup, () => {
                    state.activeMissionStep = "training_arrive";
                    window.orchestrator.saveGame();
                    this.showSystemToast("?“¬ ?¥å?å§”è?ï¼šè?ç·´ç?è¨˜é?å¤±è¹¤æ¡?);
                });
            }
        },

        // å±•ç¤ºç³»çµ±?ç¤ºå½ˆç?
        showSystemToast(msg) {
            if (window.uiManager && typeof window.uiManager.showMagicToast === 'function') {
                window.uiManager.showMagicToast(msg);
            } else {
                alert(msg);
            }
        },

        // ?¼å«ç­”é?è§??å½ˆç?
        showQuiz(taskId, onCorrect) {
            const missionId = window.orchestrator.state.activeMissionId;
            const mission = window.FREE_MISSIONS[missionId];
            const taskCfg = mission?.tasks[taskId];
            if (!taskCfg) return;

            const quiz = taskCfg.quiz;

            // å»ºç? DOM
            const overlay = document.createElement('div');
            overlay.className = 'quiz-modal-overlay';
            overlay.id = 'quiz-modal';

            const card = document.createElement('div');
            card.className = 'quiz-card';

            const title = document.createElement('h3');
            title.className = 'quiz-title';
            title.innerText = '?”® è©¦ç?è¡¨å…¬å¼è§£å¯?;
            card.appendChild(title);

            const qText = document.createElement('div');
            qText.className = 'quiz-question';
            qText.innerText = quiz.question;
            card.appendChild(qText);

            const optsContainer = document.createElement('div');
            optsContainer.className = 'quiz-options';

            quiz.options.forEach((optText, index) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-opt-btn';
                btn.innerText = optText;
                btn.onclick = () => {
                    if (index === quiz.correctIndex) {
                        // ?­æ”¾è§???³æ? click up.mp3
                        if (window.uiManager) {
                            window.uiManager.playSFX('click up.mp3');
                        }
                        feedback.style.color = '#2ed573';
                        feedback.innerText = '??è§???å?ï¼é??›é€šè·¯å·²è§£?–ï?';
                        // ç¦ç”¨?‰é??²æ­¢?è?é»æ?
                        optsContainer.querySelectorAll('button').forEach(b => b.disabled = true);

                        setTimeout(() => {
                            overlay.remove();
                            onCorrect();
                        }, 1200);
                    } else {
                        // ?­æ”¾?¯èª¤?³æ??–æ???                        if (window.uiManager) {
                            window.uiManager.playSFX('fail.mp3');
                        }
                        feedback.style.color = '#ff4757';
                        feedback.innerText = '??é­”å?æµå??—é˜»ï¼Œå…¬å¼ä?å¤ªå??”ï??æƒ³ä¸€?³ï?';
                        card.classList.add('shake');
                        setTimeout(() => card.classList.remove('shake'), 500);
                    }
                };
                optsContainer.appendChild(btn);
            });
            card.appendChild(optsContainer);

            const feedback = document.createElement('div');
            feedback.className = 'quiz-feedback';
            card.appendChild(feedback);

            overlay.appendChild(card);
            document.body.appendChild(overlay);
        },

        // ?Ÿå? Excel ä»»å??œå¡
        loadExcelTask(taskId) {
            const state = window.orchestrator.state;
            const missionId = state.activeMissionId;
            const mission = window.FREE_MISSIONS[missionId];
            const taskCfg = mission?.tasks[taskId];
            if (!taskCfg) return;

            // ?œé? RPG
            if (window.rpgEngine) {
                window.rpgEngine.stop();
            }

            // ?™ä»½ä¸»ç??‡æ?è¨˜ä»»?™æ¨¡å¼?            state.realChapter = state.currentChapter;
            state.isPractice = true; // ?©ç”¨ç·´ç?æ¨¡å??²è?å¯?            state.isMissionExcel = true;
            state.activeMissionTaskId = taskId;

            // ?«æ??±è?è§???‰é?
            const simConfig = JSON.parse(JSON.stringify(taskCfg.simulator));
            simConfig.tasks[0].unlockBtnId = null;

            // è¨»å??œå¡?‡åˆ¤å®šæ?ä»?            window.orchestrator.state.activeChapterModule = simConfig;
            window.orchestrator.state.sheets = {
                "st-1": JSON.parse(JSON.stringify(simConfig.initialGridData))
            };
            window.orchestrator.state.sheetNames = {
                "st-1": simConfig.meta.sheetName
            };
            window.orchestrator.skillDefs = Object.assign({}, simConfig.skillDefs);

            // ?Ÿå?ç­”é? Modal
            this.showQuiz(taskId, () => {
                // ç­”å?å¾Œï?å°‡è§£?–æ??•å??€?½æ­£å¼å¯«?¥ç•¶?ç???                simConfig.tasks[0].unlockBtnId = taskCfg.quiz.unlockBtnId;
                state.unlockedSkills.push(taskCfg.quiz.unlockSkillId);

                // æ¸²æ? Excel ?Œé¢
                window.orchestrator.triggerPhase('SIMULATOR');
                this.showSystemToast(`?? ?å??šé???{simConfig.skillDefs[taskCfg.quiz.unlockSkillId]?.n || 'ç¦è?'}?å·¥?·ï?`);
                
                // ?•æ?æ³¨å…¥?äº¤?‰é??‡é?è¼?Ribbon
                setTimeout(() => {
                    this.injectSubmitButton(taskCfg);
                }, 200);
            });
        },

        // ?¼å·¦??Sidebar å°å¸«æ³¡æ³¡æ³¨å…¥?äº¤?æ??‰é?
        injectSubmitButton(taskCfg) {
            const bubble = document.getElementById('elf-bubble');
            if (!bubble) return;

            // ç§»é™¤?Šç??äº¤?‰é? (å¦‚æ?)
            const oldBtn = document.getElementById('btn-mission-submit');
            if (oldBtn) oldBtn.remove();

            // ä¿®æ”¹å°å¸«?‡å­¸?¡æ?å­—ç‚ºä»»å??è¿°
            const eT = document.getElementById('e-t');
            const tT = document.getElementById('t-t');
            if (eT) eT.innerHTML = taskCfg.tutorHint;
            if (tT) tT.innerHTML = taskCfg.playerText;

            // ?±è??è¨­??next ?‰é?
            const defaultNextBtn = document.getElementById('btn-game-next');
            if (defaultNextBtn) defaultNextBtn.style.display = 'none';

            // ?µå»º?æ??äº¤?‰é?
            const submitBtn = document.createElement('button');
            submitBtn.id = 'btn-mission-submit';
            submitBtn.className = 'rpg-btn';
            submitBtn.style.width = '100%';
            submitBtn.style.marginTop = '15px';
            submitBtn.style.padding = '10px 12px';
            submitBtn.style.background = 'linear-gradient(135deg, #1f613d, #278c54)';
            submitBtn.style.border = '2px solid #ffd700';
            submitBtn.style.borderRadius = '6px';
            submitBtn.style.color = '#fff';
            submitBtn.style.fontWeight = 'bold';
            submitBtn.style.cursor = 'pointer';
            submitBtn.innerText = '?¯ ?äº¤æ¯”å??æ?';

            submitBtn.onclick = () => {
                const state = window.orchestrator.state;
                if (taskCfg.checkCondition(state)) {
                    // ç­”å?äº†ï?
                    if (window.uiManager) {
                        window.uiManager.playSFX('success.mp3');
                    }
                    this.showSystemToast("?? ?æ?æ¯”å?æ­?¢ºï¼?);
                    
                    // æ¸…ç?ä»»å? Excel æ¨¡å?ä¸¦å??€
                    submitBtn.remove();
                    state.isPractice = false;
                    state.isMissionExcel = false;
                    if (state.realChapter) {
                        state.currentChapter = state.realChapter;
                    }

                    // ?€??RPG
                    window.orchestrator.triggerPhase('RPG_MODE');

                    // ä¾æ?æ­¥é??¨é€²å??‰ç?å®Œæ?å°è©±
                    setTimeout(() => {
                        this.handleExcelSuccessCallback(state.activeMissionTaskId);
                    }, 400);
                } else {
                    // ç­”éŒ¯äº†ï?
                    if (window.uiManager) {
                        window.uiManager.playSFX('fail.mp3');
                    }
                    this.showSystemToast("???æ?å°šæœªé½Šå?...");
                    alert(taskCfg.failFeedback);
                }
            };

            bubble.appendChild(submitBtn);
        },

        // Excel å®Œæ?å¾Œç? RPG å°ç™½?èª¿
        handleExcelSuccessCallback(taskId) {
            const state = window.orchestrator.state;
            const mission = window.FREE_MISSIONS[state.activeMissionId];
            if (!mission) return;

            if (taskId === "library_excel") {
                state.activeMissionStep = "library_excel_complete";
                window.orchestrator.saveGame();
                if (window.rpgEngine) {
                    window.rpgEngine.playRPGSequence(mission.library_excel_complete, () => {
                        state.activeMissionStep = "lab_door";
                        window.orchestrator.saveGame();
                    });
                }
            } else if (taskId === "lab_excel") {
                state.activeMissionStep = "lab_excel_complete";
                window.orchestrator.saveGame();
                if (window.rpgEngine) {
                    window.rpgEngine.playRPGSequence(mission.lab_excel_complete, () => {
                        state.activeMissionStep = "lab_door_approved";
                        window.orchestrator.saveGame();
                    });
                }
            } else if (taskId === "format_excel") {
                state.activeMissionStep = "library_format_complete";
                window.orchestrator.saveGame();
                if (window.rpgEngine) {
                    window.rpgEngine.playRPGSequence(mission.library_format_complete, () => {
                        state.activeMissionStep = "training_return";
                        window.orchestrator.saveGame();
                    });
                }
            }
        }
    };

    // å°å‡º?¨å?è®Šæ•¸
    window.rpgMissions = MissionEngine;

    // ====================================================
    // 4. Monkey Patch è£é£¾ rpgEngine.interactWith
    // ====================================================
    window.addEventListener('load', () => {
        if (!window.rpgEngine) return;
        
        // ä¿ç??Ÿæ–¹æ³?        window.rpgEngine._originalInteractWith = window.rpgEngine.interactWith;

        window.rpgEngine.interactWith = function (poi) {
            const state = window.orchestrator?.state;
            if (!state) return;

            // ?¶é??Šæ¥å¾…å“¡æ«ƒå°ä¸”æ??‰é€²è?ä¸­ç?ä»»å??‚ï??ä?ä»»å??¿æ¥?¸é?
            if (poi.id === "mission" && !state.activeMissionId) {
                // å¦‚æ?ä»»å?å·²ç?å®Œæ?ï¼ˆå·²è§???”ç©¶?€?šè?æ¬Šé?ï¼?                if (state.flags && state.flags["unlocked_lab"]) {
                    this.state.inDialog = true;
                    this.hintEl.style.display = 'none';
                    this.dialogEl.style.display = 'block';
                    if (this.dAvatar) this.dAvatar.style.display = 'none';
                    this.dTitle.innerText = `??${poi.name}`;
                    this.dText.innerHTML = "?Œæ‚¨å·²ç?å®Œæ?äº†è?ç·´ç??„å?è¨—ï??®å?æ²’æ??¶ä??¯ä»¥?¿æ¥?„è‡ª?±ä»»?™å??‚ã€?;
                    return;
                }

                // å½ˆå‡ºä»»å??¿æ¥ç¢ºè?å°è©±
                this.state.inDialog = true;
                this.hintEl.style.display = 'none';
                this.dialogEl.style.display = 'block';
                if (this.dAvatar) this.dAvatar.style.display = 'none';
                this.dTitle.innerText = `??${poi.name}`;
                this.dText.innerHTML = `?Œå??ªè€…ï??™è£¡?‰ä?ä»½ä??ªè?ç·´ç??„è‡ª?±å?è¨—ï?<b>?è?ç·´ç?è¨˜é?å¤±è¹¤æ¡ˆã€?/b>??br>?¨æ˜¯?¦è??¿æ¥?™é?å§”è?ï¼Ÿã€?br><br>
                <div style="margin-top: 10px; display: flex; gap: 15px; justify-content: center;">
                    <button id="btn-accept-mission" style="padding: 6px 15px; background: #278c54; border: 1px solid #ffd700; color: #fff; font-weight: bold; cursor: pointer; border-radius: 4px;">?¥å?å§”è?</button>
                    <button id="btn-decline-mission" style="padding: 6px 15px; background: #522; border: 1px solid #ccc; color: #fff; font-weight: bold; cursor: pointer; border-radius: 4px;">?«æ?ä¸è?</button>
                </div>`;
                
                // ç¶å??‰é?é»æ?äº‹ä»¶
                setTimeout(() => {
                    const acceptBtn = document.getElementById('btn-accept-mission');
                    const declineBtn = document.getElementById('btn-decline-mission');
                    if (acceptBtn) {
                        acceptBtn.onclick = () => {
                            this.dialogEl.style.display = 'none';
                            this.state.inDialog = false;
                            window.rpgMissions.startMission("training_records");
                        };
                    }
                    if (declineBtn) {
                        declineBtn.onclick = () => {
                            this.dialogEl.style.display = 'none';
                            this.state.inDialog = false;
                        };
                    }
                }, 50);
                return;
            }

            if (!state.activeMissionId) {
                // ?¡ä»»?™ç??‹èµ°?Ÿç??è¼¯
                return this._originalInteractWith(poi);
            }

            const mission = window.FREE_MISSIONS[state.activeMissionId];
            const step = state.activeMissionStep;

            // 1. ?¬æ?å¤§å»³ - ?¥å??¡æ???            if (poi.id === "mission" && state.activeMissionId === "training_records") {
                if (step === "counter_pickup") {
                    // ?¥å?ä»»å?
                    this.state.inDialog = true;
                    this.hintEl.style.display = 'none';
                    this.dialogEl.style.display = 'block';
                    window.rpgMissions.startMission("training_records");
                    return;
                }
                if (step === "counter_complete") {
                    // å®Œæ?çµç?
                    this.playRPGSequence(mission.counter_complete, () => {
                        // è§?? Flag æ°¸ä??²å…¥?”ç©¶?€
                        state.flags[mission.unlocksFlag] = true;
                        state.activeMissionId = null;
                        state.activeMissionStep = null;
                        window.orchestrator.saveGame();
                        window.rpgMissions.showSystemToast("?? å§”è??†åˆ©å®Œæ?ï¼ç?ç§˜ç?ç©¶æ??šè?æ¬Šé?å·²æ°¸ä¹…é??¾ï?");
                    });
                    return;
                }
                // ?¶å?æ­¥é??ç¤º
                this.state.inDialog = true;
                this.hintEl.style.display = 'none';
                this.dialogEl.style.display = 'block';
                this.dTitle.innerText = `??${poi.name}`;
                this.dText.innerHTML = "?Œæ?å®˜åœ¨è¨“ç·´?Ÿç?ä½ ï?äº‹æ?å¥½å??ºæ€¥ç?ï¼Œå¿«?å»å¹«ä??§ã€‚ã€?;
                return;
            }

            // 2. è¨“ç·´??- ?™å?
            if (poi.id === "instructor" && state.activeMissionId === "training_records") {
                if (step === "training_arrive") {
                    this.playRPGSequence(mission.training_arrive, () => {
                        state.activeMissionStep = "library_arrive";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
                if (step === "training_return") {
                    this.playRPGSequence(mission.training_return, () => {
                        state.activeMissionStep = "counter_complete";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
                // ?¶å?æ­¥é??ç¤º
                this.state.inDialog = true;
                this.hintEl.style.display = 'none';
                this.dialogEl.style.display = 'block';
                this.dTitle.innerText = `??${poi.name}`;
                this.dText.innerHTML = "?Œæ‰¾?°è??è??„ç?ç´¢å?äº†å?ï¼Ÿè½èªªå»?–æ›¸é¤¨æŸ¥?¥æ?æ¯”è?å¿«ã€‚ã€?;
                return;
            }

            // 3. ?–æ›¸é¤?- ?–æ›¸é¤¨å“¡
            if (poi.id === "librarian" && state.activeMissionId === "training_records") {
                if (step === "library_arrive") {
                    this.playRPGSequence(mission.library_arrive, () => {
                        // ?‹å? Excel ä»»å?ä¸€
                        window.rpgMissions.loadExcelTask("library_excel");
                    });
                    return;
                }
                if (step === "library_excel_complete") {
                    this.playRPGSequence(mission.library_excel_complete, () => {
                        state.activeMissionStep = "lab_door";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
            }

            // 4. è¡—é? - ?”ç©¶?€å¤§é? (è§???åˆ©?¨ç¢¼?²å»)
            if (poi.id === "door_lab" && state.activeMissionId === "training_records") {
                if (step === "lab_door") {
                    this.playRPGSequence(mission.lab_door, () => {
                        // ?³é€é€²å»
                        this.loadMap("secret_lab", 704, 660);
                        state.activeMissionStep = "lab_lobby";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
            }

            // 5. ?”ç©¶?€ - ?¼ç­æ©Ÿå™¨äº?(Clerk)
            if (poi.id === "lab_guardian" && state.activeMissionId === "training_records") {
                if (step === "lab_lobby") {
                    this.playRPGSequence(mission.lab_lobby, () => {
                        // ?‹å? Excel ä»»å?äº?                        window.rpgMissions.loadExcelTask("lab_excel");
                    });
                    return;
                }
                if (step === "lab_excel_complete") {
                    this.playRPGSequence(mission.lab_excel_complete, () => {
                        state.activeMissionStep = "lab_door_approved";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
                if (step === "lab_exit") {
                    this.playRPGSequence(mission.lab_exit, () => {
                        // ?³é€å‡º?”ç©¶?€?°è???                        this.loadMap("street", 2633, 1300);
                        
                        // ?†åˆ©?ºä?å¾Œï??ªå?è§¸ç™¼ library_format_think
                        setTimeout(() => {
                            this.playRPGSequence(mission.library_format_think, () => {
                                state.activeMissionStep = "library_format_arrive";
                                window.orchestrator.saveGame();
                            });
                        }, 600);
                    });
                    return;
                }
            }

            // 6. ?”ç©¶?€ - ?¸æ?å­˜å„²?€ B ?€
            if (poi.id === "lab_storage_2" && state.activeMissionId === "training_records") {
                if (step === "lab_door_approved") {
                    this.playRPGSequence(mission.lab_door_approved, () => {
                        // ?³é€é€?storage_room
                        this.loadMap("storage_room", 512, 800);
                        state.activeMissionStep = "lab_interior";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
            }

            // 7. ?²è?å®?- å¯¶ç®± (?¿å?è©•é?)
            if (poi.id === "storage_chest" && state.activeMissionId === "training_records") {
                if (step === "lab_interior") {
                    this.playRPGSequence(mission.lab_interior, () => {
                        state.activeMissionStep = "lab_exit";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
            }

            // 8. ?²è?å®?- ?³é€å?å¤§å»³ä¿®æ­£
            if (poi.id === "exit_storage" && state.activeMissionId === "training_records") {
                if (step === "lab_exit") {
                    // ?šç”¨?³é€å???secret_lab
                    this.loadMap("secret_lab", 1120, 300);
                    return;
                }
            }

            // 9. ?–æ›¸é¤?- ?±è¦½æ¡?(?´ç??¼å?)
            if (poi.id === "library_table" && state.activeMissionId === "training_records") {
                if (step === "library_format_arrive") {
                    this.playRPGSequence(mission.library_format_arrive, () => {
                        // ?‹å? Excel ä»»å?ä¸?                        window.rpgMissions.loadExcelTask("format_excel");
                    });
                    return;
                }
                if (step === "library_format_complete") {
                    this.playRPGSequence(mission.library_format_complete, () => {
                        state.activeMissionStep = "training_return";
                        window.orchestrator.saveGame();
                    });
                    return;
                }
            }

            // ?è¨­èµ°å???            return this._originalInteractWith(poi);
        };
    });

})();
