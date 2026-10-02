import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db, isTransientUnavailableError } from '../firebase';

export interface PosteDefinition {
  titre: string;
  missions: [string, string, string, string, string, string];
}

export interface DepartmentDefinition {
  code: string;
  name: string;
  missions: [string, string, string, string, string, string];
  postesLies: string[];
  postesDetail: PosteDefinition[];
}

export const OFFICIAL_DEPARTMENTS: DepartmentDefinition[] = [
  {
    code: 'EXPLOITATION_TRANSPORT',
    name: 'DEPARTEMENT EXPLOITATION TRANSPORT',
    missions: [
      'Planification des tournées et affectation des chauffeurs',
      'Suivi des flottes en temps réel et géolocalisation',
      'Gestion des affrètements et des relations sous-traitants',
      'Optimisation des itinéraires et contrôle du respect des temps de conduite réglementaires',
      "Coordination des opérations de chargement et de livraison avec les quais d'expédition",
      'Contrôle des documents de transport et suivi quotidien de la ponctualité des livraisons'
    ],
    postesLies: [
      'Exploitant Transport',
      'Chauffeur Poids Lourd',
      'Conducteur Routier',
      'Dispatcher / Répartiteur',
      'Chef de Quai',
      'Responsable Exploitation Transport'
    ],
    postesDetail: [
      {
        titre: 'Exploitant Transport',
        missions: [
          'Planifier quotidiennement les tournées de transport et affecter les ensembles routiers aux chauffeurs.',
          'Assurer le suivi des flottes en temps réel par géolocalisation GPS et gérer les aléas de circulation.',
          'Organiser les opérations d’affrètement et négocier les prestations ponctuelles avec les sous-traitants.',
          'Contrôler le respect strict de la réglementation sociale européenne et canadienne (temps de conduite et repos).',
          'Vérifier la conformité des lettres de voiture, bons de livraison et documents de transport avant départ.',
          'Optimiser le taux de remplissage des véhicules et réduire les kilomètres parcourus à vide.'
        ]
      },
      {
        titre: 'Chauffeur Poids Lourd',
        missions: [
          'Assurer le transport sécurisé des marchandises sur les liaisons régionales et interprovinciales selon le planning.',
          'Effectuer les contrôles de sécurité avant départ (pneumatiques, freinage, éclairage, arrimage de la cargaison).',
          'Superviser les opérations de chargement et de déchargement à quai en respectant les consignes de sécurité.',
          'Faire signer les bons de livraison (BL / CMR) et signaler immédiatement toute réserve ou anomalie constatée.',
          'Respecter scrupuleusement le code de la route, les temps de conduite réglementaires et les principes d’éco-conduite.',
          'Maintenir la propreté de l’ensemble routier et remonter tout besoin de maintenance au chef d’atelier.'
        ]
      },
      {
        titre: 'Conducteur Routier',
        missions: [
          'Conduire les véhicules articulés et super-lourds pour les livraisons longue distance et régionales.',
          'Garantir la stabilité et le calage réglementaire des palettes et colis tout au long du trajet.',
          'Utiliser l’informatique embarquée pour transmettre en temps réel les statuts d’enlèvement et de livraison.',
          'Vérifier la concordance entre la marchandise chargée et les documents d’expédition remis au départ.',
          'Adopter une conduite préventive et économique afin de maîtriser la consommation de carburant.',
          'Représenter professionnellement Atlantic Transport Ltd. auprès des clients expéditeurs et destinataires.'
        ]
      },
      {
        titre: 'Dispatcher / Répartiteur',
        missions: [
          'Coordonner en direct les départs, les arrivées et les relèves des conducteurs sur les différents hubs.',
          'Attribuer les ordres de mission urgents et réorganiser les tournées en cas d’imprévu d’exploitation.',
          'Suivre en continu les écrans de télémétrie et de géolocalisation de la flotte en circulation.',
          'Assurer la liaison permanente entre les chauffeurs sur la route, les quais et le service client.',
          'Saisir et clôturer les dossiers de transport dans le logiciel TMS (Transport Management System).',
          'Établir le rapport quotidien d’activité d’exploitation et de ponctualité des livraisons.'
        ]
      },
      {
        titre: 'Chef de Quai',
        missions: [
          'Superviser et coordonner les équipes de manutentionnaires et caristes sur les quais de transit (cross-docking).',
          'Planifier l’affectation des portes de quai selon les horaires d’arrivée et de départ des camions.',
          'Contrôler la conformité quantitative et qualitative des chargements et déchargements.',
          'Faire appliquer strictement les règles de sécurité, de circulation interne et le port des EPI sur le quai.',
          'Gérer les litiges de quai (manquants, avaries) et éditer les réserves contradictoires avec les transporteurs.',
          'Optimiser les temps de rotation des véhicules à quai et garantir le départ à l’heure des tractions.'
        ]
      },
      {
        titre: 'Responsable Exploitation Transport',
        missions: [
          'Piloter l’ensemble de l’activité du service exploitation transport et encadrer les équipes d’exploitants et chauffeurs.',
          'Analyser les indicateurs de performance opérationnelle (coût au kilomètre, rentabilité par ligne, taux de service).',
          'Gérer les relations contractuelles avec les transporteurs partenaires et superviser la cellule d’affrètement.',
          'Garantir la conformité réglementaire de l’exploitation (sécurité routière, temps de service, licences de transport).',
          'Déployer des plans d’amélioration continue des schémas de transport et d’optimisation des tournées.',
          'Assurer le reporting opérationnel hebdomadaire et mensuel auprès de la Direction Générale.'
        ]
      }
    ]
  },
  {
    code: 'LOGISTIQUE_ENTREPOSAGE',
    name: 'DEPARTEMENT LOGISTIQUE ET ENTREPOSAGE',
    missions: [
      'Réception, contrôle et déchargement des marchandises',
      'Stockage, gestion des emplacements et inventaires',
      'Préparation des commandes (picking) et conditionnement',
      'Emballage des marchandises dans des cartons ou des emballages adaptés au transport',
      "Étiquetage des colis et organisation des commandes dans les zones prévues pour l'expédition",
      'Participation à la gestion des stocks en signalant les produits manquants et marchandises endommagées'
    ],
    postesLies: [
      'Préparatrice de Commande',
      'Préparateur de Commandes',
      'Cariste / Magasinier',
      'Agent Logistique',
      'Gestionnaire de Stock',
      'Responsable Entrepôt Logistique'
    ],
    postesDetail: [
      {
        titre: 'Préparatrice de Commande',
        missions: [
          'Préparer les commandes en rassemblant les articles demandés selon les bons de commande.',
          "Vérifier les produits en contrôlant les références, les quantités et l'état des marchandises.",
          'Emballer les marchandises dans des cartons ou des emballages adaptés au transport.',
          "Étiqueter les colis et apposer les étiquettes d'expédition nécessaires.",
          "Organiser les commandes préparées dans les zones prévues pour l'expédition et la livraison.",
          'Participer à la gestion des stocks en signalant les produits manquants, les erreurs de préparation et les marchandises endommagées.'
        ]
      },
      {
        titre: 'Préparateur de Commandes',
        missions: [
          'Préparer les commandes en rassemblant les articles demandés selon les bons de commande.',
          "Vérifier les produits en contrôlant les références, les quantités et l'état des marchandises.",
          'Emballer les marchandises dans des cartons ou des emballages adaptés au transport.',
          "Étiqueter les colis et apposer les étiquettes d'expédition nécessaires.",
          "Organiser les commandes préparées dans les zones prévues pour l'expédition et la livraison.",
          'Participer à la gestion des stocks en signalant les produits manquants, les erreurs de préparation et les marchandises endommagées.'
        ]
      },
      {
        titre: 'Cariste / Magasinier',
        missions: [
          'Assurer le déchargement et le chargement des camions à l’aide des chariots élévateurs dans le respect des consignes.',
          'Effectuer la mise en stock (rangement en racks à grande hauteur) et le réapprovisionnement des zones de picking.',
          'Scanner chaque mouvement de palette via le terminal radiofréquence (RF) pour garantir la traçabilité WMS.',
          'Contrôler l’état des palettes, le filmage et la stabilité des charges avant tout déplacement en entrepôt.',
          'Participer activement aux inventaires tournants et physiques ainsi qu’au rangement des allées de stockage.',
          'Réaliser les vérifications quotidiennes de premier niveau sur les engins de manutention (batterie, fourches, sécurité).'
        ]
      },
      {
        titre: 'Agent Logistique',
        missions: [
          'Réceptionner les marchandises livrées, vérifier les bons de livraison et contrôler l’intégrité des colis.',
          'Enregistrer les entrées et sorties de marchandises dans le système de gestion d’entrepôt (WMS).',
          'Réaliser les opérations de conditionnement, de palettisation, de filmage et d’étiquetage réglementaire.',
          'Préparer les lots d’expédition et les acheminer vers les travées de départ correspondantes.',
          'Isoler les produits non conformes ou endommagés en zone de quarantaine et renseigner les fiches d’anomalie.',
          'Maintenir son poste de travail propre, ordonné et conforme aux normes d’hygiène et de sécurité.'
        ]
      },
      {
        titre: 'Gestionnaire de Stock',
        missions: [
          'Piloter la fiabilité des stocks physiques et informatiques dans le système WMS sur l’ensemble de l’entrepôt.',
          'Organiser et superviser les inventaires tournants, cycliques et annuels avec analyse des écarts.',
          'Optimiser l’implantation des articles (slotting ABC) pour accélérer les flux de préparation de commandes.',
          'Suivre les taux de rotation des stocks, les dates de péremption (FIFO/FEFO) et prévenir les ruptures.',
          'Régulariser les anomalies d’adressage et coordonner le traitement des litiges stocks avec le service client.',
          'Produire les tableaux de bord hebdomadaires d’occupation des surfaces et de valorisation des stocks.'
        ]
      },
      {
        titre: 'Responsable Entrepôt Logistique',
        missions: [
          'Diriger l’ensemble des opérations de réception, de stockage, de préparation et d’expédition de l’entrepôt.',
          'Manager, planifier et accompagner les équipes logistiques (chefs d’équipe, caristes, préparateurs de commandes).',
          'Garantir l’atteinte des objectifs de productivité, de qualité de préparation et de respect des délais d’expédition.',
          'Veiller à l’application rigoureuse des normes d’hygiène, de sécurité au travail et de prévention des risques.',
          'Piloter le budget d’exploitation du site logistique et optimiser les coûts de manutention et de stockage.',
          'Animer les démarches d’amélioration continue (5S, Lean Logistics) et les revues de performance.'
        ]
      }
    ]
  },
  {
    code: 'TRANSIT_DOUANE',
    name: 'DEPARTEMENT TRANSIT ET DOUANE',
    missions: [
      'Formalités douanières import/export',
      'Gestion des documents de transport internationaux (CMR, LTA)',
      'Veille sur les réglementations fiscales et douanières',
      'Établissement des déclarations en douane et contrôle de la nomenclature tarifaire (SH / HS)',
      'Coordination opérationnelle avec les transitaires, compagnies maritimes et autorités frontalières',
      'Suivi des régimes douaniers suspensifs, des cautions et apurement des dossiers import/export'
    ],
    postesLies: [
      'Déclarant en Douane',
      'Agent de Transit International',
      'Coordinateur Import / Export',
      'Responsable Douane & Conformité',
      'Gestionnaire Documentaire Transit'
    ],
    postesDetail: [
      {
        titre: 'Déclarant en Douane',
        missions: [
          'Établir et transmettre les déclarations en douane import/export auprès des autorités douanières (ASFC / CBSA).',
          'Déterminer l’espèce tarifaire (code SH / HS), l’origine préférentielle et la valeur en douane des marchandises.',
          'Vérifier la conformité des factures commerciales, listes de colisage, certificats d’origine et licences.',
          'Liquider les droits de douane et taxes applicables et assurer le suivi des crédits d’enlèvement.',
          'Gérer les contrôles documentaires et physiques exigés par les services douaniers et phytosanitaires.',
          'Assurer une veille permanente sur les évolutions de la réglementation douanière et fiscale internationale.'
        ]
      },
      {
        titre: 'Agent de Transit International',
        missions: [
          'Organiser de bout en bout l’acheminement international des marchandises (routier, maritime, aérien).',
          'Émettre et contrôler les documents de transport internationaux (CMR, connaissement maritime B/L, LTA).',
          'Réserver les capacités de fret (booking) auprès des compagnies maritimes, aériennes et transporteurs.',
          'Suivre l’avancement des expéditions internationales et informer proactivement les clients des délais (ETA/ETD).',
          'Coordonner les opérations de dédouanement avec les déclarants et les correspondants étrangers.',
          'Vérifier la rentabilité des dossiers de transit et valider la pré-facturation des prestations.'
        ]
      },
      {
        titre: 'Coordinateur Import / Export',
        missions: [
          'Piloter les flux logistiques import et export en respectant les Incoterms négociés avec les clients.',
          'Constituer et vérifier les liasses documentaires complètes nécessaires au franchissement des frontières.',
          'Synchroniser les enlèvements fournisseurs, les passages à quai et les embarquements internationaux.',
          'Gérer les crédits documentaires (Lettre de crédit) et les assurances transport ad valorem.',
          'Résoudre les blocages en douane ou les retards portuaires en lien avec les autorités et transitaires.',
          'Analyser les délais de transit (lead time) et proposer des schémas d’optimisation multimodale.'
        ]
      },
      {
        titre: 'Responsable Douane & Conformité',
        missions: [
          'Superviser l’ensemble des opérations douanières du groupe et garantir la conformité réglementaire internationale.',
          'Gérer les agréments douaniers (statut OEA / PEP, régimes particuliers, entrepôts sous douane).',
          'Réaliser des audits internes réguliers sur les déclarations, les classements tarifaires et les origines.',
          'Représenter Atlantic Transport Ltd. lors des contrôles et contentieux avec l’administration des douanes.',
          'Conseiller la direction commerciale et les clients sur l’optimisation douanière et les accords de libre-échange.',
          'Former et accompagner les équipes opérationnelles sur les procédures de conformité export/import.'
        ]
      },
      {
        titre: 'Gestionnaire Documentaire Transit',
        missions: [
          'Collecter, vérifier et archiver l’ensemble des documents réglementaires liés aux dossiers de transit.',
          'Saisir les manifestes de cargaison et les déclarations sommaires d’entrée/sortie dans les systèmes dédiés.',
          'Contrôler la concordance entre les bons de commande, les factures commerciales et les titres de transport.',
          'Transmettre dans les délais impartis les documents originaux aux banques, clients et agents portuaires.',
          'Assurer le suivi de l’apurement des titres de transit (T1/T2, carnets TIR) et des dossiers temporaires.',
          'Tenir à jour les tableaux de bord de suivi documentaire et relancer les intervenants en cas de pièce manquante.'
        ]
      }
    ]
  },
  {
    code: 'MAINTENANCE_FLOTTE',
    name: 'DEPARTEMENT MAINTENANCE ET GESTION DE FLOTTE',
    missions: [
      'Entretien mécanique et révision des véhicules',
      'Gestion du parc de matériel de manutention (chariots, palettes)',
      'Suivi de la consommation de carburant et des cartes péages',
      'Planification des visites réglementaires, contrôles techniques et inspections préventives',
      "Diagnostic des pannes, gestion du stock de pièces détachées et dépannages d'exploitation",
      'Tenue du registre de maintenance et optimisation du taux de disponibilité de la flotte'
    ],
    postesLies: [
      'Mécanicien Poids Lourd',
      'Gestionnaire de Flotte',
      'Technicien de Maintenance Engins',
      "Chef d'Atelier Maintenance",
      'Responsable Parc Automobile'
    ],
    postesDetail: [
      {
        titre: 'Mécanicien Poids Lourd',
        missions: [
          'Effectuer l’entretien courant et les révisions périodiques des tracteurs routiers et semi-remorques.',
          'Réaliser les diagnostics électroniques et mécaniques (moteur, boîte, freinage pneumatique, suspension).',
          'Procéder aux réparations, au remplacement des pièces d’usure et aux réglages nécessaires en atelier.',
          'Préparer les véhicules aux visites d’inspection réglementaires et aux contrôles techniques périodiques.',
          'Assurer les interventions de dépannage rapide pour remettre en service les véhicules immobilisés.',
          'Renseigner précisément les fiches d’intervention dans le registre de maintenance et respecter les règles HSE.'
        ]
      },
      {
        titre: 'Gestionnaire de Flotte',
        missions: [
          'Gérer administrativement et techniquement l’ensemble du parc de poids lourds, remorques et véhicules légers.',
          'Planifier les échéances réglementaires (contrôles techniques, chronotachygraphes, limiteurs, assurances).',
          'Suivre et analyser la consommation de carburant, l’utilisation des badges péages et les coûts d’entretien.',
          'Coordonner l’affectation des véhicules avec le service exploitation pour maximiser le taux de disponibilité.',
          'Gérer les dossiers de sinistres, les contrats de location et les garanties constructeurs.',
          'Mettre à jour les tableaux de bord de suivi du coût de détention (TCO) de chaque véhicule de la flotte.'
        ]
      },
      {
        titre: 'Technicien de Maintenance Engins',
        missions: [
          'Assurer la maintenance préventive et curative du parc de chariots élévateurs, transpalettes et nacelles.',
          'Diagnostiquer et réparer les pannes hydrauliques, électriques et mécaniques sur les matériels de manutention.',
          'Contrôler l’état des batteries de traction, des chargeurs et des dispositifs de sécurité des engins.',
          'Accompagner les organismes agréés lors des Vérifications Générales Périodiques (VGP) réglementaires.',
          'Gérer le stock de pièces de rechange de première urgence pour les équipements d’entrepôt et de quai.',
          'Garantir la conformité et la disponibilité permanente des équipements de manutention.'
        ]
      },
      {
        titre: "Chef d'Atelier Maintenance",
        missions: [
          'Organiser, planifier et superviser le travail quotidien de l’équipe de mécaniciens et techniciens en atelier.',
          'Prioriser les ordres de réparation en concertation avec la direction de l’exploitation transport.',
          'Superviser l’approvisionnement et la gestion du magasin de pièces détachées, pneumatiques et lubrifiants.',
          'Contrôler la qualité et la conformité sécurité des réparations avant la remise en circulation des véhicules.',
          'Faire respecter les normes d’hygiène, de sécurité et de tri des déchets industriels dans l’atelier.',
          'Suivre les indicateurs de productivité de l’atelier et maîtriser les budgets de maintenance interne et externe.'
        ]
      },
      {
        titre: 'Responsable Parc Automobile',
        missions: [
          'Définir et piloter la politique d’acquisition, de renouvellement et de maintenance de l’ensemble de la flotte.',
          'Négocier les contrats-cadres avec les constructeurs, équipementiers, pneumaticiens et prestataires d’entretien.',
          'Optimiser la rentabilité énergétique de la flotte et accompagner la transition vers des véhicules propres.',
          'Superviser le respect de toutes les obligations légales et environnementales liées au parc roulant.',
          'Analyser les coûts kilométriques de maintenance et présenter les bilans techniques à la Direction.',
          'Mettre en place des programmes de sensibilisation des conducteurs à la prise en main et au soin du matériel.'
        ]
      }
    ]
  },
  {
    code: 'COMMERCIAL_DEVELOPPEMENT',
    name: 'DEPARTEMENT COMMERCIAL ET DEVELOPPEMENT',
    missions: [
      'Prospection de nouveaux clients et suivi des grands comptes',
      "Réponse aux appels d'offres transport et logistique",
      'Élaboration des stratégies tarifaires (Pricing)',
      'Négociation des contrats commerciaux et développement du chiffre d’affaires régional et international',
      'Analyse des besoins logistiques des clients et conception de solutions de transport sur mesure',
      'Suivi des indicateurs de performance commerciale (KPI) et fidélisation du portefeuille clients'
    ],
    postesLies: [
      'Attaché Commercial Transport',
      'Assistant Commercial',
      'Ingénieur Commercial Grands Comptes',
      "Chargé d'Affaires Logistique",
      'Analyste Pricing & Appels d’Offres',
      'Directeur Commercial'
    ],
    postesDetail: [
      {
        titre: 'Attaché Commercial Transport',
        missions: [
          'Prospecter activement de nouveaux clients industriels et distributeurs sur son secteur géographique.',
          'Identifier les besoins en transport routier, affrètement et logistique des prospects et clients.',
          'Élaborer et présenter des offres commerciales adaptées en collaboration avec le bureau d’études tarifaires.',
          'Négocier les conditions tarifaires et conclure les contrats de prestations de transport.',
          'Assurer le suivi régulier de son portefeuille clients pour développer et fidéliser le chiffre d’affaires.',
          'Renseigner quotidiennement le CRM commercial et participer aux réunions hebdomadaires de vente.'
        ]
      },
      {
        titre: 'Assistant Commercial',
        missions: [
          'Assurer l’accueil téléphonique commercial, qualifier les demandes entrantes et préparer les devis clients.',
          'Rédiger les propositions commerciales, les grilles tarifaires et les dossiers de présentation.',
          'Mettre à jour la base de données clients et suivre les relances des offres en attente de signature.',
          'Faire le lien entre l’équipe commerciale terrain, le service exploitation et le service facturation.',
          'Préparer les tableaux de bord de suivi des ventes, des marges et des statistiques commerciales.',
          'Coordonner le démarrage administratif et opérationnel des nouveaux comptes clients.'
        ]
      },
      {
        titre: 'Ingénieur Commercial Grands Comptes',
        missions: [
          'Développer et piloter un portefeuille de clients Grands Comptes nationaux et internationaux.',
          'Piloter les réponses aux appels d’offres complexes en transport multimodal et logistique contractuelle.',
          'Concevoir des solutions supply chain sur mesure en lien avec la direction des opérations.',
          'Négocier les contrats pluriannuels, les accords-cadres et les clauses d’indexation carburant.',
          'Animer les revues de performance trimestrielles (QBR) avec les directions logistiques et achats des clients.',
          'Garantir la croissance rentable et la pérennité des partenariats stratégiques de l’entreprise.'
        ]
      },
      {
        titre: "Chargé d'Affaires Logistique",
        missions: [
          'Commercialiser les prestations d’entreposage, de préparation de commandes et de distribution.',
          'Analyser les cahiers des charges logistiques des clients (volumes, saisonnalité, flux informatiques).',
          'Chiffrer les prestations de stockage et de manutention en coordination avec les responsables d’entrepôt.',
          'Accompagner la mise en place opérationnelle des nouveaux dossiers logistiques jusqu’à leur stabilisation.',
          'Identifier des opportunités de ventes croisées (cross-selling transport + entreposage) chez les clients.',
          'Veiller à la rentabilité financière de chaque affaire logistique en portefeuille.'
        ]
      },
      {
        titre: 'Analyste Pricing & Appels d’Offres',
        missions: [
          'Analyser les cahiers des charges et les matrices de flux des appels d’offres transport et logistique.',
          'Construire les modèles de coûts de revient et élaborer les grilles tarifaires compétitives (Pricing).',
          'Consulter les agences d’exploitation et les partenaires pour optimiser les cotations sur chaque ligne.',
          'Vérifier la cohérence des marges commerciales et des mécanismes de surcharge gasoil.',
          'Maintenir et faire évoluer les bases de données tarifaires et les outils de cotation de l’entreprise.',
          'Analyser les taux de transformation des appels d’offres et réaliser une veille concurrentielle des prix.'
        ]
      },
      {
        titre: 'Directeur Commercial',
        missions: [
          'Définir et déployer la stratégie commerciale globale d’Atlantic Transport Ltd. en lien avec la Direction Générale.',
          'Encadrer, animer et accompagner l’équipe d’ingénieurs commerciaux, attachés commerciaux et analystes pricing.',
          'Piloter les objectifs annuels de chiffre d’affaires, de marge brute et d’acquisition de nouveaux marchés.',
          'Intervenir directement dans les négociations stratégiques avec les clients majeurs du groupe.',
          'Valider la politique tarifaire, les offres grands comptes et les plans d’actions marketing et commerciaux.',
          'Assurer le reporting exécutif de la performance commerciale et anticiper les évolutions du marché.'
        ]
      }
    ]
  },
  {
    code: 'SERVICE_CLIENT_LITIGES',
    name: 'DEPARTEMENT SERVICE CLIENT ET LITIGES',
    missions: [
      'Information client et suivi des livraisons',
      'Gestion des réclamations et constatation des avaries',
      "Traitement des dossiers d'assurances marchandises",
      'Interface quotidienne entre les clients destinataires, les chauffeurs et le service exploitation',
      "Mise en place d'actions correctives immédiates en cas d'aléas ou de retards de livraison",
      'Suivi de la qualité de service (OTIF), reporting client et traitement des retours marchandises'
    ],
    postesLies: [
      'Chargé de Service Client',
      'Gestionnaire Litiges & Avaries',
      'Conseiller Relation Client Transport',
      'Agent de Suivi des Livraisons',
      'Responsable Service Client'
    ],
    postesDetail: [
      {
        titre: 'Chargé de Service Client',
        missions: [
          'Assurer le suivi quotidien des expéditions et renseigner les clients sur l’état d’avancement de leurs livraisons.',
          'Prendre en charge les demandes de rendez-vous de livraison, de relivraison ou de modification d’adresse.',
          'Servir d’interface réactive entre les clients, les conducteurs et le service exploitation.',
          'Alerter proactivement les clients en cas d’aléa de transport et proposer une solution immédiate.',
          'Fournir les preuves de livraison émargées (POD) et traiter les demandes d’information administrative.',
          'Contribuer à l’amélioration du taux de satisfaction client et au respect des engagements de service (SLA).'
        ]
      },
      {
        titre: 'Gestionnaire Litiges & Avaries',
        missions: [
          'Ouvrir, instruire et suivre les dossiers de litiges transport (avaries, manquants, pertes, retards).',
          'Vérifier la recevabilité juridique des réserves portées sur les bons de livraison et lettres de voiture.',
          'Rassembler les pièces justificatives (photos, réserves, factures d’origine, rapports d’expertise).',
          'Déclarer les sinistres marchandises auprès des compagnies d’assurances et suivre les indemnisations.',
          'Exercer les recours nécessaires auprès des sous-traitants ou intervenants responsables des dommages.',
          'Analyser les causes racines des litiges récurrents et proposer des actions préventives aux équipes.'
        ]
      },
      {
        titre: 'Conseiller Relation Client Transport',
        missions: [
          'Traiter les appels, courriels et requêtes des clients expéditeurs et destinataires avec réactivité.',
          'Enregistrer les ordres d’enlèvement ponctuels et vérifier la complétude des informations de livraison.',
          'Suivre la résolution des réclamations clients de premier niveau jusqu’à leur clôture complète.',
          'Organiser les retours de marchandises (reverse logistics) en coordination avec l’entrepôt et l’exploitation.',
          'Mettre à jour les fiches de consignes spécifiques à chaque client dans le système d’information.',
          'Réaliser des enquêtes régulières de suivi de la qualité perçue auprès des clients.'
        ]
      },
      {
        titre: 'Agent de Suivi des Livraisons',
        missions: [
          'Contrôler en temps réel le bon déroulement des tournées de livraison et le respect des créneaux horaires.',
          'Vérifier la remontée informatique des statuts de livraison (IOD / POD) depuis les terminaux des chauffeurs.',
          'Contacter immédiatement les destinataires en cas d’absence, d’adresse incomplète ou de refus de marchandise.',
          'Coordonner avec les quais et les exploitants la reprogrammation des colis en souffrance.',
          'Éditer et transmettre les rapports quotidiens de performance de livraison (OTIF) aux comptes dédiés.',
          'Archiver numériquement les bordereaux de livraison signés pour la facturation.'
        ]
      },
      {
        titre: 'Responsable Service Client',
        missions: [
          'Manager et animer l’équipe des chargés de clientèle, agents de suivi et gestionnaires de litiges.',
          'Piloter les indicateurs clés de qualité de service (taux de décroché, délai de réponse, taux de litiges, OTIF).',
          'Gérer directement les réclamations sensibles et accompagner les grands comptes lors des revues qualité.',
          'Superviser la gestion du budget sinistralité marchandises en lien avec les courtiers d’assurance.',
          'Optimiser les procédures de traitement des demandes clients et des dossiers d’avaries.',
          'Collaborer avec l’exploitation et l’entrepôt pour éradiquer les dysfonctionnements opérationnels.'
        ]
      }
    ]
  },
  {
    code: 'QHSE',
    name: 'DEPARTEMENT QUALITE, HYGIENE, SECURITE, ENVIRONNEMENT (QHSE)',
    missions: [
      'Audit des procédures de sécurité et prévention des accidents',
      'Gestion des protocoles de transport de matières dangereuses (ADR)',
      "Pilotage de la politique RSE et réduction de l'empreinte carbone",
      'Animation des sessions de sensibilisation sécurité et contrôle du port des équipements (EPI)',
      'Suivi des certifications qualité/environnement et mise à jour des registres réglementaires',
      "Analyse des incidents d'exploitation et déploiement des plans d'actions préventives"
    ],
    postesLies: [
      'Responsable QHSE',
      'Animateur Sécurité & Prévention',
      'Conseiller à la Sécurité ADR',
      'Auditeur Qualité & Environnement',
      'Coordinateur HSE Entrepôt'
    ],
    postesDetail: [
      {
        titre: 'Responsable QHSE',
        missions: [
          'Définir et piloter la politique Qualité, Hygiène, Sécurité et Environnement sur l’ensemble des sites.',
          'Garantir la conformité réglementaire des activités de transport et d’entreposage et piloter les certifications ISO.',
          'Superviser le Document Unique d’Évaluation des Risques Professionnels (DUERP) et les plans de prévention.',
          'Piloter la feuille de route RSE et les programmes de réduction des émissions de CO2 de la flotte.',
          'Analyser les accidents du travail et de circulation et déployer les plans d’actions correctives.',
          'Animer la culture sécurité auprès des managers, des conducteurs et des équipes logistiques.'
        ]
      },
      {
        titre: 'Animateur Sécurité & Prévention',
        missions: [
          'Animer les quarts d’heure sécurité, les accueils sécurité des nouveaux arrivants et les campagnes de prévention.',
          'Réaliser des visites sécurité régulières sur les quais, dans les entrepôts et au sein de l’atelier.',
          'Contrôler le port effectif des Équipements de Protection Individuelle (EPI) et le respect des plans de circulation.',
          'Mener les arbres des causes suite aux presqu’accidents, accidents de travail ou sinistres routiers.',
          'Vérifier la conformité des équipements d’urgence (extincteurs, issues de secours, trousses de premiers soins).',
          'Tenir à jour les indicateurs de sinistralité (taux de fréquence, taux de gravité) et les affichages obligatoires.'
        ]
      },
      {
        titre: 'Conseiller à la Sécurité ADR',
        missions: [
          'Veiller au respect des réglementations relatives au transport de marchandises dangereuses (ADR / TMD).',
          'Vérifier la conformité des équipements ADR à bord des véhicules, de la signalisation et des documents de bord.',
          'Contrôler la validité des habilitations ADR des conducteurs et des formations du personnel de quai.',
          'Auditer les procédures de chargement, d’emballage, d’étiquetage et de stockage des matières dangereuses.',
          'Rédiger le rapport annuel réglementaire de sécurité TMD/ADR ainsi que les rapports d’accidents éventuels.',
          'Conseiller les équipes commerciales et d’exploitation sur les conditions de prise en charge des produits classés.'
        ]
      },
      {
        titre: 'Auditeur Qualité & Environnement',
        missions: [
          'Planifier et réaliser les audits internes des processus opérationnels (transport, logistique, douane, SAV).',
          'Rédiger, mettre à jour et diffuser les procédures, modes opératoires et instructions de travail.',
          'Suivre le traitement des non-conformités internes et externes ainsi que l’avancement des plans d’actions (CAPA).',
          'Mesurer les indicateurs environnementaux (consommation énergétique, valorisation et tri des déchets d’entrepôt).',
          'Préparer et accompagner les audits de certification et les audits qualité réalisés par les clients.',
          'Accompagner les équipes dans la démarche d’amélioration continue de la qualité de service.'
        ]
      },
      {
        titre: 'Coordinateur HSE Entrepôt',
        missions: [
          'Assurer au quotidien la sécurité des opérations de manutention, de stockage en hauteur et de circulation à quai.',
          'Établir les plans de prévention et les permis de feu lors de l’intervention d’entreprises extérieures sur site.',
          'Vérifier le respect des consignes de sécurité liées aux installations classées et aux zones de charge batteries.',
          'Organiser les exercices d’évacuation incendie et coordonner les équipes de Sauveteurs Secouristes du Travail (SST).',
          'Contrôler l’ergonomie des postes de préparation de commandes pour prévenir les troubles musculo-squelettiques (TMS).',
          'Suivre la conformité des contrôles réglementaires périodiques du bâtiment et des équipements logistiques.'
        ]
      }
    ]
  },
  {
    code: 'IT',
    name: "DEPARTEMENT SYSTEMES D'INFORMATION (IT)",
    missions: [
      'Maintenance des logiciels métiers (TMS, WMS)',
      'Intégration des flux de données clients (EDI)',
      'Gestion du parc informatique et de la cybersécurité',
      'Support technique aux équipes d’exploitation et d’entrepôt (terminaux RF, informatique embarquée)',
      'Administration des réseaux, serveurs, sauvegardes et continuité d’activité informatique',
      'Déploiement des évolutions applicatives et conception des tableaux de bord décisionnels (BI)'
    ],
    postesLies: [
      'Chef de Projet TMS / WMS',
      'Ingénieur Flux EDI & Intégration',
      'Administrateur Systèmes & Réseaux',
      'Technicien Support Informatique',
      'Responsable Systèmes d’Information'
    ],
    postesDetail: [
      {
        titre: 'Chef de Projet TMS / WMS',
        missions: [
          'Piloter le déploiement, le paramétrage et la maintenance évolutive des logiciels métiers TMS et WMS.',
          'Recueillir et analyser les besoins fonctionnels des équipes d’exploitation transport et d’entrepôt.',
          'Rédiger les cahiers des charges, coordonner les éditeurs logiciels et superviser les phases de recette.',
          'Former les utilisateurs clés (key users) et accompagner le changement lors des mises en production.',
          'Assurer le support fonctionnel de niveau 2 et 3 sur les applicatifs logistiques et de transport.',
          'Concevoir des rapports automatisés et des tableaux de bord décisionnels (BI) pour les opérations.'
        ]
      },
      {
        titre: 'Ingénieur Flux EDI & Intégration',
        missions: [
          'Concevoir, développer et maintenir les interfaces d’échange de données informatisées (EDI / API) avec les clients.',
          'Paramétrer les mappings de messages normés (EDIFACT, ANSI X12, XML, JSON : ordres de transport, statuts, factures).',
          'Réaliser les tests d’intégration de bout en bout lors du démarrage informatique de nouveaux clients.',
          'Surveiller quotidiennement les flux d’échanges et corriger immédiatement les rejets ou erreurs de transmission.',
          'Rédiger la documentation technique des flux et assurer le lien avec les équipes IT des clients et partenaires.',
          'Garantir la sécurité, l’intégrité et la traçabilité des transferts de données inter-applicatifs.'
        ]
      },
      {
        titre: 'Administrateur Systèmes & Réseaux',
        missions: [
          'Administrer, sécuriser et superviser les serveurs, infrastructures cloud et réseaux (LAN, WAN, Wi-Fi d’entrepôt).',
          'Garantir la haute disponibilité de la couverture Wi-Fi industrielle sur les quais et allées de stockage.',
          'Gérer la politique de cybersécurité (pare-feu, antivirus, gestion des accès, mises à jour de sécurité).',
          'Superviser les sauvegardes quotidiennes et tester régulièrement le Plan de Reprise d’Activité (PRA).',
          'Administrer la messagerie d’entreprise, les annuaires utilisateurs et la téléphonie sur IP.',
          'Optimiser les performances de l’infrastructure informatique et assurer une veille technologique.'
        ]
      },
      {
        titre: 'Technicien Support Informatique',
        missions: [
          'Assurer le support technique de proximité et à distance (Helpdesk) auprès des utilisateurs du siège et de l’entrepôt.',
          'Préparer, installer et maintenir les postes de travail, imprimantes thermiques d’étiquettes et terminaux RF.',
          'Intervenir sur le matériel d’informatique embarquée et de géolocalisation installé dans les poids lourds.',
          'Diagnostiquer et résoudre les incidents matériels, logiciels et de connectivité réseau.',
          'Gérer l’inventaire du parc informatique, les licences logicielles et les consommables IT.',
          'Rédiger des guides pratiques utilisateurs et sensibiliser les équipes aux bonnes pratiques de sécurité informatique.'
        ]
      },
      {
        titre: 'Responsable Systèmes d’Information',
        missions: [
          'Définir et mettre en œuvre le schéma directeur informatique aligné sur la stratégie d’Atlantic Transport Ltd.',
          'Manager l’équipe IT (chefs de projet, ingénieurs EDI, administrateurs, techniciens support) et les prestataires.',
          'Garantir la continuité opérationnelle, la performance et la cybersécurité de l’ensemble du système d’information.',
          'Élaborer et piloter le budget informatique (investissements matériels, licences SaaS, projets d’évolution).',
          'Accompagner la digitalisation des opérations de transport, d’entreposage et du portail salarié/client.',
          'Veiller à la conformité réglementaire en matière de protection des données personnelles et de sécurité.'
        ]
      }
    ]
  },
  {
    code: 'RESSOURCES_HUMAINES',
    name: 'DEPARTEMENT RESSOURCES HUMAINES',
    missions: [
      'Recrutement des profils pénuriques (chauffeurs, caristes)',
      'Suivi des formations obligatoires et recyclages (FIMO, FCO, CACES)',
      'Gestion de la paie et des plannings de modulation du temps de travail',
      "Rédaction des contrats de travail, promesses d'embauche et parcours d'intégration des salariés",
      'Gestion administrative du personnel, suivi des visites médicales et dossiers sociaux',
      'Accompagnement des managers opérationnels, dialogue social et suivi des indicateurs RH'
    ],
    postesLies: [
      'Chargé de Recrutement Transport',
      'Gestionnaire de Paie & Temps de Travail',
      'Assistant Ressources Humaines',
      'Chargé de Formation Réglementaire',
      'Responsable Ressources Humaines'
    ],
    postesDetail: [
      {
        titre: 'Chargé de Recrutement Transport',
        missions: [
          'Recueillir les besoins en recrutement auprès des managers (chauffeurs, caristes, préparateurs, exploitants).',
          'Rédiger et diffuser les offres d’emploi et mener des actions de sourcing actif sur les profils pénuriques.',
          'Réaliser la présélection, les entretiens de recrutement et la vérification des permis, habilitations et références.',
          'Émettre les promesses d’embauche officielles et coordonner les démarches d’intégration (onboarding).',
          'Développer les partenariats avec les écoles de conduite, centres de formation et organismes de l’emploi.',
          'Suivre les indicateurs de recrutement (délais d’embauche, intégration en période d’essai) et le vivier de candidats.'
        ]
      },
      {
        titre: 'Gestionnaire de Paie & Temps de Travail',
        missions: [
          'Collecter et contrôler les éléments variables de paie (heures de conduite, heures supplémentaires, primes, frais de route).',
          'Intégrer et vérifier les données issues des chronotachygraphes et des badgeuses d’entrepôt.',
          'Établir les bulletins de salaire dans le respect de la législation sociale et de la convention collective du transport.',
          'Réaliser les déclarations sociales périodiques et gérer les relations avec les organismes sociaux.',
          'Gérer les dossiers d’absences, congés payés, arrêts maladie, accidents du travail et soldes de tout compte.',
          'Répondre aux questions des salariés concernant leur rémunération et le décompte de leur temps de travail.'
        ]
      },
      {
        titre: 'Assistant Ressources Humaines',
        missions: [
          'Assurer la gestion administrative complète des dossiers du personnel de l’embauche jusqu’à la sortie.',
          'Rédiger les promesses d’embauche, contrats de travail (CDI/CDD), avenants et attestations employeur.',
          'Planifier et suivre les visites médicales d’embauche et périodiques ainsi que la validité des permis de conduire.',
          'Préparer les dossiers d’intégration des nouveaux salariés (badges, accès portail RH, remise des EPI).',
          'Tenir à jour le registre unique du personnel et les bases de données RH.',
          'Assister l’équipe RH dans l’organisation des événements internes et la communication auprès des salariés.'
        ]
      },
      {
        titre: 'Chargé de Formation Réglementaire',
        missions: [
          'Élaborer et déployer le plan de développement des compétences de l’entreprise.',
          'Suivre rigoureusement les échéances des formations obligatoires et recyclages (FIMO, FCO, ADR, CACES, SST).',
          'Organiser les sessions de formation avec les organismes agréés et gérer les convocations des salariés.',
          'Assurer la gestion administrative et financière des dossiers de formation et l’optimisation des budgets.',
          'Évaluer l’efficacité des formations dispensées et mettre à jour la matrice de polyvalence et d’habilitations.',
          'Accompagner les parcours d’évolution professionnelle et de mobilité interne au sein du groupe.'
        ]
      },
      {
        titre: 'Responsable Ressources Humaines',
        missions: [
          'Définir et mettre en œuvre la politique Ressources Humaines en cohérence avec la stratégie de l’entreprise.',
          'Superviser le recrutement, l’administration du personnel, la paie, la formation et la gestion des carrières.',
          'Accompagner et conseiller au quotidien les responsables opérationnels sur le management et le droit social.',
          'Animer le dialogue social et veiller au maintien d’un climat de travail constructif et sécuritaire.',
          'Piloter la masse salariale, les effectifs et les tableaux de bord sociaux (absentéisme, turnover, formation).',
          'Garantir la conformité légale et conventionnelle de l’ensemble des pratiques RH d’Atlantic Transport Ltd.'
        ]
      }
    ]
  },
  {
    code: 'FINANCE_COMPTABILITE',
    name: 'DEPARTEMENT FINANCE ET COMPTABILITE',
    missions: [
      'Facturation des prestations de transport et de stockage',
      'Recouvrement des créances et relances clients',
      'Calcul des coûts de revient au kilomètre et contrôle de gestion',
      'Saisie, vérification et règlement des factures fournisseurs, sous-traitants et notes de frais',
      'Établissement des déclarations fiscales, rapprochements bancaires et clôtures comptables',
      'Suivi de la trésorerie quotidienne et élaboration des budgets prévisionnels d’exploitation'
    ],
    postesLies: [
      'Comptable Général',
      'Contrôleur de Gestion Transport',
      'Gestionnaire Facturation & Recouvrement',
      'Assistant Comptable',
      'Directeur Administratif et Financier'
    ],
    postesDetail: [
      {
        titre: 'Comptable Général',
        missions: [
          'Assurer la tenue complète de la comptabilité générale et analytique de l’entreprise.',
          'Réaliser les rapprochements bancaires quotidiens et le suivi des flux de trésorerie.',
          'Établir les déclarations fiscales périodiques (taxes sur les ventes, impôts et déclarations réglementaires).',
          'Superviser la justification des comptes, les écritures d’inventaire et les situations comptables mensuelles.',
          'Préparer le bilan annuel, le compte de résultat et la liasse fiscale en lien avec les commissaires aux comptes.',
          'Veiller au respect des normes comptables et des procédures de contrôle interne.'
        ]
      },
      {
        titre: 'Contrôleur de Gestion Transport',
        missions: [
          'Calculer et analyser les coûts de revient au kilomètre, par tournée, par véhicule et par client.',
          'Élaborer les budgets annuels et les reprévisions (forecast) en collaboration avec les directions opérationnelles.',
          'Produire les tableaux de bord hebdomadaires et mensuels de rentabilité du transport et de l’entreposage.',
          'Analyser les écarts entre le budget et le réalisé (carburant, sous-traitance, masse salariale, maintenance).',
          'Accompagner l’équipe commerciale et pricing dans l’évaluation financière des appels d’offres.',
          'Proposer des plans d’optimisation des coûts d’exploitation et d’amélioration des marges.'
        ]
      },
      {
        titre: 'Gestionnaire Facturation & Recouvrement',
        missions: [
          'Émettre et contrôler les factures clients de transport et de prestations logistiques selon les grilles tarifaires.',
          'Vérifier la présence des preuves de livraison (POD) et l’application correcte des indexations carburant.',
          'Suivre la balance âgée des comptes clients et effectuer les relances amiables et précontentieuses.',
          'Lettrer les règlements clients reçus et traiter rapidement les litiges de facturation pour débloquer les paiements.',
          'Surveiller l’encours crédit des clients et alerter la direction en cas de dépassement ou de risque d’impayé.',
          'Optimiser le délai moyen de paiement des clients (DSO) pour renforcer la trésorerie.'
        ]
      },
      {
        titre: 'Assistant Comptable',
        missions: [
          'Réceptionner, vérifier et saisir les factures fournisseurs (carburant, sous-traitants, maintenance, frais généraux).',
          'Rapprocher les factures d’affrètement et d’achats avec les bons de commande et ordres de transport.',
          'Préparer les campagnes de règlements fournisseurs et vérifier les notes de frais du personnel.',
          'Assurer le classement, la numérisation et l’archivage réglementaire des pièces comptables.',
          'Effectuer le pointage et le lettrage courant des comptes tiers (clients et fournisseurs).',
          'Assister les comptables lors des travaux de clôture mensuelle et annuelle.'
        ]
      },
      {
        titre: 'Directeur Administratif et Financier',
        missions: [
          'Piloter la stratégie financière, comptable, fiscale et budgétaire d’Atlantic Transport Ltd.',
          'Encadrer les équipes de comptabilité, de facturation/recouvrement et de contrôle de gestion.',
          'Garantir l’équilibre financier, la gestion optimale de la trésorerie et les relations avec les partenaires bancaires.',
          'Superviser le financement des investissements de flotte (crédit-bail, location financière, acquisitions).',
          'Présenter les états financiers, analyses de rentabilité et recommandations stratégiques à la Direction Générale.',
          'Assurer la maîtrise des risques financiers, le contrôle interne et la conformité légale des opérations.'
        ]
      }
    ]
  },
  {
    code: 'JURIDIQUE',
    name: 'DEPARTEMENT JURIDIQUE',
    missions: [
      'Rédaction des contrats de prestation logistique',
      "Gestion des contentieux commerciaux et litiges prud'homaux",
      'Suivi de la conformité au droit du transport',
      'Validation juridique des conditions générales de vente et des contrats de sous-traitance',
      'Conseil juridique aux directions opérationnelles en droit routier, maritime et douanier',
      'Gestion des contrats d’assurance responsabilité civile professionnelle et flotte de véhicules'
    ],
    postesLies: [
      'Juriste Droit des Transports & Logistique',
      'Juriste Droit Social',
      'Paralégal / Assistant Juridique',
      'Responsable Juridique & Conformité'
    ],
    postesDetail: [
      {
        titre: 'Juriste Droit des Transports & Logistique',
        missions: [
          'Rédiger, négocier et valider les contrats de prestations de transport, de commission de transport et d’entreposage.',
          'Sécuriser les contrats de sous-traitance routière et les Conditions Générales de Vente (CGV).',
          'Gérer les dossiers précontentieux et contentieux liés aux avaries majeures, pertes ou retards de livraison.',
          'Conseiller les équipes opérationnelles et commerciales sur les conventions internationales (CMR, maritime, aérien).',
          'Superviser les polices d’assurance responsabilité contractuelle, marchandises transportées et flotte.',
          'Assurer une veille juridique permanente en droit des transports et de la logistique.'
        ]
      },
      {
        titre: 'Juriste Droit Social',
        missions: [
          'Conseiller la Direction des Ressources Humaines sur l’application du droit du travail et des conventions du transport.',
          'Sécuriser la rédaction des contrats de travail, promesses d’embauche, avenants et clauses spécifiques.',
          'Accompagner la gestion des procédures disciplinaires et des ruptures contractuelles.',
          'Suivre et instruire les dossiers de contentieux prud’homaux en lien avec les avocats conseils.',
          'Veiller à la conformité juridique des accords relatifs à la durée du travail des personnels roulants et sédentaires.',
          'Rédiger des notes de synthèse sur les évolutions législatives et jurisprudentielles en droit social.'
        ]
      },
      {
        titre: 'Paralégal / Assistant Juridique',
        missions: [
          'Préparer et mettre en forme les projets de contrats, avenants, courriers recommandés et mises en demeure.',
          'Tenir à jour lacontrathèque numérique et suivre les échéances de renouvellement ou de résiliation des contrats.',
          'Assurer le suivi administratif des dossiers de sinistres assurances et des dossiers contentieux.',
          'Gérer les formalités juridiques de droit des sociétés (procès-verbaux, registres légaux, délégations de pouvoirs).',
          'Effectuer des recherches documentaires et réglementaires pour les juristes du département.',
          'Assurer l’interface administrative avec les cabinets d’avocats, huissiers, assureurs et greffes.'
        ]
      },
      {
        titre: 'Responsable Juridique & Conformité',
        missions: [
          'Diriger les activités juridiques du groupe et garantir la sécurité juridique de toutes les opérations.',
          'Valider les engagements contractuels majeurs, les appels d’offres grands comptes et les partenariats.',
          'Piloter la politique de conformité réglementaire (éthique des affaires, lutte anticorruption, protection des données).',
          'Superviser la stratégie de défense de l’entreprise dans les litiges commerciaux, routiers et sociaux.',
          'Négocier et piloter le programme global d’assurances de l’entreprise avec les courtiers.',
          'Conseiller la Direction Générale dans ses prises de décisions stratégiques et de développement.'
        ]
      }
    ]
  },
  {
    code: 'ACHATS_APPROVISIONNEMENTS',
    name: 'DEPARTEMENT ACHATS ET APPROVISIONNEMENTS',
    missions: [
      "Négociation des contrats de carburant et d'énergie",
      "Achat de matériels, de fournitures d'emballage et de pneumatiques",
      "Sélection des fournisseurs d'équipements de protection (EPI)",
      'Pilotage des appels d’offres fournisseurs et optimisation des coûts d’approvisionnement',
      'Gestion des stocks de consommables logistiques, palettes et équipements d’entrepôt',
      'Évaluation périodique de la performance des fournisseurs et suivi des délais de livraison'
    ],
    postesLies: [
      'Acheteur Transport & Flotte',
      'Gestionnaire des Approvisionnements',
      'Acheteur Consommables & EPI',
      'Responsable Achats & Services Généraux'
    ],
    postesDetail: [
      {
        titre: 'Acheteur Transport & Flotte',
        missions: [
          'Négocier les contrats d’approvisionnement en carburant, lubrifiants, pneumatiques et pièces détachées poids lourds.',
          'Lancer et piloter les appels d’offres auprès des équipementiers, loueurs de véhicules et prestataires de maintenance.',
          'Référencer et qualifier les transporteurs sous-traitants réguliers en lien avec l’exploitation.',
          'Suivre l’évolution des indices énergétiques et optimiser les conditions tarifaires et délais de paiement.',
          'Évaluer périodiquement la qualité de service et le respect des engagements des fournisseurs flotte.',
          'Générer des économies d’achats mesurables tout en garantissant la fiabilité technique du matériel.'
        ]
      },
      {
        titre: 'Gestionnaire des Approvisionnements',
        missions: [
          'Passer les commandes d’approvisionnement en consommables d’entrepôt (cartons, films étirables, palettes, étiquettes).',
          'Suivre les niveaux de stocks de fournitures logistiques pour éviter toute rupture sur les chaînes d’emballage.',
          'Contrôler les accusés de réception de commande, suivre les délais de livraison et relancer les fournisseurs.',
          'Vérifier la conformité des livraisons reçues et traiter les litiges d’approvisionnement avec les fournisseurs.',
          'Mettre à jour les paramètres de réapprovisionnement (stock minimum, stock de sécurité) dans le système.',
          'Valider le rapprochement entre les bons de commande, les bons de réception et les factures fournisseurs.'
        ]
      },
      {
        titre: 'Acheteur Consommables & EPI',
        missions: [
          'Sélectionner et négocier les contrats fournisseurs pour les Équipements de Protection Individuelle (EPI) et tenues.',
          'Acheter les emballages logistiques, matériels de calage, consommables informatiques et fournitures de quai.',
          'Veiller au respect des normes de sécurité et des critères environnementaux (achats responsables) des produits.',
          'Rationaliser le panel de fournisseurs et standardiser les références de consommables sur les sites.',
          'Négocier les grilles tarifaires sur volume et suivre les budgets de dépenses de consommables.',
          'Travailler en étroite collaboration avec le département QHSE et le responsable d’entrepôt sur les besoins terrain.'
        ]
      },
      {
        titre: 'Responsable Achats & Services Généraux',
        missions: [
          'Définir et piloter la stratégie globale des achats directs et indirects d’Atlantic Transport Ltd.',
          'Superviser les négociations majeures (énergie, flotte, équipements d’entrepôt, prestations de services généraux).',
          'Gérer les contrats de maintenance des bâtiments, de gardiennage, de nettoyage et d’énergie des sites.',
          'Encadrer l’équipe d’acheteurs et d’approvisionneurs et garantir le respect des procédures d’engagement des dépenses.',
          'Piloter les indicateurs de performance achats (économies réalisées, taux de service fournisseurs, conformité RSE).',
          'Accompagner les directions opérationnelles dans la maîtrise durable des coûts externes.'
        ]
      }
    ]
  }
];

function normalizeDeptKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

export function formatMissionsWithBullets(missions: string[]): string {
  return missions
    .map((m) => m.replace(/^[\s•\-*]+/, '').trim())
    .filter((m) => m.length > 0)
    .map((m) => `• ${m}`)
    .join('\n');
}

export function parseMissionsFromText(text: string): string[] {
  return (text || '')
    .split('\n')
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter((line) => line.length > 0);
}

export function findDepartmentDefinition(deptName?: string): DepartmentDefinition | undefined {
  if (!deptName) return undefined;
  const key = normalizeDeptKey(deptName);
  return OFFICIAL_DEPARTMENTS.find((d) => {
    const dKey = normalizeDeptKey(d.name);
    return (
      dKey === key ||
      dKey.includes(key) ||
      key.includes(dKey.replace(/^DEPARTEMENT\s+/, ''))
    );
  });
}

export function findPosteDefinition(
  posteName?: string,
  deptName?: string
): { poste: PosteDefinition; department: DepartmentDefinition } | undefined {
  if (!posteName || !posteName.trim()) return undefined;
  const pKey = normalizeDeptKey(posteName);
  if (!pKey) return undefined;

  const preferredDept = findDepartmentDefinition(deptName);
  const orderedDepts = preferredDept
    ? [preferredDept, ...OFFICIAL_DEPARTMENTS.filter((d) => d.code !== preferredDept.code)]
    : OFFICIAL_DEPARTMENTS;

  // 1. Exact match on poste title
  for (const dept of orderedDepts) {
    for (const p of dept.postesDetail) {
      if (normalizeDeptKey(p.titre) === pKey) {
        return { poste: p, department: dept };
      }
    }
  }

  // 2. Partial match on poste title
  for (const dept of orderedDepts) {
    for (const p of dept.postesDetail) {
      const candKey = normalizeDeptKey(p.titre);
      if (candKey.includes(pKey) || pKey.includes(candKey)) {
        return { poste: p, department: dept };
      }
    }
  }

  return undefined;
}

