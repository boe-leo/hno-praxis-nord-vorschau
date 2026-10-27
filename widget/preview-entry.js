// A directly opened file cannot resolve the shared /hno/ assets or booking API.
// Keep this a relative, classic script so it also runs from the filesystem.
if (location.protocol === 'file:') {
  location.replace('http://127.0.0.1:8765/widget/');
}

if (new URLSearchParams(location.search).get('embed') === '1' && window.parent !== window) {
  document.documentElement.classList.add('widget-embed');
}
