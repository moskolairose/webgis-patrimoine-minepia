"use strict";

/* =========================================================
   CONFIGURATION GEOSERVER
   ========================================================= */

const GEOSERVER_URL = "http://localhost:8080/geoserver";
const WORKSPACE = "patrimoine";
const ASSETS_LAYER_NAME = "v_biens_webgis";
const DEPARTMENTS_LAYER_NAME = "departements_littoral";

const ASSETS_WFS_URL =
    `${GEOSERVER_URL}/${WORKSPACE}/ows` +
    `?service=WFS` +
    `&version=2.0.0` +
    `&request=GetFeature` +
    `&typeNames=${WORKSPACE}:${ASSETS_LAYER_NAME}` +
    `&outputFormat=application/json` +
    `&srsName=EPSG:4326`;

const DEPARTMENTS_WFS_URL =
    `${GEOSERVER_URL}/${WORKSPACE}/ows` +
    `?service=WFS` +
    `&version=2.0.0` +
    `&request=GetFeature` +
    `&typeNames=${WORKSPACE}:${DEPARTMENTS_LAYER_NAME}` +
    `&outputFormat=application/json` +
    `&srsName=EPSG:4326`;


/* =========================================================
   INITIALISATION DE LA CARTE
   ========================================================= */

const map = L.map("map", {
    center: [4.15, 9.65],
    zoom: 8,
    minZoom: 6
});

const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">' +
            "OpenStreetMap</a>"
    }
);

const cartoLightLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
        maxZoom: 20,
        attribution:
            "&copy; OpenStreetMap contributors &copy; CARTO"
    }
);

osmLayer.addTo(map);

const baseMaps = {
    "OpenStreetMap": osmLayer,
    "Fond clair": cartoLightLayer
};

const layerControl = L.control.layers(
    baseMaps,
    {},
    {
        collapsed: false,
        position: "topright"
    }
).addTo(map);

L.control.scale({
    imperial: false,
    position: "bottomleft"
}).addTo(map);


/* =========================================================
   VARIABLES ET ELEMENTS HTML
   ========================================================= */

let allFeatures = [];
let assetsLayer = null;
let departmentsLayer = null;
let categoryChart = null;
let departmentChart = null;
let selectedAssetProperties = null;
let toastTimer = null;

const totalAssets = document.getElementById("total-assets");
const visibleAssets = document.getElementById("visible-assets");
const loadingMessage = document.getElementById("loading-message");

const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const departmentFilter = document.getElementById("department-filter");
const districtFilter = document.getElementById("district-filter");
const statusFilter = document.getElementById("status-filter");
const resetButton = document.getElementById("reset-filters");

const appToast = document.getElementById("app-toast");
const addAssetButton = document.getElementById("add-asset");
const viewAssetsButton = document.getElementById("view-assets");
const editAssetButton = document.getElementById("edit-asset");
const deleteAssetButton = document.getElementById("delete-asset");


/* =========================================================
   FONCTIONS UTILITAIRES
   ========================================================= */

function cleanValue(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "Non renseigné";
    }

    return String(value).trim();
}

