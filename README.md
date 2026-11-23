# Минимум трекер — для Vercel

## Как получить ссылку (вариант без программ)
1. Распакуйте архив.
2. Зайдите на https://github.com/new → создайте репозиторий `minimum-tracker` (Public или Private).
3. На странице репозитория нажмите **uploading an existing file** и перетащите ВСЕ файлы из папки (не саму папку) → **Commit changes**.
4. Зайдите на https://vercel.com/new → войдите через GitHub → выберите `minimum-tracker` → **Deploy**.
   Framework Preset: **Other**, остальное не трогать.
5. Через ~30 сек получите ссылку вида `https://minimum-tracker.vercel.app`.

## Вариант с компьютера (если стоит Node.js)
```
cd minimum-tracker
npx vercel --prod
```

## Общий рейтинг для всех
Сейчас данные хранятся на каждом телефоне отдельно.
Чтобы все видели один рейтинг — заполните `config.js` (там пошаговая инструкция по Firebase, бесплатно).
В Firestore → Rules на время можно поставить:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

## Обновление
Меняете файлы в GitHub → Vercel сам пересобирает за несколько секунд.
