import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { OFFICIAL_30_DEPARTMENTS, OfficialDepartmentItem, OfficialPosteItem } from '../data/official30Departments';

export interface PosteCatalogItem {
  titre: string;
  departement: string;
  codeDepartement: string;
  codeCnp: string; // Classification Nationale des Professions (5 chiffres au Canada)
  missions: string[]; // Strictement 6 missions opérationnelles
  salaireMensuelDefaut: number; // CAD / mois
  salaireHoraireDefaut: number; // CAD / heure
  heuresHebdo: string;
  qualifications: string;
  isCustom?: boolean;
}

const LOCAL_STORAGE_CATALOG_KEY = 'atlantic_custom_postes_catalog_v1';

/**
 * EXPERT INTERNATIONAL EN ORGANISATION DES ENTREPRISES ET RESSOURCES HUMAINES
 * 
 * Analyse sémantique avancée prenant en charge TOUS les secteurs d'activité :
 * - Transport, Camionnage & Exploitation
 * - Logistique, Entreposage & Distribution
 * - Douanes & Transit Maritime/Aérien
 * - Maintenance, Mécanique & Services Techniques
 * - Santé, Médecine & Mieux-être au travail
 * - Enseignement, Formation & Pédagogie
 * - Agriculture, Agronomie & Agroalimentaire
 * - Architecture, Génie Civil & BTP
 * - Droit, Justice & Conformité
 * - Finances, Comptabilité & Audit
 * - Informatique, Systèmes & Intelligence Artificielle
 * - Industrie, Usinage & Énergie
 * - Etc.
 */