export function getMissionsForPosteOrDepartment(
  posteName?: string,
  deptName?: string
): [string, string, string, string, string, string] {
  const matchedPoste = findPosteDefinition(posteName, deptName);
  if (matchedPoste) {
    return matchedPoste.poste.missions;
  }
  const matchedDept = findDepartmentDefinition(deptName) || findDepartmentByPoste(posteName);
  if (matchedDept) {
    return matchedDept.missions;
  }
  return OFFICIAL_DEPARTMENTS[1].postesDetail[0].missions;
}

export function findDepartmentByPoste(posteName?: string): DepartmentDefinition | undefined {
  if (!posteName || !posteName.trim()) return undefined;
  const matchedPoste = findPosteDefinition(posteName);
  if (matchedPoste) {
    return matchedPoste.department;
  }

  const key = normalizeDeptKey(posteName);
  if (!key) return undefined;

  for (const dept of OFFICIAL_DEPARTMENTS) {
    for (const linkedPoste of dept.postesLies) {
      const pKey = normalizeDeptKey(linkedPoste);
      if (pKey === key || pKey.includes(key) || key.includes(pKey)) {
        return dept;
      }
    }
  }

  const keywordMap: Array<{ keywords: string[]; code: string }> = [
    {
      keywords: ['CHAUFFEUR', 'CONDUCTEUR', 'EXPLOITANT', 'DISPATCH', 'REPARTITEUR', 'QUAI', 'ROUTIER'],
      code: 'EXPLOITATION_TRANSPORT'
    },
    {
      keywords: ['PREPARAT', 'COMMANDE', 'CARISTE', 'MAGASINIER', 'ENTREPOT', 'STOCK', 'PICKING', 'MANUTENTION'],
      code: 'LOGISTIQUE_ENTREPOSAGE'
    },
    {
      keywords: ['DOUANE', 'TRANSIT', 'DECLARANT', 'IMPORT', 'EXPORT'],
      code: 'TRANSIT_DOUANE'
    },
    {
      keywords: ['MECANICIEN', 'FLOTTE', 'MAINTENANCE', 'ATELIER', 'GARAGE', 'PARC'],
      code: 'MAINTENANCE_FLOTTE'
    },
    {
      keywords: ['COMMERCIAL', 'PRICING', 'VENTE', 'COMPTE', 'AFFAIRE'],
      code: 'COMMERCIAL_DEVELOPPEMENT'
    },
    {
      keywords: ['LITIGE', 'CLIENT', 'AVARIE', 'SAV', 'RECLAMATION'],
      code: 'SERVICE_CLIENT_LITIGES'
    },
    {
      keywords: ['QHSE', 'SECURITE', 'QUALITE', 'HSE', 'ADR', 'RSE', 'ENVIRONNEMENT'],
      code: 'QHSE'
    },
    {
      keywords: ['INFORMATIQUE', 'SYSTEME', 'RESEAU', 'TMS', 'WMS', 'EDI', 'DEVELOPPEUR', 'SUPPORT IT'],
      code: 'IT'
    },
    {
      keywords: ['RECRUTEMENT', 'PAIE', 'RESSOURCES HUMAINES', 'FORMATION', 'RH'],
      code: 'RESSOURCES_HUMAINES'
    },
    {
      keywords: ['COMPTAB', 'FINANC', 'FACTURATION', 'RECOUVREMENT', 'GESTION', 'TRESORERIE'],
      code: 'FINANCE_COMPTABILITE'
    },
    {
      keywords: ['JURISTE', 'JURIDIQUE', 'CONTENTIEUX', 'PARALEGAL', 'CONFORMITE'],
      code: 'JURIDIQUE'
    },
    {
      keywords: ['ACHAT', 'APPROVISIONNEMENT', 'ACHETEUR', 'FOURNISSEUR'],
      code: 'ACHATS_APPROVISIONNEMENTS'
    }
  ];

  for (const entry of keywordMap) {
    if (entry.keywords.some((kw) => key.includes(kw))) {
      return OFFICIAL_DEPARTMENTS.find((d) => d.code === entry.code);
    }
  }

  return undefined;
}

