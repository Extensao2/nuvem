# nuvem

Para usar AWS CLI ou Terraform, o primeiro passo a ser feito é a criação de uma chave de acesso, via [AWS Security Credentials](https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials).

Os valores devem ser gravados no arquivo `credentials.sh` com o seguinte formato:

```sh
export AWS_ACCESS_KEY_ID=valor
export AWS_SECRET_ACCESS_KEY=valor
export AWS_REGION=us-east-1
```

e carregar essas variáveis com:

```sh
source credentials.sh
```

Nota: a região pode ser diferente de `us-east-1`, porém alguns serviços podem não estar disponíveis.

## AWS CloudFormation

Pode-se usar o AWS CLI ou mesmo carregar o arquivo YAML via interface Web.

## Terraform

A sequência de comandos para implantar o ambiente é a seguinte:

```sh
terraform init
terraform plan
terraform apply
```

Por fim, para desmontar todo esse ambiente basta o comando:

```sh
terraform destroy
```
