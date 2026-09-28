import React, { useState, useEffect } from 'react';
import { Employee, PublicPage, SiteSettings } from './types';
import { Header, Footer } from './components/LayoutChrome';
import { PublicPages } from './components/PublicPages';
import { EmployeePortal } from './components/EmployeePortal';
import { AdminBackoffice } from './components/AdminBackoffice';

const DEFAULT_SETTINGS: SiteSettings = {
  company_name: 'ATLANTIC TRANSPORT LTD',
  slogan: 'Le monde sans frontières, votre logistique sans limites.',
  address: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
  phone: '+1 (506) 802-2226',
  whatsapp: '15068022226',
  email: 'atlantictransport.int@ik.me',
  logo_url: '',
  services: [
    {
      id: 'multimodal',
      number: '01',
      title: 'Transport Multimodal Global',
      subtitle: 'Fret Maritime, Aérien, Ferroviaire & Routier International',
      description:
        'Coordination intégrale de vos flux de marchandises de bout en bout. Nous combinons la puissance du fret maritime (conteneurs complets FCL et groupage LCL), la rapidité du fret aérien express et la flexibilité du transport intermodal rail-route à travers le Canada, les États-Unis, l’Europe, l’Asie et l’Afrique.',
      highlights: [
        'Conteneurs complets (FCL 20’/40’/40’HC), groupage (LCL) et équipements spéciaux (Reefer, Flat Rack)',
        'Corridors prioritaires Amérique du Nord (Vancouver/Surrey, Montréal, Halifax) ↔ Europe & Asie',
        'Fret aérien cargo express et affrètement dédié pour marchandises critiques ou périssables',
        'Traçabilité complète des expéditions et suivi proactif des jalons de transit'
      ]
    },
    {
      id: 'warehousing',
      number: '02',
      title: "Solutions d'Entreposage & Gestion de la Supply Chain",
      subtitle: 'Plateformes Logistiques Sécurisées, Cross-Docking & Distribution 3PL/4PL',
      description:
        'Optimisez vos stocks et réduisez vos délais de livraison grâce à nos infrastructures d’entreposage stratégiques basées en Colombie-Britannique. Nos entrepôts sous douane et à température contrôlée assurent une gestion rigoureuse de votre chaîne d’approvisionnement.',
      highlights: [
        'Entreposage sécurisé 24/7 sous vidéosurveillance et zones sous douane (Bonded Warehouse)',
        'Gestion informatisée des stocks (WMS), contrôle qualité, palettisation et étiquetage',
        'Opérations de Cross-Docking, dépotage de conteneurs et préparation de commandes B2B/B2C',
        'Planification de la Supply Chain et distribution capillaire sur toute l’Amérique du Nord'
      ]
    },
    {
      id: 'customs',
      number: '03',
      title: 'Commission de Transport & Formalités Douanières',
      subtitle: 'Courtage en Douane, Conformité Réglementaire & Ingénierie Documentaire',
      description:
        'Franchissez les frontières sans retard ni pénalité. En tant que commissionnaire de transport et expert en formalités douanières, ATLANTIC TRANSPORT LTD sécurise chaque déclaration d’importation et d’exportation auprès de l’ASFC (CBSA) et des autorités douanières internationales.',
      highlights: [
        'Dédouanement import/export rapide auprès de l’ASFC (Agence des services frontaliers du Canada)',
        'Gestion complète des liasses documentaires : Connaissements (B/L), LTA (AWB), Certificats d’origine, EUR1',
        'Conseil stratégique sur les Incoterms® 2020, classement tarifaire SH (HS Code) et droits de douane',
        'Conformité sanitaire, phytosanitaire (ACIA/CFIA) et gestion des marchandises réglementées (IMDG/IATA)'
      ]
    }
  ]
};

