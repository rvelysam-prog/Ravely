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
  salaireHoraireMin?: number;
  salaireHoraireMax?: number;
  salaireMensuelMin?: number;
  salaireMensuelMax?: number;
  fourchetteTexte?: string;
  periodeReference?: string;
  heuresHebdo: string;
  qualifications: string;
  isCustom?: boolean;
}

const LOCAL_STORAGE_CATALOG_KEY = 'atlantic_custom_postes_catalog_v1';

export interface DerivedPosteAnalysis {
  deptCode: string;
  deptName: string;
  codeCnp: string;
  mensuel: number;
  horaire: number;
  horaireMin: number;
  horaireMax: number;
  mensuelMin: number;
  mensuelMax: number;
  periodeReference: string;
  fourchetteTexte: string;
  missions: [string, string, string, string, string, string];
}

/**
 * Calcule l'intervalle salarial canadien dynamique et réaliste selon l'intitulé et la période 2026
 */
function computeSalaryInterval(
  baseHoraire: number,
  title: string
): {
  horaireMin: number;
  horaireMax: number;
  mensuelMin: number;
  mensuelMax: number;
  periodeReference: string;
  fourchetteTexte: string;
} {
  const norm = title.toLowerCase();
  const isCadre = norm.includes('directeur') || norm.includes('chef') || norm.includes('responsable') || norm.includes('manager');
  const isExpert = norm.includes('ingénieur') || norm.includes('avocat') || norm.includes('médecin') || norm.includes('analyste') || norm.includes('développeur');

  // Multiplicateurs de fourchette selon la séniorité et la spécialité
  const spreadRatio = isCadre ? 0.18 : isExpert ? 0.15 : 0.12;

  // Calcul des bornes horaires
  const rawMin = Math.max(17.40, Math.round((baseHoraire * (1 - spreadRatio)) * 100) / 100);
  const rawMax = Math.round((baseHoraire * (1 + spreadRatio)) * 100) / 100;

  // Calcul sur base 160h/mois (40h/semaine)
  const mensuelMin = Math.round(rawMin * 160);
  const mensuelMax = Math.round(rawMax * 160);

  // Période courante d'application (Canada 2026)
  const now = new Date();
  const currentMonth = now.toLocaleString('fr-CA', { month: 'long', year: 'numeric' });
  const periodeReference = `Barème officiel Canada (Période : ${currentMonth} / Année fiscale 2026)`;
  const fourchetteTexte = `${rawMin.toFixed(2)} $ à ${rawMax.toFixed(2)} $ CAD / h (${mensuelMin.toLocaleString('fr-CA')} $ à ${mensuelMax.toLocaleString('fr-CA')} $ CAD / mois)`;

  return {
    horaireMin: rawMin,
    horaireMax: rawMax,
    mensuelMin,
    mensuelMax,
    periodeReference,
    fourchetteTexte
  };
}

/**
 * EXPERT INTERNATIONAL EN ORGANISATION DES ENTREPRISES ET GRH
 * Déduit le département optimal parmi les 30 départements officiels,
 * le code CNP (TEER 2021/2026), l'intervalle salarial et 6 missions strictes.
 */
