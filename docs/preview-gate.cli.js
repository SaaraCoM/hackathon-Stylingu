async page => {
  await page.setContent('<html lang="es"><meta charset="utf-8"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#efeae2;color:#201a15;font:16px/1.6 system-ui}main{max-width:460px;margin:24px;padding:40px;border-radius:28px;background:#fffdf9}h1{font-size:28px;line-height:1.2}button{padding:14px 22px;border:0;border-radius:24px;background:#201a15;color:white;font:inherit}</style><main><small>STYLINGU</small><h1>Primero, tu análisis</h1><p>Sube una foto de cara y otra de cuerpo. Tu espacio personalizado estará disponible cuando el análisis esté listo.</p><p>Entra o crea tu cuenta para empezar.</p><button>Entrar o crear cuenta</button></main></html>');
  await page.screenshot({path:'docs/evidencia/flujo-personal/preview-gate.png'});
}
