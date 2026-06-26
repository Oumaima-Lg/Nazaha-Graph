Le mécanisme de "Zero-Knowledge Tracking" (Suivi sans trace)
1. La soumission et la génération du jeton
Quand le lanceur d'alerte clique sur "Envoyer le signalement", ton backend (FastAPI) génère instantanément un code de suivi aléatoire et complexe (par exemple : NZH-9384-XYZ-2026).

2. L'affichage unique (One-time display)
L'interface (Next.js) affiche ce code à l'écran avec un message d'avertissement strict :

"Votre alerte a été enregistrée. Voici votre code secret : NZH-9384-XYZ-2026. Copiez-le et conservez-le en lieu sûr. C'est votre unique moyen de suivre l'avancement. Pour garantir votre anonymat, ce code ne sera plus jamais affiché et nous ne pouvons pas le récupérer si vous le perdez."

3. Le stockage sécurisé (Hachage)
Le backend ne sauvegarde jamais ce code en clair. Il le passe dans une fonction de hachage cryptographique (Bcrypt) et stocke uniquement l'empreinte mathématique (le hash) dans la colonne anonymous_token de Supabase.

4. La consultation ultérieure
Quelques jours plus tard, le lanceur d'alerte revient sur l'application sur une page spécifique "Suivre mon signalement".

Il saisit son code NZH-9384-XYZ-2026 dans un champ texte.

Le backend hache ce qu'il vient de taper et cherche dans la base de données si une empreinte correspond.

S'il y a correspondance, le système lui affiche le statut du dossier (ex: "En cours de traitement", "Clôturé", ou "Preuves supplémentaires demandées").

Avec cette méthode, ton application garantit un anonymat total tout en permettant un suivi. Tu n'as besoin d'aucun email, d'aucun numéro de téléphone, et surtout d'aucune adresse IP. C'est exactement ce qu'un jury de hackathon anti-corruption attend comme réponse technique !





Solutions:
Nous proposons Nazaha-Graph, une solution d'intelligence décisionnelle basée sur la technologie des graphes et la science des données pour cartographier les réseaux de collusion. La solution ingère et croise automatiquement les données multi-sources du Portail des Marchés Publics, du registre du commerce (OMPIC) et des déclarations publiques. Au lieu de traiter les données en silos, Nazaha-Graph les modélise sous forme de nœuds (personnes, entreprises, contrats) et de liens (actionnariat, parenté, antécédents). Des algorithmes spécialisés analysent ce réseau pour détecter instantanément les anomalies : cycles d'attribution répétitifs entre les mêmes acteurs, liens de dépendance cachés ou structures de prête-noms. L'outil génère pour chaque marché un "Score de Risque d'Intégrité" dynamique accessible via un tableau de bord intuitif. En cas d'anomalie statistique, une alerte automatisée est transmise aux auditeurs de l'INPPLC avec un rapport de preuves visuel, permettant une intervention préventive et ciblée avant la validation définitive des contrats, transformant la lutte contre la corruption en une barrière mathématique et proactive.


7. Qu’est-ce qui rend cette solution innovante et la distingue des pratiques existantes ? (128 mots)
Les pratiques existantes reposent sur des contrôles administratifs manuels, linéaires et déclaratifs qui ne voient pas au-delà des documents soumis par le soumissionnaire. Nazaha-Graph rompt avec ce modèle grâce à la "Graph Intelligence". Sa véritable innovation réside dans sa capacité à fusionner des bases de données autrefois cloisonnées pour révéler des structures relationnelles complexes et indirectes (comme un actionnariat croisé sur trois niveaux) invisibles à l'œil humain. Contrairement aux algorithmes de type "boîte noire", l'analyse de graphes offre une transparence totale : l'alerte n'est pas seulement un score, elle s'accompagne d'une cartographie visuelle explicite des liens suspects utilisable comme élément de preuve. Enfin, développée avec des technologies open source (Python), elle garantit une souveraineté numérique totale à bas coût.

8. Comment commencer, concrètement, la mise en œuvre de la solution proposée ?
(Citer trois mesures préliminaires concrètes, max 120 mots par mesure)

Mesure 1 : (84 mots)
Constitution du dataset de test et ciblage pilote : Sélectionner une région administrative pilote (par exemple Rabat-Salé-Kénitra) ou un secteur hautement stratégique pour collecter un échantillon historique de données sur les marchés publics des trois dernières années. Extraire parallèlement les registres d'actionnariat correspondants auprès de l'OMPIC. Cette mesure permettra de structurer, nettoyer et standardiser les données brutes afin de préparer la phase de modélisation algorithmique sur un périmètre maîtrisé, garantissant ainsi la pertinence des futurs tests de détection de collusion.

Mesure 2 : (87 mots)
Développement du MVP algorithmique (Minimum Viable Product) : Développer un script Python utilisant des bibliothèques open source de théorie des graphes (NetworkX, PyVis) pour modéliser les relations de l'échantillon pilote. Configurer les premiers algorithmes de recherche de chemins courts et de détection de communautés afin de cartographier les liens directeurs/actionnaires/entreprises. Ce prototype technique rudimentaire servira à valider scientifiquement la capacité du modèle à faire ressortir visuellement des connexions et des cycles de collusion qui passaient inaperçus lors des contrôles manuels classiques.

Mesure 3 : (81 mots)
Création du dashboard Streamlit et atelier de co-conception : Développer une interface web simplifiée en low-code (via Streamlit) pour afficher visuellement les graphes de relations et les alertes de risques calculées. Organiser ensuite un atelier technique avec des experts métiers et des auditeurs de l'INPPLC pour leur présenter l'outil, tester l'ergonomie du tableau de bord et ajuster les seuils de sensibilité du "Score d'Intégrité" selon leurs retours terrain et les réalités juridiques marocaines.





Voici exactement son rôle et comment il s'intègre dans le système :

1. La différence entre "Contrats" et "Alertes Actives"
Pour bien comprendre, il faut séparer deux comportements dans ton application :

La page "Contrats" (Mode Recherche / "Pull") : C'est un annuaire. L'enquêteur a des doutes sur un contrat spécifique dont il a entendu parler, il le cherche manuellement, et il clique pour voir le graphe. C'est un travail réactif.

Le tableau "Alertes Actives" (Mode Recommandation / "Push") : C'est la "To-Do List" intelligente de l'enquêteur. C'est un travail proactif. Pendant la nuit, quand de nouveaux appels d'offres sont publiés (via l'intégration OCDS), ton backend FastAPI fait tourner NetworkX sur toute la base de données. S'il trouve des réseaux bizarres, il crée automatiquement une "Alerte" et la place ici.