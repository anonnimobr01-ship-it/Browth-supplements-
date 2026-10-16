import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../public/js/reviews.js',import.meta.url),'utf8');
const {ratingLabel}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('sem avaliações mostra cinco estrelas vazias e nota zero',()=>{
 const html=ratingLabel({rating_count:0,rating:null});
 assert.match(html,/width:0%/);
 assert.match(html,/0 \/ 5 · Sem avaliações/);
});
test('a média preenche todas as estrelas anteriores e parte da próxima',()=>{
 const html=ratingLabel({rating_count:2,rating:2.5});
 assert.match(html,/width:50%/);
 assert.match(html,/2,5 \/ 5/);
 assert.match(html,/2 avaliações/);
});
test('não deixa a visualização ultrapassar cinco estrelas',()=>{
 assert.match(ratingLabel({rating_count:1,rating:10}),/width:100%/);
});
test('formulário possui escolha de zero e dez opções de meia estrela',()=>{
 assert.match(source,/value=\\"0\\" required/);
 assert.match(source,/length:10/);
 assert.match(source,/rating\\*20/);
});