function normalizeText(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "";
    }

    return String(value)
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function escapeHtml(value) {
    return cleanValue(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getProperty(properties, possibleNames) {
    for (const name of possibleNames) {
        if (
            Object.prototype.hasOwnProperty.call(properties, name) &&
            properties[name] !== null &&
            String(properties[name]).trim() !== ""
        ) {
            return properties[name];
        }
    }

    return "";
}

function getCategory(properties) {
    return getProperty(properties, [
        "categorie",
        "category"
    ]);
}

function getDepartment(properties) {
    return getProperty(properties, [
        "departement",
        "department"
    ]);
}

function getDistrict(properties) {
    return getProperty(properties, [
        "arrondissement",
        "district",
        "commune"
    ]);
}

function getStatus(properties) {
    return getProperty(properties, [
        "etat",
        "etat_bien",
        "status"
    ]);
}

function getAssetId(properties) {
    return getProperty(properties, [
        "id_bien",
        "identifiant",
        "code",
        "gid"
    ]);
}

function getDesignation(properties) {
    return getProperty(properties, [
        "nom_bien",
        "nom_du_bien",
        "designation",
        "libelle",
        "nom",
        "description"
    ]);
}


/* =========================================================
   COULEURS ET STYLE DES BIENS
   ========================================================= */

function getCategoryColor(categoryValue) {
    const category = normalizeText(categoryValue);

    if (category.includes("batiment")) {
        return "#2563eb";
    }

    if (category.includes("terrain")) {
        return "#16a34a";
    }

    if (category.includes("roulant")) {
        return "#f97316";
    }

    if (category.includes("informatique")) {
        return "#9333ea";
    }

    return "#64748b";
}

function getMarkerStyle(feature) {
    const properties = feature.properties || {};
    const category = getCategory(properties);

    return {
        radius: 8,
        fillColor: getCategoryColor(category),
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    };
}


/* =========================================================
   FICHE DESCRIPTIVE D'UN BIEN
   ========================================================= */

function createPopup(properties) {
    const assetId = getAssetId(properties);
    const assetName = getDesignation(properties);
    const category = getCategory(properties);
    const department = getDepartment(properties);
    const district = getDistrict(properties);
    const status = getStatus(properties);

    return `
        <div class="asset-popup">
            <h3 class="popup-title">
                ${escapeHtml(assetName || "Bien MINEPIA")}
            </h3>

            <div class="popup-row">
                <strong>Identifiant :</strong>
                ${escapeHtml(assetId)}
            </div>

            <div class="popup-row">
                <strong>Nom du bien :</strong>
                ${escapeHtml(assetName)}
            </div>

            <div class="popup-row">
                <strong>Catégorie :</strong>
                ${escapeHtml(category)}
            </div>

            <div class="popup-row">
                <strong>Département :</strong>
                ${escapeHtml(department)}
            </div>

            <div class="popup-row">
                <strong>Arrondissement :</strong>
                ${escapeHtml(district)}
            </div>

            <div class="popup-row">
                <strong>État :</strong>
                ${escapeHtml(status)}
            </div>
        </div>
    `;
}


/* =========================================================
   STATISTIQUES ET GRAPHIQUES
   ========================================================= */

function countFeaturesBy(features, accessor) {
    return features.reduce((counts, feature) => {
        const properties = feature.properties || {};
        const value = cleanValue(accessor(properties));

        counts[value] = (counts[value] || 0) + 1;

        return counts;
    }, {});
}

function updateCharts(features) {
    if (typeof Chart === "undefined") {
        console.warn("Chart.js n'est pas chargé.");
        return;
    }

    const categoryCanvas = document.getElementById("category-chart");
    const departmentCanvas = document.getElementById("department-chart");

    if (!categoryCanvas || !departmentCanvas) {
        return;
    }

    const categoryCounts = countFeaturesBy(
        features,
        getCategory
    );

    const departmentCounts = countFeaturesBy(
        features,
        getDepartment
    );

    if (categoryChart) {
        categoryChart.destroy();
    }

    if (departmentChart) {
        departmentChart.destroy();
    }

    const categoryLabels = Object.keys(categoryCounts);
    const categoryValues = Object.values(categoryCounts);

    categoryChart = new Chart(categoryCanvas, {
        type: "doughnut",

        data: {
            labels: categoryLabels,

            datasets: [{
                data: categoryValues,
                backgroundColor: categoryLabels.map(
                    category => getCategoryColor(category)
                ),
                borderColor: "#ffffff",
                borderWidth: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "58%",

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        boxWidth: 11,
                        padding: 10,

                        font: {
                            size: 10
                        }
                    }
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            const label = context.label || "";
                            const value = Number(context.raw) || 0;
                            const total = context.dataset.data.reduce(
                                (sum, item) => sum + Number(item),
                                0
                            );

                            const percentage = total
                                ? ((value / total) * 100).toFixed(1)
                                : "0.0";

                            return `${label}: ${value} (${percentage} %)`;
                        }
                    }
                }
            }
        }
    });

    const sortedDepartments = Object.entries(departmentCounts)
        .sort((a, b) => b[1] - a[1]);

    departmentChart = new Chart(departmentCanvas, {
        type: "bar",

        data: {
            labels: sortedDepartments.map(item => item[0]),

            datasets: [{
                label: "Nombre de biens",
                data: sortedDepartments.map(item => item[1]),
                backgroundColor: "#0b6b3a",
                borderRadius: 5
            }]
        },

        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                x: {
                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    }
                },

                y: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}


/* =========================================================
   AFFICHAGE DES BIENS
   ========================================================= */

