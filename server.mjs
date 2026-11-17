import { createServer } from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const password = process.env.TRACKER_PASSWORD;
if (!password || password.length < 20) throw new Error('Set TRACKER_PASSWORD to at least 20 characters');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL');
const connection = new URL(process.env.DATABASE_URL);
connection.searchParams.delete('sslmode');
const ca = "-----BEGIN CERTIFICATE-----\nMIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL\nBQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l\ndyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh\nc2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow\nazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD\nYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug\nUm9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW\nQyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q\nDmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2\nGtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi\ncvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4\nO4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt\nNaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX\nuXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt\naUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU\ntVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b\nVW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6\njB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx\nCea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2\nCMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P\no/bKiIz+Fq8=\n-----END CERTIFICATE-----";
const db = new pg.Pool({connectionString:connection.href,ssl:{ca,rejectUnauthorized:true},max:3,connectionTimeoutMillis:5000});
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
