// Definições de tipos para cadastro de mercadorias

export interface EmbalagensType {
  CODUNID: string;
  FATOR: string;
  CODBARRA: string;
  PESOLIQ: string;
  PESOBRU: string;
  ALT: string;
  LAR: string;
  COMP: string;
  VOL: string;
}

export interface ProdutoMercadoriaType {
  CODPROD: string;
  NOMEPROD: string;
  IWS_ERP: string;
  TPOLRET: string;
  IAUTODTVEN: string;
  QTDDPZOVEN: string;
  ILOTFAB: string;
  IDTFAB: string;
  IDTVEN: string;
  INSER: string;
  SEM_LOTE_CKO: string;
  SEM_DTVEN_CKO: string;
  CODFAB: string;
  NOMEFAB: string;
  CODGRU: string;
  NOMEGRU: string;
  EMBALAGENS: EmbalagensType[];
}

export interface MercadoriaInfoType {
  CORPEM_ERP_MERC: {
    CGCCLIWMS: string;
    PRODUTOS: ProdutoMercadoriaType[];
  }
}

// Tipo para a estrutura editada de um produto de mercadoria
export interface EditedProdutoMercadoriaType extends ProdutoMercadoriaType {
  editedCODPROD: string;
  editedNOMEPROD: string;
  editedCODFAB: string;
  editedNOMEFAB: string;
  editedCODGRU: string;
  editedNOMEGRU: string;
  editedEmbalagens: EditedEmbalagensType[];
}

export interface EditedEmbalagensType extends EmbalagensType {
  editedCODUNID: string;
  editedFATOR: string;
  editedCODBARRA: string;
  editedPESOLIQ: string;
  editedPESOBRU: string;
  editedALT: string;
  editedLAR: string;
  editedCOMP: string;
  editedVOL: string;
} 