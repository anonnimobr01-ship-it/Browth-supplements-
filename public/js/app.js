import {API_BASE} from './config.js';
import * as Auth from './auth.js';
const $=s=>document.querySelector(s), main=$('#main');
const demo=new URLSearchParams(location.search).get('demo')==='1';
const money=n=>(Number(n)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image=value=>/^\/assets\/[a-z0-9.-]+\.(png|webp|jpg)$/i.test(value)?value:'/assets/whey.png';
const normal=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
const guestKey=demo?'browth-demo-cart-v2':'browth-guest-cart-v2';
let products=[],user=null,cart=[],config={shipping_cents:1990,pix:{}},authReady=false,loaded=false,version=0,checkoutQuote=null,checkoutAttempt=null,ordersOffset=0;
let guest=storage.get(guestKey,[]);
if(!Array.isArray(guest))guest=[];
guest=guest.filter(x=>x&&/^[A-Za-z0-9_-]{1,80}$/.test(x.product_id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=100).slice(0,50);
function notice(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('#toast').hidden=true,6500);}
async function api(path,{method='GET',body,protectedRoute=false,key}={}){
 const send=async force=>{
  const headers={};if(body)headers['Content-Type']='application/json';if(key)headers['Idempotency-Key']=key;
  if(protectedRoute)headers.Authorization='Bearer '+await Auth.token(force);
  return fetch(API_BASE+path,{method,headers,body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(30000)});
 };
 let response=await send(false);
 if(response.status===401&&protectedRoute)response=await send(true);
 const data=await response.json().catch(()=>({error:'Resposta inválida do servidor. Confira o endereço da API.'}));
 if(!response.ok){const e=new Error(data.error||'Não foi possível concluir.');e.status=response.status;throw e;}
 return data;
}
function guestCart(){return guest.map(x=>({...x,product:products.find(p=>p.id===x.product_id)})).filter(x=>x.product);}
function count(){const n=cart.reduce((sum,x)=>sum+x.quantity,0);$('#cart-count').textContent=n;$('#account-link').textContent=user?'Minha conta':'Entrar / Cadastrar';}
async function loadCart(){const current=user?.uid;if(user&&!demo){const result=await api('/cart',{protectedRoute:true});if(user?.uid!==current)return;cart=result;}else cart=guestCart();count();}
async function mergeGuest(){
 if(!user||!guest.length)return;
 await loadCart();
 for(const entry of [...guest]){
  const p=products.find(x=>x.id===entry.product_id);if(!p||!p.stock)continue;
  // max é idempotente: uma repetição após falha não soma o carrinho duas vezes.
  const previous=cart.find(x=>x.product_id===entry.product_id)?.quantity||0;
  await api('/cart/'+encodeURIComponent(entry.product_id),{method:'PUT',body:{quantity:Math.min(p.stock,100,Math.max(previous,entry.quantity))},protectedRoute:true});
  guest=guest.filter(x=>x.product_id!==entry.product_id);storage.set(guestKey,guest);
 }
 await loadCart();
}
async function setQuantity(id,quantity){
 if(!Number.isInteger(quantity)||quantity<0||quantity>100)throw new Error('Use uma quantidade inteira de 0 a 100.');
 const p=products.find(p=>p.id===id);if(!p)throw new Error('Produto indisponível.');
 if(quantity>p.stock)throw new Error('Quantidade maior que o estoque disponível.');
 if(user&&!demo){await api('/cart/'+encodeURIComponent(id),{method:'PUT',body:{quantity},protectedRoute:true});}
 else {guest=guest.filter(x=>x.product_id!==id);if(quantity)guest.push({product_id:id,quantity});if(guest.length>50)throw new Error('Limite de 50 produtos.');storage.set(guestKey,guest);}
 await loadCart();
}
const categoryNames=['Whey','Creatina','Pré-Treino','Hipercalórico','Vitaminas'];
const categoryImages=['whey','creatina','pre-treino','hipercalorico','vitaminas'];
function cards(list){return list.map(p=>`<article class="card"><a class="card-image" href="#/produto/${encodeURIComponent(p.id)}"><img src="${image(p.image)}" alt="${esc(p.name)}" loading="lazy" width="350" height="280"></a><div class="card-body"><small>${esc(p.category)}</small><h3><a href="#/produto/${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3><div class="price">${money(p.price_cents)}</div><div class="paynote">à vista no Pix</div><button data-add="${esc(p.id)}" ${p.stock<1?'disabled':''}>${p.stock>0?'ADICIONAR AO CARRINHO +':'ESGOTADO'}</button></div></article>`).join('');}
function home(){return `<section class="hero"><div class="hero-copy"><span class="eyebrow">FORÇA É CONSTRUÇÃO.</span><h1>SEU TREINO.<br>SUA EVOLUÇÃO.<br><em>SEU PRÓXIMO<br>NÍVEL.</em></h1><p>Escolhas que acompanham a sua disciplina.<br>Conheça a linha BROWTH.</p><a class="button" href="#/catalogo">EXPLORAR PRODUTOS <span>↗</span></a></div><div class="hero-art"><img src="/assets/whey.png" alt="Embalagem Whey Protein Browth" fetchpriority="high" width="1402" height="1122"><span class="hero-note">BROWTH ORIGINAL<br>FEITO PARA SUA ROTINA</span></div></section><section class="benefits" aria-label="Vantagens da loja"><div class="benefit"><b>01</b><div><strong>ESCOLHA DO SEU JEITO</strong><small>Pesos e categorias para sua rotina</small></div></div><div class="benefit"><b>02</b><div><strong>TUDO EM UM SÓ LUGAR</strong><small>Do catálogo aos seus pedidos</small></div></div><div class="benefit"><b>03</b><div><strong>COMPRA COM CLAREZA</strong><small>Confira o total antes de finalizar</small></div></div></section><section><div class="section-head"><div><span class="eyebrow">ENCONTRE SUA LINHA</span><h2>Qual é o seu próximo passo?</h2></div></div><div class="category-grid">${categoryNames.map((c,i)=>`<a class="category-tile" href="#/catalogo?categoria=${encodeURIComponent(c)}"><img src="/assets/${categoryImages[i]}.png" alt="" loading="lazy"><strong>${esc(c)}</strong><small>Explorar a linha →</small></a>`).join('')}</div></section><section><div class="section-head"><div><span class="eyebrow">SELEÇÃO BROWTH</span><h2>Essenciais da sua rotina.</h2></div><a href="#/catalogo">Ver todos os produtos ↗</a></div><div class="grid">${cards(['whey1kg','creatina300','pre300','hiper1kg'].map(id=>products.find(p=>p.id===id)).filter(Boolean))}</div></section><section class="banner"><div><span class="eyebrow">A CONSTÂNCIA FAZ A DIFERENÇA.</span><h2>O próximo passo é seu.</h2><p>Explore o catálogo e monte sua seleção.</p></div><a class="button secondary" href="#/catalogo">CONHECER A LINHA ↗</a></section>`;}
function catalog(params){
 const category=params.get('categoria')||'',query=params.get('q')||'',sort=params.get('ordem')||'name';
 let list=products.filter(p=>(!category||p.category===category)&&normal(p.name+' '+p.category).includes(normal(query)));
 list.sort(sort==='price-up'?(a,b)=>a.price_cents-b.price_cents:sort==='price-down'?(a,b)=>b.price_cents-a.price_cents:(a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 return `<div class="breadcrumb"><a href="#/">Início</a> / Catálogo</div><span class="eyebrow">ENCONTRE SEU PRÓXIMO NÍVEL</span><h1>${query?'Busca: '+esc(query):esc(category||'Nossos suplementos')}</h1><div class="filters"><a class="chip ${!category?'active':''}" href="#/catalogo">Todos</a>${categoryNames.map(c=>`<a class="chip ${category===c?'active':''}" href="#/catalogo?categoria=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div><div class="toolbar"><p>${list.length} produtos encontrados</p><select id="sort" aria-label="Ordenar produtos"><option value="name" ${sort==='name'?'selected':''}>Nome: A–Z</option><option value="price-up" ${sort==='price-up'?'selected':''}>Menor preço</option><option value="price-down" ${sort==='price-down'?'selected':''}>Maior preço</option></select></div>${list.length?`<div class="grid">${cards(list)}</div>`:'<div class="empty"><h2>Nenhum produto por aqui.</h2><p>Tente outro nome ou categoria.</p><a class="button" href="#/catalogo">Ver catálogo</a></div>'}`;
}
function productPage(id){
 const p=products.find(p=>p.id===id);if(!p)return empty('Produto não encontrado.','Veja os produtos disponíveis no catálogo.');
 return `<div class="breadcrumb"><a href="#/">Início</a> / <a href="#/catalogo?categoria=${encodeURIComponent(p.category)}">${esc(p.category)}</a> / ${esc(p.name)}</div><section class="product-detail"><div class="product-photo"><img src="${image(p.image)}" alt="${esc(p.name)}">${p.category==='Whey'?'<button class="secondary wide" id="view-3d">EXPLORAR EMBALAGEM EM 3D</button><div id="model-space"></div>':''}</div><div class="product-info"><span class="eyebrow">LINHA ${esc(p.category)}</span><h1>${esc(p.name)}</h1><p>${esc(p.description)}</p><label>Escolha a versão</label><div class="variants">${products.filter(x=>x.category===p.category).map(x=>`<a class="chip ${x.id===id?'active':''}" href="#/produto/${encodeURIComponent(x.id)}">${esc(x.name.replace(/.*BROWTH\s*-?\s*/,''))}</a>`).join('')}</div><div class="price">${money(p.price_cents)}</div><span class="fine">à vista no Pix · ${p.stock>0?'Disponível':'Esgotado'}</span><form id="buy-form" data-product="${esc(id)}" class="purchase"><label class="sr-only" for="quantity">Quantidade</label><input id="quantity" name="quantity" type="number" min="1" max="${Math.min(100,p.stock)}" value="1" required><button ${p.stock<1?'disabled':''}>ADICIONAR AO CARRINHO +</button></form><p class="fine">Frete fixo nacional de ${money(config.shipping_cents)}. Confira endereço e total no checkout.</p><details open><summary>Sobre o produto</summary><p>${esc(p.description)} A imagem representa a linha; a versão escolhida é a indicada no título.</p></details><details><summary>Composição e informações do rótulo</summary><p>Consulte o rótulo da versão escolhida para composição, alergênicos e modo de uso. Informações nutricionais devem ser confirmadas pelo fornecedor.</p></details><details><summary>Como acompanhar a compra?</summary><p>Depois de finalizar, abra “Meus pedidos” na sua conta. O pagamento Pix aguarda conferência manual.</p></details></div></section>`;
}
function empty(title,text,button='Voltar ao catálogo',target='#/catalogo'){return `<div class="empty"><h1>${esc(title)}</h1><p>${esc(text)}</p><a class="button" href="${target}">${esc(button)}</a></div>`;}
function totals(subtotal,freight=config.shipping_cents){return `<div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-row"><span>Frete fixo nacional</span><span>${money(freight)}</span></div><div class="summary-row total"><strong>Total</strong><strong>${money(subtotal+freight)}</strong></div>`;}
function cartPage(){
 if(!cart.length)return empty('Seu carrinho está esperando.','Explore o catálogo e escolha os produtos para sua rotina.');
 const subtotal=cart.reduce((s,x)=>s+x.product.price_cents*x.quantity,0);
 return `<div class="breadcrumb"><a href="#/">Início</a> / Carrinho</div><h1>Seu carrinho.</h1><div class="two-col"><section>${cart.map(x=>`<article class="cart-item"><img src="${image(x.product.image)}" alt=""><div><h3><a href="#/produto/${encodeURIComponent(x.product_id)}">${esc(x.product.name)}</a></h3><span class="fine">${money(x.product.price_cents)} / unidade</span><label for="qty-${esc(x.product_id)}">Quantidade</label><input class="quantity" id="qty-${esc(x.product_id)}" data-quantity="${esc(x.product_id)}" type="number" min="1" max="100" value="${x.quantity}">${x.quantity>x.product.stock||x.product.active===false?'<p class="error fine">Produto indisponível nesta quantidade.</p>':''}</div><div class="item-end"><strong>${money(x.product.price_cents*x.quantity)}</strong><button class="text" data-remove="${esc(x.product_id)}">Remover</button></div></article>`).join('')}<p class="fine">${user?'Carrinho salvo na sua conta.':'Entre na sua conta para salvar o carrinho e finalizar.'}</p></section><aside class="panel"><h2>Resumo da compra</h2>${totals(subtotal)}<a class="button wide" href="#/checkout">CONTINUAR PARA CHECKOUT →</a><p class="fine">Pagamento via Pix. O total será conferido no servidor.</p><a class="fine" href="#/catalogo">← Continuar comprando</a></aside></div>`;
}
function loginPage(register=false){
 if(demo)return empty('Você está na demonstração.','Cadastro, login e pedidos reais ficam disponíveis depois de configurar os serviços.','Voltar à loja','#/');
 if(!authReady)return empty('Login indisponível.','A autenticação ainda não foi configurada ou não pôde ser carregada. Confira a conexão e tente novamente.');
 return `<section class="panel auth-panel"><div class="auth-tabs"><a class="${!register?'active':''}" href="#/entrar">Entrar</a><a class="${register?'active':''}" href="#/cadastro">Criar conta</a></div><span class="eyebrow">BEM-VINDO À BROWTH</span><h1>${register?'Seu próximo passo.':'Bom ter você aqui.'}</h1><p class="fine">Acesse seu carrinho e acompanhe seus pedidos.</p><form id="auth-form" data-register="${register}">${register?'<label for="name">Nome</label><input name="name" id="name" autocomplete="name" maxlength="120" required>':''}<label for="email">E-mail</label><input name="email" id="email" type="email" autocomplete="email" maxlength="254" required><label for="password">Senha</label><input name="password" id="password" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="${register?8:1}" maxlength="128" required>${register?'<label for="confirm">Confirmar senha</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>':''}<button class="wide">${register?'CRIAR MINHA CONTA':'ENTRAR'}</button></form>${!register?'<button class="text" id="reset-password">Esqueci minha senha</button>':''}<div class="separator">ou</div><button class="secondary wide" id="google">Continuar com Google</button></section>`;
}
function checkoutPage(quote){
 return `<div class="breadcrumb"><a href="#/carrinho">Carrinho</a> / Checkout</div><h1>Falta pouco.</h1><form id="checkout-form"><div class="two-col"><section class="panel"><h2>Endereço de entrega</h2><div class="form-grid">${[['name','Nome completo','text',120],['phone','Telefone com DDD','tel',20],['cep','CEP','text',9],['state','UF','text',2],['street','Rua / Avenida','text',160],['number','Número','text',20],['complement','Complemento (opcional)','text',100],['district','Bairro','text',100],['city','Cidade','text',100]].map(([key,label,type,max])=>`<div class="${key==='street'?'full':''}"><label for="address-${key}">${label}</label><input id="address-${key}" name="${key}" type="${type}" maxlength="${max}" ${key==='name'?`value="${esc(user?.displayName||'')}" autocomplete="name"`:key==='phone'?'autocomplete="tel"':key==='cep'?'autocomplete="postal-code" inputmode="numeric"':''} ${key==='complement'?'':'required'}></div>`).join('')}</div><p class="fine">Entrega no Brasil · Frete fixo nacional. Não há consulta automática de CEP ou prazo.</p></section><aside class="panel"><h2>Confira seu pedido</h2>${cart.map(x=>`<div class="summary-row"><span>${x.quantity}× ${esc(x.product.name)}</span><span>${money(x.quantity*x.product.price_cents)}</span></div>`).join('')}${totals(quote.subtotal_cents,quote.shipping_cents)}<div class="notice"><strong>Pagamento via Pix</strong><br>O pedido será registrado como aguardando pagamento. A confirmação depende da conferência da loja.</div><button class="wide" type="submit">CONFIRMAR PEDIDO →</button><p class="fine">Confira os dados antes de confirmar.</p></aside></div></form>`;
}
const statuses={awaiting_payment:'Aguardando pagamento',paid:'Pagamento confirmado',shipped:'Enviado',cancelled:'Cancelado'};
async function ordersPage(){
 const orders=await api('/orders?offset='+ordersOffset,{protectedRoute:true});
 return `<div class="breadcrumb"><a href="#/conta">Minha conta</a> / Pedidos</div><h1>Meus pedidos.</h1>${orders.length?`<div class="orders">${orders.map(o=>`<article class="panel order"><div><h3>Pedido #${esc(o.id.slice(0,8))}</h3><p>${new Date(o.created_at).toLocaleString('pt-BR')}</p><span class="status">${esc(statuses[o.status]||o.status)}</span></div><strong>${money(o.total_cents)}</strong><a class="button secondary" href="#/pedido/${o.id}">Ver pedido →</a></article>`).join('')}</div>`:empty('Nenhum pedido nesta página.','Suas compras aparecerão aqui.')}<div class="toolbar"><button class="secondary" id="previous-orders" ${ordersOffset===0?'disabled':''}>Anterior</button><button class="secondary" id="next-orders" ${orders.length<20?'disabled':''}>Próxima página</button></div>`;
}
async function orderPage(id){
 const order=await api('/orders/'+encodeURIComponent(id),{protectedRoute:true});
 return `<div class="breadcrumb"><a href="#/pedidos">Meus pedidos</a> / #${esc(order.id.slice(0,8))}</div><h1>Pedido registrado.</h1><p class="fine">${esc(order.id)}</p><div class="two-col"><section class="panel"><span class="status">${esc(statuses[order.status]||order.status)}</span><h2>Resumo do pedido</h2>${order.order_items.map(x=>`<div class="summary-row"><span>${x.quantity}× ${esc(x.name)}</span><strong>${money(x.price_cents*x.quantity)}</strong></div>`).join('')}${totals(order.subtotal_cents,order.shipping_cents)}<h3>Entrega</h3><p class="fine">${esc(order.address.name)}<br>${esc(order.address.street)}, ${esc(order.address.number)} ${esc(order.address.complement)}<br>${esc(order.address.district)} · ${esc(order.address.city)} / ${esc(order.address.state)}<br>CEP ${esc(order.address.cep)}</p></section><aside class="panel"><h2>${order.status==='awaiting_payment'?'Pagamento via Pix':'Status do pedido'}</h2>${order.status==='awaiting_payment'?`${config.pix.qr_path?`<img class="qr" src="${image(config.pix.qr_path)}" alt="QR Code Pix da loja">`:''}${config.pix.copy_paste?`<label for="pix-code">Pix copia e cola</label><textarea id="pix-code" readonly rows="3">${esc(config.pix.copy_paste)}</textarea><button class="secondary wide" id="copy-pix">Copiar código Pix</button>`:''}<p class="notice">${config.pix.qr_path||config.pix.copy_paste?'Confira o recebedor no aplicativo do banco e pague exatamente '+money(order.total_cents)+'. O QR é estático; a confirmação é manual.':'As instruções de Pix ainda não estão disponíveis. Seu pedido está registrado e aguarda as orientações da loja.'}</p><p class="fine">Não considere o pedido pago apenas por abrir o QR Code.</p>`:`<p>${esc(statuses[order.status])}</p>`}<button class="secondary wide" id="refresh-order">Atualizar status</button></aside></div>`;
}
function routeParts(){const [path,query='']=(location.hash.slice(1)||'/').split('?');return {path,params:new URLSearchParams(query)};}
async function render(){
 const current=++version,{path,params}=routeParts();main.setAttribute('aria-busy','true');checkoutQuote=null;
 try{
  let content;
  if(path==='/')content=home();
  else if(path==='/catalogo')content=catalog(params);
  else if(path.startsWith('/produto/'))content=productPage(decodeURIComponent(path.slice(9)));
  else if(path==='/entrar'||path==='/cadastro')content=user?empty('Você já entrou.','Sua conta está pronta para continuar.','Minha conta','#/conta'):loginPage(path==='/cadastro');
  else if(path==='/carrinho'){await loadCart();content=cartPage();}
  else if(path==='/conta')content=user?`<div class="account-bar"><h1>Olá, ${esc(user.displayName||'atleta')}.</h1><button class="secondary" id="logout">Sair</button></div><p>${esc(user.email||'')}</p><div class="panel"><h2>Sua rotina, organizada.</h2><p>Consulte o histórico de compras ou continue de onde parou.</p><a class="button" href="#/pedidos">Meus pedidos →</a> <a class="button secondary" href="#/carrinho">Meu carrinho</a></div>`:loginPage();
  else if(['/checkout','/pedidos'].includes(path)||path.startsWith('/pedido/')){
   if(demo)content=empty('Demonstração do catálogo.','Pedidos e pagamentos estão desativados neste modo. Configure Firebase e Supabase para testar a compra real.');
   else if(!user)content=empty('Entre para continuar.','Seu carrinho será mantido enquanto você acessa sua conta.','Entrar ou criar conta','#/entrar');
   else if(path==='/checkout'){await loadCart();if(!cart.length)content=cartPage();else{checkoutQuote=await api('/quote',{protectedRoute:true});content=checkoutPage(checkoutQuote);}}
   else if(path==='/pedidos')content=await ordersPage();
   else content=await orderPage(path.slice(8));
  }else content=empty('Página não encontrada.','Escolha um produto para continuar.');
  if(current!==version)return;main.innerHTML=content;main.removeAttribute('aria-busy');document.title=(path==='/'?'':path.split('/')[1].toUpperCase()+' | ')+'BROWTH SUPPLEMENTS';
 }catch(e){if(current===version){main.innerHTML=`<div class="empty"><h2>Não foi possível carregar.</h2><p>${esc(Auth.message(e))}</p><button id="retry">Tentar novamente</button> <a class="button secondary" href="#/catalogo">Ver catálogo</a></div>`;main.removeAttribute('aria-busy');}}
}
async function busy(element,fn){if(element?.disabled)return;if(element)element.disabled=true;try{await fn();}catch(e){notice(Auth.message(e));}finally{if(element?.isConnected)element.disabled=false;}}
async function add(id,n=1){const previous=cart.find(x=>x.product_id===id)?.quantity||0;await setQuantity(id,previous+n);notice('Produto adicionado ao carrinho.');}
$('#search').addEventListener('submit',e=>{e.preventDefault();location.hash='/catalogo?q='+encodeURIComponent($('#search-input').value.trim());});
main.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button || (button.type==='submit' && button.closest('form')))return;
 busy(button,async()=>{
  if(button.dataset.add)await add(button.dataset.add);
  else if(button.dataset.remove){await setQuantity(button.dataset.remove,0);await render();}
  else if(button.id==='google'){await Auth.google();await mergeGuest();location.hash='/conta';}
  else if(button.id==='logout'){await Auth.logout();cart=guestCart();checkoutAttempt=null;count();location.hash='/';}
  else if(button.id==='reset-password'){const email=$('#email').value.trim();if(!email)throw new Error('Digite seu e-mail primeiro.');await Auth.reset(email);notice('Se houver uma conta para este e-mail, você receberá as instruções.');}
  else if(button.id==='copy-pix'){await navigator.clipboard.writeText($('#pix-code').value);notice('Código copiado. Confira o recebedor e o valor no banco.');}
  else if(['retry','refresh-order'].includes(button.id))await render();
  else if(button.id==='next-orders'){ordersOffset+=20;await render();}
  else if(button.id==='previous-orders'){ordersOffset=Math.max(0,ordersOffset-20);await render();}
  else if(button.id==='view-3d'){
   button.hidden=true;const space=$('#model-space');
   space.innerHTML='<p class="fine">Carregando visualização 3D…</p>';
   try{await import('https://unpkg.com/@google/model-viewer@4.1.0/dist/model-viewer.min.js');space.innerHTML='<model-viewer src="/assets/whey-browth.glb" alt="Modelo da embalagem Whey Browth" camera-controls touch-action="pan-y" shadow-intensity="1" poster="/assets/whey.png"></model-viewer><p class="fine">Arraste para girar. Use dois dedos para ampliar.</p>';space.querySelector('model-viewer').addEventListener('error',()=>{space.textContent='Visualização indisponível. A imagem do produto continua disponível.';});}catch{space.textContent='Não foi possível carregar o 3D. A imagem do produto continua disponível.';}
  }
 });
});
main.addEventListener('change',e=>{
 if(e.target.id==='sort'){const {params}=routeParts();params.set('ordem',e.target.value);location.hash='/catalogo?'+params;}
 if(e.target.dataset.quantity)busy(e.target,async()=>{try{await setQuantity(e.target.dataset.quantity,Number(e.target.value));}finally{await render();}});
});
main.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('button[type="submit"]')||form.querySelector('button');
 busy(button,async()=>{
  const data=Object.fromEntries(new FormData(form));
  if(form.id==='buy-form')await add(form.dataset.product,Number(data.quantity));
  if(form.id==='auth-form'){
   if(form.dataset.register==='true'){if(data.password!==data.confirm)throw new Error('As senhas não são iguais.');await Auth.register(data.name.trim(),data.email.trim(),data.password);}else await Auth.login(data.email.trim(),data.password);
   await mergeGuest();location.hash='/conta';await render();
  }
  if(form.id==='checkout-form'){
   if(!checkoutQuote)throw new Error('Atualize o checkout antes de confirmar.');
   const payload={address:data,expected_total_cents:checkoutQuote.total_cents},fingerprint=JSON.stringify(payload),attemptKey='browth-checkout-'+user.uid;
   let saved;try{saved=JSON.parse(sessionStorage.getItem(attemptKey));}catch{}
   checkoutAttempt=checkoutAttempt||saved;
   if(!checkoutAttempt||checkoutAttempt.fingerprint!==fingerprint)checkoutAttempt={key:crypto.randomUUID(),fingerprint};
   try{sessionStorage.setItem(attemptKey,JSON.stringify(checkoutAttempt));}catch{}
   // A mesma chave é reutilizada em falha de rede: o servidor não duplica o pedido.
   const result=await api('/orders',{method:'POST',body:payload,protectedRoute:true,key:checkoutAttempt.key});
   checkoutAttempt=null;try{sessionStorage.removeItem(attemptKey);}catch{}
   cart=[];count();location.hash='/pedido/'+result.id;
  }
 });
});
window.addEventListener('hashchange',()=>{if(loaded){render();window.scrollTo({top:0});main.focus({preventScroll:true});}});
async function start(){
 try{
  if(demo){products=await fetch('/demo-products.json').then(r=>r.json());$('#mode').hidden=false;$('#mode').textContent='DEMONSTRAÇÃO · Produtos e estoque ilustrativos. Login, pedidos e pagamentos desativados.';}
  else{
   [config,products]=await Promise.all([api('/config'),api('/products')]);
   if(config.firebase.apiKey&&config.firebase.projectId){
    try{await Auth.initialize(config.firebase,u=>{user=u;if(loaded){cart=[];count();render();}});authReady=true;}catch{notice('Login indisponível. Verifique sua conexão e a configuração do Firebase.');}
   }
  }
  await loadCart();loaded=true;await render();
 }catch(e){main.innerHTML=`<div class="empty"><h1>A loja ainda não está disponível.</h1><p>${esc(Auth.message(e))}</p><button id="reload-app">Tentar novamente</button> <a class="button secondary" href="/?demo=1">Visualizar demonstração</a></div>`;$('#reload-app').onclick=()=>location.reload();}
}
start();
