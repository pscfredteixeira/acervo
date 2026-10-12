// ACERVO - Sprint 5. Extrai APENAS metadados públicos, não baixa artigos completos.
const cors = {
  "Access-Control-Allow-Origin": "https://pscfredteixeira.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
function respond(body: unknown, code = 200) { return new Response(JSON.stringify(body), {status: code, headers:cors}); }
const MAX_BYTES = 350_000;
const forbiddenSuffix = /(?:^|\.)(?:localhost|local|internal|intranet|test|invalid|example|home|lan|corp)$/i;
function isPublicIPv4(ip: string) {
  const nums=ip.split(".").map(Number);
  if(nums.length!==4 || nums.some(x=>!Number.isInteger(x)||x<0||x>255)) return false;
  const [a,b,c]=nums;
  return !(a===0 || a===10 || a===127 || a>=224 || a===169&&b===254 ||
    a===172&&b>=16&&b<=31 || a===192&&b===168 || a===100&&b>=64&&b<=127 ||
    a===192&&b===0&&c===0 || a===192&&b===0&&c===2 ||
    a===198&&b===18 || a===198&&b===19 || a===198&&b===51&&c===100 ||
    a===203&&b===0&&c===113 || a===255);
}
function isPublicIPv6(ip: string) {
  const s=ip.toLowerCase().replace(/^\[|\]$/g,"");
  if(!s.includes(":")) return false;
  if(s==="::"||s==="::1"||s.startsWith("fe80:")||s.startsWith("fe90:")||
    s.startsWith("fea0:")||s.startsWith("feb0:")||s.startsWith("fc")||s.startsWith("fd")||
    s.startsWith("ff")||s.startsWith("2001:db8:")||s.startsWith("2001:0db8:"))return false;
  // IPv4-embedded addresses, including the mapped ::ffff:127.0.0.1.
  const tail=s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if(tail)return isPublicIPv4(tail[1])&&!s.includes("::ffff:")&&!s.includes("::");
  return !s.startsWith("::");
}
function publicAnswer(ip: string, kind: number){
  return kind===1 ? isPublicIPv4(ip) : isPublicIPv6(ip);
}
async function lookup(host: string, type: "A"|"AAAA", signal:AbortSignal):Promise<string[]> {
  const url="https://dns.google/resolve?name="+encodeURIComponent(host)+"&type="+type;
  const r=await fetch(url,{headers:{accept:"application/dns-json"},signal,redirect:"error"});
  if(!r.ok)throw Error("Não foi possível verificar o domínio com segurança.");
  const j=await r.json();
  if(![0,3].includes(j.Status)) throw Error("Domínio indisponível.");
  return (j.Answer||[]).filter((x: {type:number})=>x.type===(type==="A"?1:28)).map((x: {data:string})=>x.data);
}
async function vetted(raw:string,signal:AbortSignal) {
  let u:URL;
  try { u=new URL(raw.trim()); } catch {throw Error("Link inválido.");}
  if(!["https:","http:"].includes(u.protocol)||u.username||u.password)throw Error("Use um link http ou https público.");
  if(u.port && !((u.port==="443"&&u.protocol==="https:")||(u.port==="80"&&u.protocol==="http:")))throw Error("Endereço com porta não permitida.");
  const host=u.hostname.toLowerCase().replace(/\.$/,"");
  if(!host.includes(".")||host.endsWith(".onion")||forbiddenSuffix.test(host)||host.length>253||
    host.includes("%")||host.includes("..")||host==="0.0.0.0")throw Error("Esse domínio não é permitido.");
  if(/^\d|^\[/.test(host) || /^[0-9a-f:.]+$/i.test(host)) throw Error("Links diretamente para endereços IP não são permitidos.");
  const [a,aaaa]=await Promise.all([lookup(host,"A",signal),lookup(host,"AAAA",signal)]);
  if(!(a.length+aaaa.length)||a.some(ip=>!publicAnswer(ip,1))||aaaa.some(ip=>!publicAnswer(ip,28)))
    throw Error("O domínio não aponta exclusivamente para endereços públicos.");
  u.hash="";
  return u;
}
function htmlDecode(s:string) {
  return s.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos|nbsp|hellip|mdash|ndash);/gi,
  (m,v)=>{
    const mapped:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",hellip:"…",mdash:"—",ndash:"–"};
    if(v[0]==="#"){let n=v[1]?.toLowerCase()==="x"?parseInt(v.slice(2),16):parseInt(v.slice(1),10);
      return n>0&&n<=0x10ffff?String.fromCodePoint(n):m;}
    return mapped[v.toLowerCase()]||m;
  }).replace(/\s+/g," ").trim();
}
function attr(tag:string,key:string){
  const reg=new RegExp("(?:^|\\s)"+key+"\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))","i");
  const m=tag.match(reg);
  return m ? htmlDecode(m[1]??m[2]??m[3]) : "";
}
function pick(html:string){
  const m=new Map<string,string>();
  for(const tag of html.match(/<meta\s[^>]*>/gi)||[]){
    const key=(attr(tag,"property")||attr(tag,"name")).toLowerCase();
    const val=attr(tag,"content");
    if(key&&val&&!m.has(key))m.set(key,val);
  }
  const t=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title=htmlDecode(m.get("og:title")||m.get("twitter:title")||t?.[1]||"").slice(0,180);
  const description=htmlDecode(m.get("og:description")||m.get("twitter:description")||m.get("description")||"").slice(0,1500);
  const site=htmlDecode(m.get("og:site_name")||"").slice(0,100);
  const contentType=m.get("og:type")||"";
  return {title,description,site,contentType};
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return respond({error:"Método não permitido."},405);
  // A validação JWT é obrigatória no gateway (verify_jwt:true).
  if(!req.headers.get("authorization")?.startsWith("Bearer "))return respond({error:"Acesso não autorizado."},401);
  const origin=req.headers.get("origin");
  if(origin && origin!=="https://pscfredteixeira.github.io")return respond({error:"Origem não permitida."},403);
  const aborter=new AbortController();
  const timer=setTimeout(()=>aborter.abort(),8500);
  try{
    const body=await req.json();
    if(typeof body?.url!=="string"||body.url.length>3000) return respond({error:"Informe um link válido."},400);
    let current=body.url;
    for(let redirects=0;redirects<3;redirects++){
      const u=await vetted(current,aborter.signal);
      const result=await fetch(u.href,{
        headers:{"Accept":"text/html,application/xhtml+xml;q=0.9","User-Agent":"ACERVO-Metadata/1.0 (+https://pscfredteixeira.github.io/acervo/)"},
        redirect:"manual",signal:aborter.signal
      });
      if([301,302,303,307,308].includes(result.status)){
        const location=result.headers.get("location");
        if(!location)throw Error("Redirecionamento sem destino.");
        current=new URL(location,u).href;
        result.body?.cancel();
        continue;
      }
      if(!result.ok)throw Error("O site não permitiu consultar os metadados.");
      const mime=result.headers.get("content-type")||"";
      if(!/text\/html|application\/xhtml\+xml/i.test(mime))throw Error("Esse link não é uma página HTML.");
      const n=Number(result.headers.get("content-length")||0);
      if(n>MAX_BYTES)throw Error("A página é grande demais para uma leitura rápida.");
      const reader=result.body?.getReader();
      if(!reader)throw Error("A página não retornou conteúdo.");
      let size=0;
      const parts:Uint8Array[]=[];
      while(size<MAX_BYTES){
        const {done,value}=await reader.read();
        if(done)break;
        if(value){size+=value.length;parts.push(value);}
        if(size>=MAX_BYTES){await reader.cancel();break;}
      }
      const data=new Uint8Array(Math.min(size,MAX_BYTES));
      let offset=0;
      for(const chunk of parts){
        const length=Math.min(chunk.length,data.length-offset);
        data.set(chunk.subarray(0,length),offset);offset+=length;
        if(offset>=data.length)break;
      }
      const html=new TextDecoder("utf-8",{fatal:false}).decode(data);
      const metadata=pick(html);
      return respond({...metadata,url:u.href,partial:size>=MAX_BYTES});
    }
    throw Error("O link redirecionou muitas vezes.");
  }catch(error){
    const reason=error instanceof Error?error.message:"Não foi possível ler a página.";
    return respond({error:reason.includes("abort")?"Tempo de consulta esgotado.":reason},422);
  }finally{clearTimeout(timer);}
});
