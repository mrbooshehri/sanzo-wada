# ── Stage 1: Generate favicon PNGs from icon.svg ───────────────
FROM node:20-alpine AS icons

WORKDIR /app
COPY package.json icon.svg generate-favicon.mjs ./
RUN npm install sharp && node generate-favicon.mjs

# ── Stage 2: nginx server ───────────────────────────────────────
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css app.js icon.svg manifest.json /usr/share/nginx/html/
COPY --from=icons \
  /app/favicon-16.png \
  /app/favicon-32.png \
  /app/favicon-180.png \
  /app/favicon-192.png \
  /app/favicon-512.png \
  /usr/share/nginx/html/
COPY data /usr/share/nginx/html/data

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
