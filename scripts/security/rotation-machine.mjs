// Provider-independent resumable protocol. Persistent state contains identifiers only.
export async function advanceRotation({state,save,provider,now=Date.now(),periodMs,graceMs=86400000}) {
  if(state.phase==='active'){
    if(now-state.createdAt<periodMs)return state;
    const candidate=await provider.prepare(state); // Must publish the candidate securely before returning.
    state={...state,phase:'prepared',candidate,preparedAt:now};await save(state);
  }
  if(state.phase==='prepared'){
    if(!await provider.verifyCandidate(state))throw new Error('Candidate verification failed; current credential retained.');
    await provider.promote(state);
    state={...state,phase:'promoted',promotedAt:now};await save(state);
  }
  if(state.phase==='promoted'){
    if(now-state.promotedAt<graceMs)return state;
    if(!await provider.consumersReady(state))throw new Error('Consumers have not converged; old credential retained.');
    await provider.revoke(state.currentId);
    state={phase:'active',currentId:state.candidate.id,createdAt:now};await save(state);
  }
  return state;
}
