# Concentração

Fonte: Livro do Jogador, cap.10 pp.204–206/PDF203–205; condições do apêndice A. Concentração é estado único por personagem, não flag independente em várias magias.

Termina ao iniciar outra concentração conforme efeito, por incapacidade/morte, por falha em resistência exigida ou voluntariamente (sem ação). Mover e atacar normalmente não a interrompem. Conjuração demorada também exige concentração enquanto em curso, mesmo se efeito final não exigir.

Cada origem de dano produz resistência de Constituição com CD `max(10, floor(danoRecebido/2))`, aplicando arredondamento geral para baixo (Introdução p.7/PDF6). Dano recebido é o valor efetivo após defesas; não reduzir pela parcela absorvida por PV temporários, pois isso ainda foi dano recebido. Exemplos: 9→CD10; 23→CD11; dois danos 12 e 24→dois testes CD10 e CD12. Fenômeno ambiental pode exigir teste CD10 por decisão do mestre; contexto deve informar esse pedido.

## Operação persistente

Aplicar dano resolve PV e cria `pendingResolution` para teste, na mesma transação. UI mostra concentração “teste pendente”; não a marca mantida antes do resultado. Falhar encerra efeito; sucesso remove pedido, preserva concentração. Reload mantém pedido. Se dano já causou incapacidade/morte, concentração termina e pedido desnecessário é encerrado com explicação.

Não suspender contagem de duração porque aplicativo ficou em background: duração avança por tempo de jogo informado, não relógio do dispositivo. Remover magia preparada não deve apagar efeito já conjurado sem regra que o determine.

Forma Selvagem não encerra concentração apenas por transformar; testes usam estatísticas pertinentes à forma e capacidades preservadas. Fonte específica e limites: [Druida](../personagem/classes/druida/regras-especiais.md).

Aceite: no máximo um estado ativo; preview cancelada preserva anterior; origem múltipla gera pedidos separados; natural 20 não garante sucesso universal; incapacidade encerra sem depender de clique na UI.
