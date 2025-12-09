function setupBotHandlers(manager, bot, name, flags) {
    bot.on('login', () => {
        manager.log(`[${name}] Bot zalogowany na serwer!`);
        manager.io.emit('botList', manager.getBotsList());
        
        if (manager.firstSpawn[name]) {
            const currentFlags = manager.spawnFlags[name] || flags;
            
            if (currentFlags['-joinsend']) {
                setTimeout(() => {
                    bot.chat(currentFlags['-joinsend']);
                    manager.log(`[${name}] Wyslano wiadomosc logowania: ${currentFlags['-joinsend']}`);
                }, 1000);
            }
        }
    });
    
    bot.on('spawn', () => {
        manager.log(`[${name}] Bot zespawnowany w grze!`);
        
        if (!manager.firstSpawn[name]) {
            return;
        }
        
        manager.firstSpawn[name] = false;
        manager.reconnectAttempts[name] = 0;
        
        const currentFlags = manager.spawnFlags[name] || flags;
        
        handleAntiAFK(manager, bot, name, currentFlags);
        handleSneakAFK(manager, bot, name, currentFlags);
        handleAutoFish(manager, bot, name, currentFlags);
        handleAutoEat(manager, bot, name, currentFlags);
        handleSequenceFlags(manager, bot, name, currentFlags);
    });
    
    bot.on('death', () => {
        manager.log(`[${name}] Bot zginal!`);
        setTimeout(() => {
            if (manager.activeBots[name]) {
                bot.respawn();
                manager.log(`[${name}] Auto respawn wykonany`);
            }
        }, 1000);
    });
    
    bot.on('kicked', (reason) => {
        manager.log(`[${name}] Wyrzucono z serwera: ${reason}`);
        cleanupBot(manager, bot, name);
        delete manager.activeBots[name];
        manager.io.emit('botList', manager.getBotsList());
        
        handleReconnect(manager, name);
    });
    
    bot.on('end', () => {
        manager.log(`[${name}] Polaczenie zakonczone`);
        cleanupBot(manager, bot, name);
        delete manager.activeBots[name];
        manager.io.emit('botList', manager.getBotsList());
        
        handleReconnect(manager, name);
    });
    
    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
            return;
        }
        manager.log(`[${name}] ERROR: ${err.message}`);
    });
    
    bot.on('messagestr', (message) => {
        for (const socketId in manager.logsModes) {
            const mode = manager.logsModes[socketId];
            if (mode === name || mode === '*') {
                manager.log(`[${name}] ${message}`, socketId);
            }
        }
    });
}

function handleAntiAFK(manager, bot, name, flags) {
    const jumpFlag = Object.keys(flags).find(key => key.startsWith('-jumpafk'));
    
    if (jumpFlag) {
        const parts = jumpFlag.split(':');
        const duration = parts[1] ? parseInt(parts[1]) * 1000 : null;
        
        const jumpInterval = setInterval(() => {
            if (manager.activeBots[name] && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => {
                    if (manager.activeBots[name]) {
                        bot.setControlState('jump', false);
                    }
                }, 100);
            } else {
                clearInterval(jumpInterval);
            }
        }, 1000);
        
        bot.jumpInterval = jumpInterval;
        
        if (duration) {
            manager.log(`[${name}] Anti-AFK jump wlaczony na ${parts[1]} sekund`);
            setTimeout(() => {
                if (manager.activeBots[name] && bot.jumpInterval) {
                    clearInterval(bot.jumpInterval);
                    bot.jumpInterval = null;
                    manager.log(`[${name}] Anti-AFK jump wylaczony po ${parts[1]} sekundach`);
                }
            }, duration);
        } else {
            manager.log(`[${name}] Anti-AFK jump wlaczony`);
        }
    }
}

function handleSneakAFK(manager, bot, name, flags) {
    const sneakFlag = Object.keys(flags).find(key => key.startsWith('-sneakafk'));
    
    if (sneakFlag) {
        const parts = sneakFlag.split(':');
        const duration = parts[1] ? parseInt(parts[1]) * 1000 : null;
        
        bot.setControlState('sneak', true);
        
        if (duration) {
            manager.log(`[${name}] Anti-AFK sneak wlaczony na ${parts[1]} sekund`);
            setTimeout(() => {
                if (manager.activeBots[name]) {
                    bot.setControlState('sneak', false);
                    manager.log(`[${name}] Anti-AFK sneak wylaczony po ${parts[1]} sekundach`);
                }
            }, duration);
        } else {
            manager.log(`[${name}] Anti-AFK sneak wlaczony`);
        }
    }
}

function handleAutoFish(manager, bot, name, flags) {
    if (flags.hasOwnProperty('-autofish')) {
        startAutoFishing(manager, bot, name);
    }
}

