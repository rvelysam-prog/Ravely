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
  matricule: string;
  prenom: string;
  nom: string;
  email: string;
  password?: string;
  telephone: string;
  adresse: string;
  poste: string;
  departement: string;
  type_contrat: string;
  salaire: number;
  devise: string;
  date_embauche: string;
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
