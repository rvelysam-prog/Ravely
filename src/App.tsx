import React, { useState, useEffect, useMemo } from 'react';
import { Employee, PublicPage, SiteSettings } from './types';
import { Header, Footer } from './components/LayoutChrome';
import { PublicPages } from './components/PublicPages';
import { EmployeePortal } from './components/EmployeePortal';
import { AdminBackoffice } from './components/AdminBackoffice';
import { PublicDocumentViewer } from './components/PublicDocumentViewer';
import { NosOffresPage } from './components/NosOffresPage';
import { EntretienEmbauchePage } from './components/EntretienEmbauchePage';
import {
  getEmployees,
  getSiteSettings,
  syncFromStaticEmployesJson
} from './services/staticStorage';
import {
  detectSiteContext,
  filterSettingsForSite,
  setStoredSiteContext,
  getAdminSession,
  clearAdminSession,
  SiteContext,
  AdminAuthSession
} from './services/multisiteService';
import { SecretaireAdminBackoffice } from './components/admin/SecretaireAdminBackoffice';

function extractPublicDocIdFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryDoc = params.get('doc') || params.get('document');
    if (queryDoc && queryDoc.trim().length > 0) {
      return queryDoc.trim();
    }
  } catch {
    // Ignore URLSearchParams errors
  }

  const hash = window.location.hash;
  const matchHash = hash.match(/[#&?]doc\/([a-zA-Z0-9_-]+)/i) || hash.match(/[?&]doc=([a-zA-Z0-9_-]+)/i);
  if (matchHash && matchHash[1]) {
    return matchHash[1];
  }

  return null;
}

function extractDirectTokenFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token') || params.get('id');
    if (queryToken && queryToken.trim().length > 0) {
      return queryToken.trim();
    }
  } catch {
    // Ignore URLSearchParams errors
  }

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

  const matchHashQuery = hash.match(/[?&](?:token|id)=([a-zA-Z0-9_-]+)/i);
  if (matchHashQuery && matchHashQuery[1]) {
    return matchHashQuery[1];
  }

  return null;
}

function resolveInitialPage(): PublicPage {
  if (extractDirectTokenFromUrl()) {
    return 'espace-employe';
  }
  const entryAttr = document.body?.dataset?.entry;
  if (entryAttr === 'admin') {
    return 'admin';
  }
  if (entryAttr === 'employe') {
    return 'espace-employe';
  }

  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (
    path === '/admin' ||
    path === '/admin.html' ||
    path.startsWith('/admin/') ||
    path === '/secretariat/admin' ||
    path.startsWith('/secretariat/admin/') ||
    hash === '#/admin' ||
    hash === '#admin' ||
    hash.includes('secretariat/admin') ||
    hash.startsWith('#/admin/') ||
    hash.startsWith('#admin/')
  ) {
    return 'admin';
  }
  if (
    path === '/employe.html' ||
    path === '/employe' ||
    path === '/espace-employe' ||
    hash === '#espace-employe' ||
    hash === '#employe'
  ) {
    return 'espace-employe';
  }
  if (
    path === '/offres' ||
    path === '/nos-offres' ||
    path.startsWith('/offres/') ||
    hash === '#offres' ||
    hash === '#nos-offres' ||
    path.includes('/secretariat/offres')
  ) {
    return 'nos-offres';
  }
  if (
    path === '/entretien' ||
    path === '/entretien-embauche' ||
    path.startsWith('/entretien/') ||
    hash === '#entretien' ||
    hash.startsWith('#entretien') ||
    path.includes('/secretariat/entretien')
  ) {
    return 'entretien';
  }
  if (path === '/services' || hash === '#services' || path.includes('/secretariat/services')) {
    return 'services';
  }
  if (path === '/apropos' || hash === '#apropos' || path.includes('/secretariat/apropos')) {
    return 'apropos';
  }
  if (path === '/contact' || hash === '#contact' || path.includes('/secretariat/contact')) {
    return 'contact';
  }
  return 'accueil';
}