function handleAutoEat(manager, bot, name, flags) {
    if (flags.hasOwnProperty('-autoeat')) {
        const eatInterval = setInterval(() => {
            if (!manager.activeBots[name]) {
                clearInterval(eatInterval);
                return;
            }
            
            if (bot.food < 16) {
                const foods = bot.inventory.items().filter(item => 
                    item.name.includes('cooked') || 
                    item.name.includes('bread') || 
                    item.name.includes('apple') ||
                    item.name.includes('carrot') ||
                    item.name.includes('potato') ||
                    item.name.includes('beef') ||
                    item.name.includes('porkchop') ||
                    item.name.includes('chicken') ||
                    item.name.includes('mutton') ||
                    item.name.includes('rabbit') ||
                    item.name.includes('steak')
                );
                
                if (foods.length > 0) {
                    bot.equip(foods[0], 'hand').then(() => {
                        bot.consume();
                    }).catch(() => {});
                }
            }
        }, 1000);
        
        bot.autoEatInterval = eatInterval;
        manager.log(`[${name}] Auto eat wlaczony (je gdy < 8 glodkow)`);
    }
}

function startAutoFishing(manager, bot, name) {
    bot.autoFishActive = true;
    
    const fishingListener = () => {
        if (!bot.autoFishActive || !manager.activeBots[name]) return;
        
        setTimeout(() => {
            if (bot.autoFishActive && manager.activeBots[name]) {
                bot.activateItem();
            }
        }, 500);
    };
    
    bot.on('playerCollect', fishingListener);
    bot.fishingListener = fishingListener;
    
    bot.activateItem();
    manager.log(`[${name}] Auto fishing wlaczony`);
}

function handleSequenceFlags(manager, bot, name, flags) {
    const sequenceFlags = [];
    const flagOrder = ['-setslot', '-rightclick', '-leftclick', '-guiclick'];
    
    for (const flag of flagOrder) {
        if (flags[flag] !== undefined) {
            sequenceFlags.push(flag);
        }
    }
    
    const customDelay = flags['-delayflag'] ? parseInt(flags['-delayflag']) : 5000;
    let delay = customDelay;
    
    for (const flag of sequenceFlags) {
        if (flag === '-setslot') {
            const slot = parseInt(flags['-setslot']);
            if (!isNaN(slot) && slot >= 0 && slot <= 8) {
                setTimeout(() => {
                    if (manager.activeBots[name]) {
                        bot.setQuickBarSlot(slot);
                        manager.log(`[${name}] Ustawiono slot: ${slot}`);
                    }
                }, delay);
                delay += customDelay;
            }
        } else if (flag === '-rightclick') {
            setTimeout(() => {
                if (manager.activeBots[name]) {
                    bot.activateItem();
                    manager.log(`[${name}] Kliknieto prawy przycisk myszy`);
                }
            }, delay);
            delay += customDelay;
        } else if (flag === '-leftclick') {
            setTimeout(() => {
                if (manager.activeBots[name]) {
                    bot.swingArm();
                    manager.log(`[${name}] Kliknieto lewy przycisk myszy`);
                }
            }, delay);
            delay += customDelay;
        } else if (flag === '-guiclick') {
            const guiSlot = parseInt(flags['-guiclick']);
            if (!isNaN(guiSlot) && guiSlot >= 0 && guiSlot <= 53) {
                setTimeout(() => {
                    if (manager.activeBots[name]) {
                        const window = bot.currentWindow;
                        if (window) {
                            bot.clickWindow(guiSlot, 0, 0);
                            manager.log(`[${name}] Kliknieto slot GUI: ${guiSlot}`);
                        } else {
                            manager.log(`[${name}] Brak otwartego GUI`);
                        }
                    }
                }, delay);
                delay += customDelay;
            }
        }
    }
}

function handleReconnect(manager, name) {
    if (manager.reconnectFlags[name]) {
        const reconnectData = manager.reconnectFlags[name];
        manager.reconnectAttempts[name] = (manager.reconnectAttempts[name] || 0) + 1;
        
        if (manager.reconnectAttempts[name] > reconnectData.maxReconnects) {
            manager.log(`[${name}] Osiagnieto limit prob reconnect (${reconnectData.maxReconnects})`);
            delete manager.reconnectFlags[name];
            delete manager.reconnectAttempts[name];
            return;
        }
        
        manager.log(`[${name}] Ponowne laczenie za 5 sekund... (proba ${manager.reconnectAttempts[name]}/${reconnectData.maxReconnects})`);
        
        setTimeout(() => {
            if (!manager.activeBots[name] && manager.reconnectFlags[name]) {
                manager.firstSpawn[name] = true;
                manager.startBot(name, reconnectData.flags);
            }
        }, 5000);
    }
}

