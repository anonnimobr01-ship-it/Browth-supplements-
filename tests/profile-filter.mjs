import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {filterByProfile} from '../public/js/profile-filter.js';
const read=name=>JSON.parse(readFileSync(new URL('../public/'+name,import.meta.url)));
const products=read('demo-products.json'),labels=read('product-labels.json');
assert.deepEqual(products.map(p=>p.id).sort(),Object.keys(labels).sort());
for(const p of products)assert(existsSync(new URL('../public'+labels[p.id].back_image,import.meta.url)));
const base={category:'all',budget:'all',diet:'none',avoid:'none',caffeine:'no'};
const ids=answers=>filterByProfile(products,{...base,...answers},labels).matches.map(p=>p.id);
assert.equal(ids({}).length,17);
assert.deepEqual(ids({age:'minor',health:'yes'}),ids({}));
for(const category of ['Whey','Creatina','Pré-Treino','Hipercalórico','Vitaminas']){
 const found=filterByProfile(products,{...base,category},labels).matches;
 assert(found.length>0&&found.every(p=>p.category===category));
}
const cheap=filterByProfile(products,{...base,budget:'7000'},labels).matches;
assert(cheap.length>0&&cheap.every(p=>p.price_cents<=7000));
assert(cheap.every((p,i)=>i===0||cheap[i-1].price_cents<=p.price_cents));
for(const avoid of ['milk','lactose','gluten']){
 const found=filterByProfile(products,{...base,avoid},labels).matches;
 assert(found.length>0&&found.every(p=>labels[p.id].free_from[avoid]===true));
}
const vegan=filterByProfile(products,{...base,diet:'vegan'},labels).matches;
assert(vegan.length>0&&vegan.every(p=>labels[p.id].diet.vegan===true));
assert(!ids({caffeine:'yes'}).some(id=>labels[id].stimulants.includes('caffeine')));
assert.deepEqual(ids({category:'Whey',diet:'vegan'}),[]);
const missing=structuredClone(labels);delete missing.creatina300;
assert(!filterByProfile(products,{...base,avoid:'milk'},missing).matches.some(p=>p.id==='creatina300'));
const conflicting=structuredClone(labels);conflicting.creatina300.allergens.may_contain=['milk'];
assert(!filterByProfile(products,{...base,avoid:'milk'},conflicting).matches.some(p=>p.id==='creatina300'));
const unknown=structuredClone(labels);delete unknown.creatina300.stimulants;
assert(!filterByProfile(products,{...base,caffeine:'yes'},unknown).matches.some(p=>p.id==='creatina300'));
const hidden=[...products,{...products[0],id:'hidden',active:false},{...products[0],id:'out',stock:0}];
assert.equal(filterByProfile(hidden,base,labels).matches.length,17);
assert.deepEqual(ids({budget:'invalid'}),[]);
console.log('Filtro de catálogo: categorias, preço, ingredientes e dados ausentes OK');
