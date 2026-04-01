import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Users, Sparkles, MoreHorizontal, Eye } from 'lucide-react';
import { Contest } from '../types';
import { MOCK_CONTESTS } from '../constants';
import { generateContestDescription } from '../services/geminiService';

const ContestManager: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>(MOCK_CONTESTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [generatedDesc, setGeneratedDesc] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.action-dropdown')) return;
      setOpenActionId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerateAI = async () => {
    if (!newTitle) return;
    setIsGenerating(true);
    const tagsArray = newTags.split(',').map(t => t.trim());
    const description = await generateContestDescription(newTitle, tagsArray);
    setGeneratedDesc(description);
    setIsGenerating(false);
  };

  const getStatusColor = (status: Contest['status']) => {
    switch (status) {
      case 'OPEN': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300';
      case 'FULL': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'CLOSED': return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100';
    }
  };

  const handleAction = (action: string, contest: Contest) => {
    if (action === 'delete') {
      setContests(contests.filter(c => c.id !== contest.id));
    } else if (action === 'edit') {
      // Simple edit pre-fill for demo
      setNewTitle(contest.title);
      setNewTags(contest.tags.join(', '));
      setGeneratedDesc(contest.description || '');
      setIsModalOpen(true);
    }
    setOpenActionId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Contests</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage competitions and hackathons</p>
        </div>
        <button
          onClick={() => {
            setNewTitle(''); setNewTags(''); setGeneratedDesc('');
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} />
          Create Contest
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800 text-gray-900 dark:text-slate-100 uppercase font-semibold text-xs">
              <tr>
                <th className="px-6 py-4">Contest</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Participants</th>
                <th className="px-6 py-4">Deadline</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {contests.map((contest) => (
                <tr key={contest.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={contest.image} alt="" className="h-10 w-16 object-cover rounded-md" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{contest.title}</p>
                        <div className="flex gap-2 mt-1">
                          {contest.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-600 dark:text-slate-400">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contest.status)}`}>
                      {contest.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Users size={16} className="text-gray-400 dark:text-slate-400" />
                      <span>{contest.registrationCount || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-gray-400 dark:text-slate-400" />
                      <span>{new Date(contest.deadline).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative action-dropdown inline-block text-left">
                      <button
                        aria-label="Open actions menu"
                        onClick={() => setOpenActionId(openActionId === contest.id ? null : contest.id)}
                        className={`p-2 rounded-lg border transition-all duration-200 ${openActionId === contest.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 shadow-sm'
                          : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openActionId === contest.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-fade-in-up origin-top-right">
                          <div className="py-1">
                            <button onClick={() => handleAction('view', contest)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                              <Eye size={16} className="text-gray-400 dark:text-slate-400" />
                              <span>View Details</span>
                            </button>
                            <button onClick={() => handleAction('edit', contest)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                              <Edit2 size={16} className="text-gray-400 dark:text-slate-400" />
                              <span>Edit Contest</span>
                            </button>
                            <div className="border-t border-gray-50 dark:border-slate-800 my-1"></div>
                            <button onClick={() => handleAction('delete', contest)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors">
                              <Trash2 size={16} />
                              <span>Delete Contest</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">{newTitle && contests.find(c => c.title === newTitle) ? 'Edit Contest' : 'New Contest'}</h3>
              <button aria-label="Close modal" onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="e.g., Summer Hackathon 2024"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="e.g., AI, Web, Mobile"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-emerald-800 dark:text-emerald-300">AI Description Generator</label>
                  <Sparkles size={16} className="text-emerald-600" />
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">
                  Enter a title and tags above, then click generate to have Gemini AI write your contest description.
                </p>
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !newTitle}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${isGenerating || !newTitle
                    ? 'bg-emerald-200 text-emerald-500 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate with Gemini
                    </>
                  )}
                </button>
                {generatedDesc && (
                  <div className="mt-3">
                    <label htmlFor="generated-description" className="sr-only">Generated Description</label>
                    <textarea
                      id="generated-description"
                      aria-label="Generated contest description"
                      value={generatedDesc}
                      onChange={(e) => setGeneratedDesc(e.target.value)}
                      className="w-full text-sm p-2 rounded border border-emerald-200 dark:border-emerald-800 focus:ring-1 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                      rows={4}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors">
                Save Contest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestManager;