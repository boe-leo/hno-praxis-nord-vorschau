const practiceNames={'HNO-Praxis Nord':'HNO Privatpraxis Nord','HNO-Praxis Mitte':'HNO Privatpraxis Mitte'};
export const practiceDisplayName=name=>practiceNames[name]||name;

// Shuffle a copy so directory data and the selected doctor remain unchanged.
export function shuffled(items){
 const result=[...items];
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}
