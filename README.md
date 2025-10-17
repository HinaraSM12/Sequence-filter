# Sequence-Filter (HTML+JS + API Node + MySQL existente)

## Requisitos
- Docker y Docker Compose
- Tu contenedor MySQL `mysql57` corriendo y accesible por nombre `mysql57` (o ajusta `DB_HOST`)

## Configuración rápida
1. Ajusta `api/.env` si tu tabla o columnas no se llaman `peptide_sequences(header, sequence)`:
   - `TABLE_NAME`
   - `HEADER_COLUMN`
   - `SEQUENCE_COLUMN`
2. Coloca tu logo (si quieres) en `frontend/assets/img/sequence-filter-logo.png`.

## Levantar
```bash
docker compose up --build
