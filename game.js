const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const characters = [
  {glyph:'狐', portrait:'assets/fox.svg', title:'白狐 · 霜弦', name:'霜弦', trait:'冷静 · 优雅', color:'#d4ddd3'},
  {glyph:'熊', portrait:'assets/bear.svg', title:'黑熊 · 墨岳', name:'墨岳', trait:'沉稳 · 压迫', color:'#63736d'},
  {glyph:'鹿', portrait:'assets/deer.svg', title:'赤鹿 · 丹枝', name:'丹枝', trait:'温和 · 难以看透', color:'#b66a55'},
  {glyph:'鹰', portrait:'assets/eagle.svg', title:'雪鹰 · 星烬', name:'星烬', trait:'敏锐 · 疏离', color:'#9baeb0'},
  {glyph:'狼', portrait:'assets/wolf.svg', title:'灰狼 · 夜岚', name:'夜岚', trait:'直接 · 攻势凌厉', color:'#788681'},
  {glyph:'兔', portrait:'assets/rabbit.svg', title:'玉兔 · 月栖', name:'月栖', trait:'灵动 · 自信', color:'#cbd2c5'}
];

const solarTerms = ['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];
const festivals = [['春节',1,1],['元宵',1,15],['龙抬头',2,2],['上巳',3,3],['寒食',3,4],['端午',5,5],['七夕',7,7],['中元',7,15],['中秋',8,15],['重阳',9,9],['下元',10,15],['腊八',12,8]];
const termDates = [[1,15],[1,30],[2,6],[2,21],[3,6],[3,21],[4,7],[4,22],[5,8],[5,23],[6,9],[6,24],[7,11],[7,26],[8,12],[8,27],[9,13],[9,28],[10,14],[10,29],[11,7],[11,22],[12,7],[12,22]];
const cnMonth = ['','正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
const cnDay = n => n <= 10 ? `初${['','一','二','三','四','五','六','七','八','九','十'][n]}` : n < 20 ? `十${['','一','二','三','四','五','六','七','八','九'][n-10]}` : n === 20 ? '二十' : `廿${['','一','二','三','四','五','六','七','八','九','十'][n-20]}`;
const deck = [
  ...solarTerms.map((name,i)=>({id:`t${i}`,name,category:'节气',month:termDates[i][0],day:termDates[i][1],value:termDates[i][0]+termDates[i][1]})),
  ...festivals.map((f,i)=>({id:`f${i}`,name:f[0],category:'节日',month:f[1],day:f[2],value:f[1]+f[2]}))
];

let charIndex = 0;
let difficulty = '弦月';
let audioOn = true;
let game = null;
let audioState = {ctx:null,master:null,ambient:null};
let musicState = {name:null,audio:null};
const musicTracks={home:{src:'audio-options/01-cold-moon-water.wav',volume:.78,rate:1.1},battle:{src:'audio-options/02-bamboo-shadow.wav',volume:.62,rate:1.12},full:{src:'audio-options/03-lantern-court.wav',volume:.8,rate:1.2}};

function ensureAudio(){try{if(audioState.ctx){if(audioState.ctx.state==='suspended')audioState.ctx.resume();return audioState.ctx;}const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;const ctx=new AudioCtx(),master=ctx.createGain();master.gain.value=.34;master.connect(ctx.destination);audioState={ctx,master,ambient:null};return ctx;}catch(error){console.warn('Web Audio unavailable',error);return null;}}
function switchMusic(name){if(!audioOn)return;const track=musicTracks[name];if(!track)return;if(musicState.name===name&&musicState.audio&&!musicState.audio.paused)return;if(musicState.audio){musicState.audio.pause();musicState.audio.currentTime=0;}const audio=new Audio(track.src);audio.loop=true;audio.volume=track.volume;audio.playbackRate=track.rate;musicState={name,audio};audio.play().catch(error=>console.warn('Music playback blocked until a user gesture',error));}
function startAmbient(){if(audioOn)switchMusic('home');}
function stopAmbient(){if(!musicState.audio)return;musicState.audio.pause();musicState.audio.currentTime=0;musicState={name:null,audio:null};}
function tone(freq,duration=.12,volume=.15,type='sine',delay=0){if(!audioOn)return;const ctx=ensureAudio();if(!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(audioState.master);osc.start(now);osc.stop(now+duration+.03);}
function sfx(name){if(!audioOn)return;const patterns={turn:[[392,.08,.1]],deal:[[520,.08,.16],[360,.13,.12,.07]],dao:[[250,.09,.16,'triangle'],[340,.12,.13,'triangle',.08]],chip:[[290,.07,.14],[430,.1,.12,.08]],fold:[[190,.18,.12]],out:[[120,.28,.16,'sawtooth'],[90,.36,.12,'sine',.12]],raise:[[430,.08,.13],[610,.14,.15,.07]],showdown:[[310,.12,.12],[466,.16,.13,.1]],win:[[392,.12,.16],[523,.16,.17,.11],[659,.25,.18,.23]]};const intensity=game&&game.round>=5?1.18:1;(patterns[name]||patterns.chip).forEach(x=>tone(x[0]*intensity,x[1],Math.min(.24,x[2]*(game&&game.round>=5?1.3:1)),x[3]||'sine',x[4]||0));}
function unlockAudio(){const ctx=ensureAudio();if(!ctx){console.warn('No Web Audio output available');return false;}ctx.resume();startAmbient();tone(660,.08,.12);return true;}

function showScreen(id){ $$('.screen').forEach(s=>s.classList.remove('active')); $(`#${id}`).classList.add('active'); }
function shuffle(a){ const x=[...a]; for(let i=x.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; }
function cardHTML(c, hidden=false){ if(hidden) return ''; const season=['spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter','winter','winter'][c.month-1]; return `<span class="cat">${c.category}</span><b class="power-corner">${c.value}</b><span class="ink-art ${season}"></span><strong class="card-name">${c.name}</strong><span class="date">${cnMonth[c.month]}${cnDay(c.day)}</span>`; }
function setCard(el,c,hidden=false){ el.className=`card${hidden?' back':''}`; el.innerHTML=cardHTML(c,hidden); }
function announce(text){ const el=$('#announcement'); el.textContent=text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }

function initSky(){
  const canvas=$('#sky'), ctx=canvas.getContext('2d'); let stars=[];
  function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);stars=Array.from({length:85},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight*.72,r:Math.random()*1.2,a:Math.random(),v:.002+Math.random()*.005}));}
  function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);for(const s of stars){s.a+=s.v;if(s.a>1||s.a<.15)s.v*=-1;ctx.fillStyle=`rgba(210,228,218,${s.a})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}requestAnimationFrame(draw)}
  addEventListener('resize',resize);resize();draw();
}

function renderCharacter(){ const c=characters[charIndex]; $('#character-glyph').innerHTML=`<img src="${c.portrait}" alt="${c.title}">`; $('#character-glyph').style.background=c.color; $('#character-title').textContent=c.title; $('#character-name').textContent=c.name; $('#character-trait').textContent=c.trait; }
function updateMoonIcon(){if(!game)return;const fill=Math.min(100,game.round<=5?game.round*20:100);$('#phase-moon').style.background=`linear-gradient(90deg,#e4eadc 0 ${fill}%,#0b1817 ${fill}% 100%)`;$('#phase-moon').classList.toggle('is-full',fill===100);}
function renderExtraHidden(){const wrap=$('#extra-hidden');if(!wrap||!game)return;const extras=game.players[0].hiddenExtras||[];wrap.innerHTML=extras.map((c,i)=>`<div class="extra-hidden-card" data-card="${c.name} · ${c.value}" style="transform:translate(${i*3}px,${i*-2}px) rotate(${i*2-2}deg)"></div>`).join('');}

function newGame(){
  const aiCount=+$ ('#ai-count').value;
  const aiChars=shuffle(characters.filter((_,i)=>i!==charIndex)).slice(0,aiCount);
  const human={id:'human',name:$('#player-name').value||'月下客',char:characters[charIndex],human:true,dao:12,reserved:2,wins:0,lastWin:0};
  const styles=['谨慎','激进','观察'];
  game={round:0,potCarry:0,swaps:2,riskChoice:null,riskActive:false,riskRound:null,riskDelta:0,awaitingRisk:false,players:[human,...aiChars.map((c,i)=>({id:`ai${i}`,name:c.name,char:c,human:false,style:styles[i%3],dao:12,reserved:2,wins:0,lastWin:0}))],records:[],maxPot:0,active:true};
  showScreen('game-screen'); startRound();
  if(!localStorage.getItem('shuoWangTutorialSeen')) setTimeout(()=>openTutorial(0),650);
}

function showFullMoonSequence(){
  const cinema=$('#full-moon-cinema');cinema.classList.remove('active');void cinema.offsetWidth;cinema.classList.add('active');announce(`系统播报：满月升起 · 本回合月限 ${game.moonLimit}`);sfx('showdown');
}

function startRound(){
  const living=game.players.filter(p=>!p.out);if(living.length<=1||game.round>=8){finishGame();return;}
  game.round++;game.resolving=false;game.earlyWinner=null;$('#game-board').classList.remove('overhead'); const cards=shuffle(deck), phase=game.round<=4?'朔月':'满月'; game.drawPile=cards.slice(game.players.length*2+1);
  game.public=cards[game.players.length*2];game.pot=game.potCarry;game.highBet=1;game.actionCount=0;game.skillUsed=false;game.currentTurnId=null;game.pendingDuel=false;game.moonLimit=game.round>4?[44,48,52,56][game.round-5]:null;
  game.players.forEach((p,i)=>{p.visible=cards[i*2];p.hidden=cards[i*2+1];p.hiddenExtras=[];p.visibleExtras=[];p.roundEliminated=false;p.bet=0;if(p.out){p.folded=true;p.status='已出局';return;}p.folded=false;if(p.dao<=0){p.pendingOut=true;p.status='道尽·待判';return;}p.pendingOut=false;p.status='候场';p.dao--;p.bet=1;game.pot++;if(p.dao===0){p.pendingOut=true;p.status='道尽·待判';}});
  $('#round-number').textContent=game.round;$('#phase-name').textContent=phase;$('#moon-limit').textContent=game.moonLimit?`月限 ${game.moonLimit}`:'';$('#risk-status').textContent=game.riskActive?'赌命中':'';updateMoonIcon();
  $('#game-screen').classList.toggle('full-phase',game.round>4);if(game.round<5)$('#full-moon-cinema').classList.remove('active');setCard($('#public-card'),game.public);setCard($('#visible-card'),game.players[0].visible);setCard($('#hidden-card'),game.players[0].hidden);
  const active=game.players.filter(p=>!p.out&&!p.folded&&!p.pendingOut);if(game.players.some(p=>p.pendingOut&&!p.out))game.pendingDuel=true;game.needsAction=new Set(active.map(p=>p.id));const starter=active.sort((a,b)=>b.visible.value-a.visible.value)[0];game.turnIndex=starter?game.players.indexOf(starter)-1:0;
  $('#action-log').innerHTML=''; log(`仍在场者投入 1 道，月盘共 ${game.pot} 道`); renderBoard(true); renderActions();renderExtraHidden();sfx('deal');setTimeout(()=>sfx('dao'),180);
  announce(game.round===5?'第五月 · 满月｜月律已变':`第${game.round}回 · ${phase}`);
  game.awaitingRisk=false;if(game.round===5){switchMusic('full');showFullMoonSequence();setTimeout(advanceTurn,6500)}else{if(game.round===1)switchMusic('battle');setTimeout(advanceTurn,1800)}
}

function renderBoard(animateDao=false){
  const seats=$('#seats'); seats.innerHTML='';const rivals=game.players.filter(p=>!p.human),layouts={2:[[25,25],[75,25]],3:[[18,38],[50,17],[82,38]],4:[[12,45],[36,18],[64,18],[88,45]],5:[[10,47],[28,24],[50,15],[72,24],[90,47]]};
  game.players.forEach(p=>{let x,y;if(p.human){x=9;y=76}else{const pos=(layouts[rivals.length]||layouts[5])[rivals.indexOf(p)];[x,y]=pos;}const el=document.createElement('div');el.className=`seat${p.human?' human-seat':''}${p.folded?' folded':''}${p.out?' out':''}${p.pendingOut?' pending-out':''}${game.currentTurnId===p.id?' current-turn':''}`;el.style.left=`${x}%`;el.style.top=`${y}%`;el.innerHTML=`<div class="seat-avatar"><img src="${p.char.portrait}" alt="${p.char.title}"></div><div class="seat-name">${p.name}${p.human?' · 你':''}</div><div class="seat-stats">${p.dao} 道 · 已注 ${p.bet}</div><span class="seat-status">${p.status}</span>${p.human&&game.riskActive?'<span class="risk-call">我要赌命</span>':''}${!p.human&&p.visible?`<div class="seat-visible"><small>明牌</small><b>${p.visible.name}</b><span>${p.visible.value}</span></div>`:''}${game.currentTurnId===p.id&&!p.human?'<i class="thinking-bar"></i>':''}`;seats.appendChild(el); });
  $('#pot-value').textContent=game.pot;$('#current-bet').textContent=game.players[0].bet;$('#dao-left').textContent=game.players[0].dao;
  const pile=$('#dao-pile');pile.innerHTML='';for(let i=0;i<Math.min(game.pot,30);i++){const t=document.createElement('i');t.className=`dao-token${animateDao?' animate':''}`;t.style.left=`${38+(i*17)%24}%`;t.style.top=`${48+(i*11)%27}%`;t.style.animationDelay=`${i*.025}s`;pile.appendChild(t)}
}

function renderActions(){
  const h=game.players[0], owed=Math.max(0,game.highBet-h.bet),myTurn=game.currentTurnId===h.id&&!h.out&&!h.folded&&!h.pendingOut;
  $('[data-action="fold"]').disabled=!myTurn;$('#check-action').disabled=!myTurn||game.pendingDuel; $('[data-action="call"]').disabled=!myTurn||h.dao===0; $('[data-action="raise"]').disabled=!myTurn||game.pendingDuel||h.dao<=owed; $('[data-action="allin"]').disabled=!myTurn||game.pendingDuel||h.dao===0;
  $('#swap-action').disabled=!myTurn||game.pendingDuel||game.round>4||game.swaps===0; $('#swap-left').textContent=game.swaps;$('#skill-action').disabled=!myTurn||game.pendingDuel||game.round<5||game.skillUsed;$('#risk-action').disabled=!myTurn||game.pendingDuel||game.round<5||game.riskChoice!==null;
  $('#raise-amount').max=Math.min(3,Math.max(1,h.dao-owed));
}
function log(text){const p=document.createElement('p');p.textContent=text;$('#action-log').prepend(p);}

function playerAction(type){
  const h=game.players[0];if(game.currentTurnId!==h.id||h.out||h.pendingOut)return;if(game.pendingDuel&&!['fold','call'].includes(type))return; const owed=Math.max(0,game.highBet-h.bet);
  if(type==='swap'){
    if(game.swaps===0||game.round>4)return;$('#swap-dialog-count').textContent=game.swaps;$('#swap-dialog').showModal();return;
  }
  if(type==='skill'){drawSkill();return;}
  if(type==='risk'){openRiskChoice();return;}
  takeAction(h,type,+$('#raise-amount').value);
}
function applySwap(zone){const h=game.players[0];if(!game||game.round>4||game.swaps<=0||game.currentTurnId!==h.id)return;const old=h[zone];h[zone]=game.drawPile.shift();game.swaps--;setCard(zone==='visible'?$('#visible-card'):$('#hidden-card'),h[zone],false);sfx('deal');log(`你以月策易牌更换${zone==='visible'?'明牌':'暗牌'}：${old.name} → 新牌`);announce(`易牌完成 · 剩余 ${game.swaps} 次`);$('#swap-dialog').close();renderBoard();renderExtraHidden();renderActions();}
function openRiskChoice(){if(!game||game.round<5||game.riskChoice!==null||game.currentTurnId!==game.players[0].id)return;$('#risk-dialog').showModal();}

function power(p){return p.visible.value+p.hidden.value+game.public.value+(p.hiddenExtras||[]).reduce((s,c)=>s+c.value,0)+(p.visibleExtras||[]).reduce((s,c)=>s+c.value,0);}
function takeAction(p,type,extra=1){
  if(game.pendingDuel&&!['fold','call'].includes(type))return;
  const owed=Math.max(0,game.highBet-p.bet);let label='';game.lastSolvent=p;
  if(type==='fold'){p.folded=true;p.status='已弃权';label=`${p.name} 弃权，桌上 ${p.bet} 道留在月盘`;game.needsAction.delete(p.id);sfx('fold');}
  if(type==='check'){p.status='已观望';label=`${p.name} 观望`;game.needsAction.delete(p.id);sfx('chip');}
  if(type==='call'){const pay=Math.min(owed,p.dao);p.dao-=pay;p.bet+=pay;game.pot+=pay;p.status='已跟注';label=`${p.name} 跟注 ${pay} 道`;game.needsAction.delete(p.id);sfx('dao');}
  if(type==='raise'||type==='allin'){const pay=type==='allin'?p.dao:Math.min(owed+extra,p.dao);p.dao-=pay;p.bet+=pay;game.pot+=pay;game.highBet=Math.max(game.highBet,p.bet);p.status=type==='allin'?'尽数投入':'已加注';label=`${p.name} ${type==='allin'?'尽数投入':'加注至'} ${p.bet} 道`;game.needsAction=new Set(game.players.filter(x=>!x.out&&!x.folded&&x.id!==p.id).map(x=>x.id));sfx('dao');if(type==='raise')setTimeout(()=>sfx('raise'),90);}
  if(p.dao===0&&!p.folded){p.pendingOut=true;game.pendingDuel=true;p.status='道尽·待判';game.needsAction=new Set(game.players.filter(x=>!x.out&&!x.folded&&x.id!==p.id).map(x=>x.id));label+=`，道尽待判：全场只能跟注或弃权`;sfx('out');}
  game.actionCount++;game.currentTurnId=null;log(label);game.maxPot=Math.max(game.maxPot,game.pot);renderBoard(type==='raise');renderActions();setTimeout(advanceTurn,900);
}
function advanceTurn(){
  if($('#tutorial-dialog').open||game.awaitingRisk){setTimeout(advanceTurn,500);return;}
  const survivors=game.players.filter(p=>!p.out&&p.dao>0),pending=game.players.filter(p=>!p.out&&p.pendingOut&&!p.folded);if(survivors.length===0||(!pending.length&&survivors.length<=1)){game.earlyWinner=survivors[0]||null;resolveRound();return;}
  const roundActive=game.players.filter(p=>!p.out&&!p.folded&&!p.pendingOut);if(roundActive.length===0){resolveRound();return;}
  for(const id of [...game.needsAction]){const p=game.players.find(x=>x.id===id);if(!p||p.out||p.folded||p.bet===game.highBet&&p.status==='已跟注')game.needsAction.delete(id);}
  if(game.needsAction.size===0){setTimeout(resolveRound,1300);return;}
  let next=null;for(let step=1;step<=game.players.length;step++){const idx=(game.turnIndex+step)%game.players.length,p=game.players[idx];if(game.needsAction.has(p.id)&&!p.out&&!p.folded){game.turnIndex=idx;next=p;break;}}
  if(!next){resolveRound();return;}game.currentTurnId=next.id;next.status=next.human?'轮到你了':'正在思考';renderBoard();renderActions();sfx('turn');announce(next.human?'轮到你行动':`${next.name} 正在思考`);
  if(!next.human)setTimeout(()=>aiDecision(next),2200+Math.random()*1800);
}
function aiDecision(p){
  if(game.currentTurnId!==p.id)return;const total=power(p),owed=Math.max(0,game.highBet-p.bet),strong=game.round<=4?total>=48:total<=game.moonLimit&&total>=game.moonLimit-8,bust=game.round>4&&total>game.moonLimit;const nerve=(difficulty==='蚀月'?.72:difficulty==='弦月'?.56:.4)+(p.style==='激进'?.14:p.style==='谨慎'?-.12:0);
  if(game.pendingDuel){if(owed>0&&p.dao===0){takeAction(p,'fold');return;}takeAction(p,owed>0?'call':'call');return;}
  if(owed>0&&(owed>=p.dao||bust||!strong)&&Math.random()>nerve){takeAction(p,'fold');return;}
  if(strong&&p.dao>owed+1&&Math.random()<nerve*.55){takeAction(p,'raise',Math.min(3,1+Math.floor(Math.random()*3)));return;}
  takeAction(p,owed>0?'call':'check');
}

function scoredPower(p){return power(p)+(p.human&&game.round===game.riskRound&&game.riskActive?game.riskDelta:0);}
function distributeRiskDao(player){const others=game.players.filter(p=>p!==player&&!p.out);if(!others.length){player.dao=0;return;}const share=Math.floor(player.dao/others.length),rem=player.dao-share*others.length;others.forEach(p=>p.dao+=share);if(others[0])others[0].dao+=rem;player.dao=0;player.out=true;player.folded=true;player.pendingOut=false;player.status='赌命失败·淘汰';log(`${player.name} 赌命失败，剩余道已均分`);}

function resolveRound(){
  if(game.resolving)return;game.resolving=true;game.currentTurnId=null;$('#game-board').classList.add('overhead');renderBoard();renderActions();
  const contenders=game.players.filter(p=>!p.folded&&!p.out);let winners=[];
  if(contenders.length===1)winners=contenders;
  else if(contenders.length===0){const living=game.players.filter(p=>!p.out&&p.dao>0);const most=living.length?Math.max(...living.map(p=>p.dao)):0;winners=living.filter(p=>p.dao===most);}
  else if(game.round<=4){const best=Math.max(...contenders.map(scoredPower));winners=contenders.filter(p=>scoredPower(p)===best);}
  else {const valid=contenders.filter(p=>scoredPower(p)<=game.moonLimit);const pool=valid.length?valid:contenders;if(valid.length){const best=Math.max(...pool.map(scoredPower));winners=pool.filter(p=>scoredPower(p)===best);}else{const darkSorted=[...pool].sort((a,b)=>b.hidden.value-a.hidden.value||b.visible.value-a.visible.value);winners=darkSorted.length?[darkSorted[0]]:[];game.allBustDarkTie=true;}}
  if(!winners.length)winners=[game.earlyWinner||game.lastSolvent||game.players[0]];
  const overLimit=game.round>4?contenders.filter(p=>scoredPower(p)>game.moonLimit):[];overLimit.forEach(p=>{if(!winners.includes(p)){p.roundEliminated=true;p.folded=true;p.pendingOut=false;p.status='本回合蚀月';}else{p.status='蚀月暗牌胜出';}});
  game.players.filter(p=>p.pendingOut).forEach(p=>{if(winners.includes(p)&&!p.out){p.pendingOut=false;p.status='道尽获胜·保留资格'}else{p.pendingOut=false;p.out=true;p.folded=true;p.status='道尽淘汰';}});
  game.pendingDuel=false;
  winners=winners.filter(p=>!p.out&&!p.folded);if(!winners.length)winners=[...game.players.filter(p=>!p.out&&!p.folded)].slice(0,1);if(!winners.length)winners=[game.players[0]];
  const human=game.players[0];if(game.riskActive&&(!winners.includes(human)||human.out)){distributeRiskDao(human);game.riskActive=false;}
  const share=Math.floor(game.pot/winners.length),rem=game.pot-share*winners.length;winners.forEach(p=>{p.dao+=share;p.wins++;p.lastWin=game.round;});game.potCarry=rem;
  const winnerNames=winners.map(p=>p.name).join('、');game.records.push({round:game.round,phase:game.round<=4?'朔月':'满月',public:game.public.name,winners:winnerNames,pot:game.pot,powers:game.players.map(p=>({name:p.name,power:power(p),folded:p.folded}))});sfx(winners.includes(game.players[0])?'win':'showdown');
  $$('.seat').forEach((el,i)=>el.classList.toggle('winner',winners.includes(game.players[i])));
  $('#round-content').innerHTML=`<small>俯视开牌 · ${game.round<=4?'朔月':'满月'}第 ${game.round} 回</small><h3>${winnerNames} 获胜</h3><p>公共牌：${game.public.name}（${game.public.value}） · ${game.round<=4?'牌力总和越大越强':`最接近且不超过月限 ${game.moonLimit} 者胜；全员超限时比较暗牌`}</p><p class="score-line">月盘 ${game.pot} 道 · 每人获得 ${share}</p><div class="showdown-grid">${game.players.map(p=>`<div class="showdown-player ${winners.includes(p)?'won':''} ${p.folded?'folded':''}"><b>${p.name}</b><div class="showdown-cards"><span class="mini-card">明 ${p.visible.name} ${p.visible.value}</span><span class="mini-card">暗 ${p.hidden.name} ${p.hidden.value}</span>${(p.visibleExtras||[]).map(c=>`<span class="mini-card">加明 ${c.name} ${c.value}</span>`).join('')}${(p.hiddenExtras||[]).map(c=>`<span class="mini-card">加暗 ${c.name} ${c.value}</span>`).join('')}</div><small>${p.out||p.roundEliminated?p.status:p.folded?'已弃权':`${scoredPower(p)} 点${game.round>4&&scoredPower(p)>game.moonLimit?' · 蚀月':''}`}</small></div>`).join('')}</div>`;
  const remaining=game.players.filter(p=>!p.out&&p.dao>0);$('#next-round').textContent=game.round===8||remaining.length<=1?'查看终局':'下一回合';setTimeout(()=>$('#round-dialog').showModal(),1800);
}

function finishGame(){
  switchMusic('battle');
  const ranked=[...game.players].sort((a,b)=>b.dao-a.dao||b.wins-a.wins||b.lastWin-a.lastWin);showScreen('result-screen');
  const humanRank=ranked.findIndex(p=>p.human)+1;$('#result-title').textContent=humanRank===1?'月魁 · 你赢得此局':`月局第 ${humanRank} 席`;
  $('#ranking').innerHTML=ranked.map((p,i)=>`<div class="rank-row"><span class="rank-no">${i+1}</span><span>${p.char.glyph}　${p.name}</span><b>${p.dao} 道</b><small>${p.wins} 胜</small></div>`).join('');
  $('#result-stats').textContent=`最大月盘 ${game.maxPot} 道　·　朔月胜局 ${game.records.slice(0,4).filter(r=>r.winners.includes(game.players[0].name)).length}　·　满月胜局 ${game.records.slice(4).filter(r=>r.winners.includes(game.players[0].name)).length}`;
  const history=JSON.parse(localStorage.getItem('shuoWangHistory')||'[]');history.unshift({date:new Date().toLocaleString(),rank:humanRank,dao:game.players[0].dao,wins:game.players[0].wins,players:game.players.length,records:game.records});localStorage.setItem('shuoWangHistory',JSON.stringify(history.slice(0,20)));
}

const tutorialSteps=[
  {title:'三牌定强弱',body:'每回合你拥有一张明牌、一张暗牌，再与桌面公共牌组成牌组。牌面的右上角数字就是日期相加后的基础牌力。',demo:'<span class="formula">明牌 ＋ 暗牌 ＋ 公共牌</span>'},
  {title:'先辨明暗',body:'明牌对全席公开，暗牌只有你能看到。观察对手的明牌、余道与下注行为，判断他是在示强还是诈唬。',demo:'明牌 · 全席可见　　暗牌 · 仅你可见'},
  {title:'朔月逐强',body:'第 1 至 4 回合，三张牌的牌力总和越大越强。若总和相同，则先比较暗牌，再比较明牌。',demo:'朔月：总和越大，牌组越强'},
  {title:'满月忌盈',body:'第 5 至 8 回合会公布当回合月限，最接近且不超过月限者获胜。超过月限会成为蚀月并失去通常的摊牌资格。',demo:'满月：月限依次为 44、48、52、56'},
  {title:'把选择留到关键处',body:'每局有两次“易牌”，只能在本回合首次下注前更换明牌。下注依席位轮流进行，可持续加注，直到所有人跟住或弃权。',demo:'易牌 × 2　·　加注次数不限'},
  {title:'守住最后的道',body:'可用的道降到 0 会进入“道尽·待判”，你仍参与本回合拼点。若赢得本回合月盘则保留资格；若没有赢得道，则在回合结束时直接淘汰。',demo:'道尽 → 拼点 → 胜者保留，败者淘汰'},
  {title:'满月技能牌',body:'第 5 至 8 回合，轮到你时可以抽取一次技能：易牌、换牌、透视、加牌或送牌。技能会改变信息与牌组，也可能让总和超过当回合月限。',demo:'满月回合 · 每回合抽取一次'}
];
let tutorialIndex=0;
function openTutorial(index=0){tutorialIndex=index;renderTutorial();if(!$('#tutorial-dialog').open)$('#tutorial-dialog').showModal();}
function renderTutorial(){const s=tutorialSteps[tutorialIndex];$('#tutorial-title').textContent=s.title;$('#tutorial-body').textContent=s.body;$('#tutorial-demo').innerHTML=s.demo;$('#tutorial-progress').innerHTML=tutorialSteps.map((_,i)=>`<i class="${i<=tutorialIndex?'active':''}"></i>`).join('');$('#tutorial-next').textContent=tutorialIndex===tutorialSteps.length-1?'开始对局':'下一步';}
function closeTutorial(){localStorage.setItem('shuoWangTutorialSeen','1');$('#tutorial-dialog').close();}

const skillCards=[
  {name:'易牌',symbol:'易',description:'立即更换自己的明牌。'},
  {name:'换牌',symbol:'换',description:'选择一名角色，与其互换一张明牌或暗牌。'},
  {name:'透视',symbol:'视',description:'查看一名角色本回合的暗牌。'},
  {name:'加牌',symbol:'加',description:'为自己额外抽取一张暗牌，结算时计入总牌力。'},
  {name:'送牌',symbol:'送',description:'将自己的当前明牌送到指定角色的明牌区，自己补抽一张明牌。'}
];
let pendingSkill=null;
function drawSkill(){
  if(game.round<5||game.skillUsed)return;game.skillUsed=true;pendingSkill={...skillCards[Math.floor(Math.random()*skillCards.length)],targetId:null,zone:null};
  $('#skill-title').textContent=pendingSkill.name;$('#skill-art').innerHTML=`<div class="skill-symbol">${pendingSkill.symbol}</div>`;$('#skill-description').textContent=pendingSkill.description;
  const targets=game.players.filter(p=>!p.out&&!p.human);let targetHtml='';
  if(pendingSkill.name==='换牌')targetHtml=`<div class="skill-target-list">${targets.flatMap(p=>['visible','hidden'].map(zone=>`<button data-target="${p.id}" data-zone="${zone}">${p.name} · ${zone==='visible'?'明牌':'暗牌'}</button>`)).join('')}</div>`;
  if(pendingSkill.name==='透视'||pendingSkill.name==='送牌')targetHtml=`<div class="skill-target-list">${targets.map(p=>`<button data-target="${p.id}">${p.name}</button>`).join('')}</div>`;
  $('#skill-targets').innerHTML=targetHtml;$$('#skill-targets button').forEach(b=>b.onclick=()=>{$$('#skill-targets button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');pendingSkill.targetId=b.dataset.target;pendingSkill.zone=b.dataset.zone||null;});
  $('#skill-discard').style.display='inline-block';$('#skill-discard').textContent=pendingSkill.name==='加牌'?'放弃此牌':'放弃技能';$('#skill-confirm').textContent=pendingSkill.name==='加牌'?'保留这张暗牌':'使用技能';
  $('#skill-dialog').showModal();renderActions();
}
function applySkill(){
  if(!pendingSkill)return;const h=game.players[0],target=game.players.find(p=>p.id===pendingSkill.targetId),needsTarget=['换牌','透视','送牌'].includes(pendingSkill.name);if(needsTarget&&!target){announce('请先选择一名角色');return;}
  if(pendingSkill.name==='易牌'){const old=h.visible;h.visible=game.drawPile.shift();setCard($('#visible-card'),h.visible);log(`技能·易牌：${old.name} → ${h.visible.name}`);}
  if(pendingSkill.name==='换牌'){const zone=pendingSkill.zone||'visible';[h[zone],target[zone]]=[target[zone],h[zone]];setCard($('#visible-card'),h.visible);setCard($('#hidden-card'),h.hidden);log(`技能·换牌：你与 ${target.name} 互换${zone==='visible'?'明牌':'暗牌'}`);}
  if(pendingSkill.name==='透视'){game.visionTarget=target;log(`技能·透视：${target.name} 的暗牌是 ${target.hidden.name}（${target.hidden.value}）`);announce(`${target.name} 暗牌已揭示`);}
  if(pendingSkill.name==='加牌'){const card=game.drawPile.shift();h.hiddenExtras.push(card);log(`技能·加牌：暗牌区增加 ${card.name}（${card.value}）`);announce(`额外暗牌已叠放 · 鼠标悬停查看`);}
  if(pendingSkill.name==='送牌'){const sent=h.visible;target.visibleExtras.push(sent);h.visible=game.drawPile.shift();setCard($('#visible-card'),h.visible);log(`技能·送牌：${sent.name} 送入 ${target.name} 的明牌区`);}
  const showVision=pendingSkill.name==='透视';$('#skill-dialog').close();pendingSkill=null;renderBoard();renderExtraHidden();renderActions();if(showVision)setTimeout(()=>openPanel('vision'),180);
}
function discardSkill(){if(!pendingSkill)return;log(`你放弃了技能牌：${pendingSkill.name}`);announce(`技能牌已放弃 · 本回合不再抽取`);$('#skill-dialog').close();pendingSkill=null;$('#skill-discard').style.display='none';$('#skill-confirm').textContent='确认';renderActions();}

function openPanel(type){
  let html=''; const history=JSON.parse(localStorage.getItem('shuoWangHistory')||'[]');
  if(type==='records')html=`<h2>月下战绩</h2>${history.length?`<table><tr><th>时间</th><th>人数</th><th>名次</th><th>余道</th></tr>${history.map(h=>`<tr><td>${h.date}</td><td>${h.players}</td><td>第 ${h.rank}</td><td>${h.dao}</td></tr>`).join('')}</table>`:'<p>尚无对局记录。</p>'}`;
  if(type==='atlas')html=`<h2>节序图鉴</h2><p>已收录 36 张牌：二十四节气与十二传统节日。</p><table>${deck.map(c=>`<tr><td>${c.category}</td><td>${c.name}</td><td>${cnMonth[c.month]}${cnDay(c.day)}</td></tr>`).join('')}</table>`;
  if(type==='cardref')html=`<h2>牌力排行 · 从大到小</h2><div class="ledger-rules"><span>基础牌力 = 月份 + 日期</span><span>${game&&game.round>4?`本回合月限 ${game.moonLimit}`:'朔月：总和越大越强'}</span></div><div class="ledger-table">${[...deck].sort((a,b)=>b.value-a.value).map(c=>`<div class="ledger-item"><strong>${c.name}</strong><span>${cnMonth[c.month]}${cnDay(c.day)}</span><b>${c.value}</b></div>`).join('')}</div>`;
  if(type==='vision'&&game.visionTarget){const p=game.visionTarget;html=`<h2>透视 · ${p.name}</h2><p>本回合暗牌</p><div class="card" style="margin:28px auto">${cardHTML(p.hidden)}</div><p style="text-align:center">${p.hidden.name} · 基础牌力 ${p.hidden.value}</p>`;}
  if(type==='notes')html=`<h2>观月札记</h2><p>牌名之下的日期并非装饰。前三牌相会，数理隐于月相。</p><textarea id="moon-note" maxlength="300" placeholder="记下你的推断……">${localStorage.getItem('shuoWangNote')||''}</textarea>`;
  if(type==='profile')html=`<h2>${$('#player-name').value||'月下客'}</h2><p>当前角色：${characters[charIndex].title}</p><p>总对局 ${history.length}　·　获胜 ${history.filter(h=>h.rank===1).length}　·　胜率 ${history.length?Math.round(history.filter(h=>h.rank===1).length/history.length*100):0}%</p><p>排位赛：尚未定级</p>`;
  if(type==='review'&&game)html=`<h2>月局复盘</h2><table><tr><th>回合</th><th>月相</th><th>公共牌</th><th>月盘</th><th>赢家</th></tr>${game.records.map(r=>`<tr><td>${r.round}</td><td>${r.phase}</td><td>${r.public}</td><td>${r.pot}</td><td>${r.winners}</td></tr>`).join('')}</table>`;
  $('#panel-content').innerHTML=html;$('#side-panel').showModal(); const note=$('#moon-note');if(note){note.style.cssText='width:100%;height:150px;background:#07100f;color:#dce8df;border:1px solid #526a61;padding:12px';note.oninput=()=>localStorage.setItem('shuoWangNote',note.value);}
}

$('#guest-login').onclick=()=>{$('#home-name').textContent=$('#player-name').value||'月下客';unlockAudio();sfx('turn');showScreen('home-screen')};
$('#start-game').onclick=()=>{switchMusic('battle');showScreen('select-screen')};$$('.back-home').forEach(b=>b.onclick=()=>{switchMusic('home');showScreen('home-screen')});
$('#char-prev').onclick=()=>{charIndex=(charIndex+characters.length-1)%characters.length;renderCharacter()};$('#char-next').onclick=()=>{charIndex=(charIndex+1)%characters.length;renderCharacter()};
$('#ai-count').oninput=e=>$('#ai-count-label').textContent=e.target.value;$$('#difficulty button').forEach(b=>b.onclick=()=>{$$('#difficulty button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');difficulty=b.dataset.value});
$('#confirm-seat').onclick=newGame;$$('[data-action]').forEach(b=>b.onclick=()=>playerAction(b.dataset.action));$('#raise-amount').oninput=e=>$('#raise-label').textContent=`+${e.target.value}`;
$('#next-round').onclick=()=>{$('#round-dialog').close();startRound()};$('#view-toggle').onclick=()=>$('#game-board').classList.toggle('overhead');$('#game-exit').onclick=()=>{game=null;switchMusic('home');showScreen('home-screen')};
$('#ledger-open').onclick=()=>openPanel('cardref');$('#tutorial-open').onclick=()=>openTutorial(0);$('#tutorial-next').onclick=()=>{if(tutorialIndex<tutorialSteps.length-1){tutorialIndex++;renderTutorial()}else closeTutorial()};$('#tutorial-skip').onclick=closeTutorial;
$('#skill-confirm').onclick=applySkill;
$('#skill-discard').onclick=discardSkill;
$$('[data-risk]').forEach(button=>button.onclick=()=>{if(!game||game.round<5||game.riskChoice!==null)return;const value=button.dataset.risk;game.riskChoice=value;game.riskActive=true;game.riskRound=game.round;game.riskDelta=Number(value);game.awaitingRisk=false;$('#risk-dialog').close();$('#risk-status').textContent='赌命中';log('你选择赌命');announce('系统播报：有人选择赌命');renderBoard();renderActions();setTimeout(advanceTurn,500)});
$$('[data-swap-zone]').forEach(button=>button.onclick=()=>applySwap(button.dataset.swapZone));
$('#return-home').onclick=()=>{switchMusic('home');showScreen('home-screen')};$('#review-game').onclick=()=>openPanel('review');$$('.home-nav button').forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));$('#profile-open').onclick=()=>openPanel('profile');$('.dialog-close').onclick=()=>$('#side-panel').close();
$('#sound-toggle').onclick=()=>{audioOn=!audioOn;$('#sound-toggle').textContent=audioOn?'♪':'×';if(audioOn){unlockAudio();switchMusic(game&&game.round>=5?'full':game&&game.round>0?'battle':'home');sfx('turn')}else stopAmbient();};
document.addEventListener('pointerdown',()=>{if(audioOn)unlockAudio()},{once:true});
renderCharacter();initSky();
