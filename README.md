# shooting-log

Dziennik treningów strzeleckich — REST API do śledzenia zużycia amunicji, kosztów i historii użycia broni.

Aplikacja odpowiada na pytania, które trudno odtworzyć z pamięci: ile pocisków przestrzelał dany egzemplarz od zakupu, ile kosztowało strzelanie w minionym miesiącu i jak zmienia się koszt jednego strzału w miarę używania sprzętu.

## Stan projektu

Wczesny etap budowy. Gotowy szkielet: konfiguracja, połączenie z bazą, migracje i pierwszy endpoint.

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
└── routers/       endpointy pogrupowane tematycznie
alembic/           migracje bazy danych
tests/             testy
```

## Uwagi

Baza w `docker-compose.yml` wystawiona jest na porcie **5434**, nie domyślnym 5432 — port 5433 bywa zajęty przez lokalną instalację PostgreSQL. Adres w `.env` musi się z tym zgadzać.
