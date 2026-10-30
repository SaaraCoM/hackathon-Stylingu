if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
window.addEventListener('offline',()=>{document.getElementById('productStatus').textContent='Sin conexión. Los datos personales y cambios necesitan conexión con tu cuenta.';});