export function getDeduplicatedDepartmentsList(existingDepts: string[] = []): DepartmentDefinition[] {
  const result: DepartmentDefinition[] = [...OFFICIAL_DEPARTMENTS];
  const seenKeys = new Set<string>(OFFICIAL_DEPARTMENTS.map((d) => normalizeDeptKey(d.name)));

  const aliasPhrases = [
    'OPERATIONS LOGISTIQUES',
    'LOGISTIQUE ENTREPOT',
    'LOGISTIQUE ET ENTREPOT',
    'DOUANES TRANSIT INTERNATIONAL',
    'FRET MARITIME INTERMODAL'
  ];
  aliasPhrases.forEach((a) => seenKeys.add(a));

  for (const raw of existingDepts) {
    if (!raw || !raw.trim()) continue;
    const norm = normalizeDeptKey(raw);
    if (!norm || seenKeys.has(norm)) continue;
    const alreadyMatched = OFFICIAL_DEPARTMENTS.some((d) => {
      const dNorm = normalizeDeptKey(d.name);
      return (
        dNorm === norm ||
        dNorm.includes(norm) ||
        norm.includes(dNorm.replace(/^DEPARTEMENT\s+/, ''))
      );
    });
    if (!alreadyMatched) {
      seenKeys.add(norm);
      const customMissions: [string, string, string, string, string, string] = [
        `Exécution et supervision des opérations rattachées au ${raw.trim()}`,
        'Suivi quotidien des indicateurs de performance et respect des procédures internes',
        'Coordination opérationnelle avec les équipes Atlantic Transport Ltd.',
        'Contrôle de la conformité documentaire et de la traçabilité des flux',
        'Gestion des priorités opérationnelles et remontée des anomalies au manager',
        'Application stricte des consignes de qualité, d’hygiène et de sécurité au travail'
      ];
      result.push({
        code: `CUSTOM_${norm.replace(/\s+/g, '_')}`,
        name: raw.trim(),
        missions: customMissions,
        postesLies: [`Agent ${raw.trim()}`, `Responsable ${raw.trim()}`],
        postesDetail: [
          {
            titre: `Agent ${raw.trim()}`,
            missions: customMissions
          },
          {
            titre: `Responsable ${raw.trim()}`,
            missions: customMissions
          }
        ]
      });
    }
  }

  return result;
}

