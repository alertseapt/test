# Integração NF-e Sistema Mercocamp

Este projeto é uma interface para integração de notas fiscais com o sistema Mercocamp.

## Funcionalidades

- Upload de arquivos XML de NF-e
- Visualização e edição dos produtos
- Geração de JSONs formatados para o sistema Mercocamp
- Interface para simulação de envio dos dados

## Limitação Técnica - CORS

**IMPORTANTE**: Este projeto enfrenta uma limitação técnica relacionada à política de CORS (Cross-Origin Resource Sharing) ao tentar fazer requisições diretamente do navegador para o servidor da API Mercocamp.

### O problema:

Quando a aplicação é hospedada em um domínio (ex: vercel.app) e tenta fazer requisições para outro domínio (ex: webcorpem.no-ip.info), o navegador exige que o servidor de destino inclua cabeçalhos CORS específicos em sua resposta. Como a API Mercocamp não fornece esses cabeçalhos, as requisições são bloqueadas pelo navegador.

### Soluções possíveis:

1. **Criar um servidor backend intermediário (recomendado)**
   - Desenvolver uma API em Node.js, PHP, ou similar que atue como intermediário
   - O frontend envia os dados para esta API, que por sua vez os encaminha para a API Mercocamp
   - A resposta segue o caminho inverso: API Mercocamp -> Seu backend -> Frontend

2. **Solicitar modificações na API Mercocamp**
   - Pedir aos responsáveis pela API que implementem os cabeçalhos CORS adequados
   - Esta opção depende de terceiros e pode não ser viável

## Estado Atual do Projeto

Atualmente, o aplicativo:

1. Processa corretamente os arquivos XML
2. Gera os JSONs no formato esperado pela API Mercocamp
3. Permite a edição dos dados
4. **Simula** o envio para a API, mas não realiza o envio efetivo devido à limitação de CORS

## Próximos Passos para Implementação Completa

1. Criar um servidor backend (em Node.js, PHP, etc.)
2. Implementar endpoints que recebam os dados do frontend
3. Fazer o servidor backend enviar os dados para a API Mercocamp
4. Retornar as respostas da API para o frontend

## Executando o Projeto Localmente

```bash
npm install
npm start
```

## Build para Produção

```bash
npm run build
```

## Autor

Sistema desenvolvido por [Seu Nome]

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
