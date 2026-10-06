function connectionStatus() {
  document.querySelector('#connection-status').textContent = navigator.onLine ? '' : 'Você está sem conexão. Conecte-se para atualizar os dados.';
}
addEventListener('online', connectionStatus);
addEventListener('offline', connectionStatus);
connectionStatus();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
