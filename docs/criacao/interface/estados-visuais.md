# Estados visuais e recuperação

Estados de sessão derivam do domínio; estados de carregamento e feedback pertencem à aplicação/UI. Não usar cor como única diferença.

| Estado | Conteúdo | Ação disponível | Proibido |
| --- | --- | --- | --- |
| Boot/hidratação | Estrutura leve + “Abrindo dados locais”. | Recuperação quando falhar. | Gravar ficha vazia antes da leitura. |
| Sem personagem | Criar/importar; dados avulsos. | Compêndio e ajustes. | Exibir pessoa fictícia como real. |
| Sem campanha | Criar/importar campanha. | Voltar à ficha. | Exigir backend. |
| Salvando | Indicador discreto. | Continuar edição serializada. | Marcar “Salvo” antes do commit. |
| Falha salvar | Alterações não salvas + causa compreensível. | Tentar novamente/exportar snapshot recuperável. | Descartar draft ou alerta nativo. |
| Conflito de revisão | Outra aba alterou entidade. | Comparar/recarregar/duplicar conforme política. | Last-write-wins silencioso. |
| Corrupção/migração falha | Registro preservado/quarentenado e diagnóstico. | Exportar bruto/recuperar/reset seletivo. | Apagar banco automaticamente. |
| Pack ausente/incompatível | Fonte necessária identificada. | Leitura segura e exportação. | Substituir por outra edição. |
| Regra pendente | Mecânica não definida pela fonte atual. | Consultar pendência; usar funções não afetadas. | Inventar número/efeito. |
| Sem slot/recurso | Contagem 0 e motivo da indisponibilidade. | Ver recuperação/regra. | Esconder por completo a habilidade. |
| PV baixo/zero | Texto, valor e atalho contextual. | Dano/cura/morte conforme engine. | Tratar alerta de UX como condição oficial. |
| Offline | Capacidade normal, indicador discreto opcional. | Fluxos locais completos. | Bloquear edição por falta de rede. |
| Atualização pronta | Versão disponível, trabalho preservado. | Atualizar após save/export e confirmação própria. | Reload forçado durante rolagem/edição. |
| Busca vazia | Termo/filtros e “nenhum resultado”. | Limpar filtros/nova busca. | Confundir com falha no banco. |

Erros guardam código estável para diagnóstico e mensagem humana; detalhes técnicos ficam expandíveis. Fallback por feature permite que Compêndio com erro não derrube ficha/backup. Redução de movimento, high contrast e texto longo são variantes transversais, não estados especiais esquecidos no polimento. Testes de componente devem verificar estados críticos; integração precisa provocar falhas reais de adapter, não só trocar prop visual.
