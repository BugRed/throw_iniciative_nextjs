# Escolhe imagem pronta da distribuição Linux 'Alpine' que já venha com Node instalado e a chama de base para servir de modelo para todos as imagens da Dockerfile, facilitando mudanças futuras
# Node 22: mesma versão do CI; dependências atuais (kysely, do Better Auth) exigem >=22.
FROM node:22-alpine AS base

# O query engine do Prisma precisa do OpenSSL no Alpine (musl). Instalado no
# stage base para valer em development, builder e runner.
RUN apk add --no-cache openssl

# Dockerfile para desenvolvimento
FROM base AS development

WORKDIR /app

COPY package.json yarn.lock ./

# O container roda como o usuário do host (UID/GID injetados pelo compose), mas o
# node_modules é populado aqui como root. Liberar escrita permite que o runtime
# grave no node_modules — necessário para `prisma generate` (db:migrate/generate).
RUN yarn install --frozen-lockfile \
 && chmod -R a+rwX /app/node_modules

CMD ["yarn", "dev"] 

#Dockerfile para build de produção
FROM base as builder

# similar a um cd /app, caso n exista ele executa mkdir /app && cd /app. Agora todos os comandos serão executados no diretório /app
WORKDIR /app

# Para evitar que em cada alteração do código rode o yarn install. Iremos copiar primeiro os arquivos package.json e yarn.lock. Os responsáveis por indicar mudanças de dependencias do código.
COPY package.json yarn.lock ./

# Instalar dependencias
# --frozen-lockfile serve para evitar que dependências fujam da versão testada em desenvolvimento no momento do CI/CD, além de que ele não irá instalar dependências vindas do package.json que não estejam no arquivo yarn.lock
RUN yarn install --frozen-lockfile

#Copia todo o projeto para dentro do diretório /app. Em caso de mudanças no código, apenas os arquivos vão ser copiados novamente.
COPY . .

# Gera a aplicação otimizada para produção (.next).
RUN yarn build

# Imagem responsável apenas por executar a aplicação em produção
FROM base AS runner

WORKDIR /app

# Sequencia de cópias apenas dos arquivos necessários para rodar a aplicação. As cópias são advindas do 
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Expondo porta 3000 para aplicação. Ela não publica a porta de verdade, pois é apenas informativa. 
# Para expor a porta use $ docker run -p ou utilizando o docker-compose.yml 
EXPOSE 3000

# Roda o comando $ yarn start, iniciando assim o servidor de produção utilizando o diretório .next
CMD ["yarn", "start"]

