# Node.js'ning eng so‘nggi versiyasidan foydalanamiz
FROM node:18

# Ishchi katalogni o‘rnatamiz
WORKDIR /app

# Barcha fayllarni konteynerga nusxalash
COPY . .

# Barcha bog‘liqliklarni o‘rnatamiz
RUN npm install

# Fly.io 8080-portdan foydalanadi
ENV PORT=8080

# Serverni ishga tushiramiz
CMD ["node", "server.js"]
