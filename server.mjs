import { createServer } from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const password = process.env.TRACKER_PASSWORD;
if (!password || password.length < 20) throw new Error('Set TRACKER_PASSWORD to at least 20 characters');
const filename = process.env.TRACKER_DB || './storage/tracker.sqlite';
mkdirSync(dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL)');
const read = db.prepare('SELECT data, revision FROM snapshots WHERE id=1');
const write = db.prepare('INSERT INTO snapshots VALUES (1, ?, 1) ON CONFLICT(id) DO UPDATE SET data=excluded.data, revision=snapshots.revision+1');
const files = new Map([['/', ['index.html','text/html']], ...['data.js','modules.js','app.js','sync.js','style.css'].map(name=>['/'+name,[name,name.endsWith('.css')?'text/css':'text/javascript']])]);
const digest = value => createHash('sha256').update(value).digest();
const expected = digest('tracker:'+password);

createServer(async (req,res)=>{
 const send=(code, body='', type='text/plain')=>{
  res.writeHead(code,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(body);
 };
 const path=(req.url??'/').split('?')[0];
 if(path==='/health'&&req.method==='GET'){ db.prepare('SELECT 1').get();return send(200,'ok'); }
 const authorization=req.headers.authorization??'';
 if(!authorization.startsWith('Basic ')||!timingSafeEqual(digest(Buffer.from(authorization.slice(6),'base64')),expected)){
  res.setHeader('WWW-Authenticate','Basic realm="Private Learning Tracker", charset="UTF-8"');
  return send(401,'Sign in with username tracker.');
 }
 if(path==='/api/snapshot'){
  try{
   if(req.method==='GET'){
    const snapshot=read.get();
    return send(200,snapshot?JSON.stringify({revision:snapshot.revision,state:JSON.parse(snapshot.data)}):'{"revision":0,"state":null}','application/json');
   }
   if(req.method!=='PUT')return send(405);
   if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')return send(403);
   if(req.headers['content-type']!=='application/json')return send(415);
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)return send(413);chunks.push(chunk);}
   const {revision,state}=JSON.parse(Buffer.concat(chunks));
   if(!state||typeof state.records!=='object'||!state.records||!Array.isArray(state.activity)||!Array.isArray(state.projects))return send(400);
   const existing=read.get();
   if(revision!==(existing?.revision??0))return send(409);
   write.run(JSON.stringify(state));
   return send(200,JSON.stringify({revision:revision+1}),'application/json');
  }catch(error){console.error(error.message);return send(500,'Could not save tracker data');}
 }
 const file=files.get(path);
 if(!file||req.method!=='GET')return send(404);
 send(200,readFileSync(new URL('./dist/'+file[0],import.meta.url)),file[1]);
}).listen(Number(process.env.PORT??3000),'0.0.0.0');