function displayFeatures(features, zoomToData = false) {
    if (assetsLayer) {
        map.removeLayer(assetsLayer);
    }

    assetsLayer = L.geoJSON(
        {
            type: "FeatureCollection",
            features
        },
        {
            pointToLayer(feature, latlng) {
                return L.circleMarker(
                    latlng,
                    getMarkerStyle(feature)
                );
            },

            onEachFeature(feature, layer) {
                const properties = feature.properties || {};
                const assetName = getDesignation(properties);
                const assetId = getAssetId(properties);

                layer.bindTooltip(
                    escapeHtml(
                        assetName ||
                        assetId ||
                        "Bien MINEPIA"
                    ),
                    {
                        direction: "top",
                        sticky: true,
                        opacity: 0.95,
                        className: "asset-tooltip"
                    }
                );

                layer.bindPopup(
                    createPopup(properties),
                    {
                        maxWidth: 340,
                        minWidth: 230
                    }
                );

                layer.on("mouseover", function () {
                    this.setStyle({
                        radius: 10,
                        weight: 3,
                        fillOpacity: 1
                    });
                });

                layer.on("mouseout", function () {
                    this.setStyle(
                        getMarkerStyle(feature)
                    );
                });

                layer.on("click", function () {
                    selectedAssetProperties = properties;

                    if (typeof this.bringToFront === "function") {
                        this.bringToFront();
                    }
                });
            }
        }
    ).addTo(map);

    visibleAssets.textContent = features.length;
    updateCharts(features);

    if (
        zoomToData &&
        features.length > 0 &&
        assetsLayer.getBounds().isValid()
    ) {
        map.fitBounds(
            assetsLayer.getBounds(),
            {
                padding: [30, 30],
                maxZoom: 13
            }
        );
    }
}


/* =========================================================
   LISTES DES FILTRES
   ========================================================= */

function uniqueValues(accessor) {
    return [
        ...new Set(
            allFeatures
                .map(feature => accessor(feature.properties || {}))
                .filter(value => value !== null && value !== undefined)
                .map(value => String(value).trim())
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, "fr"));
}

function populateSelect(selectElement, values) {
    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
    });
}

function populateFilters() {
    populateSelect(
        categoryFilter,
        uniqueValues(getCategory)
    );

    populateSelect(
        departmentFilter,
        uniqueValues(getDepartment)
    );

    populateSelect(
        districtFilter,
        uniqueValues(getDistrict)
    );

    populateSelect(
        statusFilter,
        uniqueValues(getStatus)
    );
}


/* =========================================================
   FILTRAGE
   ========================================================= */

function applyFilters() {
    const searchedText = normalizeText(searchInput.value);
    const selectedCategory = normalizeText(categoryFilter.value);
    const selectedDepartment = normalizeText(departmentFilter.value);
    const selectedDistrict = normalizeText(districtFilter.value);
    const selectedStatus = normalizeText(statusFilter.value);

    const filteredFeatures = allFeatures.filter(feature => {
        const properties = feature.properties || {};

        const assetId = normalizeText(getAssetId(properties));
        const designation = normalizeText(getDesignation(properties));
        const category = normalizeText(getCategory(properties));
        const department = normalizeText(getDepartment(properties));
        const district = normalizeText(getDistrict(properties));
        const status = normalizeText(getStatus(properties));

        const matchesSearch =
            !searchedText ||
            assetId.includes(searchedText) ||
            designation.includes(searchedText);

        const matchesCategory =
            !selectedCategory ||
            category === selectedCategory;

        const matchesDepartment =
            !selectedDepartment ||
            department === selectedDepartment;

        const matchesDistrict =
            !selectedDistrict ||
            district === selectedDistrict;

        const matchesStatus =
            !selectedStatus ||
            status === selectedStatus;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesDepartment &&
            matchesDistrict &&
            matchesStatus
        );
    });

    selectedAssetProperties = null;
    displayFeatures(filteredFeatures);
}

function resetFilters() {
    searchInput.value = "";
    categoryFilter.value = "";
    departmentFilter.value = "";
    districtFilter.value = "";
    statusFilter.value = "";
    selectedAssetProperties = null;

    displayFeatures(allFeatures, true);
}


/* =========================================================
   DEPARTEMENTS DU LITTORAL
   ========================================================= */