export default function App() {
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings());
  const [currentPage, setCurrentPage] = useState<PublicPage>(resolveInitialPage);
  const [selectedServiceForQuote, setSelectedServiceForQuote] = useState<string | undefined>(undefined);
  const [publicDocId, setPublicDocId] = useState<string | null>(extractPublicDocIdFromUrl);
  const [directAccessToken, setDirectAccessToken] = useState<string | null>(extractDirectTokenFromUrl);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);

  // Contexte Multisite (Option 2) : 'main' (Site Principal RH) vs 'secretariat' (Secrétariat)
  const [siteContext, setSiteContext] = useState<SiteContext>(() => detectSiteContext());

  // Session Administrateur Multisite (Super Admin RH ou Secrétaire)
  const [adminSession, setAdminSession] = useState<AdminAuthSession | null>(() => getAdminSession());

  // SÉCURITÉ & ÉTANCHÉITÉ TOTALE AU NIVEAU DE L'ÉTAT ET DU RENDU :
  // Quand siteContext === 'secretariat', le numéro principal (+15068022206) et les deux emails ik.me
  // sont complètement vidés et supprimés de l'arbre mémoire, jamais transmis aux composants.
  const filteredSettings = useMemo(() => {
    return filterSettingsForSite(settings, siteContext);
  }, [settings, siteContext]);

  // Employee session in pure JS
  const [employeeToken, setEmployeeToken] = useState<string | null>(() =>
    sessionStorage.getItem('atlantic_emp_token')
  );
  const [employee, setEmployee] = useState<Employee | null>(() => {
    try {
      const savedEmpId = sessionStorage.getItem('atlantic_emp_id');
      if (!savedEmpId) return null;
      const list = getEmployees();
      return list.find((e) => String(e.id) === savedEmpId && e.is_active) || null;
    } catch {
      return null;
    }
  });

  // Admin session in pure JS
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    sessionStorage.getItem('atlantic_admin_token')
  );

  // Seed localStorage from /employes.json on first load (100% static)
  useEffect(() => {
    syncFromStaticEmployesJson().then(() => {
      const savedEmpId = sessionStorage.getItem('atlantic_emp_id');
      if (savedEmpId) {
        const list = getEmployees();
        const found = list.find((e) => String(e.id) === savedEmpId && e.is_active);
        if (found) setEmployee(found);
      }
    });
  }, []);

  // Listen to browser popstate & owner keyboard shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const handlePopState = () => {
      setPublicDocId(extractPublicDocIdFromUrl());
      setDirectAccessToken(extractDirectTokenFromUrl());
      setSiteContext(detectSiteContext());
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

  const handleSwitchSite = (newSite: SiteContext) => {
    setStoredSiteContext(newSite);
    setSiteContext(newSite);
    try {
      const url = new URL(window.location.href);
      if (newSite === 'secretariat') {
        url.searchParams.set('site', 'secretariat');
      } else {
        url.searchParams.delete('site');
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // Ignore URL history errors in sandboxes
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateTo = (page: PublicPage, prefillService?: string) => {
    if (prefillService) {
      setSelectedServiceForQuote(prefillService);
    }
    if (page !== 'espace-employe') {
      setDirectAccessToken(null);
    }
    setCurrentPage(page);
    try {
      const isSec = siteContext === 'secretariat';
      if (page === 'admin') {
        if (!window.location.pathname.toLowerCase().startsWith('/admin/promesse-embauche')) {
          window.history.pushState({}, '', isSec ? '/secretariat/admin' : '/admin.html');
        }
      } else if (page === 'espace-employe') {
        window.history.pushState({}, '', '/employe.html');
      } else {
        const nextUrl = page === 'accueil' ? (isSec ? '/secretariat' : '/') : (isSec ? `/secretariat/${page}` : `/${page}`);
        window.history.pushState({}, '', nextUrl);
      }
    } catch {
      // Ignore history push errors in restricted sandboxes
    }
  };

  const handleOpenDirectEmployeeLink = (tokenOrId: string) => {
    setDirectAccessToken(tokenOrId);
    setIsEmployeeModalOpen(false);
    setCurrentPage('espace-employe');
    try {
      const paramName = /^EMP-[A-Z0-9]+-[A-Z0-9]+$/i.test(tokenOrId) ? 'id' : 'token';
      window.history.pushState(
        {},
        '',
        `/employe.html?${paramName}=${encodeURIComponent(tokenOrId)}`
      );
    } catch {
      // Ignore history push errors in restricted sandboxes
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmployeeAuthenticated = (token: string, emp: Employee) => {
    sessionStorage.setItem('atlantic_emp_token', token);
    sessionStorage.setItem('atlantic_emp_id', String(emp.id));
    setEmployeeToken(token);
    setEmployee(emp);
  };

  const handleEmployeeLogout = () => {
    sessionStorage.removeItem('atlantic_emp_token');
    sessionStorage.removeItem('atlantic_emp_id');
    setEmployeeToken(null);
    setEmployee(null);
    setDirectAccessToken(null);
  };

  const handleAdminAuthenticated = (token: string, session?: AdminAuthSession) => {
    sessionStorage.setItem('atlantic_admin_token', token);
    setAdminToken(token);
    if (session) {
      setAdminSession(session);
    } else {
      setAdminSession(getAdminSession());
    }
    setIsEmployeeModalOpen(false);
    navigateTo('admin');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('atlantic_admin_token');
    clearAdminSession();
    setAdminToken(null);
    setAdminSession(null);
    navigateTo('accueil');
  };

  if (publicDocId) {
    return (
      <PublicDocumentViewer
        documentId={publicDocId}
        onBackToHome={() => {
          setPublicDocId(null);
          try {
            window.history.pushState({}, '', '/');
          } catch {
            // Ignore pushState errors
          }
          navigateTo('accueil');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-gray-900">
      <Header
        settings={filteredSettings}
        currentPage={currentPage}
        onNavigate={(page) => navigateTo(page)}
        onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
        isEmployeeLoggedIn={Boolean((employee && employeeToken) || directAccessToken)}
        siteContext={siteContext}
        onSwitchSite={handleSwitchSite}
      />

      <main className="flex-1">
        {currentPage === 'admin' ? (
          // Espace Administration avec contrôle strict des rôles & multisite
          adminToken && adminSession?.role === 'secretaire' ? (
            <SecretaireAdminBackoffice
              settings={filteredSettings}
              session={adminSession}
              onLogout={handleAdminLogout}
              onBackToSite={() => navigateTo('accueil')}
            />
          ) : adminToken && adminSession?.role === 'super_admin_rh' && siteContext === 'secretariat' ? (
            // Super Admin RH accédant au Secrétariat : vue dédiée avec option de retour RH
            <SecretaireAdminBackoffice
              settings={filteredSettings}
              session={adminSession}
              onLogout={handleAdminLogout}
              onBackToSite={() => navigateTo('accueil')}
              onSwitchToRhBackoffice={() => handleSwitchSite('main')}
            />
          ) : (
            <AdminBackoffice
              settings={filteredSettings}
              adminToken={adminToken}
              onAdminAuthenticated={handleAdminAuthenticated}
              onAdminLogout={handleAdminLogout}
              onSettingsUpdated={(updated) => setSettings(updated)}
              onBackToSite={() => navigateTo('accueil')}
              onOpenDirectEmployeeLink={handleOpenDirectEmployeeLink}
              siteContext={siteContext}
              onSwitchSite={handleSwitchSite}
              adminSession={adminSession}
            />
          )
        ) : currentPage === 'espace-employe' ? (
          <EmployeePortal
            settings={filteredSettings}
            employeeToken={employeeToken}
            employee={employee}
            directAccessToken={directAccessToken}
            onEmployeeAuthenticated={handleEmployeeAuthenticated}
            onEmployeeLogout={handleEmployeeLogout}
            onAdminAuthenticated={handleAdminAuthenticated}
            onCloseModal={() => navigateTo('accueil')}
          />
        ) : currentPage === 'nos-offres' ? (
          <NosOffresPage
            settings={filteredSettings}
            onNavigate={navigateTo}
          />
        ) : currentPage === 'entretien' ? (
          <EntretienEmbauchePage
            settings={filteredSettings}
            onNavigate={navigateTo}
          />
        ) : (
          <PublicPages
            page={currentPage}
            settings={filteredSettings}
            onNavigate={navigateTo}
            selectedServiceForQuote={selectedServiceForQuote}
          />
        )}
      </main>

      {/* Modal "Espace Employé" intact */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-6xl my-auto">
            <EmployeePortal
              settings={filteredSettings}
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
        settings={filteredSettings}
        onNavigate={(page) => navigateTo(page)}
        onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
        onSecretAdminTrigger={() => navigateTo('admin')}
        siteContext={siteContext}
        onSwitchSite={handleSwitchSite}
      />
    </div>
  );
}
