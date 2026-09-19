/* ============================================================
   AstroCasino — astro2.js
   Système d'identité unique + solde partagé (Firebase) + bandeau de marque.
   À inclure sur TOUTES les pages :  <script src="astro2.js"></script>
   ============================================================ */
(function () {
  'use strict';

  // ----------------------------------------------------------
  // CONFIG — modifie ces valeurs
  // ----------------------------------------------------------
  const CONFIG = {
    nom:        'AstroCasino',
    sousTitre:  'ASTRO RP',
    devise:     'Coins',
    soldeDepart: 82200,          // solde offert à un nouveau joueur
    paypal:     '',              // ex: 'https://paypal.me/tonpseudo' — vide = bouton désactivé
    cle:        'astro_account', // clé localStorage (cache local)

    // Firebase : colle ici la config de ton app web
    // (console Firebase > Paramètres du projet > Tes applications > </> Web).
    // Tant que apiKey est vide, le site marche en mode local (localStorage seul).
       firebase: {
      apiKey: "AIzaSyA6OyTtCp_D8mv0AiA2owoyf0xqAvVytjE",
      authDomain: "astrocasino-26c30.firebaseapp.com",
      projectId: "astrocasino-26c30",
      storageBucket: "astrocasino-26c30.firebasestorage.app",
      messagingSenderId: "658583796337",
      appId: "1:658583796337:web:c7186c05d46daf9f8239d0"
    }
  };


  // ----------------------------------------------------------
  // 1. IDENTITÉ UNIQUE
  // ----------------------------------------------------------
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    (crypto.getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }

  // Code boutique à 6 chiffres, dérivé de l'ID (toujours le même pour un joueur donné)
  function codeDepuisId(id) {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return String(h % 1000000).padStart(6, '0');
  }

  function creerCompte() {
    const id = uuid();
    return {
      id: id,
      code: codeDepuisId(id),
      solde: CONFIG.soldeDepart,
      cree: new Date().toISOString(),
      vu: new Date().toISOString()
    };
  }

  function charger() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(CONFIG.cle) || 'null'); } catch (e) {}
    if (!c || !c.id) c = creerCompte();
    if (typeof c.solde !== 'number' || !isFinite(c.solde)) c.solde = CONFIG.soldeDepart;
    if (!c.code) c.code = codeDepuisId(c.id);
    c.vu = new Date().toISOString();
    return c;
  }

  let compte = charger();

  function sauver() {
    try { localStorage.setItem(CONFIG.cle, JSON.stringify(compte)); } catch (e) {}
    emit();
  }

  const abonnes = [];
  function emit() { abonnes.forEach(fn => { try { fn(compte.solde, compte); } catch (e) {} }); majBandeau(); }

  function fmt(n) { return Math.round(n).toLocaleString('fr-FR'); }

  // ----------------------------------------------------------
  // 1b. SYNCHRO FIREBASE (Firestore uniquement, SANS connexion)
  //   - aucune authentification : l'ID aléatoire du joueur sert de clé
  //   - son compte est stocké dans Firestore : players/{id}
  //   - les changements de solde sont envoyés en "incrément" (+/-),
  //     donc un crédit fait par l'admin dans la console n'est jamais écrasé
  //   - le solde s'actualise en direct si l'admin le modifie
  // ----------------------------------------------------------
  const FB_VERSION = '10.12.2';
  let fbRef = null, fbUnsub = null;
  let deltaEnAttente = 0, timerEnvoi = null;

  function chargerScript(src) {
    return new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = ko;
      document.head.appendChild(s);
    });
  }

  function firebaseConfigure() {
    const f = CONFIG.firebase;
    return !!(f && f.apiKey && f.projectId);
  }

  async function demarrerFirebase() {
    if (!firebaseConfigure()) {
      console.info('[Astro] Firebase non configuré : mode local uniquement.');
      return;
    }
    try {
      if (!window.firebase) {
        const base = 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/';
        await chargerScript(base + 'firebase-app-compat.js');
        await chargerScript(base + 'firebase-firestore-compat.js');
      }
      if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);

      const db  = firebase.firestore();
      const ref = db.collection('players').doc(compte.id);
      const snap = await ref.get();

      if (!snap.exists) {
        // Première fois : on crée le compte (reprend le solde local existant)
        await ref.set({
          id: compte.id, code: compte.code, solde: compte.solde, cree: compte.cree,
          vu: firebase.firestore.FieldValue.serverTimestamp()
        });
        deltaEnAttente = 0;
      }

      fbRef = ref;
      if (fbUnsub) fbUnsub();
      fbUnsub = ref.onSnapshot(s => {
        if (!s.exists) return;
        const d = s.data();
        if (d.id)   compte.id   = d.id;
        if (d.code) compte.code = d.code;
        if (typeof d.solde === 'number') compte.solde = Math.max(0, Math.round(d.solde + deltaEnAttente));
        try { localStorage.setItem(CONFIG.cle, JSON.stringify(compte)); } catch (e) {}
        emit();
      }, err => console.warn('[Astro] Firestore :', err.code || err));

      if (deltaEnAttente) planifierEnvoi();
    } catch (e) {
      console.warn('[Astro] Firebase indisponible, mode local :', e);
    }
  }

  function planifierEnvoi() {
    if (timerEnvoi) return;
    timerEnvoi = setTimeout(envoyer, 800); // regroupe les mises rapprochées
  }

  function envoyer() {
    timerEnvoi = null;
    if (!fbRef || !deltaEnAttente) return;
    const d = deltaEnAttente;
    deltaEnAttente = 0;
    fbRef.update({
      solde: firebase.firestore.FieldValue.increment(d),
      vu: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
      console.warn('[Astro] Envoi du solde refusé :', err.code || err);
      if (err.code !== 'permission-denied') deltaEnAttente += d; // réessaiera au prochain changement
    });
  }

  window.addEventListener('pagehide', envoyer);
  document.addEventListener('visibilitychange', () => { if (document.hidden) envoyer(); });

  // ----------------------------------------------------------
  // 2. API PUBLIQUE  — window.Astro
  // ----------------------------------------------------------
  const Astro = {
    get id()    { return compte.id; },
    get code()  { return compte.code; },
    get solde() { return compte.solde; },
    config: CONFIG,

    getSolde() { return compte.solde; },

    setSolde(v) {
      const nouveau = Math.max(0, Math.round(v));
      deltaEnAttente += nouveau - compte.solde;
      compte.solde = nouveau;
      sauver();
      if (firebaseConfigure()) planifierEnvoi();
      return compte.solde;
    },

    /** Ajoute (ou retire si négatif) des Coins. */
    ajouter(n) { return Astro.setSolde(compte.solde + n); },

    /** Vrai si le joueur a assez pour miser n. */
    peutMiser(n) { return n > 0 && compte.solde >= n; },

    /** Débite la mise. Renvoie false si solde insuffisant. */
    miser(n) { if (!Astro.peutMiser(n)) return false; Astro.setSolde(compte.solde - n); return true; },

    /** Crédite un gain. */
    gagner(n) { return Astro.setSolde(compte.solde + n); },

    /** Appelée à chaque changement de solde : Astro.onChange(s => ...) */
    onChange(fn) { abonnes.push(fn); fn(compte.solde, compte); },

    /** Remet le compte à zéro (nouvel ID). */
    reset() {
      compte = creerCompte(); deltaEnAttente = 0; sauver();
      if (fbUnsub) { fbUnsub(); fbUnsub = null; }
      fbRef = null;
      if (firebaseConfigure()) demarrerFirebase();
      return compte;
    },

    /** Vrai quand le compte est synchronisé avec Firebase. */
    get synchro() { return !!fbRef; },

    fmt: fmt
  };
  window.Astro = Astro;

  // Synchronisation entre onglets
  window.addEventListener('storage', e => {
    if (e.key === CONFIG.cle && e.newValue) {
      try { compte = JSON.parse(e.newValue); emit(); } catch (err) {}
    }
  });

  // ----------------------------------------------------------
  // 3. BANDEAU
  // ----------------------------------------------------------
  const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap');
  .astro-bar{
    position:relative; z-index:50;
    display:flex; align-items:center; justify-content:space-between; gap:18px;
    flex-wrap:wrap;
    max-width:1240px; margin:0 auto; padding:22px 22px 18px;
    font-family:'Sora',-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
    color:#f7f0ff;
  }
  .astro-bar__brand{ display:flex !important; flex-direction:column !important; gap:6px !important; align-items:flex-start; }
  .astro-bar__brand h2{
    font-family:'Poppins','Space Grotesk','Sora',sans-serif !important;
    font-size:64px !important; font-weight:800 !important;
    letter-spacing:-.6px !important; line-height:1.05 !important;
    text-transform:none !important; margin:0 !important; padding:0 !important;
    background:none; -webkit-text-fill-color:currentColor;
  }
  .astro-bar__brand h2 .a{
    background:linear-gradient(90deg,#a855f7,#c084fc 55%,#e879f9) !important;
    -webkit-background-clip:text !important; background-clip:text !important;
    color:transparent !important; -webkit-text-fill-color:transparent !important;
  }
  .astro-bar__brand h2 .b{ color:#fff !important; -webkit-text-fill-color:#fff !important; }
  .astro-bar__brand span{
    font-family:'Poppins','Sora',sans-serif !important;
    font-size:12px !important; letter-spacing:2px !important; font-weight:700 !important;
    color:#7b6a99 !important; text-transform:uppercase !important; line-height:1 !important;
  }
  .astro-bar__brand span b{ color:#a855f7 !important; font-weight:700 !important; }

  .astro-bar__cards{ display:flex; align-items:stretch; gap:14px; flex-wrap:wrap; }
  .astro-card{
    background:linear-gradient(180deg,#160d26,#120a1f);
    border:1px solid #2e1f4a; border-radius:14px;
    padding:12px 18px; min-width:150px;
    display:flex; flex-direction:column; justify-content:center; gap:6px;
  }
  .astro-card__label{
    font-size:10px; letter-spacing:1.6px; font-weight:700; text-transform:uppercase; color:#8b7aa8;
  }
  .astro-solde{ display:flex; align-items:center; gap:9px; }
  .astro-coin{
    width:22px; height:22px; border-radius:50%; flex:none;
    background:radial-gradient(circle at 34% 30%,#ffe9a8,#ffd76a 55%,#b9820f);
    box-shadow:0 0 10px -2px rgba(255,215,106,.8);
    display:flex; align-items:center; justify-content:center;
    font-size:9px; font-weight:800; color:#3a2600; font-family:'Space Grotesk',sans-serif;
  }
  .astro-solde b{ font-size:21px; font-weight:800; font-family:'Space Grotesk','Sora',sans-serif; }

  .astro-code{ display:flex; align-items:center; gap:10px; }
  .astro-code code{
    font-family:'Space Grotesk','Sora',monospace;
    font-size:19px; font-weight:800; letter-spacing:3px; color:#ffd76a;
  }
  .astro-copy{
    background:none; border:1px solid #3a2a5c; border-radius:7px;
    width:26px; height:26px; cursor:pointer; color:#b7a3d6;
    display:flex; align-items:center; justify-content:center; padding:0;
    transition:.15s;
  }
  .astro-copy:hover{ color:#fff; border-color:#a855f7; }
  .astro-copy.ok{ color:#2be08a; border-color:#2be08a; }
  .astro-hint{ font-size:10.5px; color:#6f5f8c; }

  .astro-pay{
    display:inline-flex; align-items:center; justify-content:center;
    border:1px solid #a855f7; border-radius:10px;
    padding:10px 18px; font-size:13px; font-weight:700;
    color:#d8b4fe; background:none; text-decoration:none; cursor:pointer;
    transition:.18s;
  }
  .astro-pay:hover{ background:rgba(168,85,247,.16); color:#fff; }
  .astro-pay[aria-disabled="true"]{ opacity:.45; cursor:not-allowed; }

  .astro-id{
    max-width:1240px; margin:0 auto; padding:0 22px 10px;
    font-size:10px; color:#4e4270; letter-spacing:.3px;
    font-family:'Sora',sans-serif;
  }
  @media(max-width:760px){
    .astro-bar{ justify-content:center; text-align:center; }
    .astro-bar__brand h2{ font-size:42px !important; }
    .astro-bar__brand span{ font-size:12px !important; letter-spacing:3px !important; }
    .astro-bar__brand{ align-items:center; }
    .astro-card{ min-width:130px; }
  }`;

  function injecterCSS() {
    if (document.getElementById('astro-bar-css')) return;
    const s = document.createElement('style');
    s.id = 'astro-bar-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function html() {
    const payOk = !!CONFIG.paypal;
    return `
    <div class="astro-bar">
      <div class="astro-bar__brand">
        <h2><span class="a">Astro</span><span class="b">Casino</span></h2>
        <span>${CONFIG.sousTitre.replace(/(\S+)$/, '<b>$1</b>')}</span>
      </div>
      <div class="astro-bar__cards">
        <div class="astro-card">
          <div class="astro-card__label">Solde</div>
          <div class="astro-solde"><div class="astro-coin">AC</div><b id="astro-solde">0</b></div>
        </div>
        <div class="astro-card">
          <div class="astro-card__label">Mon code boutique</div>
          <div class="astro-code">
            <code id="astro-code">------</code>
            <button class="astro-copy" id="astro-copy" title="Copier le code" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
          <div class="astro-hint">Donne ce code à l'admin pour recevoir des ${CONFIG.devise}</div>
        </div>
        <div class="astro-card">
          <div class="astro-card__label">Paiement</div>
          ${payOk
            ? `<a class="astro-pay" href="${CONFIG.paypal}" target="_blank" rel="noopener">Payer via PayPal</a>`
            : `<span class="astro-pay" aria-disabled="true" title="Ajoute ton lien dans CONFIG.paypal">Payer via PayPal</span>`}
        </div>
      </div>
    </div>
    <div class="astro-id">ID joueur : <span id="astro-id"></span></div>`;
  }

  function majBandeau() {
    const s = document.getElementById('astro-solde');
    if (s) s.textContent = fmt(compte.solde);
    const c = document.getElementById('astro-code');
    if (c) c.textContent = compte.code;
    const i = document.getElementById('astro-id');
    if (i) i.textContent = compte.id;
  }

  function monter() {
    let hote = document.getElementById('astro-header');
    const dejaEnDur = !!(hote && hote.querySelector('.astro-bar'));

    if (!dejaEnDur) {
      // Pas de bandeau en dur dans la page (ancienne page non mise à jour) : on l'injecte nous-mêmes.
      injecterCSS();
      if (!hote) {
        hote = document.createElement('div');
        hote.id = 'astro-header';
        document.body.insertBefore(hote, document.body.firstChild);
      }
      hote.innerHTML = html();
    }

    // Bouton PayPal : active le lien si CONFIG.paypal est renseigné
    const payEl = document.getElementById('astro-pay-slot');
    if (payEl && CONFIG.paypal) {
      const a = document.createElement('a');
      a.className = 'astro-pay';
      a.href = CONFIG.paypal; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Payer via PayPal';
      payEl.replaceWith(a);
    }

    const btn = document.getElementById('astro-copy');
    if (btn) btn.addEventListener('click', () => {
      const t = compte.code;
      const done = () => { btn.classList.add('ok'); setTimeout(() => btn.classList.remove('ok'), 1200); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done).catch(done);
      else {
        const ta = document.createElement('textarea');
        ta.value = t; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove(); done();
      }
    });
    majBandeau();
  }

  sauver(); // enregistre le compte dès la 1re visite
  demarrerFirebase(); // synchro Firestore (sans effet si Firebase n'est pas configuré)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter);
  else monter();
})();
