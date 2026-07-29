const test=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../game-rules.js');

const card=value=>({value,name:`牌${value}`});
function player(id,total={visible:10,hidden:10}){return {id,visible:card(total.visible),hidden:card(total.hidden),hiddenExtras:[],visibleExtras:[],bet:1,dao:8,charScoreDelta:0,charScoreRound:null,human:false,char:{skill:{name:'封月'}}};}

test('朔月选择修正后总点数最高者',()=>{const a=player('a',{visible:10,hidden:11}),b=player('b',{visible:12,hidden:12});a.charScoreDelta=5;a.charScoreRound=2;const result=rules.determineWinners([a,b],{round:2,publicCard:card(10),riskActive:false});assert.deepEqual(result.winners.map(p=>p.id),['a']);});
test('满月排除超过月限者',()=>{const safe=player('safe',{visible:15,hidden:18}),bust=player('bust',{visible:20,hidden:20});const result=rules.determineWinners([safe,bust],{round:5,moonLimit:44,publicCard:card(10),riskActive:false});assert.deepEqual(result.winners.map(p=>p.id),['safe']);});
test('满月全员超限时只按暗牌选唯一赢家',()=>{const a=player('a',{visible:30,hidden:18}),b=player('b',{visible:24,hidden:21});const result=rules.determineWinners([a,b],{round:5,moonLimit:44,publicCard:card(10),riskActive:false});assert.equal(result.allBustDarkTie,true);assert.deepEqual(result.winners.map(p=>p.id),['b']);});
test('借月和赌命修正均计入结算',()=>{const p=player('human');p.human=true;p.charScoreDelta=-2;p.charScoreRound=5;assert.equal(rules.scoredPower(p,{round:5,publicCard:card(10),riskActive:true,riskRound:5,riskDelta:10}),38);});
test('镇岳少付一道但补齐完整跟注',()=>{assert.deepEqual(rules.callPayment(3,8,true),{paid:2,betIncrease:3,discount:1});assert.deepEqual(rules.callPayment(1,8,true),{paid:0,betIncrease:1,discount:1});});
test('强化镇岳按等级减免跟注',()=>{assert.deepEqual(rules.callPayment(4,8,3),{paid:1,betIncrease:4,discount:3});});
test('道尽对决只允许跟注或弃权',()=>{const p=player('p');const actions=rules.legalActions(p,{currentTurnId:'p',highBet:3,pendingDuel:true});assert.deepEqual(actions,['fold','call']);});
test('道尽玩家不会进入对决响应名单',()=>{const source={...player('source'),pendingOut:true},a=player('a'),b={...player('b'),folded:true},c={...player('c'),out:true};assert.deepEqual(rules.pendingDuelResponders([source,a,b,c],'source'),['a']);});
test('封月使锁定牌本回合不计分',()=>{const p=player('p',{visible:12,hidden:8});p.lockedZone='visible';assert.equal(rules.basePower(p,card(10)),18);});
test('断势限制下一次行动为跟注或弃权',()=>{const p=player('p');p.raiseBlockedOnce=true;assert.deepEqual(rules.legalActions(p,{currentTurnId:'p',highBet:3,pendingDuel:false}),['fold','call']);});
test('回枝触发不超过三次',()=>{const deer=player('deer');deer.char.skill.passiveName='回枝';deer.branchRecoveries=2;assert.equal(rules.shouldRecoverBranch(deer,[]),true);deer.branchRecoveries=3;assert.equal(rules.shouldRecoverBranch(deer,[]),false);});
test('霜境阻止外部换牌和送牌',()=>{const source=player('source'),target=player('target');target.char.skill.passiveName='霜境';assert.equal(rules.canTransferZone(source,target),false);});
test('逐月要求明暗牌同在公共牌一侧',()=>{assert.equal(rules.moonAligned(player('high',{visible:12,hidden:11}),card(10)),true);assert.equal(rules.moonAligned(player('split',{visible:12,hidden:8}),card(10)),false);});
test('淘汰状态会阻止回枝恢复',()=>{const deer=player('deer');deer.char.skill.name='回枝';deer.dao=2;deer.out=true;assert.equal(rules.shouldRecoverBranch(deer,[]),false);});
