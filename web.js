const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const {
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
} = require('./web-functions');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8080;

class BotManager {
    constructor(io) {
        this.io = io;
        this.botsDir = path.join(__dirname, 'bots');
        this.settingsPath = path.join(__dirname, 'settings.json');
        this.bots = {};
        this.activeBots = {};
        this.logsModes = {};
        this.reconnectFlags = {};
        this.reconnectAttempts = {};
        this.spawnFlags = {};
        this.firstSpawn = {};
        this.availableNames = [];
        this.settings = { blockChat: false };
        
        if (!fs.existsSync(this.botsDir)) {
            fs.mkdirSync(this.botsDir);
        }
        
        this.loadSettings();
        this.loadNames();
        this.loadBots();
    }
    
    loadSettings() {
        if (fs.existsSync(this.settingsPath)) {
            const data = fs.readFileSync(this.settingsPath, 'utf8');
            this.settings = JSON.parse(data);
        } else {
            this.saveSettings();
        }
    }
    
    saveSettings() {
        fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    }
    
    toggleBlockChat() {
        this.settings.blockChat = !this.settings.blockChat;
        this.saveSettings();
        return this.settings.blockChat;
    }
    
    loadNames() {
        const namesPath = path.join(__dirname, 'names.txt');
        if (fs.existsSync(namesPath)) {
            const content = fs.readFileSync(namesPath, 'utf8');
            this.availableNames = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }
    }
    
    log(message, socketId = null) {
        if (socketId) {
            this.io.to(socketId).emit('log', message);
        } else {
            this.io.emit('log', message);
        }
    }
    