// ============================================================================
// RICH TEXT EMPLOYEE SIGNATURE BLOCK ("Partie Signature Salarié") HELPERS
// ============================================================================
const LS_SIGNATURE_SALARIE_HTML_KEY = 'atlantic_promesse_signature_salarie_html_v1';

export const DEFAULT_SIGNATURE_SALARIE_RICH_HTML =
  `<div><strong>Pour l'employer</strong></div>` +
  `<div style="font-size: 16px; margin-top: 6px;">{{NOM_SALARIE}}</div>` +
  `<div style="margin-top: 28px;"><strong>Signature : .........................</strong></div>`;

export function getSavedSignatureSalarieHtml(): string {
  try {
    const raw = localStorage.getItem(LS_SIGNATURE_SALARIE_HTML_KEY);
    if (!raw || !raw.trim()) return DEFAULT_SIGNATURE_SALARIE_RICH_HTML;
    return raw;
  } catch {
    return DEFAULT_SIGNATURE_SALARIE_RICH_HTML;
  }
}

export function setSavedSignatureSalarieHtml(html: string): string {
  const clean = html && html.trim() ? html : DEFAULT_SIGNATURE_SALARIE_RICH_HTML;
  try {
    localStorage.setItem(LS_SIGNATURE_SALARIE_HTML_KEY, clean);
  } catch {
    // Ignore localStorage quota error
  }
  return clean;
}

