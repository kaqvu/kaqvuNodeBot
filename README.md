# kaqvuNodeBot

Zaawansowany system zarządzania botami Minecraft z interfejsem webowym.

**Autor:** kaqvu

## Instalacja

### Wymagania
- Node.js (wersja 14 lub nowsza)
- npm (Node Package Manager)

### Kroki instalacji

1. Sklonuj repozytorium:
```bash
git clone https://github.com/kaqvu/kaqvuNodeBot
```

2. Przejdź do folderu projektu:
```bash
cd kaqvuNodeBot
```

3. Zainstaluj zależności:
```bash
npm install
```

4. Uruchom serwer:
```bash
npm start
```

5. Otwórz przeglądarkę i wejdź na:
```
http://localhost:8080
```

## Podstawowe komendy

### Zarządzanie botami

#### `.create <nazwa> <ip[:port]> <wersja>`
Tworzy nowego bota.
- `nazwa` - unikalna nazwa bota
- `ip[:port]` - adres serwera (port domyślnie 25565)
- `wersja` - wersja Minecraft (np. 1.8.9, 1.19.4)

**Przykłady:**
```
.create bot1 hypixel.net 1.8.9
.create bot2 mc.example.com:25566 1.19.4
```

#### `.create .randomname <ip[:port]> <wersja> [liczba]`
Tworzy losowe boty z pliku `names.txt`.
- `liczba` - ile botów utworzyć (1-1000)

**Przykład:**
```
.create .randomname hypixel.net 1.8.9 10
```

#### `.start <nazwa|*> [flagi]`
Uruchamia bota lub wszystkie boty (`*`).

**Przykłady:**
```
.start bot1
.start * -reconnect -jumpafk
.start bot2 -joinsend /register haslo123 haslo123
```

#### `.stop <nazwa|*>`
Zatrzymuje bota lub wszystkie boty.

**Przykłady:**
```
.stop bot1
.stop *
```

#### `.delete <nazwa>`
Usuwa bota z systemu.

**Przykład:**
```
.delete bot1
```

#### `.list`
Wyświetla listę wszystkich botów i ich status.

#### `.logs <nazwa|*>`
Wchodzi w tryb logów bota/wszystkich botów.
- W tym trybie możesz wysyłać wiadomości na chat
- Widzisz wszystkie wiadomości z serwera
- Możesz używać specjalnych komend (patrz niżej)

**Przykłady:**
```
.logs bot1
.logs *
```

#### `.listitems <nazwa|*> [together]`
Pokazuje ekwipunek bota/botów.
- `together` - łączy itemy wszystkich botów w jedną listę

**Przykłady:**
```
.listitems bot1
.listitems * together
```

## Flagi startowe

Flagi dodaje się przy uruchamianiu bota komendą `.start`.

**⚠️ UWAGA:** Jeśli wpiszesz błędną flagę (np. `-js` zamiast `-joinsend`), bot się NIE uruchomi i zobaczysz listę dostępnych flag. Wszystkie flagi muszą być prawidłowo napisane!

### Flagi podstawowe

#### `-joinsend <wiadomosc>`
Wysyła wiadomość na chat 1 sekundę po dołączeniu do serwera.

**Przykład:**
```
.start bot1 -joinsend /register haslo123 haslo123
```

#### `-reconnect`
Automatyczne ponowne łączenie po wyrzuceniu z serwera.

**Przykład:**
```
.start bot1 -reconnect
```

#### `-maxreconnect <liczba>`
Maksymalna liczba prób reconnectu (domyślnie 999).

**Przykład:**
```
.start bot1 -reconnect -maxreconnect 10
```

### Flagi Anti-AFK

#### `-jumpafk`
Bot będzie ciągle skakał (anti-AFK).

**Przykład:**
```
.start bot1 -jumpafk
```

#### `-jumpafk:<sekundy>`
Bot będzie skakał przez określoną liczbę sekund po spawnie, potem przestanie.
Przy każdym reconneccie znowu będzie skakał przez ten czas.

**Przykład:**
```
.start bot1 -jumpafk:30
```
(Bot będzie skakał przez 30 sekund po spawnie)

#### `-sneakafk`
Bot będzie ciągle trzymał Shift (sneak).

**Przykład:**
```
.start bot1 -sneakafk
```

#### `-sneakafk:<sekundy>`
Bot będzie trzymał Shift przez określoną liczbę sekund po spawnie.

**Przykład:**
```
.start bot1 -sneakafk:60
```
(Bot będzie trzymał Shift przez 60 sekund)

#### `-autofish`
Bot automatycznie łowi ryby po spawnie.

**Przykład:**
```
.start bot1 -autofish
```

#### `-autoeat`
Bot automatycznie je gdy głód spadnie poniżej 8 głódków po spawnie.

**Przykład:**
```
.start bot1 -autoeat
```

### Flagi sekwencyjne

Te flagi wykonują się automatycznie po spawnie bota w określonej kolejności z opóźnieniem.

