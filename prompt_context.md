📂 CONTEXTE GLOBAL DU PROJET : NAZAHA-GRAPH
Nom du projet : Nazaha-Graph
Événement : Nazahathon (Hackathon organisé par l'INPPLC - Instance Nationale de la Probité, de la Prévention et de la Lutte contre la Corruption au Maroc).
Délai de réalisation : Prototype à réaliser en 48h-72h.
Objectif principal : Développer une solution numérique innovante (MVP) pour renforcer l'intégrité et prévenir la corruption dans les marchés publics, en s'inscrivant dans la thématique "Veille, détection et alerte".

1. LA PROBLÉMATIQUE
La corruption dans les marchés publics coûte au Maroc environ 50 milliards MAD par an (5% du PIB). Les méthodes d'audit classiques (manuelles, post-attribution) sont inefficaces face aux montages frauduleux complexes : entreprises écrans, prête-noms, actionnariats croisés, et réseaux d'influence cachés entre décideurs publics et entreprises soumissionnaires. Il est impossible de détecter ces liens "invisibles" avec une simple lecture de documents administratifs.

2. LA SOLUTION : NAZAHA-GRAPH
Nazaha-Graph est une plateforme d'intelligence décisionnelle et de "Graph Intelligence". L'outil agrège les données des appels d'offres (format OCDS) et les données du registre du commerce (OMPIC). Grâce à la théorie des graphes (NetworkX), l'outil modélise ces données sous forme de réseau (Nœuds = Personnes/Entreprises ; Arêtes = Relations/Contrats).
Valeur ajoutée : Détecter algorithmiquement et visuellement les conflits d'intérêts et les collusions avant l'attribution d'un marché, et fournir un canal de signalement 100% anonyme.

3. ARCHITECTURE TECHNIQUE (N-Tiers)
L'architecture est pensée pour être légère, rapide à prototyper, mais structurée comme une application Enterprise prête pour la production.

A. Frontend (Interface UI/UX)
Stack : React 19, Next.js, TypeScript, Tailwind CSS v4, Shadcn UI.

État actuel : Généré via v0.dev. Il s'agit d'une SPA (Single Page Application) avec une navigation latérale et 4 vues principales :

Dashboard : KPIs globaux (Score d'intégrité, alertes).

Analyse Graphe : Cœur du système, visualisation SVG/interactive du réseau d'un marché avec mise en évidence (rouge clignotant) des nœuds suspects.

Base Appels d'Offres : Tableau filtrable des marchés avec badges de statut (Sain/Suspect).

Nouveau Signalement : Formulaire de dépôt d'alerte.

B. Backend (Logique Métier & API)
Stack : Python, FastAPI, NetworkX.

Rôle : Microservice indépendant.

Responsabilités :

Servir les endpoints REST pour le Frontend.

Implémenter la logique d'analyse de graphes avec NetworkX (recherche de cycles, liens de parenté indirects).

Gérer l'authentification et le hachage sécurisé (Bcrypt) pour les signalements anonymes.

Simuler des appels externes (Mock API) vers le système d'information de l'INPPLC.

C. Base de Données (Stockage)
Stack : Supabase (PostgreSQL).

Structure actuelle :

Table reports : Stockage des signalements (titre, description, urgence) avec hachage des identifiants (anonymous_identifier_hash) pour garantir l'anonymat.

Table ocds_releases : Stockage des données de marchés publics au format JSONB pour ingérer la norme Open Contracting Data Standard.