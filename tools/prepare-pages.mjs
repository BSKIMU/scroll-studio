import {cpSync,readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {execFileSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'..'),output=join(root,'_site');
if(existsSync(output))throw Error('_site already exists. Keep it for review or choose a fresh checkout.');
const commit=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(!/^[a-f\d]{40,64}$/i.test(commit))throw Error('Expected a Git commit ID');
cpSync(join(root,'dist'),output,{recursive:true,filter:source=>!source.endsWith('ink-check.html')});
for(const entry of readdirSync(output,{withFileTypes:true})){
 if(!entry.isFile()||!['.html','.css','.js'].includes(extname(entry.name)))continue;
 const file=join(output,entry.name),text=readFileSync(file,'utf8');
 writeFileSync(file,text.replace(/\?v=[\w.-]+/g,`?v=gh-${commit}`));
}
writeFileSync(join(output,'.nojekyll'),'');
writeFileSync(join(output,'release.json'),JSON.stringify({commit,builtAt:new Date().toISOString()},null,2)+'\n');
console.log(`Prepared GitHub Pages from ${commit.slice(0,12)}`);
