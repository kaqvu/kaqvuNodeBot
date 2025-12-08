const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8080;

class BotManager {
    constructor(io) {
        this.io = io;
        this.botsDir = path.join(__dirname, 'bots');
        this.bots = {};
        this.activeBots = {};
        this.logsModes = {};
        this.reconnectFlags = {};
        this.spawnFlags = {};
        this.firstSpawn = {};
        this.availableNames = [];
        
        if (!fs.existsSync(this.botsDir)) {
            fs.mkdirSync(this.botsDir);
        }
        
        this.loadNames();
        this.loadBots();
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
        
        const botData = this.bots[name];
        const shouldReconnect = flags.hasOwnProperty('-r');
        
        this.reconnectFlags[name] = shouldReconnect ? flags : null;
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
                
                bot.on('login', () => {
                    this.log(`[${name}] Bot zalogowany na serwer!`);
                    this.io.emit('botList', this.getBotsList());
                    
                    if (this.firstSpawn[name]) {
                        const currentFlags = this.spawnFlags[name] || flags;
                        
                        if (currentFlags['-js']) {
                            setTimeout(() => {
                                bot.chat(currentFlags['-js']);
                                this.log(`[${name}] Wyslano wiadomosc logowania: ${currentFlags['-js']}`);
                            }, 1000);
                        }
                    }
                });
                
                bot.on('spawn', () => {
                    this.log(`[${name}] Bot zespawnowany w grze!`);
                    
                    if (!this.firstSpawn[name]) {
                        return;
                    }
                    
                    this.firstSpawn[name] = false;
                    
                    const currentFlags = this.spawnFlags[name] || flags;
                    
                    if (currentFlags.hasOwnProperty('-j')) {
                        const jumpInterval = setInterval(() => {
                            if (this.activeBots[name] && bot.entity) {
                                bot.setControlState('jump', true);
                                setTimeout(() => {
                                    if (this.activeBots[name]) {
                                        bot.setControlState('jump', false);
                                    }
                                }, 100);
                            } else {
                                clearInterval(jumpInterval);
                            }
                        }, 1000);
                        
                        bot.jumpInterval = jumpInterval;
                        this.log(`[${name}] Anti-AFK jump wlaczony`);
                    }
                    
                    const sequenceFlags = [];
                    const flagOrder = ['-ss', '-rc', '-lc', '-gc'];
                    
                    for (const flag of flagOrder) {
                        if (currentFlags[flag] !== undefined) {
                            sequenceFlags.push(flag);
                        }
                    }
                    
                    let delay = 5000;
                    
                    for (const flag of sequenceFlags) {
                        if (flag === '-ss') {
                            const slot = parseInt(currentFlags['-ss']);
                            if (!isNaN(slot) && slot >= 0 && slot <= 8) {
                                setTimeout(() => {
                                    bot.setQuickBarSlot(slot);
                                    this.log(`[${name}] Ustawiono slot: ${slot}`);
                                }, delay);
                                delay += 5000;
                            }
                        } else if (flag === '-rc') {
                            setTimeout(() => {
                                bot.activateItem();
                                this.log(`[${name}] Kliknieto prawy przycisk myszy`);
                            }, delay);
                            delay += 5000;
                        } else if (flag === '-lc') {
                            setTimeout(() => {
                                bot.swingArm();
                                this.log(`[${name}] Kliknieto lewy przycisk myszy`);
                            }, delay);
                            delay += 5000;
                        } else if (flag === '-gc') {
                            const guiSlot = parseInt(currentFlags['-gc']);
                            if (!isNaN(guiSlot) && guiSlot >= 0 && guiSlot <= 53) {
                                setTimeout(() => {
                                    const window = bot.currentWindow;
                                    if (window) {
                                        bot.clickWindow(guiSlot, 0, 0);
                                        this.log(`[${name}] Kliknieto slot GUI: ${guiSlot}`);
                                    } else {
                                        this.log(`[${name}] Brak otwartego GUI`);
                                    }
                                }, delay);
                                delay += 5000;
                            }
                        }
                    }
                });
                
                bot.on('kicked', (reason) => {
                    this.log(`[${name}] Wyrzucono z serwera: ${reason}`);
                    delete this.activeBots[name];
                    this.io.emit('botList', this.getBotsList());
                    
                    if (this.reconnectFlags[name]) {
                        this.log(`[${name}] Ponowne laczenie za 5 sekund...`);
                        setTimeout(() => {
                            if (!this.activeBots[name] && this.reconnectFlags[name]) {
                                this.firstSpawn[name] = true;
                                createBotInstance();
                            }
                        }, 5000);
                    }
                });
                
                bot.on('end', () => {
                    this.log(`[${name}] Polaczenie zakonczone`);
                    delete this.activeBots[name];
                    this.io.emit('botList', this.getBotsList());
                    
                    if (this.reconnectFlags[name]) {
                        this.log(`[${name}] Ponowne laczenie za 5 sekund...`);
                        setTimeout(() => {
                            if (!this.activeBots[name] && this.reconnectFlags[name]) {
                                this.firstSpawn[name] = true;
                                createBotInstance();
                            }
                        }, 5000);
                    }
                });
                
                bot.on('error', (err) => {
                    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
                        return;
                    }
                    this.log(`[${name}] ERROR: ${err.message}`);
                });
                
