export interface Citation {
  id: string;
  pageNumber: number;
  text: string;
  startIndex?: number;
  endIndex?: number;
  chunkId?: string;
}

export interface AIResponseWithCitations {
  answer: string;
  citations: Citation[];
}

export interface MessageWithCitations {
  id: string;
  content: string;
  role: string;
  citations?: Citation[];
  createdAt: Date;
  userId: string;
  chatId: string;
}