# Système de gestion du patrimoine MINEPIA — WebGIS

Application WebGIS conçue pour centraliser, administrer, cartographier et analyser le patrimoine mobilier, immobilier et foncier du **Ministère de l'Élevage, des Pêches et des Industries Animales (MINEPIA)** dans la région du Littoral, au Cameroun.

La solution associe une base de données spatiale PostGIS, une API REST sécurisée, des services géographiques GeoServer et un tableau de bord cartographique développé avec Leaflet.

> **Confidentialité** — Le dépôt public contient uniquement l'interface, la documentation technique et des captures de démonstration. Les données patrimoniales, coordonnées réelles, secrets applicatifs et composants serveur institutionnels ne sont pas publiés.

## Aperçu

![Tableau de bord du WebGIS MINEPIA](screenshots/dashboard-general.png)

Le tableau de bord réunit les biens, les indicateurs dynamiques, les limites administratives et les outils de gestion destinés aux utilisateurs autorisés.

## Fonctionnalités

### Cartographie et consultation

- fonds OpenStreetMap et CARTO ;
- limites du Moungo, du Nkam, de la Sanaga Maritime et du Wouri ;
- symbolisation des biens selon leur catégorie ;
- nom du bien au survol et fiche descriptive au clic ;
- contrôle des couches, zoom et échelle cartographique.

### Recherche et analyse

- recherche par identifiant ou nom du bien ;
- filtres par catégorie, département, arrondissement et état ;
- filtrage automatique par clic sur un département ;
- compteurs des biens totaux et affichés ;
- graphiques dynamiques par catégorie et département ;
- recalcul automatique des indicateurs après filtrage.

### Gestion CRUD

- ajout et consultation d'un bien ;
- affichage cartographique et tabulaire de l'inventaire ;
- modification des informations descriptives et géographiques ;
- suppression contrôlée ;
- validation métier et journalisation des opérations sensibles.

Les écritures sont exécutées par l'API après authentification et contrôle des autorisations. PostgreSQL n'est jamais exposé directement au navigateur.

## Captures d'écran

### Tableau de bord général

![Vue générale du tableau de bord](screenshots/dashboard-general.png)

### Fiche descriptive d'un bien

![Consultation de la fiche d'un bien](screenshots/fiche-bien.png)

### Préparation des limites dans QGIS

![Départements du Littoral dans QGIS](screenshots/preparation-limites-qgis.png)

Les captures utilisent des coordonnées simulées et des informations de démonstration.

## Architecture technique

```mermaid
flowchart LR
    U[Utilisateur] --> F[Interface Leaflet]
    F --> A[API REST sécurisée]
    A --> P[(PostgreSQL / PostGIS)]
    F --> G[GeoServer]
    G --> P
    A --> J[Journal d'audit]
```

### Flux applicatifs

1. L'interface interroge GeoServer pour consulter les couches géographiques.
2. L'API REST applique l'authentification, la validation métier et les autorisations.
3. Les opérations CRUD sont exécutées dans PostGIS au moyen de transactions sécurisées.
4. Chaque modification est enregistrée dans le journal d'audit.
5. Le tableau de bord actualise les compteurs et graphiques.

## Technologies

| Domaine | Technologies |
|---|---|
| Base de données | PostgreSQL 18.4, PostGIS 3.6 |
| Serveur cartographique | GeoServer 2.28.1 |
| API backend | Python, FastAPI, SQLAlchemy, GeoAlchemy2 |
| Authentification | JWT, contrôle d'accès par rôles |
| SIG bureautique | QGIS |
| Cartographie web | Leaflet 1.9 |
| Visualisation | Chart.js |
| Frontend | HTML5, CSS3, JavaScript ES6 |
| Services géographiques | WMS, WFS, GeoJSON |
| Référentiel spatial | WGS 84 — EPSG:4326 |
| Documentation API | OpenAPI / Swagger UI |
| Versionnement | Git, GitHub |

## Sécurité et rôles

| Rôle | Consultation | Ajout | Modification | Suppression | Administration |
|---|---:|---:|---:|---:|---:|
| Lecteur | Oui | Non | Non | Non | Non |
| Gestionnaire | Oui | Oui | Oui | Non | Non |
| Administrateur | Oui | Oui | Oui | Oui | Oui |

Mesures appliquées : mots de passe hachés, jetons JWT à durée limitée, validation côté API, requêtes paramétrées, restriction CORS, comptes PostgreSQL à privilèges limités et journalisation des actions.

## Données et qualité géographique

- **435 biens** structurés et cartographiés ;
- **4 départements** intégrés comme référentiel ;
- contrôle du système de coordonnées en `EPSG:4326` ;
- validation avec `ST_IsValid` et correction avec `ST_MakeValid` ;
- index spatiaux GiST ;
- coordonnées simulées en attente des relevés GPS validés.

## Services et API

### Couches GeoServer

```text
patrimoine:v_biens_webgis
patrimoine:departements_littoral
```

### Routes principales

```text
POST   /api/auth/login
GET    /api/biens
GET    /api/biens/{id}
POST   /api/biens
PUT    /api/biens/{id}
DELETE /api/biens/{id}
GET    /api/statistiques
GET    /api/referentiels/departements
```

La documentation OpenAPI interactive est disponible dans l'environnement interne.

## Structure du projet

```text
webgis-patrimoine-minepia/
├── api/                      # Backend privé
├── css/
│   └── style.css
├── docs/
├── images/
├── js/
│   └── app.js
├── screenshots/
│   ├── dashboard-general.png
│   ├── fiche-bien.png
│   └── preparation-limites-qgis.png
├── .gitignore
├── index.html
└── README.md
```

Le backend, les paramètres de connexion et les données métiers sont exclus de la version publique.

## Configuration locale

### Prérequis

- PostgreSQL/PostGIS ;
- GeoServer ;
- Python 3.11 ou version ultérieure ;
- environnement virtuel Python ;
- serveur web local tel que Live Server.

Les secrets sont définis dans un fichier `.env` non versionné :

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET_KEY=CHANGE_ME
GEOSERVER_URL=http://localhost:8080/geoserver
```

## Résultats

- inventaire centralisé dans une base spatiale structurée ;
- diffusion normalisée des couches par GeoServer ;
- consultation cartographique et statistique dans une interface unique ;
- recherche et localisation rapides des biens ;
- actualisation contrôlée, sécurisée et traçable ;
- architecture extensible aux autres régions du MINEPIA.

## Perspectives

- remplacement des coordonnées simulées par des relevés GPS validés ;
- photographies et pièces justificatives ;
- rapports PDF et Excel automatisés ;
- historique détaillé des changements ;
- alertes de maintenance ;
- déploiement institutionnel sécurisé ;
- extension nationale du référentiel patrimonial.

## Auteure

**Dr Waytehad Rose Moskolai**  
Data Scientist — Intelligence artificielle, SIG et télédétection

