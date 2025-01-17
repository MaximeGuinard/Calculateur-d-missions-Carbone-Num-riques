// Gestion des onglets
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// Variables globales pour les calculs
const CONSTANTS = {
    kWhPerGB: 0.81,
    gramsCO2PerKm: 120,
    kgCO2PerTreePerYear: 25,
    baselinePageSize: 2048, // 2MB comme référence
    baselineVisits: 10000
};

let emissionsChart = null;

function calculateEmissions() {
    // Récupération des valeurs
    const pageSize = parseFloat(document.getElementById('pageSize').value) || 0;
    const monthlyVisits = parseFloat(document.getElementById('monthlyVisits').value) || 0;
    const bounceRate = parseFloat(document.getElementById('bounceRate').value) || 0;
    const avgSessionDuration = parseFloat(document.getElementById('avgSessionDuration').value) || 0;
    const serverLocation = parseFloat(document.getElementById('serverLocation').value);
    const cdnUsage = document.getElementById('cdnUsage').value === "1";
    const cachingLevel = parseFloat(document.getElementById('caching').value);

    // Calculs de base
    const pageSizeGB = pageSize / (1024 * 1024); // Conversion Ko en GB
    const effectiveVisits = monthlyVisits * (1 - (bounceRate / 100));
    const sessionPages = Math.max(1, Math.round(avgSessionDuration / 2)); // Estimation du nombre de pages par session

    // Ajustements pour CDN et cache
    const cdnFactor = cdnUsage ? 0.7 : 1; // Le CDN réduit l'impact de 30%
    const cacheFactor = 1 - cachingLevel; // Le cache réduit l'impact selon le niveau choisi

    // Calcul des émissions
    const monthlyDataTransfer = pageSizeGB * effectiveVisits * sessionPages;
    const monthlyEnergyConsumption = monthlyDataTransfer * CONSTANTS.kWhPerGB;
    const adjustedEnergyConsumption = monthlyEnergyConsumption * cdnFactor * cacheFactor;
    const monthlyCO2 = adjustedEnergyConsumption * serverLocation * 1000; // en grammes
    const yearlyCO2 = (monthlyCO2 * 12) / 1000; // en kilogrammes
    const perVisitCO2 = monthlyCO2 / effectiveVisits;

    // Calcul des équivalences
    const carKm = (yearlyCO2 * 1000) / CONSTANTS.gramsCO2PerKm;
    const treesNeeded = Math.ceil(yearlyCO2 / CONSTANTS.kgCO2PerTreePerYear);

    // Calcul du score écologique
    const sizeScore = Math.max(0, 100 - (pageSize / CONSTANTS.baselinePageSize * 100));
    const visitsScore = Math.max(0, 100 - (monthlyVisits / CONSTANTS.baselineVisits * 100));
    const infrastructureScore = (cdnUsage ? 20 : 0) + (cachingLevel * 30);
    const ecoScore = Math.round((sizeScore * 0.4 + visitsScore * 0.3 + infrastructureScore * 0.3));

    // Affichage des résultats
    document.getElementById('perVisitEmissions').textContent = `${perVisitCO2.toFixed(2)} g CO2`;
    document.getElementById('monthlyEmissions').textContent = `${monthlyCO2.toFixed(2)} g CO2`;
    document.getElementById('yearlyEmissions').textContent = `${yearlyCO2.toFixed(2)} kg CO2`;
    document.getElementById('carEquivalent').textContent = `${carKm.toFixed(1)} km`;
    document.getElementById('treeEquivalent').textContent = `${treesNeeded} arbres`;
    
    const ecoScoreElement = document.getElementById('ecoScore');
    ecoScoreElement.style.width = `${ecoScore}%`;
    ecoScoreElement.textContent = `${ecoScore}%`;
    ecoScoreElement.style.backgroundColor = getScoreColor(ecoScore);

    // Afficher les sections de résultats
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('recommendations').classList.remove('hidden');

    // Générer les recommandations
    generateDetailedRecommendations(pageSize, monthlyVisits, ecoScore, cdnUsage, cachingLevel);
    
    // Mettre à jour le graphique
    updateEmissionsChart(monthlyCO2, cdnUsage, cachingLevel);
}

function getScoreColor(score) {
    if (score >= 80) return '#2ecc71';
    if (score >= 60) return '#f1c40f';
    return '#e74c3c';
}

function generateDetailedRecommendations(pageSize, monthlyVisits, ecoScore, cdnUsage, cachingLevel) {
    const critical = [];
    const important = [];
    const optional = [];

    // Recommandations critiques
    if (pageSize > 2048) {
        critical.push("Réduisez drastiquement la taille de la page (>2MB)");
        critical.push("Optimisez et compressez toutes les images");
        critical.push("Minifiez tous les fichiers CSS, JavaScript et HTML");
    }

    if (!cdnUsage && monthlyVisits > 10000) {
        critical.push("Implémentez un CDN pour gérer le trafic important");
    }

    // Recommandations importantes
    if (cachingLevel < 0.6) {
        important.push("Améliorez la stratégie de mise en cache");
        important.push("Configurez l'expiration des ressources statiques");
    }

    if (pageSize > 1024) {
        important.push("Utilisez la compression Gzip/Brotli");
        important.push("Implémentez le chargement différé des images");
    }

    // Recommandations optionnelles
    optional.push("Utilisez un hébergeur éco-responsable");
    optional.push("Optimisez les requêtes base de données");
    optional.push("Mettez en place une stratégie de nettoyage des données");

    // Affichage des recommandations par catégorie
    document.querySelector('#criticalRecommendations ul').innerHTML = 
        critical.map(rec => `<li>${rec}</li>`).join('');
    document.querySelector('#importantRecommendations ul').innerHTML = 
        important.map(rec => `<li>${rec}</li>`).join('');
    document.querySelector('#optionalRecommendations ul').innerHTML = 
        optional.map(rec => `<li>${rec}</li>`).join('');
}

function updateEmissionsChart(monthlyCO2, cdnUsage, cachingLevel) {
    const ctx = document.getElementById('emissionsChart').getContext('2d');
    
    // Calculer les émissions potentielles avec différentes optimisations
    const baseEmissions = monthlyCO2;
    const withCDN = monthlyCO2 * 0.7;
    const withCaching = monthlyCO2 * (1 - cachingLevel);
    const withBoth = monthlyCO2 * 0.7 * (1 - cachingLevel);

    if (emissionsChart) {
        emissionsChart.destroy();
    }

    emissionsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sans Optimisation', 'Avec CDN', 'Avec Cache', 'Avec CDN et Cache'],
            datasets: [{
                label: 'Émissions CO2 (g/mois)',
                data: [baseEmissions, withCDN, withCaching, withBoth],
                backgroundColor: [
                    '#e74c3c',
                    '#f1c40f',
                    '#2ecc71',
                    '#27ae60'
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Émissions CO2 (g/mois)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Impact des Optimisations sur les Émissions CO2'
                }
            }
        }
    });
}