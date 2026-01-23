document.addEventListener("DOMContentLoaded", () => {
    // URL к файлу, который генерирует питон
    // Если тестируешь локально, просто 'site_data.json'
    // Если на GitHub, и файл в корне: 'site_data.json'
    const DATA_URL = 'site_data.json'; 
    
    // Элементы
    const preloader = document.getElementById('preloader');
    const casesGrid = document.getElementById('cases-grid');
    const hhBanner = document.getElementById('hh-banner');
    const hhTimer = document.getElementById('hh-timer');
    const hhStatusText = document.getElementById('hh-status-text');
    
    // Глобальные данные
    let appData = null;
    let hhInterval = null;

    // 1. Загрузка данных
    async function loadData() {
        try {
            // Добавляем timestamp чтобы избежать кэширования браузером
            const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
            if (!response.ok) throw new Error("Нет данных");
            
            appData = await response.json();
            
            renderApp();
            
            // Скрываем прелоадер красиво
            setTimeout(() => {
                preloader.classList.add('hide');
            }, 800);

        } catch (error) {
            console.error(error);
            document.querySelector('.loader-text').innerText = "Ошибка загрузки данных";
            document.querySelector('.loader-text').style.color = "red";
        }
    }

    // 2. Рендеринг
    function renderApp() {
        // Настройка Happy Hour
        startTimer();
        renderHistory();
        
        // Отрисовка кейсов
        casesGrid.innerHTML = '';
        appData.cases.forEach(caseItem => {
            const card = document.createElement('div');
            card.className = 'case-card';
            
            // Вычисляем цену с учетом скидки, если HH активен
            const isHH = appData.happy_hour.active;
            const finalPrice = isHH ? Math.floor(caseItem.price * 0.5) : caseItem.price;
            
            // Форматируем цену (1 000 000)
            const fmtPrice = finalPrice.toLocaleString('ru-RU');
            
            let priceHtml = `<span>${fmtPrice} 💰</span>`;
            if (isHH) {
                priceHtml = `<span class="old-price">${caseItem.price.toLocaleString()}</span>${priceHtml}`;
            }

            // Достаем эмодзи из названия (первый символ) или дефолтный
            const emoji = caseItem.name.split(' ')[0] || '📦';
            const cleanName = caseItem.name.replace(emoji, '').trim();

            card.innerHTML = `
                <div class="case-emoji">${emoji}</div>
                <div class="case-name">${cleanName}</div>
                <div class="case-price-block ${isHH ? 'discounted' : ''}">
                    ${priceHtml}
                </div>
            `;
            
            card.onclick = () => openModal(caseItem);
            casesGrid.appendChild(card);
        });
    }

    function renderHistory() {
        if (!appData.history || appData.history.length === 0) {
            historyList.innerHTML = '<div style="text-align:center; color:#666;">Пока нет игр...</div>';
            return;
        }

        historyList.innerHTML = '';
        appData.history.forEach(item => {
            const row = document.createElement('div');
            // Определяем класс: win или loss
            const statusClass = item.is_win ? 'win' : 'loss';
            const sign = item.is_win ? '+' : '';
            // Первая буква имени для аватарки
            const avatarChar = item.name.charAt(0).toUpperCase();
            
            row.className = `history-card ${statusClass}`;
            row.innerHTML = `
                <div class="h-avatar">${avatarChar}</div>
                <div class="h-info">
                    <span class="h-name">${item.name}</span>
                    <span class="h-game">${item.game}</span>
                </div>
                <div class="h-amount">${sign}${item.amount.toLocaleString()}</div>
            `;
            historyList.appendChild(row);
        });
    }

    // 3. Таймер Happy Hour
    function startTimer() {
        if (hhInterval) clearInterval(hhInterval);
        
        function update() {
            const now = Date.now() / 1000; // текущий timestamp в секундах
            const hh = appData.happy_hour;
            
            if (hh.active) {
                // Если сейчас идет HH, считаем сколько осталось до конца
                hhBanner.classList.add('active');
                const left = hh.end_timestamp - now;
                
                if (left <= 0) {
                    hhTimer.innerText = "Обновите страницу";
                    return;
                }
                
                const mins = Math.floor(left / 60);
                const secs = Math.floor(left % 60);
                hhTimer.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
                
            } else {
                // Если HH нет, считаем сколько до начала
                hhBanner.classList.remove('active');
                
                if (hh.start_timestamp) {
                    const left = hh.start_timestamp - now;
                    if (left > 0) {
                         const hours = Math.floor(left / 3600);
                         const mins = Math.floor((left % 3600) / 60);
                         hhTimer.innerText = `Через ${hours}ч ${mins}м`;
                    } else {
                         hhTimer.innerText = "Скоро...";
                    }
                } else {
                    hhTimer.innerText = "Ждите анонса";
                }
            }
        }
        
        update();
        hhInterval = setInterval(update, 1000);
    }

    // 4. Модальное окно
    window.openModal = function(caseData) {
        const overlay = document.getElementById('modal-overlay');
        const list = document.getElementById('modal-list');
        const title = document.getElementById('modal-title');
        
        title.innerText = caseData.name;
        list.innerHTML = '';
        
        caseData.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';
            
            const price = item.price > 0 ? `~${item.price.toLocaleString()} 💰` : 'Бесценно';
            const chanceStr = item.chance < 0.01 ? '<0.01%' : `${item.chance}%`;
            
            row.innerHTML = `
                <div class="item-icon">${item.emoji}</div>
                <div class="item-details">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${price}</span>
                </div>
                <div class="item-chance ${item.rarity}">${chanceStr}</div>
            `;
            list.appendChild(row);
        });
        
        overlay.classList.add('open');
    }

    window.closeModal = function() {
        document.getElementById('modal-overlay').classList.remove('open');
    }

    // Close on click outside
    document.getElementById('modal-overlay').onclick = function(e) {
        if (e.target === this) closeModal();
    }
    
    // Telegram WebApp setup
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.ready();
    }

    // Start
    loadData();
<<<<<<< HEAD
});
=======
});
>>>>>>> 9cd03372f1983aa491a9904e5b40ad75882afcf8
