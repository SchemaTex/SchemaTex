const root = './engineering-review/';
async function main() {
  const [manifest, source] = await Promise.all([
    fetch(root + 'after/results.json').then(r => { if (!r.ok) throw Error('Candidate manifest unavailable'); return r.json(); }),
    fetch(root + 'logic.sx').then(r => { if (!r.ok) throw Error('Source unavailable'); return r.text(); })
  ]);
  const result = manifest.find(c => c.id === 'logic');
  document.querySelector('#candidate-meta').textContent = `Actual SVG · v${result.version} · ${result.commit} · render status: ${result.status}`;
  document.querySelector('#source').textContent = source;
  document.querySelector('#diagnostics').textContent = JSON.stringify(result.diagnostics, null, 2);
  const images = [...document.querySelectorAll('.comparison img')];
  const dimensions = await Promise.all(images.map(async img => {
    const svg = new DOMParser().parseFromString(await (await fetch(img.src)).text(), 'image/svg+xml').documentElement;
    const view = svg.getAttribute('viewBox').split(/[ ,]+/).map(Number);
    return { img, width: view[2], height: view[3] };
  }));
  const resize = () => {
    const scale = Math.min(...dimensions.map(({img,width,height}) => Math.min((img.parentElement.clientWidth-24)/width,(img.parentElement.clientHeight-48)/height)));
    for (const {img,width,height} of dimensions) { img.style.width = width*scale+'px'; img.style.height = height*scale+'px'; }
  };
  new ResizeObserver(resize).observe(document.querySelector('.comparison'));
  resize();
  document.body.dataset.ready = 'true';
}
main().catch(error => {
  document.querySelector('#candidate-meta').textContent = error.message;
  document.body.dataset.error = 'true';
  console.error(error);
});
const viewer = document.querySelector('#viewer');
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-image]');
  if (!trigger) return;
  document.querySelector('#viewer-label').textContent = trigger.dataset.label;
  const img = document.querySelector('#viewer-image');
  img.src = root + trigger.dataset.image; img.alt = trigger.dataset.label;
  viewer.showModal();
});
document.querySelector('#close-viewer').addEventListener('click', () => viewer.close());
