const cloud = {
 revision:0, available:false, pending:null, saving:false, conflicted:false,
 async load(){
  try{
   const response=await fetch('/api/snapshot',{cache:'no-store'});
   if(!response.ok)return null;
   const result=await response.json();
   this.available=true;
   this.revision=result.revision;
   return result.state;
  }catch{return null;}
 },
 async queue(state){
  if(!this.available||this.conflicted)return;
  this.pending=JSON.stringify(state);
  if(this.saving)return;
  this.saving=true;
  const status=document.querySelector('.saved');
  try{
   while(this.pending){
    const snapshot=this.pending;
    this.pending=null;
    status.textContent='Saving to server…';
    try{
     const result=await fetch('/api/snapshot',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{"revision":'+this.revision+',"state":'+snapshot+'}'});
     if(result.status===409){this.conflicted=true;status.textContent='Newer server copy exists. Export your local backup before reloading.';return;}
     if(!result.ok)throw new Error('Save failed');
     this.revision=(await result.json()).revision;
     status.textContent='Saved to server';
    }catch{
     this.pending??=snapshot;
     status.textContent='Saved locally · server unavailable';
     setTimeout(()=>{if(this.pending)this.queue(JSON.parse(this.pending));},5000);
     return;
    }
   }
  }finally{this.saving=false;}
 }
};

export { cloud };
