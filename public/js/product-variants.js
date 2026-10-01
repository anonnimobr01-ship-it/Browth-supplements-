const attr=p=>p.catalog_attributes||{};
export function wheyOptions(products,current){
 const a=attr(current), family=products.filter(p=>p.active!==false&&attr(p).family==='whey-protein');
 if(a.family!=='whey-protein')return null;
 const weights=[...new Set(family.map(p=>attr(p).weight_grams))].sort((a,b)=>a-b).map(weight=>family.find(p=>attr(p).weight_grams===weight&&attr(p).flavors?.[0]===a.flavors?.[0])).filter(Boolean);
 const flavors=['chocolate','vanilla','strawberry'].map(flavor=>family.find(p=>attr(p).weight_grams===a.weight_grams&&attr(p).flavors?.[0]===flavor)).filter(Boolean);
 return {weights,flavors};
}