export function resolveSignatureSalarieHtmlVariables(
  html: string,
  vars: {
    nom_complet?: string;
    poste?: string;
    date_etablissement?: string;
    date_embauche?: string;
    ni?: string;
    matricule?: string;
  }
): string {
  const source = html && html.trim() ? html : DEFAULT_SIGNATURE_SALARIE_RICH_HTML;
  const nomUpper = (vars.nom_complet || 'SALIMATA TRAORER').trim().toUpperCase();
  return source
    .replace(/\{\{\s*NOM_SALARIE\s*\}\}/gi, nomUpper)
    .replace(/\{\{\s*NOM_COMPLET\s*\}\}/gi, nomUpper)
    .replace(/\{\{\s*POSTE\s*\}\}/gi, (vars.poste || 'Préparatrice de Commande').trim())
    .replace(/\{\{\s*DATE_ETABLISSEMENT\s*\}\}/gi, (vars.date_etablissement || '').trim())
    .replace(/\{\{\s*DATE_EMBAUCHE\s*\}\}/gi, (vars.date_embauche || '').trim())
    .replace(/\{\{\s*NI\s*\}\}/gi, (vars.ni || 'BC1129970').trim())
    .replace(/\{\{\s*MATRICULE\s*\}\}/gi, (vars.matricule || '').trim());
}

// ============================================================================
// CUSTOM UPLOADED PDF ASSETS (Logo, Signature, Cachet, Filigrane) STORAGE
// ============================================================================
const LS_CUSTOM_LOGO_KEY = 'atlantic_custom_pdf_logo_v1';
const LS_CUSTOM_SIGNATURE_KEY = 'atlantic_custom_pdf_signature_v1';
const LS_CUSTOM_CACHET_KEY = 'atlantic_custom_pdf_cachet_v1';
const LS_CUSTOM_FILIGRANE_KEY = 'atlantic_custom_pdf_filigrane_v1';
const LS_PDF_ASSETS_CONFIG_KEY = 'atlantic_pdf_imported_assets_config_v1';
const LS_LOCAL_MAIL_LOGS_KEY = 'atlantic_local_mail_logs_cache_v1';

export type AssetUnit = 'px' | '%';
export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ImportedAssetKey = 'logo' | 'signature' | 'cachet' | 'filigrane';

export interface PdfAssetItemSettings {
  widthValue: number;
  widthUnit: AssetUnit;
  heightValue: number;
  heightUnit: AssetUnit;
  opacity: number;
  tintEnabled: boolean;
  tintColor: string;
  offsetX: number;
  offsetY: number;
  alignX: HorizontalAlign;
  alignY: VerticalAlign;
  rotation: number;
  zIndex: number;
}

export interface PdfImportedAssetsConfig {
  logo: PdfAssetItemSettings;
  signature: PdfAssetItemSettings;
  cachet: PdfAssetItemSettings;
  filigrane: PdfAssetItemSettings;
  updated_at?: string;
}

export const DEFAULT_PDF_ASSETS_CONFIG: PdfImportedAssetsConfig = {
  logo: {
    widthValue: 180,
    widthUnit: 'px',
    heightValue: 60,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#0C2366',
    offsetX: 0,
    offsetY: 0,
    alignX: 'left',
    alignY: 'top',
    rotation: 0,
    zIndex: 10
  },
  signature: {
    widthValue: 130,
    widthUnit: 'px',
    heightValue: 68,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#0C2366',
    offsetX: 0,
    offsetY: 0,
    alignX: 'center',
    alignY: 'middle',
    rotation: 0,
    zIndex: 12
  },
  cachet: {
    widthValue: 155,
    widthUnit: 'px',
    heightValue: 84,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#1E3A8A',
    offsetX: 0,
    offsetY: 0,
    alignX: 'left',
    alignY: 'middle',
    rotation: 0,
    zIndex: 11
  },
  filigrane: {
    widthValue: 290,
    widthUnit: 'px',
    heightValue: 360,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#64748B',
    offsetX: 0,
    offsetY: 0,
    alignX: 'center',
    alignY: 'middle',
    rotation: 0,
    zIndex: 0
  }
};

function sanitizeAssetItem(
  item: Partial<PdfAssetItemSettings> | undefined,
  fallback: PdfAssetItemSettings
): PdfAssetItemSettings {
  if (!item || typeof item !== 'object') return { ...fallback };
  return {
    widthValue:
      typeof item.widthValue === 'number' && !Number.isNaN(item.widthValue)
        ? Math.max(10, Math.min(1000, item.widthValue))
        : fallback.widthValue,
    widthUnit: item.widthUnit === '%' ? '%' : item.widthUnit === 'px' ? 'px' : fallback.widthUnit,
    heightValue:
      typeof item.heightValue === 'number' && !Number.isNaN(item.heightValue)
        ? Math.max(10, Math.min(1000, item.heightValue))
        : fallback.heightValue,
    heightUnit:
      item.heightUnit === '%' ? '%' : item.heightUnit === 'px' ? 'px' : fallback.heightUnit,
    opacity:
      typeof item.opacity === 'number' && !Number.isNaN(item.opacity)
        ? Math.max(0, Math.min(100, item.opacity))
        : fallback.opacity,
    tintEnabled: typeof item.tintEnabled === 'boolean' ? item.tintEnabled : fallback.tintEnabled,
    tintColor:
      typeof item.tintColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(item.tintColor)
        ? item.tintColor
        : fallback.tintColor,
    offsetX:
      typeof item.offsetX === 'number' && !Number.isNaN(item.offsetX)
        ? Math.max(-300, Math.min(300, item.offsetX))
        : fallback.offsetX,
    offsetY:
      typeof item.offsetY === 'number' && !Number.isNaN(item.offsetY)
        ? Math.max(-300, Math.min(300, item.offsetY))
        : fallback.offsetY,
    alignX:
      item.alignX === 'left' || item.alignX === 'center' || item.alignX === 'right'
        ? item.alignX
        : fallback.alignX,
    alignY:
      item.alignY === 'top' || item.alignY === 'middle' || item.alignY === 'bottom'
        ? item.alignY
        : fallback.alignY,
    rotation:
      typeof item.rotation === 'number' && !Number.isNaN(item.rotation)
        ? Math.max(-180, Math.min(180, item.rotation))
        : fallback.rotation,
    zIndex:
      typeof item.zIndex === 'number' && !Number.isNaN(item.zIndex)
        ? Math.max(-10, Math.min(50, item.zIndex))
        : fallback.zIndex
  };
}

export function normalizePdfAssetsConfig(
  raw?: Partial<PdfImportedAssetsConfig> | null
): PdfImportedAssetsConfig {
  return {
    logo: sanitizeAssetItem(raw?.logo, DEFAULT_PDF_ASSETS_CONFIG.logo),
    signature: sanitizeAssetItem(raw?.signature, DEFAULT_PDF_ASSETS_CONFIG.signature),
    cachet: sanitizeAssetItem(raw?.cachet, DEFAULT_PDF_ASSETS_CONFIG.cachet),
    filigrane: sanitizeAssetItem(raw?.filigrane, DEFAULT_PDF_ASSETS_CONFIG.filigrane),
    updated_at: raw?.updated_at || new Date().toISOString()
  };
}

export function getSavedPdfAssetsConfig(): PdfImportedAssetsConfig {
  try {
    const raw = localStorage.getItem(LS_PDF_ASSETS_CONFIG_KEY);
    if (!raw) return normalizePdfAssetsConfig(DEFAULT_PDF_ASSETS_CONFIG);
    return normalizePdfAssetsConfig(JSON.parse(raw));
  } catch {
    return normalizePdfAssetsConfig(DEFAULT_PDF_ASSETS_CONFIG);
  }
}

export function setSavedPdfAssetsConfig(config: PdfImportedAssetsConfig): PdfImportedAssetsConfig {
  const normalized = normalizePdfAssetsConfig(config);
  try {
    localStorage.setItem(LS_PDF_ASSETS_CONFIG_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore localStorage quota error
  }
  return normalized;
}

export async function savePdfAssetsConfigToFirestore(
  config: PdfImportedAssetsConfig
): Promise<PdfImportedAssetsConfig> {
  const normalized = setSavedPdfAssetsConfig({
    ...config,
    updated_at: new Date().toISOString()
  });

  try {
    const docRef = doc(collection(db, 'settings'), 'pdf_imported_assets');
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), 3500);
    });
    await Promise.race([setDoc(docRef, normalized, { merge: true }), timeoutPromise]);
    if (timer) clearTimeout(timer);
  } catch (err) {
    if (!isTransientUnavailableError(err)) {
      console.warn('Sauvegarde locale appliquée (Firestore indisponible):', err);
    }
  }

  return normalized;
}

export async function loadPdfAssetsConfigFromFirestore(): Promise<PdfImportedAssetsConfig> {
  const localConfig = getSavedPdfAssetsConfig();
  try {
    const docRef = doc(collection(db, 'settings'), 'pdf_imported_assets');
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 3000);
    });
    const snap = await Promise.race([getDoc(docRef), timeoutPromise]);
    if (timer) clearTimeout(timer);
    if (snap && snap.exists()) {
      const remoteData = snap.data() as Partial<PdfImportedAssetsConfig>;
      return setSavedPdfAssetsConfig(remoteData as PdfImportedAssetsConfig);
    }
  } catch {
    // Fallback to local config
  }
  return localConfig;
}

