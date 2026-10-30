(function () {
    'use strict';

    // ===== Эффект печатания текста =====
    function typeWriter(element, text, speed) {
        let i = 0;
        const cursor = document.createElement('span');
        cursor.classList.add('typing-cursor');
        element.appendChild(cursor);

        function type() {
            if (i < text.length) {
                cursor.before(document.createTextNode(text.charAt(i)));
                i++;
                setTimeout(type, speed);
            } else {
                // Убираем курсор после завершения
                setTimeout(() => cursor.remove(), 1000);
            }
        }
        type();
    }

    // ===== Анимация появления при скролле =====
    function initScrollAnimations() {
        const elements = document.querySelectorAll('.fade-in');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        elements.forEach((el) => observer.observe(el));
    }

    // ===== Кнопка "Наверх" =====
    function initScrollTop() {
        const scrollBtn = document.getElementById('scrollTop');
        if (!scrollBtn) return;

        function toggleVisibility() {
            if (window.scrollY > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        }

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', toggleVisibility, { passive: true });
    }

    // ===== Активный пункт навигации =====
    function initActiveNav() {
        const navLinks = document.querySelectorAll('.nav__link');

        window.addEventListener('scroll', () => {
            let current = '';
            const sections = document.querySelectorAll('section');

            sections.forEach((section) => {
                const sectionTop = section.offsetTop - 100;
                if (window.scrollY >= sectionTop) {
                    current = section.getAttribute('class');
                }
            });

            navLinks.forEach((link) => {
                link.classList.remove('nav__link--active');
                if (
                    (current.includes('hero') && link.textContent.trim() === 'Главная') ||
                    (current.includes('articles') && link.textContent.trim() === 'Статьи') ||
                    (current.includes('footer') && link.textContent.trim() === 'О блоге')
                ) {
                    link.classList.add('nav__link--active');
                }
            });
        }, { passive: true });
    }

    // ===== Анимация счётчика времени чтения =====
    function initReadTimeCounters() {
        const readTimeElements = document.querySelectorAll('.read-time__number');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const target = parseInt(el.dataset.count || el.textContent, 10);
                        animateCounter(el, 0, target, 800);
                        observer.unobserve(el);
                    }
                });
            },
            { threshold: 0.5 }
        );

        readTimeElements.forEach((el) => {
            el.dataset.count = el.textContent;
            observer.observe(el);
        });
    }

    // ===== Анимация счётчика =====
    function animateCounter(element, start, end, duration) {
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(start + (end - start) * eased);

            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // ===== Инициализация =====
    document.addEventListener('DOMContentLoaded', () => {
        // Эффект печатания заголовка
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle) {
            typeWriter(heroTitle, 'Добро пожаловать в мой блог', 60);
        }

        // Запуск анимаций
        initScrollAnimations();
        initScrollTop();
        initActiveNav();
        initReadTimeCounters();
    });
})();
