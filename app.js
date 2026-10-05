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
function cnt() { var n = 0; for (var k in cart) n += cart[k]; return n; }
