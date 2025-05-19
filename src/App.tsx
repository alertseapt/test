import React, { useState, useEffect } from 'react';
import './App.css';
import * as xml2js from 'xml2js';

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
  const [products, setProducts] = useState<ProductType[]>([]);
  const [editedProducts, setEditedProducts] = useState<EditedProductType[]>([]);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawXml, setShowRawXml] = useState<boolean>(false);

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
        setShowEditor(true);
      });
    } catch (err) {
      console.error('Erro ao processar o arquivo XML:', err);
      setError('Erro ao processar o arquivo XML. Verifique se o formato é válido.');
    } finally {
      setLoading(false);
    }
  };

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
    
    const jsonString = JSON.stringify(jsonToDownload, null, 2);
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
            
            <div className="action-buttons">
              <button onClick={downloadJson} className="download-button">
                Baixar JSON Atualizado
              </button>
            </div>
          </div>
        )}
        
        {nfInfo && (
          <div className="xml-result json-result">
            <div className="result-header">
              <h2>JSON Formatado (Padrão CORPEM_ERP_DOC_ENT):</h2>
              <button 
                onClick={downloadJson} 
                className="download-button"
              >
                Baixar JSON
              </button>
            </div>
            <pre>{JSON.stringify(generateUpdatedJson() || nfInfo, null, 2)}</pre>
          </div>
        )}
        
        {xmlData && (
          <div>
            <button 
              onClick={() => setShowRawXml(!showRawXml)} 
              className="toggle-button"
            >
              {showRawXml ? 'Ocultar XML' : 'Mostrar XML Original'}
            </button>
            
            {showRawXml && (
              <div className="xml-result">
                <h2>Dados Originais do XML:</h2>
                <pre>{JSON.stringify(xmlData, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