**WAŻNE:** Wszystkie flagi muszą być prawidłowo napisane. Jeśli wpiszesz nieistniejącą flagę (np. `-js` zamiast `-joinsend`), bot się nie uruchomi i dostaniesz informację o dostępnych flagach.

#### `-delayflag <milisekundy>`
Ustawia niestandardowy czas opóźnienia między flagami sekwencyjnymi (domyślnie 5000ms = 5 sekund).
**To nie jest flaga sekwencyjna** - służy tylko do ustawienia opóźnienia dla innych flag.

**Przykład:**
```
.start bot1 -delayflag 2000 -setslot 0 -rightclick
```
(Między ustawieniem slotu a kliknięciem będzie 2 sekundy zamiast 5)

#### `-setslot <0-8>`
Ustawia slot na hotbarze (0-8, gdzie 0 to pierwszy slot).

**Przykład:**
```
.start bot1 -setslot 0
```

#### `-rightclick`
Wykonuje kliknięcie prawym przyciskiem myszy (używa item).

**Przykład:**
```
.start bot1 -setslot 0 -rightclick
```

#### `-leftclick`
Wykonuje kliknięcie lewym przyciskiem myszy (atakuje/kopie).

**Przykład:**
```
.start bot1 -leftclick
```

#### `-guiclick <0-53>`
Klika na określony slot w otwartym GUI.
- Sloty 0-53 to różne pozycje w menu
- Bot musi mieć otwarte GUI

**Przykład:**
```
.start bot1 -setslot 0 -rightclick -guiclick 10
```

### Przykład kombinacji flag

```
.start bot1 -reconnect -maxreconnect 50 -jumpafk:30 -joinsend /login haslo123 -delayflag 3000 -setslot 0 -rightclick -guiclick 5
```

**Co się stanie:**
1. Bot dołączy do serwera
2. Po 1 sekundzie wyśle `/login haslo123`
3. Przez 30 sekund będzie skakał (anti-AFK)
4. Po 3 sekundach ustawi slot 0
5. Po kolejnych 3 sekundach kliknie prawym przyciskiem
6. Po kolejnych 3 sekundach kliknie slot 5 w GUI
7. Jeśli zostanie wyrzucony, będzie się reconnectował (max 50 razy)

**Przykład błędnej flagi:**
```
.start bot1 -js /login haslo123
```
❌ Bot się NIE uruchomi! Zobaczysz:
```
Nieznana flaga: -js
Dostepne flagi: -joinsend, -reconnect, -maxreconnect, -jumpafk, -sneakafk, -delayflag, -setslot, -rightclick, -leftclick, -guiclick
```

**Poprawnie:**
```
.start bot1 -joinsend /login haslo123
```
✅ Bot uruchomi się poprawnie!

## Komendy akcji

Te komendy można wykonywać zarówno w głównym menu, jak i w trybie logów.

### W głównym menu (wymagają nazwy bota lub `*`)

#### `.loopuse <nazwa|*>`
Włącza/wyłącza ciągłe używanie trzymanego itemu (prawy przycisk).
- Działa jako przełącznik - wpisz raz aby włączyć, drugi raz aby wyłączyć
- Przydatne do: jedzenia, używania mieczy, łuków, bloków

**Przykłady:**
```
.loopuse bot1
.loopuse *
```

**Jak to działa:**
- Bot będzie ciągle klikał prawy przycisk myszy co 50ms
- Jeśli trzyma jedzenie - będzie jadł
- Jeśli trzyma łuk - będzie ciągle strzelał
- Jeśli trzyma blok - będzie stawiał

#### `.walk <nazwa|*> <forward|back|left|right>`
Włącza/wyłącza chodzenie w określonym kierunku.
- Każdy kierunek działa niezależnie
- Możesz włączyć kilka kierunków jednocześnie
- Wpisz ponownie ten sam kierunek aby go wyłączyć

**Przykłady:**
```
.walk bot1 forward
.walk * left
```

**Jak to działa - przykład:**
```
.walk bot1 forward     -> Bot idzie do przodu
.walk bot1 left        -> Bot idzie do przodu + w lewo (po skosie)
.walk bot1 forward     -> Bot przestaje iść do przodu, idzie tylko w lewo
.walk bot1 left        -> Bot przestaje chodzić
```

#### `.dropitem <nazwa|*> <slot>`
Wyrzuca item z określonego slotu.
- Sloty 0-8: hotbar
- Sloty 9-35: ekwipunek
- Sloty 36-44: pancerz i offhand

**Przykłady:**
```
.dropitem bot1 0
.dropitem * 36
```

#### `.look <nazwa|*> <yaw> <pitch>`
Obraca głową bota w określonym kierunku.
- `yaw` - obrót lewo/prawo (0 = północ, 1.57 = wschód, 3.14 = południe, -1.57 = zachód)
- `pitch` - obrót góra/dół (0 = prosto, -1.57 = w górę, 1.57 = w dół)

**Przykłady:**
```
.look bot1 0 0
.look * 1.57 -0.5
```

