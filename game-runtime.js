(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const SPEEDS={immersive:1.28,standard:1,fast:.52};
  function createScheduler(getSpeed){let generation=0;const timers=new Set();
    function schedule(callback,delay){const token=generation;const factor=SPEEDS[getSpeed?.()||'standard']||1;const id=setTimeout(()=>{timers.delete(id);if(token===generation)callback();},Math.max(0,delay*factor));timers.add(id);return id;}
    function cancelAll(){generation++;timers.forEach(clearTimeout);timers.clear();}
    return {schedule,cancelAll,pendingCount:()=>timers.size,generation:()=>generation};
  }
  return {SPEEDS,createScheduler};
});
