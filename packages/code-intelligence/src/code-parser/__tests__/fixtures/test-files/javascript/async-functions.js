/**
 * Async function examples for testing
 */

// Promise-based function
function fetchData(url) {
  return fetch(url)
    .then(response => response.json())
    .catch(error => {
      console.error('Fetch error:', error);
      throw error;
    });
}

// Async/await function
async function processData(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const data = await fetchData(url);
      results.push(data);
    } catch (error) {
      console.warn(`Failed to process ${url}:`, error);
    }
  }

  return results;
}

// Arrow function with async
const quickProcess = async (item) => {
  const processed = await transform(item);
  return processed;
};

// Generator function
function* generateNumbers(max) {
  for (let i = 0; i < max; i++) {
    yield i;
  }
}

export { fetchData, processData, quickProcess, generateNumbers };