# Bárbaro — testes planejados

Livro do Jogador fornecido, cap. 3 — Classes, pp. impressas 46–50, PDF 45–49. Pack `phb-ptbr-local-2017`; IDs independentes da tradução.

Nenhum teste executável criado nesta etapa. Casos futuros determinísticos, com RNG/tempo de jogo/contexto fornecidos pelo teste.

1. Criar nível1 com equipamento/perícias válidos: proficiências e HP calculados segundo README; escolha fora lista falha.
2. Subir ao marco da subclasse: conceder recursos corretos sem apagar histórico; nível anterior não concede.
3. Gastar último uso de recurso: chega0; nova tentativa rejeita sem alterar revisão; descanso elegível recupera conforme definição.
4. Importar/exportar JSON: escolhas, consumos e fontes preservados; recálculo não recarrega recursos.

## Aceite documental e implementação futura

Cada linha de progressão tem concessões e valores conferidos; cada subclasse tem opção estável e marcos; cada recurso tem custo e recuperação; pendências da fonte não viram defaults silenciosos. Testar unidade do Rules Engine, integração do gasto + efeito + persistência de revisão, e componente de escolha/recurso em mobile e teclado. Casos envolvendo mestre verificam pedido de decisão, sem inventar resultado.
