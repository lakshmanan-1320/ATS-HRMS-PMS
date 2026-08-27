async function checkEmbeddingDimension() {
  const model = 'embeddinggemma';
  
  try {
    console.log(`Sending embedding request to Ollama using model "${model}"...`);
    
    // Attempting /api/embed (new Ollama API)
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        input: 'Test query'
      })
    });
    
    if (!response.ok) {
      // Try fallback to /api/embeddings (legacy Ollama API)
      console.log('Falling back to /api/embeddings...');
      const fallback = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: 'Test query'
        })
      });
      
      if (!fallback.ok) {
        throw new Error(`Ollama response failed: ${fallback.status} - ${await fallback.text()}`);
      }
      
      const data = await fallback.json();
      console.log('Successfully generated embedding using fallback /api/embeddings!');
      console.log('Embedding type:', typeof data.embedding);
      console.log('Array length:', data.embedding ? data.embedding.length : 'undefined');
      return;
    }
    
    const data = await response.json();
    console.log('Successfully generated embedding using /api/embed!');
    console.log('Embeddings list length:', data.embeddings?.length);
    console.log('First embedding length:', data.embeddings?.[0]?.length);
  } catch (err) {
    console.error('Failed to connect to Ollama or query model:', err.message);
  }
}

checkEmbeddingDimension();
