# OpenRouter AI Integration

This cybersecurity research application now supports real AI-powered research using OpenRouter API.

## 🚀 Features

- **Real AI Research**: Generate actual cybersecurity research using advanced AI models
- **Parallel AI Workers**: Multiple AI workers process different sections simultaneously
- **Intelligent Fallback**: Automatically falls back to simulation if API is unavailable
- **Comprehensive Research**: AI generates detailed, relevant cybersecurity content
- **Real-time Streaming**: Watch AI workers generate content in real-time

## 🔧 Setup

### 1. Get OpenRouter API Key

1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Get your API key from the dashboard
3. Add credits to your account for API usage

### 2. Configure Environment

Copy `.env.example` to `.env` and add your API key:

```bash
cp .env.example .env
```

Edit `.env` file:
```env
DATABASE_URL=sqlite://dev.db
OPENROUTER_API_KEY=sk-or-your-actual-api-key-here
LLM_MODEL=alibaba/tongyi-deepresearch-30b-a3b
```

### 3. Available Models

The application supports various OpenRouter models. Popular options:

- `alibaba/tongyi-deepresearch-30b-a3b` (Default - Deep research model)
- `openai/gpt-4-turbo-preview` (GPT-4 Turbo)
- `anthropic/claude-3-opus` (Claude 3 Opus)
- `meta-llama/llama-3-70b-instruct` (Llama 3 70B)
- `google/gemini-pro` (Gemini Pro)

Update the `LLM_MODEL` in your `.env` file to use different models.

## 💰 API Costs

OpenRouter charges per token. Approximate costs for research:

- **Basic Research** (depth 1): ~$0.05-0.10 per job
- **Standard Research** (depth 2): ~$0.10-0.25 per job
- **Comprehensive Research** (depth 3): ~$0.25-0.50 per job
- **Advanced Research** (depth 4): ~$0.50-1.00 per job
- **Expert Research** (depth 5): ~$1.00-2.00 per job

Costs vary by model - advanced models like GPT-4 and Claude cost more.

## 🔄 How It Works

1. **Job Submission**: User submits research topic and depth
2. **Outline Generation**: AI generates research outline
3. **Parallel Processing**: 5 AI workers process different sections:
   - Current Threat Landscape
   - Emerging Vulnerabilities
   - Defense Strategies
   - Industry Best Practices
   - Future Predictions
4. **Real-time Updates**: Progress streamed via Server-Sent Events
5. **Content Assembly**: Generated content displayed and saved

## 🛡️ Fallback Mode

If no API key is configured or API fails:
- Application automatically falls back to simulation mode
- Uses pre-built cybersecurity content templates
- All functionality remains available
- Clear indication when in fallback mode

## 🔍 Testing the Integration

1. **Start the application**:
   ```bash
   npm start
   ```

2. **Check console output**:
   ```
   Server is running on port 3000
   Initialized OpenRouter with model: alibaba/tongyi-deepresearch-30b-a3b
   Database connected successfully
   ```

3. **Submit a test job**:
   - Visit http://localhost:3000
   - Enter a cybersecurity topic
   - Watch for "AI analyzing..." messages in progress

4. **Monitor logs**: Look for "Processing real AI research for:" messages

## 🚨 Error Handling

The integration includes comprehensive error handling:

- **API Rate Limits**: Automatic retry with backoff
- **Network Errors**: Fallback to simulation mode
- **Invalid Responses**: Graceful degradation
- **Timeout Handling**: 2-minute timeout per API call
- **Individual Section Fallback**: If one section fails, others continue

## 📊 Monitoring Usage

Monitor your OpenRouter usage:
- Check usage dashboard at OpenRouter.ai
- Monitor console logs for API calls
- Track costs per research job
- Set up usage alerts if needed

## 🔧 Advanced Configuration

### Custom System Prompts

The AI uses cybersecurity-specific system prompts. To customize, edit `openrouter-client.js`:

```javascript
content: 'You are a cybersecurity expert and researcher...'
```

### Timeout Settings

Adjust API timeouts in `openrouter-client.js`:

```javascript
timeout: 120000 // 2 minutes
```

### Model Parameters

Fine-tune generation in `openrouter-client.js`:

```javascript
temperature: 0.7,  // Creativity (0-1)
top_p: 0.9,       // Nucleus sampling
max_tokens: 4000  // Response length
```

## 🎯 Best Practices

1. **Start Small**: Test with basic research depth first
2. **Monitor Costs**: Keep track of API usage
3. **Backup Strategy**: Always have fallback mode ready
4. **Rate Limiting**: Avoid overwhelming the API
5. **Quality Control**: Review AI-generated content

## 🐛 Troubleshooting

### Common Issues

**"Using simulation fallback"**
- Check API key is correct
- Verify credits available
- Test API connectivity

**Slow Generation**
- Try different model
- Reduce research depth
- Check network connection

**API Errors**
- Check OpenRouter status
- Verify model availability
- Review usage limits

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npm start
```

## 📈 Performance

- **Parallel Processing**: 5 workers run simultaneously
- **Streaming Updates**: Real-time progress display
- **Efficient API Usage**: Optimized token usage
- **Smart Caching**: Avoids redundant API calls

---

*The application will work with or without OpenRouter - fallback simulation ensures functionality is never compromised!*