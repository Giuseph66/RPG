import { type AuditResult, type Divergence, type Domain } from "./audit";
import { toTs, type SourcePatch } from "./patch";

const DOMAIN_LABEL: Readonly<Record<Domain, string>> = {
  classes: "Classes",
  progressao: "Progressão (bônus de proficiência)",
  racas: "Raças",
  subracas: "Sub-raças",
  pericias: "Perícias",
  condicoes: "Condições",
  equipamento: "Equipamento",
  "magias-livro": "Magias — catálogo do livro",
  "magias-pack": "Magias — definições automatizadas",
};

const show = (value: unknown): string => {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const cell = (value: unknown) => show(value).replace(/\|/g, "\\|").replace(/\n/g, " ");

function list(values: readonly string[], limit = Infinity): string {
  if (values.length === 0) return "nenhum";
  const shown = values.slice(0, limit).join(", ");
  return values.length > limit ? `${shown} … (+${values.length - limit})` : shown;
}

export interface ApplyOutcome {
  readonly applied: readonly SourcePatch[];
  readonly failed: readonly { readonly patch: SourcePatch; readonly reason: string }[];
}

export function markdownReport(result: AuditResult, meta: { readonly source: string; readonly fetchedAt: string }, outcome?: ApplyOutcome): string {
  const lines: string[] = [];
  const total = result.divergences.length;
  const applicable = result.divergences.filter((entry) => entry.patch).length;
  const exceptions = result.divergences.filter((entry) => entry.excecao).length;
  lines.push("# Auditoria de regras — nosso pack × SRD 5.1 (dnd5eapi.co)", "");
  lines.push(`Base: ${meta.source} (snapshot de ${meta.fetchedAt}). Unidades da API convertidas para as do livro: 1,5 m por 5 pés; 0,5 kg por libra.`, "");
  lines.push("A SRD é um subconjunto do Livro do Jogador: itens só nossos não são erro. Divergência não prova que o livro esteja errado — revise antes de aplicar.", "");
  lines.push(`**${total} divergência(s)**: ${applicable} corrigível(is) com \`npm run test --aplica\`, ${total - applicable - exceptions} de revisão manual, ${exceptions} exceção(ões) revisada(s) em que o livro prevalece.`, "");
  if (outcome) {
    lines.push(`**Modo --aplica:** ${outcome.applied.length} correção(ões) gravada(s), ${outcome.failed.length} falha(s).`, "");
    for (const failure of outcome.failed) lines.push(`- falhou \`${failure.patch.file}\` ${failure.patch.id}.${failure.patch.key}: ${failure.reason}`);
    if (outcome.failed.length) lines.push("");
  }
  lines.push("| Domínio | Comparados | Divergências | Aplicáveis | Manuais | Exceções |", "|---|---:|---:|---:|---:|---:|");
  for (const coverage of result.coverage) {
    const entries = result.divergences.filter((entry) => entry.domain === coverage.domain);
    const auto = entries.filter((entry) => entry.patch).length;
    const kept = entries.filter((entry) => entry.excecao).length;
    lines.push(`| ${DOMAIN_LABEL[coverage.domain]} | ${coverage.compared} | ${entries.length} | ${auto} | ${entries.length - auto - kept} | ${kept} |`);
  }
  lines.push("");
  for (const coverage of result.coverage) {
    const entries = result.divergences.filter((entry) => entry.domain === coverage.domain);
    lines.push(`## ${DOMAIN_LABEL[coverage.domain]}`, "");
    if (entries.length) {
      lines.push("| ID | API | Campo | Nosso | SRD | Ação |", "|---|---|---|---|---|---|");
      for (const entry of entries) lines.push(`| ${entry.id} | ${entry.apiIndex} | ${cell(entry.field)} | ${cell(entry.ours)} | ${cell(entry.api)} | ${action(entry)} |`);
      lines.push("");
    } else lines.push("Sem divergências.", "");
    lines.push(`- Só no nosso pack: ${list(coverage.oursOnly)}`, `- Só na SRD: ${list(coverage.apiOnly)}`, "");
  }
  return `${lines.join("\n")}\n`;
}

function action(entry: Divergence): string {
  if (entry.excecao) return cell(`exceção: ${entry.excecao}`);
  if (entry.patch) return cell(`aplica: ${entry.patch.key} = ${toTs(entry.patch.value)}`);
  return cell(`manual: ${entry.manual ?? ""}`);
}

/** Resumo curto para o terminal do `npm run test`. */
export function consoleReport(result: AuditResult, outcome?: ApplyOutcome): string {
  const lines: string[] = ["", "Auditoria SRD (dnd5eapi.co) — relatório completo em tests/srd/relatorio.md"];
  for (const coverage of result.coverage) {
    const rank = (entry: Divergence) => (entry.patch ? 0 : entry.excecao ? 2 : 1);
    const entries = result.divergences.filter((entry) => entry.domain === coverage.domain).sort((a, b) => rank(a) - rank(b));
    const auto = entries.filter((entry) => entry.patch).length;
    lines.push(`  ${DOMAIN_LABEL[coverage.domain].padEnd(40)} comparados ${String(coverage.compared).padStart(3)}  divergências ${String(entries.length).padStart(3)}  (aplicáveis ${auto})`);
    for (const entry of entries.slice(0, 6)) lines.push(`    • ${entry.id} — ${entry.field}: nosso ${show(entry.ours)} × SRD ${show(entry.api)}${entry.excecao ? " [exceção]" : entry.patch ? "" : " [manual]"}`);
    if (entries.length > 6) lines.push(`    … +${entries.length - 6}`);
  }
  const applicable = result.divergences.filter((entry) => entry.patch).length;
  if (outcome) lines.push(`  --aplica: ${outcome.applied.length} correção(ões) gravada(s), ${outcome.failed.length} falha(s).`);
  else if (applicable) lines.push(`  Rode \`npm run test --aplica\` para gravar as ${applicable} correção(ões) aplicáveis.`);
  return lines.join("\n");
}
