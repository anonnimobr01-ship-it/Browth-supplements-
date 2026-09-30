// Preferências organizam o catálogo; nunca indicam necessidade de consumo.
export const questions=[
 ['objective','Qual é o seu principal objetivo?',[['protein','Alimentação com mais proteína'],['performance','Desempenho esportivo'],['recovery','Recuperação após atividades físicas'],['practical','Praticidade na alimentação'],['vitamins','Vitaminas e minerais'],['explore','Apenas conhecer os produtos']]],
 ['sport','Qual esporte você pratica ou pretende praticar?',[['strength','Musculação'],['running','Corrida'],['football','Futebol'],['cycling','Ciclismo'],['swimming','Natação'],['basketball','Basquete'],['volleyball','Vôlei'],['combat','Lutas'],['cross','Cross training'],['other','Outro'],['none','Ainda não pratico nenhum']]],
 ['category','Que tipo de produto você está procurando?',[['Whey','Whey Protein'],['Proteína vegetal','Proteína vegetal'],['Creatina','Creatina'],['Barras proteicas','Barras proteicas'],['Bebidas e shakes','Bebidas e shakes'],['Vitaminas','Vitaminas e minerais'],['Alimentos','Alimentos'],['Acessórios','Acessórios'],['all','Ainda não sei']]],
 ['restrictions','Você possui alguma preferência ou restrição alimentar?',[['none','Nenhuma'],['lactose','Sem lactose'],['gluten','Sem glúten'],['vegan','Vegano'],['vegetarian','Vegetariano']],true],
 ['avoid','Existe algum ingrediente que você prefere evitar?',[['lactose','Lactose'],['gluten','Glúten'],['sugar','Açúcar'],['caffeine','Cafeína'],['animal','Ingredientes de origem animal'],['none','Nenhum']],true],
 ['format','Qual formato de produto você prefere?',[['powder','Pó'],['capsule','Cápsulas'],['tablet','Comprimidos'],['bar','Barra'],['drink','Bebida'],['food','Alimento'],['all','Tanto faz']]],
 ['flavor','Você possui preferência de sabor?',[['chocolate','Chocolate'],['vanilla','Baunilha'],['strawberry','Morango'],['fruit','Frutas'],['unflavored','Sem sabor'],['other','Outro'],['all','Tanto faz']]],
 ['budget','Quanto você pretende gastar?',[['0-5000','Até R$ 50'],['5000-10000','De R$ 50 a R$ 100'],['10000-15000','De R$ 100 a R$ 150'],['15000-25000','De R$ 150 a R$ 250'],['25000-plus','Acima de R$ 250'],['all','Sem limite definido']]]
];
export const sortOptions=[['relevance','Mais relevantes'],['price-up','Menor preço'],['price-down','Maior preço'],['sales','Mais vendidos'],['rating','Melhor avaliados'],['new','Lançamentos']];
export const array=v=>Array.isArray(v)?v:[];
export const attributes=p=>p.catalog_attributes&&typeof p.catalog_attributes==='object'?p.catalog_attributes:{};
// The current checkout price is authoritative; a prior price is display-only.
export const effectivePrice=p=>Number(p.price_cents);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function priceBounds(budget){const map={'all':[0,Infinity],'0-5000':[0,5000],'5000-10000':[5000,10000],'10000-15000':[10000,15000],'15000-25000':[15000,25000],'25000-plus':[25001,Infinity]};return map[budget||'all']||null;}
export function satisfies(p,restrictions=[],avoid=[]){
 const a=attributes(p),declared=[...array(a.allergens?.contains),...array(a.allergens?.may_contain)];
 const wanted=new Set([...array(restrictions),...array(avoid)]);
 for(const value of wanted){
  if(value==='none')continue;
  if(['lactose','gluten'].includes(value)&&(!(a.free_from?.[value]===true)||declared.includes(value)))return false;
  if(value==='vegan'||value==='animal'){if(a.diet?.vegan!==true||declared.includes('milk')||declared.includes('egg'))return false;}
  if(value==='vegetarian'&&a.diet?.vegetarian!==true)return false;
  if(value==='sugar'&&a.contains_sugar!==false)return false;
  if(value==='caffeine'&&a.contains_caffeine!==false)return false;
  if(!['lactose','gluten','vegan','animal','vegetarian','sugar','caffeine'].includes(value))return false;
 }
 return true;
}
export function filterByProfile(products,answers={},manual={}){
 const bounds=priceBounds(answers.budget);if(!bounds)return {matches:[],warnings:['Faixa de preço inválida.']};
 const score=p=>{const a=attributes(p);return (answers.category&&answers.category!=='all'&&p.category===answers.category?3:0)+(array(a.objectives).includes(answers.objective)?2:0)+(array(a.sports).includes(answers.sport)?2:0)+(answers.format!=='all'&&a.format===answers.format?1:0)+(answers.flavor!=='all'&&array(a.flavors).includes(answers.flavor)?1:0);};
 const matches=products.filter(p=>{
  const a=attributes(p),price=effectivePrice(p);
  if(p.active===false||!Number.isFinite(price)||price<bounds[0]||price>bounds[1])return false;
  if(manual.available==='yes'&&Number(p.stock)<=0)return false;
  if(manual.category&&p.category!==manual.category)return false;
  if(manual.q&&!norm(p.name+' '+p.category+' '+p.description).includes(norm(manual.q)))return false;
  if(manual.brand&&a.brand!==manual.brand)return false;
  if(manual.format&&a.format!==manual.format)return false;
  if(manual.flavor&&!array(a.flavors).includes(manual.flavor))return false;
  if(manual.rating&&!(Number(a.rating)>=Number(manual.rating)))return false;
  return satisfies(p,[...array(answers.restrictions),...array(manual.restrictions)],answers.avoid);
 });
 const name=(a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR');
 const metric=(p,k)=>Number.isFinite(Number(attributes(p)[k]))?Number(attributes(p)[k]):-1;
 const sort=manual.sort||'relevance';
 matches.sort((a,b)=>{let delta=0;if(sort==='price-up')delta=effectivePrice(a)-effectivePrice(b);else if(sort==='price-down')delta=effectivePrice(b)-effectivePrice(a);else if(sort==='sales')delta=metric(b,'sales')-metric(a,'sales');else if(sort==='rating')delta=metric(b,'rating')-metric(a,'rating');else if(sort==='new')delta=(Date.parse(attributes(b).launched_at)||0)-(Date.parse(attributes(a).launched_at)||0);else delta=score(b)-score(a);return delta||name(a,b);});
 const warnings=[];
 if([...array(answers.restrictions),...array(answers.avoid),...array(manual.restrictions)].some(x=>x!=='none')&&products.some(p=>!Object.keys(attributes(p)).length))warnings.push('Produtos sem informações alimentares cadastradas ficam fora dos filtros de restrições e ingredientes.');
 if(!matches.length)warnings.push('Nenhum produto corresponde aos filtros rígidos. Altere as respostas ou veja todos os produtos.');
 if(answers.category&&answers.category!=='all'&&!matches.some(p=>p.category===answers.category))warnings.push('A categoria escolhida não está disponível nesta combinação. Estes resultados atendem às restrições e ao preço, com outras categorias.');
 if(['sales','rating','new'].includes(sort)&&matches.length&&!matches.some(p=>attributes(p)[{sales:'sales',rating:'rating',new:'launched_at'}[sort]]!=null))warnings.push('Essa informação ainda não foi cadastrada. Os produtos estão organizados pelo nome.');
 return {matches,warnings};
}
