const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const {characters,deck,cnMonth,cnDay}=GameData;

function createPlayerState(player){return {...player,charSkillUsed:false,lockedZone:null,charScoreDelta:0,charScoreRound:null,breakTargetIds:[],raiseBlockedActions:0,skillIntelTargetIds:[],branchRecoveries:0,covenantUsed:false,eagleLastTargetId:null,eagleStreak:0,trackedSkillIds:[],moonSwapAwards:0,moonSwaps:0,eliminatedRound:null};}

let charIndex = 0;
let difficulty = '弦月';
let gameSpeed=localStorage.getItem('shuoWangSpeed')||'standard';
let audioOn = true;
let game = null;
let operationBusy=false;
let audioState = {ctx:null,master:null,ambient:null};
let musicState = {name:null,audio:null};
const musicTracks={home:{src:'audio-options/01-cold-moon-water.wav',volume:.78,rate:1.1},battle:{src:'audio-options/02-bamboo-shadow.wav',volume:.62,rate:1.12},full:{src:'audio-options/03-lantern-court.wav',volume:.8,rate:1.2}};
const scheduler=GameRuntime.createScheduler(()=>gameSpeed);
const schedule=(callback,delay)=>scheduler.schedule(callback,delay);

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
function sealOverlayHTML(){return '<span class="moon-seal" aria-hidden="true"><i class="seal-halo"></i><i class="seal-orbit orbit-one"></i><i class="seal-orbit orbit-two"></i><i class="seal-moon"><b>封</b></i><i class="seal-talisman"></i><em>牌力归零</em></span>';}
function renderSealOverlay(el,active){el.querySelector('.moon-seal')?.remove();if(active){const corner=el.querySelector('.power-corner');if(corner)corner.textContent='0';el.insertAdjacentHTML('beforeend',sealOverlayHTML());}}
function announce(text){ const el=$('#announcement'); el.textContent=text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
function showOutcome(title,detail,duration=2200){const el=$('#effect-result');if(!el)return;$('#effect-result-title').textContent=title;$('#effect-result-detail').textContent=detail;el.classList.add('show');schedule(()=>el.classList.remove('show'),duration);}
function trackedSkillDirection(player){if(!player.charSkillUsed)return '本回合尚未使用主动技能';if(player.char.skill.name==='借月')return `借月方向：${player.charScoreDelta>0?'增加':player.charScoreDelta<0?'减少':'不变'}`;if(player.char.skill.name==='断势')return `断势目标：${player.breakTargetIds?.map(id=>game.players.find(p=>p.id===id)?.name).filter(Boolean).join('、')||'已结算'}`;return `${player.char.skill.name} 本回合已使用`;}

function initSky(){
  const canvas=$('#sky'), ctx=canvas.getContext('2d'); let stars=[];
  function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);stars=Array.from({length:85},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight*.72,r:Math.random()*1.2,a:Math.random(),v:.002+Math.random()*.005}));}
  function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);for(const s of stars){s.a+=s.v;if(s.a>1||s.a<.15)s.v*=-1;ctx.fillStyle=`rgba(210,228,218,${s.a})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}requestAnimationFrame(draw)}
  addEventListener('resize',resize);resize();draw();
}

function renderCharacter(){ const c=characters[charIndex]; $('#character-glyph').innerHTML=`<img src="${c.portrait}" alt="${c.title}">`; $('#character-glyph').style.background=c.color; $('#character-title').textContent=c.title; $('#character-name').textContent=c.name; $('#character-trait').textContent=c.trait; $('#character-skill-name').textContent=c.skill.name; $('#character-skill-summary').textContent=c.skill.description.replace('每回合一次。',''); }
function applyTheme(theme){const selected=theme==='imperial'?'imperial':'moon-court';document.body.dataset.theme=selected;localStorage.setItem('shuoWangTheme',selected);$$('[data-theme-choice]').forEach(button=>button.classList.toggle('selected',button.dataset.themeChoice===selected));const quick=$('#theme-quick-toggle');if(quick){quick.textContent=selected==='imperial'?'庭':'漆';quick.title=selected==='imperial'?'切换为原有月庭':'切换为宫灯漆金';}}
const speedLabels={immersive:'沉浸',standard:'标准',fast:'快速'};
function applySpeed(speed){gameSpeed=GameRuntime.SPEEDS[speed]?speed:'standard';document.body.dataset.speed=gameSpeed;localStorage.setItem('shuoWangSpeed',gameSpeed);$$('[data-speed]').forEach(button=>button.classList.toggle('selected',button.dataset.speed===gameSpeed));const quick=$('#speed-quick-toggle');if(quick){quick.textContent={immersive:'沉',standard:'标',fast:'快'}[gameSpeed];quick.title=`当前${speedLabels[gameSpeed]}节奏，点击切换`;}}
function clearCharacterSkillEffect(){const cinema=$('#skill-cinema');if(!cinema)return;cinema.className='skill-cinema';cinema.setAttribute('aria-hidden','true');}
function playCharacterSkillEffect(name,player,onComplete){const cinema=$('#skill-cinema');if(!cinema){onComplete?.();return;}const lines={封月:'月门合璧 · 此牌点数沉寂',镇岳:'山势镇盘 · 跟注减免一道',回枝:'枯木逢月 · 三道归身',鹰瞰:'雪羽开瞳 · 暗牌入眼',断势:'朱痕断路 · 只许跟弃',借月:'双月错位 · 盈亏藏锋',撼岳:'山门对峙 · 应战或退让',同契:'双签映月 · 同行或相背',逐寂:'孤影收势 · 道归夜岚'};clearCharacterSkillEffect();const factor=GameRuntime.SPEEDS[gameSpeed]||1,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;cinema.style.setProperty('--skill-duration',reduced?'1s':`${2.1*factor}s`);cinema.classList.add('active',`skill-${name}`);cinema.setAttribute('aria-hidden','false');$('#skill-cinema-owner').textContent=player?.name||'';$('#skill-cinema-name').textContent=name;$('#skill-cinema-line').textContent=lines[name]||'月律响应';sfx(name==='断势'?'raise':name==='回枝'?'win':'showdown');schedule(()=>{clearCharacterSkillEffect();onComplete?.();},reduced?1000/factor:2100);}
function setOperationBusy(busy){operationBusy=busy;document.body.classList.toggle('operation-busy',busy);if(game)renderActions();}
function runEffectSequence(steps,onComplete){const queue=[...steps];const next=()=>{const step=queue.shift();if(!step){onComplete?.();return;}step(next);};next();}
function clearCardSkillEffect(){const cinema=$('#card-skill-cinema');if(!cinema)return;cinema.className='card-skill-cinema';cinema.setAttribute('aria-hidden','true');$('#game-screen').classList.remove('card-skill-playing');}
function effectCard(card,back=false,label=''){return `<div class="effect-card${back?' back':''}">${label?`<small>${label}</small>`:''}${back?'<b>月</b>':`<b>${card?.name||'新牌'}</b><span>${card?.value??'?'}</span>`}</div>`;}
function playCardSkillEffect(name,payload,onMidpoint,onComplete){
  const cinema=$('#card-skill-cinema');if(!cinema){onMidpoint();onComplete?.();return;}
  const copy={易牌:'旧序退场 · 新牌落位',换牌:'双牌易位 · 月轨交错',透视:'月镜巡照 · 暗纹显形',加牌:'月库启封 · 暗牌入列',送牌:'一牌渡席 · 明牌相赠'}[name];
  const old=payload.oldCard,target=payload.target,newCard=payload.newCard,zone=payload.zone;
  let art='';
  if(name==='易牌')art=`${effectCard(old,false,'原明牌')}${effectCard(newCard,false,'新明牌')}`;
  if(name==='换牌')art=`${effectCard(old,false,`你的${zone==='hidden'?'暗牌':'明牌'}`)}<i class="exchange-mark">换</i>${effectCard(payload.targetCard,zone==='hidden',`${target.name} · ${zone==='hidden'?'暗牌':'明牌'}`)}`;
  if(name==='透视')art=`${effectCard(payload.targetCard,true,`${target.name} · 暗牌`)}<i class="scan-line"></i>`;
  if(name==='加牌')art=`<div class="effect-deck">月库</div>${effectCard(newCard,true,'新增暗牌')}<div class="effect-stack">暗牌区</div>`;
  if(name==='送牌')art=`${effectCard(old,false,'送出的明牌')}<i class="send-path"></i><div class="effect-target">${target.name}</div>${effectCard(newCard,false,'补抽明牌')}`;
  clearCardSkillEffect();$('#card-skill-name').textContent=name;$('#card-skill-line').textContent=copy;$('#card-skill-stage').innerHTML=art;cinema.classList.add('active',`effect-${name}`);cinema.setAttribute('aria-hidden','false');$('#game-screen').classList.add('card-skill-playing');
  const factor=GameRuntime.SPEEDS[gameSpeed]||1,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?420:Math.round(1500*factor);cinema.style.setProperty('--card-skill-duration',`${duration}ms`);sfx(name==='透视'?'showdown':'deal');schedule(onMidpoint,duration*.48);schedule(()=>{clearCardSkillEffect();onComplete?.();},duration);
}
function skillUnavailableReason(player){if(!game||!player)return '尚未入局';if(player.charSkillUsed)return '本回合已使用';if(player.char.skill.name==='同契'&&player.covenantUsed)return '同契本局已经使用';if(game.pendingDuel)return '道尽对决期间禁用';if(game.currentTurnId!==player.id)return '等待你的行动回合';if(player.pendingOut)return '道尽后不可发动';return '可以发动 · 无负面效果';}
function renderRoundGuide(){if(!game)return;const human=game.players[0],owed=Math.max(0,game.highBet-human.bet),score=scoredPower(human);$('#guide-power').textContent=score;$('#guide-rule').textContent=game.round<=4?'朔月：总点数越大越强':score>game.moonLimit?`已超过月限 ${game.moonLimit}，当前会蚀月`:`满月：距离月限 ${game.moonLimit} 还差 ${game.moonLimit-score} 点`;$('#guide-call').textContent=owed?`跟注需要 ${owed} 道${human.callDiscountArmed?`，镇岳可减免 ${human.callDiscountValue} 道`:''}`:'当前无需补道，可以观望';const privateDelta=human.charScoreRound===game.round?` · 本回合 ${human.charScoreDelta>0?'+':''}${human.charScoreDelta} 点`:'';$('#guide-skill').textContent=`${human.char.skill.name}：${skillUnavailableReason(human)}${privateDelta}`;}
function updateMoonIcon(){if(!game)return;const fill=Math.min(100,game.round<=5?game.round*20:100);$('#phase-moon').style.background=`linear-gradient(90deg,#e4eadc 0 ${fill}%,#0b1817 ${fill}% 100%)`;$('#phase-moon').classList.toggle('is-full',fill===100);}
function renderExtraHidden(){const wrap=$('#extra-hidden');if(!wrap||!game)return;const extras=game.players[0].hiddenExtras||[],hand=wrap.closest('.hand-card');hand.classList.toggle('has-extras',extras.length>0);hand.style.setProperty('--extra-count',extras.length);wrap.innerHTML=extras.map((c,i)=>`<button type="button" class="extra-hidden-card" aria-label="额外暗牌 ${i+1}：${c.name}，牌力 ${c.value}" style="--extra-index:${i};--extra-tilt:${i*2-3}deg"><span>加暗 ${i+1}</span><b>${c.value}</b><em>${c.name}</em></button>`).join('');}

function newGame(){
  scheduler.cancelAll();
  const aiCount=+$ ('#ai-count').value;
  const aiChars=shuffle(characters.filter((_,i)=>i!==charIndex)).slice(0,aiCount);
  const human=createPlayerState({id:'human',name:$('#player-name').value||'月下客',char:characters[charIndex],human:true,dao:20,reserved:2,wins:0,lastWin:0});
  const styles=['谨慎','激进','观察'];
  game={round:0,potCarry:0,swaps:2,riskChoice:null,riskActive:false,riskRound:null,riskDelta:0,awaitingRisk:false,players:[human,...aiChars.map((c,i)=>createPlayerState({id:`ai${i}`,name:c.name,char:c,human:false,style:styles[i%3],dao:20,reserved:2,wins:0,lastWin:0}))],records:[],maxPot:0,active:true};
  showScreen('game-screen'); startRound();
  if(!localStorage.getItem('shuoWangTutorialSeen')) schedule(()=>openTutorial(0),650);
}

function showFullMoonSequence(){
  const cinema=$('#full-moon-cinema');cinema.classList.remove('active');void cinema.offsetWidth;cinema.classList.add('active');announce(`系统播报：满月升起 · 本回合月限 ${game.moonLimit}`);sfx('showdown');
}

function startRound(){
  scheduler.cancelAll();
  clearCharacterSkillEffect();
  clearCardSkillEffect();
  const living=game.players.filter(p=>!p.out);if(living.length<=1||game.round>=8){finishGame();return;}
  game.round++;game.resolving=false;game.earlyWinner=null;$('#game-board').classList.remove('overhead'); const cards=shuffle(deck), phase=game.round<=4?'朔月':'满月'; game.drawPile=cards.slice(game.players.length*2+1);
  game.public=cards[game.players.length*2];game.visionTargets=[];game.visionTarget=null;game.pot=game.potCarry;game.highBet=1;game.actionCount=0;game.skillUsed=false;game.currentTurnId=null;game.pendingDuel=false;game.moonLimit=game.round>4?[44,48,52,56][game.round-5]:null;
  game.players.forEach((p,i)=>{p.visible=cards[i*2];p.hidden=cards[i*2+1];p.hiddenExtras=[];p.visibleExtras=[];p.roundEliminated=false;p.charSkillUsed=false;p.lockedZone=null;p.charScoreDelta=0;p.charScoreRound=null;p.breakTargetIds=[];p.raiseBlockedActions=0;p.skillIntelTargetIds=[];p.moonSwapAwards=0;p.moonSwaps=0;p.bet=0;if(p.out){p.folded=true;p.status='已出局';return;}p.folded=false;if(p.dao<=0){p.pendingOut=true;p.status='道尽·待判';return;}p.pendingOut=false;p.status='候场';p.dao--;p.bet=1;game.pot++;if(p.dao===0){p.pendingOut=true;p.status='道尽·待判';}if(p.char.skill.passiveName==='逐月'&&GameRules.moonAligned(p,game.public)){p.moonSwapAwards=1;p.moonSwaps=1;}});
  $('#round-number').textContent=game.round;$('#phase-name').textContent=phase;$('#moon-limit').textContent=game.moonLimit?`月限 ${game.moonLimit}`:'';$('#risk-status').textContent=game.riskActive?'赌命中':'';if(game.players[0].moonSwaps)game.players[0].status='逐月共鸣 · 获得额外易牌 1/2';updateMoonIcon();
  $('#game-screen').classList.toggle('full-phase',game.round>4);if(game.round<5)$('#full-moon-cinema').classList.remove('active');setCard($('#public-card'),game.public);setCard($('#visible-card'),game.players[0].visible);setCard($('#hidden-card'),game.players[0].hidden);
  const active=game.players.filter(p=>!p.out&&!p.folded&&!p.pendingOut);if(game.players.some(p=>p.pendingOut&&!p.out))game.pendingDuel=true;game.needsAction=new Set(active.map(p=>p.id));const starter=active.sort((a,b)=>b.visible.value-a.visible.value)[0];game.turnIndex=starter?game.players.indexOf(starter)-1:0;
  $('#action-log').innerHTML=''; log(`仍在场者投入 1 道，月盘共 ${game.pot} 道`); renderBoard(true); renderActions();renderExtraHidden();sfx('deal');schedule(()=>sfx('dao'),180);
  announce(game.round===5?'第五月 · 满月｜月律已变':`第${game.round}回 · ${phase}`);
  game.awaitingRisk=false;if(game.round===5){switchMusic('full');showFullMoonSequence();schedule(advanceTurn,6500)}else{if(game.round===1)switchMusic('battle');schedule(advanceTurn,1800)}
}

function renderBoard(animateDao=false){
  const seats=$('#seats'); seats.innerHTML='';const rivals=game.players.filter(p=>!p.human),layouts={2:[[25,25],[75,25]],3:[[18,38],[50,17],[82,38]],4:[[12,45],[36,18],[64,18],[88,45]],5:[[10,47],[28,24],[50,15],[72,24],[90,47]]};
  game.players.forEach(p=>{let x,y;if(p.human){x=9;y=76}else{const pos=(layouts[rivals.length]||layouts[5])[rivals.indexOf(p)];[x,y]=pos;}const el=document.createElement('div');el.dataset.playerId=p.id;el.className=`seat${p.human?' human-seat':''}${p.folded?' folded':''}${p.out?' out':''}${p.pendingOut?' pending-out':''}${game.currentTurnId===p.id?' current-turn':''}`;el.style.left=`${x}%`;el.style.top=`${y}%`;const effect=p.lockedZone?`封月·${p.lockedZone==='visible'?'明牌归零':'暗牌归零'}`:p.raiseBlockedActions>0?`断势中 · ${p.breakSourceName||'夜岚'}施加`:p.breakTargetIds?.length?'断势待发':'';const skillState=characterSkillStatus(p);el.innerHTML=`<div class="seat-avatar"><img src="${p.char.portrait}" alt="${p.char.title}"></div><button type="button" class="character-skill-badge${p.charSkillUsed?' used':''}${effect?' active':''}" data-skill-player="${p.id}" title="${p.char.skill.name} · ${skillState}" aria-label="查看 ${p.name} 的技能 ${p.char.skill.name}，${skillState}">${p.char.skill.symbol}</button><div class="seat-name">${p.name}${p.human?' · 你':''}</div><div class="seat-stats">${p.dao} 道 · 已注 ${p.bet}</div><span class="seat-status">${effect||p.status}</span>${p.human&&game.riskActive?'<span class="risk-call">我要赌命</span>':''}${!p.human&&p.visible?`<div class="seat-visible${p.lockedZone==='visible'?' sealed-card':''}"><small>明牌</small><b>${p.visible.name}</b><span>${p.lockedZone==='visible'?0:p.visible.value}</span>${p.lockedZone==='visible'?sealOverlayHTML():''}</div>${(p.visibleExtras||[]).map(c=>`<div class="seat-extra-visible"><b>${c.name}</b> · ${c.value}</div>`).join('')}`:''}${game.currentTurnId===p.id&&!p.human?'<i class="thinking-bar"></i>':''}`;seats.appendChild(el); });
  $('#pot-value').textContent=game.pot;$('#current-bet').textContent=game.players[0].bet;$('#dao-left').textContent=game.players[0].dao;
  $('#visible-card').classList.toggle('sealed-card',game.players[0].lockedZone==='visible');$('#hidden-card').classList.toggle('sealed-card',game.players[0].lockedZone==='hidden');renderSealOverlay($('#visible-card'),game.players[0].lockedZone==='visible');renderSealOverlay($('#hidden-card'),game.players[0].lockedZone==='hidden');
  const pile=$('#dao-pile');pile.innerHTML='';for(let i=0;i<Math.min(game.pot,30);i++){const t=document.createElement('i');t.className=`dao-token${animateDao?' animate':''}`;t.style.left=`${38+(i*17)%24}%`;t.style.top=`${48+(i*11)%27}%`;t.style.animationDelay=`${i*.025}s`;pile.appendChild(t)}
}

function renderActions(){
  const h=game.players[0], owed=Math.max(0,game.highBet-h.bet),myTurn=game.currentTurnId===h.id&&!h.out&&!h.folded&&!h.pendingOut;
  const legal=new Set(GameRules.legalActions(h,{currentTurnId:game.currentTurnId,highBet:game.highBet,pendingDuel:game.pendingDuel}));
  $('[data-action="fold"]').disabled=!legal.has('fold');$('#check-action').disabled=!legal.has('check');$('[data-action="call"]').disabled=!legal.has('call');$('[data-action="raise"]').disabled=!legal.has('raise');$('[data-action="allin"]').disabled=!legal.has('allin');
  $('#swap-action').disabled=!myTurn||game.pendingDuel||(h.moonSwaps<=0&&(game.round>4||game.swaps===0)); $('#swap-left').textContent=game.swaps+h.moonSwaps;$('#skill-action').disabled=!myTurn||game.pendingDuel||game.skillUsed;$('#risk-action').disabled=!myTurn||game.pendingDuel||game.round<5||game.riskChoice!==null;
  $('#character-skill-action').disabled=!myTurn||!canUseCharacterSkill(h);
  $('#character-skill-action').title=skillUnavailableReason(h);
  $('#raise-amount').max=Math.min(3,Math.max(1,h.dao-owed));
  const intel=$('#intel-open');if(intel)intel.hidden=!(game.visionTargets?.length||game.visionTarget);
  if(operationBusy)$$('#action-bar button, #action-bar input').forEach(control=>control.disabled=true);
  renderRoundGuide();
}
function log(text){const p=document.createElement('p');p.textContent=text;$('#action-log').prepend(p);}

let inspectedCharacterPlayer=null;
let pendingCharacterChoice=null;
function canUseCharacterSkill(p){
  if(!game||!p||p.charSkillUsed||game.pendingDuel||game.currentTurnId!==p.id||p.out||p.folded||p.pendingOut)return false;
  if(p.char.skill.name==='同契'&&p.covenantUsed)return false;
  return p.char.skill.name==='借月'||game.players.some(x=>x!==p&&!x.out&&!x.folded);
}
function characterSkillStatus(p){
  if(p.lockedZone)return `封月生效 · ${p.lockedZone==='visible'?'明牌':'暗牌'}本回合不计分`;
  if(p.raiseBlockedActions>0)return '生效中 · 下一次只能跟注或弃权';
  if(p.char.skill.name==='同契'&&p.covenantUsed)return '同契本局已使用';
  if(p.charSkillUsed)return '本回合主动技能已使用';
  return `主动技能可用 · 被动「${p.char.skill.passiveName}」持续生效`;
}
function openCharacterSkill(player,activate=false){
  if(!player)return;inspectedCharacterPlayer=player;pendingCharacterChoice=null;const skill=player.char.skill;
  $('#character-skill-title').textContent=`${player.char.title} · ${skill.name}`;$('#character-skill-art').innerHTML=`<div class="skill-symbol">${skill.symbol}</div>`;$('#character-skill-description').textContent=skill.description;$('#character-skill-state').textContent=characterSkillStatus(player);
  let options='';
  const activePlayers=game?.players.filter(p=>!p.out&&!p.folded)||[];
  if(activate&&skill.name==='封月')options=`<div class="skill-target-list">${activePlayers.flatMap(p=>['visible','hidden'].map(zone=>`<button data-character-choice="${p.id}|${zone}">${p.human?'你':p.name} · ${zone==='visible'?'明牌':'暗牌'}</button>`)).join('')}</div>`;
  if(activate&&['撼岳','同契','鹰瞰','断势'].includes(skill.name))options=`<div class="skill-target-list">${activePlayers.filter(p=>p!==player).map(p=>`<button data-character-choice="${p.id}">${p.name}${skill.name==='鹰瞰'?' · 暗牌':''}</button>`).join('')}</div>${skill.name==='断势'?'<p class="skill-hint">选择后，你的下一次加注会触发断势。</p>':''}`;
  if(activate&&skill.name==='借月')options=`<div class="borrow-moon-control"><div><span>-5</span><b id="borrow-moon-output">0</b><span>+5</span></div><input id="borrow-moon-value" type="range" min="-5" max="5" step="1" value="0" aria-label="选择借月牌力修正值"><small>拖动选择本回合的秘密修正值</small></div>`;
  $('#character-skill-options').innerHTML=options;$$('#character-skill-options button').forEach(b=>b.onclick=()=>{$$('#character-skill-options button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');pendingCharacterChoice=b.dataset.characterChoice;});
  const borrowInput=$('#borrow-moon-value');if(borrowInput){pendingCharacterChoice='0';borrowInput.oninput=()=>{pendingCharacterChoice=borrowInput.value;const value=Number(borrowInput.value);$('#borrow-moon-output').textContent=value>0?`+${value}`:`${value}`;};}
  const confirm=$('#character-skill-confirm');confirm.hidden=!(activate&&canUseCharacterSkill(player));if(!confirm.hidden)confirm.textContent=skill.name==='断势'?'选择目标':'发动';
  if(!$('#character-skill-dialog').open)$('#character-skill-dialog').showModal();
}
function activateCharacterSkill(){
  const p=inspectedCharacterPlayer;if(!canUseCharacterSkill(p))return;const name=p.char.skill.name;let feedback='';
  if(pendingCharacterChoice===null){announce('请先完成技能选择');return;}
  if(name==='封月'){const [targetId,zone]=pendingCharacterChoice.split('|'),target=game.players.find(x=>x.id===targetId);target.lockedZone=zone;feedback=`${target.name} 的${zone==='visible'?'明牌':'暗牌'}已封锁，本回合按 0 点计算`;log(`${p.name} 发动封月，${feedback}`);}
  if(name==='撼岳')resolveMountainChallenge(p,game.players.find(x=>x.id===pendingCharacterChoice));
  if(name==='同契'){p.covenantUsed=true;startCovenant(p,game.players.find(x=>x.id===pendingCharacterChoice));}
  if(name==='鹰瞰'){const target=game.players.find(x=>x.id===pendingCharacterChoice);p.skillIntelTargetIds=[target.id];game.visionTargets=[target];if(p.eagleLastTargetId===target.id)p.eagleStreak++;else p.eagleStreak=1;p.eagleLastTargetId=target.id;if(p.eagleStreak>=2&&!p.trackedSkillIds.includes(target.id))p.trackedSkillIds.push(target.id);feedback=`${target.name} 的暗牌为 ${target.hidden.name}（${target.hidden.value}）${p.eagleStreak>=2?'；追影已建立':''}`;log(`${p.name} 发动鹰瞰，${feedback}`);}
  if(name==='断势'){p.breakTargetIds=[pendingCharacterChoice];log(`${p.name} 已选定断势目标，下一次加注时生效`);}
  if(name==='借月'){p.charScoreDelta+=+pendingCharacterChoice;p.charScoreRound=game.round;feedback=`你的秘密修正为 ${+pendingCharacterChoice>=0?'+':''}${pendingCharacterChoice} 点，仅你可见`;log(`${p.name} 发动借月，方向保持隐秘`);}
  p.charSkillUsed=true;$('#character-skill-dialog').close();announce(`${p.name} 发动 ${name}`);renderBoard();renderActions();if(!['断势','同契','撼岳'].includes(name)){setOperationBusy(true);playCharacterSkillEffect(name,p,()=>schedule(()=>{if(feedback)showOutcome(name,feedback);if(name==='鹰瞰'&&p.human)openPanel('vision');setOperationBusy(false);},500));}
}
function enterPendingOut(player,label='道尽·待判'){if(player.dao>0||player.folded)return;player.pendingOut=true;player.status=label;if(!game.pendingDuel){game.pendingDuel=true;game.needsAction=new Set(GameRules.pendingDuelResponders(game.players,player.id));}else game.needsAction.delete(player.id);}
function resolveMountainChallenge(player,target){if(!target)return;setOperationBusy(true);covenantState={kind:'mountain',player,target};playCharacterSkillEffect('撼岳',player,()=>schedule(()=>openMountainChallenge(),500));}
function openMountainChallenge(){const state=covenantState;if(!state||state.kind!=='mountain')return;const {player,target}=state;$('#covenant-title').textContent=`${player.name} 与 ${target.name} · 撼岳`;$('#covenant-copy').textContent=`${target.name} 面临山门之问：迎锋则双方各投入 1 道；敛势则 ${player.name} 本回合牌力 +3。`;$('#covenant-choices').innerHTML='<button type="button" data-mountain-choice="fight">迎锋<small>双方各投入 1 道</small></button><button type="button" data-mountain-choice="yield">敛势<small>墨岳本回合牌力 +3</small></button>';$('#covenant-choices').hidden=false;$('#covenant-result').hidden=true;$('#covenant-dialog').showModal();$$('[data-mountain-choice]').forEach(button=>button.onclick=()=>finishMountainChallenge(button.dataset.mountainChoice));if(!target.human)schedule(()=>finishMountainChallenge(target.dao>2&&Math.random()<.55?'fight':'yield'),650);}
function finishMountainChallenge(choice){const state=covenantState;if(!state||state.kind!=='mountain')return;const {player,target}=state,canFight=choice==='fight'&&player.dao>0&&target.dao>0;if(canFight){player.dao--;target.dao--;player.bet++;target.bet++;game.pot+=2;game.highBet=Math.max(game.highBet,player.bet,target.bet);enterPendingOut(player);enterPendingOut(target);log(`${target.name} 迎锋，双方各投入 1 道`);}else{player.charScoreDelta+=3;player.charScoreRound=game.round;log(`${target.name} 敛势，${player.name} 本回合牌力 +3`);}$('#covenant-dialog').close();covenantState=null;renderBoard();showOutcome('撼岳结果',canFight?`${target.name} 选择迎锋；${player.name} 与 ${target.name} 各投入 1 道`:`${target.name} 选择敛势；${player.name} 本回合牌力 +3`,2800);setOperationBusy(false);if(!player.human&&game.currentTurnId===player.id)aiDecision(player);}
let covenantState=null;
function startCovenant(player,target){if(!target)return;setOperationBusy(true);const playerChoice=player.human?null:(Math.random()<.5?'同月':'背月'),targetChoice=target.human?null:(Math.random()<.5?'同月':'背月');covenantState={kind:'covenant',player,target,playerChoice,targetChoice};playCharacterSkillEffect('同契',player,()=>schedule(()=>openCovenant(),500));}
function openCovenant(){const state=covenantState;if(!state||state.kind!=='covenant')return;const {player,target}=state;$('#covenant-title').textContent=`${player.name} 与 ${target.name} · 同契`;$('#covenant-copy').textContent=player.human?'秘密选择一枚月签。两人同向则丹枝获胜，相背则对方获胜。':'丹枝向你发起同契，请选择同月或背月。';$('#covenant-choices').innerHTML='<button type="button" onclick="chooseCovenant(\'同月\')">同月<small>心念映照同一轮月</small></button><button type="button" onclick="chooseCovenant(\'背月\')">背月<small>各向月影的两端</small></button>';$('#covenant-choices').hidden=false;$('#covenant-result').hidden=true;$('#covenant-dialog').showModal();if(!player.human&&!target.human)schedule(()=>resolveCovenant(),500);}
function chooseCovenant(choice){if(!covenantState||covenantState.kind!=='covenant')return;if(covenantState.player.human)covenantState.playerChoice=choice;else covenantState.targetChoice=choice;resolveCovenant();}
function resolveCovenant(){const state=covenantState;if(!state||!state.playerChoice||!state.targetChoice)return;const winner=state.playerChoice===state.targetChoice?state.player:state.target,loser=winner===state.player?state.target:state.player;state.winner=winner;state.loser=loser;$('#covenant-choices').hidden=true;$('#covenant-result').hidden=false;$('#covenant-result').innerHTML=`<p><b>${state.player.name}</b> 选择 ${state.playerChoice} · <b>${state.target.name}</b> 选择 ${state.targetChoice}</p><h3>${winner.name} 赢得同契</h3><div class="skill-actions covenant-outcomes"><button class="covenant-outcome fold-outcome" data-covenant-outcome="fold">令其本回合弃权</button><button class="covenant-outcome dao-outcome" data-covenant-outcome="dao">取走 2 道</button></div>`;$$('[data-covenant-outcome]').forEach(button=>button.onclick=()=>finishCovenant(button.dataset.covenantOutcome));if(!winner.human)schedule(()=>finishCovenant(Math.random()<.5?'fold':'dao'),650);}
function finishCovenant(outcome){const {winner,loser,player,playerChoice,targetChoice}=covenantState;if(outcome==='fold'){loser.folded=true;loser.status='同契败北·本回合弃权';game.needsAction.delete(loser.id);}else{const taken=Math.min(2,loser.dao);loser.dao-=taken;winner.dao+=taken;enterPendingOut(loser,'同契失道·待判');}log(`${winner.name} 赢得同契，${outcome==='fold'?`令 ${loser.name} 本回合弃权`:`从 ${loser.name} 取走 2 道`}`);$('#covenant-dialog').close();covenantState=null;renderBoard();showOutcome('同契结果',`${player.name}：${playerChoice}；${player===loser?winner.name:loser.name}：${targetChoice}。${winner.name} 获胜，${outcome==='fold'?`令 ${loser.name} 弃权`:`从 ${loser.name} 取走 2 道`}`,3200);setOperationBusy(false);if(!player.human&&game.currentTurnId===player.id)aiDecision(player);}

function playerAction(type){
  if(operationBusy)return;const h=game.players[0];if(game.currentTurnId!==h.id||h.out||h.pendingOut)return;if(game.pendingDuel&&!['fold','call'].includes(type))return; const owed=Math.max(0,game.highBet-h.bet);
  if(type==='swap'){
    if(h.moonSwaps<=0&&(game.swaps===0||game.round>4))return;$('#swap-dialog-count').textContent=game.swaps+h.moonSwaps;$('#swap-dialog').showModal();return;
  }
  if(type==='skill'){drawSkill();return;}
  if(type==='risk'){openRiskChoice();return;}
  if(type==='character-skill'){openCharacterSkill(h,true);return;}
  takeAction(h,type,+$('#raise-amount').value);
}
function applySwap(zone){const h=game.players[0],usesMoon=h.moonSwaps>0;if(!game||game.currentTurnId!==h.id||(!usesMoon&&(game.round>4||game.swaps<=0)))return;const old=h[zone];h[zone]=game.drawPile.shift();if(usesMoon)h.moonSwaps--;else game.swaps--;if(h.char.skill.passiveName==='逐月'&&h.moonSwapAwards<2&&GameRules.moonAligned(h,game.public)){h.moonSwapAwards++;h.moonSwaps++;}setCard(zone==='visible'?$('#visible-card'):$('#hidden-card'),h[zone],false);sfx('deal');log(`你以月策易牌更换${zone==='visible'?'明牌':'暗牌'}：${old.name} → ${h[zone].name}`);showOutcome(usesMoon?'逐月易牌':'易牌完成',`${zone==='visible'?'明牌':'暗牌'}：${old.name}（${old.value}）→ ${h[zone].name}（${h[zone].value}）；逐月 ${h.moonSwapAwards}/2，剩余 ${game.swaps+h.moonSwaps} 次`);$('#swap-dialog').close();renderBoard();renderExtraHidden();renderActions();}
function openRiskChoice(){if(!game||game.round<5||game.riskChoice!==null||game.currentTurnId!==game.players[0].id)return;$('#risk-dialog').showModal();}

function power(p){return GameRules.basePower(p,game.public);}
function takeAction(p,type,extra=1){
  if(operationBusy)return;setOperationBusy(true);
  if(game.pendingDuel&&!['fold','call'].includes(type))return;
  const owed=Math.max(0,game.highBet-p.bet),wasRaiseBlocked=p.raiseBlockedActions>0,wasPendingDuel=game.pendingDuel;let label='',actionEffect=false;game.lastSolvent=p;
  if(type==='fold'){p.folded=true;p.status='已弃权';label=`${p.name} 弃权，桌上 ${p.bet} 道留在月盘`;game.needsAction.delete(p.id);sfx('fold');}
  if(type==='check'){p.status='已观望';label=`${p.name} 观望`;game.needsAction.delete(p.id);sfx('chip');}
  if(type==='call'){const payment=GameRules.callPayment(owed,p.dao,p.char.skill.passiveName==='镇岳'?1:0);p.dao-=payment.paid;p.bet+=payment.betIncrease;game.pot+=payment.paid;p.status='已跟注';label=`${p.name} 跟注 ${payment.paid} 道${payment.discount?`（镇岳减免 ${payment.discount} 道）`:''}`;if(payment.discount){actionEffect=true;playCharacterSkillEffect('镇岳',p,()=>showOutcome('镇岳',`应跟 ${owed} 道，实际支付 ${payment.paid} 道，永久减免 ${payment.discount} 道`));}game.needsAction.delete(p.id);sfx('dao');}
  if(type==='raise'||type==='allin'){const pay=type==='allin'?p.dao:Math.min(owed+extra,p.dao);p.dao-=pay;p.bet+=pay;game.pot+=pay;game.highBet=Math.max(game.highBet,p.bet);p.status=type==='allin'?'尽数投入':'已加注';label=`${p.name} ${type==='allin'?'尽数投入':'加注至'} ${p.bet} 道`;game.needsAction=new Set(game.players.filter(x=>!x.out&&!x.folded&&!x.pendingOut&&x.id!==p.id).map(x=>x.id));sfx('dao');if(type==='raise'){game.players.filter(x=>x!==p&&!x.out).forEach(x=>x.observedAggression=Math.min(5,(x.observedAggression||0)+.25));schedule(()=>sfx('raise'),90);}}
  if(type==='raise'&&p.breakTargetIds?.length){const targets=game.players.filter(x=>p.breakTargetIds.includes(x.id)&&!x.out&&!x.folded);targets.forEach(target=>{target.raiseBlockedActions=1;target.brokenById=p.id;target.breakSourceName=p.name;target.status=`被 ${p.name} 断势 · 下一次只能跟注或弃权`;});if(targets.length){actionEffect=true;label+=`，对 ${targets.map(x=>x.name).join('、')} 发动断势`;playCharacterSkillEffect('断势',p,()=>showOutcome('断势生效',`${targets.map(x=>x.name).join('、')} 下一次行动只能跟注或弃权`));}p.breakTargetIds=[];}
  if(wasRaiseBlocked){p.raiseBlockedActions=Math.max(0,p.raiseBlockedActions-1);if(!p.raiseBlockedActions){p.breakSourceName=null;showOutcome('断势解除',`${p.name} 已完成受限行动，断势解除`);}}
  if(p.dao===0&&!p.folded){p.pendingOut=true;p.status='道尽·待判';if(!wasPendingDuel){game.pendingDuel=true;game.needsAction=new Set(GameRules.pendingDuelResponders(game.players,p.id));}else game.needsAction.delete(p.id);label+=`，道尽待判：其余玩家各跟注或弃权一次后立即拼点`;sfx('out');}
  game.actionCount++;game.currentTurnId=null;log(label);game.maxPot=Math.max(game.maxPot,game.pot);renderBoard(type==='raise');renderActions();schedule(()=>{setOperationBusy(false);advanceTurn();},actionEffect?2300:900);
}
function advanceTurn(){
  if(operationBusy||$('#tutorial-dialog').open||game.awaitingRisk){schedule(advanceTurn,500);return;}
  const survivors=game.players.filter(p=>!p.out&&p.dao>0),pending=game.players.filter(p=>!p.out&&p.pendingOut&&!p.folded);if(survivors.length===0||(!pending.length&&survivors.length<=1)){game.earlyWinner=survivors[0]||null;resolveRound();return;}
  const roundActive=game.players.filter(p=>!p.out&&!p.folded&&!p.pendingOut);if(roundActive.length===0){resolveRound();return;}
  for(const id of [...game.needsAction]){const p=game.players.find(x=>x.id===id);if(!p||p.out||p.folded||p.pendingOut||(!game.pendingDuel&&p.bet===game.highBet&&p.status==='已跟注'))game.needsAction.delete(id);}
  if(game.needsAction.size===0){schedule(resolveRound,game.pendingDuel?450:1300);return;}
  let next=null;for(let step=1;step<=game.players.length;step++){const idx=(game.turnIndex+step)%game.players.length,p=game.players[idx];if(game.needsAction.has(p.id)&&!p.out&&!p.folded&&!p.pendingOut){game.turnIndex=idx;next=p;break;}}
  if(!next){resolveRound();return;}game.currentTurnId=next.id;next.status=next.human?'轮到你了':'正在思考';renderBoard();renderActions();sfx('turn');announce(next.human?'轮到你行动':`${next.name} 正在思考`);
  if(!next.human)schedule(()=>aiDecision(next),2200+Math.random()*1800);
}
function aiDecision(p){
  if(game.currentTurnId!==p.id)return;const owed=Math.max(0,game.highBet-p.bet);
  if(!p.charSkillUsed){
    const name=p.char.skill.name,targets=shuffle(game.players.filter(x=>x!==p&&!x.out&&!x.folded));let activated=false;
    if(name==='封月'&&targets.length&&Math.random()<.3){const target=targets[0];target.lockedZone=game.round>4?'hidden':'visible';p.charSkillUsed=true;log(`${p.name} 发动封月，${target.name} 的${target.lockedZone==='visible'?'明牌':'暗牌'}本回合按 0 点计算`);setOperationBusy(true);playCharacterSkillEffect(name,p,()=>schedule(()=>{renderBoard();showOutcome('封月',`${target.name} 的${target.lockedZone==='visible'?'明牌':'暗牌'}已封锁，本回合按 0 点计算`);setOperationBusy(false);aiDecision(p);},500));return;}
    if(name==='撼岳'&&targets.length&&Math.random()<.35){resolveMountainChallenge(p,targets[0]);activated=true;}
    if(name==='同契'&&!p.covenantUsed&&targets.length&&Math.random()<.2){p.covenantUsed=true;startCovenant(p,targets[0]);activated=true;}
    if(name==='鹰瞰'&&targets.length&&Math.random()<.35){const target=p.eagleLastTargetId?targets.find(x=>x.id===p.eagleLastTargetId)||targets[0]:targets[0];p.skillIntelTargetIds=[target.id];p.eagleStreak=p.eagleLastTargetId===target.id?p.eagleStreak+1:1;p.eagleLastTargetId=target.id;if(p.eagleStreak>=2&&!p.trackedSkillIds.includes(target.id))p.trackedSkillIds.push(target.id);p.charSkillUsed=true;log(`${p.name} 发动鹰瞰，观察了 ${target.name} 的暗牌`);setOperationBusy(true);playCharacterSkillEffect(name,p,()=>schedule(()=>{setOperationBusy(false);aiDecision(p);},500));return;}
    if(name==='借月'){p.charScoreDelta+=GameAI.borrowMoonDelta(p,{round:game.round,moonLimit:game.moonLimit,publicCard:game.public,basePower:GameRules.basePower,maxAdjustment:5});p.charScoreRound=game.round;p.charSkillUsed=true;log(`${p.name} 发动借月，方向保持隐秘`);setOperationBusy(true);playCharacterSkillEffect(name,p,()=>schedule(()=>{setOperationBusy(false);aiDecision(p);},500));return;}
    if(activated)p.charSkillUsed=true;
  }
  const action=GameAI.chooseAction(p,{players:game.players,publicCard:game.public,round:game.round,moonLimit:game.moonLimit,highBet:game.highBet,pendingDuel:game.pendingDuel,difficulty,basePower:GameRules.basePower});
  if(action==='raise'&&!p.charSkillUsed&&p.char.skill.name==='断势'){const targets=shuffle(game.players.filter(x=>x!==p&&!x.out&&!x.folded));p.breakTargetIds=targets.slice(0,1).map(x=>x.id);if(p.breakTargetIds.length)p.charSkillUsed=true;}
  takeAction(p,action,Math.min(3,1+Math.floor(Math.random()*3)));
}

function scoredPower(p){return GameRules.scoredPower(p,{round:game.round,publicCard:game.public,riskActive:game.riskActive,riskRound:game.riskRound,riskDelta:game.riskDelta});}
function distributeRiskDao(player){const others=game.players.filter(p=>p!==player&&!p.out);if(!others.length){player.dao=0;return;}const share=Math.floor(player.dao/others.length),rem=player.dao-share*others.length;others.forEach(p=>p.dao+=share);if(others[0])others[0].dao+=rem;player.dao=0;player.out=true;player.folded=true;player.pendingOut=false;player.status='赌命失败·淘汰';log(`${player.name} 赌命失败，剩余道已均分`);}

function resolveRound(){
  if(game.resolving)return;setOperationBusy(true);game.resolving=true;const passiveEffects=[],outBefore=new Set(game.players.filter(p=>p.out).map(p=>p.id));game.currentTurnId=null;$('#game-board').classList.add('overhead');renderBoard();renderActions();
  const contenders=game.players.filter(p=>!p.folded&&!p.out);let winners=[];
  if(contenders.length===0){const living=game.players.filter(p=>!p.out&&p.dao>0);const most=living.length?Math.max(...living.map(p=>p.dao)):0;winners=living.filter(p=>p.dao===most);}else{const result=GameRules.determineWinners(game.players,{round:game.round,moonLimit:game.moonLimit,publicCard:game.public,riskActive:game.riskActive,riskRound:game.riskRound,riskDelta:game.riskDelta});winners=result.winners;game.allBustDarkTie=result.allBustDarkTie;}
  if(!winners.length)winners=[game.earlyWinner||game.lastSolvent||game.players[0]];
  const overLimit=game.round>4?contenders.filter(p=>scoredPower(p)>game.moonLimit):[];overLimit.forEach(p=>{if(!winners.includes(p)){p.roundEliminated=true;p.folded=true;p.pendingOut=false;p.status='本回合蚀月';}else{p.status='蚀月暗牌胜出';}});
  game.players.filter(p=>p.pendingOut).forEach(p=>{if(winners.includes(p)&&!p.out){p.pendingOut=false;p.status='道尽获胜·保留资格'}else{p.pendingOut=false;p.out=true;p.folded=true;p.status='道尽淘汰';}});
  game.pendingDuel=false;
  winners=winners.filter(p=>!p.out&&!p.folded);if(!winners.length)winners=[...game.players.filter(p=>!p.out&&!p.folded)].slice(0,1);if(!winners.length)winners=[game.players[0]];
  const human=game.players[0];if(game.riskActive&&(!winners.includes(human)||human.out)){distributeRiskDao(human);game.riskActive=false;}
  const share=Math.floor(game.pot/winners.length),rem=game.pot-share*winners.length;winners.forEach(p=>{p.dao+=share;p.wins++;p.lastWin=game.round;});game.potCarry=rem;
  game.players.filter(p=>GameRules.shouldRecoverBranch(p,winners)).forEach(p=>{const before=p.dao;p.dao+=3;p.branchRecoveries++;p.status=`回枝 ${p.branchRecoveries}/3 · ${before}→${p.dao} 道`;log(`${p.name} 触发回枝，恢复 3 道（${p.branchRecoveries}/3）`);passiveEffects.push(next=>playCharacterSkillEffect('回枝',p,()=>{renderBoard();showOutcome('回枝',`${p.name} 恢复 3 道：${before} → ${p.dao}；已触发 ${p.branchRecoveries}/3`);schedule(next,500);}));});const newlyOut=game.players.filter(p=>p.out&&!outBefore.has(p.id));if(newlyOut.length)game.players.filter(p=>!p.out&&p.char.skill.passiveName==='逐寂').forEach(wolf=>{const before=wolf.dao,gain=newlyOut.reduce((sum,fallen)=>sum+3+(fallen.brokenById===wolf.id?2:0),0);wolf.dao+=gain;log(`${wolf.name} 触发逐寂，获得 ${gain} 道`);passiveEffects.push(next=>playCharacterSkillEffect('逐寂',wolf,()=>{renderBoard();showOutcome('逐寂',`${newlyOut.map(p=>p.name).join('、')} 淘汰；${wolf.name} 获得 ${gain} 道：${before} → ${wolf.dao}`);schedule(next,500);}));});
  const winnerNames=winners.map(p=>p.name).join('、');game.records.push({round:game.round,phase:game.round<=4?'朔月':'满月',public:game.public.name,winners:winnerNames,pot:game.pot,powers:game.players.map(p=>({name:p.name,power:power(p),folded:p.folded}))});sfx(winners.includes(game.players[0])?'win':'showdown');
  $$('.seat').forEach((el,i)=>el.classList.toggle('winner',winners.includes(game.players[i])));
  $('#round-content').innerHTML=`<small>俯视开牌 · ${game.round<=4?'朔月':'满月'}第 ${game.round} 回</small><h3>${winnerNames} 获胜</h3><p>公共牌：${game.public.name}（${game.public.value}） · ${game.round<=4?'牌力总和越大越强':`最接近且不超过月限 ${game.moonLimit} 者胜；全员超限时比较暗牌`}</p><p class="score-line">月盘 ${game.pot} 道 · 每人获得 ${share}</p><div class="showdown-grid">${game.players.map(p=>`<div class="showdown-player ${winners.includes(p)?'won':''} ${p.folded?'folded':''}"><b>${p.name}</b><div class="showdown-cards"><span class="mini-card">明 ${p.visible.name} ${p.visible.value}</span><span class="mini-card">暗 ${p.hidden.name} ${p.hidden.value}</span>${(p.visibleExtras||[]).map(c=>`<span class="mini-card">加明 ${c.name} ${c.value}</span>`).join('')}${(p.hiddenExtras||[]).map(c=>`<span class="mini-card">加暗 ${c.name} ${c.value}</span>`).join('')}</div><small>${p.out||p.roundEliminated?p.status:p.folded?'已弃权':`${scoredPower(p)} 点${p.charScoreRound===game.round?` · ${p.char.skill.name}修正 ${p.charScoreDelta>0?'+':''}${p.charScoreDelta}`:''}${game.round>4&&scoredPower(p)>game.moonLimit?' · 蚀月':''}`}</small></div>`).join('')}</div>`;
  const remaining=game.players.filter(p=>!p.out&&p.dao>0);$('#next-round').textContent=game.round===8||remaining.length<=1?'查看终局':'下一回合';schedule(()=>runEffectSequence(passiveEffects,()=>{setOperationBusy(false);$('#round-dialog').showModal();}),1800);
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
  {title:'先看判断，再做决定',body:'牌桌左上角会实时显示你的当前牌力、月相判定、跟注成本和角色技能状态。选角页可以选择沉浸、标准或快速节奏，对局中也能在右上角切换。',demo:'当前牌力 · 月限距离 · 跟注成本 · 技能状态'},
  {title:'角色本领',body:'六名角色的本领每回合最多发动一次、整局最多四次。技能逐阶增强，第二阶开始承担牌力或道的代价，第四阶发动后会退出当前回合。',demo:'封月 · 镇岳 · 回枝 · 鹰瞰 · 断势 · 借月'},
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
  if(game.skillUsed)return;game.skillUsed=true;pendingSkill={...skillCards[Math.floor(Math.random()*skillCards.length)],targetId:null,zone:null};
  $('#skill-title').textContent=pendingSkill.name;$('#skill-art').innerHTML=`<div class="skill-symbol">${pendingSkill.symbol}</div>`;$('#skill-description').textContent=pendingSkill.description;
  const targets=game.players.filter(p=>!p.out&&!p.human);let targetHtml='';
  if(pendingSkill.name==='换牌')targetHtml=`<div class="skill-target-list">${targets.flatMap(p=>['visible','hidden'].map(zone=>`<button data-target="${p.id}" data-zone="${zone}" ${!GameRules.canTransferZone(game.players[0],p)?'disabled title="霜境保护"':''}>${p.name} · ${zone==='visible'?'明牌':'暗牌'}${!GameRules.canTransferZone(game.players[0],p)?' · 霜境保护':''}</button>`)).join('')}</div>`;
  if(pendingSkill.name==='透视'||pendingSkill.name==='送牌')targetHtml=`<div class="skill-target-list">${targets.map(p=>`<button data-target="${p.id}" ${pendingSkill.name==='送牌'&&!GameRules.canTransferZone(game.players[0],p)?'disabled title="霜境保护"':''}>${p.name}${pendingSkill.name==='送牌'&&!GameRules.canTransferZone(game.players[0],p)?' · 霜境保护':''}</button>`).join('')}</div>`;
  $('#skill-targets').innerHTML=targetHtml;$$('#skill-targets button').forEach(b=>b.onclick=()=>{$$('#skill-targets button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');pendingSkill.targetId=b.dataset.target;pendingSkill.zone=b.dataset.zone||null;});
  $('#skill-discard').style.display='inline-block';$('#skill-discard').textContent=pendingSkill.name==='加牌'?'放弃此牌':'放弃技能';$('#skill-confirm').textContent=pendingSkill.name==='加牌'?'保留这张暗牌':'使用技能';
  $('#skill-dialog').showModal();renderActions();
}
function applySkill(){
  if(!pendingSkill||operationBusy)return;const h=game.players[0],target=game.players.find(p=>p.id===pendingSkill.targetId),needsTarget=['换牌','透视','送牌'].includes(pendingSkill.name);if(needsTarget&&!target){announce('请先选择一名角色');return;}
  if(pendingSkill.name==='换牌'&&!GameRules.canTransferZone(h,target,pendingSkill.zone)){showOutcome('霜境保护','霜弦的牌型不受外部换牌影响');return;}
  if(pendingSkill.name==='送牌'&&!GameRules.canTransferZone(h,target,'visible')){showOutcome('霜境保护','霜弦不会接收其他角色送来的牌');return;}
  const skill=pendingSkill;pendingSkill=null;$('#skill-dialog').close();
  let payload={},commit=()=>{},complete=()=>{},result='';
  if(skill.name==='易牌'){const old=h.visible,newCard=game.drawPile.shift();payload={oldCard:old,newCard};result=`你的明牌：${old.name}（${old.value}）→ ${newCard.name}（${newCard.value}）`;commit=()=>{h.visible=newCard;setCard($('#visible-card'),h.visible);log(`技能·易牌：${old.name} → ${newCard.name}`);};}
  if(skill.name==='换牌'){const zone=skill.zone||'visible',old=h[zone],targetCard=target[zone];payload={oldCard:old,targetCard,target,zone};result=`${zone==='visible'?'明牌':'暗牌'}互换：你得到 ${targetCard.name}（${targetCard.value}），${target.name} 得到 ${old.name}（${old.value}）`;commit=()=>{[h[zone],target[zone]]=[targetCard,old];setCard($('#visible-card'),h.visible);setCard($('#hidden-card'),h.hidden);log(`技能·换牌：你与 ${target.name} 互换${zone==='visible'?'明牌':'暗牌'}`);};}
  if(skill.name==='透视'){payload={target,targetCard:target.hidden};result=`${target.name} 的暗牌：${target.hidden.name}（${target.hidden.value}）`;commit=()=>{game.visionTarget=target;log(`技能·透视：${result}`);};complete=()=>openPanel('vision');}
  if(skill.name==='加牌'){const newCard=game.drawPile.shift();payload={newCard};result=`${newCard.name}（${newCard.value}）已进入你的暗牌区并计入总点数`;commit=()=>{h.hiddenExtras.push(newCard);log(`技能·加牌：${result}`);};}
  if(skill.name==='送牌'){const old=h.visible,newCard=game.drawPile.shift();payload={oldCard:old,newCard,target};result=`${old.name}（${old.value}）已移动到 ${target.name} 的明牌区；你补到 ${newCard.name}（${newCard.value}）`;commit=()=>{target.visibleExtras.push(old);h.visible=newCard;setCard($('#visible-card'),h.visible);log(`技能·送牌：${result}`);};}
  setOperationBusy(true);playCardSkillEffect(skill.name,payload,()=>{commit();renderBoard();renderExtraHidden();renderActions();},()=>{showOutcome(`${skill.name}完成`,result,3000);complete();setOperationBusy(false);});
}
function discardSkill(){if(!pendingSkill)return;log(`你放弃了技能牌：${pendingSkill.name}`);announce(`技能牌已放弃 · 本回合不再抽取`);$('#skill-dialog').close();pendingSkill=null;$('#skill-discard').style.display='none';$('#skill-confirm').textContent='确认';renderActions();}

function openPanel(type){
  let html=''; const history=JSON.parse(localStorage.getItem('shuoWangHistory')||'[]');
  if(type==='records')html=`<h2>月下战绩</h2>${history.length?`<table><tr><th>时间</th><th>人数</th><th>名次</th><th>余道</th></tr>${history.map(h=>`<tr><td>${h.date}</td><td>${h.players}</td><td>第 ${h.rank}</td><td>${h.dao}</td></tr>`).join('')}</table>`:'<p>尚无对局记录。</p>'}`;
  if(type==='atlas')html=`<h2>节序图鉴</h2><p>已收录 36 张牌：二十四节气与十二传统节日。</p><table>${deck.map(c=>`<tr><td>${c.category}</td><td>${c.name}</td><td>${cnMonth[c.month]}${cnDay(c.day)}</td></tr>`).join('')}</table>`;
  if(type==='cardref')html=`<h2>牌力排行 · 从大到小</h2><div class="ledger-rules"><span>基础牌力 = 月份 + 日期</span><span>${game&&game.round>4?`本回合月限 ${game.moonLimit}`:'朔月：总和越大越强'}</span></div><div class="ledger-table">${[...deck].sort((a,b)=>b.value-a.value).map(c=>`<div class="ledger-item"><strong>${c.name}</strong><span>${cnMonth[c.month]}${cnDay(c.day)}</span><b>${c.value}</b></div>`).join('')}</div>`;
  if(type==='vision'&&(game.visionTargets?.length||game.visionTarget)){const targets=game.visionTargets?.length?game.visionTargets:[game.visionTarget],observer=game.players[0];html=`<h2>月镜情报</h2><p>本回合已揭示暗牌</p><div class="vision-card-grid">${targets.map(p=>`<div><strong>${p.name}</strong><div class="card">${cardHTML(p.hidden)}</div><p>${p.hidden.name} · 基础牌力 ${p.hidden.value}</p>${observer.trackedSkillIds?.includes(p.id)?`<p><b>追影</b> · ${trackedSkillDirection(p)}</p>`:''}</div>`).join('')}</div>`;}
  if(type==='notes')html=`<h2>观月札记</h2><p>牌名之下的日期并非装饰。前三牌相会，数理隐于月相。</p><textarea id="moon-note" maxlength="300" placeholder="记下你的推断……">${localStorage.getItem('shuoWangNote')||''}</textarea>`;
  if(type==='profile')html=`<h2>${$('#player-name').value||'月下客'}</h2><p>当前角色：${characters[charIndex].title}</p><p>总对局 ${history.length}　·　获胜 ${history.filter(h=>h.rank===1).length}　·　胜率 ${history.length?Math.round(history.filter(h=>h.rank===1).length/history.length*100):0}%</p><p>排位赛：尚未定级</p>`;
  if(type==='review'&&game)html=`<h2>月局复盘</h2><table><tr><th>回合</th><th>月相</th><th>公共牌</th><th>月盘</th><th>赢家</th></tr>${game.records.map(r=>`<tr><td>${r.round}</td><td>${r.phase}</td><td>${r.public}</td><td>${r.pot}</td><td>${r.winners}</td></tr>`).join('')}</table>`;
  $('#panel-content').innerHTML=html;$('#side-panel').showModal(); const note=$('#moon-note');if(note){note.style.cssText='width:100%;height:150px;background:#07100f;color:#dce8df;border:1px solid #526a61;padding:12px';note.oninput=()=>localStorage.setItem('shuoWangNote',note.value);}
}

$('#guest-login').onclick=()=>{$('#home-name').textContent=$('#player-name').value||'月下客';unlockAudio();sfx('turn');showScreen('home-screen')};
$('#start-game').onclick=()=>{switchMusic('battle');showScreen('select-screen')};$$('.back-home').forEach(b=>b.onclick=()=>{switchMusic('home');showScreen('home-screen')});
$('#char-prev').onclick=()=>{charIndex=(charIndex+characters.length-1)%characters.length;renderCharacter()};$('#char-next').onclick=()=>{charIndex=(charIndex+1)%characters.length;renderCharacter()};
$$('[data-theme-choice]').forEach(button=>button.onclick=()=>applyTheme(button.dataset.themeChoice));$('#theme-quick-toggle').onclick=()=>applyTheme(document.body.dataset.theme==='imperial'?'moon-court':'imperial');
$$('[data-speed]').forEach(button=>button.onclick=()=>applySpeed(button.dataset.speed));$('#speed-quick-toggle').onclick=()=>{const order=['immersive','standard','fast'];applySpeed(order[(order.indexOf(gameSpeed)+1)%order.length]);};
$('#ai-count').oninput=e=>$('#ai-count-label').textContent=e.target.value;$$('#difficulty button').forEach(b=>b.onclick=()=>{$$('#difficulty button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');difficulty=b.dataset.value});
$('#confirm-seat').onclick=newGame;$$('[data-action]').forEach(b=>b.onclick=()=>playerAction(b.dataset.action));$('#raise-amount').oninput=e=>$('#raise-label').textContent=`+${e.target.value}`;
$('#seats').onclick=e=>{const badge=e.target.closest('[data-skill-player]');if(!badge||!game)return;openCharacterSkill(game.players.find(p=>p.id===badge.dataset.skillPlayer),false);};
$('#character-skill-close').onclick=()=>$('#character-skill-dialog').close();$('#character-skill-confirm').onclick=activateCharacterSkill;
$('#round-guide-toggle').onclick=()=>{const guide=$('#round-guide'),collapsed=guide.classList.toggle('collapsed');$('#round-guide-toggle').textContent=collapsed?'+':'−';$('#round-guide-toggle').setAttribute('aria-label',collapsed?'展开本回合判断':'收起本回合判断');};
$('#next-round').onclick=()=>{$('#round-dialog').close();startRound()};$('#view-toggle').onclick=()=>$('#game-board').classList.toggle('overhead');$('#game-exit').onclick=()=>{scheduler.cancelAll();game=null;switchMusic('home');showScreen('home-screen')};
$('#intel-open').onclick=()=>openPanel('vision');$('#ledger-open').onclick=()=>openPanel('cardref');$('#tutorial-open').onclick=()=>openTutorial(0);$('#tutorial-next').onclick=()=>{if(tutorialIndex<tutorialSteps.length-1){tutorialIndex++;renderTutorial()}else closeTutorial()};$('#tutorial-skip').onclick=closeTutorial;
$('#skill-confirm').onclick=applySkill;
$('#skill-discard').onclick=discardSkill;
$$('[data-risk]').forEach(button=>button.onclick=()=>{if(!game||game.round<5||game.riskChoice!==null)return;const value=button.dataset.risk;game.riskChoice=value;game.riskActive=true;game.riskRound=game.round;game.riskDelta=Number(value);game.awaitingRisk=false;$('#risk-dialog').close();$('#risk-status').textContent='赌命中';log('你选择赌命');announce('系统播报：有人选择赌命');renderBoard();renderActions();schedule(advanceTurn,500)});
$$('[data-swap-zone]').forEach(button=>button.onclick=()=>applySwap(button.dataset.swapZone));
$('#return-home').onclick=()=>{scheduler.cancelAll();switchMusic('home');showScreen('home-screen')};$('#review-game').onclick=()=>openPanel('review');$$('.home-nav button').forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));$('#profile-open').onclick=()=>openPanel('profile');$('.dialog-close').onclick=()=>$('#side-panel').close();
$('#sound-toggle').onclick=()=>{audioOn=!audioOn;$('#sound-toggle').textContent=audioOn?'♪':'×';if(audioOn){unlockAudio();switchMusic(game&&game.round>=5?'full':game&&game.round>0?'battle':'home');sfx('turn')}else stopAmbient();};
document.addEventListener('pointerdown',()=>{if(audioOn)unlockAudio()},{once:true});
applyTheme(localStorage.getItem('shuoWangTheme')||'moon-court');applySpeed(gameSpeed);renderCharacter();initSky();
