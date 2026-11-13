/**
 * SIMULAÇÃO DE AGENTES DE IA EM NODE.JS (Grid World com Paredes e Moedas)
 * ---------------------------------------------------------------------
 * Execução Clássica:  node grid_moedas_agentes.js
 * Execução Aleatória: node grid_moedas_agentes.js --random
 */

// ============================================================================
// 1. CLASSE DO AMBIENTE (Grid World)
// ============================================================================
class GridEnvironment {
    constructor(useRandomGrid = false) {
        if (useRandomGrid) {
            // Gera um mapa procedural 7x7 com 4 moedas e ~20% de densidade de paredes internas
            this.initialGrid = this.generateRandomGrid(7, 7, 4, 0.20);
        } else {
            // Mapa clássico
            this.initialGrid = [
                ["#", "#", "#", "#", "#", "#", "#"],
                ["#", "A", ".", "C", "#", "C", "#"],
                ["#", "#", ".", "#", "#", ".", "#"],
                ["#", "C", ".", ".", ".", ".", "#"],
                ["#", "#", "#", "#", "#", "#", "#"]
            ];
        }

        this.reset();
    }

    generateRandomGrid(rows, cols, numCoins, wallProbability) {
        // Inicializa com espaços vazios
        const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));

        // Cria as bordas (paredes)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                    grid[r][c] = '#';
                }
            }
        }

        // Obtém apenas as células internas para distribuir os elementos
        const innerCells = [];
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                innerCells.push({ r, c });
            }
        }

        // Embaralha as células internas (Fisher-Yates) para garantir distribuição aleatória
        for (let i = innerCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [innerCells[i], innerCells[j]] = [innerCells[j], innerCells[i]];
        }

        // Coloca o Agente
        const agentCell = innerCells.pop();
        grid[agentCell.r][agentCell.c] = 'A';

        // Coloca as Moedas
        for (let i = 0; i < numCoins && innerCells.length > 0; i++) {
            const coinCell = innerCells.pop();
            grid[coinCell.r][coinCell.c] = 'C';
        }

        // Coloca as paredes aleatórias (obstáculos)
        for (const cell of innerCells) {
            if (Math.random() < wallProbability) {
                grid[cell.r][cell.c] = '#';
            }
        }

        return grid;
    }

    reset() {
        this.rows = this.initialGrid.length;
        this.cols = this.initialGrid[0].length;
        this.grid = this.initialGrid.map(row => [...row]);

        this.coinsRemaining = 0;
        this.totalCoins = 0;
        this.score = 0;
        
        // FIX: Procura dinamicamente a posição do agente e a contagem de moedas
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 'C') {
                    this.totalCoins++;
                } else if (this.grid[r][c] === 'A') {
                    this.agentPos = { r, c }; // Posição dinâmica
                }
            }
        }
        
        this.coinsRemaining = this.totalCoins;
        
        // Limpa o caractere 'A' do grid base, pois o agente é uma entidade móvel
        this.grid[this.agentPos.r][this.agentPos.c] = '.';
    }

    getPercept() {
        const { r, c } = this.agentPos;
        const currentCell = this.grid[r][c] === 'C' ? 'C' : '.';

        const adjacent = {
            'Up': this.grid[r - 1][c],
            'Down': this.grid[r + 1][c],
            'Left': this.grid[r][c - 1],
            'Right': this.grid[r][c + 1]
        };

        return {
            pos: { r, c },
            currentCell,
            adjacent,
            coinsRemaining: this.coinsRemaining
        };
    }

    step(action) {
        const moves = {
            'Up': { dr: -1, dc: 0 },
            'Down': { dr: 1, dc: 0 },
            'Left': { dr: 0, dc: -1 },
            'Right': { dr: 0, dc: 1 }
        };

        if (action === 'Grab') {
            const { r, c } = this.agentPos;
            if (this.grid[r][c] === 'C') {
                this.grid[r][c] = '.';
                this.coinsRemaining--;
                this.score += 20; 
            } else {
                this.score -= 5; 
            }
        } else if (moves[action]) {
            const { dr, dc } = moves[action];
            const newR = this.agentPos.r + dr;
            const newC = this.agentPos.c + dc;

            if (this.grid[newR][newC] !== '#') {
                this.agentPos = { r: newR, c: newC };
                this.score -= 1; 
            } else {
                this.score -= 5; 
            }
        }
        return this.getPercept();
    }
}

