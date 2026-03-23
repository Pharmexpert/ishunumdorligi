---
description: GitHub га лойиҳани жойлаш ва автоматик синхронизация
---

# 🚀 GitHub га жойлаш — Босқичма-босқич йўриқнома

## 1-босқич: Git ўрнатилганини текшириш

PowerShell ёки CMD очинг ва ёзинг:

```
git --version
```

Агар `git version 2.x.x` чиқса — тайёр. Акс ҳолда https://git-scm.com дан ўрнатинг.

---

## 2-босқич: Лойиҳада Git инициализация

```
cd "d:\site v.4"
git init
git branch -M main
```

---

## 3-босқич: GitHub да янги репозиторий яратиш

1. https://github.com/new саҳифасини очинг
2. **Repository name**: `Timemenegment` (ёки ўзингиз хоҳлаган ном)
3. **Private** танланг (шахсий маълумотлар бор)
4. ⚠️ "Add a README file" — **БЕЛГИЛАМАНГ**
5. **Create repository** тугмасини босинг

---

## 4-босқич: Remote қўшиш ва биринчи push

GitHub яратгандан кейин кўрсатилган HTTPS ҳаволани нусхалаб олинг ва:

```
cd "d:\site v.4"
git remote add origin https://github.com/Pharmexpert/ishunumdorligi.git
git add .
git commit -m "v4: responsive design, chat files, productivity"
git push -u origin main
```

> ⚠️ Биринчи push да GitHub логин/парол ёки токен сўрайди.
> Парол ўрнига **Personal Access Token** ишлатинг:
> GitHub → Settings → Developer settings → Personal access tokens → Generate new token
> Рухсатлар: `repo` (ҳаммасини белгиланг)

---

## 5-босқич: Кейинги ўзгаришларни юклаш

Ҳар сафар ўзгартириш киритганингиздан кейин:

```
cd "d:\site v.4"
git add .
git commit -m "тузатиш: қисқа тавсиф"
git push
```

---

## 6-босқич: Автоматик синхронизация (ихтиёрий)

### Вариант А: auto-sync.bat файл

Лойиҳа папкасида `auto-sync.bat` яратинг:

```bat
@echo off
cd /d "d:\site v.4"
git add .
git commit -m "auto-sync: %date% %time%" 2>nul
git push origin main 2>nul
echo Синхронизация тугади!
pause
```

Икки марта боссангиз — ўзгаришлар GitHub га юкланади.

### Вариант Б: Task Scheduler (автоматик)

1. **Win + R** → `taskschd.msc` → Enter
2. **"Create Basic Task"** босинг
3. Ном: `GitHub Auto Sync`
4. Триггер: **Daily** → ҳар **30 минут** такрорлаш
5. Ҳаракат: **Start a program** → `d:\site v.4\auto-sync.bat`
6. ✅ Тамом

---

## ⚡ Тез амаллар (ёд олинг)

| Амал | Команда |
|---|---|
| Ўзгаришларни кўриш | `git status` |
| Ўзгаришларни қўшиш | `git add .` |
| Commit қилиш | `git commit -m "тавсиф"` |
| Push қилиш | `git push` |
| GitHub дан тортиш | `git pull` |
| Тарихни кўриш | `git log --oneline -10` |