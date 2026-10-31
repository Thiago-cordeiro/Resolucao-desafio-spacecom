const fs = require("node:fs");
const readline = require("node:readline");


// //função para obter a celula
// function obterCelula(lat, lon, tamanhoCelula) {}

// //função para calcular as distancias
// function calcularDistancia(lat1, lon1, lat2, lon2, unidade = 'm') {
//     const R = 6371000;
//     const rad = graus => graus * Math.PI / 180;

//     const dLat = rad(lat2 - lat1);
//     const dLon = rad(lon2 - lon1);

//     const a = Math.sin(dLat / 2) ** 2 +
//               Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
//               Math.sin(dLon / 2) ** 2;

//     const distancia = 2 * R * Math.asin(Math.sqrt(Math.min(1, a)));

//     return unidade === 'km' ? distancia / 1000 : distancia;
// }

// //função para classificar o encontro
// function classificarEncontro(){}

const indiceEspacial = new Map();//map para armazenar monitorados de acordo com a sua localizaçõa
let timestampAtual = null;

function processarDados(monitorado) {

    if (monitorado.timestamp !== timestampAtual) {
        console.log(`Novo timestamp: ${monitorado.timestamp}`);
        // Descarta os posicionamentos anteriores
        indiceEspacial.clear();
        // Atualiza o timestamp atual
        timestampAtual = monitorado.timestamp;
    }

    // Por enquanto, apenas mostramos o monitorado
    console.log(`Processando ID: ${monitorado.idMonitorado}`);
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

    console.log(`Total de registros: ${totalRegistros}`);
}

lerArquivo("./dataset1.txt").catch(console.error);
