import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname,extname} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'..'),dist=join(root,'dist');
const files=readdirSync(dist,{withFileTypes:true}).filter(e=>e.isFile()&&['.js','.html','.css'].includes(extname(e.name))&&e.name!=='ink-check.html');
function run(args){const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1);}
for(const {name} of files){
 const file=join(dist,name),source=readFileSync(file,'utf8');
 if(name.endsWith('.js'))run(['--check',file]);
 const paths=name.endsWith('.html')?[...source.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]):[...source.matchAll(/(?:from\s*|import\s*\(|new URL\s*\()\s*["'](\.\.?\/[^"']+)["']/g)].map(m=>m[1]);
 for(const ref of paths){
  if(/^(?:[a-z]+:|#|\/\/)/i.test(ref))continue;
  assert(!ref.startsWith('/'),`${name}: use a relative path for GitHub project sites: ${ref}`);
  assert(existsSync(resolve(dirname(file),ref.split(/[?#]/)[0])),`${name}: missing ${ref}`);
 }
}
const tests=['test-template','test-tool-switching','test-tool-order','test-frame-input','test-editing-history','test-canvas-documents','test-hosted-motion','test-movement-entry','test-camera-navigation','test-walk-navigation','test-background-ground','test-scene-workspace','test-scene-sky','test-hand-closure','test-hdri-lighting','test-shot-camera','test-scene-selection','test-scene-groups','check-site-assets'];
for(const test of tests)run(['--import','./tools/test-module-loader.mjs',`tools/${test}.mjs`]);
console.log(`PASS: ${files.length} source files, relative entry points and ${tests.length} editing/3D/asset checks`);
