import React, { useState, useEffect } from 'react';
import { Employee, PublicPage, SiteSettings } from './types';
import { Header, Footer } from './components/LayoutChrome';
import { PublicPages } from './components/PublicPages';
import { EmployeePortal } from './components/EmployeePortal';
import { AdminBackoffice } from './components/AdminBackoffice';
import {
  getEmployees,
  getSiteSettings,
  syncFromStaticEmployesJson
} from './services/staticStorage';

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
    hash === '#/admin' ||
    hash === '#admin' ||
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
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings());
  const [currentPage, setCurrentPage] = useState<PublicPage>(resolveInitialPage);
  const [selectedServiceForQuote, setSelectedServiceForQuote] = useState<string | undefined>(undefined);
  const [directAccessToken, setDirectAccessToken] = useState<string | null>(extractDirectTokenFromUrl);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);

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
      if (page === 'admin') {
        if (!window.location.pathname.toLowerCase().startsWith('/admin/promesse-embauche')) {
          window.history.pushState({}, '', '/admin.html');
        }
      } else if (page === 'espace-employe') {
        window.history.pushState({}, '', '/employe.html');
      } else {
        const nextUrl = page === 'accueil' ? '/' : `/${page}`;
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

  const handleAdminAuthenticated = (token: string) => {
    sessionStorage.setItem('atlantic_admin_token', token);
    setAdminToken(token);
    setIsEmployeeModalOpen(false);
    navigateTo('admin');
  };

  const handleAdminLogout = () => {
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
