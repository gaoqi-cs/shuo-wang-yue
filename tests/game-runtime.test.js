const test=require('node:test');
const assert=require('node:assert/strict');
const {createScheduler}=require('../game-runtime.js');

test('cancelAll prevents stale callbacks',async()=>{let called=false;const scheduler=createScheduler(()=> 'fast');scheduler.schedule(()=>{called=true;},20);scheduler.cancelAll();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(called,false);assert.equal(scheduler.pendingCount(),0);});
