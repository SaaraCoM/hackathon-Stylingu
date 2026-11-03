const journeyDialog=document.getElementById('journeyDialog');
let journeyIndex=0;
const journeySteps=[...document.querySelectorAll('[data-journey-step]')];
const journeyTitles=['Empecemos por ti.','¿Qué te gustaría descubrir?','Tu estilo, sin etiquetas.','Maquillaje que va contigo.','Tu espacio está a un paso.'];
function renderJourney(){
 journeySteps.forEach((s,i)=>s.hidden=i!==journeyIndex);
 document.getElementById('journeyTitle').textContent=journeyTitles[journeyIndex];
 document.getElementById('journeyProgress').textContent=String(journeyIndex+1).padStart(2,'0')+' / 05';
 document.getElementById('journeyMeter').value=journeyIndex+1;
 document.getElementById('journeyBack').disabled=journeyIndex===0;
 document.getElementById('journeyNext').textContent=journeyIndex===4?'Crear mi espacio':'Continuar';
 document.getElementById('journeyError').hidden=true;
 document.getElementById('journeyTitle').focus();
}
function openJourney(){closeAccount();journeyDialog.hidden=false;if(journeyDialog.showModal)journeyDialog.showModal();else journeyDialog.setAttribute('open','');renderJourney();}
function closeJourney(){if(journeyDialog.close)journeyDialog.close();else journeyDialog.removeAttribute('open');journeyDialog.hidden=true;if(!currentUser)document.getElementById('gateContinueBtn').focus();}
document.getElementById('journeyClose').addEventListener('click',closeJourney);
document.getElementById('journeyBack').addEventListener('click',()=>{journeyIndex=Math.max(0,journeyIndex-1);renderJourney();});
document.querySelectorAll('[data-journey-choice]').forEach(b=>b.addEventListener('click',()=>{const group=b.closest('[data-choice-group]');const was=b.getAttribute('aria-pressed')==='true';if(group.dataset.multiple!=='true')group.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed',String(!was));}));
function selectedJourney(group){return [...document.querySelectorAll('[data-choice-group="'+group+'"] button[aria-pressed="true"]')].map(b=>b.dataset.journeyChoice);}
function registrationAnswers(){
 const style=selectedJourney('style');
 return {preferences:{goals:selectedJourney('goals'),styles:style,jewelry:''},declared:{style:style.join(', '),skinType:document.getElementById('journeySkin').value,finish:document.getElementById('journeyFinish').value,intensity:document.getElementById('journeyIntensity').value,budget:document.getElementById('journeyBudget').value===''?null:Number(document.getElementById('journeyBudget').value),currency:'EUR',restrictions:document.getElementById('journeyRestrictions').value.split(',').map(s=>s.trim()).filter(Boolean)}};
}
document.getElementById('journeyNext').addEventListener('click',async()=>{
 const error=document.getElementById('journeyError');error.hidden=true;
 try{
  if(journeyIndex===0){const name=document.getElementById('journeyName');if(!name.value.trim())throw new Error('Cuéntanos cómo te llamas.');const age=ageFromBirthDate(document.getElementById('journeyBirth').value);if(age===null||age<16)throw new Error('Indica una fecha válida. Debes tener al menos 16 años.');}
  if(journeyIndex===1&&!selectedJourney('goals').length)throw new Error('Elige al menos lo que más te interesa.');
  if(journeyIndex<4){journeyIndex++;renderJourney();return;}
  for(const id of ['journeyEmail','journeyPassword']){const field=document.getElementById(id);if(!field.reportValidity())return;}
  if(!document.getElementById('journeyPrivacy').checked)throw new Error('Confirma que has leído cómo se utilizan tus datos.');
  for(const [to,from] of [['accountName','journeyName'],['accountBirthDate','journeyBirth'],['accountEmail','journeyEmail'],['accountPassword','journeyPassword']])document.getElementById(to).value=document.getElementById(from).value;
  const button=document.getElementById('journeyNext');button.disabled=true;
  try{const ok=await submitAuth('/auth/registro',registrationAnswers());if(ok){document.getElementById('journeyPassword').value='';closeJourney();showConsultation();}else throw new Error(document.getElementById('accountError').textContent||'No se pudo crear la cuenta.');}finally{button.disabled=false;}
 }catch(e){error.textContent=e.message;error.hidden=false;error.focus();}
});
journeyDialog.addEventListener('cancel',e=>{e.preventDefault();closeJourney();});
