# 🤖 kaqvuNodeBot

Zaawansowany system zarządzania botami Minecraft z interfejsem webowym w czasie rzeczywistym.

## 📋 Opis

kaqvuNodeBot to kompleksowy system do zarządzania wieloma botami Minecraft jednocześnie przez nowoczesny interfejs webowy. Stworzony z wykorzystaniem Mineflayer, Express i Socket.io, oferuje pełną kontrolę nad botami z poziomu przeglądarki.

## ✨ Główne Funkcje

### 🎮 Zarządzanie Botami
- **Nieograniczona liczba botów** - Twórz i kontroluj dowolną liczbę botów jednocześnie
- **Masowe operacje** - Uruchamiaj, zatrzymuj wszystkie boty jednym poleceniem (`*`)
- **Losowe nazwy** - Automatyczne tworzenie wielu botów z nazwami z pliku `names.txt`
- **Trwałe przechowywanie** - Wszystkie boty zapisywane automatycznie w plikach JSON

### 🌐 Interfejs Webowy
- **Komunikacja w czasie rzeczywistym** - WebSocket (Socket.io) zapewnia natychmiastowe aktualizacje
- **Lista botów na żywo** - Status każdego bota aktualizowany automatycznie
- **Intuicyjny panel** - Przejrzysty interfejs z kolorowymi logami
- **Responsywny design** - Działa na komputerach i urządzeniach mobilnych

### 📝 System Logów
- **Indywidualne logi** - Przeglądaj wiadomości z serwera dla konkretnego bota
- **Tryb wszystkich botów** - Monitoruj logi ze wszystkich aktywnych botów jednocześnie
- **Interaktywny chat** - Wysyłaj wiadomości i komendy bezpośrednio z trybu logów
- **Filtrowanie** - Logi wyświetlane tylko dla botów, które Cię interesują

### 🎒 Zarządzanie Ekwipunkiem
- **Podgląd inventory** - Pełny widok ekwipunku każdego bota
- **Informacje o enchantach** - Wyświetla enchanty z poziomami
- **Agregacja itemów** - Tryb `together` sumuje itemy ze wszystkich botów
- **Numery slotów** - Dokładne pozycje itemów w ekwipunku

### 🤖 Automatyzacja
- **Anti-AFK system** - Ciągłe skakanie zapobiega wyrzuceniu z serwera
- **Auto-reconnect** - Automatyczne ponowne łączenie po rozłączeniu (każde 5s)
- **Sekwencyjne akcje** - Zaplanowane akcje wykonywane automatycznie po spawnie
- **Logowanie automatyczne** - Wysyłaj komendy logowania po połączeniu

### 🎯 Zaawansowane Flagi

**Flagi natychmiastowe:**
- **`-js <wiadomość>`** - Wysyła wiadomość 1 sekundę po zalogowaniu (np. `/login haslo123`)
- **`-r`** - Włącza automatyczne ponowne łączenie po rozłączeniu
- **`-j`** - Aktywuje Anti-AFK (bot skacze co sekundę)

**Flagi sekwencyjne** (wykonywane po kolei, każda po 5 sekundach od spawnu):
- **`-ss <0-8>`** - Ustawia aktywny slot w hotbarze (0-8)
- **`-rc`** - Wykonuje kliknięcie prawym przyciskiem myszy (activate item)
- **`-lc`** - Wykonuje kliknięcie lewym przyciskiem myszy (swing arm)
- **`-gc <0-53>`** - Klika określony slot w otwartym GUI (0-53)

### 🔄 Zarządzanie Połączeniami
- **Inteligentne reconnect** - Boty pamiętają flagi i używają ich przy ponownym połączeniu
- **Obsługa błędów** - Automatyczne ignorowanie błędów sieciowych (ECONNRESET, ETIMEDOUT)
- **Graceful shutdown** - Czyste zamykanie połączeń i czyszczenie zasobów
- **Kontrola spawnu** - System zapobiega wielokrotnemu wykonywaniu akcji spawnu

