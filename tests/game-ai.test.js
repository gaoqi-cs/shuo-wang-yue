const test=require('node:test');
const assert=require('node:assert/strict');
const ai=require('../game-ai.js');
const rules=require('../game-rules.js');

const card=value=>({value});
const base={id:'ai',visible:card(15),hidden:card(15),hiddenExtras:[],visibleExtras:[],dao:8,bet:1,style:'观察'};
test('AI 朔月借月选择最大正向修正',()=>{assert.equal(ai.borrowMoonDelta(base,{round:2,moonLimit:null,publicCard:card(10),basePower:rules.basePower}),5);});
test('AI 满月借月在范围内贴近月限',()=>{const player={...base,visible:card(20),hidden:card(18)};assert.equal(ai.borrowMoonDelta(player,{round:5,moonLimit:44,publicCard:card(10),basePower:rules.basePower}),-4);});
test('AI 借月修正限制在正负五',()=>{const player={...base,visible:card(30),hidden:card(20)};assert.equal(ai.borrowMoonDelta(player,{round:5,moonLimit:44,publicCard:card(10),basePower:rules.basePower}),-5);});
test('断势中的 AI 不会再次加注',()=>{const player={...base,raiseBlockedOnce:true};const action=ai.chooseAction(player,{players:[player],publicCard:card(10),round:2,moonLimit:null,highBet:3,pendingDuel:false,difficulty:'蚀月',basePower:rules.basePower},()=>0);assert.equal(action,'call');});
test('未发动鹰瞰时 AI 不读取对手暗牌',()=>{const player={...base},rival={...base,id:'rival',visible:card(12),hidden:card(1)};const low=ai.estimateConfidence(player,{players:[player,rival],publicCard:card(10),round:2,basePower:rules.basePower});rival.hidden=card(40);const high=ai.estimateConfidence(player,{players:[player,rival],publicCard:card(10),round:2,basePower:rules.basePower});assert.equal(low,high);});
test('发动鹰瞰后 AI 会使用指定目标的暗牌情报',()=>{const player={...base,skillIntelTargetId:'rival'},rival={...base,id:'rival',visible:card(12),hidden:card(1)};const lowThreat=ai.estimateConfidence(player,{players:[player,rival],publicCard:card(10),round:2,basePower:rules.basePower});rival.hidden=card(40);const highThreat=ai.estimateConfidence(player,{players:[player,rival],publicCard:card(10),round:2,basePower:rules.basePower});assert.ok(lowThreat>highThreat);});