    loadBots() {
        const files = fs.readdirSync(this.botsDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = fs.readFileSync(path.join(this.botsDir, file), 'utf8');
                const botData = JSON.parse(data);
                this.bots[botData.name] = botData;
            }
        }
    }
    
    saveBot(botData) {
        const filePath = path.join(this.botsDir, `${botData.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(botData, null, 2));
    }
    
    parseFlags(args) {
        const flags = {};
        let currentFlag = null;
        let currentValue = [];
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg.startsWith('-')) {
                if (currentFlag) {
                    flags[currentFlag] = currentValue.join(' ');
                }
                currentFlag = arg;
                currentValue = [];
            } else {
                if (currentFlag) {
                    currentValue.push(arg);
                }
            }
        }
        
        if (currentFlag) {
            flags[currentFlag] = currentValue.join(' ');
        }
        
        return flags;
    }
    
    createBot(name, server, version) {
        if (this.bots[name]) {
            this.log(`Bot o nazwie '${name}' juz istnieje!`);
            return false;
        }
        
        const parts = server.split(':');
        let host, port;
        
        if (parts.length === 1) {
            host = parts[0];
            port = 25565;
        } else if (parts.length === 2) {
            host = parts[0];
            port = parseInt(parts[1]);
        } else {
            this.log('Nieprawidlowy format serwera! Uzyj: ip:port lub ip');
            return false;
        }
        
        const botData = {
            name: name,
            host: host,
            port: port,
            version: version
        };
        
        this.bots[name] = botData;
        this.saveBot(botData);
        this.log(`Utworzono bota: ${name}`);
        this.io.emit('botList', this.getBotsList());
        return true;
    }
    
    createRandomBots(count, server, version) {
        if (this.availableNames.length === 0) {
            this.log('Brak dostepnych nazw w pliku names.txt!');
            return false;
        }
        
        if (count < 1 || count > 1000) {
            this.log('Liczba botow musi byc od 1 do 1000!');
            return false;
        }
        
        const usedNames = Object.keys(this.bots);
        const availableForUse = this.availableNames.filter(name => !usedNames.includes(name));
        
        if (availableForUse.length === 0) {
            this.log('Wszystkie nazwy z names.txt sa juz uzyte!');
            return false;
        }
        
        const actualCount = Math.min(count, availableForUse.length);
        const shuffled = [...availableForUse].sort(() => Math.random() - 0.5);
        const selectedNames = shuffled.slice(0, actualCount);
        
        let created = 0;
        for (const name of selectedNames) {
            if (this.createBot(name, server, version)) {
                created++;
            }
        }
        
        this.log(`Utworzono ${created} losowych botow`);
        return true;
    }
    
    startBot(name, flags = {}) {
        if (!this.bots[name]) {
            this.log(`Bot '${name}' nie istnieje!`);
            return false;
        }
        
        if (this.activeBots[name]) {
            this.log(`Bot '${name}' juz dziala!`);
            return false;
        }
        
        const validFlags = ['-joinsend', '-reconnect', '-maxreconnect', '-jumpafk', '-sneakafk', '-delayflag', '-setslot', '-rightclick', '-leftclick', '-guiclick', '-autofish', '-autoeat'];
        
        for (const flag of Object.keys(flags)) {
            const baseFlag = flag.split(':')[0];
            if (!validFlags.includes(baseFlag)) {
                this.log(`Nieznana flaga: ${flag}`);
                this.log(`Dostepne flagi: ${validFlags.join(', ')}`);
                return false;
            }
        }
        
        const botData = this.bots[name];
        const shouldReconnect = flags.hasOwnProperty('-reconnect');
        const maxReconnects = flags['-maxreconnect'] ? parseInt(flags['-maxreconnect']) : 999;
        
        this.reconnectFlags[name] = shouldReconnect ? { flags, maxReconnects } : null;
        this.reconnectAttempts[name] = 0;
        this.spawnFlags[name] = flags;
        this.firstSpawn[name] = true;
        
        const createBotInstance = () => {
            try {
                const bot = mineflayer.createBot({
                    host: botData.host,
                    port: botData.port,
                    username: name,
                    version: botData.version,
                    hideErrors: true
                });
                
                this.activeBots[name] = bot;
                setupBotHandlers(this, bot, name, flags);
                
                this.log(`Uruchomiono bota: ${name}`);
                this.io.emit('botList', this.getBotsList());
                return true;
            } catch (err) {
                this.log(`Blad podczas uruchamiania bota: ${err.message}`);
                return false;
            }
        };
        
        return createBotInstance();
    }
    
    stopBot(name) {
        if (!this.activeBots[name]) {
            this.log(`Bot '${name}' nie jest uruchomiony!`);
            return false;
        }
        
        const bot = this.activeBots[name];
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
        
        delete this.reconnectFlags[name];
        delete this.reconnectAttempts[name];
        delete this.spawnFlags[name];
        delete this.firstSpawn[name];
        bot.quit();
        delete this.activeBots[name];
        this.log(`Zatrzymano bota: ${name}`);
        this.io.emit('botList', this.getBotsList());
        return true;
    }
    
    deleteBot(name) {
        if (!this.bots[name]) {
            this.log(`Bot '${name}' nie istnieje!`);
            return false;
        }
        
        if (this.activeBots[name]) {
            this.stopBot(name);
        }
        
        delete this.reconnectFlags[name];
        delete this.reconnectAttempts[name];
        delete this.spawnFlags[name];
        delete this.firstSpawn[name];
        
        const jsonPath = path.join(this.botsDir, `${name}.json`);
        if (fs.existsSync(jsonPath)) {
            fs.unlinkSync(jsonPath);
        }
        
        delete this.bots[name];
        this.log(`Usunieto bota: ${name}`);
        this.io.emit('botList', this.getBotsList());
        return true;
    }
    
    getBotsList() {
        const botsList = [];
        for (const name in this.bots) {
            botsList.push({
                name: name,
                status: this.activeBots[name] ? 'DZIALA' : 'ZATRZYMANY'
            });
        }
        return botsList;
    }
    
    enterLogs(socketId, botName) {
        return enterLogs(this, socketId, botName);
    }
    
    exitLogs(socketId) {
        return exitLogs(this, socketId);
    }
    
    sendMessage(socketId, message) {
        return sendMessage(this, socketId, message);
    }
    
    listItems(socketId) {
        return listItems(this, socketId);
    }
    
    listItemsCommand(socketId, botName, together = false) {
        return listItemsCommand(this, socketId, botName, together);
    }
    
    executeLoopUse(socketId, botName) {
        return executeLoopUse(this, socketId, botName);
    }
    
    executeWalk(socketId, botName, direction) {
        return executeWalk(this, socketId, botName, direction);
    }
    
    executeDropItem(socketId, botName, slot) {
        return executeDropItem(this, socketId, botName, slot);
    }
    
    executeLook(socketId, botName, yaw, pitch) {
        return executeLook(this, socketId, botName, yaw, pitch);
    }
    
    executeSetSlot(socketId, botName, slot) {
        return executeSetSlot(this, socketId, botName, slot);
    }
    
    executeRightClick(socketId, botName) {
        return executeRightClick(this, socketId, botName);
    }
    
    executeLeftClick(socketId, botName) {
        return executeLeftClick(this, socketId, botName);
    }
    
    executeGuiClick(socketId, botName, slot) {
        return executeGuiClick(this, socketId, botName, slot);
    }
    
    executeAutoEat(socketId, botName) {
        return executeAutoEat(this, socketId, botName);
    }
    
    executeFollow(socketId, botName, targetPlayer) {
        return executeFollow(this, socketId, botName, targetPlayer);
    }
    
    executeAutoFish(socketId, botName) {
        return executeAutoFish(this, socketId, botName);
    }
    
    executeGoTo(socketId, botName, x, y, z) {
        return executeGoTo(this, socketId, botName, x, y, z);
    }
    
    executeAttack(socketId, botName, target, range) {
        return executeAttack(this, socketId, botName, target, range);
    }
    
    executeStats(socketId, botName) {
        return executeStats(this, socketId, botName);
    }
}

const manager = new BotManager(io);

app.use(express.static('web'));

io.on('connection', (socket) => {
    console.log('Nowy klient polaczony');
    
    socket.on('getInitialData', () => {
        socket.emit('log', 'kaqvuNodeBot - Web Interface');
        socket.emit('log', '');
        socket.emit('botList', manager.getBotsList());
    });
    
    socket.on('command', (command) => {
        const parts = command.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        
        if (!cmd) return;
        
        socket.emit('log', `> ${command}`);
        
        if (cmd === '.create') {
            if (parts.length !== 4 && parts.length !== 5) {
                socket.emit('log', 'Uzycie: .create <nazwa|.randomname> <ip[:port]> <wersja> [liczba]');
                socket.emit('log', 'Przyklad: .create bot1 hypixel.net 1.8.9');
                socket.emit('log', 'Przyklad: .create .randomname sigma.pl 1.8 5');
            } else {
                if (parts[1] === '.randomname') {
                    const count = parts[4] ? parseInt(parts[4]) : 1;
                    if (isNaN(count)) {
                        socket.emit('log', 'Liczba musi byc liczba od 1 do 1000!');
                    } else {
                        manager.createRandomBots(count, parts[2], parts[3]);
                    }
                } else {
                    manager.createBot(parts[1], parts[2], parts[3]);
                }
            }
        } else if (cmd === '.start') {
            if (parts.length < 2) {
                socket.emit('log', 'Uzycie: .start <nazwa|*> [flagi]');
                socket.emit('log', 'Dostepne flagi:');
                socket.emit('log', '  -joinsend <wiadomosc> - Wiadomosc po dolaczeniu do serwera (1s)');
                socket.emit('log', '  -reconnect - Automatyczne ponowne laczenie');
                socket.emit('log', '  -maxreconnect <liczba> - Max prob reconnect (domyslnie 999)');
                socket.emit('log', '  -jumpafk - Anti-AFK jump (ciagle skakanie)');
                socket.emit('log', '  -jumpafk:<sekundy> - Jump przez X sekund po spawnie');
                socket.emit('log', '  -sneakafk - Anti-AFK sneak (ciagle shift)');
                socket.emit('log', '  -sneakafk:<sekundy> - Sneak przez X sekund po spawnie');
                socket.emit('log', '  -autofish - Auto lowienie ryb po spawnie');
                socket.emit('log', '  -autoeat - Auto jedzenie po spawnie');
                socket.emit('log', '');
                socket.emit('log', 'Flagi kolejnosciowe:');
                socket.emit('log', '  -delayflag <ms> - Customowy delay miedzy flagami (domyslnie 5000ms)');
                socket.emit('log', '  -setslot <0-8> - Ustawienie slotu (hotbar)');
                socket.emit('log', '  -rightclick - Klikniecie prawym przyciskiem myszy');
                socket.emit('log', '  -leftclick - Klikniecie lewym przyciskiem myszy');
                socket.emit('log', '  -guiclick <0-53> - Klikniecie slotu w GUI');
                socket.emit('log', '');
                socket.emit('log', 'Uzyj * aby uruchomic wszystkie boty:');
                socket.emit('log', '  .start * -reconnect -jumpafk:10 -sneakafk');
            } else {
                const botName = parts[1];
                const flagArgs = parts.slice(2);
                const flags = manager.parseFlags(flagArgs);
                
                if (botName === '*') {
                    const allBots = Object.keys(manager.bots);
                    if (allBots.length === 0) {
                        socket.emit('log', 'Brak utworzonych botow!');
                    } else {
                        const botsToStart = allBots.filter(name => !manager.activeBots[name]);
                        
                        if (botsToStart.length === 0) {
                            socket.emit('log', 'Wszystkie boty juz sa uruchomione!');
                        } else {
                            const validFlags = ['-joinsend', '-reconnect', '-maxreconnect', '-jumpafk', '-sneakafk', '-delayflag', '-setslot', '-rightclick', '-leftclick', '-guiclick'];
                            let hasInvalidFlag = false;
                            
                            for (const flag of Object.keys(flags)) {
                                const baseFlag = flag.split(':')[0];
                                if (!validFlags.includes(baseFlag)) {
                                    socket.emit('log', `Nieznana flaga: ${flag}`);
                                    socket.emit('log', `Dostepne flagi: ${validFlags.join(', ')}`);
                                    hasInvalidFlag = true;
                                    break;
                                }
                            }
                            
                            if (hasInvalidFlag) {
                                return;
                            }
                            
                            socket.emit('log', `Uruchamianie ${botsToStart.length} botow (co 3s)...`);
                            
                            botsToStart.forEach((name, index) => {
                                setTimeout(() => {
                                    manager.startBot(name, flags);
                                }, index * 3000);
                            });
                        }
                    }
                } else {
                    manager.startBot(botName, flags);
                }
            }
        } else if (cmd === '.stop') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .stop <nazwa|*>');
            } else {
                const botName = parts[1];
                
                if (botName === '*') {
                    const activeBots = Object.keys(manager.activeBots);
                    if (activeBots.length === 0) {
                        socket.emit('log', 'Brak aktywnych botow!');
                    } else {
                        let stopped = 0;
                        for (const name of activeBots) {
                            if (manager.stopBot(name)) {
                                stopped++;
                            }
                        }
                        socket.emit('log', `Zatrzymano ${stopped} botow`);
                    }
                } else {
                    manager.stopBot(botName);
                }
            }
        } else if (cmd === '.delete') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .delete <nazwa>');
            } else {
                manager.deleteBot(parts[1]);
            }
        } else if (cmd === '.logs') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .logs <nazwa|*>');
            } else {
                manager.enterLogs(socket.id, parts[1]);
            }
        } else if (cmd === '.listitems') {
            if (parts.length < 2) {
                socket.emit('log', 'Uzycie: .listitems <nazwa|*> [together]');
                socket.emit('log', 'Przyklad: .listitems kaqvu_x1');
                socket.emit('log', 'Przyklad: .listitems * - pokazuje wszystkie boty oddzielnie');
                socket.emit('log', 'Przyklad: .listitems * together - laczy itemy wszystkich botow');
            } else {
                const botName = parts[1];
                const together = parts[2] === 'together';
                manager.listItemsCommand(socket.id, botName, together);
            }
        } else if (cmd === '.loopuse') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .loopuse <nazwa|*>');
                socket.emit('log', 'Przyklad: .loopuse bot1');
                socket.emit('log', 'Przyklad: .loopuse * - wszystkie boty');
            } else {
                manager.executeLoopUse(socket.id, parts[1]);
            }
        } else if (cmd === '.walk') {
            if (parts.length !== 3) {
                socket.emit('log', 'Uzycie: .walk <nazwa|*> <forward|back|left|right>');
                socket.emit('log', 'Przyklad: .walk bot1 forward');
                socket.emit('log', 'Przyklad: .walk * back');
            } else {
                manager.executeWalk(socket.id, parts[1], parts[2]);
            }
        } else if (cmd === '.dropitem') {
            if (parts.length !== 3) {
                socket.emit('log', 'Uzycie: .dropitem <nazwa|*> <slot>');
                socket.emit('log', 'Przyklad: .dropitem bot1 36');
                socket.emit('log', 'Przyklad: .dropitem * 0');
            } else {
                manager.executeDropItem(socket.id, parts[1], parts[2]);
            }
        } else if (cmd === '.look') {
            if (parts.length !== 4) {
                socket.emit('log', 'Uzycie: .look <nazwa|*> <yaw> <pitch>');
                socket.emit('log', 'Przyklad: .look bot1 0 0');
                socket.emit('log', 'Przyklad: .look * 1.5 -0.5');
            } else {
                manager.executeLook(socket.id, parts[1], parts[2], parts[3]);
            }
        } else if (cmd === '.setslot') {
            if (parts.length !== 3) {
                socket.emit('log', 'Uzycie: .setslot <nazwa|*> <0-8>');
                socket.emit('log', 'Przyklad: .setslot bot1 0');
                socket.emit('log', 'Przyklad: .setslot * 5');
            } else {
                manager.executeSetSlot(socket.id, parts[1], parts[2]);
            }
        } else if (cmd === '.rightclick') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .rightclick <nazwa|*>');
                socket.emit('log', 'Przyklad: .rightclick bot1');
                socket.emit('log', 'Przyklad: .rightclick *');
            } else {
                manager.executeRightClick(socket.id, parts[1]);
            }
        } else if (cmd === '.leftclick') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .leftclick <nazwa|*>');
                socket.emit('log', 'Przyklad: .leftclick bot1');
                socket.emit('log', 'Przyklad: .leftclick *');
            } else {
                manager.executeLeftClick(socket.id, parts[1]);
            }
        } else if (cmd === '.guiclick') {
            if (parts.length !== 3) {
                socket.emit('log', 'Uzycie: .guiclick <nazwa|*> <0-53>');
                socket.emit('log', 'Przyklad: .guiclick bot1 10');
                socket.emit('log', 'Przyklad: .guiclick * 0');
            } else {
                manager.executeGuiClick(socket.id, parts[1], parts[2]);
            }
        } else if (cmd === '.autoeat') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .autoeat <nazwa|*>');
                socket.emit('log', 'Przyklad: .autoeat bot1');
                socket.emit('log', 'Przyklad: .autoeat *');
            } else {
                manager.executeAutoEat(socket.id, parts[1]);
            }
        } else if (cmd === '.follow') {
            if (parts.length !== 3) {
                socket.emit('log', 'Uzycie: .follow <nazwa|*> <nick gracza>');
                socket.emit('log', 'Przyklad: .follow bot1 kaqvu');
                socket.emit('log', 'Przyklad: .follow * Notch');
            } else {
                manager.executeFollow(socket.id, parts[1], parts[2]);
            }
        } else if (cmd === '.autofish') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .autofish <nazwa|*>');
                socket.emit('log', 'Przyklad: .autofish bot1');
                socket.emit('log', 'Przyklad: .autofish *');
            } else {
                manager.executeAutoFish(socket.id, parts[1]);
            }
        } else if (cmd === '.goto') {
            if (parts.length !== 5) {
                socket.emit('log', 'Uzycie: .goto <nazwa|*> <x> <y> <z>');
                socket.emit('log', 'Przyklad: .goto bot1 100 64 200');
                socket.emit('log', 'Przyklad: .goto * 0 70 0');
            } else {
                manager.executeGoTo(socket.id, parts[1], parts[2], parts[3], parts[4]);
            }
        } else if (cmd === '.attack') {
            if (parts.length !== 4) {
                socket.emit('log', 'Uzycie: .attack <nazwa|*> <mob|player|all> <range>');
                socket.emit('log', 'Przyklad: .attack bot1 mob 4');
                socket.emit('log', 'Przyklad: .attack * player 5');
            } else {
                manager.executeAttack(socket.id, parts[1], parts[2], parts[3]);
            }
        } else if (cmd === '.stats') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: .stats <nazwa|*>');
                socket.emit('log', 'Przyklad: .stats bot1');
                socket.emit('log', 'Przyklad: .stats *');
            } else {
                manager.executeStats(socket.id, parts[1]);
            }
        } else if (cmd === '.list') {
            const count = Object.keys(manager.bots).length;
            socket.emit('log', `Utworzone boty: ${count}`);
            if (count > 0) {
                for (const name in manager.bots) {
                    const status = manager.activeBots[name] ? 'DZIALA' : 'ZATRZYMANY';
                    socket.emit('log', `  - ${name} [${status}]`);
                }
            }
        } else if (cmd === '.clear') {
            socket.emit('clearConsole');
            socket.emit('log', 'kaqvuNodeBot - Web Interface');
            socket.emit('log', '');
        } else if (cmd === '.blockchat') {
            const status = manager.toggleBlockChat();
            if (status) {
                socket.emit('log', 'Block chat WLACZONY - nie mozesz pisac w logach');
            } else {
                socket.emit('log', 'Block chat WYLACZONY - mozesz pisac w logach');
            }
        } else if (cmd === '.help') {
            socket.emit('log', 'Komendy glowne:');
            socket.emit('log', '  .create <nazwa> <ip[:port]> <wersja>');
            socket.emit('log', '  .start <nazwa|*> [flagi]');
            socket.emit('log', '  .stop <nazwa|*>');
            socket.emit('log', '  .delete <nazwa>');
            socket.emit('log', '  .logs <nazwa|*>');
            socket.emit('log', '  .listitems <nazwa|*> [together]');
            socket.emit('log', '  .list');
            socket.emit('log', '  .clear');
            socket.emit('log', '  .blockchat - wlacz/wylacz pisanie w logach');
            socket.emit('log', '  .help');
            socket.emit('log', '');
            socket.emit('log', 'Komendy akcji:');
            socket.emit('log', '  .loopuse <nazwa|*>');
            socket.emit('log', '  .walk <nazwa|*> <forward|back|left|right>');
            socket.emit('log', '  .dropitem <nazwa|*> <slot>');
            socket.emit('log', '  .look <nazwa|*> <yaw> <pitch>');
            socket.emit('log', '  .setslot <nazwa|*> <0-8>');
            socket.emit('log', '  .rightclick <nazwa|*>');
            socket.emit('log', '  .leftclick <nazwa|*>');
            socket.emit('log', '  .guiclick <nazwa|*> <0-53>');
            socket.emit('log', '  .autoeat <nazwa|*>');
            socket.emit('log', '  .follow <nazwa|*> <nick gracza>');
            socket.emit('log', '  .autofish <nazwa|*>');
            socket.emit('log', '  .goto <nazwa|*> <x> <y> <z>');
            socket.emit('log', '  .attack <nazwa|*> <mob|player|all> <range>');
            socket.emit('log', '  .stats <nazwa|*>');
            socket.emit('log', '');
            socket.emit('log', 'Flagi startu:');
            socket.emit('log', '  -joinsend <wiadomosc> - Wiadomosc po dolaczeniu (1s)');
            socket.emit('log', '  -reconnect - Automatyczne ponowne laczenie');
            socket.emit('log', '  -maxreconnect <liczba> - Max prob reconnect');
            socket.emit('log', '  -jumpafk - Anti-AFK jump');
            socket.emit('log', '  -jumpafk:<sekundy> - Jump przez X sekund');
            socket.emit('log', '  -sneakafk - Anti-AFK sneak');
            socket.emit('log', '  -sneakafk:<sekundy> - Sneak przez X sekund');
            socket.emit('log', '  -autofish - Auto lowienie ryb');
            socket.emit('log', '  -autoeat - Auto jedzenie');
            socket.emit('log', '');
            socket.emit('log', 'Flagi kolejnosciowe:');
            socket.emit('log', '  -delayflag <ms> - Customowy delay');
            socket.emit('log', '  -setslot <0-8> - Ustawienie slotu');
            socket.emit('log', '  -rightclick - Prawy przycisk');
            socket.emit('log', '  -leftclick - Lewy przycisk');
            socket.emit('log', '  -guiclick <0-53> - Klikniecie GUI');
        } else {
            socket.emit('log', 'Nieznana komenda! Wpisz .help');
        }
    });
    
    socket.on('logsMessage', (message) => {
        const trimmed = message.trim();
        
        if (trimmed === '.exit') {
            manager.exitLogs(socket.id);
        } else if (trimmed === '.clear') {
            socket.emit('clearConsole');
            socket.emit('log', 'kaqvuNodeBot - Web Interface');
            socket.emit('log', '');
        } else if (trimmed === '.listitems') {
            manager.listItems(socket.id);
        } else if (trimmed.startsWith('.loopuse')) {
            const botName = manager.logsModes[socket.id];
            if (botName) {
                manager.executeLoopUse(socket.id, botName);
            }
        } else if (trimmed.startsWith('.walk ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1]) {
                manager.executeWalk(socket.id, botName, parts[1]);
            }
        } else if (trimmed.startsWith('.dropitem ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1]) {
                manager.executeDropItem(socket.id, botName, parts[1]);
            }
        } else if (trimmed.startsWith('.look ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1] && parts[2]) {
                manager.executeLook(socket.id, botName, parts[1], parts[2]);
            }
        } else if (trimmed.startsWith('.setslot ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1]) {
                manager.executeSetSlot(socket.id, botName, parts[1]);
            }
        } else if (trimmed === '.rightclick') {
            const botName = manager.logsModes[socket.id];
            if (botName) {
                manager.executeRightClick(socket.id, botName);
            }
        } else if (trimmed === '.leftclick') {
            const botName = manager.logsModes[socket.id];
            if (botName) {
                manager.executeLeftClick(socket.id, botName);
            }
        } else if (trimmed.startsWith('.guiclick ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1]) {
                manager.executeGuiClick(socket.id, botName, parts[1]);
            }
        } else if (trimmed === '.autoeat') {
            const botName = manager.logsModes[socket.id];
            if (botName) {
                manager.executeAutoEat(socket.id, botName);
            }
        } else if (trimmed.startsWith('.follow ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1]) {
                manager.executeFollow(socket.id, botName, parts[1]);
            }
        } else if (trimmed === '.autofish') {
            const botName = manager.logsModes[socket.id];
            if (botName) {
                manager.executeAutoFish(socket.id, botName);
            }
        } else if (trimmed.startsWith('.goto ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1] && parts[2] && parts[3]) {
                manager.executeGoTo(socket.id, botName, parts[1], parts[2], parts[3]);
            }
        } else if (trimmed.startsWith('.attack ')) {
            const parts = trimmed.split(/\s+/);
            const botName = manager.logsModes[socket.id];
            if (botName && parts[1] && parts[2]) {
                manager.executeAttack(socket.id, botName, parts[1], parts[2]);
            }
        } else if (trimmed === '.stats') {
            const botName = manager.logsModes[socket.id];
            if (botName) {
                manager.executeStats(socket.id, botName);
            }
        } else if (trimmed) {
            if (manager.settings.blockChat) {
                manager.log('Block chat jest wlaczony! Wpisz .blockchat w menu glownym aby wylaczyc.', socket.id);
            } else {
                manager.sendMessage(socket.id, trimmed);
            }
        }
    });
    
    socket.on('disconnect', () => {
        if (manager.logsModes[socket.id]) {
            delete manager.logsModes[socket.id];
        }
        console.log('Klient rozlaczony');
    });
});

server.listen(PORT, () => {
    console.log(`\nkaqvuNodeBot - Web Interface`);
    console.log(`Server dziala na http://localhost:${PORT}`);
    console.log(`Otwórz przegladarke i przejdz do tego adresu\n`);
});