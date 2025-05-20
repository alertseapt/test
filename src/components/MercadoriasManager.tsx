import React, { useState, useEffect } from 'react';
import { MercadoriaInfoType, ProdutoMercadoriaType, EditedProdutoMercadoriaType, EmbalagensType } from '../types/MercadoriasTypes';

interface MercadoriasManagerProps {
  xmlData: any;
  editedProducts?: any[]; // Recebe os produtos editados do App.tsx
  onJsonGenerated?: (json: MercadoriaInfoType) => void; // Callback para enviar o JSON para o App.tsx
}

const MercadoriasManager: React.FC<MercadoriasManagerProps> = ({ xmlData, editedProducts = [], onJsonGenerated }) => {
  const [mercadoriaInfo, setMercadoriaInfo] = useState<MercadoriaInfoType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Função para extrair valor do XML, tratando casos de _text
  const extractValue = (obj: any): string => {
    if (!obj) return "";
    if (typeof obj === 'string') return obj;
    if (obj._text !== undefined) return obj._text;
    if (obj.$ && obj.$._text) return obj.$._text;
    return "";
  };

  // Função para extrair informações de mercadorias do XML
  const extractMercadoriaInfo = (xmlObj: any): MercadoriaInfoType => {
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

      // Extrair CNPJ do destinatário (conforme especificação: tag CNPJ dentro da tag dest)
      const nfeProc = xmlObj.nfeProc || {};
      const nfe = nfeProc.NFe || {};
      const infNFe = nfe.infNFe || {};
      const dest = infNFe.dest || {};
      const cgcCliWms = getValue(dest, ['CNPJ']) || "00000002000000"; // CNPJ do destinatário

      // Extrair produtos da NF-e
      const det = infNFe.det || [];
      const detArray = Array.isArray(det) ? det : [det];
      
      const produtos: ProdutoMercadoriaType[] = detArray.map((item: any, index: number) => {
        const prod = item.prod || {};
        
        // Extrair dados das tags conforme especificação
        const codProd = getValue(prod, ['cProd']) || ""; // Tag cProd
        const nomeProd = getValue(prod, ['xProd']) || ""; // Tag xProd
        const codUnid = getValue(prod, ['uCom']) || "UN"; // Tag uCom
        const codBarra = getValue(prod, ['cEAN']) || ""; // Tag cEAN
        
        // Criar embalagem padrão
        const embalagens: EmbalagensType[] = [{
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

  useEffect(() => {
    if (xmlData) {
      setLoading(true);
      setError(null);
      
      try {
        // Extrair informações de mercadoria do XML
        const extractedInfo = extractMercadoriaInfo(xmlData);
        setMercadoriaInfo(extractedInfo);
      } catch (err) {
        console.error('Erro ao processar mercadorias:', err);
        setError('Erro ao processar os dados de mercadorias.');
      } finally {
        setLoading(false);
      }
    }
  }, [xmlData]);

  // Função para gerar o JSON atualizado com as informações editadas
  const generateUpdatedJson = (): MercadoriaInfoType | null => {
    if (!mercadoriaInfo) return null;
    
    // Usar produtos editados do App.tsx quando disponíveis
    const produtos = mercadoriaInfo.CORPEM_ERP_MERC.PRODUTOS;

    // Mapear os produtos originais com as atualizações dos produtos editados
    const updatedProdutos = produtos.map((produto, index) => {
      // Encontrar o produto editado correspondente
      const editedProduct = editedProducts[index];
      
      // Se não houver produto editado correspondente, usar o original
      if (!editedProduct) return produto;

      // Usar os valores editados quando disponíveis
      const embalagens = produto.EMBALAGENS.map(embalagem => {
        return {
          CODUNID: editedProduct.editedUnidade || embalagem.CODUNID, // Usar unidade editada
          FATOR: "1", // Sempre 1 conforme especificação
          CODBARRA: embalagem.CODBARRA, // Manter código de barras original
          PESOLIQ: embalagem.PESOLIQ,
          PESOBRU: embalagem.PESOBRU,
          ALT: embalagem.ALT,
          LAR: embalagem.LAR,
          COMP: embalagem.COMP,
          VOL: embalagem.VOL
        };
      });
      
      return {
        CODPROD: editedProduct.editedCodProd || produto.CODPROD, // Usar código editado
        NOMEPROD: editedProduct.editedDescricao || produto.NOMEPROD, // Usar descrição editada
        IWS_ERP: produto.IWS_ERP,
        TPOLRET: produto.TPOLRET,
        IAUTODTVEN: produto.IAUTODTVEN,
        QTDDPZOVEN: produto.QTDDPZOVEN,
        ILOTFAB: produto.ILOTFAB,
        IDTFAB: produto.IDTFAB,
        IDTVEN: produto.IDTVEN,
        INSER: produto.INSER,
        SEM_LOTE_CKO: produto.SEM_LOTE_CKO,
        SEM_DTVEN_CKO: produto.SEM_DTVEN_CKO,
        CODFAB: produto.CODFAB,
        NOMEFAB: produto.NOMEFAB,
        CODGRU: produto.CODGRU,
        NOMEGRU: produto.NOMEGRU,
        EMBALAGENS: embalagens
      };
    });
    
    const updatedJson = {
      CORPEM_ERP_MERC: {
        CGCCLIWMS: mercadoriaInfo.CORPEM_ERP_MERC.CGCCLIWMS,
        PRODUTOS: updatedProdutos
      }
    };
    
    // Enviar o JSON atualizado para o App.tsx quando disponível
    if (onJsonGenerated) {
      onJsonGenerated(updatedJson);
    }
    
    return updatedJson;
  };

  // Enviar o JSON para o App.tsx quando for atualizado
  useEffect(() => {
    const updatedJson = generateUpdatedJson();
    if (updatedJson && onJsonGenerated) {
      onJsonGenerated(updatedJson);
    }
  }, [mercadoriaInfo, editedProducts, onJsonGenerated]);

  if (loading) {
    return <p>Carregando dados de mercadorias...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!mercadoriaInfo) {
    return null;
  }

  return (
    <div className="mercadorias-editor">
      <p className="info-message">
        As alterações feitas nos produtos acima serão automaticamente aplicadas ao JSON de mercadorias.
      </p>
    </div>
  );
};

export default MercadoriasManager; 