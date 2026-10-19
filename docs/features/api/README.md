# Features — API

Specs de **endpoints, contratos e lógica de servidor**: route handlers (`src/app/api/`),
controllers, services e os contratos de dados entre eles.

Fronteira: aqui fica o *o quê/como* do lado servidor. Regra de negócio pura mora em
[`../../negocio/`](../../negocio/) (implementada nos `services`); o modelo de dados em
[`../../db/`](../../db/).

Crie specs a partir do [`../TEMPLATE.md`](../TEMPLATE.md).