export function deriveCnpAndSalaryForPoste(title: string): DerivedPosteAnalysis {
  const rawTitle = (title || '').trim();
  const norm = rawTitle.toLowerCase();

  // 1. RECHERCHE PAR CORRESPONDANCE EXACTE DANS LE CATALOGUE DES 30 DÉPARTEMENTS
  for (const dept of OFFICIAL_30_DEPARTMENTS) {
    for (const p of dept.postes) {
      if (p.titre.toLowerCase() === norm) {
        const interval = computeSalaryInterval(p.salaireHoraire, p.titre);
        return {
          deptCode: dept.code,
          deptName: dept.name,
          codeCnp: p.codeCnp,
          mensuel: p.salaireMensuel,
          horaire: p.salaireHoraire,
          ...interval,
          missions: p.missions
        };
      }
    }
  }

  // 2. MAPPING SÉMANTIQUE SPÉCIFIQUE DES 30 DÉPARTEMENTS OFFICIELS
  // DÉPARTEMENT 01 – DIRECTION GÉNÉRALE ET ADMINISTRATION
  if (
    norm.includes('directeur général') ||
    norm.includes('directrice générale') ||
    norm.includes('dg') ||
    norm.includes('adg') ||
    norm.includes('directeur adjoint') ||
    norm.includes('direction générale') ||
    norm.includes('secrétaire général') ||
    norm.includes('secrétariat de direction') ||
    norm.includes('assistant de direction') ||
    norm.includes('assistante de direction') ||
    norm.includes('gouvernance') ||
    norm.includes('administrateur délégué')
  ) {
    const baseH = norm.includes('général') ? 62.5 : 34.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'DIRECTION_GENERALE_ADMINISTRATION',
      deptName: 'DÉPARTEMENT 01 – DIRECTION GÉNÉRALE ET ADMINISTRATION',
      codeCnp: norm.includes('général') ? '00014' : '12100',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Définir la vision, le cadre de gouvernance et les priorités de développement pour le poste de ${rawTitle}.`,
        "Superviser les interactions stratégiques et coordonner les relations avec les instances de décision.",
        "Veiller à la bonne exécution des orientations stratégiques et au respect des normes de direction.",
        "Représenter l'entreprise auprès des partenaires institutionnels, autorités canadiennes et clients clés.",
        "Valider les arbitrages opérationnels et budgétaires majeurs garantissant la viabilité du groupe.",
        "Évaluer les performances globales de l'organisation et produire les synthèses pour le conseil d'administration."
      ]
    };
  }

  // DÉPARTEMENT 02 – RESSOURCES HUMAINES ET RECRUTEMENT
  if (
    norm.includes('ressources humaines') ||
    norm.includes(' rh') ||
    norm.startsWith('rh') ||
    norm.includes('recrutement') ||
    norm.includes('recruteur') ||
    norm.includes('talent') ||
    norm.includes('gestionnaire de paie') ||
    norm.includes('gestionnaire du personnel') ||
    norm.includes('relations sociales') ||
    norm.includes('chargé de ressources humaines') ||
    norm.includes('chargée de ressources humaines')
  ) {
    const baseH = norm.includes('directeur') || norm.includes('responsable') ? 48.0 : 33.5;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'RESSOURCES_HUMAINES_RECRUTEMENT',
      deptName: 'DÉPARTEMENT 02 – RESSOURCES HUMAINES ET RECRUTEMENT',
      codeCnp: '11200',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Piloter les processus de gestion administrative, d'acquisition de talents et de GRH au titre de ${rawTitle}.`,
        "Organiser les campagnes de sourcing, de présélection et d'entretiens d'embauche pour les postes ouverts.",
        "Gérer les dossiers administratifs d'embauche, contrats de travail et conformité aux normes canadiennes d'emploi.",
        "Superviser la gestion des éléments variables de paie, des avantages sociaux et des congés légaux.",
        "Déployer les parcours d'intégration (onboarding) et accompagner le développement des collaborateurs.",
        "Participer au maintien d'un climat social sain et assurer le suivi des indicateurs RH de l'entreprise."
      ]
    };
  }

  // DÉPARTEMENT 03 – TRANSPORT ET EXPLOITATION
  if (
    norm.includes('conducteur') ||
    norm.includes('conductrice') ||
    norm.includes('chauffeur') ||
    norm.includes('chauffeuse') ||
    norm.includes('routier') ||
    norm.includes('routière') ||
    norm.includes('camion') ||
    norm.includes('semi-remorque') ||
    norm.includes('poids lourd') ||
    norm.includes('spl') ||
    norm.includes('classe 1') ||
    norm.includes('exploitant transport') ||
    norm.includes('dispatcher') ||
    norm.includes('répartiteur') ||
    norm.includes('tournée') ||
    norm.includes('traction')
  ) {
    const isDispatch = norm.includes('exploitant') || norm.includes('dispatch') || norm.includes('répartiteur');
    const baseH = isDispatch ? 33.5 : 30.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'TRANSPORT_EXPLOITATION',
      deptName: 'DÉPARTEMENT 03 – TRANSPORT ET EXPLOITATION',
      codeCnp: isDispatch ? '12102' : '73300',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Assurer l'exécution sécurisée et ponctuelle des missions de transport confiées au poste de ${rawTitle}.`,
        "Effectuer rigoureusement la ronde de sécurité et les inspections pré-départ du matériel roulant.",
        "Arrêter et arrimer les cargaisons conformément au Code canadien de sécurité et aux réglementations routières.",
        "Gérer les carnets de route électroniques (ELD) et respecter scrupuleusement les heures de service légales.",
        "Contrôler la régularité des documents de transport, lettres de voiture et déclarations de douane transfrontalière.",
        "Signaler immédiatement tout incident, aléa météo ou anomalie mécanique au centre de régulation opérationnelle."
      ]
    };
  }

  // DÉPARTEMENT 04 – LOGISTIQUE ET CHAÎNE D'APPROVISIONNEMENT
  if (
    norm.includes('cariste') ||
    norm.includes('magasinier') ||
    norm.includes('magasinière') ||
    norm.includes('préparateur') ||
    norm.includes('préparatrice') ||
    norm.includes('entrepôt') ||
    norm.includes('entreposage') ||
    norm.includes('quai') ||
    norm.includes('gerbeur') ||
    norm.includes('chariot élévateur') ||
    norm.includes('caces') ||
    norm.includes('logistique') ||
    norm.includes('supply chain')
  ) {
    const baseH = norm.includes('responsable') ? 40.0 : 26.5;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'LOGISTIQUE_CHAINE_APPROVISIONNEMENT',
      deptName: "DÉPARTEMENT 04 – LOGISTIQUE ET CHAÎNE D'APPROVISIONNEMENT",
      codeCnp: '75101',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Gérer les opérations de manutention physique, de stockage et d'ordonnancement associées à ${rawTitle}.`,
        "Réceptionner les marchandises, contrôler leur conformité quantitative et qualitative et signaler les réserves.",
        "Conduire les engins de levage et chariots élévateurs dans le respect absolu des règles de sécurité.",
        "Effectuer la préparation des commandes, le conditionnement, l'étiquetage et le palettisage des colis.",
        "Réaliser les inventaires réguliers et assurer la traçabilité des stocks via les progiciels WMS connectés.",
        "Maintenir la propreté, la fluidité des allées et la sécurité globale de la plateforme logistique."
      ]
    };
  }

  // DÉPARTEMENT 05 – DOUANE ET TRANSIT
  if (
    norm.includes('douane') ||
    norm.includes('transitaire') ||
    norm.includes('déclarant') ||
    norm.includes('transit') ||
    norm.includes('dédouanement') ||
    norm.includes('cbsa') ||
    norm.includes('asfc') ||
    norm.includes('e-manifest') ||
    norm.includes('courtier en douane')
  ) {
    const baseH = norm.includes('responsable') ? 44.0 : 34.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'DOUANE_TRANSIT',
      deptName: 'DÉPARTEMENT 05 – DOUANE ET TRANSIT',
      codeCnp: '12102',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Établir les déclarations douanières et assurer les formalités réglementaires d'import-export pour ${rawTitle}.`,
        "Vérifier la conformité des liasses documentaires (connaissements, factures commerciales, certificats d'origine).",
        "Calculer avec précision les droits de douane, taxes applicables (TPS/TVH) et tarifs douaniers harmonisés.",
        "Assurer la liaison technique quotidienne avec l'Agence des services frontaliers du Canada (ASFC/CBSA).",
        "Assister et conseiller les clients sur les régimes douaniers préférentiels et les normes transfrontalières.",
        "Archiver rigoureusement les manifestes et dossiers douaniers conformément aux prescriptions de l'ASFC."
      ]
    };
  }

  // DÉPARTEMENT 06 – COMMERCIAL, VENTES ET RELATION CLIENT
  if (
    norm.includes('commercial') ||
    norm.includes('commerciale') ||
    norm.includes('vente') ||
    norm.includes('vendeur') ||
    norm.includes('vendeuse') ||
    norm.includes('chargé d\'affaires') ||
    norm.includes('account manager') ||
    norm.includes('business development') ||
    norm.includes('prospection') ||
    norm.includes('pricing') ||
    norm.includes('tarification')
  ) {
    const baseH = norm.includes('directeur') || norm.includes('responsable') ? 45.0 : 32.5;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'COMMERCIAL_VENTES_RELATION_CLIENT',
      deptName: 'DÉPARTEMENT 06 – COMMERCIAL, VENTES ET RELATION CLIENT',
      codeCnp: '64101',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Développer le chiffre d'affaires, prospecter de nouveaux comptes et promouvoir les offres au titre de ${rawTitle}.`,
        "Identifier les besoins logistiques et de fret des prospects industriels, distributeurs et importateurs.",
        "Rédiger les propositions commerciales, devis de transport et négocier les conditions tarifaires et contractuelles.",
        "Entretenir une relation de confiance pérenne avec le portefeuille de clients actifs et veiller à leur fidélisation.",
        "Collaborer étroitement avec les équipes d'exploitation pour garantir le respect des engagements de service.",
        "Assurer une veille concurrentielle active sur le marché canadien et international du transport."
      ]
    };
  }

  // DÉPARTEMENT 07 – COMPTABILITÉ, FINANCE ET FISCALITÉ
  if (
    norm.includes('comptab') ||
    norm.includes('finance') ||
    norm.includes('financier') ||
    norm.includes('fiscal') ||
    norm.includes('trésor') ||
    norm.includes('contrôle de gestion') ||
    norm.includes('facturat') ||
    norm.includes('recouvrement')
  ) {
    const baseH = norm.includes('expert') || norm.includes('directeur') ? 50.0 : 35.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'COMPTABILITE_FINANCE_FISCALITE',
      deptName: 'DÉPARTEMENT 07 – COMPTABILITÉ, FINANCE ET FISCALITÉ',
      codeCnp: '11100',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Tenir la comptabilité générale, analytique et assurer le suivi financier rigoureux au titre de ${rawTitle}.`,
        "Enregistrer les opérations financières, rapprochements bancaires et écritures de clôture périodiques.",
        "Gérer la facturation clients, le suivi des règlements fournisseurs et les relances de recouvrement.",
        "Établir les déclarations fiscales réglementaires canadiennes et provinciales (TPS, TVH, impôts sur les sociétés).",
        "Participer à l'élaboration des budgets prévisionnels, tableaux de bord de gestion et analyses de rentabilité.",
        "Collaborer avec les auditeurs financiers et commissaires aux comptes lors des clôtures d'exercice."
      ]
    };
  }

  // DÉPARTEMENT 08 – INFORMATIQUE, SI ET TÉLÉCOMS
  if (
    norm.includes('informatique') ||
    norm.includes('développeur') ||
    norm.includes('programmeur') ||
    norm.includes('logiciel') ||
    norm.includes('webmaster') ||
    norm.includes('système') ||
    norm.includes('réseau') ||
    norm.includes('cloud') ||
    norm.includes('cybersécurité') ||
    norm.includes('data') ||
    norm.includes('it ') ||
    norm.startsWith('it') ||
    norm.includes('administrateur système')
  ) {
    const baseH = norm.includes('directeur') || norm.includes('architecte') ? 55.0 : 42.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'INFORMATIQUE_SI_TELECOMS',
      deptName: 'DÉPARTEMENT 08 – INFORMATIQUE, SYSTÈMES D’INFORMATION ET TÉLÉCOMS',
      codeCnp: '21232',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Concevoir, administrer et maintenir la performance des systèmes numériques pour la fonction de ${rawTitle}.`,
        "Développer, paramétrer et mettre à jour les applications métiers, interfaces API et progiciels (ERP/TMS/WMS).",
        "Assurer la sécurité des données d'entreprise, la gestion des sauvegardes et la protection contre les cybermenaces.",
        "Gérer l'infrastructure réseaux, serveurs clouds et télécommunications fixes et mobiles des sites.",
        "Assister et former les utilisateurs internes sur les outils numériques et résoudre les incidents techniques.",
        "Conduire une veille technologique sur les innovations numériques appliquées au transport et à la logistique."
      ]
    };
  }

  // DÉPARTEMENT 09 – JURIDIQUE, CONFORMITÉ ET AFFAIRES RÉGLEMENTAIRES
  if (
    norm.includes('juridique') ||
    norm.includes('juriste') ||
    norm.includes('avocat') ||
    norm.includes('avocate') ||
    norm.includes('droit') ||
    norm.includes('contentieux') ||
    norm.includes('conformité réglementaire') ||
    norm.includes('compliance')
  ) {
    const baseH = 48.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'JURIDIQUE_CONFORMITE_AFFAIRES_REGLEMENTAIRES',
      deptName: 'DÉPARTEMENT 09 – JURIDIQUE, CONFORMITÉ ET AFFAIRES RÉGLEMENTAIRES',
      codeCnp: '41101',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Garantir la sécurité juridique de l'ensemble des activités et engagements contractuels au titre de ${rawTitle}.`,
        "Rédiger, analyser et négocier les contrats commerciaux, partenariats transfrontaliers et accords de sous-traitance.",
        "Assurer la veille législative relative aux lois fédérales canadiennes, provinciales et au droit international du transport.",
        "Gérer les dossiers de précontentieux, contentieux et litiges en lien avec les conseils juridiques externes.",
        "Conseiller la direction générale sur les aspects réglementaires, la conformité anti-fraude et la protection des données.",
        "Sensibiliser les cadres opérationnels aux risques juridiques et veiller à l'éthique des pratiques commerciales."
      ]
    };
  }

  // DÉPARTEMENT 13 – SANTÉ, SÉCURITÉ ET ENVIRONNEMENT (SSE / SSMT)
  if (
    norm.includes('santé') ||
    norm.includes('méd') ||
    norm.includes('infirmier') ||
    norm.includes('infirmière') ||
    norm.includes('soignant') ||
    norm.includes('médecin') ||
    norm.includes('docteur') ||
    norm.includes('ergothérapeute') ||
    norm.includes('psychologue') ||
    norm.includes('kinésithérapeute') ||
    norm.includes('ssmt') ||
    norm.includes('mieux-être') ||
    norm.includes('secouriste')
  ) {
    const baseH = norm.includes('médecin') ? 65.0 : norm.includes('infirmier') ? 43.5 : 36.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'SANTE_SECURITE_ENVIRONNEMENT',
      deptName: 'DÉPARTEMENT 13 – SANTÉ, SÉCURITÉ ET ENVIRONNEMENT (SSE)',
      codeCnp: norm.includes('infirmier') ? '31301' : '31102',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Assurer la prise en charge médicale, les soins préventifs et la veille sanitaire au titre de ${rawTitle}.`,
        "Évaluer les facteurs de risques biomécaniques, ergonomiques et psychosociaux en milieu professionnel.",
        "Dispenser les premiers secours d'urgence et coordonner les évacuations sanitaires en liaison avec les hôpitaux.",
        "Tenir rigoureusement les registres de santé au travail dans le respect absolu de la confidentialité médicale.",
        "Concevoir et animer des programmes de sensibilisation à la prévention des troubles musculosquelettiques (TMS).",
        "Participer aux comités paritaires SST et élaborer les plans de réadaptation et de retour progressif au travail."
      ]
    };
  }

  // DÉPARTEMENT 14 – MAINTENANCE ET SERVICES TECHNIQUES
  if (
    norm.includes('mécani') ||
    norm.includes('électro') ||
    norm.includes('garagiste') ||
    norm.includes('atelier') ||
    norm.includes('pneumatique') ||
    norm.includes('soudeur') ||
    norm.includes('réparateur') ||
    norm.includes('technicien de maintenance')
  ) {
    const baseH = 36.5;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'MAINTENANCE_SERVICES_TECHNIQUES',
      deptName: 'DÉPARTEMENT 14 – MAINTENANCE ET SERVICES TECHNIQUES',
      codeCnp: '72401',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Réaliser les opérations de diagnostic, d'entretien préventif et de remise en état au titre de ${rawTitle}.`,
        "Localiser les pannes mécaniques, pneumatiques, électriques ou hydrauliques et réparer les composants défaillants.",
        "Effectuer les réglages, calages et essais de bon fonctionnement garantissant la sécurité routière maximale.",
        "Renseigner les bons d'intervention technique et mettre à jour le carnet de maintenance numérique des véhicules.",
        "Veiller à la conformité des outillages, aux règles de sécurité de l'atelier et au port rigoureux des EPI.",
        "Gérer le stock des pièces détachées d'usure courante et planifier les commandes de consommables."
      ]
    };
  }

  // DÉPARTEMENT 15 – IMMOBILIER, BÂTIMENTS ET INFRASTRUCTURES
  if (
    norm.includes('architect') ||
    norm.includes('bâtiment') ||
    norm.includes('génie civil') ||
    norm.includes('chantier') ||
    norm.includes('travaux') ||
    norm.includes('maçon') ||
    norm.includes('plombier') ||
    norm.includes('électricien') ||
    norm.includes('géomètre') ||
    norm.includes('urbanis')
  ) {
    const baseH = norm.includes('architect') || norm.includes('ingénieur') ? 48.0 : 34.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'IMMOBILIER_BATIMENTS_INFRASTRUCTURES',
      deptName: 'DÉPARTEMENT 15 – IMMOBILIER, BÂTIMENTS ET INFRASTRUCTURES',
      codeCnp: norm.includes('architect') ? '21200' : '72014',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Superviser la gestion patrimoniale, l'entretien des infrastructures et les chantiers confiés à ${rawTitle}.`,
        "Coordonner les travaux d'aménagement, de rénovation et d'extension des entrepôts et bâtiments administratifs.",
        "Veiller à la stricte conformité des bâtiments avec le Code national du bâtiment et les normes d'accessibilité.",
        "Piloter les contrats de maintenance des installations techniques (CVC, toitures, quais, portails industriels).",
        "Contrôler les devis des prestataires du BTP et inspecter la conformité des livrables lors des réceptions de chantier.",
        "Déployer des solutions d'efficacité énergétique et de réduction de l'empreinte carbone des bâtiments."
      ]
    };
  }

  // DÉPARTEMENT 16 – SÉCURITÉ, GARDIENNAGE ET SURVEILLANCE
  if (
    norm.includes('gardien') ||
    norm.includes('sécurité') ||
    norm.includes('surveillance') ||
    norm.includes('vigile') ||
    norm.includes('maître-chien') ||
    norm.includes('télésurveillance') ||
    norm.includes('poste de contrôle')
  ) {
    const baseH = norm.includes('responsable') ? 35.0 : 25.5;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'SECURITE_GARDIENNAGE_SURVEILLANCE',
      deptName: 'DÉPARTEMENT 16 – SÉCURITÉ, GARDIENNAGE ET SURVEILLANCE',
      codeCnp: '65410',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Assurer la protection physique des personnes, des biens et des enceintes logistiques au titre de ${rawTitle}.`,
        "Contrôler les accès piétons et véhicules, vérifier les accréditations et enregistrer les entrées/sorties.",
        "Effectuer des rondes régulières d'inspection des bâtiments, parkings poids lourds et clôtures d'enceinte.",
        "Surveiller les dispositifs de vidéosurveillance, alarmes intrusion et détection incendie.",
        "Intervenir avec sang-froid et professionnalisme lors de situations suspectes, déclenchements d'alarme ou incidents.",
        "Rédiger les mains courantes quotidiennes et signaler toute anomalie aux responsables de la sécurité."
      ]
    };
  }

  // DÉPARTEMENT 21 – FORMATION ET DÉVELOPPEMENT DES COMPÉTENCES
  if (
    norm.includes('enseign') ||
    norm.includes('professeur') ||
    norm.includes('formateur') ||
    norm.includes('instructeur') ||
    norm.includes('coach') ||
    norm.includes('pédagog') ||
    norm.includes('éducat') ||
    norm.includes('tuteur')
  ) {
    const baseH = 35.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'FORMATION_DEVELOPPEMENT_COMPETENCES',
      deptName: 'DÉPARTEMENT 21 – FORMATION ET DÉVELOPPEMENT DES COMPÉTENCES',
      codeCnp: '41220',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Concevoir les programmes pédagogiques et modules de formation professionnelle associés à ${rawTitle}.`,
        "Animer les sessions d'apprentissage théorique et pratique destinées aux collaborateurs opérationnels.",
        "Évaluer les acquis professionnels, les compétences techniques et délivrer les attestations de stage.",
        "Élaborer des supports pédagogiques modernes, guides de bonnes pratiques et modules d'e-learning.",
        "Suivre l'évolution des réglementations sectorielles et adapter les cursus aux exigences canadiennes.",
        "Mesurer l'efficacité pédagogique des formations et produire les bilans d'évaluation pour la direction."
      ]
    };
  }

  // DÉPARTEMENT 22 – ENVIRONNEMENT ET DÉVELOPPEMENT DURABLE (Agriculture, Écologie)
  if (
    norm.includes('agri') ||
    norm.includes('agronome') ||
    norm.includes('élevage') ||
    norm.includes('végétal') ||
    norm.includes('agroalimentaire') ||
    norm.includes('écologie') ||
    norm.includes('environnement') ||
    norm.includes('durable') ||
    norm.includes('déchets')
  ) {
    const baseH = norm.includes('ingénieur') || norm.includes('agronome') ? 44.0 : 32.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'ENVIRONNEMENT_DEVELOPPEMENT_DURABLE',
      deptName: 'DÉPARTEMENT 22 – ENVIRONNEMENT ET DÉVELOPPEMENT DURABLE',
      codeCnp: '21111',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Piloter les protocoles de conformité environnementale et agronomique liés aux activités de ${rawTitle}.`,
        "Contrôler la qualité des filières, des sols et le respect des critères de développement durable.",
        "Gérer la traçabilité des produits agroalimentaires et des matières premières biosourcées.",
        "Appliquer scrupuleusement les exigences sanitaires et phytosanitaires de l'Agence canadienne d'inspection des aliments (ACIA).",
        "Mettre en place des pratiques de valorisation des coproduits et de réduction de l'empreinte environnementale.",
        "Établir les rapports d'audit écologique et conseiller les directions sur les bonnes pratiques durables."
      ]
    };
  }

  // DÉPARTEMENT 26 – GESTION DE LA FLOTTE ET DU MATÉRIEL ROULANT
  if (
    norm.includes('flotte') ||
    norm.includes('parc automobile') ||
    norm.includes('matériel roulant') ||
    norm.includes('gestionnaire de flotte') ||
    norm.includes('télématique') ||
    norm.includes('véhicules moteurs')
  ) {
    const baseH = 38.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'GESTION_FLOTTE_MATERIEL_ROULANT',
      deptName: 'DÉPARTEMENT 26 – GESTION DE LA FLOTTE ET DU MATÉRIEL ROULANT',
      codeCnp: '12102',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Superviser le parc global de tracteurs, remorques et engins moteurs confiés au service de ${rawTitle}.`,
        "Planifier et coordonner les échéances de contrôles techniques réglementaires et de maintenance obligatoire.",
        "Analyser les données télématiques embarquées (consommation de carburant, éco-conduite, temps moteur).",
        "Optimiser le taux de disponibilité opérationnelle des véhicules et gérer le renouvellement des unités de transport.",
        "Superviser les dossiers d'immatriculation, vignettes d'exploitation et assurances pour l'ensemble du parc.",
        "Produire les indicateurs d'usure, de coûts de détention (TCO) et de rentabilité de la flotte automobile."
      ]
    };
  }

  // DÉPARTEMENT 29 – RESTAURATION, HÔTELLERIE ET SERVICES AUX ÉQUIPES
  if (
    norm.includes('cuisinier') ||
    norm.includes('cuisinière') ||
    norm.includes('chef de cuisine') ||
    norm.includes('restauration') ||
    norm.includes('hôtellerie') ||
    norm.includes('cantine') ||
    norm.includes('intendance') ||
    norm.includes('service en salle') ||
    norm.includes('repas')
  ) {
    const baseH = norm.includes('chef') ? 32.0 : 22.5;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'RESTAURATION_HOTELLERIE_SERVICES_EQUIPES',
      deptName: 'DÉPARTEMENT 29 – RESTAURATION, HÔTELLERIE ET SERVICES AUX ÉQUIPES',
      codeCnp: norm.includes('chef') ? '63200' : '65201',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Assurer la préparation et le service des prestations de restauration et d'hébergement au titre de ${rawTitle}.`,
        "Élaborer des menus équilibrés et savoureux adaptés aux besoins nutritionnels des équipes de transport.",
        "Appliquer avec une rigueur absolue les règles d'hygiène alimentaire et la méthode HACCP en cuisine.",
        "Gérer les approvisionnements en denrées fraîches, le contrôle des dates limites et la rotation des stocks.",
        "Veiller à la propreté irréprochable des espaces de restauration, équipements de cuisson et zones de repos.",
        "Contribuer activement au bien-être au travail des collaborateurs par un service chaleureux et professionnel."
      ]
    };
  }

  // DÉPARTEMENT 30 – GESTION DES SERVICES SPÉCIALISÉS ET ACTIVITÉS TECHNIQUES
  if (
    norm.includes('engin lourd') ||
    norm.includes('pelle') ||
    norm.includes('grutier') ||
    norm.includes('pelleteur') ||
    norm.includes('foreur') ||
    norm.includes('travaux spéciaux') ||
    norm.includes('forage') ||
    norm.includes('démolition')
  ) {
    const baseH = 36.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'SERVICES_SPECIALISES_ACTIVITES_TECHNIQUES',
      deptName: 'DÉPARTEMENT 30 – GESTION DES SERVICES SPÉCIALISÉS ET ACTIVITÉS TECHNIQUES',
      codeCnp: '73400',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Manœuvrer avec précision et sécurité les engins de chantier lourds et équipements spéciaux au titre de ${rawTitle}.`,
        "Réaliser les opérations de terrassement, chargement de déblais ou levage selon les plans d'exécution.",
        "Inspecter quotidiennement les organes de sécurité, niveaux hydrauliques et pneumatiques des engins.",
        "Adapter sa conduite aux contraintes du terrain, à la météorologie et aux règles de sécurité du chantier.",
        "Communiquer efficacement avec les équipes au sol et les signaleurs pour prévenir tout risque d'accident.",
        "Renseigner les rapports de travail et signaler sans délai tout dysfonctionnement mécanique de l'équipement."
      ]
    };
  }

  // 3. SCAN GÉNÉRIQUE DES 30 DÉPARTEMENTS PAR MOTS-CLÉS
  for (const dept of OFFICIAL_30_DEPARTMENTS) {
    const deptNorm = dept.name.toLowerCase();
    const deptKeywords = deptNorm.replace(/d[ée]partement\s+\d+\s+[–-]\s+/gi, '').split(/[\s,]+/);
    
    // Si un mot clé significatif du département (>= 5 lettres) apparaît dans le titre du poste
    for (const kw of deptKeywords) {
      if (kw.length >= 5 && norm.includes(kw)) {
        const baseH = 32.0;
        const interval = computeSalaryInterval(baseH, rawTitle);
        return {
          deptCode: dept.code,
          deptName: dept.name,
          codeCnp: '12100',
          mensuel: Math.round(baseH * 160),
          horaire: baseH,
          ...interval,
          missions: [
            `Assurer l'exécution rigoureuse des activités professionnelles confiées au titre de ${rawTitle}.`,
            "Coordonner ses actions avec les équipes opérationnelles pour garantir la performance des services.",
            "Respecter scrupuleusement les procédures de travail, chartes de qualité et réglementations canadiennes.",
            "Gérer la documentation professionnelle et renseigner les outils informatiques dédiés au métier.",
            "Détecter et signaler immédiatement tout dysfonctionnement afin de proposer les mesures d'amélioration.",
            "Contribuer à l'excellence opérationnelle et à la satisfaction globale des partenaires de l'entreprise."
          ]
        };
      }
    }
  }

  // 4. DÉDUCTION GÉNÉRIQUE STRUCTURÉE ADAPTÉE AU NIVEAU HIÉRARCHIQUE
  const isDirecteur = norm.includes('directeur') || norm.includes('directrice') || norm.includes('chief') || norm.includes('head');
  const isResponsable = norm.includes('responsable') || norm.includes('chef') || norm.includes('manager') || norm.includes('supervis');

  if (isDirecteur) {
    const baseH = 58.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'DIRECTION_GENERALE_ADMINISTRATION',
      deptName: 'DÉPARTEMENT 01 – DIRECTION GÉNÉRALE ET ADMINISTRATION',
      codeCnp: '00014',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Définir les orientations stratégiques, les objectifs prioritaires et la gouvernance au titre de ${rawTitle}.`,
        "Superviser les équipes de management, allouer les ressources opérationnelles et contrôler l'exécution des budgets.",
        "Représenter institutionnellement l'entreprise auprès des autorités gouvernementales, partenaires et clients majeurs.",
        "Prendre les décisions d'arbitrage majeures pour sécuriser la croissance, la rentabilité et la réputation du groupe.",
        "Valider les politiques de conformité réglementaire, de qualité et de maîtrise des risques sur l'ensemble des opérations.",
        "Présenter les rapports de performance trimestriels et annuels aux comités de direction et d'administration."
      ]
    };
  }

  if (isResponsable) {
    const baseH = 38.0;
    const interval = computeSalaryInterval(baseH, rawTitle);
    return {
      deptCode: 'GESTION_PROJETS',
      deptName: 'DÉPARTEMENT 17 – GESTION DES PROJETS',
      codeCnp: '12102',
      mensuel: Math.round(baseH * 160),
      horaire: baseH,
      ...interval,
      missions: [
        `Piloter le déploiement opérationnel des activités quotidiennes confiées au poste de ${rawTitle}.`,
        "Coordonner et animer les équipes opérationnelles, organiser les plannings et veiller à l'atteinte des jalons.",
        "Gérer les interactions transversales entre services et résoudre avec célérité les difficultés constatées.",
        "Contrôler la qualité des livrables et la stricte conformité des procédures avec les exigences d'Atlantic Transport.",
        "Suivre les indicateurs clés de performance (KPI) et proposer des plans d'amélioration continue des processus.",
        "Rédiger les bilans d'activité périodiques et rendre compte des résultats obtenus auprès de la direction."
      ]
    };
  }

  // Fiche générique opérationnelle par défaut
  const baseH = 28.5;
  const interval = computeSalaryInterval(baseH, rawTitle);
  return {
    deptCode: 'DIRECTION_GENERALE_ADMINISTRATION',
    deptName: 'DÉPARTEMENT 01 – DIRECTION GÉNÉRALE ET ADMINISTRATION',
    codeCnp: '12100',
    mensuel: Math.round(baseH * 160),
    horaire: baseH,
    ...interval,
    missions: [
      `Assurer l'exécution rigoureuse des missions techniques et opérationnelles assignées au titre de ${rawTitle}.`,
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
      const interval = computeSalaryInterval(p.salaireHoraire, p.titre);
      catalogMap.set(p.titre.toLowerCase(), {
        titre: p.titre,
        departement: dept.name,
        codeDepartement: dept.code,
        codeCnp: p.codeCnp,
        missions: [...p.missions],
        salaireMensuelDefaut: p.salaireMensuel,
        salaireHoraireDefaut: p.salaireHoraire,
        salaireHoraireMin: interval.horaireMin,
        salaireHoraireMax: interval.horaireMax,
        salaireMensuelMin: interval.mensuelMin,
        salaireMensuelMax: interval.mensuelMax,
        fourchetteTexte: interval.fourchetteTexte,
        periodeReference: interval.periodeReference,
        heuresHebdo: '40 heures par semaine',
        qualifications: 'Diplôme ou expérience correspondante au poste'
      });
    }
  }

  // 2. Ajouter les postes personnalisés sauvegardés en localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
    if (raw) {
      const parsed: PosteCatalogItem[] = JSON.parse(raw);
      for (const custom of parsed) {
        if (!catalogMap.has(custom.titre.toLowerCase())) {
          catalogMap.set(custom.titre.toLowerCase(), custom);
        }
      }
    }
  } catch (err) {
    console.warn('Erreur lecture localStorage custom postes:', err);
  }

  return Array.from(catalogMap.values());
}