## 🚀 Instalacja

```bash
# Sklonuj repozytorium
git clone https://github.com/kaqvu/kaqvuNodeBot.git
cd kaqvuNodeBot

# Zainstaluj zależności
npm install

# Uruchom serwer
npm start
```

Otwórz przeglądarkę i przejdź do: `http://localhost:8080`

## 📦 Wymagania

- **Node.js** (wersja 14 lub wyższa)
- **npm** (Node Package Manager)
- **Przeglądarka** (Chrome, Firefox, Safari, Edge)

## 📖 Dokumentacja Komend

### Zarządzanie Botami

#### `create <nazwa> <ip[:port]> <wersja>`
Tworzy nowego bota z określonymi parametrami.

**Przykłady:**
```bash
create bot1 hypixel.net 1.8.9
create bot2 play.example.com:25566 1.20.1
create pvpbot mc.server.pl 1.16.5
```

#### `create .randomname <ip[:port]> <wersja> <liczba>`
Tworzy wiele botów z losowymi nazwami z pliku `names.txt`.

**Parametry:**
- `liczba` - od 1 do 1000 botów
- Nazwy są wybierane losowo i nie powtarzają się
- Jeśli brakuje nazw, utworzy tyle botów ile możliwe

**Przykłady:**
```bash
create .randomname sigma.pl 1.8 10
create .randomname hypixel.net 1.8.9 50
create .randomname play.server.com:25565 1.20 5
```

#### `start <nazwa|*> [flagi]`
Uruchamia bota lub wszystkie boty z opcjonalnymi flagami.

**Specjalne wartości:**
- `*` - uruchamia wszystkie zatrzymane boty (z opóźnieniem 3s między każdym)

**Przykłady:**
```bash
# Prosty start
start bot1

# Start z auto-reconnect i anti-AFK
start bot1 -r -j

# Logowanie po połączeniu
start bot1 -js /login mojehaslo123

# Złożona sekwencja: slot 4 → prawy klik → kliknij GUI slot 16
start bot1 -ss 4 -rc -gc 16 -r -j

# Uruchom wszystkie boty
start * -r -j
```

#### `stop <nazwa|*>`
Zatrzymuje bota lub wszystkie boty.

**Przykłady:**
```bash
stop bot1
stop *  # Zatrzymuje wszystkie aktywne boty
```

#### `delete <nazwa>`
Usuwa bota (zatrzymuje go jeśli działa i usuwa plik JSON).

**Przykład:**
```bash
delete bot1
```

#### `list`
Wyświetla listę wszystkich utworzonych botów z ich statusami.

**Wyjście:**
```
Utworzone boty: 3
  - bot1 [DZIALA]
  - bot2 [ZATRZYMANY]
  - bot3 [DZIALA]
```

### System Logów

#### `logs <nazwa|*>`
Wchodzi w tryb logów dla wybranego bota lub wszystkich botów.

**Funkcje w trybie logów:**
- Wyświetla wszystkie wiadomości z serwera
- Pozwala wysyłać wiadomości na chat
- Specjalne komendy: `.exit` i `.listitems`

**Przykłady:**
```bash
logs bot1    # Logi jednego bota
logs *       # Logi wszystkich aktywnych botów
```

**W trybie logów możesz:**
```bash
.exit              # Wyjście z trybu logów
.listitems         # Sprawdź ekwipunek
Witam wszystkich!  # Wyślij wiadomość na chat
/tpa gracz123      # Wyślij komendę
```

### Ekwipunek

#### `listitems <nazwa|*> [together]`
Wyświetla ekwipunek bota lub wszystkich botów.

**Tryby:**
- `listitems bot1` - ekwipunek jednego bota
- `listitems *` - ekwipunki wszystkich botów osobno
- `listitems * together` - zsumowane itemy ze wszystkich botów

