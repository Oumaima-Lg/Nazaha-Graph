# Nazaha-Graph

Plateforme de détection de collusion dans les marchés publics — backend FastAPI + frontend Next.js.

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Python | 3.11+ |
| Node.js | 18+ |
| pnpm | 8+ |

> Installer pnpm si nécessaire : `npm install -g pnpm`

---

## Structure du projet

```
Nazaha-Graph/
├── backend/          # API FastAPI (port 8000)
└── fraud-detection-ui/  # Frontend Next.js (port 3000)
```

---

## 1. Configuration du Backend

### 1.1 Créer le fichier `.env`

```bash
cd backend
copy .env.example .env
```

Éditer `.env` et renseigner vos valeurs :

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key
JWT_SECRET=change-me-in-production
```

> **Note :** Sans Supabase configuré, le backend fonctionne en mode mock (données simulées).

### 1.2 Créer et activer l'environnement virtuel

```bash
cd backend

# Créer le venv
python -m venv .venv
source .venv/bin/activate

### 1.3 Installer les dépendances

```bash
pip install -r requirements.txt
```

### 1.4 Lancer le backend

```bash
uvicorn main:app --reload --port 8000
```

L'API est disponible sur **http://localhost:8000**  
Documentation Swagger : **http://localhost:8000/docs**  
Health check : **http://localhost:8000/health**

---

## 2. Configuration du Frontend

### 2.1 Créer le fichier `.env.local` (optionnel)

Par défaut le frontend pointe vers `http://localhost:8000`.  
Pour changer l'URL de l'API, créer `fraud-detection-ui/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2.2 Installer les dépendances

```bash
cd fraud-detection-ui
pnpm install
```

### 2.3 Lancer le frontend

```bash
pnpm dev
```

L'application est disponible sur **http://localhost:3000**

---

## 3. Lancer les deux services ensemble

Ouvrir **deux terminaux** et exécuter :

**Terminal 1 — Backend :**
```bash
cd backend
.venv\Scripts\activate.bat
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend :**
```bash
cd fraud-detection-ui
pnpm dev
```

Ensuite ouvrir **http://localhost:3000** dans le navigateur.

---

## 4. Build de production (Frontend)

```bash
cd fraud-detection-ui
pnpm build
pnpm start
```

---

## 5. Endpoints API principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Vérification du service |
| GET | `/api/analyze` | Graphe de collusion + contrats |
| GET | `/api/stats` | Statistiques agrégées |
| POST | `/api/reports` | Soumettre un signalement |
| GET | `/api/reports/history` | Historique des signalements |

---

## 6. Dépannage

**Le frontend ne se connecte pas au backend**  
→ Vérifier que le backend tourne bien sur le port `8000` et que la valeur `NEXT_PUBLIC_API_URL` est correcte.

**Erreur `activate.ps1 cannot be loaded`**  
→ Exécuter dans PowerShell : `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Port déjà utilisé**  
→ Changer le port : `uvicorn main:app --reload --port 8001` et mettre à jour `NEXT_PUBLIC_API_URL` en conséquence.