function extractDirectTokenFromUrl(): string | null {
  const path = window.location.pathname;
  const matchPath = path.match(/^\/employe\/([a-zA-Z0-9_-]+)\/?$/i);
  if (matchPath && matchPath[1]) {
    return matchPath[1];
  }
  const hash = window.location.hash;
  const matchHash = hash.match(/^#\/?employe\/([a-zA-Z0-9_-]+)\/?$/i);
  if (matchHash && matchHash[1]) {
    return matchHash[1];
  }
  return null;
}

function resolveInitialPage(): PublicPage {
  if (extractDirectTokenFromUrl()) {
    return 'espace-employe';
  }
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (path === '/admin' || path.startsWith('/admin/') || hash === '#/admin' || hash === '#admin') {
    return 'admin';
  }
  if (path === '/espace-employe' || hash === '#espace-employe') {
    return 'espace-employe';
  }
  if (path === '/services' || hash === '#services') {
    return 'services';
  }
  if (path === '/apropos' || hash === '#apropos') {
    return 'apropos';
  }
  if (path === '/contact' || hash === '#contact') {
    return 'contact';
  }
  return 'accueil';
}

export default function App() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [currentPage, setCurrentPage] = useState<PublicPage>(resolveInitialPage);
  const [selectedServiceForQuote, setSelectedServiceForQuote] = useState<string | undefined>(undefined);
  const [directAccessToken, setDirectAccessToken] = useState<string | null>(extractDirectTokenFromUrl);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);

  // Employee session
  const [employeeToken, setEmployeeToken] = useState<string | null>(() =>
    sessionStorage.getItem('atlantic_emp_token')
  );
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Admin session
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    sessionStorage.getItem('atlantic_admin_token')
  );

  // Load site settings from backend
  useEffect(() => {
    fetch('/api/site')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_SETTINGS
      });
  }, []);

  // Restore employee profile if token exists
  useEffect(() => {
    if (!employeeToken) return;
    fetch('/api/employee/me', {
      headers: { Authorization: `Bearer ${employeeToken}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid session');
        return res.json();
      })
      .then((data) => {
        if (data?.employee) {
          setEmployee(data.employee);
        }
      })
      .catch(() => {
        sessionStorage.removeItem('atlantic_emp_token');
        setEmployeeToken(null);
        setEmployee(null);
      });
  }, [employeeToken]);

  // Listen to browser popstate & owner keyboard shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const handlePopState = () => {
      setDirectAccessToken(extractDirectTokenFromUrl());
      setCurrentPage(resolveInitialPage());
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsEmployeeModalOpen(false);
        navigateTo('admin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navigateTo = (page: PublicPage, prefillService?: string) => {
    if (prefillService) {
      setSelectedServiceForQuote(prefillService);
    }
    if (page !== 'espace-employe') {
      setDirectAccessToken(null);
    }
    setCurrentPage(page);
    try {
      const nextUrl = page === 'accueil' ? '/' : `/${page}`;
      window.history.pushState({}, '', nextUrl);
    } catch {
      // Ignore history push errors in restricted sandboxes
    }
  };

  const handleOpenDirectEmployeeLink = (token: string) => {
    setDirectAccessToken(token);
    setIsEmployeeModalOpen(false);
    setCurrentPage('espace-employe');
    try {
      window.history.pushState({}, '', `/employe/${token}`);
    } catch {
      // Ignore history push errors in restricted sandboxes
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmployeeAuthenticated = (token: string, emp: Employee) => {
    sessionStorage.setItem('atlantic_emp_token', token);
    setEmployeeToken(token);
    setEmployee(emp);
  };

  const handleEmployeeLogout = () => {
    if (employeeToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${employeeToken}` }
      }).catch(() => {});
    }
    sessionStorage.removeItem('atlantic_emp_token');
    setEmployeeToken(null);
    setEmployee(null);
    setDirectAccessToken(null);
  };

  const handleAdminAuthenticated = (token: string) => {
    sessionStorage.setItem('atlantic_admin_token', token);
    setAdminToken(token);
    setIsEmployeeModalOpen(false);
    navigateTo('admin');
  };

  const handleAdminLogout = () => {
    if (adminToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      }).catch(() => {});
    }
    sessionStorage.removeItem('atlantic_admin_token');
    setAdminToken(null);
    navigateTo('accueil');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-gray-900">
      <Header
        settings={settings}
        currentPage={currentPage}
        onNavigate={(page) => navigateTo(page)}
        onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
        isEmployeeLoggedIn={Boolean((employee && employeeToken) || directAccessToken)}
      />

      <main className="flex-1">
        {currentPage === 'admin' ? (
          <AdminBackoffice
            settings={settings}
            adminToken={adminToken}
            onAdminAuthenticated={handleAdminAuthenticated}
            onAdminLogout={handleAdminLogout}
            onSettingsUpdated={(updated) => setSettings(updated)}
            onBackToSite={() => navigateTo('accueil')}
            onOpenDirectEmployeeLink={handleOpenDirectEmployeeLink}
          />
        ) : currentPage === 'espace-employe' ? (
          <EmployeePortal
            settings={settings}
            employeeToken={employeeToken}
            employee={employee}
            directAccessToken={directAccessToken}
            onEmployeeAuthenticated={handleEmployeeAuthenticated}
            onEmployeeLogout={handleEmployeeLogout}
            onAdminAuthenticated={handleAdminAuthenticated}
            onCloseModal={() => navigateTo('accueil')}
          />
        ) : (
          <PublicPages
            page={currentPage}
            settings={settings}
            onNavigate={navigateTo}
            selectedServiceForQuote={selectedServiceForQuote}
          />
        )}
      </main>

      {/* Modal "Espace Employé" intact lorsqu'on clique sur "Espace Employé" dans le header ou footer */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-6xl my-auto">
            <EmployeePortal
              settings={settings}
              employeeToken={employeeToken}
              employee={employee}
              directAccessToken={null}
              onEmployeeAuthenticated={handleEmployeeAuthenticated}
              onEmployeeLogout={handleEmployeeLogout}
              onAdminAuthenticated={handleAdminAuthenticated}
              onCloseModal={() => setIsEmployeeModalOpen(false)}
            />
          </div>
        </div>
      )}

      <Footer
        settings={settings}
        onNavigate={(page) => navigateTo(page)}
        onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
        onSecretAdminTrigger={() => navigateTo('admin')}
      />
    </div>
  );
}
