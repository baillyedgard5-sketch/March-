var CFG = window.MARCHE_CONFIG || {}, sb = null, user = null;
var D = { devise: 'FCFA', whatsapp: '', produits: [] };
var S = { v: 'home', cat: null, q: '', tab: 'produits' }, C = { nom: '', tel: '', note: '', addr: '' };
var cart = {}, loc = null, locErr = '', locBusy = false, orders = [], R = document.getElementById('root');
try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch (e) {}
var CATS = [['Nourriture', '🍲'], ['Vêtements', '👕'], ['Objets', '🏺'], ['Accessoires', '👜'], ['Appareils', '📱']];
var STATUTS = ['nouvelle', 'en préparation', 'en livraison', 'livrée', 'annulée'];
var DEMO = [
  { id: 'd1', nom: 'Attiéké poisson', prix: 2500, cat: 'Nourriture', desc: 'Exemple' },
  { id: 'd2', nom: 'T-shirt coton', prix: 6000, old: 7500, cat: 'Vêtements', desc: 'Exemple' },
  { id: 'd3', nom: 'Écouteurs sans fil', prix: 15000, cat: 'Appareils', desc: 'Exemple' }
];

function h(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
function fmt(n) { return Number(n).toLocaleString('fr-FR') + ' ' + D.devise; }
function icon(c) { var m = CATS.filter(function (x) { return x[0] === c; })[0]; return m ? m[1] : '🛍️'; }
function toast(t) { var e = document.getElementById('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 1500); }
function persist() { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch (e) {} }
// Charger le panier depuis le localStorage au démarrage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Fonction pour sauvegarder le panier dans le localStorage
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Appelez saveCart() à chaque fois que vous ajoutez, 
// modifiez ou supprimez un élément du panier.

function cnt() { var n = 0; for (var k in cart) n += cart[k]; return n; }
function total() { var t = 0; D.produits.forEach(function (p) { t += (cart[p.id] || 0) * p.prix; }); return t; }
function go(v, c) { S.v = v; S.cat = c || null; window.scrollTo(0, 0); draw(); }
function mapLink(la, ln) { return 'https://www.google.com/maps?q=' + la + ',' + ln; }
function field(ph, val, cb, type) { var i = h('input'); i.placeholder = ph; i.value = val || ''; if (type) i.type = type; i.oninput = function () { cb(i.value); }; return i; }

/* ---------- Données ---------- */
async function load() {
  if (!sb) { D.produits = DEMO; return draw(true); }
  var p = await sb.from('products').select('*').order('created_at', { ascending: false });
  var s = await sb.from('settings').select('*');
  if (!p.error) D.produits = p.data.map(function (r) { return { id: r.id, nom: r.nom, prix: Number(r.prix), old: r.old_prix ? Number(r.old_prix) : 0, cat: r.categorie, desc: r.description, img: r.image_url }; });
  if (!s.error) s.data.forEach(function (r) { D[r.key] = r.value; });
  draw(true);
}
async function loadOrders() {
  var r = await sb.from('orders').select('*').order('created_at', { ascending: false });
  if (!r.error) orders = r.data;
  draw(true);
}
function shrink(f, cb) {
  var r = new FileReader();
  r.onload = function () { var i = new Image(); i.onload = function () {
    var s = Math.min(1, 800 / Math.max(i.width, i.height)), c = document.createElement('canvas');
    c.width = Math.round(i.width * s); c.height = Math.round(i.height * s);
    c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); c.toBlob(cb, 'image/jpeg', 0.8);
  }; i.src = r.result; };
  r.readAsDataURL(f);
}
async function addProduct(f) {
  var url = null;
  if (f.blob) {
    var path = Date.now() + '.jpg', u = await sb.storage.from('produits').upload(path, f.blob, { contentType: 'image/jpeg' });
    if (u.error) return alert('Photo refusée : ' + u.error.message);
    url = sb.storage.from('produits').getPublicUrl(path).data.publicUrl;
  }
  var r = await sb.from('products').insert({ nom: f.nom, prix: f.prix, old_prix: f.old || null, categorie: f.cat, description: f.desc, image_url: url }).select();
  if (r.error || !r.data.length) return alert("Ajout refusé. Vérifie que tu es connecté avec l'email vendeur.");
  toast('Produit ajouté'); load();
}
async function delProduct(p) {
  if (!confirm('Supprimer « ' + p.nom + ' » ?')) return;
  var r = await sb.from('products').delete().eq('id', p.id).select();
  if (r.error || !r.data.length) return alert('Suppression refusée.');
  load();
}

/* ---------- Position et commande ---------- */
function geolocate() {
  if (!navigator.geolocation) { locErr = "La position n'est pas disponible sur cet appareil."; return draw(true); }
  locBusy = true; locErr = ''; draw(true);
  navigator.geolocation.getCurrentPosition(function (p) {
    loc = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }; locBusy = false; draw(true);
  }, function (e) {
    locBusy = false; locErr = e.code === 1 ? "Position refusée. Autorise la localisation dans les réglages du navigateur, ou écris ton adresse ci-dessous." : "Position introuvable. Réessaie, ou écris ton adresse ci-dessous."; draw(true);
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}
function waText(items, o) {
  var t = 'Bonjour, nouvelle commande ' + o.num + ' :\n';
  items.forEach(function (i) { t += '- ' + i.qte + ' x ' + i.nom + '\n'; });
  t += 'Total : ' + fmt(o.total) + '\nClient : ' + o.nom + ' (' + o.tel + ')';
  t += o.lat != null ? '\nPosition : ' + mapLink(o.lat, o.lng) : '\nAdresse : ' + o.addr;
  if (o.note) t += '\nNote : ' + o.note;
  return t;
}
async function submitOrder() {
  if (!C.nom.trim() || !C.tel.trim()) return alert('Indique ton nom et ton numéro de téléphone.');
  if (!loc && !C.addr.trim()) return alert('Partage ta position pour la livraison.');
  var items = D.produits.filter(function (p) { return cart[p.id]; }).map(function (p) { return { id: p.id, nom: p.nom, qte: cart[p.id], prix: p.prix }; });
  var id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  var row = { id: id, client_nom: C.nom.trim(), client_tel: C.tel.trim(), lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, adresse: C.addr.trim() || null, note: C.note.trim() || null, items: items, total: total() };
  if (sb) { var r = await sb.from('orders').insert(row); if (r.error) return alert('Commande non envoyée : ' + r.error.message); }
  var num = id.slice(0, 6).toUpperCase();
  S.done = { num: num, wa: waText(items, { num: num, total: row.total, nom: row.client_nom, tel: row.client_tel, lat: row.lat, lng: row.lng, addr: row.adresse, note: row.note }) };
  cart = {}; persist(); go('done');
}

/* ---------- Composants ---------- */
function tile(p, mini) {
  var t = h('div', 'pt');
  if (p.img) { var i = h('img'); i.src = p.img; i.alt = p.nom; i.loading = 'lazy'; t.appendChild(i); } else t.textContent = icon(p.cat);
  if (p.old > p.prix) t.appendChild(h('span', 'bd', '-' + Math.round(100 - p.prix * 100 / p.old) + '%'));
  return t;
}
function pcard(p) {
  var c = h('div', 'pc'), t = tile(p), a = h('button', 'plus', '+');
  a.setAttribute('aria-label', 'Ajouter ' + p.nom);
  a.onclick = function () { cart[p.id] = (cart[p.id] || 0) + 1; persist(); toast(p.nom + ' ajouté'); draw(true); };
  t.appendChild(a);
  if (user && sb) { var x = h('button', 'x', '✕'); x.setAttribute('aria-label', 'Supprimer'); x.onclick = function () { delProduct(p); }; t.appendChild(x); }
  var pr = h('div', 'pp' + (p.old > p.prix ? ' o' : ''), fmt(p.prix));
  if (p.old > p.prix) pr.appendChild(h('s', null, fmt(p.old)));
  c.append(t, pr, h('div', 'pn', p.nom), h('div', 'pd', p.desc || ''));
  return c;
}
function sec(title, list, c) {
  var w = h('section', 'sec'), r = h('div', 'shd'), b = h('button', 'pill', 'Tous ›'), car = h('div', 'car');
  b.onclick = function () { go('list', c); };
  r.append(h('h2', null, title), b);
  list.forEach(function (p) { car.appendChild(pcard(p)); });
  var all = h('button', 'allc'); all.append(h('span', 'arr', '›'), h('span', null, 'Tous les articles')); all.onclick = b.onclick; car.appendChild(all);
  w.append(r, car); return w;
}
function catTile(c, dark) {
  var b = h('button', 'ct' + (dark ? ' d' : '')); b.append(h('span', null, c[1]), h('span', null, c[0])); b.lastChild.style.fontSize = '1rem';
  b.onclick = function () { go('list', c[0]); }; return b;
}
function tabs() {
  var t = h('nav', 'tabs');
  [['home', '🏠', 'Accueil'], ['cats', '🗂️', 'Rayons'], ['cart', '🛒', 'Panier'], ['me', '👤', 'Vendeur']].forEach(function (x) {
    var b = h('button'); b.append(h('span', null, x[1]), h('span', null, x[2] + (x[0] === 'cart' && cnt() ? ' (' + cnt() + ')' : '')));
    if (S.v === x[0] || (S.v === 'list' && x[0] === 'home')) b.setAttribute('aria-current', 'page');
    b.onclick = function () { go(x[0]); }; t.appendChild(b);
  });
  return t;
}
function navbar(title, back) { var n = h('div', 'nav'), b = h('button', 'back', '←'); b.setAttribute('aria-label', 'Retour'); b.onclick = function () { go(back || 'home'); }; n.append(b, h('h1', null, title)); return n; }

/* ---------- Écrans ---------- */
function home() {
  if (!sb) R.appendChild(h('div', 'demo', 'Mode démo : renseigne config.js pour activer les vraies données (voir LISEZMOI.md).'));
  var top = h('div', 'top'), row = h('div', 'brow'), v = h('button', 'vend', user ? 'Espace vendeur' : 'Se connecter'), s = h('input', 'search'), body = h('div');
  v.onclick = function () { go('me'); }; row.append(h('div', 'brand', 'Marché'), v);
  top.append(row, h('div', 'sub', 'Nourriture, vêtements, objets, accessoires, appareils'), s);
  s.type = 'search'; s.placeholder = 'Que cherchez-vous ?'; s.value = S.q; s.setAttribute('aria-label', 'Rechercher');
  function fill() {
    body.textContent = '';
    if (S.q) { var g = h('div', 'grid'), l = D.produits.filter(function (p) { return (p.nom + ' ' + (p.desc || '')).toLowerCase().indexOf(S.q.toLowerCase()) > -1; });
      l.forEach(function (p) { g.appendChild(pcard(p)); }); if (!l.length) g.appendChild(h('p', 'empty', 'Aucun produit trouvé.')); body.appendChild(g); return; }
    var cs = h('div', 'cats'); CATS.forEach(function (c) { cs.appendChild(catTile(c)); });
    var pb = h('button', 'ct'); pb.append(h('span', null, '🏷️'), h('span', null, 'Promos')); pb.lastChild.style.fontSize = '1rem'; pb.onclick = function () { go('list', '*promos'); }; cs.appendChild(pb); body.appendChild(cs);
    if (!D.produits.length) { body.appendChild(h('p', 'empty', 'Aucun produit pour le moment. Reviens bientôt !')); return; }
    body.appendChild(sec('Populaires', D.produits.slice(0, 8), '*all'));
    var pm = D.produits.filter(function (p) { return p.old > p.prix; }); if (pm.length) body.appendChild(sec('Promos', pm, '*promos'));
    CATS.forEach(function (c) { var l = D.produits.filter(function (p) { return p.cat === c[0]; }); if (l.length) body.appendChild(sec(c[0], l, c[0])); });
  }
  s.oninput = function () { S.q = s.value; fill(); }; fill(); R.append(top, body);
}
function list() {
  var c = S.cat, title = c === '*promos' ? 'Promos' : c === '*all' ? 'Populaires' : c, g = h('div', 'grid');
  var l = D.produits.filter(function (p) { return c === '*promos' ? p.old > p.prix : (c === '*all' || p.cat === c); });
  R.appendChild(navbar(title)); l.forEach(function (p) { g.appendChild(pcard(p)); });
  if (!l.length) g.appendChild(h('p', 'empty', 'Rien ici pour le moment.')); R.appendChild(g);
}
function cats() { var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Quels rayons ?')); R.appendChild(n); var g = h('div', 'cats'); CATS.forEach(function (c) { g.appendChild(catTile(c, true)); }); R.appendChild(g); }
function cartV() {
  var n = h('div', 'nav'), tr = h('button', 'back', '🗑'); tr.setAttribute('aria-label', 'Vider le panier'); tr.onclick = function () { cart = {}; persist(); draw(); };
  n.append(h('h1', null, 'Panier'), tr); R.appendChild(n);
  var any = false;
  D.produits.forEach(function (p) {
    var q = cart[p.id]; if (!q) return; any = true;
    var r = h('div', 'row'), i = h('div', 'i'), qy = h('div', 'qty'), m = h('button', null, '−'), pl = h('button', null, '+');
    i.append(h('div', 'pn', p.nom), h('div', 'pp' + (p.old > p.prix ? ' o' : ''), fmt(p.prix)));
    m.onclick = function () { cart[p.id]--; if (cart[p.id] < 1) delete cart[p.id]; persist(); draw(); };
    pl.onclick = function () { cart[p.id]++; persist(); draw(); };
    qy.append(m, h('span', null, String(q)), pl); r.append(tile(p), i, qy); R.appendChild(r);
  });
  if (!any) { R.appendChild(h('p', 'empty', 'Ton panier est vide.')); return; }
  var t = h('div', 'tot'); t.append(h('span', null, 'Total'), h('span', null, fmt(total()))); R.appendChild(t);
}
function checkout() {
  R.appendChild(navbar('Livraison', 'cart'));
  var p = h('div', 'panel');
  p.append(field('Ton nom', C.nom, function (v) { C.nom = v; }), field('Ton téléphone', C.tel, function (v) { C.tel = v; }, 'tel'));
  var b = h('button', 'loc' + (loc ? ' ok' : ''));
  b.append(h('span', null, loc ? '✅' : '📍'), h('span', null, locBusy ? 'Recherche de ta position…' : loc ? 'Position partagée (précision ~' + loc.acc + ' m). Touche pour actualiser.' : 'Partager ma position pour la livraison'));
  b.onclick = geolocate; p.appendChild(b);
  if (locErr) { p.appendChild(h('div', 'err', locErr)); p.appendChild(field("Adresse de livraison", C.addr, function (v) { C.addr = v; })); }
  var ta = h('textarea'); ta.rows = 2; ta.placeholder = 'Instructions (repère, étage, heure...)'; ta.value = C.note; ta.oninput = function () { C.note = ta.value; }; p.appendChild(ta);
  R.appendChild(p);
  var t = h('div', 'tot'); t.append(h('span', null, 'Total'), h('span', null, fmt(total()))); R.appendChild(t);
  var o = h('button', 'fab', 'Confirmer la commande · ' + fmt(total())); o.onclick = submitOrder; R.appendChild(o);
}
function done() {
  R.appendChild(h('div', 'ok-big', '✅'));
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Commande envoyée')); R.appendChild(n);
  var p = h('div', 'panel'); p.append(h('b', null, 'N° ' + S.done.num), h('span', 'pd', 'Le vendeur a reçu ta commande et ta position. Il te contactera.'));
  if (D.whatsapp) { var w = h('button', 'go', 'Prévenir le vendeur sur WhatsApp'); w.onclick = function () { window.open('https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(S.done.wa), '_blank'); }; p.appendChild(w); }
  var k = h('button', 'go', 'Retour à l\'accueil'); k.onclick = function () { go('home'); }; p.appendChild(k); R.appendChild(p);
}
function me() {
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Espace vendeur')); R.appendChild(n);
  if (!sb) { var d = h('div', 'panel'); d.append(h('b', null, 'Connexion indisponible'), h('span', 'pd', 'Renseigne config.js (voir LISEZMOI.md) pour activer la connexion vendeur.')); R.appendChild(d); return; }
  if (!user) {
    var p = h('div', 'panel'), em = h('input'), pw = h('input'), er = h('div', 'err'), b = h('button', 'go', 'Se connecter');
    em.type = 'email'; em.placeholder = 'Email vendeur'; em.autocomplete = 'username'; pw.type = 'password'; pw.placeholder = 'Mot de passe'; pw.autocomplete = 'current-password';
    b.onclick = async function () { var r = await sb.auth.signInWithPassword({ email: em.value, password: pw.value }); if (r.error) er.textContent = 'Email ou mot de passe incorrect.'; };
    p.append(h('b', null, 'Connecte-toi pour gérer tes produits et tes commandes'), em, pw, er, b); R.appendChild(p); return;
  }
  var seg = h('div', 'seg'); [['produits', 'Produits'], ['commandes', 'Commandes'], ['reglages', 'Réglages']].forEach(function (x) {
    var b = h('button', null, x[1]); b.setAttribute('aria-pressed', String(S.tab === x[0]));
    b.onclick = function () { S.tab = x[0]; if (x[0] === 'commandes') loadOrders(); else draw(); }; seg.appendChild(b);
  }); R.appendChild(seg);
  if (S.tab === 'produits') {
    var F = { nom: '', prix: '', old: '', cat: CATS[0][0], desc: '', blob: null }, f = h('div', 'panel'), cs = h('select'), ph = h('input'), ad = h('button', 'go', 'Ajouter le produit');
    CATS.forEach(function (c) { cs.appendChild(h('option', null, c[0])); }); cs.onchange = function () { F.cat = cs.value; };
    ph.type = 'file'; ph.accept = 'image/*'; ph.onchange = function () { if (ph.files[0]) shrink(ph.files[0], function (b) { F.blob = b; }); };
    ad.onclick = function () { if (!F.nom || !F.prix) return alert('Nom et prix obligatoires.'); addProduct({ nom: F.nom, prix: Number(F.prix), old: Number(F.old) || 0, cat: F.cat, desc: F.desc, blob: F.blob }); };
    f.append(h('b', null, 'Nouveau produit'), field('Nom du produit', '', function (v) { F.nom = v; }), field('Prix', '', function (v) { F.prix = v; }, 'number'), field('Ancien prix (promo, optionnel)', '', function (v) { F.old = v; }, 'number'), cs, field('Description courte', '', function (v) { F.desc = v; }), h('span', 'pd', 'Photo (optionnelle)'), ph, ad);
    R.appendChild(f); R.appendChild(h('p', 'pd', '')).style.padding = '0 16px';
    R.lastChild.textContent = 'Les produits s’affichent dans le catalogue. Touche ✕ sur un produit pour le supprimer.';
  } else if (S.tab === 'commandes') {
    var rf = h('button', 'pill', 'Actualiser'); rf.style.margin = '0 16px'; rf.onclick = loadOrders; R.appendChild(rf);
    if (!orders.length) R.appendChild(h('p', 'empty', 'Aucune commande pour le moment.'));
    orders.forEach(function (o) {
      var c = h('div', 'ord'), dt = new Date(o.created_at).toLocaleString('fr-FR');
      c.append(h('b', null, 'N° ' + String(o.id).slice(0, 6).toUpperCase() + ' · ' + dt), h('div', null, o.client_nom + ' · ' + o.client_tel));
      (o.items || []).forEach(function (i) { c.appendChild(h('div', 'pd', i.qte + ' x ' + i.nom)); });
      c.appendChild(h('div', 'pp', fmt(o.total)));
      if (o.lat != null) { var a = h('a', null, '📍 Ouvrir la position du client'); a.href = mapLink(o.lat, o.lng); a.target = '_blank'; a.rel = 'noopener'; c.appendChild(a); }
      else if (o.adresse) c.appendChild(h('div', null, 'Adresse : ' + o.adresse));
      if (o.note) c.appendChild(h('div', 'pd', 'Note : ' + o.note));
      var tel = h('a', null, '📞 Appeler'); tel.href = 'tel:' + o.client_tel; c.appendChild(tel);
      var st = h('select'); STATUTS.forEach(function (s) { var op = h('option', null, s); if (s === o.statut) op.selected = true; st.appendChild(op); });
      st.onchange = async function () { var r = await sb.from('orders').update({ statut: st.value }).eq('id', o.id).select(); if (r.error || !r.data.length) alert('Mise à jour refusée.'); else toast('Statut mis à jour'); };
      c.appendChild(st); R.appendChild(c);
    });
  } else {
    var g = h('div', 'panel'), W = { whatsapp: D.whatsapp, devise: D.devise }, sv = h('button', 'go', 'Enregistrer'), lo = h('button', 'go', 'Se déconnecter');
    sv.onclick = async function () {
      var r = await sb.from('settings').upsert([{ key: 'whatsapp', value: W.whatsapp.replace(/\D/g, '') }, { key: 'devise', value: W.devise || 'FCFA' }]).select();
      if (r.error || !r.data.length) return alert('Enregistrement refusé.'); toast('Enregistré'); load();
    };
    lo.onclick = function () { sb.auth.signOut(); };
    g.append(h('b', null, 'Réglages'), field('WhatsApp (ex : 2250700000000)', W.whatsapp, function (v) { W.whatsapp = v; }), field('Devise', W.devise, function (v) { W.devise = v; }), sv, lo); R.appendChild(g);
  }
}
function draw(keep) {
  var y = window.scrollY, ae = document.activeElement, id = ae && ae.placeholder;
  R.textContent = '';
  ({ home: home, list: list, cats: cats, cart: cartV, checkout: checkout, done: done, me: me })[S.v]();
  R.appendChild(tabs());
  if (S.v === 'cart' && cnt()) { var o = h('button', 'fab', 'Passer la commande · ' + fmt(total())); o.onclick = function () { go('checkout'); }; R.appendChild(o); }
  else if (['home', 'list', 'cats'].indexOf(S.v) > -1 && cnt()) { var f = h('button', 'fab', 'Paniers · ' + cnt()); f.onclick = function () { go('cart'); }; R.appendChild(f); }
  if (keep) window.scrollTo(0, y);
}

/* ---------- Démarrage ---------- */
draw();
if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  sb.auth.getSession().then(function (r) { user = r.data.session ? r.data.session.user : null; draw(true); });
  sb.auth.onAuthStateChange(function (e, s) { user = s ? s.user : null; if (S.v === 'me') draw(true); });
}
load();
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
