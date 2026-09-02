# shooting-log

Dziennik treningów strzeleckich — REST API do śledzenia zużycia amunicji, kosztów i historii użycia broni.

Aplikacja odpowiada na pytania, które trudno odtworzyć z pamięci: ile pocisków przestrzelał dany egzemplarz od zakupu, ile kosztowało strzelanie w minionym miesiącu i jak zmienia się koszt jednego strzału w miarę używania sprzętu.

## Stan projektu

W budowie. Działa: CRUD broni i treningów, zapis porcji strzelania z automatycznym przeliczaniem magazynków na pociski oraz licznik pocisków wystrzelonych z każdej broni.

Kolejne kroki: statystyki kosztów, walidacje przypadków brzegowych, migracja przenosząca istniejące dane, optymalizacja zapytań i widoki.

## Stack

| | |
|---|---|
| API | FastAPI |
| baza | PostgreSQL 16 |
| ORM | SQLAlchemy 2 |
| migracje | Alembic |
| testy | pytest |
| jakość | ruff |
| środowisko | Docker Compose |

## Uruchomienie

Wymagany Python 3.13+ oraz Docker.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Skopiuj `.env.example` do `.env` i uzupełnij hasło:

```bash
cp .env.example .env
```

Podnieś bazę danych:

```bash
docker-compose up -d
```

Zastosuj migracje:

```bash
python -m alembic upgrade head
```

Uruchom aplikację:

```bash
python -m uvicorn src.main:app --reload
```

Dokumentacja API generuje się automatycznie i jest dostępna pod `http://127.0.0.1:8000/docs`.

## Testy

```bash
python -m pytest
```

Sprawdzenie stylu i typowych błędów:

```bash
python -m ruff check .
```

## Struktura

```
src/
├── main.py        punkt wejścia, rejestracja routerów
├── config.py      konfiguracja czytana z .env, walidowana przy starcie
├── database.py    silnik, sesja, klasa bazowa modeli
├── models.py      tabele: Weapon, TrainingSession, SessionWeapon
├── schemas.py     schematy wejścia i wyjścia (Pydantic), walidacja danych
├── services.py    logika domenowa — bez bazy i bez HTTP
├── queries.py     odczyty z bazy: sumy i statystyki
└── routers/
    ├── weapons.py    CRUD broni + licznik pocisków
    └── training.py   CRUD treningów + wpisy o strzelaniu
alembic/versions/  migracje bazy danych
tests/             testy jednostkowe i API
```

Podział na trzy warstwy jest celowy. `services.py` nie wie o istnieniu bazy ani HTTP, więc jego testy biegają bez PostgreSQL. `queries.py` sięga do bazy, ale nie zna requestów. Routery zajmują się wyłącznie HTTP — łapią wyjątki z warstw niższych i tłumaczą je na kody odpowiedzi.

## Uwagi

Baza w `docker-compose.yml` wystawiona jest na porcie **5434**, nie domyślnym 5432 — port 5433 bywa zajęty przez lokalną instalację PostgreSQL. Adres w `.env` musi się z tym zgadzać.
