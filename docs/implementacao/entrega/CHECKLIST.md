# Checklist editorial de entrega

Data da conferência: 2026-09-12.

| Verificação | Resultado | Fonte conferida |
| --- | --- | --- |
| Versão do pacote e comandos disponíveis | OK | `package.json`; QA-004 rodada 5 |
| Rule pack, versão e cobertura local | OK | loader/manifesto do pack; QA-004 e evidência offline |
| Rotas documentadas | OK | `src/app/routes.ts`; smoke de QA-004 |
| Persistência separada de cache PWA | OK | contratos de persistência; `src/infrastructure/pwa/cache-policy.ts` |
| Backup, importação e recuperação montados em rota | OK | `/settings/data`; QA-004 completude |
| Instalação e fallback offline descritos com contexto | OK | manifesto/worker; `QA-003-evidence.md` |
| Campanha após reload descrita como provada | OK | QA-004 rodada 5; regressão R3-02 |
| Acessibilidade descrita com limites de dispositivo | OK | `A11Y-001.md`; QA-004 rodada 5 |
| Ausência de backend explicitada | OK | escopo 02; QA-004 rodada 5 |
| Cobertura do Compêndio e limites anunciados corretamente | OK | QA-004 revalidação de cobertura (`ACCEPT`); QA-004 completude |
| Spend resource, consume item e exclusão atômica | OK | QA-004 completude |
| Code splitting e lazy loading da mesa 3D | OK | QA-004 completude; entry 541932 bytes (limite 642400) |
| Conteúdo parcial e decisões pendentes declarados | OK | `docs/criacao/14-CONTEUDO-E-FONTES.md`; `docs/criacao/decisoes/PENDENCIAS.md` |
| Suíte focal e suíte completa | OK | QA-004 completude; 17 arquivos/110 testes focais e 92 arquivos/588 testes completos |

Os números e resultados acima são transcritos das evidências QA-004 aceitas;
mudanças tardias de produto devem reabrir o gate correspondente antes de
atualizar este texto.
