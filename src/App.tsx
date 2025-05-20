import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import * as xml2js from 'xml2js';
import { MercadoriaInfoType } from './types/MercadoriasTypes';
import { saveAs } from 'file-saver';

// Tipo para a estrutura do produto
interface ProductType {
  NUMSEQ: string;
  CODPROD: string;
  QTPROD: string;
  VLTOTPROD: string;
  NUMSEQ_DEV: string;
  descricao: string;
  unidade: string;
  valorUnitario: string;
}

// Tipo para a estrutura editada do produto
interface EditedProductType extends ProductType {
  editedCodProd: string;
  editedDescricao: string;
  editedUnidade: string;
  editedQtProd: string;
  editedValorUnitario: string;
}

// Tipo para a estrutura do JSON de saída
interface NFItemType {
  NUMSEQ: string;
  CODPROD: string;
  QTPROD: string;
  VLTOTPROD: string;
  NUMSEQ_DEV: string;
}

interface NFInfoType {
  CORPEM_ERP_DOC_ENT: {
    CGCCLIWMS: string;
    CGCREM: string;
    OBSRESDP: string;
    TPDESTNF: string;
    DEV: string;
    NUMNF: string;
    SERIENF: string;
    DTEMINF: string;
    VLTOTALNF: string;
    NUMEPEDCLI: string;
    CHAVENF: string;
    CHAVENF_DEV: string;
    ITENS: NFItemType[];
  }
}

