var CFG = window.MARCHE_CONFIG || {}, sb = null, user = null;
var D = { devise: 'FCFA', whatsapp: '', produits: [] };
var S = { v: 'home', cat: null, q: '', tab: 'produits' }, C = { nom: '', tel: '', note: '', addr: '', pay: '' };
var cart = {}, loc = null, locErr = '', locBusy = false, orders = [], R = document.getElementById('root');
try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch (e) {}
var fav = []; try { fav = JSON.parse(localStorage.getItem('fav') || '[]'); } catch (e) {}
var mesCmd = []; try { mesCmd = JSON.parse(localStorage.getItem('cmd') || '[]'); } catch (e) {}
var VAPID_PUBLIC = 'BLcAutFgCPNTB0wyNX99ZPTm67_qyraUZmT-0DjZ-n2LTCXPD1urEsg_BtTSxY97MW3bbxiuUq6D7S4IWJrHM14', pushSub = null;
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
function cnt() { var n = 0; D.produits.forEach(function (p) { if (cart[p.id] && !p.out) n += cart[p.id]; }); return n; }
function sousTotal() { var t = 0; D.produits.forEach(function (p) { if (!p.out) t += (cart[p.id] || 0) * p.prix; }); return t; }
function fraisLiv() { return sousTotal() ? (Number(D.frais_livraison) || 0) : 0; }
function total() { return sousTotal() + fraisLiv(); }
function totalsBox() {
  var w = h('div', 'tots');
  var l1 = h('div'); l1.append(h('span', null, 'Sous-total'), h('span', null, fmt(sousTotal()))); w.appendChild(l1);
  if (fraisLiv()) { var l2 = h('div'); l2.append(h('span', null, 'Livraison'), h('span', null, fmt(fraisLiv()))); w.appendChild(l2); }
  var g = h('div', 'g'); g.append(h('span', null, 'Total'), h('span', null, fmt(total()))); w.appendChild(g); return w;
}
function go(v, c) { S.v = v; S.cat = c || null; window.scrollTo(0, 0); draw(); }
function mapLink(la, ln) { return 'https://www.google.com/maps?q=' + la + ',' + ln; }
function field(ph, val, cb, type) { var i = h('input'); i.placeholder = ph; i.value = val || ''; if (type) i.type = type; i.oninput = function () { cb(i.value); }; return i; }

/* ---------- Données ---------- */
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

/* ---------- Composants ---------- */
function sec(title, list, c) {
  var w = h('section', 'sec'), r = h('div', 'shd'), b = h('button', 'pill', 'Tous ›'), car = h('div', 'car');
  b.onclick = function () { go('list', c); };
  r.append(h('h2', null, title), b);
  list.forEach(function (p) { car.appendChild(pcard(p)); });
  var all = h('button', 'allc'); all.append(h('span', 'arr', '›'), h('span', null, 'Tous les articles')); all.onclick = b.onclick; car.appendChild(all);
  w.append(r, car); return w;
}
function catTile(c, dark) {
  var b = h('button', 'ct' + (c[2] ? ' img' : (dark ? ' d' : '')));
  var v;

  if (c[2]) {
    v = h('div', 'cimg');

    v.style.width = '100%';
    v.style.height = '110px';
    v.style.maxWidth = '100%';
    v.style.overflow = 'hidden';
    v.style.display = 'flex';
    v.style.alignItems = 'center';
    v.style.justifyContent = 'center';
    v.style.boxSizing = 'border-box';

    var i = h('img');
    i.src = c[2];
    i.alt = '';
    i.loading = 'lazy';

    i.style.display = 'block';
    i.style.width = '100%';
    i.style.height = '100%';
    i.style.maxWidth = '100%';
    i.style.maxHeight = '100%';
    i.style.objectFit = 'cover';
    i.style.objectPosition = 'center';
    i.style.boxSizing = 'border-box';

    v.appendChild(i);
  } else {
    v = h('span', null, c[1]);
  }

  b.style.width = '100%';
  b.style.maxWidth = '100%';
  b.style.minWidth = '0';
  b.style.overflow = 'hidden';
  b.style.boxSizing = 'border-box';

  b.append(v, h('span', 'cn', c[0]));

  b.onclick = function () {
    go('list', c[0]);
  };

  return b;
}

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
    var q = cart[p.id]; if (!q || p.out) return; any = true;
    var r = h('div', 'row'), i = h('div', 'i'), qy = h('div', 'qty'), m = h('button', null, '−'), pl = h('button', null, '+');
    i.append(h('div', 'pn', p.nom), h('div', 'pp' + (p.old > p.prix ? ' o' : ''), fmt(p.prix)));
    m.onclick = function () { cart[p.id]--; if (cart[p.id] < 1) delete cart[p.id]; persist(); draw(); };
    pl.onclick = function () { cart[p.id]++; persist(); draw(); };
    qy.append(m, h('span', null, String(q)), pl); r.append(tile(p), i, qy); R.appendChild(r);
  });
  if (!any) { R.appendChild(h('p', 'empty', 'Ton panier est vide.')); return; }
  R.appendChild(totalsBox());
}


