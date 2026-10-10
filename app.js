var CFG = window.MARCHE_CONFIG || {}, sb = null, user = null;
var D = { devise: 'FCFA', whatsapp: '', produits: [] };
var S = { v: 'home', cat: null, q: '', tab: 'produits' }, C = { nom: '', tel: '', note: '', addr: '', pay: '' };
var cart = {}, loc = null, locErr = '', locBusy = false, orders = [], R = document.getElementById('root');
try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch (e) {}
var fav = []; try { fav = JSON.parse(localStorage.getItem('fav') || '[]'); } catch (e) {}
var profile = null, myShop = null, SHOPS = {};
var mesCmd = [];
var VAPID_PUBLIC = 'BLcAutFgCPNTB0wyNX99ZPTm67_qyraUZmT-0DjZ-n2LTCXPD1urEsg_BtTSxY97MW3bbxiuUq6D7S4IWJrHM14', pushSub = null;
var CATALOGUE = [
  ['🍲', 'Nourriture', '#F97316', [['🍽️', 'Plats préparés'], ['🍔', 'Fast-food'], ['🧁', 'Pâtisseries'], ['🥤', 'Boissons'], ['🥬', 'Fruits & légumes'], ['🛒', 'Épicerie']]],
  ['👕', 'Vêtements', '#6366F1', [['👔', 'Hommes'], ['👗', 'Femmes'], ['🧒', 'Enfants'], ['👟', 'Chaussures'], ['🩲', 'Sous-vêtements'], ['🏃', 'Vêtements de sport']]],
  ['👜', 'Accessoires', '#EC4899', [['👜', 'Sacs'], ['⌚', 'Montres'], ['💎', 'Bijoux'], ['🕶️', 'Lunettes'], ['🪢', 'Ceintures'], ['👛', 'Portefeuilles'], ['🧢', 'Casquettes']]],
  ['🏺', 'Objets', '#B45309', [['🖼️', 'Décoration'], ['🛋️', 'Maison'], ['🍳', 'Cuisine'], ['🪑', 'Mobilier'], ['🏆', 'Articles de collection'], ['🎁', 'Cadeaux']]],
  ['📱', 'Appareils', '#0EA5E9', [['📱', 'Smartphones'], ['💻', 'Ordinateurs'], ['📲', 'Tablettes'], ['📺', 'Télévisions'], ['🔌', 'Électroménager'], ['🎧', 'Audio'], ['🔋', 'Accessoires électroniques']]],
  ['💄', 'Beauté & soins', '#D946EF', []], ['🧴', 'Hygiène', '#14B8A6', []], ['👶', 'Bébé & enfants', '#FB7185', []],
  ['🏋️', 'Sport & fitness', '#22C55E', []], ['🎮', 'Jeux & divertissement', '#8B5CF6', []], ['📚', 'Livres & fournitures', '#F59E0B', []],
  ['🚗', 'Auto & moto', '#64748B', []], ['🏠', 'Maison & jardin', '#65A30D', []], ['🔧', 'Bricolage & outils', '#EF4444', []],
  ['💻', 'Informatique', '#0284C7', []], ['🎵', 'Musique & instruments', '#7C3AED', []], ['🐶', 'Animaux', '#D97706', []],
  ['💍', 'Luxe', '#CA8A04', []], ['🎁', 'Cadeaux', '#E11D48', []], ['🛒', 'Autres', '#475569', []]
];
// CATS : [nom, emoji (image de secours), image, id, couleur]   SUBS : { id, cid, nom, emoji, image, key }
var CATS = CATALOGUE.map(function (c) { return [c[1], c[0], '', null, c[2]]; }), SUBS = [], DB2 = false, PH = {};
CATALOGUE.forEach(function (c) { c[3].forEach(function (x) { SUBS.push({ id: null, cid: c[1], nom: x[1], emoji: x[0], image: '', key: c[1] + '/' + x[1] }); }); });
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
function nbShops() { var k = {}; D.produits.forEach(function (p) { if (cart[p.id] && !p.out) k[p.shopId || 'none'] = 1; }); return Object.keys(k).length; }
function fraisLiv() { return sousTotal() ? (Number(D.frais_livraison) || 0) * nbShops() : 0; }
function total() { return sousTotal() + fraisLiv(); }
function totalsBox() {
  var w = h('div', 'tots');
  var l1 = h('div'); l1.append(h('span', null, 'Sous-total'), h('span', null, fmt(sousTotal()))); w.appendChild(l1);
  if (fraisLiv()) { var l2 = h('div'); l2.append(h('span', null, 'Livraison'), h('span', null, fmt(fraisLiv()))); w.appendChild(l2); }
  var g = h('div', 'g'); g.append(h('span', null, 'Total'), h('span', null, fmt(total()))); w.appendChild(g); return w;
}
function go(v, c, sub) { S.v = v; S.cat = c || null; S.sub = sub || null; window.scrollTo(0, 0); draw(); }
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
function placeholder(emoji, color) {
  var k = emoji + color; if (PH[k] !== undefined) return PH[k];
  var cv = document.createElement('canvas'); cv.width = cv.height = 240; var x = cv.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 240, 240);
  var g = x.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.38)'); x.fillStyle = g; x.fillRect(0, 0, 240, 240);
  x.font = '116px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 120, 128);
  try { PH[k] = cv.toDataURL('image/jpeg', 0.8); } catch (e) { PH[k] = ''; } return PH[k];
}
function subsOf(c) { return SUBS.filter(function (x) { return x.cid === (c[3] || c[0]); }); }
function catByName(n) { return CATS.filter(function (c) { return c[0] === n; })[0]; }
function catName(p) { return catByName(p.cat) ? p.cat : 'Autres'; }
function tileImg(src) { var v = h('div', 'cimg'), i = h('img'); i.src = src; i.alt = ''; i.loading = 'lazy'; v.appendChild(i); return v; }
function catTile(c) { var b = h('button', 'ct img'); b.append(tileImg(c[2] || placeholder(c[1], c[4])), h('span', 'cn', c[0])); b.onclick = function () { openCat(c); }; return b; }
function subTile(x, c) { var b = h('button', 'ct img'); b.append(tileImg(x.image || placeholder(x.emoji, c[4])), h('span', 'cn', x.nom)); b.onclick = function () { go('list', c[0], x.key); }; return b; }
function openCat(c) { if (subsOf(c).length) go('cat', c[0]); else go('list', c[0]); }
function navbar(title, back) { var n = h('div', 'nav'), b = h('button', 'back', '←'); b.setAttribute('aria-label', 'Retour'); b.onclick = function () { if (typeof back === 'function') back(); else go(back || 'home'); }; n.append(b, h('h1', null, title)); return n; }

