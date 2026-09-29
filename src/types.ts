export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
}

export interface SiteSettings {
  company_name: string;
  slogan: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  logo_url: string;
  services: ServiceItem[];
}

export interface Employee {
  id: number;
  firestore_id?: string;
  matricule: string;
  civilite: 'Monsieur' | 'Madame';
  nom_complet: string;
  prenom: string;
  nom: string;
  email: string;
  password?: string;
  telephone: string;
  adresse: string;
  date_naissance: string;
  nationalite: string;
  poste: string;
  departement: string;
  type_contrat: 'CDI' | 'CDD' | string;
  date_effet: string;
  date_embauche: string;
  date_fin_cdd?: string;
  duree_periode_essai: string;
  lieu_travail: string;
  horaires: string;
  salaire: number;
  devise: string;
  hebergement_fourni: boolean;
  hebergement_duree_type?: 'duree_precise' | 'toute_duree_contrat';
  hebergement_nombre_mois?: number;
  hebergement_lieu_type?: 'preciser_lieu' | 'texte_generique';
  adresse_hebergement?: string;
  date_signature?: string;
  // Champs spécifiques Promesse d'embauche
  sexe?: 'Féminin' | 'Masculin' | string;
  numero_piece_identite?: string;
  contact_urgence?: string;
  manager?: string;
  date_fin?: string;
  salaire_horaire?: number;
  primes?: string;
  mode_paiement?: string;
  ni?: string;
  responsabilites?: string[];
  promesse_type_contrat_label?: string;
  // Champ "photo" stocké en base64 dans employes.json (et photo_url conservé en alias)
  photo: string;
  photo_url: string;
  contrat_pdf_url: string;
  has_custom_pdf: boolean;
  must_change_password: boolean;
  is_active: boolean;
  access_token?: string | null;
  access_token_created_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: number;
  nom_complet: string;
  entreprise: string;
  email: string;
  telephone: string;
  service_concerne: string;
  sujet: string;
  message: string;
  lu: boolean;
  created_at: string;
}

export type PublicPage = 'accueil' | 'services' | 'apropos' | 'contact' | 'espace-employe' | 'admin';
