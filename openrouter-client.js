const axios = require('axios');

class OpenRouterClient {
  constructor(apiKey, model = 'alibaba/tongyi-deepresearch-30b-a3b') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = 'https://openrouter.ai/api/v1';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Cybersecurity Research AI',
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout
    });
  }

  async generateResearch(prompt, maxTokens = 4000) {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert and researcher. Provide comprehensive, detailed, and accurate cybersecurity research. Format your response in markdown. Be thorough and professional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API Error:', error.response?.data || error.message);
      throw new Error(`OpenRouter API failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateOutline(topic, depth) {
    const prompt = `Generate a comprehensive research outline for the cybersecurity topic: "${topic}"

Depth level: ${depth}/5 (where 1=basic, 5=expert)

Create a detailed outline that covers:
1. Current threat landscape and recent developments
2. Emerging vulnerabilities and attack vectors
3. Defense strategies and countermeasures
4. Industry best practices and standards
5. Future predictions and recommendations

Format as markdown with clear sections and subsections. Be specific to the topic "${topic}" and adjust detail level based on depth ${depth}.`;

    return await this.generateResearch(prompt, 2000);
  }

  async generateSectionContent(topic, sectionTitle, sectionDescription, depth) {
    const prompt = `Write a comprehensive cybersecurity research section on "${sectionTitle}" for the topic: "${topic}"

Section focus: ${sectionDescription}
Research depth: ${depth}/5 (adjust detail accordingly)

Requirements:
- Provide current, accurate cybersecurity information
- Include specific examples, tools, and techniques where relevant
- Use proper markdown formatting with headers, lists, and emphasis
- Be thorough and professional
- Include actionable insights and recommendations
- Focus specifically on "${topic}" throughout the content

Write 800-1200 words with proper structure and formatting.`;

    return await this.generateResearch(prompt, 3000);
  }

  // Test connection to OpenRouter
  async testConnection() {
    try {
      const response = await this.client.get('/models');
      return { success: true, models: response.data.data.length };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

module.exports = { OpenRouterClient };