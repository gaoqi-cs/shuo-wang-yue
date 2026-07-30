const test=require('node:test');
const assert=require('node:assert/strict');
const {createScheduler,canResolveSkillChoice,covenantWinnerId,skillInvolvesHuman}=require('../game-runtime.js');

test('cancelAll prevents stale callbacks',async()=>{let called=false;const scheduler=createScheduler(()=> 'fast');scheduler.schedule(()=>{called=true;},20);scheduler.cancelAll();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(called,false);assert.equal(scheduler.pendingCount(),0);});
test('skill choices are restricted to the decision maker and phase',()=>{const state={phase:'choice',decisionMakerId:'target',resolved:false};assert.equal(canResolveSkillChoice(state,'target','choice'),true);assert.equal(canResolveSkillChoice(state,'initiator','choice'),false);state.phase='outcome';assert.equal(canResolveSkillChoice(state,'target','choice'),false);state.phase='outcome';state.decisionMakerId='initiator';assert.equal(canResolveSkillChoice(state,'initiator','outcome'),true);state.resolved=true;assert.equal(canResolveSkillChoice(state,'initiator','outcome'),false);});
test('covenant winner follows both private choices',()=>{assert.equal(covenantWinnerId('initiator','target','同月','同月'),'initiator');assert.equal(covenantWinnerId('initiator','target','同月','背月'),'target');});
test('private skill flow is shown only when the human is involved',()=>{assert.equal(skillInvolvesHuman({human:false},{human:false}),false);assert.equal(skillInvolvesHuman({human:true},{human:false}),true);assert.equal(skillInvolvesHuman({human:false},{human:true}),true);});
