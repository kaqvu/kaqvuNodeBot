# 🤖 kaqvuNodeBot

Zaawansowany system zarządzania botami Minecraft z interfejsem webowym.

## 📋 Opis

kaqvuNodeBot to system do zarządzania wieloma botami Minecraft jednocześnie przez nowoczesny interfejs webowy. Stworzony z wykorzystaniem Mineflayer, Express i Socket.io.

## ✨ Funkcje

- 🎮 **Zarządzanie wieloma botami** - Twórz i kontroluj nieograniczoną liczbę botów
- 🌐 **Interfejs webowy** - Nowoczesny panel z komunikacją w czasie rzeczywistym
- 📝 **System logów** - Przeglądaj wiadomości z serwera i wysyłaj komendy dla każdego bota
- 🎒 **Podgląd ekwipunku** - Sprawdzaj inventory botów z enchantami
- 🤖 **Anti-AFK** - Automatyczne skakanie
- 🔄 **Auto-reconnect** - Automatyczne ponowne łączenie po rozłączeniu
- 🎯 **Zaawansowane flagi** - Automatyzacja akcji po spawnie (klikanie, GUI, sloty)
- 💾 **Trwałe przechowywanie** - Boty zapisywane automatycznie
- 🚀 **Masowe operacje** - Uruchamiaj wszystkie boty jednocześnie

## 🚀 Instalacja

```bash
npm install
```

## 📦 Wymagania

- Node.js (wersja 14+)
- npm

## 🎯 Uruchomienie

```bash
npm start
```

Otwórz przeglądarkę: `http://localhost:8080`

## 📖 Komendy

### Zarządzanie botami

- `create <nazwa> <ip[:port]> <wersja>` - Tworzy bota
- `create .randomname <ip[:port]> <wersja> <liczba>` - Tworzy boty z losowymi nazwami z `names.txt`
- `start <nazwa|*> [flagi]` - Uruchamia bota/boty
- `stop <nazwa>` - Zatrzymuje bota
- `delete <nazwa>` - Usuwa bota
- `list` - Lista wszystkich botów
- `logs <nazwa>` - Wchodzi w logi bota
- `listitems <nazwa|*> [together]` - Pokazuje ekwipunek

### Flagi startu

**Podstawowe:**
- `-js <wiadomość>` - Wysyła wiadomość po zalogowaniu (1s delay)
- `-r` - Auto-reconnect
- `-j` - Anti-AFK jump (ciągłe skakanie)

**Sekwencyjne (wykonują się po kolei, każda po 5s):**
- `-ss <0-8>` - Ustawia slot w hotbarze
- `-rc` - Klika prawy przycisk myszy
- `-lc` - Klika lewy przycisk myszy
- `-gc <0-53>` - Klika slot w GUI

### W trybie logów

- `.exit` - Wyjście z logów
- `.listitems` - Pokazuje ekwipunek bota
- Dowolny tekst - Wysyła na chat bota

### Inne

- `clear` - Czyści konsolę
- `help` - Pomoc

## 💡 Przykłady

### Prosty start
```bash
create bot1 hypixel.net 1.8.9
start bot1
```

### Tworzenie wielu botów z losowymi nazwami
```bash
create .randomname sigma.pl 1.8 10
```
Utworzy 10 botów z losowymi nazwami z pliku `names.txt`

### Start z logowaniem i anti-AFK
```bash
start bot1 -js /login haslo123 -r -j
```

### Automatyczna sekwencja (slot → prawy klik → GUI)
```bash
start bot1 -ss 4 -rc -gc 16 -r -j
```

### Uruchomienie wszystkich botów
```bash
start * -r -j
```

### Sprawdzanie ekwipunku
```bash
listitems bot1
listitems *
listitems * together
```

## 🎮 Obsługiwane wersje Minecraft

Wszystkie wersje wspierane przez Mineflayer (1.8 - 1.20+)

## 📁 Struktura

```
kaqvuNodeBot/
├── web.js              # Serwer webowy
├── package.json        # Konfiguracja
├── .env               # Port (opcjonalnie)
├── names.txt          # Nazwy botów (opcjonalnie)
├── bots/              # Zapisane boty (auto)
└── web/               # Interfejs webowy
    ├── index.html
    ├── styles.css
    └── script.js
```

## 🔧 Konfiguracja

### Port serwera
Utwórz plik `.env`:
```env
PORT=8080
```

### Losowe nazwy botów
Utwórz plik `names.txt` z listą nazw (jedna nazwa na linię):
```
kaqvu_x1
kaqvu_x2
bot_123
player_abc
...
```
Następnie użyj: `create .randomname <ip> <wersja> <liczba>`

## ⚠️ Uwagi

- Domyślny port serwera Minecraft: 25565
- Format IP: `ip:port` lub `ip`
- Każdy bot wymaga unikalnej nazwy
- Sprawdź regulamin serwera przed użyciem botów

## 👤 Autor

kaqvu

## 📄 Licencja

MIT

---

**Uwaga:** Projekt wyłącznie do celów edukacyjnych. Używaj zgodnie z regulaminem serwerów.