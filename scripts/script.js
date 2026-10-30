(function () {
    'use strict';

    // ===== Константы =====
    const CANVAS_SIZE = 400;
    const GRID_COUNT = 20;
    const CELL_SIZE = CANVAS_SIZE / GRID_COUNT;
    const INITIAL_SPEED = 150;
    const SPEED_INCREMENT = 2;
    const MIN_SPEED = 60;
    const REVIVE_COST = 10;
    const SKIN_COST = 10;

    // ===== Скины =====
    const SKINS = [
        { id: 'classic', name: 'Классика', rarity: 'common', head: '#4ade80', body: ['#4ade80', '#22c55e', '#16a34a'], desc: 'Зелёная классика' },
        { id: 'fire', name: 'Огненная', rarity: 'rare', head: '#f97316', body: ['#f97316', '#ef4444', '#dc2626'], desc: 'Красно-оранжевая' },
        { id: 'ice', name: 'Ледяная', rarity: 'rare', head: '#38bdf8', body: ['#38bdf8', '#0ea5e9', '#0284c7'], desc: 'Голубая холодная' },
        { id: 'neon', name: 'Неоновая', rarity: 'epic', head: '#e879f9', body: ['#e879f9', '#d946ef', '#c026d3'], desc: 'Розовая неоновая' },
        { id: 'gold', name: 'Золотая', rarity: 'epic', head: '#fbbf24', body: ['#fbbf24', '#f59e0b', '#d97706'], desc: 'Блестящее золото' },
        { id: 'shadow', name: 'Теневая', rarity: 'legendary', head: '#a78bfa', body: ['#a78bfa', '#8b5cf6', '#6d28d9'], desc: 'Фиолетовая тень' },
        { id: 'rainbow', name: 'Радужная', rarity: 'legendary', head: '#f87171', body: ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa'], desc: 'Все цвета радуги' },
        { id: 'cosmic', name: 'Космическая', rarity: 'legendary', head: '#818cf8', body: ['#818cf8', '#6366f1', '#4f46e5'], desc: 'Тёмно-синяя космос' }
    ];

    // ===== Состояние игры =====
    let snake = [];
    let food = null;
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let score = 0;
    let highScore = 0;
    let coins = 0;
    let speed = INITIAL_SPEED;
    let gameState = 'idle'; // 'idle' | 'running' | 'paused' | 'revive' | 'gameover'
    let gameLoop = null;
    let lastRenderTime = 0;
    let blinkInterval = null;
    let snakeLengthOnCollision = 0;
    let ownedSkins = [];
    let currentSkin = 'classic';

    // ===== DOM =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const coinsEl = document.getElementById('coins');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlaySubtitle = document.getElementById('overlaySubtitle');
    const reviveBtn = document.getElementById('reviveBtn');
    const restartBtn = document.getElementById('restartBtn');
    const shopBtn = document.getElementById('shopBtn');
    const shopModal = document.getElementById('shopModal');
    const shopClose = document.getElementById('shopClose');
    const shopBalance = document.getElementById('shopBalance');
    const skinsGrid = document.getElementById('skinsGrid');

    // ===== Загрузка рекорда =====
    function loadHighScore() {
        const saved = localStorage.getItem('snakeHighScore');
        if (saved) {
            highScore = parseInt(saved, 10);
            highScoreEl.textContent = highScore;
        }
    }

    function saveHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
    }

    function loadCoins() {
        const saved = localStorage.getItem('snakeCoins');
        if (saved) {
            coins = parseInt(saved, 10);
            coinsEl.textContent = coins;
        }
    }

    function saveCoins() {
        localStorage.setItem('snakeCoins', coins);
        coinsEl.textContent = coins;
    }

    // ===== Скины =====
    function loadSkins() {
        const saved = localStorage.getItem('snakeSkins');
        if (saved) {
            ownedSkins = JSON.parse(saved);
        } else {
            ownedSkins = ['classic'];
            saveSkins();
        }
        const savedCurrent = localStorage.getItem('snakeCurrentSkin');
        if (savedCurrent && ownedSkins.includes(savedCurrent)) {
            currentSkin = savedCurrent;
        } else {
            currentSkin = 'classic';
        }
    }

    function saveSkins() {
        localStorage.setItem('snakeSkins', JSON.stringify(ownedSkins));
        localStorage.setItem('snakeCurrentSkin', currentSkin);
    }

    function getSkin(id) {
        return SKINS.find(s => s.id === id);
    }

    function renderShop() {
        shopBalance.textContent = coins;
        skinsGrid.innerHTML = '';

        SKINS.forEach(skin => {
            const isOwned = ownedSkins.includes(skin.id);
            const isEquipped = currentSkin === skin.id;
            const canBuy = coins >= SKIN_COST && !isOwned;

            const card = document.createElement('div');
            card.className = `skin-card skin-card--${skin.rarity}`;
            if (isEquipped) card.classList.add('skin-card--equipped');

            const preview = document.createElement('div');
            preview.className = 'skin-card__preview';
            preview.style.background = `linear-gradient(90deg, ${skin.body[0]}, ${skin.body[1] || skin.body[0]})`;

            const name = document.createElement('div');
            name.className = 'skin-card__name';
            name.textContent = skin.name;

            const rarity = document.createElement('div');
            rarity.className = `skin-card__rarity ${skin.rarity}`;
            const rarityNames = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' };
            rarity.textContent = rarityNames[skin.rarity];

            const price = document.createElement('div');
            price.className = 'skin-card__price';
            if (isOwned) {
                price.textContent = isEquipped ? '✓ Выбран' : 'Куплено';
                price.style.color = isEquipped ? '#4ade80' : '#888';
            } else {
                price.innerHTML = `${SKIN_COST} &#9830;`;
            }

            const btn = document.createElement('button');
            btn.className = 'skin-card__btn';
            if (isEquipped) {
                btn.textContent = 'Выбрано';
                btn.classList.add('skin-card__btn--equipped');
                btn.disabled = true;
            } else if (isOwned) {
                btn.textContent = 'Выбрать';
                btn.classList.add('skin-card__btn--equip');
                btn.addEventListener('click', () => {
                    currentSkin = skin.id;
                    saveSkins();
                    renderShop();
                });
            } else if (canBuy) {
                btn.textContent = 'Купить';
                btn.classList.add('skin-card__btn--buy');
                btn.addEventListener('click', () => {
                    coins -= SKIN_COST;
                    saveCoins();
                    ownedSkins.push(skin.id);
                    saveSkins();
                    currentSkin = skin.id;
                    saveSkins();
                    renderShop();
                });
            } else {
                btn.textContent = 'Не хватает';
                btn.classList.add('skin-card__btn--buy');
                btn.disabled = true;
            }

            card.appendChild(preview);
            card.appendChild(name);
            card.appendChild(rarity);
            card.appendChild(price);
            card.appendChild(btn);
            skinsGrid.appendChild(card);
        });
    }

    function getSnakeColors() {
        const skin = getSkin(currentSkin);
        return {
            head: skin.head,
            body: skin.body,
            glow: skin.head
        };
    }

    // ===== Инициализация =====
    function initGame() {
        // Начальная позиция змейки (3 сегмента, центр)
        const startX = Math.floor(GRID_COUNT / 2);
        const startY = Math.floor(GRID_COUNT / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        speed = INITIAL_SPEED;
        scoreEl.textContent = 0;
        spawnFood();
    }

    // ===== Возрождение =====
    function revive() {
        if (coins < REVIVE_COST || gameState !== 'revive') return;
        coins -= REVIVE_COST;
        saveCoins();
        coinsEl.textContent = coins;

        // Остановить мигание
        if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
        }

        // Спавн змейки по центру с сохранением длины
        const startX = Math.floor(GRID_COUNT / 2);
        const startY = Math.floor(GRID_COUNT / 2);
        const length = snakeLengthOnCollision || 3;
        snake = [];
        for (let i = 0; i < length; i++) {
            snake.push({ x: startX - i, y: startY });
        }
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };

        // Новая еда
        spawnFood();

        gameState = 'running';
        overlay.classList.add('hidden');
        overlayTitle.classList.remove('game-over');
        overlayTitle.textContent = 'Змейка';
        overlaySubtitle.textContent = 'Нажмите Пробел или кликните для начала';
        reviveBtn.style.display = 'none';
        restartBtn.style.display = 'none';

        draw();
        restartLoop();
    }

    // ===== Еда =====
    function spawnFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_COUNT),
                y: Math.floor(Math.random() * GRID_COUNT)
            };
        } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
        food = newFood;
    }

    // ===== Обновление =====
    function update() {
        direction = { ...nextDirection };

        const head = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };

        // Проверка столкновения ПЕРЕД движением
        const hitWall = head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT;
        const hitSelf = snake.some(seg => seg.x === head.x && seg.y === head.y);

        if (hitWall || hitSelf) {
            // Столкновение — змейка НЕ двигается, остаётся на месте
            snakeLengthOnCollision = snake.length;
            if (coins >= REVIVE_COST) {
                // Показываем оверлей с кнопкой возрождения
                gameState = 'revive';
                if (gameLoop) cancelAnimationFrame(gameLoop);
                overlayTitle.textContent = 'Столкновение!';
                overlayTitle.classList.add('game-over');
                overlaySubtitle.innerHTML = `Счёт: ${score} &nbsp;|&nbsp; Монетки: ${coins}`;
                overlay.classList.remove('hidden');
                reviveBtn.style.display = 'inline-block';
                restartBtn.style.display = 'inline-block';
                reviveBtn.disabled = false;
            } else {
                gameOver();
            }
            return;
        }

        // Если нет столкновения — двигаем змейку
        snake.unshift(head);

        // Проверка еды
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreEl.textContent = score;
            coins++;
            saveCoins();
            spawnFood();

            // Ускорение
            speed = Math.max(MIN_SPEED, speed - SPEED_INCREMENT);
            restartLoop();
        } else {
            snake.pop();
        }
    }

    // ===== Отрисовка =====
    function draw() {
        // Фон
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Сетка (тонкая)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
            ctx.stroke();
        }

        // Еда (монетка)
        if (food) {
            const foodCenterX = food.x * CELL_SIZE + CELL_SIZE / 2;
            const foodCenterY = food.y * CELL_SIZE + CELL_SIZE / 2;
            const foodRadius = CELL_SIZE / 2 - 2;

            // Свечение
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
            ctx.fill();

            // Внутренний круг
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(foodCenterX, foodCenterY, foodRadius - 3, 0, Math.PI * 2);
            ctx.fill();

            // Символ "$"
            ctx.fillStyle = '#92400e';
            ctx.font = `bold ${CELL_SIZE * 0.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', foodCenterX, foodCenterY + 1);
        }

        // Змейка
        const colors = getSnakeColors();
        snake.forEach((seg, i) => {
            const x = seg.x * CELL_SIZE;
            const y = seg.y * CELL_SIZE;
            const padding = 1;

            if (i === 0) {
                // Голова
                ctx.fillStyle = colors.head;
                ctx.shadowColor = colors.glow;
                ctx.shadowBlur = 8;
            } else {
                // Тело — градиент от цвета головы к тёмному
                const ratio = i / snake.length;
                const bodyColor = colors.body[Math.min(Math.floor(ratio * colors.body.length), colors.body.length - 1)];
                ctx.fillStyle = bodyColor;
                ctx.shadowBlur = 0;
            }

            roundRect(ctx, x + padding, y + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2, 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Глаза на голове
            if (i === 0) {
                ctx.fillStyle = '#1a1a2e';
                const eyeSize = 3;
                let eye1X, eye1Y, eye2X, eye2Y;

                if (direction.x === 1) {
                    eye1X = x + CELL_SIZE * 0.65; eye1Y = y + CELL_SIZE * 0.3;
                    eye2X = x + CELL_SIZE * 0.65; eye2Y = y + CELL_SIZE * 0.7;
                } else if (direction.x === -1) {
                    eye1X = x + CELL_SIZE * 0.35; eye1Y = y + CELL_SIZE * 0.3;
                    eye2X = x + CELL_SIZE * 0.35; eye2Y = y + CELL_SIZE * 0.7;
                } else if (direction.y === -1) {
                    eye1X = x + CELL_SIZE * 0.3; eye1Y = y + CELL_SIZE * 0.35;
                    eye2X = x + CELL_SIZE * 0.7; eye2Y = y + CELL_SIZE * 0.35;
                } else {
                    eye1X = x + CELL_SIZE * 0.3; eye1Y = y + CELL_SIZE * 0.65;
                    eye2X = x + CELL_SIZE * 0.7; eye2Y = y + CELL_SIZE * 0.65;
                }

                ctx.beginPath();
                ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // ===== Скруглённый прямоугольник =====
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ===== Игровой цикл =====
    function gameCycle(currentTime) {
        if (gameState !== 'running') return;

        gameLoop = requestAnimationFrame(gameCycle);

        const elapsed = currentTime - lastRenderTime;
        if (elapsed < speed) return;

        lastRenderTime = currentTime;
        update();
        draw();
    }

    function restartLoop() {
        if (gameLoop) cancelAnimationFrame(gameLoop);
        lastRenderTime = performance.now();
        gameLoop = requestAnimationFrame(gameCycle);
    }

    // ===== Старт / Пауза =====
    function startGame() {
        initGame();
        gameState = 'running';
        overlay.classList.add('hidden');
        overlayTitle.classList.remove('game-over');
        restartBtn.style.display = 'none';
        draw();
        restartLoop();
    }

    function togglePause() {
        if (gameState === 'running') {
            gameState = 'paused';
            if (gameLoop) cancelAnimationFrame(gameLoop);
            overlayTitle.textContent = 'Пауза';
            overlayTitle.classList.remove('game-over');
            overlaySubtitle.textContent = 'Нажмите Пробел для продолжения';
            overlay.classList.remove('hidden');
        } else if (gameState === 'paused') {
            gameState = 'running';
            overlay.classList.add('hidden');
            lastRenderTime = performance.now();
            gameLoop = requestAnimationFrame(gameCycle);
            restartBtn.style.display = 'none';
        }
    }

    // ===== Конец игры =====
    function gameOver() {
        gameState = 'gameover';
        if (gameLoop) cancelAnimationFrame(gameLoop);
        saveHighScore();

        overlayTitle.textContent = 'Игра окончена';
        overlayTitle.classList.add('game-over');
        overlaySubtitle.innerHTML = `Счёт: ${score} &nbsp;|&nbsp; Монетки: ${coins} &nbsp;|&nbsp; Нажмите Пробел для перезапуска`;
        overlay.classList.remove('hidden');

        // Показать/скрыть кнопку возрождения (только если есть монетки)
        reviveBtn.style.display = coins >= REVIVE_COST ? 'inline-block' : 'none';
        restartBtn.style.display = 'inline-block';

        // Мигание змейки
        let blinkCount = 0;
        blinkInterval = setInterval(() => {
            if (gameState !== 'gameover') {
                clearInterval(blinkInterval);
                return;
            }
            if (blinkCount % 2 === 0) {
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            } else {
                draw();
            }
            blinkCount++;
            if (blinkCount > 5) clearInterval(blinkInterval);
        }, 200);
    }

    // ===== Управление =====
    function handleKeydown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (gameState === 'idle' || gameState === 'gameover') {
                startGame();
            } else if (gameState === 'revive') {
                // В состоянии возрождения пробел ничего не делает
                return;
            } else {
                togglePause();
            }
            return;
        }

        if (gameState !== 'running') return;

        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
            case 'KeyS':
                if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
            case 'KeyA':
                if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
            case 'KeyD':
                if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
                break;
        }
    }

    // ===== События =====
    document.addEventListener('keydown', handleKeydown);
    canvas.addEventListener('click', () => {
        if (gameState === 'idle' || gameState === 'gameover') {
            startGame();
        } else if (gameState !== 'revive') {
            togglePause();
        }
    });
    reviveBtn.addEventListener('click', revive);
    restartBtn.addEventListener('click', startGame);

    // Магазин
    shopBtn.addEventListener('click', () => {
        renderShop();
        shopModal.classList.add('open');
    });

    shopClose.addEventListener('click', () => {
        shopModal.classList.remove('open');
    });

    shopModal.addEventListener('click', (e) => {
        if (e.target === shopModal) {
            shopModal.classList.remove('open');
        }
    });

    // ===== Запуск =====
    loadHighScore();
    loadCoins();
    loadSkins();
    initGame();
    draw();

})();