#### `.setslot <nazwa|*> <0-8>`
Ustawia aktywny slot na hotbarze.

**Przykłady:**
```
.setslot bot1 0
.setslot * 5
```

#### `.rightclick <nazwa|*>`
Wykonuje kliknięcie prawym przyciskiem myszy (jednorazowe).

**Przykłady:**
```
.rightclick bot1
.rightclick *
```

#### `.leftclick <nazwa|*>`
Wykonuje kliknięcie lewym przyciskiem myszy (jednorazowe).

**Przykłady:**
```
.leftclick bot1
.leftclick *
```

#### `.guiclick <nazwa|*> <0-53>`
Klika na slot w otwartym GUI.

**Przykłady:**
```
.guiclick bot1 10
.guiclick * 0
```

### W trybie logów (bez nazwy bota)

Wejdź w tryb logów komendą `.logs bot1` lub `.logs *`, a następnie używaj tych samych komend ale bez nazwy bota:

```
.loopuse
.walk forward
.walk left
.dropitem 36
.look 0 0
.setslot 5
.rightclick
.leftclick
.guiclick 10
.autoeat
.follow kaqvu
.autofish
.goto 100 64 200
.attack mob 4
.stats
```

#### `.exit`
Wychodzi z trybu logów.

#### `.clear`
Czyści konsolę (działa również w trybie logów).

#### `.listitems`
Pokazuje ekwipunek bota/botów w trybie logów.

## Plik settings.json

Automatycznie tworzony plik z ustawieniami:

```json
{
  "blockChat": false
}
```

- `blockChat` - czy zablokowane jest pisanie w logach (toggle przez `.blockchat`)

## Plik names.txt

Aby używać `.create .randomname`, utwórz plik `names.txt` w głównym folderze projektu:

```
bot_1
bot_2
bot_3
player123
nickname456
```

Każda nazwa w osobnej linii.

## Porty i konfiguracja

Domyślny port serwera: `8080`

Aby zmienić port, utwórz plik `.env`:
```
PORT=3000
```

## Przykładowe scenariusze użycia

### Scenario 1: Bot farmujący na serwerze
```
.create farmer mc.server.com 1.8.9
.start farmer -reconnect -jumpafk:30 -joinsend /login haslo123 -autofish
.logs farmer
.setslot 0
.autoeat
.stats
```

### Scenario 2: 10 botów jednocześnie z auto-eat
```
.create .randomname mc.server.com 1.8.9 10
.start * -reconnect -maxreconnect 100 -sneakafk
.autoeat *
```

### Scenario 3: Bot wykonujący sekwencję akcji
```
.create bot1 mc.server.com 1.19.4
.start bot1 -reconnect -joinsend /login haslo -delayflag 2000 -setslot 0 -rightclick -guiclick 10 -guiclick 15 -guiclick 20
```

### Scenario 4: Bot łowiący ryby automatycznie
```
.create fisher mc.server.com 1.8.9
.start fisher -reconnect -autofish -autoeat
.logs fisher
.stats
```

### Scenario 5: Bot podążający za graczem
```
.create follower mc.server.com 1.8.9
.start follower -reconnect -joinsend /login haslo
.follow follower kaqvu
.autoeat follower
```

### Scenario 6: Bot atakujący moby
```
.create warrior mc.server.com 1.8.9
.start warrior -reconnect -autoeat
.attack warrior mob 4
.stats warrior
```

### Scenario 7: Bot idący do określonej lokacji
```
.create explorer mc.server.com 1.8.9
.start explorer -reconnect
.goto explorer 1000 64 -500
.autoeat explorer
```

## Uwagi techniczne

### Auto-respawn
Bot automatycznie respawnuje po śmierci bez potrzeby ustawiania flagi. Działa zawsze.

### Auto-eat
- Uruchamia się gdy głód < 16/20 (zostało < 8 głódków, czyli 4 pełne ikonki)
- Automatycznie znajduje jedzenie w ekwipunku
- Rozpoznawane jedzenie: cooked (wszystko gotowane), bread, apple, carrot, potato, steak, beef, porkchop, chicken, mutton, rabbit

### Follow
- Bot zachowuje dystans ~3 bloki od gracza
- Jeśli gracz się oddali, bot za nim idzie
- Bot automatycznie patrzy w kierunku gracza

### Auto-fish
- Bot musi mieć wędkę w ręce
- Wykrywa event złapania ryby (playerCollect)
- Automatycznie rzuca wędkę ponownie

### GoTo
- Bot idzie prostą linią do celu
- Nie omija przeszkód (używa prostego pathfindingu)
- Automatycznie skacze gdy napotka przeszkodę wyższą niż 1 blok

### Attack
- Atakuje pierwsze napotka entity spełniające kryteria
- Atakuje co 500ms
- Automatycznie patrzy na cel przed atakiem

## Wsparcie

Autor: kaqvu

Zgłaszanie błędów: [GitHub Issues](https://github.com/kaqvu/kaqvuNodeBot/issues)

## Licencja

MIT License - możesz swobodnie używać i modyfikować kod.