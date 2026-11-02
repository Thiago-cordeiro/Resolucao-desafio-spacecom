const fs = require("node:fs");
const readline = require("node:readline");
const path = require("node:path");

const argumentos = process.argv.slice(2);
const ajuda = "Uso: node index.js <dataset.txt>\nExemplo: node index.js dataset1.txt";

if (argumentos.length === 1 && ["--help", "-h"].includes(argumentos[0])) {
    console.log(ajuda);
    process.exit(0);
}

if (argumentos.length !== 1) {
    console.error(ajuda);
    process.exit(1);
}

// Também aceita o nome sem extensão: node index.js dataset1
const caminhoDataset = path.resolve(
    path.extname(argumentos[0]) ? argumentos[0] : `${argumentos[0]}.txt`
);
const caminhoResultado = path.resolve("resultado.json");

// Valida a entrada antes de criar ou sobrescrever o resultado.
try {
    if (!fs.statSync(caminhoDataset).isFile()) {
        throw new Error("O caminho informado não é um arquivo.");
    }
    fs.accessSync(caminhoDataset, fs.constants.R_OK);
    if (caminhoDataset === caminhoResultado) {
        throw new Error("O dataset deve ser diferente do arquivo resultado.json.");
    }
} catch (erro) {
    console.error(`Não foi possível abrir o dataset: ${caminhoDataset}`);
    console.error(erro.code === "ENOENT" ? "Arquivo não encontrado. Confira o nome e o caminho informado." : erro.message);
    process.exit(1);
}

const streamSaida = fs.createWriteStream(caminhoResultado, {
    encoding: "utf8"
});
// Início do array JSON
streamSaida.write("[\n");

// A função recebe latitude e longitude e aplica Math.floor() para descobrir a célula correspondente.
// Duas posições próximas podem cair na mesma célula, enquanto posições distantes geralmente cairão em células diferentes.


// dois monitorados a menos de 20 metros não necessariamente estarão na mesma célula. Por isso, posteriormente também precisa ser considerados as células vizinhas.
const RAIO_TERRA = 6371000;
const TAMANHO_CELULA_METROS = 20;
const TAMANHO_CELULA_GRAUS = (TAMANHO_CELULA_METROS / RAIO_TERRA) * (180 / Math.PI);

const RAIO_ENCONTRO = 20;

const TOTAL_COLUNAS = Math.ceil(360 / TAMANHO_CELULA_GRAUS);
const LARGURA_COLUNA = 360 / TOTAL_COLUNAS;

let primeiroEncontro = true;

function obterCelula(latitude, longitude) {
    const longitudeNormalizada = ((longitude + 180) % 360 + 360) % 360;

    const x = Math.floor(longitudeNormalizada / LARGURA_COLUNA);
    const y = Math.floor((latitude + 90) / TAMANHO_CELULA_GRAUS);

    return { x, y };
}

function normalizarColuna(x) {
    return ((x % TOTAL_COLUNAS) + TOTAL_COLUNAS) % TOTAL_COLUNAS;
}

//adiciona ao set
function inserirNoIndice(monitorado) {
    const { x, y } = obterCelula(
        monitorado.latitude,
        monitorado.longitude
    );

    const chave = `${x}:${y}`;

    if (!indiceEspacial.has(chave)) {
        indiceEspacial.set(chave, []);
    }

    indiceEspacial.get(chave).push(monitorado);
}


//função para fazer o spatial rash  e encontrar os vizinhos de um monitorado'

function buscarVizinhos(monitorado) {
    const { x, y } = obterCelula(
        monitorado.latitude,
        monitorado.longitude
    );

    const encontrados = [];
    const distanciaAngular = RAIO_ENCONTRO / RAIO_TERRA;
    const latitudeRad = monitorado.latitude * Math.PI / 180;

    const alcanceY = Math.ceil(
        (distanciaAngular * 180 / Math.PI) /
        TAMANHO_CELULA_GRAUS
    );

    const proximoPolo =
        Math.abs(latitudeRad) + distanciaAngular >= Math.PI / 2;

    const deltaLongitude = proximoPolo
        ? Math.PI
        : Math.asin(
            Math.min(1, Math.sin(distanciaAngular) / Math.cos(latitudeRad))
        );

    const alcanceX = proximoPolo
        ? TOTAL_COLUNAS
        : Math.ceil((deltaLongitude * 180 / Math.PI) / LARGURA_COLUNA);

    // Se a busca abrange o globo, não repetir as mesmas colunas
    const todasColunas = 2 * alcanceX + 1 >= TOTAL_COLUNAS;

    const inicioX = todasColunas ? 0 : -alcanceX;
    const fimX = todasColunas ? TOTAL_COLUNAS - 1 : alcanceX;

    for (let dx = inicioX; dx <= fimX; dx++) {
        for (let dy = -alcanceY; dy <= alcanceY; dy++) {
            const coluna = todasColunas
                ? dx
                : normalizarColuna(x + dx);

            const chave = `${coluna}:${y + dy}`;
            const candidatos = indiceEspacial.get(chave);

            if (!candidatos) continue;

            for (const candidato of candidatos) {
                const distancia = calcularDistancia(
                    monitorado.latitude,
                    monitorado.longitude,
                    candidato.latitude,
                    candidato.longitude
                );

                if (distancia < RAIO_ENCONTRO) {
                    encontrados.push({
                        monitorado: candidato,
                        distancia
                    });
                }
            }
        }
    }

    return encontrados;
}

