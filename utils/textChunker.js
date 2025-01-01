import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

/**
 * Splits text into chunks suitable for embedding and retrieval operations
 * @param {string} text - The text content to be split into chunks
 * @param {Object} metadata - Additional metadata to be attached to each chunk
 * @returns {Promise<Array>} Array of document chunks with metadata
 */
export async function splitTextIntoChunks(text, metadata = {}) {
  console.log('\n=== Starting Text Chunking ===');
  console.log(`Input text length: ${text.length} characters`);
  console.log('Metadata:', metadata);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 400,
    separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
  });

  console.log('Splitter configuration:', {
    chunkSize: 2000,
    chunkOverlap: 400,
    separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""]
  });

  // Create documents with metadata
  const docs = await splitter.createDocuments(
    [text],
    [{ ...metadata, chunkIndex: 0 }]
  );

  // Add index to each chunk's metadata
  const processedDocs = docs.map((doc, index) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      chunkIndex: index,
    }
  }));

  console.log(`\nChunking complete:`);
  console.log(`- Number of chunks created: ${processedDocs.length}`);
  console.log(`- Average chunk length: ${Math.round(processedDocs.reduce((acc, doc) => acc + doc.pageContent.length, 0) / processedDocs.length)} characters`);
  
  // Log first chunk as sample
  if (processedDocs.length > 0) {
    console.log('\nSample (First Chunk):');
    console.log('- Length:', processedDocs[0].pageContent.length);
    console.log('- Preview:', processedDocs[0].pageContent.substring(0, 100) + '...');
    console.log('- Metadata:', processedDocs[0].metadata);
  }

  console.log('=== Text Chunking Complete ===\n');
  return processedDocs;
}
