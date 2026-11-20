// =========================================================================
        // ESTADO DA APLICAÇÃO E CHAVE DE PERSISTÊNCIA (LOCALSTORAGE)
        // =========================================================================
        const STORAGE_KEY = 'escala_maezinha_8_irmaos_v1';

        // Paleta de cores suaves e distintas para identificar visualmente cada um dos 8 irmãos
        const CORES_IRMAOS = [
            { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-600' },
            { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-600' },
            { bg: 'bg-sky-100', text: 'text-sky-900', border: 'border-sky-300', dot: 'bg-sky-600' },
            { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dot: 'bg-purple-600' },
            { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', dot: 'bg-rose-600' },
            { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300', dot: 'bg-teal-600' },
            { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300', dot: 'bg-indigo-600' },
            { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300', dot: 'bg-orange-600' }
        ];

        const NOMES_PADRAO = [
            'Irmão(ã) 1',
            'Irmão(ã) 2',
            'Irmão(ã) 3',
            'Irmão(ã) 4',
            'Irmão(ã) 5',
            'Irmão(ã) 6',
            'Irmão(ã) 7',
            'Irmão(ã) 8'
        ];

        let state = {
            irmaos: [...NOMES_PADRAO],
            dataInicio: '', // Formato YYYY-MM-DD (sempre um sábado)
            presetDuracao: '26',
            qtdPersonalizada: 12,
            indiceIrmaoInicial: 0,
            concluidos: {}, // Mapa: { "YYYY-MM-DD": true }
            trocas: {},     // Mapa: { "YYYY-MM-DD": indiceIrmaoSubstituto }
            configAberta: true
        };

        let escalaAtual = []; // Lista calculada de objetos de fim de semana
        let dataChaveModalAtual = null;

        // =========================================================================
        // UTILITÁRIOS DE DATA
        // =========================================================================

        /**
         * Retorna a data do próximo sábado (ou hoje se hoje for sábado) no formato YYYY-MM-DD.
         */
        function obterProximoSabadoISO() {
            const hoje = new Date();
            const diaSemana = hoje.getDay(); // 0 = Dom, 6 = Sáb
            const diasParaSabado = (6 - diaSemana + 7) % 7;
            const proximoSabado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + diasParaSabado);
            return formatarParaISO(proximoSabado);
        }

        /**
         * Converte objeto Date local para string YYYY-MM-DD sem problemas de fuso horário.
         */
        function formatarParaISO(data) {
            const ano = data.getFullYear();
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const dia = String(data.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        }

        /**
         * Cria um objeto Date local a partir de YYYY-MM-DD às 12:00 para evitar deslocamento de fuso.
         */
        function parseISOLocal(isoStr) {
            const [ano, mes, dia] = isoStr.split('-').map(Number);
            return new Date(ano, mes - 1, dia, 12, 0, 0);
        }

        /**
         * Garante que uma data YYYY-MM-DD caia em um Sábado.
         * Se for domingo, volta 1 dia; se for seg-sex, avança para o sábado daquela semana.
         */
        function ajustarParaSabado(isoStr) {
            const data = parseISOLocal(isoStr);
            const diaSemana = data.getDay(); // 0 = Dom, ..., 6 = Sáb
            if (diaSemana === 6) return { iso: isoStr, ajustado: false };

            const diff = diaSemana === 0 ? -1 : (6 - diaSemana);
            data.setDate(data.getDate() + diff);
            return { iso: formatarParaISO(data), ajustado: true };
        }

        /**
         * Formata o par Sábado e Domingo em português legível.
         * Ex: "21/11 e 22/11/2026" ou "31/12/2026 e 01/01/2027"
         */
        function formatarFimDeSemanaPT(dataSabado) {
            const dataDomingo = new Date(dataSabado.getFullYear(), dataSabado.getMonth(), dataSabado.getDate() + 1, 12, 0, 0);

            const diaSab = String(dataSabado.getDate()).padStart(2, '0');
            const mesSab = String(dataSabado.getMonth() + 1).padStart(2, '0');
            const anoSab = dataSabado.getFullYear();

            const diaDom = String(dataDomingo.getDate()).padStart(2, '0');
            const mesDom = String(dataDomingo.getMonth() + 1).padStart(2, '0');
            const anoDom = dataDomingo.getFullYear();

            const mesesCurtos = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const nomeMesSab = mesesCurtos[dataSabado.getMonth()];
            const nomeMesDom = mesesCurtos[dataDomingo.getMonth()];

            const textoCurto = anoSab === anoDom
                ? `${diaSab}/${mesSab} e ${diaDom}/${mesDom}/${anoDom}`
                : `${diaSab}/${mesSab}/${anoSab} e ${diaDom}/${mesDom}/${anoDom}`;

            const textoExtenso = mesSab === mesDom
                ? `Sáb ${diaSab} e Dom ${diaDom} de ${nomeMesSab}/${anoDom}`
                : `Sáb ${diaSab}/${nomeMesSab} e Dom ${diaDom}/${nomeMesDom}/${anoDom}`;

            return { textoCurto, textoExtenso };
        }

        // =========================================================================
        // PERSISTÊNCIA (LOCALSTORAGE)
        // =========================================================================

        function salvarEstado() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.error('Erro ao salvar no localStorage:', e);
            }
        }

        function carregarEstado() {
            try {
                const salvo = localStorage.getItem(STORAGE_KEY);
                if (salvo) {
                    const parsed = JSON.parse(salvo);
                    state = { ...state, ...parsed };
                    // Garante sempre 8 posições
                    if (!Array.isArray(state.irmaos) || state.irmaos.length !== 8) {
                        state.irmaos = [...NOMES_PADRAO];
                    }
                }
            } catch (e) {
                console.error('Erro ao carregar do localStorage:', e);
            }

            if (!state.dataInicio) {
                state.dataInicio = obterProximoSabadoISO();
            }
        }

        // =========================================================================
        // GERENCIAMENTO DOS 8 IRMÃOS
        // =========================================================================

        function renderizarListaIrmaos() {
            const container = document.getElementById('listaIrmaosContainer');
            container.innerHTML = '';

            state.irmaos.forEach((nome, index) => {
                const cor = CORES_IRMAOS[index % CORES_IRMAOS.length];
                const item = document.createElement('div');
                item.className = 'flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl p-2 transition-colors focus-within:border-amber-500 focus-within:bg-white';

                item.innerHTML = `
                    <span class="w-8 h-8 rounded-lg ${cor.bg} ${cor.text} font-bold text-sm flex items-center justify-center shrink-0 border ${cor.border}">
                        ${index + 1}º
                    </span>
                    <input
                        type="text"
                        value="${escaparHTML(nome)}"
                        placeholder="Nome do ${index + 1}º irmão(ã)"
                        aria-label="Nome do ${index + 1}º irmão"
                        oninput="atualizarNomeIrmao(${index}, this.value)"
                        class="w-full bg-transparent text-stone-900 font-medium text-base px-2 py-1 focus:outline-none"
                    >
                    <div class="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onclick="moverIrmao(${index}, -1)"
                            ${index === 0 ? 'disabled' : ''}
                            title="Subir na fila"
                            class="p-2 rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                        >
                            <i data-lucide="arrow-up" class="w-4 h-4"></i>
                        </button>
                        <button
                            type="button"
                            onclick="moverIrmao(${index}, 1)"
                            ${index === 7 ? 'disabled' : ''}
                            title="Descer na fila"
                            class="p-2 rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                        >
                            <i data-lucide="arrow-down" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });

            atualizarSelectsIrmaos();
            lucide.createIcons();
        }

        function atualizarNomeIrmao(index, novoValor) {
            state.irmaos[index] = novoValor.trim() === '' ? `Irmão(ã) ${index + 1}` : novoValor;
            salvarEstado();
            atualizarSelectsIrmaos();
            gerarEscala(false); // Atualiza sem recriar os inputs de texto para não perder o foco
        }

        function moverIrmao(index, direcao) {
            const novoIndex = index + direcao;
            if (novoIndex < 0 || novoIndex >= 8) return;

            const temp = state.irmaos[index];
            state.irmaos[index] = state.irmaos[novoIndex];
            state.irmaos[novoIndex] = temp;

            salvarEstado();
            renderizarListaIrmaos();
            gerarEscala();
            mostrarToast('Ordem de revezamento atualizada!');
        }

        function resetarNomesPadrao() {
            state.irmaos = [...NOMES_PADRAO];
            state.indiceIrmaoInicial = 0;
            salvarEstado();
            renderizarListaIrmaos();
            gerarEscala();
            mostrarToast('Nomes restaurados para o padrão.');
        }

        function atualizarSelectsIrmaos() {
            const selectInicial = document.getElementById('irmaoInicialSelect');
            const filtroIrmao = document.getElementById('filtroIrmao');
            const filtroAtual = filtroIrmao.value;

            // Select de quem inicia a escala
            selectInicial.innerHTML = state.irmaos.map((nome, idx) =>
                `<option value="${idx}" ${Number(state.indiceIrmaoInicial) === idx ? 'selected' : ''}>${idx + 1}º - ${escaparHTML(nome)}</option>`
            ).join('');

            // Select de filtro na barra da escala
            filtroIrmao.innerHTML = `<option value="TODOS">Todos os 8 irmãos</option>` +
                state.irmaos.map((nome, idx) =>
                    `<option value="${idx}" ${filtroAtual === String(idx) ? 'selected' : ''}>${escaparHTML(nome)}</option>`
                ).join('');
        }

        // =========================================================================
        // CONTROLES DE PERÍODO E GERAÇÃO DA ESCALA
        // =========================================================================

        function aoMudarDataInicio() {
            const input = document.getElementById('dataInicio');
            const aviso = document.getElementById('avisoAjusteSabado');
            if (!input.value) return;

            const resultado = ajustarParaSabado(input.value);
            input.value = resultado.iso;
            state.dataInicio = resultado.iso;

            if (resultado.ajustado) {
                aviso.classList.remove('hidden');
            } else {
                aviso.classList.add('hidden');
            }

            salvarEstado();
            gerarEscala();
        }

        function aoMudarPresetDuracao() {
            const select = document.getElementById('presetDuracao');
            const customWrapper = document.getElementById('customQtdWrapper');
            state.presetDuracao = select.value;

            if (state.presetDuracao === 'custom') {
                customWrapper.classList.remove('hidden');
            } else {
                customWrapper.classList.add('hidden');
            }

            salvarEstado();
            gerarEscala();
        }

        function obterQuantidadeFinsDeSemana() {
            if (state.presetDuracao === 'custom') {
                const inputCustom = document.getElementById('qtdPersonalizada');
                let val = parseInt(inputCustom.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 104) val = 104;
                state.qtdPersonalizada = val;
                return val;
            }
            return parseInt(state.presetDuracao, 10) || 26;
        }

        /**
         * Gera a escala intercalando sequencialmente 1 dos 8 irmãos a cada fim de semana.
         */
        function gerarEscala(salvar = true) {
            const selectInicial = document.getElementById('irmaoInicialSelect');
            state.indiceIrmaoInicial = parseInt(selectInicial.value, 10) || 0;

            const quantidade = obterQuantidadeFinsDeSemana();
            document.getElementById('totalFdsLabel').textContent = `${quantidade} ${quantidade === 1 ? 'fim de semana' : 'fins de semana'}`;

            const dataBase = parseISOLocal(state.dataInicio);
            escalaAtual = [];

            for (let i = 0; i < quantidade; i++) {
                // Avança de 7 em 7 dias (sempre Sábado)
                const dataSabado = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate() + (i * 7), 12, 0, 0);
                const chaveISO = formatarParaISO(dataSabado);
                const datasFormatadas = formatarFimDeSemanaPT(dataSabado);

                // Cálculo circular entre os 8 irmãos
                const indiceOriginal = (state.indiceIrmaoInicial + i) % 8;

                // Verifica se existe troca pontual registrada para este fim de semana
                const temTroca = state.trocas && Object.prototype.hasOwnProperty.call(state.trocas, chaveISO);
                const indiceEfetivo = temTroca ? Number(state.trocas[chaveISO]) : indiceOriginal;

                const concluido = Boolean(state.concluidos && state.concluidos[chaveISO]);

                escalaAtual.push({
                    numero: i + 1,
                    chaveISO,
                    dataSabado,
                    textoCurto: datasFormatadas.textoCurto,
                    textoExtenso: datasFormatadas.textoExtenso,
                    indiceOriginal,
                    indiceEfetivo,
                    temTroca: temTroca && (indiceEfetivo !== indiceOriginal),
                    concluido
                });
            }

            if (salvar) salvarEstado();
            renderizarEscala();
            renderizarResumoParticipacao();
        }

        // =========================================================================
        // RENDERIZAÇÃO DA ESCALA (TABELA DESKTOP + CARDS MOBILE)
        // =========================================================================

        function renderizarEscala() {
            const filtro = document.getElementById('filtroIrmao').value;
            const listaFiltrada = filtro === 'TODOS'
                ? escalaAtual
                : escalaAtual.filter(item => item.indiceEfetivo === Number(filtro));

            // Atualiza subtítulos de período
            if (escalaAtual.length > 0) {
                const primeiro = escalaAtual[0].textoCurto.split(' e ')[0];
                const ultimo = escalaAtual[escalaAtual.length - 1].textoCurto.split(' e ')[1];
                const textoPeriodo = `De ${primeiro} até ${ultimo} (${escalaAtual.length} fins de semana)`;
                document.getElementById('periodoResumoTexto').textContent = textoPeriodo;
                document.getElementById('printSubtitle').textContent = `Revezamento entre os 8 irmãos • ${textoPeriodo}`;
            }

            renderizarTabelaDesktop(listaFiltrada);
            renderizarCardsMobile(listaFiltrada);
            lucide.createIcons();
        }

        function renderizarTabelaDesktop(lista) {
            const tbody = document.getElementById('tabelaEscalaBody');

            if (lista.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="py-10 text-center text-stone-500">
                            Nenhum fim de semana encontrado para este filtro.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = lista.map(item => {
                const nomeResponsavel = state.irmaos[item.indiceEfetivo];
                const nomeOriginal = state.irmaos[item.indiceOriginal];
                const cor = CORES_IRMAOS[item.indiceEfetivo % CORES_IRMAOS.length];
                const rowBg = item.concluido ? 'bg-stone-50/90 text-stone-400' : 'hover:bg-amber-50/40';

                return `
                    <tr class="${rowBg} transition-colors">
                        <td class="py-4 px-5 font-bold text-stone-500">
                            #${String(item.numero).padStart(2, '0')}
                        </td>
                        <td class="py-4 px-5">
                            <div class="font-bold text-stone-900 ${item.concluido ? 'line-through opacity-60' : ''}">
                                ${item.textoCurto}
                            </div>
                            <div class="text-xs text-stone-500 mt-0.5">
                                ${item.textoExtenso}
                            </div>
                        </td>
                        <td class="py-4 px-5">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-bold border ${cor.bg} ${cor.text} ${cor.border} ${item.concluido ? 'opacity-65' : ''}">
                                    <span class="w-2.5 h-2.5 rounded-full ${cor.dot}"></span>
                                    ${escaparHTML(nomeResponsavel)}
                                </span>
                                ${item.temTroca ? `
                                    <span class="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200" title="Substituindo ${escaparHTML(nomeOriginal)}">
                                        <i data-lucide="repeat" class="w-3 h-3"></i>
                                        Troca (era ${escaparHTML(nomeOriginal)})
                                    </span>
                                ` : ''}
                            </div>
                        </td>
                        <td class="py-4 px-5 text-center no-print">
                            <div class="inline-flex items-center justify-center gap-2">
                                <button
                                    onclick="alternarConcluido('${item.chaveISO}')"
                                    title="${item.concluido ? 'Desmarcar conclusão' : 'Marcar fim de semana como concluído'}"
                                    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                        item.concluido
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                                    }"
                                >
                                    <i data-lucide="${item.concluido ? 'check-circle-2' : 'circle'}" class="w-4 h-4"></i>
                                    <span>${item.concluido ? 'Concluído' : 'Marcar feito'}</span>
                                </button>

                                <button
                                    onclick="abrirModalTroca('${item.chaveISO}', ${item.numero}, '${item.textoCurto}', ${item.indiceOriginal}, ${item.indiceEfetivo})"
                                    title="Trocar irmão apenas neste fim de semana"
                                    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-amber-800 border border-amber-300 hover:bg-amber-50 transition-all cursor-pointer"
                                >
                                    <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                                    <span>Trocar</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function renderizarCardsMobile(lista) {
            const container = document.getElementById('mobileCardsWrapper');

            if (lista.length === 0) {
                container.innerHTML = `
                    <div class="bg-white rounded-2xl p-8 text-center text-stone-500 border border-stone-200">
                        Nenhum fim de semana encontrado para este filtro.
                    </div>
                `;
                return;
            }

            container.innerHTML = lista.map(item => {
                const nomeResponsavel = state.irmaos[item.indiceEfetivo];
                const nomeOriginal = state.irmaos[item.indiceOriginal];
                const cor = CORES_IRMAOS[item.indiceEfetivo % CORES_IRMAOS.length];

                return `
                    <div class="bg-white rounded-2xl shadow-xs border ${item.concluido ? 'border-emerald-200 bg-stone-50/80' : 'border-stone-200'} p-4 space-y-3.5">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="text-xs font-bold uppercase tracking-wider text-stone-400">
                                    Fim de Semana #${String(item.numero).padStart(2, '0')}
                                </span>
                                <h3 class="text-lg font-extrabold text-stone-900 mt-0.5 ${item.concluido ? 'line-through opacity-60' : ''}">
                                    ${item.textoCurto}
                                </h3>
                                <p class="text-xs text-stone-500">${item.textoExtenso}</p>
                            </div>

                            ${item.concluido ? `
                                <span class="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                                    <i data-lucide="check" class="w-3.5 h-3.5"></i> Feito
                                </span>
                            ` : ''}
                        </div>

                        <div class="pt-1">
                            <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${cor.bg} ${cor.text} ${cor.border}">
                                <span class="w-3 h-3 rounded-full ${cor.dot} shrink-0"></span>
                                <span class="font-bold text-base">${escaparHTML(nomeResponsavel)}</span>
                            </div>
                            ${item.temTroca ? `
                                <p class="text-xs text-amber-800 mt-1.5 flex items-center gap-1 font-medium">
                                    <i data-lucide="repeat" class="w-3.5 h-3.5"></i>
                                    Substituição pontual (escala original: ${escaparHTML(nomeOriginal)})
                                </p>
                            ` : ''}
                        </div>

                        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                            <button
                                onclick="alternarConcluido('${item.chaveISO}')"
                                class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                                    item.concluido
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-stone-50 text-stone-700 border-stone-300 active:bg-stone-200'
                                }"
                            >
                                <i data-lucide="${item.concluido ? 'check-circle-2' : 'circle'}" class="w-4 h-4"></i>
                                <span>${item.concluido ? 'Concluído' : 'Concluir'}</span>
                            </button>

                            <button
                                onclick="abrirModalTroca('${item.chaveISO}', ${item.numero}, '${item.textoCurto}', ${item.indiceOriginal}, ${item.indiceEfetivo})"
                                class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold bg-amber-50 text-amber-900 border border-amber-300 active:bg-amber-100 cursor-pointer"
                            >
                                <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                                <span>Trocar Irmão</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderizarResumoParticipacao() {
            const grid = document.getElementById('resumoParticipacaoGrid');
            const contagem = new Array(8).fill(0);

            escalaAtual.forEach(item => {
                contagem[item.indiceEfetivo]++;
            });

            grid.innerHTML = state.irmaos.map((nome, idx) => {
                const cor = CORES_IRMAOS[idx % CORES_IRMAOS.length];
                const qtd = contagem[idx];
                return `
                    <div class="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/60">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="w-2.5 h-2.5 rounded-full ${cor.dot} shrink-0"></span>
                            <span class="text-sm font-semibold text-stone-800 truncate">${escaparHTML(nome)}</span>
                        </div>
                        <span class="ml-2 shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${cor.bg} ${cor.text}">
                            ${qtd}x
                        </span>
                    </div>
                `;
            }).join('');
        }

        // =========================================================================
        // AÇÕES INTERATIVAS: CONCLUIR, TROCA PONTUAL, WHATSAPP E UI
        // =========================================================================

        function alternarConcluido(chaveISO) {
            if (!state.concluidos) state.concluidos = {};
            if (state.concluidos[chaveISO]) {
                delete state.concluidos[chaveISO];
            } else {
                state.concluidos[chaveISO] = true;
            }
            salvarEstado();
            gerarEscala(false);
        }

        function abrirModalTroca(chaveISO, numero, textoCurto, indiceOriginal, indiceAtual) {
            dataChaveModalAtual = chaveISO;
            document.getElementById('modalTrocaSubtitulo').textContent = `Fim de Semana #${numero} (${textoCurto})`;

            const select = document.getElementById('selectNovoResponsavel');
            select.innerHTML = state.irmaos.map((nome, idx) => {
                const tagOriginal = idx === indiceOriginal ? ' (Original da fila)' : '';
                return `<option value="${idx}" ${idx === indiceAtual ? 'selected' : ''}>${escaparHTML(nome)}${tagOriginal}</option>`;
            }).join('');

            const btnRestaurar = document.getElementById('btnRestaurarOriginal');
            if (indiceAtual !== indiceOriginal) {
                btnRestaurar.classList.remove('hidden');
            } else {
                btnRestaurar.classList.add('hidden');
            }

            const modal = document.getElementById('modalTroca');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function fecharModalTroca() {
            const modal = document.getElementById('modalTroca');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            dataChaveModalAtual = null;
        }

        function confirmarTrocaPontual() {
            if (!dataChaveModalAtual) return;
            const novoIndice = parseInt(document.getElementById('selectNovoResponsavel').value, 10);

            if (!state.trocas) state.trocas = {};
            state.trocas[dataChaveModalAtual] = novoIndice;

            salvarEstado();
            fecharModalTroca();
            gerarEscala(false);
            mostrarToast(`Troca registrada para ${state.irmaos[novoIndice]}!`);
        }

        function restaurarOriginalNoModal() {
            if (!dataChaveModalAtual) return;
            if (state.trocas && Object.prototype.hasOwnProperty.call(state.trocas, dataChaveModalAtual)) {
                delete state.trocas[dataChaveModalAtual];
            }
            salvarEstado();
            fecharModalTroca();
            gerarEscala(false);
            mostrarToast('Escala original restaurada para este fim de semana.');
        }

        function limparTrocasEConcluidos() {
            state.concluidos = {};
            state.trocas = {};
            salvarEstado();
            gerarEscala(false);
            mostrarToast('Marcações e trocas pontuais foram limpas.');
        }

        function toggleConfigPanel() {
            const panel = document.getElementById('configPanel');
            const texto = document.getElementById('txtToggleConfig');
            state.configAberta = !state.configAberta;

            if (state.configAberta) {
                panel.classList.remove('hidden');
                texto.textContent = 'Ocultar Configurações';
            } else {
                panel.classList.add('hidden');
                texto.textContent = 'Editar Irmãos e Datas';
            }
            salvarEstado();
        }

        /**
         * Formata a escala completa para envio limpo no grupo do WhatsApp da família
         * e copia para a área de transferência usando document.execCommand('copy').
         */
        function copiarParaWhatsApp() {
            if (escalaAtual.length === 0) return;

            let linhas = [
                '❤️ *ESCALA DE FINS DE SEMANA - CUIDADOS COM A MÃEZINHA* ❤️',
                '_(Sábado e Domingo - 1 irmão por fim de semana)_',
                ''
            ];

            escalaAtual.forEach(item => {
                const nome = state.irmaos[item.indiceEfetivo];
                const statusIcon = item.concluido ? '✅ ' : '📅 ';
                const notaTroca = item.temTroca ? ' _(troca)_' : '';
                linhas.push(`${statusIcon}*#${String(item.numero).padStart(2, '0')}* (${item.textoCurto}): *${nome}*${notaTroca}`);
            });

            linhas.push('');
            linhas.push('_Obs: De Segunda a Sexta seguem as 4 irmãs._');

            const textoFinal = linhas.join('\n');

            // Método compatível com iframes e navegadores móveis
            const textarea = document.createElement('textarea');
            textarea.value = textoFinal;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand('copy');
                mostrarToast('Escala copiada! Agora é só colar no WhatsApp da família.');
            } catch (err) {
                mostrarToast('Não foi possível copiar automaticamente.');
            } finally {
                document.body.removeChild(textarea);
            }
        }

        function mostrarToast(mensagem) {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast-enter bg-stone-900 text-white px-4 py-3 rounded-xl shadow-lg border border-stone-700 text-sm font-medium flex items-center gap-2.5 max-w-sm';
            toast.innerHTML = `
                <i data-lucide="check-circle" class="w-5 h-5 text-emerald-400 shrink-0"></i>
                <span>${escaparHTML(mensagem)}</span>
            `;
            container.appendChild(toast);
            lucide.createIcons();

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }

        function escaparHTML(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // =========================================================================
        // INICIALIZAÇÃO DA PÁGINA
        // =========================================================================
        window.addEventListener('DOMContentLoaded', () => {
            carregarEstado();

            // Aplica valores carregados aos inputs
            document.getElementById('dataInicio').value = state.dataInicio;
            document.getElementById('presetDuracao').value = state.presetDuracao;
            document.getElementById('qtdPersonalizada').value = state.qtdPersonalizada;

            if (state.presetDuracao === 'custom') {
                document.getElementById('customQtdWrapper').classList.remove('hidden');
            }

            if (!state.configAberta) {
                document.getElementById('configPanel').classList.add('hidden');
                document.getElementById('txtToggleConfig').textContent = 'Editar Irmãos e Datas';
            }

            renderizarListaIrmaos();
            gerarEscala(false);
        });