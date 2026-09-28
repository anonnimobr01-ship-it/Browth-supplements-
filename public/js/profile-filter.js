// Restrições exigem ficha completa por SKU.
export function filterByProfile(products, answers, labels={}) {
 const warnings=[];
 if (!answers || !answers.goal) return {matches:[],warnings:['Escolha um objetivo para explorar o catálogo.'],review:false};
 if (answers.age !== 'adult' || answers.health !== 'no') return {
  matches:[], warnings:['Sua resposta pede uma avaliação individual. Consulte o rótulo e um profissional de saúde antes de escolher um suplemento.'], review:true
 };
 const restricted=answers.diet !== 'none' || answers.avoid !== 'none';
 const frequency={none:0,low:1,medium:3,high:5}[answers.frequency]??0;
 const max=Number(answers.budget)||Infinity;
 const scores={
  Whey: (answers.protein==='yes' && ['gain','nutrition','routine'].includes(answers.goal))?4:0,
  Creatina: (frequency>=3 && ['gain','performance'].includes(answers.goal))?3:0,
  'Hipercalórico': (answers.calories==='yes' && ['gain','nutrition'].includes(answers.goal))?3:0,
  'Pré-Treino': (frequency>=3 && answers.goal==='performance' && answers.caffeine==='no')?2:0
 };
 // Vitaminas exigem necessidade individual; não inferir pela meta de treino.
 const matches=products.filter(p=>{
  if(p.active===false || Number(p.stock)<=0 || Number(p.price_cents)>max || !(scores[p.category]>0))return false;
  if(p.category==='Pré-Treino' && (labels[p.id]?.demo_complete!==true || !Array.isArray(labels[p.id].stimulants)))return false;
  if(!restricted)return true;
  const label=labels[p.id];
  if(!label?.demo_complete)return false;
  if(answers.diet==='vegetarian' && label.diet?.vegetarian!==true)return false;
  if(answers.diet==='vegan' && label.diet?.vegan!==true)return false;
  if(answers.avoid!=='none'){
   if(answers.avoid==='other')return false;
   // Ausência de declaração não prova ausência do ingrediente.
   if(label.free_from?.[answers.avoid]!==true)return false;
  }
  return true;
 })
  .map(p=>({...p,profileScore:scores[p.category]}))
  .sort((a,b)=>b.profileScore-a.profileScore || a.price_cents-b.price_cents || a.name.localeCompare(b.name,'pt-BR'));
 if(restricted)warnings.push('Para restrições alimentares, aparecem apenas produtos compatíveis segundo os dados de referência do catálogo. Confira o rótulo oficial antes de consumir.');
 if(!matches.length)warnings.push('Nenhum produto com informações suficientes corresponde às respostas. Ajuste as respostas ou explore o catálogo e consulte os rótulos.');
 else warnings.push('Correspondência por categoria e dados de referência. O resultado não é prescrição nem orientação de consumo.');
 return {matches,warnings,review:false};
}
