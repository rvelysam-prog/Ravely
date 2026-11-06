import { OFFICIAL_DEPARTMENTS, findDepartmentDefinition } from './departmentsAndEmailService';

export interface PosteCatalogItem {
  titre: string;
  departement: string;
  codeDepartement: string;
  codeCnp: string; // Classification Nationale des Professions (5 chiffres au Canada)
  missions: string[];
  salaireMensuelDefaut: number; // CAD / mois
  salaireHoraireDefaut: number; // CAD / heure
  heuresHebdo: string;
  qualifications: string;
  isCustom?: boolean;
}

const LOCAL_STORAGE_CATALOG_KEY = 'atlantic_custom_postes_catalog_v1';

/**
 * Grille de détection CNP et salaires par défaut selon l'intitulé
 */
function deriveCnpAndSalaryForPoste(title: string): {
  deptCode: string;
  deptName: string;
  codeCnp: string;
  mensuel: number;
  horaire: number;
  missions: string[];
} {
  const norm = (title || '').toLowerCase();

  if (norm.includes('conducteur') || norm.includes('chauffeur') || norm.includes('routier')) {
    return {
      deptCode: 'EXP',
      deptName: 'DEPARTEMENT EXPLOITATION TRANSPORT',
      codeCnp: '73300',
      mensuel: 4800,
      horaire: 30.0,
      missions: [
        "Réaliser le transport et la livraison sécurisée des marchandises au Canada et aux États-Unis.",
        "Respecter scrupuleusement les règles de sécurité routière, les temps de repos et la réglementation TMD.",
        "Effectuer les vérifications avant départ (ronde de sécurité) du tracteur et de la semi-remorque.",
        "Gérer les documents de bord, manifestes de chargement et lettres de voiture (e-CMR).",
        "Signaler immédiatement toute anomalie opérationnelle ou retard à la régulation."
      ]
    };
  }

  if (norm.includes('douane') || norm.includes('déclarant') || norm.includes('transit')) {
    return {
      deptCode: 'TRD',
      deptName: 'DEPARTEMENT TRANSIT ET DOUANE',
      codeCnp: '12200',
      mensuel: 5200,
      horaire: 32.5,
      missions: [
        "Établir les déclarations douanières import/export auprès de l'ASFC/CBSA et des autorités frontalières.",
        "Déterminer la classification tarifaire des marchandises selon le Système Harmonisé (SH).",
        "Assurer la conformité documentaire des cargaisons internationales et vérifier les certificats d'origine.",
        "Assurer l'interface avec les transitaires maritimes, aériens et les transporteurs terrestres.",
        "Gérer le suivi des dossiers de dédouanement et le paiement des droits et taxes applicables."
      ]
    };
  }

  if (norm.includes('cariste') || norm.includes('magasinier') || norm.includes('manutention') || norm.includes('préparateur')) {
    return {
      deptCode: 'LOG',
      deptName: 'DEPARTEMENT LOGISTIQUE ET ENTREPOSAGE',
      codeCnp: '75101',
      mensuel: 4200,
      horaire: 26.25,
      missions: [
        "Assurer la réception, le déchargement et le contrôle quantitatif et qualitatif des marchandises.",
        "Conduire les chariots élévateurs et engins de manutention dans le respect strict des règles SST.",
        "Réaliser le stockage en palettier, le réapprovisionnement des zones de picking et le gerbage en hauteur.",
        "Préparer les commandes avec précision à l'aide de scanners radiofréquence (WMS).",
        "Participer aux inventaires périodiques et maintenir la propreté de l'entrepôt."
      ]
    };
  }

  if (norm.includes('santé') || norm.includes('infirmier') || norm.includes('ssmt') || norm.includes('sécurité au travail')) {
    return {
      deptCode: 'SSMT',
      deptName: 'DEPARTEMENT SANTE, SECURITE ET MIEUX-ETRE AU TRAVAIL (SSMT)',
      codeCnp: '31301',
      mensuel: 6800,
      horaire: 42.5,
      missions: [
        "Assurer le suivi médical et ergonomique des collaborateurs en milieu logistique et transport.",
        "Prodiguer les premiers soins d'urgence en cas d'accident ou de malaise sur site.",
        "Mener des audits de sécurité au travail et des analyses de postes préventives (Normes WorkSafeBC).",
        "Sensibiliser les équipes aux risques professionnels, manutentions manuelles et protocoles d'urgence.",
        "Coordonner le registre SST et les dossiers de retour progressif au travail."
      ]
    };
  }

  if (norm.includes('mécanicien') || norm.includes('technicien') || norm.includes('atelier') || norm.includes('parc')) {
    return {
      deptCode: 'MNT',
      deptName: 'DEPARTEMENT MAINTENANCE ET GESTION DU PARC AUTOMOBILE',
      codeCnp: '72401',
      mensuel: 5900,
      horaire: 36.85,
      missions: [
        "Diagnostiquer les pannes mécaniques, pneumatiques, hydrauliques et électroniques des véhicules lourds.",
        "Réaliser l'entretien préventif et les révisions périodiques de la flotte de camions et remorques.",
        "Remplacer les pièces d'usure, freins, suspensions et effectuer les réglages moteur.",
        "Renseigner les carnets d'entretien et les fiches de suivi GMAO de l'atelier.",
        "Veiller à la conformité aux inspections mécaniques provinciales obligatoires (CVSE/BC)."
      ]
    };
  }

  if (norm.includes('commercial') || norm.includes('pricing') || norm.includes('vente') || norm.includes('affrètement')) {
    return {
      deptCode: 'COM',
      deptName: 'DEPARTEMENT COMMERCIAL ET PRICING',
      codeCnp: '60010',
      mensuel: 5500,
      horaire: 34.35,
      missions: [
        "Développer le portefeuille clients en solutions de transport multimodal et de fret international.",
        "Calculer les cotations tarifaires et élaborer des propositions commerciales adaptées.",
        "Négocier les contrats de fret et fidéliser les chargeurs et importateurs.",
        "Collaborer avec la direction d'exploitation pour optimiser le taux de remplissage.",
        "Effectuer la veille concurrentielle sur les cours du fret nord-américain."
      ]
    };
  }

  if (norm.includes('exploitant') || norm.includes('dispatcher') || norm.includes('répartiteur')) {
    return {
      deptCode: 'EXP',
      deptName: 'DEPARTEMENT EXPLOITATION TRANSPORT',
      codeCnp: '72024',
      mensuel: 5100,
      horaire: 31.85,
      missions: [
        "Planifier et organiser les tournées de transport selon les impératifs des clients.",
        "Affecter les chauffeurs et les ensembles routiers en optimisant les kilomètres à vide.",
        "Suivre en temps réel la progression des convois par géolocalisation télématique.",
        "Gérer les aléas de circulation, retards et imprévus opérationnels avec réactivité.",
        "Assurer la conformité avec la réglementation sur les heures de service (ELD)."
      ]
    };
  }

  // Général / Cadre
  return {
    deptCode: 'ADM',
    deptName: 'DEPARTEMENT DIRECTION GENERALE ET STRATEGIE',
    codeCnp: '10019',
    mensuel: 4800,
    horaire: 30.0,
    missions: [
      "Piloter les activités et projets confiés dans le respect des objectifs fixés.",
      "Assurer la coordination inter-services et le reporting auprès de la direction.",
      "Garantir le respect des procédures qualité, des délais et du budget alloué.",
      "Superviser les livrables opérationnels et participer à la résolution des problèmes complexes.",
      "Contribuer activement à l'amélioration continue et à l'excellence opérationnelle."
    ]
  };
}

