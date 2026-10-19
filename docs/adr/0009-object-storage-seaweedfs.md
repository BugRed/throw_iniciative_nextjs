# ADR 0009 — SeaweedFS como object storage S3-compatível em dev

**Status:** Aceito · 2026-10-08

## Contexto

Projetos nascidos deste boilerplate frequentemente precisam de um object storage
(upload de arquivos, anexos, mídia) compatível com S3 — path-style, SigV4 assinado,
presigned URL — para que o código de produção fale com um bucket gerenciado real
(AWS S3, DigitalOcean Spaces, etc.) sem nenhum branch condicional por fornecedor.
Em dev local, isso exige um servidor S3-compatível rodando no `docker-compose.dev.yml`.

A opção óbvia seria o MinIO, historicamente o padrão de fato para isso. Mas:

- As imagens da comunidade do MinIO saíram de circulação: `minio/minio` sumiu do
  Docker Hub e `quay.io/minio/*` passou a exigir login. Fixar essa imagem no compose
  quebra o `docker compose up` para quem clona o projeto pela primeira vez.
- O único espelho público que ainda baixa é o congelado da Bitnami, parado desde
  julho/2025, com dezenas de CVEs HIGH/CRITICAL acumuladas — o tipo de imagem que
  o Trivy (ver ADR-0010) reprovaria no primeiro scan.

Restavam três saídas: licença/registry privado do MinIO, um S3 gerenciado só para
rodar o ambiente local, ou outro servidor S3-compatível com imagem pública mantida.
Para o boilerplate, que não deve gerar custo para quem clona, só a terceira serve.

## Decisão

Usaremos `chrislusf/seaweedfs` como o object storage S3-compatível de dev, no lugar
do MinIO. Critérios, em ordem:

1. Fala exatamente o S3 que o `@aws-sdk/client-s3` emite (SigV4, path-style,
   presigned URL) — testado manualmente: healthcheck em `/healthz`, criação de
   bucket via `weed shell -master=storage:9333`.
2. Imagem pública, sem login.
3. Manutenção viva — publica novas tags com frequência.
4. Zero HIGH/CRITICAL no Trivy na tag fixada (`4.48`).
5. Um container só: `server -dir=/data -s3 -s3.port=9000` sobe master, volume,
   filer e o gateway S3 no mesmo processo — nenhuma peça extra para rodar
   `yarn dev`.

As identidades (access/secret key) ficam em `docker/storage/s3.json`, montado
read-only no container, no formato IAM nativo do SeaweedFS. O bucket é criado uma
vez por um serviço `storage-setup` que roda `weed shell` e sai (`restart: "no"`).

Este ADR cobre **somente a infra de dev**. O client S3 (presign, upload, download)
é decisão de cada projeto nascido do boilerplate — não há código de storage aqui,
só o container e as envs (`S3_*` em `.env.example`).

## Consequências

- ➕ `docker compose up` funciona para quem clona o projeto, sem exigir login em
  registry nem custo de S3 gerenciado só para dev.
- ➕ Passa no mesmo gate de Trivy que o resto do projeto (ADR-0010).
- ➕ Contrato S3 real: o código de produção (quando escrito) não precisa de branch
  condicional por fornecedor — o client fala com `S3_ENDPOINT`, seja SeaweedFS
  local ou S3 gerenciado em produção.
- ➖ SeaweedFS não é o padrão de mercado mais conhecido — alguém vindo de outro
  projeto pode estranhar o nome; o contrato S3 compensa isso.
- ⚠️ Se o AWS SDK v3 for usado como client, configure
  `requestChecksumCalculation: "WHEN_REQUIRED"` — o padrão do SDK assina o `PUT`
  com um checksum calculado antes do corpo existir, e um storage que o confere
  (como o SeaweedFS) recusa o upload com `BadDigest`. Isso é correção do client,
  não contorno do servidor.
- ⚠️ Revisitar se o projeto precisar de recursos que o SeaweedFS não cobre
  (replicação multi-região, erasure coding customizado) — aí a escolha muda por
  projeto, não no boilerplate.
