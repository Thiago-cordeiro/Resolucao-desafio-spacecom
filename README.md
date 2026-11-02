# Resolução Desafio Spacecom

## Como rodar o projeto

É necessário ter o Node.js instalado (versão 18 ou superior). O projeto utiliza apenas módulos nativos do Node.js e não precisa de `npm install`.

1. Coloque os arquivos dos datasets na pasta do projeto, ao lado do `index.js`.
2. Abra o terminal nessa pasta.
3. Execute o comando com o nome do dataset que deseja avaliar:

```sh
node index.js dataset1.txt
```

Para avaliar cada um dos sete datasets, execute o comando correspondente:

```sh
node index.js dataset1.txt
node index.js dataset2.txt
node index.js dataset3.txt
node index.js dataset4.txt
node index.js dataset5.txt
node index.js dataset6.txt
node index.js dataset7.txt
```

Cada comando processa um dataset. Também é possível omitir a extensão (`node index.js dataset1`) ou informar um caminho, usando aspas caso contenha espaços:

```sh
node index.js "datasets/dataset1.txt"
```

O resultado é gravado na pasta em que o comando foi executado, com o nome `resultado_<nome-do-dataset>.json`. Por exemplo, `dataset1.txt` gera `resultado_dataset1.json` e `dataset2.txt` gera `resultado_dataset2.json`, preservando os resultados dos outros datasets. Executar novamente o mesmo dataset sobrescreve apenas o resultado correspondente. Ao concluir, o terminal informa o dataset processado, o total de registros e o caminho do resultado.

Os datasets são ignorados pelo Git (`dataset*.txt`) e devem ser adicionados localmente antes da execução. Para executar o sétimo, adicione também o arquivo `dataset7.txt`.

Se nenhum dataset for informado ou o arquivo não existir, o programa mostra uma mensagem e encerra com código de erro, sem sobrescrever o resultado anterior. Para consultar a ajuda:

```sh
node index.js --help
```

## Passos pensados na resolução
### PASSO 1
O primeiro passo que fiz após ler e reler o enunciado do desafio, foi procurar por designs e algoritmos que pudessem me ajudar a fazer de forma eficiente o desafio.

Para isso, pesquisei no youtube com a ajuda da Ia para me indicar e aprender algoritimos uteis para a resolução.

Depois de entender minhas opções, comecei a pensar em como processar os dados, já pensando em fazer com um grande volume de dados.

Analisando os datasets verifiquei que seria inviavel fazer na força bruta ou carregando o arquivo inteiro em memoria para milhares de linhas, para contornar isso, percebi que o arquivo está ordenado por timestemps, podendo verificar apenas os timestemps da vez, por isso vou lendo linha a linha do arquivo e quando chego a um timestemp diferente eu limpo o map com as coordenadas do timestamp anterior. Assim processo poucos dados por vez sem estourar a memória.


### PASSO 2
Agora como consegui identificar o time stemp, e consegui indentificar a troca para pegar e comparar apenas um timestemp por vez, preciso organizar espacialmente os dados analizados, colocando os pontos em celulas para poder usar o algoritimo de spatial hashing, para isso criei uma função que cria a celula onde o monitorado está. No código, após saber cada celula em que o monitorado está, organizei os registros em uma estrutura Map no JavaScript para facilitar a busca. Cada chave identifica uma célula no formato `x:y`, e o valor associado é um array com os registros dos monitorados que pertencentes aquela célula no timestamp atual. A consulta à chave da célula é O(1) em média, ajudando no desempenho para grandes massas de dados.

### PASSO 3
Agora o código já le por stream, consegue diferenciar por timestamp, e colocar cada monitorado em um celula com posição espacial. Portanto só resta calcular a distancia em metros buscar os encontros entre os monitorados, para isso usei o algoritimo muito usados em jogos para calcular colisões chamado spatial hashing. Segundo uma definição no google "Spatial hashing is a technique used to efficiently manage and query spatial data by dividing a space into discrete cells or buckets. This method is particularly useful in applications like collision detection, where checking every possible pair of objects would be computationally expensive.", esse algoritimo é eficiente para o problema pois como temos a latitude e longitude (mantidas em graus; os índices inteiros das células são calculados com `Math.floor()` e usados para formar as chaves do Map)e como ja calculei e montei as celulas (assim conforme o algoritimo le o arquivo cada monitorado é comparado apenas com as celulas mais próximas) fica mais fácil de encontrar no raio de colisão os encontros entre os monitorados, sem precisar ter que comparar um monitorado com todos os outros para detectar o econtro. Apesar de que foi um pouco dificil de implementar sozinho e para isso utilizei a ia para explicar como poderia fazer e deixar de uma maneira com menos complexidade e mais eficiente. A comparação de distancia real é feita pela formula de haversine. A unicidade dos encontros é garantida porque cada registro consulta os registros anteriores do mesmo timestamp antes de ser inserido no índice, de modo que cada par é comparado apenas uma vez, considerando que não há IDs repetidos no mesmo timestamp.

### PASSO 4
Depois de conseguir descobrir os encontros só precisei classifica-los e montar o array de objetos e criar o arquivo json,
para isso criei a função classificar encontro que recebia um monitorado a e um b e fazia algumas verificações simples para determinar o tipo de encontro.
Para escrever no arquivo json primeiramente pensei em coloca-los em um array em memória e ao final da leitura do arquivo de entrada criar o arquivo json, essa forma de criar o output de resposta deixo o código lento quando testava com datasets maiores, por isso optei para a cada encontro salvar no arquivo em tempo de execução tirando o array de memoria, isso possibilitou o output se aproveitar do mesmo processo de strean deixando o processo quase linear.

## Por que acredito ser a melhor solução.

Eu acredito ser a melhor solução pois não jogo todos os dados em memória para comparar e decidir se houve um encontro,

if (monitorado.timestamp !== timestampAtual) {
    indiceEspacial.clear();
    timestampAtual = monitorado.timestamp;
}
nessa parte do código quando muda o time stamp eu limpo o índice para adicionar os novos dados a serem comparados, mantendo apenas os registros do timestamp atual e impedindo comparações entre timestamps diferentes.

Outro fator, além de não carregar tudo em memória seria a questão do spatial hash que possibilita a comparação de apenas em quem está nas celulas próximas, diminuindo o tanto de operações e comparações que uma força bruta faria comparando todos com todos em todas as posições. E também para esse código eu utilizei a estrutura MAP do js que permite eu inserir um par chave valor que para busca é O(1)
