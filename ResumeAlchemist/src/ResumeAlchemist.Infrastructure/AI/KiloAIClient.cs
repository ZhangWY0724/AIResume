using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Options;

namespace ResumeAlchemist.Infrastructure.AI;

/// <summary>
/// Kilo AI 客户端实现（OpenAI Responses 兼容）
/// </summary>
public class KiloAIClient : OpenAIResponsesClientBase, IKiloAIClient
{
    private readonly KiloAIOptions _options;

    public KiloAIClient(
        HttpClient httpClient,
        IOptions<KiloAIOptions> options,
        ILogger<KiloAIClient> logger)
        : base(httpClient, logger)
    {
        _options = options.Value;
    }

    protected override string ProviderName => "Kilo AI";

    protected override string Model => _options.Model;

    protected override string ApiKey => _options.ApiKey;
}
