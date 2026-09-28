import React, { useState } from 'react';

interface BrandLogoProps {
  customLogoUrl?: string;
  companyName: string;
  size?: 'header' | 'footer' | 'card';
}

/**
 * Reproduction vectorielle haute précision du logo officiel téléversé "Atlantic TRANSPORT"
 * (Carte du Canada bleu/vert avec réseau logistique, camion semi-remorque bleu marine,
 * rose des vents N/S/W/E, feuille d'érable rouge et typographie Atlantic TRANSPORT),
 * affiché légèrement agrandi dans le header.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  customLogoUrl,
  companyName,
  size = 'header'
}) => {
  const [imgError, setImgError] = useState(false);

  // Slightly enlarged in the header as requested ("affiche-le légèrement agrandi dans le header")
  const sizeClasses =
    size === 'header'
      ? 'h-16 sm:h-[72px] w-auto min-w-[115px] sm:min-w-[132px]'
      : size === 'footer'
      ? 'h-14 w-auto min-w-[105px]'
      : 'h-16 w-auto min-w-[120px]';

  const hasCustomImage = Boolean(customLogoUrl && customLogoUrl.trim().length > 0 && !imgError);

  return (
    <div
      className={`${sizeClasses} bg-white rounded-xl px-2 py-1 shadow-xs border border-gray-200/80 flex items-center justify-center shrink-0 overflow-hidden`}
    >
      {hasCustomImage ? (
        <img
          src={customLogoUrl}
          alt={companyName}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-auto object-contain"
        />
      ) : (
        <svg
          viewBox="0 0 320 210"
          className="h-full w-auto object-contain"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={companyName}
        >
          <defs>
            {/* Dégradé fidèle de la carte du Canada : Bleu arctique -> Bleu océan -> Vert prairies */}
            <linearGradient id="canadaMapGrad" x1="160" y1="10" x2="160" y2="142" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1492D8" />
              <stop offset="48%" stopColor="#2673B8" />
              <stop offset="72%" stopColor="#429B6B" />
              <stop offset="100%" stopColor="#5BB347" />
            </linearGradient>
          </defs>

          {/* Silhouette géographique du Canada & Archipel Arctique */}
          <path
            d="M42 74 L68 48 L86 58 L104 36 L138 28 L168 12 L208 10 L198 28 L215 36 L192 52 L206 65 L182 78 L195 92 L222 68 L254 78 L288 104 L302 115 L286 125 L268 118 L252 128 L224 134 L198 145 L186 135 L164 126 L62 118 L48 105 Z"
            fill="url(#canadaMapGrad)"
          />
          {/* Îles arctiques supérieures */}
          <path
            d="M115 24 L134 18 L142 26 L122 30 Z M152 16 L175 10 L182 22 L160 26 Z M92 38 L108 32 L114 42 L96 44 Z"
            fill="#1492D8"
          />

          {/* Lignes de réseau logistique blanches à l'intérieur de la carte */}
          <g stroke="#FFFFFF" strokeWidth="1.1" strokeOpacity="0.65">
            <line x1="65" y1="68" x2="98" y2="58" />
            <line x1="98" y1="58" x2="132" y2="66" />
            <line x1="132" y1="66" x2="164" y2="54" />
            <line x1="78" y1="82" x2="115" y2="74" />
            <line x1="115" y1="74" x2="148" y2="85" />
            <line x1="98" y1="58" x2="115" y2="74" />
          </g>
          <g fill="#FFFFFF" fillOpacity="0.85">
            <circle cx="65" cy="68" r="2" />
            <circle cx="98" cy="58" r="2.2" />
            <circle cx="132" cy="66" r="2" />
            <circle cx="164" cy="54" r="2" />
            <circle cx="115" cy="74" r="2.2" />
          </g>

          {/* Route blanche sous le camion */}
          <path d="M52 108 Q135 112 215 114" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

          {/* Camion Semi-Remorque Bleu Marine (#233E6B) orienté vers la droite */}
          <g>
            {/* Remorque en perspective */}
            <polygon
              points="56,78 152,65 152,102 56,100"
              fill="#233E6B"
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />
            {/* Détails lignes remorque */}
            <line x1="60" y1="95" x2="148" y2="96" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.8" />

            {/* Cabine tracteur aérodynamique */}
            <path
              d="M152 65 L178 65 C186 65 192 72 196 80 L210 84 C213 85 215 89 215 94 L215 103 L152 103 Z"
              fill="#233E6B"
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />
            {/* Pare-brise et vitre latérale */}
            <polygon points="180,71 193,71 198,81 180,81" fill="#FFFFFF" />
            <rect x="164" y="72" width="11" height="9" rx="1.5" fill="#FFFFFF" />
            {/* Calandre avant blanche */}
            <rect x="205" y="86" width="8" height="12" rx="1.5" fill="#FFFFFF" />

            {/* Roues du semi-remorque */}
            <circle cx="70" cy="103" r="6" fill="#233E6B" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="84" cy="103" r="6" fill="#233E6B" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="136" cy="104" r="7" fill="#233E6B" stroke="#FFFFFF" strokeWidth="2.2" />
            <circle cx="152" cy="104" r="7" fill="#233E6B" stroke="#FFFFFF" strokeWidth="2.2" />
            <circle cx="194" cy="104" r="7.5" fill="#233E6B" stroke="#FFFFFF" strokeWidth="2.4" />
            <circle cx="194" cy="104" r="3" fill="#FFFFFF" />
          </g>

          {/* Rose des Vents (N / S / W / E) à droite */}
          <g transform="translate(248, 72)">
            <circle cx="0" cy="0" r="19" fill="#FFFFFF" fillOpacity="0.9" stroke="#233E6B" strokeWidth="2" />
            <circle cx="0" cy="0" r="15" stroke="#233E6B" strokeWidth="0.8" />
            {/* Étoile 4 branches */}
            <polygon points="0,-28 5,-5 0,0" fill="#233E6B" />
            <polygon points="0,-28 -5,-5 0,0" fill="#4A6FA5" />
            <polygon points="0,28 5,5 0,0" fill="#233E6B" />
            <polygon points="0,28 -5,5 0,0" fill="#4A6FA5" />
            <polygon points="28,0 5,5 0,0" fill="#233E6B" />
            <polygon points="28,0 5,-5 0,0" fill="#4A6FA5" />
            <polygon points="-28,0 -5,5 0,0" fill="#233E6B" />
            <polygon points="-28,0 -5,-5 0,0" fill="#4A6FA5" />
            {/* Lettres cardinales */}
            <text x="0" y="-31" fontFamily="serif" fontSize="11" fontWeight="bold" fill="#233E6B" textAnchor="middle">
              N
            </text>
            <text x="0" y="39" fontFamily="serif" fontSize="11" fontWeight="bold" fill="#233E6B" textAnchor="middle">
              S
            </text>
            <text x="-36" y="4" fontFamily="serif" fontSize="11" fontWeight="bold" fill="#233E6B" textAnchor="middle">
              W
            </text>
            <text x="35" y="4" fontFamily="serif" fontSize="11" fontWeight="bold" fill="#233E6B" textAnchor="middle">
              E
            </text>
          </g>

          {/* Feuille d'érable rouge du Canada (en bas à droite de la carte) */}
          <g transform="translate(224, 120) scale(0.85)">
            <path
              d="M0 -18 L4 -8 L12 -10 L9 -2 L18 2 L14 7 L19 10 L7 12 L9 17 L1 15 L1 23 L-1 23 L-1 15 L-9 17 L-7 12 L-19 10 L-14 7 L-18 2 L-9 -2 L-12 -10 L-4 -8 Z"
              fill="#EE2724"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>

          {/* Typographie officielle "Atlantic" + "T R A N S P O R T" */}
          <text
            x="46"
            y="168"
            fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
            fontSize="38"
            fontWeight="800"
            fontStyle="italic"
            letterSpacing="0.5"
            fill="#27416B"
          >
            Atlantic
          </text>
          <text
            x="96"
            y="192"
            fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
            fontSize="15.5"
            fontWeight="500"
            letterSpacing="6.5"
            fill="#27416B"
          >
            TRANSPORT
          </text>
        </svg>
      )}
    </div>
  );
};
