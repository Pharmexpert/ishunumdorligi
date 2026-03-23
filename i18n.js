/* ==========================================
   HAYOT BOSHQARUVCHISI 2026 — i18n System
   Languages: uz (Uzbek), en (English), ru (Russian)
   ========================================== */

const TRANSLATIONS = {
    // ===== NAVIGATION =====
    'nav.dashboard': { uz: 'Dashboard', en: 'Dashboard', ru: 'Панель' },
    'nav.tasks': { uz: 'Vazifalar', en: 'Tasks', ru: 'Задачи' },
    'nav.productivity': { uz: 'Samaradorlik', en: 'Productivity', ru: 'Продуктивность' },
    'nav.finance': { uz: 'Moliya', en: 'Finance', ru: 'Финансы' },
    'nav.habits': { uz: 'Odatlar', en: 'Habits', ru: 'Привычки' },
    'nav.admin': { uz: 'Admin panel', en: 'Admin Panel', ru: 'Админ панель' },

    // ===== HEADER =====
    'header.add': { uz: "Qo'shish", en: 'Add', ru: 'Добавить' },
    'header.title.dashboard': { uz: 'Dashboard', en: 'Dashboard', ru: 'Панель управления' },
    'header.title.tasks': { uz: 'Vazifalar', en: 'Tasks', ru: 'Задачи' },
    'header.title.productivity': { uz: 'Samaradorlik', en: 'Productivity', ru: 'Продуктивность' },
    'header.title.finance': { uz: 'Moliyaviy reja', en: 'Financial Plan', ru: 'Финансовый план' },
    'header.title.habits': { uz: 'Maqsadlar va Odatlar', en: 'Goals & Habits', ru: 'Цели и привычки' },
    'header.title.drive': { uz: 'Fayl menejeri', en: 'File Manager', ru: 'Файловый менеджер' },
    'header.title.admin': { uz: 'Admin panel', en: 'Admin Panel', ru: 'Админ панель' },

    // ===== AUTH =====
    'auth.login': { uz: 'Kirish', en: 'Sign In', ru: 'Войти' },
    'auth.register': { uz: "Ro'yxatdan o'tish", en: 'Register', ru: 'Регистрация' },
    'auth.logout': { uz: 'Chiqish', en: 'Sign Out', ru: 'Выйти' },
    'auth.google': { uz: 'Google orqali kirish', en: 'Sign in with Google', ru: 'Войти через Google' },
    'auth.email': { uz: 'Email', en: 'Email', ru: 'Эл. почта' },
    'auth.password': { uz: 'Parol', en: 'Password', ru: 'Пароль' },
    'auth.confirmPassword': { uz: 'Parolni tasdiqlang', en: 'Confirm Password', ru: 'Подтвердите пароль' },
    'auth.name': { uz: 'Ism-familiya', en: 'Full Name', ru: 'ФИО' },
    'auth.department': { uz: "Bo'lim", en: 'Department', ru: 'Отдел' },
    'auth.or': { uz: 'yoki', en: 'or', ru: 'или' },
    'auth.noAccount': { uz: "Hisobingiz yo'qmi?", en: "Don't have an account?", ru: 'Нет аккаунта?' },
    'auth.hasAccount': { uz: 'Hisobingiz bormi?', en: 'Already have an account?', ru: 'Есть аккаунт?' },
    'auth.welcome': { uz: 'Xush kelibsiz!', en: 'Welcome!', ru: 'Добро пожаловать!' },
    'auth.welcomeBack': { uz: 'Qayta xush kelibsiz!', en: 'Welcome back!', ru: 'С возвращением!' },
    'auth.subtitle': { uz: 'Ish boshqaruv tizimiga kiring', en: 'Sign in to your workspace', ru: 'Войдите в рабочее пространство' },
    'auth.pendingApproval': { uz: "Sizning hisobingiz tasdiqlash kutilmoqda. Iltimos, administrator bilan bog'laning.", en: 'Your account is pending approval. Please contact the administrator.', ru: 'Ваш аккаунт ожидает одобрения. Свяжитесь с администратором.' },
    'auth.rejected': { uz: "Sizning hisobingiz rad etilgan. Iltimos, administrator bilan bog'laning.", en: 'Your account has been rejected. Please contact the administrator.', ru: 'Ваш аккаунт отклонён. Свяжитесь с администратором.' },
    'auth.passwordMismatch': { uz: 'Parollar mos kelmadi', en: 'Passwords do not match', ru: 'Пароли не совпадают' },
    'auth.fillAll': { uz: "Iltimos, barcha maydonlarni to'ldiring", en: 'Please fill in all fields', ru: 'Пожалуйста, заполните все поля' },
    'auth.registered': { uz: "Ro'yxatdan o'tdingiz! Tasdiqlash kutilmoqda.", en: 'Registered! Pending approval.', ru: 'Зарегистрированы! Ожидается одобрение.' },
    'auth.invalidCredentials': { uz: "Noto'g'ri email yoki parol", en: 'Invalid email or password', ru: 'Неверный email или пароль' },

    // ===== DASHBOARD =====
    'dash.totalTasks': { uz: 'Jami vazifalar', en: 'Total Tasks', ru: 'Всего задач' },
    'dash.completed': { uz: 'bajarildi', en: 'completed', ru: 'выполнено' },
    'dash.overdue': { uz: "muddati o'tgan", en: 'overdue', ru: 'просрочено' },
    'dash.productivity': { uz: 'Samaradorlik', en: 'Productivity', ru: 'Продуктивность' },
    'dash.todayResult': { uz: 'Bugungi natija', en: "Today's result", ru: 'Сегодняшний результат' },
    'dash.balance': { uz: 'Balans', en: 'Balance', ru: 'Баланс' },
    'dash.income': { uz: 'Daromad', en: 'Income', ru: 'Доход' },
    'dash.goals': { uz: 'Maqsadlar', en: 'Goals', ru: 'Цели' },
    'dash.goalsCount': { uz: 'ta maqsad', en: 'goals', ru: 'целей' },
    'dash.taskStatus': { uz: 'Vazifalar holati', en: 'Task Status', ru: 'Статус задач' },
    'dash.finOverview': { uz: "Moliyaviy ko'rinish", en: 'Financial Overview', ru: 'Финансовый обзор' },
    'dash.todayTasks': { uz: 'Bugungi vazifalar', en: "Today's Tasks", ru: 'Задачи на сегодня' },
    'dash.todayProd': { uz: 'Bugungi produktivlik', en: "Today's Productivity", ru: 'Продуктивность сегодня' },
    'dash.overdueTasks': { uz: "Muddati o'tgan vazifalar", en: 'Overdue Tasks', ru: 'Просроченные задачи' },
    'dash.habitsProgress': { uz: 'Odatlar progressi', en: 'Habits Progress', ru: 'Прогресс привычек' },
    'dash.noTodayTasks': { uz: "Bugungi vazifalar yo'q", en: 'No tasks for today', ru: 'Нет задач на сегодня' },
    'dash.noOverdue': { uz: "Muddati o'tgan vazifalar yo'q 🎉", en: 'No overdue tasks 🎉', ru: 'Нет просроченных задач 🎉' },
    'dash.todayProdLevel': { uz: 'Bugungi produktivlik darajasi', en: "Today's productivity level", ru: 'Уровень продуктивности сегодня' },
    'dash.teamStats': { uz: "Jamoa statistikasi", en: 'Team Statistics', ru: 'Статистика команды' },

    // ===== TASKS =====
    'tasks.control': { uz: '📋 Vazifalar nazorati', en: '📋 Task Control', ru: '📋 Управление задачами' },
    'tasks.calendar': { uz: '📅 Kalendar', en: '📅 Calendar', ru: '📅 Календарь' },
    'tasks.settings': { uz: '⚙️ Sozlamalar', en: '⚙️ Settings', ru: '⚙️ Настройки' },
    'tasks.kanban': { uz: '📊 Kanban', en: '📊 Kanban', ru: '📊 Канбан' },
    'tasks.all': { uz: 'Barchasi', en: 'All', ru: 'Все' },
    'tasks.allPriority': { uz: 'Barcha prioritet', en: 'All priorities', ru: 'Все приоритеты' },
    'tasks.allCategory': { uz: 'Barcha kategoriya', en: 'All categories', ru: 'Все категории' },
    'tasks.myTasks': { uz: 'Mening vazifalarim', en: 'My Tasks', ru: 'Мои задачи' },
    'tasks.teamTasks': { uz: 'Jamoa vazifalari', en: 'Team Tasks', ru: 'Задачи команды' },
    'tasks.total': { uz: 'Jami', en: 'Total', ru: 'Всего' },
    'tasks.today': { uz: 'Bugungi', en: 'Today', ru: 'Сегодня' },
    'tasks.overdueCount': { uz: "Muddati o'tgan", en: 'Overdue', ru: 'Просрочено' },
    'tasks.doneCount': { uz: 'Bajarilgan', en: 'Completed', ru: 'Выполнено' },
    'tasks.notFound': { uz: 'Vazifalar topilmadi', en: 'No tasks found', ru: 'Задачи не найдены' },
    'tasks.addHint': { uz: "Yangi vazifa qo'shish uchun \"Qo'shish\" tugmasini bosing", en: 'Click "Add" to create a new task', ru: 'Нажмите "Добавить" для создания задачи' },
    'tasks.daysLeft': { uz: 'kun qoldi', en: 'days left', ru: 'дней осталось' },
    'tasks.daysOverdue': { uz: "kun o'tgan", en: 'days overdue', ru: 'дней просрочено' },
    'tasks.edit': { uz: 'Vazifani tahrirlash', en: 'Edit Task', ru: 'Редактировать задачу' },
    'tasks.new': { uz: 'Yangi vazifa', en: 'New Task', ru: 'Новая задача' },
    'tasks.name': { uz: 'Nomi', en: 'Name', ru: 'Название' },
    'tasks.priority': { uz: 'Prioritet', en: 'Priority', ru: 'Приоритет' },
    'tasks.status': { uz: 'Status', en: 'Status', ru: 'Статус' },
    'tasks.category': { uz: 'Kategoriya', en: 'Category', ru: 'Категория' },
    'tasks.deadline': { uz: 'Muddat', en: 'Deadline', ru: 'Срок' },
    'tasks.time': { uz: 'Vaqti', en: 'Time', ru: 'Время' },
    'tasks.note': { uz: 'Izoh', en: 'Note', ru: 'Заметка' },
    'tasks.assignTo': { uz: 'Topshirish', en: 'Assign to', ru: 'Назначить' },
    'tasks.delegatedBy': { uz: 'Topshirgan', en: 'Delegated by', ru: 'Поручил' },
    'tasks.done': { uz: 'Vazifa bajarildi ✓', en: 'Task completed ✓', ru: 'Задача выполнена ✓' },
    'tasks.undone': { uz: 'Vazifa qaytarildi', en: 'Task reopened', ru: 'Задача возвращена' },
    'tasks.deleted': { uz: "Vazifa o'chirildi", en: 'Task deleted', ru: 'Задача удалена' },
    'tasks.saved': { uz: 'Vazifa saqlandi', en: 'Task saved', ru: 'Задача сохранена' },
    'tasks.added': { uz: "Vazifa qo'shildi", en: 'Task added', ru: 'Задача добавлена' },
    'tasks.enterName': { uz: 'Iltimos, vazifa nomini kiriting', en: 'Please enter a task name', ru: 'Введите название задачи' },

    // ===== PRIORITIES =====
    'priority.ota_muhim': { uz: "‼️ O'ta muhim", en: '‼️ Critical', ru: '‼️ Критически важно' },
    'priority.muhim': { uz: '⚡️ Muhim', en: '⚡️ Important', ru: '⚡️ Важно' },
    'priority.orta': { uz: "📌 O'rtacha muhim", en: '📌 Medium', ru: '📌 Средний' },
    'priority.past': { uz: '💤 Unchalik muhimmas', en: '💤 Low', ru: '💤 Низкий' },

    // ===== STATUSES =====
    'status.yangi': { uz: '⚠️ Hali boshlanmadi', en: '⚠️ Not started', ru: '⚠️ Не начато' },
    'status.jarayonda': { uz: '🔄 Jarayonda', en: '🔄 In progress', ru: '🔄 В процессе' },
    'status.bajarildi': { uz: '✅ Bajarildi', en: '✅ Completed', ru: '✅ Выполнено' },
    'status.uzoq_muddatli': { uz: '📌 Uzоқ muddatli', en: '📌 Long-term', ru: '📌 Долгосрочный' },
    'status.bekor': { uz: '📦 Якунланган (Архив)', en: '📦 Completed (Archive)', ru: '📦 Завершён (Архив)' },

    // ===== PRODUCTIVITY =====
    'prod.plans': { uz: '📊 Rejalar', en: '📊 Plans', ru: '📊 Планы' },
    'prod.tasks': { uz: '📋 Vazifalar', en: '📋 Tasks', ru: '📋 Задачи' },
    'prod.monthlyResult': { uz: 'Oylik natija', en: 'Monthly result', ru: 'Итог за месяц' },
    'prod.done': { uz: 'Bajarilgan', en: 'Completed', ru: 'Выполнено' },
    'prod.notDone': { uz: 'Bajarilmagan', en: 'Not completed', ru: 'Не выполнено' },
    'prod.habitsCount': { uz: 'Odatlar soni', en: 'Habits count', ru: 'Кол-во привычек' },
    'prod.day': { uz: 'Kun', en: 'Day', ru: 'День' },
    'prod.noActive': { uz: "Faol vazifalar yo'q", en: 'No active tasks', ru: 'Нет активных задач' },
    'prod.allDone': { uz: 'Barcha vazifalar bajarilgan!', en: 'All tasks completed!', ru: 'Все задачи выполнены!' },

    // ===== FINANCE =====
    'fin.year': { uz: 'Yil', en: 'Year', ru: 'Год' },
    'fin.debts': { uz: '💳 Qarzlar', en: '💳 Debts', ru: '💳 Долги' },
    'fin.income': { uz: 'Тушумлар (Daromad)', en: 'Income', ru: 'Доходы' },
    'fin.expenses': { uz: 'Харажатлар (Xarajat)', en: 'Expenses', ru: 'Расходы' },
    'fin.savings': { uz: "Жамғарма (Jamg'arma)", en: 'Savings', ru: 'Накопления' },
    'fin.balance': { uz: 'Қолдиқ (Balans)', en: 'Balance', ru: 'Баланс' },
    'fin.spentPct': { uz: 'сарфланган', en: 'spent', ru: 'потрачено' },
    'fin.tushum': { uz: 'Тушумлар', en: 'Income', ru: 'Доходы' },
    'fin.xarajat': { uz: 'Харажатлар', en: 'Expenses', ru: 'Расходы' },
    'fin.noData': { uz: "Ma'lumot yo'q", en: 'No data', ru: 'Нет данных' },
    'fin.newEntry': { uz: 'Yangi yozuv', en: 'New entry', ru: 'Новая запись' },
    'fin.type': { uz: 'Turi', en: 'Type', ru: 'Тип' },
    'fin.name': { uz: 'Nomi', en: 'Name', ru: 'Название' },
    'fin.amount': { uz: "Miqdor (so'm)", en: 'Amount', ru: 'Сумма' },
    'fin.categoryLabel': { uz: 'Kategoriya', en: 'Category', ru: 'Категория' },
    'fin.deleted': { uz: "O'chirildi", en: 'Deleted', ru: 'Удалено' },
    'fin.added': { uz: "Yozuv qo'shildi", en: 'Entry added', ru: 'Запись добавлена' },
    'fin.yearlyIncome': { uz: 'Yillik daromad', en: 'Annual income', ru: 'Годовой доход' },
    'fin.yearlyExpense': { uz: 'Yillik xarajat', en: 'Annual expenses', ru: 'Годовые расходы' },
    'fin.yearlySavings': { uz: "Yillik jamg'arma", en: 'Annual savings', ru: 'Годовые накопления' },
    'fin.yearlyBalance': { uz: 'Yillik balans', en: 'Annual balance', ru: 'Годовой баланс' },
    'fin.totalDebt': { uz: 'Jami qarz', en: 'Total debt', ru: 'Общий долг' },
    'fin.totalPaid': { uz: "To'langan", en: 'Paid', ru: 'Оплачено' },
    'fin.remaining': { uz: 'Qolgan qarz', en: 'Remaining', ru: 'Остаток' },
    'fin.creditor': { uz: 'Qarz beruvchi', en: 'Creditor', ru: 'Кредитор' },
    'fin.originalAmount': { uz: "Asl summa", en: 'Original amount', ru: 'Начальная сумма' },
    'fin.paidAmount': { uz: "To'langan", en: 'Paid', ru: 'Оплачено' },
    'fin.monthlyPayment': { uz: "Oylik to'lov", en: 'Monthly payment', ru: 'Ежемесячный платёж' },
    'fin.months': { uz: 'Nechchi oy', en: 'Months', ru: 'Месяцев' },
    'fin.debtStatus': { uz: 'Holati', en: 'Status', ru: 'Статус' },
    'fin.debtPaid': { uz: "To'landi", en: 'Paid', ru: 'Оплачено' },
    'fin.debtActive': { uz: 'Faol', en: 'Active', ru: 'Активный' },
    'fin.newDebt': { uz: 'Yangi qarz', en: 'New Debt', ru: 'Новый долг' },
    'fin.addDebt': { uz: "Qarz qo'shish", en: 'Add Debt', ru: 'Добавить долг' },
    'fin.noDebts': { uz: "Qarzlar yo'q", en: 'No debts', ru: 'Нет долгов' },

    // ===== HABITS =====
    'habits.yearlyGoals': { uz: '🎯 Yillik maqsadlar', en: '🎯 Annual Goals', ru: '🎯 Годовые цели' },
    'habits.dashboard': { uz: '📊 Dashboard', en: '📊 Dashboard', ru: '📊 Дашборд' },
    'habits.monthly': { uz: '📅 Oylik nazorat', en: '📅 Monthly Tracking', ru: '📅 Ежемесячный контроль' },
    'habits.avgProgress': { uz: "O'rtacha progress", en: 'Average progress', ru: 'Средний прогресс' },
    'habits.completedGoals': { uz: 'Bajarilgan maqsadlar', en: 'Completed goals', ru: 'Достигнутые цели' },
    'habits.inProgress': { uz: 'Jarayondagi', en: 'In progress', ru: 'В процессе' },
    'habits.catCount': { uz: 'Kategoriyalar soni', en: 'Categories', ru: 'Категории' },
    'habits.progress': { uz: 'bajarildi', en: 'completed', ru: 'выполнено' },
    'habits.noGoals': { uz: "Maqsad yo'q", en: 'No goals', ru: 'Нет целей' },
    'habits.addGoal': { uz: "\"Qo'shish\" tugmasini bosing", en: 'Click "Add" button', ru: 'Нажмите "Добавить"' },
    'habits.newGoal': { uz: 'Yangi maqsad', en: 'New Goal', ru: 'Новая цель' },
    'habits.goalName': { uz: 'Maqsad nomi', en: 'Goal name', ru: 'Название цели' },
    'habits.goalDesc': { uz: 'Tavsif', en: 'Description', ru: 'Описание' },
    'habits.goalAdded': { uz: "Maqsad qo'shildi", en: 'Goal added', ru: 'Цель добавлена' },
    'habits.goalDeleted': { uz: "Maqsad o'chirildi", en: 'Goal deleted', ru: 'Цель удалена' },
    'habits.enterGoalName': { uz: 'Iltimos, maqsad nomini kiriting', en: 'Please enter a goal name', ru: 'Введите название цели' },
    'habits.delete': { uz: "O'chirish", en: 'Delete', ru: 'Удалить' },
    'habits.monthlyProgress': { uz: 'Oylik progress', en: 'Monthly progress', ru: 'Прогресс за месяц' },
    'habits.habitsLabel': { uz: 'Odatlar', en: 'Habits', ru: 'Привычки' },

    // ===== ADMIN =====
    'admin.users': { uz: '👥 Foydalanuvchilar', en: '👥 Users', ru: '👥 Пользователи' },
    'admin.stats': { uz: '📊 Statistika', en: '📊 Statistics', ru: '📊 Статистика' },
    'admin.departments': { uz: "🏢 Bo'limlar", en: '🏢 Departments', ru: '🏢 Отделы' },
    'admin.totalUsers': { uz: 'Jami foydalanuvchilar', en: 'Total users', ru: 'Всего пользователей' },
    'admin.approved': { uz: 'Tasdiqlangan', en: 'Approved', ru: 'Одобрено' },
    'admin.pending': { uz: 'Kutilmoqda', en: 'Pending', ru: 'Ожидает' },
    'admin.rejected': { uz: 'Rad etilgan', en: 'Rejected', ru: 'Отклонено' },
    'admin.approve': { uz: 'Tasdiqlash', en: 'Approve', ru: 'Одобрить' },
    'admin.reject': { uz: 'Rad etish', en: 'Reject', ru: 'Отклонить' },
    'admin.remove': { uz: "O'chirish", en: 'Remove', ru: 'Удалить' },
    'admin.changeRole': { uz: 'Rolni almashtirish', en: 'Change Role', ru: 'Изменить роль' },
    'admin.sortBy': { uz: 'Saralash', en: 'Sort by', ru: 'Сортировать' },
    'admin.filterRole': { uz: 'Rol bo\'yicha', en: 'By role', ru: 'По роли' },
    'admin.filterStatus': { uz: "Status bo'yicha", en: 'By status', ru: 'По статусу' },
    'admin.lastLogin': { uz: "Oxirgi kirish", en: 'Last login', ru: 'Последний вход' },
    'admin.registeredAt': { uz: "Ro'yxatdan o'tgan", en: 'Registered', ru: 'Зарегистрирован' },
    'admin.userApproved': { uz: 'Foydalanuvchi tasdiqlandi', en: 'User approved', ru: 'Пользователь одобрен' },
    'admin.userRejected': { uz: 'Foydalanuvchi rad etildi', en: 'User rejected', ru: 'Пользователь отклонён' },
    'admin.userRemoved': { uz: "Foydalanuvchi o'chirildi", en: 'User removed', ru: 'Пользователь удалён' },
    'admin.roleChanged': { uz: "Rol o'zgartirildi", en: 'Role changed', ru: 'Роль изменена' },

    // ===== ROLES =====
    'role.admin': { uz: 'Admin', en: 'Admin', ru: 'Админ' },
    'role.rahbar': { uz: 'Rahbar', en: 'Leader', ru: 'Руководитель' },
    'role.ishchi': { uz: 'Ishchi', en: 'Worker', ru: 'Сотрудник' },
    'role.foydalanuvchi': { uz: 'Foydalanuvchi', en: 'User', ru: 'Пользователь' },

    // ===== COMMON =====
    'common.save': { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
    'common.cancel': { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
    'common.delete': { uz: "O'chirish", en: 'Delete', ru: 'Удалить' },
    'common.edit': { uz: 'Tahrirlash', en: 'Edit', ru: 'Редактировать' },
    'common.close': { uz: 'Yopish', en: 'Close', ru: 'Закрыть' },
    'common.fillAll': { uz: "Iltimos, barcha maydonlarni to'ldiring", en: 'Please fill in all fields', ru: 'Заполните все поля' },
    'common.date': { uz: 'Sana', en: 'Date', ru: 'Дата' },
    'common.som': { uz: "so'm", en: "so'm", ru: 'сум' },
    'common.month': { uz: 'Oy', en: 'Month', ru: 'Месяц' },

    // ===== MONTHS =====
    'month.0': { uz: 'Yanvar', en: 'January', ru: 'Январь' },
    'month.1': { uz: 'Fevral', en: 'February', ru: 'Февраль' },
    'month.2': { uz: 'Mart', en: 'March', ru: 'Март' },
    'month.3': { uz: 'Aprel', en: 'April', ru: 'Апрель' },
    'month.4': { uz: 'May', en: 'May', ru: 'Май' },
    'month.5': { uz: 'Iyun', en: 'June', ru: 'Июнь' },
    'month.6': { uz: 'Iyul', en: 'July', ru: 'Июль' },
    'month.7': { uz: 'Avgust', en: 'August', ru: 'Август' },
    'month.8': { uz: 'Sentyabr', en: 'September', ru: 'Сентябрь' },
    'month.9': { uz: 'Oktyabr', en: 'October', ru: 'Октябрь' },
    'month.10': { uz: 'Noyabr', en: 'November', ru: 'Ноябрь' },
    'month.11': { uz: 'Dekabr', en: 'December', ru: 'Декабрь' },

    // ===== SETTINGS =====
    'settings.categories': { uz: '📂 Kategoriyalar', en: '📂 Categories', ru: '📂 Категории' },
    'settings.priorities': { uz: '⚡ Prioritetlar', en: '⚡ Priorities', ru: '⚡ Приоритеты' },
    'settings.statuses': { uz: '📊 Statuslar', en: '📊 Statuses', ru: '📊 Статусы' },
    'settings.weekStart': { uz: '📅 Hafta boshlanish kuni', en: '📅 Week start day', ru: '📅 Начало недели' },
    'settings.monday': { uz: 'Dushanba', en: 'Monday', ru: 'Понедельник' },
    'settings.addCategory': { uz: "Kategoriya qo'shish", en: 'Add category', ru: 'Добавить категорию' },
    'settings.catAdded': { uz: "Kategoriya qo'shildi", en: 'Category added', ru: 'Категория добавлена' },
    'settings.enterCatName': { uz: 'Yangi kategoriya nomini kiriting:', en: 'Enter new category name:', ru: 'Введите название категории:' },

    // ===== TASK CATEGORIES =====
    'taskCat.work': { uz: 'Ish', en: 'Work', ru: 'Работа' },
    'taskCat.personal': { uz: 'Shaxsiy', en: 'Personal', ru: 'Личное' },
    'taskCat.study': { uz: "O'qish", en: 'Study', ru: 'Учёба' },
    'taskCat.health': { uz: "Sog'liq", en: 'Health', ru: 'Здоровье' },
    'taskCat.finance': { uz: 'Moliya', en: 'Finance', ru: 'Финансы' },
    'taskCat.family': { uz: 'Oila', en: 'Family', ru: 'Семья' },

    // ===== NEW: TEKSHIRUVDA STATUS =====
    'status.tekshiruvda': { uz: '🔍 Tekshiruvda', en: '🔍 Under review', ru: '🔍 На проверке' },
    'tasks.approveTask': { uz: 'Tasdiqlash', en: 'Approve', ru: 'Одобрить' },
    'tasks.rejectTask': { uz: 'Qaytarish', en: 'Return', ru: 'Вернуть' },
    'tasks.approved': { uz: 'Vazifa tasdiqlandi ✅', en: 'Task approved ✅', ru: 'Задача одобрена ✅' },
    'tasks.returned': { uz: 'Vazifa qaytarildi 🔄', en: 'Task returned 🔄', ru: 'Задача возвращена 🔄' },
    'tasks.sentForReview': { uz: 'Tekshiruvga yuborildi 🔍', en: 'Sent for review 🔍', ru: 'Отправлено на проверку 🔍' },
    'tasks.deptTasks': { uz: "Bo'lim vazifalari", en: 'Department Tasks', ru: 'Задачи отдела' },

    // ===== INVITATION =====
    'invite.title': { uz: "Ishchini taklif qilish", en: 'Invite Worker', ru: 'Пригласить сотрудника' },
    'invite.email': { uz: "Ishchi email manzili", en: "Worker's email", ru: 'Email сотрудника' },
    'invite.send': { uz: 'Taklif yuborish', en: 'Send Invitation', ru: 'Отправить приглашение' },
    'invite.sent': { uz: 'Taklif yuborildi! ✉️', en: 'Invitation sent! ✉️', ru: 'Приглашение отправлено! ✉️' },
    'invite.exists': { uz: 'Bu email allaqachon mavjud', en: 'This email already exists', ru: 'Этот email уже существует' },
    'invite.list': { uz: 'Takliflar ro\'yxati', en: 'Invitations list', ru: 'Список приглашений' },
    'invite.pending': { uz: 'Kutilmoqda', en: 'Pending', ru: 'Ожидает' },
    'invite.accepted': { uz: 'Qabul qilindi', en: 'Accepted', ru: 'Принято' },
    'invite.registerTitle': { uz: 'Taklifnomani qabul qilish', en: 'Accept Invitation', ru: 'Принять приглашение' },
    'invite.autoApproved': { uz: 'Siz ishchi sifatida avtomatik tasdiqlangan!', en: 'You are auto-approved as a worker!', ru: 'Вы автоматически одобрены как сотрудник!' },

    // ===== KANBAN =====
    'kanban.new': { uz: 'Yangi', en: 'New', ru: 'Новые' },
    'kanban.inProgress': { uz: 'Jarayonda', en: 'In Progress', ru: 'В процессе' },
    'kanban.review': { uz: 'Tekshiruvda', en: 'Under Review', ru: 'На проверке' },
    'kanban.done': { uz: 'Bajarildi', en: 'Done', ru: 'Готово' },
    'kanban.tab': { uz: '📊 Kanban', en: '📊 Kanban', ru: '📊 Канбан' },

    // ===== POMODORO =====
    'pomo.title': { uz: 'Pomodoro Taymer', en: 'Pomodoro Timer', ru: 'Таймер Помодоро' },
    'pomo.work': { uz: 'Ish', en: 'Work', ru: 'Работа' },
    'pomo.break': { uz: 'Tanaffus', en: 'Break', ru: 'Перерыв' },
    'pomo.longBreak': { uz: 'Uzun tanaffus', en: 'Long Break', ru: 'Длинный перерыв' },
    'pomo.start': { uz: 'Boshlash', en: 'Start', ru: 'Начать' },
    'pomo.pause': { uz: 'Pauza', en: 'Pause', ru: 'Пауза' },
    'pomo.reset': { uz: 'Qayta boshlash', en: 'Reset', ru: 'Сбросить' },
    'pomo.sessions': { uz: 'Sessiyalar', en: 'Sessions', ru: 'Сессии' },
    'pomo.focusMode': { uz: '🎯 Fokus rejimi', en: '🎯 Focus Mode', ru: '🎯 Режим фокуса' },

    // ===== NOTIFICATIONS =====
    'notif.title': { uz: 'Bildirishnomalar', en: 'Notifications', ru: 'Уведомления' },
    'notif.assigned': { uz: 'sizga topshirildi', en: 'assigned to you', ru: 'назначено вам' },
    'notif.approved': { uz: 'tasdiqlandi', en: 'was approved', ru: 'одобрена' },
    'notif.returned': { uz: 'qaytarildi', en: 'was returned', ru: 'возвращена' },
    'notif.deadline': { uz: 'Muddat yaqinlashmoqda', en: 'Deadline approaching', ru: 'Приближается срок' },
    'notif.noNew': { uz: "Yangi bildirishnomalar yo'q", en: 'No new notifications', ru: 'Нет новых уведомлений' },
    'notif.markRead': { uz: "Barchasini o'qilgan deb belgilash", en: 'Mark all as read', ru: 'Отметить все как прочитанные' },
    'notif.newTask': { uz: 'Yangi vazifa', en: 'New task', ru: 'Новая задача' },

    // ===== COMMENTS =====
    'comment.title': { uz: 'Izohlar', en: 'Comments', ru: 'Комментарии' },
    'comment.add': { uz: 'Izoh yozing...', en: 'Write a comment...', ru: 'Напишите комментарий...' },
    'comment.send': { uz: 'Yuborish', en: 'Send', ru: 'Отправить' },
    'comment.noComments': { uz: "Izohlar yo'q", en: 'No comments yet', ru: 'Нет комментариев' },

    // ===== DAILY PLANNER =====
    'planner.title': { uz: '📋 Kunlik reja', en: '📋 Daily Planner', ru: '📋 Ежедневник' },
    'planner.tab': { uz: '📋 Kunlik reja', en: '📋 Daily Plan', ru: '📋 Ежедневник' },
    'planner.morning': { uz: '🌅 Ertalab (6-12)', en: '🌅 Morning (6-12)', ru: '🌅 Утро (6-12)' },
    'planner.afternoon': { uz: '☀️ Kunduzi (12-18)', en: '☀️ Afternoon (12-18)', ru: '☀️ День (12-18)' },
    'planner.evening': { uz: '🌙 Kechqurun (18-24)', en: '🌙 Evening (18-24)', ru: '🌙 Вечер (18-24)' },
    'planner.noTasks': { uz: "Bu vaqt oralig'ida vazifa yo'q", en: 'No tasks for this time', ru: 'Нет задач на это время' },

    // ===== TEAM REPORTS =====
    'report.title': { uz: '📈 Haftalik hisobot', en: '📈 Weekly Report', ru: '📈 Еженедельный отчёт' },
    'report.tab': { uz: '📈 Hisobot', en: '📈 Reports', ru: '📈 Отчёты' },
    'report.tasksCompleted': { uz: 'Bajarilgan vazifalar', en: 'Tasks completed', ru: 'Выполнено задач' },
    'report.avgProductivity': { uz: "O'rtacha produktivlik", en: 'Avg productivity', ru: 'Средняя продуктивность' },
    'report.thisWeek': { uz: 'Shu hafta', en: 'This week', ru: 'Эта неделя' },
    'report.lastWeek': { uz: "O'tgan hafta", en: 'Last week', ru: 'Прошлая неделя' },
};

// ===== i18n ENGINE =====
let _currentLang = localStorage.getItem('hb_lang') || 'uz';

function t(key, fallback) {
    const entry = TRANSLATIONS[key];
    if (!entry) return fallback || key;
    return entry[_currentLang] || entry['uz'] || fallback || key;
}

function setLanguage(lang) {
    _currentLang = lang;
    localStorage.setItem('hb_lang', lang);
    // Update lang selector UI
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    // Re-render current view
    if (typeof switchView === 'function' && typeof currentView !== 'undefined') {
        updateDateDisplay();
        switchView(currentView);
    }
    // Update static elements
    updateStaticTexts();
}

function getLanguage() { return _currentLang; }

function getMonthName(index) { return t('month.' + index); }

function getMonthNames() { return Array.from({ length: 12 }, (_, i) => t('month.' + i)); }

function updateStaticTexts() {
    // Update nav buttons
    const navLabels = { dashboard: t('nav.dashboard'), tasks: t('nav.tasks'), productivity: t('nav.productivity'), finance: t('nav.finance'), habits: t('nav.habits'), drive: t('header.title.drive'), admin: t('nav.admin') };
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const span = btn.querySelector('span');
        if (span && navLabels[btn.dataset.view]) span.textContent = navLabels[btn.dataset.view];
    });
    // Update add button
    const addSpan = document.querySelector('#headerAddBtn span');
    if (addSpan) addSpan.textContent = t('header.add');
    // Update page title
    const titles = { dashboard: t('header.title.dashboard'), tasks: t('header.title.tasks'), productivity: t('header.title.productivity'), finance: t('header.title.finance'), habits: t('header.title.habits'), drive: t('header.title.drive'), admin: t('header.title.admin') };
    const pt = document.getElementById('pageTitle');
    if (pt && titles[currentView]) pt.textContent = titles[currentView];
    // Update sub-tabs
    updateSubTabTexts();
}

function updateSubTabTexts() {
    const tabMap = {
        'tasklist': t('tasks.control'), 'taskcalendar': t('tasks.calendar'), 'tasksettings': t('tasks.settings'),
        'prodgrid': t('prod.plans'), 'prodtasks': t('prod.tasks'),
        'yearlygoals': t('habits.yearlyGoals'), 'habitsdashboard': t('habits.dashboard'), 'habitsmonthly': t('habits.monthly'),
        'adminusers': t('admin.users'), 'adminstats': t('admin.stats'), 'admindepts': t('admin.departments'),
    };
    document.querySelectorAll('.sub-tab').forEach(tab => {
        const key = tab.dataset.subtab;
        if (tabMap[key]) tab.textContent = tabMap[key];
    });
}
