# Riscos e respostas planejadas

| ID | Risco / gatilho | Efeito | Dono | Resposta e prova |
| --- | --- | --- | --- | --- |
| R-01 | Livro fornecido contém divergências/revisões. | Mistura semântica de edição. | DATA-001/DATA-005 | sourceRef, pendência por capacidade; nunca importar número de memória; revisão do catálogo afetado. |
| R-02 | IndexedDB apagado, quota ou navegação privada. | Perda/indisponibilidade local. | DATA-003/DATA-006 | Backup JSON manual, status real de gravação, recuperação e teste de falhas; sem promessa de sync. |
| R-03 | Duas abas editam mesma ficha. | Overwrite ou gasto incorreto. | STATE-001/DATA-003 | Revisão CAS, conflito tipado e reconciliação explícita; provar duas conexões. |
| R-04 | Agentes duplicam contratos/fórmulas. | Resultados divergentes. | DATA-001/CORE-002 | Contrato único, ownership e revisão de fronteiras. |
| R-05 | Persistência adiada até passo 14. | UI construída sobre mocks incompatíveis. | Coordenador | DATA-003 antes de state/shell; DATA-006 finaliza backup. |
| R-06 | Concentração/custo/slot em comandos separados. | Estado parcial e duplo gasto. | SPELL-002/STATE-001 | Comando atômico/idempotência; cancelamento/conflito/repetição em integração. |
| R-07 | Anexo grande ou ausente. | Memória/quota e campanha incompleta. | MAP-001/DATA-006 | Limites contratados, previews, validação e export que inclui anexos ou falha explícita. |
| R-08 | Atualização SW durante sessão. | Reload perde draft/versão de dados. | PWA-001 | Ativação adiada, save/export antes, migração reversível/recuperável e prova offline. |
| R-09 | Header/FAB encobrem conteúdo no zoom. | Ações inacessíveis. | UI-002/UI-005 | Altura real, safe area, reflow/fallback em fluxo; 320 CSS px/zoom/teclado virtual. |
| R-10 | Distribuição indevida de textos/assets. | Conteúdo não publicável. | DATA-002/Coordenador | Política de fontes/licenças, resumos mecânicos, packs privados/abertos separados. |
| R-11 | Mock confundido com integração completa. | Gate falso positivo. | CORE-002/QA-002 | Evidência de engine/repository reais; declarar limites. |
| R-12 | 12 agentes forçados em DAG estreito. | Conflitos e trabalho especulativo. | Coordenador | Reservar apenas READY; usar capacidade ociosa para revisão delimitada. |
| R-13 | Compêndio inteiro no primeiro render. | Inicialização lenta em celular. | COMP-001/QA-004 | Índice leve/lazy loading; medir artefato real com corpus previsto. |
| R-14 | Opção V2 parece disponível na V1. | Promessa enganosa e ficha inválida. | CHAR-004/UI-003 | Rotular suporte/pendência e bloquear comando afetado com motivo; não apagar documentação. |

Riscos não são defeitos já comprovados da aplicação: nenhuma aplicação foi iniciada. Na execução, cada ocorrência ganha responsável, evidência, impacto, plano e condição de fechamento. Não ampliar escopo por riscos hipotéticos sem necessidade.