export function deriveCnpAndSalaryForPoste(title: string): {
  deptCode: string;
  deptName: string;
  codeCnp: string;
  mensuel: number;
  horaire: number;
  missions: [string, string, string, string, string, string];
} {
  const norm = (title || '').trim().toLowerCase();

  // 1. Recherche directe dans les 30 départements officiels
  for (const dept of OFFICIAL_30_DEPARTMENTS) {
    for (const p of dept.postes) {
      if (p.titre.toLowerCase() === norm || norm.includes(p.titre.toLowerCase()) || p.titre.toLowerCase().includes(norm)) {
        return {
          deptCode: dept.code,
          deptName: dept.name,
          codeCnp: p.codeCnp,
          mensuel: p.salaireMensuel,
          horaire: p.salaireHoraire,
          missions: p.missions
        };
      }
    }
  }

  // 2. SANTÉ, MÉDECINE & ERGONOMIE (Cross-sectoriel)
  if (
    norm.includes('santé') ||
    norm.includes('méd') ||
    norm.includes('infirmier') ||
    norm.includes('soignant') ||
    norm.includes('docteur') ||
    norm.includes('ergothérapeute') ||
    norm.includes('psychologue') ||
    norm.includes('kinésithérapeute') ||
    norm.includes('pharmacie')
  ) {
    return {
      deptCode: 'SANTE_SECURITE_ENVIRONNEMENT',
      deptName: 'DÉPARTEMENT 13 – SANTÉ, SÉCURITÉ ET ENVIRONNEMENT (SSE)',
      codeCnp: '31301',
      mensuel: 6800,
      horaire: 42.5,
      missions: [
        `Assurer la prise en charge médicale, les soins préventifs et la surveillance sanitaire au titre de ${title}.`,
        "Détecter et évaluer les facteurs de risques biomécaniques, ergonomiques et psychosociaux en milieu de travail.",
        "Dispenser les premiers secours d'urgence et coordonner les évacuations sanitaires avec les centres hospitaliers.",
        "Tenir rigoureusement les registres de santé au travail dans le strict respect du secret médical et des lois canadiennes.",
        "Concevoir et animer des programmes de sensibilisation à la prévention des maladies professionnelles et des TMS.",
        "Participer aux comités de santé et sécurité et élaborer les plans de réadaptation et de retour progressif au travail."
      ]
    };
  }

  // 3. ENSEIGNEMENT, ÉDUCATION & PÉDAGOGIE
  if (
    norm.includes('enseign') ||
    norm.includes('professeur') ||
    norm.includes('formateur') ||
    norm.includes('instructeur') ||
    norm.includes('coach') ||
    norm.includes('pédagog') ||
    norm.includes('éducat')
  ) {
    return {
      deptCode: 'FORMATION_DEVELOPPEMENT_COMPETENCES',
      deptName: 'DÉPARTEMENT 21 – FORMATION ET DÉVELOPPEMENT DES COMPÉTENCES',
      codeCnp: '41220',
      mensuel: 5280,
      horaire: 33.0,
      missions: [
        `Concevoir l'ingénierie pédagogique et les modules de perfectionnement professionnel associés au métier de ${title}.`,
        "Animer les sessions d'apprentissage théorique et pratique destinées aux collaborateurs opérationnels.",
        "Évaluer les acquis professionnels, les compétences techniques et délivrer les attestations réglementaires.",
        "Élaborer des supports pédagogiques modernes, livrets d'apprentissage et modules e-learning interactifs.",
        "Suivre l'évolution des réglementations sectorielles et adapter les cursus de formation aux normes canadiennes.",
        "Mesurer l'impact opérationnel des formations et produire les bilans d'évaluation pédagogique pour la direction."
      ]
    };
  }

  // 4. AGRICULTURE, AGRONOMIE & AGROALIMENTAIRE
  if (
    norm.includes('agri') ||
    norm.includes('agronome') ||
    norm.includes('élevage') ||
    norm.includes('végétal') ||
    norm.includes('agroalimentaire') ||
    norm.includes('forest') ||
    norm.includes('horticult')
  ) {
    return {
      deptCode: 'ENVIRONNEMENT_DEVELOPPEMENT_DURABLE',
      deptName: 'DÉPARTEMENT 22 – ENVIRONNEMENT ET DÉVELOPPEMENT DURABLE',
      codeCnp: '21111',
      mensuel: 5600,
      horaire: 35.0,
      missions: [
        `Superviser les protocoles agronomiques et environnementaux liés à la fonction de ${title}.`,
        "Contrôler la qualité des sols, des ressources hydriques et le respect des normes écologiques durables.",
        "Gérer la conformité des chaînes d'approvisionnement des produits agroalimentaires et biosourcés.",
        "Appliquer rigoureusement les normes sanitaires et phytosanitaires de l'Agence canadienne d'inspection des aliments (ACIA).",
        "Mettre en œuvre des techniques d'agriculture régénératrice et de valorisation des coproduits organiques.",
        "Rédiger les rapports techniques d'expertise agronomique et conseiller les directions sur les impacts écologiques."
      ]
    };
  }

  // 5. ARCHITECTURE, BTP & GÉNIE CIVIL
  if (
    norm.includes('architect') ||
    norm.includes('génie civil') ||
    norm.includes('bâtiment') ||
    norm.includes('géomètre') ||
    norm.includes('chanti') ||
    norm.includes('travaux') ||
    norm.includes('urbanis')
  ) {
    return {
      deptCode: 'IMMOBILIER_BATIMENTS_INFRASTRUCTURES',
      deptName: 'DÉPARTEMENT 15 – IMMOBILIER, BÂTIMENTS ET INFRASTRUCTURES',
      codeCnp: '21300',
      mensuel: 7040,
      horaire: 44.0,
      missions: [
        `Concevoir, dimensionner et superviser les infrastructures opérationnelles en qualité de ${title}.`,
        "Réaliser les calculs de structure, plans d'aménagement et modélisations BIM conformes au Code du bâtiment.",
        "Piloter les réunions de chantier, coordonner les corps d'état secondaires et vérifier la qualité des matériaux.",
        "Contrôler le respect scrupuleux des délais d'exécution, des budgets alloués et des normes de sécurité.",
        "Assurer la conformité environnementale et la durabilité énergétique des plateformes logistiques et bureaux.",
        "Organiser les opérations préalables à la réception des ouvrages et lever les réserves techniques constatées."
      ]
    };
  }

  // 6. DROIT, CONTENTIEUX & FISCALITÉ
  if (
    norm.includes('droit') ||
    norm.includes('juriste') ||
    norm.includes('avocat') ||
    norm.includes('contentieux') ||
    norm.includes('fiscal') ||
    norm.includes('notaire') ||
    norm.includes('légal')
  ) {
    return {
      deptCode: 'JURIDIQUE_CONFORMITE',
      deptName: 'DÉPARTEMENT 08 – JURIDIQUE ET CONFORMITÉ',
      codeCnp: '41101',
      mensuel: 6720,
      horaire: 42.0,
      missions: [
        `Rédiger, analyser et sécuriser l'ensemble des actes et accords contractuels au titre de ${title}.`,
        "Conseiller les directions opérationnelles sur les enjeux de droit des affaires, droit du travail et transport.",
        "Gérer les dossiers précontentieux et contentieux en liaison directe avec les cabinets d'avocats mandatés.",
        "Assurer une veille législative et jurisprudentielle proactive sur les réglementations fédérales et provinciales.",
        "Veiller à la protection de la propriété intellectuelle, des données personnelles et de la conformité statutaire.",
        "Représenter les intérêts juridiques de l'entreprise lors des négociations bilatérales complexes."
      ]
    };
  }

  // 7. FINANCES, AUDIT & COMPTABILITÉ
  if (
    norm.includes('financ') ||
    norm.includes('comptab') ||
    norm.includes('audit') ||
    norm.includes('trésor') ||
    norm.includes('gestionnaire') ||
    norm.includes('banque') ||
    norm.includes('fiscalist')
  ) {
    return {
      deptCode: 'FINANCES_COMPTABILITE',
      deptName: 'DÉPARTEMENT 07 – FINANCES ET COMPTABILITÉ',
      codeCnp: '11100',
      mensuel: 5440,
      horaire: 34.0,
      missions: [
        `Enregistrer et superviser la tenue des comptes généraux et auxiliaires en tant que ${title}.`,
        "Établir les déclarations fiscales, sociales et réglementaires conformément aux normes comptables en vigueur.",
        "Réaliser les rapprochements bancaires, le suivi des flux de trésorerie et la gestion des encaissements.",
        "Participer activement aux clôtures mensuelles et annuelles ainsi qu'à la production des états financiers.",
        "Mettre en place des indicateurs de contrôle interne pour sécuriser l'intégrité des opérations monétaires.",
        "Collaborer avec les commissaires aux comptes et auditeurs externes lors des vérifications périodiques."
      ]
    };
  }

  // 8. INFORMATIQUE, DATA & CYBERSÉCURITÉ
  if (
    norm.includes('informati') ||
    norm.includes('développ') ||
    norm.includes('programmeur') ||
    norm.includes('logiciel') ||
    norm.includes('data') ||
    norm.includes('cyber') ||
    norm.includes('réseau') ||
    norm.includes('web')
  ) {
    return {
      deptCode: 'INFORMATIQUE_SYSTEMES_INFORMATION',
      deptName: 'DÉPARTEMENT 09 – INFORMATIQUE ET SYSTÈMES D’INFORMATION',
      codeCnp: '21232',
      mensuel: 6400,
      horaire: 40.0,
      missions: [
        `Concevoir, programmer et maintenir les systèmes informatiques et applicatifs au titre de ${title}.`,
        "Développer des architectures logicielles évolutives et interconnecter les interfaces de données (API/EDI).",
        "Assurer la sécurité des données, prévenir les vulnérabilités réseau et administrer les pare-feux.",
        "Diagnostiquer et corriger les anomalies techniques pour garantir une haute disponibilité des services.",
        "Rédiger la documentation technique, les protocoles de test et accompagner les utilisateurs finaux.",
        "Participer à la veille technologique et implémenter des innovations favorisant la transformation numérique."
      ]
    };
  }

  // 9. SÉCURITÉ, SURVEILLANCE & GARDIENNAGE
  if (
    norm.includes('sécurité') ||
    norm.includes('garde') ||
    norm.includes('surveill') ||
    norm.includes('vigile') ||
    norm.includes('gardien') ||
    norm.includes('protection')
  ) {
    return {
      deptCode: 'SECURITE_SURETE',
      deptName: 'DÉPARTEMENT 16 – SÉCURITÉ ET SÛRETÉ',
      codeCnp: '64410',
      mensuel: 3920,
      horaire: 24.5,
      missions: [
        `Assurer la surveillance physique et le contrôle d'accès des installations sensibles en tant que ${title}.`,
        "Effectuer des rondes de sécurité préventives et surveiller les systèmes de vidéosurveillance et alarmes.",
        "Vérifier l'identité des visiteurs, transporteurs et délivrer les badges d'accès conformément aux consignes.",
        "Intervenir promptement en cas d'intrusion, de sinistre ou d'incident et appliquer les protocoles de secours.",
        "Consigner scrupuleusement l'ensemble des événements, anomalies et incidents sur la main courante électronique.",
        "Collaborer efficacement avec les forces de l'ordre et services de secours lors des situations d'urgence."
      ]
    };
  }

  // 10. MÉCANIQUE, ÉLECTRICITÉ & SERVICES TECHNIQUES
  if (
    norm.includes('mécani') ||
    norm.includes('électri') ||
    norm.includes('technic') ||
    norm.includes('plomb') ||
    norm.includes('froid') ||
    norm.includes('clim') ||
    norm.includes('soudeur') ||
    norm.includes('artisan')
  ) {
    return {
      deptCode: 'MAINTENANCE_SERVICES_TECHNIQUES',
      deptName: 'DÉPARTEMENT 14 – MAINTENANCE ET SERVICES TECHNIQUES',
      codeCnp: '72401',
      mensuel: 5900,
      horaire: 36.85,
      missions: [
        `Réaliser les opérations de diagnostic, d'entretien préventif et curatif au titre de ${title}.`,
        "Localiser les pannes mécaniques, électriques ou hydrauliques et procéder au remplacement des pièces défectueuses.",
        "Effectuer les réglages, paramétrages et essais de fonctionnement pour garantir une sécurité d'utilisation optimale.",
        "Renseigner les rapports d'intervention technique et mettre à jour le carnet d'entretien numérique.",
        "Veiller à la conformité des outillages, au respect des normes de sécurité et au port des équipements de protection.",
        "Maintenir un stock de pièces détachées de première nécessité et signaler les approvisionnements requis."
      ]
    };
  }

  // 11. TRANSPORT ROUTIER, CAMIONNAGE & CHAUFFEUR
  if (
    norm.includes('conducteur') ||
    norm.includes('chauffeur') ||
    norm.includes('routier') ||
    norm.includes('camion') ||
    norm.includes('tracteur')
  ) {
    return {
      deptCode: 'TRANSPORT_EXPLOITATION',
      deptName: 'DÉPARTEMENT 03 – TRANSPORT ET EXPLOITATION',
      codeCnp: '73300',
      mensuel: 4800,
      horaire: 30.0,
      missions: [
        "Réaliser le transport et la livraison sécurisée des cargaisons sur les axes autoroutiers canadiens et transfrontaliers.",
        "Effectuer rigoureusement les inspections pré-départ et post-voyage du tracteur et de la semi-remorque (ronde de sécurité).",
        "Arrêter et arrimer les chargements dans le strict respect du Code canadien de sécurité et des normes de répartition des charges.",
        "Gérer les carnets de route électroniques (ELD) et veiller au respect scrupuleux des heures de service et temps de repos légaux.",
        "Contrôler la conformité des liasses documentaires de transport, manifestes douaniers (e-Manifest / ACI) et lettres de voiture.",
        "Signaler sans délai toute anomalie mécanique, retard ou aléa d'exploitation auprès du centre de régulation opérationnelle."
      ]
    };
  }

  // 12. MANUTENTION, CARISTE & ENTREPOSAGE
  if (
    norm.includes('cariste') ||
    norm.includes('magasinier') ||
    norm.includes('manutention') ||
    norm.includes('préparateur') ||
    norm.includes('entrepôt')
  ) {
    return {
      deptCode: 'LOGISTIQUE_CHAINE_APPROVISIONNEMENT',
      deptName: "DÉPARTEMENT 04 – LOGISTIQUE ET CHAÎNE D'APPROVISIONNEMENT",
      codeCnp: '75101',
      mensuel: 4240,
      horaire: 26.5,
      missions: [
        "Prendre en charge la réception physique, le déchargement et le contrôle qualitatif et quantitatif des marchandises à l'arrivée.",
        "Conduire les engins de manutention et chariots élévateurs dans le respect intransigeant des protocoles SST.",
        "Réaliser le stockage en palettiers, l'approvisionnement des zones de prélèvement (picking) et le gerbage en hauteur.",
        "Préparer et conditionner les commandes clients avec rigueur et vélocité à l'aide de scanners radiofréquence connectés au WMS.",
        "Participer activement aux opérations d'inventaire tournant et général et signaler toute divergence de stock constatée.",
        "Maintenir la propreté, le zonage et l'intégrité des allées de circulation au sein de la plateforme logistique."
      ]
    };
  }

  // DÉDUCTION GÉNÉRIQUE STRUCTURÉE ADAPTÉE AU NIVEAU HIÉRARCHIQUE
  const isDirecteur = norm.includes('directeur') || norm.includes('chief') || norm.includes('head');
  const isResponsable = norm.includes('responsable') || norm.includes('chef') || norm.includes('manager') || norm.includes('supervis');

  if (isDirecteur) {
    return {
      deptCode: 'DIRECTION_GENERALE_ADMINISTRATION',
      deptName: 'DÉPARTEMENT 01 – DIRECTION GÉNÉRALE ET ADMINISTRATION',
      codeCnp: '00014',
      mensuel: 9280,
      horaire: 58.0,
      missions: [
        `Définir les orientations stratégiques, les objectifs prioritaires et la gouvernance au titre de ${title}.`,
        "Superviser les équipes de management, allouer les ressources opérationnelles et contrôler l'exécution des budgets.",
        "Représenter institutionnellement l'entreprise auprès des autorités gouvernementales, partenaires et clients majeurs.",
        "Prendre les décisions d'arbitrage majeures pour sécuriser la croissance, la rentabilité et la réputation du groupe.",
        "Valider les politiques de conformité réglementaire, de qualité et de maîtrise des risques sur l'ensemble des opérations.",
        "Présenter les rapports de performance trimestriels et annuels aux comités de direction et d'administration."
      ]
    };
  }

  if (isResponsable) {
    return {
      deptCode: 'GESTION_PROJETS',
      deptName: 'DÉPARTEMENT 17 – GESTION DES PROJETS',
      codeCnp: '12102',
      mensuel: 6080,
      horaire: 38.0,
      missions: [
        `Piloter le déploiement opérationnel des activités quotidiennes confiées au poste de ${title}.`,
        "Coordonner et animer les équipes opérationnelles, organiser les plannings et veiller à l'atteinte des jalons.",
        "Gérer les interactions transversales entre services et résoudre avec célérité les difficultés constatées.",
        "Contrôler la qualité des livrables et la stricte conformité des procédures avec les exigences d'Atlantic Transport.",
        "Suivre les indicateurs clés de performance (KPI) et proposer des plans d'amélioration continue des processus.",
        "Rédiger les bilans d'activité périodiques et rendre compte des résultats obtenus auprès de la direction."
      ]
    };
  }

  // Fiche générique opérationnelle
  return {
    deptCode: 'DIRECTION_GENERALE_ADMINISTRATION',
    deptName: 'DÉPARTEMENT 01 – DIRECTION GÉNÉRALE ET ADMINISTRATION',
    codeCnp: '12100',
    mensuel: 4800,
    horaire: 30.0,
    missions: [
      `Assurer l'exécution rigoureuse des missions techniques et opérationnelles assignées au titre de ${title}.`,
      "Coordonner ses interventions avec les équipes des départements connexes pour garantir la fluidité des processus.",
      "Veiller au respect scrupuleux des normes de sécurité au travail, des chartes qualité et des protocoles internes.",
      "Gérer la documentation professionnelle, les saisies dans les progiciels métiers et l'archivage réglementaire.",
      "Identifier et signaler immédiatement tout dysfonctionnement opérationnel afin de mettre en œuvre les mesures correctives.",
      "Participer activement à l'amélioration de la qualité de service et à la satisfaction globale des clients et partenaires."
    ]
  };
}

