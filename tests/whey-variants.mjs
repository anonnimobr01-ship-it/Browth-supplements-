import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/js/product-variants.js',import.meta.url),'utf8');
const {wheyOptions}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const products=JSON.parse(fs.readFileSync(new URL('../database/whey-variants.json',import.meta.url)));
assert.equal(products.length,12);assert.equal(new Set(products.map(p=>p.image)).size,12);
for(const p of products){const options=wheyOptions(products,p);assert.equal(options.weights.length,4);assert.equal(options.flavors.length,3);assert(options.weights.every(x=>x.catalog_attributes.flavors[0]===p.catalog_attributes.flavors[0]));assert(options.flavors.every(x=>x.catalog_attributes.weight_grams===p.catalog_attributes.weight_grams));assert(options.flavors.some(x=>x.id===p.id));}
console.log('12 SKUs: peso preserva sabor; sabor preserva peso; imagens únicas: OK');