async function loadDepartments() {
    try {
        const response = await fetch(DEPARTMENTS_WFS_URL);

        if (!response.ok) {
            throw new Error(
                `Erreur GeoServer : HTTP ${response.status}`
            );
        }

        const geojson = await response.json();

        if (!map.getPane("departmentsPane")) {
            map.createPane("departmentsPane");
            map.getPane("departmentsPane").style.zIndex = 350;
        }

        departmentsLayer = L.geoJSON(geojson, {
            pane: "departmentsPane",

            style: {
                color: "#065f46",
                weight: 2.5,
                opacity: 0.95,
                fillColor: "#16a34a",
                fillOpacity: 0.08
            },

            onEachFeature(feature, layer) {
                const departmentName =
                    feature.properties.name_2 ||
                    feature.properties.NAME_2 ||
                    "Département";

                layer.bindTooltip(departmentName, {
                    permanent: true,
                    direction: "center",
                    className: "department-label"
                });

                layer.on({
                    mouseover() {
                        layer.setStyle({
                            weight: 4,
                            fillOpacity: 0.18
                        });
                    },

                    mouseout() {
                        layer.setStyle({
                            color: "#065f46",
                            weight: 2.5,
                            opacity: 0.95,
                            fillColor: "#16a34a",
                            fillOpacity: 0.08
                        });
                    },

                    click() {
                        const options = Array.from(
                            departmentFilter.options
                        );

                        const matchingOption = options.find(option =>
                            normalizeText(option.value) ===
                            normalizeText(departmentName)
                        );

                        if (matchingOption) {
                            departmentFilter.value = matchingOption.value;
                            applyFilters();
                        }

                        map.fitBounds(layer.getBounds(), {
                            padding: [25, 25],
                            maxZoom: 11
                        });
                    }
                });
            }
        }).addTo(map);

        layerControl.addOverlay(
            departmentsLayer,
            "Départements du Littoral"
        );
    } catch (error) {
        console.error(
            "Impossible de charger les départements :",
            error
        );
    }
}


/* =========================================================
   BOUTONS CRUD — PROTOTYPE
   ========================================================= */

function showToast(message) {
    if (!appToast) {
        console.info(message);
        return;
    }

    appToast.textContent = message;
    appToast.classList.add("visible");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        appToast.classList.remove("visible");
    }, 3200);
}

function selectedAssetLabel() {
    if (!selectedAssetProperties) {
        return "";
    }

    return (
        getDesignation(selectedAssetProperties) ||
        getAssetId(selectedAssetProperties) ||
        "le bien sélectionné"
    );
}

if (addAssetButton) {
    addAssetButton.addEventListener("click", () => {
        showToast(
            "Ajout d'un bien : formulaire prévu dans la prochaine version."
        );
    });
}

if (viewAssetsButton) {
    viewAssetsButton.addEventListener("click", () => {
        showToast(
            "Affichage tabulaire des biens : module en préparation."
        );
    });
}

if (editAssetButton) {
    editAssetButton.addEventListener("click", () => {
        const label = selectedAssetLabel();

        showToast(
            label
                ? `Modification de ${label} : fonctionnalité à connecter.`
                : "Sélectionnez d'abord un bien sur la carte."
        );
    });
}

if (deleteAssetButton) {
    deleteAssetButton.addEventListener("click", () => {
        const label = selectedAssetLabel();

        showToast(
            label
                ? `Suppression de ${label} : action réservée aux administrateurs.`
                : "Sélectionnez d'abord un bien sur la carte."
        );
    });
}


/* =========================================================
   EVENEMENTS DES FILTRES
   ========================================================= */

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
departmentFilter.addEventListener("change", applyFilters);
districtFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);
resetButton.addEventListener("click", resetFilters);


/* =========================================================
   CHARGEMENT DES BIENS DEPUIS GEOSERVER
   ========================================================= */

async function loadAssets() {
    try {
        loadingMessage.textContent = "Chargement des données…";

        const response = await fetch(ASSETS_WFS_URL);

        if (!response.ok) {
            throw new Error(
                `Erreur GeoServer : HTTP ${response.status}`
            );
        }

        const geojson = await response.json();
        allFeatures = geojson.features || [];

        totalAssets.textContent = allFeatures.length;

        populateFilters();
        displayFeatures(allFeatures, true);

        loadingMessage.style.display = "none";
    } catch (error) {
        console.error(error);

        loadingMessage.textContent =
            "Impossible de charger les données GeoServer.";

        loadingMessage.style.background = "#b91c1c";
    }
}


/* =========================================================
   DEMARRAGE DE L'APPLICATION
   ========================================================= */

loadDepartments();
loadAssets();