/**
 * Récupère le catalogue complet des postes (30 départements officiels + postes personnalisés sauvegardés)
 */
export function getAllPosteCatalogItems(): PosteCatalogItem[] {
  const catalogMap = new Map<string, PosteCatalogItem>();

  // 1. Ajouter l'ensemble des 30 départements officiels canadiens avec leurs postes et 6 missions strictes
  for (const dept of OFFICIAL_30_DEPARTMENTS) {
    for (const p of dept.postes) {
      catalogMap.set(p.titre.toLowerCase(), {
        titre: p.titre,
        departement: dept.name,
        codeDepartement: dept.code,
        codeCnp: p.codeCnp,
        missions: [...p.missions],
        salaireMensuelDefaut: p.salaireMensuel,
        salaireHoraireDefaut: p.salaireHoraire,
        heuresHebdo: '40 heures par semaine',
        qualifications: 'Diplôme ou expérience correspondante au poste'
      });
    }
  }

  // 2. Ajouter les postes historiques spécialisés (ex: Conducteurs routiers internationaux, caristes, engins lourds)
  const legacyExtras = [
    {
      titre: 'Conducteur Routier International (H/F)',
      codeCnp: '73300',
      departement: 'DÉPARTEMENT 03 – TRANSPORT ET EXPLOITATION',
      codeDepartement: 'TRANSPORT_EXPLOITATION',
      salaireHoraire: 30.0,
      salaireMensuel: 4800
    },
    {
      titre: 'Chauffeur Poids Lourd',
      codeCnp: '73300',
      departement: 'DÉPARTEMENT 03 – TRANSPORT ET EXPLOITATION',
      codeDepartement: 'TRANSPORT_EXPLOITATION',
      salaireHoraire: 30.0,
      salaireMensuel: 4800
    },
    {
      titre: 'Cariste / Magasinier',
      codeCnp: '75101',
      departement: "DÉPARTEMENT 04 – LOGISTIQUE ET CHAÎNE D'APPROVISIONNEMENT",
      codeDepartement: 'LOGISTIQUE_CHAINE_APPROVISIONNEMENT',
      salaireHoraire: 26.5,
      salaireMensuel: 4240
    },
    {
      titre: 'Préparateur de Commandes',
      codeCnp: '75101',
      departement: "DÉPARTEMENT 04 – LOGISTIQUE ET CHAÎNE D'APPROVISIONNEMENT",
      codeDepartement: 'LOGISTIQUE_CHAINE_APPROVISIONNEMENT',
      salaireHoraire: 26.5,
      salaireMensuel: 4240
    },
    {
      titre: 'Conducteur d\'Engins Lourds (Shovel / Pelle Mécanique)',
      codeCnp: '73400',
      departement: 'DÉPARTEMENT 30 – GESTION DES SERVICES SPÉCIALISÉS ET ACTIVITÉS TECHNIQUES',
      codeDepartement: 'SERVICES_SPECIALISES_ACTIVITES_TECHNIQUES',
      salaireHoraire: 34.0,
      salaireMensuel: 5440
    }
  ];

  for (const extra of legacyExtras) {
    if (!catalogMap.has(extra.titre.toLowerCase())) {
      const derived = deriveCnpAndSalaryForPoste(extra.titre);
      catalogMap.set(extra.titre.toLowerCase(), {
        titre: extra.titre,
        departement: extra.departement,
        codeDepartement: extra.codeDepartement,
        codeCnp: extra.codeCnp,
        missions: derived.missions,
        salaireMensuelDefaut: extra.salaireMensuel,
        salaireHoraireDefaut: extra.salaireHoraire,
        heuresHebdo: '40 heures par semaine',
        qualifications: 'Permis et habilitations professionnelles requises'
      });
    }
  }

  // 3. Fusionner les postes personnalisés créés dynamiquement (localStorage)
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
    if (raw) {
      const customList: PosteCatalogItem[] = JSON.parse(raw);
      for (const item of customList) {
        catalogMap.set(item.titre.toLowerCase(), item);
      }
    }
  } catch (err) {
    console.warn('Erreur lecture catalogue postes:', err);
  }

  return Array.from(catalogMap.values());
}

