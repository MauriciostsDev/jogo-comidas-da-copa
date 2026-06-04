/* ============================================================
   COMIDAS DA COPA — game flow logic (mock multiplayer)
   ============================================================ */
(function(){
  "use strict";
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const rnd = a => a[Math.floor(Math.random()*a.length)];

  const SCREENS = ["login","rooms","lobby","draw","write","pick","cook","gallery","social"];
  const STEP_OF = {login:0,rooms:0,lobby:0,draw:1,write:2,pick:2,cook:3,gallery:4,social:4};

  const state = {
    me:{name:"VOCÊ",emoji:"🧑‍🍳",ready:false},
    mate:{name:"PARCEIRO",emoji:"👩‍🍳",ready:false,joined:false},
    team:null, myDish:"", mateDish:"", chosen:null, photo:null,
    room:{code:"", isHost:true}
  };

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  function setTheme(t){
    root.setAttribute("data-theme",t);
    localStorage.setItem("cc-theme",t);
    $("#themeLabel").textContent = t==="light"?"CLARO":"ESCURO";
    $("#themeIcon").textContent = t==="light"?"☀️":"🌙";
  }
  setTheme(localStorage.getItem("cc-theme")||"dark");
  $("#themeToggle").addEventListener("click",()=>{
    setTheme(root.getAttribute("data-theme")==="light"?"dark":"light");
  });

  /* ---------- Screen routing ---------- */
  function go(id){
    SCREENS.forEach(s=>$("#sc-"+s).classList.toggle("active",s===id));
    $$(".nav-btn").forEach(b=>b.classList.toggle("on",b.dataset.go===id));
    updateSteps(STEP_OF[id]);
    window.scrollTo({top:0,behavior:"instant"});
    onEnter[id]&&onEnter[id]();
  }
  $$(".nav-btn").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
  $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.goto)));

  function updateSteps(idx){
    $$(".step").forEach((s,i)=>{
      s.classList.toggle("done",i<idx);
      s.classList.toggle("cur",i===idx);
    });
  }

  /* ---------- 1. LOGIN ---------- */
  let mode="login";
  $("#authSwitch").addEventListener("click",e=>{
    e.preventDefault();
    mode = mode==="login"?"signup":"login";
    $("#authTitle").textContent = mode==="login"?"INSERT COIN":"NEW PLAYER";
    $("#authBtn").textContent = mode==="login"?"ENTRAR ▸":"CRIAR CONTA ▸";
    $("#nameField").classList.toggle("hidden",mode==="login");
    $("#authSwitch").textContent = mode==="login"?"Não tem conta? CADASTRE-SE":"Já tem conta? ENTRAR";
    $("#authSub").textContent = mode==="login"?"Faça login pra entrar na sala":"Crie seu jogador pra começar";
  });
  $("#authForm").addEventListener("submit",e=>{
    e.preventDefault();
    const nm = $("#nameInput").value.trim();
    if(nm) state.me.name = nm.toUpperCase().slice(0,14);
    $("#meName").textContent = state.me.name;
    go("rooms");
  });

  /* ---------- 1b. SALAS (criar / entrar com código) ---------- */
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I
  function genCode(){
    let s=""; for(let i=0;i<4;i++) s+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];
    return "COPA-"+s;
  }
  // alternar abas criar/entrar
  $$("#roomTabs .chip").forEach(c=>c.addEventListener("click",()=>{
    $$("#roomTabs .chip").forEach(x=>x.classList.toggle("on",x===c));
    const create = c.dataset.rtab==="create";
    $("#roomCreate").classList.toggle("hidden",!create);
    $("#roomJoin").classList.toggle("hidden",create);
  }));
  // gerar código
  $("#genRoom").addEventListener("click",()=>{
    const code = genCode();
    state.room.code = code; state.room.isHost = true;
    $("#roomCode").textContent = code;
    $("#roomCodeHint").textContent = "Mande este código pra sua dupla 👇";
    $("#copyRoom").classList.remove("hidden");
    $("#shareRoom").classList.remove("hidden");
    $("#openRoom").classList.remove("hidden");
    $("#genRoom").textContent = "GERAR OUTRO 🎲";
    confetti(16);
  });
  // copiar código
  $("#copyRoom").addEventListener("click",async()=>{
    try{ await navigator.clipboard.writeText(state.room.code); toast("📋 Código copiado!"); }
    catch(_){ toast("Copie manualmente: "+state.room.code); }
  });
  // enviar (share nativo) com fallback
  $("#shareRoom").addEventListener("click",async()=>{
    const msg = "Bora jogar Comidas da Copa! 🍴⚽ Entra na minha sala com o código "+state.room.code;
    if(navigator.share){ try{ await navigator.share({title:"Comidas da Copa",text:msg}); }catch(_){} }
    else{ try{ await navigator.clipboard.writeText(msg); toast("📤 Convite copiado!"); }catch(_){ toast(state.room.code); } }
  });
  // abrir sala (host)
  $("#openRoom").addEventListener("click",()=>{
    if(!state.room.code) return;
    state.room.isHost = true;
    go("lobby");
  });
  // entrar com código (convidado)
  $("#joinForm").addEventListener("submit",e=>{
    e.preventDefault();
    let v = $("#joinCode").value.trim().toUpperCase().replace(/\s/g,"");
    if(!v){ toast("Digite o código da sala 😅"); return; }
    if(!v.startsWith("COPA-")) v = "COPA-"+v.replace(/^COPA-?/,"");
    if(!/^COPA-[A-Z0-9]{4}$/.test(v)){ toast("Código inválido — ex: COPA-7X2K"); return; }
    state.room.code = v; state.room.isHost = false;
    state.mate.joined = false; // o host vai "aparecer" como jogador 1
    go("lobby");
  });

  /* ---------- 2. LOBBY ---------- */
  let mateTimer=null;
  const onEnter = {};
  onEnter.lobby = ()=>{
    $("#meName").textContent = state.me.name;
    $("#lobbyRoom").textContent = state.room.code ? "SALA "+state.room.code : "SALA #2026";
    $("#meRole").textContent = state.room.isHost ? "jogador 1 · host" : "jogador 2";
    renderLobby();
    // simulate partner joining live
    if(!state.mate.joined){
      clearTimeout(mateTimer);
      $("#mateSlot").classList.add("searching");
      // se você ENTROU numa sala, o host já está lá (entra mais rápido)
      const wait = state.room.isHost ? 2600 : 1100;
      mateTimer = setTimeout(()=>{
        state.mate.joined = true;
        renderLobby();
        toast("👋 "+state.mate.name+(state.room.isHost?" entrou na sala!":" (host) está na sala!"));
      },wait);
    }
  };
  function renderLobby(){
    // me
    $("#meReadyTag").className = "ready-tag "+(state.me.ready?"yes":"no");
    $("#meReadyTag").textContent = state.me.ready?"✓ PRONTO":"AGUARDANDO";
    $("#meReadyBtn").textContent = state.me.ready?"CANCELAR":"ESTOU PRONTO";
    $("#meReadyBtn").classList.toggle("green",!state.me.ready);
    $("#meReadyBtn").classList.toggle("ghost",state.me.ready);
    // mate
    const mateRole = state.room.isHost ? "jogador 2" : "jogador 1 · host";
    if(state.mate.joined){
      $("#mateSlot").innerHTML =
        `<div class="avatar">${state.mate.emoji}</div>
         <div><div class="pname">${state.mate.name}</div><div class="pmeta">${mateRole}</div></div>
         <span class="ready-tag ${state.mate.ready?'yes':'no'}">${state.mate.ready?'✓ PRONTO':'AGUARDANDO'}</span>`;
    }else{
      $("#mateSlot").innerHTML =
        `<div class="avatar">❓</div>
         <div><div class="pname">PROCURANDO…</div><div class="pmeta typing-wrap"><span class="typing"><span></span><span></span><span></span></span> aguardando dupla</div></div>`;
    }
    const both = state.me.ready && state.mate.ready;
    $("#startDraw").disabled = !both;
    $("#lobbyHint").textContent = both ? "Tudo pronto! Bora sortear ⚽"
      : !state.mate.joined ? "Esperando sua dupla entrar…"
      : "Os dois precisam marcar PRONTO";
  }
  $("#meReadyBtn").addEventListener("click",()=>{
    if(!state.mate.joined){toast("Espere sua dupla entrar 😅");return;}
    state.me.ready=!state.me.ready;
    renderLobby();
    if(state.me.ready && !state.mate.ready){
      setTimeout(()=>{state.mate.ready=true;renderLobby();confetti(20);toast("🔥 "+state.mate.name+" marcou pronto!");},1500);
    }
  });
  $("#startDraw").addEventListener("click",()=>go("draw"));

  /* ---------- 3. SORTEIO DA SELEÇÃO ---------- */
  let drawn=false, countdownT=null;
  onEnter.draw = ()=>{ buildReel(); };
  function buildReel(){
    const track=$("#reelTrack");
    if(track.childElementCount) return;
    const seq=[];
    for(let i=0;i<26;i++) seq.push(rnd(window.TEAMS));
    track.innerHTML = seq.map(t=>reelItem(t)).join("");
    track._seq=seq;
  }
  const reelItem=t=>`<div class="reel-item"><span class="reel-flag">${t.f}</span><span class="reel-name">${t.n}</span></div>`;
  $("#spinBtn").addEventListener("click",spin);
  function spin(){
    if(drawn) return;
    const btn=$("#spinBtn"); btn.disabled=true; btn.textContent="SORTEANDO…";
    const team = rnd(window.TEAMS);
    const track=$("#reelTrack");
    const seq=track._seq;
    const landIdx = seq.length-2;
    seq[landIdx]=team;
    track.children[landIdx].innerHTML = reelItem(team).replace(/^<div[^>]*>|<\/div>$/g,"");
    track.style.transition="none";
    track.style.transform="translateY(0)";
    void track.offsetHeight;
    const dist = landIdx*120 - 0; // item height 120, reel shows centered via padding trick
    track.style.transition="transform 3.1s cubic-bezier(.12,.78,.18,1)";
    track.style.transform=`translateY(-${landIdx*120 - 0}px)`;
    setTimeout(()=>{
      drawn=true;
      state.team=team;
      $("#drawResult").classList.remove("hidden");
      $("#reelBox").classList.add("hidden");
      $("#resFlag").textContent=team.f;
      $("#resName").textContent=team.n;
      $("#resConf").textContent=team.c;
      btn.classList.add("hidden");
      confetti(80);
      startCountdown(7*60);
      $("#toWrite").classList.remove("hidden");
    },3250);
  }
  function startCountdown(sec){
    let left=sec; const total=sec;
    const t=$("#timer"),bar=$("#timerFill");
    clearInterval(countdownT);
    const tick=()=>{
      const m=String(Math.floor(left/60)).padStart(2,"0");
      const s=String(left%60).padStart(2,"0");
      t.textContent=`${m}:${s}`;
      const pct=left/total*100;
      bar.style.width=pct+"%";
      bar.style.background = pct<25?"var(--orange)":pct<50?"var(--yellow)":"var(--green)";
      t.classList.toggle("warn",left<=60);
      if(left<=0){clearInterval(countdownT);t.textContent="00:00";return;}
      left--;
    };
    tick(); countdownT=setInterval(tick,1000);
  }

  /* ---------- 4. ESCREVER O PRATO ---------- */
  let mateTypeT=null;
  onEnter.write = ()=>{
    $("#writeFlag").textContent = state.team?state.team.f:"🏳️";
    $("#writeCountry").textContent = state.team?state.team.n:"—";
    // partner types live
    const hint = (state.team&&window.DISH_HINT[state.team.n])||rnd(["Prato típico","Receita da vovó","Especialidade local"]);
    state.mateDish = hint;
    simulateMateTyping(hint);
  };
  function simulateMateTyping(target){
    clearInterval(mateTypeT);
    const el=$("#mateLive"); let i=0;
    $("#mateTyping").classList.remove("hidden");
    el.textContent="";
    mateTypeT=setInterval(()=>{
      el.textContent = target.slice(0,++i);
      if(i>=target.length){
        clearInterval(mateTypeT);
        setTimeout(()=>{$("#mateTyping").classList.add("hidden");$("#mateDone").classList.remove("hidden");},500);
      }
    },140);
  }
  $("#dishInput").addEventListener("input",e=>{
    state.myDish=e.target.value;
    $("#dishConfirm").disabled = !e.target.value.trim();
  });
  $("#dishConfirm").addEventListener("click",()=>{
    if(!state.myDish.trim()) return;
    go("pick");
  });

  /* ---------- 5. SORTEIO DO PRATO ---------- */
  onEnter.pick = ()=>{
    const mine={name:state.myDish.trim()||"Seu prato",by:state.me.name};
    const theirs={name:state.mateDish||"Prato da dupla",by:state.mate.name};
    const pickMine=Math.random()<0.5;
    state._mine=mine; state._theirs=theirs;
    state.chosen = pickMine?mine:theirs;
    state._other = pickMine?theirs:mine;
    renderPick();
    confetti(30);
  };
  function renderPick(){
    const c=state.chosen,o=state._other;
    $("#winDish").innerHTML =
      `<span class="tag">🎲 SORTEADO</span><div class="emoji">🍽️</div>
       <div class="dname">${esc(c.name)}</div><div class="by">por ${esc(c.by)}</div>`;
    $("#otherDish").innerHTML =
      `<span class="tag">OUTRA OPÇÃO</span><div class="emoji">🍳</div>
       <div class="dname">${esc(o.name)}</div><div class="by">por ${esc(o.by)}</div>`;
    $("#swapBtn").classList.remove("hidden");
    $("#swapBtn").textContent="TROCAR PELA OUTRA ⇄";
  }
  $("#swapBtn").addEventListener("click",()=>{
    openModal(`Trocar para "<b>${esc(state._other.name)}</b>"?`,()=>{
      [state.chosen,state._other]=[state._other,state.chosen];
      renderPick(); toast("Prato trocado! ✅");
    });
  });
  $("#toCook").addEventListener("click",()=>go("cook"));

  /* ---------- 6. COZINHAR + FOTO ---------- */
  onEnter.cook = ()=>{
    $("#cookDish").textContent = state.chosen?state.chosen.name:"seu prato";
    $("#cookFlag").textContent = state.team?state.team.f:"🏳️";
  };
  const drop=$("#dropzone"), fileIn=$("#fileInput");
  drop.addEventListener("click",()=>fileIn.click());
  ["dragover","dragenter"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag")}));
  ["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag")}));
  drop.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f)readPhoto(f)});
  fileIn.addEventListener("change",e=>{const f=e.target.files[0];if(f)readPhoto(f)});
  function readPhoto(f){
    const r=new FileReader();
    r.onload=()=>{
      state.photo=r.result;
      $("#previewImg").src=r.result;
      $("#dropzone").classList.add("hidden");
      $("#previewWrap").classList.remove("hidden");
      $("#sendPhoto").disabled=false;
    };
    r.readAsDataURL(f);
  }
  $("#retakeBtn").addEventListener("click",()=>{
    state.photo=null;
    $("#dropzone").classList.remove("hidden");
    $("#previewWrap").classList.add("hidden");
    $("#sendPhoto").disabled=true;
    fileIn.value="";
  });
  $("#sendPhoto").addEventListener("click",()=>{
    confetti(100);
    addToGallery({
      flag: state.team?state.team.f:"🏳️",
      dish: state.chosen?state.chosen.name:"Prato",
      by: state.me.name+" & "+state.mate.name,
      img: state.photo, score:0, reviews:[], mine:true
    });
    toast("📸 Foto enviada pra galeria!");
    go("gallery");
  });

  /* ---------- 7. MINHA GALERIA (só a dupla) ---------- */
  const gallery = seedGallery();
  function seedGallery(){
    return [
      {flag:"🇧🇷",dish:"Feijoada Completa",by:"VOCÊ & PARCEIRO",img:null,emoji:"🍲",mine:true,likes:54,
        reviews:[{who:"DUDA",s:5,t:"Caldo encorpado, faltou só a laranja!"},{who:"MEL",s:4,t:"Mandaram muito bem 🔥"}]}
    ];
  }
  function avg(rv){return rv.length?rv.reduce((a,b)=>a+b.s,0)/rv.length:0}
  function addToGallery(item){
    item.emoji="📷"; item.reviews=item.reviews||[]; item.mine=true;
    item.likes = Math.floor(Math.random()*8); // novinho na galeria
    gallery.unshift(item); renderGallery();
  }
  onEnter.gallery = renderGallery;
  function renderGallery(){
    const grid=$("#galleryGrid"), empty=$("#galleryEmpty"), stats=$("#myStats");
    const duo = state.me.name+" & "+state.mate.name;
    $("#galleryDuo").textContent = duo;
    if(!gallery.length){
      grid.innerHTML=""; stats.innerHTML="";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    // stats
    const allRv=gallery.flatMap(g=>g.reviews);
    const media=avg(allRv);
    const curt=gallery.reduce((a,g)=>a+(g.likes||0),0);
    stats.innerHTML = `
      <div class="stat"><div class="num">${gallery.length}</div><div class="lbl">PRATOS</div></div>
      <div class="stat"><div class="num">${media?media.toFixed(1)+'★':'—'}</div><div class="lbl">MÉDIA GERAL</div></div>
      <div class="stat"><div class="num">${curt}</div><div class="lbl">❤️ CURTIDAS</div></div>`;
    // cards (somente leitura — você não avalia o próprio prato)
    grid.innerHTML = gallery.map((g,i)=>{
      const a=avg(g.reviews);
      const photo = g.img?`<img src="${g.img}" alt="">`:`<div style="font-size:64px">${g.emoji||"🍽️"}</div>`;
      return `<div class="gcard">
        <div class="gphoto">${photo}<span class="flag">${g.flag}</span>
          <span class="score">★ ${a?a.toFixed(1):"—"}</span></div>
        <div class="gbody">
          <div class="gdish">${esc(g.dish)}</div>
          <div class="gby">por <span class="neon">VOCÊS</span> · ❤️ ${g.likes||0}</div>
          <div class="reviews">${g.reviews.length?reviewsHTML(g.reviews):'<div class="help" style="font-size:15px">Ainda sem avaliações — divulguem no Social 😉</div>'}</div>
        </div></div>`;
    }).join("");
  }
  function starRow(n){let h="";for(let i=1;i<=5;i++)h+=`<span class="star ${i<=n?'on':''}" data-v="${i}">★</span>`;return h}
  function reviewsHTML(rv){return rv.map(r=>`<div class="review"><span class="who">${esc(r.who)}<span class="s">${"★".repeat(r.s)}</span></span><div>${esc(r.t)}</div></div>`).join("")}

  /* ---------- 8. SOCIAL (feed das outras duplas) ---------- */
  const feed = (window.SOCIAL_FEED||[]).map(p=>({...p, reviews:p.reviews.map(r=>({...r}))}));
  let feedSort="hot";
  const DUO_AV=["🧑‍🍳","👩‍🍳","👨‍🍳","🧑‍🎤","👩‍🎤"];
  const avFor=id=>DUO_AV[[...id].reduce((a,c)=>a+c.charCodeAt(0),0)%DUO_AV.length];

  onEnter.social = renderSocial;
  function sortedFeed(){
    const f=[...feed];
    if(feedSort==="top") f.sort((a,b)=>avg(b.reviews)-avg(a.reviews)||b.likes-a.likes);
    else if(feedSort==="hot") f.sort((a,b)=>b.likes-a.likes);
    // "new" = ordem original
    return f;
  }
  function renderPodium(){
    const top=[...feed].sort((a,b)=>avg(b.reviews)-avg(a.reviews)||b.likes-a.likes).slice(0,3);
    const order=[top[1],top[0],top[2]]; // prata · ouro · bronze
    const medals=["🥈","🥇","🥉"], cls=["p2","p1","p3"], pos=[1,0,2];
    $("#podium").innerHTML = order.map((p,k)=>{
      if(!p) return "";
      const a=avg(p.reviews);
      return `<div class="pod ${cls[k]}">
        <span class="pflag">${p.flag}</span>
        <span class="medal">${medals[k]}</span>
        <span class="pemoji">${p.emoji}</span>
        <span class="pduo">${esc(p.duo)}</span>
        <span class="pscore">★ ${a?a.toFixed(1):"—"}</span>
      </div>`;
    }).join("");
  }
  function renderSocial(){
    renderPodium();
    const list=sortedFeed();
    $("#feed").innerHTML = list.map(p=>{
      const a=avg(p.reviews);
      const photo = p.img?`<img src="${p.img}" alt="">`:`<div class="pbig">${p.emoji}</div>`;
      return `<article class="post" data-id="${p.id}">
        <div class="post-head">
          <div class="avatar">${avFor(p.id)}</div>
          <div class="meta">
            <div class="pduo">${esc(p.duo)}</div>
            <div class="psub">${p.flag} ${esc(p.country)} · ${esc(p.time)}</div>
          </div>
        </div>
        <div class="post-photo">${photo}<span class="pflag">${p.flag}</span>
          <span class="pscore">★ ${a?a.toFixed(1):"—"}</span></div>
        <div class="post-bar">
          <button class="act like ${p.liked?'on':''}" data-like><span class="ic">${p.liked?'❤️':'🤍'}</span> <span class="lc">${p.likes}</span></button>
          <button class="act cmt" data-togglecmt><span class="ic">💬</span> <span>${p.reviews.length}</span></button>
          <button class="act spacer" data-rate-open><span class="ic">⭐</span> AVALIAR</button>
        </div>
        <div class="post-body">
          <div class="post-caption"><span class="pdish">${esc(p.dish||p.country)}</span>${esc(p.caption)}</div>
          ${p.reviews.length?`<button class="toggle-cmt" data-togglecmt>ver ${p.reviews.length} comentário${p.reviews.length>1?'s':''}</button>`:''}
          <div class="post-reviews hidden">${reviewsHTML(p.reviews)}</div>
          <div class="rate-box hidden">
            <div class="rlabel">SUA NOTA</div>
            <div class="stars input-stars" data-stars>${starRow(0)}</div>
            <div class="rrow">
              <textarea class="input grow" rows="1" placeholder="Comente o prato…" data-comment></textarea>
              <button class="btn pink sm" data-send>ENVIAR ★</button>
            </div>
          </div>
        </div>
      </article>`;
    }).join("");
  }
  // dish name fallback: usa o primeiro nome citado ou o país
  feed.forEach(p=>{ if(!p.dish) p.dish=p.country; });

  // filtros
  $$("#feedChips .chip").forEach(c=>c.addEventListener("click",()=>{
    $$("#feedChips .chip").forEach(x=>x.classList.toggle("on",x===c));
    feedSort=c.dataset.sort; renderSocial();
  }));

  // delegação de eventos no feed
  $("#feed").addEventListener("click",e=>{
    const post=e.target.closest(".post"); if(!post) return;
    const p=feed.find(x=>x.id===post.dataset.id); if(!p) return;
    // curtir
    if(e.target.closest("[data-like]")){
      p.liked=!p.liked; p.likes+=p.liked?1:-1;
      const btn=post.querySelector("[data-like]");
      btn.classList.toggle("on",p.liked);
      btn.querySelector(".ic").textContent=p.liked?"❤️":"🤍";
      btn.querySelector(".lc").textContent=p.likes;
      if(p.liked){confetti(14);}
      return;
    }
    // ver comentários
    if(e.target.closest("[data-togglecmt]")){
      const box=post.querySelector(".post-reviews");
      box.classList.toggle("hidden");
      const tg=post.querySelector(".toggle-cmt");
      if(tg) tg.textContent = box.classList.contains("hidden")
        ? `ver ${p.reviews.length} comentário${p.reviews.length>1?'s':''}` : "ocultar comentários";
      return;
    }
    // abrir caixa de avaliar
    if(e.target.closest("[data-rate-open]")){
      post.querySelector(".rate-box").classList.toggle("hidden");
      return;
    }
    // selecionar estrelas
    const star=e.target.closest("[data-stars] .star");
    if(star){
      const box=post.querySelector("[data-stars]");
      const v=+star.dataset.v; box.dataset.sel=v; box.innerHTML=starRow(v);
      return;
    }
    // enviar avaliação
    if(e.target.closest("[data-send]")){
      const box=post.querySelector("[data-stars]");
      const sel=+(box.dataset.sel||0);
      const txt=post.querySelector("[data-comment]").value.trim();
      if(!sel){toast("Escolha as estrelas ⭐");return;}
      p.reviews.push({who:state.me.name,s:sel,t:txt||"(sem comentário)"});
      confetti(24); toast("Avaliação enviada! ★"+sel);
      renderSocial();
      return;
    }
  });

  /* ---------- Modal ---------- */
  let modalCb=null;
  function openModal(html,cb){
    $("#modalText").innerHTML=html; modalCb=cb;
    $("#modal").classList.remove("hidden");
  }
  $("#modalYes").addEventListener("click",()=>{$("#modal").classList.add("hidden");modalCb&&modalCb()});
  $("#modalNo").addEventListener("click",()=>$("#modal").classList.add("hidden"));

  /* ---------- Toast ---------- */
  let toastT=null;
  function toast(msg){
    const t=$("#toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2400);
  }

  /* ---------- Confetti (light, capped, auto-stops) ---------- */
  const cv=$("#confetti"), cx=cv.getContext("2d");
  let parts=[], raf=null;
  function resize(){cv.width=innerWidth;cv.height=innerHeight}
  addEventListener("resize",resize); resize();
  const COL=["#ff2d95","#19e3ff","#ffd23f","#34e89e","#ff7a35","#b06bff"];
  function confetti(n=60){
    for(let i=0;i<n;i++)parts.push({
      x:Math.random()*cv.width,y:-20,
      vx:(Math.random()-.5)*4,vy:Math.random()*3+2,
      s:Math.random()*6+4,c:rnd(COL),rot:Math.random()*6,vr:(Math.random()-.5)*.3,life:120
    });
    if(parts.length>400)parts=parts.slice(-400);
    if(!raf)raf=requestAnimationFrame(loop);
  }
  function loop(){
    cx.clearRect(0,0,cv.width,cv.height);
    parts=parts.filter(p=>p.life>0&&p.y<cv.height+30);
    parts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.rot+=p.vr;p.life--;
      cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);
      cx.fillStyle=p.c;cx.fillRect(-p.s/2,-p.s/2,p.s,p.s);cx.restore();
    });
    if(parts.length)raf=requestAnimationFrame(loop);
    else{raf=null;cx.clearRect(0,0,cv.width,cv.height)}
  }

  /* ---------- utils ---------- */
  function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

  /* ---------- marquee flags ---------- */
  const mq = window.TEAMS.slice(0,24).map(t=>t.f).join(" ");
  $$(".mq-row").forEach(r=>r.textContent=mq+" "+mq);

  /* boot */
  go("login");
})();
