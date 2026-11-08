import React, { useState } from 'react';
import { Search, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { searchOrRegisterPoste, PosteCatalogItem } from '../../services/posteCatalogService';

interface PosteInputWithAnalyzeProps {
  value: string;
  onChange: (val: string) => void;
  onAnalyzed?: (result: { poste: PosteCatalogItem; isNewlyCreated: boolean }) => void;
  placeholder?: string;
  className?: string;
  deptHint?: string;
  label?: string;
  required?: boolean;
}

export const PosteInputWithAnalyze: React.FC<PosteInputWithAnalyzeProps> = ({
  value,
  onChange,
  onAnalyzed,
  placeholder = 'Ex : Mécanicien Poids Lourds, Conducteur Routier...',
  className = '',
  deptHint,
  label,
  required = false
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    poste: PosteCatalogItem;
    isNewlyCreated: boolean;
  } | null>(null);

  const handleAnalyze = () => {
    if (!value.trim()) return;
    setAnalyzing(true);

    setTimeout(() => {
      const res = searchOrRegisterPoste(value, deptHint);
      setAnalysisResult(res);
      setAnalyzing(false);
      if (onAnalyzed) {
        onAnalyzed(res);
      }
    }, 280);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {value.trim().length > 0 && !analysisResult && (
            <span className="text-[10px] text-amber-700 font-medium animate-pulse">
              Cliquez sur Analyser pour vérifier ou créer le poste
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (analysisResult) setAnalysisResult(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] pr-28 transition-all ${
            analysisResult
              ? analysisResult.isNewlyCreated
                ? 'border-emerald-500 ring-1 ring-emerald-300'
                : 'border-blue-500 ring-1 ring-blue-300'
              : 'border-gray-300'
          } ${className}`}
        />

        {/* Bouton "Analyser" apparaissant dès que le champ est rempli */}
        {value.trim().length > 0 && (
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              analyzing
                ? 'bg-gray-200 text-gray-500 cursor-wait'
                : 'bg-[#0B2545] hover:bg-[#134074] text-white active:scale-95'
            }`}
            title="Analyser le poste dans tout le site ou le créer automatiquement"
          >
            {analyzing ? (
              <span className="inline-block animate-spin">⟳</span>
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
            )}
            <span>{analyzing ? 'Analyse...' : 'Analyser'}</span>
          </button>
        )}
      </div>

      {/* Bannière de résultat d'analyse */}
      {analysisResult && (
        <div
          className={`text-[11px] p-2 rounded-lg flex items-start gap-2 border transition-all ${
            analysisResult.isNewlyCreated
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {analysisResult.isNewlyCreated ? (
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold flex items-center justify-between">
              <span>
                {analysisResult.isNewlyCreated
                  ? '✨ Nouveau poste créé & enregistré en base de données !'
                  : '✓ Poste existant validé dans le catalogue officiel'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border">
                CNP {analysisResult.poste.codeCnp}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-gray-700">
              Département : <span className="font-semibold">{analysisResult.poste.departement}</span> · 6 missions générées · Rémunération :{' '}
              <span className="font-semibold">{analysisResult.poste.salaireHoraireDefaut.toFixed(2)} $ CAD/h</span> ({analysisResult.poste.salaireMensuelDefaut.toLocaleString('fr-CA')} $ CAD/mois)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
