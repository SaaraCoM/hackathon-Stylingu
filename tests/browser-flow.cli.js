// playwright-cli -s=<sesión abierta en el origen> run-code --filename=tests/browser-flow.cli.js
async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const origin = page.url().split('/').slice(0, 3).join('/');
  await page.goto(origin);
  if (await page.locator('#onboardSheet').isVisible()) await page.getByRole('button', { name: 'Omitir', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar o crear cuenta', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Prueba navegador Worker');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('browser-' + Date.now() + '@example.test');
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill('Prueba-Temporal-' + Date.now());
  await page.locator('#accountBirthDate').fill('1995-04-12');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.locator('#accountModal.open').waitFor({ state: 'hidden', timeout: 30000 });
  await page.locator('#consultationModal').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Analizar fotos', exact: true }).click();
  if (!await page.locator('#consultationError').isVisible()) throw new Error('Falta validación de las dos fotos');
  await page.getByLabel('Foto de cara', { exact: true }).setInputFiles('.tmp-flow/face.png');
  await page.getByLabel('Foto de cuerpo', { exact: true }).setInputFiles('.tmp-flow/body.png');
  await page.locator('#bodyPreview').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Analizar fotos', exact: true }).click();
  await page.getByRole('heading', { name: 'Tu análisis está guardado · Simulación' }).waitFor({ timeout: 30000 });
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/auth/perfil');
    if (!response.ok) throw new Error('Perfil no recuperable');
    return (await response.json()).analysis;
  });
  for (const value of [result.colorimetry.season, result.makeup.faceShape, result.makeup.eyeShape, result.makeup.eyelinerType, result.makeup.shadowPlacement, result.makeup.blushPlacement, result.outfit.style, result.outfit.silhouette]) {
    if (!(await page.locator('#consultationResults').innerText()).includes(value)) throw new Error('El resultado visible no coincide con MongoDB');
  }
  await page.screenshot({ path: 'docs/evidencia/flujo-personal/worker-results.png' });
  await page.getByRole('button', { name: 'Ver mi dossier', exact: true }).click();
  await page.reload();
  await page.locator('#analysisSummary').filter({ hasText: result.colorimetry.season }).waitFor({ timeout: 30000 });
  await page.locator('#openConsultBtn').click();
  await page.locator('#facePreview').waitFor({ state: 'visible' });
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error('Desbordamiento horizontal en móvil');
  await page.getByLabel('Foto de cara', { exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  if (!await page.getByRole('button', { name: 'Ver mi dossier', exact: true }).evaluate(el => el === document.activeElement)) throw new Error('Foco sale del diálogo');
  await page.keyboard.press('Escape');
  if (await page.locator('#consultationModal').isVisible()) throw new Error('Escape no cierra');
  if (errors.length) throw new Error(errors.join('\n'));
  return { origin, upload: 'dos PNG reales de prueba', analysisMatchesDatabase: true, reload: true, mobileOverflow: false, keyboard: 'Tab y Escape correctos', consoleErrors: errors.length };
}