/* ---------- Favoris, catégories, fiche produit ---------- */
function isFav(p) { return fav.indexOf(p.id) > -1; }
function toggleFav(p) { var i = fav.indexOf(p.id); if (i > -1) fav.splice(i, 1); else fav.push(p.id); try { localStorage.setItem('fav', JSON.stringify(fav)); } catch (e) {} draw(true); }
function heart(p) {
  var b = h('button', 'heart' + (isFav(p) ? ' on' : ''), isFav(p) ? '♥' : '♡');
  b.setAttribute('aria-label', isFav(p) ? 'Retirer des favoris' : 'Ajouter aux favoris'); b.setAttribute('aria-pressed', String(isFav(p)));
  b.onclick = function (e) { e.stopPropagation(); toggleFav(p); }; return b;
}
function openProd(p) { S.prev = { v: S.v, cat: S.cat }; S.pid = p.id; go('prod'); }
function back() { var pv = S.prev || { v: 'home' }; S.v = pv.v; S.cat = pv.cat || null; draw(); }
function addCart(p) { if (p.out) { toast('Produit épuisé'); return; } cart[p.id] = (cart[p.id] || 0) + 1; persist(); toast(p.nom + ' ajouté au panier'); }
function waveAvailable() { return !!(D.wave_link || D.wave_num); }
function waveLink(t) { var b = D.wave_link; return b + (b.indexOf('?') > -1 ? '&' : '?') + 'amount=' + Math.round(t); }

async function load() {
  if (!sb) { D.produits = DEMO; return draw(true); }
  var p = await sb.from('products').select('*').order('created_at', { ascending: false });
  var s = await sb.from('settings').select('*');
  var c = await sb.from('categories').select('*').order('created_at');
  if (!c.error && c.data.length) CATS = c.data.map(function (r) { return [r.nom, r.emoji || '🛍️', r.image_url || '']; });
  if (!p.error) D.produits = p.data.map(function (r) {
    var im = r.images && r.images.length ? r.images : (r.image_url ? [r.image_url] : []);
    return { out: !!r.epuise, id: r.id, nom: r.nom, prix: Number(r.prix), old: r.old_prix ? Number(r.old_prix) : 0, cat: r.categorie, desc: r.description, images: im };
  });
  if (!s.error) s.data.forEach(function (r) { D[r.key] = r.value; });
  draw(true);
}
async function addProduct(f) {
  var urls = [];
  for (var i = 0; i < f.blobs.length; i++) {
    var path = Date.now() + '-' + i + '.jpg', u = await sb.storage.from('produits').upload(path, f.blobs[i], { contentType: 'image/jpeg' });
    if (u.error) return alert('Photo refusée : ' + u.error.message);
    urls.push(sb.storage.from('produits').getPublicUrl(path).data.publicUrl);
  }
  var r = await sb.from('products').insert({ nom: f.nom, prix: f.prix, old_prix: f.old || null, categorie: f.cat, description: f.desc, image_url: urls[0] || null, images: urls }).select();
  if (r.error || !r.data.length) return alert("Ajout refusé : " + (r.error ? r.error.message : "vérifie que tu es connecté avec le compte vendeur."));
  toast('Produit ajouté'); load();
}
async function catUpload(blob) {
  var path = 'cat-' + Date.now() + '.jpg', u = await sb.storage.from('produits').upload(path, blob, { contentType: 'image/jpeg' });
  if (u.error) { alert('Image refusée : ' + u.error.message); return null; }
  return sb.storage.from('produits').getPublicUrl(path).data.publicUrl;
}
async function setCatImage(c, blob) {
  var url = await catUpload(blob); if (!url) return;
  var r = await sb.from('categories').update({ image_url: url }).eq('nom', c[0]).select();
  if (r.error || !r.data.length) return alert('Modification refusée : ' + (r.error ? r.error.message : 'compte vendeur requis.'));
  toast('Image mise à jour ✅'); load();
}
async function addCat(nom, blob) {
  if (!nom.trim()) return alert('Écris le nom de la catégorie.');
  var url = null; if (blob) { url = await catUpload(blob); if (!url) return; }
  var r = await sb.from('categories').insert({ nom: nom.trim(), emoji: '🛍️', image_url: url }).select();
  if (r.error || !r.data.length) return alert('Ajout refusé : ' + (r.error ? r.error.message : 'compte vendeur requis.'));
  toast('Catégorie ajoutée'); load();
}
async function delCat(c) {
  if (!confirm('Supprimer la catégorie « ' + c[0] + ' » ? Les produits restent, mais ne seront plus classés dans un rayon.')) return;
  var r = await sb.from('categories').delete().eq('nom', c[0]).select();
  if (r.error || !r.data.length) return alert('Suppression refusée.');
  load();
}

/* ---------- Commande ---------- */
async function submitOrder() {
  if (!C.nom.trim() || !C.tel.trim()) return alert('Indique ton nom et ton numéro de téléphone.');
  if (!loc && !C.addr.trim()) return alert('Partage ta position pour la livraison.');
  var pay = (C.pay === 'wave' && waveAvailable()) ? 'wave' : 'especes';
  var items = D.produits.filter(function (p) { return cart[p.id] && !p.out; }).map(function (p) { return { id: p.id, nom: p.nom, qte: cart[p.id], prix: p.prix }; });
  if (!items.length) return alert('Ton panier est vide.');
  var id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  var row = { id: id, client_nom: C.nom.trim(), client_tel: C.tel.trim(), lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, adresse: C.addr.trim() || null, note: C.note.trim() || null, items: items, total: total(), frais: fraisLiv(), paiement: pay };
  if (sb) { var r = await sb.from('orders').insert(row); if (r.error) return alert('Commande non envoyée : ' + r.error.message); sb.functions.invoke('notify', { body: { type: 'nouvelle', order_id: id } }).catch(function () {}); }
  var num = id.slice(0, 6).toUpperCase();
  mesCmd.unshift({ id: id, num: num, total: row.total, date: new Date().toISOString(), statut: 'nouvelle', paiement: pay, paye: false }); saveMy(); linkOrders();
  S.done = { num: num, pay: pay, total: row.total, wa: waText(items, { num: num, total: row.total, nom: row.client_nom, tel: row.client_tel, lat: row.lat, lng: row.lng, addr: row.adresse, note: row.note }) + '\nPaiement : ' + (pay === 'wave' ? 'Wave' : 'espèces à la livraison') };
  cart = {}; persist(); go('done');
}

/* ---------- Composants ---------- */
function tile(p) {
  var t = h('div', 'pt'), im = p.images && p.images[0];
  if (im) { var i = h('img'); i.src = im; i.alt = p.nom; i.loading = 'lazy'; t.appendChild(i); } else t.textContent = icon(p.cat);
  if (p.old > p.prix) t.appendChild(h('span', 'bd', '-' + Math.round(100 - p.prix * 100 / p.old) + '%'));
  if (p.out) { t.classList.add('out'); t.appendChild(h('span', 'soldout', 'Épuisé')); }
  return t;
}
function pcard(p) {
  var c = h('div', 'pc'), t = tile(p);
  t.appendChild(heart(p));
  c.setAttribute('role', 'button'); c.tabIndex = 0; c.setAttribute('aria-label', p.nom + ', ' + fmt(p.prix));
  c.onclick = function () { openProd(p); }; c.onkeydown = function (e) { if (e.key === 'Enter') openProd(p); };
  var pr = h('div', 'pp' + (p.old > p.prix ? ' o' : ''), fmt(p.prix));
  if (p.old > p.prix) pr.appendChild(h('s', null, fmt(p.old)));
  c.append(t, pr, h('div', 'pn', p.nom), h('div', 'pd', p.desc || ''));
  return c;
}
function tabs() {
  var t = h('nav', 'tabs');
  [['home', '🏠', 'Accueil'], ['cats', '🗂️', 'Rayons'], ['cart', '🛒', 'Panier'], ['favs', '♥', 'Favoris'], ['orders', '📦', 'Commandes']].forEach(function (x) {
    var b = h('button'); b.append(h('span', null, x[1]), h('span', null, x[2] + (x[0] === 'cart' && cnt() ? ' (' + cnt() + ')' : '') + (x[0] === 'orders' && unseen() ? ' 🔴' : '')));
    if (S.v === x[0] || (S.v === 'list' && x[0] === 'home')) b.setAttribute('aria-current', 'page');
    b.onclick = function () { go(x[0]); }; t.appendChild(b);
  });
  return t;
}

