(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameData=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const characters=[
    {glyph:'狐',portrait:'assets/fox.svg',title:'白狐 · 霜弦',name:'霜弦',trait:'冷静 · 优雅',color:'#d4ddd3',skill:{name:'封月',symbol:'封',active:'锁定任意角色的一张明牌或暗牌，使其点数本回合不计入拥有者总点数。',passiveName:'霜境',passive:'自己的牌型不受其他角色的换牌、送牌等技能影响。',description:'主动「封月」：锁住一张牌，使其本回合不计分。被动「霜境」：自己的牌型不受其他角色影响。'}},
    {glyph:'熊',portrait:'assets/bear.svg',title:'黑熊 · 墨岳',name:'墨岳',trait:'沉稳 · 压迫',color:'#63736d',skill:{name:'撼岳',symbol:'撼',active:'指定一名对手。对方应战则双方各投入 1 道；对方退让则墨岳本回合牌力 +3。',passiveName:'镇岳',passive:'每次跟注永久减免 1 道，仍视为完整跟注。',description:'主动「撼岳」：迫使对手在应战和退让间选择。被动「镇岳」：跟注永久减免 1 道。'}},
    {glyph:'鹿',portrait:'assets/deer.svg',title:'赤鹿 · 丹枝',name:'丹枝',trait:'温和 · 难以看透',color:'#b66a55',skill:{name:'同契',symbol:'契',active:'每局一次，与一名敌人秘密选择 A 或 B；相同则丹枝获胜，不同则对方获胜。胜者令败者本回合弃权或取走其 2 道。',passiveName:'回枝',passive:'输掉本回合但仍存活时恢复 3 道，全局最多触发 3 次。',description:'主动「同契」：每局一次的双签博弈。被动「回枝」：败而未亡时恢复 3 道，最多三次。'}},
    {glyph:'鹰',portrait:'assets/eagle.svg',title:'雪鹰 · 星烬',name:'星烬',trait:'敏锐 · 疏离',color:'#9baeb0',skill:{name:'鹰瞰',symbol:'瞰',active:'每回合查看一名对手的暗牌，情报保留到回合结束。',passiveName:'追影',passive:'连续两回合对同一人使用鹰瞰后，永久获知该角色当前及以后回合的技能使用方向。',description:'主动「鹰瞰」：每回合查看一名对手暗牌。被动「追影」：连续观察同一人两回合后持续追踪其技能方向。'}},
    {glyph:'狼',portrait:'assets/wolf.svg',title:'灰狼 · 夜岚',name:'夜岚',trait:'直接 · 攻势凌厉',color:'#788681',skill:{name:'断势',symbol:'断',active:'加注时指定一名目标，使其下一次行动只能跟注或弃权。',passiveName:'逐寂',passive:'每当有人淘汰，获得 3 道；若其淘汰回合受到你的断势，再额外获得 2 道。',description:'主动「断势」：加注时封锁一名目标的行动。被动「逐寂」：有人淘汰便收取其余势。'}},
    {glyph:'兔',portrait:'assets/rabbit.svg',title:'玉兔 · 月栖',name:'月栖',trait:'灵动 · 自信',color:'#cbd2c5',skill:{name:'借月',symbol:'借',active:'每回合开局可秘密选择 -5 至 +5，修正本回合牌力。',passiveName:'逐月',passive:'明牌和暗牌同时高于或低于公共牌时获得一次易牌；换牌后仍满足可再获得一次，每回合最多两次。',description:'主动「借月」：每回合秘密修正 -5 至 +5。被动「逐月」：牌势同向时获得额外易牌。'}}
  ];
  const solarTerms=['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];
  const festivals=[['春节',1,1],['元宵',1,15],['龙抬头',2,2],['上巳',3,3],['寒食',3,4],['端午',5,5],['七夕',7,7],['中元',7,15],['中秋',8,15],['重阳',9,9],['下元',10,15],['腊八',12,8]];
  const termDates=[[1,15],[1,30],[2,6],[2,21],[3,6],[3,21],[4,7],[4,22],[5,8],[5,23],[6,9],[6,24],[7,11],[7,26],[8,12],[8,27],[9,13],[9,28],[10,14],[10,29],[11,7],[11,22],[12,7],[12,22]];
  const cnMonth=['','正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
  const cnDay=n=>n<=10?`初${['','一','二','三','四','五','六','七','八','九','十'][n]}`:n<20?`十${['','一','二','三','四','五','六','七','八','九'][n-10]}`:n===20?'二十':`廿${['','一','二','三','四','五','六','七','八','九','十'][n-20]}`;
  const deck=[...solarTerms.map((name,i)=>({id:`t${i}`,name,category:'节气',month:termDates[i][0],day:termDates[i][1],value:termDates[i][0]+termDates[i][1]})),...festivals.map((f,i)=>({id:`f${i}`,name:f[0],category:'节日',month:f[1],day:f[2],value:f[1]+f[2]}))];
  return {characters,deck,cnMonth,cnDay};
});
