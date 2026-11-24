/* ===== TITIK MASUK =====*/
import { KEY_MAP } from './data/config.js';
import { LEVELS, randomLevel } from './data/levels.js';
import { CHARACTERS, getCharacterImage } from './data/sprites.js';
import { arrive, command, pump, requestHint, travelTo } from './logic/player.js';
import { saveStars } from './logic/progress.js';
import { createState, game, hooks } from './logic/state.js';
import { $, showScreen } from './ui/dom.js';
import { closeMenu, initHamburger, resetPanel, setMessage, updateHeader, updatePanel } from './ui/hud.js';
import { draw, nodeAtPointer, resizeCanvas } from './ui/render.js';
import { closeDialog, isDialogOpen, resultBodyHtml, showLevelSelect, showResult, showSettings } from './ui/screens.js';
import { sfx } from './ui/sfx.js';
import { playLegendVictory } from './ui/victory.js';
import { playEpilogue } from './ui/victory-epilogue.js';

/* Cutscene sinematik hanya untuk MENANG di "LEVEL 8 · LEGEND" dengan bobot PERSIS sama dengan MST. */
const LEGEND_INDEX = LEVELS.findIndex((l) => l.name.startsWith('LEVEL 8'));

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
hooks.sound = (name) => sfx[name]?.();
hooks.finish = (result) => {
    // Cutscene hanya untuk Level 8 yang dimenangkan dengan bobot PERSIS sama dengan MST.
    // Selisih sekecil apa pun (lebih berat) -> dialog hasil biasa seperti level lain.
    const isLegendWin = result.win && result.used === result.mst
        && LEGEND_INDEX >= 0 && game.levelIndex === LEGEND_INDEX;

    // Cutscene Level 8 punya musik sendiri, jadi jingle menang biasa tidak dimainkan di sana.
    if (!isLegendWin) setTimeout(result.win ? sfx.win : sfx.lose, 350); // jeda supaya tidak menabrak suara Poké Ball terakhir

    updateHeader();
    updatePanel();
    setMessage('');
    closeMenu();

    const hasNext = result.win && game.levelIndex >= 0 && game.levelIndex < LEVELS.length - 1;
    const openResult = () => showResult(result, {
        hasNext,
        onRestart: restartGame,
        onNext: nextLevel,
        onMenu: goToMenu,
    });

    if (isLegendWin) {
        // Simpan bintang asli (0–3) SEBELUM cutscene supaya progres aman walau tab ditutup di tengah cutscene.
        saveStars(game.state.level.name, result.stars);
        try {
            // Level 8 (bobot = MST): cutscene tetap berputar, lalu tombol ULANGI / MENU muncul di atasnya.
            playLegendVictory({
                stars: result.stars,
                bodyHtml: resultBodyHtml(result, { hasNext }),
                actions: {
                     restart: restartGame,
                    next: nextLevel,
                 menu: () => {
                       try {
                            playEpilogue({
                               onDone: goToMenu,
                              onFail: goToMenu,
                          });
                      } catch (err) {
                          console.error(err);
                         goToMenu();
                      }
                 },
                },
                onFail: openResult, // cutscene error -> dialog hasil biasa
            });
        } catch (err) {
            console.error(err);
            openResult();
        }
    } else {
        openResult();
    }
};

/* ---------- Lobby ---------- */

function setCharacter(id) {
    game.character = id;
    $('pc').src = getCharacterImage(id, 'd').src;
    $('partnerName').textContent = CHARACTERS[id].name;
    $('partnerInfo').textContent = CHARACTERS[id].info;
}

$('start').onclick = () => { sfx.click(); showLevelSelect({ onSelect: selectLevel }); };
$('how').onclick = () => { sfx.click(); showScreen('howto'); };
$('howBack').onclick = () => { sfx.click(); showScreen('lobby'); };
$('set').onclick = () => {
    sfx.click();
    showSettings({
        onCharacter: setCharacter,
        onSpeed: (ms) => { game.stepMs = ms; },
    });
};

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