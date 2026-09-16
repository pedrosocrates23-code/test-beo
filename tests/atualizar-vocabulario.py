# -*- coding: utf-8 -*-
"""
Reduz o vocabulário schema.org oficial (1,5 MB) ao que o validador precisa.

Guarda, para cada classe, os supertipos diretos; e para cada propriedade, em que classes ela
é válida. Com isso o teste confere não só se o nome existe, mas se a propriedade cabe NAQUELE
tipo — `telephone` em Organization vale, `telephone` em BlogPosting não.

Fonte: https://schema.org/version/latest/schemaorg-current-https.jsonld
Regenerar quando o schema.org publicar versão nova (o arquivo guarda a data da coleta).
"""
import io, json, os, sys, datetime

sys.stdout.reconfigure(encoding="utf-8")
# Baixa direto da fonte. Rodar a partir de astro/:  python tests/atualizar-vocabulario.py
import urllib.request
FONTE = "https://schema.org/version/latest/schemaorg-current-https.jsonld"
print(f"baixando {FONTE}")
d = json.loads(urllib.request.urlopen(FONTE, timeout=90).read().decode("utf-8"))

def nome(x):
    if isinstance(x, dict): x = x.get("@id", "")
    return str(x).split(":")[-1].split("/")[-1]

def lista(v):
    if v is None: return []
    return v if isinstance(v, list) else [v]

classes, propriedades = {}, {}
for n in d.get("@graph", []):
    # O arquivo oficial traz tambem classes de outros vocabularios (gs1:, rdf:, dcterms:).
    # Sem este filtro, gs1:Country sobrescreve schema:Country e a hierarquia se perde — o que
    # fez o validador reprovar `name` em Country, uma propriedade que todo Thing tem.
    if not str(n.get("@id", "")).startswith("schema:"):
        continue
    tipos = [nome(t) for t in lista(n.get("@type"))]
    if "Class" in tipos:
        classes[nome(n)] = sorted({nome(s) for s in lista(n.get("rdfs:subClassOf"))})
    elif "Property" in tipos:
        propriedades[nome(n)] = sorted({nome(s) for s in lista(n.get("schema:domainIncludes"))})

saida = {
    "fonte": "https://schema.org/version/latest/schemaorg-current-https.jsonld",
    "coletadoEm": datetime.date.today().isoformat(),
    "classes": classes,
    "propriedades": propriedades,
}
destino = os.path.abspath(os.path.join("tests", "schema-org-vocabulario.json"))
os.makedirs(os.path.dirname(destino), exist_ok=True)
io.open(destino, "w", encoding="utf-8", newline="\n").write(
    json.dumps(saida, ensure_ascii=False, separators=(",", ":"), sort_keys=True))
print(f"{len(classes)} classes e {len(propriedades)} propriedades")
print(f"{os.path.getsize(destino)/1024:.0f} KB em {destino}")