**Wyświetlane informacje:**
- Numer slotu
- Nazwa itemu
- Ilość (count)
- Enchanty z poziomami

**Przykład wyjścia:**
```
==================================================
EKWIPUNEK BOTA: bot1
==================================================
[Slot 0] diamond_sword x1
  Enchanty:
    - minecraft:sharpness (Poziom 5)
    - minecraft:unbreaking (Poziom 3)
[Slot 1] golden_apple x64
[Slot 36] diamond_chestplate x1
  Enchanty:
    - minecraft:protection (Poziom 4)
==================================================
```

### Inne Komendy

#### `clear`
Czyści konsolę webową.

#### `help`
Wyświetla pełną listę komend i flag.

## 💡 Szczegółowe Przykłady Użycia

### Scenariusz 1: Prosty Bot na Serwerze
```bash
# Utwórz bota
create mybot hypixel.net 1.8.9

# Uruchom z podstawowymi funkcjami
start mybot -r -j

# Wejdź w logi aby monitorować
logs mybot

# W trybie logów wyślij wiadomość
Cześć wszystkim!

# Sprawdź ekwipunek
.listitems

# Wyjdź z logów
.exit

# Zatrzymaj bota
stop mybot
```

### Scenariusz 2: Bot z Automatycznym Logowaniem
```bash
# Utwórz bota
create loginbot play.server.pl 1.20.1

# Uruchom z automatycznym logowaniem
start loginbot -js /login mojeTajneHaslo123 -r -j

# Bot automatycznie wyśle komendę /login po zalogowaniu
```

### Scenariusz 3: Bot Otwierający GUI
```bash
# Bot który automatycznie otworzy GUI i wybierze opcję
create guibot mc.minigames.com 1.16.5

# Slot 4 (może być item otwierający menu) → prawy klik → kliknij slot 16 w GUI
start guibot -ss 4 -rc -gc 16 -r -j
```

### Scenariusz 4: Masowe Boty z Losowymi Nazwami
```bash
# Najpierw upewnij się że masz plik names.txt z nazwami

# Utwórz 20 botów
create .randomname hypixel.net 1.8.9 20

# Uruchom wszystkie jednocześnie (startują co 3 sekundy)
start * -r -j

# Monitoruj wszystkie boty
logs *

# Sprawdź zsumowany ekwipunek wszystkich botów
listitems * together

# Zatrzymaj wszystkie
stop *
```

### Scenariusz 5: Bot do PvP z Sekwencją
```bash
# Utwórz bota PvP
create pvpbot pvp.server.net 1.8.9

# Ustaw miecz (slot 0), włącz anti-AFK i reconnect
start pvpbot -ss 0 -r -j

# Wejdź w logi i atakuj
logs pvpbot
# Bot już ma wybrany miecz i skacze
```

## 🎮 Obsługiwane Wersje Minecraft

System wspiera wszystkie wersje Minecraft obsługiwane przez bibliotekę Mineflayer:
- **1.8.x** (popularna wersja PvP)
- **1.12.x** (stabilna wersja)
- **1.16.x** (Nether Update)
- **1.18.x** (Caves & Cliffs)
- **1.19.x** (The Wild Update)
- **1.20.x** (Trails & Tales)
- **1.21.x** (najnowsze)

## 📁 Struktura Projektu

```
kaqvuNodeBot/
├── web.js                 # Główny serwer Node.js
├── package.json           # Zależności i konfiguracja
├── package-lock.json      # Locked wersje zależności
├── .env                   # Konfiguracja środowiska (opcjonalnie)
├── names.txt              # Lista nazw dla losowych botów (opcjonalnie)
├── README.md              # Dokumentacja
├── bots/                  # Folder z zapisanymi botami (auto-generowany)
│   ├── bot1.json
│   ├── bot2.json
│   └── ...
└── web/                   # Pliki interfejsu webowego
    ├── index.html         # Struktura strony
    ├── styles.css         # Stylowanie interfejsu
    └── script.js          # Logika klienta (Socket.io)
```

