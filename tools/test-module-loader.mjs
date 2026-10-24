// Browser cache versions do not create distinct stateful modules in Node tests.
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){const r=next(s,c);if(r.url.startsWith('file:')&&r.url.includes('?v=')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
