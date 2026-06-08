const fs = require('fs');
const file = 'outputs/carnet_botanique_immersif_v6_soins.html';
const html = fs.readFileSync(file, 'utf8');

// 1) Syntax check of each inline <script> block
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).filter(s => s.trim());
scripts.forEach((s, i) => {
  try { new Function(s); console.log('script ' + (i + 1) + ' syntax ok'); }
  catch (e) { console.error('script ' + (i + 1) + ' syntax error: ' + e.message); process.exit(1); }
});

// 2) Essential DOM ids (immersif V6 structure)
const requiredIds = [
  'mainHeader','heroSection','heroTitle','heroBadge','heroText','searchInput',
  'plantCatalog','modeLearn','modeGarden',
  'flashBtn','quizBtn','proBtn','calBtn','printBtn','dashBtn',
  'flashcardSection','flashContainer',
  'quizSection','quizCard','quizScope','qm-fr','qm-fam','qm-lat','qm-photo','qsOk','qsNo','qsPc',
  'calSection','calGrid','calList',
  'dashSection','dashStats','dashCats','dashMastery',
  'printArea','imgZoom','imgZoomImg','plantDrawer','plantForm','toast'
];
for (const id of requiredIds) {
  if (!html.includes('id="' + id + '"')) { console.error('missing id ' + id); process.exit(2); }
}
console.log('required ids ok');

// 3) Dataset guard (>= 318 plants)
const m = html.match(/const basePlants = (\[[\s\S]*?\]);/);
let count = 0;
try { count = m ? JSON.parse(m[1]).length : 0; } catch (e) { count = 0; }
if (count < 318) { console.error('dataset incomplete: ' + count); process.exit(3); }
console.log('dataset ok (' + count + ' plants)');

// 4) Key functions present
const requiredFns = [
  'setMode','toggleFlashMode','toggleQuizMode','toggleCalMode','toggleDashMode',
  'toggleProMode','buildPrint','renderCatalog','newQuestion','answerQuiz',
  'openImgZoom','sectionImg','openDrawer','closeDrawer'
];
for (const fn of requiredFns) {
  if (!html.includes('function ' + fn + '(')) { console.error('missing function ' + fn); process.exit(4); }
}
console.log('key functions ok');
console.log('check_html: all conformant');
