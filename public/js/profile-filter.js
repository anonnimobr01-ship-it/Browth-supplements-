// Filtro do catálogo: não infere necessidades nem recomenda consumo.
const categories=['Whey','Creatina','Pré-Treino','Hipercalórico','Vitaminas'];
export function filterByProfile(products, answers={}, labels={}) {
 const warnings=[];
 const category=answers?.category||'all',diet=answers?.diet||'none',avoid=answers?.avoid||'none';
 const excludeCaffeine=answers?.caffeine==='yes';
 const max=answers?.budget==='all'||!answers?.budget?Infinity:Number(answers.budget);
 if((category!=='all'&&!categories.includes(category))||!['none','vegetarian','vegan'].includes(diet)||!['none','milk','soy','lactose','gluten'].includes(avoid)||!(max>=0)) {
  return {matches:[],warnings:['Revise os filtros selecionados.'],review:false};
 }
 const restricted=diet!=='none'||avoid!=='none'||excludeCaffeine;
 const matches=products.filter(p=>{
  if(p.active===false||Number(p.stock)<=0||!Number.isFinite(Number(p.price_cents))||Number(p.price_cents)>max)return false;
  if(category!=='all'&&p.category!==category)return false;
  if(!restricted)return true;
  const label=labels[p.id];
  if(label?.demo_complete!==true)return false;
  if(diet!=='none'&&label.diet?.[diet]!==true)return false;
  if(avoid!=='none'){
   if(!Array.isArray(label.allergens?.contains)||!Array.isArray(label.allergens?.may_contain))return false;
   const declared=[...label.allergens.contains,...label.allergens.may_contain];
   if(declared.includes(avoid)||label.free_from?.[avoid]!==true)return false;
   if(avoid==='lactose'&&declared.includes('milk'))return false;
  }
  if(excludeCaffeine&&(!Array.isArray(label.stimulants)||label.stimulants.includes('caffeine')))return false;
  return true;
 }).sort((a,b)=>a.price_cents-b.price_cents||a.name.localeCompare(b.name,'pt-BR'));
 if(restricted)warnings.push('Ingredientes e preferências são comparados com os dados de referência cadastrados. Confira o rótulo oficial para consumo.');
 if(!matches.length)warnings.push('Nenhum produto corresponde a essa combinação. Altere os filtros ou veja o catálogo completo.');
 else warnings.push('Filtros aplicados: '+matches.length+' produtos encontrados.');
 return {matches,warnings,review:false};
}
