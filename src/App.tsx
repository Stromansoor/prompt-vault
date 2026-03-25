import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Copy, Pencil, Trash2, Plus, Search, ChevronLeft, Check, X, Tag, Menu, RotateCcw, AlertCircle, AlertTriangle, Download, Upload, Star, Clock, History, MessageSquare, ArrowUpDown, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface PromptVersion {
  id: string;
  title: string;
  body: string;
  tags: string[];
  savedAt: number;
}

interface Prompt {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
  lastAccessedAt?: number;
  isDeleted?: boolean;
  isFavorite?: boolean;
  versions?: PromptVersion[];
}

interface Toast {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const escapeCSV = (str: string) => {
  if (str == null) return '';
  const s = String(str);
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const parseCSV = (text: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++;
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }
  return rows;
};

const renderWithVariables = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={i} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1 rounded font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
};

function SwipeablePromptCard({
  prompt,
  selectedId,
  handleSelectPrompt,
  confirmDelete,
  handleCopy
}: {
  prompt: Prompt;
  selectedId: string | null;
  handleSelectPrompt: (id: string) => void;
  confirmDelete: (id: string) => void;
  handleCopy: (prompt: Prompt) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    if (prompt.isDeleted) return;
    setIsDragging(true);
    startX.current = clientX - offsetX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    let newX = clientX - startX.current;
    if (newX > 0) newX = 0;
    if (newX < -80) newX = -80 - Math.pow(-newX - 80, 0.8);
    setOffsetX(newX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offsetX < -50) {
      confirmDelete(prompt.id);
    }
    setOffsetX(0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (offsetX !== 0 && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOffsetX(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [offsetX]);

  return (
    <div className="relative rounded-3xl bg-red-900/20" ref={cardRef}>
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end pr-6">
        <Trash2 className="text-red-400" size={24} />
      </div>
      <motion.div
        animate={{ x: offsetX }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onClick={() => {
          if (offsetX === 0) handleSelectPrompt(prompt.id);
        }}
        className={`relative w-full text-left p-5 rounded-3xl transition-all duration-200 cursor-pointer border ${selectedId === prompt.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm' : 'bg-white dark:bg-[#1e1f22] hover:bg-slate-50 dark:hover:bg-[#282a2c] border-slate-200 dark:border-slate-800 hover:shadow-md'}`}
      >
        <h3 className={`font-medium text-lg truncate mb-1.5 flex items-center gap-2 ${selectedId === prompt.id ? 'text-blue-900 dark:text-blue-100' : 'text-slate-800 dark:text-slate-200'}`}>
          {prompt.isFavorite && <Star size={16} className="text-amber-400 fill-current flex-shrink-0" />}
          <span className="truncate">{prompt.title}</span>
        </h3>
        <p className={`text-sm line-clamp-2 leading-relaxed ${selectedId === prompt.id ? 'text-blue-800/80 dark:text-blue-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
          {renderWithVariables(prompt.body)}
        </p>
        <div className="flex items-center justify-between mt-4 gap-2">
          <div className="flex gap-2 overflow-hidden flex-1">
            {prompt.tags && prompt.tags.slice(0, 3).map(tag => (
              <span key={tag} className={`px-3 py-1 rounded-full text-xs font-medium truncate max-w-[100px] ${selectedId === prompt.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {tag}
              </span>
            ))}
            {prompt.tags && prompt.tags.length > 3 && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedId === prompt.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(prompt);
            }}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${selectedId === prompt.id ? 'text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="Copy Prompt"
          >
            <Copy size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>(() => {
    const saved = localStorage.getItem('prompt_vault_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => ({ ...p, tags: p.tags || [] }));
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: '1',
        title: 'Example: Code Review Expert',
        body: 'Act as an expert software engineer. Review the following code for performance, security, and readability issues. Provide actionable feedback and refactored code snippets.',
        tags: ['Code', 'Review'],
        createdAt: Date.now(),
      }
    ];
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'title-asc' | 'title-desc' | 'created-desc' | 'created-asc' | 'accessed-desc'>('created-desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'favorites' | 'deleted' | 'history'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState(false);
  const [factoryResetInput, setFactoryResetInput] = useState('');
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('prompt_vault_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('prompt_vault_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { autoCloseOnCopy: false, includeTitleOnCopy: false };
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('prompt_vault_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('prompt_vault_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('prompt_vault_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('prompt_vault_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('prompt_vault_data', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('prompt_vault_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (selectedId) {
      setHistory(prev => {
        const newHistory = prev.filter(id => id !== selectedId);
        newHistory.unshift(selectedId);
        return newHistory.slice(0, 50);
      });
    }
  }, [selectedId]);

  useEffect(() => {
    if (!isModalOpen) return;

    if (!window.visualViewport) return;

    const initialHeight = window.visualViewport.height;

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const footer = document.getElementById('modal-footer');
      if (!footer) return;

      if (currentHeight < initialHeight * 0.8) {
        // Keyboard is likely open
        footer.style.display = 'none';
      } else {
        // Keyboard is likely closed
        footer.style.display = 'flex';
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [isModalOpen]);

  const allTagsWithCounts = useMemo(() => {
    const tagCounts = new Map<string, { name: string, count: number }>();
    prompts.forEach(p => {
      if (!p.isDeleted) {
        p.tags?.forEach(t => {
          const lower = t.toLowerCase();
          if (!tagCounts.has(lower)) {
            tagCounts.set(lower, { name: t, count: 1 });
          } else {
            tagCounts.get(lower)!.count++;
          }
        });
      }
    });
    return Array.from(tagCounts.values()).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    let basePrompts = prompts;
    
    if (viewMode === 'history') {
      const promptMap = new Map(prompts.map(p => [p.id, p]));
      basePrompts = history
        .map(id => promptMap.get(id))
        .filter((p): p is Prompt => p !== undefined && !p.isDeleted);
    } else {
      basePrompts = prompts.filter(p => {
        if (viewMode === 'deleted') return p.isDeleted;
        if (p.isDeleted) return false;
        if (viewMode === 'favorites' && !p.isFavorite) return false;
        return true;
      });
    }

    let filtered = basePrompts.filter(p => {
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => 
        p.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      );
      return matchesTags;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const scored = filtered.map(p => {
        const title = p.title.toLowerCase();
        const body = p.body.toLowerCase();
        let score = 0;

        if (title === q) score = 100;
        else if (title.startsWith(q)) score = 80;
        else if (title.includes(q)) score = 60;
        
        if (score === 0) {
          if (body.includes(q)) score = 40;
          else {
            let i = 0, j = 0;
            while (i < body.length && j < q.length) {
              if (body[i] === q[j]) j++;
              i++;
            }
            if (j === q.length) score = 20;
          }
        }
        return { prompt: p, score };
      }).filter(item => item.score > 0);
      
      scored.sort((a, b) => b.score - a.score);
      filtered = scored.map(item => item.prompt);
    }

    if (viewMode === 'history') {
      return filtered;
    }

    if (!searchQuery) {
      filtered.sort((a, b) => {
        switch (sortOption) {
          case 'title-asc': return a.title.localeCompare(b.title);
          case 'title-desc': return b.title.localeCompare(a.title);
          case 'created-asc': return a.createdAt - b.createdAt;
          case 'created-desc': return b.createdAt - a.createdAt;
          case 'accessed-desc': return (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0);
          default: return b.createdAt - a.createdAt;
        }
      });
    }
    
    return filtered;
  }, [prompts, searchQuery, viewMode, selectedTags, history, sortOption]);

  const selectedPrompt = useMemo(() => prompts.find(p => p.id === selectedId) || null, [prompts, selectedId]);

  const showToast = (message: string, action?: { label: string; onClick: () => void }) => {
    setToast({ message, action });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectPrompt = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setPrompts(prev => prev.map(p => 
        p.id === id ? { ...p, lastAccessedAt: Date.now() } : p
      ));
    }
  };

  const handleCopy = async (prompt: Prompt) => {
    try {
      const textToCopy = appSettings.includeTitleOnCopy 
        ? `${prompt.title}\n\n${prompt.body}`
        : prompt.body;
      await navigator.clipboard.writeText(textToCopy);
      showToast('Copied to Clipboard!');
      
      if (appSettings.autoCloseOnCopy) {
        handleSelectPrompt(null);
      }
    } catch (err) {
      showToast('Failed to copy');
    }
  };

  const confirmDelete = (id: string) => {
    setPromptToDelete(id);
  };

  const executeSoftDelete = () => {
    if (!promptToDelete) return;
    const idToDelete = promptToDelete;
    setPrompts(prev => prev.map(p => p.id === idToDelete ? { ...p, isDeleted: true } : p));
    if (selectedId === idToDelete) handleSelectPrompt(null);
    setPromptToDelete(null);
    
    showToast('Prompt deleted', {
      label: 'Undo',
      onClick: () => {
        setPrompts(prev => prev.map(p => p.id === idToDelete ? { ...p, isDeleted: false } : p));
        showToast('Prompt restored');
      }
    });
  };

  const handleRestore = (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false } : p));
    if (selectedId === id) handleSelectPrompt(null);
    showToast('Prompt restored');
  };

  const handleHardDelete = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) handleSelectPrompt(null);
    showToast('Prompt permanently deleted');
  };

  const handleCloseModal = () => {
    if (isDirty) {
      setIsConfirmDiscardOpen(true);
    } else {
      setIsModalOpen(false);
      setEditingPrompt(null);
      setModalTitle('');
      setModalBody('');
      setModalTags([]);
      setTagInput('');
    }
  };

  const handleSave = (title: string, body: string, tags: string[]) => {
    if (!title.trim() || !body.trim()) {
      showToast('Title and body are required');
      return;
    }

    if (editingPrompt) {
      setPrompts(prev => prev.map(p => {
        if (p.id === editingPrompt.id) {
          const hasChanged = p.title !== title || p.body !== body || JSON.stringify(p.tags) !== JSON.stringify(tags);
          if (hasChanged) {
            const newVersion: PromptVersion = {
              id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
              title: p.title,
              body: p.body,
              tags: [...p.tags],
              savedAt: Date.now()
            };
            return { ...p, title, body, tags, versions: [newVersion, ...(p.versions || [])] };
          }
        }
        return p;
      }));
      showToast('Prompt updated');
    } else {
      const newPrompt: Prompt = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        title,
        body,
        tags,
        createdAt: Date.now(),
      };
      setPrompts(prev => [newPrompt, ...prev]);
      handleSelectPrompt(newPrompt.id);
      showToast('Prompt saved');
    }
    setIsDirty(false);
    setIsModalOpen(false);
    setEditingPrompt(null);
    setModalTitle('');
    setModalBody('');
    setModalTags([]);
    setTagInput('');
  };

  const openEditModal = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setModalTitle(prompt.title);
    setModalBody(prompt.body);
    setModalTags(prompt.tags || []);
    setTagInput('');
    setIsPreviewMode(false);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingPrompt(null);
    setModalTitle('');
    setModalBody('');
    setModalTags([]);
    setTagInput('');
    setIsPreviewMode(false);
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const addTagFromInput = () => {
    const newTag = tagInput.trim();
    if (newTag) {
      const lowerNewTag = newTag.toLowerCase();
      if (!modalTags.some(t => t.toLowerCase() === lowerNewTag)) {
        setModalTags([...modalTags, newTag]);
        setIsDirty(true);
      }
    }
    setTagInput('');
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTagFromInput();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setModalTags(modalTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
    setIsDirty(true);
  };

  const handleExportCSV = () => {
    const activePrompts = prompts.filter(p => !p.isDeleted);
    if (activePrompts.length === 0) {
      showToast('No prompts to export');
      return;
    }

    let maxTags = 0;
    activePrompts.forEach(p => {
      if (p.tags && p.tags.length > maxTags) maxTags = p.tags.length;
    });

    const header = ['Title', 'Prompt'];
    for (let i = 1; i <= maxTags; i++) {
      header.push(`Tag ${i}`);
    }

    const rows = [header.map(escapeCSV).join(',')];

    activePrompts.forEach(p => {
      const row = [escapeCSV(p.title), escapeCSV(p.body)];
      for (let i = 0; i < maxTags; i++) {
        row.push(escapeCSV(p.tags?.[i] || ''));
      }
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'prompt_vault_backup.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported successfully');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const rows = parseCSV(text);
      if (rows.length <= 1) {
        showToast('No data found in CSV');
        return;
      }

      const importedPrompts: Prompt[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;
        const title = row[0].trim();
        const body = row[1].trim();
        if (!title && !body) continue;

        const tags = [];
        for (let j = 2; j < row.length; j++) {
          const tag = row[j]?.trim();
          if (tag) tags.push(tag);
        }

        importedPrompts.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + i,
          title,
          body,
          tags,
          createdAt: Date.now() + i,
          isDeleted: false
        });
      }

      if (importedPrompts.length > 0) {
        setPrompts(prev => [...importedPrompts, ...prev]);
        showToast(`Imported ${importedPrompts.length} prompts`);
      } else {
        showToast('No valid prompts found in CSV');
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleEmptyTrash = () => {
    setPrompts(prev => prev.filter(p => !p.isDeleted));
    if (selectedPrompt?.isDeleted) {
      handleSelectPrompt(null);
    }
    setIsEmptyTrashModalOpen(false);
    showToast('Trash emptied');
  };

  const toggleFavorite = (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  let headerText = 'Prompt Vault';
  if (viewMode === 'deleted') headerText = 'Deleted';
  else if (viewMode === 'favorites') headerText = 'Favorites';
  else if (viewMode === 'history') headerText = 'History';
  else if (selectedTags.length > 0) headerText = selectedTags.join(', ');

  return (
    <div className="flex h-screen w-full bg-[#f8fafd] dark:bg-[#131314] text-slate-800 dark:text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* Categories Sidebar (Left Pane) */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#f8fafd] dark:bg-[#131314] flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between h-[88px]">
          <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100 pl-2">Categories</h2>
          <button className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <div className="px-4 pb-4 space-y-1 overflow-y-auto flex-1">
          <button
            onClick={() => { setViewMode('all'); setSelectedTags([]); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'all' && selectedTags.length === 0 ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Tag size={18} />
            All Prompts
          </button>
          <button
            onClick={() => { setViewMode('favorites'); setSelectedTags([]); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'favorites' ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Star size={18} className={viewMode === 'favorites' ? "fill-current text-amber-500 dark:text-amber-400" : ""} />
            Favorites
          </button>
          <button
            onClick={() => { setViewMode('history'); setSelectedTags([]); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'history' ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Clock size={18} />
            History
          </button>
          <div className="my-2 border-t border-slate-200 dark:border-slate-800/50"></div>
          <div className="px-4 py-2 mt-4 mb-1 text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</div>
          {allTagsWithCounts.map(({ name: tag, count }) => (
            <div key={tag} className="group relative flex items-center">
              <button
                onClick={() => { 
                  setViewMode('all'); 
                  setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]); 
                }}
                className={`flex-1 flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors ${selectedTags.includes(tag) ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                <Tag size={18} />
                <span className="truncate">{tag}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${selectedTags.includes(tag) ? 'bg-blue-200/50 text-blue-900 dark:bg-blue-800/50 dark:text-blue-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'}`}>
                  {count}
                </span>
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/50 flex flex-col gap-1">
          <button
            onClick={() => { setViewMode('deleted'); setSelectedTags([]); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'deleted' ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Trash2 size={18} />
            Deleted
          </button>
          <button
            onClick={() => { setIsSettingsModalOpen(true); setIsSidebarOpen(false); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/60 z-30 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* List View (Middle Pane) */}
      <div className={`flex-col w-full md:w-80 lg:w-96 bg-[#f8fafd] dark:bg-[#131314] ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between h-14 px-2">
            <div className="flex items-center gap-3">
              <button 
                className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors" 
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[200px] sm:max-w-[300px]">{headerText}</h1>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'deleted' && filteredPrompts.length > 0 && (
                <button
                  onClick={() => setIsEmptyTrashModalOpen(true)}
                  className="p-3.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-2xl transition-colors active:scale-95 shadow-sm"
                  aria-label="Empty Trash"
                  title="Empty Trash"
                >
                  <Trash2 size={22} className="stroke-[2.5]" />
                </button>
              )}
              <button 
                onClick={openAddModal}
                className="p-3.5 bg-[#c2e7ff] hover:bg-[#b1d6ee] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005c94] dark:text-[#c2e7ff] rounded-2xl transition-colors active:scale-95 shadow-sm"
                aria-label="Add new prompt"
              >
                <Plus size={22} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 px-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search prompts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#282a2c] rounded-full py-3.5 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500 dark:text-slate-400 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="flex items-center justify-center w-[52px] h-[52px] bg-white dark:bg-[#282a2c] text-slate-700 dark:text-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#323538] shadow-sm"
                aria-label="Sort prompts"
              >
                <ArrowUpDown size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
              
              <AnimatePresence>
                {isSortMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setIsSortMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden py-1"
                    >
                      {[
                        { value: 'created-desc', label: 'Newest First' },
                        { value: 'created-asc', label: 'Oldest First' },
                        { value: 'accessed-desc', label: 'Recently Used' },
                        { value: 'title-asc', label: 'Title (A-Z)' },
                        { value: 'title-desc', label: 'Title (Z-A)' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortOption(option.value as any);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortOption === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 select-none overflow-x-hidden">
          {filteredPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 mt-20 px-6">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 mb-4 text-slate-700" />
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No results found</p>
                  <p className="text-sm">We couldn't find any prompts matching "{searchQuery}".</p>
                </>
              ) : viewMode === 'deleted' ? (
                <>
                  <Trash2 className="w-12 h-12 mb-4 text-slate-700" />
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Trash is empty</p>
                  <p className="text-sm">Deleted prompts will appear here for 30 days.</p>
                </>
              ) : viewMode === 'favorites' ? (
                <>
                  <Star className="w-12 h-12 mb-4 text-slate-700" />
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No favorites yet</p>
                  <p className="text-sm mb-6">Star your most used prompts to find them easily.</p>
                  <button onClick={() => setViewMode('all')} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-sm font-medium transition-colors">
                    View All Prompts
                  </button>
                </>
              ) : viewMode === 'history' ? (
                <>
                  <History className="w-12 h-12 mb-4 text-slate-700" />
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No history yet</p>
                  <p className="text-sm">Prompts you view will appear here.</p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-12 h-12 mb-4 text-slate-700" />
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No prompts yet</p>
                  <p className="text-sm mb-6">Get started by creating your first prompt.</p>
                  <button onClick={openAddModal} className="px-6 py-2.5 bg-[#c2e7ff] hover:bg-[#b1d6ee] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005c94] dark:text-[#c2e7ff] rounded-full text-sm font-medium transition-colors">
                    Add your first prompt
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredPrompts.map(prompt => (
              <SwipeablePromptCard
                key={prompt.id}
                prompt={prompt}
                selectedId={selectedId}
                handleSelectPrompt={handleSelectPrompt}
                confirmDelete={confirmDelete}
                handleCopy={handleCopy}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Content - Detail View */}
      <div className={`flex-1 flex-col bg-white dark:bg-[#1e1f20] md:rounded-l-[2.5rem] md:my-2 md:mr-2 overflow-hidden shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.5)] z-10 ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {selectedPrompt ? (
          <>
            <div className="flex items-center justify-between p-4 sm:p-6 md:px-8 h-[88px] border-b border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-[#1e1f20]/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleSelectPrompt(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft size={28} />
                </button>
                <h2 className="text-2xl font-medium text-slate-900 dark:text-slate-100 truncate pr-4">{selectedPrompt.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedPrompt.isDeleted ? (
                  <>
                    <button 
                      onClick={() => handleRestore(selectedPrompt.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-full transition-colors active:scale-95"
                    >
                      <RotateCcw size={18} />
                      <span className="hidden sm:inline">Restore</span>
                    </button>
                    <button 
                      onClick={() => confirmDelete(selectedPrompt.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-medium rounded-full transition-colors active:scale-95"
                    >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline">Delete Forever</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => toggleFavorite(selectedPrompt.id)}
                      className={`p-3 rounded-full transition-colors ${selectedPrompt.isFavorite ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      title={selectedPrompt.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star size={20} className={selectedPrompt.isFavorite ? "fill-current" : ""} />
                    </button>
                    <button 
                      onClick={() => openEditModal(selectedPrompt)}
                      className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit prompt"
                    >
                      <Pencil size={20} />
                    </button>
                    {selectedPrompt.versions && selectedPrompt.versions.length > 0 && (
                      <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View history"
                      >
                        <History size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => confirmDelete(selectedPrompt.id)}
                      className="p-3 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      title="Delete prompt"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button 
                      onClick={() => handleCopy(selectedPrompt)}
                      className="flex items-center gap-2 px-5 py-3 bg-[#c2e7ff] hover:bg-[#b1d6ee] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005c94] dark:text-[#c2e7ff] font-medium rounded-full transition-colors active:scale-95 ml-2 shadow-sm"
                    >
                      <Copy size={20} className="stroke-[2.5]" />
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:px-8 pb-12">
              <div className="max-w-4xl mx-auto">
                {selectedPrompt.tags && selectedPrompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedPrompt.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-100 dark:border-blue-800/30">
                        <Tag size={14} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="bg-transparent rounded-[2rem] p-6 sm:p-8 md:p-10">
                  <div className="prose dark:prose-invert prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-800 prose-a:text-blue-600 dark:prose-a:text-blue-400 select-text">
                    <Markdown>{selectedPrompt.body}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center select-none">
            <div className="w-24 h-24 mb-6 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
              <MessageSquare size={48} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h2 className="text-2xl font-medium text-slate-700 dark:text-slate-300 mb-3">No Prompt Selected</h2>
            <p className="max-w-sm text-base text-slate-400 dark:text-slate-500">Select a prompt from the sidebar or create a new one to get started.</p>
            <button 
              onClick={openAddModal}
              className="mt-8 px-6 py-3 bg-[#c2e7ff] hover:bg-[#b1d6ee] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005c94] dark:text-[#c2e7ff] rounded-full font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus size={20} />
              Create Prompt
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#282a2c] rounded-[2rem] w-full max-w-xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 sm:px-8 border-b border-slate-100 dark:border-slate-800/50 flex-shrink-0">
              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100">
                {editingPrompt ? 'Edit Prompt' : 'New Prompt'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form 
              className="flex flex-col flex-1 overflow-hidden"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const finalTags = [...modalTags];
                if (tagInput.trim()) {
                  const newTag = tagInput.trim();
                  if (!finalTags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
                    finalTags.push(newTag);
                  }
                }
                handleSave(formData.get('title') as string, formData.get('body') as string, finalTags);
              }}
            >
              <div className="p-6 sm:px-8 flex-1 overflow-y-auto min-h-0 space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 ml-2">Title</label>
                  <input 
                    type="text" 
                    id="title"
                    name="title"
                    value={modalTitle}
                    onChange={(e) => { setModalTitle(e.target.value); setIsDirty(true); }}
                    placeholder="e.g., Code Review Expert"
                    required
                    className="w-full bg-slate-50 dark:bg-[#1e1f20] rounded-full px-6 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base border border-transparent dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 ml-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {modalTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-sm font-medium">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors -mr-1.5">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Type a tag and press +"
                      className="flex-1 bg-slate-50 dark:bg-[#1e1f20] rounded-full px-6 py-4 text-base text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={addTagFromInput}
                      className="px-5 py-4 bg-[#c2e7ff] hover:bg-[#b1d6ee] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005c94] dark:text-[#c2e7ff] rounded-full transition-colors flex items-center justify-center shadow-sm"
                      aria-label="Add tag"
                    >
                      <Plus size={20} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col flex-1 min-h-[200px]">
                  <div className="flex justify-between items-center mb-2 ml-2">
                    <label htmlFor="body" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Prompt Body</label>
                    <div className="flex bg-white dark:bg-[#282a2c] rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                      <button 
                        type="button" 
                        onClick={() => setIsPreviewMode(false)} 
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!isPreviewMode ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsPreviewMode(true)} 
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${isPreviewMode ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                  {isPreviewMode ? (
                    <div className="w-full flex-1 min-h-[200px] bg-slate-50 dark:bg-[#1e1f20] rounded-[2rem] px-6 py-5 text-slate-800 dark:text-slate-200 overflow-y-auto prose dark:prose-invert prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-white dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-800 border border-transparent dark:border-slate-700">
                      <Markdown>{modalBody || '*Nothing to preview*'}</Markdown>
                    </div>
                  ) : (
                    <textarea 
                      id="body"
                      name="body"
                      value={modalBody}
                      onChange={(e) => { setModalBody(e.target.value); setIsDirty(true); }}
                      placeholder="Enter your prompt text here... (Markdown supported)"
                      required
                      className="w-full flex-1 min-h-[200px] bg-slate-50 dark:bg-[#1e1f20] rounded-[2rem] px-6 py-5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-base border border-transparent dark:border-slate-700"
                    />
                  )}
                </div>
              </div>
              <div id="modal-footer" className="p-6 sm:px-8 border-t border-slate-100 dark:border-slate-800/50 flex justify-end gap-3 bg-white dark:bg-[#282a2c] flex-shrink-0">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3.5 text-base font-medium bg-[#c2e7ff] hover:bg-[#b1d6ee] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005c94] dark:text-[#c2e7ff] rounded-full transition-colors active:scale-95 shadow-sm"
                >
                  {editingPrompt ? 'Save Changes' : 'Create Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {promptToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#282a2c] rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                {prompts.find(p => p.id === promptToDelete)?.isDeleted ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6 text-red-500 dark:text-red-400">
                      <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Delete permanently?
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-base mb-8">
                      This action cannot be undone. The prompt will be permanently removed from your vault.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400">
                      <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Move to Trash?
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-base mb-8">
                      This prompt will be moved to the Trash. You can easily restore it later from the Deleted folder.
                    </p>
                  </>
                )}
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setPromptToDelete(null)}
                    className="flex-1 px-6 py-3.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (prompts.find(p => p.id === promptToDelete)?.isDeleted) {
                        handleHardDelete(promptToDelete);
                        setPromptToDelete(null);
                      } else {
                        executeSoftDelete();
                      }
                    }}
                    className={`flex-1 px-6 py-3.5 text-base font-medium text-white rounded-full transition-colors active:scale-95 ${
                      prompts.find(p => p.id === promptToDelete)?.isDeleted
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-amber-500 hover:bg-amber-600'
                    }`}
                  >
                    {prompts.find(p => p.id === promptToDelete)?.isDeleted ? 'Delete' : 'Move to Trash'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Discard Modal */}
      <AnimatePresence>
        {isConfirmDiscardOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#282a2c] rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6 text-red-500 dark:text-red-400">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Discard changes?
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-base mb-8">
                  You have unsaved changes. Are you sure you want to discard them?
                </p>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setIsConfirmDiscardOpen(false)}
                    className="flex-1 px-6 py-3.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    No, keep editing
                  </button>
                  <button 
                    onClick={() => {
                      setIsConfirmDiscardOpen(false);
                      setIsModalOpen(false);
                      setEditingPrompt(null);
                      setModalTitle('');
                      setModalBody('');
                      setModalTags([]);
                      setTagInput('');
                      setIsDirty(false);
                    }}
                    className="flex-1 px-6 py-3.5 text-base font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                  >
                    Yes, discard
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#282a2c] rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between p-6 sm:px-8 border-b border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100">
                  Settings
                </h3>
                <button 
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 sm:px-8 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Appearance</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">Dark Mode</span>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isDarkMode ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workflow Modifiers</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">Auto-Close on Copy</span>
                    <button
                      onClick={() => setAppSettings(prev => ({ ...prev, autoCloseOnCopy: !prev.autoCloseOnCopy }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${appSettings.autoCloseOnCopy ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appSettings.autoCloseOnCopy ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">Include Title on Copy</span>
                    <button
                      onClick={() => setAppSettings(prev => ({ ...prev, includeTitleOnCopy: !prev.includeTitleOnCopy }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${appSettings.includeTitleOnCopy ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appSettings.includeTitleOnCopy ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</h4>
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Download size={18} />
                    Export Backup (CSV)
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Upload size={18} />
                    Import Backup (CSV)
                  </button>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                  <h4 className="text-sm font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">Danger Zone</h4>
                  <button
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      setFactoryResetInput('');
                      setIsFactoryResetModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    <AlertTriangle size={18} />
                    Factory Reset
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Factory Reset Modal */}
      <AnimatePresence>
        {isFactoryResetModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#282a2c] rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6 text-red-500 dark:text-red-400">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Factory Reset
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-base mb-6">
                  This will permanently delete all your prompts, settings, and data. This action cannot be undone.
                </p>
                <div className="w-full mb-8">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-left">
                    Type <span className="font-bold text-red-500">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={factoryResetInput}
                    onChange={(e) => setFactoryResetInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1e1f20] rounded-xl py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-slate-900 dark:text-slate-100 border border-transparent focus:border-red-500"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setIsFactoryResetModalOpen(false)}
                    className="flex-1 px-6 py-3.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={factoryResetInput !== 'DELETE'}
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className={`flex-1 px-6 py-3.5 text-base font-medium text-white rounded-full transition-colors ${
                      factoryResetInput === 'DELETE'
                        ? 'bg-red-500 hover:bg-red-600 active:scale-95'
                        : 'bg-red-500/50 cursor-not-allowed'
                    }`}
                  >
                    Permanently Delete All Data
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Empty Trash Confirmation Modal */}
      <AnimatePresence>
        {isEmptyTrashModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#282a2c] rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6 text-red-500 dark:text-red-400">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Empty Trash?
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-base mb-8">
                  This will permanently delete all prompts in the trash. This action cannot be undone.
                </p>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setIsEmptyTrashModalOpen(false)}
                    className="flex-1 px-6 py-3.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleEmptyTrash}
                    className="flex-1 px-6 py-3.5 text-base font-medium bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors active:scale-95"
                  >
                    Empty Trash
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#282a2c] rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 sm:px-8 border-b border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100">
                  Version History
                </h3>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:px-8 space-y-4">
                {!selectedPrompt.versions || selectedPrompt.versions.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 py-12">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No previous versions available.</p>
                  </div>
                ) : (
                  selectedPrompt.versions.map((version, index) => (
                    <div key={version.id} className="bg-slate-50 dark:bg-[#1e1f20] rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(version.savedAt).toLocaleString()}
                        </div>
                        <button
                          onClick={() => {
                            setPrompts(prev => prev.map(p => {
                              if (p.id === selectedPrompt.id) {
                                const newVersion: PromptVersion = {
                                  id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                                  title: p.title,
                                  body: p.body,
                                  tags: [...p.tags],
                                  savedAt: Date.now()
                                };
                                return { ...p, title: version.title, body: version.body, tags: [...version.tags], versions: [newVersion, ...(p.versions || [])] };
                              }
                              return p;
                            }));
                            setIsHistoryModalOpen(false);
                            showToast('Reverted to previous version');
                          }}
                          className="px-4 py-2 bg-[#c2e7ff] hover:bg-[#b1d6ee] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005c94] dark:text-[#c2e7ff] text-sm font-medium rounded-full transition-colors"
                        >
                          Restore This Version
                        </button>
                      </div>
                      <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">{version.title}</h4>
                      <div className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-3">{version.body}</div>
                      {version.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {version.tags.map(tag => (
                            <span key={tag} className="px-2.5 py-1 bg-white dark:bg-[#282a2c] text-slate-700 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 px-5 py-3.5 rounded-full shadow-lg flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-1.5 rounded-full">
                  <Check size={18} className="text-blue-400 dark:text-blue-600" />
                </div>
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
              {toast.action && (
                <>
                  <div className="w-px h-4 bg-slate-700 dark:bg-slate-300"></div>
                  <button 
                    onClick={() => {
                      toast.action!.onClick();
                      setToast(null);
                    }}
                    className="text-sm font-bold bg-blue-500/20 text-blue-400 dark:text-blue-600 hover:bg-blue-500/30 px-3 py-1.5 rounded-md uppercase tracking-wide transition-colors"
                  >
                    {toast.action.label}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
