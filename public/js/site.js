// Comportamento comum a todas as páginas: mega-menu do desktop, overlay do menu mobile,
// troca de estado do header ao rolar e a revelação dos blocos .rv ao entrarem na tela.
//
// Estava copiado dentro de cada página como <script is:inline>. Três cópias do mesmo código
// significavam três lugares para corrigir um bug de menu — e a home tinha a sua própria, o
// que já era um convite à divergência. Agora é um arquivo só, servido de /js/site.js.
//
// Não é módulo e não usa import: roda direto, depois do HTML, e mexe em elementos que o
// Header, o MobileMenu e as seções colocam na página. Toda consulta ao DOM é defensiva
// porque nem toda página tem todos os elementos — a home, por exemplo, não tem artigo.

  const solBtn=document.getElementById('solBtn'), mega=document.getElementById('mega');
  function closeMega(){mega.classList.remove('open');solBtn.setAttribute('aria-expanded','false');}
  solBtn.addEventListener('click',e=>{e.stopPropagation();const open=mega.classList.toggle('open');solBtn.setAttribute('aria-expanded',open);});
  document.addEventListener('click',e=>{if(!mega.contains(e.target)&&e.target!==solBtn)closeMega();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMega();});
  mega.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMega));
  // menu mobile: overlay do Figma (nos 51:5 / 52:2) no lugar do dropdown do prototipo
  const burger=document.getElementById('burger');
  const header=document.getElementById('top');
  const mm=document.getElementById('mobileMenu');
  const mmFechar=document.getElementById('mmFechar');
  const mmSol=document.getElementById('mmSolucoes');
  const mmSub=document.getElementById('mmSubmenu');
  function abrirMenu(v){
mm.hidden=!v;
burger.setAttribute('aria-expanded',String(v));
document.body.style.overflow=v?'hidden':'';
if(v){mmFechar.focus();}else{burger.focus();}
  }
  burger.setAttribute('aria-expanded','false');
  burger.addEventListener('click',function(){abrirMenu(mm.hidden);});
  mmFechar.addEventListener('click',function(){abrirMenu(false);});
  mm.addEventListener('click',function(e){if(e.target===mm){abrirMenu(false);}});
  mm.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){abrirMenu(false);});});
  mmSol.addEventListener('click',function(){
var aberto=mmSub.hidden;
mmSub.hidden=!aberto;
mmSol.setAttribute('aria-expanded',String(aberto));
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!mm.hidden){abrirMenu(false);}});
  // header muda para fundo claro ao rolar (sai da foto do hero)
  const onScroll=()=>header.classList.toggle('scrolled',window.scrollY>60);
  onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
  const io=new IntersectionObserver((es)=>{es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}})},{threshold:.12});
  document.querySelectorAll('.rv').forEach(el=>io.observe(el));
