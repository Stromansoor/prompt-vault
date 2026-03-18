const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix double replacements
content = content.replace(/bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-900/g, 'bg-white dark:bg-zinc-900');
content = content.replace(/bg-zinc-200 dark:bg-zinc-700 dark:bg-zinc-800/g, 'bg-zinc-100 dark:bg-zinc-800');
content = content.replace(/bg-zinc-300 dark:bg-zinc-600 dark:bg-zinc-700/g, 'bg-zinc-200 dark:bg-zinc-700');

content = content.replace(/text-zinc-800 dark:text-zinc-200 dark:text-zinc-100/g, 'text-zinc-900 dark:text-zinc-100');
content = content.replace(/text-zinc-700 dark:text-zinc-300 dark:text-zinc-200/g, 'text-zinc-800 dark:text-zinc-200');
content = content.replace(/text-zinc-600 dark:text-zinc-400 dark:text-zinc-300/g, 'text-zinc-700 dark:text-zinc-300');
content = content.replace(/text-zinc-500 dark:text-zinc-400 dark:text-zinc-500/g, 'text-zinc-400 dark:text-zinc-500');
content = content.replace(/text-zinc-400 dark:text-zinc-500 dark:text-zinc-400/g, 'text-zinc-500 dark:text-zinc-400');

content = content.replace(/border-zinc-300 dark:border-zinc-700 dark:border-zinc-800/g, 'border-zinc-200 dark:border-zinc-800');
content = content.replace(/border-zinc-400 dark:border-zinc-600 dark:border-zinc-700/g, 'border-zinc-300 dark:border-zinc-700');

content = content.replace(/hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:bg-zinc-900/g, 'hover:bg-white dark:hover:bg-zinc-900');
content = content.replace(/hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:hover:bg-zinc-800/g, 'hover:bg-zinc-100 dark:hover:bg-zinc-800');

content = content.replace(/hover:text-zinc-800 dark:hover:text-zinc-200 dark:hover:text-zinc-100/g, 'hover:text-zinc-900 dark:hover:text-zinc-100');
content = content.replace(/hover:text-zinc-700 dark:hover:text-zinc-300 dark:hover:text-zinc-200/g, 'hover:text-zinc-800 dark:hover:text-zinc-200');
content = content.replace(/hover:text-zinc-600 dark:hover:text-zinc-400 dark:hover:text-zinc-300/g, 'hover:text-zinc-700 dark:hover:text-zinc-300');
content = content.replace(/hover:text-zinc-500 dark:hover:text-zinc-400 dark:hover:text-zinc-500/g, 'hover:text-zinc-400 dark:hover:text-zinc-500');
content = content.replace(/hover:text-zinc-400 dark:hover:text-zinc-500 dark:hover:text-zinc-400/g, 'hover:text-zinc-500 dark:hover:text-zinc-400');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed double replacements');