/* ---------- Écrans ---------- */
function home() {
  if (!sb) R.appendChild(h('div', 'demo', 'Mode démo : renseigne config.js pour activer les vraies données (voir LISEZMOI.md).'));
  var top = h('div', 'top'), row = h('div', 'brow'), v = h('button', 'vend', user ? 'Mon compte' : 'Se connecter'), s = h('input', 'search'), body = h('div');
  v.onclick = function () { go('me'); }; row.append(h('div', 'brand', 'Marché'), v);
  top.append(row, h('div', 'sub', 'Nourriture, vêtements, objets, accessoires, appareils'), s);
  s.type = 'search'; s.placeholder = 'Que cherchez-vous ?'; s.value = S.q; s.setAttribute('aria-label', 'Rechercher');
  function fill() {
    body.textContent = '';
    if (S.q) { var g = h('div', 'grid'), l = D.produits.filter(function (p) { return (p.nom + ' ' + (p.desc || '')).toLowerCase().indexOf(S.q.toLowerCase()) > -1; });
      l.forEach(function (p) { g.appendChild(pcard(p)); }); if (!l.length) g.appendChild(h('p', 'empty', 'Aucun produit trouvé.')); body.appendChild(g); return; }
    var cs = h('div', 'cats'); CATS.forEach(function (c) { cs.appendChild(catTile(c)); });
    var pt = catTile(['Promos', '🏷️', '', null, '#EF4444']); pt.onclick = function () { go('list', '*promos'); }; cs.appendChild(pt); body.appendChild(cs);
    if (!D.produits.length) { body.appendChild(h('p', 'empty', 'Aucun produit pour le moment. Reviens bientôt !')); return; }
    body.appendChild(sec('Populaires', D.produits.slice(0, 8), '*all'));
    var pm = D.produits.filter(function (p) { return p.old > p.prix; }); if (pm.length) body.appendChild(sec('Promos', pm, '*promos'));
    CATS.forEach(function (c) { var l = D.produits.filter(function (p) { return catName(p) === c[0]; }); if (l.length) body.appendChild(sec(c[0], l, c[0])); });
  }
  s.oninput = function () { S.q = s.value; fill(); }; fill(); R.append(top, body);
}
function catV() {
  var c = catByName(S.cat); if (!c) { go('home'); return; }
  R.appendChild(navbar(c[0], 'home'));
  var g = h('div', 'cats'); subsOf(c).forEach(function (x) { g.appendChild(subTile(x, c)); }); R.appendChild(g);
  var all = h('button', 'pill', 'Voir tous les produits : ' + c[0]); all.style.margin = '0 16px 16px'; all.onclick = function () { go('list', c[0]); }; R.appendChild(all);
}
function list() {
  var c = S.cat, sc = null;
  if (S.sub) SUBS.forEach(function (x) { if (x.key === S.sub || x.id === S.sub) sc = x; });
  var title = c === '*promos' ? 'Promos' : c === '*all' ? 'Populaires' : c + (sc ? ' › ' + sc.nom : ''), g = h('div', 'grid');
  var l = D.produits.filter(function (p) {
    if (c === '*promos') return p.old > p.prix;
    if (c === '*all') return true;
    if (catName(p) !== c) return false;
    return !S.sub || p.subId === S.sub || (sc && p.subId === sc.id);
  });
  R.appendChild(navbar(title, S.sub ? function () { go('cat', S.cat); } : 'home')); l.forEach(function (p) { g.appendChild(pcard(p)); });
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
function openProd(p) { S.prev = { v: S.v, cat: S.cat, sub: S.sub }; S.pid = p.id; go('prod'); }
function back() { var pv = S.prev || { v: 'home' }; S.v = pv.v; S.cat = pv.cat || null; S.sub = pv.sub || null; draw(); }
function addCart(p) { if (p.out) { toast('Produit épuisé'); return; } cart[p.id] = (cart[p.id] || 0) + 1; persist(); toast(p.nom + ' ajouté au panier'); }
function waveAvailable() { return !!(D.wave_link || D.wave_num); }
function waveLink(t) { var b = D.wave_link; return b + (b.indexOf('?') > -1 ? '&' : '?') + 'amount=' + Math.round(t); }

async function load() {
  if (!sb) { D.produits = DEMO; return draw(true); }
  var p = await sb.from('products').select('*').order('created_at', { ascending: false });
  var s = await sb.from('settings').select('*');
  var c = await sb.from('categories').select('*').order('ordre', { ascending: true });
  var shq = await sb.from('shops').select('id,nom,statut,telephone,commune,description,livre_lui_meme');
  if (!shq.error) { SHOPS = {}; shq.data.forEach(function (x) { SHOPS[x.id] = x; }); }
  var sc = await sb.from('subcategories').select('*').order('ordre', { ascending: true });
  if (!c.error && !sc.error) {
    var rows = c.data.filter(function (r) { return r.ordre != null; }).sort(function (x, y) { return x.ordre - y.ordre; });
    if (rows.length) {
      CATS = rows.map(function (r) { var d = CATALOGUE.filter(function (x) { return x[1] === r.nom; })[0]; return [r.nom, r.emoji || (d ? d[0] : '🛍️'), r.image_url || '', r.id, d ? d[2] : '#475569']; });
      SUBS = sc.data.slice().sort(function (x, y) { return (x.ordre || 0) - (y.ordre || 0); }).map(function (r) {
        var cc = CATS.filter(function (x) { return x[3] === r.category_id; })[0], d = null;
        if (cc) CATALOGUE.forEach(function (x) { if (x[1] === cc[0]) x[3].forEach(function (y) { if (y[1] === r.nom) d = y; }); });
        return { id: r.id, cid: r.category_id, nom: r.nom, emoji: d ? d[0] : '🛍️', image: r.image_url || '', key: r.id };
      }).filter(function (x) { return CATS.some(function (k) { return k[3] === x.cid; }); });
      DB2 = true;
    }
  }
  if (!p.error) D.produits = p.data.map(function (r) {
    var im = r.images && r.images.length ? r.images : (r.image_url ? [r.image_url] : []);
    return { shopId: r.shop_id || null, subId: r.subcategory_id || null, catId: r.category_id || null, out: !!r.epuise, id: r.id, nom: r.nom, prix: Number(r.prix), old: r.old_prix ? Number(r.old_prix) : 0, cat: r.categorie, desc: r.description, images: im };
  });
  if (!s.error) s.data.forEach(function (r) { D[r.key] = r.value; });
  draw(true);
}
function catPicker(St, curCat, curSub) {
  var cs = h('select'), ss = h('select');
  cs.setAttribute('aria-label', 'Catégorie'); ss.setAttribute('aria-label', 'Sous-catégorie');
  function syncIds() { var c = catByName(St.cat); St.catId = c ? c[3] : null; var x = SUBS.filter(function (k) { return k.key === ss.value; })[0]; St.subId = x ? x.id : null; }
  function fillSubs() {
    ss.textContent = ''; var c = catByName(St.cat), subs = c ? subsOf(c) : [];
    var o0 = h('option', null, subs.length ? 'Sous-catégorie (optionnel)' : 'Pas de sous-catégorie'); o0.value = ''; ss.appendChild(o0);
    subs.forEach(function (x) { var o = h('option', null, x.nom); o.value = x.key; if (x.key === curSub || x.id === curSub) o.selected = true; ss.appendChild(o); });
    syncIds();
  }
  CATS.forEach(function (c) { var o = h('option', null, c[0]); o.value = c[0]; if (c[0] === curCat) o.selected = true; cs.appendChild(o); });
  St.cat = cs.value || curCat; fillSubs();
  cs.onchange = function () { St.cat = cs.value; curSub = ''; fillSubs(); };
  ss.onchange = function () { curSub = ss.value; syncIds(); };
  return [cs, ss];
}
function imgRow(nom, src, has, onBlob, tg, onTg) {
  var r = h('div', 'crow'), th = h('div', 'cthumb'), im = h('img'), ch = h('label', 'pill', has ? "Modifier l'image" : 'Ajouter une image'), fi = h('input');
  im.src = src; im.alt = ''; th.appendChild(im);
  fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true; fi.onchange = function () { if (fi.files[0]) shrink(fi.files[0], onBlob); };
  ch.appendChild(fi);
  var nm = h('span', 'cname', nom); if (tg) { nm = h('button', 'cname tg', tg + ' ' + nom); nm.onclick = onTg; }
  r.append(th, nm, ch); return r;
}
async function setCatImage(c, blob) {
  if (!DB2 || !c[3]) return alert("Lance d'abord la mise à jour des catégories dans Supabase.");
  var url = await catUpload(blob); if (!url) return;
  var r = await sb.from('categories').update({ image_url: url }).eq('id', c[3]).select();
  if (r.error || !r.data.length) return alert('Modification refusée : ' + (r.error ? r.error.message : 'compte vendeur requis.'));
  toast('Image mise à jour ✅'); load();
}
async function setSubImage(x, blob) {
  if (!DB2 || !x.id) return alert("Lance d'abord la mise à jour des catégories dans Supabase.");
  var url = await catUpload(blob); if (!url) return;
  var r = await sb.from('subcategories').update({ image_url: url }).eq('id', x.id).select();
  if (r.error || !r.data.length) return alert('Modification refusée : ' + (r.error ? r.error.message : 'compte vendeur requis.'));
  toast('Image mise à jour ✅'); load();
}
async function addProduct(f) {
  var urls = [];
  for (var i = 0; i < f.blobs.length; i++) {
    var path = Date.now() + '-' + i + '.jpg', u = await sb.storage.from('produits').upload(path, f.blobs[i], { contentType: 'image/jpeg' });
    if (u.error) return alert('Photo refusée : ' + u.error.message);
    urls.push(sb.storage.from('produits').getPublicUrl(path).data.publicUrl);
  }
  var row = { nom: f.nom, prix: f.prix, old_prix: f.old || null, categorie: f.cat, description: f.desc, image_url: urls[0] || null, images: urls };
  row.shop_id = myShop ? myShop.id : null;
  if (DB2) { row.category_id = f.catId || null; row.subcategory_id = f.subId || null; }
  var r = await sb.from('products').insert(row).select();
  if (r.error || !r.data.length) return alert("Ajout refusé : " + (r.error ? r.error.message : "vérifie que tu es connecté avec le compte vendeur."));
  toast('Produit ajouté'); load();
}
async function catUpload(blob) {
  var path = 'cat-' + Date.now() + '.jpg', u = await sb.storage.from('produits').upload(path, blob, { contentType: 'image/jpeg' });
  if (u.error) { alert('Image refusée : ' + u.error.message); return null; }
  return sb.storage.from('produits').getPublicUrl(path).data.publicUrl;
}

/* ---------- Commande ---------- */

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
  info.append(hr, pr, h('p', 'pd', p.cat + (SHOPS[p.shopId] ? ' · Vendu par ' + SHOPS[p.shopId].nom : '')), h('p', null, p.desc || ''));
  if (canEdit(p)) { var d = h('button', 'pill', 'Supprimer ce produit'); d.onclick = async function () { if (!confirm('Supprimer « ' + p.nom + ' » ?')) return; var r = await sb.from('products').delete().eq('id', p.id).select(); if (r.error || !r.data.length) return alert('Suppression refusée.'); back(); load(); }; info.appendChild(d); }
  if (canEdit(p)) info.appendChild(editPanel(p));
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
  if (!user) { R.appendChild(loginGate('Connecte-toi ou crée un compte pour passer ta commande. Ton panier est conservé.', 'checkout')); return; }
  if (profile) { if (!C.nom) C.nom = profile.nom; if (!C.tel) C.tel = profile.telephone; }
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
function dash() {
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Espace vendeur')); R.appendChild(n);
  if (!sb) { var d = h('div', 'panel'); d.append(h('b', null, 'Connexion indisponible'), h('span', 'pd', 'Renseigne config.js (voir LISEZMOI.md) pour activer la connexion vendeur.')); R.appendChild(d); return; }
  if (!user) {
    var p = h('div', 'panel'), em = h('input'), pw = h('input'), er = h('div', 'err'), b = h('button', 'go', 'Se connecter');
    em.type = 'email'; em.placeholder = 'Email vendeur'; em.autocomplete = 'username'; pw.type = 'password'; pw.placeholder = 'Mot de passe'; pw.autocomplete = 'current-password';
    b.onclick = async function () { var r = await sb.auth.signInWithPassword({ email: em.value, password: pw.value }); if (r.error) er.textContent = 'Email ou mot de passe incorrect.'; };
    p.append(h('b', null, 'Connecte-toi pour gérer tes produits et tes commandes'), em, pw, er, b); R.appendChild(p); return;
  }
  if (!tabsFor().some(function (t) { return t[0] === S.tab; })) S.tab = 'produits';
  var seg = h('div', 'seg'); tabsFor().forEach(function (x) {
    var b = h('button', null, x[1]); b.setAttribute('aria-pressed', String(S.tab === x[0]));
    b.onclick = function () { S.tab = x[0]; if (x[0] === 'commandes') loadOrders(); else if (x[0] === 'boutiques') loadAdminShops(); else draw(); }; seg.appendChild(b);
  }); R.appendChild(seg);
  if (S.tab === 'produits') {
    var F = { nom: '', prix: '', old: '', cat: CATS[0] ? CATS[0][0] : '', desc: '', blobs: [] }, f = h('div', 'panel'), cs = h('select'), ph = h('input'), ad = h('button', 'go', 'Ajouter le produit');
    var pk = catPicker(F, F.cat, '');
    ph.type = 'file'; ph.accept = 'image/*'; ph.multiple = true;
    ph.onchange = function () { F.blobs = []; Array.prototype.slice.call(ph.files, 0, 5).forEach(function (fl, i) { shrink(fl, function (bl) { F.blobs[i] = bl; }); }); };
    ad.onclick = function () { if (!F.nom || !F.prix) return alert('Nom et prix obligatoires.'); addProduct({ nom: F.nom, prix: Number(F.prix), old: Number(F.old) || 0, cat: F.cat, catId: F.catId, subId: F.subId, desc: F.desc, blobs: F.blobs.filter(Boolean) }); };
    f.append(h('b', null, 'Nouveau produit'), field('Nom du produit', '', function (v) { F.nom = v; }), field('Prix', '', function (v) { F.prix = v; }, 'number'), field('Ancien prix (promo, optionnel)', '', function (v) { F.old = v; }, 'number'), pk[0], pk[1], field('Description courte', '', function (v) { F.desc = v; }), h('span', 'pd', "Photos (jusqu'à 5, la première est la photo principale)"), ph, ad);
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
  } else if (S.tab === 'boutiques') {
    adminShops();
  } else if (S.tab === 'boutique') {
    shopTab();
  } else if (S.tab === 'categories') {
    var ip = h('p', 'pd', "Les catégories sont prédéfinies. Touche une catégorie pour voir ses sous-catégories, puis « Modifier l'image » pour choisir ta photo."); ip.style.padding = '0 16px'; R.appendChild(ip);
    if (!DB2) { var w2 = h('p', 'err', "Pour modifier les images, lance d'abord la mise à jour des catégories dans Supabase."); w2.style.padding = '0 16px'; R.appendChild(w2); }
    var cp = h('div', 'panel');
    CATS.forEach(function (c) {
      var hasSubs = subsOf(c).length > 0;
      cp.appendChild(imgRow(c[0], c[2] || placeholder(c[1], c[4]), !!c[2], function (bl) { setCatImage(c, bl); }, hasSubs ? (S.openC === c[0] ? '▾' : '▸') : '', function () { S.openC = S.openC === c[0] ? '' : c[0]; draw(true); }));
      if (S.openC === c[0]) subsOf(c).forEach(function (x) { var r = imgRow(x.nom, x.image || placeholder(x.emoji, c[4]), !!x.image, function (bl) { setSubImage(x, bl); }); r.classList.add('srow'); cp.appendChild(r); });
    });
    R.appendChild(cp);
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
  try { ({ home: home, list: list, cats: cats, cart: cartV, checkout: checkout, done: done, me: me, prod: prod, favs: favsV, orders: ordersV, cat: catV })[S.v](); }
  catch (e) {
    R.textContent = '';
    var ep = h('div', 'panel'), eb = h('button', 'go', "Retour à l'accueil");
    eb.onclick = function () { S.v = 'home'; draw(); };
    ep.append(h('b', null, 'Oups, un problème est survenu'), h('span', 'pd', "Écran : " + S.v + ". Détail : " + String((e && e.message) || e)), eb);
    R.appendChild(ep);
  }
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
function ordersV() {
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Mes commandes')); R.appendChild(n);
  if (!user) { R.appendChild(loginGate('Connecte-toi pour voir et suivre tes commandes.')); return; }
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
    var j = sub.toJSON(), r = await sb.from('push_vendeurs').insert({ endpoint: j.endpoint, subscription: j, shop_id: myShop ? myShop.id : null });
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
  if (DB2) { upd.category_id = f.catId || null; upd.subcategory_id = f.subId || null; }
  if (f.blobs.length) { var urls = await uploadBlobs(f.blobs); if (!urls) return; upd.images = urls; upd.image_url = urls[0]; }
  var r = await sb.from('products').update(upd).eq('id', p.id).select();
  if (r.error || !r.data.length) return alert('Modification refusée : ' + (r.error ? r.error.message : 'compte vendeur requis.'));
  toast('Produit modifié ✅'); await load();
}
function editPanel(p) {
  var E = { nom: p.nom, prix: String(p.prix), old: p.old ? String(p.old) : '', cat: catName(p), desc: p.desc || '', out: !!p.out, blobs: [] };
  var w = h('div', 'panel'), cs = h('select'), ph = h('input'), ot = h('button', 'pill', E.out ? '🚫 Épuisé (touche pour remettre en stock)' : 'Marquer comme épuisé'), sv = h('button', 'go', 'Enregistrer les modifications');
  var pk = catPicker(E, E.cat, p.subId || '');
  ot.onclick = function () { E.out = !E.out; ot.textContent = E.out ? '🚫 Épuisé (touche pour remettre en stock)' : 'Marquer comme épuisé'; };
  ph.type = 'file'; ph.accept = 'image/*'; ph.multiple = true;
  ph.onchange = function () { E.blobs = []; Array.prototype.slice.call(ph.files, 0, 5).forEach(function (fl, i) { shrink(fl, function (bl) { E.blobs[i] = bl; }); }); };
  sv.onclick = function () { if (!E.nom.trim() || !E.prix) return alert('Nom et prix obligatoires.'); updateProduct(p, { nom: E.nom.trim(), prix: Number(E.prix), old: Number(E.old) || 0, cat: E.cat, catId: E.catId, subId: E.subId, desc: E.desc, out: E.out, blobs: E.blobs.filter(Boolean) }); };
  w.append(h('b', null, 'Modifier ce produit'), field('Nom', E.nom, function (v) { E.nom = v; }), field('Prix', E.prix, function (v) { E.prix = v; }, 'number'), field('Ancien prix (promo, optionnel)', E.old, function (v) { E.old = v; }, 'number'), pk[0], pk[1], field('Description courte', E.desc, function (v) { E.desc = v; }), ot, h('span', 'pd', "Remplacer les photos (optionnel, jusqu'à 5)"), ph, sv);
  return w;
}

/* ---------- Comptes, rôles, boutiques ---------- */
function isAdmin() { return !!profile && profile.role === 'admin'; }
function shopActive() { return !!myShop && myShop.statut === 'active'; }
function canEdit(p) { return !!user && (isAdmin() || (shopActive() && p.shopId === myShop.id)); }
function shopWa(id) { var x = SHOPS[id], d = x && x.telephone ? String(x.telephone).replace(/\D/g, '') : ''; return d || D.whatsapp || ''; }
function tabsFor() {
  var t = [['produits', 'Produits'], ['commandes', 'Commandes']];
  if (isAdmin()) t.push(['boutiques', 'Boutiques'], ['categories', 'Catégories'], ['annonces', 'Annonces'], ['reglages', 'Réglages']); else t.push(['boutique', 'Ma boutique']);
  return t;
}
async function loadProfile() {
  var p = await sb.from('profiles').select('*').eq('id', user.id).single(); profile = p.data || null;
  if (profile) { var q = await sb.from('shops').select('*').eq('owner_id', user.id).maybeSingle(); myShop = q.data || null; }
}
async function afterAuth(session) {
  var uid = session ? session.user.id : null;
  if (uid && user && user.id === uid && profile) { user = session.user; return; }
  user = session ? session.user : null; profile = null; myShop = null; mesCmd = [];
  if (user) await loadProfile();
  if (user && S.after) { S.v = S.after; S.cat = null; S.after = null; }
  else if (user && S.v === 'me' && S.tab === 'commandes' && (isAdmin() || shopActive())) loadOrders();
  draw(true); refreshOrders(false); load();
}
function loginGate(msg, after) {
  var p = h('div', 'panel'), b = h('button', 'go', 'Se connecter ou créer un compte');
  b.onclick = function () { S.after = after || null; go('me'); };
  p.append(h('b', null, msg), b); return p;
}
function authV() {
  var mode = S.authMode || 'login', p = h('div', 'panel'), A = { nom: '', tel: '', email: '', pw: '' }, er = h('div', 'err'), info = h('div', 'pd');
  p.appendChild(h('b', null, mode === 'signup' ? 'Créer un compte' : mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'));
  if (mode === 'signup') p.append(field('Nom et prénoms', '', function (v) { A.nom = v; }), field('Téléphone (WhatsApp)', '', function (v) { A.tel = v; }, 'tel'));
  var em = field('Email', '', function (v) { A.email = v; }, 'email'); em.autocomplete = 'username'; p.appendChild(em);
  if (mode !== 'reset') { var pw = field('Mot de passe (6 caractères minimum)', '', function (v) { A.pw = v; }, 'password'); pw.autocomplete = mode === 'signup' ? 'new-password' : 'current-password'; p.appendChild(pw); }
  var go1 = h('button', 'go', mode === 'signup' ? 'Créer mon compte' : mode === 'reset' ? 'Envoyer le lien' : 'Se connecter');
  go1.onclick = async function () {
    er.textContent = ''; info.textContent = '';
    if (mode === 'login') { var r = await sb.auth.signInWithPassword({ email: A.email.trim(), password: A.pw }); if (r.error) er.textContent = 'Email ou mot de passe incorrect.'; }
    else if (mode === 'signup') {
      if (!A.nom.trim() || !A.tel.trim()) { er.textContent = 'Indique ton nom et ton téléphone.'; return; }
      if (A.pw.length < 6) { er.textContent = 'Mot de passe : 6 caractères minimum.'; return; }
      var r2 = await sb.auth.signUp({ email: A.email.trim(), password: A.pw, options: { data: { nom: A.nom.trim(), telephone: A.tel.trim() } } });
      if (r2.error) er.textContent = r2.error.message; else if (!r2.data.session) info.textContent = 'Compte créé. Vérifie ton e-mail pour confirmer, puis connecte-toi.';
    } else {
      var r3 = await sb.auth.resetPasswordForEmail(A.email.trim(), { redirectTo: location.origin + location.pathname });
      if (r3.error) er.textContent = r3.error.message; else info.textContent = "Si cet e-mail existe, un lien vient d'être envoyé.";
    }
  };
  p.append(er, info, go1);
  function lk(t, m) { var b = h('button', 'later', t); b.onclick = function () { S.authMode = m; draw(); }; p.appendChild(b); }
  if (mode === 'login') { lk('Créer un compte', 'signup'); lk('Mot de passe oublié ?', 'reset'); } else lk("J'ai déjà un compte", 'login');
  R.appendChild(p);
}
function recoveryV() {
  var p = h('div', 'panel'), W = { a: '', b: '' }, er = h('div', 'err'), b = h('button', 'go', 'Enregistrer le nouveau mot de passe');
  b.onclick = async function () {
    if (W.a.length < 6) { er.textContent = '6 caractères minimum.'; return; } if (W.a !== W.b) { er.textContent = 'Les deux mots de passe sont différents.'; return; }
    var r = await sb.auth.updateUser({ password: W.a }); if (r.error) { er.textContent = r.error.message; return; }
    S.recovery = false; toast('Mot de passe modifié ✅'); draw();
  };
  p.append(h('b', null, 'Choisis un nouveau mot de passe'), field('Nouveau mot de passe', '', function (v) { W.a = v; }, 'password'), field('Confirme le mot de passe', '', function (v) { W.b = v; }, 'password'), er, b); R.appendChild(p);
}
function accountV() {
  var P = { nom: profile.nom, tel: profile.telephone }, p = h('div', 'panel'), sv = h('button', 'go', 'Enregistrer'), lo = h('button', 'go', 'Se déconnecter');
  var rn = { client: 'Client', vendeur: 'Vendeur', livreur: 'Livreur', admin: 'Administrateur' }[profile.role] || profile.role;
  sv.onclick = async function () { var r = await sb.from('profiles').update({ nom: P.nom.trim(), telephone: P.tel.trim() }).eq('id', user.id).select(); if (r.error || !r.data.length) return alert('Enregistrement refusé.'); profile = r.data[0]; toast('Profil enregistré'); };
  lo.onclick = function () { sb.auth.signOut(); };
  p.append(h('b', null, profile.nom || 'Mon profil'), h('span', 'pd', user.email + ' · ' + rn), field('Nom', P.nom, function (v) { P.nom = v; }), field('Téléphone', P.tel, function (v) { P.tel = v; }, 'tel'), sv, lo); R.appendChild(p);
  if (profile.role === 'livreur') { var lv = h('div', 'panel'); lv.append(h('b', null, 'Espace livreur'), h('span', 'pd', 'Bientôt : la liste des commandes à livrer apparaîtra ici.')); R.appendChild(lv); }
  var sp = h('div', 'panel');
  if (myShop) {
    sp.append(h('b', null, 'Ma boutique : ' + myShop.nom), h('span', 'pd', myShop.statut === 'en_attente' ? "⏳ En attente de validation. Tu seras prévenu dès qu'elle est validée : reviens ici pour vérifier." : '⛔ Boutique suspendue. Contacte l\'administrateur.'));
  } else if (profile.role === 'client') {
    var F = { nom: '', tel: profile.telephone || '', commune: '', desc: '', own: false }, ob = h('button', 'pill', 'Je livre moi-même : non'), cb = h('button', 'go', 'Envoyer ma demande');
    ob.onclick = function () { F.own = !F.own; ob.textContent = 'Je livre moi-même : ' + (F.own ? 'oui' : 'non'); };
    cb.onclick = async function () {
      if (!F.nom.trim()) return alert('Écris le nom de ta boutique.');
      var r = await sb.from('shops').insert({ owner_id: user.id, nom: F.nom.trim(), telephone: F.tel.trim(), commune: F.commune.trim(), description: F.desc.trim(), livre_lui_meme: F.own }).select();
      if (r.error) return alert('Demande refusée : ' + r.error.message); await loadProfile(); toast('Demande envoyée ✅'); draw(true);
    };
    sp.append(h('b', null, 'Devenir vendeur'), h('span', 'pd', 'Crée ta boutique. Elle sera visible après validation par l\'administrateur.'), field('Nom de la boutique', '', function (v) { F.nom = v; }), field('WhatsApp de la boutique', F.tel, function (v) { F.tel = v; }, 'tel'), field('Commune', '', function (v) { F.commune = v; }), field('Description courte', '', function (v) { F.desc = v; }), ob, cb);
  } else sp = null;
  if (sp) R.appendChild(sp);
}
async function loadAdminShops() {
  var r = await sb.from('shops').select('*, profiles(nom, telephone)').order('created_at', { ascending: false });
  S.adminShops = r.data || []; draw(true);
}
function adminShops() {
  var l = S.adminShops || [];
  if (!l.length) R.appendChild(h('p', 'empty', 'Aucune boutique pour le moment.'));
  l.forEach(function (x) {
    var c = h('div', 'ord'), st = { en_attente: '⏳ en attente', active: '✅ active', suspendue: '⛔ suspendue' }[x.statut];
    c.append(h('b', null, x.nom + ' · ' + st), h('div', null, x.profiles ? x.profiles.nom + ' · ' + x.profiles.telephone : ''), h('div', 'pd', (x.commune || '') + (x.livre_lui_meme ? ' · livre lui-même' : '')), h('div', 'pd', x.description || ''));
    var act = x.statut === 'active' ? ['Suspendre', 'suspendue'] : [x.statut === 'suspendue' ? 'Réactiver' : 'Valider la boutique', 'active'], b = h('button', 'pill', act[0]);
    b.onclick = async function () { var r = await sb.from('shops').update({ statut: act[1] }).eq('id', x.id).select(); if (r.error || !r.data.length) return alert('Modification refusée.'); toast('Boutique mise à jour'); loadAdminShops(); load(); };
    c.appendChild(b); R.appendChild(c);
  });
}
function shopTab() {
  var X = { nom: myShop.nom, tel: myShop.telephone || '', commune: myShop.commune || '', desc: myShop.description || '', own: !!myShop.livre_lui_meme }, p = h('div', 'panel'), ob = h('button', 'pill', 'Je livre moi-même : ' + (X.own ? 'oui' : 'non')), sv = h('button', 'go', 'Enregistrer la boutique'), lo = h('button', 'go', 'Se déconnecter');
  ob.onclick = function () { X.own = !X.own; ob.textContent = 'Je livre moi-même : ' + (X.own ? 'oui' : 'non'); };
  sv.onclick = async function () { var r = await sb.from('shops').update({ nom: X.nom.trim(), telephone: X.tel.trim(), commune: X.commune.trim(), description: X.desc.trim(), livre_lui_meme: X.own }).eq('id', myShop.id).select(); if (r.error || !r.data.length) return alert('Enregistrement refusé.'); myShop = r.data[0]; toast('Boutique enregistrée'); load(); };
  lo.onclick = function () { sb.auth.signOut(); };
  p.append(h('b', null, 'Ma boutique'), field('Nom', X.nom, function (v) { X.nom = v; }), field('WhatsApp de la boutique', X.tel, function (v) { X.tel = v; }, 'tel'), field('Commune', X.commune, function (v) { X.commune = v; }), field('Description', X.desc, function (v) { X.desc = v; }), ob, sv, lo);
  R.appendChild(p); R.appendChild(sellerPushPanel());
}
function me() {
  if (!sb) { var n0 = h('div', 'nav'); n0.appendChild(h('h1', null, 'Mon compte')); R.appendChild(n0); var d = h('div', 'panel'); d.append(h('b', null, 'Connexion indisponible'), h('span', 'pd', 'Renseigne config.js (voir LISEZMOI.md) pour activer les comptes.')); R.appendChild(d); return; }
  if (user && profile && !S.recovery && (isAdmin() || shopActive())) return dash();
  var n = h('div', 'nav'); n.appendChild(h('h1', null, 'Mon compte')); R.appendChild(n);
  if (S.recovery) return recoveryV();
  if (!user) return authV();
  if (!profile) { R.appendChild(h('p', 'empty', 'Chargement…')); return; }
  accountV();
}

/* ---------- Commande (une commande par boutique) ---------- */
async function submitOrder() {
  if (!user) { S.after = 'checkout'; return go('me'); }
  if (!C.nom.trim() || !C.tel.trim()) return alert('Indique ton nom et ton numéro de téléphone.');
  if (!loc && !C.addr.trim()) return alert('Partage ta position pour la livraison.');
  var pay = (C.pay === 'wave' && waveAvailable()) ? 'wave' : 'especes', groups = {};
  D.produits.forEach(function (p) { if (cart[p.id] && !p.out) (groups[p.shopId || 'none'] = groups[p.shopId || 'none'] || []).push(p); });
  var keys = Object.keys(groups); if (!keys.length) return alert('Ton panier est vide.');
  var fee = Number(D.frais_livraison) || 0, made = [], grand = 0;
  for (var i = 0; i < keys.length; i++) {
    var items = groups[keys[i]].map(function (p) { return { id: p.id, nom: p.nom, qte: cart[p.id], prix: p.prix }; }), sous = 0;
    items.forEach(function (x) { sous += x.qte * x.prix; });
    var id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
    var row = { id: id, shop_id: keys[i] === 'none' ? null : keys[i], customer_id: user.id, client_nom: C.nom.trim(), client_tel: C.tel.trim(), lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, adresse: C.addr.trim() || null, note: C.note.trim() || null, items: items, total: sous + fee, frais: fee, paiement: pay };
    var r = await sb.from('orders').insert(row);
    if (r.error) { alert('Commande non envoyée : ' + r.error.message + (made.length ? '\n(' + made.length + ' commande(s) déjà envoyée(s))' : '')); break; }
    sb.functions.invoke('notify', { body: { type: 'nouvelle', order_id: id } }).catch(function () {});
    var num = id.slice(0, 6).toUpperCase();
    made.push({ id: id, num: num, total: row.total, shopId: row.shop_id, wa: waText(items, { num: num, total: row.total, nom: row.client_nom, tel: row.client_tel, lat: row.lat, lng: row.lng, addr: row.adresse, note: row.note }) + '\nPaiement : ' + (pay === 'wave' ? 'Wave' : 'espèces à la livraison') });
    grand += row.total;
    groups[keys[i]].forEach(function (p) { delete cart[p.id]; }); persist();
  }
  if (!made.length) return;
  S.done = { orders: made, pay: pay, total: grand }; refreshOrders(false); go('done');
}
function done() {
  R.appendChild(h('div', 'ok-big', '✅'));
  var n = h('div', 'nav'); n.appendChild(h('h1', null, S.done.orders.length > 1 ? 'Commandes envoyées' : 'Commande envoyée')); R.appendChild(n);
  var p = h('div', 'panel');
  S.done.orders.forEach(function (o) { var sh = SHOPS[o.shopId]; p.appendChild(h('b', null, 'N° ' + o.num + (sh ? ' · ' + sh.nom : '') + ' · ' + fmt(o.total))); });
  p.appendChild(h('span', 'pd', 'Les vendeurs ont reçu ta commande et ta position. Ils te contacteront.'));
  if (S.done.pay === 'wave') {
    if (D.wave_link) { var w = h('button', 'go wv', 'Payer ' + fmt(S.done.total) + ' avec Wave'); w.onclick = function () { window.open(waveLink(S.done.total), '_blank'); }; p.appendChild(h('span', 'pd', "Touche le bouton : Wave s'ouvre avec le montant déjà rempli, il ne reste qu'à confirmer.")); p.appendChild(w); }
    else { var cp = h('button', 'go wv', 'Copier le numéro Wave ' + D.wave_num); cp.onclick = function () { try { navigator.clipboard.writeText(D.wave_num); } catch (e) {} toast('Numéro copié'); }; p.appendChild(h('span', 'pd', 'Envoie ' + fmt(S.done.total) + ' par Wave au ' + D.wave_num + '.')); p.appendChild(cp); }
  } else p.appendChild(h('span', 'pd', 'Tu paieras en espèces à la livraison.'));
  if (pushSupported() && !pushSub) { var pn = h('button', 'go', '🔔 Être prévenu du suivi de mes commandes'); pn.onclick = enablePush; p.appendChild(pn); }
  S.done.orders.forEach(function (o) { var wn = shopWa(o.shopId); if (wn) { var sh = SHOPS[o.shopId], wa = h('button', 'go', 'Prévenir ' + (sh ? sh.nom : 'le vendeur') + ' sur WhatsApp'); wa.onclick = function () { window.open('https://wa.me/' + wn + '?text=' + encodeURIComponent(o.wa), '_blank'); }; p.appendChild(wa); } });
  var k = h('button', 'go', "Retour à l'accueil"); k.onclick = function () { go('home'); }; p.appendChild(k); R.appendChild(p);
}
async function refreshOrders(manual) {
  if (!sb || !user) return;
  var r = await sb.from('orders').select('id,statut,paiement,paye,total,created_at,shop_id').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(30);
  if (r.error) { if (manual) toast('Actualisation impossible'); return; }
  var old = {}, changed = false; mesCmd.forEach(function (o) { old[o.id] = o; });
  mesCmd = r.data.map(function (row) {
    var o = old[row.id], unseen = o ? !!o.unseen : false;
    if (o && o.statut !== row.statut) {
      unseen = true; changed = true; var m = 'Commande N° ' + row.id.slice(0, 6).toUpperCase() + ' : ' + statutMsg(row.statut); toast(m);
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) { try { new Notification('Marché', { body: m }); } catch (e) {} }
    }
    return { id: row.id, num: row.id.slice(0, 6).toUpperCase(), total: Number(row.total), date: row.created_at, statut: row.statut, paiement: row.paiement, paye: row.paye, shopId: row.shop_id, pushed: o ? o.pushed : false, unseen: unseen };
  });
  if (pushSub) linkOrders();
  if (manual) toast('À jour');
  if ((changed || manual) && ['checkout', 'me'].indexOf(S.v) === -1) draw(true);
}

/* ---------- Démarrage ---------- */
if (location.hash === '#orders') S.v = 'orders';
if (location.hash === '#vendeur') { S.v = 'me'; S.tab = 'commandes'; }
draw();
if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  sb.auth.getSession().then(function (r) { afterAuth(r.data.session); });
  initPush();
  sb.auth.onAuthStateChange(function (e, s) { if (e === 'PASSWORD_RECOVERY') { S.recovery = true; S.v = 'me'; } setTimeout(function () { afterAuth(s); }, 0); });
}
load();
setInterval(function () { if (!document.hidden) refreshOrders(false); }, 30000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshOrders(false); });
refreshOrders(false);
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