/**
 * Récupère le catalogue complet des postes (officiels + personnalisés sauvegardés)
 */
export function getAllPosteCatalogItems(): PosteCatalogItem[] {
  const catalogMap = new Map<string, PosteCatalogItem>();

  // 1. Ajouter les postes officiels prédéfinis
  for (const dept of OFFICIAL_DEPARTMENTS) {
    if (dept.postesDetail && Array.isArray(dept.postesDetail)) {
      for (const p of dept.postesDetail) {
        const derived = deriveCnpAndSalaryForPoste(p.titre);
        catalogMap.set(p.titre.toLowerCase(), {
          titre: p.titre,
          departement: dept.name,
          codeDepartement: dept.code,
          codeCnp: derived.codeCnp,
          missions: p.missions && p.missions.length > 0 ? p.missions : derived.missions,
          salaireMensuelDefaut: derived.mensuel,
          salaireHoraireDefaut: derived.horaire,
          heuresHebdo: '40 heures par semaine',
          qualifications: 'Expérience avérée dans la fonction'
        });
      }
    }
  }

  // 2. Fusionner les postes personnalisés créés dynamiquement
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
 * Fouille rapide dans la base de données du site :
 * Si le poste existe, renvoie ses infos complètes.
 * S'il n'existe pas, crée directement le poste dans la base, associe le département, missions, CNP et salaires !
 */
export function searchOrRegisterPoste(titleInput: string, deptHint?: string): PosteCatalogItem {
  const cleanTitle = (titleInput || '').trim();
  if (!cleanTitle) {
    return getAllPosteCatalogItems()[0];
  }

  const catalog = getAllPosteCatalogItems();
  const found = catalog.find(
    (item) => item.titre.toLowerCase() === cleanTitle.toLowerCase()
  );

  if (found) {
    return found;
  }

  // Le poste n'existe pas : Création dynamique immédiate dans la base de données
  const derived = deriveCnpAndSalaryForPoste(cleanTitle);
  const resolvedDept = deptHint || derived.deptName;
  const deptDef = findDepartmentDefinition(resolvedDept);

  const newItem: PosteCatalogItem = {
    titre: cleanTitle,
    departement: resolvedDept,
    codeDepartement: deptDef?.code || derived.deptCode,
    codeCnp: derived.codeCnp,
    missions: derived.missions,
    salaireMensuelDefaut: derived.mensuel,
    salaireHoraireDefaut: derived.horaire,
    heuresHebdo: '40 heures par semaine',
    qualifications: 'Diplôme ou expérience correspondante au poste',
    isCustom: true
  };

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
    const customList: PosteCatalogItem[] = raw ? JSON.parse(raw) : [];
    // Vérifier doublon
    if (!customList.some((p) => p.titre.toLowerCase() === cleanTitle.toLowerCase())) {
      customList.push(newItem);
      localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(customList));
    }
  } catch (err) {
    console.warn('Erreur sauvegarde custom poste:', err);
  }

  return newItem;
}
