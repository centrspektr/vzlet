/* СПЕКТР - "Путь новичка": модули по шагам для Взлёта и ИИ-студии.
   Подключение на сайте кружка (вкладка с data-t="put" и блок #t-put):
     <script src="put.js" data-site="vzlet" defer></script>
   Взлёт: модули 1-6 = тесты сайта (QUIZ, ACAD.A.best), доступ к тестам по-прежнему открывает тренер.
   Студия: свои проверки, 5 очков за верный ответ (лучшая попытка) добавляются в SPK_PROGRESS. */
(function () {
  'use strict';
  var me = document.currentScript, SITE = (me && me.getAttribute('data-site')) || 'vzlet';
  var KEY = 'put_' + SITE, RED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  var P = store.get(); P.q = P.q || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- тексты модулей ---------- */
  var WELCOME_Q = [
    ['Где твой личный код?', ['Во вкладке "Рейтинг"', 'В настройках телефона', 'У друга']],
    ['За что дают очки?', SITE === 'vzlet' ? ['За тесты, шпаргалки, тренажёры и задания тренера', 'Только за вход на сайт', 'Ни за что'] : ['За уроки, аккорды, игры и проверки', 'Только за вход на сайт', 'Ни за что']],
    ['Что видно другим в рейтинге?', ['Имя и класс', 'Имя, фамилия и телефон', 'Твой код']]
  ];
  var VZ = [
    { t: 'Добро пожаловать во Взлёт', e: '👋',
      why: 'Ты в клубе пилотов. За 5 минут разберёмся, где что лежит и как зарабатывать очки.',
      main: ['Во вкладке "Рейтинг" твой код. Введи его один раз, и все очки будут попадать в рейтинг клуба. Код не показывай другим.',
        'Очки дают за тесты, шпаргалки, тренажёры и задания тренера. Чем больше очков, тем выше уровень: от Курсанта до Аса.',
        'Значки дают за особые успехи, например тест без ошибок. Они во вкладке "Значки".',
        'В рейтинге видны только имя и класс.',
        'Не получилось с первого раза - не беда: тест можно пересдать, засчитывается лучший результат.'],
      go: [['📖 Словарь пилота', { tab: 'learn', click: '.ch[data-id="dict"]>button' }]],
      quiz: WELCOME_Q, pass: 2,
      task: 'Познакомься с группой и тренером, вступи в группу Взлёта в MAX.' },
    { t: 'Первый взлёт', e: '🐣', test: 'novice',
      why: 'Прежде чем взять пульт, узнаем, как дрон слушается стиков.',
      main: ['FPV - полёт от первого лица: ты видишь то, что видит камера дрона.',
        'У нас режим Mode 2: левый стик - газ и поворот, правый - наклоны вперёд-назад (тангаж) и влево-вправо (крен).',
        'Режим Angle сам выравнивает дрон, с него начинают. Acro - для опытных: дрон держит наклон, пока ты его не вернёшь.',
        'Арминг - разблокировка моторов, дизарм - блокировка. Дизарм - самая важная кнопка пилота.',
        'Failsafe - что дрон сделает, если потеряет сигнал пульта.'],
      go: [['🕹 Стики (Mode 2)', { tab: 'learn', click: '.ch[data-id="sticks"]>button' }], ['🎛 Режимы полёта', { tab: 'learn', click: '.ch[data-id="modes"]>button' }], ['🎮 Тренажёр стиков: 10 огней', { tab: 'learn', sel: '.trn' }]],
      task: 'Сделай предполётную проверку вслух вместе с тренером.' },
    { t: 'Безопасность', e: '🛡', test: 'safe',
      why: 'Пропеллер крутится десятки тысяч раз в минуту. Хороший пилот сначала безопасный, потом быстрый.',
      main: ['Летаем только в огороженной зоне, люди за сеткой или линией. Над людьми не летаем никогда.',
        'Команду на запуск даёт тренер или судья.',
        'Дрон упал, пропало видео, что-то пошло не так - сначала дизарм, потом всё остальное.',
        'К заармленному дрону не подходим и не ловим его руками.',
        'Рядом с пилотом в очках всегда наблюдатель: он следит за дроном и людьми.'],
      go: [['🛡 Правила безопасности', { tab: 'learn', click: '.ch[data-id="rules"]>button' }], ['✅ Чек-лист перед полётом', { tab: 'learn', click: '.ch[data-id="check"]>button' }], ['🎮 Предполётная проверка', { tab: 'train', text: 'Предполётная проверка' }]],
      task: 'Назови тренеру 5 правил безопасности и покажи дизарм на пульте.' },
    { t: 'Устройство дрона', e: '⚙️', test: 'tech',
      why: 'Пилот, который знает свой дрон, сам находит поломку и чинит её.',
      main: ['Полётный контроллер (FC) - "мозг": стабилизирует дрон и выполняет команды.',
        'Регулятор (ESC) крутит моторы, в стеке он снизу, FC сверху.',
        'Камера спереди, видеопередатчик (VTX) шлёт картинку в очки, приёмник (RX) ловит команды пульта.',
        'Соседние моторы крутятся в разные стороны, иначе дрон закрутится.',
        'Рама из карбона: лёгкая и прочная. Цифры мотора 2306 - размер статора в мм.'],
      go: [['🌀 Пропеллеры и моторы', { tab: 'learn', click: '.ch[data-id="props"]>button' }], ['📡 Видео и частоты', { tab: 'learn', click: '.ch[data-id="video"]>button' }], ['🔧 Собери дрон', { tab: 'train', text: 'Собери дрон' }]],
      task: 'Покажи тренеру все детали на настоящем дроне.' },
    { t: 'Аккумуляторы', e: '🔋', test: 'akb',
      why: 'Аккумулятор - сердце дрона и самая опасная его часть, если обращаться с ним неправильно.',
      main: ['Аккумулятор собран из банок. 4S - четыре банки, полный заряд 16,8 В (по 4,2 В на банку).',
        'LiHV заряжается до 4,35 В на банку, на зарядке выбираем свой режим для LiHV и для LiPo.',
        'Храним при 3,8 В на банку. Ниже 3,0-3,2 В аккумулятор может испортиться.',
        'мАч - сколько энергии внутри, буква C - какой ток он может отдать. Заряжаем током 1C.',
        'Вздулся, помят или греется после удара - не заряжаем, откладываем в безопасное место и показываем тренеру.'],
      go: [['🔋 Аккумуляторы LiPo', { tab: 'learn', click: '.ch[data-id="lipo"]>button' }], ['🎮 Подбери аккумулятор', { tab: 'train', text: 'Аккумуляторы' }], ['🧮 Напряжение пачки', { tab: 'calc', sel: '[data-c="lipo"]' }], ['🧮 Ток зарядки', { tab: 'calc', sel: '[data-c="charge"]' }]],
      task: 'Проверь тестером напряжение каждой банки и скажи, можно ли на этом аккумуляторе летать.' },
    { t: 'Пилот', e: '🚁', test: 'pilot',
      why: 'Теперь ты знаешь дрон. Пора набирать часы в симуляторе и летать трассы.',
      main: ['Симулятор - лучший способ научиться: аварии бесплатные. У нас Квадросим и Ворон.',
        'Полетай в Acro: так летают на соревнованиях.',
        'OSD - цифры поверх видео: напряжение и таймер. Следи за ними в полёте.',
        'Видео идёт на 5,8 ГГц. На трассе у каждого пилота свой канал.',
        'Пропеллер 5x4.3x3: диаметр, шаг и число лопастей. Перепутал направление - дрон перевернётся на взлёте.'],
      go: [['🎮 Тренажёр быстрее 30 секунд', { tab: 'learn', sel: '.trn' }], ['🏁 Рейтинг пилотов по трассам', { tab: 'club', sel: 'details[data-tab="Пилоты"]' }]],
      task: 'Пролети в симуляторе 3 круга подряд без аварий на трассе, которую выберет тренер.' },
    { t: 'Ас', e: '🏆', test: 'ace',
      why: 'То, что отличает спортсмена от любителя: настройки, трюки и тактика на трассе.',
      main: ['PID - алгоритм, которым полётный контроллер держит дрон ровно.',
        'Air mode сохраняет управление при нулевом газе, propwash - тряска в собственном потоке воздуха.',
        'Тяговооружённость 4:1 - моторы тянут в 4 раза больше веса дрона.',
        'Для 4 пилотов берут каналы R1, R2, R7, R8: чем дальше по частоте, тем меньше помех.',
        'Split-S - полубочка и полупетля вниз с разворотом.'],
      go: [['🌪 Трюки фристайла', { tab: 'learn', click: '.ch[data-id="tricks"]>button' }], ['📏 Классы дронов', { tab: 'learn', click: '.ch[data-id="classes"]>button' }], ['🧮 Тяговооружённость', { tab: 'calc', sel: '[data-c="twr"]' }], ['🧮 Частоты Raceband', { tab: 'calc', sel: '[data-c="vtx"]' }]],
      task: 'Побей время тренера на его трассе в симуляторе.' }
  ];
  var ST = [
    { t: 'Добро пожаловать в студию', e: '👋',
      why: 'Здесь учатся играть на гитаре и делать музыку вместе с нейросетью. За 5 минут разберёмся, где что лежит.',
      main: ['Во вкладке "Рейтинг" твой код. Введи его один раз, и очки будут попадать в рейтинг студии. Код не показывай другим.',
        'Уроки идут по порядку, в каждом есть "Надо выучить": отмечай, что получилось, и получай очки.',
        'Тюнер и метроном всегда под рукой, в своих вкладках.',
        'В рейтинге видны только имя и класс.',
        'Не получилось с первого раза - не беда, пальцы привыкают неделю-две. Проверку можно пересдать.'],
      go: [['📚 Первый урок', { tab: 'les' }]],
      quiz: WELCOME_Q, pass: 2,
      task: 'Познакомься с группой, вступи в группу студии в MAX.' },
    { t: 'Гитара в руках', e: '🎸',
      why: 'Правильная посадка и настроенная гитара - половина красивого звука.',
      main: ['Спина прямая, плечи свободные, гитара выемкой на правой ноге, гриф смотрит чуть вверх.',
        '1-я струна самая тонкая, 6-я самая толстая.',
        'Строй от 6-й к 1-й: ми, ля, ре, соль, си, ми (E A D G B E).',
        'Тюнер слышит струну и подсказывает: звучит ниже - подтяни колок, выше - отпусти.',
        'Первый аккорд Em: всего два пальца на 2-м ладу.'],
      go: [['📚 Урок "Знакомство и первый бой"', { tab: 'les' }], ['🎯 Тюнер: настрой 6 струн', { tab: 'tuner' }]],
      quiz: [
        ['Какая струна 1-я?', ['Самая тонкая', 'Самая толстая', 'Средняя']],
        ['Как звучит 6-я струна в обычном строе?', ['Ми (E)', 'Ля (A)', 'Соль (G)']],
        ['Тюнер показал, что струна звучит ниже нужной ноты. Что делаешь?', ['Подтягиваю колок', 'Отпускаю колок', 'Играю так']],
        ['Сколько пальцев нужно для Em?', ['Два', 'Три', 'Четыре']],
        ['Как держать спину?', ['Прямо, плечи свободные', 'Сгорбиться над грифом', 'Откинуться назад']]],
      task: 'Настрой гитару по тюнеру и сыграй бой вниз на Em под метроном 60.' },
    { t: 'Ритм', e: '🥁',
      why: 'Песню узнают по ритму. Ровный ритм важнее быстрой игры.',
      main: ['Метроном стучит ровные доли. Темп 60 - один удар в секунду.',
        'В большинстве песен в такте 4 доли, в вальсе 3.',
        'Бой - удары по всем струнам вниз и вверх. Перебор - струны по одной, например Б-3-2-1.',
        'Буква Б в схеме - бас, самая низкая струна аккорда (у Am - 5-я, у Em - 6-я).',
        'Учим медленно, потом прибавляем темп.'],
      go: [['📚 Уроки: шестёрка и четвёрка', { tab: 'les' }], ['⏱ Метроном', { tab: 'metro' }], ['🎮 Игра "Ритм-бой"', { tab: 'games', text: 'Ритм-бой' }]],
      quiz: [
        ['Темп 60 - это…', ['Один удар в секунду', '60 ударов в секунду', 'Громкость']],
        ['Сколько долей в такте вальса?', ['3', '4', '6']],
        ['Чем перебор отличается от боя?', ['Струны играются по одной', 'Играется громче', 'Ничем']],
        ['Что значит Б в схеме Б-3-2-1?', ['Бас, низкая струна аккорда', 'Быстро', 'Большой палец']],
        ['Не получается ровно. Что делать?', ['Замедлить темп на метрономе', 'Играть быстрее', 'Бросить']]],
      task: 'Сыграй шестёркой Em и Am под метроном без остановки.' },
    { t: 'Аккорды', e: '🎼',
      why: 'Зная 5-6 аккордов, можно сыграть сотни песен.',
      main: ['В схеме аккорда цифра в кружке - номер пальца, x - струна не звучит, 0 - открытая струна.',
        'Буква m в названии - минор, звучит грустнее. Без m - мажор, звучит светлее.',
        'Первая песенная связка: Am - Dm - E - Am.',
        'Пальцы ставим ближе к ладовой порожке, тогда нет дребезга.',
        'Смена аккордов тренируется отдельно: цель - 20 смен в минуту.'],
      go: [['📚 Урок "Аккорды Am, Dm, E"', { tab: 'les' }], ['🎸 Аккорды и тренажёр смены', { tab: 'chords' }], ['🎮 Игра "Угадай на слух"', { tab: 'games', text: 'Угадай на слух' }]],
      quiz: [
        ['Что значит x на струне в схеме?', ['Струна не звучит', 'Зажать всеми пальцами', 'Играть громче']],
        ['Что значит 0?', ['Открытая струна, звучит без пальца', 'Не играть', 'Нулевой палец']],
        ['Как звучит Am?', ['Минор, грустнее', 'Мажор, светлее', 'Никак не звучит']],
        ['Аккорд дребезжит. Что попробовать?', ['Поставить пальцы ближе к ладовой порожке', 'Играть громче', 'Сменить гитару']],
        ['Какой аккорд заканчивает связку Am - Dm - E - …?', ['Am', 'G', 'C']]],
      task: 'Сыграй Am - Dm - E - Am шестёркой, по 2 такта на аккорд, без остановки.' },
    { t: 'Что такое ИИ', e: '🤖',
      why: 'Нейросеть - сильный помощник, если понимать, как она работает и где ошибается.',
      main: ['Нейросеть училась на огромном числе примеров и собирает ответ по похожести. Она не думает как человек.',
        'Промпт - твоё задание для нейросети. Чем точнее описание, тем лучше результат.',
        'ИИ может уверенно ошибаться, важное проверяем.',
        'Не пишем в нейросеть личное: адрес, телефон, пароли, данные друзей.',
        'Автор - ты. Нейросеть помогает, а идея и выбор за тобой.'],
      go: [['🎛 Конструктор промпта', { tab: 'ai', text: 'Конструктор промпта' }]],
      quiz: [
        ['Что такое промпт?', ['Задание-описание для нейросети', 'Программа для гитары', 'Пароль от сайта']],
        ['Как нейросеть научилась отвечать?', ['На огромном числе примеров', 'Она всё знает с рождения', 'За неё отвечает человек']],
        ['Может ли ИИ ошибиться?', ['Да, и даже уверенно, поэтому проверяем', 'Никогда', 'Только ночью']],
        ['Что нельзя писать в нейросеть?', ['Свой адрес, телефон и пароли', 'Настроение песни', 'Название инструмента']],
        ['Какой промпт даст результат ближе к задумке?', ['"Спокойная акустическая песня, гитара перебором, медленный темп"', '"Сделай песню"', '"Музыка"']]],
      task: 'Покажи педагогу свой промпт из конструктора и объясни, почему выбрал именно так.' },
    { t: 'Музыка с ИИ', e: '🎧',
      why: 'Собираем песню по частям: аккорды, структура, текст и звук.',
      main: ['У песни есть структура: вступление, куплет, припев, иногда бридж. Припев повторяется и запоминается.',
        'Аккорды задают настроение: генератор аккордов подбирает связку под настроение.',
        'Стиль для музыкальной нейросети описываем по-английски, а текст песни пишем сами по-русски.',
        'Не загружаем в нейросеть чужие песни и не подделываем голоса известных артистов.',
        'Перед публикацией читаем правила сервиса: права на трек зависят от них.'],
      go: [['🎹 Генератор аккордов', { tab: 'ai', text: 'Генератор аккордов' }], ['🧱 Структура песни', { tab: 'ai', text: 'Структура песни' }]],
      quiz: [
        ['Какая часть песни повторяется и запоминается?', ['Припев', 'Вступление', 'Конец']],
        ['На каком языке лучше описывать стиль для музыкальной нейросети?', ['По-английски', 'Любыми смайликами', 'Не описывать']],
        ['Кто пишет текст песни?', ['Я сам', 'Только нейросеть', 'Берём чужой']],
        ['Можно ли сделать трек голосом известного певца?', ['Нет, это нарушает права', 'Да, если похоже', 'Да, если для друзей']],
        ['Что задаёт настроение песни?', ['Аккорды и темп', 'Название файла', 'Громкость телефона']]],
      task: 'Возьми связку из генератора, придумай на неё 4 строчки припева и сыграй педагогу.' },
    { t: 'Свой трек', e: '🌟', final: true,
      why: 'Итог пути: твоя песня, сыгранная на гитаре, и её версия, сделанная с нейросетью.',
      main: ['Идея: о чём песня и какое у неё настроение.',
        'Аккорды и бой или перебор, которые ты уже умеешь.',
        'Свой текст: куплет и припев.',
        'Промпт для нейросети: стиль, инструменты, темп.',
        'Сравни свою игру и версию нейросети и реши, что оставить.'],
      go: [['🤖 Вкладка ИИ', { tab: 'ai' }], ['🎸 Мои аккорды', { tab: 'chords' }]],
      pass: 6,
      task: 'Сыграй свою песню группе и покажи версию, сделанную с нейросетью.' }
  ];
  var MODS = SITE === 'studio' ? ST : VZ;
  if (SITE === 'studio') { var all = []; ST.slice(1, 6).forEach(function (m) { all = all.concat(m.quiz); }); ST[6].pool = all; }

  /* ---------- состояние ---------- */
  function acad() { return window.ACAD && window.ACAD.A ? window.ACAD.A : null; }
  function vzBest(k) { var A = acad(); return A && A.best && A.best[k] != null ? A.best[k] : null; }
  function done(i) {
    var m = MODS[i];
    if (m.test) return (vzBest(m.test) || 0) >= 8;
    if (i === 0 && SITE === 'vzlet') { var A = acad(); if (A && A.best && Object.keys(A.best).length) return true; }
    var b = P.q[i]; return b != null && b >= (m.pass || 4);
  }
  function open(i) { return i === 0 || done(i - 1); }
  function testAcc(m, i) { if (!m.test) return 1; if (typeof MODE !== 'undefined' && MODE === 'coach') return 2; try { return window.vzAcc ? window.vzAcc(m.test, i - 1) : (i === 1 ? 1 : 0); } catch (e) { return 0; } }
  function connected() { try { var s = JSON.parse(localStorage.getItem('spk_' + SITE) || 'null'); return s && s.status || ''; } catch (e) { return ''; } }

  if (SITE === 'studio') {
    var base = window.SPK_PROGRESS;
    window.SPK_PROGRESS = function (c) {
      var r = base ? base(c) : { p: 0, b: 0, l: '' }, add = 0;
      for (var i = 1; i < ST.length; i++) add += (P.q[i] || 0) * 5;
      r = Object.assign({}, r); r.p = (r.p || 0) + add; return r;
    };
    var baseR = window.SPK_RESET;
    window.SPK_RESET = function (c) { P = { q: {} }; store.set(P); if (baseR) baseR(c); render(); };
  }

  /* ---------- переходы на инструменты сайта ---------- */
  function go(a) {
    var nav = document.querySelector('[data-t="' + a.tab + '"]');
    if (nav) nav.click();
    setTimeout(function () {
      var el = null;
      if (a.click) el = $(a.click);
      else if (a.sel) el = $(a.sel);
      else if (a.text) {
        var root = $('#t-' + a.tab) || document;
        el = $$('h3,h4,summary,b', root).filter(function (h) { return h.textContent.indexOf(a.text) >= 0 && h.getClientRects().length; })[0] || null;
        if (el) el = el.closest('.card,details,section') || el;
      }
      if (a.click && el) { var ch = el.parentElement; if (!ch || !ch.classList.contains('open')) el.click(); el = ch || el; }
      if (el) { el.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'center' }); flash(el); }
    }, 380);
  }
  function flash(el) {
    if (!el.animate || RED) return;
    el.animate([{ boxShadow: '0 0 0 0 rgba(var(--pn-rgb),.0)' }, { boxShadow: '0 0 0 6px rgba(var(--pn-rgb),.55)' }, { boxShadow: '0 0 0 0 rgba(var(--pn-rgb),0)' }], { duration: 1400, delay: 350, easing: 'ease-in-out' });
  }
  function goTest(k) {
    var nav = document.querySelector('[data-t="quiz"]'); if (nav) nav.click();
    setTimeout(function () { var b = $('.ql[data-k="' + k + '"]'); if (b) { b.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'center' }); setTimeout(function () { b.click(); }, RED ? 0 : 450); } }, 380);
  }

  /* ---------- стили ---------- */
  var ACC = SITE === 'studio' ? ['#f472b6', '#facc15', '244,114,182'] : ['#00d4ff', '#a78bfa', '0,212,255'];
  var css = document.createElement('style');
  css.textContent = '' +
    '#t-put{--pn-a:' + ACC[0] + ';--pn-b:' + ACC[1] + ';--pn-rgb:' + ACC[2] + '}' +
    '.pn{display:grid;gap:14px;max-width:820px;margin:0 auto;padding:4px 0 24px}' +
    '.pn-hd{position:relative;border:1px solid rgba(127,127,160,.28);background:rgba(12,13,30,.86);border-radius:22px;padding:18px;overflow:hidden}' +
    '.pn-hd:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--pn-a),var(--pn-b))}' +
    '.pn-hd h3{margin:0 0 4px;font-size:20px} .pn-hd p{margin:0 0 12px;opacity:.82;font-size:14.5px;line-height:1.5}' +
    '.pn-bar{height:10px;border-radius:99px;background:rgba(127,127,160,.2);overflow:hidden}' +
    '.pn-bar i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--pn-a),var(--pn-b));transition:width 1s cubic-bezier(.2,.8,.2,1)}' +
    '.pn-cnt{display:flex;justify-content:space-between;font-size:13px;font-weight:700;opacity:.8;margin-top:6px}' +
    '.pn-con{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;padding:10px 12px;border-radius:14px;background:rgba(var(--pn-rgb),.1);border:1px dashed rgba(var(--pn-rgb),.45);font-size:14px;line-height:1.4}' +
    '.pn-con span{flex:1 1 200px}' +
    '.pn-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:0 16px;border-radius:13px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.12);color:inherit;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer;text-decoration:none;transition:transform .15s,background .2s;-webkit-tap-highlight-color:transparent}' +
    '.pn-btn:active{transform:scale(.96)} .pn-btn.pri{background:linear-gradient(135deg,var(--pn-a),var(--pn-b));color:#0b0b18;border:none}' +
    '.pn-btn[disabled]{opacity:.5;cursor:default}' +
    '.pn-road{position:relative;display:grid;gap:12px;padding-left:30px}' +
    '.pn-road:before{content:"";position:absolute;left:13px;top:18px;bottom:18px;width:3px;border-radius:3px;background:linear-gradient(var(--pn-a),var(--pn-b));opacity:.35}' +
    '.pn-m{position:relative;scroll-margin-top:210px;border:1px solid rgba(127,127,160,.26);background:rgba(12,13,30,.86);border-radius:18px;animation:pnIn .55s cubic-bezier(.2,.8,.2,1) both}' +
    '.pn-m.cur{border-color:rgba(var(--pn-rgb),.6);background:linear-gradient(rgba(var(--pn-rgb),.1),rgba(var(--pn-rgb),.1)),rgba(12,13,30,.82);box-shadow:0 10px 30px -14px rgba(var(--pn-rgb),.7)}' +
    '.pn-m.lock{opacity:.6}' +
    '.pn-dot{position:absolute;left:-30px;top:14px;width:29px;height:29px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;font-family:inherit;background:#1b1b2e;border:2px solid rgba(127,127,160,.5);color:#fff;z-index:1}' +
    '.pn-m.ok .pn-dot{background:linear-gradient(135deg,#22c55e,#16a34a);border-color:transparent}' +
    '.pn-m.cur .pn-dot{background:linear-gradient(135deg,var(--pn-a),var(--pn-b));border-color:transparent;color:#0b0b18;animation:pnPulse 2.2s ease-out infinite}' +
    '.pn-h{display:flex;gap:12px;align-items:center;width:100%;padding:14px 16px;border:0;background:none;color:inherit;text-align:left;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}' +
    '.pn-h .e{font-size:26px;line-height:1;flex:none} .pn-h b{display:block;font-size:16.5px} .pn-h small{display:block;font-size:12.5px;opacity:.72;margin-top:2px}' +
    '.pn-h .ar{margin-left:auto;opacity:.6;transition:transform .35s;flex:none} .pn-m.open .pn-h .ar{transform:rotate(90deg)}' +
    '.pn-b{display:none;padding:0 16px 16px} .pn-m.open .pn-b{display:block;animation:pnOpen .45s cubic-bezier(.2,.8,.2,1)}' +
    '.pn-why{font-size:15px;line-height:1.5;margin:0 0 12px;font-weight:600}' +
    '.pn-s{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.65;margin:14px 0 8px}' +
    '.pn-main{margin:0;padding:0;list-style:none;display:grid;gap:7px}' +
    '.pn-main li{position:relative;padding:9px 12px 9px 34px;border-radius:12px;background:rgba(127,127,160,.08);font-size:14.5px;line-height:1.45;animation:pnIn .45s cubic-bezier(.2,.8,.2,1) both}' +
    '.pn-main li:before{content:"";position:absolute;left:13px;top:15px;width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--pn-a),var(--pn-b))}' +
    '.pn-go{display:flex;gap:8px;flex-wrap:wrap}' +
    '.pn-task{padding:11px 13px;border-radius:13px;border-left:4px solid var(--pn-b);background:rgba(127,127,160,.08);font-size:14.5px;line-height:1.45}' +
    '.pn-res{font-size:13px;font-weight:700;opacity:.85;margin-left:4px}' +
    '.pn-q{margin-top:6px;padding:14px;border-radius:16px;background:rgba(0,0,0,.18);border:1px solid rgba(127,127,160,.25)}' +
    '.pn-q .top{display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;opacity:.75;margin-bottom:8px}' +
    '.pn-q .pr{height:5px;border-radius:9px;background:rgba(127,127,160,.2);margin-bottom:12px;overflow:hidden} .pn-q .pr i{display:block;height:100%;background:linear-gradient(90deg,var(--pn-a),var(--pn-b));transition:width .4s}' +
    '.pn-q .qq{font-size:16px;font-weight:700;line-height:1.4;margin-bottom:10px}' +
    '.pn-q .qa{display:grid;gap:8px}' +
    '.pn-q .qa button{text-align:left;min-height:46px;padding:10px 14px;border-radius:13px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.1);color:inherit;font-weight:600;font-size:14.5px;font-family:inherit;cursor:pointer;transition:background .2s,border-color .2s,transform .15s}' +
    '.pn-q .qa button:active{transform:scale(.98)}' +
    '.pn-q .qa button.y{background:rgba(34,197,94,.22);border-color:#22c55e} .pn-q .qa button.n{background:rgba(248,113,113,.2);border-color:#f87171}' +
    '.pn-q .end{text-align:center;padding:6px 0} .pn-q .end b{display:block;font-size:30px;margin:4px 0}' +
    '@keyframes pnIn{from{opacity:0;transform:translateY(12px)}}' +
    '@keyframes pnOpen{from{opacity:0;transform:translateY(-6px)}}' +
    '@keyframes pnPulse{0%{box-shadow:0 0 0 0 rgba(var(--pn-rgb),.55)}70%{box-shadow:0 0 0 10px rgba(var(--pn-rgb),0)}100%{box-shadow:0 0 0 0 rgba(var(--pn-rgb),0)}}' +
    '@media (max-width:520px){.pn-road{padding-left:26px}.pn-dot{left:-26px;width:25px;height:25px;font-size:12px}.pn-road:before{left:11px}.pn-h{padding:13px}.pn-b{padding:0 13px 14px}}' +
    '@media (prefers-reduced-motion:reduce){.pn *{animation:none !important;transition:none !important}}';
  document.head.appendChild(css);

  /* ---------- отрисовка ---------- */
  var box = null, OPEN = null;
  function cur() { for (var i = 0; i < MODS.length; i++) if (!done(i)) return open(i) ? i : -1; return -1; }
  function status(i) {
    var m = MODS[i];
    if (done(i)) return '✓ пройден' + (m.test && vzBest(m.test) != null ? ' · тест ' + vzBest(m.test) + '/10' : P.q[i] != null ? ' · ' + P.q[i] + ' из ' + qn(m) : '');
    if (!open(i)) return '🔒 откроется после модуля ' + (i - 1);
    if (m.test && testAcc(m, i) < 1) return 'материалы открыты · тест откроет тренер';
    return 'открыт · ' + (i === 0 ? '5 минут' : 'материалы, ' + (m.test ? 'тест' : 'проверка') + ', задание');
  }
  function qn(m) { return m.final ? 8 : (m.quiz ? m.quiz.length : 10); }
  function render() {
    box = box || $('#t-put'); if (!box) return;
    var n = 0; MODS.forEach(function (m, i) { if (done(i)) n++; });
    var c = cur(); if (OPEN == null) OPEN = c < 0 ? -1 : c;
    var con = connected(), conH = '';
    if (con !== 'принят') conH = '<div class="pn-con"><span>' + (con === 'заявка' ? '⏳ Ждём, когда педагог подтвердит подключение. Модули уже можно проходить, очки сохранятся.' : '👋 Подключись к группе, чтобы очки шли в рейтинг. Модули можно проходить и сейчас.') + '</span>' +
      (con === 'заявка' ? '' : '<button class="pn-btn pri" data-pn="con">👋 Подключиться</button>') + '</div>';
    var h = '<div class="pn"><div class="pn-hd">' + (SITE === 'studio' ? '<h3>🧭 Путь новичка</h3><p>Семь шагов от первого аккорда до своего трека с нейросетью. Каждый шаг: главное коротко, тренировка, проверка и задание на занятии.</p>' : '<p>Каждый шаг: главное коротко, тренировка, тест и задание на занятии.</p>') +
      '<div class="pn-bar"><i style="width:0"></i></div><div class="pn-cnt"><span>Пройдено ' + n + ' из ' + MODS.length + '</span><span>' + (n === MODS.length ? '🏆 Путь пройден!' : '') + '</span></div>' + conH + '</div><div class="pn-road">';
    MODS.forEach(function (m, i) {
      var ok = done(i), op = open(i), cls = ok ? 'ok' : !op ? 'lock' : i === c ? 'cur' : '';
      h += '<div class="pn-m ' + cls + (OPEN === i ? ' open' : '') + '" data-i="' + i + '" style="animation-delay:' + (i * 60) + 'ms"><span class="pn-dot">' + (ok ? '✓' : i) + '</span>' +
        '<button class="pn-h" data-pn="tog"><span class="e">' + (op ? m.e : '🔒') + '</span><span><b>' + (i === 0 ? 'Старт. ' : 'Модуль ' + i + '. ') + m.t + '</b><small>' + status(i) + '</small></span><span class="ar">›</span></button>' +
        '<div class="pn-b">' + (op ? body(m, i) : '<p class="pn-why">Сначала пройди модуль ' + (i - 1) + ' - и этот откроется.</p>') + '</div></div>';
    });
    h += '</div></div>';
    box.innerHTML = h;
    var bar = $('.pn-bar i', box); requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = (n / MODS.length * 100) + '%'; }); });
  }
  function body(m, i) {
    var acc = testAcc(m, i), h = '<p class="pn-why">' + m.why + '</p><div class="pn-s">Главное</div><ul class="pn-main">' +
      m.main.map(function (t, j) { return '<li style="animation-delay:' + (j * 50) + 'ms">' + t + '</li>'; }).join('') + '</ul>';
    if (m.go && m.go.length) h += '<div class="pn-s">Посмотри и потренируйся</div><div class="pn-go">' + m.go.map(function (g, j) { return '<button class="pn-btn" data-pn="go" data-g="' + j + '">' + g[0] + '</button>'; }).join('') + '</div>';
    h += '<div class="pn-s">Проверь себя' + (i === 0 ? ' (без очков)' : '') + '</div>';
    if (m.test) {
      var b = vzBest(m.test);
      h += '<div class="pn-go"><button class="pn-btn pri" data-pn="test"' + (acc < 1 ? ' disabled' : '') + '>' + (acc < 1 ? '🔒 Тест откроет тренер' : (b != null ? '↻ Тест ещё раз' : '▶ Пройти тест')) + '</button>' +
        (b != null ? '<span class="pn-res">лучший результат ' + b + '/10' + (b >= 8 ? ' ✓' : ' · нужно 8') + '</span>' : '<span class="pn-res">10 вопросов, для зачёта 8</span>') + '</div>';
    } else {
      var best = P.q[i];
      h += '<div class="pn-qw"><div class="pn-go"><button class="pn-btn pri" data-pn="quiz">' + (best != null ? '↻ Ещё раз' : '▶ Начать проверку') + '</button><span class="pn-res">' +
        (best != null ? 'лучший результат ' + best + ' из ' + qn(m) + (best >= (m.pass || 4) ? ' ✓' : ' · нужно ' + (m.pass || 4)) : qn(m) + ' вопросов' + (i ? ', ' + (m.final ? 'вперемешку из модулей 1-5, ' : '') + '5 очков за верный ответ' : '')) + '</span></div></div>';
    }
    h += '<div class="pn-s">На занятии</div><div class="pn-task">📝 ' + m.task + '</div>';
    return h;
  }

  /* ---------- проверка внутри модуля ---------- */
  function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function startQuiz(i, wrap) {
    var m = MODS[i], src = m.final ? shuf(m.pool).slice(0, 8) : m.quiz;
    var Q = { i: 0, ok: 0, list: shuf(src).map(function (x) { return { q: x[0], o: shuf(x[1].map(function (a, k) { return { a: a, ok: k === 0 }; })) }; }) };
    function step() {
      if (Q.i >= Q.list.length) return end();
      var it = Q.list[Q.i];
      wrap.innerHTML = '<div class="pn-q"><div class="top"><span>Вопрос ' + (Q.i + 1) + ' из ' + Q.list.length + '</span><span>✔ ' + Q.ok + '</span></div><div class="pr"><i style="width:' + (Q.i / Q.list.length * 100) + '%"></i></div>' +
        '<div class="qq">' + it.q + '</div><div class="qa">' + it.o.map(function (o, k) { return '<button data-k="' + k + '">' + o.a + '</button>'; }).join('') + '</div></div>';
      $$('.qa button', wrap).forEach(function (b) {
        b.onclick = function () {
          var o = it.o[+b.dataset.k]; $$('.qa button', wrap).forEach(function (x) { x.disabled = true; if (it.o[+x.dataset.k].ok) x.classList.add('y'); });
          if (o.ok) Q.ok++; else b.classList.add('n');
          setTimeout(function () { Q.i++; step(); }, o.ok ? 650 : 1300);
        };
      });
    }
    function end() {
      var n = Q.list.length, s = Q.ok, prev = P.q[i], was = done(i);
      if (prev == null || s > prev) P.q[i] = s; store.set(P);
      var pass = m.pass || 4, ok = s >= pass;
      if (SITE === 'studio' && window.SPK && SPK.sync) try { SPK.sync(); } catch (e) {}
      if (ok && !was) { OPEN = i; render(); wrap = $('.pn-m[data-i="' + i + '"] .pn-qw', box) || wrap; }
      wrap.innerHTML = '<div class="pn-q"><div class="end">' + (ok ? '🎉' : '💪') + '<b>' + s + ' из ' + n + '</b><p>' + (ok ? (i ? 'Зачёт! ' + (i < MODS.length - 1 ? 'Следующий модуль открыт.' : 'Путь пройден, ты молодец!') : 'Отлично, можно начинать!') : 'Нужно ' + pass + ' из ' + n + '. Перечитай "Главное" и попробуй ещё раз.') + '</p>' +
        '<div class="pn-go" style="justify-content:center"><button class="pn-btn" data-pn="quiz">↻ Ещё раз</button>' + (ok && i < MODS.length - 1 ? '<button class="pn-btn pri" data-pn="next">Дальше ›</button>' : '') + '</div></div></div>';
      if (ok && !was && typeof window.toast === 'function') try { window.toast(i ? '✓ Модуль ' + i + ' пройден' : '✓ Старт пройден'); } catch (e) {}
    }
    step();
  }

  /* ---------- нажатия ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pn]'); if (!b || !box || !box.contains(b)) return;
    var a = b.getAttribute('data-pn'), mEl = b.closest('.pn-m'), i = mEl ? +mEl.getAttribute('data-i') : -1;
    if (a === 'tog') { OPEN = OPEN === i ? -1 : i; var was = mEl.classList.contains('open'); $$('.pn-m.open', box).forEach(function (x) { x.classList.remove('open'); }); if (!was) { mEl.classList.add('open'); setTimeout(function () { var r = mEl.getBoundingClientRect(); if (r.top < 70 || r.top > innerHeight * .6) mEl.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'start' }); }, 60); } return; }
    if (a === 'go') return go(MODS[i].go[+b.getAttribute('data-g')][1]);
    if (a === 'test') return goTest(MODS[i].test);
    if (a === 'quiz') return startQuiz(i, b.closest('.pn-qw') || b.closest('.pn-q').parentElement);
    if (a === 'next') { OPEN = i + 1; render(); var n = $('.pn-m[data-i="' + (i + 1) + '"]', box); if (n) n.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'start' }); return; }
    if (a === 'con') { var r = document.querySelector('[data-t="rate"]'); if (r) r.click(); setTimeout(function () { var f = document.querySelector('[data-spk-club] [data-a="form"]'); if (f) f.click(); var c = document.querySelector('[data-spk-club]'); if (c) c.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'start' }); }, 400); }
  });
  document.addEventListener('spk-status', function () { if (box && box.offsetParent) render(); });
  /* вернулся на вкладку - обновить (тест мог быть сдан в другой вкладке сайта) */
  var nav = document.querySelector('[data-t="put"]');
  if (nav) nav.addEventListener('click', function () { OPEN = null; render(); });
  render();

  /* ---------- плашка "Бета-версия" ---------- */
  (function () {
    var at = document.getElementById('ahero') || document.querySelector('.hero');
    if (!at || document.getElementById('pnBeta')) return;
    var K = 'spk_beta_seen', seen = false;
    try { seen = localStorage.getItem(K) === '1'; } catch (e) {}
    var s = document.createElement('style');
    s.textContent = '#pnBeta{max-width:1100px;margin:10px auto;padding:0 14px;font-family:inherit}' +
      '#pnBeta .bt{width:100%;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:14px;border:1px solid rgba(168,85,247,.38);background:rgba(12,13,30,.82);color:inherit;font:inherit;font-size:13.5px;cursor:pointer;text-align:left}' +
      '#pnBeta .bt i{font-style:normal;font-weight:800;font-size:11px;letter-spacing:.06em;padding:3px 8px;border-radius:99px;background:linear-gradient(90deg,#a855f7,#22d3ee);color:#fff}' +
      '#pnBeta .bt span{flex:1;opacity:.88} #pnBeta .bt u{text-decoration:none;opacity:.7;font-size:12.5px}' +
      '#pnBeta .bx{display:none;margin-top:8px;padding:14px 16px;border-radius:16px;border:1px solid rgba(168,85,247,.3);background:rgba(12,13,30,.9);font-size:14px;line-height:1.55}' +
      '#pnBeta.o .bx{display:block;animation:pnOpen .3s ease} #pnBeta .bx p{margin:0 0 8px} #pnBeta .bx ul{margin:0 0 10px;padding-left:18px} #pnBeta .bx li{margin:3px 0}' +
      '#pnBeta .ok{min-height:40px;padding:8px 18px;border-radius:12px;border:0;background:linear-gradient(90deg,#a855f7,#22d3ee);color:#fff;font:inherit;font-weight:700;cursor:pointer}';
    document.head.appendChild(s);
    var d = document.createElement('div');
    d.id = 'pnBeta';
    if (!seen) d.className = 'o';
    /* текст плашки правится на портале (✎ Плашка БЕТА, по PIN) и хранится на общем сервере: запись "бета-плашка" */
    var DEF = { h: 'Дашборд в бета-версии: тестируем вместе', top: 'Ребята, вы первые! Дашборд ещё дорабатывается, и вы помогаете его тестировать.',
      li: ['Очки иногда могут обнуляться, а задания меняться.', 'Заявки подтверждаем быстро.',
        'У заданий курса есть кнопки 👍 и 👎. Понравилось - жми 👍, скучно или непонятно - 👎. По ним тренер правит и меняет задания.',
        'Вместе сделаем удобное место для зачётов, рейтинга, тестов, тренировок и шпаргалок.'],
      bot: 'Что-то не работает или есть идея? Жми "Нашёл ошибку?" внизу справа.' };
    var TK = 'spk_beta_txt', esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var parse = function (t) { try { var o = JSON.parse(t); if (o && o.h && Array.isArray(o.li)) return o; } catch (e) {} return null; };
    var cur = null; try { cur = parse(localStorage.getItem(TK)); } catch (e) {}
    var fill = function (o) {
      o = o || DEF;
      d.innerHTML = '<button class="bt" type="button"><i>БЕТА</i><span>' + esc(o.h) + '</span><u>Подробнее</u></button>' +
        '<div class="bx">' + (o.top ? '<p><b>' + esc(o.top) + '</b></p>' : '') + (o.li.length ? '<ul>' + o.li.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (o.bot ? '<p>' + esc(o.bot) + '</p>' : '') + '<button class="ok" type="button">Понятно</button></div>';
      d.querySelector('.bt').onclick = function () { d.classList.toggle('o'); };
      d.querySelector('.ok').onclick = function () { d.classList.remove('o'); try { localStorage.setItem(K, '1'); } catch (e) {} };
    };
    fill(cur);
    at.parentNode.insertBefore(d, at);
    var last = 0; try { last = +localStorage.getItem(TK + '_at') || 0; } catch (e) {}
    if (Date.now() - last > 3600000) try {
      try { localStorage.setItem(TK + '_at', String(Date.now())); } catch (e) {}
      fetch('https://functions.yandexcloud.net/d4e4vhndceg7scc0mh3b?hub=spectr', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
        var it = j && j.ok && j.data && (j.data.news || []).filter(function (x) { return x.date === 'бета-плашка'; })[0], o = it ? parse(it.text) : null, t = o ? JSON.stringify(o) : '';
        if (t === (cur ? JSON.stringify(cur) : '')) return;
        try { o ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) {}
        cur = o; var op = d.classList.contains('o'); fill(o); d.classList.toggle('o', op);
      }).catch(function () {});
    } catch (e) {}
  })();
})();
