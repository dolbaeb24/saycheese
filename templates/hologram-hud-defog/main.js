import { makeFilm } from './film.js';
const cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['300', '400', '500', '600', '700'].map(w => document.fonts.load(`${w} 40px Exo2`)).concat([document.fonts.load('400 20px JBMono')]));
const film = makeFilm();
window.DUR = film.DUR;
window.EV = film.EV;
window.CUES = film.CUES;
window.render = t => film.render(g, t);
window.READY = true;
