// Campos de telefone e e-mail — comportamento de TODO formulário do site.
//
// Pedido do cliente (29/09/2026), valendo "para qualquer formulário que for ser feito". Por
// isso isto não mora em nenhum componente: o Layout carrega este módulo em toda página, e ele
// age sobre qualquer <input type="tel"> e <input type="email"> que estiver dentro de um <form>.
// Formulário novo não precisa fazer nada além de usar o type certo.
//
// Sem JavaScript os campos continuam campos comuns: o formulário funciona, só sem a máscara e
// sem as sugestões.

// ---------------------------------------------------------------------------------------
// TELEFONE
// Só números, máscara brasileira e DDD obrigatório.
//   fixo:    (41) 9644-0060   — 10 dígitos
//   celular: (41) 99693-0218  — 11 dígitos, o terceiro é sempre 9
// No celular, inputmode="numeric" abre o teclado só de números (o "tel" do iOS traz * e #).
// ---------------------------------------------------------------------------------------

/** Tira tudo que não é dígito e o 55 do país, se a pessoa colou o número internacional. */
function digitos(valor: string): string {
  let d = valor.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

function mascarar(d: string): string {
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  // Enquanto não passa de 10 dígitos, divide como fixo (4 + 4); no 11º, como celular (5 + 4).
  const corte = d.length === 11 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Mensagem de erro, ou "" quando o número é válido (ou o campo está vazio). */
function validarTelefone(d: string): string {
  if (d.length === 0) return "";
  if (d.length < 10) return "Informe o DDD e o número, por exemplo (41) 99999-9999.";
  if (d[0] === "0" || d[1] === "0") return "O DDD não pode ter zero. Exemplo: (41).";
  if (d.length === 11 && d[2] !== "9") return "Celular com 11 dígitos começa com 9 depois do DDD.";
  return "";
}

function prepararTelefone(campo: HTMLInputElement) {
  campo.inputMode = "numeric";
  if (!campo.autocomplete) campo.autocomplete = "tel-national";
  if (!campo.placeholder) campo.placeholder = "(00) 00000-0000";
  campo.maxLength = 15; // "(41) 99693-0218"

  // Letra nem chega a entrar: o caractere é recusado antes de aparecer no campo. Colar e
  // arrastar passam, porque o texto colado é limpo logo em seguida pelo "input".
  campo.addEventListener("beforeinput", (e) => {
    if (e.inputType === "insertText" && e.data && /\D/.test(e.data)) e.preventDefault();
  });

  campo.addEventListener("input", () => {
    // O cursor é reposicionado pela contagem de DÍGITOS antes dele, não pela posição no texto:
    // a máscara insere parênteses, espaço e hífen, e sem isso o cursor pularia para o fim a
    // cada tecla quando a pessoa corrige um número no meio.
    const antes = campo.value.slice(0, campo.selectionStart ?? campo.value.length).replace(/\D/g, "").length;
    const d = digitos(campo.value);
    campo.value = mascarar(d);
    let pos = 0, vistos = 0;
    while (pos < campo.value.length && vistos < antes) {
      if (/\d/.test(campo.value[pos])) vistos++;
      pos++;
    }
    campo.setSelectionRange(pos, pos);
    // A validade é atualizada a cada tecla, mas nada aparece na tela por isso: a mensagem do
    // navegador só surge quando a pessoa tenta enviar, e o site não pinta :invalid (pedido do
    // cliente: nada de vermelho em volta do campo). Precisa ser aqui, e não no "submit",
    // porque o navegador valida ANTES de disparar o submit — com Enter no meio do número, um
    // telefone incompleto passaria.
    campo.setCustomValidity(validarTelefone(d));
  });
}

// ---------------------------------------------------------------------------------------
// E-MAIL
// Teclado com @ no celular (inputmode="email") e sugestões prontas enquanto a pessoa digita,
// por <datalist>: o navegador mostra a lista sob o campo no computador e na barra de
// sugestões do teclado no celular, e a pessoa escolhe com um toque.
//   "joao"             → joao@gmail.com, joao@hotmail.com, joao@outlook.com …
//   "joao@ho"          → joao@hotmail.com
//   "joao@empresa"     → joao@empresa.com.br, joao@empresa.com   (e-mail corporativo)
// ---------------------------------------------------------------------------------------

const PROVEDORES = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "icloud.com"];
const FINAIS = [".com.br", ".com"];

function sugestoes(valor: string): string[] {
  const v = valor.trim().toLowerCase();
  if (!v || /\s/.test(v)) return [];
  const arroba = v.indexOf("@");
  if (arroba === -1) return PROVEDORES.map((p) => `${v}@${p}`);
  const usuario = v.slice(0, arroba);
  const dominio = v.slice(arroba + 1);
  // Provedor conhecido já completo ("gmail.com"): não há o que sugerir — sem isto ele
  // oferecia "gmail.com.br", que não existe.
  if (!usuario || dominio.includes("@") || PROVEDORES.includes(dominio)) return [];
  const provedores = PROVEDORES.filter((p) => p.startsWith(dominio) && p !== dominio).map((p) => `${usuario}@${p}`);
  // Domínio próprio ainda sem ponto: sugere o final. É o caso do "E-mail corporativo". Só
  // quando o trecho não é começo de provedor conhecido: "joao@ho" é Hotmail a caminho, e
  // "joao@ho.com.br" seria ruído.
  const finais = dominio && !dominio.includes(".") && provedores.length === 0
    ? FINAIS.map((f) => `${usuario}@${dominio}${f}`)
    : [];
  // Já com ponto, mas no meio de um final conhecido ("empresa.co" → ".com.br" e ".com").
  const parcial = dominio.match(/^([^.]+)(\..*)$/);
  const completar = parcial
    ? FINAIS.filter((f) => f.startsWith(parcial[2]) && f !== parcial[2]).map((f) => `${usuario}@${parcial[1]}${f}`)
    : [];
  return [...new Set([...provedores, ...finais, ...completar])].slice(0, 6);
}

let contador = 0;
function prepararEmail(campo: HTMLInputElement) {
  campo.inputMode = "email";
  if (!campo.autocomplete) campo.autocomplete = "email";
  campo.setAttribute("autocapitalize", "off");
  campo.spellcheck = false;

  const lista = document.createElement("datalist");
  lista.id = `sugestoes-email-${++contador}`;
  campo.after(lista);
  campo.setAttribute("list", lista.id);

  campo.addEventListener("input", () => {
    lista.replaceChildren(
      ...sugestoes(campo.value).map((s) => {
        const o = document.createElement("option");
        o.value = s;
        return o;
      }),
    );
  });
}

function preparar(raiz: ParentNode) {
  raiz.querySelectorAll<HTMLInputElement>("form input[type='tel']:not([data-campo-pronto])").forEach((c) => {
    c.dataset.campoPronto = "";
    prepararTelefone(c);
  });
  raiz.querySelectorAll<HTMLInputElement>("form input[type='email']:not([data-campo-pronto])").forEach((c) => {
    c.dataset.campoPronto = "";
    prepararEmail(c);
  });
}

preparar(document);
