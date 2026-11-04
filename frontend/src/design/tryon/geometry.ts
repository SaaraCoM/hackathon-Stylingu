export interface Point { x:number; y:number; z?:number }
// MediaPipe's face-mesh topology. Inner mouth is excluded, including teeth.
export const OUTER_LIPS=[61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];
export const INNER_LIPS=[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];
const EYES=[{lid:[33,246,161,160,159,158,157,173,133],brow:[46,53,52,65,55]}, {lid:[263,466,388,387,386,385,384,398,362],brow:[276,283,282,295,285]}];
export const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export function validateFace(points:Point[],width:number,height:number) {
 if(points.length<468 || points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))throw new Error('El rostro queda fuera de la imagen. Usa una foto con la cara completa.');
 const faceWidth=Math.abs(points[454].x-points[234].x)*width;
 const faceHeight=Math.abs(points[152].y-points[10].y)*height;
 if(faceWidth<90 || faceHeight<110)throw new Error('El rostro se ve demasiado pequeño. Usa una foto más cercana y nítida.');
}
export function eyePolygons(points:Point[]):Point[][] {
 return EYES.map(({lid,brow})=>{
  const lower=lid.map(i=>points[i]);
  const upper=lower.map((p,index)=>{
   const position=index/(lower.length-1)*(brow.length-1),left=Math.floor(position),right=Math.min(left+1,brow.length-1),mix=position-left;
   const a=points[brow[left]],b=points[brow[right]];
   // A band between the actual eyelid and brow follows head rotation.
   const extent=Math.sin(Math.PI*index/(lower.length-1))*.42;
   return {x:p.x+((a.x+(b.x-a.x)*mix)-p.x)*extent,y:p.y+((a.y+(b.y-a.y)*mix)-p.y)*extent};
  });
  return [...lower,...upper.reverse()];
 });
}
