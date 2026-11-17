import { createServer } from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const password = process.env.TRACKER_PASSWORD;
if (!password || password.length < 20) throw new Error('Set TRACKER_PASSWORD to at least 20 characters');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL');
const db = new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:5000});
db.on('error',()=>console.error('Idle database connection failed'));
await db.query(`CREATE SCHEMA IF NOT EXISTS career_tracker;
CREATE TABLE IF NOT EXISTS career_tracker.snapshot (
 id integer PRIMARY KEY CHECK (id=1),
 data jsonb NOT NULL,
 revision integer NOT NULL
);`);
const read=()=>db.query('SELECT data, revision FROM career_tracker.snapshot WHERE id=1');
const files = new Map([['/', ['index.html','text/html']], ...['data.js','modules.js','app.js','sync.js','style.css'].map(name=>['/'+name,[name,name.endsWith('.css')?'text/css':'text/javascript']])]);
const digest = value => createHash('sha256').update(value).digest();
const expected = digest('tracker:'+password);

createServer(async (req,res)=>{
 const send=(code, body='', type='text/plain')=>{
  res.writeHead(code,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(body);
 };
 const path=(req.url??'/').split('?')[0];
 if(path==='/health'&&req.method==='GET'){ try{await db.query('SELECT 1');return send(200,'ok');}catch{return send(503,'Database unavailable');} }
 const authorization=req.headers.authorization??'';
 if(!authorization.startsWith('Basic ')||!timingSafeEqual(digest(Buffer.from(authorization.slice(6),'base64')),expected)){
  res.setHeader('WWW-Authenticate','Basic realm="Private Learning Tracker", charset="UTF-8"');
  return send(401,'Sign in with username tracker.');
 }
 if(path==='/api/snapshot'){
  try{
   if(req.method==='GET'){
    const {rows:[snapshot]}=await read();
    return send(200,snapshot?JSON.stringify({revision:snapshot.revision,state:snapshot.data}):'{"revision":0,"state":null}','application/json');
   }
   if(req.method!=='PUT')return send(405);
   if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')return send(403);
   if(req.headers['content-type']!=='application/json')return send(415);
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)return send(413);chunks.push(chunk);}
   const {revision,state}=JSON.parse(Buffer.concat(chunks));
   if(!state||typeof state.records!=='object'||!state.records||!Array.isArray(state.activity)||!Array.isArray(state.projects))return send(400);
   if(!Number.isSafeInteger(revision)||revision<0)return send(400);
   const values=[JSON.stringify(state)];
   const result=revision===0
    ?await db.query('INSERT INTO career_tracker.snapshot VALUES (1,$1,1) ON CONFLICT DO NOTHING RETURNING revision',values)
    :await db.query('UPDATE career_tracker.snapshot SET data=$1, revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision',[...values,revision]);
   if(!result.rowCount)return send(409);
   return send(200,JSON.stringify(result.rows[0]),'application/json');
  }catch(error){console.error('Snapshot request failed',error.code??error.name);return send(500,'Could not save tracker data');}
 }
 const file=files.get(path);
 if(!file||req.method!=='GET')return send(404);
 send(200,readFileSync(new URL('./dist/'+file[0],import.meta.url)),file[1]);
}).listen(Number(process.env.PORT??3000),'0.0.0.0');
