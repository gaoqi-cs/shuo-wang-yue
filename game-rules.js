(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function basePower(player,publicCard){const visible=player.lockedZone==='visible'?0:player.visible.value,hidden=player.lockedZone==='hidden'?0:player.hidden.value;return visible+hidden+publicCard.value+(player.hiddenExtras||[]).reduce((sum,card)=>sum+card.value,0)+(player.visibleExtras||[]).reduce((sum,card)=>sum+card.value,0);}
  function scoredPower(player,context){const risk=player.human&&context.riskActive&&context.riskRound===context.round?context.riskDelta:0;const character=player.charScoreRound===context.round?player.charScoreDelta:0;return basePower(player,context.publicCard)+risk+character;}
  function callPayment(owed,dao,discountArmed){const availableDiscount=discountArmed===true?1:Number(discountArmed)||0;const discount=owed>0?Math.min(owed,availableDiscount):0;const paid=Math.min(Math.max(0,owed-discount),dao);return {paid,betIncrease:Math.min(owed,paid+discount),discount};}
  function legalActions(player,context){if(!player||player.out||player.folded||player.pendingOut||context.currentTurnId!==player.id)return [];
    const owed=Math.max(0,context.highBet-player.bet);if(context.pendingDuel)return ['fold','call'];if(player.raiseBlockedActions>0||player.raiseBlockedOnce)return ['fold','call'];const actions=['fold',owed>0?'call':'check'];if(player.dao>owed)actions.push('raise');if(player.dao>0)actions.push('allin');return actions;}
  function determineWinners(players,context){const contenders=players.filter(player=>!player.folded&&!player.out);if(contenders.length<=1)return {winners:contenders,allBustDarkTie:false};
    if(context.round<=4){const best=Math.max(...contenders.map(player=>scoredPower(player,context)));return {winners:contenders.filter(player=>scoredPower(player,context)===best),allBustDarkTie:false};}
    const valid=contenders.filter(player=>scoredPower(player,context)<=context.moonLimit);if(valid.length){const best=Math.max(...valid.map(player=>scoredPower(player,context)));return {winners:valid.filter(player=>scoredPower(player,context)===best),allBustDarkTie:false};}
    const sorted=[...contenders].sort((a,b)=>b.hidden.value-a.hidden.value||b.visible.value-a.visible.value);return {winners:sorted.length?[sorted[0]]:[],allBustDarkTie:true};
  }
  function shouldRecoverBranch(player,winners){return player.char?.skill?.passiveName==='回枝'&&!player.out&&!winners.includes(player)&&(player.branchRecoveries||0)<3;}
  function canTransferZone(){return true;}
  function frostMarkUntilRound(source,target,round){return target?.char?.skill?.passiveName==='霜境'&&source!==target?Math.max(source.frostMarkRound||0,round+1):source.frostMarkRound||0;}
  function moonAligned(player,publicCard){return (player.visible.value>publicCard.value&&player.hidden.value>publicCard.value)||(player.visible.value<publicCard.value&&player.hidden.value<publicCard.value);}
  function pendingDuelResponders(players,sourceId){return players.filter(player=>!player.out&&!player.folded&&!player.pendingOut&&player.id!==sourceId).map(player=>player.id);}
  return {basePower,scoredPower,callPayment,legalActions,determineWinners,shouldRecoverBranch,canTransferZone,frostMarkUntilRound,moonAligned,pendingDuelResponders};
});
