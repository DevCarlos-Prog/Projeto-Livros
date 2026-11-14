// Buscador de Livros — usa a API pública Open Library (não precisa de banco de dados, XAMPP ou servidor).
const POR_PAGINA = 24;
const CAMPOS = "key,title,author_name,first_publish_year,cover_i";

// Imagem "sem capa" embutida no código (o antigo via.placeholder.com saiu do ar)
const SEM_CAPA =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="180">
           <rect width="100%" height="100%" fill="#e3e3ec"/>
           <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#777"
                 text-anchor="middle" dominant-baseline="middle">Sem capa</text>
         </svg>`
    );

let paginaAtual = 1;
let termoAtual = "";

const campoPesquisa = document.getElementById("pesquisa");
const status = document.getElementById("status");
const resultado = document.getElementById("resultado");

// Evita que um título estranho quebre a página
function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

function buscar() {
    termoAtual = campoPesquisa.value.trim();

    if (!termoAtual) {
        alert("Digite algo para buscar!");
        return;
    }

    paginaAtual = 1;
    carregarPagina();
}

// A Open Library às vezes demora ou falha: tentamos de novo antes de desistir
async function buscarComTentativas(url, tentativas = 3) {
    let ultimoErro;
    for (let i = 1; i <= tentativas; i++) {
        try {
            const controle = new AbortController();
            const limite = setTimeout(() => controle.abort(), 15000);
            const res = await fetch(url, { signal: controle.signal });
            clearTimeout(limite);
            if (!res.ok) throw new Error("HTTP " + res.status);
            return await res.json();
        } catch (e) {
            ultimoErro = e;
            if (i < tentativas) {
                status.textContent = `Servidor lento, tentando de novo (${i}/${tentativas - 1})...`;
                await new Promise(r => setTimeout(r, 1000 * i));
            }
        }
    }
    throw ultimoErro;
}

async function carregarPagina() {
    status.textContent = "Carregando...";
    resultado.innerHTML = "";

    try {
        const url =
            `https://openlibrary.org/search.json?q=${encodeURIComponent(termoAtual)}` +
            `&page=${paginaAtual}&limit=${POR_PAGINA}&fields=${CAMPOS}`;

        const data = await buscarComTentativas(url);

        if (!data.docs || data.docs.length === 0) {
            status.textContent = "Nenhum livro encontrado.";
            return;
        }

        const totalPaginas = Math.ceil(data.numFound / POR_PAGINA);

        status.innerHTML =
            `Total encontrado: ${data.numFound} livros <br>` +
            `Página ${paginaAtual} de ${totalPaginas}`;

        // Monta tudo de uma vez (mais rápido que usar += dentro do loop)
        const cards = data.docs.map(item => {
            const capa = item.cover_i
                ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
                : SEM_CAPA;
            const autor = item.author_name ? item.author_name[0] : "Desconhecido";
            const ano = item.first_publish_year || "N/A";

            return `
                <div class="card">
                    <img src="${capa}" alt="Capa de ${escapar(item.title)}" loading="lazy"
                         onerror="this.onerror=null;this.src='${SEM_CAPA.replace(/'/g, "\\'")}'">
                    <h3>${escapar(item.title)}</h3>
                    <p>${escapar(autor)}</p>
                    <small>${ano}</small>
                </div>`;
        });

        resultado.innerHTML = cards.join("") + montarControles(totalPaginas);

    } catch (e) {
        console.error(e);
        status.textContent =
            "Não foi possível buscar os livros agora. Verifique sua internet e tente de novo.";
    }
}

function montarControles(totalPaginas) {
    let botoes = `<div class="paginacao">`;

    if (paginaAtual > 1) {
        botoes += `<button onclick="anterior()">⬅ Anterior</button>`;
    }

    botoes += `<span> Página ${paginaAtual} </span>`;

    if (paginaAtual < totalPaginas) {
        botoes += `<button onclick="proxima()">Próxima ➡</button>`;
    }

    return botoes + `</div>`;
}

function proxima() {
    paginaAtual++;
    carregarPagina();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function anterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        carregarPagina();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

campoPesquisa.addEventListener("keyup", event => {
    if (event.key === "Enter") buscar();
});
