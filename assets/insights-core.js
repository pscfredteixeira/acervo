(() => {
  'use strict';
  const CONCEPTS=[
    {id:'vinculos',label:'Solidão e vínculos',terms:'solidao isolamento vinculo vinculos relacao relacionamento relacionamentos intimidade conexao conexoes namoro amizade afetos afeto aplicativo aplicativos tinder grindr encontro encontros',question:'Como as formas de conexão e isolamento aparecem nessas referências?'},
    {id:'desejo',label:'Desejo e sexualidade',terms:'desejo desejar sexualidade sexual sexo sexualizacao pornografia porno erotismo erotico prazer fetiche corpo sexualidades',question:'Que tensões entre desejo, prazer e normas sociais essas fontes permitem investigar?'},
    {id:'fe',label:'Fé e pertencimento',terms:'religiao religioso religiosa espiritualidade igreja fe crença crenca ritual comunidade pertencimento sagrado deus culto',question:'Como as fontes descrevem buscas por sentido, comunidade ou pertencimento?'},
    {id:'tecnologia',label:'Tecnologia e subjetividade',terms:'algoritmo algoritmos inteligencia artificial ia plataforma plataformas tecnologia tecnologico digital redes rede internet aplicativo aplicativos celular social midia midias',question:'Que efeitos subjetivos da vida nas plataformas merecem uma pauta?'},
    {id:'cultura',label:'Cultura e entretenimento',terms:'cultura cultural jogo jogos games videogame videogames musica musical artista album show cinema filme filmes serie series literatura livro livros arte',question:'O que essas produções culturais revelam sobre modos de sentir e viver?'},
    {id:'sofrimento',label:'Trabalho e sofrimento',terms:'trabalho trabalhador burnout ansiedade ansioso cansaco exaustao produtividade desempenho sofrimento pressao estresse stress depressao',question:'Que formas de sofrimento ou exigência de desempenho as referências aproximam?'},
    {id:'linguagem',label:'Linguagem e memória',terms:'memoria esquecimento esquecer lembrar palavra linguagem discurso narrativa narrativas inconsciente psicanalise psicanalise',question:'Como memória, narrativa e linguagem atravessam os materiais?'},
    {id:'imagem',label:'Corpo e imagem',terms:'corpo imagem aparencia beleza estetica narcisismo espelho envelhecimento selfie padrao padroes',question:'Como as referências relacionam aparência, corpo e reconhecimento?'},
    {id:'formacao',label:'Educação e formação',terms:'educacao educacional aprender aprendizagem formacao ensinar ensino escola aluno alunos professor professores curso lacan freud teoria',question:'Quais conceitos podem virar conteúdo didático a partir dessas referências?'}
  ];
  const STOP=new Set('a o e de da do das dos para com por em no na nos nas uma um uns umas ou que quem qual quais como se ser estar sobre mais menos suas seus sua seu meu minha nosso nossa pela pelo entre ate após aos aos as os ao ha tem ter ja foi sera eles elas esse essa isso isto numa num onde quando porque sem sob pelo cada muito pouco tudo todo todos todas aquela aquele este esta esses estas'.split(' '));
  function normalize(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
  function tokens(raw) {
    return normalize(raw).match(/[a-z0-9]{2,}/g)?.filter(t=>!STOP.has(t))||[];
  }
  const terms=CONCEPTS.map(x=>({...x,words:new Set(tokens(x.terms))}));
  function fieldTokens(c){return [
    {name:'título',weight:4.5,words:new Set(tokens(c.title))},
    {name:'tag',weight:5.5,words:new Set(tokens((c.tags||[]).join(' ')))},
    {name:'pauta',weight:3.2,words:new Set(tokens(c.angle))},
    {name:'resumo',weight:2,words:new Set(tokens(c.description))},
    {name:'notas',weight:1.2,words:new Set(tokens(c.notes))},
    {name:'projeto',weight:.65,words:new Set(tokens(c.project))}
  ];}
  function conceptMatches(fields) {
    const found=[];
    for(const c of terms){
      let weight=0;
      for(const f of fields)for(const w of f.words)if(c.words.has(w))weight=Math.max(weight,f.weight);
      if(weight)found.push({id:c.id,label:c.label,weight});
    }
    return found;
  }
  function enrich(card){const fields=fieldTokens(card);return {...card,_fields:fields,_concepts:conceptMatches(fields)};}
  function search(cards,query,limit=12){
    const qw=[...new Set(tokens(query))];
    if(!qw.length)return [];
    const queryConcepts=terms.filter(c=>qw.some(w=>c.words.has(w)));
    return cards.filter(x=>!x.demo).map(enrich).map(card=>{
      let score=0;const hits=[];
      for(const word of qw){
        let best=0,bestField='';
        for(const f of card._fields)if(f.words.has(word)&&f.weight>best){best=f.weight;bestField=f.name;}
        if(best){score+=best;hits.push(bestField);}
      }
      for(const q of queryConcepts){
        if(card._concepts.some(c=>c.id===q.id)){
          score+=2;
          hits.push('tema: '+q.label);
        }
      }
      if(!score)return null;
      if(qw.every(w=>card._fields.some(f=>f.words.has(w))))score+=3;
      const why=[...new Set(hits)].slice(0,4);
      return {card,score:Math.round(score*10)/10,why};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||new Date(b.card.updatedAt)-new Date(a.card.updatedAt)).slice(0,limit);
  }
  function themes(cards,limit=6){
    const entries=cards.filter(c=>!c.demo&&c.status!=='arquivo').map(enrich);
    return terms.map(topic=>{
      const matches=entries.filter(c=>c._concepts.some(t=>t.id===topic.id))
       .sort((a,b)=>b._concepts.find(t=>t.id===topic.id).weight-a._concepts.find(t=>t.id===topic.id).weight)
       .slice(0,12);
      if(matches.length<2)return null;
      return {id:topic.id,title:topic.label,angle:topic.question,cardIds:matches.slice(0,8).map(x=>x.id),cards:matches.slice(0,4),count:matches.length};
    }).filter(Boolean).sort((a,b)=>b.count-a.count||a.title.localeCompare(b.title,'pt-BR')).slice(0,limit);
  }
  function related(cards,sourceId,limit=5){
    const entries=cards.filter(c=>!c.demo).map(enrich);
    const source=entries.find(c=>c.id===sourceId);
    if(!source)return [];
    const sourceTokens=new Set([...source._fields[0].words,...source._fields[1].words,...source._fields[2].words]);
    const sourceConcepts=new Set(source._concepts.map(t=>t.id));
    return entries.filter(c=>c.id!==sourceId).map(c=>{
      const overlap=[...sourceTokens].filter(t=>c._fields.slice(0,3).some(f=>f.words.has(t)));
      const concepts=c._concepts.filter(t=>sourceConcepts.has(t.id)).map(t=>t.label);
      const sharedTags=(source.tags||[]).filter(t=>(c.tags||[]).some(x=>normalize(x)===normalize(t)));
      const score=sharedTags.length*5+overlap.length*1.8+concepts.length*2.4;
      if(score<2.4)return null;
      return {card:c,score,why:[...new Set([...sharedTags.map(x=>'tag: '+x),...concepts.map(x=>'tema: '+x)])].slice(0,3)};
    }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,limit);
  }
  const api={normalize,tokens,search,themes,related,concepts:CONCEPTS.map(({id,label})=>({id,label}))};
  if(typeof window!=='undefined')window.AcervoInsightsCore=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();