//função para calcular as distancias
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = graus => graus * Math.PI / 180;

    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const distancia = 2 * R * Math.asin(Math.sqrt(Math.min(1, a)));

    return distancia;
}

// //função para classificar o encontro
function classificarEncontro(a, b) {
    // 1. Verifica se existe restrição de medida protetiva
    const existeRestricao = (a.medidaProtetiva && a.idsRestricaoMedida.has(b.idMonitorado)) || (b.medidaProtetiva && b.idsRestricaoMedida.has(a.idMonitorado));

    if (existeRestricao) {
        return "protetiva";
    }

    // 2. Verifica se ambos pertencem à mesma facção
    const mesmaFaccao =
        a.faccaoMonitorado !== null &&
        b.faccaoMonitorado !== null &&
        a.faccaoMonitorado === b.faccaoMonitorado;

    if (mesmaFaccao) {
        return "faccao";
    }

    // 3. Caso não exista relação especial
    return "generico";
}

//montagem do objeto e salvando no json
function salvarEncontro(a, b, tipo, distancia) {
    const encontro = {
        tipo,
        monitoradosEncontro: [
            a.idMonitorado,
            b.idMonitorado
        ],
        timestamp: a.timestamp,
        posicoes: {
            [a.idMonitorado]: {
                lat: a.latitude,
                lon: a.longitude
            },
            [b.idMonitorado]: {
                lat: b.latitude,
                lon: b.longitude
            }
        },
        distanciaMetros: distancia
    };

    if (!primeiroEncontro) {
        streamSaida.write(",\n");
    }

    streamSaida.write(JSON.stringify(encontro));

    primeiroEncontro = false;
}

const indiceEspacial = new Map();//map para armazenar monitorados de acordo com a sua localizaçõa
let timestampAtual = null;

function processarDados(monitorado) {

    if (monitorado.timestamp !== timestampAtual) {
        // Descarta os posicionamentos anteriores
        indiceEspacial.clear();
        // Atualiza o timestamp atual
        timestampAtual = monitorado.timestamp;
    }

    const encontrosAnteriores = buscarVizinhos(monitorado);

    for (const encontro of encontrosAnteriores) {
        const outro = encontro.monitorado;

        const tipo = classificarEncontro(monitorado, outro);

        salvarEncontro(
            outro,
            monitorado,
            tipo,
            encontro.distancia
        );
    }

    // Adiciona o monitorado ao índice espacial
    inserirNoIndice(monitorado);
}

function converterLinha(linha) {
    const [
        idMonitorado,
        faccaoMonitorado,
        timestamp,
        latitude,
        longitude,
        medidaProtetiva,
        idsRestricaoMedida
    ] = linha.split(";");

    return {
        idMonitorado: Number(idMonitorado),
        faccaoMonitorado: faccaoMonitorado
            ? Number(faccaoMonitorado)
            : null,
        timestamp: timestamp.replaceAll('"', ""),
        latitude: Number(latitude),
        longitude: Number(longitude),
        medidaProtetiva: medidaProtetiva === "true",
        idsRestricaoMedida: new Set(
            idsRestricaoMedida
                ? idsRestricaoMedida
                    .replaceAll('"', "")
                    .split(",")
                    .map(Number)
                : []
        )
    };
}

async function lerArquivo(caminho) {
    const stream = fs.createReadStream(caminho, {
        encoding: "utf8"
    });

    const leitor = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    let primeiraLinha = true;
    let totalRegistros = 0;

    for await (const linha of leitor) {
        if (primeiraLinha) {
            primeiraLinha = false;
            continue; // Ignora o cabeçalho
        }

        if (!linha.trim()) continue;

        const monitorado = converterLinha(linha);

        processarDados(monitorado);
        totalRegistros++;
    }

    streamSaida.end("\n]\n");
    streamSaida.on("finish", () => {
        console.log(`Dataset processado: ${caminhoDataset}`);
        console.log(`Total de registros: ${totalRegistros}`);
        console.log(`Resultado salvo em: ${caminhoResultado}`);
    });
    //apenas para teste
    // console.log(
    //     [...indiceEspacial.entries()].map(([chave, monitorados]) => ({
    //         celula: chave,
    //         ids: monitorados.map(m => m.idMonitorado)
    //     }))
    // );
}

function informarErro(erro) {
    console.error(`Erro ao processar o dataset: ${erro.message}`);
    streamSaida.destroy();
    process.exitCode = 1;
}

streamSaida.on("error", informarErro);
lerArquivo(caminhoDataset).catch(informarErro);
