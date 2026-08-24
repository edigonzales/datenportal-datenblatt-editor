FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_BASE_PATH=./
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30.4-alpine-slim AS runtime

USER root
RUN rm /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
USER 101

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 8080