/* ---------- Écrans ---------- */
function prod() {
  var p = D.produits.filter(function (x) { return x.id === S.pid; })[0];
  if (!p) { go('home'); return; }
  var n = h('div', 'nav'), b = h('button', 'back', '←'); b.setAttribute('aria-label', 'Retour'); b.onclick = back;
  n.append(b, h('h1', null, 'Détails'));
  if (navigator.share) { var sh = h('button', 'back', '↗'); sh.setAttribute('aria-label', 'Partager'); sh.onclick = function () { navigator.share({ title: p.nom, text: p.nom + ' - ' + fmt(p.prix), url: location.href }).catch(function () {}); }; n.appendChild(sh); }
  R.appendChild(n);
  var imgs = p.images || [], car = h('div', 'gal'), dots = h('div', 'dots');
  if (imgs.length) imgs.forEach(function (u, i) { var s = h('div', 'slide'), im = h('img'); im.src = u; im.alt = p.nom + ' photo ' + (i + 1); s.appendChild(im); car.appendChild(s); dots.appendChild(h('i', i === 0 ? 'on' : '')); });
  else { var sl = h('div', 'slide', icon(p.cat)); sl.style.fontSize = '6rem'; car.appendChild(sl); }
  car.onscroll = function () { var k = Math.round(car.scrollLeft / car.clientWidth); Array.prototype.forEach.call(dots.children, function (d, i) { d.className = i === k ? 'on' : ''; }); };
  R.appendChild(car); if (imgs.length > 1) R.appendChild(dots);
  var info = h('div', 'info'), pr = h('div', 'big-price' + (p.old > p.prix ? ' o' : ''), fmt(p.prix));
  if (p.old > p.prix) { pr.appendChild(h('s', null, fmt(p.old))); pr.appendChild(h('span', 'bd2', '-' + Math.round(100 - p.prix * 100 / p.old) + '%')); }
  var hr = h('div', 'brow'); hr.append(h('h2', 'big', p.nom), heart(p)); hr.lastChild.style.position = 'static';
  info.append(hr, pr, h('p', 'pd', p.cat), h('p', null, p.desc || ''));
  if (user && sb) { var d = h('button', 'pill', 'Supprimer ce produit'); d.onclick = async function () { if (!confirm('Supprimer « ' + p.nom + ' » ?')) return; var r = await sb.from('products').delete().eq('id', p.id).select(); if (r.error || !r.data.length) return alert('Suppression refusée.'); back(); load(); }; info.appendChild(d); }
  if (user && sb) info.appendChild(editPanel(p));
  R.appendChild(info);
  var bar = h('div', 'buy'), a = h('button', 'a', 'Ajouter au panier'), by = h('button', 'b', 'Acheter');
  a.onclick = function () { addCart(p); draw(true); }; by.onclick = function () { addCart(p); go('cart'); };
  if (p.out) { a.disabled = by.disabled = true; a.textContent = 'Épuisé'; by.textContent = 'Indisponible'; }
  bar.append(a, by); R.appendChild(bar);
}
function favsV() {
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Favoris')); R.appendChild(n);
  var l = D.produits.filter(isFav);
  if (!l.length) { R.appendChild(h('p', 'empty', 'Touche le ♡ sur un produit pour le retrouver ici.')); return; }
  l.forEach(function (p) {
    var r = h('div', 'row'), i = h('div', 'i'), t = tile(p), a = h('button', 'pill', 'Ajouter au panier'), d = h('button', 'pill', 'Supprimer');
    t.onclick = function () { openProd(p); }; t.style.cursor = 'pointer';
    i.append(h('div', 'pn', p.nom), h('div', 'pp' + (p.old > p.prix ? ' o' : ''), fmt(p.prix)));
    a.onclick = function () { addCart(p); draw(true); }; d.onclick = function () { toggleFav(p); };
    var bx = h('div', 'qty'); bx.style.flexDirection = 'column'; bx.append(a, d);
    r.append(t, i, bx); R.appendChild(r);
  });
}
function checkout() {
  R.appendChild(navbar('Livraison', 'cart'));
  var p = h('div', 'panel');
  p.append(field('Ton nom', C.nom, function (v) { C.nom = v; }), field('Ton téléphone', C.tel, function (v) { C.tel = v; }, 'tel'));
  var b = h('button', 'loc' + (loc ? ' ok' : ''));
  b.append(h('span', null, loc ? '✅' : '📍'), h('span', null, locBusy ? 'Recherche de ta position…' : loc ? 'Position partagée (précision ~' + loc.acc + ' m). Touche pour actualiser.' : 'Partager ma position pour la livraison'));
  b.onclick = geolocate; p.appendChild(b);
  if (locErr) { p.appendChild(h('div', 'err', locErr)); p.appendChild(field('Adresse de livraison', C.addr, function (v) { C.addr = v; })); }
  var ta = h('textarea'); ta.rows = 2; ta.placeholder = 'Instructions (repère, étage, heure...)'; ta.value = C.note; ta.oninput = function () { C.note = ta.value; }; p.appendChild(ta);
  R.appendChild(p);
  var pp = h('div', 'panel'), py = h('div', 'pay'), opts = [];
  if (waveAvailable()) opts.push(['wave', '🌊', 'Payer par Wave', 'Tu confirmes la commande, puis un lien t\'ouvre Wave pour payer.']);
  opts.push(['especes', '💵', 'Payer en espèces à la livraison', 'Tu paies au livreur quand tu reçois ta commande.']);
  if (!C.pay || (C.pay === 'wave' && !waveAvailable())) C.pay = opts[0][0];
  opts.forEach(function (o) { var x = h('button'); x.type = 'button'; x.setAttribute('aria-pressed', String(C.pay === o[0])); x.append(o[0] === 'wave' ? h('span', 'wvb', 'Wave') : h('span', null, o[1]), h('span', null, o[2])); x.onclick = function () { C.pay = o[0]; draw(true); }; py.appendChild(x); });
  pp.append(h('b', null, 'Mode de paiement'), py); R.appendChild(pp);
  R.appendChild(totalsBox());
  var o = h('button', 'fab', 'Confirmer la commande · ' + fmt(total())); o.onclick = submitOrder; R.appendChild(o);
}
function done() {
  R.appendChild(h('div', 'ok-big', '✅'));
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Commande envoyée')); R.appendChild(n);
  var p = h('div', 'panel'); p.append(h('b', null, 'N° ' + S.done.num), h('span', 'pd', 'Le vendeur a reçu ta commande et ta position. Il te contactera.'));
  if (S.done.pay === 'wave') {
    if (D.wave_link) { var w = h('button', 'go wv', 'Payer ' + fmt(S.done.total) + ' avec Wave'); w.onclick = function () { window.open(waveLink(S.done.total), '_blank'); }; p.appendChild(h('span', 'pd', 'Touche le bouton : Wave s\'ouvre avec le montant déjà rempli, il ne reste qu\'à confirmer.')); p.appendChild(w); }
    else { var cp = h('button', 'go wv', 'Copier le numéro Wave ' + D.wave_num); cp.onclick = function () { try { navigator.clipboard.writeText(D.wave_num); } catch (e) {} toast('Numéro copié'); }; p.appendChild(h('span', 'pd', 'Envoie ' + fmt(S.done.total) + ' par Wave au ' + D.wave_num + '.')); p.appendChild(cp); }
  } else p.appendChild(h('span', 'pd', 'Tu paieras en espèces à la livraison.'));
  if (pushSupported() && !pushSub) { var pn = h('button', 'go', '🔔 Être prévenu du suivi de ma commande'); pn.onclick = enablePush; p.appendChild(pn); }
  if (D.whatsapp) { var wa = h('button', 'go', 'Prévenir le vendeur sur WhatsApp'); wa.onclick = function () { window.open('https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(S.done.wa), '_blank'); }; p.appendChild(wa); }
  var k = h('button', 'go', "Retour à l'accueil"); k.onclick = function () { go('home'); }; p.appendChild(k); R.appendChild(p);
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
  var seg = h('div', 'seg'); [['produits', 'Produits'], ['commandes', 'Commandes'], ['annonces', 'Annonces'], ['reglages', 'Réglages']].forEach(function (x) {
    var b = h('button', null, x[1]); b.setAttribute('aria-pressed', String(S.tab === x[0]));
    b.onclick = function () { S.tab = x[0]; if (x[0] === 'commandes') loadOrders(); else draw(); }; seg.appendChild(b);
  }); R.appendChild(seg);
  if (S.tab === 'produits') {
    var K = { nom: '', blob: null }, kp = h('div', 'panel'), kb = h('button', 'go', 'Ajouter la catégorie'), ki = h('input');
    ki.type = 'file'; ki.accept = 'image/*'; ki.onchange = function () { K.blob = null; if (ki.files[0]) shrink(ki.files[0], function (bl) { K.blob = bl; }); };
    kb.onclick = function () { addCat(K.nom, K.blob); };
    kp.append(h('b', null, 'Nouvelle catégorie'), field('Nom (ex : Boissons)', '', function (v) { K.nom = v; }), h('span', 'pd', "Image de la catégorie (choisis une photo dans ta galerie)"), ki, kb);
    CATS.forEach(function (c) {
      var r = h('div', 'crow'), th = h('div', 'cthumb'), x = h('button', 'pill', 'Supprimer'), ch = h('label', 'pill', c[2] ? "Changer l'image" : 'Ajouter une image'), fi = h('input');
      if (c[2]) { var im = h('img'); im.src = c[2]; im.alt = ''; th.appendChild(im); } else th.textContent = c[1];
      fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true; fi.onchange = function () { if (fi.files[0]) shrink(fi.files[0], function (bl) { setCatImage(c, bl); }); };
      ch.appendChild(fi); x.onclick = function () { delCat(c); };
      r.append(th, h('span', 'cname', c[0]), ch, x); kp.appendChild(r);
    });
    R.appendChild(kp);
    var F = { nom: '', prix: '', old: '', cat: CATS[0] ? CATS[0][0] : '', desc: '', blobs: [] }, f = h('div', 'panel'), cs = h('select'), ph = h('input'), ad = h('button', 'go', 'Ajouter le produit');
    CATS.forEach(function (c) { cs.appendChild(h('option', null, c[0])); }); cs.onchange = function () { F.cat = cs.value; };
    ph.type = 'file'; ph.accept = 'image/*'; ph.multiple = true;
    ph.onchange = function () { F.blobs = []; Array.prototype.slice.call(ph.files, 0, 5).forEach(function (fl, i) { shrink(fl, function (bl) { F.blobs[i] = bl; }); }); };
    ad.onclick = function () { if (!F.nom || !F.prix) return alert('Nom et prix obligatoires.'); addProduct({ nom: F.nom, prix: Number(F.prix), old: Number(F.old) || 0, cat: F.cat, desc: F.desc, blobs: F.blobs.filter(Boolean) }); };
    f.append(h('b', null, 'Nouveau produit'), field('Nom du produit', '', function (v) { F.nom = v; }), field('Prix', '', function (v) { F.prix = v; }, 'number'), field('Ancien prix (promo, optionnel)', '', function (v) { F.old = v; }, 'number'), cs, field('Description courte', '', function (v) { F.desc = v; }), h('span', 'pd', "Photos (jusqu'à 5, la première est la photo principale)"), ph, ad);
    R.appendChild(f);
    var tip = h('p', 'pd', 'Pour supprimer un produit : ouvre-le dans le catalogue, puis touche « Supprimer ce produit ».'); tip.style.padding = '0 16px'; R.appendChild(tip);
  } else if (S.tab === 'commandes') {
    var rf = h('button', 'pill', 'Actualiser'); rf.style.margin = '0 16px'; rf.onclick = loadOrders; R.appendChild(rf);
    if (!orders.length) R.appendChild(h('p', 'empty', 'Aucune commande pour le moment.'));
    orders.forEach(function (o) {
      var c = h('div', 'ord'), dt = new Date(o.created_at).toLocaleString('fr-FR');
      c.append(h('b', null, 'N° ' + String(o.id).slice(0, 6).toUpperCase() + ' · ' + dt), h('div', null, o.client_nom + ' · ' + o.client_tel));
      (o.items || []).forEach(function (i) { c.appendChild(h('div', 'pd', i.qte + ' x ' + i.nom)); });
      c.appendChild(h('div', 'pp', fmt(o.total) + (Number(o.frais) ? ' (dont livraison ' + fmt(o.frais) + ')' : '')));
      c.appendChild(h('div', null, 'Paiement : ' + (o.paiement === 'wave' ? 'Wave ' + (o.paye ? '✅ payée' : '⏳ à vérifier dans Wave') : 'espèces à la livraison ' + (o.paye ? '✅ encaissée' : ''))));
      var pb = h('button', 'pill', o.paye ? 'Marquer non payée' : 'Marquer comme payée');
      pb.onclick = async function () { var r = await sb.from('orders').update({ paye: !o.paye }).eq('id', o.id).select(); if (r.error || !r.data.length) alert('Mise à jour refusée.'); else { if (!o.paye) notifyClient(o.id, 'paye', o.statut); loadOrders(); } };
      c.appendChild(pb);
      if (o.lat != null) { var a = h('a', null, '📍 Ouvrir la position du client'); a.href = mapLink(o.lat, o.lng); a.target = '_blank'; a.rel = 'noopener'; c.appendChild(a); }
      else if (o.adresse) c.appendChild(h('div', null, 'Adresse : ' + o.adresse));
      if (o.note) c.appendChild(h('div', 'pd', 'Note : ' + o.note));
      var tel = h('a', null, '📞 Appeler'); tel.href = 'tel:' + o.client_tel; c.appendChild(tel);
      var st = h('select'); STATUTS.forEach(function (s) { var op = h('option', null, s); if (s === o.statut) op.selected = true; st.appendChild(op); });
      st.onchange = async function () { var r = await sb.from('orders').update({ statut: st.value }).eq('id', o.id).select(); if (r.error || !r.data.length) alert('Mise à jour refusée.'); else { o.statut = st.value; notifyClient(o.id, 'statut', st.value); } };
      var wb = h('button', 'pill', '💬 Prévenir le client sur WhatsApp');
      wb.onclick = function () { var t = 'Bonjour ' + o.client_nom + ', ta commande N° ' + String(o.id).slice(0, 6).toUpperCase() + ' ' + statutMsg(o.statut) + '.'; window.open('https://wa.me/' + clientWa(o) + '?text=' + encodeURIComponent(t), '_blank'); };
      c.append(h('div', 'pd', 'État de la commande (le client le voit en direct) :'), st, h('div', 'pd', 'Prévenir le client par message :'), wb); R.appendChild(c);
    });
  } else if (S.tab === 'annonces') {
    var A = { titre: '', msg: '' }, ap = h('div', 'panel'), am = h('textarea'), ab = h('button', 'go', 'Envoyer à tous les clients');
    am.rows = 3; am.placeholder = 'Message'; am.oninput = function () { A.msg = am.value; };
    ab.onclick = async function () {
      if (!A.titre.trim() || !A.msg.trim()) return alert('Écris un titre et un message.');
      if (!confirm('Envoyer cette annonce à tous les clients qui ont activé les notifications ?')) return;
      var r = await sb.functions.invoke('notify', { body: { type: 'annonce', titre: A.titre.trim(), message: A.msg.trim() } });
      if (r.error) return alert("Annonce non envoyée. Vérifie que la fonction notify est à jour.");
      alert('Annonce envoyée à ' + ((r.data && r.data.sent) || 0) + ' client(s) sur ' + ((r.data && r.data.total) || 0) + ' abonné(s).');
    };
    ap.append(h('b', null, 'Annonce ou promo'), h('span', 'pd', "Le message arrive comme une notification sur le téléphone des clients qui les ont activées."), field('Titre (ex : -20 % ce week-end)', '', function (v) { A.titre = v; }), am, ab); R.appendChild(ap);
  } else {
    var g = h('div', 'panel'), W = { whatsapp: D.whatsapp || '', devise: D.devise || 'FCFA', wave_link: D.wave_link || '', wave_num: D.wave_num || '', indicatif: D.indicatif || '225', frais_livraison: D.frais_livraison || '' }, sv = h('button', 'go', 'Enregistrer'), lo = h('button', 'go', 'Se déconnecter');
    sv.onclick = async function () {
      var r = await sb.from('settings').upsert([{ key: 'whatsapp', value: W.whatsapp.replace(/\D/g, '') }, { key: 'devise', value: W.devise || 'FCFA' }, { key: 'wave_link', value: W.wave_link.trim() }, { key: 'wave_num', value: W.wave_num.replace(/\D/g, '') }, { key: 'indicatif', value: W.indicatif.replace(/\D/g, '') || '225' }, { key: 'frais_livraison', value: String(Number(W.frais_livraison) || 0) }]).select();
      if (r.error || !r.data.length) return alert('Enregistrement refusé.'); toast('Enregistré'); load();
    };
    lo.onclick = function () { sb.auth.signOut(); };
    g.append(h('b', null, 'Réglages'), field('WhatsApp (ex : 2250700000000)', W.whatsapp, function (v) { W.whatsapp = v; }), field('Devise', W.devise, function (v) { W.devise = v; }), field('Indicatif pays des clients (ex : 225)', W.indicatif, function (v) { W.indicatif = v; }), field('Frais de livraison (montant, ex : 1000)', W.frais_livraison, function (v) { W.frais_livraison = v; }, 'number'),
      h('b', null, 'Paiement Wave'), h('span', 'pd', "Colle ici le lien de paiement de ton compte Wave Business. Sans lien, le client verra seulement ton numéro Wave."),
      field('Lien de paiement Wave (https://...)', W.wave_link, function (v) { W.wave_link = v; }), field('Numéro Wave (secours)', W.wave_num, function (v) { W.wave_num = v; }), sv, lo); R.appendChild(g); R.appendChild(sellerPushPanel());
  }
}
function draw(keep) {
  var y = window.scrollY;
  R.textContent = '';
  ({ home: home, list: list, cats: cats, cart: cartV, checkout: checkout, done: done, me: me, prod: prod, favs: favsV, orders: ordersV })[S.v]();
  if (S.v !== 'prod') R.appendChild(tabs());
  var ob = ['home', 'list', 'cats', 'favs', 'orders'].indexOf(S.v) > -1 ? onboard() : null; if (ob) R.appendChild(ob);
  if (S.v === 'cart' && cnt()) { var o = h('button', 'fab', 'Passer la commande · ' + fmt(total())); o.onclick = function () { go('checkout'); }; R.appendChild(o); }
  else if (['home', 'list', 'cats', 'favs'].indexOf(S.v) > -1 && cnt() && !ob) { var f = h('button', 'fab', 'Paniers · ' + cnt()); f.onclick = function () { go('cart'); }; R.appendChild(f); }
  if (keep) window.scrollTo(0, y);
}

/* ---------- Suivi des commandes (côté client) ---------- */
var STEPS = [['nouvelle', 'Commande reçue'], ['en préparation', 'En préparation'], ['en livraison', 'En route'], ['livrée', 'Livrée']];
function saveMy() { try { localStorage.setItem('cmd', JSON.stringify(mesCmd.slice(0, 30))); } catch (e) {} }
function unseen() { return mesCmd.some(function (o) { return o.unseen; }); }
function statutMsg(s) { return { 'nouvelle': 'a bien été reçue', 'en préparation': 'est en préparation', 'en livraison': 'est en route', 'livrée': 'a été livrée', 'annulée': 'a été annulée' }[s] || s; }
function clientWa(o) { var d = String(o.client_tel || '').replace(/\D/g, ''), ind = D.indicatif || '225'; if (d.indexOf('00') === 0) d = d.slice(2); else if (d.indexOf(ind) !== 0) d = ind + d; return d; }
async function refreshOrders(manual) {
  if (!sb || !mesCmd.length) return;
  var r = await sb.rpc('suivi_commandes', { ids: mesCmd.map(function (o) { return o.id; }) });
  if (r.error) { if (manual) alert('Le suivi est indisponible : ' + r.error.message + '\n(Il faut lancer la mise à jour du suivi dans Supabase.)'); return; }
  var changed = false;
  r.data.forEach(function (row) {
    var o = mesCmd.filter(function (x) { return x.id === row.id; })[0]; if (!o) return;
    if (o.statut !== row.statut) {
      o.statut = row.statut; o.unseen = true; changed = true;
      var m = 'Commande N° ' + o.num + ' : ' + statutMsg(row.statut); toast(m);
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) { try { new Notification('Marché', { body: m }); } catch (e) {} }
    }
    o.paye = row.paye; o.paiement = row.paiement;
  });
  saveMy();
  if (manual) toast('À jour');
  if ((changed || manual) && ['checkout', 'me'].indexOf(S.v) === -1) draw(true);
}
function ordersV() {
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Mes commandes')); R.appendChild(n);
  mesCmd.forEach(function (o) { o.unseen = false; }); saveMy();
  var tools = h('div', 'seg'), rf = h('button', null, 'Actualiser'); rf.onclick = function () { refreshOrders(true); }; tools.appendChild(rf);
  if (pushSupported() && !pushSub) { var nb = h('button', null, '🔔 Activer les notifications'); nb.onclick = enablePush; tools.appendChild(nb); }
  R.appendChild(tools);
  if (!mesCmd.length) R.appendChild(h('p', 'empty', "Tu n'as pas encore passé de commande."));
  mesCmd.forEach(function (o) {
    var c = h('div', 'ord');
    c.append(h('b', null, 'N° ' + o.num + ' · ' + new Date(o.date).toLocaleDateString('fr-FR')), h('div', 'pp', fmt(o.total)));
    if (o.statut === 'annulée') c.appendChild(h('div', 'err', "Commande annulée. Contacte le vendeur pour plus d'infos."));
    else {
      var idx = 0; STEPS.forEach(function (s, i) { if (s[0] === o.statut) idx = i; });
      var ol = h('ol', 'steps2'); STEPS.forEach(function (s, i) { var li = h('li', i <= idx ? 'on' : '', s[1]); if (i === idx) li.setAttribute('aria-current', 'step'); ol.appendChild(li); }); c.appendChild(ol);
    }
    c.appendChild(h('div', 'pd', o.paiement === 'wave' ? (o.paye ? 'Paiement Wave : ✅ reçu' : 'Paiement Wave : en attente de confirmation par le vendeur') : (o.paye ? 'Espèces : ✅ encaissé' : 'À payer en espèces à la livraison')));
    R.appendChild(c);
  });
  var v = h('button', 'pill', 'Espace vendeur'); v.style.margin = '16px'; v.onclick = function () { go('me'); }; R.appendChild(v);
}

/* ---------- Notifications push ---------- */
function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC && !!sb; }
function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
async function linkOrders() {
  if (!sb || !pushSub) return;
  for (var i = 0; i < mesCmd.length; i++) {
    var o = mesCmd[i]; if (o.pushed || o.statut === 'livrée' || o.statut === 'annulée') continue;
    var r = await sb.from('push_subs').insert({ order_id: o.id, endpoint: pushSub.endpoint, subscription: pushSub });
    if (!r.error || (r.error && r.error.code === '23505')) o.pushed = true;
  }
  saveMy();
}
async function enablePush() {
  if (!pushSupported()) return alert("Les notifications ne sont pas disponibles ici. Sur iPhone, ajoute d'abord l'application à l'écran d'accueil.");
  var perm = await Notification.requestPermission();
  if (perm !== 'granted') return alert("Notifications refusées. Tu peux les autoriser dans les réglages du navigateur (paramètres du site).");
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) }));
    pushSub = sub.toJSON(); await regClient(); await linkOrders(); toast('Notifications activées ✅'); draw(true);
  } catch (e) { alert("Activation impossible : " + e.message); }
}
async function initPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try { var reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) { pushSub = sub.toJSON(); await regClient(); await linkOrders(); draw(true); } } catch (e) {}
}
async function notifyClient(orderId, type, statut) {
  var r = await sb.functions.invoke('notify', { body: { order_id: orderId, type: type, statut: statut } });
  if (r.error) {
    var d = r.error.message || '';
    try { var c = r.error.context; if (c && c.status) { d = 'code ' + c.status; var t = await c.text(); if (t) d += ' : ' + t.slice(0, 250); } } catch (e) {}
    alert('Notification non envoyée.\n' + d);
    return;
  }
  if (r.data && r.data.sent === 0) toast("Le client n'a pas activé les notifications : utilise WhatsApp"); else toast('Notification envoyée ✅');
}

