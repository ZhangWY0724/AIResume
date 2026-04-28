using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Options;

namespace ResumeAlchemist.Infrastructure.AI;

/// <summary>
/// GPT-5.4 客户端实现（OpenAI Responses 兼容）
/// </summary>
public class Gpt54AIClient : OpenAIResponsesClientBase, IGpt54AIClient
{
    private readonly Gpt54AIOptions _options;

    public Gpt54AIClient(
        HttpClient httpClient,
        IOptions<Gpt54AIOptions> options,
        ILogger<Gpt54AIClient> logger)
        : base(httpClient, logger)
    {
        _options = options.Value;
    }

    protected override string ProviderName => "GPT-5.4";

    protected override string Model => _options.Model;

    protected override string ApiKey => _options.ApiKey;
}