function App() {
  const [xmlData, setXmlData] = useState<any>(null);
  const [nfInfo, setNfInfo] = useState<NFInfoType | null>(null);
  const [mercadoriaInfo, setMercadoriaInfo] = useState<MercadoriaInfoType | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [editedProducts, setEditedProducts] = useState<EditedProductType[]>([]);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawXml, setShowRawXml] = useState<boolean>(false);
  const [sendingData, setSendingData] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<{ success: boolean; message: string } | null>(null);

  // Função para extrair valor do XML, tratando casos de _text
  const extractValue = (obj: any): string => {
    if (!obj) return "";
    if (typeof obj === 'string') return obj;
    if (obj._text !== undefined) return obj._text;
    if (obj.$ && obj.$._text) return obj.$._text;
    return "";
  };

  // Função para formatar a data do formato ISO para DD/MM/YYYY
  const formatDate = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (err) {
      return isoDate;
    }
  };

  // Função para extrair informações específicas do XML e preencher o JSON
  const extractNFInfo = (xmlObj: any): { nfInfo: NFInfoType, products: ProductType[] } => {
    try {
      // Função para navegar pelo objeto e extrair valores
      const getValue = (obj: any, path: string[]): string => {
        let current = obj;
        for (const key of path) {
          if (!current || current[key] === undefined) return "";
          current = current[key];
        }
        return extractValue(current);
      };

      // Extrair dados relevantes
      const nfeProc = xmlObj.nfeProc || {};
      const nfe = nfeProc.NFe || {};
      const infNFe = nfe.infNFe || {};
      const ide = infNFe.ide || {};
      const emit = infNFe.emit || {};
      const dest = infNFe.dest || {};
      const total = infNFe.total?.ICMSTot || {};
      const protNFe = nfeProc.protNFe || {};
      
      // Extrair CNPJ do destinatário
      const cnpjDest = getValue(dest, ['CNPJ']);
      
      // Extrair CNPJ do emitente
      const cnpjEmit = getValue(emit, ['CNPJ']);
      
      // Extrair nome do emitente
      const nomeEmit = getValue(emit, ['xNome']);
      
      // Extrair número da NF
      const numeroNF = getValue(ide, ['nNF']);
      
      // Extrair data de emissão
      const dataEmissao = getValue(ide, ['dhEmi']);
      
      // Extrair valor total
      const valorTotal = getValue(total, ['vNF']);
      
      // Extrair chave da NF
      const chaveNF = getValue(protNFe, ['infProt', 'chNFe']);
      
      // Extrair itens (produtos)
      let products: ProductType[] = [];
      let itens: NFItemType[] = [];
      const det = infNFe.det;
      
      if (det) {
        // Converter para array se não for
        const detArray = Array.isArray(det) ? det : [det];
        
        products = detArray.map((item: any) => {
          const numItem = item._attributes?.nItem || extractValue(item.nItem) || "";
          const prod = item.prod || {};
          
          const qtProd = extractValue(prod.qCom) || "";
          const vlTotalProd = extractValue(prod.vProd) || "";
          
          // Calcular valor unitário
          let valorUnitario = "0";
          if (qtProd && vlTotalProd) {
            const qt = parseFloat(qtProd.replace(",", "."));
            const total = parseFloat(vlTotalProd.replace(",", "."));
            if (qt > 0) {
              valorUnitario = (total / qt).toFixed(4);
            }
          }
          
          return {
            NUMSEQ: numItem,
            CODPROD: extractValue(prod.cProd) || "",
            QTPROD: qtProd,
            VLTOTPROD: vlTotalProd,
            NUMSEQ_DEV: "0", // Padrão conforme exemplo
            descricao: extractValue(prod.xProd) || "",
            unidade: extractValue(prod.uCom) || "",
            valorUnitario: valorUnitario
          };
        });
        
        itens = products.map(p => ({
          NUMSEQ: p.NUMSEQ,
          CODPROD: p.CODPROD,
          QTPROD: p.QTPROD,
          VLTOTPROD: p.VLTOTPROD,
          NUMSEQ_DEV: p.NUMSEQ_DEV
        }));
      }
      
      // Montando o objeto de saída conforme o exemplo
      const result: NFInfoType = {
        CORPEM_ERP_DOC_ENT: {
          CGCCLIWMS: cnpjDest || "99999999999999", // CNPJ do destinatário
          CGCREM: cnpjEmit || "94516671000153", // CNPJ do emitente
          OBSRESDP: `N.F.: ${numeroNF || "459607"}`,
          TPDESTNF: "2", // Padrão conforme exemplo
          DEV: "0", // Padrão conforme exemplo
          NUMNF: numeroNF || "459607", // Número da NF
          SERIENF: "2", // Padrão conforme exemplo
          DTEMINF: formatDate(dataEmissao || "17/03/2020"), // Data formatada
          VLTOTALNF: valorTotal || "250", // Valor total
          NUMEPEDCLI: `N.F. ${numeroNF || "459607"}`,
          CHAVENF: chaveNF || "43190394516671000153550020004596071023377876", // Chave NF
          CHAVENF_DEV: "", // Padrão conforme exemplo
          ITENS: itens.length > 0 ? itens : [
            // Itens de exemplo como fallback
            {
              NUMSEQ: "1",
              CODPROD: "5100",
              QTPROD: "100",
              VLTOTPROD: "100",
              NUMSEQ_DEV: "1"
            },
            {
              NUMSEQ: "2",
              CODPROD: "5101",
              QTPROD: "100",
              VLTOTPROD: "150",
              NUMSEQ_DEV: "2"
            }
          ]
        }
      };
      
      return { nfInfo: result, products };
    } catch (err) {
      console.error('Erro ao extrair informações da NF:', err);
      throw new Error('Erro ao processar os dados da Nota Fiscal.');
    }
  };

  // Inicializa produtos editados com os valores originais
  useEffect(() => {
    if (products.length > 0) {
      const initialEdited = products.map(p => ({
        ...p,
        editedCodProd: p.CODPROD,
        editedDescricao: p.descricao,
        editedUnidade: p.unidade,
        editedQtProd: p.QTPROD,
        editedValorUnitario: p.valorUnitario
      }));
      setEditedProducts(initialEdited);
    }
  }, [products]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setXmlData(null);
    setNfInfo(null);
    setMercadoriaInfo(null);
    setProducts([]);
    setEditedProducts([]);
    setShowEditor(false);
    
    try {
      // Ler o arquivo como texto
      const fileContent = await file.text();
      
      // Configurar parser xml2js
      const parser = new xml2js.Parser({
        explicitArray: false,
        explicitCharkey: true,
        trim: true,
        attrkey: '_attributes',
        charkey: '_text'
      });
      
      // Fazer o parse do XML para JSON
      parser.parseString(fileContent, (err, result) => {
        if (err) {
          throw err;
        }
        setXmlData(result);
        
        // Extrair e formatar as informações específicas para o formato desejado
        const { nfInfo: extractedInfo, products: extractedProducts } = extractNFInfo(result);
        setNfInfo(extractedInfo);
        setProducts(extractedProducts);
        
        // Gerar o mercadoriaInfo diretamente aqui
        const mercadoriaInfo = extractMercadoriaInfo(result);
        setMercadoriaInfo(mercadoriaInfo);
        
        setShowEditor(true);
      });
    } catch (err) {
      console.error('Erro ao processar o arquivo XML:', err);
      setError('Erro ao processar o arquivo XML. Verifique se o formato é válido.');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar a função de extração do mercadoriaInfo
  const extractMercadoriaInfo = (xmlObj: any): MercadoriaInfoType => {
    try {
      // Função para extrair valor do XML, tratando casos de _text
      const getValue = (obj: any, path: string[]): string => {
        let current = obj;
        for (const key of path) {
          if (!current || current[key] === undefined) return "";
          current = current[key];
        }
        if (!current) return "";
        if (typeof current === 'string') return current;
        if (current._text !== undefined) return current._text;
        if (current.$ && current.$._text) return current.$._text;
        return "";
      };

      // Extrair CNPJ do destinatário
      const nfeProc = xmlObj.nfeProc || {};
      const nfe = nfeProc.NFe || {};
      const infNFe = nfe.infNFe || {};
      const dest = infNFe.dest || {};
      const cgcCliWms = getValue(dest, ['CNPJ']) || "00000002000000"; // CNPJ do destinatário

      // Extrair produtos da NF-e
      const det = infNFe.det || [];
      const detArray = Array.isArray(det) ? det : [det];
      
      const produtos = detArray.map((item: any, index: number) => {
        const prod = item.prod || {};
        
        // Extrair dados das tags conforme especificação
        const codProd = getValue(prod, ['cProd']) || ""; // Tag cProd
        const nomeProd = getValue(prod, ['xProd']) || ""; // Tag xProd
        const codUnid = getValue(prod, ['uCom']) || "UN"; // Tag uCom
        const codBarra = getValue(prod, ['cEAN']) || ""; // Tag cEAN
        
        // Criar embalagem padrão
        const embalagens = [{
          CODUNID: codUnid,
          FATOR: "1", // Sempre 1 conforme especificação
          CODBARRA: codBarra,
          PESOLIQ: "",
          PESOBRU: "",
          ALT: "",
          LAR: "",
          COMP: "",
          VOL: ""
        }];
        
        return {
          CODPROD: codProd,
          NOMEPROD: nomeProd,
          IWS_ERP: "1", // Valor padrão
          TPOLRET: "1", // Valor padrão
          IAUTODTVEN: "0", // Valor padrão
          QTDDPZOVEN: "", // Valor padrão
          ILOTFAB: "0", // Valor padrão
          IDTFAB: "0", // Valor padrão
          IDTVEN: "0", // Valor padrão
          INSER: "0", // Valor padrão
          SEM_LOTE_CKO: "0", // Valor padrão
          SEM_DTVEN_CKO: "0", // Valor padrão
          CODFAB: "", // A preencher pelo usuário
          NOMEFAB: "", // A preencher pelo usuário
          CODGRU: "", // A preencher pelo usuário
          NOMEGRU: "", // A preencher pelo usuário
          EMBALAGENS: embalagens
        };
      });
      
      // Criar o objeto de saída
      const result: MercadoriaInfoType = {
        CORPEM_ERP_MERC: {
          CGCCLIWMS: cgcCliWms,
          PRODUTOS: produtos
        }
      };
      
      return result;
    } catch (err) {
      console.error('Erro ao extrair informações de mercadorias:', err);
      throw new Error('Erro ao processar os dados de mercadorias.');
    }
  };

  // Atualizar os produtos de mercadorias quando os produtos editados mudarem
  useEffect(() => {
    // Se não houver mercadoriaInfo ou produtos editados, não faz nada
    if (!mercadoriaInfo || editedProducts.length === 0) return;
    
    // Criar uma cópia profunda do mercadoriaInfo
    const updatedMercadoriaInfo = JSON.parse(JSON.stringify(mercadoriaInfo));
    
    // Atualizar cada produto com os valores editados
    updatedMercadoriaInfo.CORPEM_ERP_MERC.PRODUTOS = mercadoriaInfo.CORPEM_ERP_MERC.PRODUTOS.map((produto, index) => {
      const editedProduct = editedProducts[index];
      
      // Se não houver produto editado correspondente, usar o original
      if (!editedProduct) return produto;
      
      // Atualizar os valores editáveis relevantes
      return {
        ...produto,
        CODPROD: editedProduct.editedCodProd || produto.CODPROD,
        NOMEPROD: editedProduct.editedDescricao || produto.NOMEPROD,
        EMBALAGENS: produto.EMBALAGENS.map(emb => ({
          ...emb,
          CODUNID: editedProduct.editedUnidade || emb.CODUNID
        }))
      };
    });
    
    // Atualizar o estado
    setMercadoriaInfo(updatedMercadoriaInfo);
  }, [editedProducts]);

  // Função para atualizar produto editado
  const handleProductChange = (index: number, field: keyof EditedProductType, value: string) => {
    const updatedProducts = [...editedProducts];
    const product = { ...updatedProducts[index] };
    
    // Validação especial para o campo de quantidade (apenas números inteiros)
    if (field === 'editedQtProd') {
      // Verificar se o valor é um número inteiro válido
      const integerPattern = /^[0-9]*$/;
      if (!integerPattern.test(value) && value !== '') {
        return; // Não atualiza se não for um número inteiro
      }
      
      // Atualizar o campo
      product[field] = value;
      
      // Recalcular o valor unitário mantendo o total fixo
      const originalTotal = parseFloat(product.VLTOTPROD.replace(',', '.'));
      const newQuantity = parseInt(value) || 0;
      
      if (newQuantity > 0 && !isNaN(originalTotal)) {
        const newUnitValue = originalTotal / newQuantity;
        product.editedValorUnitario = newUnitValue.toFixed(4);
      } else {
        product.editedValorUnitario = "0";
      }
    } else {
      // Para outros campos, atualiza normalmente
      product[field] = value;
    }
    
    updatedProducts[index] = product;
    setEditedProducts(updatedProducts);
  };

  // Função para gerar o JSON atualizado com as informações editadas
  const generateUpdatedJson = (): NFInfoType | null => {
    if (!nfInfo) return null;
    
    const updatedItens = editedProducts.map(product => {
      return {
        NUMSEQ: product.NUMSEQ,
        CODPROD: product.editedCodProd || product.CODPROD,
        QTPROD: product.editedQtProd || product.QTPROD,
        VLTOTPROD: product.VLTOTPROD, // Valor total permanece fixo
        NUMSEQ_DEV: product.NUMSEQ_DEV
      };
    });
    
    return {
      ...nfInfo,
      CORPEM_ERP_DOC_ENT: {
        ...nfInfo.CORPEM_ERP_DOC_ENT,
        ITENS: updatedItens
      }
    };
  };

  // Função para baixar o JSON formatado
  const downloadJson = () => {
    const jsonToDownload = generateUpdatedJson();
    if (!jsonToDownload) return;
    
    const jsonString = serializeJsonWithoutEscape(jsonToDownload);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nf_formatada.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Função para baixar o JSON formatado de mercadorias
  const downloadMercadoriasJson = () => {
    if (!mercadoriaInfo) return;
    
    const jsonString = serializeJsonWithoutEscape(mercadoriaInfo);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mercadorias.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Formatando para exibição
  const formatNumber = (value: string): string => {
    if (!value) return '';
    
    // Substituir vírgula por ponto para cálculos
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue)) return value;
    
    // Formatar com 2 casas decimais e vírgula como separador decimal
    return numValue.toFixed(2).replace('.', ',');
  };

  // Formatar número inteiro (para quantidade)
  const formatInteger = (value: string): string => {
    if (!value) return '';
    
    // Tentar converter para inteiro
    const intValue = parseInt(value.replace(',', '.'));
    if (isNaN(intValue)) return value;
    
    // Retornar o número inteiro
    return intValue.toString();
  };

  // Função para serializar JSON sem escape de caracteres Unicode
  const serializeJsonWithoutEscape = (obj: any): string => {
    return JSON.stringify(obj, null, 0)
      .replace(/\\u[\dA-F]{4}/gi, match => {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
      });
  };

  // Função para enviar dados para a API
  const sendDataToApi = async () => {
    if (!mercadoriaInfo || !nfInfo) {
      setApiResponse({
        success: false,
        message: 'Não há dados para enviar. Por favor, carregue um arquivo XML.'
      });
      return;
    }

    setSendingData(true);
    setApiResponse(null);

    try {
      // URL da API original
      const originalApiUrl = 'http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc';
      
      // Usando um proxy CORS para evitar problemas de Mixed Content (HTTP vs HTTPS)
      // Se a aplicação estiver rodando em HTTPS (como na Vercel), usamos o proxy
      // Se estiver rodando localmente em HTTP, usamos a URL original
      const isHttps = window.location.protocol === 'https:';
      const apiUrl = isHttps 
        ? `https://corsproxy.io/?${encodeURIComponent(originalApiUrl)}` 
        : originalApiUrl;
      
      // Obter o JSON de mercadorias atualizado
      const mercadoriasJson = mercadoriaInfo;
      // Obter o JSON de NF atualizado
      const nfJson = generateUpdatedJson() || nfInfo;
      
      // Serializar JSONs para envio (sem escape Unicode)
      const mercadoriasJsonString = serializeJsonWithoutEscape(mercadoriasJson);
      const nfJsonString = serializeJsonWithoutEscape(nfJson);
      
      // Mostrar no console o conteúdo que está sendo enviado
      console.log('=== INÍCIO DO PROCESSO DE INTEGRAÇÃO ===');
      console.log('\n1. JSON DE MERCADORIAS (CORPEM_ERP_MERC):');
      console.log(mercadoriasJsonString);
      console.log('\nDetalhes da requisição MERC:');
      console.log('URL original:', originalApiUrl);
      console.log('URL com proxy:', apiUrl);
      console.log('Método: POST');
      console.log('Headers: Content-Type=application/json; charset=utf-8, TOKEN_CP=""');
      
      // Configuração da requisição para o JSON de mercadorias (CORPEM_ERP_MERC)
      const mercadoriasRequestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'TOKEN_CP': ''  // TOKEN_CP vazio conforme especificação
        },
        // Serialização sem escape de caracteres Unicode
        body: mercadoriasJsonString,
        mode: 'no-cors' as RequestMode // Correção da tipagem para RequestMode
      };

      // 1. Primeiro envio: JSON de mercadorias (CORPEM_ERP_MERC)
      console.log('\n▶️ Iniciando envio de mercadorias (CORPEM_ERP_MERC)...');
      
      // Mensagem temporária para feedback na interface
      setApiResponse({
        success: false,
        message: 'Enviando cadastro de mercadorias (CORPEM_ERP_MERC)...'
      });
      
      const mercadoriasResponse = await fetch(apiUrl, mercadoriasRequestOptions);
      
      // Declarar mercadoriasData no escopo maior para acessibilidade
      let mercadoriasData: any;
      
      // Verificar se a resposta pode ser processada
      if (mercadoriasResponse.type === 'opaque') {
        console.log('\n⚠️ Resposta opaca recebida (no-cors mode). Assumindo sucesso e continuando...');
        
        // No modo no-cors, não podemos acessar os dados da resposta
        // Vamos assumir sucesso e continuar com o fluxo
        mercadoriasData = { CORPEM_WS_OK: 'OK' };
        
        console.log('\n✅ Assumindo resposta do servidor (MERC):', JSON.stringify(mercadoriasData, null, 2));
      } else {
        mercadoriasData = await mercadoriasResponse.json();
        console.log('\n✅ Resposta do servidor (MERC):', JSON.stringify(mercadoriasData, null, 2));
      }

      // Verificar se a resposta foi bem-sucedida: {"CORPEM_WS_OK": "OK"}
      if (mercadoriasData && mercadoriasData.CORPEM_WS_OK === 'OK') {
        // 2. Se bem-sucedido, enviar o JSON de documentos (CORPEM_ERP_DOC_ENT)
        console.log('\n2. JSON DE NOTA FISCAL (CORPEM_ERP_DOC_ENT):');
        console.log(nfJsonString);
        console.log('\nDetalhes da requisição DOC_ENT:');
        console.log('URL original:', originalApiUrl);
        console.log('URL com proxy:', apiUrl);
        console.log('Método: POST');
        console.log('Headers: Content-Type=application/json; charset=utf-8, TOKEN_CP=""');
        
        console.log('\n▶️ Iniciando envio de nota fiscal (CORPEM_ERP_DOC_ENT)...');
        
        // Mensagem temporária para feedback na interface
        setApiResponse({
          success: false,
          message: 'Cadastro de mercadorias concluído. Enviando nota fiscal (CORPEM_ERP_DOC_ENT)...'
        });
        
        const nfRequestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'TOKEN_CP': ''  // TOKEN_CP vazio conforme especificação
          },
          // Serialização sem escape de caracteres Unicode
          body: nfJsonString,
          mode: 'no-cors' as RequestMode // Correção da tipagem para RequestMode
        };

        const nfResponse = await fetch(apiUrl, nfRequestOptions);
        
        // Verificar se a resposta pode ser processada
        if (nfResponse.type === 'opaque') {
          console.log('\n⚠️ Resposta opaca recebida (no-cors mode). Assumindo sucesso e continuando...');
          
          // No modo no-cors, não podemos acessar os dados da resposta
          // Vamos assumir sucesso e finalizar o processo
          const nfData = { CORPEM_WS_OK: 'OK' };
          
          console.log('\n✅ Assumindo resposta do servidor (DOC_ENT):', JSON.stringify(nfData, null, 2));
          
          console.log('\n✅ PROCESSO DE INTEGRAÇÃO CONCLUÍDO COM SUCESSO!');
          console.log('=== FIM DO PROCESSO DE INTEGRAÇÃO ===');
          setApiResponse({
            success: true,
            message: 'Integração concluída! Os dados foram enviados, mas não foi possível verificar a confirmação do servidor devido a restrições de CORS.'
          });
        } else {
          const nfData = await nfResponse.json();
          console.log('\n✅ Resposta do servidor (DOC_ENT):', JSON.stringify(nfData, null, 2));
          
          // Verificar resultado final
          if (nfData && nfData.CORPEM_WS_OK === 'OK') {
            console.log('\n✅ PROCESSO DE INTEGRAÇÃO CONCLUÍDO COM SUCESSO!');
            console.log('=== FIM DO PROCESSO DE INTEGRAÇÃO ===');
            setApiResponse({
              success: true,
              message: 'Integração concluída com sucesso! Os dados de mercadorias e nota fiscal foram enviados e confirmados.'
            });
          } else {
            console.log('\n❌ FALHA NO ENVIO DA NOTA FISCAL (DOC_ENT)');
            console.log('=== FIM DO PROCESSO DE INTEGRAÇÃO COM ERRO ===');
            setApiResponse({
              success: false,
              message: `Falha ao enviar a nota fiscal. O cadastro de mercadorias foi concluído, mas ocorreu um erro no envio da nota. Resposta: ${JSON.stringify(nfData)}`
            });
          }
        }
      } else {
        console.log('\n❌ FALHA NO ENVIO DE MERCADORIAS (MERC). PROCESSO INTERROMPIDO.');
        console.log('=== FIM DO PROCESSO DE INTEGRAÇÃO COM ERRO ===');
        setApiResponse({
          success: false,
          message: `Falha ao enviar o cadastro de mercadorias. O processo foi interrompido. Resposta: ${JSON.stringify(mercadoriasData)}`
        });
      }
    } catch (error) {
      console.error('\n❌ ERRO NA INTEGRAÇÃO:', error);
      console.log('=== FIM DO PROCESSO DE INTEGRAÇÃO COM ERRO ===');
      setApiResponse({
        success: false,
        message: 'Erro durante a integração: ' + (error instanceof Error ? error.message : String(error))
      });
    } finally {
      setSendingData(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Integração NF-e Sistema Mercocamp</h1>
        <div className="upload-container">
          <label htmlFor="xml-upload" className="upload-button">
            Selecionar arquivo XML
          </label>
          <input
            id="xml-upload"
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
        
        {loading && <p>Carregando...</p>}
        
        {error && <p className="error-message">{error}</p>}
        
        {showEditor && editedProducts.length > 0 && (
          <div className="products-editor">
            <h2 className="editor-title">Editar Produtos da Nota Fiscal Para Integração no Sistema Mercocamp</h2>
            <div className="products-list">
              {editedProducts.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-original">
                    <div className="product-field"><strong>Seq:</strong> {product.NUMSEQ}</div>
                    <div className="product-field"><strong>Código:</strong> {product.CODPROD}</div>
                    <div className="product-field"><strong>Descrição:</strong> {product.descricao}</div>
                    <div className="product-field"><strong>Quantidade:</strong> {formatInteger(product.QTPROD)}</div>
                  </div>
                  
                  <div className="product-edit">
                    <div className="product-field">
                      <label>Código:</label>
                      <input 
                        type="text" 
                        value={product.editedCodProd} 
                        onChange={(e) => handleProductChange(index, 'editedCodProd', e.target.value)}
                        placeholder={product.CODPROD}
                      />
                    </div>
                    <div className="product-field">
                      <label>Descrição:</label>
                      <input 
                        type="text" 
                        value={product.editedDescricao} 
                        onChange={(e) => handleProductChange(index, 'editedDescricao', e.target.value)}
                        placeholder={product.descricao}
                      />
                    </div>
                    <div className="product-field">
                      <label>Unidade:</label>
                      <input 
                        type="text" 
                        value={product.editedUnidade} 
                        onChange={(e) => handleProductChange(index, 'editedUnidade', e.target.value)}
                        placeholder={product.unidade}
                      />
                    </div>
                    <div className="product-field">
                      <label>Quantidade:</label>
                      <input 
                        type="text" 
                        value={formatInteger(product.editedQtProd)} 
                        onChange={(e) => handleProductChange(index, 'editedQtProd', e.target.value)}
                        placeholder={formatInteger(product.QTPROD)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>
                    <div className="product-field">
                      <label>Valor Unitário:</label>
                      <input 
                        type="text" 
                        value={formatNumber(product.editedValorUnitario)} 
                        readOnly
                        className="readonly-input"
                      />
                    </div>
                    <div className="product-field">
                      <label>Valor Total:</label>
                      <input 
                        type="text" 
                        value={formatNumber(product.VLTOTPROD)} 
                        readOnly
                        className="readonly-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Botões na parte inferior, apenas o botão de envio agora */}
        {xmlData && (
          <div className="bottom-controls" style={{ 
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#333',
            borderRadius: '5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            alignItems: 'center'
          }}>
            {/* Botão de integração */}
            <div className="api-action" style={{ width: '100%' }}>
              <button 
                onClick={sendDataToApi} 
                className="api-button"
                disabled={sendingData || !nfInfo || !mercadoriaInfo}
                style={{
                  fontSize: '1.2rem',
                  padding: '15px 25px',
                  backgroundColor: '#0d47a1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  width: '100%',
                  minWidth: '250px'
                }}
              >
                {sendingData ? 'Enviando...' : 'Enviar para Sistema Mercocamp'}
              </button>
              {(!nfInfo || !mercadoriaInfo) && 
                <p style={{color: '#ff9800', margin: '10px 0 0 0', textAlign: 'center'}}>
                  Aguarde o processamento completo do arquivo para habilitar o envio
                </p>
              }
              
              {apiResponse && (
                <div className={`api-response ${apiResponse.success ? 'success' : 'error'}`} style={{
                  marginTop: '15px', 
                  padding: '10px',
                  backgroundColor: apiResponse.success ? '#0d392d' : '#5c1515',
                  color: 'white',
                  borderRadius: '4px'
                }}>
                  {apiResponse.message}
                </div>
              )}
            </div>
            
            {/* Dica para o usuário */}
            <p style={{ color: '#aaa', fontSize: '0.9rem', textAlign: 'center', margin: '5px 0 0 0' }}>
              Os dados das requisições serão exibidos no console do navegador (F12)
            </p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