/* ---------- Installation et notifications : invitation à l'arrivée ---------- */
var deferredInstall = null;
function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function needInstall() { return !standalone() && (!!deferredInstall || isIOS()); }
function needPush() { return pushSupported() && Notification.permission !== 'denied' && !pushSub; }
function onbDismissed() { try { return Date.now() - Number(localStorage.getItem('onb') || 0) < 3 * 864e5; } catch (e) { return false; } }
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (['checkout', 'me'].indexOf(S.v) === -1) draw(true); });
window.addEventListener('appinstalled', function () { deferredInstall = null; toast('Application installée ✅'); draw(true); });
async function installApp() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  try { await deferredInstall.userChoice; } catch (e) {}
  deferredInstall = null; draw(true);
}
function onboard() {
  var ni = needInstall(), np = needPush();
  if ((!ni && !np) || onbDismissed()) return null;
  var b = h('div', 'onb'); b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Installer et activer les notifications');
  b.appendChild(h('b', null, 'Profite de Marché au mieux'));
  if (ni && deferredInstall) { var i = h('button', 'go', "📲 Installer l'application"); i.onclick = installApp; b.appendChild(i); }
  else if (ni) b.appendChild(h('span', 'pd', "Pour l'installer : touche Partager (le carré avec la flèche), puis « Sur l'écran d'accueil »."));
  if (np) { var n = h('button', 'go', '🔔 Être prévenu du suivi de mes commandes'); n.onclick = enablePush; b.appendChild(n); }
  var l = h('button', 'later', 'Plus tard'); l.onclick = function () { try { localStorage.setItem('onb', String(Date.now())); } catch (e) {} draw(true); }; b.appendChild(l);
  return b;
}

