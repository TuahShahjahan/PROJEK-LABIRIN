/* ===== TITIK MASUK =====
   Menghubungkan logika game, tampilan, dan input.
   Alur: Lobby -> pilih level -> main -> hasil (Ulangi / Lanjut / Menu). */
import { KEY_MAP } from './data/config.js';
import { LEVELS, randomLevel } from './data/levels.js';
import { CHARACTERS, getCharacterImage } from './data/sprites.js';
import { arrive, command, pump, requestHint, travelTo } from './logic/player.js';
import { createState, game, hooks } from './logic/state.js';
import { $, showScreen } from './ui/dom.js';
import { closeMenu, initHamburger, resetPanel, setMessage, updateHeader, updatePanel } from './ui/hud.js';
import { draw, nodeAtPointer, resizeCanvas } from './ui/render.js';
import { closeDialog, isDialogOpen, showHowToPlay, showLevelSelect, showResult, showSettings } from './ui/screens.js';

/* ---------- Alur permainan ---------- */

/** Mulai level. index = nomor di LEVELS (-1 = level acak); level = data level. */
function startGame(index, level) {
    const state = createState(level);
    if (!state) { alert('Graph tidak terhubung!'); return; }

    game.levelIndex = index;
    game.state = state;

    closeDialog();
    closeMenu();
    resizeCanvas(state.g);
    resetPanel(level);
    showScreen('game');
    updateHeader();
    updatePanel();
}

/** Ulangi level yang sedang dimainkan (level acak tetap sama). */
function restartGame() {
    if (game.state) startGame(game.levelIndex, game.state.level);
}

/** Lanjut ke level berikutnya. */
function nextLevel() {
    const next = game.levelIndex + 1;
    startGame(next, LEVELS[next]);
}

/** Kembali ke menu utama. */
function goToMenu() {
    game.state = null;
    closeDialog();
    closeMenu();
    showScreen('lobby');
    updateHeader();
}

/** Pilihan dari dialog "Pilih Level". */
function selectLevel(index) {
    startGame(index, index < 0 ? randomLevel() : LEVELS[index]);
}

/* ---------- Hook dari logika game ke tampilan ---------- */

hooks.change = () => { updateHeader(); updatePanel(); };
hooks.message = setMessage;
hooks.finish = (result) => {
    updateHeader();
    updatePanel();
    setMessage('');
    closeMenu();
    showResult(result, {
        hasNext: result.win && game.levelIndex >= 0 && game.levelIndex < LEVELS.length - 1,
        onRestart: restartGame,
        onNext: nextLevel,
        onMenu: goToMenu,
    });
};

/* ---------- Lobby ---------- */

function setCharacter(id) {
    game.character = id;
    $('pc').src = getCharacterImage(id, 'd').src;
    $('partnerName').textContent = CHARACTERS[id].name;
    $('partnerInfo').textContent = CHARACTERS[id].info;
}

$('start').onclick = () => showLevelSelect({ onSelect: selectLevel });
$('how').onclick = showHowToPlay;
$('set').onclick = () => showSettings({
    onCharacter: setCharacter,
    onSpeed: (ms) => { game.stepMs = ms; },
});

/* ---------- Di dalam game ---------- */

initHamburger({ restart: restartGame, menu: goToMenu });

$('hint').onclick = requestHint;
$('dtg').onclick = () => {
    if (!game.state) return;
    game.state.showDist = !game.state.showDist;
    updatePanel();
};

/* ---------- Input ---------- */

addEventListener('keydown', (e) => {
    const dir = KEY_MAP[e.key];
    if (!dir || !game.state) return;
    e.preventDefault();                       // cegah halaman ikut scroll
    if (e.repeat || isDialogOpen()) return;
    command(dir);
});

document.querySelectorAll('.pad button').forEach((btn) =>
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        command(btn.dataset.d);
    }));

$('cv').addEventListener('pointerdown', (e) => {
    const node = nodeAtPointer(e);
    if (node) travelTo(node.id);
});

/* ---------- Game loop ---------- */

function frame(ts) {
    const S = game.state;
    if (S && !S.over) {
        if (S.mv && ts - S.mv.t0 >= S.mv.dur) arrive();
        if (!S.over) pump(ts);
    }
    draw(ts);
    requestAnimationFrame(frame);
}

setCharacter(game.character);
requestAnimationFrame(frame);
