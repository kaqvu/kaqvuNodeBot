# kaqvuNodeBot

**Autor:** kaqvu

## Opis
System zarządzania wieloma botami Minecraft z interfejsem webowym. Umożliwia tworzenie, uruchamianie i kontrolowanie botów za pomocą przeglądarki.

## Wymagania
- Node.js 14+
- npm

## Instalacja
```bash
npm install express socket.io mineflayer dotenv
```

## Uruchomienie
```bash
node web.js
```
Otwórz przeglądarkę: `http://localhost:8080`

## Funkcje

### Zarządzanie Botami
- **Tworzenie botów** - pojedynczo lub losowymi nazwami z pliku
- **Uruchamianie** - pojedynczo lub wszystkich naraz (*)
- **Zatrzymywanie** - z automatycznym czyszczeniem zasobów
- **Usuwanie** - z plików i pamięci
- **Status w czasie rzeczywistym** - WŁĄCZONY/WYŁĄCZONY, połączony/niepołączony

### Tryb Logów
- Podgląd wiadomości z czatu serwera
- Wysyłanie wiadomości i komend
- Kontrola bota w czasie rzeczywistym
- Auto-exit przy rozłączeniu bota

### Funkcje Automatyczne
- **Anti-AFK** - skakanie lub sneakowanie
- **Auto-eat** - automatyczne jedzenie przy głodzie
- **Auto-fish** - automatyczne łowienie ryb
- **Auto-reconnect** - ponowne łączenie po rozłączeniu
- **Sprawdzanie internetu** - przed uruchomieniem botów

### Kontrola Botów
- Loop use - ciągłe używanie przedmiotu
- Walk - chodzenie w kierunkach
- Look - obracanie głową
- SetSlot - zmiana slotu hotbara
- Drop item - wyrzucanie przedmiotów
- GUI click - klikanie w interfejsie
- Follow - śledzenie graczy
- GoTo - chodzenie do koordynatów
- Attack - atakowanie mobów/graczy

### Inwentarz
- Wyświetlanie ekwipunku
- Informacje o enchantach
- Widok łączony dla wszystkich botów

### Statystyki
- HP i głód
- Pozycja (X, Y, Z)
- Wymiar świata

## Komendy Główne

### .create
```
.create <nazwa> <ip:port> <wersja>
.create .randomname <ip:port> <wersja> [liczba]
```
Przykład:
```
.create bot1 hypixel.net 1.8.9
.create .randomname localhost:25565 1.8 10
```

### .start
```
.start <nazwa|*> [flagi]
```
Przykład:
```
.start bot1 -reconnect -jumpafk:30
.start * -autoeat -autofish -nowifi
```

### .stop
```
.stop <nazwa|*>
```

### .delete
```
.delete <nazwa>
```

### .logs
```
.logs <nazwa|*>
```
Wejście w tryb logów. Wyjście: `.exit`

### .list
Wyświetla wszystkie boty i ich statusy

### .clear
Czyści konsolę

### .blockmessages
Włącza/wyłącza możliwość pisania w logach

### .blockcommands
Włącza/wyłącza możliwość wysyłania komend (/) w logach

## Komendy Akcji

### .listitems
```
.listitems <nazwa|*> [together]
```
Wyświetla ekwipunek. Opcja `together` łączy itemy wszystkich botów.

### .loopuse
```
.loopuse <nazwa|*>
```
Włącza/wyłącza ciągłe używanie przedmiotu (co 50ms)

### .walk
```
.walk <nazwa|*> <forward|back|left|right>
```
Włącza/wyłącza chodzenie w kierunku

### .dropitem
```
.dropitem <nazwa|*> <slot>
```
Wyrzuca stack przedmiotów ze slotu

### .look
```
.look <nazwa|*> <yaw> <pitch>
```
Obraca bota (yaw: obrót, pitch: góra/dół)

### .setslot
```
.setslot <nazwa|*> <0-8>
```
Ustawia slot hotbara (0-8)

### .rightclick
```
.rightclick <nazwa|*>
```
Kliknięcie prawym przyciskiem myszy

### .leftclick
```
.leftclick <nazwa|*>
```
Kliknięcie lewym przyciskiem myszy

### .guiclick
```
.guiclick <nazwa|*> <slot>
```
Kliknięcie slotu w otwartym GUI (0-53)

### .autoeat
```
.autoeat <nazwa|*>
```
Włącza/wyłącza auto-eating (je gdy < 8 głodków)

### .follow
```
.follow <nazwa|*> <nick>
```
Włącza/wyłącza śledzenie gracza

### .autofish
```
.autofish <nazwa|*>
```
Włącza/wyłącza auto-fishing

### .goto
```
.goto <nazwa|*> <x> <y> <z>
```
Bot idzie do wskazanych koordynatów

### .attack
```
.attack <nazwa|*> <mob|player|all> <range>
```
Włącza/wyłącza atakowanie celów w zasięgu

### .stats
```
.stats <nazwa|*>
```
Wyświetla statystyki bota

## Flagi

### -joinsend <wiadomość>
Wysyła wiadomość 1 sekundę po dołączeniu na serwer

### -reconnect
Automatyczne ponowne łączenie po rozłączeniu

### -maxreconnect <liczba>
Maksymalna liczba prób reconnect (domyślnie 999)

### -jumpafk
Ciągłe skakanie (anti-AFK)

### -jumpafk:<sekundy>
Skakanie przez X sekund po spawnie

### -sneakafk
Ciągły sneak (anti-AFK)

### -sneakafk:<sekundy>
Sneak przez X sekund po spawnie

### -autofish
Automatyczne łowienie ryb po spawnie

### -autoeat
Automatyczne jedzenie po spawnie

### -nowifi
Pomija sprawdzanie połączenia z internetem

### -delayflag <ms>
Customowy delay między flagami kolejnościowymi (domyślnie 5000ms)

### -setslot <0-8>
Ustawia slot po spawnie

### -rightclick
Klikanie prawym przyciskiem po spawnie

### -leftclick
Klikanie lewym przyciskiem po spawnie

### -guiclick <0-53>
Klikanie slotu GUI po spawnie

## Przykłady Użycia

### Podstawowe uruchomienie
```
.create bot1 hypixel.net 1.8.9
.start bot1
.logs bot1
```

### Masowe tworzenie i uruchamianie
```
.create .randomname play.server.com 1.8 50
.start * -reconnect -jumpafk -autoeat
```

### Anti-AFK z auto-reconnect
```
.start bot1 -reconnect -jumpafk:60 -sneakafk:30
```

### Sekwencja akcji po spawnie
```
.start bot1 -delayflag 2000 -setslot 0 -rightclick -guiclick 10
```

### Lokalny serwer bez sprawdzania internetu
```
.start bot1 -nowifi
```

### Kontrola w logach
```
.logs bot1
/register haslo haslo
.autofish
.follow Notch
.exit
```

## Pliki Konfiguracyjne

### names.txt
Lista nazw dla funkcji `.randomname` (jedna nazwa na linię)

### settings.json
Automatycznie generowany, zawiera ustawienia blockMessages i blockCommands

### bots/*.json
Pliki konfiguracyjne utworzonych botów

## Uwagi
- Użyj `*` aby wykonać komendę na wszystkich botach
- Boty uruchamiane grupowo startują co 3 sekundy
- Status "WŁĄCZONY (niepołączony)" oznacza że bot się łączy lub został rozłączony
- Nie można wejść w logi niepołączonego bota
- Rozłączenie bota automatycznie wyrzuca z trybu logów

## Port
Domyślny port: 8080 (można zmienić w pliku .env)
```bash
PORT=3000
```