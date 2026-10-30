// Auditoría de recursos y geometría sobre una sesión con análisis guardado.
async page => {
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', e=>{if(e.type()==='error') errors.push(e.text());});
  const runtime=page.url().includes('8787')?'worker':'backend';
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await page.locator('#appShell').waitFor({state:'visible',timeout:30000});
  const assets=new Set();
  for(const width of [1280,390,320]) {
    await page.setViewportSize({width,height:900});
    for(const tab of ['color','makeup','armario']) {
      await page.locator('#nav-'+tab).click();
      await page.evaluate(()=>scrollTo(0,0));
      await page.locator('#tab-'+tab+' img').evaluateAll(async imgs=>{
        imgs.forEach(i=>{i.loading='eager';});
        await Promise.all(imgs.map(i=>i.decode()));
      });
      const checked=await page.evaluate(async()=>{
        const failures=[],files=[];
        for(const img of document.querySelectorAll('img[src*="assets/figma/"]')) {
          if(!img.checkVisibility()) continue;
          const src=img.getAttribute('src'),rect=img.getBoundingClientRect();
          if(!img.complete || !img.naturalWidth || !rect.width || !rect.height) failures.push('vacío:'+src);
          files.push(src);
          if(src.endsWith('.svg')) {
            const svg=await(await fetch(src)).text();
            const root=new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;
            const w=Number(root.getAttribute('width')),h=Number(root.getAttribute('height'));
            if(Math.abs(rect.width-w)>.1 || Math.abs(rect.height-h)>.1) failures.push('SVG redimensionado:'+src);
          } else if(Math.abs((rect.width/rect.height)/(img.naturalWidth/img.naturalHeight)-1)>.01) failures.push('Imagen deformada:'+src);
        }
        if(document.documentElement.scrollWidth>innerWidth) failures.push('Desbordamiento');
        if(innerWidth<850) {
          const nav=document.querySelector('.bottomnav').getBoundingClientRect();
          if(nav.bottom>innerHeight || nav.top<innerHeight-100) failures.push('Navegación fuera del pie de pantalla');
        }
        return {failures,files};
      });
      if(checked.failures.length) throw new Error(checked.failures.join('\n'));
      checked.files.forEach(f=>assets.add(f));
      if(width!==320) await page.screenshot({path:`docs/evidencia/figma/${runtime}-${tab}-${width}.png`,fullPage:true});
    }
  }
  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nav-color').click();
  await page.evaluate(()=>scrollTo(0,0));
  if(errors.length) throw new Error(errors.join('\n'));
  return {runtime,visibleAssetsChecked:assets.size,svgIntrinsicGeometry:true,imageAspectRatio:true,mobileNavigation:true,widths:[1280,390,320],consoleErrors:0};
}