// ============================================================================
// 2. AGENTE 1: REFLEXO SIMPLES
// ============================================================================
class SimpleReflexAgent {
    constructor() {
        this.name = "Reflexo Simples";
    }

    getAction(percept) {
        if (percept.currentCell === 'C') return 'Grab';

        for (const [dir, cell] of Object.entries(percept.adjacent)) {
            if (cell === 'C') return dir;
        }

        const validMoves = Object.entries(percept.adjacent)
            .filter(([_, cell]) => cell !== '#')
            .map(([dir, _]) => dir);

        if (validMoves.length > 0) {
            const idx = Math.floor(Math.random() * validMoves.length);
            return validMoves[idx];
        }

        return 'NoOp';
    }
}

// ============================================================================
// 3. AGENTE 2: BASEADO EM MODELO
// ============================================================================
class ModelBasedAgent {
    constructor() {
        this.name = "Baseado em Modelo";
        this.reset();
    }

    reset() {
        this.visitCounts = {};
    }

    _posKey(r, c) {
        return `${r},${c}`;
    }

    getAction(percept) {
        const { r, c } = percept.pos;
        const currentKey = this._posKey(r, c);
        this.visitCounts[currentKey] = (this.visitCounts[currentKey] || 0) + 1;

        if (percept.currentCell === 'C') return 'Grab';

        for (const [dir, cell] of Object.entries(percept.adjacent)) {
            if (cell === 'C') return dir;
        }

        const moves = {
            'Up': { r: r - 1, c },
            'Down': { r: r + 1, c },
            'Left': { r, c: c - 1 },
            'Right': { r, c: c + 1 }
        };

        let bestDir = null;
        let minVisits = Infinity;

        for (const [dir, targetPos] of Object.entries(moves)) {
            if (percept.adjacent[dir] !== '#') {
                const key = this._posKey(targetPos.r, targetPos.c);
                const visits = this.visitCounts[key] || 0;
                if (visits < minVisits) {
                    minVisits = visits;
                    bestDir = dir;
                }
            }
        }

        return bestDir || 'NoOp';
    }
}

// ============================================================================
// 4. AGENTE 3: BASEADO EM OBJETIVOS
// ============================================================================
class GoalBasedAgent {
    constructor() {
        this.name = "Baseado em Objetivos";
        this.reset();
    }

    reset() {
        this.plan = [];
    }

    findPathToNearestCoin(startPos, grid) {
        const rows = grid.length;
        const cols = grid[0].length;
        const queue = [[startPos, []]];
        const visited = new Set([`${startPos.r},${startPos.c}`]);

        const moves = [
            { dir: 'Up', dr: -1, dc: 0 },
            { dir: 'Down', dr: 1, dc: 0 },
            { dir: 'Left', dr: 0, dc: -1 },
            { dir: 'Right', dr: 0, dc: 1 }
        ];

        while (queue.length > 0) {
            const [{ r, c }, path] = queue.shift();

            if (grid[r][c] === 'C') {
                return [...path, 'Grab'];
            }

            for (const { dir, dr, dc } of moves) {
                const nr = r + dr;
                const nc = c + dc;
                const key = `${nr},${nc}`;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (grid[nr][nc] !== '#' && !visited.has(key)) {
                        visited.add(key);
                        queue.push([{ r: nr, c: nc }, [...path, dir]]);
                    }
                }
            }
        }
        return [];
    }

    getAction(percept, envGrid) {
        if (this.plan.length > 0) return this.plan.shift();

        this.plan = this.findPathToNearestCoin(percept.pos, envGrid);

        if (this.plan.length > 0) return this.plan.shift();

        return 'NoOp';
    }
}

// ============================================================================
// 5. AGENTE 4: BASEADO EM UTILIDADE
// ============================================================================
class UtilityBasedAgent {
    constructor() {
        this.name = "Baseado em Utilidade";
        this.reset();
    }

