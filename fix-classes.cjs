const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/dark:hover:bg-white dark:bg-zinc-900/g, 'dark:hover:bg-zinc-900');
content = content.replace(/dark:hover:text-zinc-800 dark:text-zinc-200/g, 'dark:hover:text-zinc-200');
content = content.replace(/dark:hover:bg-zinc-100 dark:bg-zinc-800/g, 'dark:hover:bg-zinc-800');
content = content.replace(/dark:hover:text-zinc-900 dark:text-zinc-100/g, 'dark:hover:text-zinc-100');
content = content.replace(/dark:hover:bg-zinc-200 dark:bg-zinc-700/g, 'dark:hover:bg-zinc-700');
content = content.replace(/dark:hover:text-zinc-700 dark:text-zinc-300/g, 'dark:hover:text-zinc-300');
content = content.replace(/dark:hover:text-zinc-500 dark:text-zinc-400/g, 'dark:hover:text-zinc-400');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed classes');
