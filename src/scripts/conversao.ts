// Eventos de conversão do site, para Google Tag Manager / GA4.
//
// Não há ID de GTM nem de GA4 configurado no projeto: este módulo só EMPILHA os eventos no
// `window.dataLayer` (o formato que o GTM lê) e, se um `gtag` existir na página, espelha para
// ele. Para os eventos chegarem a algum lugar falta instalar o contêiner ou o gtag.js no
// Layout, com o ID da propriedade.
//
// Eventos:
//   whatsapp_click     clique em qualquer link do WhatsApp comercial da Beorange
//   generate_lead      envio válido de formulário (nome de evento recomendado do GA4)
//   newsletter_signup  envio do formulário de assinatura de conteúdo
//
// Parâmetros: ponto (onde na página), pagina (caminho) e, no WhatsApp, link_url.
// "ponto" vem do data-ponto do próprio elemento; sem ele, do id da seção mais próxima.
// O WhatsApp é reconhecido pelo endereço (api.whatsapp.com/send), então um link novo é
// medido mesmo que ninguém lembre de marcá-lo. Os links de COMPARTILHAR artigo usam
// wa.me/?text= e ficam de fora de propósito: não são conversão.

type Evento = Record<string, unknown> & { event: string };

const w = window as unknown as { dataLayer?: Evento[]; gtag?: (...a: unknown[]) => void };

function registrar(evento: Evento) {
  (w.dataLayer = w.dataLayer || []).push(evento);
  if (typeof w.gtag === "function") {
    const { event, ...parametros } = evento;
    w.gtag("event", event, parametros);
  }
}

function pontoDe(el: Element, padrao: string): string {
  const marcado = el.closest<HTMLElement>("[data-ponto]")?.dataset.ponto;
  if (marcado) return marcado;
  const secao = el.closest("section[id], header, footer");
  return secao?.id || secao?.tagName.toLowerCase() || padrao;
}

function ehWhatsApp(a: HTMLAnchorElement): boolean {
  try {
    const u = new URL(a.href, location.href);
    return u.hostname === "api.whatsapp.com" && u.pathname.startsWith("/send");
  } catch {
    return false;
  }
}

document.addEventListener("click", (e) => {
  const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
  if (!a || !ehWhatsApp(a)) return;
  registrar({
    event: "whatsapp_click",
    ponto: pontoDe(a, "link-whatsapp"),
    pagina: location.pathname,
    link_url: a.href,
  });
});

// O evento "submit" só dispara com o formulário válido (os `required` já passaram). Como os
// formulários ainda não enviam a lugar nenhum (o envio é o aviso do protótipo), o evento
// marca a INTENÇÃO concluída; quando o envio real for ligado, mantenha este registro.
document.addEventListener("submit", (e) => {
  const form = e.target as HTMLFormElement | null;
  const tipo = form?.dataset.conv;
  if (!form || !tipo) return;
  registrar({
    event: tipo === "newsletter" ? "newsletter_signup" : "generate_lead",
    ponto: pontoDe(form, "formulario"),
    pagina: location.pathname,
  });
});
