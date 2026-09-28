import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../public/',import.meta.url);
const products=JSON.parse(readFileSync(new URL('demo-products.json',root)));
const definitions={
 Whey:{
  composition:'Proteína concentrada do soro de leite, emulsificante lecitina de soja.',
  allergens:{contains:['milk','soy'],may_contain:[]},
  restrictions:['Contém leite e soja. Não é indicado a pessoas alérgicas a esses ingredientes.'],
  nutrition:[{name:'Valor energético',amount:'120 kcal'},{name:'Proteínas',amount:'23 g'},{name:'Carboidratos',amount:'3 g'},{name:'Gorduras totais',amount:'2 g'}],
  serving:'porção de 30 g',diet:{vegetarian:true,vegan:false},
  free_from:{milk:false,lactose:false,gluten:true}
 },
 Creatina:{
  composition:'Creatina monohidratada.',
  allergens:{contains:[],may_contain:[]},
  restrictions:['Destinado a adultos. Grávidas, lactantes e pessoas com condições de saúde devem buscar orientação profissional.'],
  nutrition:[{name:'Creatina',amount:'3 g'}],
  serving:'porção de 3 g',diet:{vegetarian:true,vegan:true},
  free_from:{milk:true,lactose:true,gluten:true}
 },
 'Pré-Treino':{
  composition:'Maltodextrina, cafeína anidra, acidulante ácido cítrico, aroma artificial e edulcorante sucralose.',
  allergens:{contains:[],may_contain:['soy']},
  restrictions:['Contém cafeína. Não destinado a crianças, gestantes ou lactantes. Pessoas sensíveis à cafeína devem evitar.'],
  nutrition:[{name:'Valor energético',amount:'30 kcal'},{name:'Carboidratos',amount:'7 g'},{name:'Cafeína',amount:'150 mg'}],
  serving:'porção de 10 g',diet:{vegetarian:true,vegan:true},
  free_from:{milk:true,lactose:true,gluten:true}
 },
 'Hipercalórico':{
  composition:'Maltodextrina, proteína concentrada do soro de leite, cacau em pó e emulsificante lecitina de soja.',
  allergens:{contains:['milk','soy'],may_contain:['gluten']},
  restrictions:['Contém leite e soja. Pode conter glúten. Não é indicado a pessoas alérgicas a esses ingredientes.'],
  nutrition:[{name:'Valor energético',amount:'390 kcal'},{name:'Carboidratos',amount:'70 g'},{name:'Proteínas',amount:'15 g'},{name:'Gorduras totais',amount:'5 g'}],
  serving:'porção de 100 g',diet:{vegetarian:true,vegan:false},
  free_from:{milk:false,lactose:false,gluten:false}
 },
 Vitaminas:{
  composition:'Maltodextrina, vitamina C (ácido ascórbico), vitamina B6 (cloridrato de piridoxina), vitamina B12 (cianocobalamina), acidulante ácido cítrico e aroma artificial de {flavor}.',
  allergens:{contains:[],may_contain:[]},
  restrictions:['Não substitui uma alimentação variada. Pessoas com condições de saúde devem buscar orientação profissional.'],
  nutrition:[{name:'Vitamina C',amount:'45 mg'},{name:'Vitamina B6',amount:'1,3 mg'},{name:'Vitamina B12',amount:'2,4 µg'}],
  serving:'porção de 5 g',diet:{vegetarian:true,vegan:true},
  free_from:{milk:true,lactose:true,gluten:true}
 }
};
const names={milk:'LEITE',soy:'SOJA',gluten:'GLÚTEN',lactose:'LACTOSE'};
const xml=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function lines(value,width=51){
 const words=String(value).split(/\s+/),out=[];let line='';
 for(const word of words){if((line+' '+word).trim().length>width&&line){out.push(line);line=word;}else line=(line+' '+word).trim();}
 if(line)out.push(line);return out;
}
function block(text,x,y,size=21,max=4,width=52){
 return lines(text,width).slice(0,max).map((line,i)=>`<text x="${x}" y="${y+i*(size+7)}" class="body" font-size="${size}">${xml(line)}</text>`).join('');
}
function svg(product,label){
 const section=(title,text,y)=>`<text x="155" y="${y}" class="head">${xml(title)}</text>${block(text,155,y+34,19,4,58)}`;
 const contains=label.allergens.contains.map(x=>names[x]||x).join(', ')||'NENHUM DECLARADO';
 const may=label.allergens.may_contain.map(x=>names[x]||x).join(', ')||'NENHUM DECLARADO';
 const table=label.nutrition.map((row,i)=>`<text x="155" y="${842+i*32}" class="body" font-size="19">${xml(row.name)}</text><text x="790" y="${842+i*32}" class="body" text-anchor="end" font-size="19">${xml(row.amount)}</text>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200" role="img" aria-label="Mockup ilustrativo do verso de ${xml(product.name)}">
 <defs><linearGradient id="tub"><stop stop-color="#050506"/><stop offset=".14" stop-color="#343437"/><stop offset=".32" stop-color="#0e0e10"/><stop offset=".82" stop-color="#222225"/><stop offset="1" stop-color="#030304"/></linearGradient><linearGradient id="lid" x2="0" y2="1"><stop stop-color="#313134"/><stop offset=".48" stop-color="#050506"/><stop offset="1" stop-color="#343438"/></linearGradient><filter id="shadow"><feGaussianBlur stdDeviation="26"/></filter></defs>
 <style>.body{font-family:Arial,sans-serif;fill:#171719}.head{font:700 21px Arial,sans-serif;fill:#a61e28}.meta{font:700 16px Arial,sans-serif;letter-spacing:2px;fill:#dedee0}</style>
 <rect width="960" height="1200" fill="#080809"/><ellipse cx="480" cy="1130" rx="350" ry="40" fill="#000" opacity=".8" filter="url(#shadow)"/>
 <rect x="86" y="126" width="788" height="987" rx="110" fill="url(#tub)" stroke="#343436" stroke-width="3"/>
 <rect x="126" y="46" width="708" height="185" rx="48" fill="url(#lid)" stroke="#4d4d50" stroke-width="4"/>
 <path d="M128 165h704M128 187h704M146 208h668" stroke="#66666a" stroke-opacity=".65" stroke-width="5"/>
 <rect x="112" y="262" width="736" height="763" rx="11" fill="#111113" stroke="#5a2227" stroke-width="3"/>
 <path d="M112 262h736v85H112z" fill="#390e14"/>
 <text x="154" y="321" fill="#e1323a" font-family="Arial,sans-serif" font-size="43" font-weight="900" letter-spacing="-2">BROWTH</text>
 <text x="795" y="313" class="meta" text-anchor="end">SUPLEMENTOS</text>
 <rect x="125" y="352" width="710" height="607" rx="4" fill="#f6f4ee"/>
 <text x="155" y="343" class="head" font-size="27">${xml(product.name)}</text>
 <line x1="155" y1="363" x2="805" y2="363" stroke="#a89d95"/>
 ${section('INGREDIENTES',label.composition,397)}
 ${section('ALERGÊNICOS',`Contém: ${contains}. Pode conter: ${may}.`,535)}
 ${section('RESTRIÇÕES DE USO',label.restrictions.join(' '),640)}
 <line x1="155" y1="777" x2="805" y2="777" stroke="#a89d95"/>
 <text x="155" y="810" class="head">INFORMAÇÃO NUTRICIONAL · ${xml(label.serving)}</text>
 ${table}
 <rect x="112" y="965" width="736" height="60" fill="#8b1720"/>
 <text x="480" y="1002" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="bold">DADOS DE REFERÊNCIA · CONFIRA O RÓTULO OFICIAL</text>
 <text x="480" y="1080" fill="#ddd" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">BROWTH SUPPLEMENTS</text>
 </svg>`;
}
const output={};mkdirSync(new URL('assets/backs/',root),{recursive:true});
for(const product of products){
 const def=definitions[product.category];if(!def)throw Error('Categoria sem ficha: '+product.category);
 const flavor=product.id==='vitaminaMorango'?'morango':product.id==='vitaminaLaranja'?'laranja':'limão';
 const label=structuredClone(def);
 label.composition=label.composition.replace('{flavor}',flavor);
 label.stimulants=product.category==='Pré-Treino'?['caffeine']:[];
 label.demo_complete=true;
 label.source='Dados de referência do catálogo BROWTH SUPPLEMENTS';
 label.back_image='/assets/backs/'+product.id+'.svg';
 output[product.id]=label;
 writeFileSync(new URL('assets/backs/'+product.id+'.svg',root),svg(product,label));
}
writeFileSync(new URL('product-labels.json',root),JSON.stringify(output,null,2)+'\n');
console.log('Criadas '+Object.keys(output).length+' fichas e imagens ilustrativas do verso.');
