import { access, mkdir, cp, rm } from 'node:fs/promises';

for (const file of ['index.html','styles.css','src/app.js','lib/rating.js','data/fallback.js']) await access(file);
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true});
for (const file of ['index.html','styles.css','src','lib','data','public']) await cp(file,`dist/${file}`,{recursive:true});
await cp('public/og.png','dist/og.png');
for (const file of ['apple-touch-icon.png','icon-192.png','icon-512.png','site.webmanifest']) await cp(`public/${file}`,`dist/${file}`);
console.log('Static build complete: dist/');
