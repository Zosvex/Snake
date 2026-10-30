(function () {
    'use strict';

    // ===== Константы =====
    const CANVAS_SIZE = 400;
    const GRID_COUNT = 20;
    const CELL_SIZE = CANVAS_SIZE / GRID_COUNT;
    const INITIAL_SPEED = 150;
    const SPEED_INCREMENT = 2;
    const MIN_SPEED = 60;

    // ===== Состояние игры =====
    let snake = [];
    let food = null;
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let score = 0;
    let highScore = 0;
    let speed = INITIAL_SPEED;
    let gameState = 'idle'; // 'idle' | 'running' | 'paused' | 'gameover'
    let gameLoop = null;
    let lastRenderTime = 0;

    // ===== DOM =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlaySubtitle = document.getElementById('overlaySubtitle');

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

        // Проверка столкновения со стенами
        if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
            gameOver();
            return;
        }

        // Проверка столкновения с собой
        if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
            gameOver();
            return;
        }

        snake.unshift(head);

        // Проверка еды
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreEl.textContent = score;
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

        // Еда
        if (food) {
            const foodCenterX = food.x * CELL_SIZE + CELL_SIZE / 2;
            const foodCenterY = food.y * CELL_SIZE + CELL_SIZE / 2;
            const foodRadius = CELL_SIZE / 2 - 2;

            // Свечение
            ctx.shadowColor = '#f87171';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Змейка
        snake.forEach((seg, i) => {
            const x = seg.x * CELL_SIZE;
            const y = seg.y * CELL_SIZE;
            const padding = 1;

            if (i === 0) {
                // Голова
                ctx.fillStyle = '#4ade80';
                ctx.shadowColor = '#4ade80';
                ctx.shadowBlur = 8;
            } else {
                // Тело — градиент от зелёного к тёмному
                const ratio = i / snake.length;
                const r = Math.round(74 - ratio * 40);
                const g = Math.round(222 - ratio * 100);
                const b = Math.round(128 - ratio * 60);
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
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
        }
    }

    // ===== Конец игры =====
    function gameOver() {
        gameState = 'gameover';
        if (gameLoop) cancelAnimationFrame(gameLoop);
        saveHighScore();

        overlayTitle.textContent = 'Игра окончена';
        overlayTitle.classList.add('game-over');
        overlaySubtitle.textContent = `Счёт: ${score} &nbsp;|&nbsp; Нажмите Пробел для перезапуска`;
        overlay.classList.remove('hidden');

        // Мигание змейки
        let blinkCount = 0;
        const blinkInterval = setInterval(() => {
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
        } else {
            togglePause();
        }
    });

    // ===== Запуск =====
    loadHighScore();
    initGame();
    draw();

})();