export function getSavedCustomLogo(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_LOGO_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomLogo(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_LOGO_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_LOGO_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedCustomSignature(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_SIGNATURE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomSignature(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_SIGNATURE_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_SIGNATURE_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedCustomCachet(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_CACHET_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomCachet(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_CACHET_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_CACHET_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedCustomFiligrane(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_FILIGRANE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomFiligrane(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_FILIGRANE_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_FILIGRANE_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return [12, 35, 102];
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export async function applyTintToImageDataUrl(
  rawDataUrl: string,
  tintColorHex: string
): Promise<string> {
  if (!rawDataUrl || typeof document === 'undefined') return rawDataUrl;
  const [tr, tg, tb] = hexToRgb(tintColorHex);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 150;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const alpha = d[i + 3];
          if (alpha === 0) continue;
          const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          d[i] = Math.min(255, Math.round(tr * (0.35 + 0.65 * lum)));
          d[i + 1] = Math.min(255, Math.round(tg * (0.35 + 0.65 * lum)));
          d[i + 2] = Math.min(255, Math.round(tb * (0.35 + 0.65 * lum)));
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function renderAssetWithSettingsForPdf(
  rawDataUrl: string,
  settings: PdfAssetItemSettings
): Promise<{ dataUrl: string; boxScaleX: number; boxScaleY: number }> {
  if (!rawDataUrl || typeof document === 'undefined') {
    return { dataUrl: rawDataUrl, boxScaleX: 1, boxScaleY: 1 };
  }

  const sourceUrl =
    settings.tintEnabled && settings.tintColor
      ? await applyTintToImageDataUrl(rawDataUrl, settings.tintColor)
      : rawDataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width || 300;
        const rawH = img.naturalHeight || img.height || 150;
        // Keep resolution crisp (~250 DPI) while ensuring PDF stays compact (< 400KB for Firestore mail attachment)
        const maxScale = Math.min(1, 520 / Math.max(rawW, rawH));
        const w = Math.max(1, Math.round(rawW * maxScale));
        const h = Math.max(1, Math.round(rawH * maxScale));

        const rad = ((settings.rotation || 0) * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));

        const outW = Math.max(1, Math.round(w * cos + h * sin));
        const outH = Math.max(1, Math.round(w * sin + h * cos));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: sourceUrl, boxScaleX: 1, boxScaleY: 1 });
          return;
        }

        ctx.clearRect(0, 0, outW, outH);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (settings.opacity ?? 100) / 100));
        ctx.translate(outW / 2, outH / 2);
        if (settings.rotation) {
          ctx.rotate(rad);
        }
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          boxScaleX: outW / w,
          boxScaleY: outH / h
        });
      } catch {
        resolve({ dataUrl: sourceUrl, boxScaleX: 1, boxScaleY: 1 });
      }
    };
    img.onerror = () => resolve({ dataUrl: sourceUrl, boxScaleX: 1, boxScaleY: 1 });
    img.src = sourceUrl;
  });
}

