Tu es un architecte logiciel et un développeur backend expert. J'ai terminé l'interface frontend (Next.js) de mon projet "Nazaha-Graph", une plateforme de détection de la corruption dans les marchés publics. 

Ton objectif est de générer le backend complet sous forme de microservice indépendant, et de le connecter à mon frontend.

Voici les spécifications strictes :

1. STACK TECHNIQUE :
- Framework : Python avec FastAPI (doit être performant, asynchrone, et structuré de manière modulaire : routes, services, models).
- Logique Métier : NetworkX pour l'analyse de graphes et la détection de collusions.
- Base de Données : Supabase (PostgreSQL) via le SDK Python officiel (`supabase-py`).
- Sécurité : `passlib` avec Bcrypt pour le hachage des données, JWT pour les sessions si nécessaire.

2. FONCTIONNALITÉS & ENDPOINTS REQUIS :
- POST /api/reports : Point d'entrée pour les lanceurs d'alerte. Doit implémenter une authentification/soumission anonyme. Si des données sensibles sont fournies (mots de passe, identifiants), elles doivent être hachées avec Bcrypt avant l'insertion dans Supabase.
- GET /api/analyze : Récupère les données au format OCDS (Open Contracting Data Standard) depuis Supabase. Applique un algorithme NetworkX pour identifier les nœuds (entreprises/décideurs) et les arêtes (relations). Doit renvoyer un JSON structuré avec un flag `isSuspect: true` pour les nœuds détectés en collusion.
- Intégration INPPLC : Crée un service de "mock" (ex: `services/inpplc_mock.py`) qui simule des requêtes vers l'API de l'INPPLC pour vérifier l'historique juridique des entreprises analysées.

3. STRUCTURE DU PROJET :
Génère la structure de dossiers suivante à la racine de mon projet :
/backend
  ├── main.py
  ├── database.py (Configuration du client Supabase)
  ├── routers/
  ├── services/ (Logique NetworkX et Mock INPPLC)
  ├── models/ (Schémas Pydantic pour OCDS et Reports)
  └── requirements.txt

4. INSTRUCTIONS D'INTÉGRATION FRONTEND :
Après avoir généré le code backend, analyse mon dossier frontend "fraud-detection-ui". 
Modifie mon fichier `lib/mock-data.ts` ou mes composants d'appel de données (fetch/axios) pour qu'ils pointent vers `http://localhost:8000/api/...` au lieu d'utiliser des données statiques. Ajoute la gestion des erreurs CORS dans `main.py` pour autoriser les requêtes de mon frontend Next.js.

Génère le code étape par étape, en commençant par `requirements.txt` et `main.py`.