/**
 * Recherche ou Enregistrement intelligent d'un poste :
 * Si le poste existe déjà sur le site, renvoie ses données.
 * S'il n'existe pas, crée automatiquement le poste avec son département, son code CNP, ses 6 missions,
 * sa grille salariale et l'enregistre en base de données Firestore !
 */
export function searchOrRegisterPoste(titleInput: string, deptHint?: string): {
  poste: PosteCatalogItem;
  isNewlyCreated: boolean;
} {
  const cleanTitle = (titleInput || '').trim();
  if (!cleanTitle) {
    return {
      poste: getAllPosteCatalogItems()[0],
      isNewlyCreated: false
    };
  }

  const catalog = getAllPosteCatalogItems();
  const existing = catalog.find(
    (item) => item.titre.toLowerCase() === cleanTitle.toLowerCase()
  );

  if (existing) {
    return {
      poste: existing,
      isNewlyCreated: false
    };
  }

  // Nouveau poste détecté : Déduction experte selon les consignes
  const derived = deriveCnpAndSalaryForPoste(cleanTitle);
  const resolvedDept = deptHint || derived.deptName;

  const newItem: PosteCatalogItem = {
    titre: cleanTitle,
    departement: resolvedDept,
    codeDepartement: derived.deptCode,
    codeCnp: derived.codeCnp,
    missions: derived.missions, // Exactement 6 missions opérationnelles
    salaireMensuelDefaut: derived.mensuel,
    salaireHoraireDefaut: derived.horaire,
    heuresHebdo: '40 heures par semaine',
    qualifications: 'Diplôme ou expérience correspondante au poste',
    isCustom: true
  };

  // 1. Sauvegarde localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
    const customList: PosteCatalogItem[] = raw ? JSON.parse(raw) : [];
    if (!customList.some((p) => p.titre.toLowerCase() === cleanTitle.toLowerCase())) {
      customList.push(newItem);
      localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(customList));
    }
  } catch (err) {
    console.warn('Erreur sauvegarde custom poste:', err);
  }

  // 2. Sauvegarde asynchrone Firestore
  try {
    const safeDocId = cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    setDoc(
      doc(db, 'custom_postes', safeDocId),
      {
        ...newItem,
        created_at: new Date().toISOString()
      },
      { merge: true }
    ).catch(() => {});
  } catch {
    // Ignore error
  }

  return {
    poste: newItem,
    isNewlyCreated: true
  };
}
