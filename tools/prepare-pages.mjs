import {copyFileSync,readdirSync,readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join,extname,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..'),output=resolve(root,process.argv[2]||'_site');
if(existsSync(output))throw Error('Output already exists. Choose a fresh output directory.');
const commit=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(!/^[a-f\d]{40,64}$/i.test(commit))throw Error('Expected a Git commit ID');
// A local checkout may contain personal/test assets. Publish only Git's inventory.
const tracked=execFileSync('git',['ls-files','-z','dist'],{cwd:root,encoding:'utf8',windowsHide:true}).split('\0').filter(Boolean);
for(const source of tracked){
 if(source==='dist/ink-check.html'||source.startsWith('dist/assets/local-skies/'))continue;
 const dest=join(output,source.slice(5));mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(root,source),dest);
}
for(const entry of readdirSync(output,{withFileTypes:true,recursive:true})){
 if(!entry.isFile()||!['.html','.css','.js'].includes(extname(entry.name)))continue;
 const file=join(entry.parentPath,entry.name),text=readFileSync(file,'utf8');
 writeFileSync(file,text.replace(/\?v=[\w.-]+/g,`?v=gh-${commit}`));
}
writeFileSync(join(output,'.nojekyll'),'');
const files={};
for(const entry of readdirSync(output,{withFileTypes:true,recursive:true})){if(!entry.isFile())continue;const path=join(entry.parentPath,entry.name),key=path.slice(output.length+1).replaceAll('\\','/'),bytes=readFileSync(path);files[key]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
writeFileSync(join(output,'release.json'),JSON.stringify({commit,builtAt:new Date().toISOString(),files},null,2)+'\n');
console.log(`Prepared GitHub Pages from ${commit.slice(0,12)}`);
