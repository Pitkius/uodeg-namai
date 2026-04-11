# Augintinių priežiūra – Full‑stack aplikacija

Pilna web aplikacija su:
- `frontend/`: React + Tailwind (Vite)
- `backend/`: Node.js + Express + MongoDB + JWT autentifikacija + nuotraukų upload’ai

## Funkcionalumas
- Registracija / prisijungimas (JWT)
- Rezervacijos su laisvų laikų (slotų) valdymu
- Apsauga nuo dvigubų rezervacijų tam pačiam laikui
- Admin panelė (rezervacijų peržiūra, patvirtinimas, trynimas, slotų valdymas)
- Prisijungusių vartotojų augintinių nuotraukų įkėlimas ir rodymas profilyje

## Paleidimas (lokaliai)

### 1) Reikalavimai
- Node.js (rekomenduojama 20+; pas jus tinka ir v24)
- MongoDB (lokaliai arba MongoDB Atlas)

### 2) Backend
1. Nueikite į `backend/` ir įdiekite priklausomybes:

```bash
cd backend
npm install
```

2. Susikurkite `.env` pagal pavyzdį:
- nukopijuokite `backend/.env.example` į `backend/.env`
- įrašykite `MONGODB_URI` ir `JWT_SECRET`

3. Paleiskite backend:

```bash
npm run dev
```

Backend veiks per `http://localhost:4000`.

### 3) Frontend
1. Nueikite į `frontend/` ir įdiekite priklausomybes:

```bash
cd ../frontend
npm install
```

2. Paleiskite frontend:

```bash
npm run dev
```

Frontend veiks per `http://localhost:5173`.

## Admin prisijungimas
Pirmą admin vartotoją galite susikurti per registraciją ir tada MongoDB bazėje vartotojui nustatyti `role: "admin"`.
Alternatyviai, galite paleisti `backend/src/utils/seedAdmin.js` (jei įjungsite rankinį seed’inimą).