### Opis Plików

**web.js** - Główny plik serwera zawierający:
- `BotManager` class - zarządzanie botami
- Express server - serwowanie plików statycznych
- Socket.io - komunikacja w czasie rzeczywistym
- Obsługa wszystkich komend i logiki

**bots/*.json** - Pliki konfiguracyjne botów:
```json
{
  "name": "bot1",
  "host": "hypixel.net",
  "port": 25565,
  "version": "1.8.9"
}
```

## 🔧 Konfiguracja

### Zmiana Portu Serwera

Utwórz plik `.env` w głównym katalogu:
```env
PORT=8080
```

Możesz użyć dowolnego portu (np. 3000, 8000, 8080):
```env
PORT=3000
```

### Konfiguracja Losowych Nazw

Utwórz plik `names.txt` z listą nazw (jedna nazwa na linię):
```
kaqvu_x1
kaqvu_x2
kaqvu_x3
bot_123
player_abc
warrior_99
miner_pro
builder_king
pvp_master
redstone_expert
```

**Wskazówki:**
- Jedna nazwa na linię
- Bez pustych linii na końcu
- Nazwy muszą spełniać wymagania Minecraft (3-16 znaków, bez spacji)
- Nie używaj nazw premium graczy (może nie zadziałać)

## 🛠️ Zaawansowana Konfiguracja

### Dostosowanie Opóźnień

W pliku `web.js` możesz zmienić następujące wartości:

```javascript
// Opóźnienie między uruchamianiem botów masowo (domyślnie 3s)
setTimeout(() => {
    manager.startBot(name, flags);
}, index * 3000);  // Zmień 3000 na inną wartość (ms)

// Opóźnienie przed wysłaniem wiadomości -js (domyślnie 1s)
setTimeout(() => {
    bot.chat(currentFlags['-js']);
}, 1000);  // Zmień 1000 na inną wartość (ms)

// Opóźnienie między flagami sekwencyjnymi (domyślnie 5s)
let delay = 5000;  // Zmień 5000 na inną wartość (ms)

// Opóźnienie przed reconnect (domyślnie 5s)
setTimeout(() => {
    createBotInstance();
}, 5000);  // Zmień 5000 na inną wartość (ms)
```

### Dostosowanie Anti-AFK

```javascript
// Częstotliwość skakania (domyślnie 1s)
const jumpInterval = setInterval(() => {
    bot.setControlState('jump', true);
    setTimeout(() => {
        bot.setControlState('jump', false);
    }, 100);
}, 1000);  // Zmień 1000 na inną wartość (ms)
```

## ⚙️ Szczegóły Techniczne

### Architektura

**Backend (Node.js):**
- Express - serwer HTTP
- Socket.io - WebSocket dla komunikacji real-time
- Mineflayer - połączenia z serwerami Minecraft
- fs/path - zarządzanie plikami

**Frontend:**
- Czysty JavaScript (Vanilla JS)
- Socket.io Client - komunikacja z serwerem
- CSS3 - responsywny design

### Zarządzanie Stanem

System śledzi następujące stany dla każdego bota:
- `bots{}` - konfiguracje wszystkich botów
- `activeBots{}` - aktywne instancje Mineflayer
- `logsModes{}` - tryb logów dla każdego socketu
- `reconnectFlags{}` - flagi do użycia przy reconnect
- `spawnFlags{}` - flagi użyte przy ostatnim spawnie
- `firstSpawn{}` - czy bot już się zespawnował (zapobiega duplikatom)

### Event Handling

System nasłuchuje następujących eventów Mineflayer:
- `login` - bot zalogowany do serwera
- `spawn` - bot zespawnowany w świecie (tutaj wykonywane są flagi)
- `kicked` - bot wyrzucony z serwera
- `end` - połączenie zakończone
- `error` - błędy połączenia
- `messagestr` - wiadomości z czatu (dla logów)

## ⚠️ Ważne Uwagi i Ograniczenia

### Bezpieczeństwo
- ❌ **NIE przechowuj haseł w komendach** widocznych dla innych
- ✅ Używaj bezpiecznych haseł dla botów
- ✅ Uruchamiaj serwer tylko na zaufanej sieci

### Wydajność
- 🔴 **Zbyt wiele botów** (100+) może obciążyć serwer i połączenie
- 🔴 **Masowe start** używa opóźnienia 3s między botami
- ✅ Zalecane: max 50 botów jednocześnie na standardowym sprzęcie

### Zgodność z Serwerami
- ⚠️ Niektóre serwery **wykrywają boty** i mogą banować
- ⚠️ Sprawdź **regulamin serwera** przed użyciem botów
- ⚠️ Używaj tylko na własnych serwerach lub z pozwoleniem administracji
- ✅ Idealne do testowania własnych serwerów

### Limity Techniczne
- 📊 Maksymalnie **1000 botów** można utworzyć przez `.randomname`
- 📊 Sloty GUI: **0-53** (ograniczenie Minecraft)
- 📊 Sloty hotbar: **0-8** (ograniczenie Minecraft)
- 📊 Port domyślny Minecraft: **25565**

### Znane Problemy
- 🐛 Niektóre serwery premium wymagają autentykacji Microsoft
- 🐛 Boty offline mogą nie działać na serwerach online-mode
- 🐛 Flaga `-gc` wymaga otwartego GUI (nie zadziała bez odpowiedniego itemu)

## 🔍 Rozwiązywanie Problemów

### Bot nie może się połączyć
```
✓ Sprawdź czy IP i port są poprawne
✓ Sprawdź czy serwer jest online
✓ Sprawdź wersję Minecraft (musi się zgadzać)
✓ Sprawdź firewall i połączenie internetowe
```

### Bot jest wyrzucany
```
✓ Sprawdź regulamin serwera
✓ Użyj flagi -r dla auto-reconnect
✓ Dodaj -js z komendą logowania jeśli wymagana
✓ Sprawdź czy nazwa nie jest zajęta
```

### Logi nie działają
```
✓ Sprawdź czy bot jest uruchomiony (list)
✓ Użyj logs <nazwa> aby wejść w tryb
✓ Sprawdź połączenie WebSocket w konsoli przeglądarki
```

### Flagi nie wykonują się
```
✓ Upewnij się że używasz poprawnej składni (-ss 4, nie -ss4)
✓ Flagi sekwencyjne wykonują się dopiero po spawnie
✓ Sprawdź logi bota czy są komunikaty o wykonaniu
```

## 👤 Autor

**kaqvu**
- GitHub: [@kaqvu](https://github.com/kaqvu)

## 📄 Licencja

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

### Co to oznacza?
- ✅ Możesz używać komercyjnie
- ✅ Możesz modyfikować
- ✅ Możesz dystrybuować
- ✅ Możesz używać prywatnie
- ⚠️ Musisz dołączyć licencję i copyright
- ⚠️ Brak gwarancji

---

## 🎯 Podsumowanie

**kaqvuNodeBot** to potężne narzędzie do zarządzania botami Minecraft z intuicyjnym interfejsem webowym. Idealne do:
- 🧪 Testowania serwerów
- 🎮 Automatyzacji zadań
- 📊 Symulacji graczy
- 🔧 Debugowania pluginów

**⚠️ WAŻNE:** Projekt wyłącznie do celów edukacyjnych i testowych. Używaj odpowiedzialnie i zgodnie z regulaminem serwerów. Autor nie ponosi odpowiedzialności za niewłaściwe użycie oprogramowania.

---

**Ostatnia aktualizacja:** Grudzień 2025 
**Wersja:** 3.12