                bot.on('messagestr', (message) => {
                    for (const socketId in this.logsModes) {
                        const mode = this.logsModes[socketId];
                        if (mode === name || mode === '*') {
                            this.log(`[${name}] ${message}`, socketId);
                        }
                    }
                });
                
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
        
        delete this.reconnectFlags[name];
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
        if (botName === '*') {
            const activeBots = Object.keys(this.activeBots);
            if (activeBots.length === 0) {
                this.log(`Brak aktywnych botow!`, socketId);
                return false;
            }
            
            this.logsModes[socketId] = '*';
            this.log(`\n${'='.repeat(50)}`, socketId);
            this.log(`LOGI WSZYSTKICH BOTOW (${activeBots.length})`, socketId);
            this.log(`Wpisz '.exit' aby wyjsc z logow`, socketId);
            this.log(`Wpisz '.listitems' aby zobaczyc ekwipunek`, socketId);
            this.log(`Wpisz wiadomosc aby wyslac na chat wszystkich botow`, socketId);
            this.log(`${'='.repeat(50)}\n`, socketId);
            this.io.to(socketId).emit('logsMode', true);
            return true;
        }
        
        if (!this.activeBots[botName]) {
            this.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
            return false;
        }
        
        this.logsModes[socketId] = botName;
        this.log(`\n${'='.repeat(50)}`, socketId);
        this.log(`LOGI BOTA: ${botName}`, socketId);
        this.log(`Wpisz '.exit' aby wyjsc z logow`, socketId);
        this.log(`Wpisz '.listitems' aby zobaczyc ekwipunek`, socketId);
        this.log(`Wpisz wiadomosc aby wyslac na chat`, socketId);
        this.log(`${'='.repeat(50)}\n`, socketId);
        this.io.to(socketId).emit('logsMode', true);
        return true;
    }
    
    exitLogs(socketId) {
        const botName = this.logsModes[socketId];
        if (botName) {
            delete this.logsModes[socketId];
            if (botName === '*') {
                this.log(`\nWychodzenie z logow wszystkich botow...\n`, socketId);
            } else {
                this.log(`\nWychodzenie z logow bota ${botName}...\n`, socketId);
            }
        }
        this.io.to(socketId).emit('logsMode', false);
    }
    
    sendMessage(socketId, message) {
        const botName = this.logsModes[socketId];
        if (!botName) {
            return false;
        }
        
        if (botName === '*') {
            const activeBots = Object.keys(this.activeBots);
            let sent = 0;
            
            for (const name of activeBots) {
                try {
                    this.activeBots[name].chat(message);
                    sent++;
                } catch (err) {
                    this.log(`[${name}] [ERROR] Nie mozna wyslac: ${err.message}`, socketId);
                }
            }
            
            if (sent > 0) {
                if (message.startsWith('/')) {
                    this.log(`[CMD -> ${sent} botow] ${message}`, socketId);
                } else {
                    this.log(`[SEND -> ${sent} botow] ${message}`, socketId);
                }
            }
            return sent > 0;
        }
        
        if (!this.activeBots[botName]) {
            this.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
            return false;
        }
        
        try {
            this.activeBots[botName].chat(message);
            if (message.startsWith('/')) {
                this.log(`[CMD] ${message}`, socketId);
            } else {
                this.log(`[SEND] ${message}`, socketId);
            }
            return true;
        } catch (err) {
            this.log(`[ERROR] Nie mozna wyslac: ${err.message}`, socketId);
            return false;
        }
    }
    
    listItems(socketId) {
        const botName = this.logsModes[socketId];
        if (!botName) {
            return false;
        }
        
        if (botName === '*') {
            const activeBots = Object.keys(this.activeBots);
            
            if (activeBots.length === 0) {
                this.log('Brak aktywnych botow!', socketId);
                return false;
            }
            
            for (const name of activeBots) {
                const bot = this.activeBots[name];
                const items = bot.inventory.items();
                
                this.log(`\n${'='.repeat(50)}`, socketId);
                this.log(`EKWIPUNEK BOTA: ${name}`, socketId);
                this.log(`${'='.repeat(50)}`, socketId);
                
                if (items.length === 0) {
                    this.log('Ekwipunek jest pusty!', socketId);
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
                        
                        this.log(itemInfo, socketId);
                    }
                }
                
                this.log(`${'='.repeat(50)}\n`, socketId);
            }
            
            return true;
        }
        
        if (!this.activeBots[botName]) {
            this.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
            return false;
        }
        
        const bot = this.activeBots[botName];
        const items = bot.inventory.items();
        
        this.log(`\n${'='.repeat(50)}`, socketId);
        this.log(`EKWIPUNEK BOTA: ${botName}`, socketId);
        this.log(`${'='.repeat(50)}`, socketId);
        
        if (items.length === 0) {
            this.log('Ekwipunek jest pusty!', socketId);
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
                
                this.log(itemInfo, socketId);
            }
        }
        
        this.log(`${'='.repeat(50)}\n`, socketId);
        return true;
    }
    
    listItemsCommand(socketId, botName, together = false) {
        if (botName === '*') {
            const activeBotsNames = Object.keys(this.activeBots);
            
            if (activeBotsNames.length === 0) {
                this.log('Brak aktywnych botow!', socketId);
                return false;
            }
            
            if (together) {
                const itemsMap = new Map();
                
                for (const name of activeBotsNames) {
                    const bot = this.activeBots[name];
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
                
                this.log(`\n${'='.repeat(50)}`, socketId);
                this.log(`EKWIPUNEK WSZYSTKICH BOTOW`, socketId);
                this.log(`${'='.repeat(50)}`, socketId);
                
                if (itemsMap.size === 0) {
                    this.log('Wszystkie ekwipunki sa puste!', socketId);
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
                        
                        this.log(itemInfo, socketId);
                    }
                }
                
                this.log(`${'='.repeat(50)}\n`, socketId);
            } else {
                for (const name of activeBotsNames) {
                    const bot = this.activeBots[name];
                    const items = bot.inventory.items();
                    
                    this.log(`\n${'='.repeat(50)}`, socketId);
                    this.log(`EKWIPUNEK BOTA: ${name}`, socketId);
                    this.log(`${'='.repeat(50)}`, socketId);
                    
                    if (items.length === 0) {
                        this.log('Ekwipunek jest pusty!', socketId);
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
                            
                            this.log(itemInfo, socketId);
                        }
                    }
                    
                    this.log(`${'='.repeat(50)}\n`, socketId);
                }
            }
            
            return true;
        }
        
        if (!this.bots[botName]) {
            this.log(`Bot '${botName}' nie istnieje!`, socketId);
            return false;
        }
        
        if (!this.activeBots[botName]) {
            this.log(`Bot '${botName}' nie jest uruchomiony!`, socketId);
            return false;
        }
        
        const bot = this.activeBots[botName];
        const items = bot.inventory.items();
        
        this.log(`\n${'='.repeat(50)}`, socketId);
        this.log(`EKWIPUNEK BOTA: ${botName}`, socketId);
        this.log(`${'='.repeat(50)}`, socketId);
        
        if (items.length === 0) {
            this.log('Ekwipunek jest pusty!', socketId);
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
                
                this.log(itemInfo, socketId);
            }
        }
        
        this.log(`${'='.repeat(50)}\n`, socketId);
        return true;
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
        
        if (cmd === 'create') {
            if (parts.length !== 4 && parts.length !== 5) {
                socket.emit('log', 'Uzycie: create <nazwa|.randomname> <ip[:port]> <wersja> [liczba]');
                socket.emit('log', 'Przyklad: create bot1 hypixel.net 1.8.9');
                socket.emit('log', 'Przyklad: create .randomname sigma.pl 1.8 5');
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
        } else if (cmd === 'start') {
            if (parts.length < 2) {
                socket.emit('log', 'Uzycie: start <nazwa|*> [flagi]');
                socket.emit('log', 'Dostepne flagi:');
                socket.emit('log', '  -js <wiadomosc> - Wiadomosc po dolaczeniu do serwera (1s)');
                socket.emit('log', '  -r - Automatyczne ponowne laczenie');
                socket.emit('log', '  -j - Anti-AFK jump (ciagle skakanie)');
                socket.emit('log', '');
                socket.emit('log', 'Flagi kolejnosciowe (po 5s kazda):');
                socket.emit('log', '  -ss <0-8> - Ustawienie slotu (hotbar)');
                socket.emit('log', '  -rc - Klikniecie prawym przyciskiem myszy');
                socket.emit('log', '  -lc - Klikniecie lewym przyciskiem myszy');
                socket.emit('log', '  -gc <0-53> - Klikniecie slotu w GUI');
                socket.emit('log', '');
                socket.emit('log', 'Uzyj * aby uruchomic wszystkie boty:');
                socket.emit('log', '  start * -r -j');
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
        } else if (cmd === 'stop') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: stop <nazwa|*>');
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
        } else if (cmd === 'delete') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: delete <nazwa>');
            } else {
                manager.deleteBot(parts[1]);
            }
        } else if (cmd === 'logs') {
            if (parts.length !== 2) {
                socket.emit('log', 'Uzycie: logs <nazwa|*>');
            } else {
                manager.enterLogs(socket.id, parts[1]);
            }
        } else if (cmd === 'listitems') {
            if (parts.length < 2) {
                socket.emit('log', 'Uzycie: listitems <nazwa|*> [together]');
                socket.emit('log', 'Przyklad: listitems kaqvu_x1');
                socket.emit('log', 'Przyklad: listitems * - pokazuje wszystkie boty oddzielnie');
                socket.emit('log', 'Przyklad: listitems * together - laczy itemy wszystkich botow');
            } else {
                const botName = parts[1];
                const together = parts[2] === 'together';
                manager.listItemsCommand(socket.id, botName, together);
            }
        } else if (cmd === 'list') {
            const count = Object.keys(manager.bots).length;
            socket.emit('log', `Utworzone boty: ${count}`);
            if (count > 0) {
                for (const name in manager.bots) {
                    const status = manager.activeBots[name] ? 'DZIALA' : 'ZATRZYMANY';
                    socket.emit('log', `  - ${name} [${status}]`);
                }
            }
        } else if (cmd === 'clear') {
            socket.emit('clearConsole');
            socket.emit('log', 'kaqvuNodeBot - Web Interface');
            socket.emit('log', '');
        } else if (cmd === 'help') {
            socket.emit('log', 'Komendy:');
            socket.emit('log', '  create <nazwa> <ip[:port]> <wersja>');
            socket.emit('log', '  start <nazwa> [flagi]');
            socket.emit('log', '  stop <nazwa>');
            socket.emit('log', '  delete <nazwa>');
            socket.emit('log', '  logs <nazwa>');
            socket.emit('log', '  listitems <nazwa|*> [together]');
            socket.emit('log', '  list');
            socket.emit('log', '  clear');
            socket.emit('log', '  help');
            socket.emit('log', '');
            socket.emit('log', 'Flagi startu:');
            socket.emit('log', '  -js <wiadomosc> - Wiadomosc po dolaczeniu (1s)');
            socket.emit('log', '  -r - Automatyczne ponowne laczenie');
            socket.emit('log', '  -j - Anti-AFK jump (ciagle skakanie)');
            socket.emit('log', '');
            socket.emit('log', 'Flagi kolejnosciowe (po 5s kazda):');
            socket.emit('log', '  -ss <0-8> - Ustawienie slotu (hotbar)');
            socket.emit('log', '  -rc - Klikniecie prawym przyciskiem myszy');
            socket.emit('log', '  -lc - Klikniecie lewym przyciskiem myszy');
            socket.emit('log', '  -gc <0-53> - Klikniecie slotu w GUI');
        } else {
            socket.emit('log', 'Nieznana komenda!');
        }
    });
    
    socket.on('logsMessage', (message) => {
        const trimmed = message.trim();
        
        if (trimmed === '.exit') {
            manager.exitLogs(socket.id);
        } else if (trimmed === '.listitems') {
            manager.listItems(socket.id);
        } else if (trimmed) {
            manager.sendMessage(socket.id, trimmed);
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