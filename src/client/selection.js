export function selectionRect(a,b){return {left:Math.min(a.x,b.x),top:Math.min(a.y,b.y),right:Math.max(a.x,b.x),bottom:Math.max(a.y,b.y)};}
/** Use logical coordinates so offscreen cards, negative positions and zoom all behave alike. */
export function marqueeIds(positions,rect,base=[]){
  const ids=new Set(base);
  for(const [id,p]of positions)if(id!=='root'&&p.x+p.width>=rect.left&&p.x<=rect.right&&p.y+p.height>=rect.top&&p.y<=rect.bottom)ids.add(id);
  return [...ids];
}
