// Cuenta de prueba y fotos del Figma (en .tmp-flow). Ejecutar en una sesión nueva.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  const origin = page.url().split('/').slice(0,3).join('/');
  const runtime = origin.includes('8787') ? 'worker' : 'backend';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width:1280, height:1000 });
  await page.goto(origin);
  await page.getByRole('button',{ name:'Entrar o crear cuenta',exact:true }).click();
  if (await page.locator('#appShell').isVisible()) throw new Error('Shell visible antes del análisis');
  await page.getByRole('textbox',{name:'Nombre',exact:true}).fill('Prueba diseño');
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('figma-'+Date.now()+'@example.test');
  await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill('Figma-Test-'+Date.now());
  await page.locator('#accountBirthDate').fill('1995-04-12');
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
  await page.locator('#consultationModal').waitFor({state:'visible'});
  await page.getByLabel('Foto de cara',{exact:true}).setInputFiles('.tmp-flow/figma-face.jpg');
  await page.getByLabel('Foto de cuerpo',{exact:true}).setInputFiles('.tmp-flow/figma-body.jpg');
  await page.locator('#bodyPreview').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Analizar fotos',exact:true}).click();
  await page.getByRole('heading',{name:'Tu análisis está guardado · Simulación'}).waitFor({timeout:30000});
  await page.getByRole('button',{name:'Ver mi dossier',exact:true}).click();
  await page.locator('#appShell').waitFor({state:'visible'});
  const analysis = await page.evaluate(async () => (await (await fetch('/api/auth/perfil')).json()).analysis);
  if (await page.locator('#seasonName').innerText() !== analysis.colorimetry.season) throw new Error('Estación incorrecta');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('#tab-color img')].every(i=>i.complete && i.naturalWidth>0));
  await page.screenshot({path:`docs/evidencia/figma/${runtime}-color.png`,fullPage:true});
  await page.locator('#swatches button').nth(1).click();
  if (!await page.locator('#swatchName').innerText().then(t=>t.includes(analysis.colorimetry.palette[1]))) throw new Error('Selección de paleta');
  const download = page.waitForEvent('download');
  await page.locator('#exportAnalysisBtn').click();
  if ((await download).suggestedFilename() !== 'stylingu-dossier.json') throw new Error('Exportación');
  await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('show'));
  const overflowChecks = [];
  for (const width of [1280,768,390]) {
    await page.setViewportSize({width,height:900});
    for (const tab of ['color','makeup','armario','piel']) {
      await page.locator('#nav-'+tab).click();
      await page.waitForFunction(id => document.getElementById(id).classList.contains('active'),'tab-'+tab);
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      if(overflow) throw new Error(`Desbordamiento ${tab} ${width}`);
      overflowChecks.push(`${tab}:${width}`);
      if (tab !== 'piel' && width !== 768) {
        await page.locator('#tab-'+tab).locator('img').evaluateAll(async imgs => {
          imgs.forEach(i=>{i.loading='eager';});
          await Promise.all(imgs.map(i=>i.decode()));
        });
        await page.screenshot({path:`docs/evidencia/figma/${runtime}-${tab}-${width}.png`,fullPage:true});
      }
    }
  }
  await page.locator('#nav-armario').click();
  await page.locator('#shuffleBtn').click();
  await page.locator('#outfitCounter').filter({hasText:'2 de'}).waitFor();
  await page.locator('#saveOutfitBtn').click();
  await page.locator('#toast').filter({hasText:'guardado en tu cuenta'}).waitFor({timeout:30000});
  const saved = await page.evaluate(async ()=>(await(await fetch('/api/armario')).json()).items.length);
  if(!saved) throw new Error('Armario no persistido');
  await page.locator('#nav-color').click();
  await page.keyboard.press('ArrowRight');
  if(!await page.locator('#tab-armario').isVisible()) throw new Error('Navegación con teclado');
  await page.locator('#openConsultBtn').click();
  await page.getByLabel('Foto de cara',{exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  if(!await page.getByRole('button',{name:'Ver mi dossier',exact:true}).evaluate(el=>el===document.activeElement)) throw new Error('Foco fuera del diálogo');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.locator('#appShell').waitFor({state:'visible',timeout:30000});
  if(await page.locator('#seasonName').innerText()!==analysis.colorimetry.season) throw new Error('Restauración');
  const photos = await page.locator('[data-analysis-photo]').evaluateAll(imgs=>imgs.map(i=>({slot:i.dataset.analysisPhoto,src:i.getAttribute('src')})));
  if(photos.some(p=>p.src!==analysis.photos[p.slot])) throw new Error('Foto no coincide con perfil');
  await page.setViewportSize({width:1280,height:1000});
  if(errors.length) throw new Error(errors.join('\n'));
  return {runtime,registration:true,upload:true,analysisMatchesProfile:true,privatePhotoSlots:photos.length,export:true,persistedOutfits:saved,responsive:overflowChecks,keyboard:true,reload:true,consoleErrors:0};
}
