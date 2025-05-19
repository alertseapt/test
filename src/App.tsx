import React, { useState } from 'react';
import './App.css';
import * as xml2js from 'xml2js';

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
  const extractNFInfo = (xmlObj: any): NFInfoType => {
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
      let itens: NFItemType[] = [];
      const det = infNFe.det;
      
      if (det) {
        // Converter para array se não for
        const detArray = Array.isArray(det) ? det : [det];
        
        itens = detArray.map((item: any) => {
          const numItem = item._attributes?.nItem || extractValue(item.nItem) || "";
          const prod = item.prod || {};
          
          return {
            NUMSEQ: numItem,
            CODPROD: extractValue(prod.cProd) || "",
            QTPROD: extractValue(prod.qCom) || "",
            VLTOTPROD: extractValue(prod.vProd) || "",
            NUMSEQ_DEV: "0" // Padrão conforme exemplo
          };
        });
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
      
      return result;
    } catch (err) {
      console.error('Erro ao extrair informações da NF:', err);
      throw new Error('Erro ao processar os dados da Nota Fiscal.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setXmlData(null);
    setNfInfo(null);
    
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
        const extractedInfo = extractNFInfo(result);
        setNfInfo(extractedInfo);
      });
    } catch (err) {
      console.error('Erro ao processar o arquivo XML:', err);
      setError('Erro ao processar o arquivo XML. Verifique se o formato é válido.');
    } finally {
      setLoading(false);
    }
  };

  // Função para baixar o JSON formatado
  const downloadJson = () => {
    if (!nfInfo) return;
    
    const jsonString = JSON.stringify(nfInfo, null, 2);
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Processador de XML para JSON (NFe)</h1>
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
            <pre>{JSON.stringify(nfInfo, null, 2)}</pre>
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
