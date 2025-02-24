const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const admin = require('firebase-admin');
const serviceAccount = require('./firebaseConfig.json');

// 🔥 Initialisation de Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// URL de scraping
const url = 'https://www.glassdoor.fr/Emploi/paris-75-france-data-scientist-emplois-SRCH_IL.0,15_IC2881970_KO16,30.htm?sortBy=date_desc';

// ✅ Liste des compétences pondérées
const skills = {
  'Python': { synonyms: ['python'], weight: 5 },
  'SQL': { synonyms: ['sql'], weight: 4 },
  'Machine Learning': { synonyms: ['machine learning', 'ml'], weight: 5 },
  'Deep Learning': { synonyms: ['deep learning', 'dl'], weight: 4 },
  'Data Analysis': { synonyms: ['data analysis', 'data analytics'], weight: 3 },
  'Power BI': { synonyms: ['power bi'], weight: 3 },
  'R': { synonyms: ['r language', 'r programming'], weight: 4 },
  'Tableau': { synonyms: ['tableau'], weight: 3 },
  'Big Data': { synonyms: ['big data'], weight: 4 },
  'Apache Spark': { synonyms: ['spark', 'apache spark'], weight: 4 },
  'AWS': { synonyms: ['aws', 'amazon web services'], weight: 4 },
  'Azure': { synonyms: ['azure'], weight: 3 },
  'TensorFlow': { synonyms: ['tensorflow'], weight: 4 },
  'Keras': { synonyms: ['keras'], weight: 4 },
  'NLP': { synonyms: ['nlp', 'natural language processing'], weight: 4 },
  'Git': { synonyms: ['git'], weight: 3 },
  'NoSQL': { synonyms: ['nosql'], weight: 3 },
  'Java': { synonyms: ['java'], weight: 3 },
  'C++': { synonyms: ['c\\+\\+'], weight: 3 }, // ✅ Fix du problème de regex
  'Docker': { synonyms: ['docker'], weight: 4 },
  'Hadoop': { synonyms: ['hadoop'], weight: 4 },
  'Kafka': { synonyms: ['kafka'], weight: 4 },
  'Scala': { synonyms: ['scala'], weight: 3 },
  'Pandas': { synonyms: ['pandas'], weight: 3 },
  'NumPy': { synonyms: ['numpy'], weight: 3 },
  'Scikit-learn': { synonyms: ['scikit-learn', 'sklearn'], weight: 3 },
  'Matplotlib': { synonyms: ['matplotlib'], weight: 2 },
  'Seaborn': { synonyms: ['seaborn'], weight: 2 },
  'Cloud Computing': { synonyms: ['cloud computing'], weight: 4 },
  'ETL': { synonyms: ['etl'], weight: 3 },
  'Google Cloud': { synonyms: ['google cloud', 'gcp'], weight: 4 },
  'Snowflake': { synonyms: ['snowflake'], weight: 3 },
  'MongoDB': { synonyms: ['mongodb'], weight: 3 },
  'PostgreSQL': { synonyms: ['postgresql', 'postgres'], weight: 3 },
  'MySQL': { synonyms: ['mysql'], weight: 3 },
  'Linux': { synonyms: ['linux'], weight: 3 },
  'Agile': { synonyms: ['agile'], weight: 2 },
  'Scrum': { synonyms: ['scrum'], weight: 2 },
  'Jira': { synonyms: ['jira'], weight: 2 },
  'DevOps': { synonyms: ['devops'], weight: 4 },
  'Kubernetes': { synonyms: ['kubernetes', 'k8s'], weight: 4 },
  'CI/CD': { synonyms: ['ci/cd'], weight: 3 },
  'Elasticsearch': { synonyms: ['elasticsearch'], weight: 3 },
  'GraphQL': { synonyms: ['graphql'], weight: 3 }
};

// 🔄 Fonction pour extraire les compétences
function extractSkills(description) {
  let score = 0;
  let foundSkills = [];

  for (const [skill, { synonyms, weight }] of Object.entries(skills)) {
    for (const synonym of synonyms) {
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
      const matches = description.match(regex);
      if (matches) {
        score += weight * matches.length;
        foundSkills.push({ skill, occurrences: matches.length, weight });
      }
    }
  }

  return { foundSkills, score };
}

// 🔄 Fonction pour cliquer sur "Charger plus d'offres"
async function loadMoreOffers(page) {
  let loadMoreVisible = true;
  while (loadMoreVisible) {
    try {
      await page.waitForSelector('button[data-test="load-more"]', { timeout: 5000 });
      await page.click('button[data-test="load-more"]');
      console.log('🔄 Chargement de plus d\'offres...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.log('✅ Toutes les offres ont été chargées.');
      loadMoreVisible = false;
    }
  }
}

// 🚀 Fonction principale de scraping
async function scrapeGlassdoor() {
  console.log('🚀 Lancement du scraping...');

  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 🔄 Fermer les pop-ups
  try {
    await page.waitForSelector('button[aria-label="Accepter les cookies"]', { timeout: 5000 });
    await page.click('button[aria-label="Accepter les cookies"]');
    console.log('✅ Pop-up des cookies fermé.');
  } catch (e) {
    console.log('❌ Pas de pop-up détecté.');
  }

  // 🔄 Charger toutes les offres
  await loadMoreOffers(page);

  // 🔍 Récupérer les liens des offres
  const jobLinks = await page.$$eval('a[href*="/partner/jobListing"]', links =>
    links.map((el) => el.href)
  );

  console.log(`🔍 Nombre total d'offres détectées : ${jobLinks.length}`);

  // 🔄 Scraping de chaque offre
  for (const [index, link] of jobLinks.entries()) {
    try {
      console.log(`➡️ Scraping de l'offre #${index + 1}/${jobLinks.length}...`);

      await page.goto(link, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div[class*="jobDescription"]', { timeout: 10000 });

      const jobData = await page.evaluate(() => {
        return {
          title: document.querySelector('h1.heading_Heading__BqX5J')?.innerText || 'Titre non disponible',
          companyInfo: document.querySelector('a[class*="EmployerProfile_profileContainer"]')?.innerText || 'Entreprise non disponible',
          location: document.querySelector('div[class*="JobDetails_location"]')?.innerText || 'Localisation non disponible',
          description: document.querySelector('div[class*="jobDescription"]')?.innerText || 'Description non disponible',
        };
      });

      const [companyName, companyRating] = jobData.companyInfo.split('\n');
      const { foundSkills, score } = extractSkills(jobData.description);
      const normalizedScore = Math.min(100, score); // Limiter le score à 100 max

      // 🔄 Insertion ou mise à jour des données
      await db.collection('glassdoor_jobs').add({
        title: jobData.title,
        companyName: companyName || 'Entreprise non disponible',
        rating: companyRating || 'Note non disponible',
        location: jobData.location,
        description: jobData.description,
        skills: foundSkills,
        score: normalizedScore,
        link,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Offre enregistrée : ${jobData.title} chez ${companyName} (Score: ${normalizedScore}/100)`);

    } catch (err) {
      console.error(`❌ Erreur lors du scraping de l'offre :`, err.message);
    }
  }

  await browser.close();
  console.log('🏁 Scraping terminé et données mises à jour.');
}

// 🔥 Lancer le scraper
scrapeGlassdoor().catch((err) => console.error('❌ Erreur générale :', err));

