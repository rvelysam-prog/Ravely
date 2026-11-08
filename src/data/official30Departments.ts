/**
 * 30 DÉPARTEMENTS OFFICIELS CANADIENS - ATLANTIC TRANSPORT LTD
 * Fiches métiers complètes, codes CNP (Classification Nationale des Professions 5 chiffres),
 * grille salariale de référence (CAD/h et CAD/mois) et 6 missions opérationnelles strictes par poste.
 */

export interface OfficialPosteItem {
  titre: string;
  codeCnp: string;
  salaireHoraire: number;
  salaireMensuel: number;
  missions: [string, string, string, string, string, string]; // Strictement 6 missions
}

export interface OfficialDepartmentItem {
  numero: string;
  code: string;
  name: string;
  description: string;
  postes: OfficialPosteItem[];
}

export const OFFICIAL_30_DEPARTMENTS: OfficialDepartmentItem[] = [
  {
    numero: '01',
    code: 'DIRECTION_GENERALE_ADMINISTRATION',
    name: 'DÉPARTEMENT 01 – DIRECTION GÉNÉRALE ET ADMINISTRATION',
    description: 'Pilotage stratégique, gouvernance institutionnelle, représentation légale et coordination exécutive.',
    postes: [
      {
        titre: 'Directeur général',
        codeCnp: '00014',
        salaireHoraire: 68.0,
        salaireMensuel: 10880,
        missions: [
          "Définir la vision et les orientations stratégiques de l'entreprise.",
          "Superviser l'ensemble des activités et des départements.",
          "Prendre les décisions stratégiques et opérationnelles.",
          "Représenter officiellement l'entreprise auprès des partenaires.",
          "Valider les budgets et les investissements majeurs.",
          "Évaluer les performances globales de l'entreprise."
        ]
      },
      {
        titre: 'Directeur général adjoint',
        codeCnp: '00014',
        salaireHoraire: 55.0,
        salaireMensuel: 8800,
        missions: [
          "Assister le directeur général dans la gestion de l'entreprise.",
          "Superviser les directions et coordonner leurs activités.",
          "Contrôler l'exécution des décisions de la direction générale.",
          "Participer à l'élaboration des stratégies de développement.",
          "Assurer le suivi des objectifs opérationnels.",
          "Remplacer le directeur général en cas d'absence."
        ]
      },
      {
        titre: 'Assistant de direction',
        codeCnp: '12100',
        salaireHoraire: 28.5,
        salaireMensuel: 4560,
        missions: [
          "Organiser les réunions et les rendez-vous.",
          "Préparer les correspondances administratives.",
          "Assurer le classement et l'archivage des documents.",
          "Suivre les dossiers confiés par la direction.",
          "Coordonner les communications internes.",
          "Préparer les comptes rendus de réunions."
        ]
      }
    ]
  },
  {
    numero: '02',
    code: 'RESSOURCES_HUMAINES_RECRUTEMENT',
    name: 'DÉPARTEMENT 02 – RESSOURCES HUMAINES ET RECRUTEMENT',
    description: 'Gestion prévisionnelle des emplois, attraction des talents internationaux, paie et relations sociales.',
    postes: [
      {
        titre: 'Directeur des ressources humaines',
        codeCnp: '10011',
        salaireHoraire: 52.0,
        salaireMensuel: 8320,
        missions: [
          "Définir la politique de gestion des ressources humaines.",
          "Superviser les recrutements et les intégrations.",
          "Élaborer les stratégies de gestion du personnel.",
          "Superviser les évaluations professionnelles.",
          "Veiller au respect du droit du travail.",
          "Développer les politiques de fidélisation du personnel."
        ]
      },
      {
        titre: 'Responsable du recrutement',
        codeCnp: '11200',
        salaireHoraire: 36.5,
        salaireMensuel: 5840,
        missions: [
          "Identifier les besoins en personnel.",
          "Publier et gérer les offres d'emploi.",
          "Examiner les candidatures reçues.",
          "Organiser les entretiens de recrutement.",
          "Vérifier les références professionnelles.",
          "Préparer les recommandations d'embauche."
        ]
      },
      {
        titre: 'Gestionnaire du personnel',
        codeCnp: '12101',
        salaireHoraire: 30.0,
        salaireMensuel: 4800,
        missions: [
          "Gérer les dossiers administratifs des employés.",
          "Suivre les contrats de travail.",
          "Actualiser les informations du personnel.",
          "Préparer les documents administratifs.",
          "Suivre les absences et les congés.",
          "Assurer le suivi des mouvements du personnel."
        ]
      }
    ]
  },
  {
    numero: '03',
    code: 'TRANSPORT_EXPLOITATION',
    name: 'DÉPARTEMENT 03 – TRANSPORT ET EXPLOITATION',
    description: 'Planification des tournées, affectation des chauffeurs et régulation opérationnelle du camionnage.',
    postes: [
      {
        titre: 'Directeur des opérations de transport',
        codeCnp: '70020',
        salaireHoraire: 54.0,
        salaireMensuel: 8640,
        missions: [
          "Superviser les activités de transport.",
          "Organiser les ressources opérationnelles.",
          "Contrôler le respect des programmes de transport.",
          "Optimiser les coûts d'exploitation.",
          "Superviser les responsables d'exploitation.",
          "Évaluer la performance des opérations."
        ]
      },
      {
        titre: "Responsable d'exploitation",
        codeCnp: '72024',
        salaireHoraire: 38.0,
        salaireMensuel: 6080,
        missions: [
          "Organiser les opérations quotidiennes.",
          "Superviser les équipes opérationnelles.",
          "Planifier les affectations des véhicules.",
          "Contrôler le respect des procédures.",
          "Résoudre les difficultés opérationnelles.",
          "Produire les rapports d'exploitation."
        ]
      },
      {
        titre: 'Coordonnateur de transport',
        codeCnp: '72024',
        salaireHoraire: 31.5,
        salaireMensuel: 5040,
        missions: [
          "Planifier les mouvements de véhicules.",
          "Coordonner les chauffeurs et les équipes.",
          "Suivre les horaires de livraison.",
          "Communiquer les instructions opérationnelles.",
          "Signaler les retards et les incidents.",
          "Actualiser les tableaux de suivi."
        ]
      }
    ]
  },
  {
    numero: '04',
    code: 'LOGISTIQUE_CHAINE_APPROVISIONNEMENT',
    name: "DÉPARTEMENT 04 – LOGISTIQUE ET CHAÎNE D'APPROVISIONNEMENT",
    description: 'Entreposage moderne, gestion des stocks, conditionnement et optimisation de la chaîne logistique.',
    postes: [
      {
        titre: 'Directeur logistique',
        codeCnp: '70020',
        salaireHoraire: 52.0,
        salaireMensuel: 8320,
        missions: [
          "Définir la stratégie logistique.",
          "Superviser les activités d'entreposage.",
          "Optimiser les flux de marchandises.",
          "Contrôler les coûts logistiques.",
          "Superviser les responsables de la chaîne d'approvisionnement.",
          "Améliorer les performances logistiques."
        ]
      },
      {
        titre: "Responsable de la chaîne d'approvisionnement",
        codeCnp: '12102',
        salaireHoraire: 38.0,
        salaireMensuel: 6080,
        missions: [
          "Planifier les besoins en approvisionnement.",
          "Coordonner les fournisseurs et les distributeurs.",
          "Suivre les commandes et les livraisons.",
          "Anticiper les ruptures de stock.",
          "Optimiser les délais d'approvisionnement.",
          "Évaluer les performances des fournisseurs."
        ]
      },
      {
        titre: "Gestionnaire d'entrepôt",
        codeCnp: '72024',
        salaireHoraire: 32.0,
        salaireMensuel: 5120,
        missions: [
          "Superviser les activités de stockage.",
          "Organiser la réception des marchandises.",
          "Contrôler les entrées et sorties de stocks.",
          "Veiller à la bonne conservation des produits.",
          "Organiser les inventaires.",
          "Superviser les équipes d'entrepôt."
        ]
      }
    ]
  },
  {
    numero: '05',
    code: 'ACHATS_APPROVISIONNEMENT',
    name: 'DÉPARTEMENT 05 – ACHATS ET APPROVISIONNEMENT',
    description: 'Sourcing fournisseurs, négociation des contrats-cadres et optimisation des dépenses opérationnelles.',
    postes: [
      {
        titre: 'Directeur des achats',
        codeCnp: '10012',
        salaireHoraire: 50.0,
        salaireMensuel: 8000,
        missions: [
          "Définir la politique générale des achats.",
          "Superviser les stratégies d'approvisionnement.",
          "Négocier les contrats importants.",
          "Contrôler les dépenses d'acquisition.",
          "Évaluer les fournisseurs stratégiques.",
          "Garantir la transparence des procédures d'achat."
        ]
      },
      {
        titre: 'Responsable des achats',
        codeCnp: '12102',
        salaireHoraire: 37.0,
        salaireMensuel: 5920,
        missions: [
          "Identifier les besoins des différents services.",
          "Rechercher et sélectionner les fournisseurs.",
          "Demander et comparer les devis.",
          "Négocier les prix et les conditions commerciales.",
          "Suivre les commandes.",
          "Contrôler la conformité des acquisitions."
        ]
      },
      {
        titre: "Agent d'approvisionnement",
        codeCnp: '12102',
        salaireHoraire: 27.5,
        salaireMensuel: 4400,
        missions: [
          "Préparer les demandes d'approvisionnement.",
          "Rechercher les produits et équipements nécessaires.",
          "Suivre les commandes auprès des fournisseurs.",
          "Contrôler les livraisons reçues.",
          "Actualiser les registres d'approvisionnement.",
          "Signaler les ruptures et les retards."
        ]
      }
    ]
  },
  {
    numero: '06',
    code: 'PASSATION_MARCHES_CONTRATS',
    name: 'DÉPARTEMENT 06 – PASSATION DES MARCHÉS ET GESTION DES CONTRATS',
    description: 'Gestion des appels d’offres publics et privés, passation des marchés et conformité contractuelle.',
    postes: [
      {
        titre: 'Directeur de la passation des marchés',
        codeCnp: '10012',
        salaireHoraire: 51.0,
        salaireMensuel: 8160,
        missions: [
          "Définir les politiques de passation des marchés.",
          "Superviser les procédures de consultation.",
          "Contrôler la conformité des dossiers d'appel d'offres.",
          "Superviser l'évaluation des soumissions.",
          "Veiller à la transparence des attributions.",
          "Superviser le suivi des contrats."
        ]
      },
      {
        titre: 'Spécialiste en passation des marchés',
        codeCnp: '11201',
        salaireHoraire: 38.0,
        salaireMensuel: 6080,
        missions: [
          "Préparer les dossiers d'appel d'offres.",
          "Analyser les offres techniques et financières.",
          "Vérifier la conformité des soumissions.",
          "Préparer les rapports d'évaluation.",
          "Participer aux négociations contractuelles.",
          "Suivre les procédures d'attribution."
        ]
      },
      {
        titre: 'Gestionnaire de contrats',
        codeCnp: '12102',
        salaireHoraire: 33.0,
        salaireMensuel: 5280,
        missions: [
          "Préparer et examiner les contrats.",
          "Suivre les obligations contractuelles.",
          "Contrôler les échéances contractuelles.",
          "Assurer le suivi des modifications contractuelles.",
          "Identifier les risques liés aux contrats.",
          "Préparer les rapports de gestion contractuelle."
        ]
      }
    ]
  },
  {
    numero: '07',
    code: 'FINANCES_COMPTABILITE',
    name: 'DÉPARTEMENT 07 – FINANCES ET COMPTABILITÉ',
    description: 'Gestion de trésorerie, comptabilité générale, états financiers et contrôle de gestion.',
    postes: [
      {
        titre: 'Directeur financier',
        codeCnp: '10010',
        salaireHoraire: 56.0,
        salaireMensuel: 8960,
        missions: [
          "Définir la stratégie financière.",
          "Superviser la gestion des ressources financières.",
          "Contrôler les budgets et les dépenses.",
          "Superviser les opérations comptables.",
          "Analyser la rentabilité des activités.",
          "Présenter les rapports financiers à la direction."
        ]
      },
      {
        titre: 'Comptable',
        codeCnp: '11100',
        salaireHoraire: 34.0,
        salaireMensuel: 5440,
        missions: [
          "Enregistrer les opérations comptables.",
          "Vérifier les factures et les pièces justificatives.",
          "Effectuer les rapprochements bancaires.",
          "Préparer les déclarations comptables et fiscales.",
          "Participer à la clôture des comptes.",
          "Produire les états financiers."
        ]
      },
      {
        titre: 'Contrôleur de gestion',
        codeCnp: '11100',
        salaireHoraire: 37.5,
        salaireMensuel: 6000,
        missions: [
          "Élaborer les budgets prévisionnels.",
          "Analyser les écarts budgétaires.",
          "Contrôler les dépenses des départements.",
          "Évaluer la rentabilité des activités.",
          "Élaborer les tableaux de bord.",
          "Proposer des mesures d'optimisation financière."
        ]
      }
    ]
  },
  {
    numero: '08',
    code: 'JURIDIQUE_CONFORMITE',
    name: 'DÉPARTEMENT 08 – JURIDIQUE ET CONFORMITÉ',
    description: 'Conseil légal, gouvernance d’entreprise, gestion des litiges et conformité réglementaire canadienne.',
    postes: [
      {
        titre: 'Directeur juridique',
        codeCnp: '10019',
        salaireHoraire: 58.0,
        salaireMensuel: 9280,
        missions: [
          "Superviser les activités juridiques.",
          "Conseiller la direction générale.",
          "Contrôler la conformité des contrats.",
          "Gérer les dossiers de contentieux.",
          "Superviser les relations avec les cabinets juridiques.",
          "Anticiper les risques juridiques."
        ]
      },
      {
        titre: "Juriste d'entreprise",
        codeCnp: '41101',
        salaireHoraire: 42.0,
        salaireMensuel: 6720,
        missions: [
          "Examiner les documents juridiques.",
          "Préparer les contrats et conventions.",
          "Conseiller les différents départements.",
          "Effectuer une veille réglementaire.",
          "Participer à la résolution des litiges.",
          "Assurer le suivi des obligations légales."
        ]
      },
      {
        titre: 'Responsable conformité',
        codeCnp: '11202',
        salaireHoraire: 37.0,
        salaireMensuel: 5920,
        missions: [
          "Définir les procédures de conformité.",
          "Contrôler l'application des réglementations.",
          "Identifier les risques de non-conformité.",
          "Organiser les contrôles internes.",
          "Sensibiliser le personnel aux obligations réglementaires.",
          "Préparer les rapports de conformité."
        ]
      }
    ]
  },
  {
    numero: '09',
    code: 'INFORMATIQUE_SYSTEMES_INFORMATION',
    name: 'DÉPARTEMENT 09 – INFORMATIQUE ET SYSTÈMES D’INFORMATION',
    description: 'Infrastructures cloud, logiciels TMS/WMS, cybersécurité et intégrations EDI/API.',
    postes: [
      {
        titre: 'Directeur informatique',
        codeCnp: '20012',
        salaireHoraire: 55.0,
        salaireMensuel: 8800,
        missions: [
          "Définir la stratégie informatique.",
          "Superviser les infrastructures numériques.",
          "Garantir la disponibilité des systèmes.",
          "Superviser les équipes informatiques.",
          "Contrôler la sécurité des systèmes.",
          "Piloter les projets de transformation numérique."
        ]
      },
      {
        titre: 'Administrateur systèmes et réseaux',
        codeCnp: '22220',
        salaireHoraire: 38.0,
        salaireMensuel: 6080,
        missions: [
          "Administrer les serveurs informatiques.",
          "Configurer les réseaux internes.",
          "Surveiller les performances des infrastructures.",
          "Gérer les comptes et les accès informatiques.",
          "Diagnostiquer les incidents techniques.",
          "Assurer la maintenance des systèmes."
        ]
      },
      {
        titre: 'Développeur informatique',
        codeCnp: '21232',
        salaireHoraire: 40.0,
        salaireMensuel: 6400,
        missions: [
          "Concevoir des applications informatiques.",
          "Développer de nouvelles fonctionnalités.",
          "Corriger les erreurs des applications.",
          "Tester les solutions développées.",
          "Documenter les développements.",
          "Assurer la maintenance des logiciels."
        ]
      }
    ]
  },
  {
    numero: '10',
    code: 'MARKETING_COMMUNICATION',
    name: 'DÉPARTEMENT 10 – MARKETING ET COMMUNICATION',
    description: 'Image de marque, campagnes promotionnelles, supports visuels et communication d’entreprise.',
    postes: [
      {
        titre: 'Directeur marketing',
        codeCnp: '10022',
        salaireHoraire: 48.0,
        salaireMensuel: 7680,
        missions: [
          "Définir la stratégie marketing.",
          "Superviser les campagnes promotionnelles.",
          "Analyser les marchés et la concurrence.",
          "Développer la visibilité de l'entreprise.",
          "Superviser les équipes marketing.",
          "Évaluer les résultats des campagnes."
        ]
      },
      {
        titre: 'Responsable communication',
        codeCnp: '11202',
        salaireHoraire: 35.0,
        salaireMensuel: 5600,
        missions: [
          "Élaborer les stratégies de communication.",
          "Gérer les communications institutionnelles.",
          "Préparer les communiqués officiels.",
          "Superviser les supports de communication.",
          "Organiser les événements institutionnels.",
          "Développer l'image de marque."
        ]
      },
      {
        titre: 'Graphiste',
        codeCnp: '52111',
        salaireHoraire: 28.0,
        salaireMensuel: 4480,
        missions: [
          "Concevoir les supports visuels.",
          "Réaliser les affiches et les brochures.",
          "Produire les visuels publicitaires.",
          "Adapter les créations à l'identité graphique.",
          "Préparer les fichiers pour impression.",
          "Collaborer avec les équipes de communication."
        ]
      }
    ]
  },
  {
    numero: '11',
    code: 'SERVICE_CLIENTELE_RELATIONS_CLIENTS',
    name: 'DÉPARTEMENT 11 – SERVICE CLIENTÈLE ET RELATIONS CLIENTS',
    description: 'Assistance aux chargeurs, suivi des expéditions en temps réel, réclamations et fidélisation.',
    postes: [
      {
        titre: 'Directeur de la relation clientèle',
        codeCnp: '60010',
        salaireHoraire: 48.0,
        salaireMensuel: 7680,
        missions: [
          "Définir la politique de relation clientèle.",
          "Superviser les services d'assistance.",
          "Contrôler la qualité des prestations.",
          "Gérer les réclamations importantes.",
          "Développer la satisfaction et la fidélisation.",
          "Évaluer les performances du service clientèle."
        ]
      },
      {
        titre: 'Responsable clientèle',
        codeCnp: '62010',
        salaireHoraire: 34.0,
        salaireMensuel: 5440,
        missions: [
          "Assurer le suivi des comptes clients.",
          "Coordonner le traitement des demandes.",
          "Informer les clients de l'évolution des dossiers.",
          "Gérer les réclamations.",
          "Proposer des solutions adaptées.",
          "Maintenir les relations commerciales."
        ]
      },
      {
        titre: 'Agent de service clientèle',
        codeCnp: '64409',
        salaireHoraire: 26.0,
        salaireMensuel: 4160,
        missions: [
          "Recevoir les demandes des clients.",
          "Répondre aux questions et préoccupations.",
          "Informer les clients sur les prestations.",
          "Enregistrer les réclamations.",
          "Transmettre les dossiers aux services concernés.",
          "Assurer le suivi des demandes."
        ]
      }
    ]
  },
  {
    numero: '12',
    code: 'COMMERCIAL_DEVELOPPEMENT_AFFAIRES',
    name: 'DÉPARTEMENT 12 – COMMERCIAL ET DÉVELOPPEMENT DES AFFAIRES',
    description: 'Expansion commerciale, prospection de chargeurs industriels et conclusion d’accords de fret.',
    postes: [
      {
        titre: 'Directeur commercial',
        codeCnp: '60010',
        salaireHoraire: 52.0,
        salaireMensuel: 8320,
        missions: [
          "Définir la stratégie commerciale.",
          "Superviser les équipes de vente.",
          "Développer les partenariats commerciaux.",
          "Identifier les opportunités de marché.",
          "Négocier les contrats stratégiques.",
          "Suivre les objectifs commerciaux."
        ]
      },
      {
        titre: 'Responsable commercial',
        codeCnp: '62100',
        salaireHoraire: 38.0,
        salaireMensuel: 6080,
        missions: [
          "Développer le portefeuille clients.",
          "Prospecter de nouveaux partenaires.",
          "Présenter les services de l'entreprise.",
          "Négocier les offres commerciales.",
          "Préparer les propositions commerciales.",
          "Suivre les objectifs de vente."
        ]
      },
      {
        titre: 'Agent commercial',
        codeCnp: '64100',
        salaireHoraire: 28.0,
        salaireMensuel: 4480,
        missions: [
          "Prospecter de nouveaux clients.",
          "Présenter les produits et services.",
          "Répondre aux demandes commerciales.",
          "Préparer les devis.",
          "Assurer les relances commerciales.",
          "Transmettre les commandes aux services concernés."
        ]
      }
    ]
  },
  {
    numero: '13',
    code: 'SANTE_SECURITE_ENVIRONNEMENT',
    name: 'DÉPARTEMENT 13 – SANTÉ, SÉCURITÉ ET ENVIRONNEMENT (SSE)',
    description: 'Prévention des risques, médecine du travail, normes environnementales et bien-être des équipes.',
    postes: [
      {
        titre: 'Directeur santé, sécurité et environnement',
        codeCnp: '20010',
        salaireHoraire: 50.0,
        salaireMensuel: 8000,
        missions: [
          "Définir la politique SSE.",
          "Superviser les programmes de prévention.",
          "Contrôler les conditions de sécurité.",
          "Superviser les audits de sécurité.",
          "Veiller au respect des normes environnementales.",
          "Présenter les rapports SSE à la direction."
        ]
      },
      {
        titre: 'Responsable santé et sécurité au travail',
        codeCnp: '22232',
        salaireHoraire: 37.0,
        salaireMensuel: 5920,
        missions: [
          "Identifier les risques professionnels.",
          "Organiser les inspections de sécurité.",
          "Mettre en œuvre les mesures préventives.",
          "Former les employés aux règles de sécurité.",
          "Enquêter sur les accidents du travail.",
          "Assurer le suivi des plans de prévention."
        ]
      },
      {
        titre: 'Infirmier en santé au travail',
        codeCnp: '31301',
        salaireHoraire: 42.5,
        salaireMensuel: 6800,
        missions: [
          "Assurer les premiers soins aux employés.",
          "Participer aux activités de prévention sanitaire.",
          "Tenir les dossiers de santé au travail dans le respect de la confidentialité.",
          "Orienter les employés vers les services médicaux appropriés.",
          "Participer aux campagnes de sensibilisation.",
          "Collaborer avec les professionnels de santé."
        ]
      }
    ]
  },
  {
    numero: '14',
    code: 'MAINTENANCE_SERVICES_TECHNIQUES',
    name: 'DÉPARTEMENT 14 – MAINTENANCE ET SERVICES TECHNIQUES',
    description: 'Entretien des véhicules poids lourds, installations frigorifiques, électricité et systèmes industriels.',
    postes: [
      {
        titre: 'Directeur de la maintenance',
        codeCnp: '70010',
        salaireHoraire: 49.0,
        salaireMensuel: 7840,
        missions: [
          "Définir la politique de maintenance.",
          "Superviser les équipes techniques.",
          "Planifier les opérations de maintenance.",
          "Contrôler les coûts d'entretien.",
          "Garantir la disponibilité des équipements.",
          "Superviser les interventions techniques."
        ]
      },
      {
        titre: 'Technicien en froid et climatisation',
        codeCnp: '72402',
        salaireHoraire: 35.0,
        salaireMensuel: 5600,
        missions: [
          "Installer les systèmes de climatisation et de réfrigération.",
          "Diagnostiquer les pannes des équipements frigorifiques.",
          "Effectuer les opérations de maintenance préventive.",
          "Réparer les installations défectueuses.",
          "Contrôler les circuits frigorifiques et les performances énergétiques.",
          "Rédiger les rapports d'intervention technique."
        ]
      },
      {
        titre: 'Électricien industriel',
        codeCnp: '72201',
        salaireHoraire: 36.0,
        salaireMensuel: 5760,
        missions: [
          "Installer les équipements électriques.",
          "Effectuer les raccordements électriques.",
          "Diagnostiquer les pannes électriques.",
          "Réaliser les opérations de maintenance.",
          "Contrôler les installations et les dispositifs de protection.",
          "Rédiger les rapports d'intervention."
        ]
      },
      {
        titre: 'Mécanicien automobile et poids lourds',
        codeCnp: '72401',
        salaireHoraire: 36.85,
        salaireMensuel: 5900,
        missions: [
          "Effectuer les diagnostics mécaniques.",
          "Entretenir les véhicules.",
          "Réparer les systèmes mécaniques.",
          "Contrôler les systèmes de freinage.",
          "Remplacer les pièces défectueuses.",
          "Rédiger les rapports de maintenance."
        ]
      }
    ]
  },
  {
    numero: '15',
    code: 'IMMOBILIER_BATIMENTS_INFRASTRUCTURES',
    name: 'DÉPARTEMENT 15 – IMMOBILIER, BÂTIMENTS ET INFRASTRUCTURES',
    description: 'Conception des plateformes logistiques, génie civil, gestion du patrimoine bâti et architecture.',
    postes: [
      {
        titre: 'Directeur des infrastructures',
        codeCnp: '70010',
        salaireHoraire: 52.0,
        salaireMensuel: 8320,
        missions: [
          "Définir la stratégie de développement des infrastructures.",
          "Superviser les projets de construction.",
          "Contrôler les budgets des travaux.",
          "Coordonner les prestataires techniques.",
          "Superviser l'entretien des bâtiments.",
          "Évaluer l'état des infrastructures."
        ]
      },
      {
        titre: 'Ingénieur en génie civil',
        codeCnp: '21300',
        salaireHoraire: 44.0,
        salaireMensuel: 7040,
        missions: [
          "Concevoir les projets d'infrastructures.",
          "Réaliser les études techniques.",
          "Superviser les travaux de construction.",
          "Contrôler la qualité des matériaux.",
          "Vérifier la conformité des réalisations.",
          "Préparer les rapports d'avancement."
        ]
      },
      {
        titre: 'Architecte',
        codeCnp: '21200',
        salaireHoraire: 46.0,
        salaireMensuel: 7360,
        missions: [
          "Concevoir les plans architecturaux.",
          "Réaliser les études d'aménagement.",
          "Préparer les dossiers de conception.",
          "Coordonner les intervenants techniques.",
          "Superviser la conformité architecturale.",
          "Participer à la réception des travaux."
        ]
      }
    ]
  },
  {
    numero: '16',
    code: 'SECURITE_SURETE',
    name: 'DÉPARTEMENT 16 – SÉCURITÉ ET SÛRETÉ',
    description: 'Protection des installations sous douane, surveillance vidéo, contrôle d’accès et prévention des intrusions.',
    postes: [
      {
        titre: 'Directeur de la sécurité',
        codeCnp: '10029',
        salaireHoraire: 49.0,
        salaireMensuel: 7840,
        missions: [
          "Définir les politiques de sécurité.",
          "Superviser les dispositifs de protection.",
          "Évaluer les risques de sûreté.",
          "Coordonner les équipes de sécurité.",
          "Organiser les procédures d'urgence.",
          "Superviser les rapports d'incidents."
        ]
      },
      {
        titre: 'Responsable de la sécurité des installations',
        codeCnp: '62029',
        salaireHoraire: 35.0,
        salaireMensuel: 5600,
        missions: [
          "Contrôler les accès aux installations.",
          "Superviser les dispositifs de surveillance.",
          "Organiser les rondes de sécurité.",
          "Identifier les situations à risque.",
          "Coordonner les interventions en cas d'incident.",
          "Produire les rapports de sécurité."
        ]
      },
      {
        titre: 'Agent de sécurité',
        codeCnp: '64410',
        salaireHoraire: 24.5,
        salaireMensuel: 3920,
        missions: [
          "Contrôler les entrées et les sorties.",
          "Effectuer les rondes de surveillance.",
          "Surveiller les installations.",
          "Signaler les comportements suspects.",
          "Appliquer les consignes de sécurité.",
          "Rédiger les rapports d'incidents."
        ]
      }
    ]
  },
  {
    numero: '17',
    code: 'GESTION_PROJETS',
    name: 'DÉPARTEMENT 17 – GESTION DES PROJETS',
    description: 'Conduite de projets stratégiques, jalons temporels, budgets d’investissements et gestion des risques.',
    postes: [
      {
        titre: 'Directeur de gestion de projets',
        codeCnp: '10019',
        salaireHoraire: 51.0,
        salaireMensuel: 8160,
        missions: [
          "Définir les orientations de gestion des projets.",
          "Superviser le portefeuille de projets.",
          "Valider les plans de réalisation.",
          "Contrôler les budgets et les délais.",
          "Coordonner les chefs de projet.",
          "Présenter les résultats à la direction."
        ]
      },
      {
        titre: 'Chef de projet',
        codeCnp: '21310',
        salaireHoraire: 40.0,
        salaireMensuel: 6400,
        missions: [
          "Définir les objectifs du projet.",
          "Élaborer le calendrier d'exécution.",
          "Coordonner les ressources humaines et matérielles.",
          "Suivre les dépenses du projet.",
          "Identifier et gérer les risques.",
          "Produire les rapports d'avancement."
        ]
      },
      {
        titre: 'Assistant de projet',
        codeCnp: '12100',
        salaireHoraire: 28.0,
        salaireMensuel: 4480,
        missions: [
          "Organiser les réunions de projet.",
          "Préparer les documents de suivi.",
          "Actualiser les calendriers.",
          "Collecter les informations auprès des équipes.",
          "Assurer le classement des documents.",
          "Préparer les comptes rendus."
        ]
      }
    ]
  },
  {
    numero: '18',
    code: 'QUALITE_AUDIT_INTERNE',
    name: 'DÉPARTEMENT 18 – QUALITÉ ET AUDIT INTERNE',
    description: 'Certifications ISO, audits des processus opérationnels, plans d’action correctifs et gouvernance.',
    postes: [
      {
        titre: 'Directeur qualité et audit',
        codeCnp: '10019',
        salaireHoraire: 51.0,
        salaireMensuel: 8160,
        missions: [
          "Définir la politique qualité.",
          "Superviser les programmes d'audit.",
          "Contrôler les procédures internes.",
          "Identifier les dysfonctionnements.",
          "Superviser les plans d'amélioration.",
          "Présenter les résultats des audits."
        ]
      },
      {
        titre: 'Auditeur interne',
        codeCnp: '11100',
        salaireHoraire: 38.0,
        salaireMensuel: 6080,
        missions: [
          "Examiner les procédures opérationnelles.",
          "Contrôler les documents et les transactions.",
          "Identifier les irrégularités.",
          "Évaluer les dispositifs de contrôle interne.",
          "Formuler des recommandations.",
          "Rédiger les rapports d'audit."
        ]
      },
      {
        titre: 'Responsable qualité',
        codeCnp: '22214',
        salaireHoraire: 36.0,
        salaireMensuel: 5760,
        missions: [
          "Élaborer les procédures qualité.",
          "Contrôler la conformité des prestations.",
          "Organiser les contrôles qualité.",
          "Analyser les non-conformités.",
          "Mettre en œuvre les actions correctives.",
          "Suivre les indicateurs de qualité."
        ]
      }
    ]
  },
  {
    numero: '19',
    code: 'DOUANES_COMMERCE_INTERNATIONAL',
    name: 'DÉPARTEMENT 19 – DOUANES ET COMMERCE INTERNATIONAL',
    description: 'Dédouanement ASFC/CBSA, régimes particuliers sous douane, fiscalité internationale et Incoterms.',
    postes: [
      {
        titre: 'Directeur du commerce international',
        codeCnp: '60010',
        salaireHoraire: 53.0,
        salaireMensuel: 8480,
        missions: [
          "Définir la stratégie de commerce international.",
          "Superviser les opérations import-export.",
          "Développer les relations avec les partenaires internationaux.",
          "Contrôler les procédures douanières.",
          "Superviser les opérations transfrontalières.",
          "Assurer le suivi des réglementations internationales."
        ]
      },
      {
        titre: 'Déclarant en douane',
        codeCnp: '12200',
        salaireHoraire: 32.5,
        salaireMensuel: 5200,
        missions: [
          "Préparer les déclarations douanières.",
          "Vérifier les documents d'importation et d'exportation.",
          "Classifier les marchandises selon les règles applicables.",
          "Suivre les formalités de dédouanement.",
          "Communiquer avec les services douaniers.",
          "Assurer le suivi des dossiers douaniers."
        ]
      },
      {
        titre: 'Agent import-export',
        codeCnp: '13201',
        salaireHoraire: 29.0,
        salaireMensuel: 4640,
        missions: [
          "Préparer les documents commerciaux internationaux.",
          "Suivre les expéditions internationales.",
          "Coordonner les formalités administratives.",
          "Vérifier les documents de transport.",
          "Communiquer avec les partenaires étrangers.",
          "Actualiser les dossiers d'import-export."
        ]
      }
    ]
  },
  {
    numero: '20',
    code: 'GESTION_RISQUES_ASSURANCES',
    name: 'DÉPARTEMENT 20 – GESTION DES RISQUES ET ASSURANCES',
    description: 'Couverture des cargaisons, déclarations de sinistres, analyse de vulnérabilité et gestion de crise.',
    postes: [
      {
        titre: 'Directeur des risques',
        codeCnp: '10010',
        salaireHoraire: 52.0,
        salaireMensuel: 8320,
        missions: [
          "Définir la politique de gestion des risques.",
          "Identifier les risques stratégiques et opérationnels.",
          "Superviser les plans de prévention.",
          "Évaluer les conséquences financières des risques.",
          "Coordonner les dispositifs de gestion de crise.",
          "Présenter les rapports de risques."
        ]
      },
      {
        titre: "Gestionnaire d'assurances",
        codeCnp: '12103',
        salaireHoraire: 34.0,
        salaireMensuel: 5440,
        missions: [
          "Gérer les contrats d'assurance.",
          "Vérifier les garanties souscrites.",
          "Déclarer les sinistres.",
          "Suivre les dossiers d'indemnisation.",
          "Communiquer avec les compagnies d'assurance.",
          "Actualiser les registres des polices d'assurance."
        ]
      },
      {
        titre: 'Analyste des risques',
        codeCnp: '11202',
        salaireHoraire: 35.0,
        salaireMensuel: 5600,
        missions: [
          "Collecter les données relatives aux risques.",
          "Analyser les facteurs de vulnérabilité.",
          "Évaluer les probabilités de survenance.",
          "Élaborer des tableaux de suivi.",
          "Proposer des mesures de réduction des risques.",
          "Préparer les rapports d'analyse."
        ]
      }
    ]
  },
  {
    numero: '21',
    code: 'FORMATION_DEVELOPPEMENT_COMPETENCES',
    name: 'DÉPARTEMENT 21 – FORMATION ET DÉVELOPPEMENT DES COMPÉTENCES',
    description: 'Formations réglementaires FIMO/FCO, CACES, perfectionnement professionnel et plans de carrière.',
    postes: [
      {
        titre: 'Directeur de la formation',
        codeCnp: '10011',
        salaireHoraire: 48.0,
        salaireMensuel: 7680,
        missions: [
          "Définir la politique de formation.",
          "Identifier les besoins de développement des compétences.",
          "Superviser les programmes de formation.",
          "Coordonner les formateurs.",
          "Évaluer l'efficacité des formations.",
          "Élaborer le budget de formation."
        ]
      },
      {
        titre: 'Formateur professionnel',
        codeCnp: '41220',
        salaireHoraire: 33.0,
        salaireMensuel: 5280,
        missions: [
          "Préparer les programmes pédagogiques.",
          "Concevoir les supports de formation.",
          "Animer les séances d'apprentissage.",
          "Évaluer les connaissances des participants.",
          "Accompagner les apprenants.",
          "Produire les rapports de formation."
        ]
      },
      {
        titre: 'Responsable du développement des compétences',
        codeCnp: '11200',
        salaireHoraire: 36.0,
        salaireMensuel: 5760,
        missions: [
          "Identifier les compétences à développer.",
          "Organiser les évaluations professionnelles.",
          "Élaborer les plans de progression.",
          "Coordonner les formations internes.",
          "Suivre les parcours professionnels.",
          "Mesurer les résultats des programmes de développement."
        ]
      }
    ]
  },
  {
    numero: '22',
    code: 'ENVIRONNEMENT_DEVELOPPEMENT_DURABLE',
    name: 'DÉPARTEMENT 22 – ENVIRONNEMENT ET DÉVELOPPEMENT DURABLE',
    description: 'Transition énergétique, réduction de l’empreinte carbone, tri des déchets et écoconduite.',
    postes: [
      {
        titre: 'Directeur environnemental',
        codeCnp: '20010',
        salaireHoraire: 50.0,
        salaireMensuel: 8000,
        missions: [
          "Définir la stratégie environnementale.",
          "Superviser les programmes de développement durable.",
          "Contrôler les impacts environnementaux.",
          "Coordonner les initiatives écologiques.",
          "Superviser les audits environnementaux.",
          "Présenter les résultats environnementaux."
        ]
      },
      {
        titre: 'Responsable environnement',
        codeCnp: '21110',
        salaireHoraire: 37.0,
        salaireMensuel: 5920,
        missions: [
          "Réaliser les évaluations environnementales.",
          "Contrôler la gestion des déchets.",
          "Suivre les mesures de réduction des émissions.",
          "Organiser les campagnes de sensibilisation.",
          "Vérifier le respect des exigences environnementales.",
          "Préparer les rapports environnementaux."
        ]
      },
      {
        titre: 'Technicien en environnement',
        codeCnp: '22101',
        salaireHoraire: 28.0,
        salaireMensuel: 4480,
        missions: [
          "Effectuer les inspections environnementales.",
          "Collecter les données sur les déchets et les émissions.",
          "Surveiller les dispositifs de traitement.",
          "Participer aux prélèvements et aux analyses.",
          "Signaler les anomalies environnementales.",
          "Préparer les fiches de contrôle."
        ]
      }
    ]
  },
  {
    numero: '23',
    code: 'RECHERCHE_INNOVATION_STRATEGIE',
    name: 'DÉPARTEMENT 23 – RECHERCHE, INNOVATION ET STRATÉGIE',
    description: 'Intelligence économique, analyse de données, modèles prédictifs et technologies de transport d’avenir.',
    postes: [
      {
        titre: 'Directeur de la stratégie',
        codeCnp: '10019',
        salaireHoraire: 56.0,
        salaireMensuel: 8960,
        missions: [
          "Définir les orientations stratégiques.",
          "Analyser les perspectives de développement.",
          "Évaluer les opportunités d'investissement.",
          "Superviser les études stratégiques.",
          "Coordonner les projets d'innovation.",
          "Conseiller la direction générale."
        ]
      },
      {
        titre: 'Analyste de données',
        codeCnp: '21223',
        salaireHoraire: 38.0,
        salaireMensuel: 6080,
        missions: [
          "Collecter les données opérationnelles.",
          "Nettoyer et organiser les bases de données.",
          "Analyser les tendances et les performances.",
          "Élaborer des tableaux de bord.",
          "Produire des rapports statistiques.",
          "Présenter les conclusions aux responsables."
        ]
      },
      {
        titre: "Chargé d'études économiques",
        codeCnp: '41401',
        salaireHoraire: 36.0,
        salaireMensuel: 5760,
        missions: [
          "Réaliser des études de marché.",
          "Analyser les tendances économiques.",
          "Évaluer les opportunités commerciales.",
          "Étudier les facteurs de compétitivité.",
          "Préparer des notes d'analyse.",
          "Formuler des recommandations stratégiques."
        ]
      }
    ]
  },
  {
    numero: '24',
    code: 'SERVICES_GENERAUX_INSTALLATIONS',
    name: 'DÉPARTEMENT 24 – SERVICES GÉNÉRAUX ET GESTION DES INSTALLATIONS',
    description: 'Gestion des bâtiments, logistique interne, fournitures de bureau et maintenance des locaux.',
    postes: [
      {
        titre: 'Directeur des services généraux',
        codeCnp: '10019',
        salaireHoraire: 46.0,
        salaireMensuel: 7360,
        missions: [
          "Superviser les services de soutien administratif.",
          "Organiser la gestion des installations.",
          "Contrôler les contrats de maintenance.",
          "Superviser les prestataires de services.",
          "Gérer les budgets des services généraux.",
          "Assurer la continuité des services internes."
        ]
      },
      {
        titre: 'Responsable des installations',
        codeCnp: '70012',
        salaireHoraire: 34.0,
        salaireMensuel: 5440,
        missions: [
          "Superviser l'entretien des bâtiments.",
          "Organiser les interventions techniques.",
          "Contrôler les équipements des locaux.",
          "Planifier les opérations de maintenance.",
          "Coordonner les prestataires.",
          "Signaler les dysfonctionnements."
        ]
      },
      {
        titre: 'Agent des services généraux',
        codeCnp: '65312',
        salaireHoraire: 24.0,
        salaireMensuel: 3840,
        missions: [
          "Assurer la distribution des fournitures.",
          "Participer à l'entretien des locaux.",
          "Préparer les salles de réunion.",
          "Effectuer les petites interventions de service.",
          "Signaler les besoins de maintenance.",
          "Assurer le suivi des demandes internes."
        ]
      }
    ]
  },
  {
    numero: '25',
    code: 'GESTION_DOCUMENTAIRE_ARCHIVAGE',
    name: 'DÉPARTEMENT 25 – GESTION DOCUMENTAIRE ET ARCHIVAGE',
    description: 'GED, archivage physique et numérique, traçabilité des dossiers de transport et conformité légale.',
    postes: [
      {
        titre: 'Directeur de la gestion documentaire',
        codeCnp: '10019',
        salaireHoraire: 47.0,
        salaireMensuel: 7520,
        missions: [
          "Définir la politique de gestion documentaire.",
          "Superviser les systèmes d'archivage.",
          "Garantir la traçabilité des documents.",
          "Contrôler les procédures de conservation.",
          "Superviser les équipes documentaires.",
          "Veiller au respect des règles de confidentialité."
        ]
      },
      {
        titre: 'Archiviste',
        codeCnp: '51111',
        salaireHoraire: 30.0,
        salaireMensuel: 4800,
        missions: [
          "Classer les documents administratifs.",
          "Organiser les archives physiques et numériques.",
          "Assurer la conservation des documents.",
          "Gérer les demandes de consultation.",
          "Actualiser les inventaires documentaires.",
          "Appliquer les règles de destruction autorisée."
        ]
      },
      {
        titre: 'Gestionnaire documentaire',
        codeCnp: '12111',
        salaireHoraire: 27.0,
        salaireMensuel: 4320,
        missions: [
          "Enregistrer les documents entrants.",
          "Contrôler les versions des documents.",
          "Organiser la circulation documentaire.",
          "Vérifier la conformité des dossiers.",
          "Assurer le classement numérique.",
          "Suivre les documents en attente de validation."
        ]
      }
    ]
  },
  {
    numero: '26',
    code: 'RELATIONS_PUBLIQUES_PARTENARIATS',
    name: 'DÉPARTEMENT 26 – RELATIONS PUBLIQUES ET PARTENARIATS',
    description: 'Relations institutionnelles, consulats, chambres de commerce et accords de coopération internationaux.',
    postes: [
      {
        titre: 'Directeur des relations institutionnelles',
        codeCnp: '10022',
        salaireHoraire: 50.0,
        salaireMensuel: 8000,
        missions: [
          "Définir la stratégie de relations institutionnelles.",
          "Représenter l'entreprise auprès des organismes partenaires.",
          "Développer les relations avec les institutions.",
          "Superviser les partenariats stratégiques.",
          "Organiser les rencontres institutionnelles.",
          "Conseiller la direction sur les relations externes."
        ]
      },
      {
        titre: 'Responsable des partenariats',
        codeCnp: '11202',
        salaireHoraire: 37.0,
        salaireMensuel: 5920,
        missions: [
          "Identifier les partenaires potentiels.",
          "Préparer les propositions de collaboration.",
          "Négocier les accords de partenariat.",
          "Coordonner les projets communs.",
          "Suivre les engagements des partenaires.",
          "Évaluer les résultats des collaborations."
        ]
      },
      {
        titre: 'Chargé des relations publiques',
        codeCnp: '11202',
        salaireHoraire: 30.0,
        salaireMensuel: 4800,
        missions: [
          "Organiser les activités de représentation.",
          "Préparer les communications institutionnelles.",
          "Entretenir les relations avec les parties prenantes.",
          "Participer à l'organisation des événements.",
          "Assurer le suivi des demandes externes.",
          "Produire les rapports d'activités."
        ]
      }
    ]
  },
  {
    numero: '27',
    code: 'GESTION_FLOTTES_PARCS_AUTOMOBILES',
    name: 'DÉPARTEMENT 27 – GESTION DES FLOTTES ET PARCS AUTOMOBILES',
    description: 'Renouvellement des tracteurs et remorques, télématique embarquée, carburant et conformité CVSE/BC.',
    postes: [
      {
        titre: 'Directeur de gestion de flotte',
        codeCnp: '70020',
        salaireHoraire: 52.0,
        salaireMensuel: 8320,
        missions: [
          "Définir la stratégie de gestion des véhicules.",
          "Superviser l'utilisation du parc automobile.",
          "Planifier le renouvellement des véhicules.",
          "Contrôler les coûts d'exploitation.",
          "Superviser les opérations de maintenance.",
          "Évaluer la disponibilité de la flotte."
        ]
      },
      {
        titre: 'Gestionnaire de flotte automobile',
        codeCnp: '72024',
        salaireHoraire: 35.0,
        salaireMensuel: 5600,
        missions: [
          "Suivre les affectations des véhicules.",
          "Contrôler les documents administratifs des véhicules.",
          "Planifier les entretiens périodiques.",
          "Suivre la consommation de carburant.",
          "Enregistrer les incidents et les réparations.",
          "Produire les rapports de gestion de flotte."
        ]
      },
      {
        titre: 'Responsable du parc automobile',
        codeCnp: '72024',
        salaireHoraire: 36.0,
        salaireMensuel: 5760,
        missions: [
          "Superviser les mouvements des véhicules.",
          "Organiser les contrôles techniques.",
          "Vérifier l'état général des véhicules.",
          "Coordonner les réparations.",
          "Gérer les disponibilités des véhicules.",
          "Suivre les dépenses d'entretien."
        ]
      }
    ]
  },
  {
    numero: '28',
    code: 'GESTION_STOCKS_DISTRIBUTION',
    name: 'DÉPARTEMENT 28 – GESTION DES STOCKS ET DISTRIBUTION',
    description: 'Contrôle des inventaires, rotation FIFO/FEFO, livraisons capillaires et expéditions B2B/B2C.',
    postes: [
      {
        titre: 'Directeur des stocks et de la distribution',
        codeCnp: '70020',
        salaireHoraire: 51.0,
        salaireMensuel: 8160,
        missions: [
          "Définir la politique de gestion des stocks.",
          "Superviser les opérations de distribution.",
          "Contrôler les niveaux de stock.",
          "Optimiser les circuits de distribution.",
          "Superviser les responsables d'entrepôt.",
          "Analyser les performances de distribution."
        ]
      },
      {
        titre: 'Responsable des stocks',
        codeCnp: '12102',
        salaireHoraire: 34.0,
        salaireMensuel: 5440,
        missions: [
          "Superviser les mouvements de marchandises.",
          "Contrôler les entrées et sorties.",
          "Organiser les inventaires périodiques.",
          "Identifier les écarts de stock.",
          "Veiller à la bonne conservation des produits.",
          "Préparer les rapports de stock."
        ]
      },
      {
        titre: 'Agent de distribution',
        codeCnp: '75101',
        salaireHoraire: 26.5,
        salaireMensuel: 4240,
        missions: [
          "Préparer les marchandises à distribuer.",
          "Vérifier les bons de livraison.",
          "Organiser les opérations de chargement.",
          "Suivre les livraisons.",
          "Signaler les anomalies de distribution.",
          "Confirmer la réception des marchandises."
        ]
      }
    ]
  },
  {
    numero: '29',
    code: 'OPERATIONS_MARITIMES_AERIENNES',
    name: 'DÉPARTEMENT 29 – GESTION DES OPÉRATIONS MARITIMES ET AÉRIENNES',
    description: 'Booking maritime conteneurs FCL/LCL, charters aériens cargo, connaissements et relations armateurs.',
    postes: [
      {
        titre: 'Directeur des opérations internationales',
        codeCnp: '70020',
        salaireHoraire: 56.0,
        salaireMensuel: 8960,
        missions: [
          "Superviser les opérations maritimes et aériennes.",
          "Coordonner les partenaires de transport international.",
          "Contrôler les délais d'expédition.",
          "Superviser les procédures documentaires.",
          "Gérer les incidents opérationnels internationaux.",
          "Évaluer les performances des opérations."
        ]
      },
      {
        titre: 'Agent de fret aérien',
        codeCnp: '13201',
        salaireHoraire: 32.0,
        salaireMensuel: 5120,
        missions: [
          "Organiser les réservations de fret aérien.",
          "Préparer les documents d'expédition.",
          "Coordonner les opérations avec les compagnies aériennes.",
          "Suivre les marchandises expédiées.",
          "Vérifier les informations de transport.",
          "Informer les clients de l'évolution des expéditions."
        ]
      },
      {
        titre: 'Agent de fret maritime',
        codeCnp: '13201',
        salaireHoraire: 32.0,
        salaireMensuel: 5120,
        missions: [
          "Organiser les réservations de transport maritime.",
          "Préparer les documents d'expédition.",
          "Coordonner les opérations avec les compagnies maritimes.",
          "Suivre les mouvements des conteneurs.",
          "Contrôler les échéances d'expédition.",
          "Assurer le suivi documentaire des opérations."
        ]
      }
    ]
  },
  {
    numero: '30',
    code: 'SERVICES_SPECIALISES_ACTIVITES_TECHNIQUES',
    name: 'DÉPARTEMENT 30 – GESTION DES SERVICES SPÉCIALISÉS ET ACTIVITÉS TECHNIQUES',
    description: 'Maintenance multitechnique des bâtiments, électronique, réseaux sanitaires et fluides industriels.',
    postes: [
      {
        titre: 'Directeur des services spécialisés',
        codeCnp: '70010',
        salaireHoraire: 50.0,
        salaireMensuel: 8000,
        missions: [
          "Définir les orientations des services techniques spécialisés.",
          "Identifier les besoins opérationnels spécifiques.",
          "Superviser les équipes de spécialistes.",
          "Organiser les interventions techniques.",
          "Contrôler la qualité des prestations spécialisées.",
          "Évaluer les performances des services."
        ]
      },
      {
        titre: 'Technicien polyvalent du bâtiment',
        codeCnp: '73200',
        salaireHoraire: 31.0,
        salaireMensuel: 4960,
        missions: [
          "Effectuer les travaux d'entretien des bâtiments.",
          "Réaliser les réparations courantes.",
          "Installer les équipements techniques.",
          "Diagnostiquer les dysfonctionnements.",
          "Assurer la maintenance préventive.",
          "Rédiger les rapports d'intervention."
        ]
      },
      {
        titre: 'Technicien en électronique',
        codeCnp: '22310',
        salaireHoraire: 33.5,
        salaireMensuel: 5360,
        missions: [
          "Installer les équipements électroniques.",
          "Diagnostiquer les pannes électroniques.",
          "Effectuer les réparations nécessaires.",
          "Contrôler le fonctionnement des équipements.",
          "Réaliser les opérations de maintenance.",
          "Rédiger les rapports techniques."
        ]
      },
      {
        titre: 'Plombier',
        codeCnp: '72300',
        salaireHoraire: 34.0,
        salaireMensuel: 5440,
        missions: [
          "Installer les équipements de plomberie.",
          "Réaliser les raccordements sanitaires.",
          "Détecter les fuites et les dysfonctionnements.",
          "Effectuer les réparations des installations.",
          "Assurer la maintenance des réseaux.",
          "Contrôler l'étanchéité des installations."
        ]
      }
    ]
  }
];
