import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import {validateFace,type Point} from './geometry';
export async function detectFace(image:HTMLImageElement,signal:AbortSignal):Promise<Point[]> {
 signal.throwIfAborted();
 const vision=await FilesetResolver.forVisionTasks('/vision/wasm');
 signal.throwIfAborted();
 const response=await fetch('/vision/face-landmarker.task',{signal,credentials:'same-origin'});
 if(!response.ok)throw new Error('No se pudo cargar el detector. Reintenta cuando tengas conexión.');
 const model=new Uint8Array(await response.arrayBuffer());signal.throwIfAborted();
 const detector=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetBuffer:model,delegate:'CPU'},runningMode:'IMAGE',numFaces:2,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false});
 try {
  signal.throwIfAborted();
  const faces=detector.detect(image).faceLandmarks;
  if(!faces.length)throw new Error('No se ha detectado un rostro. Prueba una foto frontal, bien iluminada y sin cubrir ojos ni labios.');
  if(faces.length!==1)throw new Error('Hay más de una cara. Usa una foto en la que aparezcas solo tú.');
  validateFace(faces[0],image.naturalWidth,image.naturalHeight);
  return faces[0];
 } finally {detector.close();}
}