export async function convertUploadedImageForPdf(
  rawDataUrl: string,
  options: { maxWidth?: number; maxHeight?: number; removeWhiteBackground?: boolean } = {}
): Promise<string> {
  if (!rawDataUrl || typeof document === 'undefined') return rawDataUrl;
  const maxW = options.maxWidth || 600;
  const maxH = options.maxHeight || 600;
  const removeWhite = options.removeWhiteBackground ?? false;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || 400;
        let h = img.naturalHeight || img.height || 200;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        if (removeWhite) {
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            if (r >= 236 && g >= 234 && b >= 228) {
              const luminance = (r + g + b) / 3;
              if (luminance >= 244) {
                d[i + 3] = 0;
              } else {
                d[i + 3] = Math.round(((244 - luminance) / 10) * d[i + 3]);
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

// ============================================================================
// FIREBASE EXTENSION TRIGGER EMAIL ("mail" collection) & LOGS EMAILS SERVICE
// ============================================================================
export const OFFICIAL_SENDER_EMAIL = 'atlantictransport.int@ik.me';

export type MailDeliveryState = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export interface MailAttachmentItem {
  filename: string;
  content?: string;
  encoding?: string;
  contentType?: string;
  sizeKb?: number;
}

export interface MailDeliveryInfo {
  state: MailDeliveryState;
  startTime?: string;
  endTime?: string | null;
  error?: string | null;
  attempts?: number;
  info?: Record<string, unknown> | string | null;
}

export interface MailLogDocument {
  id: string;
  from: string;
  replyTo?: string;
  to: string[];
  matricule?: string;
  nom_complet?: string;
  poste?: string;
  date_embauche?: string;
  created_at: string;
  emailEnvoye?: boolean;
  emailError?: string;
  message: {
    subject: string;
    text?: string;
    html?: string;
    attachments?: MailAttachmentItem[];
  };
  delivery?: MailDeliveryInfo;
}

export interface TriggerEmailParams {
  toEmail: string;
  nomComplet: string;
  civilite: 'Monsieur' | 'Madame' | string;
  poste: string;
  departement?: string;
  dateEmbauche: string;
  dateEtablissement?: string;
  matricule: string;
  pdfDataUri: string;
}

export interface TriggerEmailResult {
  emailEnvoye: boolean;
  emailError: string;
  mailDocId: string;
  deliveryState: MailDeliveryState;
}

function getLocalMailLogsCache(): MailLogDocument[] {
  try {
    const raw = localStorage.getItem(LS_LOCAL_MAIL_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalMailLogsCache(logs: MailLogDocument[]): void {
  try {
    // Strip heavy base64 content in localStorage cache to avoid quota issues
    const lightweight = logs.slice(0, 60).map((item) => ({
      ...item,
      message: {
        ...item.message,
        attachments: (item.message?.attachments || []).map((att) => ({
          filename: att.filename,
          encoding: att.encoding || 'base64',
          contentType: att.contentType || 'application/pdf',
          sizeKb:
            att.sizeKb ||
            (att.content ? Math.round((att.content.length * 0.75) / 1024) : 0)
        }))
      }
    }));
    localStorage.setItem(LS_LOCAL_MAIL_LOGS_KEY, JSON.stringify(lightweight));
  } catch {
    // Ignore quota errors
  }
}

function upsertLocalMailLog(entry: MailLogDocument): void {
  const existing = getLocalMailLogsCache();
  const filtered = existing.filter((x) => x.id !== entry.id);
  saveLocalMailLogsCache([entry, ...filtered]);
}

function normalizeMailLogDoc(id: string, raw: Record<string, unknown>): MailLogDocument {
  const toArr = Array.isArray(raw.to)
    ? raw.to.map((x) => String(x))
    : typeof raw.to === 'string'
    ? [raw.to]
    : [];

  const msgObj = (raw.message as Record<string, unknown>) || {};
  const rawAttachments = Array.isArray(msgObj.attachments) ? msgObj.attachments : [];
  const attachments: MailAttachmentItem[] = rawAttachments.map((a: Record<string, unknown>) => {
    const contentStr = typeof a.content === 'string' ? a.content : '';
    return {
      filename: String(a.filename || 'PROMESSE_EMBAUCHE.pdf'),
      content: contentStr,
      encoding: String(a.encoding || 'base64'),
      contentType: String(a.contentType || 'application/pdf'),
      sizeKb:
        typeof a.sizeKb === 'number'
          ? a.sizeKb
          : contentStr
          ? Math.round((contentStr.length * 0.75) / 1024)
          : 0
    };
  });

  const delivRaw = raw.delivery as Record<string, unknown> | undefined;
  let state: MailDeliveryState = 'PENDING';
  if (delivRaw && typeof delivRaw.state === 'string') {
    const upper = delivRaw.state.toUpperCase();
    if (upper === 'SUCCESS') state = 'SUCCESS';
    else if (upper === 'ERROR') state = 'ERROR';
    else if (upper === 'PROCESSING') state = 'PROCESSING';
    else state = 'PENDING';
  }

  const errorText =
    (delivRaw && typeof delivRaw.error === 'string' ? delivRaw.error : '') ||
    (typeof raw.emailError === 'string' ? raw.emailError : '');

  const startTimeStr =
    delivRaw && typeof delivRaw.startTime === 'string'
      ? delivRaw.startTime
      : delivRaw &&
        delivRaw.startTime &&
        typeof (delivRaw.startTime as { toDate?: () => Date }).toDate === 'function'
      ? (delivRaw.startTime as { toDate: () => Date }).toDate().toISOString()
      : String(raw.created_at || new Date().toISOString());

  const endTimeStr =
    delivRaw && typeof delivRaw.endTime === 'string'
      ? delivRaw.endTime
      : delivRaw &&
        delivRaw.endTime &&
        typeof (delivRaw.endTime as { toDate?: () => Date }).toDate === 'function'
      ? (delivRaw.endTime as { toDate: () => Date }).toDate().toISOString()
      : null;

  return {
    id,
    from: String(raw.from || OFFICIAL_SENDER_EMAIL),
    replyTo: String(raw.replyTo || OFFICIAL_SENDER_EMAIL),
    to: toArr,
    matricule: typeof raw.matricule === 'string' ? raw.matricule : '',
    nom_complet: typeof raw.nom_complet === 'string' ? raw.nom_complet : '',
    poste: typeof raw.poste === 'string' ? raw.poste : '',
    date_embauche: typeof raw.date_embauche === 'string' ? raw.date_embauche : '',
    created_at: String(raw.created_at || startTimeStr),
    emailEnvoye: Boolean(raw.emailEnvoye ?? state === 'SUCCESS'),
    emailError: errorText,
    message: {
      subject: String(
        msgObj.subject || 'Atlantic Transport Ltd. - Acceptation de votre candidature'
      ),
      text: typeof msgObj.text === 'string' ? msgObj.text : '',
      html: typeof msgObj.html === 'string' ? msgObj.html : '',
      attachments
    },
    delivery: {
      state,
      startTime: startTimeStr,
      endTime: endTimeStr,
      error: errorText || null,
      attempts: typeof delivRaw?.attempts === 'number' ? delivRaw.attempts : 1,
      info: (delivRaw?.info as Record<string, unknown> | string) || null
    }
  };
}

/**
 * Sends the automatic acceptance email via Firebase Extension Trigger Email (collection `mail`).
 * - Verifies `to: [emailSalarie]`, `from: 'atlantictransport.int@ik.me'`, `message.subject`, `message.html`, and `message.attachments` (PDF base64).
 * - Checks Firestore `delivery.state` after write and logs complete diagnostic via `console.log`.
 * - Returns `{ emailEnvoye, emailError, mailDocId, deliveryState }` to store in the employee document.
 */
export async function sendCandidatureAcceptanceEmailViaFirebase(
  params: TriggerEmailParams
): Promise<TriggerEmailResult> {
  const recipient = (params.toEmail || '').trim();
  if (!recipient || !recipient.includes('@')) {
    const errMsg = `Adresse email destinataire invalide : "${recipient}"`;
    console.log('[TriggerEmail] ERREUR validation destinataire :', {
      emailEnvoye: false,
      emailError: errMsg,
      to: [recipient],
      from: OFFICIAL_SENDER_EMAIL
    });
    return {
      emailEnvoye: false,
      emailError: errMsg,
      mailDocId: '',
      deliveryState: 'ERROR'
    };
  }

  const cleanName = (params.nomComplet || 'SALARIE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');

  const pdfBase64 = params.pdfDataUri.includes('base64,')
    ? params.pdfDataUri.split('base64,')[1]
    : params.pdfDataUri;

  const pdfSizeKb = Math.round((pdfBase64.length * 0.75) / 1024);

  const subject = 'Atlantic Transport Ltd. - Acceptation de votre candidature';
  const salutation =
    String(params.civilite).toLowerCase().includes('madame') ||
    String(params.civilite).toLowerCase().startsWith('f')
      ? 'Madame'
      : 'Monsieur';

  const textBody = `${salutation} ${params.nomComplet},

Nous avons le plaisir de vous informer que la société Atlantic Transport Ltd. a décidé de retenir votre candidature au poste de ${params.poste} (Prise de fonction : ${params.dateEmbauche}).

Vous trouverez en pièce jointe votre Promesse d'Embauche officielle établie à Surrey le ${params.dateEtablissement || params.dateEmbauche} (Matricule : ${params.matricule}).

Nous vous remercions de bien vouloir nous confirmer votre acceptation en nous retournant ce document signé.

Veuillez agréer, ${salutation}, l'expression de nos salutations distinguées.

Direction des Ressources Humaines
Atlantic Transport Ltd.
King George Blvd, Surrey, BC V3T 2W1, Canada
Email : atlantictransport.int@ik.me
Téléphone : +1 (506) 802-2226`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 640px;">
      <h2 style="color: #0C2366; margin-bottom: 12px;">Atlantic Transport Ltd. — Acceptation de votre candidature</h2>
      <p>${salutation} <strong>${params.nomComplet}</strong>,</p>
      <p>
        Nous avons le plaisir de vous informer que la société <strong>Atlantic Transport Ltd.</strong> a décidé de vous embaucher à la suite de l'étude favorable de votre candidature au poste de <strong>${params.poste}</strong>${params.departement ? ` (${params.departement})` : ''}.
      </p>
      <p>
        <strong>Date de prise de fonction :</strong> ${params.dateEmbauche}<br/>
        <strong>Date d'établissement :</strong> ${params.dateEtablissement || params.dateEmbauche}<br/>
        <strong>Matricule :</strong> ${params.matricule}
      </p>
      <p>
        Vous trouverez en pièce jointe votre <strong>Promesse d'embauche officielle (PDF)</strong>. Nous vous remercions de bien vouloir confirmer votre acceptation de cette offre par signature du document.
      </p>
      <p>Veuillez agréer, ${salutation}, l'expression de nos salutations distinguées.</p>
      <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
      <p style="font-size: 12px; color: #3A6E48;">
        <strong>Atlantic Transport Ltd.</strong><br/>
        King George Blvd, Surrey, BC V3T 2W1, Canada<br/>
        Numéro d'entreprise (NE) : 799094917<br/>
        Téléphone : +1 (506) 802-2226 · Email : <a href="mailto:atlantictransport.int@ik.me">atlantictransport.int@ik.me</a>
      </p>
    </div>
  `;

  const mailCollectionRef = collection(db, 'mail');
  const mailDocRef = doc(mailCollectionRef);
  const nowIso = new Date().toISOString();

  // If the base64 string is below 720,000 chars (~540 KB), include full base64 attachment in Firestore doc (< 1 MiB limit)
  const canEmbedFullBase64InFirestore = pdfBase64.length > 0 && pdfBase64.length < 720000;

  const attachmentEntry: MailAttachmentItem = {
    filename: `PROMESSE_EMBAUCHE_${cleanName}.pdf`,
    content: canEmbedFullBase64InFirestore ? pdfBase64 : '',
    encoding: 'base64',
    contentType: 'application/pdf',
    sizeKb: pdfSizeKb
  };

  // Exact schema required by Firebase Extension Trigger Email (firestore-send-email)
  const mailPayload: Record<string, unknown> = {
    to: [recipient],
    from: OFFICIAL_SENDER_EMAIL,
    replyTo: OFFICIAL_SENDER_EMAIL,
    matricule: params.matricule,
    nom_complet: params.nomComplet,
    poste: params.poste,
    date_embauche: params.dateEmbauche,
    created_at: nowIso,
    message: {
      subject,
      text: textBody,
      html: htmlBody,
      attachments: [attachmentEntry]
    }
  };

  console.log('[TriggerEmail] Création du document dans la collection Firestore "mail" :', {
    mailDocId: mailDocRef.id,
    to: [recipient],
    from: OFFICIAL_SENDER_EMAIL,
    subject,
    attachmentFilename: attachmentEntry.filename,
    attachmentSizeKb: pdfSizeKb,
    embeddedInFirestore: canEmbedFullBase64InFirestore
  });

  let firestoreWriteError = '';

  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), 5000);
    });
    await Promise.race([setDoc(mailDocRef, mailPayload), timeoutPromise]);
    if (timer) clearTimeout(timer);
  } catch (error) {
    const rawErrMsg = error instanceof Error ? error.message : String(error);
    console.warn('[TriggerEmail] Avertissement écriture mail avec pièce jointe :', rawErrMsg);
    if (!isTransientUnavailableError(error)) {
      // Retry without heavy base64 payload if Firestore rejected document size
      try {
        await setDoc(mailDocRef, {
          ...mailPayload,
          message: {
            subject,
            text: textBody,
            html: htmlBody,
            attachments: [
              {
                filename: `PROMESSE_EMBAUCHE_${cleanName}.pdf`,
                encoding: 'base64',
                contentType: 'application/pdf',
                sizeKb: pdfSizeKb
              }
            ]
          },
          delivery: {
            state: 'ERROR',
            startTime: nowIso,
            endTime: new Date().toISOString(),
            attempts: 1,
            error: `Pièce jointe PDF trop volumineuse pour la limite Firestore de 1 Mo (${pdfSizeKb} Ko) : ${rawErrMsg}`
          }
        });
        firestoreWriteError = `Pièce jointe PDF (${pdfSizeKb} Ko) excède la limite Firestore : ${rawErrMsg}`;
      } catch (retryErr) {
        firestoreWriteError =
          retryErr instanceof Error ? retryErr.message : String(retryErr);
      }
    }
  }

  // Wait ~1.8s to check if Firebase Extension Trigger Email (`firestore-send-email`) picked up the doc in `mail`
  let finalDeliveryState: MailDeliveryState = firestoreWriteError ? 'ERROR' : 'PENDING';
  let finalEmailError = firestoreWriteError;
  let finalEmailEnvoye = !firestoreWriteError;

  if (!firestoreWriteError) {
    try {
      await new Promise((r) => setTimeout(r, 1800));
      const checkSnap = await getDoc(mailDocRef);
      if (checkSnap.exists()) {
        const docData = checkSnap.data() as Record<string, unknown>;
        const deliveryObj = docData.delivery as Record<string, unknown> | undefined;

        if (deliveryObj && typeof deliveryObj.state === 'string') {
          const extState = deliveryObj.state.toUpperCase();
          if (extState === 'ERROR') {
            finalDeliveryState = 'ERROR';
            finalEmailEnvoye = false;
            finalEmailError =
              typeof deliveryObj.error === 'string' && deliveryObj.error
                ? deliveryObj.error
                : "Erreur retournée par l'extension Firebase Trigger Email (vérifiez l'authentification SMTP ik.me / SendGrid).";
          } else if (extState === 'SUCCESS') {
            finalDeliveryState = 'SUCCESS';
            finalEmailEnvoye = true;
            finalEmailError = '';
          } else {
            finalDeliveryState = extState === 'PROCESSING' ? 'PROCESSING' : 'PENDING';
            finalEmailEnvoye = true;
            finalEmailError = '';
          }
        } else {
          // Extension Trigger Email has not written `delivery` field yet on this named database
          const pendingDiagnostic =
            "Document créé dans la collection « mail » (PENDING), mais l'extension Firebase Trigger Email (firestore-send-email) n'a pas encore traité l'envoi. Vérifiez que l'extension surveille bien la base nommée « ai-studio-atlantictranspor-cd8ee793-2e4a-4803-b555-bc00b99f2cef » et que l'URI SMTP Infomaniak (ik.me : mail.infomaniak.com:587) ou la clé API SendGrid est configurée.";
          finalDeliveryState = 'PENDING';
          finalEmailEnvoye = true;
          finalEmailError = pendingDiagnostic;

          await setDoc(
            mailDocRef,
            {
              emailEnvoye: true,
              emailError: pendingDiagnostic,
              delivery: {
                state: 'PENDING',
                startTime: nowIso,
                endTime: null,
                attempts: 1,
                error: pendingDiagnostic,
                info: {
                  watchedCollection: 'mail',
                  from: OFFICIAL_SENDER_EMAIL,
                  to: [recipient],
                  attachment: attachmentEntry.filename,
                  attachmentSizeKb: pdfSizeKb
                }
              }
            },
            { merge: true }
          );
        }
      }
    } catch {
      // Ignore read-back timeout
    }
  }

  const localEntry: MailLogDocument = {
    id: mailDocRef.id,
    from: OFFICIAL_SENDER_EMAIL,
    replyTo: OFFICIAL_SENDER_EMAIL,
    to: [recipient],
    matricule: params.matricule,
    nom_complet: params.nomComplet,
    poste: params.poste,
    date_embauche: params.dateEmbauche,
    created_at: nowIso,
    emailEnvoye: finalEmailEnvoye,
    emailError: finalEmailError,
    message: {
      subject,
      text: textBody,
      html: htmlBody,
      attachments: [
        {
          filename: attachmentEntry.filename,
          encoding: 'base64',
          contentType: 'application/pdf',
          sizeKb: pdfSizeKb
        }
      ]
    },
    delivery: {
      state: finalDeliveryState,
      startTime: nowIso,
      endTime: finalDeliveryState === 'PENDING' ? null : new Date().toISOString(),
      error: finalEmailError || null,
      attempts: 1
    }
  };
  upsertLocalMailLog(localEntry);

  console.log('[TriggerEmail] Résultat envoi courrier :', {
    mailDocId: mailDocRef.id,
    to: [recipient],
    from: OFFICIAL_SENDER_EMAIL,
    deliveryState: finalDeliveryState,
    emailEnvoye: finalEmailEnvoye,
    emailError: finalEmailError || null
  });

  return {
    emailEnvoye: finalEmailEnvoye,
    emailError: finalEmailError,
    mailDocId: mailDocRef.id,
    deliveryState: finalDeliveryState
  };
}

/**
 * Fetches all email logs from Firestore collection `mail` (merged with local cache fallback).
 */
export async function fetchMailLogsFromFirestore(): Promise<MailLogDocument[]> {
  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 4000);
    });
    const snap = await Promise.race([getDocs(collection(db, 'mail')), timeoutPromise]);
    if (timer) clearTimeout(timer);

    if (snap) {
      const list = snap.docs
        .map((d) => normalizeMailLogDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      saveLocalMailLogsCache(list);
      return list;
    }
  } catch (err) {
    if (!isTransientUnavailableError(err)) {
      console.warn('[TriggerEmail] Lecture collection mail en repli local :', err);
    }
  }
  return getLocalMailLogsCache();
}

/**
 * Subscribes in real time to Firestore collection `mail` to observe `delivery.state` (PENDING / SUCCESS / ERROR).
 */
export function subscribeToMailLogsFirestore(
  onUpdate: (logs: MailLogDocument[]) => void,
  onError?: (errMessage: string) => void
): () => void {
  const cached = getLocalMailLogsCache();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  try {
    const colRef = collection(db, 'mail');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const liveLogs = snapshot.docs
          .map((d) => normalizeMailLogDoc(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        saveLocalMailLogsCache(liveLogs);
        onUpdate(liveLogs);
      },
      (error) => {
        if (!isTransientUnavailableError(error) && onError) {
          onError(error.message || 'Erreur de lecture de la collection Firestore "mail".');
        }
        onUpdate(getLocalMailLogsCache());
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Retries sending an existing mail document by resetting `delivery.state` to `PENDING` in Firestore `mail`.
 */
export async function retryMailDocumentInFirestore(log: MailLogDocument): Promise<void> {
  const nowIso = new Date().toISOString();
  const docRef = doc(collection(db, 'mail'), log.id);
  const nextAttempts = (log.delivery?.attempts || 1) + 1;

  await setDoc(
    docRef,
    {
      to: log.to,
      from: OFFICIAL_SENDER_EMAIL,
      replyTo: OFFICIAL_SENDER_EMAIL,
      delivery: {
        state: 'PENDING',
        startTime: nowIso,
        endTime: null,
        attempts: nextAttempts,
        error: null
      }
    },
    { merge: true }
  );

  console.log('[TriggerEmail] Relance manuelle du document mail :', {
    mailDocId: log.id,
    to: log.to,
    from: OFFICIAL_SENDER_EMAIL,
    attempts: nextAttempts
  });
}

export async function deleteMailLogFromFirestore(mailId: string): Promise<void> {
  const existing = getLocalMailLogsCache().filter((x) => x.id !== mailId);
  saveLocalMailLogsCache(existing);
  try {
    await deleteDoc(doc(collection(db, 'mail'), mailId));
  } catch {
    // Ignore offline error
  }
}
