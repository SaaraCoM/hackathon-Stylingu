import makeupCatalog from '../frontend/public/makeup-catalog.json' with {type:'json'};

// Names verified on the official US brand page on 2026-10-28.
// No price, barcode, calibrated hex or per-shade INCI has been verified.
export const source='https://www.maybelline.com/lip-makeup/lip-gloss/pink-lip-gloss';
export const product={_id:'maybelline-lifter-gloss',brand:'Maybelline',name:'Lifter Gloss',category:'labial',description:'Brillo de labios. Confirma el tono y mercado en tu envase.',source,checkedAt:'2026-10-28T12:00:00Z'};
export const variants=['Moon','Petal','Ice'].map(shade=>({_id:'maybelline-lifter-'+shade.toLowerCase(),productId:product._id,shade,market:'US',finish:'brillo',hex:'',colorVerified:false,barcodes:[],ingredients:[],ingredientsComplete:false,source,checkedAt:product.checkedAt}));
export async function seedCatalog(repo){
 await repo.upsertProduct(product);
 for(const v of variants)await repo.upsertVariant(v);
 for(const entry of makeupCatalog.products){
  const {shades,finish,market,...p}=entry;
  await repo.upsertProduct({...p,description:'Referencia de la marca. Confirma el tono y mercado en tu envase.',checkedAt:makeupCatalog.checkedAt});
  for(const tone of shades)await repo.upsertVariant({
   _id:p._id+'-'+tone.shade.toLowerCase(),productId:p._id,shade:tone.shade,market,
   finish:tone.finish||finish,hex:'',colorVerified:false,barcodes:[],ingredients:[],
   ingredientsComplete:false,source:p.source,checkedAt:makeupCatalog.checkedAt
  });
 }
}
