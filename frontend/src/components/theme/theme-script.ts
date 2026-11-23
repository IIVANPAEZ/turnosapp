/**
 * Script que va en el <head> y corre ANTES de que se dibuje la página:
 * pone .dark o .light en <html> según la elección guardada en este
 * dispositivo ("turnosapp:tema") o, en "Automático", según el sistema.
 * Así no hay parpadeo del tema equivocado.
 */
export const THEME_KEY = "turnosapp:tema";
export const THEME_COLORS = { dark: "#121417", light: "#f5f6f8" } as const;

export const THEME_SCRIPT = `(function(){var d=document.documentElement;var mq=window.matchMedia('(prefers-color-scheme: dark)');
function apply(){var t=null;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}
var dark=t==='oscuro'||(t!=='claro'&&mq.matches);d.classList.toggle('dark',dark);d.classList.toggle('light',!dark);d.style.colorScheme=dark?'dark':'light';
var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].setAttribute('content',dark?'${THEME_COLORS.dark}':'${THEME_COLORS.light}');m[i].removeAttribute('media');}}
apply();window.__turnosappTheme=apply;try{mq.addEventListener('change',apply)}catch(e){}document.addEventListener('DOMContentLoaded',apply);})();`;