    reset() {
        this.visited = new Set();
    }

    getAction(percept) {
        const { r, c } = percept.pos;
        this.visited.add(`${r},${c}`);

        if (percept.currentCell === 'C') return 'Grab';

        const moves = [
            { dir: 'Up', dr: -1, dc: 0 },
            { dir: 'Down', dr: 1, dc: 0 },
            { dir: 'Left', dr: 0, dc: -1 },
            { dir: 'Right', dr: 0, dc: 1 }
        ];

        let bestAction = 'NoOp';
        let maxExpectedUtility = -Infinity;

        for (const { dir, dr, dc } of moves) {
            const cellType = percept.adjacent[dir];
            let utility = 0;

            if (cellType === '#') {
                utility = -100;
            } else {
                const targetKey = `${r + dr},${c + dc}`;
                utility -= 1; 

                if (cellType === 'C') {
                    utility += 50; 
                }

                if (!this.visited.has(targetKey)) {
                    utility += 15; 
                }
            }

            if (utility > maxExpectedUtility) {
                maxExpectedUtility = utility;
                bestAction = dir;
            }
        }

        return bestAction;
    }
}

// ============================================================================
// 6. SIMULAÇÃO E COMPARAÇÃO DE DESEMPENHO
// ============================================================================
function runSimulation() {
    // Parser dos argumentos da linha de comando
    const args = process.argv.slice(2);
    const useRandomGrid = args.includes('--random') || args.includes('-r');

    console.log("===============================================================");
    console.log(" SIMULAÇÃO EM NODE.JS: GRID WORLD COM PAREDES E MOEDAS");
    console.log(` MODO: ${useRandomGrid ? "ALEATÓRIO (--random ativo)" : "CLÁSSICO"}`);
    console.log("===============================================================\n");

    const env = new GridEnvironment(useRandomGrid);
    
    // Imprime o visual do mapa gerado
    console.log("MAPA INICIAL DA SIMULAÇÃO:");
    console.log(env.initialGrid.map(row => row.join(' ')).join('\n') + '\n');

    const agents = [
        new SimpleReflexAgent(),
        new ModelBasedAgent(),
        new GoalBasedAgent(),
        new UtilityBasedAgent()
    ];

    const results = [];
    const maxSteps = 50; // Aumentado de 30 para 50 caso os labirintos aleatórios gerados fiquem longos

    for (const agent of agents) {
        env.reset();
        if (agent.reset) agent.reset();

        console.log(`--- Agente: ${agent.name} ---`);
        console.log(`Moedas Iniciais: ${env.coinsRemaining} | Posição Inicial: (${env.agentPos.r}, ${env.agentPos.c})`);

        let stepCount = 0;

        for (let step = 1; step <= maxSteps; step++) {
            if (env.coinsRemaining === 0) break;

            const percept = env.getPercept();
            const action = agent.getAction(percept, env.grid);
            env.step(action);
            stepCount = step;

            const stepStr = String(step).padStart(2, ' ');
            console.log(
                `Passo ${stepStr} | Ação: ${action.padEnd(5, ' ')} | ` +
                `Pos: (${env.agentPos.r}, ${env.agentPos.c}) | ` +
                `Moedas Restantes: ${env.coinsRemaining} | Score: ${env.score}`
            );
        }

        const coinsCollected = env.totalCoins - env.coinsRemaining;
        console.log(`-> Resultado Final (${agent.name}): Moedas = ${coinsCollected}/${env.totalCoins} | Passos: ${stepCount} | Score: ${env.score}\n`);

        results.push({
            name: agent.name,
            coins: `${coinsCollected}/${env.totalCoins}`,
            steps: stepCount,
            score: env.score
        });
    }

    console.log("===============================================================");
    console.log(" RESUMO DE DESEMPENHO (Node.js)");
    console.log("===============================================================");
    for (const res of results) {
        console.log(
            `- ${res.name.padEnd(22, ' ')} : Moedas = ${res.coins} | Passos = ${String(res.steps).padStart(2, ' ')} | Score Final = ${res.score} pts`
        );
    }
}

// Executa a simulação
runSimulation();