/* ---------- Annonces, notifications vendeur, modification des produits ---------- */
async function regClient() {
  if (!sb || !pushSub) return;
  try { if (localStorage.getItem('pc') === pushSub.endpoint) return; } catch (e) {}
  var r = await sb.from('push_clients').insert({ endpoint: pushSub.endpoint, subscription: pushSub });
  if (!r.error || (r.error && r.error.code === '23505')) { try { localStorage.setItem('pc', pushSub.endpoint); } catch (e) {} }
}
async function enableSellerPush() {
  if (!pushSupported()) return alert("Non disponible ici. Sur iPhone, installe d'abord l'application sur l'écran d'accueil.");
  var perm = await Notification.requestPermission();
  if (perm !== 'granted') return alert('Notifications refusées. Autorise-les dans les réglages du navigateur (paramètres du site).');
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) }));
    var j = sub.toJSON(), r = await sb.from('push_vendeurs').insert({ endpoint: j.endpoint, subscription: j });
    if (r.error && r.error.code !== '23505') return alert('Activation refusée : ' + r.error.message);
    try { localStorage.setItem('vend_push', '1'); } catch (e) {}
    toast('Ce téléphone sonnera pour chaque commande ✅'); draw(true);
  } catch (e) { alert('Activation impossible : ' + e.message); }
}
function sellerPushPanel() {
  var p = h('div', 'panel'), on = false;
  try { on = localStorage.getItem('vend_push') === '1' && 'Notification' in window && Notification.permission === 'granted'; } catch (e) {}
  p.appendChild(h('b', null, 'Nouvelles commandes sur ce téléphone'));
  if (on) p.appendChild(h('span', 'pd', '✅ Ce téléphone sonne à chaque nouvelle commande.'));
  else if (!pushSupported()) p.appendChild(h('span', 'pd', "Non disponible ici (sur iPhone, installe d'abord l'application sur l'écran d'accueil)."));
  else { var b = h('button', 'go', '🔔 Activer sur ce téléphone'); b.onclick = enableSellerPush; p.append(h('span', 'pd', "Sois prévenu dès qu'un client passe commande."), b); }
  return p;
}
async function uploadBlobs(blobs) {
  var urls = [];
  for (var i = 0; i < blobs.length; i++) {
    var path = Date.now() + '-' + i + '.jpg', u = await sb.storage.from('produits').upload(path, blobs[i], { contentType: 'image/jpeg' });
    if (u.error) { alert('Photo refusée : ' + u.error.message); return null; }
    urls.push(sb.storage.from('produits').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}
async function updateProduct(p, f) {
  var upd = { nom: f.nom, prix: f.prix, old_prix: f.old || null, categorie: f.cat, description: f.desc, epuise: f.out };
  if (f.blobs.length) { var urls = await uploadBlobs(f.blobs); if (!urls) return; upd.images = urls; upd.image_url = urls[0]; }
  var r = await sb.from('products').update(upd).eq('id', p.id).select();
  if (r.error || !r.data.length) return alert('Modification refusée : ' + (r.error ? r.error.message : 'compte vendeur requis.'));
  toast('Produit modifié ✅'); await load();
}
function editPanel(p) {
  var E = { nom: p.nom, prix: String(p.prix), old: p.old ? String(p.old) : '', cat: p.cat, desc: p.desc || '', out: !!p.out, blobs: [] };
  var w = h('div', 'panel'), cs = h('select'), ph = h('input'), ot = h('button', 'pill', E.out ? '🚫 Épuisé (touche pour remettre en stock)' : 'Marquer comme épuisé'), sv = h('button', 'go', 'Enregistrer les modifications');
  CATS.forEach(function (c) { var o = h('option', null, c[0]); if (c[0] === p.cat) o.selected = true; cs.appendChild(o); }); cs.onchange = function () { E.cat = cs.value; };
  ot.onclick = function () { E.out = !E.out; ot.textContent = E.out ? '🚫 Épuisé (touche pour remettre en stock)' : 'Marquer comme épuisé'; };
  ph.type = 'file'; ph.accept = 'image/*'; ph.multiple = true;
  ph.onchange = function () { E.blobs = []; Array.prototype.slice.call(ph.files, 0, 5).forEach(function (fl, i) { shrink(fl, function (bl) { E.blobs[i] = bl; }); }); };
  sv.onclick = function () { if (!E.nom.trim() || !E.prix) return alert('Nom et prix obligatoires.'); updateProduct(p, { nom: E.nom.trim(), prix: Number(E.prix), old: Number(E.old) || 0, cat: E.cat, desc: E.desc, out: E.out, blobs: E.blobs.filter(Boolean) }); };
  w.append(h('b', null, 'Modifier ce produit'), field('Nom', E.nom, function (v) { E.nom = v; }), field('Prix', E.prix, function (v) { E.prix = v; }, 'number'), field('Ancien prix (promo, optionnel)', E.old, function (v) { E.old = v; }, 'number'), cs, field('Description courte', E.desc, function (v) { E.desc = v; }), ot, h('span', 'pd', "Remplacer les photos (optionnel, jusqu'à 5)"), ph, sv);
  return w;
}

/* ---------- Démarrage ---------- */
if (location.hash === '#orders') S.v = 'orders';
if (location.hash === '#vendeur') { S.v = 'me'; S.tab = 'commandes'; }
draw();
if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  sb.auth.getSession().then(function (r) { user = r.data.session ? r.data.session.user : null; if (user && S.v === 'me' && S.tab === 'commandes') loadOrders(); else draw(true); });
  initPush();
  sb.auth.onAuthStateChange(function (e, s) { user = s ? s.user : null; if (S.v === 'me') draw(true); });
}
load();
setInterval(function () { if (!document.hidden) refreshOrders(false); }, 30000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshOrders(false); });
refreshOrders(false);
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