function cleanupBot(manager, bot, name) {
    if (bot.jumpInterval) {
        clearInterval(bot.jumpInterval);
    }
    if (bot.useInterval) {
        clearInterval(bot.useInterval);
    }
    if (bot.walkInterval) {
        clearInterval(bot.walkInterval);
    }
    if (bot.autoEatInterval) {
        clearInterval(bot.autoEatInterval);
    }
    if (bot.followInterval) {
        clearInterval(bot.followInterval);
    }
    if (bot.gotoInterval) {
        clearInterval(bot.gotoInterval);
    }
    if (bot.attackInterval) {
        clearInterval(bot.attackInterval);
    }
    if (bot.autoFishActive) {
        bot.autoFishActive = false;
        if (bot.fishingListener) {
            bot.removeListener('playerCollect', bot.fishingListener);
        }
    }
}

function executeLoopUse(manager, socketId, botName) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            if (bot.useInterval) {
                clearInterval(bot.useInterval);
                bot.useInterval = null;
                manager.log(`[${name}] Loop use wylaczony`, socketId);
            } else {
                const useInterval = setInterval(() => {
                    if (manager.activeBots[name] && bot.entity) {
                        bot.activateItem();
                    } else {
                        clearInterval(useInterval);
                    }
                }, 50);
                
                bot.useInterval = useInterval;
                manager.log(`[${name}] Loop use wlaczony`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    if (bot.useInterval) {
        clearInterval(bot.useInterval);
        bot.useInterval = null;
        manager.log(`[${botName}] Loop use wylaczony`, socketId);
    } else {
        const useInterval = setInterval(() => {
            if (manager.activeBots[botName] && bot.entity) {
                bot.activateItem();
            } else {
                clearInterval(useInterval);
            }
        }, 50);
        
        bot.useInterval = useInterval;
        manager.log(`[${botName}] Loop use wlaczony`, socketId);
    }
    
    return true;
}

function executeWalk(manager, socketId, botName, direction) {
    const validDirections = ['forward', 'back', 'left', 'right'];
    
    if (!validDirections.includes(direction.toLowerCase())) {
        manager.log('Nieprawidlowy kierunek! Uzyj: forward, back, left, right', socketId);
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            if (!bot.walkStates) {
                bot.walkStates = { forward: false, back: false, left: false, right: false };
            }
            
            if (bot.walkStates[direction]) {
                bot.setControlState(direction, false);
                bot.walkStates[direction] = false;
                manager.log(`[${name}] Wylaczono chodzenie w kierunku: ${direction}`, socketId);
            } else {
                bot.setControlState(direction, true);
                bot.walkStates[direction] = true;
                manager.log(`[${name}] Wlaczono chodzenie w kierunku: ${direction}`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    if (!bot.walkStates) {
        bot.walkStates = { forward: false, back: false, left: false, right: false };
    }
    
    if (bot.walkStates[direction]) {
        bot.setControlState(direction, false);
        bot.walkStates[direction] = false;
        manager.log(`[${botName}] Wylaczono chodzenie w kierunku: ${direction}`, socketId);
    } else {
        bot.setControlState(direction, true);
        bot.walkStates[direction] = true;
        manager.log(`[${botName}] Wlaczono chodzenie w kierunku: ${direction}`, socketId);
    }
    
    return true;
}

function executeDropItem(manager, socketId, botName, slot) {
    const dropSlot = parseInt(slot);
    
    if (isNaN(dropSlot)) {
        manager.log('Slot musi byc liczba!', socketId);
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            try {
                const item = bot.inventory.slots[dropSlot];
                if (item) {
                    bot.tossStack(item);
                    manager.log(`[${name}] Wyrzucono item ze slotu: ${dropSlot}`, socketId);
                } else {
                    manager.log(`[${name}] Brak itemu w slocie: ${dropSlot}`, socketId);
                }
            } catch (err) {
                manager.log(`[${name}] Blad przy dropie: ${err.message}`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    try {
        const item = bot.inventory.slots[dropSlot];
        if (item) {
            bot.tossStack(item);
            manager.log(`[${botName}] Wyrzucono item ze slotu: ${dropSlot}`, socketId);
        } else {
            manager.log(`[${botName}] Brak itemu w slocie: ${dropSlot}`, socketId);
        }
    } catch (err) {
        manager.log(`[${botName}] Blad przy dropie: ${err.message}`, socketId);
    }
    
    return true;
}

function executeLook(manager, socketId, botName, yawStr, pitchStr) {
    const yaw = parseFloat(yawStr);
    const pitch = parseFloat(pitchStr);
    
    if (isNaN(yaw) || isNaN(pitch)) {
        manager.log('Yaw i pitch musza byc liczbami!', socketId);
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            bot.look(yaw, pitch);
            manager.log(`[${name}] Patrzenie w kierunku: yaw=${yaw}, pitch=${pitch}`, socketId);
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    bot.look(yaw, pitch);
    manager.log(`[${botName}] Patrzenie w kierunku: yaw=${yaw}, pitch=${pitch}`, socketId);
    
    return true;
}

function executeSetSlot(manager, socketId, botName, slotStr) {
    const slot = parseInt(slotStr);
    
    if (isNaN(slot) || slot < 0 || slot > 8) {
        manager.log('Slot musi byc liczba od 0 do 8!', socketId);
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            bot.setQuickBarSlot(slot);
            manager.log(`[${name}] Ustawiono slot: ${slot}`, socketId);
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    bot.setQuickBarSlot(slot);
    manager.log(`[${botName}] Ustawiono slot: ${slot}`, socketId);
    
    return true;
}

function executeRightClick(manager, socketId, botName) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            bot.activateItem();
            manager.log(`[${name}] Kliknieto prawy przycisk myszy`, socketId);
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    bot.activateItem();
    manager.log(`[${botName}] Kliknieto prawy przycisk myszy`, socketId);
    
    return true;
}

function executeLeftClick(manager, socketId, botName) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            bot.swingArm();
            manager.log(`[${name}] Kliknieto lewy przycisk myszy`, socketId);
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    bot.swingArm();
    manager.log(`[${botName}] Kliknieto lewy przycisk myszy`, socketId);
    
    return true;
}

function executeGuiClick(manager, socketId, botName, slotStr) {
    const guiSlot = parseInt(slotStr);
    
    if (isNaN(guiSlot) || guiSlot < 0 || guiSlot > 53) {
        manager.log('Slot GUI musi byc liczba od 0 do 53!', socketId);
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            const window = bot.currentWindow;
            if (window) {
                bot.clickWindow(guiSlot, 0, 0);
                manager.log(`[${name}] Kliknieto slot GUI: ${guiSlot}`, socketId);
            } else {
                manager.log(`[${name}] Brak otwartego GUI`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    const window = bot.currentWindow;
    if (window) {
        bot.clickWindow(guiSlot, 0, 0);
        manager.log(`[${botName}] Kliknieto slot GUI: ${guiSlot}`, socketId);
    } else {
        manager.log(`[${botName}] Brak otwartego GUI`, socketId);
    }
    
    return true;
}

function enterLogs(manager, socketId, botName) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log(`Brak aktywnych botow!`, socketId);
            return false;
        }
        
        manager.logsModes[socketId] = '*';
        manager.log(`\n${'='.repeat(50)}`, socketId);
        manager.log(`LOGI WSZYSTKICH BOTOW (${activeBots.length})`, socketId);
        manager.log(`Wpisz '.exit' aby wyjsc z logow`, socketId);
        manager.log(`Wpisz '.listitems' aby zobaczyc ekwipunek`, socketId);
        manager.log(`Wpisz wiadomosc aby wyslac na chat wszystkich botow`, socketId);
        manager.log(`Komendy: .loopuse .walk <dir> .dropitem <slot> .look <yaw> <pitch>`, socketId);
        manager.log(`Komendy: .setslot <0-8> .rightclick .leftclick .guiclick <slot>`, socketId);
        manager.log(`${'='.repeat(50)}\n`, socketId);
        manager.io.to(socketId).emit('logsMode', true);
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    manager.logsModes[socketId] = botName;
    manager.log(`\n${'='.repeat(50)}`, socketId);
    manager.log(`LOGI BOTA: ${botName}`, socketId);
    manager.log(`Wpisz '.exit' aby wyjsc z logow`, socketId);
    manager.log(`Wpisz '.listitems' aby zobaczyc ekwipunek`, socketId);
    manager.log(`Wpisz wiadomosc aby wyslac na chat`, socketId);
    manager.log(`Komendy: .loopuse .walk <dir> .dropitem <slot> .look <yaw> <pitch>`, socketId);
    manager.log(`Komendy: .setslot <0-8> .rightclick .leftclick .guiclick <slot>`, socketId);
    manager.log(`${'='.repeat(50)}\n`, socketId);
    manager.io.to(socketId).emit('logsMode', true);
    return true;
}

function exitLogs(manager, socketId) {
    const botName = manager.logsModes[socketId];
    if (botName) {
        delete manager.logsModes[socketId];
        if (botName === '*') {
            manager.log(`\nWychodzenie z logow wszystkich botow...\n`, socketId);
        } else {
            manager.log(`\nWychodzenie z logow bota ${botName}...\n`, socketId);
        }
    }
    manager.io.to(socketId).emit('logsMode', false);
}

function sendMessage(manager, socketId, message) {
    const botName = manager.logsModes[socketId];
    if (!botName) {
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        let sent = 0;
        
        for (const name of activeBots) {
            try {
                manager.activeBots[name].chat(message);
                sent++;
            } catch (err) {
                manager.log(`[${name}] [ERROR] Nie mozna wyslac: ${err.message}`, socketId);
            }
        }
        
        if (sent > 0) {
            if (message.startsWith('/')) {
                manager.log(`[CMD -> ${sent} botow] ${message}`, socketId);
            } else {
                manager.log(`[SEND -> ${sent} botow] ${message}`, socketId);
            }
        }
        return sent > 0;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    try {
        manager.activeBots[botName].chat(message);
        if (message.startsWith('/')) {
            manager.log(`[CMD] ${message}`, socketId);
        } else {
            manager.log(`[SEND] ${message}`, socketId);
        }
        return true;
    } catch (err) {
        manager.log(`[ERROR] Nie mozna wyslac: ${err.message}`, socketId);
        return false;
    }
}

function listItems(manager, socketId) {
    const botName = manager.logsModes[socketId];
    if (!botName) {
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            displayBotInventory(manager, socketId, name);
        }
        
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    displayBotInventory(manager, socketId, botName);
    return true;
}

function listItemsCommand(manager, socketId, botName, together = false) {
    if (botName === '*') {
        const activeBotsNames = Object.keys(manager.activeBots);
        
        if (activeBotsNames.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        if (together) {
            displayCombinedInventory(manager, socketId, activeBotsNames);
        } else {
            for (const name of activeBotsNames) {
                displayBotInventory(manager, socketId, name);
            }
        }
        
        return true;
    }
    
    if (!manager.bots[botName]) {
        manager.log(`Bot '${botName}' nie istnieje!`, socketId);
        return false;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    displayBotInventory(manager, socketId, botName);
    return true;
}

function displayBotInventory(manager, socketId, botName) {
    const bot = manager.activeBots[botName];
    if (!bot) return;
    
    const items = bot.inventory.items();
    
    manager.log(`\n${'='.repeat(50)}`, socketId);
    manager.log(`EKWIPUNEK BOTA: ${botName}`, socketId);
    manager.log(`${'='.repeat(50)}`, socketId);
    
    if (items.length === 0) {
        manager.log('Ekwipunek jest pusty!', socketId);
    } else {
        for (const item of items) {
            let itemInfo = `[Slot ${item.slot}] ${item.name} x${item.count}`;
            
            if (item.nbt && item.nbt.value && item.nbt.value.Enchantments) {
                const enchants = item.nbt.value.Enchantments.value.value;
                if (enchants && enchants.length > 0) {
                    itemInfo += '\n  Enchanty:';
                    for (const enchant of enchants) {
                        const enchantId = enchant.id.value;
                        const enchantLvl = enchant.lvl.value;
                        itemInfo += `\n    - ${enchantId} (Poziom ${enchantLvl})`;
                    }
                }
            }
            
            manager.log(itemInfo, socketId);
        }
    }
    
    manager.log(`${'='.repeat(50)}\n`, socketId);
}

function executeAutoEat(manager, socketId, botName) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            if (bot.autoEatInterval) {
                clearInterval(bot.autoEatInterval);
                bot.autoEatInterval = null;
                manager.log(`[${name}] Auto eat wylaczony`, socketId);
            } else {
                const eatInterval = setInterval(() => {
                    if (!manager.activeBots[name]) {
                        clearInterval(eatInterval);
                        return;
                    }
                    
                    if (bot.food < 16) {
                        const foods = bot.inventory.items().filter(item => 
                            item.name.includes('cooked') || 
                            item.name.includes('bread') || 
                            item.name.includes('apple') ||
                            item.name.includes('carrot') ||
                            item.name.includes('potato') ||
                            item.name.includes('beef') ||
                            item.name.includes('porkchop') ||
                            item.name.includes('chicken') ||
                            item.name.includes('mutton') ||
                            item.name.includes('rabbit') ||
                            item.name.includes('steak')
                        );
                        
                        if (foods.length > 0) {
                            bot.equip(foods[0], 'hand').then(() => {
                                bot.consume();
                            }).catch(() => {});
                        }
                    }
                }, 1000);
                
                bot.autoEatInterval = eatInterval;
                manager.log(`[${name}] Auto eat wlaczony (je gdy < 8 glodkow)`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    if (bot.autoEatInterval) {
        clearInterval(bot.autoEatInterval);
        bot.autoEatInterval = null;
        manager.log(`[${botName}] Auto eat wylaczony`, socketId);
    } else {
        const eatInterval = setInterval(() => {
            if (!manager.activeBots[botName]) {
                clearInterval(eatInterval);
                return;
            }
            
            if (bot.food < 16) {
                const foods = bot.inventory.items().filter(item => 
                    item.name.includes('cooked') || 
                    item.name.includes('bread') || 
                    item.name.includes('apple') ||
                    item.name.includes('carrot') ||
                    item.name.includes('potato') ||
                    item.name.includes('beef') ||
                    item.name.includes('porkchop') ||
                    item.name.includes('chicken') ||
                    item.name.includes('mutton') ||
                    item.name.includes('rabbit') ||
                    item.name.includes('steak')
                );
                
                if (foods.length > 0) {
                    bot.equip(foods[0], 'hand').then(() => {
                        bot.consume();
                    }).catch(() => {});
                }
            }
        }, 1000);
        
        bot.autoEatInterval = eatInterval;
        manager.log(`[${botName}] Auto eat wlaczony (je gdy < 8 glodkow)`, socketId);
    }
    
    return true;
}

function executeFollow(manager, socketId, botName, targetPlayer) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            if (bot.followInterval) {
                clearInterval(bot.followInterval);
                bot.followInterval = null;
                manager.log(`[${name}] Follow wylaczony`, socketId);
            } else {
                const followInterval = setInterval(() => {
                    if (!manager.activeBots[name]) {
                        clearInterval(followInterval);
                        return;
                    }
                    
                    const player = bot.players[targetPlayer];
                    if (player && player.entity) {
                        const pos = player.entity.position;
                        const distance = bot.entity.position.distanceTo(pos);
                        
                        if (distance > 3) {
                            const dx = pos.x - bot.entity.position.x;
                            const dz = pos.z - bot.entity.position.z;
                            
                            bot.setControlState('forward', Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5);
                            
                            if (Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5) {
                                bot.look(Math.atan2(-dx, -dz), 0);
                            }
                        } else {
                            bot.setControlState('forward', false);
                        }
                    }
                }, 100);
                
                bot.followInterval = followInterval;
                manager.log(`[${name}] Follow wlaczony (cel: ${targetPlayer})`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    if (bot.followInterval) {
        clearInterval(bot.followInterval);
        bot.followInterval = null;
        bot.setControlState('forward', false);
        manager.log(`[${botName}] Follow wylaczony`, socketId);
    } else {
        const followInterval = setInterval(() => {
            if (!manager.activeBots[botName]) {
                clearInterval(followInterval);
                return;
            }
            
            const player = bot.players[targetPlayer];
            if (player && player.entity) {
                const pos = player.entity.position;
                const distance = bot.entity.position.distanceTo(pos);
                
                if (distance > 3) {
                    const dx = pos.x - bot.entity.position.x;
                    const dz = pos.z - bot.entity.position.z;
                    
                    bot.setControlState('forward', Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5);
                    
                    if (Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5) {
                        bot.look(Math.atan2(-dx, -dz), 0);
                    }
                } else {
                    bot.setControlState('forward', false);
                }
            }
        }, 100);
        
        bot.followInterval = followInterval;
        manager.log(`[${botName}] Follow wlaczony (cel: ${targetPlayer})`, socketId);
    }
    
    return true;
}

function executeAutoFish(manager, socketId, botName) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            if (bot.autoFishActive) {
                bot.autoFishActive = false;
                if (bot.fishingListener) {
                    bot.removeListener('playerCollect', bot.fishingListener);
                }
                manager.log(`[${name}] Auto fishing wylaczony`, socketId);
            } else {
                startAutoFishing(manager, bot, name);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    if (bot.autoFishActive) {
        bot.autoFishActive = false;
        if (bot.fishingListener) {
            bot.removeListener('playerCollect', bot.fishingListener);
        }
        manager.log(`[${botName}] Auto fishing wylaczony`, socketId);
    } else {
        startAutoFishing(manager, bot, botName);
    }
    
    return true;
}

function executeGoTo(manager, socketId, botName, xStr, yStr, zStr) {
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    const z = parseFloat(zStr);
    
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        manager.log('Koordynaty musza byc liczbami!', socketId);
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            if (bot.gotoInterval) {
                clearInterval(bot.gotoInterval);
                bot.gotoInterval = null;
                bot.setControlState('forward', false);
                manager.log(`[${name}] GoTo zatrzymany`, socketId);
            } else {
                const gotoInterval = setInterval(() => {
                    if (!manager.activeBots[name]) {
                        clearInterval(gotoInterval);
                        return;
                    }
                    
                    const distance = Math.sqrt(
                        Math.pow(x - bot.entity.position.x, 2) +
                        Math.pow(z - bot.entity.position.z, 2)
                    );
                    
                    if (distance < 2) {
                        clearInterval(gotoInterval);
                        bot.gotoInterval = null;
                        bot.setControlState('forward', false);
                        manager.log(`[${name}] GoTo osiagnieto cel!`, socketId);
                    } else {
                        const dx = x - bot.entity.position.x;
                        const dz = z - bot.entity.position.z;
                        
                        bot.look(Math.atan2(-dx, -dz), 0);
                        bot.setControlState('forward', true);
                        
                        if (bot.entity.position.y < y - 1) {
                            bot.setControlState('jump', true);
                            setTimeout(() => {
                                bot.setControlState('jump', false);
                            }, 100);
                        }
                    }
                }, 100);
                
                bot.gotoInterval = gotoInterval;
                manager.log(`[${name}] GoTo wlaczony (cel: ${x}, ${y}, ${z})`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    if (bot.gotoInterval) {
        clearInterval(bot.gotoInterval);
        bot.gotoInterval = null;
        bot.setControlState('forward', false);
        manager.log(`[${botName}] GoTo zatrzymany`, socketId);
    } else {
        const gotoInterval = setInterval(() => {
            if (!manager.activeBots[botName]) {
                clearInterval(gotoInterval);
                return;
            }
            
            const distance = Math.sqrt(
                Math.pow(x - bot.entity.position.x, 2) +
                Math.pow(z - bot.entity.position.z, 2)
            );
            
            if (distance < 2) {
                clearInterval(gotoInterval);
                bot.gotoInterval = null;
                bot.setControlState('forward', false);
                manager.log(`[${botName}] GoTo osiagnieto cel!`, socketId);
            } else {
                const dx = x - bot.entity.position.x;
                const dz = z - bot.entity.position.z;
                
                bot.look(Math.atan2(-dx, -dz), 0);
                bot.setControlState('forward', true);
                
                if (bot.entity.position.y < y - 1) {
                    bot.setControlState('jump', true);
                    setTimeout(() => {
                        bot.setControlState('jump', false);
                    }, 100);
                }
            }
        }, 100);
        
        bot.gotoInterval = gotoInterval;
        manager.log(`[${botName}] GoTo wlaczony (cel: ${x}, ${y}, ${z})`, socketId);
    }
    
    return true;
}

function executeAttack(manager, socketId, botName, target, rangeStr) {
    const range = parseFloat(rangeStr);
    
    if (isNaN(range)) {
        manager.log('Range musi byc liczba!', socketId);
        return false;
    }
    
    const validTargets = ['mob', 'player', 'all'];
    if (!validTargets.includes(target.toLowerCase())) {
        manager.log('Target musi byc: mob, player lub all', socketId);
        return false;
    }
    
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            const bot = manager.activeBots[name];
            
            if (bot.attackInterval) {
                clearInterval(bot.attackInterval);
                bot.attackInterval = null;
                manager.log(`[${name}] Attack wylaczony`, socketId);
            } else {
                const attackInterval = setInterval(() => {
                    if (!manager.activeBots[name]) {
                        clearInterval(attackInterval);
                        return;
                    }
                    
                    const entities = Object.values(bot.entities);
                    let targetEntity = null;
                    
                    for (const entity of entities) {
                        if (!entity || entity === bot.entity) continue;
                        
                        const distance = bot.entity.position.distanceTo(entity.position);
                        if (distance > range) continue;
                        
                        if (target === 'mob' && entity.type === 'mob') {
                            targetEntity = entity;
                            break;
                        } else if (target === 'player' && entity.type === 'player') {
                            targetEntity = entity;
                            break;
                        } else if (target === 'all' && (entity.type === 'mob' || entity.type === 'player')) {
                            targetEntity = entity;
                            break;
                        }
                    }
                    
                    if (targetEntity) {
                        bot.lookAt(targetEntity.position.offset(0, targetEntity.height, 0));
                        bot.attack(targetEntity);
                    }
                }, 500);
                
                bot.attackInterval = attackInterval;
                manager.log(`[${name}] Attack wlaczony (cel: ${target}, zasieg: ${range})`, socketId);
            }
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    const bot = manager.activeBots[botName];
    
    if (bot.attackInterval) {
        clearInterval(bot.attackInterval);
        bot.attackInterval = null;
        manager.log(`[${botName}] Attack wylaczony`, socketId);
    } else {
        const attackInterval = setInterval(() => {
            if (!manager.activeBots[botName]) {
                clearInterval(attackInterval);
                return;
            }
            
            const entities = Object.values(bot.entities);
            let targetEntity = null;
            
            for (const entity of entities) {
                if (!entity || entity === bot.entity) continue;
                
                const distance = bot.entity.position.distanceTo(entity.position);
                if (distance > range) continue;
                
                if (target === 'mob' && entity.type === 'mob') {
                    targetEntity = entity;
                    break;
                } else if (target === 'player' && entity.type === 'player') {
                    targetEntity = entity;
                    break;
                } else if (target === 'all' && (entity.type === 'mob' || entity.type === 'player')) {
                    targetEntity = entity;
                    break;
                }
            }
            
            if (targetEntity) {
                bot.lookAt(targetEntity.position.offset(0, targetEntity.height, 0));
                bot.attack(targetEntity);
            }
        }, 500);
        
        bot.attackInterval = attackInterval;
        manager.log(`[${botName}] Attack wlaczony (cel: ${target}, zasieg: ${range})`, socketId);
    }
    
    return true;
}

function executeStats(manager, socketId, botName) {
    if (botName === '*') {
        const activeBots = Object.keys(manager.activeBots);
        if (activeBots.length === 0) {
            manager.log('Brak aktywnych botow!', socketId);
            return false;
        }
        
        for (const name of activeBots) {
            displayBotStats(manager, socketId, name);
        }
        return true;
    }
    
    if (!manager.activeBots[botName]) {
        manager.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
        return false;
    }
    
    displayBotStats(manager, socketId, botName);
    return true;
}

function displayBotStats(manager, socketId, botName) {
    const bot = manager.activeBots[botName];
    if (!bot) return;
    
    const pos = bot.entity.position;
    const health = bot.health || 0;
    const food = bot.food || 0;
    const dimension = bot.game ? bot.game.dimension : 'unknown';
    
    manager.log(`\n${'='.repeat(50)}`, socketId);
    manager.log(`STATYSTYKI BOTA: ${botName}`, socketId);
    manager.log(`${'='.repeat(50)}`, socketId);
    manager.log(`HP: ${health}/20`, socketId);
    manager.log(`Glod: ${food}/20`, socketId);
    manager.log(`Pozycja: X=${pos.x.toFixed(2)} Y=${pos.y.toFixed(2)} Z=${pos.z.toFixed(2)}`, socketId);
    manager.log(`Wymiar: ${dimension}`, socketId);
    manager.log(`${'='.repeat(50)}\n`, socketId);
}

function displayCombinedInventory(manager, socketId, botNames) {
    const itemsMap = new Map();
    
    for (const name of botNames) {
        const bot = manager.activeBots[name];
        if (!bot) continue;
        
        const items = bot.inventory.items();
        
        for (const item of items) {
            const itemKey = item.name;
            let enchantKey = '';
            
            if (item.nbt && item.nbt.value && item.nbt.value.Enchantments) {
                const enchants = item.nbt.value.Enchantments.value.value;
                if (enchants && enchants.length > 0) {
                    const enchantStrs = enchants.map(e => `${e.id.value}:${e.lvl.value}`);
                    enchantKey = enchantStrs.sort().join(',');
                }
            }
            
            const fullKey = `${itemKey}|${enchantKey}`;
            
            if (itemsMap.has(fullKey)) {
                itemsMap.get(fullKey).count += item.count;
            } else {
                itemsMap.set(fullKey, {
                    name: item.name,
                    count: item.count,
                    enchants: item.nbt && item.nbt.value && item.nbt.value.Enchantments ? 
                        item.nbt.value.Enchantments.value.value : null
                });
            }
        }
    }
    
    manager.log(`\n${'='.repeat(50)}`, socketId);
    manager.log(`EKWIPUNEK WSZYSTKICH BOTOW`, socketId);
    manager.log(`${'='.repeat(50)}`, socketId);
    
    if (itemsMap.size === 0) {
        manager.log('Wszystkie ekwipunki sa puste!', socketId);
    } else {
        for (const [key, itemData] of itemsMap) {
            let itemInfo = `${itemData.name} x${itemData.count}`;
            
            if (itemData.enchants && itemData.enchants.length > 0) {
                itemInfo += '\n  Enchanty:';
                for (const enchant of itemData.enchants) {
                    const enchantId = enchant.id.value;
                    const enchantLvl = enchant.lvl.value;
                    itemInfo += `\n    - ${enchantId} (Poziom ${enchantLvl})`;
                }
            }
            
            manager.log(itemInfo, socketId);
        }
    }
    
    manager.log(`${'='.repeat(50)}\n`, socketId);
}

module.exports = {
    setupBotHandlers,
    enterLogs,
    exitLogs,
    sendMessage,
    listItems,
    listItemsCommand,
    executeLoopUse,
    executeWalk,
    executeDropItem,
    executeLook,
    executeSetSlot,
    executeRightClick,
    executeLeftClick,
    executeGuiClick,
    executeAutoEat,
    executeFollow,
    executeAutoFish,
    executeGoTo,
    executeAttack,
    executeStats
};