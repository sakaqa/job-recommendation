const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const serviceAccount = require('./firebaseConfig.json');

// 🔥 Initialisation de Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

// 🔍 Récupérer toutes les offres
app.get('/jobs', async (req, res) => {
  try {
    const snapshot = await db.collection('glassdoor_jobs').get();
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json({ jobs });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données :', error);
    res.status(500).json({ message: '❌ Erreur interne du serveur.' });
  }
});

// 🔍 Récupérer une offre par ID
app.get('/job/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const job = await db.collection('glassdoor_jobs').doc(id).get();
    if (!job.exists) {
      return res.status(404).json({ message: '❌ Offre non trouvée.' });
    }
    res.status(200).json({ id: job.id, ...job.data() });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'offre :', error);
    res.status(500).json({ message: '❌ Erreur interne du serveur.' });
  }
});

// 🧠 Recommandations basées sur les compétences
app.post('/recommend', async (req, res) => {
  const { skills } = req.body;

  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ message: '❌ Veuillez fournir une liste de compétences valides.' });
  }

  try {
    const snapshot = await db.collection('glassdoor_jobs').get();
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 🔍 Calcul de la pertinence des offres
    const recommendations = jobs.map(job => {
      const jobSkills = job.skills || [];
      let score = 0;

      jobSkills.forEach(js => {
        if (skills.some(skill => skill.toLowerCase() === js.skill.toLowerCase())) {
          score += js.weight;
        }
      });

      return { ...job, score };
    });

    // 🔝 Trier par score décroissant
    recommendations.sort((a, b) => b.score - a.score);

    res.status(200).json({
      recommendations: recommendations.filter(job => job.score > 0), // Retourner seulement les jobs pertinents
    });
  } catch (error) {
    console.error('❌ Erreur lors de la génération des recommandations :', error);
    res.status(500).json({ message: '❌ Erreur interne du serveur.' });
  }
});

// 🚀 Lancer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});

