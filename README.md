## PASSO 1
O primeiro passo que fiz após ler e reler o enunciado do desafio, foi procurar por designs e algoritmos que pudessem me ajudar a fazer de forma eficiente o desafio.

Para isso, pesquisei no youtube com a ajuda da Ia para me indicar e aprender algoritimos uteis para a resolução.

Depois de entender minhas opções, comecei a pensar em como processar os dados, já pensando em fazer com um grande volume de dados.

Analisando os datasets verifiquei que seria inviavel fazer na força bruta ou carregando o arquivo inteiro em memoria, para contornar isso, percebi que o arquivo está ordenado por timestemps, podendo verificar apenas os timestemps da vez, por isso vou lendo linha a linha do arquivo e quando chego a um timestemp diferente eu processo os objetos com o timestemp anterior. assim processo poucos dados por vez sem estourar a memória.
