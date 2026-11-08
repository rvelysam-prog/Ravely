import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DraftItem, getAllDrafts, deleteDraft } from '../../services/draftsService';

interface BrouillonsTabProps {
  onResumeDraft?: (draft: DraftItem) => void;
}

export const BrouillonsTab: React.FC<BrouillonsTabProps> = ({ onResumeDraft }) => {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    const data = await getAllDrafts();
    setDrafts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce brouillon ?')) return;
    setDeletingId(id);
    await deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
  };

  const filteredDrafts = drafts.filter((d) => {
    const matchSearch =
      search.trim() === '' ||
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      (d.nomCandidat && d.nomCandidat.toLowerCase().includes(search.toLowerCase())) ||
      (d.poste && d.poste.toLowerCase().includes(search.toLowerCase()));

    const matchType = selectedType === 'all' || d.type === selectedType;
    return matchSearch && matchType;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'nouveau_salarie':
        return 'Nouveau Salarié & Dossier Complet';
      case 'contrat_prestation':
        return 'Contrat de Prestation CRIC';
      case 'offre_emploi':
        return 'Offre d’Emploi';
      case 'ticket_entretien':
        return 'Ticket d’Entretien';
      case 'bundle':
        return 'Bundle Multi-Pages';
      default:
        return 'Dossier Brouillon';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              Espace Brouillons &amp; Travaux en Attente
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {drafts.length} enregistré{drafts.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Retrouvez tous les documents, promesses d'embauche, contrats CRIC et offres enregistrés temporairement pour les finaliser ultérieurement.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDrafts}
          className="px-3.5 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          Actualiser la liste
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, candidat ou poste..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
          >
            <option value="all">Tous les types de documents</option>
            <option value="nouveau_salarie">Nouveaux Salariés</option>
            <option value="contrat_prestation">Contrats CRIC</option>
            <option value="offre_emploi">Offres d’emploi</option>
            <option value="ticket_entretien">Tickets d’entretien</option>
            <option value="bundle">Bundles Assemblés</option>
          </select>
        </div>
      </div>

      {/* Liste des brouillons */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 text-gray-500">
          <div className="animate-spin w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm">Chargement des brouillons sécurisés...</p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">Aucun brouillon en attente</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            Lorsque vous cliquez sur le bouton <span className="font-semibold text-amber-700">[Enregistrer au brouillon]</span> lors de la saisie d'un nouveau salarié ou de la création d'un contrat, vos données seront conservées ici.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrafts.map((d) => {
            const dateStr = new Date(d.updatedAt || d.createdAt).toLocaleDateString('fr-CA', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0066B3] border border-blue-200">
                      {getTypeLabel(d.type)}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {dateStr}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#0066B3] transition-colors line-clamp-1">
                    {d.titre}
                  </h3>

                  {d.nomCandidat && (
                    <p className="text-xs text-gray-700 mt-1 font-medium">
                      Candidat : <span className="font-bold text-gray-900">{d.nomCandidat}</span>
                    </p>
                  )}

                  {d.poste && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Poste : {d.poste} {d.codeCnp ? `(CNP ${d.codeCnp})` : ''}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onResumeDraft?.(d)}
                    className="flex-1 px-3 py-1.5 text-xs font-bold bg-[#0B2545] hover:bg-[#134074] text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Reprendre &amp; Finaliser</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(d.id, e)}
                    disabled={deletingId === d.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer définitivement ce brouillon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
