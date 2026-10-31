const fs = require("node:fs");
const readline = require("node:readline");



// A função recebe latitude e longitude e aplica Math.floor() para descobrir a célula correspondente.
// Duas posições próximas podem cair na mesma célula, enquanto posições distantes geralmente cairão em células diferentes.


// dois monitorados a menos de 20 metros não necessariamente estarão na mesma célula. Por isso, posteriormente também precisa ser considerados as células vizinhas.
const RAIO_TERRA = 6371000;
const TAMANHO_CELULA_METROS = 20;
const TAMANHO_CELULA_GRAUS = (TAMANHO_CELULA_METROS / RAIO_TERRA) * (180 / Math.PI);

function obterCelula(latitude, longitude) {
    const x = Math.floor(longitude / TAMANHO_CELULA_GRAUS);
    const y = Math.floor(latitude / TAMANHO_CELULA_GRAUS);

    return { x, y };
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
const RAIO_ENCONTRO = 20;

function buscarVizinhos(monitorado) {
    const { x, y } = obterCelula(
        monitorado.latitude,
        monitorado.longitude
    );

    const candidatos = [];

    // Distância angular equivalente a 20 metros
    const alcanceAngular = RAIO_ENCONTRO / RAIO_TERRA;

    const latRad = monitorado.latitude * Math.PI / 180;

    // Quantidade de células para cobrir 20 metros em latitude
    const alcanceY = Math.ceil(
        alcanceAngular * (180 / Math.PI) / TAMANHO_CELULA_GRAUS
    );

    // A abrangência em longitude depende da latitude.
    const atingePolo =
        Math.abs(latRad) + alcanceAngular >= Math.PI / 2;

    const deltaLon = atingePolo
        ? Math.PI
        : Math.asin(Math.min(1, Math.sin(alcanceAngular) / Math.cos(latRad)));

    const alcanceX = Math.ceil(
        deltaLon * (180 / Math.PI) / TAMANHO_CELULA_GRAUS
    );

    const totalColunas = Math.ceil(360 / TAMANHO_CELULA_GRAUS);

    // Consulta células próximas
    for (let dx = -alcanceX; dx <= alcanceX; dx++) {
        for (let dy = -alcanceY; dy <= alcanceY; dy++) {
            const chave = `${x + dx}:${y + dy}`;
            const encontrados = indiceEspacial.get(chave);

            if (!encontrados) continue;

            for (const candidato of encontrados) {
                const distancia = calcularDistancia(
                    monitorado.latitude,
                    monitorado.longitude,
                    candidato.latitude,
                    candidato.longitude
                );

                if (distancia < RAIO_ENCONTRO) {
                    candidatos.push({
                        monitorado: candidato,
                        distancia
                    });
                }
            }
        }
    }

    return candidatos;
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
// function classificarEncontro(){}

const indiceEspacial = new Map();//map para armazenar monitorados de acordo com a sua localizaçõa
let timestampAtual = null;

function processarDados(monitorado) {

    if (monitorado.timestamp !== timestampAtual) {
        // console.log(`Novo timestamp: ${monitorado.timestamp}`);
        // Descarta os posicionamentos anteriores
        indiceEspacial.clear();
        // Atualiza o timestamp atual
        timestampAtual = monitorado.timestamp;
    }

    const encontrosAnteriores = buscarVizinhos(monitorado);

    for (const encontro of encontrosAnteriores) {
        console.log(
            `Encontro entre ${encontro.monitorado.idMonitorado} ` +
            `e ${monitorado.idMonitorado}: ` +
            `${encontro.distancia.toFixed(2)} metros`
        );
    }

    // Por enquanto, apenas mostramos o monitorado
    // console.log(`Processando ID: ${monitorado.idMonitorado}`);
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
    

    console.log(`Total de registros: ${totalRegistros}`);
    //apenas para teste
    // console.log(
    //     [...indiceEspacial.entries()].map(([chave, monitorados]) => ({
    //         celula: chave,
    //         ids: monitorados.map(m => m.idMonitorado)
    //     }))
    // );
}

lerArquivo("./dataset1.txt").catch(console.error);
