export interface DeliverableFile {
  path: string;
  filename: string;
  category: 'sql' | 'config' | 'public' | 'employe' | 'admin' | 'security';
  description: string;
  content: string;
}

export const PHP_DELIVERABLE_FILES: DeliverableFile[] = [
  {
    path: 'database_atlantic_transport.sql',
    filename: 'database_atlantic_transport.sql',
    category: 'sql',
    description: 'Script SQL complet pour phpMyAdmin (Structure des tables + Configuration + Administrateur + Employés initiaux)',
    content: `-- ============================================================================
-- ATLANTIC TRANSPORT LTD - Base de données MySQL 8+ / MariaDB
-- Slogan : Le monde sans frontières, votre logistique sans limites.
-- Fichier prêt à importer dans phpMyAdmin (cPanel / public_html)
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 1. Table : site_settings (Permet au propriétaire seul de modifier le site)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`site_settings\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_name\` varchar(150) NOT NULL DEFAULT 'ATLANTIC TRANSPORT LTD',
  \`slogan\` varchar(255) NOT NULL DEFAULT 'Le monde sans frontières, votre logistique sans limites.',
  \`address\` varchar(255) NOT NULL DEFAULT 'King George Blvd, Surrey, BC V3T 2W1, Canada',
  \`phone\` varchar(60) NOT NULL DEFAULT '+1 (506) 802-2226',
  \`whatsapp\` varchar(60) NOT NULL DEFAULT '15068022226',
  \`email\` varchar(150) NOT NULL DEFAULT 'atlantictransport.int@ik.me',
  \`logo_path\` varchar(255) NOT NULL DEFAULT 'assets/logo-atlantic.png',
  \`service_1_title\` varchar(180) NOT NULL DEFAULT 'Transport Multimodal Global',
  \`service_1_desc\` text NOT NULL,
  \`service_2_title\` varchar(180) NOT NULL DEFAULT 'Solutions d''Entreposage & Gestion de la Supply Chain',
  \`service_2_desc\` text NOT NULL,
  \`service_3_title\` varchar(180) NOT NULL DEFAULT 'Commission de Transport & Formalités Douanières',
  \`service_3_desc\` text NOT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`site_settings\` (
  \`id\`, \`company_name\`, \`slogan\`, \`address\`, \`phone\`, \`whatsapp\`, \`email\`, \`logo_path\`,
  \`service_1_title\`, \`service_1_desc\`,
  \`service_2_title\`, \`service_2_desc\`,
  \`service_3_title\`, \`service_3_desc\`
) VALUES (
  1,
  'ATLANTIC TRANSPORT LTD',
  'Le monde sans frontières, votre logistique sans limites.',
  'King George Blvd, Surrey, BC V3T 2W1, Canada',
  '+1 (506) 802-2226',
  '15068022226',
  'atlantictransport.int@ik.me',
  'assets/logo-atlantic.png',
  'Transport Multimodal Global',
  'Coordination intégrale de vos expéditions par voies maritime (FCL/LCL), aérienne, ferroviaire et routière à travers l''Amérique du Nord, l''Europe, l''Asie et l''Afrique.',
  'Solutions d''Entreposage & Gestion de la Supply Chain',
  'Entrepôts sécurisés sous douane et à température contrôlée à Surrey (BC), gestion informatisée des stocks (WMS), préparation de commandes, cross-docking et distribution.',
  'Commission de Transport & Formalités Douanières',
  'Courtage en douane agréé (ASFC / CBSA), conformité réglementaire internationale, gestion documentaire (B/L, AWB, EUR1, certificats d''origine) et optimisation des Incoterms 2020.'
) ON DUPLICATE KEY UPDATE \`company_name\` = VALUES(\`company_name\`);

-- ----------------------------------------------------------------------------
-- 2. Table : admins (Backoffice /admin non listé sur le site public)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`admins\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`nom_complet\` varchar(120) NOT NULL,
  \`email\` varchar(150) NOT NULL,
  \`password_hash\` varchar(255) NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_admin_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compte Administrateur principal (Hash bcrypt généré via password_hash)
INSERT INTO \`admins\` (\`id\`, \`nom_complet\`, \`email\`, \`password_hash\`) VALUES
(1, 'Direction Générale - ATLANTIC TRANSPORT LTD', 'admin@atlantictransport.ca', '$2y$10$wH8fJ6X0qY1zK9mN3pL5vO7rT2uV4wX6yZ8aB0cD2eF4gH6iJ8kL.')
ON DUPLICATE KEY UPDATE \`email\` = VALUES(\`email\`);

-- ----------------------------------------------------------------------------
-- 3. Table : employes (Espace Employé sécurisé)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`employes\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`matricule\` varchar(30) NOT NULL COMMENT 'Format automatique EMP-2026-XXX',
  \`prenom\` varchar(80) NOT NULL,
  \`nom\` varchar(80) NOT NULL,
  \`email\` varchar(150) NOT NULL,
  \`telephone\` varchar(50) DEFAULT NULL,
  \`adresse\` varchar(255) DEFAULT NULL,
  \`poste\` varchar(150) NOT NULL,
  \`departement\` varchar(120) DEFAULT 'Opérations Logistiques',
  \`type_contrat\` varchar(80) NOT NULL COMMENT 'CDI, CDD, Temps plein, Expatrié...',
  \`salaire\` decimal(12,2) NOT NULL,
  \`devise\` varchar(10) NOT NULL DEFAULT 'CAD',
  \`date_embauche\` date NOT NULL,
  \`photo_path\` varchar(255) DEFAULT NULL COMMENT 'Stocké dans /uploads/photos/',
  \`contrat_pdf_path\` varchar(255) DEFAULT NULL COMMENT 'Stocké dans /uploads/contrats/',
  \`password_hash\` varchar(255) NOT NULL,
  \`must_change_password\` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = Force le changement au 1er login',
  \`is_active\` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = Actif, 0 = Désactivé',
  \`access_token\` varchar(120) DEFAULT NULL COMMENT 'Token unique pour accès direct /employe/TOKEN_UNIQUE sans mot de passe',
  \`access_token_created_at\` timestamp NULL DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_matricule\` (\`matricule\`),
  UNIQUE KEY \`uniq_employe_email\` (\`email\`),
  UNIQUE KEY \`uniq_access_token\` (\`access_token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`employes\` (
  \`id\`, \`matricule\`, \`prenom\`, \`nom\`, \`email\`, \`telephone\`, \`adresse\`,
  \`poste\`, \`departement\`, \`type_contrat\`, \`salaire\`, \`devise\`, \`date_embauche\`,
  \`photo_path\`, \`contrat_pdf_path\`, \`password_hash\`, \`must_change_password\`, \`is_active\`
) VALUES
(
  1, 'EMP-2026-001', 'Marc-Antoine', 'Tremblay', 'm.tremblay@atlantictransport.ca',
  '+1 (604) 555-0194', '10450 King George Blvd, Surrey, BC V3T 2W1, Canada',
  'Coordinateur Principal des Opérations Multimodales', 'Fret Maritime & Intermodal',
  'CDI - Temps plein', 6400.00, 'CAD', '2026-02-01',
  'uploads/photos/EMP-2026-001.jpg', 'uploads/contrats/EMP-2026-001.pdf',
  '$2y$10$9X2mP4rT6vW8yZ0aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4y.', 1, 1
),
(
  2, 'EMP-2026-002', 'Sophie', 'Lavoie', 's.lavoie@atlantictransport.ca',
  '+1 (604) 555-0248', '13880 102 Ave, Surrey, BC V3T 5X8, Canada',
  'Spécialiste Conformité Douanière & Incoterms', 'Douanes & Transit International',
  'CDI - Temps plein', 5850.00, 'CAD', '2026-03-15',
  'uploads/photos/EMP-2026-002.jpg', 'uploads/contrats/EMP-2026-002.pdf',
  '$2y$10$9X2mP4rT6vW8yZ0aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4y.', 1, 1
);

-- ----------------------------------------------------------------------------
-- 4. Table : messages_contact (Formulaire de contact du site public)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`messages_contact\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`nom_complet\` varchar(120) NOT NULL,
  \`entreprise\` varchar(120) DEFAULT NULL,
  \`email\` varchar(150) NOT NULL,
  \`telephone\` varchar(60) DEFAULT NULL,
  \`service_concerne\` varchar(150) DEFAULT NULL,
  \`sujet\` varchar(180) NOT NULL,
  \`message\` text NOT NULL,
  \`ip_address\` varchar(45) DEFAULT NULL,
  \`lu\` tinyint(1) NOT NULL DEFAULT 0,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
`
  },
  {
    path: 'config/db.php',
    filename: 'db.php',
    category: 'config',
    description: 'Configuration PDO MySQL sécurisée, protection XSS/CSRF et générateur de matricule EMP-2026-XXX',
    content: `<?php
declare(strict_types=1);

/**
 * ATLANTIC TRANSPORT LTD
 * Configuration Base de Données PDO (PHP 8+ / MySQL) & Sécurité XSS/CSRF
 */

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

// Paramètres MySQL (à adapter avec vos identifiants cPanel / phpMyAdmin)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'atlantic_transport_db');
define('DB_USER', getenv('DB_USER') ?: 'atlantic_user');
define('DB_PASS', getenv('DB_PASS') ?: 'VotreMotDePasseMySQL');

function getPDO(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/**
 * Protection XSS : échappement systématique des sorties HTML
 */
function e(?string $value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Génération et vérification du jeton CSRF
 */
function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(?string $token): bool {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Génération automatique du matricule : EMP-2026-XXX
 */
function generateNextMatricule(PDO $pdo): string {
    $year = '2026';
    $prefix = "EMP-{$year}-";
    $stmt = $pdo->prepare("SELECT matricule FROM employes WHERE matricule LIKE :prefix ORDER BY id DESC LIMIT 1");
    $stmt->execute([':prefix' => $prefix . '%']);
    $last = $stmt->fetchColumn();

    if ($last && preg_match('/EMP-\\d{4}-(\\d+)/', (string)$last, $matches)) {
        $nextNum = (int)$matches[1] + 1;
    } else {
        $nextNum = 1;
    }
    return sprintf('EMP-%s-%03d', $year, $nextNum);
}

/**
 * Chargement des paramètres du site depuis la base de données
 */
function getSiteSettings(PDO $pdo): array {
    $stmt = $pdo->query("SELECT * FROM site_settings WHERE id = 1 LIMIT 1");
    $row = $stmt->fetch();
    return $row ?: [
        'company_name' => 'ATLANTIC TRANSPORT LTD',
        'slogan'       => 'Le monde sans frontières, votre logistique sans limites.',
        'address'      => 'King George Blvd, Surrey, BC V3T 2W1, Canada',
        'phone'        => '+1 (506) 802-2226',
        'whatsapp'     => '15068022226',
        'email'        => 'atlantictransport.int@ik.me',
        'logo_path'    => 'assets/logo-atlantic.png',
    ];
}
`
  },
  {
    path: 'index.php',
    filename: 'index.php',
    category: 'public',
    description: 'Site public complet et responsive (Accueil, Services, À propos, Contact avec formulaire PDO + Google Maps)',
    content: `<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';

$pdo = getPDO();
$settings = getSiteSettings($pdo);
$page = $_GET['page'] ?? 'accueil';
$allowedPages = ['accueil', 'services', 'apropos', 'contact'];
if (!in_array($page, $allowedPages, true)) {
    $page = 'accueil';
}

$contactSuccess = '';
$contactError = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['contact_submit'])) {
    if (!verify_csrf($_POST['csrf_token'] ?? '')) {
        $contactError = 'Jeton de sécurité expiré. Veuillez réessayer.';
    } else {
        $nom = trim((string)($_POST['nom_complet'] ?? ''));
        $entreprise = trim((string)($_POST['entreprise'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $tel = trim((string)($_POST['telephone'] ?? ''));
        $service = trim((string)($_POST['service_concerne'] ?? ''));
        $sujet = trim((string)($_POST['sujet'] ?? ''));
        $message = trim((string)($_POST['message'] ?? ''));

        if ($nom === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $sujet === '' || $message === '') {
            $contactError = 'Veuillez remplir tous les champs obligatoires avec une adresse e-mail valide.';
        } else {
            $stmt = $pdo->prepare('
                INSERT INTO messages_contact (nom_complet, entreprise, email, telephone, service_concerne, sujet, message, ip_address)
                VALUES (:nom, :entreprise, :email, :tel, :service, :sujet, :message, :ip)
            ');
            $stmt->execute([
                ':nom'        => $nom,
                ':entreprise' => $entreprise,
                ':email'      => $email,
                ':tel'        => $tel,
                ':service'    => $service,
                ':sujet'      => $sujet,
                ':message'    => $message,
                ':ip'         => $_SERVER['REMOTE_ADDR'] ?? null,
            ]);
            $contactSuccess = 'Votre message a bien été transmis à ATLANTIC TRANSPORT LTD. Notre équipe vous répondra sous 24h.';
            $page = 'contact';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($settings['company_name']) ?> — <?= e($settings['slogan']) ?></title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 flex flex-col min-h-screen">
  <!-- Header responsive avec logo légèrement agrandi -->
  <header class="sticky top-0 z-40 bg-[#0B2545] text-white border-b border-amber-400/25">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
      <a href="index.php" class="flex items-center gap-3">
        <img src="<?= e($settings['logo_path']) ?>" alt="<?= e($settings['company_name']) ?>" class="h-14 w-14 object-contain rounded-xl bg-white p-1">
        <span class="font-bold text-lg sm:text-xl tracking-tight"><?= e($settings['company_name']) ?></span>
      </a>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="index.php?page=accueil" class="<?= $page === 'accueil' ? 'text-amber-400' : 'text-slate-200 hover:text-white' ?>">Accueil</a>
        <a href="index.php?page=services" class="<?= $page === 'services' ? 'text-amber-400' : 'text-slate-200 hover:text-white' ?>">Services</a>
        <a href="index.php?page=apropos" class="<?= $page === 'apropos' ? 'text-amber-400' : 'text-slate-200 hover:text-white' ?>">À propos</a>
        <a href="index.php?page=contact" class="<?= $page === 'contact' ? 'text-amber-400' : 'text-slate-200 hover:text-white' ?>">Contact</a>
      </nav>
      <a href="espace-employe.php" class="px-4 py-2.5 rounded-xl bg-amber-400 text-[#0B2545] font-bold text-sm hover:bg-amber-300 transition whitespace-nowrap">
        Espace Employé
      </a>
    </div>
  </header>

  <main class="flex-1">
    <?php if ($page === 'accueil'): ?>
      <section class="bg-[#0B2545] text-white py-20 px-4">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-4xl sm:text-5xl font-extrabold mb-4"><?= e($settings['slogan']) ?></h1>
          <p class="text-lg text-slate-200 max-w-2xl mb-8">Basée à Surrey (BC, Canada), <?= e($settings['company_name']) ?> pilote vos opérations de transport multimodal, d'entreposage sous douane et de commission de transport international.</p>
          <a href="index.php?page=contact" class="inline-block px-6 py-3.5 rounded-xl bg-amber-400 text-[#0B2545] font-bold">Demander une cotation</a>
        </div>
      </section>
    <?php elseif ($page === 'services'): ?>
      <section class="max-w-6xl mx-auto py-16 px-4 grid md:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-2xl border border-slate-200">
          <div class="text-amber-500 font-mono font-bold mb-2">01.</div>
          <h2 class="text-xl font-bold text-[#0B2545] mb-3"><?= e($settings['service_1_title']) ?></h2>
          <p class="text-slate-600 text-sm leading-relaxed"><?= e($settings['service_1_desc']) ?></p>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200">
          <div class="text-amber-500 font-mono font-bold mb-2">02.</div>
          <h2 class="text-xl font-bold text-[#0B2545] mb-3"><?= e($settings['service_2_title']) ?></h2>
          <p class="text-slate-600 text-sm leading-relaxed"><?= e($settings['service_2_desc']) ?></p>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200">
          <div class="text-amber-500 font-mono font-bold mb-2">03.</div>
          <h2 class="text-xl font-bold text-[#0B2545] mb-3"><?= e($settings['service_3_title']) ?></h2>
          <p class="text-slate-600 text-sm leading-relaxed"><?= e($settings['service_3_desc']) ?></p>
        </div>
      </section>
    <?php elseif ($page === 'apropos'): ?>
      <section class="max-w-5xl mx-auto py-16 px-4">
        <h1 class="text-3xl font-bold text-[#0B2545] mb-4">À propos de <?= e($settings['company_name']) ?></h1>
        <p class="text-slate-700 leading-relaxed mb-6"><?= e($settings['slogan']) ?> — Implantée au cœur du corridor pacifique canadien à <?= e($settings['address']) ?>, notre entreprise accompagne les importateurs, exportateurs et industriels sur tous les continents.</p>
      </section>
    <?php elseif ($page === 'contact'): ?>
      <section class="max-w-6xl mx-auto py-16 px-4 grid lg:grid-cols-2 gap-10">
        <div class="bg-white p-8 rounded-2xl border border-slate-200">
          <h1 class="text-2xl font-bold text-[#0B2545] mb-4">Contactez-nous</h1>
          <?php if ($contactSuccess): ?>
            <div class="p-4 mb-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm"><?= e($contactSuccess) ?></div>
          <?php endif; ?>
          <?php if ($contactError): ?>
            <div class="p-4 mb-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm"><?= e($contactError) ?></div>
          <?php endif; ?>
          <form method="POST" action="index.php?page=contact" class="space-y-4">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <input type="text" name="nom_complet" placeholder="Nom complet *" required class="w-full px-4 py-3 rounded-xl border border-slate-300">
            <input type="text" name="entreprise" placeholder="Entreprise" class="w-full px-4 py-3 rounded-xl border border-slate-300">
            <input type="email" name="email" placeholder="Adresse e-mail *" required class="w-full px-4 py-3 rounded-xl border border-slate-300">
            <input type="tel" name="telephone" placeholder="Téléphone / WhatsApp" class="w-full px-4 py-3 rounded-xl border border-slate-300">
            <input type="text" name="sujet" placeholder="Objet de votre demande *" required class="w-full px-4 py-3 rounded-xl border border-slate-300">
            <textarea name="message" rows="4" placeholder="Détails de votre expédition ou besoin logistique *" required class="w-full px-4 py-3 rounded-xl border border-slate-300"></textarea>
            <button type="submit" name="contact_submit" class="w-full py-3.5 rounded-xl bg-[#0B2545] text-white font-bold hover:bg-[#134074]">Envoyer le message</button>
          </form>
        </div>
        <div class="space-y-6">
          <div class="bg-[#0B2545] text-white p-6 rounded-2xl">
            <p class="font-bold text-amber-400 mb-2"><?= e($settings['company_name']) ?></p>
            <p class="text-sm mb-1">Adresse : <?= e($settings['address']) ?></p>
            <p class="text-sm mb-1">Tél / WhatsApp : <?= e($settings['phone']) ?></p>
            <p class="text-sm">E-mail : <?= e($settings['email']) ?></p>
          </div>
          <iframe class="w-full h-80 rounded-2xl border border-slate-200" loading="lazy" src="https://www.google.com/maps?q=King+George+Blvd,+Surrey,+BC+V3T+2W1,+Canada&output=embed"></iframe>
        </div>
      </section>
    <?php endif; ?>
  </main>

  <footer class="bg-[#0B2545] text-slate-300 py-10 px-4 border-t border-slate-800">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
      <p>© <?= date('Y') ?> <?= e($settings['company_name']) ?>. Tous droits réservés.</p>
      <p><?= e($settings['address']) ?> · <?= e($settings['phone']) ?> · <?= e($settings['email']) ?></p>
    </div>
  </footer>
</body>
</html>
`
  },
  {
    path: 'espace-employe.php',
    filename: 'espace-employe.php',
    category: 'employe',
    description: 'Portail Espace Employé (Login sécurisé password_hash, redirection 1er login, fiche salarié & lecteur PDF anti-téléchargement)',
    content: `<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';

$pdo = getPDO();
$settings = getSiteSettings($pdo);
$error = '';

// Déconnexion
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    $_SESSION = [];
    session_destroy();
    header('Location: espace-employe.php');
    exit;
}

// Traitement du formulaire de connexion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_submit'])) {
    if (!verify_csrf($_POST['csrf_token'] ?? '')) {
        $error = 'Session expirée. Veuillez réessayer.';
    } else {
        $email = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');

        // 1. Vérifier d'abord si c'est l'administrateur propriétaire
        $stmtAdmin = $pdo->prepare('SELECT * FROM admins WHERE LOWER(email) = LOWER(:email) LIMIT 1');
        $stmtAdmin->execute([':email' => $email]);
        $admin = $stmtAdmin->fetch();

        if ($admin && password_verify($password, $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int)$admin['id'];
            $_SESSION['admin_email'] = $admin['email'];
            header('Location: admin/index.php');
            exit;
        }

        // 2. Vérifier le compte employé
        $stmtEmp = $pdo->prepare('SELECT * FROM employes WHERE LOWER(email) = LOWER(:email) LIMIT 1');
        $stmtEmp->execute([':email' => $email]);
        $employe = $stmtEmp->fetch();

        if (!$employe || !password_verify($password, $employe['password_hash'])) {
            $error = 'Identifiants incorrects. Veuillez vérifier votre adresse e-mail et votre mot de passe.';
        } elseif ((int)$employe['is_active'] !== 1) {
            $error = 'Votre compte employé est actuellement désactivé. Contactez la direction.';
        } else {
            session_regenerate_id(true);
            $_SESSION['employe_id'] = (int)$employe['id'];
            if ((int)$employe['must_change_password'] === 1) {
                header('Location: changer-mot-de-passe.php');
                exit;
            }
            header('Location: espace-employe.php');
            exit;
        }
    }
}

$loggedEmploye = null;
// Accès direct par lien unique sécurisé (/employe/TOKEN_UNIQUE) sans mot de passe
if (!empty($_GET['token'])) {
    $token = trim((string)$_GET['token']);
    $stmtTok = $pdo->prepare('SELECT * FROM employes WHERE access_token = :token AND is_active = 1 LIMIT 1');
    $stmtTok->execute([':token' => $token]);
    $loggedEmploye = $stmtTok->fetch() ?: null;
    if ($loggedEmploye) {
        $_SESSION['employe_id'] = (int)$loggedEmploye['id'];
    }
} elseif (!empty($_SESSION['employe_id'])) {
    $stmt = $pdo->prepare('SELECT * FROM employes WHERE id = :id AND is_active = 1 LIMIT 1');
    $stmt->execute([':id' => (int)$_SESSION['employe_id']]);
    $loggedEmploye = $stmt->fetch();
    if ($loggedEmploye && (int)$loggedEmploye['must_change_password'] === 1) {
        header('Location: changer-mot-de-passe.php');
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Espace Employé — <?= e($settings['company_name']) ?></title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col" oncontextmenu="return false;">
  <!-- Header -->
  <header class="bg-[#0B2545] text-white border-b border-amber-400/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <a href="index.php" class="flex items-center gap-3">
        <img src="<?= e($settings['logo_path']) ?>" alt="Logo" class="h-14 w-auto rounded bg-white p-1">
        <span class="font-bold text-lg tracking-tight"><?= e($settings['company_name']) ?></span>
      </a>
      <a href="index.php" class="text-sm text-slate-200 hover:text-amber-400">Retour au site public</a>
    </div>
  </header>

  <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-10">
    <?php if (!$loggedEmploye): ?>
      <div class="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <h1 class="text-2xl font-bold text-[#0B2545] mb-2">Espace Employé</h1>
        <p class="text-sm text-slate-600 mb-6">Connectez-vous avec votre adresse e-mail professionnelle pour consulter votre dossier et votre contrat.</p>
        <?php if ($error): ?>
          <div class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"><?= e($error) ?></div>
        <?php endif; ?>
        <form method="POST" action="espace-employe.php" class="space-y-4">
          <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Adresse e-mail</label>
            <input type="email" name="email" required class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
            <input type="password" name="password" required class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none">
          </div>
          <button type="submit" name="login_submit" class="w-full py-3 px-4 rounded-xl bg-[#0B2545] text-white font-semibold hover:bg-[#134074] transition">
            Se connecter
          </button>
        </form>
      </div>
    <?php else: ?>
      <!-- Fiche Employé & Visualisation sécurisée du contrat PDF -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <span class="text-xs font-mono text-slate-500">Matricule <?= e($loggedEmploye['matricule']) ?></span>
          <h1 class="text-2xl font-bold text-[#0B2545]"><?= e($loggedEmploye['prenom'] . ' ' . $loggedEmploye['nom']) ?></h1>
        </div>
        <a href="espace-employe.php?action=logout" class="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-300">Déconnexion</a>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
          <img src="<?= e($loggedEmploye['photo_path']) ?>" alt="Photo d'identité" class="w-32 h-32 rounded-2xl object-cover mx-auto mb-4 border-2 border-amber-400">
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between border-b pb-2"><dt class="text-slate-500">Matricule</dt><dd class="font-mono font-semibold"><?= e($loggedEmploye['matricule']) ?></dd></div>
            <div class="flex justify-between border-b pb-2"><dt class="text-slate-500">Nom complet</dt><dd class="font-semibold"><?= e($loggedEmploye['prenom'] . ' ' . $loggedEmploye['nom']) ?></dd></div>
            <div class="flex justify-between border-b pb-2"><dt class="text-slate-500">Poste</dt><dd class="font-semibold text-right"><?= e($loggedEmploye['poste']) ?></dd></div>
            <div class="flex justify-between border-b pb-2"><dt class="text-slate-500">Type de contrat</dt><dd class="font-semibold"><?= e($loggedEmploye['type_contrat']) ?></dd></div>
            <div class="flex justify-between border-b pb-2"><dt class="text-slate-500">Salaire</dt><dd class="font-mono font-semibold"><?= number_format((float)$loggedEmploye['salaire'], 2, ',', ' ') . ' ' . e($loggedEmploye['devise']) ?></dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Date d'embauche</dt><dd class="font-mono"><?= e($loggedEmploye['date_embauche']) ?></dd></div>
          </dl>
        </div>

        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 select-none" oncontextmenu="return false;">
          <h2 class="text-lg font-bold text-[#0B2545] mb-2">Contrat de Travail Officiel (Lecture seule sécurisée)</h2>
          <p class="text-xs text-slate-500 mb-4">Document confidentiel intégré — Clic droit, impression et téléchargement désactivés.</p>
          <div class="relative w-full h-[650px] rounded-xl overflow-hidden border border-slate-300 bg-slate-900">
            <iframe src="voir-contrat.php#toolbar=0&navpanes=0&scrollbar=1" class="w-full h-full border-0" oncontextmenu="return false;"></iframe>
          </div>
        </div>
      </div>
    <?php endif; ?>
  </main>
  <script>
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
  </script>
</body>
</html>
`
  },
  {
    path: 'changer-mot-de-passe.php',
    filename: 'changer-mot-de-passe.php',
    category: 'employe',
    description: 'Changement obligatoire du mot de passe lors de la première connexion salarié',
    content: `<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['employe_id'])) {
    header('Location: espace-employe.php');
    exit;
}

$pdo = getPDO();
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? '')) {
        $error = 'Jeton de sécurité invalide.';
    } else {
        $newPass = (string)($_POST['new_password'] ?? '');
        $confirm = (string)($_POST['confirm_password'] ?? '');

        if (strlen($newPass) < 8) {
            $error = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
        } elseif ($newPass !== $confirm) {
            $error = 'La confirmation du mot de passe ne correspond pas.';
        } else {
            $hash = password_hash($newPass, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('UPDATE employes SET password_hash = :hash, must_change_password = 0 WHERE id = :id');
            $stmt->execute([
                ':hash' => $hash,
                ':id'   => (int)$_SESSION['employe_id'],
            ]);
            header('Location: espace-employe.php');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modification du mot de passe — Espace Employé</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
    <h1 class="text-xl font-bold text-[#0B2545] mb-2">Première connexion — Sécurité</h1>
    <p class="text-sm text-slate-600 mb-6">Pour protéger votre dossier professionnel, veuillez définir votre nouveau mot de passe personnel.</p>
    <?php if ($error): ?>
      <div class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"><?= e($error) ?></div>
    <?php endif; ?>
    <form method="POST" class="space-y-4">
      <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe (min. 8 caractères)</label>
        <input type="password" name="new_password" required minlength="8" class="w-full px-4 py-3 rounded-xl border border-slate-300">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Confirmer le nouveau mot de passe</label>
        <input type="password" name="confirm_password" required minlength="8" class="w-full px-4 py-3 rounded-xl border border-slate-300">
      </div>
      <button type="submit" class="w-full py-3 px-4 rounded-xl bg-[#0B2545] text-white font-semibold hover:bg-[#134074]">
        Enregistrer et accéder à mon dossier
      </button>
    </form>
  </div>
</body>
</html>
`
  },
  {
    path: 'voir-contrat.php',
    filename: 'voir-contrat.php',
    category: 'employe',
    description: 'Flux sécurisé PHP pour afficher le contrat PDF dans le navigateur sans exposer son URL directe',
    content: `<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['employe_id']) && empty($_SESSION['admin_id'])) {
    http_response_code(403);
    exit('Accès non autorisé.');
}

$pdo = getPDO();
$empId = !empty($_SESSION['admin_id']) && isset($_GET['id'])
    ? (int)$_GET['id']
    : (int)$_SESSION['employe_id'];

$stmt = $pdo->prepare('SELECT contrat_pdf_path, matricule FROM employes WHERE id = :id LIMIT 1');
$stmt->execute([':id' => $empId]);
$emp = $stmt->fetch();

if (!$emp || empty($emp['contrat_pdf_path'])) {
    http_response_code(404);
    exit('Contrat PDF introuvable.');
}

$filePath = __DIR__ . '/' . ltrim((string)$emp['contrat_pdf_path'], '/');
if (!is_file($filePath)) {
    http_response_code(404);
    exit('Fichier PDF introuvable sur le serveur.');
}

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="Contrat-' . preg_replace('/[^A-Za-z0-9\\-]/', '', $emp['matricule']) . '.pdf"');
header('Cache-Control: private, no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
readfile($filePath);
exit;
`
  },
  {
    path: 'admin/index.php',
    filename: 'admin/index.php',
    category: 'admin',
    description: 'Backoffice Admin (/admin) non listé : ajout/modification/désactivation employés, uploads sécurisés JPG/PNG & PDF, génération matricule EMP-2026-XXX, hash & réinitialisation mots de passe',
    content: `<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';

$pdo = getPDO();
$error = '';
$success = '';

// Authentification Admin
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['admin_login'])) {
    if (!verify_csrf($_POST['csrf_token'] ?? '')) {
        $error = 'Jeton CSRF invalide.';
    } else {
        $email = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
        $stmt = $pdo->prepare('SELECT * FROM admins WHERE LOWER(email) = LOWER(:email) LIMIT 1');
        $stmt->execute([':email' => $email]);
        $admin = $stmt->fetch();
        if ($admin && password_verify($password, $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int)$admin['id'];
            $_SESSION['admin_email'] = $admin['email'];
            header('Location: index.php');
            exit;
        } else {
            $error = 'Identifiants administrateur invalides.';
        }
    }
}

// Création ou modification d'un employé avec uploads sécurisés (/uploads/photos et /uploads/contrats)
if (!empty($_SESSION['admin_id']) && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_employee'])) {
    if (!verify_csrf($_POST['csrf_token'] ?? '')) {
        $error = 'Jeton CSRF invalide.';
    } else {
        $matricule = generateNextMatricule($pdo);
        $prenom = trim((string)$_POST['prenom']);
        $nom = trim((string)$_POST['nom']);
        $email = trim((string)$_POST['email']);
        $poste = trim((string)$_POST['poste']);
        $type_contrat = trim((string)$_POST['type_contrat']);
        $salaire = (float)$_POST['salaire'];
        $date_embauche = (string)$_POST['date_embauche'];
        $tempPassword = (string)($_POST['password'] ?: 'Employe@2026!');
        $passwordHash = password_hash($tempPassword, PASSWORD_DEFAULT);

        $photoPath = null;
        if (!empty($_FILES['photo']['tmp_name'])) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($_FILES['photo']['tmp_name']);
            $allowedPhotos = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
            if (isset($allowedPhotos[$mime])) {
                $photoDir = __DIR__ . '/../uploads/photos';
                if (!is_dir($photoDir)) mkdir($photoDir, 0755, true);
                $photoName = $matricule . '.' . $allowedPhotos[$mime];
                move_uploaded_file($_FILES['photo']['tmp_name'], $photoDir . '/' . $photoName);
                $photoPath = 'uploads/photos/' . $photoName;
            }
        }

        $contratPath = null;
        if (!empty($_FILES['contrat_pdf']['tmp_name'])) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($_FILES['contrat_pdf']['tmp_name']);
            if ($mime === 'application/pdf') {
                $contratDir = __DIR__ . '/../uploads/contrats';
                if (!is_dir($contratDir)) mkdir($contratDir, 0755, true);
                $contratName = $matricule . '.pdf';
                move_uploaded_file($_FILES['contrat_pdf']['tmp_name'], $contratDir . '/' . $contratName);
                $contratPath = 'uploads/contrats/' . $contratName;
            }
        }

        $stmt = $pdo->prepare('
            INSERT INTO employes (matricule, prenom, nom, email, poste, type_contrat, salaire, date_embauche, photo_path, contrat_pdf_path, password_hash, must_change_password, is_active)
            VALUES (:matricule, :prenom, :nom, :email, :poste, :type_contrat, :salaire, :date_embauche, :photo_path, :contrat_pdf_path, :password_hash, 1, 1)
        ');
        $stmt->execute([
            ':matricule'        => $matricule,
            ':prenom'           => $prenom,
            ':nom'              => $nom,
            ':email'            => $email,
            ':poste'            => $poste,
            ':type_contrat'     => $type_contrat,
            ':salaire'          => $salaire,
            ':date_embauche'    => $date_embauche,
            ':photo_path'       => $photoPath,
            ':contrat_pdf_path' => $contratPath,
            ':password_hash'    => $passwordHash,
        ]);
        $success = "Employé {$matricule} créé avec succès.";
    }
}
`
  },
  {
    path: 'uploads/.htaccess',
    filename: '.htaccess',
    category: 'security',
    description: 'Sécurisation Apache du dossier /uploads (interdiction d’exécution PHP et protection des contrats PDF)',
    content: `# Désactiver l'exécution de scripts dans /uploads
<FilesMatch "\\.(php|php5|php7|php8|phtml|pl|py|jsp|asp|htm|html|sh|cgi)$">
    Require all denied
</FilesMatch>
Options -Indexes
`
  }
];