/**
 * Recherche ou Enregistrement intelligent d'un poste :
 * Si le poste existe déjà sur le site, renvoie ses données.
 * S'il n'existe pas, analyse intelligemment le métier sans le forcer dans la logistique,
 * détermine le département exact parmi les 30 départements, le code CNP, l'intervalle salarial
 * dynamique pour 2026, et enregistre en base de données Firestore !
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

  // Nouveau poste détecté : Déduction experte selon les 30 départements
  const derived = deriveCnpAndSalaryForPoste(cleanTitle);

  // RÈGLE CRUCIALE : Ne JAMAIS laisser un deptHint générique de logistique écraser
  // le département intelligent dérivé !
  const isGenericLogistiqueHint =
    deptHint &&
    (deptHint.includes('LOGISTIQUE ET ENTREPOSAGE') ||
      deptHint.includes('EXPLOITATION TRANSPORT'));

  const resolvedDept =
    !deptHint || isGenericLogistiqueHint
      ? derived.deptName
      : deptHint;

  const resolvedCodeDept =
    !deptHint || isGenericLogistiqueHint
      ? derived.deptCode
      : derived.deptCode;

  const newItem: PosteCatalogItem = {
    titre: cleanTitle,
    departement: resolvedDept,
    codeDepartement: resolvedCodeDept,
    codeCnp: derived.codeCnp,
    missions: derived.missions, // Exactement 6 missions opérationnelles
    salaireMensuelDefaut: derived.mensuel,
    salaireHoraireDefaut: derived.horaire,
    salaireHoraireMin: derived.horaireMin,
    salaireHoraireMax: derived.horaireMax,
    salaireMensuelMin: derived.mensuelMin,
    salaireMensuelMax: derived.mensuelMax,
    fourchetteTexte: derived.fourchetteTexte,
    periodeReference: derived.periodeReference,
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
