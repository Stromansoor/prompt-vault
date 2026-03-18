const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="my-2 border-t border-zinc-200 dark:border-zinc-800/50"></div>
          <button
            onClick={() => { setViewMode('deleted'); setSelectedTags([]); setIsSidebarOpen(false); }}
            className={\`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors \${viewMode === 'deleted' ? 'bg-red-200 text-red-950' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200'}\`}
          >
            <Trash2 size={18} />
            Deleted
          </button>
        </div>`;

const replacement = `</div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col gap-1">
          <button
            onClick={() => { setViewMode('deleted'); setSelectedTags([]); setIsSidebarOpen(false); }}
            className={\`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors \${viewMode === 'deleted' ? 'bg-red-200 text-red-950' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200'}\`}
          >
            <Trash2 size={18} />
            Deleted
          </button>
          <button
            onClick={() => { setIsSettingsModalOpen(true); setIsSidebarOpen(false); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-colors text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log('Replaced sidebar footer');
